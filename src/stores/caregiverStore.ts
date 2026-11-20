import { create } from "zustand";
import type {
  CaregiverProfile,
  CaregiverActionLog,
  SharedJuroState,
  CareActionType,
  CaregiverRelationshipInfo,
} from "../types/caregiver";
import { juroSyncService } from "../services/firebase/juroSyncService";
import { usePetStore } from "./petStore";
import { useGameStore } from "./gameStore";
import { soundEffects } from "../engine/audio/soundEffects";
import { addPetMemory } from "../services/petMemoryService";

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
  isHubModalOpen: boolean;

  // Actions
  openHubModal: () => void;
  closeHubModal: () => void;
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
  getCaregiverRelationship: () => CaregiverRelationshipInfo;
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
    isHubModalOpen: false,

    openHubModal: () => set({ isHubModalOpen: true }),
    closeHubModal: () => set({ isHubModalOpen: false }),

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

    getCaregiverRelationship: (): CaregiverRelationshipInfo => {
      const { myProfile, partnerProfile, activityLogs } = get();
      const myName = myProfile?.name || "Perawat Juro";
      const partnerName = partnerProfile?.name;
      const isDual = !!partnerName;
      const caregiverCount: 1 | 2 = isDual ? 2 : 1;

      const myActions = activityLogs.filter((l) => l.caregiverId === myProfile?.id);
      const partnerActions = partnerProfile
        ? activityLogs.filter((l) => l.caregiverId === partnerProfile.id)
        : [];

      const totalMy = myActions.length;
      const totalPartner = partnerActions.length;

      let feedCount = 0;
      let playCount = 0;
      let bathCount = 0;
      let petCount = 0;

      for (const log of activityLogs) {
        if (log.actionType === "feed") feedCount++;
        else if (log.actionType === "play") playCount++;
        else if (log.actionType === "bath") bathCount++;
        else if (log.actionType === "pet") petCount++;
      }

      let developmentTrait = "Sahabat Sejati";
      let traitDescription = `Juro tumbuh bahagia dan setia bersama ${myName}.`;

      if (isDual) {
        if (totalMy > 0 && totalPartner > 0) {
          if (Math.abs(totalMy - totalPartner) <= 3) {
            developmentTrait = "Harmoni Dua Sahabat";
            traitDescription = `Juro berkembang sangat seimbang dan penuh kasih karena ${myName} dan ${partnerName} merawatnya secara kompak.`;
          } else {
            const moreActive = totalMy > totalPartner ? myName : partnerName;
            developmentTrait = "Dua Bintang Penjaga";
            traitDescription = `Juro sangat bersyukur dijaga oleh dua perawat, dengan ${moreActive} yang saat ini paling aktif menemani.`;
          }
        } else {
          developmentTrait = "Kemitraan Hangat";
          traitDescription = `Juro menyadari ia memiliki dua perawat (${myName} dan ${partnerName}) dan selalu menantikan momen bersama keduanya.`;
        }
      } else {
        const totalCare = feedCount + playCount + bathCount + petCount;
        if (totalCare >= 2) {
          if (feedCount >= playCount && feedCount >= bathCount && feedCount >= petCount) {
            developmentTrait = "Gourmet Jeli";
            traitDescription = `Juro tumbuh lahap dan gembul, sangat menantikan suapan camilan lezat dari ${myName}.`;
          } else if (playCount >= feedCount && playCount >= bathCount && playCount >= petCount) {
            developmentTrait = "Akrobatik Ceria";
            traitDescription = `Juro tumbuh sangat lincah dan berenergi tinggi karena sering diajak bermain oleh ${myName}.`;
          } else if (petCount >= feedCount && petCount >= playCount && petCount >= bathCount) {
            developmentTrait = "Manja Penuh Kasih";
            traitDescription = `Juro tumbuh sangat lekat dan hangat, selalu mendambakan elusan lembut dari ${myName}.`;
          } else if (bathCount >= feedCount && bathCount >= playCount && bathCount >= petCount) {
            developmentTrait = "Pusaka Berkilau";
            traitDescription = `Juro tumbuh bersih bercahaya dan selalu segar berkat ketelatenan ${myName}.`;
          }
        }
      }

      const recent = activityLogs
        .slice(0, 3)
        .map((l) => `${l.caregiverName} (${l.actionType})`)
        .join(", ");
      const recentSummary = recent.length > 0 ? recent : "Belum ada catatan asuhan";

      return {
        caregiverCount,
        myCaregiverName: myName,
        partnerCaregiverName: partnerName,
        totalMyActions: totalMy,
        totalPartnerActions: totalPartner,
        developmentTrait,
        traitDescription,
        recentSummary,
      };
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
          const prevPartner = get().partnerProfile;
          set({ partnerProfile: partner });
          if (partner && (!prevPartner || prevPartner.id !== partner.id)) {
            addPetMemory(
              `Juro memiliki 2 perawat yang merawatnya bersama: ${get().myProfile?.name} dan ${partner.name}.`,
              "profile"
            );
          }
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
