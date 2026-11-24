/**
 * Juro Living - Gemini AI Chat Service
 * Connects Juro to the server-side Gemini API endpoint for cute, witty, and contextual pet replies.
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
  isBouncingOnTrampoline?: boolean;
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

// Canned in-character witty fallbacks when offline or server is unreachable
export const JURO_FALLBACK_REPLIES = [
  "Senang bisa berbincang denganmu. Ada yang ingin kita lakukan bersama hari ini?",
  "Juro siap menemani aktivitasmu di lembah hari ini.",
  "Udara di padang rumput terasa sejuk dan menyenangkan.",
  "Terima kasih sudah meluangkan waktu untuk merawat dan menemani Juro.",
  "Juro sedang menikmati suasana alam lembah yang tenang.",
  "Semua kebutuhan Juro terpantau dengan baik, terima kasih atas perhatianmu.",
  "Juro sedang beristirahat sejenak sambil menikmati pemandangan sekitar.",
];

/**
 * Compute Juro's current physical location in the 3D valley map
 */
export function computePetLocation(context: {
  isSittingOnBench?: boolean;
  isBouncingOnTrampoline?: boolean;
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
  if (context.isBouncingOnTrampoline) {
    return {
      locationName: "Trampolin Jamur Lembah Barat",
      locationDescription: "sedang melompat-lompat riang di atas trampolin jamur merah berbintik",
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
    { type: "kotor (tubuh jeli kusam berdebu, ingin dimandikan)", val: context.cleanliness },
    { type: "cemberut / ngambek (pipi menggembung, butuh perhatian dan elusan)", val: context.affection },
    { type: "bosan (menghela napas, ingin diajak main)", val: context.happiness },
  ];
  candidateNeeds.sort((a, b) => a.val - b.val);

  if (candidateNeeds[0].val < 45) {
    return candidateNeeds[0].type;
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
  isBouncingOnTrampoline?: boolean;
  isInWater?: boolean;
  currentFoodName?: string;
  currentToyName?: string;
}): string {
  if (context.isDizzy) {
    return "sedang pusing dan kehilangan keseimbangan sejenak";
  }
  if (context.isSleeping || context.currentState === "sleep") {
    return "sedang tidur nyenyak di tempat tidurnya";
  }
  if (context.isSittingOnBench) {
    return "sedang duduk santai di kursi kayu bukit timur menikmati pemandangan lembah";
  }
  if (context.isBouncingOnTrampoline) {
    return "sedang melatih ketangkasan melompat di atas trampolin jamur";
  }
  if (context.isInWater) {
    return "sedang berenang mengarungi aliran sungai yang jernih dan sejuk";
  }
  if (context.isPetting) {
    return "sedang dielus-elus dengan hangat oleh pengasuh";
  }
  if (context.isBathing) {
    return "sedang dimandikan dengan busa sabun dan bilasan air sejuk";
  }
  if (context.isEating || context.currentState === "eating") {
    const food = context.currentFoodName ? `${context.currentFoodName}` : "makanan";
    return `sedang menikmati ${food} dengan lahap`;
  }
  if (context.isPlaying || context.currentState === "play") {
    const toy = context.currentToyName ? `${context.currentToyName}` : "mainan";
    return `sedang fokus beraktivitas memainkan ${toy}`;
  }
  if (context.isDragging || context.currentState === "dragging") {
    return "sedang dipindahkan posisinya melintasi udara";
  }
  if (context.currentState === "wander") {
    return "sedang berjalan-jalan menjelajahi padang rumput lembah";
  }
  if (context.currentState === "curious") {
    return "sedang mengamati lingkungan sekitar lembah dengan saksama";
  }
  if (context.currentState === "happy") {
    return "sedang dalam kondisi sangat bersemangat dan gembira";
  }
  return "sedang berdiri santai menikmati suasana padang rumput";
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
    return `Perasaan Juro saat ini sedang ${emo.primaryEmotion.toLowerCase()}. ${emo.thoughtSummary}`;
  }

  // Location awareness query ("dimana", "ada dimana", "posisi")
  if (
    promptLower.includes("dimana") ||
    promptLower.includes("di mana") ||
    promptLower.includes("lokasi") ||
    promptLower.includes("posisi")
  ) {
    if (tier <= 1) {
      return `Juro berada di ${loc.locationName}. Suasananya sejuk dan luas.`;
    }
    if (tier <= 3) {
      return `Juro sedang berada di ${loc.locationName}. Di sekitar sini ${ambient}, suasananya nyaman untuk beraktivitas bersama.`;
    }
    return `Juro saat ini berada di ${loc.locationName}. Keadaan lingkungan di sini ${ambient}. Suasana di sudut lembah ini sangat tenang.`;
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
      return `Juro ${act} di ${loc.locationName}.`;
    }
    if (tier <= 3) {
      return `Juro ${act} di ${loc.locationName}. Kondisi Juro saat ini sedang ${emo.primaryEmotion.toLowerCase()}.`;
    }
    return `Saat ini Juro ${act} di ${loc.locationName}. Suasana hati Juro terasa ${emo.primaryEmotion.toLowerCase()} dan senang bisa menemanimu.`;
  }

  // Environmental awareness query ("ada apa", "cuaca", "suasana")
  if (
    promptLower.includes("ada apa") ||
    promptLower.includes("cuaca") ||
    promptLower.includes("suasana") ||
    promptLower.includes("di luar")
  ) {
    if (tier <= 1) {
      return `Kondisi di luar ${ambient}. Pemandangannya indah.`;
    }
    if (tier <= 3) {
      return `Di sekitar lembah saat ini ${ambient}. Pemandangan di ${loc.locationName} tampak sangat asri.`;
    }
    return `Lembah sedang memperlihatkan keasriannya, ${ambient}. Sangat menenangkan menikmati waktu di ${loc.locationName}.`;
  }

  // 1. Feeding Reaction (Makan)
  if (context?.interactionType === "feed" || context?.isEating || context?.currentState === "eating") {
    const food = context?.currentFoodName || "makanan";
    if (tier <= 1) {
      return `Terima kasih, ${food} ini lezat dan mengenyangkan.`;
    }
    if (tier <= 3) {
      return `${food} ini terasa lezat dan menyegarkan dinikmati di ${loc.locationName}. Juro kenyang dan siap melanjutkan aktivitas.`;
    }
    return `Terima kasih atas hidangan ${food} ini. Rasanya sangat lezat dinikmati di ${loc.locationName}, energi Juro kini pulih kembali.`;
  }

  // 2. Playing Reaction (Main)
  if (context?.interactionType === "play" || context?.isPlaying || context?.currentState === "play") {
    const toy = context?.currentToyName || "mainan";
    if (tier <= 1) {
      return `Bermain dan melompat bersama ${toy} sangat menyenangkan.`;
    }
    if (tier <= 3) {
      return `Aktivitas bermain dan melompat bersama ${toy} di ${loc.locationName} sangat seru dan melatih kelincahan gerak Juro.`;
    }
    return `Bermain dan melompat bersama ${toy} di ${loc.locationName} memberikan latihan ketangkasan yang baik dan suasana hati yang menyenangkan.`;
  }

  // 3. Bathing Reaction (Mandi & Sabun / Bilas)
  if (
    context?.interactionType === "bath_scrub" ||
    context?.interactionType === "bath_rinse" ||
    context?.isBathing
  ) {
    if (tier <= 1) {
      return "Tubuh Juro dibersihkan dengan sabun hingga segar dan bersih.";
    }
    if (tier <= 3) {
      return `Busa sabun dan bilasan air jernih di ${loc.locationName} membuat tubuh Juro bersih kembali.`;
    }
    return `Proses pembersihan selesai dengan baik. Air jernih lembah membuat tubuh Juro kembali bersih, higienis, dan segar.`;
  }

  // 4. Petting Reaction (Elus)
  if (context?.interactionType === "pet" || context?.isPetting) {
    if (tier <= 1) {
      return "Sentuhan elusan ini terasa hangat dan menenangkan bagi Juro.";
    }
    if (tier <= 3) {
      return `Elusan ramah di ${loc.locationName} ini membuat Juro merasa nyaman dan tenang.`;
    }
    return `Perhatian dan elusan ramah di ${loc.locationName} ini memberikan rasa tenang dan kedekatan yang baik.`;
  }

  // 5. Special States
  if (context?.isDizzy) {
    const dizzyOptions = [
      "Juro merasa pusing dan pandangan terasa berputar sejenak.",
      "Juro merasa pusing dan keseimbangan sedikit terganggu, perlu beberapa saat untuk memulihkannya.",
    ];
    return dizzyOptions[Math.floor(Math.random() * dizzyOptions.length)];
  }

  if (context?.isSleeping || context?.currentState === "sleep") {
    const sleepOptions = [
      "Juro sedang tidur dengan lelap di tempat tidurnya.",
      "Juro sedang tidur dan beristirahat dengan tenang untuk memulihkan energi.",
    ];
    return sleepOptions[Math.floor(Math.random() * sleepOptions.length)];
  }

  if (context?.isSittingOnBench) {
    const benchOptions = [
      "Duduk santai di kursi kayu bukit timur ini memberikan ketenangan dengan semilir angin lembah yang sejuk.",
      "Pemandangan lembah hijau dari kursi bukit tampak sangat menenangkan untuk dinikmati bersama.",
    ];
    return benchOptions[Math.floor(Math.random() * benchOptions.length)];
  }

  if (context?.isInWater) {
    const waterOptions = [
      "Air sungai terasa dingin, jernih, dan menyegarkan untuk berenang.",
      "Berenang di air sungai yang jernih dan bersih ini memberikan kesegaran yang baik.",
    ];
    return waterOptions[Math.floor(Math.random() * waterOptions.length)];
  }

  if (context?.isDragging || context?.currentState === "dragging") {
    return "Juro sedang dipindahkan menuju koordinat baru di padang rumput.";
  }

  if (context && context.hunger < 45) {
    return "Perut Juro mulai terasa lapar, camilan atau makanan dibutuhkan untuk memulihkan energi.";
  }

  if (context && context.energy < 45) {
    return "Tingkat energi Juro menurun, waktu istirahat dibutuhkan agar kembali bugar.";
  }

  if (context && context.affection < 45) {
    return "Juro membutuhkan interaksi dan perhatian lebih lanjut saat ini.";
  }

  if (context && context.happiness < 45) {
    return "Aktivitas interaktif atau bermain bersama akan membantu meningkatkan suasana hati Juro.";
  }

  if (context && context.cleanliness < 45) {
    return "Kebersihan tubuh Juro mulai menurun, disarankan untuk melakukan sesi mandi sabun.";
  }

  if (context?.isRaining) {
    return "Hujan sedang turun membasahi padang rumput, suasananya sejuk dan menenangkan.";
  }

  if (context?.isNight) {
    return "Waktu malam telah tiba, suasana lembah diterangi cahaya lentera yang tenang.";
  }

  if (!context) {
    return JURO_FALLBACK_REPLIES[Math.floor(Math.random() * JURO_FALLBACK_REPLIES.length)];
  }

  const cg = context?.caregiverRelationship;
  const defaultOptions = [
    `Juro merasa nyaman berada di ${loc.locationName} bersama ${cg ? cg.myCaregiverName : "kamu"}.`,
    cg?.caregiverCount === 2
      ? `Juro terawat dengan baik berkat perhatian dari ${cg.myCaregiverName} dan ${cg.partnerCaregiverName}.`
      : cg
      ? `Juro siap menemani dan beraktivitas bersama ${cg.myCaregiverName}.`
      : "Juro siap menemani aktivitas harianmu di lembah.",
    `Menikmati waktu di ${loc.locationName} terasa menyenangkan bersama ${cg ? cg.myCaregiverName : "kamu"}.`,
    cg?.caregiverCount === 2
      ? `Juro selalu siap mendampingi ${cg.myCaregiverName} dan ${cg.partnerCaregiverName} di setiap aktivitas.`
      : "Juro selalu siap mendampingimu di setiap aktivitas.",
    "Semua kebutuhan Juro terpantau dengan baik di padang rumput lembah.",
    "Senang dapat mendampingimu menikmati keindahan lembah hari ini.",
  ];
  return defaultOptions[Math.floor(Math.random() * defaultOptions.length)];
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
    `- Hubungkan jawabanmu dengan aktivitas dan kesadaran lingkunganmu secara wajar, ramah, dan relevan.`,
    `ATURAN GAYA BICARA JURO:`,
    `- Bicaralah dengan nada yang imut, polos, ceria, dan bersahabat khas pet slime virtual yang menggemaskan.`,
    `- Gunakan Bahasa Indonesia yang wajar dan ekspresif. Juro boleh bersikap manja atau imut secara alami kepada pengasuhnya.`,
    `- DILARANG KERAS menyisipkan emoji Unicode apa pun.`,
    `- Hindari onomatopoeia berlebihan atau spam kata kaku seperti "Uwuu~" atau "Boing boing~" di setiap kalimat.`,
    `- SESUAIKAN ISI JAWABAN DENGAN KONDISI / AKTIVITAS:`,
    `  * Jika sedang tidur / mengantuk: bicaralah mengantuk dengan polos, sebut kasur empuk atau mimpi indah.`,
    `  * Jika sedang duduk santai di bangku: sebut sejuknya angin bukit dan indahnya lembah bersama teman.`,
    `  * Jika sedang di dalam air / berenang: sebut segarnya air sungai jernih dan asyiknya mengapung.`,
    `  * Jika sedang lapar: sampaikan rasa lapar dengan polos, minta camilan atau makanan manis.`,
    `  * Jika sedang makan: ucapkan terima kasih dengan riang, puji makanan lezat yang membuat perut kenyang.`,
    `  * Jika sedang dimandikan / disabun: sebut segarnya air bilasan dan tubuh yang bersih berkilau.`,
    `  * Jika sedang bermain: sebut mainan yang sedang dimainkan dan ajak bermain lagi dengan ceria.`,
    `  * Jika sedang dielus / diajak interaksi: sampaikan rasa senang dan nyaman disayang pengasuh.`,
    `  * Jika sedang pusing (dizzy): sampaikan rasa pusing dengan polos dan butuh istirahat sejenak.`,
    `  * Jika sedang bosan: ajak bermain atau menjelajahi lembah bersama.`,
    `  * Jika sedang kotor: minta dimandikan agar tubuh kembali bersih dan segar.`,
    `- JAWABAN HARUS SANGAT SINGKAT & RINGKAS: MAKSIMAL 1 SAMPAI 2 KALIMAT PENDEK (maksimal 8 sampai 16 kata saja).`,
    `- DILARANG KERAS menulis jawaban panjang, bercerita bertele-tele, atau memberikan penjelasan berlebihan. Jawablah secara singkat, padat, dan to-the-point agar pas di balon dialog retro.`,
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
 * Send a chat message to the server-side Gemini API endpoint and receive Juro's cute in-character reply
 */
export async function chatWithJuro(
  userMessage: string,
  context?: PetChatContext
): Promise<string> {
  const trimmedInput = userMessage.trim();
  if (!trimmedInput && !context?.isSpontaneous) {
    return "Ada yang ingin kamu sampaikan atau tanyakan kepada Juro hari ini?";
  }

  // Record user message & process autonomous memory adding/forgetting
  if (trimmedInput) {
    handleMemoryCommands(trimmedInput);
    addChatMessage("user", trimmedInput);
  }

  const promptText =
    trimmedInput ||
    "Sampaikan tanggapan singkat dan ramah sesuai aktivitas yang sedang kamu lakukan!";

  const systemInstruction = buildJuroSystemPrompt(context);

  try {
    // Format multi-turn conversation history with alternating turns
    const formattedContents = getFormattedGeminiHistory(promptText);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch("/api/gemini/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction,
        contents: formattedContents,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("Gemini server API error:", response.status, errorText);
      const fallback = getContextualFallbackReply(context, promptText);
      addChatMessage("juro", fallback);
      return fallback;
    }

    const data = (await response.json()) as { text?: unknown };
    const replyText = typeof data.text === "string" ? data.text : "";

    if (replyText) {
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

