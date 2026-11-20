// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { generatePairingCode } from "../src/services/firebase/juroSyncService";
import { useCaregiverStore } from "../src/stores/caregiverStore";
import {
  getActiveFirebaseConfig,
  saveCustomFirebaseConfig,
  isFirebaseConfigured,
} from "../src/services/firebase/firebaseConfig";

describe("Caregiver Co-Parenting & Firebase Realtime Foundation", () => {
  beforeEach(() => {
    localStorage.clear();
    saveCustomFirebaseConfig(null);
  });

  it("generates a human-friendly pairing code with JURO- prefix and 4 digits", () => {
    const code = generatePairingCode();
    expect(code).toMatch(/^JURO-\d{4}$/);
  });

  it("manages caregiver profile and remembers registration status", () => {
    const store = useCaregiverStore.getState();
    expect(store.hasRegisteredName).toBe(false);

    store.setProfile("Dhavi", "Papi Juro");
    const updated = useCaregiverStore.getState();
    expect(updated.hasRegisteredName).toBe(true);
    expect(updated.myProfile?.name).toBe("Dhavi");
    expect(updated.myProfile?.roleTitle).toBe("Papi Juro");
    expect(updated.myProfile?.id).toBeDefined();

    // Verifies persistence in localStorage
    const saved = localStorage.getItem("juro_caregiver_profile");
    expect(saved).not.toBeNull();
    expect(JSON.parse(saved!).name).toBe("Dhavi");
  });

  it("records care actions with author details and timestamps", async () => {
    const store = useCaregiverStore.getState();
    store.setProfile("Naufall", "Perawat 2");

    await store.recordAction(
      "feed",
      "Naufall memberi Juro Pudding Stroberi (+25 Kenyang)",
      { hunger: 25 },
      "Pudding Stroberi"
    );

    const logs = useCaregiverStore.getState().activityLogs;
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].caregiverName).toBe("Naufall");
    expect(logs[0].actionType).toBe("feed");
    expect(logs[0].statChanges?.hunger).toBe(25);
    expect(logs[0].itemUsedName).toBe("Pudding Stroberi");
  });

  it("handles custom Firebase config storage and verification cleanly", () => {
    expect(isFirebaseConfigured()).toBe(false);

    saveCustomFirebaseConfig({
      apiKey: "fake_api_key_123",
      databaseURL: "https://juro-pet-default-rtdb.firebaseio.com",
      projectId: "juro-pet",
    });

    expect(isFirebaseConfigured()).toBe(true);
    const active = getActiveFirebaseConfig();
    expect(active?.projectId).toBe("juro-pet");
    expect(active?.databaseURL).toBe("https://juro-pet-default-rtdb.firebaseio.com");
  });
});
