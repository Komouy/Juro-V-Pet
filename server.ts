import dotenv from "dotenv";
import express, { type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";

dotenv.config({ path: ".env.local" });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_GEMINI_MODELS = [
  process.env.GEMINI_MODEL?.trim(),
  "gemini-2.5-flash",
  "gemini-2.0-flash",
].filter((m, idx, arr): m is string => Boolean(m) && arr.indexOf(m) === idx);
const PORT = Number(process.env.PORT) || 3000;

const chatPartSchema = z.object({
  text: z.string().trim().min(1).max(4000),
});

const chatTurnSchema = z.object({
  role: z.enum(["user", "model"]),
  parts: z.array(chatPartSchema).min(1).max(5),
});

const chatRequestSchema = z.object({
  systemInstruction: z.string().max(12000).optional(),
  contents: z.array(chatTurnSchema).min(1).max(30),
});

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function getErrorStatus(error: unknown): number {
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    if (Number.isInteger(status) && status >= 400 && status < 600) {
      return status;
    }
  }
  return 502;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Gemini API request failed.";
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 503 || status === 504;
}

async function generateWithRetry(
  ai: GoogleGenAI,
  payload: z.infer<typeof chatRequestSchema>
): Promise<string> {
  let lastError: unknown;

  for (const model of DEFAULT_GEMINI_MODELS) {
    const maxAttempts = 2;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const isGemini25Plus = model.includes("2.5") || model.includes("3") || model.includes("4");
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
          // Try next configured fallback model
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

export async function createApp(): Promise<express.Express> {
  const app = express();
  app.use(express.json({ limit: "256kb" }));

  app.post("/api/gemini/chat", async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "Gemini API key is not configured on the server.",
      });
    }

    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid chat request payload.",
      });
    }

    try {
      const text = await generateWithRetry(ai, parsed.data);
      return res.json({ text });
    } catch (error) {
      const status = getErrorStatus(error);
      const message = getErrorMessage(error);
      console.error("Server Gemini API error:", status, message);
      return res.status(status).json({ error: message });
    }
  });

  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({ error: "API route not found." });
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.use((_req: Request, res: Response) => {
        res.sendFile(path.join(distDir, "index.html"));
      });
    }
  }

  return app;
}

const isMainEntry =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === __filename;

if (isMainEntry) {
  createApp()
    .then((app) => {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Juro server listening on http://0.0.0.0:${PORT}`);
      });
    })
    .catch((error) => {
      console.error("Failed to start server:", error);
      process.exit(1);
    });
}
