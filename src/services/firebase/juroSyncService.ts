import {
  ref,
  set,
  get,
  update,
  push,
  onValue,
  off,
  onDisconnect,
  type DataSnapshot,
} from "firebase/database";
import { getFirebaseDatabaseInstance, isFirebaseConfigured } from "./firebaseConfig";
import type {
  CaregiverProfile,
  CaregiverActionLog,
  SharedJuroState,
  JuroPairingRoomData,
  PartnerPetState,
} from "../../types/caregiver";

/**
 * Menghasilkan kode pairing kamar 4-digit yang mudah dibaca (misal: JURO-5821)
 */
export function generatePairingCode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `JURO-${digits}`;
}

export interface SyncCallbacks {
  onJuroStateSync: (juroState: SharedJuroState) => void;
  onPartnerPetSync?: (partnerPet: PartnerPetState | null) => void;
  onActivityLogAdded?: (log: CaregiverActionLog) => void;
  onInitialLogsLoaded?: (logs: CaregiverActionLog[]) => void;
  onPartnerStatusChange?: (partner: CaregiverProfile | null) => void;
  onError?: (error: Error) => void;
}

/**
 * Service sinkronisasi realtime 1 Juro 2 Perawat via Firebase Realtime Database
 */
export class JuroRealtimeSyncService {
  private activeRoomListener: { path: string; callback: (snapshot: DataSnapshot) => void } | null = null;
  private activePresenceListener: {
    path: string;
    callback: (snapshot: DataSnapshot) => void;
    myPresencePath: string;
  } | null = null;

  /**
   * Mengecek apakah layanan sinkronisasi cloud siap dipakai
   */
  public isReady(): boolean {
    return isFirebaseConfigured();
  }

  /**
   * Membuat Kamar Pairing Baru (Perawat 1)
   */
  public async createPairingRoom(
    caregiver: CaregiverProfile,
    initialJuro: SharedJuroState
  ): Promise<{ ok: boolean; roomCode?: string; error?: string }> {
    const db = getFirebaseDatabaseInstance();
    if (!db) {
      return { ok: false, error: "Firebase Realtime Database belum terkonfigurasi." };
    }

    try {
      const roomCode = generatePairingCode();
      const roomRef = ref(db, `rooms/${roomCode}`);

      // Cek apakah kode kebetulan sudah terpakai
      const existing = await get(roomRef);
      if (existing.exists()) {
        // Coba ulang dengan kode baru jika tabrakan
        return this.createPairingRoom(caregiver, initialJuro);
      }

      const initialLogId = `log_init_${Date.now()}`;
      const initialLog: CaregiverActionLog = {
        id: initialLogId,
        timestamp: Date.now(),
        caregiverId: caregiver.id,
        caregiverName: caregiver.name,
        caregiverRoleTitle: caregiver.roleTitle,
        actionType: "interaction" as const,
        description: `${caregiver.name} (${caregiver.roleTitle}) membuat kamar asuh Juro! Kode pairing: ${roomCode}`,
      };

      const myInitialPet: PartnerPetState = {
        ownerCaregiverId: caregiver.id,
        ownerName: caregiver.name,
        ownerRoleTitle: caregiver.roleTitle,
        name: initialJuro.name,
        level: initialJuro.level,
        hunger: initialJuro.hunger,
        energy: initialJuro.energy,
        cleanliness: initialJuro.cleanliness,
        happiness: initialJuro.happiness,
        affection: initialJuro.affection,
        currentState: initialJuro.currentState,
        activeSkin: initialJuro.activeSkin,
        activeHat: initialJuro.activeHat,
        isOnline: true,
        lastUpdated: Date.now(),
      };

      const roomData: JuroPairingRoomData = {
        roomCode,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
        juro: {
          ...initialJuro,
          updatedByCaregiverId: caregiver.id,
        },
        caregivers: {
          caregiver1: caregiver,
          caregiver2: null,
        },
        pets: {
          [caregiver.id]: myInitialPet,
        },
        activityLogs: {
          [initialLogId]: initialLog,
        },
      };

      await set(roomRef, roomData);
      return { ok: true, roomCode };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal membuat kamar pairing Juro.";
      return { ok: false, error: msg };
    }
  }

  /**
   * Bergabung ke Kamar Pairing yang Sudah Ada (Perawat 2)
   */
  public async joinPairingRoom(
    roomCodeInput: string,
    caregiver: CaregiverProfile
  ): Promise<{ ok: boolean; roomData?: JuroPairingRoomData; error?: string }> {
    const db = getFirebaseDatabaseInstance();
    if (!db) {
      return { ok: false, error: "Firebase Realtime Database belum terkonfigurasi." };
    }

    const cleanCode = roomCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      return { ok: false, error: "Kode pairing tidak boleh kosong." };
    }

    try {
      const roomRef = ref(db, `rooms/${cleanCode}`);
      const snapshot = await get(roomRef);

      if (!snapshot.exists()) {
        return { ok: false, error: `Kamar pairing dengan kode "${cleanCode}" tidak ditemukan.` };
      }

      const room = snapshot.val() as JuroPairingRoomData;

      // Cek apakah slot perawat 2 sudah terisi oleh orang lain
      if (
        room.caregivers.caregiver2 &&
        room.caregivers.caregiver2.id !== caregiver.id &&
        room.caregivers.caregiver1.id !== caregiver.id
      ) {
        return {
          ok: false,
          error: "Kamar ini sudah memiliki 2 perawat lengkap. 1 Juro hanya dapat dirawat oleh 2 orang.",
        };
      }

      // Jika kita adalah perawat 2 yang baru bergabung
      if (room.caregivers.caregiver1.id !== caregiver.id) {
        const joinLogRef = push(ref(db, `rooms/${cleanCode}/activityLogs`));
        const joinLog: CaregiverActionLog = {
          id: joinLogRef.key || `log_${Date.now()}`,
          timestamp: Date.now(),
          caregiverId: caregiver.id,
          caregiverName: caregiver.name,
          caregiverRoleTitle: caregiver.roleTitle,
          actionType: "interaction",
          description: `${caregiver.name} (${caregiver.roleTitle}) resmi bergabung menjadi perawat kedua Juro!`,
        };

        const myInitialPet: PartnerPetState = {
          ownerCaregiverId: caregiver.id,
          ownerName: caregiver.name,
          ownerRoleTitle: caregiver.roleTitle,
          name: room.juro?.name || "Juro",
          level: room.juro?.level || 1,
          hunger: room.juro?.hunger || 80,
          energy: room.juro?.energy || 80,
          cleanliness: room.juro?.cleanliness || 80,
          happiness: room.juro?.happiness || 80,
          affection: room.juro?.affection || 50,
          currentState: "idle",
          activeSkin: "classic-orange",
          activeHat: "hat-none",
          isOnline: true,
          lastUpdated: Date.now(),
        };

        await update(ref(db, `rooms/${cleanCode}`), {
          "caregivers/caregiver2": caregiver,
          [`pets/${caregiver.id}`]: myInitialPet,
          lastUpdatedAt: Date.now(),
          [`activityLogs/${joinLog.id}`]: joinLog,
        });

        room.caregivers.caregiver2 = caregiver;
      }

      return { ok: true, roomData: room };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal bergabung ke kamar pairing.";
      return { ok: false, error: msg };
    }
  }

  /**
   * Mendengarkan Perubahan State & Log Secara Realtime (onValue)
   */
  public subscribeToRoom(
    roomCode: string,
    myCaregiverId: string,
    callbacks: SyncCallbacks
  ): () => void {
    const db = getFirebaseDatabaseInstance();
    if (!db) return () => {};

    const cleanCode = roomCode.trim().toUpperCase();
    const roomRef = ref(db, `rooms/${cleanCode}`);

    // Lepas listener sebelumnya jika ada
    this.unsubscribe();

    // 0. Setup Presensi Realtime (Online/Offline) via .info/connected & onDisconnect
    try {
      const connectedRef = ref(db, ".info/connected");
      const presencePath = `rooms/${cleanCode}/pets/${myCaregiverId}/isOnline`;
      const presenceRef = ref(db, presencePath);
      const disconnectRef = onDisconnect(presenceRef);
      disconnectRef.set(false).catch(() => {});

      const presenceListener = (snap: DataSnapshot) => {
        if (snap.val() === true) {
          disconnectRef.set(false).catch(() => {});
          set(presenceRef, true).catch(() => {});
        }
      };

      onValue(connectedRef, presenceListener);
      this.activePresenceListener = {
        path: ".info/connected",
        callback: presenceListener,
        myPresencePath: presencePath,
      };
    } catch {
      // Mock mode / offline fallback
    }

    let lastKnownLogsCount = 0;

    const listener = (snapshot: DataSnapshot) => {
      if (!snapshot.exists()) {
        callbacks.onError?.(new Error("Kamar pairing telah ditutup atau dihapus."));
        return;
      }

      const data = snapshot.val() as JuroPairingRoomData;

      // 1. Sync Juro State (memori atau snapshot umum)
      if (data.juro) {
        callbacks.onJuroStateSync(data.juro);
      }

      // 1b. Deteksi status Pet Pasangan di mode Dual-Pet
      if (data.pets) {
        const partnerEntry = Object.entries(data.pets).find(
          ([cgId]) => cgId !== myCaregiverId
        );
        if (partnerEntry) {
          callbacks.onPartnerPetSync?.(partnerEntry[1]);
        } else {
          callbacks.onPartnerPetSync?.(null);
        }
      } else if (data.juro && data.caregivers) {
        // Fallback backward-compatible: jika perawat pasangan ada tapi kamar masih format single pet
        const partner =
          data.caregivers.caregiver1.id === myCaregiverId
            ? data.caregivers.caregiver2 ?? null
            : data.caregivers.caregiver1 ?? null;
        if (partner) {
          callbacks.onPartnerPetSync?.({
            ownerCaregiverId: partner.id,
            ownerName: partner.name,
            ownerRoleTitle: partner.roleTitle,
            name: `${data.juro.name} (${partner.name})`,
            level: data.juro.level,
            hunger: data.juro.hunger,
            energy: data.juro.energy,
            cleanliness: data.juro.cleanliness,
            happiness: data.juro.happiness,
            affection: data.juro.affection,
            currentState: data.juro.currentState,
            activeSkin: data.juro.activeSkin,
            activeHat: data.juro.activeHat,
            isOnline: true,
            lastUpdated: data.juro.lastUpdated,
          });
        }
      }

      // 2. Deteksi status perawat pasangan
      const partner =
        data.caregivers.caregiver1.id === myCaregiverId
          ? data.caregivers.caregiver2 ?? null
          : data.caregivers.caregiver1 ?? null;
      callbacks.onPartnerStatusChange?.(partner);

      // 3. Deteksi log aksi baru dan pulihkan seluruh riwayat saat baru terhubung
      if (data.activityLogs) {
        const logsDesc = Object.values(data.activityLogs).sort(
          (a, b) => b.timestamp - a.timestamp
        );
        if (lastKnownLogsCount === 0) {
          // Pertama kali terhubung / setelah refresh browser: muat seluruh log
          callbacks.onInitialLogsLoaded?.(logsDesc.slice(0, 80));
          lastKnownLogsCount = logsDesc.length;
        } else if (logsDesc.length > lastKnownLogsCount) {
          const newestLog = logsDesc[0];
          // Jika aksi dilakukan oleh perawat pasangan, picu callback notifikasi
          if (newestLog && newestLog.caregiverId !== myCaregiverId) {
            callbacks.onActivityLogAdded?.(newestLog);
          }
          lastKnownLogsCount = logsDesc.length;
        }
      }
    };

    onValue(roomRef, listener, (err) => {
      console.warn("Realtime listener error:", err);
      callbacks.onError?.(err);
    });

    this.activeRoomListener = {
      path: `rooms/${cleanCode}`,
      callback: listener,
    };

    return () => this.unsubscribe();
  }

  /**
   * Mendorong aksi pengasuhan dan stat pet terbaru secara atomik ke Firebase
   */
  public async pushCareAction(
    roomCode: string,
    caregiver: CaregiverProfile,
    action: Omit<CaregiverActionLog, "id" | "timestamp" | "caregiverId" | "caregiverName" | "caregiverRoleTitle">,
    updatedJuro: Partial<SharedJuroState>
  ): Promise<boolean> {
    const db = getFirebaseDatabaseInstance();
    if (!db) return false;

    const cleanCode = roomCode.trim().toUpperCase();

    try {
      const logsRef = ref(db, `rooms/${cleanCode}/activityLogs`);
      const newLogRef = push(logsRef);
      const logId = newLogRef.key || `log_${Date.now()}`;

      const fullLog: CaregiverActionLog = {
        ...action,
        id: logId,
        timestamp: Date.now(),
        caregiverId: caregiver.id,
        caregiverName: caregiver.name,
        caregiverRoleTitle: caregiver.roleTitle,
      };

      const updates: Record<string, unknown> = {
        [`rooms/${cleanCode}/activityLogs/${logId}`]: fullLog,
        [`rooms/${cleanCode}/lastUpdatedAt`]: Date.now(),
      };

      // Di mode Dual-Pet, sinkronkan status pet pemilik aksi ke rooms/{roomCode}/pets/{caregiverId}
      const myPetUpdate: Record<string, unknown> = {
        ownerCaregiverId: caregiver.id,
        ownerName: caregiver.name,
        ownerRoleTitle: caregiver.roleTitle,
        lastUpdated: Date.now(),
        isOnline: true,
      };

      if (updatedJuro.name !== undefined) myPetUpdate.name = updatedJuro.name;
      if (updatedJuro.level !== undefined) myPetUpdate.level = updatedJuro.level;
      if (updatedJuro.hunger !== undefined) myPetUpdate.hunger = updatedJuro.hunger;
      if (updatedJuro.energy !== undefined) myPetUpdate.energy = updatedJuro.energy;
      if (updatedJuro.cleanliness !== undefined) myPetUpdate.cleanliness = updatedJuro.cleanliness;
      if (updatedJuro.happiness !== undefined) myPetUpdate.happiness = updatedJuro.happiness;
      if (updatedJuro.affection !== undefined) myPetUpdate.affection = updatedJuro.affection;
      if (updatedJuro.currentState !== undefined) myPetUpdate.currentState = updatedJuro.currentState;
      if (updatedJuro.activeSkin !== undefined) myPetUpdate.activeSkin = updatedJuro.activeSkin;
      if (updatedJuro.activeHat !== undefined) myPetUpdate.activeHat = updatedJuro.activeHat;

      for (const [key, val] of Object.entries(myPetUpdate)) {
        updates[`rooms/${cleanCode}/pets/${caregiver.id}/${key}`] = val;
      }

      // Simpan memori bersama jika ada
      if (updatedJuro.memories) {
        updates[`rooms/${cleanCode}/juro/memories`] = updatedJuro.memories;
      }

      await update(ref(db), updates);
      return true;
    } catch (err) {
      console.error("Gagal mengirim aksi pengasuhan ke Firebase:", err);
      return false;
    }
  }

  /**
   * Menyinkronkan perubahan status Juro secara langsung ke Firebase tanpa menambah log baru
   */
  public async syncJuroState(
    roomCode: string,
    caregiverId: string,
    updatedJuro: Partial<SharedJuroState>
  ): Promise<boolean> {
    const db = getFirebaseDatabaseInstance();
    if (!db) return false;

    const cleanCode = roomCode.trim().toUpperCase();

    try {
      const updates: Record<string, unknown> = {
        [`rooms/${cleanCode}/lastUpdatedAt`]: Date.now(),
      };

      for (const [key, val] of Object.entries(updatedJuro)) {
        updates[`rooms/${cleanCode}/juro/${key}`] = val;
      }
      updates[`rooms/${cleanCode}/juro/updatedByCaregiverId`] = caregiverId;
      updates[`rooms/${cleanCode}/juro/lastUpdated`] = Date.now();

      await update(ref(db), updates);
      return true;
    } catch (err) {
      console.error("Gagal menyinkronkan status Juro ke Firebase:", err);
      return false;
    }
  }

  /**
   * Menyinkronkan status Pet Pribadi ke kamar Firebase (Mode Dual-Pet)
   */
  public async syncMyPet(
    roomCode: string,
    caregiverId: string,
    petState: PartnerPetState
  ): Promise<boolean> {
    const db = getFirebaseDatabaseInstance();
    if (!db) return false;
    const cleanCode = roomCode.trim().toUpperCase();

    try {
      const updates: Record<string, unknown> = {
        [`rooms/${cleanCode}/lastUpdatedAt`]: Date.now(),
        [`rooms/${cleanCode}/pets/${caregiverId}`]: petState,
      };
      await update(ref(db), updates);
      return true;
    } catch (err) {
      console.error("Gagal menyinkronkan status pet saya ke Firebase:", err);
      return false;
    }
  }

  /**
   * Melepas listener realtime yang sedang aktif dan memperbarui status offline
   */
  public unsubscribe(): void {
    const db = getFirebaseDatabaseInstance();

    if (this.activePresenceListener && db) {
      try {
        const connectedRef = ref(db, this.activePresenceListener.path);
        off(connectedRef, "value", this.activePresenceListener.callback);
        const presenceRef = ref(db, this.activePresenceListener.myPresencePath);
        set(presenceRef, false).catch(() => {});
      } catch {
        // Abaikan
      }
      this.activePresenceListener = null;
    }

    if (this.activeRoomListener && db) {
      try {
        const roomRef = ref(db, this.activeRoomListener.path);
        off(roomRef, "value", this.activeRoomListener.callback);
      } catch {
        // Abaikan
      }
      this.activeRoomListener = null;
    }
  }
}

export const juroSyncService = new JuroRealtimeSyncService();
