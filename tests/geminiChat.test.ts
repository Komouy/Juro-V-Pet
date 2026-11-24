// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildJuroSystemPrompt,
  sanitizeJuroReply,
  chatWithJuro,
  computePetExpression,
  computePetActivity,
  getContextualFallbackReply,
  JURO_FALLBACK_REPLIES,
} from "../src/services/geminiService";

describe("Gemini AI Chat Service", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
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
      expect(prompt).toContain("DILARANG KERAS menyisipkan emoji");
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

      expect(rainyPrompt).toContain("Cuaca sedang hujan.");

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

    it("includes spontaneous monologue directive when isSpontaneous is true", () => {
      const prompt = buildJuroSystemPrompt({
        name: "Juro",
        hunger: 80,
        energy: 80,
        cleanliness: 80,
        happiness: 80,
        affection: 80,
        currentState: "idle",
        isSpontaneous: true,
      });
      expect(prompt).toContain("celetukan spontan/gumamanmu sendiri");
    });

    it("includes explicit condition and expression behavioral instructions", () => {
      const prompt = buildJuroSystemPrompt({
        name: "Juro",
        hunger: 20,
        energy: 80,
        cleanliness: 80,
        happiness: 80,
        affection: 80,
        currentState: "idle",
      });
      expect(prompt).toContain("KONDISI & EKSPRESI JURO SAAT INI");
      expect(prompt).toContain("lapar");
    });
  });

  describe("computePetExpression & computePetActivity", () => {
    it("computes dizzy expression when isDizzy is true", () => {
      const expr = computePetExpression({
        hunger: 80,
        energy: 80,
        cleanliness: 80,
        happiness: 80,
        affection: 80,
        isDizzy: true,
      });
      expect(expr).toContain("pusing");
    });

    it("computes sleeping expression when isSleeping is true", () => {
      const expr = computePetExpression({
        hunger: 80,
        energy: 80,
        cleanliness: 80,
        happiness: 80,
        affection: 80,
        isSleeping: true,
      });
      expect(expr).toContain("tertidur lelap");
    });

    it("prioritizes lowest stat below 45 (hunger, energy, affection, happiness)", () => {
      expect(
        computePetExpression({
          hunger: 30,
          energy: 90,
          cleanliness: 90,
          happiness: 90,
          affection: 90,
        })
      ).toContain("lapar");

      expect(
        computePetExpression({
          hunger: 90,
          energy: 25,
          cleanliness: 90,
          happiness: 90,
          affection: 90,
        })
      ).toContain("lelah / mengantuk");

      expect(
        computePetExpression({
          hunger: 90,
          energy: 90,
          cleanliness: 90,
          happiness: 90,
          affection: 20,
        })
      ).toContain("cemberut / ngambek");

      expect(
        computePetExpression({
          hunger: 90,
          energy: 90,
          cleanliness: 90,
          happiness: 35,
          affection: 90,
        })
      ).toContain("bosan");
    });

    it("computes human-readable activity strings for various interactions", () => {
      expect(
        computePetActivity({
          currentState: "eating",
          currentFoodName: "Puding Mangga",
        })
      ).toContain("Puding Mangga");

      expect(
        computePetActivity({
          currentState: "play",
          currentToyName: "Bola Pantul",
        })
      ).toContain("Bola Pantul");

      expect(
        computePetActivity({
          isPetting: true,
        })
      ).toContain("dielus-elus");

      expect(
        computePetActivity({
          isBathing: true,
        })
      ).toContain("dimandikan");
    });

    it("returns immediate contextual fallback replies matching the pet state", () => {
      expect(getContextualFallbackReply({ hunger: 20 } as any)).toMatch(/Perut|camilan/i);
      expect(getContextualFallbackReply({ isSleeping: true } as any)).toMatch(/Zzz|tidur|mimpi/i);
      expect(getContextualFallbackReply({ isDizzy: true } as any)).toMatch(/berputar|pusing/i);
      expect(getContextualFallbackReply({ isPetting: true } as any)).toMatch(/elus/i);
      expect(getContextualFallbackReply({ isBathing: true } as any)).toMatch(/busa|sabun|bersih/i);
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

  describe("chatWithJuro", () => {
    it("posts chat context and history to /api/gemini/chat and returns sanitized reply", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          text: "**Juro** lagi asyik melompat-lompat gembira!",
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const reply = await chatWithJuro("Lagi ngapain Juro?");
      expect(reply).toBe("Juro lagi asyik melompat-lompat gembira!");
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("/api/gemini/chat");
      expect(init.method).toBe("POST");
      const parsedBody = JSON.parse(String(init.body));
      expect(typeof parsedBody.systemInstruction).toBe("string");
      expect(Array.isArray(parsedBody.contents)).toBe(true);
      expect(parsedBody.contents.at(-1)?.parts?.[0]?.text).toContain("Lagi ngapain Juro?");
    });

    it("falls back to contextual reply when server returns an error response", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => JSON.stringify({ error: "Gemini API key is not configured on the server." }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const reply = await chatWithJuro("Halo Juro!");
      expect(typeof reply).toBe("string");
      expect(reply.length).toBeGreaterThan(0);
      expect(JURO_FALLBACK_REPLIES).toContain(reply);
    });

    it("gracefully catches fetch failures and returns a fallback reply", async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error("Network Error"));
      vi.stubGlobal("fetch", fetchMock);

      const reply = await chatWithJuro("Apa kabar?");
      expect(typeof reply).toBe("string");
      expect(reply.length).toBeGreaterThan(0);
      expect(JURO_FALLBACK_REPLIES).toContain(reply);
    });
  });
});
