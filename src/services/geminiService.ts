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
  isNight?: boolean;
  isRaining?: boolean;
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
  const hungerInfo = context ? `Kondisi lapar: ${context.hunger}/100.` : "";
  const energyInfo = context ? `Kondisi energi: ${context.energy}/100.` : "";
  const moodState = context ? `Aktivitas saat ini: ${context.currentState}.` : "";
  const weatherState = context?.isRaining ? "Cuaca sedang hujan pixel." : context?.isNight ? "Waktu malam hari." : "Cuaca cerah.";

  return [
    `Kamu adalah ${petName}, sesosok slime jeli oranye peliharaan virtual yang imut, polos, lucu, agak gembul, dan sangat menyayangi pemilikmu.`,
    `Kamu tinggal di sebuah lembah padang rumput yang damai, dengan sungai kecil berair jernih, bukit santai, dan gua kristal.`,
    hungerInfo,
    energyInfo,
    moodState,
    weatherState,
    `ATURAN GAYA BICARA:`,
    `- Gunakan Bahasa Indonesia yang santai, imut, ramah, dan sedikit jenaka/lucu.`,
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
  if (!trimmedInput) {
    return "Bloop? Pemilikku mau ngomong apa nih ke Juro? Slimey~";
  }

  const apiKey = getGeminiApiKey();

  // If no Gemini API key is configured, respond with a random cute in-character fallback
  if (!apiKey) {
    // Pick random fallback reply
    const randomIndex = Math.floor(Math.random() * JURO_FALLBACK_REPLIES.length);
    return JURO_FALLBACK_REPLIES[randomIndex];
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
          parts: [{ text: trimmedInput }],
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
      const randomIndex = Math.floor(Math.random() * JURO_FALLBACK_REPLIES.length);
      return JURO_FALLBACK_REPLIES[randomIndex];
    }

    const data = await response.json();
    const replyText =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (replyText && typeof replyText === "string") {
      return sanitizeJuroReply(replyText);
    }

    return JURO_FALLBACK_REPLIES[0];
  } catch (error) {
    console.warn("Gemini chat error, using fallback:", error);
    const randomIndex = Math.floor(Math.random() * JURO_FALLBACK_REPLIES.length);
    return JURO_FALLBACK_REPLIES[randomIndex];
  }
}

