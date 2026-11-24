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

interface UIState {
  theme: ThemeMode;
  weather: WeatherMode;
  soundEnabled: boolean;
  isMobileNavOpen: boolean;
  actionMenuStyle: ActionMenuStyle;
  graphicsQuality: GraphicsQualitySetting;
  toast: UIToast | null;
  cameraResetNonce: number;
  toggleTheme: () => void;
  toggleWeather: () => void;
  setWeather: (weather: WeatherMode) => void;
  toggleSound: () => void;
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

export const useUIStore = create<UIState>((set) => ({
  theme: "light",
  weather: "clear",
  soundEnabled: true,
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
    set((s) => ({
      weather:
        s.weather === "clear"
          ? "rain"
          : s.weather === "rain"
          ? "clear"
          : s.weather === "auto"
          ? "cerah"
          : s.weather === "cerah"
          ? "senja"
          : s.weather === "senja"
          ? "malam"
          : s.weather === "malam"
          ? "hujan"
          : "auto",
    })),
  setWeather: (weather) => set({ weather }),
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
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
