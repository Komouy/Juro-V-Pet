import dotenv from "dotenv";
import express, { type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleGeminiChatNode } from "./server/geminiChatHandler.ts";

dotenv.config({ path: ".env.local" });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

export async function createApp(): Promise<express.Express> {
  const app = express();
  app.use(express.json({ limit: "256kb" }));

  app.all("/api/gemini/chat", async (req: Request, res: Response) => {
    await handleGeminiChatNode(req, res);
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
