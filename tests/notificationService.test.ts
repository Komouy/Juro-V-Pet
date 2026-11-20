// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { notificationService } from "../src/services/notificationService";

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
});
