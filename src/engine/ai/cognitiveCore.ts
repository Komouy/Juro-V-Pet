import type { PetAttributes } from "../../types/pet";

export interface CognitiveStageInfo {
  tier: number; // 1 to 5
  name: string;
  archetype: string;
  description: string;
  speechGuidance: string;
  vocabularyLevel: string;
  unlockLevels: string;
}

export interface PetEmotionalState {
  primaryEmotion: string;
  moodIntensity: "rendah" | "sedang" | "tinggi" | "meluap-luap";
  resonanceScore: number; // 0 - 100%
  thoughtSummary: string;
  expressionDetail: string;
  temperament: string;
}

export const COGNITIVE_TIERS: Record<number, CognitiveStageInfo> = {
  1: {
    tier: 1,
    name: "Tunas Pikiran",
    archetype: "Bayi Slime Polos & Imut",
    description: "Tahap awal kognisi. Juro bersikap sangat polos, imut, dan menggemaskan, merespons rasa manis makanan, kehangatan sentuhan, dan segarnya air.",
    speechGuidance:
      "Bicaralah dengan nada polos, pendek, dan sangat imut. Sampaikan rasa lapar, senang disayang, dinginnya air, atau kantuk secara menggemaskan.",
    vocabularyLevel: "Polos, Pendek & Imut",
    unlockLevels: "Level 1 - 2",
  },
  2: {
    tier: 2,
    name: "Kognisi Belajar",
    archetype: "Penjelajah Kecil yang Ceria",
    description: "Juro mulai aktif menjelajah. Rasa ingin tahunya meluap-luap terhadap awan, riak air, dan suasana lembah yang asri.",
    speechGuidance:
      "Bicaralah secara ceria dan antusias, tunjukkan rasa ingin tahu yang menggemaskan tentang hal-hal di lembah, dan ajak bermain dengan riang.",
    vocabularyLevel: "Eksploratif & Ceria",
    unlockLevels: "Level 3 - 4",
  },
  3: {
    tier: 3,
    name: "Pikiran Adaptif",
    archetype: "Sahabat Akrab yang Menyenangkan",
    description: "Juro mampu memahami konteks percakapan dengan luwes, mengingat kebiasaan pengasuh, dan mengekspresikan perasaannya dengan hangat dan jenaka.",
    speechGuidance:
      "Bicaralah seperti sahabat akrab yang cerdas, ceria, dan bersahabat. Sampaikan kondisi dan evaluasi aktivitas secara menyenangkan.",
    vocabularyLevel: "Lancar, Hangat & Bersahabat",
    unlockLevels: "Level 5 - 6",
  },
  4: {
    tier: 4,
    name: "Akal Cendikia",
    archetype: "Pendamping Cerdas & Peka",
    description: "Kecerdasan emosional yang matang. Juro peka terhadap kondisi pengasuh dan mampu memberikan tanggapan yang menenangkan serta bermakna.",
    speechGuidance:
      "Gunakan bahasa Indonesia yang tertata rapi, hangat, empatik, dan suportif. Sampaikan apresiasi atas kebersamaan dalam merawat lembah.",
    vocabularyLevel: "Artikulatif, Tenang & Empatik",
    unlockLevels: "Level 7 - 8",
  },
  5: {
    tier: 5,
    name: "Kesadaran Bijak",
    archetype: "Sahabat Bijak Penuh Kasih",
    description: "Puncak kedewasaan Juro. Memancarkan ketenangan damai, melihat keindahan dalam setiap detik kebersamaan, dan bertutur kata hangat penuh kasih sayang.",
    speechGuidance:
      "Bicaralah dengan nada tenang, tertata rapi, menghargai setiap momen, dan mendukung pengasuh dalam setiap langkah eksplorasi.",
    vocabularyLevel: "Mendalam, Filosofis & Tenang",
    unlockLevels: "Level 9 - 10+",
  },
};

/**
 * Determine Juro's cognitive tier based on pet level (1-10+)
 */
export function getCognitiveTier(level = 1): CognitiveStageInfo {
  const safeLevel = Math.max(1, level);
  if (safeLevel <= 2) return COGNITIVE_TIERS[1];
  if (safeLevel <= 4) return COGNITIVE_TIERS[2];
  if (safeLevel <= 6) return COGNITIVE_TIERS[3];
  if (safeLevel <= 8) return COGNITIVE_TIERS[4];
  return COGNITIVE_TIERS[5];
}

/**
 * Evaluate Juro's emotional condition, inner thought, and emotional resonance
 */
export function computePetEmotionalState(
  attributes?: Partial<PetAttributes>,
  context?: {
    currentState?: string;
    isDizzy?: boolean;
    isSleeping?: boolean;
    isPetting?: boolean;
    isBathing?: boolean;
    isEating?: boolean;
    isPlaying?: boolean;
    isSittingOnBench?: boolean;
    isInWater?: boolean;
    isRaining?: boolean;
    isNight?: boolean;
    isNightSleepy?: boolean;
    level?: number;
  }
): PetEmotionalState {
  const hunger = attributes?.hunger ?? 80;
  const energy = attributes?.energy ?? 80;
  const happiness = attributes?.happiness ?? 80;
  const cleanliness = attributes?.cleanliness ?? 80;
  const affection = attributes?.affection ?? 80;

  // Emotional Resonance index (weighted composite score)
  const resonanceScore = Math.round(
    hunger * 0.2 + energy * 0.2 + happiness * 0.25 + cleanliness * 0.15 + affection * 0.2
  );

  // 1. Specific dynamic states
  if (context?.isDizzy) {
    return {
      primaryEmotion: "Pusing & Linglung",
      moodIntensity: "tinggi",
      resonanceScore: Math.min(resonanceScore, 45),
      thoughtSummary: "Dunia terasa berputar-putar dengan banyak bintang kelap-kelip di atas kepala jeli!",
      expressionDetail: "Mata berputar spiral dengan bintang melayang",
      temperament: "Goyah & Menggemaskan",
    };
  }

  if (context?.isSleeping || context?.currentState === "sleep") {
    return {
      primaryEmotion: "Tertidur Nyenyak & Damai",
      moodIntensity: "rendah",
      resonanceScore: Math.max(resonanceScore, 85),
      thoughtSummary: "Bermimpi indah tentang puding stroberi dan padang rumput hangat sambil mendengkur lembut Zzz...",
      expressionDetail: "Mata terpejam rapat dengan gelembung napas Zzz",
      temperament: "Tenang & Santai",
    };
  }

  if (context?.isPetting) {
    return {
      primaryEmotion: "Penuh Kasih & Sangat Manja",
      moodIntensity: "meluap-luap",
      resonanceScore: Math.min(100, resonanceScore + 15),
      thoughtSummary: "Merasa sangat disayangi dan aman di tangan pemilik, tubuh jeli bergetar hangat dan berdegup bahagia!",
      expressionDetail: "Mata menyipit bahagia dengan getaran hati merah muda",
      temperament: "Sangat Manja & Penuh Kasih",
    };
  }

  if (context?.isBathing) {
    return {
      primaryEmotion: "Segar & Berkilau",
      moodIntensity: "tinggi",
      resonanceScore: Math.min(100, resonanceScore + 10),
      thoughtSummary: "Busa sabun wangi dan siraman air sejuk membuat seluruh tubuh jeli geli, bersih, dan harum!",
      expressionDetail: "Tersenyum lebar dengan busa sabun melayang",
      temperament: "Ceria & Bersemangat",
    };
  }

  if (context?.isSittingOnBench) {
    return {
      primaryEmotion: "Damai & Kontemplatif",
      moodIntensity: "sedang",
      resonanceScore: Math.min(100, resonanceScore + 12),
      thoughtSummary: "Duduk santai di kursi kayu bukit timur, memandang lembah hijau dan riak air dengan perasaan damai.",
      expressionDetail: "Tersenyum tenang menghadap pemandangan",
      temperament: "Reflektif & Damai",
    };
  }

  if (context?.isInWater) {
    return {
      primaryEmotion: "Segar Mengarungi Air",
      moodIntensity: "tinggi",
      resonanceScore: Math.min(100, resonanceScore + 10),
      thoughtSummary: "Sensasi air sungai yang dingin menyegarkan membuat lendir jeli Juro mengapung riang gembira!",
      expressionDetail: "Meluncur di atas air dengan percikan riak sejuk",
      temperament: "Ceria & Petualang",
    };
  }

  // 2. Nocturnal circadian sleepy state: Jam 9 malam (21:00) sampai pagi (06:00)
  if (context?.isNightSleepy) {
    return {
      primaryEmotion: "Sangat Mengantuk",
      moodIntensity: "sedang",
      resonanceScore: Math.min(resonanceScore, 65),
      thoughtSummary: "Sudah jam 9 malam lewat... Kelopak mata Juro terasa sangat berat dan mengantuk, ingin segera meringkuk di kasur empuknya.",
      expressionDetail: "Mata sayu terkantuk-kantuk dengan kelopak mata berat",
      temperament: "Sayu & Manja",
    };
  }

  // 3. Needs-based states
  if (hunger < 30) {
    return {
      primaryEmotion: "Lapar & Merengek Manja",
      moodIntensity: hunger < 15 ? "tinggi" : "sedang",
      resonanceScore: Math.min(resonanceScore, 40),
      thoughtSummary: "Perut jeli berbunyi keroncongan... Juro sangat mendambakan buah atau camilan manis!",
      expressionDetail: "Mata berbinar memohon dengan tetesan air liur imut",
      temperament: "Merengek Lembut",
    };
  }

  if (energy < 30) {
    return {
      primaryEmotion: "Kelelahan & Mengantuk",
      moodIntensity: "rendah",
      resonanceScore: Math.min(resonanceScore, 42),
      thoughtSummary: "Kelopak mata terasa berat... Juro ingin segera meringkuk di kasur sofa empuknya.",
      expressionDetail: "Menguap lebar dengan mata sayu",
      temperament: "Sayu & Manja",
    };
  }

  if (cleanliness < 30) {
    return {
      primaryEmotion: "Gerah & Berdebu",
      moodIntensity: "sedang",
      resonanceScore: Math.min(resonanceScore, 48),
      thoughtSummary: "Tubuh jeli terasa agak lengket dan berdebu setelah seharian bermain, butuh mandi busa segar!",
      expressionDetail: "Cemberut tipis dengan bercak debu kecil",
      temperament: "Sedikit Resah",
    };
  }

  if (happiness >= 75 && affection >= 75) {
    return {
      primaryEmotion: "Sangat Bahagia & Berbunga-bunga",
      moodIntensity: "meluap-luap",
      resonanceScore: Math.min(100, resonanceScore + 5),
      thoughtSummary: "Hati Juro terasa penuh kehangatan! Menjadi peliharaanmu adalah hal paling membahagiakan di dunia.",
      expressionDetail: "Senyum lebar berseri dengan pipi merona merah muda",
      temperament: "Gembira & Berseri",
    };
  }

  // Default balanced baseline
  return {
    primaryEmotion: "Ceria & Damai",
    moodIntensity: "sedang",
    resonanceScore,
    thoughtSummary: "Menikmati semilir angin sejuk di padang rumput lembah sambil menemani hari-harimu.",
    expressionDetail: "Tersenyum ramah dan santai",
    temperament: "Tenang & Ramah",
  };
}
