import {
  ref,
  set,
  get,
  update,
  push,
  onValue,
  off,
  onDisconnect,
  query,
  limitToLast,
  serverTimestamp,
  type DataSnapshot,
  type Query,
} from "firebase/database";
import { getFirebaseDatabaseInstance, isFirebaseConfigured } from "./firebaseConfig";
import type {
  CaregiverProfile,
  CaregiverActionLog,
  SharedJuroState,
  JuroPairingRoomData,
  PartnerPetState,
} from "../../types/caregiver";
import type {
  IRoomSyncPort,
  PartnerMovementPayload,
  RoomSyncCallbacks,
} from "../../ports/roomSyncPort";
import { ActivityLogDeduplicator } from "../../features/multiplayer/SyncCoordinator";

export type SyncCallbacks = RoomSyncCallbacks;

/**
 * Menghapus rekursif seluruh properti bernilai `undefined` agar aman dikirim ke Firebase Realtime Database
 */
export function sanitizeForFirebase<T>(data: T): T {
  if (data === null || data === undefined) return null as unknown as T;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirebase(item)) as unknown as T;
  }
  if (typeof data === "object") {
    const clean: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      if (val !== undefined) {
        clean[key] = sanitizeForFirebase(val);
      }
    }
    return clean as unknown as T;
  }
  return data;
}

/**
 * Menghasilkan kode pairing kamar 4-digit yang mudah dibaca (misal: JURO-5821)
 */
export function generatePairingCode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `JURO-${digits}`;
}

/**
 * Membersihkan kode pairing agar hanya berisi karakter aman untuk path Firebase RTDB.
 */
export function sanitizeRoomCode(roomCodeInput: string): string {
  return roomCodeInput.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

const MAX_CREATE_RETRIES = 6;

interface SubscribedQueryHandle {
  target: Query;
  callback: (snapshot: DataSnapshot) => void;
}

/**
 * Adapter Firebase Realtime Database untuk sinkronisasi 1-2 perawat & mode Mabar.
 * Menggunakan listener sub-path terpisah, limitToLast log, deduplikasi berbasis ID,
 * update parsial untuk posisi pet, serta pemulihan koneksi otomatis saat tab aktif kembali.
 */
export class JuroRealtimeSyncService implements IRoomSyncPort {
  private subListeners: SubscribedQueryHandle[] = [];
  private activePresenceListener: {
    path: string;
    callback: (snapshot: DataSnapshot) => void;
    myPresencePath: string;
  } | null = null;
  private lifecycleCleanup: (() => void) | null = null;
  private onConnectionStateChangeCb: ((state: "disconnected") => void) | null = null;
  private logDeduplicator = new ActivityLogDeduplicator(250);

  public isReady(): boolean {
    return isFirebaseConfigured();
  }

  public async createPairingRoom(
    caregiver: CaregiverProfile,
    initialJuro: SharedJuroState,
    attempt = 0
  ): Promise<{ ok: boolean; roomCode?: string; error?: string }> {
    const db = getFirebaseDatabaseInstance();
    if (!db) {
      return { ok: false, error: "Firebase Realtime Database belum terkonfigurasi." };
    }
    if (attempt >= MAX_CREATE_RETRIES) {
      return { ok: false, error: "Gagal menghasilkan kode kamar unik. Silakan coba lagi." };
    }

    try {
      const roomCode = generatePairingCode();
      const roomRef = ref(db, `rooms/${roomCode}`);

      const existing = await get(roomRef);
      if (existing.exists()) {
        return this.createPairingRoom(caregiver, initialJuro, attempt + 1);
      }

      const initialLogId = `log_init_${Date.now()}`;
      const initialLog: CaregiverActionLog = {
        id: initialLogId,
        timestamp: Date.now(),
        caregiverId: caregiver.id,
        caregiverName: caregiver.name,
        caregiverRoleTitle: caregiver.roleTitle,
        actionType: "interaction",
        description: `${caregiver.name} (${caregiver.roleTitle}) membuat kamar Juro! Kode pairing: ${roomCode}`,
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

      await set(roomRef, sanitizeForFirebase(roomData));
      return { ok: true, roomCode };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal membuat kamar pairing Juro.";
      return { ok: false, error: msg };
    }
  }

  public async joinPairingRoom(
    roomCodeInput: string,
    caregiver: CaregiverProfile
  ): Promise<{ ok: boolean; roomData?: JuroPairingRoomData; error?: string }> {
    const db = getFirebaseDatabaseInstance();
    if (!db) {
      return { ok: false, error: "Firebase Realtime Database belum terkonfigurasi." };
    }

    const cleanCode = sanitizeRoomCode(roomCodeInput);
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
      const isAlreadyCaregiver1 = room.caregivers.caregiver1?.id === caregiver.id;
      const isAlreadyCaregiver2 = room.caregivers.caregiver2?.id === caregiver.id;

      if (room.caregivers.caregiver2 && !isAlreadyCaregiver1 && !isAlreadyCaregiver2) {
        return {
          ok: false,
          error: "Kamar ini sudah memiliki 2 perawat lengkap. 1 Juro hanya dapat dirawat oleh 2 orang.",
        };
      }

      if (!isAlreadyCaregiver1 && !isAlreadyCaregiver2) {
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

        await update(
          ref(db, `rooms/${cleanCode}`),
          sanitizeForFirebase({
            "caregivers/caregiver2": caregiver,
            [`pets/${caregiver.id}`]: myInitialPet,
            lastUpdatedAt: serverTimestamp(),
            [`activityLogs/${joinLog.id}`]: joinLog,
          })
        );

        room.caregivers.caregiver2 = caregiver;
      }

      return { ok: true, roomData: room };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal bergabung ke kamar pairing.";
      return { ok: false, error: msg };
    }
  }

  /**
   * Mendengarkan perubahan sub-path kamar secara ringan dan terpisah:
   * juro, caregivers, pets, dan 60 activityLogs terbaru.
   */
  public subscribeToRoom(
    roomCode: string,
    myCaregiverId: string,
    callbacks: RoomSyncCallbacks
  ): () => void {
    const db = getFirebaseDatabaseInstance();
    if (!db) return () => {};

    const cleanCode = sanitizeRoomCode(roomCode);
    if (!cleanCode) return () => {};
    this.unsubscribe();
    this.logDeduplicator.reset();
    this.onConnectionStateChangeCb = (state) => callbacks.onConnectionStateChange?.(state);
    callbacks.onConnectionStateChange?.("connecting");

    const presencePath = `rooms/${cleanCode}/pets/${myCaregiverId}/isOnline`;
    const presenceRef = ref(db, presencePath);

    const markPresenceOnline = () => {
      try {
        onDisconnect(presenceRef).set(false).catch(() => {});
        set(presenceRef, true).catch(() => {});
      } catch {
        // Ignored in offline fallback
      }
    };

    try {
      const connectedRef = ref(db, ".info/connected");
      const presenceListener = (snap: DataSnapshot) => {
        if (snap.val() === true) {
          markPresenceOnline();
          callbacks.onConnectionStateChange?.("connected");
        } else {
          callbacks.onConnectionStateChange?.("reconnecting");
        }
      };

      onValue(connectedRef, presenceListener);
      this.activePresenceListener = {
        path: ".info/connected",
        callback: presenceListener,
        myPresencePath: presencePath,
      };
    } catch {
      // Offline / mock fallback
    }

    if (typeof window !== "undefined" && typeof document !== "undefined") {
      const onVisibilityOrOnline = () => {
        if (document.visibilityState === "visible" && navigator.onLine !== false) {
          markPresenceOnline();
        }
      };
      document.addEventListener("visibilitychange", onVisibilityOrOnline);
      window.addEventListener("online", onVisibilityOrOnline);
      this.lifecycleCleanup = () => {
        document.removeEventListener("visibilitychange", onVisibilityOrOnline);
        window.removeEventListener("online", onVisibilityOrOnline);
      };
    }

    const onError = (err: Error) => {
      console.warn("Realtime sub-listener error:", err);
      callbacks.onConnectionStateChange?.("reconnecting");
      callbacks.onError?.(err);
    };

    // 1. Sub-listener: Shared Juro State
    const juroRef = ref(db, `rooms/${cleanCode}/juro`);
    const juroCb = (snap: DataSnapshot) => {
      if (!snap.exists()) return;
      const juroVal = snap.val() as SharedJuroState;
      callbacks.onJuroStateSync(juroVal);
    };
    onValue(juroRef, juroCb, onError);
    this.subListeners.push({ target: juroRef, callback: juroCb });

    // 2. Sub-listener: Caregivers Roster
    const caregiversRef = ref(db, `rooms/${cleanCode}/caregivers`);
    const caregiversCb = (snap: DataSnapshot) => {
      if (!snap.exists()) {
        callbacks.onRoomClosed?.();
        callbacks.onError?.(new Error("Kamar pairing telah ditutup atau dihapus."));
        return;
      }
      const cg = snap.val() as JuroPairingRoomData["caregivers"];
      const partner =
        cg.caregiver1?.id === myCaregiverId ? cg.caregiver2 ?? null : cg.caregiver1 ?? null;
      callbacks.onPartnerStatusChange?.(partner);
    };
    onValue(caregiversRef, caregiversCb, onError);
    this.subListeners.push({ target: caregiversRef, callback: caregiversCb });

    // 3. Sub-listener: Dual-Pet Realtime States & Coordinates
    const petsRef = ref(db, `rooms/${cleanCode}/pets`);
    const petsCb = (snap: DataSnapshot) => {
      if (!snap.exists()) {
        callbacks.onPartnerPetSync?.(null);
        return;
      }
      const petsMap = snap.val() as Record<string, PartnerPetState>;
      const partnerEntry = Object.entries(petsMap).find(([cgId]) => cgId !== myCaregiverId);
      callbacks.onPartnerPetSync?.(partnerEntry ? partnerEntry[1] : null);
    };
    onValue(petsRef, petsCb, onError);
    this.subListeners.push({ target: petsRef, callback: petsCb });

    // 4. Sub-listener: Recent Activity Logs (capped at last 60 + ID deduplication)
    const logsQuery = query(ref(db, `rooms/${cleanCode}/activityLogs`), limitToLast(60));
    let initialBatchDone = false;
    const logsCb = (snap: DataSnapshot) => {
      if (!snap.exists()) {
        if (!initialBatchDone) {
          callbacks.onInitialLogsLoaded?.([]);
          initialBatchDone = true;
        }
        return;
      }

      const rawMap = snap.val() as Record<string, CaregiverActionLog>;
      const logsAsc = Object.values(rawMap).sort((a, b) => a.timestamp - b.timestamp);

      if (!initialBatchDone) {
        this.logDeduplicator.seed(logsAsc.map((l) => l.id));
        callbacks.onInitialLogsLoaded?.([...logsAsc].reverse());
        initialBatchDone = true;
        return;
      }

      for (const log of logsAsc) {
        if (log && this.logDeduplicator.isNewAndTrack(log.id) && log.caregiverId !== myCaregiverId) {
          callbacks.onActivityLogAdded?.(log);
        }
      }
    };
    onValue(logsQuery, logsCb, onError);
    this.subListeners.push({ target: logsQuery, callback: logsCb });

    return () => this.unsubscribe();
  }

  public async pushCareAction(
    roomCode: string,
    caregiver: CaregiverProfile,
    action: Omit<
      CaregiverActionLog,
      "id" | "timestamp" | "caregiverId" | "caregiverName" | "caregiverRoleTitle"
    >,
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
      this.logDeduplicator.isNewAndTrack(logId);

      const updates: Record<string, unknown> = {
        [`rooms/${cleanCode}/activityLogs/${logId}`]: fullLog,
        [`rooms/${cleanCode}/lastUpdatedAt`]: serverTimestamp(),
      };

      const myPetPrefix = `rooms/${cleanCode}/pets/${caregiver.id}`;
      updates[`${myPetPrefix}/ownerCaregiverId`] = caregiver.id;
      updates[`${myPetPrefix}/ownerName`] = caregiver.name;
      updates[`${myPetPrefix}/ownerRoleTitle`] = caregiver.roleTitle;
      updates[`${myPetPrefix}/lastUpdated`] = serverTimestamp();
      updates[`${myPetPrefix}/isOnline`] = true;

      const syncedPetFields: Array<keyof PartnerPetState> = [
        "name",
        "level",
        "hunger",
        "energy",
        "cleanliness",
        "happiness",
        "affection",
        "currentState",
        "activeSkin",
        "activeHat",
      ];
      for (const field of syncedPetFields) {
        const val = updatedJuro[field as keyof SharedJuroState];
        if (val !== undefined) {
          updates[`${myPetPrefix}/${field}`] = val;
        }
      }

      if (updatedJuro.memories) {
        updates[`rooms/${cleanCode}/juro/memories`] = updatedJuro.memories;
      }

      const sharedJuroFields: Array<keyof SharedJuroState> = [
        "name",
        "level",
        "xp",
        "xpToNextLevel",
        "hunger",
        "energy",
        "cleanliness",
        "happiness",
        "affection",
        "currentState",
      ];
      for (const field of sharedJuroFields) {
        const val = updatedJuro[field];
        if (val !== undefined) {
          updates[`rooms/${cleanCode}/juro/${field}`] = val;
        }
      }
      updates[`rooms/${cleanCode}/juro/updatedByCaregiverId`] = caregiver.id;
      updates[`rooms/${cleanCode}/juro/lastUpdated`] = serverTimestamp();

      await update(ref(db), sanitizeForFirebase(updates));
      return true;
    } catch (err) {
      console.error("Gagal mengirim aksi pengasuhan ke Firebase:", err);
      return false;
    }
  }

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
        [`rooms/${cleanCode}/lastUpdatedAt`]: serverTimestamp(),
      };

      for (const [key, val] of Object.entries(updatedJuro)) {
        if (val !== undefined) {
          updates[`rooms/${cleanCode}/juro/${key}`] = val;
        }
      }
      updates[`rooms/${cleanCode}/juro/updatedByCaregiverId`] = caregiverId;
      updates[`rooms/${cleanCode}/juro/lastUpdated`] = serverTimestamp();

      await update(ref(db), sanitizeForFirebase(updates));
      return true;
    } catch (err) {
      console.error("Gagal menyinkronkan status Juro ke Firebase:", err);
      return false;
    }
  }

  /**
   * Memperbarui field pet milik saya secara parsial agar tidak menimpa posisi atau isOnline.
   */
  public async syncMyPet(
    roomCode: string,
    caregiverId: string,
    petState: Partial<PartnerPetState>
  ): Promise<boolean> {
    const db = getFirebaseDatabaseInstance();
    if (!db) return false;
    const cleanCode = roomCode.trim().toUpperCase();

    try {
      const updates: Record<string, unknown> = {
        [`rooms/${cleanCode}/lastUpdatedAt`]: serverTimestamp(),
        [`rooms/${cleanCode}/pets/${caregiverId}/lastUpdated`]: serverTimestamp(),
      };
      for (const [key, val] of Object.entries(petState)) {
        if (val !== undefined && key !== "lastUpdated") {
          updates[`rooms/${cleanCode}/pets/${caregiverId}/${key}`] = val;
        }
      }
      await update(ref(db), sanitizeForFirebase(updates));
      return true;
    } catch (err) {
      console.error("Gagal menyinkronkan status pet saya ke Firebase:", err);
      return false;
    }
  }

  /**
   * Mengirim pembaruan koordinat & target gerak mabar secara parsial dan hemat bandwidth.
   */
  public async syncMyPetMovement(
    roomCode: string,
    caregiverId: string,
    movement: PartnerMovementPayload
  ): Promise<boolean> {
    const db = getFirebaseDatabaseInstance();
    if (!db) return false;
    const cleanCode = roomCode.trim().toUpperCase();

    try {
      const prefix = `rooms/${cleanCode}/pets/${caregiverId}`;
      const updates: Record<string, unknown> = {
        [`${prefix}/position`]: movement.position,
        [`${prefix}/lastUpdated`]: serverTimestamp(),
        [`${prefix}/isOnline`]: true,
      };
      if (movement.yaw !== undefined) {
        updates[`${prefix}/yaw`] = movement.yaw;
      }
      if (movement.currentState !== undefined) {
        updates[`${prefix}/currentState`] = movement.currentState;
      }
      if (movement.walkTarget !== undefined) {
        updates[`${prefix}/walkTarget`] = movement.walkTarget;
      }
      await update(ref(db), sanitizeForFirebase(updates));
      return true;
    } catch {
      return false;
    }
  }

  public unsubscribe(): void {
    const db = getFirebaseDatabaseInstance();

    if (this.lifecycleCleanup) {
      this.lifecycleCleanup();
      this.lifecycleCleanup = null;
    }

    if (this.activePresenceListener && db) {
      try {
        const connectedRef = ref(db, this.activePresenceListener.path);
        off(connectedRef, "value", this.activePresenceListener.callback);
        const presenceRef = ref(db, this.activePresenceListener.myPresencePath);
        set(presenceRef, false).catch(() => {});
      } catch {
        // Ignored
      }
      this.activePresenceListener = null;
    }

    for (const entry of this.subListeners) {
      try {
        off(entry.target, "value", entry.callback);
      } catch {
        // Ignored
      }
    }
    this.subListeners = [];
    this.logDeduplicator.reset();
    this.onConnectionStateChangeCb?.("disconnected");
    this.onConnectionStateChangeCb = null;
  }
}

export const juroSyncService = new JuroRealtimeSyncService();
