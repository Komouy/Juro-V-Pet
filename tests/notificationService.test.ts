// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  notificationService,
  NOTIF_ID_HUNGER,
  NOTIF_ID_BEDTIME,
  NOTIF_ID_GREETING,
} from "../src/services/notificationService";

describe("Notification Service", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("should check if notifications are supported", () => {
    expect(typeof notificationService.isSupported()).toBe("boolean");
  });

  it("should toggle enabled state via localStorage", () => {
    expect(notificationService.isEnabled()).toBe(false);

    notificationService.setEnabled(true);
    expect(notificationService.isEnabled()).toBe(true);

    notificationService.setEnabled(false);
    expect(notificationService.isEnabled()).toBe(false);
  });

  it("should not throw error when checking critical needs", async () => {
    notificationService.setEnabled(true);

    await expect(
      notificationService.checkCriticalNeeds({
        hunger: 10,
        energy: 15,
        cleanliness: 10,
      })
    ).resolves.not.toThrow();
  });

  it("should handle partner action notification without errors", async () => {
    notificationService.setEnabled(true);

    await expect(
      notificationService.notifyPartnerAction(
        "Pega",
        "Memberikan irisan jeruk manis kepada Juro."
      )
    ).resolves.not.toThrow();
  });

  it("should safely check permission status", async () => {
    const perm = await notificationService.hasPermission();
    expect(typeof perm).toBe("boolean");
  });

  it("should calculate correct background notification plans when hungry and low energy", () => {
    const baseNow = 1700000000000;
    const plans = notificationService.calculateBackgroundSchedules(
      { hunger: 20, energy: 15, cleanliness: 50 },
      "Juro",
      baseNow
    );

    expect(plans.length).toBe(3);

    const hungerPlan = plans.find((p) => p.id === NOTIF_ID_HUNGER);
    expect(hungerPlan).toBeDefined();
    expect(hungerPlan?.title).toContain("Kelaparan");
    expect(hungerPlan?.triggerAt.getTime()).toBe(baseNow + 15 * 60 * 1000);

    const sleepPlan = plans.find((p) => p.id === NOTIF_ID_BEDTIME);
    expect(sleepPlan).toBeDefined();
    expect(sleepPlan?.title).toContain("Mengantuk");
    expect(sleepPlan?.triggerAt.getTime()).toBe(baseNow + 20 * 60 * 1000);

    const greetingPlan = plans.find((p) => p.id === NOTIF_ID_GREETING);
    expect(greetingPlan).toBeDefined();
    expect(greetingPlan?.triggerAt.getTime()).toBe(baseNow + 6 * 60 * 60 * 1000);
  });

  it("should calculate proportional future hunger notification when stats are full", () => {
    const baseNow = 1700000000000;
    const plans = notificationService.calculateBackgroundSchedules(
      { hunger: 85, energy: 90, cleanliness: 90 },
      "Juro",
      baseNow
    );

    const hungerPlan = plans.find((p) => p.id === NOTIF_ID_HUNGER);
    expect(hungerPlan).toBeDefined();
    expect(hungerPlan?.title).toContain("Mulai Lapar");
    // (85 - 25) / 2 = 30 jam, diklem ke 24 jam = 1440 menit
    expect(hungerPlan?.triggerAt.getTime()).toBeGreaterThan(baseNow + 60 * 60 * 1000);
  });

  it("should handle background alerts scheduling and cancellation gracefully", async () => {
    notificationService.setEnabled(true);

    await expect(notificationService.initNotificationChannel()).resolves.not.toThrow();
    await expect(
      notificationService.scheduleBackgroundAlerts({
        hunger: 20,
        energy: 15,
        cleanliness: 30,
      })
    ).resolves.not.toThrow();
    await expect(notificationService.cancelScheduledAlerts()).resolves.not.toThrow();
  });
});
