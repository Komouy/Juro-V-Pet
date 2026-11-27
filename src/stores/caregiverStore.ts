import { create } from "zustand";
import type {
  CaregiverProfile,
  CaregiverActionLog,
  SharedJuroState,
  CareActionType,
  CaregiverRelationshipInfo,
  PartnerPetState,
  SyncConnectionState,
} from "../types/caregiver";
import { juroSyncService } from "../services/firebase/juroSyncService";
import { usePetStore } from "./petStore";
import { useGameStore } from "./gameStore";
import { useUIStore } from "./uiStore";
import { usePartnerPetStore } from "./partnerPetStore";
import { useCareLogStore, computeCaregiverRelationship } from "./careLogStore";
import { soundEffects } from "../engine/audio/soundEffects";
import {
  addPetMemory,
  getPetMemories,
  syncAndMergeMemories,
  onPetMemoriesChanged,
} from "../services/petMemoryService";
import { notificationService } from "../services/notificationService";

const PROFILE_STORAGE_KEY = "juro_caregiver_profile";
const ROOM_STORAGE_KEY = "juro_caregiver_room";

const isSyncingFromRemote = false;

function getStoredProfile(): CaregiverProfile | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return null;
}

function getStoredRoomCode(): string | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
  return localStorage.getItem(ROOM_STORAGE_KEY);
}

interface CaregiverState {
  myProfile: CaregiverProfile | null;
  activeRoomCode: string | null;
  partnerProfile: CaregiverProfile | null;
  pairingStatus: "idle" | "loading" | "paired" | "error";
  connectionState: SyncConnectionState;
  errorMessage: string | null;
  activityLogs: CaregiverActionLog[];
  hasRegisteredName: boolean;
  isHubModalOpen: boolean;

  // Dual-Pet 2-Player State (mirrored with usePartnerPetStore)
  partnerPet: PartnerPetState | null;
  isPartnerPetPresent: boolean;

  // Actions
  openHubModal: () => void;
  closeHubModal: () => void;
  setProfile: (name: string, roleTitle?: string) => void;
  resetProfile: () => void;
  createRoom: () => Promise<{ ok: boolean; roomCode?: string; error?: string }>;
  joinRoom: (roomCode: string) => Promise<{ ok: boolean; error?: string }>;
  disconnectRoom: () => void;
  recordAction: (
    actionType: CareActionType,
    description: string,
    statChanges?: CaregiverActionLog["statChanges"],
    itemUsedName?: string
  ) => Promise<void>;
  getCaregiverRelationship: () => CaregiverRelationshipInfo;
  syncCurrentState: () => Promise<boolean>;
  syncMyPetToCloud: () => Promise<boolean>;
  setPartnerPet: (partnerPet: PartnerPetState | null) => void;
  initRealtimeSubscription: () => void;
}

export const useCaregiverStore = create<CaregiverState>((set, get) => {
  const initialProfile = getStoredProfile();
  const initialRoom = getStoredRoomCode();

  return {
    myProfile: initialProfile,
    activeRoomCode: initialRoom,
    partnerProfile: null,
    pairingStatus: initialRoom ? "paired" : "idle",
    connectionState: "disconnected",
    errorMessage: null,
    activityLogs: [],
    hasRegisteredName: initialProfile !== null && initialProfile.name.trim().length > 0,
    isHubModalOpen: false,
    partnerPet: null,
    isPartnerPetPresent: false,

    openHubModal: () => set({ isHubModalOpen: true }),
    closeHubModal: () => set({ isHubModalOpen: false }),

    setPartnerPet: (partnerPet: PartnerPetState | null) => {
      usePartnerPetStore.getState().setPartnerPet(partnerPet);
      set({ partnerPet, isPartnerPetPresent: partnerPet !== null });
    },

    setProfile: (name: string, roleTitle = "Perawat Juro") => {
      const cleanName = name.trim();
      if (!cleanName) return;

      const profile: CaregiverProfile = {
        id: get().myProfile?.id || `cg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: cleanName,
        roleTitle: roleTitle.trim() || "Perawat Juro",
        avatarColor: "#F97316",
        joinedAt: get().myProfile?.joinedAt || Date.now(),
      };

      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      set({ myProfile: profile, hasRegisteredName: true });
    },

    resetProfile: () => {
      if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = null;
      }
      juroSyncService.unsubscribe();
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(PROFILE_STORAGE_KEY);
        localStorage.removeItem(ROOM_STORAGE_KEY);
      }
      usePartnerPetStore.getState().clearPartnerPet();
      set({
        myProfile: null,
        activeRoomCode: null,
        partnerProfile: null,
        partnerPet: null,
        isPartnerPetPresent: false,
        pairingStatus: "idle",
        connectionState: "disconnected",
        errorMessage: null,
        activityLogs: [],
        hasRegisteredName: false,
      });
    },

    createRoom: async () => {
      const { myProfile } = get();
      if (!myProfile) {
        return { ok: false, error: "Isi nama perawat terlebih dahulu." };
      }

      set({ pairingStatus: "loading", errorMessage: null });

      const pet = usePetStore.getState();
      const game = useGameStore.getState();

      const initialJuro: SharedJuroState = {
        name: pet.name,
        level: pet.level,
        xp: pet.xp,
        xpToNextLevel: pet.xpToNextLevel,
        hunger: pet.hunger,
        energy: pet.energy,
        happiness: pet.happiness,
        cleanliness: pet.cleanliness,
        affection: pet.affection,
        currentState: pet.currentState,
        activeSkin: game.activeSkin,
        unlockedSkins: game.unlockedSkins,
        activeHat: game.activeHat,
        unlockedHats: game.unlockedHats,
        deepestFloor: game.deepestFloor,
        coins: game.coins,
        crystals: game.crystals,
        pickaxeLevel: game.pickaxeLevel,
        foodInventory: game.foodInventory,
        ownedToys: game.ownedToys,
        memories: getPetMemories(),
        lastUpdated: Date.now(),
      };

      const result = await juroSyncService.createPairingRoom(myProfile, initialJuro);

      if (result.ok && result.roomCode) {
        localStorage.setItem(ROOM_STORAGE_KEY, result.roomCode);
        set({
          activeRoomCode: result.roomCode,
          pairingStatus: "paired",
          errorMessage: null,
        });
        get().initRealtimeSubscription();
        return { ok: true, roomCode: result.roomCode };
      }

      set({ pairingStatus: "error", errorMessage: result.error || "Gagal membuat kamar." });
      return { ok: false, error: result.error };
    },

    joinRoom: async (roomCodeInput: string) => {
      const { myProfile } = get();
      if (!myProfile) {
        return { ok: false, error: "Isi nama perawat terlebih dahulu." };
      }

      set({ pairingStatus: "loading", errorMessage: null });
      const result = await juroSyncService.joinPairingRoom(roomCodeInput, myProfile);

      if (result.ok && result.roomData) {
        const room = result.roomData;
        localStorage.setItem(ROOM_STORAGE_KEY, room.roomCode);

        const partner =
          room.caregivers.caregiver1.id === myProfile.id
            ? room.caregivers.caregiver2 ?? null
            : room.caregivers.caregiver1;

        if (room.juro) {
          const roomJuro = room.juro;
          usePetStore.setState({
            name: roomJuro.name,
            level: roomJuro.level,
            xp: roomJuro.xp,
            xpToNextLevel: roomJuro.xpToNextLevel,
            hunger: roomJuro.hunger,
            energy: roomJuro.energy,
            happiness: roomJuro.happiness,
            cleanliness: roomJuro.cleanliness,
            affection: roomJuro.affection,
            currentState: (roomJuro.currentState as any) || "idle",
            lastUpdated: roomJuro.lastUpdated || Date.now(),
          });

          useGameStore.setState((prev) => ({
            activeSkin: roomJuro.activeSkin || prev.activeSkin,
            unlockedSkins: Array.from(
              new Set([...(prev.unlockedSkins || []), ...(roomJuro.unlockedSkins || [])])
            ),
            activeHat: roomJuro.activeHat !== undefined ? roomJuro.activeHat : prev.activeHat,
            unlockedHats: Array.from(
              new Set([...(prev.unlockedHats || []), ...(roomJuro.unlockedHats || [])])
            ),
            deepestFloor: Math.max(prev.deepestFloor ?? 1, roomJuro.deepestFloor ?? 1),
            coins: roomJuro.coins ?? prev.coins,
            crystals: roomJuro.crystals || prev.crystals,
            foodInventory: roomJuro.foodInventory || prev.foodInventory,
            ownedToys: Array.from(
              new Set([...(prev.ownedToys || []), ...(roomJuro.ownedToys || [])])
            ),
            pickaxeLevel: Math.max(prev.pickaxeLevel ?? 1, roomJuro.pickaxeLevel ?? 1),
          }));

          if (roomJuro.memories && Array.isArray(roomJuro.memories)) {
            syncAndMergeMemories(roomJuro.memories);
          }
        }

        const logs = room.activityLogs
          ? Object.values(room.activityLogs).sort((a, b) => b.timestamp - a.timestamp)
          : [];
        useCareLogStore.getState().setLogs(logs);

        set({
          activeRoomCode: room.roomCode,
          partnerProfile: partner,
          activityLogs: logs,
          pairingStatus: "paired",
          errorMessage: null,
        });

        get().initRealtimeSubscription();
        soundEffects.playSuccess();
        return { ok: true };
      }

      set({ pairingStatus: "error", errorMessage: result.error || "Gagal bergabung." });
      return { ok: false, error: result.error };
    },

    disconnectRoom: () => {
      if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = null;
      }
      juroSyncService.unsubscribe();
      localStorage.removeItem(ROOM_STORAGE_KEY);
      usePartnerPetStore.getState().clearPartnerPet();
      set({
        activeRoomCode: null,
        partnerProfile: null,
        partnerPet: null,
        isPartnerPetPresent: false,
        pairingStatus: "idle",
        connectionState: "disconnected",
        errorMessage: null,
      });
      soundEffects.playDismiss();
    },

    recordAction: async (actionType, description, statChanges, itemUsedName) => {
      const { myProfile, activeRoomCode } = get();
      if (!myProfile) return;

      const safeItemUsedName = itemUsedName ?? null;

      const logEntry: CaregiverActionLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        caregiverId: myProfile.id,
        caregiverName: myProfile.name,
        caregiverRoleTitle: myProfile.roleTitle,
        actionType,
        description,
        ...(safeItemUsedName ? { itemUsedName: safeItemUsedName } : {}),
        statChanges,
      };

      useCareLogStore.getState().prependLog(logEntry);
      set((state) => ({
        activityLogs: [logEntry, ...state.activityLogs].slice(0, 80),
      }));

      useGameStore
        .getState()
        .addLog(actionType === "shop" ? "interaction" : (actionType as any), description);

      if (activeRoomCode) {
        const pet = usePetStore.getState();
        const game = useGameStore.getState();

        await juroSyncService.pushCareAction(
          activeRoomCode,
          myProfile,
          {
            actionType,
            description,
            statChanges,
            ...(safeItemUsedName ? { itemUsedName: safeItemUsedName } : {}),
          },
          {
            name: pet.name,
            hunger: pet.hunger,
            energy: pet.energy,
            cleanliness: pet.cleanliness,
            happiness: pet.happiness,
            affection: pet.affection,
            level: pet.level,
            xp: pet.xp,
            xpToNextLevel: pet.xpToNextLevel,
            currentState: pet.currentState,
            activeSkin: game.activeSkin,
            activeHat: game.activeHat,
            memories: getPetMemories(),
          }
        );
      }
    },

    syncCurrentState: async () => {
      const { activeRoomCode, myProfile } = get();
      if (!activeRoomCode || !myProfile) return false;
      const pet = usePetStore.getState();
      const game = useGameStore.getState();
      return await juroSyncService.syncJuroState(activeRoomCode, myProfile.id, {
        hunger: pet.hunger,
        energy: pet.energy,
        cleanliness: pet.cleanliness,
        happiness: pet.happiness,
        affection: pet.affection,
        level: pet.level,
        xp: pet.xp,
        xpToNextLevel: pet.xpToNextLevel,
        currentState: pet.currentState,
        coins: game.coins,
        crystals: game.crystals,
        foodInventory: game.foodInventory,
        ownedToys: game.ownedToys,
        activeSkin: game.activeSkin,
        unlockedSkins: game.unlockedSkins,
        activeHat: game.activeHat,
        unlockedHats: game.unlockedHats,
        deepestFloor: game.deepestFloor,
        pickaxeLevel: game.pickaxeLevel,
        memories: getPetMemories(),
      });
    },

    syncMyPetToCloud: async () => {
      const { activeRoomCode, myProfile } = get();
      if (!activeRoomCode || !myProfile) return false;
      const pet = usePetStore.getState();
      const game = useGameStore.getState();

      const myPetState: PartnerPetState = {
        ownerCaregiverId: myProfile.id,
        ownerName: myProfile.name,
        ownerRoleTitle: myProfile.roleTitle,
        name: pet.name,
        level: pet.level,
        hunger: pet.hunger,
        energy: pet.energy,
        cleanliness: pet.cleanliness,
        happiness: pet.happiness,
        affection: pet.affection,
        currentState: pet.currentState,
        activeSkin: game.activeSkin,
        activeHat: game.activeHat,
        isOnline: true,
        lastUpdated: Date.now(),
      };

      return await juroSyncService.syncMyPet(activeRoomCode, myProfile.id, myPetState);
    },

    getCaregiverRelationship: (): CaregiverRelationshipInfo => {
      const { myProfile, partnerProfile, activityLogs } = get();
      return computeCaregiverRelationship(myProfile, partnerProfile, activityLogs);
    },

    initRealtimeSubscription: () => {
      const { activeRoomCode, myProfile } = get();
      if (!activeRoomCode || !myProfile) return;

      get().syncMyPetToCloud();

      juroSyncService.subscribeToRoom(activeRoomCode, myProfile.id, {
        onJuroStateSync: (incoming) => {
          if (incoming.memories && Array.isArray(incoming.memories)) {
            syncAndMergeMemories(incoming.memories);
          }
          if (incoming.updatedByCaregiverId && incoming.updatedByCaregiverId !== myProfile.id) {
            useGameStore.setState((prev) => ({
              unlockedSkins: Array.from(
                new Set([...(prev.unlockedSkins || []), ...(incoming.unlockedSkins || [])])
              ),
              unlockedHats: Array.from(
                new Set([...(prev.unlockedHats || []), ...(incoming.unlockedHats || [])])
              ),
              ownedToys: Array.from(
                new Set([...(prev.ownedToys || []), ...(incoming.ownedToys || [])])
              ),
              deepestFloor: Math.max(prev.deepestFloor ?? 1, incoming.deepestFloor ?? 1),
              pickaxeLevel: Math.max(prev.pickaxeLevel ?? 1, incoming.pickaxeLevel ?? 1),
            }));
          }
        },

        onPartnerStatusChange: (partner) => {
          const prevPartner = get().partnerProfile;
          set({ partnerProfile: partner });
          if (partner && (!prevPartner || prevPartner.id !== partner.id)) {
            addPetMemory(
              `Juro memiliki 2 perawat yang merawatnya bersama: ${get().myProfile?.name} dan ${partner.name}.`,
              "profile"
            );
          }
        },

        onConnectionStateChange: (connectionState) => {
          set({ connectionState });
        },

        onPartnerPetSync: (partnerPet) => {
          usePartnerPetStore.getState().setPartnerPet(partnerPet);
          set({
            partnerPet,
            isPartnerPetPresent: partnerPet !== null,
          });
        },

        onInitialLogsLoaded: (logs) => {
          useCareLogStore.getState().setLogs(logs);
          set({ activityLogs: logs });
        },

        onActivityLogAdded: (newLog) => {
          useCareLogStore.getState().prependLog(newLog);
          set((state) => {
            if (state.activityLogs.some((l) => l.id === newLog.id)) return state;
            return {
              activityLogs: [newLog, ...state.activityLogs].slice(0, 80),
            };
          });

          soundEffects.playPop();

          const myId = get().myProfile?.id;
          if (newLog.caregiverId !== myId) {
            useUIStore.getState().showToast(
              `${newLog.caregiverName}: ${newLog.description}`,
              "info"
            );
            notificationService.notifyPartnerAction(newLog.caregiverName, newLog.description);
          }
        },

        onRoomClosed: () => {
          get().disconnectRoom();
          useUIStore
            .getState()
            .showToast("Kamar pairing telah ditutup atau tidak ditemukan.", "warn");
        },

        onError: (err) => {
          console.warn("Koneksi kamar terputus:", err.message);
        },
      });
    },
  };
});

onPetMemoriesChanged(() => {
  if (isSyncingFromRemote) return;
  const store = useCaregiverStore.getState();
  if (store.activeRoomCode) {
    store.syncCurrentState();
  }
});

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function triggerDebouncedPetSync(): void {
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    const store = useCaregiverStore.getState();
    if (store.activeRoomCode) {
      store.syncMyPetToCloud();
    }
  }, 350);
}

usePetStore.subscribe((state, prevState) => {
  if (
    state.currentState !== prevState.currentState ||
    state.level !== prevState.level ||
    Math.abs(state.hunger - prevState.hunger) >= 2 ||
    Math.abs(state.energy - prevState.energy) >= 3 ||
    Math.abs(state.happiness - prevState.happiness) >= 3 ||
    Math.abs(state.cleanliness - prevState.cleanliness) >= 3 ||
    state.name !== prevState.name
  ) {
    triggerDebouncedPetSync();
  }
});

useGameStore.subscribe((state, prevState) => {
  if (state.activeHat !== prevState.activeHat || state.activeSkin !== prevState.activeSkin) {
    triggerDebouncedPetSync();
  }
});
