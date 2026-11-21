export type TimePhase = "morning" | "day" | "sunset" | "night";
export type TimeMode = "auto" | TimePhase;

export interface TimeThemeConfig {
  phase: TimePhase;
  label: string;
  skyGradient: string;
  groundColor: string;
  groundRimColor: string;
  hillNearColor: string;
  hillFarColor: string;
  cloudColor: string;
  cloudOpacity: number;
  ambientColor: string;
  ambientIntensity: number;
  keyLightColor: string;
  keyLightIntensity: number;
  keyLightPos: [number, number, number];
  rimLightColor: string;
  rimLightIntensity: number;
  celestialPos: [number, number, number];
  celestialColor: string;
  waterColor: string;
  waterRimColor: string;
  waterShimmerColor: string;
  grassTuftColor: string;
  isNight: boolean;
}

export function getTimePhaseFromDate(date: Date = new Date()): TimePhase {
  const hour = date.getHours();
  if (hour >= 6 && hour < 10) return "morning";
  if (hour >= 10 && hour < 16) return "day";
  if (hour >= 16 && hour < 19) return "sunset";
  return "night";
}

/**
 * Deteksi jadwal tidur alami & jam ekspresi mengantuk Juro:
 * Mulai pukul 21:00 (9 malam) s/d sebelum 06:00 (6 pagi).
 * Pada rentang waktu ini, ekspresi wajah Juro akan terus mengantuk.
 */
export function isBedtimeHour(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= 21 || hour < 6;
}

/**
 * Alias helper untuk memeriksa apakah saat ini jam mengantuk (21:00 - 06:00)
 */
export function isSleepyHour(date: Date = new Date()): boolean {
  return isBedtimeHour(date);
}

export const TIME_THEMES: Record<TimePhase, TimeThemeConfig> = {
  morning: {
    phase: "morning",
    label: "Pagi",
    skyGradient: "linear-gradient(180deg, #7DD3FC 0%, #BAE6FD 48%, #FDE68A 82%, #FED7AA 100%)",
    groundColor: "#86EFAC",
    groundRimColor: "#4ADE80",
    hillNearColor: "#4ADE80",
    hillFarColor: "#6EE7B7",
    cloudColor: "#FFF7ED",
    cloudOpacity: 0.92,
    ambientColor: "#FFF7ED",
    ambientIntensity: 0.95,
    keyLightColor: "#FFE4B5",
    keyLightIntensity: 1.45,
    keyLightPos: [4.5, 5.0, 4.0],
    rimLightColor: "#FDBA74",
    rimLightIntensity: 0.85,
    celestialPos: [4.5, 7.8, -18.0],
    celestialColor: "#FDE047",
    waterColor: "#38BDF8",
    waterRimColor: "#BAE6FD",
    waterShimmerColor: "#FFFBEB",
    grassTuftColor: "#22C55E",
    isNight: false,
  },
  day: {
    phase: "day",
    label: "Siang",
    skyGradient: "linear-gradient(180deg, #38BDF8 0%, #7DD3FC 55%, #E0F2FE 100%)",
    groundColor: "#4ADE80",
    groundRimColor: "#22C55E",
    hillNearColor: "#22C55E",
    hillFarColor: "#34D399",
    cloudColor: "#FFFFFF",
    cloudOpacity: 0.95,
    ambientColor: "#FFFFFF",
    ambientIntensity: 0.92,
    keyLightColor: "#FFFDF7",
    keyLightIntensity: 1.5,
    keyLightPos: [3.0, 6.5, 4.0],
    rimLightColor: "#FED7AA",
    rimLightIntensity: 0.8,
    celestialPos: [-3.5, 8.4, -18.0],
    celestialColor: "#FEF08A",
    waterColor: "#0EA5E9",
    waterRimColor: "#7DD3FC",
    waterShimmerColor: "#E0F2FE",
    grassTuftColor: "#16A34A",
    isNight: false,
  },
  sunset: {
    phase: "sunset",
    label: "Sore",
    skyGradient: "linear-gradient(180deg, #1E1B4B 0%, #3730A3 25%, #7C3AED 45%, #F97316 75%, #FDE047 100%)",
    groundColor: "#4ADE80",
    groundRimColor: "#22C55E",
    hillNearColor: "#16A34A",
    hillFarColor: "#475569",
    cloudColor: "#FED7AA",
    cloudOpacity: 0.88,
    ambientColor: "#FED7AA",
    ambientIntensity: 0.95,
    keyLightColor: "#FED7AA",
    keyLightIntensity: 1.45,
    keyLightPos: [-4.5, 5.5, 4.0],
    rimLightColor: "#F472B6",
    rimLightIntensity: 0.85,
    celestialPos: [-4.2, 7.2, -18.0],
    celestialColor: "#FB923C",
    waterColor: "#0284C7",
    waterRimColor: "#FDBA74",
    waterShimmerColor: "#FDE047",
    grassTuftColor: "#16A34A",
    isNight: false,
  },
  night: {
    phase: "night",
    label: "Malam",
    skyGradient: "linear-gradient(180deg, #090D1F 0%, #172554 55%, #1E293B 100%)",
    groundColor: "#14532D",
    groundRimColor: "#064E3B",
    hillNearColor: "#0F3D2E",
    hillFarColor: "#1E293B",
    cloudColor: "#334155",
    cloudOpacity: 0.45,
    ambientColor: "#CBD5E1",
    ambientIntensity: 0.72,
    keyLightColor: "#E0F2FE",
    keyLightIntensity: 1.15,
    keyLightPos: [3.2, 5.5, 4.2],
    rimLightColor: "#FDE68A",
    rimLightIntensity: 0.85,
    celestialPos: [3.8, 8.0, -18.0],
    celestialColor: "#FEF9C3",
    waterColor: "#0C4A6E",
    waterRimColor: "#1E40AF",
    waterShimmerColor: "#BAE6FD",
    grassTuftColor: "#166534",
    isNight: true,
  },
};
