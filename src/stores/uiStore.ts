import { create } from "zustand";
import type { ThemeMode, WeatherMode } from "../types/ui";
import type { GraphicsQualitySetting } from "../engine/world/graphicsProfile";

export type ToastTone = "success" | "warn" | "info";
export type ActionMenuStyle = "floating" | "dock";

export interface UIToast {
  id: number;
  text: string;
  tone: ToastTone;
}

let toastSeq = 0;

const ATMOSPHERE_CYCLE: WeatherMode[] = [
  "auto",
  "pagi",
  "cerah",
  "senja",
  "malam",
  "hujan",
];

const AUTO_RAIN_PROBABILITY = 0.24;
const AUTO_RAIN_MIN_MS = 120_000;
const AUTO_RAIN_RANGE_MS = 120_000;
const AUTO_CLEAR_MIN_MS = 240_000;
const AUTO_CLEAR_RANGE_MS = 240_000;
const AUTO_WEATHER_STORAGE_KEY = "juro_auto_weather_window";

export interface AutoWeatherWindow {
  isRaining: boolean;
  nextChangeAt: number;
}

export function rollAutoWeatherWindow(
  nowMs: number = Date.now(),
  rng: () => number = Math.random
): AutoWeatherWindow {
  const isRaining = rng() < AUTO_RAIN_PROBABILITY;
  const duration = isRaining
    ? AUTO_RAIN_MIN_MS + Math.round(rng() * AUTO_RAIN_RANGE_MS)
    : AUTO_CLEAR_MIN_MS + Math.round(rng() * AUTO_CLEAR_RANGE_MS);
  return {
    isRaining,
    nextChangeAt: nowMs + duration,
  };
}

function loadOrCreateAutoWeather(nowMs: number = Date.now()): AutoWeatherWindow {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(AUTO_WEATHER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AutoWeatherWindow>;
        if (
          typeof parsed.isRaining === "boolean" &&
          typeof parsed.nextChangeAt === "number" &&
          nowMs < parsed.nextChangeAt
        ) {
          return { isRaining: parsed.isRaining, nextChangeAt: parsed.nextChangeAt };
        }
      }
    } catch {
      // ignore corrupted storage entry
    }
  }
  const rolled = rollAutoWeatherWindow(nowMs);
  persistAutoWeather(rolled);
  return rolled;
}

function persistAutoWeather(win: AutoWeatherWindow): void {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(AUTO_WEATHER_STORAGE_KEY, JSON.stringify(win));
    } catch {
      // ignore storage quota errors
    }
  }
}

interface UIState {
  theme: ThemeMode;
  weather: WeatherMode;
  autoRaining: boolean;
  autoWeatherNextChangeAt: number;
  soundEnabled: boolean;
  scanlinesEnabled: boolean;
  hasSeenIntro: boolean;
  isMobileNavOpen: boolean;
  actionMenuStyle: ActionMenuStyle;
  graphicsQuality: GraphicsQualitySetting;
  toast: UIToast | null;
  cameraResetNonce: number;
  toggleTheme: () => void;
  toggleWeather: () => void;
  cycleAtmosphere: () => void;
  setWeather: (weather: WeatherMode) => void;
  syncAutoWeather: (nowMs?: number, rng?: () => number) => void;
  toggleSound: () => void;
  toggleScanlines: () => void;
  markIntroSeen: () => void;
  resetIntro: () => void;
  setMobileNav: (open: boolean) => void;
  setActionMenuStyle: (style: ActionMenuStyle) => void;
  setGraphicsQuality: (quality: GraphicsQualitySetting) => void;
  showToast: (text: string, tone?: ToastTone) => void;
  clearToast: () => void;
  triggerCameraReset: () => void;
}

const getInitialActionMenuStyle = (): ActionMenuStyle => {
  if (typeof window !== "undefined" && window.localStorage) {
    const saved = window.localStorage.getItem("juro_action_menu_style");
    if (saved === "floating" || saved === "dock") {
      return saved;
    }
  }
  return "floating";
};

const getInitialGraphicsQuality = (): GraphicsQualitySetting => {
  if (typeof window !== "undefined" && window.localStorage) {
    const saved = window.localStorage.getItem("juro_graphics_quality");
    if (saved === "auto" || saved === "low" || saved === "balanced" || saved === "high") {
      return saved;
    }
  }
  return "auto";
};

const getInitialScanlinesEnabled = (): boolean => {
  if (typeof window !== "undefined" && window.localStorage) {
    const saved = window.localStorage.getItem("juro_scanlines_enabled");
    if (saved === "false") return false;
    if (saved === "true") return true;
  }
  return true;
};

const INTRO_SEEN_STORAGE_KEY = "juro_has_seen_intro";

const getInitialHasSeenIntro = (): boolean => {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem(INTRO_SEEN_STORAGE_KEY) === "true";
  }
  return false;
};

const initialAutoWeather = loadOrCreateAutoWeather();

export const useUIStore = create<UIState>((set, get) => ({
  theme: "light",
  weather: "auto",
  autoRaining: initialAutoWeather.isRaining,
  autoWeatherNextChangeAt: initialAutoWeather.nextChangeAt,
  soundEnabled: true,
  scanlinesEnabled: getInitialScanlinesEnabled(),
  hasSeenIntro: getInitialHasSeenIntro(),
  isMobileNavOpen: false,
  actionMenuStyle: getInitialActionMenuStyle(),
  graphicsQuality: getInitialGraphicsQuality(),
  toast: null,
  cameraResetNonce: 0,
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "light" ? "dark" : "light";
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return { theme: next };
    }),
  toggleWeather: () =>
    set((s) => {
      if (s.weather === "clear") {
        return { weather: "rain" };
      }
      if (s.weather === "rain") {
        return { weather: "clear" };
      }
      const idx = ATMOSPHERE_CYCLE.indexOf(s.weather);
      const next = ATMOSPHERE_CYCLE[(idx + 1) % ATMOSPHERE_CYCLE.length];
      return { weather: next };
    }),
  cycleAtmosphere: () =>
    set((s) => {
      const normalizedCurrent: WeatherMode =
        s.weather === "clear" ? "cerah" : s.weather === "rain" ? "hujan" : s.weather;
      const idx = ATMOSPHERE_CYCLE.indexOf(normalizedCurrent);
      const next = ATMOSPHERE_CYCLE[(idx + 1) % ATMOSPHERE_CYCLE.length];
      return { weather: next };
    }),
  setWeather: (weather) => set({ weather }),
  syncAutoWeather: (nowMs = Date.now(), rng = Math.random) => {
    const { autoWeatherNextChangeAt } = get();
    if (nowMs >= autoWeatherNextChangeAt) {
      const rolled = rollAutoWeatherWindow(nowMs, rng);
      persistAutoWeather(rolled);
      set({
        autoRaining: rolled.isRaining,
        autoWeatherNextChangeAt: rolled.nextChangeAt,
      });
    }
  },
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  toggleScanlines: () =>
    set((s) => {
      const next = !s.scanlinesEnabled;
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("juro_scanlines_enabled", String(next));
      }
      return { scanlinesEnabled: next };
    }),
  markIntroSeen: () => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(INTRO_SEEN_STORAGE_KEY, "true");
    }
    set({ hasSeenIntro: true });
  },
  resetIntro: () => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(INTRO_SEEN_STORAGE_KEY);
    }
    set({ hasSeenIntro: false });
  },
  setMobileNav: (open) => set({ isMobileNavOpen: open }),
  setActionMenuStyle: (style) => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("juro_action_menu_style", style);
    }
    set({ actionMenuStyle: style });
  },
  setGraphicsQuality: (quality) => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("juro_graphics_quality", quality);
    }
    set({ graphicsQuality: quality });
  },
  showToast: (text, tone = "success") =>
    set({
      toast: {
        id: ++toastSeq,
        text,
        tone,
      },
    }),
  clearToast: () => set({ toast: null }),
  triggerCameraReset: () => set((s) => ({ cameraResetNonce: s.cameraResetNonce + 1 })),
}));
