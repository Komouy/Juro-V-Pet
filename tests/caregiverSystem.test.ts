// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { generatePairingCode } from "../src/services/firebase/juroSyncService";
import { useCaregiverStore } from "../src/stores/caregiverStore";
import {
  getActiveFirebaseConfig,
  saveCustomFirebaseConfig,
  isFirebaseConfigured,
  parseFirebaseConfigSnippet,
} from "../src/services/firebase/firebaseConfig";
import { buildJuroSystemPrompt } from "../src/services/geminiService";

describe("Caregiver Co-Parenting & Firebase Realtime Foundation", () => {
  beforeEach(() => {
    localStorage.clear();
    saveCustomFirebaseConfig(null);
    useCaregiverStore.setState({
      myProfile: null,
      partnerProfile: null,
      activityLogs: [],
      activeRoomCode: null,
      hasRegisteredName: false,
      pairingStatus: "idle",
      errorMessage: null,
    });
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
    store.setProfile("Sahabat", "Perawat 2");

    await store.recordAction(
      "feed",
      "Sahabat memberi Juro Pudding Stroberi (+25 Kenyang)",
      { hunger: 25 },
      "Pudding Stroberi"
    );

    const logs = useCaregiverStore.getState().activityLogs;
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].caregiverName).toBe("Sahabat");
    expect(logs[0].actionType).toBe("feed");
    expect(logs[0].statChanges?.hunger).toBe(25);
    expect(logs[0].itemUsedName).toBe("Pudding Stroberi");
  });

  it("handles custom Firebase config storage and verification cleanly", () => {
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

  it("parses JS snippet and JSON from Firebase Console cleanly", () => {
    const jsSnippet = `
      const firebaseConfig = {
        apiKey: "AIzaSyTest123",
        authDomain: "juropet.firebaseapp.com",
        databaseURL: "https://juropet-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "juropet-12345",
        storageBucket: "juropet.appspot.com",
        messagingSenderId: "123456789",
        appId: "1:123456789:web:abcdef"
      };
    `;
    const parsed = parseFirebaseConfigSnippet(jsSnippet);
    expect(parsed).not.toBeNull();
    expect(parsed?.apiKey).toBe("AIzaSyTest123");
    expect(parsed?.projectId).toBe("juropet-12345");
    expect(parsed?.databaseURL).toBe(
      "https://juropet-default-rtdb.asia-southeast1.firebasedatabase.app"
    );
  });

  it("calculates single caregiver development trait based on care patterns", async () => {
    const store = useCaregiverStore.getState();
    store.setProfile("Dhavi", "Perawat Utama");

    // Initially with 0 care actions
    const initial = store.getCaregiverRelationship();
    expect(initial.caregiverCount).toBe(1);
    expect(initial.myCaregiverName).toBe("Dhavi");
    expect(initial.partnerCaregiverName).toBeUndefined();
    expect(initial.developmentTrait).toBe("Sahabat Sejati");

    // Feed 3 times
    await store.recordAction("feed", "Dhavi memberi Madu", { hunger: 20 }, "Madu");
    await store.recordAction("feed", "Dhavi memberi Jeruk", { hunger: 30 }, "Jeruk");
    await store.recordAction("feed", "Dhavi memberi Melon", { hunger: 40 }, "Melon");

    const gourmet = store.getCaregiverRelationship();
    expect(gourmet.developmentTrait).toBe("Gourmet Jeli");
    expect(gourmet.traitDescription).toContain("Dhavi");

    // Play 4 times -> now play is highest
    await store.recordAction("play", "Dhavi main bola", { happiness: 20 }, "Bola");
    await store.recordAction("play", "Dhavi main bola", { happiness: 20 }, "Bola");
    await store.recordAction("play", "Dhavi main gelembung", { happiness: 25 }, "Gelembung");
    await store.recordAction("play", "Dhavi main gelembung", { happiness: 25 }, "Gelembung");

    const acrobat = store.getCaregiverRelationship();
    expect(acrobat.developmentTrait).toBe("Akrobatik Ceria");
  });

  it("calculates dual caregiver synergy and reflects in Juro's brain prompt", () => {
    const store = useCaregiverStore.getState();
    store.setProfile("Dhavi", "Perawat 1");
    const myProfile = useCaregiverStore.getState().myProfile!;

    useCaregiverStore.setState({
      partnerProfile: {
        id: "partner_456",
        name: "Sahabat",
        roleTitle: "Perawat 2",
        joinedAt: Date.now(),
      },
      activityLogs: [
        {
          id: "log_1",
          timestamp: Date.now(),
          caregiverId: myProfile.id,
          caregiverName: "Dhavi",
          caregiverRoleTitle: "Perawat 1",
          actionType: "feed",
          description: "Dhavi suapin madu",
        },
        {
          id: "log_2",
          timestamp: Date.now() - 1000,
          caregiverId: "partner_456",
          caregiverName: "Sahabat",
          caregiverRoleTitle: "Perawat 2",
          actionType: "play",
          description: "Sahabat ajak main bola",
        },
      ],
    });

    const rel = useCaregiverStore.getState().getCaregiverRelationship();
    expect(rel.caregiverCount).toBe(2);
    expect(rel.myCaregiverName).toBe("Dhavi");
    expect(rel.partnerCaregiverName).toBe("Sahabat");
    expect(rel.developmentTrait).toBe("Harmoni Dua Sahabat");

    // Inject into Gemini system prompt
    const prompt = buildJuroSystemPrompt({
      name: "Juro",
      hunger: 80,
      energy: 70,
      happiness: 80,
      cleanliness: 80,
      affection: 80,
      currentState: "idle",
      caregiverRelationship: rel,
    });

    expect(prompt).toContain("KESADARAN & MEMORI 2 PERAWAT ASUH JURO");
    expect(prompt).toContain("Dhavi");
    expect(prompt).toContain("Sahabat");
    expect(prompt).toContain("Harmoni Dua Sahabat");
  });
});
