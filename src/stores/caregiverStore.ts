import { create } from "zustand";
import type {
  CaregiverProfile,
  CaregiverActionLog,
  SharedJuroState,
  CareActionType,
} from "../types/caregiver";
import { juroSyncService } from "../services/firebase/juroSyncService";
import { usePetStore } from "./petStore";
import { useGameStore } from "./gameStore";
import { soundEffects } from "../engine/audio/soundEffects";

const PROFILE_STORAGE_KEY = "juro_caregiver_profile";
const ROOM_STORAGE_KEY = "juro_caregiver_room";

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
  errorMessage: string | null;
  activityLogs: CaregiverActionLog[];
  hasRegisteredName: boolean;

  // Actions
  setProfile: (name: string, roleTitle?: string) => void;
  createRoom: () => Promise<{ ok: boolean; roomCode?: string; error?: string }>;
  joinRoom: (roomCode: string) => Promise<{ ok: boolean; error?: string }>;
  disconnectRoom: () => void;
  recordAction: (
    actionType: CareActionType,
    description: string,
    statChanges?: CaregiverActionLog["statChanges"],
    itemUsedName?: string
  ) => Promise<void>;
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
    errorMessage: null,
    activityLogs: [],
    hasRegisteredName: initialProfile !== null && initialProfile.name.trim().length > 0,

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
        coins: game.coins,
        crystals: game.crystals,
        foodInventory: game.foodInventory,
        ownedToys: game.ownedToys,
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

        // Hubungkan listener realtime
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

        // Ambil data perawat pasangan
        const partner =
          room.caregivers.caregiver1.id === myProfile.id
            ? room.caregivers.caregiver2 ?? null
            : room.caregivers.caregiver1;

        // Sync data Juro dari kamar ke store lokal
        if (room.juro) {
          usePetStore.setState({
            name: room.juro.name,
            level: room.juro.level,
            xp: room.juro.xp,
            xpToNextLevel: room.juro.xpToNextLevel,
            hunger: room.juro.hunger,
            energy: room.juro.energy,
            happiness: room.juro.happiness,
            cleanliness: room.juro.cleanliness,
            affection: room.juro.affection,
          });

          useGameStore.setState({
            activeSkin: room.juro.activeSkin || "skin_default",
            coins: room.juro.coins ?? 100,
            crystals: room.juro.crystals,
            foodInventory: room.juro.foodInventory,
            ownedToys: room.juro.ownedToys,
          });
        }

        const logs = room.activityLogs ? Object.values(room.activityLogs) : [];

        set({
          activeRoomCode: room.roomCode,
          partnerProfile: partner,
          activityLogs: logs.sort((a, b) => b.timestamp - a.timestamp),
          pairingStatus: "paired",
          errorMessage: null,
        });

        // Hubungkan listener realtime
        get().initRealtimeSubscription();
        soundEffects.playSuccess();
        return { ok: true };
      }

      set({ pairingStatus: "error", errorMessage: result.error || "Gagal bergabung." });
      return { ok: false, error: result.error };
    },

    disconnectRoom: () => {
      juroSyncService.unsubscribe();
      localStorage.removeItem(ROOM_STORAGE_KEY);
      set({
        activeRoomCode: null,
        partnerProfile: null,
        pairingStatus: "idle",
        errorMessage: null,
      });
      soundEffects.playDismiss();
    },

    recordAction: async (actionType, description, statChanges, itemUsedName) => {
      const { myProfile, activeRoomCode } = get();
      if (!myProfile) return;

      const logEntry: CaregiverActionLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        caregiverId: myProfile.id,
        caregiverName: myProfile.name,
        caregiverRoleTitle: myProfile.roleTitle,
        actionType,
        description,
        itemUsedName,
        statChanges,
      };

      // Tambahkan ke log lokal
      set((state) => ({
        activityLogs: [logEntry, ...state.activityLogs].slice(0, 80),
      }));

      // Tambahkan juga ke log umum gameStore
      useGameStore.getState().addLog(actionType === "shop" ? "interaction" : (actionType as any), description);

      // Jika terhubung ke kamar Firebase, kirim ke cloud
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
            itemUsedName,
          },
          {
            hunger: pet.hunger,
            energy: pet.energy,
            cleanliness: pet.cleanliness,
            happiness: pet.happiness,
            affection: pet.affection,
            level: pet.level,
            xp: pet.xp,
            coins: game.coins,
            foodInventory: game.foodInventory,
            ownedToys: game.ownedToys,
            activeSkin: game.activeSkin,
          }
        );
      }
    },

    initRealtimeSubscription: () => {
      const { activeRoomCode, myProfile } = get();
      if (!activeRoomCode || !myProfile) return;

      juroSyncService.subscribeToRoom(activeRoomCode, myProfile.id, {
        onJuroStateSync: (incoming) => {
          // Hanya sync jika update berasal dari perawat lain
          if (incoming.updatedByCaregiverId && incoming.updatedByCaregiverId !== myProfile.id) {
            usePetStore.setState({
              hunger: incoming.hunger,
              energy: incoming.energy,
              cleanliness: incoming.cleanliness,
              happiness: incoming.happiness,
              affection: incoming.affection,
              level: incoming.level,
              xp: incoming.xp,
            });

            useGameStore.setState({
              coins: incoming.coins,
              activeSkin: incoming.activeSkin,
              foodInventory: incoming.foodInventory,
              ownedToys: incoming.ownedToys,
            });
          }
        },

        onPartnerStatusChange: (partner) => {
          set({ partnerProfile: partner });
        },

        onActivityLogAdded: (newLog) => {
          set((state) => {
            const alreadyExists = state.activityLogs.some((l) => l.id === newLog.id);
            if (alreadyExists) return state;
            return {
              activityLogs: [newLog, ...state.activityLogs].slice(0, 80),
            };
          });

          // Mainkan suara riak gembira saat ada aksi dari pasangan
          soundEffects.playPop();
        },

        onError: (err) => {
          console.warn("Koneksi kamar terputus:", err.message);
        },
      });
    },
  };
});
