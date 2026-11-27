export interface GeminiContentMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

const DEFAULT_NATIVE_API_BASE_URL = "https://jurovpet.vercel.app";

/**
 * Resolves the Gemini chat endpoint across web (same-origin /api/gemini/chat)
 * and Capacitor Android builds (remote HTTPS API base URL).
 */
export function resolveGeminiEndpoint(): string {
  const configuredBase =
    typeof import.meta !== "undefined"
      ? (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.trim()
      : undefined;

  if (configuredBase) {
    return `${configuredBase.replace(/\/+$/, "")}/api/gemini/chat`;
  }

  if (typeof window !== "undefined") {
    const cap = (
      window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
    ).Capacitor;
    if (cap?.isNativePlatform?.() || window.location.protocol === "capacitor:") {
      return `${DEFAULT_NATIVE_API_BASE_URL}/api/gemini/chat`;
    }
  }

  return "/api/gemini/chat";
}

/**
 * HTTP client for the server-side Gemini AI chat proxy endpoint.
 */
export async function requestGeminiReply(
  systemInstruction: string,
  contents: GeminiContentMessage[],
  timeoutMs = 12000
): Promise<{ ok: true; text: string } | { ok: false; status?: number; errorText?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(resolveGeminiEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction,
        contents,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("Gemini server API error:", response.status, errorText);
      return { ok: false, status: response.status, errorText };
    }

    const data = (await response.json()) as { text?: unknown };
    const text = typeof data.text === "string" ? data.text : "";
    return { ok: true, text };
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn("Gemini chat error, using fallback:", error);
    return { ok: false };
  }
}
