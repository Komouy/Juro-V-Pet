import { describe, it, expect } from "vitest";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { sanitizeRoomCode } from "../src/services/firebase/juroSyncService";
import { resolveGeminiEndpoint } from "../src/services/geminiClient";
import { handleGeminiChatNode } from "../server/geminiChatHandler";

function createMockResponse() {
  const headers: Record<string, string> = {};
  let body = "";
  const res = {
    statusCode: 200,
    setHeader(name: string, val: string) {
      headers[name.toLowerCase()] = val;
    },
    end(chunk?: string) {
      if (chunk) body += chunk;
    },
  };
  return {
    res: res as unknown as ServerResponse,
    getStatus: () => res.statusCode,
    getHeaders: () => headers,
    getJson: () => (body ? JSON.parse(body) : null),
  };
}

describe("Pairing, API Handler & Deployment Contracts", () => {
  it("sanitizes pairing room codes safely against invalid RTDB path characters", () => {
    expect(sanitizeRoomCode("  juro-5821 ")).toBe("JURO-5821");
    expect(sanitizeRoomCode("juro/58.21#$[]")).toBe("JURO5821");
    expect(sanitizeRoomCode("   ")).toBe("");
  });

  it("resolves /api/gemini/chat on standard web environments", () => {
    expect(resolveGeminiEndpoint()).toBe("/api/gemini/chat");
  });

  it("rejects non-POST methods with 405 and handles OPTIONS preflight cleanly", async () => {
    const reqGet = Readable.from([]) as unknown as IncomingMessage;
    reqGet.method = "GET";
    reqGet.headers = { origin: "https://localhost" };
    const mockGet = createMockResponse();

    await handleGeminiChatNode(reqGet, mockGet.res, "test-key");
    expect(mockGet.getStatus()).toBe(405);
    expect(mockGet.getHeaders()["access-control-allow-origin"]).toBe("https://localhost");

    const reqOpt = Readable.from([]) as unknown as IncomingMessage;
    reqOpt.method = "OPTIONS";
    reqOpt.headers = {};
    const mockOpt = createMockResponse();

    await handleGeminiChatNode(reqOpt, mockOpt.res);
    expect(mockOpt.getStatus()).toBe(204);
  });

  it("returns 503 when Gemini API key is missing and 400 for invalid payloads", async () => {
    const prevKey = process.env.GEMINI_API_KEY;
    const prevViteKey = process.env.VITE_GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.VITE_GEMINI_API_KEY;

    try {
      const reqNoKey = Readable.from([JSON.stringify({ contents: [] })]) as unknown as IncomingMessage;
      reqNoKey.method = "POST";
      reqNoKey.headers = {};
      const mockNoKey = createMockResponse();

      await handleGeminiChatNode(reqNoKey, mockNoKey.res, "");
      expect(mockNoKey.getStatus()).toBe(503);

      const reqBadBody = Readable.from([
        JSON.stringify({ contents: [{ role: "invalid", parts: [] }] }),
      ]) as unknown as IncomingMessage;
      reqBadBody.method = "POST";
      reqBadBody.headers = {};
      const mockBadBody = createMockResponse();

      await handleGeminiChatNode(reqBadBody, mockBadBody.res, "dummy-key");
      expect(mockBadBody.getStatus()).toBe(400);
    } finally {
      if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
      if (prevViteKey !== undefined) process.env.VITE_GEMINI_API_KEY = prevViteKey;
    }
  });
});
