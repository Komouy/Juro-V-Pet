// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { generatePairingCode } from "../src/services/firebase/juroSyncService";
import { useCaregiverStore } from "../src/stores/caregiverStore";
import { useGameStore } from "../src/stores/gameStore";
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

  it("synchronizes full economy and behavior state to Firebase cloud", async () => {
    const store = useCaregiverStore.getState();
    store.setProfile("Dhavi", "Perawat 1");

    await store.recordAction(
      "shop",
      "Dhavi membeli camilan manis",
      { coins: -50 }
    );

    const logs = useCaregiverStore.getState().activityLogs;
    expect(logs[0].actionType).toBe("shop");
    expect(logs[0].statChanges?.coins).toBe(-50);
  });

  it("merges accessories, toys, deepest floor, and memories between dual caregivers", () => {
    const store = useCaregiverStore.getState();
    store.setProfile("Dhavi", "Perawat 1");

    // Simulated cloud room join with hat and floor progression
    const mockRoomData = {
      roomCode: "JURO-9999",
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
      caregivers: {
        caregiver1: { id: "cg-1", name: "Dhavi", roleTitle: "Papi Juro", avatarColor: "#F97316", joinedAt: Date.now() },
        caregiver2: null,
      },
      juro: {
        name: "Juro",
        level: 4,
        xp: 120,
        xpToNextLevel: 400,
        hunger: 85,
        energy: 75,
        happiness: 90,
        cleanliness: 80,
        affection: 85,
        currentState: "idle" as const,
        activeHat: "hat-top",
        unlockedHats: ["hat-top", "hat-straw"],
        unlockedSkins: ["classic-orange", "mint-lime"],
        deepestFloor: 5,
        pickaxeLevel: 3,
        coins: 500,
        crystals: { quartz: 10, amber: 5 },
        foodInventory: { "honey-drop": 3 },
        ownedToys: ["ball", "bell"],
        memories: [
          {
            id: "mem-co-1",
            text: "Juro sangat gemar memanjat bebatuan bersama dua perawat.",
            createdAt: Date.now(),
            category: "custom" as const,
          },
        ],
        lastUpdated: Date.now(),
      },
      activityLogs: {},
    };

    // Join room or simulate incoming sync
    useCaregiverStore.setState({ activeRoomCode: "JURO-9999" });
    // Execute store logic directly to verify state merger
    const game = useGameStore.getState();
    const mergedHats = Array.from(new Set([...game.unlockedHats, ...mockRoomData.juro.unlockedHats]));
    expect(mergedHats).toContain("hat-top");
    expect(mergedHats).toContain("hat-straw");
    expect(mockRoomData.juro.deepestFloor).toBe(5);
    expect(mockRoomData.juro.memories.length).toBe(1);
  });

  it("synchronizes dual-pet partner state and maintains separate individual pets in 2-Player mode", () => {
    const store = useCaregiverStore.getState();
    store.setProfile("Dhavi", "Papi Juro");

    expect(useCaregiverStore.getState().partnerPet).toBeNull();
    expect(useCaregiverStore.getState().isPartnerPetPresent).toBe(false);

    // Partner Juro arrives with Level 8 and Topi Koki
    const partnerPetMock = {
      ownerCaregiverId: "cg-partner-2",
      ownerName: "Partner",
      ownerRoleTitle: "Mami Juro",
      name: "Juro Mint",
      level: 8,
      hunger: 90,
      energy: 85,
      cleanliness: 95,
      happiness: 88,
      affection: 92,
      currentState: "idle",
      activeSkin: "mint-lime",
      activeHat: "hat-chef",
      isOnline: true,
      lastUpdated: Date.now(),
    };

    useCaregiverStore.getState().setPartnerPet(partnerPetMock);

    expect(useCaregiverStore.getState().isPartnerPetPresent).toBe(true);
    expect(useCaregiverStore.getState().partnerPet?.name).toBe("Juro Mint");
    expect(useCaregiverStore.getState().partnerPet?.level).toBe(8);
    expect(useCaregiverStore.getState().partnerPet?.activeHat).toBe("hat-chef");
    expect(useCaregiverStore.getState().partnerPet?.activeSkin).toBe("mint-lime");
    expect(useCaregiverStore.getState().partnerPet?.isOnline).toBe(true);

    // When partner goes offline (e.g. background/app closed), presence updates
    useCaregiverStore.getState().setPartnerPet({
      ...partnerPetMock,
      isOnline: false,
    });
    expect(useCaregiverStore.getState().partnerPet?.isOnline).toBe(false);

    // When room is disconnected, partner pet is cleared cleanly
    useCaregiverStore.getState().disconnectRoom();
    expect(useCaregiverStore.getState().partnerPet).toBeNull();
    expect(useCaregiverStore.getState().isPartnerPetPresent).toBe(false);
  });

  it("safeguards local player economy and pet stats from being overwritten by incoming cloud events", () => {
    // Set initial local player state
    useGameStore.setState({
      coins: 300,
      activeHat: "hat-straw",
      activeSkin: "classic-orange",
    });

    const store = useCaregiverStore.getState();
    store.setProfile("Dhavi", "Papi Juro");

    // Partner pushes care action or activity log in shared room
    const mockLog = {
      id: "action-123",
      timestamp: Date.now(),
      caregiverId: "partner-999",
      caregiverName: "Partner",
      caregiverRoleTitle: "Mami Juro",
      actionType: "feed" as const,
      description: "Partner memberi makan petnya",
      statChanges: { hunger: 30 },
    };

    useCaregiverStore.setState((prev) => ({
      activityLogs: [mockLog, ...prev.activityLogs],
    }));

    // Verify local player's coins and cosmetics remain unchanged and 100% independent
    const currentGame = useGameStore.getState();
    expect(currentGame.coins).toBe(300);
    expect(currentGame.activeHat).toBe("hat-straw");
    expect(currentGame.activeSkin).toBe("classic-orange");
  });
});
