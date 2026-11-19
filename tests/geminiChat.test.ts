// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildJuroSystemPrompt,
  sanitizeJuroReply,
  getGeminiApiKey,
  setGeminiApiKey,
  chatWithJuro,
  JURO_FALLBACK_REPLIES,
} from "../src/services/geminiService";

describe("Gemini AI Chat Service", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("buildJuroSystemPrompt", () => {
    it("generates prompt containing pet name and brevity rules", () => {
      const prompt = buildJuroSystemPrompt({
        name: "JuroTest",
        hunger: 80,
        energy: 60,
        cleanliness: 90,
        happiness: 95,
        affection: 100,
        currentState: "idle",
        isNight: false,
        isRaining: false,
      });

      expect(prompt).toContain("JuroTest");
      expect(prompt).toContain("80/100");
      expect(prompt).toContain("60/100");
      expect(prompt).toContain("idle");
      expect(prompt).toContain("Cuaca cerah");
      expect(prompt).toContain("MAKSIMAL 1 SAMPAI 2 KALIMAT PENDEK");
      expect(prompt).toContain("Bloop!");
    });

    it("handles rainy and night weather conditions in context", () => {
      const rainyPrompt = buildJuroSystemPrompt({
        name: "Juro",
        hunger: 50,
        energy: 50,
        cleanliness: 50,
        happiness: 50,
        affection: 50,
        currentState: "sleeping",
        isNight: true,
        isRaining: true,
      });

      expect(rainyPrompt).toContain("hujan pixel");

      const nightPrompt = buildJuroSystemPrompt({
        name: "Juro",
        hunger: 50,
        energy: 50,
        cleanliness: 50,
        happiness: 50,
        affection: 50,
        currentState: "idle",
        isNight: true,
        isRaining: false,
      });

      expect(nightPrompt).toContain("malam hari");
    });

    it("falls back to default pet name when context is undefined", () => {
      const prompt = buildJuroSystemPrompt();
      expect(prompt).toContain("Juro");
    });
  });

  describe("sanitizeJuroReply", () => {
    it("removes markdown formatting like bold, italics, quotes, and hashtags", () => {
      const dirty = `**"Bloop!"** *Juro* senang #bermain denganmu!`;
      const cleaned = sanitizeJuroReply(dirty);
      expect(cleaned).toBe("Bloop! Juro senang bermain denganmu!");
    });

    it("returns a fallback when reply is empty", () => {
      const cleaned = sanitizeJuroReply("");
      expect(JURO_FALLBACK_REPLIES).toContain(cleaned);
    });

    it("truncates excessively long text at sentence boundary or hard limit", () => {
      const longText = "Bloop! ".repeat(35); // over 200 chars
      const cleaned = sanitizeJuroReply(longText);
      expect(cleaned.length).toBeLessThanOrEqual(160);
      expect(cleaned.endsWith("...") || cleaned.endsWith("!")).toBe(true);
    });
  });

  describe("API Key storage", () => {
    it("stores and retrieves the Gemini API key from localStorage", () => {
      expect(getGeminiApiKey()).toBeNull();
      setGeminiApiKey("AIzaSyTest12345");
      expect(getGeminiApiKey()).toBe("AIzaSyTest12345");
    });

    it("removes the API key when set to empty string", () => {
      setGeminiApiKey("AIzaSyTest12345");
      expect(getGeminiApiKey()).toBe("AIzaSyTest12345");
      setGeminiApiKey("   ");
      expect(getGeminiApiKey()).toBeNull();
    });
  });

  describe("chatWithJuro", () => {
    it("returns a canned in-character fallback reply when no API key is set", async () => {
      const reply = await chatWithJuro("Halo Juro!");
      expect(typeof reply).toBe("string");
      expect(reply.length).toBeGreaterThan(0);
      expect(JURO_FALLBACK_REPLIES).toContain(reply);
    });

    it("fetches from Gemini REST API when API key is provided and returns clean reply", async () => {
      setGeminiApiKey("AIzaSyFakeKey");

      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: "Bloop! Juro lagi asyik melompat-lompat gembira!" }],
            },
          },
        ],
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      vi.stubGlobal("fetch", fetchMock);

      const reply = await chatWithJuro("Lagi ngapain Juro?");
      expect(reply).toBe("Bloop! Juro lagi asyik melompat-lompat gembira!");
      expect(fetchMock).toHaveBeenCalledTimes(1);

      vi.unstubAllGlobals();
    });

    it("gracefully catches fetch failures and returns a fallback reply", async () => {
      setGeminiApiKey("AIzaSyFakeKey");

      const fetchMock = vi.fn().mockRejectedValue(new Error("Network Error"));
      vi.stubGlobal("fetch", fetchMock);

      const reply = await chatWithJuro("Apa kabar?");
      expect(typeof reply).toBe("string");
      expect(reply.length).toBeGreaterThan(0);
      expect(JURO_FALLBACK_REPLIES).toContain(reply);

      vi.unstubAllGlobals();
    });
  });
});
