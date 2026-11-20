import type { CrystalId } from "../data/economyCatalog";

/**
 * Peran perawat dalam sistem 1 Juro 2 Perawat
 */
export type CaregiverRole = "primary" | "partner" | "custom";

/**
 * Identitas profil perawat aktif
 */
export interface CaregiverProfile {
  id: string; // ID unik perawat (misal: "cg_dhavi_179516")
  name: string; // Nama panggilan (misal: "Dhavi", "Naufall", "Papi", "Mami")
  roleTitle: string; // Judul peran (misal: "Perawat 1", "Perawat 2", "Papi Juro", "Mami Juro")
  avatarColor?: string; // Warna aksen badge profil perawat
  joinedAt: number;
}

/**
 * Jenis aksi pengasuhan yang dicatat dalam riwayat bersama
 */
export type CareActionType =
  | "feed"
  | "bath"
  | "play"
  | "sleep"
  | "wake"
  | "pet"
  | "shop"
  | "skin"
  | "message"
  | "interaction";

/**
 * Catatan log aktivitas pengasuhan bersama
 */
export interface CaregiverActionLog {
  id: string;
  timestamp: number;
  caregiverId: string;
  caregiverName: string;
  caregiverRoleTitle: string;
  actionType: CareActionType;
  description: string;
  itemUsedName?: string;
  statChanges?: {
    hunger?: number;
    energy?: number;
    cleanliness?: number;
    happiness?: number;
    affection?: number;
    coins?: number;
  };
}

/**
 * Snapshot status Juro yang disinkronisasikan antara 2 perawat di Firebase
 */
export interface SharedJuroState {
  name: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  hunger: number;
  energy: number;
  happiness: number;
  cleanliness: number;
  affection: number;
  currentState: string;
  activeSkin: string;
  coins: number;
  crystals?: Record<CrystalId, number>;
  foodInventory?: Record<string, number>;
  ownedToys?: string[];
  lastUpdated: number;
  updatedByCaregiverId?: string;
}

/**
 * Struktur Kamar Pairing di Firebase Realtime Database: /rooms/{roomCode}
 */
export interface JuroPairingRoomData {
  roomCode: string;
  createdAt: number;
  lastUpdatedAt: number;
  juro: SharedJuroState;
  caregivers: {
    caregiver1: CaregiverProfile;
    caregiver2?: CaregiverProfile | null;
  };
  activityLogs?: Record<string, CaregiverActionLog>;
}

/**
 * Ringkasan dinamika pengasuhan & perkembangan adaptif Juro (1 atau 2 perawat)
 */
export interface CaregiverRelationshipInfo {
  caregiverCount: 1 | 2;
  myCaregiverName: string;
  partnerCaregiverName?: string;
  totalMyActions: number;
  totalPartnerActions: number;
  developmentTrait: string;
  traitDescription: string;
  recentSummary: string;
}

