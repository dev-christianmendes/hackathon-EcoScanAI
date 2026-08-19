from typing import Optional

from pydantic import BaseModel, Field


class ScanRequest(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded image string (data URI ok)")
    demo_mode: Optional[bool] = Field(
        False, description="Use mock data instead of Vision API"
    )


class WasteInfo(BaseModel):
    category: str
    label: str
    is_recyclable: bool
    color_hex: str
    color_name: str
    color_tailwind: str
    icon_name: str
    cleaning_instructions: list[str]
    disposal_instructions: str
    description: str
    eco_tip: str


class CategoryScore(BaseModel):
    category: str
    score: float


class ScanResponse(BaseModel):
    success: bool
    waste_info: Optional[WasteInfo] = None
    detected_labels: list[str] = []
    confidence: float = 0.0
    demo_mode: bool = False
    # New: ranked alternatives the UI can show when confidence is low
    alternatives: list[CategoryScore] = []
    # New: explicit low-confidence signal so the UI can warn the user
    low_confidence: bool = False
    error: Optional[str] = None
