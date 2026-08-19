import { ScanRequest, ScanResponse } from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SCAN_TIMEOUT_MS = 25_000;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = SCAN_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function scanWaste(payload: ScanRequest): Promise<ScanResponse> {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${API_BASE_URL}/api/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Tempo esgotado ao analisar a imagem. Tente novamente.");
    }
    throw new Error(
      "Failed to fetch: backend inacessível. Verifique sua conexão e se o servidor está ativo.",
    );
  }

  if (!response.ok) {
    let detail = "";
    try {
      const data = await response.json();
      detail = data?.detail || data?.error || JSON.stringify(data);
    } catch {
      detail = await response.text().catch(() => "");
    }
    throw new ApiError(response.status, detail || `Erro ${response.status}`);
  }

  return (await response.json()) as ScanResponse;
}

export async function healthCheck(): Promise<{
  status: string;
  demo_mode: boolean;
}> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/health`, {}, 5_000);
  return response.json();
}
