import { create } from "zustand";
import type { ThemeMode, WeatherMode } from "../types/ui";

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
  toast: UIToast | null;
  cameraResetNonce: number;
  toggleTheme: () => void;
  toggleWeather: () => void;
  setWeather: (weather: WeatherMode) => void;
  toggleSound: () => void;
  setMobileNav: (open: boolean) => void;
  setActionMenuStyle: (style: ActionMenuStyle) => void;
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

export const useUIStore = create<UIState>((set) => ({
  theme: "light",
  weather: "clear",
  soundEnabled: true,
  isMobileNavOpen: false,
  actionMenuStyle: getInitialActionMenuStyle(),
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
      weather: s.weather === "clear" ? "rain" : "clear",
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
