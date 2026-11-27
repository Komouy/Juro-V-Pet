export interface GeminiContentMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
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
    const response = await fetch("/api/gemini/chat", {
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
