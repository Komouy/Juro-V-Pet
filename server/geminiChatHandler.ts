import type { IncomingMessage, ServerResponse } from "node:http";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";

export const chatPartSchema = z.object({
  text: z.string().trim().min(1).max(4000),
});

export const chatTurnSchema = z.object({
  role: z.enum(["user", "model"]),
  parts: z.array(chatPartSchema).min(1).max(5),
});

export const chatRequestSchema = z.object({
  systemInstruction: z.string().max(12000).optional(),
  contents: z.array(chatTurnSchema).min(1).max(30),
});

export type ChatRequestPayload = z.infer<typeof chatRequestSchema>;

const ALLOWED_CORS_ORIGINS = new Set([
  "https://localhost",
  "capacitor://localhost",
  "http://localhost",
  "http://localhost:5173",
  "http://localhost:3000",
]);

function resolveGeminiModels(): string[] {
  return [process.env.GEMINI_MODEL?.trim(), "gemini-2.5-flash", "gemini-2.0-flash"].filter(
    (m, idx, arr): m is string => Boolean(m) && arr.indexOf(m) === idx
  );
}

export function resolveGeminiApiKey(overrideKey?: string): string | null {
  const candidate = (
    overrideKey ??
    process.env.GEMINI_API_KEY ??
    process.env.VITE_GEMINI_API_KEY ??
    ""
  ).trim();
  return candidate.length > 0 ? candidate : null;
}

export function getErrorStatus(error: unknown): number {
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    if (Number.isInteger(status) && status >= 400 && status < 600) {
      return status;
    }
  }
  return 502;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Gemini API request failed.";
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 503 || status === 504;
}

/**
 * Generates a Gemini chat reply with automatic model fallback and transient error retries.
 */
export async function executeGeminiChat(
  payload: ChatRequestPayload,
  apiKey: string
): Promise<string> {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const models = resolveGeminiModels();
  let lastError: unknown;

  for (const model of models) {
    const maxAttempts = 2;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const isGemini25Plus =
          model.includes("2.5") || model.includes("3") || model.includes("4");
        const response = await ai.models.generateContent({
          model,
          contents: payload.contents,
          config: {
            ...(payload.systemInstruction
              ? { systemInstruction: payload.systemInstruction }
              : {}),
            ...(isGemini25Plus
              ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
              : {}),
          },
        });

        const replyText = response.text;
        if (!replyText || typeof replyText !== "string") {
          throw Object.assign(new Error("Empty response from Gemini API."), {
            status: 502,
          });
        }
        return replyText;
      } catch (error) {
        lastError = error;
        const status = getErrorStatus(error);
        if (status === 404) {
          break;
        }
        if (attempt < maxAttempts - 1 && isRetryableStatus(status)) {
          await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
          continue;
        }
        throw error;
      }
    }
  }

  throw lastError;
}

function applyCorsHeaders(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin;
  if (typeof origin === "string" && (ALLOWED_CORS_ORIGINS.has(origin) || origin.endsWith(".vercel.app"))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage & { body?: unknown }): Promise<unknown> {
  if (req.body !== undefined) {
    if (typeof req.body === "string") {
      return JSON.parse(req.body);
    }
    return req.body;
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  const maxBytes = 256 * 1024;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buf.length;
    if (totalBytes > maxBytes) {
      throw Object.assign(new Error("Payload too large."), { status: 413 });
    }
    chunks.push(buf);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
}

/**
 * Framework-agnostic Node HTTP handler shared by Vercel Serverless Functions,
 * Express server, and Vite dev middleware.
 */
export async function handleGeminiChatNode(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
  overrideApiKey?: string
): Promise<void> {
  applyCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  const apiKey = resolveGeminiApiKey(overrideApiKey);
  if (!apiKey) {
    sendJson(res, 503, { error: "Gemini API key is not configured on the server." });
    return;
  }

  let rawBody: unknown;
  try {
    rawBody = await readJsonBody(req);
  } catch (err) {
    const status = getErrorStatus(err) === 413 ? 413 : 400;
    sendJson(res, status, {
      error: status === 413 ? "Request payload too large." : "Invalid JSON body.",
    });
    return;
  }

  const parsed = chatRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    sendJson(res, 400, { error: "Invalid chat request payload." });
    return;
  }

  try {
    const text = await executeGeminiChat(parsed.data, apiKey);
    sendJson(res, 200, { text });
  } catch (error) {
    const status = getErrorStatus(error);
    const message = getErrorMessage(error);
    console.error("Server Gemini API error:", status, message);
    sendJson(res, status, { error: message });
  }
}
