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
  // 1. Cek dari environment variables (.env / .env.local)
  const envDbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL;
  const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (envDbUrl && envApiKey && envProjectId) {
    return {
      apiKey: envApiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      databaseURL: envDbUrl,
      projectId: envProjectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
    };
  }

  // 2. Cek apakah ada config tersimpan di localStorage
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

  return null;
}

/**
 * Menyimpan custom konfigurasi Firebase dari UI Settings (berguna untuk testing langsung)
 */
export function saveCustomFirebaseConfig(config: FirebaseCustomConfig | null): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
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
