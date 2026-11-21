/**
 * Pet Memory & Conversation History Service for Juro
 * Handles multi-turn chat history persistence and autonomous AI-driven long-term memories.
 * Automatically learns facts as conversations progress, and automatically removes/forgets
 * memories when the user requests or expresses dislike.
 */

export interface ChatMessage {
  id: string;
  sender: "user" | "juro";
  text: string;
  timestamp: number;
}

export interface PetMemoryItem {
  id: string;
  text: string;
  createdAt: number;
  category?: "profile" | "preference" | "milestone" | "custom";
}

type MemoryChangeListener = (memories: PetMemoryItem[]) => void;
const memoryListeners: Set<MemoryChangeListener> = new Set();

export function onPetMemoriesChanged(listener: MemoryChangeListener): () => void {
  memoryListeners.add(listener);
  return () => {
    memoryListeners.delete(listener);
  };
}

function notifyMemoryListeners(memories: PetMemoryItem[]): void {
  for (const listener of memoryListeners) {
    try {
      listener(memories);
    } catch {
      // Safe execution
    }
  }
}

const CHAT_HISTORY_STORAGE_KEY = "juro_chat_history_v1";
const MEMORIES_STORAGE_KEY = "juro_memories_v1";
const MAX_STORED_MESSAGES = 40;
const MAX_CONTEXT_TURNS = 10; // Number of recent turns passed to Gemini API

/**
 * Safe local storage reader
 */
function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safe local storage writer
 */
function writeStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // LocalStorage quota or restricted environment
  }
}

/**
 * Get all stored chat messages
 */
export function getChatHistory(): ChatMessage[] {
  return readStorage<ChatMessage[]>(CHAT_HISTORY_STORAGE_KEY, []);
}

/**
 * Save a new chat message to persistent history
 */
export function addChatMessage(sender: "user" | "juro", text: string): ChatMessage {
  const cleanText = text.trim();
  const newMessage: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sender,
    text: cleanText,
    timestamp: Date.now(),
  };

  const history = getChatHistory();
  const updated = [...history, newMessage].slice(-MAX_STORED_MESSAGES);
  writeStorage(CHAT_HISTORY_STORAGE_KEY, updated);
  return newMessage;
}

/**
 * Clear all chat messages
 */
export function clearChatHistory(): void {
  try {
    localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
  } catch {
    // Ignored
  }
}

/**
 * Format recent messages for Google Gemini REST API `contents` array.
 * Ensures strict alternation between "user" and "model", starting with "user".
 */
export function getFormattedGeminiHistory(
  newPrompt: string
): Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> {
  const history = getChatHistory();
  const recent = history.slice(-MAX_CONTEXT_TURNS);

  const formatted: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  for (const msg of recent) {
    const role: "user" | "model" = msg.sender === "user" ? "user" : "model";

    // Gemini API requires strict role alternation
    if (formatted.length > 0 && formatted[formatted.length - 1].role === role) {
      formatted[formatted.length - 1].parts[0].text += ` ${msg.text}`;
    } else {
      formatted.push({
        role,
        parts: [{ text: msg.text }],
      });
    }
  }

  // Ensure first element is "user" if history began with "model"
  while (formatted.length > 0 && formatted[0].role !== "user") {
    formatted.shift();
  }

  // Append current user prompt
  if (formatted.length > 0 && formatted[formatted.length - 1].role === "user") {
    formatted[formatted.length - 1].parts[0].text += ` ${newPrompt.trim()}`;
  } else {
    formatted.push({
      role: "user",
      parts: [{ text: newPrompt.trim() }],
    });
  }

  return formatted;
}

/**
 * Get all stored facts / memories about the user
 */
export function getPetMemories(): PetMemoryItem[] {
  return readStorage<PetMemoryItem[]>(MEMORIES_STORAGE_KEY, []);
}

/**
 * Add a fact / memory to Juro's persistent memory bank
 */
export function addPetMemory(
  text: string,
  category: PetMemoryItem["category"] = "custom"
): PetMemoryItem | null {
  const clean = text.trim();
  if (!clean || clean.length < 3) return null;

  const current = getPetMemories();

  // Deduplicate case-insensitively
  const exists = current.some((m) => m.text.toLowerCase() === clean.toLowerCase());
  if (exists) return null;

  const newMemory: PetMemoryItem = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: clean,
    createdAt: Date.now(),
    category,
  };

  const updated = [newMemory, ...current].slice(0, 30);
  writeStorage(MEMORIES_STORAGE_KEY, updated);
  notifyMemoryListeners(updated);
  return newMemory;
}

/**
 * Directly overwrite and persist memories list
 */
export function setPetMemories(memories: PetMemoryItem[]): void {
  const safeMemories = Array.isArray(memories) ? memories.slice(0, 30) : [];
  writeStorage(MEMORIES_STORAGE_KEY, safeMemories);
  notifyMemoryListeners(safeMemories);
}

/**
 * Merge incoming memories from partner or cloud without duplicate facts
 */
export function syncAndMergeMemories(incoming: PetMemoryItem[]): PetMemoryItem[] {
  if (!Array.isArray(incoming) || incoming.length === 0) return getPetMemories();

  const current = getPetMemories();
  const seenTexts = new Set<string>();
  const merged: PetMemoryItem[] = [];

  // Combine current and incoming, prioritizing newest
  const combined = [...incoming, ...current].sort((a, b) => b.createdAt - a.createdAt);

  for (const item of combined) {
    if (!item || typeof item.text !== "string") continue;
    const key = item.text.trim().toLowerCase();
    if (!key || seenTexts.has(key)) continue;
    seenTexts.add(key);
    merged.push(item);
    if (merged.length >= 30) break;
  }

  writeStorage(MEMORIES_STORAGE_KEY, merged);
  notifyMemoryListeners(merged);
  return merged;
}

/**
 * Remove a specific memory by ID
 */
export function removePetMemory(id: string): void {
  const current = getPetMemories();
  const updated = current.filter((m) => m.id !== id);
  writeStorage(MEMORIES_STORAGE_KEY, updated);
  notifyMemoryListeners(updated);
}

/**
 * Clear all stored memories
 */
export function clearPetMemories(): void {
  try {
    localStorage.removeItem(MEMORIES_STORAGE_KEY);
    notifyMemoryListeners([]);
  } catch {
    // Ignored
  }
}

/**
 * Automatic Memory Controller:
 * Automatically processes conversational requests to either REMOVE / FORGET memories
 * or ADD new facts seamlessly during natural chats.
 */
export function handleMemoryCommands(userMessage: string): {
  action: "added" | "forgot" | "cleared" | "none";
  count?: number;
} {
  const text = userMessage.trim().toLowerCase();
  if (!text) return { action: "none" };

  // 1. Clear all memories request
  if (
    /^(?:lupakan\s+semuanya|lupakan\s+semua|hapus\s+semua\s+ingatan|hapus\s+semua\s+memori|reset\s+ingatan|reset\s+memori)(?:[.,!?]|$)/i.test(
      text
    )
  ) {
    clearPetMemories();
    return { action: "cleared" };
  }

  // 2. Forget name: "lupakan namaku", "lupakan nama aku", "hapus namaku"
  if (/(?:lupakan\s+namaku|lupakan\s+nama\s+aku|hapus\s+namaku)/i.test(text)) {
    const current = getPetMemories();
    const remaining = current.filter((m) => !/nama\s+pemilik/i.test(m.text));
    const removedCount = current.length - remaining.length;
    writeStorage(MEMORIES_STORAGE_KEY, remaining);
    return { action: "forgot", count: removedCount };
  }

  // 3. Forget recent memory: "lupakan yang tadi", "jangan ingat yang tadi", "hapus yang barusan"
  if (
    /(?:lupakan|jangan\s+ingat|hapus).*?(?:yang\s+tadi|yang\s+barusan)/i.test(text) ||
    /(?:yang\s+tadi|yang\s+barusan).*?(?:lupakan|jangan|hapus)/i.test(text)
  ) {
    const current = getPetMemories();
    if (current.length > 0) {
      writeStorage(MEMORIES_STORAGE_KEY, current.slice(1));
      return { action: "forgot", count: 1 };
    }
    return { action: "none" };
  }

  // 4. Forget specific topic or item:
  // "lupakan tentang X", "lupakan X", "jangan ingat tentang X", "jangan ingat X", "hapus ingatan tentang X"
  const forgetMatch = text.match(
    /(?:lupakan\s+tentang|lupakan|jangan\s+ingat\s+tentang|jangan\s+ingat|hapus\s+ingatan\s+tentang|hapus\s+ingatan|hapus\s+memori\s+tentang|hapus\s+memori)\s+([a-zA-Z0-9\s]+?)(?:[.,!?]|$)/i
  );

  if (forgetMatch && forgetMatch[1]) {
    const rawTarget = forgetMatch[1]
      .trim()
      .replace(/\s+(?:deh|dong|ya|sih|lah|aja)$/i, "")
      .trim();

    if (rawTarget && !/^(semua|itu)$/i.test(rawTarget)) {
      const current = getPetMemories();
      const remaining = current.filter(
        (m) => !m.text.toLowerCase().includes(rawTarget)
      );
      const removedCount = current.length - remaining.length;
      if (removedCount > 0) {
        writeStorage(MEMORIES_STORAGE_KEY, remaining);
        return { action: "forgot", count: removedCount };
      }
    }
  }

  // 5. Dislike request: "aku gak suka kamu ingat X", "aku gak suka X diingat"
  const dislikeMatch = text.match(
    /(?:aku\s+(?:gak|tidak)\s+suka\s+kamu\s+ingat|jangan\s+sebut-sebut\s+lagi)\s+([a-zA-Z0-9\s]+?)(?:[.,!?]|$)/i
  );
  if (dislikeMatch && dislikeMatch[1]) {
    const target = dislikeMatch[1].trim();
    const current = getPetMemories();
    const remaining = current.filter(
      (m) => !m.text.toLowerCase().includes(target)
    );
    const removedCount = current.length - remaining.length;
    if (removedCount > 0) {
      writeStorage(MEMORIES_STORAGE_KEY, remaining);
      return { action: "forgot", count: removedCount };
    }
  }

  // 5. Otherwise, extract new memories from conversation
  const added = extractMemoriesFromMessage(userMessage);
  if (added.length > 0) {
    return { action: "added", count: added.length };
  }

  return { action: "none" };
}

/**
 * Automatic Memory Extractor:
 * Analyzes the user's message for personal details (name, favorites, hobbies, moods)
 * and automatically saves them as remembered facts.
 */
export function extractMemoriesFromMessage(userMessage: string): PetMemoryItem[] {
  const text = userMessage.trim();
  if (!text) return [];

  const extracted: PetMemoryItem[] = [];

  // 1. Name patterns: "namaku X", "nama aku X", "panggil aku X"
  const nameMatch = text.match(/(?:namaku|nama\s+aku|panggil\s+aku)\s+([A-Za-z0-9_-]+)/i);
  if (nameMatch && nameMatch[1]) {
    const rawName = nameMatch[1].trim();
    if (rawName.length > 1 && !/^(siapa|apa|ya|deh|nih|dong|lupa)$/i.test(rawName)) {
      const mem = addPetMemory(`Nama pemilik adalah ${rawName}`, "profile");
      if (mem) extracted.push(mem);
    }
  }

  // 2. Favorite food patterns: "makanan favoritku X", "makanan kesukaanku X"
  const foodMatch = text.match(/(?:makanan\s+favoritku|makanan\s+kesukaanku|makanan\s+favorit\s+aku)\s+(.+?)(?:[.,!?]|$)/i);
  if (foodMatch && foodMatch[1]) {
    const food = foodMatch[1].trim();
    if (food.length > 2) {
      const mem = addPetMemory(`Makanan favorit pemilik adalah ${food}`, "preference");
      if (mem) extracted.push(mem);
    }
  }

  // 3. General likes: "aku suka X", "aku menyukai X", "hobiku X"
  const likeMatch = text.match(/(?:aku\s+suka|aku\s+menyukai|hobiku|hobi\s+aku)\s+(.+?)(?:[.,!?]|$)/i);
  if (likeMatch && likeMatch[1]) {
    const thing = likeMatch[1].trim();
    if (thing.length > 2 && !/^(kamu|juro|ini|itu)$/i.test(thing)) {
      const mem = addPetMemory(`Pemilik menyukai ${thing}`, "preference");
      if (mem) extracted.push(mem);
    }
  }

  // 4. Dislikes: "aku gak suka X", "aku tidak suka X", "aku benci X"
  const hateMatch = text.match(/(?:aku\s+(?:gak|tidak)\s+suka|aku\s+benci)\s+(.+?)(?:[.,!?]|$)/i);
  if (hateMatch && hateMatch[1]) {
    const thing = hateMatch[1].trim();
    if (thing.length > 2 && !/^(kamu|juro|ini|itu)$/i.test(thing)) {
      const mem = addPetMemory(`Pemilik tidak menyukai ${thing}`, "preference");
      if (mem) extracted.push(mem);
    }
  }

  // 5. Explicit memory instruction: "ingat ya: X", "ingat ini: X"
  const explicitMatch = text.match(/(?:ingat\s+ya|ingat\s+ini|tolong\s+ingat)[:\s]+(.+?)(?:[.,!?]|$)/i);
  if (explicitMatch && explicitMatch[1]) {
    const fact = explicitMatch[1].trim();
    if (fact.length > 3) {
      const mem = addPetMemory(fact, "custom");
      if (mem) extracted.push(mem);
    }
  }

  return extracted;
}
