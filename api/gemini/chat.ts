import type { IncomingMessage, ServerResponse } from "node:http";
import { handleGeminiChatNode } from "../../server/geminiChatHandler.ts";

/**
 * Vercel Serverless Function endpoint for POST /api/gemini/chat.
 */
export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
): Promise<void> {
  await handleGeminiChatNode(req, res);
}
