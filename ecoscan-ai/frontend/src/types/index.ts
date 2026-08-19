// ─── Domain Types ────────────────────────────────────────────────────────────

export type WasteCategory =
  | "plastic"
  | "paper"
  | "glass"
  | "metal"
  | "organic"
  | "reject"
  | "unknown";

export type ColorVariant = "yellow" | "blue" | "green" | "red" | "amber" | "gray";

export interface WasteInfo {
  category: WasteCategory;
  label: string;
  is_recyclable: boolean;
  color_hex: string;
  color_name: string;
  color_tailwind: ColorVariant;
  icon_name: string;
  cleaning_instructions: string[];
  disposal_instructions: string;
  description: string;
  eco_tip: string;
}

// ─── API Types ────────────────────────────────────────────────────────────────

export interface ScanRequest {
  image_base64: string;
  demo_mode?: boolean;
}

export interface ScanResponse {
  success: boolean;
  waste_info: WasteInfo | null;
  detected_labels: string[];
  confidence: number;
  demo_mode: boolean;
  alternatives?: CategoryScore[];
  low_confidence?: boolean;
  error?: string;
}

export interface CategoryScore {
  category: string;
  score: number;
}

// ─── UI State Types ───────────────────────────────────────────────────────────

export type AppState = "idle" | "camera" | "preview" | "scanning" | "result" | "error";

export interface ScanState {
  appState: AppState;
  capturedImage: string | null;
  scanResult: ScanResponse | null;
  errorMessage: string | null;
}

// ─── Color Mapping ────────────────────────────────────────────────────────────

export const COLOR_MAP: Record<ColorVariant, {
  bg: string;
  bgLight: string;
  text: string;
  border: string;
  ring: string;
}> = {
  yellow: {
    bg: "bg-yellow-500",
    bgLight: "bg-yellow-900/30",
    text: "text-yellow-400",
    border: "border-yellow-500",
    ring: "ring-yellow-500",
  },
  blue: {
    bg: "bg-blue-500",
    bgLight: "bg-blue-900/30",
    text: "text-blue-400",
    border: "border-blue-500",
    ring: "ring-blue-500",
  },
  green: {
    bg: "bg-green-500",
    bgLight: "bg-green-900/30",
    text: "text-green-400",
    border: "border-green-500",
    ring: "ring-green-500",
  },
  red: {
    bg: "bg-red-500",
    bgLight: "bg-red-900/30",
    text: "text-red-400",
    border: "border-red-500",
    ring: "ring-red-500",
  },
  amber: {
    bg: "bg-amber-700",
    bgLight: "bg-amber-900/30",
    text: "text-amber-500",
    border: "border-amber-600",
    ring: "ring-amber-600",
  },
  gray: {
    bg: "bg-gray-500",
    bgLight: "bg-gray-900/30",
    text: "text-gray-400",
    border: "border-gray-500",
    ring: "ring-gray-500",
  },
};
