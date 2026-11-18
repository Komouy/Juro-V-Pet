// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "../src/stores/uiStore";

describe("UI Store & Theme Mode", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    useUIStore.setState({
      theme: "light",
      soundEnabled: true,
      isMobileNavOpen: false,
      toast: null,
    });
  });

  it("initializes with light theme by default", () => {
    expect(useUIStore.getState().theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggles theme to dark and adds .dark class to documentElement", () => {
    useUIStore.getState().toggleTheme();

    expect(useUIStore.getState().theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("toggles back to light and removes .dark class", () => {
    useUIStore.getState().toggleTheme(); // to dark
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    useUIStore.getState().toggleTheme(); // back to light
    expect(useUIStore.getState().theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggles sound correctly", () => {
    expect(useUIStore.getState().soundEnabled).toBe(true);
    useUIStore.getState().toggleSound();
    expect(useUIStore.getState().soundEnabled).toBe(false);
    useUIStore.getState().toggleSound();
    expect(useUIStore.getState().soundEnabled).toBe(true);
  });

  it("shows and clears unified UI toast notifications with unique incrementing ids", () => {
    useUIStore.getState().showToast("Berhasil dibeli", "success");
    const first = useUIStore.getState().toast;
    expect(first).not.toBeNull();
    expect(first?.text).toBe("Berhasil dibeli");
    expect(first?.tone).toBe("success");

    useUIStore.getState().showToast("Koin belum cukup", "warn");
    const second = useUIStore.getState().toast;
    expect(second?.id).toBeGreaterThan(first!.id);
    expect(second?.tone).toBe("warn");

    useUIStore.getState().clearToast();
    expect(useUIStore.getState().toast).toBeNull();
  });
});
