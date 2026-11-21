import { describe, it, expect } from "vitest";
import {
  getCognitiveTier,
  computePetEmotionalState,
} from "../src/engine/ai/cognitiveCore";
import {
  buildJuroSystemPrompt,
  getContextualFallbackReply,
  computePetActivity,
  computePetLocation,
  computePetEnvironment,
} from "../src/services/geminiService";

describe("Cognitive AI Core & Developmental Progression", () => {
  it("maps pet level dynamically across 5 distinct developmental tiers", () => {
    // Level 1-2: Tunas Pikiran
    expect(getCognitiveTier(1).tier).toBe(1);
    expect(getCognitiveTier(1).name).toBe("Tunas Pikiran");
    expect(getCognitiveTier(2).tier).toBe(1);

    // Level 3-4: Kognisi Belajar
    expect(getCognitiveTier(3).tier).toBe(2);
    expect(getCognitiveTier(3).name).toBe("Kognisi Belajar");
    expect(getCognitiveTier(4).tier).toBe(2);

    // Level 5-6: Pikiran Adaptif
    expect(getCognitiveTier(5).tier).toBe(3);
    expect(getCognitiveTier(5).name).toBe("Pikiran Adaptif");
    expect(getCognitiveTier(6).tier).toBe(3);

    // Level 7-8: Akal Cendikia
    expect(getCognitiveTier(7).tier).toBe(4);
    expect(getCognitiveTier(7).name).toBe("Akal Cendikia");
    expect(getCognitiveTier(8).tier).toBe(4);

    // Level 9-10+: Kesadaran Bijak
    expect(getCognitiveTier(9).tier).toBe(5);
    expect(getCognitiveTier(9).name).toBe("Kesadaran Bijak");
    expect(getCognitiveTier(12).tier).toBe(5);
  });

  it("evaluates emotional condition accurately for various context states", () => {
    // Petting state: very affectionate & pampering
    const petState = computePetEmotionalState({ affection: 90 }, { isPetting: true });
    expect(petState.primaryEmotion).toContain("Manja");
    expect(petState.moodIntensity).toBe("meluap-luap");

    // Bench sitting: peaceful & contemplative
    const benchState = computePetEmotionalState(
      { happiness: 85 },
      { isSittingOnBench: true }
    );
    expect(benchState.primaryEmotion).toContain("Damai");

    // In water: refreshing swim
    const waterState = computePetEmotionalState(
      { happiness: 80 },
      { isInWater: true }
    );
    expect(waterState.primaryEmotion).toContain("Air");

    // Dizzy state: dizzy & stars
    const dizzyState = computePetEmotionalState({}, { isDizzy: true });
    expect(dizzyState.primaryEmotion).toContain("Pusing");

    // Hungry state
    const hungryState = computePetEmotionalState({ hunger: 15 });
    expect(hungryState.primaryEmotion).toContain("Lapar");
  });

  it("injects cognitive tier and emotional state into Gemini system prompt", () => {
    const prompt = buildJuroSystemPrompt({
      name: "Juro",
      hunger: 80,
      energy: 85,
      cleanliness: 90,
      happiness: 95,
      affection: 90,
      currentState: "wander",
      level: 5,
      isSittingOnBench: true,
      isInWater: false,
    });

    expect(prompt).toContain("Pikiran Adaptif");
    expect(prompt).toContain("PERKEMBANGAN PIKIRAN & KESADARAN JURO");
    expect(prompt).toContain("KONDISI EMOSIONAL & KESADARAN DIRI SAAT INI");
    expect(prompt).toContain("Damai & Kontemplatif");
  });

  it("responds contextually to feeling inquiries and activities in offline fallback mode", () => {
    // When user asks about feelings
    const feelingReply = getContextualFallbackReply(
      {
        name: "Juro",
        hunger: 85,
        energy: 85,
        cleanliness: 90,
        happiness: 90,
        affection: 90,
        currentState: "idle",
        level: 3,
        isSittingOnBench: true,
      },
      "Bagaimana perasaanmu sekarang?"
    );
    expect(feelingReply.toLowerCase()).toContain("perasaan juro");

    // When sitting on bench
    const benchReply = getContextualFallbackReply({
      name: "Juro",
      hunger: 80,
      energy: 80,
      cleanliness: 80,
      happiness: 80,
      affection: 80,
      currentState: "idle",
      isSittingOnBench: true,
    });
    expect(benchReply.toLowerCase()).toContain("kursi");

    // When in water
    const waterReply = getContextualFallbackReply({
      name: "Juro",
      hunger: 80,
      energy: 80,
      cleanliness: 80,
      happiness: 80,
      affection: 80,
      currentState: "wander",
      isInWater: true,
    });
    expect(waterReply.toLowerCase()).toContain("air");
  });

  it("computes pet activity for sitting on bench and swimming in water", () => {
    const benchActivity = computePetActivity({
      currentState: "idle",
      isSittingOnBench: true,
    });
    expect(benchActivity).toContain("kursi");

    const waterActivity = computePetActivity({
      currentState: "wander",
      isInWater: true,
    });
    expect(waterActivity).toContain("sungai");
  });

  it("computes pet location awareness (dimana) correctly across map features", () => {
    const benchLoc = computePetLocation({ isSittingOnBench: true });
    expect(benchLoc.locationName).toBe("Bangku Kayu Bukit Timur");

    const waterLoc = computePetLocation({ isInWater: true });
    expect(waterLoc.locationName).toBe("Aliran Sungai Jernih Lembah");

    const sleepLoc = computePetLocation({ isSleeping: true });
    expect(sleepLoc.locationName).toBe("Kasur Daun Sudut Lembah");

    const meadowLoc = computePetLocation({});
    expect(meadowLoc.locationName).toBe("Padang Rumput Lembah Juro");
  });

  it("computes ambient environment awareness (ada apa) for rain, night, and day", () => {
    const rainAmb = computePetEnvironment({ isRaining: true });
    expect(rainAmb.toLowerCase()).toContain("hujan");

    const nightAmb = computePetEnvironment({ isNight: true });
    expect(nightAmb.toLowerCase()).toContain("malam");

    const dayAmb = computePetEnvironment({});
    expect(dayAmb.toLowerCase()).toContain("siang");
  });

  it("responds with self-awareness to questions about activity, location, and environment", () => {
    const baseContext = {
      name: "Juro",
      hunger: 80,
      energy: 80,
      cleanliness: 80,
      happiness: 80,
      affection: 80,
      currentState: "idle",
      level: 3,
      isSittingOnBench: true,
    };

    // Location inquiry ("dimana")
    const locReply = getContextualFallbackReply(baseContext, "Kamu ada dimana sekarang?");
    expect(locReply.toLowerCase()).toContain("bangku kayu bukit timur");

    // Activity inquiry ("lagi apa")
    const actReply = getContextualFallbackReply(baseContext, "Juro lagi apa?");
    expect(actReply.toLowerCase()).toContain("duduk");

    // Environmental inquiry ("ada apa")
    const envReply = getContextualFallbackReply(baseContext, "Ada apa di sekitarmu?");
    expect(envReply.toLowerCase()).toContain("lembah");
  });

  it("generates situational speech for feeding, playing, bathing, and petting", () => {
    // Feeding reaction
    const feedReply = getContextualFallbackReply({
      name: "Juro",
      hunger: 90,
      energy: 70,
      cleanliness: 80,
      happiness: 80,
      affection: 80,
      currentState: "eating",
      currentFoodName: "Melon Segar",
      interactionType: "feed",
      level: 3,
    });
    expect(feedReply.toLowerCase()).toContain("melon segar");
    expect(feedReply.toLowerCase()).toMatch(/lezat|kenyang|segar/i);

    // Playing reaction
    const playReply = getContextualFallbackReply({
      name: "Juro",
      hunger: 80,
      energy: 70,
      cleanliness: 80,
      happiness: 90,
      affection: 80,
      currentState: "play",
      currentToyName: "Bola Pantul",
      interactionType: "play",
      level: 3,
    });
    expect(playReply.toLowerCase()).toContain("bola pantul");
    expect(playReply.toLowerCase()).toContain("lompat");

    // Bathing reaction
    const bathReply = getContextualFallbackReply({
      name: "Juro",
      hunger: 80,
      energy: 70,
      cleanliness: 90,
      happiness: 80,
      affection: 80,
      currentState: "idle",
      interactionType: "bath_rinse",
      level: 3,
    });
    expect(bathReply.toLowerCase()).toMatch(/busa|sabun|bersih/i);

    // Petting reaction
    const petReply = getContextualFallbackReply({
      name: "Juro",
      hunger: 80,
      energy: 70,
      cleanliness: 80,
      happiness: 80,
      affection: 95,
      currentState: "idle",
      interactionType: "pet",
      level: 3,
    });
    expect(petReply.toLowerCase()).toContain("elus");
  });
});
