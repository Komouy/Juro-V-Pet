// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getChatHistory,
  addChatMessage,
  clearChatHistory,
  getPetMemories,
  addPetMemory,
  removePetMemory,
  clearPetMemories,
  extractMemoriesFromMessage,
  getFormattedGeminiHistory,
} from "../src/services/petMemoryService";
import { buildJuroSystemPrompt } from "../src/services/geminiService";

describe("Pet Memory & Conversation History Service", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("Chat History", () => {
    it("starts with empty history and persists messages across calls", () => {
      expect(getChatHistory()).toEqual([]);

      addChatMessage("user", "Halo Juro!");
      addChatMessage("juro", "Bloop! Halo pemilikku!");

      const history = getChatHistory();
      expect(history.length).toBe(2);
      expect(history[0].sender).toBe("user");
      expect(history[0].text).toBe("Halo Juro!");
      expect(history[1].sender).toBe("juro");
      expect(history[1].text).toBe("Bloop! Halo pemilikku!");
    });

    it("clears chat history cleanly", () => {
      addChatMessage("user", "Pesan 1");
      expect(getChatHistory().length).toBe(1);

      clearChatHistory();
      expect(getChatHistory()).toEqual([]);
    });

    it("formats history for Gemini REST API with strict alternating user/model turns", () => {
      addChatMessage("user", "Aku mau tanya");
      addChatMessage("juro", "Mau tanya apa bloop?");

      const contents = getFormattedGeminiHistory("Kamu suka apa?");
      expect(contents.length).toBe(3);
      expect(contents[0].role).toBe("user");
      expect(contents[0].parts[0].text).toBe("Aku mau tanya");
      expect(contents[1].role).toBe("model");
      expect(contents[1].parts[0].text).toBe("Mau tanya apa bloop?");
      expect(contents[2].role).toBe("user");
      expect(contents[2].parts[0].text).toBe("Kamu suka apa?");
    });
  });

  describe("Long-Term Memories", () => {
    it("adds and deduplicates memories", () => {
      expect(getPetMemories()).toEqual([]);

      const mem1 = addPetMemory("Nama pemilik adalah Dhavi", "profile");
      expect(mem1).not.toBeNull();
      expect(getPetMemories().length).toBe(1);

      // Duplicate attempt should return null and not duplicate
      const dup = addPetMemory("Nama pemilik adalah Dhavi", "profile");
      expect(dup).toBeNull();
      expect(getPetMemories().length).toBe(1);
    });

    it("deletes a memory by id and clears all memories", () => {
      const mem = addPetMemory("Suka bermain bola", "preference");
      expect(mem).not.toBeNull();
      expect(getPetMemories().length).toBe(1);

      removePetMemory(mem!.id);
      expect(getPetMemories().length).toBe(0);

      addPetMemory("Fakta A");
      addPetMemory("Fakta B");
      expect(getPetMemories().length).toBe(2);

      clearPetMemories();
      expect(getPetMemories().length).toBe(0);
    });

    it("extracts owner name automatically from conversation", () => {
      const extracted = extractMemoriesFromMessage("halo juro, namaku Dhavi!");
      expect(extracted.length).toBe(1);
      expect(extracted[0].text).toBe("Nama pemilik adalah Dhavi");
      expect(getPetMemories().some((m) => m.text.includes("Dhavi"))).toBe(true);
    });

    it("extracts favorite food automatically", () => {
      const extracted = extractMemoriesFromMessage("makanan favoritku pudding vanila lezat.");
      expect(extracted.length).toBe(1);
      expect(extracted[0].text).toContain("pudding vanila");
    });

    it("extracts preferences and hobbies automatically", () => {
      const extracted = extractMemoriesFromMessage("aku suka memancing di sungai.");
      expect(extracted.length).toBe(1);
      expect(extracted[0].text).toBe("Pemilik menyukai memancing di sungai");
    });

    it("extracts explicit memory directives", () => {
      const extracted = extractMemoriesFromMessage("ingat ya: Juro adalah slime paling lucu!");
      expect(extracted.length).toBe(1);
      expect(extracted[0].text).toBe("Juro adalah slime paling lucu");
    });
  });

  describe("Gemini System Prompt Integration", () => {
    it("injects remembered facts into Juro's system instruction prompt", () => {
      addPetMemory("Nama pemilik adalah Dhavi", "profile");
      addPetMemory("Pemilik menyukai stroberi segar", "preference");

      const prompt = buildJuroSystemPrompt({
        name: "Juro",
        hunger: 80,
        energy: 80,
        cleanliness: 80,
        happiness: 80,
        affection: 80,
        currentState: "idle",
      });

      expect(prompt).toContain("INGATAN JURO TENTANG PEMILIK:");
      expect(prompt).toContain("Nama pemilik adalah Dhavi");
      expect(prompt).toContain("Pemilik menyukai stroberi segar");
    });
  });
});
