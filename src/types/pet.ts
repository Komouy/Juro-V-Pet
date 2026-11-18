import { z } from "zod";

export const PetAttributeSchema = z.object({
  hunger: z.number().min(0).max(100),
  energy: z.number().min(0).max(100),
  happiness: z.number().min(0).max(100),
  cleanliness: z.number().min(0).max(100),
  affection: z.number().min(0).max(100),
});

export type PetAttributes = z.infer<typeof PetAttributeSchema>;

export type PetMood =
  | "happy"
  | "hungry"
  | "sleepy"
  | "bored"
  | "dirty"
  | "content"
  | "excited";

export type PetBehaviorState =
  | "idle"
  | "wander"
  | "curious"
  | "play"
  | "happy"
  | "sleep"
  | "dragging"
  | "eating";

export interface FoodItem {
  id: string;
  name: string;
  desc: string;
  hungerRestore: number;
  happinessGain: number;
  energyGain: number;
  xpReward: number;
}

export interface ToyItem {
  id: string;
  name: string;
  desc: string;
  happinessGain: number;
  affectionGain: number;
  energyCost: number;
  xpReward: number;
}

export interface PetProfile {
  name: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  attributes: PetAttributes;
  mood: PetMood;
  currentState: PetBehaviorState;
  createdAt: number;
  lastUpdated: number;
}
