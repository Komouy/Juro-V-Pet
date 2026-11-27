import type { FoodItem, ToyItem } from "../../../types/pet";
import type { DayTimeWeather, NormalizedWeather } from "../../../types/ui";
import type { DragPayload } from "./ActionTray";

export type ActiveTray = "none" | "food" | "toy" | "bath";

export interface WeatherPalette {
  sky: string;
  fogDensity: number;
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  fillIntensity: number;
  isNight: boolean;
}

export const WEATHER_PALETTES: Record<NormalizedWeather, WeatherPalette> = {
  pagi: {
    sky: "#9dd9f3",
    fogDensity: 0.006,
    sunColor: "#ffe8be",
    sunIntensity: 1.24,
    hemiSky: "#e8f6ff",
    hemiGround: "#7db862",
    hemiIntensity: 0.70,
    fillIntensity: 0.24,
    isNight: false,
  },
  cerah: {
    sky: "#b6dff2",
    fogDensity: 0.0055,
    sunColor: "#fff1d4",
    sunIntensity: 1.35,
    hemiSky: "#dff2ff",
    hemiGround: "#7aa85c",
    hemiIntensity: 0.68,
    fillIntensity: 0.22,
    isNight: false,
  },
  hujan: {
    sky: "#83a3b8",
    fogDensity: 0.011,
    sunColor: "#cfe0ed",
    sunIntensity: 0.82,
    hemiSky: "#acc7d9",
    hemiGround: "#527058",
    hemiIntensity: 0.62,
    fillIntensity: 0.18,
    isNight: false,
  },
  senja: {
    sky: "#e89e76",
    fogDensity: 0.0085,
    sunColor: "#ffa866",
    sunIntensity: 1.25,
    hemiSky: "#ffd0a6",
    hemiGround: "#6b5254",
    hemiIntensity: 0.56,
    fillIntensity: 0.18,
    isNight: false,
  },
  malam: {
    sky: "#131f33",
    fogDensity: 0.0135,
    sunColor: "#7ca3eb",
    sunIntensity: 0.45,
    hemiSky: "#2d446e",
    hemiGround: "#16241f",
    hemiIntensity: 0.34,
    fillIntensity: 0.1,
    isNight: true,
  },
};

export const RAIN_TIME_PALETTES: Record<DayTimeWeather, WeatherPalette> = {
  pagi: {
    sky: "#8cb2c9",
    fogDensity: 0.0105,
    sunColor: "#d6e5ef",
    sunIntensity: 0.85,
    hemiSky: "#b6d2e4",
    hemiGround: "#59805d",
    hemiIntensity: 0.60,
    fillIntensity: 0.18,
    isNight: false,
  },
  cerah: {
    sky: "#7e9fb5",
    fogDensity: 0.011,
    sunColor: "#cfe0ed",
    sunIntensity: 0.82,
    hemiSky: "#acc7d9",
    hemiGround: "#527058",
    hemiIntensity: 0.60,
    fillIntensity: 0.18,
    isNight: false,
  },
  senja: {
    sky: "#946f76",
    fogDensity: 0.012,
    sunColor: "#d99d82",
    sunIntensity: 0.72,
    hemiSky: "#bd9197",
    hemiGround: "#4f3f46",
    hemiIntensity: 0.48,
    fillIntensity: 0.15,
    isNight: false,
  },
  malam: {
    sky: "#0b1424",
    fogDensity: 0.0155,
    sunColor: "#5c7cb8",
    sunIntensity: 0.34,
    hemiSky: "#1f3254",
    hemiGround: "#101c18",
    hemiIntensity: 0.28,
    fillIntensity: 0.08,
    isNight: true,
  },
};

export function getEffectiveWeatherPalette(
  timePhase: DayTimeWeather,
  isRaining: boolean
): WeatherPalette {
  return isRaining ? RAIN_TIME_PALETTES[timePhase] : WEATHER_PALETTES[timePhase];
}

export interface DragVisualState {
  payload: DragPayload;
  moved: boolean;
  overJuro: boolean;
}

export interface DragBubbleItem {
  id: number;
  x: number;
  y: number;
  size: number;
  dx: number;
  popped?: boolean;
}

export interface SpeechInteractionDetail {
  food?: FoodItem;
  toy?: ToyItem;
}

export function getDraggedIllustrationId(payload: DragPayload): string {
  switch (payload.kind) {
    case "soap":
      return "soap-bar";
    case "bucket":
      return "water-bucket";
    case "food":
      return payload.food.id;
    case "toy":
      return payload.toy.id;
  }
}
