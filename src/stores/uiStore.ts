import { create } from "zustand";
import type { ThemeMode } from "../types/ui";

export type ToastTone = "success" | "warn" | "info";

export interface UIToast {
  id: number;
  text: string;
  tone: ToastTone;
}

let toastSeq = 0;

interface UIState {
  theme: ThemeMode;
  soundEnabled: boolean;
  isMobileNavOpen: boolean;
  toast: UIToast | null;
  cameraResetNonce: number;
  toggleTheme: () => void;
  toggleSound: () => void;
  setMobileNav: (open: boolean) => void;
  showToast: (text: string, tone?: ToastTone) => void;
  clearToast: () => void;
  triggerCameraReset: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: "light",
  soundEnabled: true,
  isMobileNavOpen: false,
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
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  setMobileNav: (open) => set({ isMobileNavOpen: open }),
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
