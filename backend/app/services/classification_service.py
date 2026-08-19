"""
Classification Service — maps Vision API annotations to waste categories.

Improvements over the previous version:
  * Uses the REAL Vision API confidence scores (instead of label position)
  * Whole-phrase priority matching prevents word-split contamination
    (e.g. "Glass bottle" no longer pollutes the `plastic` score via the
    word "bottle")
  * Multi-source scoring (labels + objects + web entities) with weights
  * Returns an "unknown" verdict with low confidence when nothing matches,
    instead of forcing a wrong "reject" classification
  * Bilingual dictionary (English from Vision API + Portuguese synonyms)
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable

from app.models.schemas import WasteInfo

# ---------------------------------------------------------------------------
# Waste categories — UI + disposal metadata
# ---------------------------------------------------------------------------

CATEGORIES: dict[str, dict] = {
    "plastic": {
        "label": "Plástico",
        "is_recyclable": True,
        "color_hex": "#EAB308",
        "color_name": "Amarelo",
        "color_tailwind": "yellow",
        "icon_name": "Recycle",
        "cleaning_instructions": [
            "Esvazie completamente o recipiente",
            "Enxágue com água para remover resíduos de alimentos",
            "Não precisa estar perfeitamente limpo — apenas sem resíduos sólidos",
            "Remova tampas e rótulos de papel quando possível",
        ],
        "disposal_instructions": "Deposite na lixeira AMARELA ou no ecoponto de plásticos",
        "description": "Material plástico identificado. Polímeros como PET, PEAD e PP são amplamente recicláveis.",
        "eco_tip": "♻️ 1 garrafa PET reciclada economiza energia suficiente para iluminar uma lâmpada por 6 horas!",
    },
    "paper": {
        "label": "Papel / Papelão",
        "is_recyclable": True,
        "color_hex": "#3B82F6",
        "color_name": "Azul",
        "color_tailwind": "blue",
        "icon_name": "FileText",
        "cleaning_instructions": [
            "Mantenha seco — papel molhado não é reciclável",
            "Remova grampos, clipes e fitas adesivas",
            "Desdobre caixas de papelão para economizar espaço",
            "Não misture com papel engordurado (guardanapos, pizza)",
        ],
        "disposal_instructions": "Deposite na lixeira AZUL de coleta seletiva",
        "description": "Papel ou papelão identificado. Evite descartar papel higiênico e papel parafinado — esses são rejeitos.",
        "eco_tip": "🌳 Reciclar 1 tonelada de papel salva até 15 árvores e economiza 50% de energia!",
    },
    "glass": {
        "label": "Vidro",
        "is_recyclable": True,
        "color_hex": "#22C55E",
        "color_name": "Verde",
        "color_tailwind": "green",
        "icon_name": "Wine",
        "cleaning_instructions": [
            "Esvazie e enxágue o recipiente com água",
            "Não quebre o vidro — fragmentos causam acidentes",
            "Remova tampas plásticas ou metálicas separadamente",
            "Espelhos e vidros de janela não são recicláveis junto com embalagens",
        ],
        "disposal_instructions": "Deposite na lixeira VERDE ou no ecoponto de vidro",
        "description": "Material de vidro identificado. O vidro é 100% reciclável e pode ser reprocessado infinitas vezes.",
        "eco_tip": "✨ O vidro é 100% reciclável e infinitamente reutilizável sem perder qualidade!",
    },
    "metal": {
        "label": "Metal",
        "is_recyclable": True,
        "color_hex": "#EAB308",
        "color_name": "Amarelo",
        "color_tailwind": "yellow",
        "icon_name": "Zap",
        "cleaning_instructions": [
            "Esvazie completamente a lata ou embalagem",
            "Enxágue para remover resíduos de alimentos",
            "Amasse levemente para reduzir volume",
            "Cuidado com bordas cortantes",
        ],
        "disposal_instructions": "Deposite na lixeira AMARELA de coleta seletiva",
        "description": "Metal identificado (alumínio, aço, ferro). Latas e embalagens metálicas têm alto valor de reciclagem.",
        "eco_tip": "⚡ Reciclar alumínio usa 95% menos energia do que produzir do zero!",
    },
    "organic": {
        "label": "Orgânico",
        "is_recyclable": False,
        "color_hex": "#A16207",
        "color_name": "Marrom",
        "color_tailwind": "amber",
        "icon_name": "Leaf",
        "cleaning_instructions": [
            "Não é necessário limpar",
            "Separe de materiais recicláveis para evitar contaminação",
            "Considere compostar em casa — é fácil e sustentável",
            "Cascas de frutas, vegetais e sobras de comida são ideais para compostagem",
        ],
        "disposal_instructions": "Deposite na lixeira MARROM (orgânico) ou use para compostagem doméstica",
        "description": "Resíduo orgânico identificado. Alimentos, cascas e restos vegetais podem ser compostados.",
        "eco_tip": "🌱 Composto orgânico caseiro reduz o lixo em até 30% e ainda fertiliza plantas!",
    },
    "reject": {
        "label": "Rejeito",
        "is_recyclable": False,
        "color_hex": "#EF4444",
        "color_name": "Vermelho",
        "color_tailwind": "red",
        "icon_name": "AlertTriangle",
        "cleaning_instructions": [
            "Este material não é reciclável na coleta convencional",
            "Não misture com recicláveis — contamina a carga",
            "Verifique se há ecopontos especializados para este material na sua cidade",
            "Pilhas, eletrônicos e medicamentos têm descarte especial",
        ],
        "disposal_instructions": "Deposite na lixeira CINZA/VERMELHA (rejeito não reciclável)",
        "description": "Material identificado como rejeito. Não contamina recicláveis quando descartado separadamente.",
        "eco_tip": "🔋 Pilhas e eletrônicos devem ir para pontos de coleta especial — nunca no lixo comum!",
    },
    "unknown": {
        "label": "Material não identificado",
        "is_recyclable": False,
        "color_hex": "#6B7280",
        "color_name": "Indefinido",
        "color_tailwind": "gray",
        "icon_name": "AlertTriangle",
        "cleaning_instructions": [
            "A IA não conseguiu identificar o material com segurança",
            "Tente fotografar mais perto, com boa iluminação e fundo neutro",
            "Mostre o item por inteiro e evite reflexos/sombras fortes",
            "Em caso de dúvida, consulte o guia local de coleta seletiva",
        ],
        "disposal_instructions": "Material não identificado — verifique manualmente antes de descartar",
        "description": "Não foi possível classificar este resíduo com confiança suficiente. Tente outra foto com melhor enquadramento.",
        "eco_tip": "💡 Dicas: ilumine bem o objeto, aproxime a câmera e use um fundo neutro para melhor identificação.",
    },
}


# ---------------------------------------------------------------------------
# Label dictionary — phrase → (category, specificity weight)
# Specificity weights:
#   3.0 = strongly material-specific  (e.g. "plastic bottle", "aluminum can")
#   2.0 = clearly material            (e.g. "plastic", "glass", "cardboard")
#   1.0 = generic / ambiguous         (e.g. "bottle", "container", "packaging")
# Higher specificity wins over generic when both match the same image.
# ---------------------------------------------------------------------------

LABEL_DICT: dict[str, tuple[str, float]] = {
    # ───── Plastic ──────────────────────────────────────────────────────────
    "plastic": ("plastic", 2.5),
    "plástico": ("plastic", 2.5),
    "plastic bottle": ("plastic", 3.0),
    "plastic bag": ("plastic", 3.0),
    "plastic cup": ("plastic", 3.0),
    "plastic container": ("plastic", 3.0),
    "plastic wrap": ("plastic", 3.0),
    "plastic packaging": ("plastic", 3.0),
    "garrafa pet": ("plastic", 3.0),
    "pet": ("plastic", 2.5),
    "pet bottle": ("plastic", 3.0),
    "water bottle": ("plastic", 2.5),
    "soft drink": ("plastic", 1.5),
    "polyethylene": ("plastic", 3.0),
    "polypropylene": ("plastic", 3.0),
    "polystyrene": ("plastic", 3.0),
    "pvc": ("plastic", 3.0),
    "styrofoam": ("plastic", 3.0),
    "isopor": ("plastic", 3.0),
    "tupperware": ("plastic", 2.5),
    "food storage containers": ("plastic", 2.0),
    "shampoo": ("plastic", 2.0),
    "detergent": ("plastic", 2.0),
    "straw": ("plastic", 2.0),
    "canudo": ("plastic", 2.0),
    "sacola": ("plastic", 2.0),

    # ───── Paper ────────────────────────────────────────────────────────────
    "paper": ("paper", 2.5),
    "papel": ("paper", 2.5),
    "papelão": ("paper", 3.0),
    "cardboard": ("paper", 3.0),
    "corrugated fiberboard": ("paper", 3.0),
    "newspaper": ("paper", 3.0),
    "jornal": ("paper", 3.0),
    "magazine": ("paper", 3.0),
    "revista": ("paper", 3.0),
    "book": ("paper", 2.5),
    "livro": ("paper", 2.5),
    "notebook": ("paper", 2.0),
    "caderno": ("paper", 2.5),
    "document": ("paper", 2.0),
    "envelope": ("paper", 2.5),
    "carton": ("paper", 2.5),
    "paper bag": ("paper", 3.0),
    "paper cup": ("paper", 2.5),
    "cardboard box": ("paper", 3.0),
    "caixa de papelão": ("paper", 3.0),
    "packaging and labeling": ("paper", 1.0),

    # ───── Glass ────────────────────────────────────────────────────────────
    "glass": ("glass", 2.5),
    "vidro": ("glass", 2.5),
    "glass bottle": ("glass", 3.0),
    "garrafa de vidro": ("glass", 3.0),
    "jar": ("glass", 2.5),
    "pote de vidro": ("glass", 3.0),
    "wine bottle": ("glass", 3.0),
    "beer bottle": ("glass", 3.0),
    "wine glass": ("glass", 3.0),
    "stemware": ("glass", 2.5),
    "drinkware": ("glass", 1.5),
    "glassware": ("glass", 3.0),
    "mason jar": ("glass", 3.0),
    "perfume": ("glass", 1.5),

    # ───── Metal ────────────────────────────────────────────────────────────
    "metal": ("metal", 2.5),
    "aluminum": ("metal", 3.0),
    "aluminium": ("metal", 3.0),
    "alumínio": ("metal", 3.0),
    "aluminum can": ("metal", 3.0),
    "tin can": ("metal", 3.0),
    "beverage can": ("metal", 3.0),
    "lata": ("metal", 3.0),
    "can": ("metal", 2.0),
    "tin": ("metal", 2.5),
    "steel": ("metal", 3.0),
    "stainless steel": ("metal", 3.0),
    "aço": ("metal", 3.0),
    "iron": ("metal", 2.0),
    "ferro": ("metal", 2.5),
    "copper": ("metal", 2.5),
    "cobre": ("metal", 2.5),
    "foil": ("metal", 2.5),
    "papel alumínio": ("metal", 3.0),
    "metalware": ("metal", 2.5),
    "cutlery": ("metal", 1.5),
    "talher": ("metal", 1.5),

    # ───── Organic ──────────────────────────────────────────────────────────
    "food": ("organic", 2.0),
    "comida": ("organic", 2.0),
    "fruit": ("organic", 3.0),
    "fruta": ("organic", 3.0),
    "vegetable": ("organic", 3.0),
    "legume": ("organic", 3.0),
    "verdura": ("organic", 3.0),
    "natural foods": ("organic", 2.5),
    "produce": ("organic", 2.5),
    "ingredient": ("organic", 2.0),
    "leaf": ("organic", 2.5),
    "folha": ("organic", 2.5),
    "plant": ("organic", 2.0),
    "planta": ("organic", 2.0),
    "flower": ("organic", 2.5),
    "flor": ("organic", 2.5),
    "grass": ("organic", 2.5),
    "wood": ("organic", 2.0),
    "madeira": ("organic", 2.0),
    "compost": ("organic", 3.0),
    "banana": ("organic", 3.0),
    "apple": ("organic", 3.0),
    "maçã": ("organic", 3.0),
    "orange": ("organic", 2.5),
    "laranja": ("organic", 2.5),
    "egg": ("organic", 2.5),
    "ovo": ("organic", 2.5),
    "bread": ("organic", 2.5),
    "pão": ("organic", 2.5),
    "meat": ("organic", 2.5),
    "carne": ("organic", 2.5),

    # ───── Reject ───────────────────────────────────────────────────────────
    "battery": ("reject", 3.0),
    "pilha": ("reject", 3.0),
    "bateria": ("reject", 3.0),
    "electronics": ("reject", 3.0),
    "eletrônico": ("reject", 3.0),
    "mobile phone": ("reject", 2.5),
    "celular": ("reject", 2.5),
    "smartphone": ("reject", 2.5),
    "laptop": ("reject", 2.5),
    "computer": ("reject", 2.5),
    "computador": ("reject", 2.5),
    "circuit": ("reject", 2.5),
    "cable": ("reject", 2.0),
    "cabo": ("reject", 2.0),
    "diaper": ("reject", 3.0),
    "fralda": ("reject", 3.0),
    "sanitary": ("reject", 2.5),
    "cigarette": ("reject", 3.0),
    "cigarro": ("reject", 3.0),
    "ceramic": ("reject", 2.5),
    "cerâmica": ("reject", 2.5),
    "porcelain": ("reject", 2.5),
    "porcelana": ("reject", 2.5),
    "light bulb": ("reject", 3.0),
    "lâmpada": ("reject", 3.0),
    "fluorescent lamp": ("reject", 3.0),
    "paint": ("reject", 2.5),
    "tinta": ("reject", 2.0),
    "motor oil": ("reject", 3.0),
    "óleo": ("reject", 1.5),
    "medical": ("reject", 2.5),
    "medication": ("reject", 2.5),
    "medicamento": ("reject", 2.5),
    "remédio": ("reject", 2.5),
    "syringe": ("reject", 3.0),
    "seringa": ("reject", 3.0),
    "mirror": ("reject", 2.5),
    "espelho": ("reject", 2.5),
    "broken glass": ("reject", 3.0),
    "thermometer": ("reject", 2.5),

    # ───── Ambiguous "generic" terms (low weight) ───────────────────────────
    "bottle": ("plastic", 0.8),
    "container": ("plastic", 0.6),
    "packaging": ("plastic", 0.6),
    "cup": ("plastic", 0.5),
    "bag": ("plastic", 0.5),
    "box": ("paper", 0.8),
    "lid": ("plastic", 0.5),
}


# ---------------------------------------------------------------------------
# Annotation type — unified input from vision_service
# ---------------------------------------------------------------------------

@dataclass
class Annotation:
    """A single Vision API annotation, normalized."""
    text: str               # human description, e.g. "Plastic bottle"
    score: float            # 0..1 confidence from the API
    source_weight: float = 1.0  # how much we trust this source
                                # labels=1.0, objects=1.2, web_entities=1.1


# ---------------------------------------------------------------------------
# Core scoring
# ---------------------------------------------------------------------------

_word_re = re.compile(r"[a-zà-ÿ0-9]+", re.IGNORECASE)


def _normalize(text: str) -> str:
    return text.lower().strip()


def _phrase_matches(normalized: str) -> list[tuple[str, float]]:
    """
    Return all (category, specificity) pairs that match a normalized phrase.

    Priority:
      1. Exact phrase match  → return immediately (strongest signal).
      2. Token-level match (bigrams first, then single tokens), keeping only
         the highest-specificity hit per category to prevent ambiguous
         tokens (e.g. "bottle") from polluting the score when a more
         specific phrase ("glass bottle") is present in the same annotation.
    """
    if normalized in LABEL_DICT:
        return [LABEL_DICT[normalized]]

    best_per_category: dict[str, float] = {}
    tokens = _word_re.findall(normalized)
    bigrams = [f"{tokens[i]} {tokens[i + 1]}" for i in range(len(tokens) - 1)]
    for candidate in bigrams + tokens:
        hit = LABEL_DICT.get(candidate)
        if hit is None:
            continue
        cat, spec = hit
        if spec > best_per_category.get(cat, 0):
            best_per_category[cat] = spec
    return list(best_per_category.items())


def classify_annotations(
    annotations: Iterable[Annotation],
) -> tuple[str, float, list[tuple[str, float]]]:
    """
    Score and rank waste categories using ALL annotations.

    Returns (best_category, confidence, ranked_alternatives) where
    ranked_alternatives is [(category, score), ...] sorted descending.

    The confidence value combines:
      - dominance:    top_score / sum_of_all_scores
      - margin:       (top_score - runner_up) / top_score
      - corroboration: how many annotations agreed (bonus, capped)
    """
    scores: dict[str, float] = {c: 0.0 for c in CATEGORIES if c != "unknown"}
    matched_phrases = 0

    for ann in annotations:
        normalized = _normalize(ann.text)
        matches = _phrase_matches(normalized)
        if not matches:
            continue
        matched_phrases += 1
        for category, specificity in matches:
            scores[category] += max(ann.score, 0.05) * specificity * ann.source_weight

    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    top_cat, top_score = ranked[0]
    runner_score = ranked[1][1] if len(ranked) > 1 else 0.0

    if top_score <= 0 or matched_phrases == 0:
        return "unknown", 0.25, ranked

    total = sum(scores.values()) or 1.0
    dominance = top_score / total
    margin = (top_score - runner_score) / top_score if top_score else 0.0
    raw_confidence = 0.55 * dominance + 0.45 * margin
    corroboration = min(matched_phrases / 6.0, 1.0) * 0.15
    confidence = min(0.98, max(0.30, raw_confidence + corroboration))

    return top_cat, round(confidence, 2), ranked


def build_waste_info(category_key: str) -> WasteInfo:
    cat = CATEGORIES.get(category_key) or CATEGORIES["unknown"]
    return WasteInfo(
        category=category_key if category_key in CATEGORIES else "unknown",
        label=cat["label"],
        is_recyclable=cat["is_recyclable"],
        color_hex=cat["color_hex"],
        color_name=cat["color_name"],
        color_tailwind=cat["color_tailwind"],
        icon_name=cat["icon_name"],
        cleaning_instructions=cat["cleaning_instructions"],
        disposal_instructions=cat["disposal_instructions"],
        description=cat["description"],
        eco_tip=cat["eco_tip"],
    )


# ---------------------------------------------------------------------------
# Legacy adapter — keeps any external callers compatible
# ---------------------------------------------------------------------------

def classify_labels(labels: list[str]) -> tuple[str, float]:
    """Legacy wrapper used by old code paths that only pass strings."""
    annotations = [
        Annotation(text=label, score=max(0.95 - i * 0.05, 0.3))
        for i, label in enumerate(labels)
    ]
    category, confidence, _ = classify_annotations(annotations)
    return category, confidence
