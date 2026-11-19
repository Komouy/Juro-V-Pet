/**
 * Juro Living - Gemini AI Chat Service
 * Connects Juro to Google Gemini 2.5 Flash API for cute, witty, and contextual pet replies.
 */

export interface PetChatContext {
  name: string;
  hunger: number;
  energy: number;
  cleanliness: number;
  happiness: number;
  affection: number;
  currentState: string;
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
  isRaining?: boolean;
  isSpontaneous?: boolean;
}

const STORAGE_KEY = "juro_gemini_api_key";
const GEMINI_MODEL = "gemini-3.5-flash-lite";

// Canned in-character witty fallbacks when offline or before API key is provided
export const JURO_FALLBACK_REPLIES = [
  "Bloop! Juro senang ngobrol sama kamu, tapi kepikiran puding lezat nih! Nyam nyam~",
  "Slimey! Perut jeli Juro berbunyi lembut... bloop bloop!",
  "Hehe, Juro suka melompat-lompat di padang rumput sambil dengerin kamu!",
  "Bloop bloop! Apapun ceritamu, Juro selalu ada di sini menemanimu!",
  "Nyam! Juro lagi membayangkan stroberi manis yang kenyal dan segar!",
  "Bloop! Tubuh jeli Juro bergoyang riang setiap kali kamu menyapa!",
  "Zzz... eh Juro nggak tidur kok, cuma merem sedikit menikmati angin sepoi-sepoi!",
];

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
}): string {
  if (context.isDizzy) {
    return "pusing dan linglung (mata berputar, ada bintang kelap-kelip)";
  }
  if (context.isSleeping) {
    return "tertidur lelap (mata terpejam tenang, mendengkur lembut Zzz)";
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
  currentFoodName?: string;
  currentToyName?: string;
}): string {
  if (context.isDizzy) {
    return "sedang pusing dan linglung, dunia terasa berputar-putar";
  }
  if (context.isSleeping || context.currentState === "sleep") {
    return "sedang tidur nyenyak di kasur/sofa empuk sambil mendengkur Zzz";
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
export function getContextualFallbackReply(context?: PetChatContext): string {
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

  if (context?.isPetting) {
    const petOptions = [
      "Purrr... Bloop! Elusan tanganmu hangat sekali, Juro sayang kamu!",
      "Bloop bloop! Tubuh jeli Juro meleleh nyaman dielus kamu~",
    ];
    return petOptions[Math.floor(Math.random() * petOptions.length)];
  }

  if (context?.isBathing) {
    const bathOptions = [
      "Bloop bloop! Wangi buah segaaar, busa sabunnya geli-geli lembut di badan!",
      "Seger banget! Juro jadi slime bersih berkilau sekarang! Bloop~",
    ];
    return bathOptions[Math.floor(Math.random() * bathOptions.length)];
  }

  if (context?.isEating || context?.currentState === "eating") {
    const food = context?.currentFoodName || "camilan manis";
    return `Nyam nyam nyam! Bloop! Enak banget ${food}, jeli Juro kenyang!`;
  }

  if (context?.isPlaying || context?.currentState === "play") {
    const toy = context?.currentToyName || "bola";
    return `Bloop! Asyik banget main ${toy}, ayo lompat bareng Juro!`;
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

  const defaultOptions = [
    "Bloop! Juro senang ngobrol sama kamu, tapi kepikiran puding lezat nih! Nyam nyam~",
    "Slimey! Perut jeli Juro berbunyi lembut... bloop bloop!",
    "Hehe, Juro suka melompat-lompat di padang rumput sambil dengerin kamu!",
    "Bloop bloop! Apapun ceritamu, Juro selalu ada di sini menemanimu!",
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

  const hungerInfo = context ? `Kondisi lapar: ${context.hunger}/100.` : "";
  const energyInfo = context ? `Kondisi energi: ${context.energy}/100.` : "";
  const moodState = context ? `Aktivitas saat ini: ${context.currentState}.` : "";
  const weatherState = context?.isRaining
    ? "Cuaca sedang hujan."
    : context?.isNight
    ? "Waktu malam hari."
    : "Cuaca cerah.";

  const spontaneousDirective = context?.isSpontaneous
    ? "Ini adalah celetukan spontan/gumamanmu sendiri (monolog lucu) yang kamu ucapkan tiba-tiba kepada pemilikmu tanpa ditanya. Ungkapkan celetukan imut yang sedang kamu pikirkan atau rasakan saat ini."
    : "Jawablah pesan atau sapaan dari pemilikmu dengan menghubungkannya langsung ke kondisi dan ekspresimu saat ini.";

  return [
    `Kamu adalah ${petName}, sesosok slime jeli oranye peliharaan virtual yang imut, polos, lucu, agak gembul, dan sangat menyayangi pemilikmu.`,
    `Kamu tinggal di sebuah lembah padang rumput yang damai, dengan sungai kecil berair jernih, bukit santai, dan gua kristal.`,
    hungerInfo,
    energyInfo,
    moodState,
    weatherState,
    `KONDISI & EKSPRESI JURO SAAT INI (WAJIB JADI FOKUS UTAMA JAWABAN):`,
    `- Sedang melakukan: ${activity}.`,
    `- Ekspresi wajah & perasaan: ${expression}.`,
    spontaneousDirective,
    `ATURAN GAYA BICARA:`,
    `- Gunakan Bahasa Indonesia yang santai, imut, ramah, dan sedikit jenaka/lucu.`,
    `- WAJIB SESUAIKAN ISI JAWABAN DENGAN KONDISI / EKSPRESI:`,
    `  * Jika sedang tidur / mengantuk: bicaralah dengan nada mengantuk, menguap ("Hwaaam... Zzz..."), setengah mengigau atau sebut kasur/mimpimu.`,
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
    `- JAWABAN HARUS SANGAT SINGKAT: MAKSIMAL 1 SAMPAI 2 KALIMAT PENDEK (sekitar 10 sampai 22 kata).`,
    `- Jangan pernah menulis jawaban panjang, daftar poin, atau kalimat formal/kaku karena jawabanmu akan ditampilkan di dalam balon ucapan (speech bubble) retro kecil di atas layar game.`,
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

  // If response is still longer than 150 characters, trim at the last full sentence
  if (clean.length > 150) {
    const sentences = clean.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 0) {
      clean = sentences.slice(0, 2).join(" ").trim();
    } else {
      clean = clean.slice(0, 140) + "...";
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

  const promptText =
    trimmedInput ||
    "Bloop! Celetuk sesuatu yang imut sesuai apa yang sedang kamu lakukan sekarang!";

  const apiKey = getGeminiApiKey();

  // If no Gemini API key is configured, respond with a contextual in-character fallback
  if (!apiKey) {
    return getContextualFallbackReply(context);
  }

  const systemInstruction = buildJuroSystemPrompt(context);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: promptText }],
        },
      ],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 100,
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
      return getContextualFallbackReply(context);
    }

    const data = await response.json();
    const replyText =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (replyText && typeof replyText === "string") {
      return sanitizeJuroReply(replyText);
    }

    return getContextualFallbackReply(context);
  } catch (error) {
    console.warn("Gemini chat error, using fallback:", error);
    return getContextualFallbackReply(context);
  }
}

