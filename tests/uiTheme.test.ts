// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "../src/stores/uiStore";
import { getTimePhaseFromDate, isBedtimeHour } from "../src/utils/timeOfDay";

describe("UI Store & Theme Mode", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    useUIStore.setState({
      theme: "light",
      soundEnabled: true,
      isMobileNavOpen: false,
      toast: null,
      cameraResetNonce: 0,
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

  it("increments cameraResetNonce when triggerCameraReset is called", () => {
    expect(useUIStore.getState().cameraResetNonce).toBe(0);
    useUIStore.getState().triggerCameraReset();
    expect(useUIStore.getState().cameraResetNonce).toBe(1);
    useUIStore.getState().triggerCameraReset();
    expect(useUIStore.getState().cameraResetNonce).toBe(2);
  });

  it("evaluates natural sleep & wake circadian hours correctly", () => {
    const makeDate = (hour: number) => {
      const d = new Date(2026, 10, 19, hour, 0, 0);
      return d;
    };

    // Bedtime: 19:00 - 05:59 (7-8 PM through 5-6 AM)
    expect(isBedtimeHour(makeDate(19))).toBe(true);
    expect(isBedtimeHour(makeDate(20))).toBe(true);
    expect(isBedtimeHour(makeDate(23))).toBe(true);
    expect(isBedtimeHour(makeDate(0))).toBe(true);
    expect(isBedtimeHour(makeDate(5))).toBe(true);

    // Daytime / Awake: 06:00 - 18:59
    expect(isBedtimeHour(makeDate(6))).toBe(false);
    expect(isBedtimeHour(makeDate(9))).toBe(false);
    expect(isBedtimeHour(makeDate(12))).toBe(false);
    expect(isBedtimeHour(makeDate(16))).toBe(false);
    expect(isBedtimeHour(makeDate(18))).toBe(false);

    // Time phases
    expect(getTimePhaseFromDate(makeDate(6))).toBe("morning");
    expect(getTimePhaseFromDate(makeDate(12))).toBe("day");
    expect(getTimePhaseFromDate(makeDate(17))).toBe("sunset");
    expect(getTimePhaseFromDate(makeDate(20))).toBe("night");
  });
});
