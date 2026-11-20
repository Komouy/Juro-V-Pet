import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

export interface FirebaseCustomConfig {
  apiKey: string;
  authDomain?: string;
  databaseURL: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const STORAGE_KEY = "juro_firebase_custom_config";

/**
 * Mendapatkan konfigurasi Firebase aktif:
 * Prioritas 1: Environment Variables (VITE_FIREBASE_DATABASE_URL, dll.)
 * Prioritas 2: Custom config dari localStorage yang diisi pengguna
 */
export function getActiveFirebaseConfig(): FirebaseCustomConfig | null {
  // 1. Cek apakah ada custom config tersimpan di localStorage (prioritas override)
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as FirebaseCustomConfig;
        if (parsed.databaseURL && parsed.apiKey && parsed.projectId) {
          return parsed;
        }
      }
    } catch {
      // Abaikan jika parsing gagal
    }
  }

  // 2. Cek dari environment variables (.env / .env.local) dengan default fallback ke project Firebase
  const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAgYfQa5WEI88S5-vt1mI1xD-KVETNr5dg";
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "jurovpet-a4b7d";
  const envDbUrl = (
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    "https://jurovpet-a4b7d-default-rtdb.asia-southeast1.firebasedatabase.app"
  ).replace(/\/+$/, "");

  if (envApiKey && envProjectId && envDbUrl) {
    return {
      apiKey: envApiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "jurovpet-a4b7d.firebaseapp.com",
      databaseURL: envDbUrl,
      projectId: envProjectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "jurovpet-a4b7d.firebasestorage.app",
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "292948659239",
      appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:292948659239:web:2917e703e9971f538d5202",
    };
  }

  return null;
}

/**
 * Menyimpan custom konfigurasi Firebase dari UI Settings (berguna untuk testing langsung)
 */
export function saveCustomFirebaseConfig(config: FirebaseCustomConfig | null): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  cachedApp = null;
  cachedDb = null;
  if (!config) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}

/**
 * Mengecek apakah Firebase Realtime Database sudah terkonfigurasi dan siap dipakai
 */
export function isFirebaseConfigured(): boolean {
  return getActiveFirebaseConfig() !== null;
}

/**
 * Membantu mem-parsing snippet konfigurasi Firebase (JSON atau JavaScript object)
 * yang disalin langsung dari Firebase Console
 */
export function parseFirebaseConfigSnippet(input: string): FirebaseCustomConfig | null {
  const clean = input.trim();
  if (!clean) return null;

  // 1. Coba parse JSON murni
  try {
    const json = JSON.parse(clean);
    if (json.apiKey && json.projectId) {
      return {
        apiKey: json.apiKey,
        authDomain: json.authDomain || `${json.projectId}.firebaseapp.com`,
        databaseURL: json.databaseURL || `https://${json.projectId}-default-rtdb.firebaseio.com`,
        projectId: json.projectId,
        storageBucket: json.storageBucket || `${json.projectId}.appspot.com`,
        messagingSenderId: json.messagingSenderId || "",
        appId: json.appId || "",
      };
    }
  } catch {
    // Lanjutkan dengan regex parsing jika bukan JSON murni
  }

  // 2. Ekstrak dengan regex dari objek JS (const firebaseConfig = { ... })
  const extract = (key: string): string => {
    const match = clean.match(new RegExp(`['"]?${key}['"]?\\s*:\\s*['"]([^'"]+)['"]`, "i"));
    return match ? match[1].trim() : "";
  };

  const apiKey = extract("apiKey");
  const projectId = extract("projectId");
  let databaseURL = extract("databaseURL");

  if (apiKey && projectId) {
    if (!databaseURL) {
      databaseURL = `https://${projectId}-default-rtdb.firebaseio.com`;
    }
    return {
      apiKey,
      projectId,
      databaseURL,
      authDomain: extract("authDomain") || `${projectId}.firebaseapp.com`,
      storageBucket: extract("storageBucket") || `${projectId}.appspot.com`,
      messagingSenderId: extract("messagingSenderId") || "",
      appId: extract("appId") || "",
    };
  }

  return null;
}

let cachedApp: FirebaseApp | null = null;
let cachedDb: Database | null = null;

/**
 * Mengambil instance Realtime Database Firebase
 */
export function getFirebaseDatabaseInstance(): Database | null {
  const config = getActiveFirebaseConfig();
  if (!config) return null;

  try {
    if (!cachedApp) {
      const existingApps = getApps();
      if (existingApps.length > 0) {
        cachedApp = existingApps[0];
      } else {
        cachedApp = initializeApp(config);
      }
    }

    if (!cachedDb && cachedApp) {
      cachedDb = getDatabase(cachedApp, config.databaseURL);
    }

    return cachedDb;
  } catch (err) {
    console.error("Gagal menginisialisasi Firebase Database:", err);
    return null;
  }
}
