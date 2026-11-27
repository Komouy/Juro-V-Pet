import { create } from "zustand";
import type {
  CaregiverActionLog,
  CaregiverProfile,
  CaregiverRelationshipInfo,
} from "../types/caregiver";

interface CareLogStoreState {
  activityLogs: CaregiverActionLog[];
  setLogs: (logs: CaregiverActionLog[]) => void;
  prependLog: (log: CaregiverActionLog) => void;
  clearLogs: () => void;
}

/**
 * Dedicated store for caregiver activity history logs.
 */
export const useCareLogStore = create<CareLogStoreState>((set) => ({
  activityLogs: [],
  setLogs: (logs) => set({ activityLogs: logs.slice(0, 80) }),
  prependLog: (newLog) =>
    set((state) => {
      if (state.activityLogs.some((l) => l.id === newLog.id)) return state;
      return {
        activityLogs: [newLog, ...state.activityLogs].slice(0, 80),
      };
    }),
  clearLogs: () => set({ activityLogs: [] }),
}));

/**
 * Pure computation of Juro's relationship dynamics and personality trait
 * from caregiver profiles and shared activity logs.
 */
export function computeCaregiverRelationship(
  myProfile: CaregiverProfile | null,
  partnerProfile: CaregiverProfile | null,
  activityLogs: CaregiverActionLog[]
): CaregiverRelationshipInfo {
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
}
