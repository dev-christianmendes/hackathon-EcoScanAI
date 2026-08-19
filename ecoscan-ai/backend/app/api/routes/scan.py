"""Scan route — accepts an image and returns waste classification."""
from __future__ import annotations

import logging
import os
import random

from fastapi import APIRouter, HTTPException

from app.models.schemas import CategoryScore, ScanRequest, ScanResponse
from app.services import classification_service, vision_service

router = APIRouter()
logger = logging.getLogger(__name__)

# Confidence below this triggers the `low_confidence` flag in the response.
LOW_CONFIDENCE_THRESHOLD = 0.55

# Demo cycle — rotates through categories for live pitches.
_DEMO_CYCLE = [c for c in classification_service.CATEGORIES.keys() if c != "unknown"]
_demo_index = 0


def _env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


def _allow_demo_fallback() -> bool:
    """
    When the Vision API is unreachable, should the backend silently return mock
    data?  Defaults to False so users see a real error instead of bogus results.
    Set DEMO_FALLBACK=true to keep the old behaviour for live demos.
    """
    return _env_bool("DEMO_FALLBACK", False)


def _build_demo_response() -> ScanResponse:
    global _demo_index
    category_key = _DEMO_CYCLE[_demo_index % len(_DEMO_CYCLE)]
    _demo_index += 1

    annotations = vision_service.get_demo_annotations(category_key)
    waste_info = classification_service.build_waste_info(category_key)

    return ScanResponse(
        success=True,
        waste_info=waste_info,
        detected_labels=vision_service.annotations_to_label_strings(annotations),
        confidence=round(random.uniform(0.82, 0.97), 2),
        demo_mode=True,
        alternatives=[],
        low_confidence=False,
    )


@router.post("/scan", response_model=ScanResponse, summary="Analyze waste image")
async def scan_waste(body: ScanRequest) -> ScanResponse:
    """
    Accepts a base64-encoded image, calls Google Vision API, classifies the
    waste, and returns disposal guidance.

    - Set `demo_mode: true` in the body (or `DEMO_MODE=true` in `.env`) to
      bypass the Vision API and return rotating mock data.
    - When the Vision API is unreachable, the request fails with HTTP 503
      unless `DEMO_FALLBACK=true` in the environment.
    """
    use_demo = bool(body.demo_mode) or _env_bool("DEMO_MODE", False)

    if use_demo:
        return _build_demo_response()

    # --- Production path ---
    if not body.image_base64 or not body.image_base64.strip():
        raise HTTPException(status_code=400, detail="image_base64 is required")

    try:
        annotations = await vision_service.analyze_image(body.image_base64)
    except vision_service.DailyLimitExceeded as exc:
        logger.warning("Daily Vision API limit reached: %s/%s", exc.used, exc.limit)
        raise HTTPException(
            status_code=429,
            detail=(
                f"Limite diário de chamadas à Vision API atingido "
                f"({exc.used}/{exc.limit}). Tente novamente amanhã ou ative "
                f"DEMO_MODE=true para continuar testando."
            ),
        )

    if annotations is None:
        logger.warning("Vision API unavailable")
        if _allow_demo_fallback():
            logger.warning("DEMO_FALLBACK enabled — returning mock response")
            return _build_demo_response()
        raise HTTPException(
            status_code=503,
            detail=(
                "Serviço de visão computacional indisponível. Verifique as "
                "credenciais (GOOGLE_APPLICATION_CREDENTIALS) ou ative "
                "DEMO_MODE=true para testes."
            ),
        )

    if not annotations:
        # API responded but returned zero annotations — image is too blank/noisy.
        waste_info = classification_service.build_waste_info("unknown")
        return ScanResponse(
            success=True,
            waste_info=waste_info,
            detected_labels=[],
            confidence=0.0,
            demo_mode=False,
            low_confidence=True,
        )

    category_key, confidence, ranked = classification_service.classify_annotations(annotations)
    waste_info = classification_service.build_waste_info(category_key)

    # Alternatives: keep up to 3 runner-ups with score > 0
    alternatives = [
        CategoryScore(category=cat, score=round(score, 3))
        for cat, score in ranked[1:4]
        if score > 0
    ]

    return ScanResponse(
        success=True,
        waste_info=waste_info,
        detected_labels=vision_service.annotations_to_label_strings(annotations)[:15],
        confidence=confidence,
        demo_mode=False,
        alternatives=alternatives,
        low_confidence=confidence < LOW_CONFIDENCE_THRESHOLD,
    )


@router.get("/categories", summary="List all waste categories")
def list_categories() -> dict:
    """Expose the static category metadata — useful for the frontend's UI."""
    return {
        "categories": [
            classification_service.build_waste_info(key).model_dump()
            for key in classification_service.CATEGORIES.keys()
        ]
    }
