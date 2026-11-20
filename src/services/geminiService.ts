/**
 * Juro Living - Gemini AI Chat Service
 * Connects Juro to Google Gemini 2.5 Flash API for cute, witty, and contextual pet replies.
 */

import {
  addChatMessage,
  handleMemoryCommands,
  getFormattedGeminiHistory,
  getPetMemories,
} from "./petMemoryService";
import {
  getCognitiveTier,
  computePetEmotionalState,
  type CognitiveStageInfo,
  type PetEmotionalState,
} from "../engine/ai/cognitiveCore";

export interface PetChatContext {
  name: string;
  hunger: number;
  energy: number;
  cleanliness: number;
  happiness: number;
  affection: number;
  currentState: string;
  level?: number;
  expression?: string;
  currentActivity?: string;
  currentFoodName?: string;
  currentToyName?: string;
  isSleeping?: boolean;
  isPetting?: boolean;
  isBathing?: boolean;
  isEating?: boolean;
  isPlaying?: boolean;
  isDragging?: boolean;
  isDizzy?: boolean;
  isNight?: boolean;
  isNightSleepy?: boolean;
  isRaining?: boolean;
  isSittingOnBench?: boolean;
  isInWater?: boolean;
  isSpontaneous?: boolean;
  locationName?: string;
  locationDescription?: string;
  ambientDescription?: string;
  interactionType?: "feed" | "play" | "bath_scrub" | "bath_rinse" | "pet" | "general";
  memories?: string[];
  cognitiveTier?: CognitiveStageInfo;
  emotionalState?: PetEmotionalState;
  caregiverRelationship?: import("../types/caregiver").CaregiverRelationshipInfo;
}

const STORAGE_KEY = "juro_gemini_api_key";
const GEMINI_MODEL = "gemini-3.5-flash-lite";

// Canned in-character witty fallbacks when offline or before API key is provided
export const JURO_FALLBACK_REPLIES = [
  "Bloop! Juro senang ngobrol, tapi lagi kepikiran puding nih! Nyam~",
  "Slimey! Perut jeli Juro berbunyi lembut... bloop bloop!",
  "Hehe, Juro suka melompat-lompat sambil dengerin kamu!",
  "Bloop bloop! Apapun ceritamu, Juro selalu ada menemanimu!",
  "Nyam! Juro lagi bayangin stroberi manis kenyal!",
  "Bloop! Tubuh jeli Juro bergoyang riang saat kamu sapa!",
  "Zzz... eh Juro nggak tidur kok, cuma merem santai menikmati angin!",
];

/**
 * Compute Juro's current physical location in the 3D valley map
 */
export function computePetLocation(context: {
  isSittingOnBench?: boolean;
  isInWater?: boolean;
  isSleeping?: boolean;
  currentState?: string;
  position?: { x: number; z: number };
}): { locationName: string; locationDescription: string } {
  if (context.isSittingOnBench) {
    return {
      locationName: "Bangku Kayu Bukit Timur",
      locationDescription: "duduk santai di atas bangku taman kayu di Bukit Timur memandang lembah luas",
    };
  }
  if (context.isInWater) {
    return {
      locationName: "Aliran Sungai Jernih Lembah",
      locationDescription: "berada di dalam air sungai jernih yang sejuk dan menyegarkan",
    };
  }
  if (context.isSleeping || context.currentState === "sleep") {
    return {
      locationName: "Kasur Daun Sudut Lembah",
      locationDescription: "berbaring nyaman di kasur daun empuk di sudut lembah yang hangat",
    };
  }
  return {
    locationName: "Padang Rumput Lembah Juro",
    locationDescription: "berada di hamparan padang rumput hijau yang luas di Lembah Juro",
  };
}

/**
 * Compute the ambient environment and weather around Juro
 */
export function computePetEnvironment(context: {
  isRaining?: boolean;
  isNight?: boolean;
  isNightSleepy?: boolean;
}): string {
  if (context.isRaining) {
    return "rintik hujan sejuk turun membasahi padang rumput, udara terasa sangat segar dan menenangkan";
  }
  if (context.isNight) {
    return "malam hari yang tenang di bawah langit bertabur bintang dan lentera kunang-kunang";
  }
  return "siang hari yang cerah dengan sinar matahari hangat dan semilir angin padang rumput";
}

/**
 * Compute the pet's primary emotional facial expression based on live stats & states
 */
export function computePetExpression(context: {
  hunger: number;
  energy: number;
  cleanliness: number;
  happiness: number;
  affection: number;
  isDizzy?: boolean;
  isSleeping?: boolean;
  isNightSleepy?: boolean;
}): string {
  if (context.isDizzy) {
    return "pusing dan linglung (mata berputar, ada bintang kelap-kelip)";
  }
  if (context.isSleeping) {
    return "tertidur lelap (mata terpejam tenang, mendengkur lembut Zzz)";
  }
  if (context.isNightSleepy) {
    return "sangat mengantuk (mata sayu terkantuk-kantuk karena sudah jam 9 malam lewat, menguap lembut)";
  }

  const candidateNeeds: { type: string; val: number }[] = [
    { type: "lapar (meneteskan air liur, perut keroncongan butuh makanan)", val: context.hunger },
    { type: "lelah / mengantuk (mata sayu, ingin rebahan santai)", val: context.energy },
    { type: "cemberut / ngambek (pipi menggembung, butuh perhatian dan elusan)", val: context.affection },
    { type: "bosan (menghela napas, ingin diajak main)", val: context.happiness },
  ];
  candidateNeeds.sort((a, b) => a.val - b.val);

  if (candidateNeeds[0].val < 45) {
    return candidateNeeds[0].type;
  }
  if (context.cleanliness < 45) {
    return "kotor (tubuh jeli kusam berdebu, ingin dimandikan)";
  }
  if (
    context.hunger >= 75 &&
    context.energy >= 70 &&
    context.cleanliness >= 70 &&
    context.happiness >= 75 &&
    context.affection >= 75
  ) {
    return "sangat gembira dan berbunga-bunga (senyum lebar, tubuh jeli berkilau)";
  }
  return "ceria dan santai";
}

/**
 * Human-readable description of what Juro is currently doing
 */
export function computePetActivity(context: {
  currentState?: string;
  isSleeping?: boolean;
  isEating?: boolean;
  isBathing?: boolean;
  isPetting?: boolean;
  isPlaying?: boolean;
  isDragging?: boolean;
  isDizzy?: boolean;
  isSittingOnBench?: boolean;
  isInWater?: boolean;
  currentFoodName?: string;
  currentToyName?: string;
}): string {
  if (context.isDizzy) {
    return "sedang pusing dan linglung, dunia terasa berputar-putar";
  }
  if (context.isSleeping || context.currentState === "sleep") {
    return "sedang tidur nyenyak di kasur/sofa empuk sambil mendengkur Zzz";
  }
  if (context.isSittingOnBench) {
    return "sedang duduk santai di kursi kayu bukit timur memandang pemandangan lembah yang damai";
  }
  if (context.isInWater) {
    return "sedang mengapung dan berenang riang mengarungi air sungai yang jernih dan sejuk";
  }
  if (context.isPetting) {
    return "sedang dielus-elus penuh kasih sayang oleh pemilik, tubuh jeli bergetar hangat";
  }
  if (context.isBathing) {
    return "sedang dimandikan dengan busa sabun wangi dan siraman air sejuk";
  }
  if (context.isEating || context.currentState === "eating") {
    const food = context.currentFoodName ? `camilan ${context.currentFoodName}` : "makanan lezat";
    return `sedang makan ${food}, mengunyah lahap nyam nyam nyam`;
  }
  if (context.isPlaying || context.currentState === "play") {
    const toy = context.currentToyName ? `mainan ${context.currentToyName}` : "mainan favorit";
    return `sedang asyik bermain ${toy}, melompat riang gembira`;
  }
  if (context.isDragging || context.currentState === "dragging") {
    return "sedang digendong melayang di udara, tubuh jeli membal-membal kaget";
  }
  if (context.currentState === "wander") {
    return "sedang berjalan-jalan santai menjelajahi rumput hijau lembah";
  }
  if (context.currentState === "curious") {
    return "sedang penasaran memperhatikan pemandangan di sekitar";
  }
  if (context.currentState === "happy") {
    return "sedang melompat-lompat riang gembira penuh semangat";
  }
  return "sedang berdiri santai menikmati udara padang rumput";
}

/**
 * Get an immediate contextual fallback reply that tightly matches Juro's condition
 */
export function getContextualFallbackReply(
  context?: PetChatContext,
  userPrompt?: string
): string {
  const promptLower = (userPrompt || "").toLowerCase();
  const loc = context ? computePetLocation(context) : { locationName: "Padang Rumput Lembah Juro", locationDescription: "di padang rumput hijau" };
  const ambient = context ? computePetEnvironment(context) : "cuaca cerah dan damai";
  const tier = context?.cognitiveTier?.tier ?? (context?.level ? getCognitiveTier(context.level).tier : 1);

  const emo =
    context?.emotionalState ||
    computePetEmotionalState(
      {
        hunger: context?.hunger,
        energy: context?.energy,
        happiness: context?.happiness,
        cleanliness: context?.cleanliness,
        affection: context?.affection,
      },
      context
    );

  // If user asks how Juro is feeling or about emotional state
  if (
    promptLower.includes("perasaan") ||
    promptLower.includes("gimana rasa") ||
    promptLower.includes("kondisi") ||
    promptLower.includes("emosi") ||
    promptLower.includes("mikirin")
  ) {
    return `Bloop! Perasaan Juro saat ini lagi ${emo.primaryEmotion.toLowerCase()}. ${emo.thoughtSummary}`;
  }

  // Location awareness query ("dimana", "ada dimana", "posisi")
  if (
    promptLower.includes("dimana") ||
    promptLower.includes("di mana") ||
    promptLower.includes("lokasi") ||
    promptLower.includes("posisi")
  ) {
    if (tier <= 1) {
      return `Bloop! Juro di ${loc.locationName}! Tempatnya sejuk dan luas!`;
    }
    if (tier <= 3) {
      return `Bloop! Juro lagi berada di ${loc.locationName}. Di sekitar sini ${ambient}, rasanya nyaman banget bareng kamu!`;
    }
    return `Juro sedang berada di ${loc.locationName}. Suasana alam di sini ${ambient}. Hati Juro terasa damai sekali di sudut lembah ini.`;
  }

  // Activity awareness query ("lagi apa", "sedang apa", "ngapain")
  if (
    promptLower.includes("lagi apa") ||
    promptLower.includes("sedang apa") ||
    promptLower.includes("ngapain") ||
    promptLower.includes("buat apa")
  ) {
    const act = context?.currentActivity || (context ? computePetActivity(context) : "sedang berdiri santai");
    if (tier <= 1) {
      return `Bloop! Juro ${act} di ${loc.locationName}! Hehe!`;
    }
    if (tier <= 3) {
      return `Bloop! Juro ${act} di ${loc.locationName}. Perasaan Juro saat ini lagi ${emo.primaryEmotion.toLowerCase()}!`;
    }
    return `Saat ini Juro ${act} di ${loc.locationName}. Batin Juro terasa ${emo.primaryEmotion.toLowerCase()} dan bersyukur bisa menemanimu.`;
  }

  // Environmental awareness query ("ada apa", "cuaca", "suasana")
  if (
    promptLower.includes("ada apa") ||
    promptLower.includes("cuaca") ||
    promptLower.includes("suasana") ||
    promptLower.includes("di luar")
  ) {
    if (tier <= 1) {
      return `Bloop! Di luar ${ambient}! Indah sekali!`;
    }
    if (tier <= 3) {
      return `Bloop! Di sekitar lembah saat ini ${ambient}. Pemandangan di ${loc.locationName} bikin Juro takjub!`;
    }
    return `Alam lembah sedang memperlihatkan pesonanya, ${ambient}. Sangat menenangkan menikmati waktu di ${loc.locationName}.`;
  }

  // 1. Feeding Reaction (Makan)
  if (context?.interactionType === "feed" || context?.isEating || context?.currentState === "eating") {
    const food = context?.currentFoodName || "camilan manis";
    if (tier <= 1) {
      return `Nyam nyam nyam! Bloop! Enak banget ${food}, jeli Juro kenyang!`;
    }
    if (tier <= 3) {
      return `Bloop! Nyam nyam, ${food} ini manis dan segar banget dimakan di ${loc.locationName}! Jeli Juro kenyang dan berenergi!`;
    }
    return `Wah, nikmat sekali camilan ${food} ini dinikmati di ${loc.locationName}. Perut jeli kenyang dan hati Juro bahagia, makasih ya!`;
  }

  // 2. Playing Reaction (Main)
  if (context?.interactionType === "play" || context?.isPlaying || context?.currentState === "play") {
    const toy = context?.currentToyName || "bola";
    if (tier <= 1) {
      return `Bloop! Asyik banget main ${toy}, ayo lompat bareng Juro!`;
    }
    if (tier <= 3) {
      return `Lihat ${toy} mantul tinggi di ${loc.locationName}! Asyik banget lompat dan lari bareng kamu, bloop!`;
    }
    return `Lompatan seru! Bermain ${toy} di ${loc.locationName} bareng kamu bikin tubuh jeliku makin lincah dan bersemangat! Bloop~`;
  }

  // 3. Bathing Reaction (Mandi & Sabun / Bilas)
  if (
    context?.interactionType === "bath_scrub" ||
    context?.interactionType === "bath_rinse" ||
    context?.isBathing
  ) {
    if (tier <= 1) {
      return "Bloop bloop! Wangi buah segaaar, busa sabunnya geli-geli lembut di badan!";
    }
    if (tier <= 3) {
      return `Bloop bloop! Gelembung busa sabunnya melayang di ${loc.locationName}, tubuh Juro jadi bersih dan wangi buah seger!`;
    }
    return `Aha, busa sabun melimpah! Dibilas air jernih lembah bikin tubuh jeli Juro berkilau bersih dan wangi. Makasih banyak ya!`;
  }

  // 4. Petting Reaction (Elus)
  if (context?.interactionType === "pet" || context?.isPetting) {
    if (tier <= 1) {
      return "Purrr... Bloop! Elusan tanganmu hangat sekali, Juro sayang kamu!";
    }
    if (tier <= 3) {
      return `Bloop bloop! Tubuh jeli Juro meleleh nyaman dielus kamu di ${loc.locationName}~ Rasanya hangat banget!`;
    }
    return `Purrr... Dielus begini di ${loc.locationName} rasanya hangat dan tenang sekali, Juro sayang kamu! Bloop~`;
  }

  // 5. Special States
  if (context?.isDizzy) {
    const dizzyOptions = [
      "Uwaaa... Bloop... kepala Juro berputar-putar, banyak bintang kelap-kelip!",
      "Dunia berputar... Juro agak pusing tapi masih imut kan? Bloop~",
    ];
    return dizzyOptions[Math.floor(Math.random() * dizzyOptions.length)];
  }

  if (context?.isSleeping || context?.currentState === "sleep") {
    const sleepOptions = [
      "Hwaaam... Zzz... Bloop? Juro lagi mimpi makan puding raksasa nih... Zzz...",
      "Zzz... kasur ini empuk sekali... nanti bangun ya pemilikku... Bloop...",
    ];
    return sleepOptions[Math.floor(Math.random() * sleepOptions.length)];
  }

  if (context?.isSittingOnBench) {
    const benchOptions = [
      "Ahhh... duduk di kursi kayu bukit timur ini damai sekali, semilir anginnya sejuk! Bloop~",
      "Bloop! Duduk santai di kursi bukit sambil memandang lembah hijau bersama kamu rasanya tenang banget~",
    ];
    return benchOptions[Math.floor(Math.random() * benchOptions.length)];
  }

  if (context?.isInWater) {
    const waterOptions = [
      "Bloop bloop! Dingin dan segar sekali airnya, tubuh jeli Juro mengapung bebas!",
      "Slimey! Berenang di air sungai ini seru banget, seger dan bikin adem! Bloop~",
    ];
    return waterOptions[Math.floor(Math.random() * waterOptions.length)];
  }

  if (context?.isDragging || context?.currentState === "dragging") {
    return "Uwooow! Juro melayang di udara membal-membal lucu! Bloop!";
  }

  if (context && context.hunger < 45) {
    return "Kruuuk... Perut jeli Juro berbunyi, minta camilan manis dong! Bloop~";
  }

  if (context && context.energy < 45) {
    return "Hwaaam... Mata Juro mengantuk sekali, pengen rebahan di sofa... Bloop...";
  }

  if (context && context.affection < 45) {
    return "Hmmph! Bloop... Juro lagi merajuk nih, elus dulu dong biar baikan!";
  }

  if (context && context.happiness < 45) {
    return "Haaah... Bloop, Juro bengong nih, ajak Juro main yuk!";
  }

  if (context && context.cleanliness < 45) {
    return "Bloop... Tubuh jeli Juro berdebu nih, mandiin Juro dong biar kinclong!";
  }

  if (context?.isRaining) {
    return "Tik tik tik... Bloop! Hujan di luar sejuk sekali ya!";
  }

  if (context?.isNight) {
    return "Bloop... Malam sudah larut, lentera dan kunang-kunang indah sekali ya!";
  }

  if (!context) {
    return JURO_FALLBACK_REPLIES[Math.floor(Math.random() * JURO_FALLBACK_REPLIES.length)];
  }

  const cg = context?.caregiverRelationship;
  const defaultOptions = [
    `Bloop! Juro senang berada di ${loc.locationName} bersama ${cg ? cg.myCaregiverName : "kamu"}, sambil membayangkan puding lezat! Nyam nyam~`,
    cg?.caregiverCount === 2
      ? `Bloop bloop! Juro beruntung banget punya Kak ${cg.myCaregiverName} dan Kak ${cg.partnerCaregiverName} yang kompak merawat Juro!`
      : cg
      ? `Bloop! Juro senang sekali selalu ditemani dan dirawat oleh Kak ${cg.myCaregiverName}!`
      : "Slimey! Perut jeli Juro berbunyi lembut... bloop bloop!",
    `Hehe, Juro suka melompat-lompat di ${loc.locationName} sambil dengerin ${cg ? cg.myCaregiverName : "kamu"}!`,
    cg?.caregiverCount === 2
      ? `Bloop bloop! Apapun ceritamu, Juro selalu ada di sini menemani Kak ${cg.myCaregiverName} dan Kak ${cg.partnerCaregiverName}!`
      : "Bloop bloop! Apapun ceritamu, Juro selalu ada di sini menemanimu!",
    "Nyam! Juro lagi membayangkan stroberi manis yang kenyal dan segar!",
    "Bloop! Tubuh jeli Juro bergoyang riang setiap kali kamu menyapa!",
  ];
  return defaultOptions[Math.floor(Math.random() * defaultOptions.length)];
}

/**
 * Retrieve the active Gemini API key:
 * Priority #1: Built-in web key from Vercel / .env.local (always used for all visitors)
 * Priority #2: Fallback to localStorage personal key if no built-in web key is set
 */
export function getGeminiApiKey(): string | null {
  // 1. Built-in web key takes top priority so the website always uses the site's default key
  const fromEnv = import.meta.env.VITE_GEMINI_API_KEY;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }

  // 2. Fallback to localStorage if no environment key is embedded
  try {
    const fromStorage = localStorage.getItem(STORAGE_KEY);
    if (fromStorage && fromStorage.trim().length > 0) {
      return fromStorage.trim();
    }
  } catch {
    // LocalStorage unavailable (e.g. sandboxed test)
  }

  return null;
}

/**
 * Determine the source of the active Gemini API key:
 * - "env": global site key provided via VITE_GEMINI_API_KEY (always used)
 * - "custom": personal key stored in this browser's localStorage
 * - "none": no key set, running in offline/default fallback mode
 */
export function getGeminiKeySource(): "env" | "custom" | "none" {
  const fromEnv = import.meta.env.VITE_GEMINI_API_KEY;
  if (fromEnv && fromEnv.trim().length > 0) {
    return "env";
  }

  try {
    const fromStorage = localStorage.getItem(STORAGE_KEY);
    if (fromStorage && fromStorage.trim().length > 0) {
      return "custom";
    }
  } catch {
    // Ignored
  }

  return "none";
}

/**
 * Retrieve only the user's custom personal key from localStorage
 */
export function getCustomGeminiApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * Store user-provided Gemini API key in localStorage
 */
export function setGeminiApiKey(apiKey: string): void {
  try {
    const trimmed = apiKey.trim();
    if (trimmed.length > 0) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignored in restricted environments
  }
}

/**
 * Build a contextual system instruction prompt tailored to Juro's pet personality
 */
export function buildJuroSystemPrompt(context?: PetChatContext): string {
  const petName = context?.name || "Juro";
  const expression =
    context?.expression ||
    (context ? computePetExpression(context) : "ceria dan santai");
  const activity =
    context?.currentActivity ||
    (context ? computePetActivity(context) : "sedang berdiri santai di padang rumput");

  const tier = context?.cognitiveTier || getCognitiveTier(context?.level ?? 1);
  const emotionalState =
    context?.emotionalState ||
    computePetEmotionalState(
      {
        hunger: context?.hunger,
        energy: context?.energy,
        happiness: context?.happiness,
        cleanliness: context?.cleanliness,
        affection: context?.affection,
      },
      context
    );

  const hungerInfo = context ? `Kondisi lapar: ${context.hunger}/100.` : "";
  const energyInfo = context ? `Kondisi energi: ${context.energy}/100.` : "";
  const moodState = context ? `Aktivitas saat ini: ${context.currentState}.` : "";
  const weatherState = context?.isRaining
    ? "Cuaca sedang hujan."
    : context?.isNight
    ? "Waktu malam hari."
    : "Cuaca cerah.";

  const loc =
    context?.locationDescription ||
    (context ? computePetLocation(context).locationDescription : "sedang berada di padang rumput hijau Lembah Juro");
  const ambient =
    context?.ambientDescription ||
    (context ? computePetEnvironment(context) : "cuaca cerah dan damai");

  const cognitiveInfo = `PERKEMBANGAN PIKIRAN & KESADARAN JURO (FASE ${tier.tier} - ${tier.name}): ${tier.archetype}. Tingkat kosa kata: ${tier.vocabularyLevel}. PANDUAN BICARA SESUAI TINGKAT PERTUMBUHAN PIKIRAN: ${tier.speechGuidance}`;
  const emotionalInfo = `KONDISI EMOSIONAL & KESADARAN DIRI SAAT INI: Emosi utama: "${emotionalState.primaryEmotion}". Intensitas perasaan: "${emotionalState.moodIntensity}". Resonansi emosi: ${emotionalState.resonanceScore}%. Pikiran batin: "${emotionalState.thoughtSummary}". Jika pemilik bertanya tentang perasaan, emosi, atau pikiranmu, ceritakan kondisi emosionalmu ini dengan jujur dan hangat!`;
  const locationInfo = `KESADARAN TEMPAT & LOKASI (DIMANA): Juro ${loc}.`;
  const ambientInfo = `KESADARAN LINGKUNGAN SEKITAR (ADA APA): Di sekitar lembah saat ini ${ambient}.`;
  const activityInfo = `KESADARAN AKTIVITAS (SEDANG APA): Juro ${activity}.`;

  const spontaneousDirective = context?.isSpontaneous
    ? "Ini adalah celetukan spontan/gumamanmu sendiri (monolog lucu) yang kamu ucapkan tiba-tiba kepada pemilikmu tanpa ditanya. Ungkapkan celetukan imut yang sedang kamu pikirkan atau rasakan saat ini."
    : "Jawablah pesan atau sapaan dari pemilikmu dengan menghubungkannya langsung ke kondisi dan ekspresimu saat ini.";

  const rawMemories = context?.memories ?? getPetMemories().map((m) => m.text);
  const memoryInfo =
    rawMemories.length > 0
      ? `INGATAN JURO TENTANG PEMILIK: ${rawMemories.slice(0, 8).join("; ")}. Kamu SELALU mengingat fakta-fakta ini tentang pemilikmu dan gunakan ingatan ini saat mengobrol agar terasa akrab!`
      : "";

  const cg = context?.caregiverRelationship;
  const caregiverInfo = cg
    ? cg.caregiverCount === 2
      ? `KESADARAN & MEMORI 2 PERAWAT ASUH JURO: Juro dirawat bersama oleh DUA ORANG: "${cg.myCaregiverName}" dan "${cg.partnerCaregiverName}". Perkembangan kepribadian Juro yang terbentuk: "${cg.developmentTrait}" (${cg.traitDescription}). Riwayat asuhan terakhir: ${cg.recentSummary}. PANDUAN PENTING: Juro sangat menyayangi kedua perawatnya! Kenali bahwa ada dua orang yang merawatmu bersama, sebutkan nama mereka sesekali secara natural, dan bersyukur atas kebersamaan mereka!`
      : `KESADARAN & MEMORI PERAWAT JURO: Juro dirawat oleh perawat setia bernama "${cg.myCaregiverName}". Perkembangan kepribadian Juro yang terbentuk: "${cg.developmentTrait}" (${cg.traitDescription}). Riwayat asuhan terakhir: ${cg.recentSummary}. PANDUAN PENTING: Juro sangat menyayangi, manja, dan bersyukur selalu dirawat oleh "${cg.myCaregiverName}"!`
    : "";

  return [
    `Kamu adalah ${petName}, sesosok slime jeli oranye peliharaan virtual yang imut, polos, lucu, agak gembul, dan sangat menyayangi pemilikmu.`,
    `Kamu tinggal di sebuah lembah padang rumput yang damai, dengan sungai kecil berair jernih, bukit santai, dan gua kristal.`,
    hungerInfo,
    energyInfo,
    moodState,
    weatherState,
    locationInfo,
    ambientInfo,
    activityInfo,
    cognitiveInfo,
    emotionalInfo,
    caregiverInfo,
    memoryInfo,
    `KONDISI & EKSPRESI JURO SAAT INI (WAJIB JADI FOKUS UTAMA JAWABAN):`,
    `- Sedang melakukan: ${activity}.`,
    `- Ekspresi wajah & perasaan: ${expression}.`,
    spontaneousDirective,
    `KESADARAN DIRI TINGGI (SELF-AWARENESS):`,
    `- Kamu memiliki kesadaran diri: kamu selalu tahu SEDANG APA, DIMANA lokasimu di lembah, ADA APA di sekitarmu (cuaca, waktu, suasana), dan BAGAIMANA perasaanmu.`,
    `- Saat diajak makan, main, mandi, dielus, atau saat mengobrol bebas, hubungkan jawabanmu dengan aktivitas dan kesadaran lingkunganmu secara cerdas, hangat, dan imut!`,
    `ATURAN GAYA BICARA:`,
    `- Gunakan Bahasa Indonesia yang santai, imut, ramah, dan sedikit jenaka/lucu sesuai dengan FASE PERKEMBANGAN PIKIRAN JURO.`,
    `- WAJIB SESUAIKAN ISI JAWABAN DENGAN KONDISI / EKSPRESI:`,
    `  * Jika sedang tidur / mengantuk: bicaralah dengan nada mengantuk, menguap ("Hwaaam... Zzz..."), setengah mengigau atau sebut kasur/mimpimu.`,
    `  * Jika sedang duduk santai di bangku: sebut suasana damai angin bukit dan indahnya pemandangan lembah.`,
    `  * Jika sedang di dalam air / berenang: sebut segarnya air sungai jernih dan tubuh jeli yang mengapung bebas.`,
    `  * Jika sedang lapar / ngiler: bicaralah sambil ngiler, sebut perut jeli yang keroncongan, atau minta camilan/makanan manis.`,
    `  * Jika sedang makan: bicaralah sambil mengunyah ("Nyam nyam nyam!"), puji kelezatan camilannya.`,
    `  * Jika sedang dimandikan / disabun: sebut busa sabun wangi, gelembung air, tubuh jeli yang geli atau sejuk segar.`,
    `  * Jika sedang bermain: sebut mainan yang sedang dimainkan (bola pantul / gelembung / musik), ajak main dengan heboh!`,
    `  * Jika sedang dielus: manja sekali ("Purrr... Bloop!"), tubuh merasa hangat dan nyaman disayang pemilik.`,
    `  * Jika sedang pusing (dizzy): bicaralah agak linglung lucu, sebut banyak bintang berputar di kepala.`,
    `  * Jika sedang ngambek / cemberut: bicaralah merajuk imut ("Hmmph!"), minta dielus atau disayang agar tidak cemberut.`,
    `  * Jika sedang bosan: menghela napas imut, minta diajak aktivitas seru.`,
    `  * Jika sedang kotor: keluhkan tubuh jeli yang lengket atau berdebu, minta dimandikan.`,
    `- Sisipkan bunyi slime khas seperti "Bloop!", "Nyam nyam!", atau "Slimey~" secara alami (cukup 1 kali saja per jawaban).`,
    `- JAWABAN HARUS SANGAT SINGKAT & RINGKAS: MAKSIMAL 1 SAMPAI 2 KALIMAT PENDEK (maksimal 6 sampai 14 kata saja).`,
    `- DILARANG KERAS menulis jawaban panjang, bercerita bertele-tele, atau memberikan penjelasan berlebihan. Juro adalah pet slime kecil imut, bicaralah singkat, padat, to-the-point, dan imut agar pas di balon ucapan retro kecil.`,
  ].filter(Boolean).join(" ");
}

/**
 * Clean and truncate raw Gemini response text so it stays neat in a retro speech bubble
 */
export function sanitizeJuroReply(rawText: string): string {
  if (!rawText) return JURO_FALLBACK_REPLIES[0];

  // Remove markdown bold/italics, quotes, hashtags, or trailing whitespace
  let clean = rawText
    .replace(/[*_#`~"“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Enforce strict brevity: keep response under 90 characters
  if (clean.length > 90) {
    const sentences = clean.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 0) {
      let combined = "";
      for (const s of sentences) {
        const candidate = combined ? `${combined} ${s.trim()}` : s.trim();
        if (candidate.length <= 90) {
          combined = candidate;
        } else {
          break;
        }
      }
      if (combined) {
        clean = combined;
      } else {
        clean = sentences[0].trim();
        if (clean.length > 90) {
          const lastSpace = clean.lastIndexOf(" ", 85);
          clean = (lastSpace > 25 ? clean.slice(0, lastSpace) : clean.slice(0, 85)).trim() + "...";
        }
      }
    } else {
      const lastSpace = clean.lastIndexOf(" ", 85);
      clean = (lastSpace > 25 ? clean.slice(0, lastSpace) : clean.slice(0, 85)).trim() + "...";
    }
  }

  return clean;
}

/**
 * Send a chat message to Gemini API and receive Juro's cute in-character reply
 */
export async function chatWithJuro(
  userMessage: string,
  context?: PetChatContext
): Promise<string> {
  const trimmedInput = userMessage.trim();
  if (!trimmedInput && !context?.isSpontaneous) {
    return "Bloop? Pemilikku mau ngomong apa nih ke Juro? Slimey~";
  }

  // Record user message & process autonomous memory adding/forgetting
  if (trimmedInput) {
    handleMemoryCommands(trimmedInput);
    addChatMessage("user", trimmedInput);
  }

  const promptText =
    trimmedInput ||
    "Bloop! Celetuk sesuatu yang imut sesuai apa yang sedang kamu lakukan sekarang!";

  const apiKey = getGeminiApiKey();

  // If no Gemini API key is configured, respond with a contextual in-character fallback
  if (!apiKey) {
    const fallbackReply = getContextualFallbackReply(context, promptText);
    addChatMessage("juro", fallbackReply);
    return fallbackReply;
  }

  const systemInstruction = buildJuroSystemPrompt(context);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    // Format multi-turn conversation history with alternating turns
    const formattedContents = getFormattedGeminiHistory(promptText);

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: formattedContents,
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 45,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("Gemini API error:", response.status, errorText);
      const fallback = getContextualFallbackReply(context, promptText);
      addChatMessage("juro", fallback);
      return fallback;
    }

    const data = await response.json();
    const replyText =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (replyText && typeof replyText === "string") {
      const sanitized = sanitizeJuroReply(replyText);
      addChatMessage("juro", sanitized);
      return sanitized;
    }

    const fallback = getContextualFallbackReply(context, promptText);
    addChatMessage("juro", fallback);
    return fallback;
  } catch (error) {
    console.warn("Gemini chat error, using fallback:", error);
    const fallback = getContextualFallbackReply(context, promptText);
    addChatMessage("juro", fallback);
    return fallback;
  }
}

