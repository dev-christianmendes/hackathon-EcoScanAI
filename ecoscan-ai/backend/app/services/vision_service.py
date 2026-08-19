"""
Vision Service — integrates with Google Cloud Vision API.

Combines three Vision features for higher accuracy on waste images:
  * LABEL_DETECTION         → broad descriptors ("Plastic", "Bottle")
  * OBJECT_LOCALIZATION     → precise localized objects ("Bottle", "Can")
  * WEB_DETECTION           → fine-grained entities ("PET bottle", brand names)

Each annotation carries its real Vision API confidence score (0..1), which is
forwarded to the classification service so the final verdict reflects what
the model actually saw — not just label ordering.
"""
from __future__ import annotations

import asyncio
import base64
import binascii
import json
import logging
import os
from datetime import date
from io import BytesIO
from pathlib import Path
from threading import Lock
from typing import Optional

from app.services.classification_service import Annotation

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Daily rate limit — protects against runaway costs on Google Cloud Vision.
# Counter is persisted in a small JSON file so it survives server restarts.
# ---------------------------------------------------------------------------

class DailyLimitExceeded(Exception):
    """Raised when the configured daily Vision API call limit is reached."""

    def __init__(self, used: int, limit: int) -> None:
        super().__init__(f"Daily Vision API limit reached: {used}/{limit}")
        self.used = used
        self.limit = limit


_RATE_LIMIT_LOCK = Lock()
_RATE_LIMIT_FILE = Path(__file__).resolve().parents[2] / ".rate_limit.json"


def _daily_limit() -> int:
    """0 (or unset) disables the limiter."""
    try:
        return max(0, int(os.getenv("DAILY_REQUEST_LIMIT", "0")))
    except ValueError:
        return 0


def _check_and_increment_daily_quota() -> None:
    """Raise DailyLimitExceeded if today's count would exceed DAILY_REQUEST_LIMIT."""
    limit = _daily_limit()
    if limit == 0:
        return

    today = date.today().isoformat()
    with _RATE_LIMIT_LOCK:
        data = {"date": today, "count": 0}
        if _RATE_LIMIT_FILE.exists():
            try:
                data = json.loads(_RATE_LIMIT_FILE.read_text())
                if data.get("date") != today:
                    data = {"date": today, "count": 0}
            except (json.JSONDecodeError, OSError):
                data = {"date": today, "count": 0}

        if data["count"] >= limit:
            raise DailyLimitExceeded(used=data["count"], limit=limit)

        data["count"] += 1
        try:
            _RATE_LIMIT_FILE.write_text(json.dumps(data))
        except OSError as exc:
            logger.warning("Could not persist rate-limit counter: %s", exc)

# Source weights — how much we trust each Vision feature for waste classification.
# Object localization usually yields the most actionable signal for physical items.
SOURCE_WEIGHTS = {
    "label": 1.0,
    "object": 1.25,
    "web": 1.1,
}

# Mock annotations for each category — used when DEMO_MODE=true.
DEMO_ANNOTATIONS: dict[str, list[Annotation]] = {
    "plastic": [
        Annotation("Plastic bottle", 0.96, SOURCE_WEIGHTS["object"]),
        Annotation("Plastic", 0.92, SOURCE_WEIGHTS["label"]),
        Annotation("Water bottle", 0.88, SOURCE_WEIGHTS["label"]),
        Annotation("PET bottle", 0.84, SOURCE_WEIGHTS["web"]),
        Annotation("Bottle", 0.95, SOURCE_WEIGHTS["label"]),
    ],
    "paper": [
        Annotation("Cardboard", 0.94, SOURCE_WEIGHTS["label"]),
        Annotation("Cardboard box", 0.91, SOURCE_WEIGHTS["object"]),
        Annotation("Paper", 0.87, SOURCE_WEIGHTS["label"]),
        Annotation("Corrugated fiberboard", 0.80, SOURCE_WEIGHTS["web"]),
        Annotation("Packaging and labeling", 0.65, SOURCE_WEIGHTS["label"]),
    ],
    "glass": [
        Annotation("Glass bottle", 0.93, SOURCE_WEIGHTS["object"]),
        Annotation("Glass", 0.90, SOURCE_WEIGHTS["label"]),
        Annotation("Wine bottle", 0.85, SOURCE_WEIGHTS["web"]),
        Annotation("Drinkware", 0.78, SOURCE_WEIGHTS["label"]),
        Annotation("Jar", 0.74, SOURCE_WEIGHTS["label"]),
    ],
    "metal": [
        Annotation("Aluminum can", 0.95, SOURCE_WEIGHTS["object"]),
        Annotation("Beverage can", 0.92, SOURCE_WEIGHTS["label"]),
        Annotation("Aluminum", 0.88, SOURCE_WEIGHTS["label"]),
        Annotation("Tin can", 0.82, SOURCE_WEIGHTS["web"]),
        Annotation("Metal", 0.79, SOURCE_WEIGHTS["label"]),
    ],
    "organic": [
        Annotation("Fruit", 0.94, SOURCE_WEIGHTS["label"]),
        Annotation("Banana", 0.90, SOURCE_WEIGHTS["object"]),
        Annotation("Natural foods", 0.85, SOURCE_WEIGHTS["label"]),
        Annotation("Produce", 0.81, SOURCE_WEIGHTS["label"]),
        Annotation("Food", 0.78, SOURCE_WEIGHTS["label"]),
    ],
    "reject": [
        Annotation("Battery", 0.93, SOURCE_WEIGHTS["object"]),
        Annotation("Electronics", 0.89, SOURCE_WEIGHTS["label"]),
        Annotation("Light bulb", 0.84, SOURCE_WEIGHTS["label"]),
        Annotation("Fluorescent lamp", 0.78, SOURCE_WEIGHTS["web"]),
        Annotation("Ceramic", 0.72, SOURCE_WEIGHTS["label"]),
    ],
}


def get_demo_annotations(category: str = "plastic") -> list[Annotation]:
    return DEMO_ANNOTATIONS.get(category, DEMO_ANNOTATIONS["plastic"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _decode_image(image_base64: str) -> Optional[bytes]:
    """Decode a base64 image (with or without data URI prefix). None on error."""
    if not image_base64:
        return None
    try:
        if "," in image_base64:
            image_base64 = image_base64.split(",", 1)[1]
        return base64.b64decode(image_base64, validate=False)
    except (binascii.Error, ValueError) as exc:
        logger.error("Failed to decode base64 image: %s", exc)
        return None


def _preprocess_image(image_bytes: bytes) -> bytes:
    """
    Optional Pillow-based preprocessing: re-encode and resize huge images so we
    stay well under the Vision API 20 MB request limit and keep latency low.
    If Pillow isn't available we just return the original bytes.
    """
    try:
        from PIL import Image  # type: ignore
    except ImportError:
        return image_bytes

    try:
        img = Image.open(BytesIO(image_bytes))
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        # Cap longest side at 1600px — plenty for label/object detection
        max_side = 1600
        if max(img.size) > max_side:
            img.thumbnail((max_side, max_side), Image.LANCZOS)
        out = BytesIO()
        img.save(out, format="JPEG", quality=85, optimize=True)
        return out.getvalue()
    except Exception as exc:  # pragma: no cover — fall back to original bytes
        logger.warning("Image preprocessing failed (%s); using original.", exc)
        return image_bytes


# ---------------------------------------------------------------------------
# Vision API call
# ---------------------------------------------------------------------------

async def analyze_image(image_base64: str) -> Optional[list[Annotation]]:
    """
    Run multi-feature Vision API analysis on the supplied image.
    Returns a merged, deduplicated list of `Annotation` objects, or None if
    the API call fails (caller decides what to do then).
    """
    image_bytes = _decode_image(image_base64)
    if image_bytes is None:
        logger.error("Empty or invalid base64 payload")
        return None

    image_bytes = _preprocess_image(image_bytes)

    try:
        from google.cloud import vision  # type: ignore
    except ImportError:
        logger.warning("google-cloud-vision not installed — cannot call API")
        return None

    # Enforce the configured daily quota BEFORE hitting the network.
    _check_and_increment_daily_quota()

    def _call_api() -> Optional[list[Annotation]]:
        try:
            client = vision.ImageAnnotatorClient()
            image = vision.Image(content=image_bytes)

            features = [
                vision.Feature(type_=vision.Feature.Type.LABEL_DETECTION, max_results=20),
                vision.Feature(type_=vision.Feature.Type.OBJECT_LOCALIZATION, max_results=10),
                vision.Feature(type_=vision.Feature.Type.WEB_DETECTION, max_results=10),
            ]
            request = vision.AnnotateImageRequest(image=image, features=features)
            response = client.annotate_image(request=request)

            if response.error.message:
                logger.error("Vision API error: %s", response.error.message)
                return None

            annotations: list[Annotation] = []

            # Labels
            for lab in response.label_annotations:
                annotations.append(
                    Annotation(
                        text=lab.description,
                        score=float(lab.score or 0.0),
                        source_weight=SOURCE_WEIGHTS["label"],
                    )
                )

            # Localized objects
            for obj in response.localized_object_annotations:
                annotations.append(
                    Annotation(
                        text=obj.name,
                        score=float(obj.score or 0.0),
                        source_weight=SOURCE_WEIGHTS["object"],
                    )
                )

            # Web entities (great for "PET bottle", brand-level identification)
            web = getattr(response, "web_detection", None)
            if web is not None:
                for ent in getattr(web, "web_entities", []) or []:
                    desc = (ent.description or "").strip()
                    if not desc:
                        continue
                    annotations.append(
                        Annotation(
                            text=desc,
                            # Web entity scores are not in 0..1 — normalize roughly
                            score=min(1.0, float(ent.score or 0.0) / 2.0),
                            source_weight=SOURCE_WEIGHTS["web"],
                        )
                    )
                for label in getattr(web, "best_guess_labels", []) or []:
                    guess = (label.label or "").strip()
                    if guess:
                        annotations.append(
                            Annotation(
                                text=guess,
                                score=0.85,
                                source_weight=SOURCE_WEIGHTS["web"],
                            )
                        )

            return _dedupe(annotations)

        except Exception as exc:
            logger.error("Vision API call failed: %s", exc, exc_info=True)
            return None

    # Vision client is blocking — run it in a worker thread to keep FastAPI async.
    return await asyncio.to_thread(_call_api)


def _dedupe(annotations: list[Annotation]) -> list[Annotation]:
    """Keep the highest-score occurrence of each text (case-insensitive)."""
    best: dict[str, Annotation] = {}
    for ann in annotations:
        key = ann.text.lower().strip()
        if not key:
            continue
        current = best.get(key)
        if current is None or ann.score * ann.source_weight > current.score * current.source_weight:
            best[key] = ann
    return sorted(best.values(), key=lambda a: a.score * a.source_weight, reverse=True)


def annotations_to_label_strings(annotations: list[Annotation]) -> list[str]:
    """Public helper used by the API route to expose detected labels to the UI."""
    seen: set[str] = set()
    out: list[str] = []
    for ann in annotations:
        key = ann.text.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(ann.text)
    return out
