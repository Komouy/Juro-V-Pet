import type {
  CaregiverActionLog,
  CaregiverProfile,
  JuroPairingRoomData,
  PartnerPetState,
  SharedJuroState,
  SyncConnectionState,
} from "../types/caregiver";

export interface PartnerMovementPayload {
  position: { x: number; y: number; z: number };
  walkTarget?: { x: number; z: number } | null;
  yaw?: number;
  currentState?: string;
}

export interface RoomSyncCallbacks {
  onJuroStateSync: (juroState: SharedJuroState) => void;
  onPartnerPetSync?: (partnerPet: PartnerPetState | null) => void;
  onActivityLogAdded?: (log: CaregiverActionLog) => void;
  onInitialLogsLoaded?: (logs: CaregiverActionLog[]) => void;
  onPartnerStatusChange?: (partner: CaregiverProfile | null) => void;
  onConnectionStateChange?: (state: SyncConnectionState) => void;
  onRoomClosed?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hexagonal port decoupling pairing/multiplayer coordination from the underlying realtime backend.
 */
export interface IRoomSyncPort {
  isReady(): boolean;
  createPairingRoom(
    caregiver: CaregiverProfile,
    initialJuro: SharedJuroState
  ): Promise<{ ok: boolean; roomCode?: string; error?: string }>;
  joinPairingRoom(
    roomCodeInput: string,
    caregiver: CaregiverProfile
  ): Promise<{ ok: boolean; roomData?: JuroPairingRoomData; error?: string }>;
  subscribeToRoom(
    roomCode: string,
    myCaregiverId: string,
    callbacks: RoomSyncCallbacks
  ): () => void;
  pushCareAction(
    roomCode: string,
    caregiver: CaregiverProfile,
    action: Omit<
      CaregiverActionLog,
      "id" | "timestamp" | "caregiverId" | "caregiverName" | "caregiverRoleTitle"
    >,
    updatedJuro: Partial<SharedJuroState>
  ): Promise<boolean>;
  syncJuroState(
    roomCode: string,
    caregiverId: string,
    updatedJuro: Partial<SharedJuroState>
  ): Promise<boolean>;
  syncMyPet(
    roomCode: string,
    caregiverId: string,
    petState: Partial<PartnerPetState>
  ): Promise<boolean>;
  syncMyPetMovement(
    roomCode: string,
    caregiverId: string,
    movement: PartnerMovementPayload
  ): Promise<boolean>;
  unsubscribe(): void;
}
