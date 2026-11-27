import { create } from "zustand";
import type { PartnerPetState } from "../types/caregiver";

interface PartnerPetStoreState {
  partnerPet: PartnerPetState | null;
  isPartnerPetPresent: boolean;
  setPartnerPet: (partnerPet: PartnerPetState | null) => void;
  clearPartnerPet: () => void;
}

/**
 * Dedicated store for tracking the partner caregiver's pet state and online presence.
 */
export const usePartnerPetStore = create<PartnerPetStoreState>((set) => ({
  partnerPet: null,
  isPartnerPetPresent: false,
  setPartnerPet: (partnerPet) =>
    set({
      partnerPet,
      isPartnerPetPresent: partnerPet !== null,
    }),
  clearPartnerPet: () =>
    set({
      partnerPet: null,
      isPartnerPetPresent: false,
    }),
}));
