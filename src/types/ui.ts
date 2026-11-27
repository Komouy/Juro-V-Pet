export type ThemeMode = "light" | "dark";
export type DayTimeWeather = "pagi" | "cerah" | "senja" | "malam";
export type WeatherMode =
  | "auto"
  | "pagi"
  | "cerah"
  | "hujan"
  | "senja"
  | "malam"
  | "clear"
  | "rain";

export type NormalizedWeather = "pagi" | "cerah" | "hujan" | "senja" | "malam";

export function getDayTimeWeather(date: Date = new Date()): DayTimeWeather {
  const h = date.getHours();
  if (h >= 6 && h < 10) return "pagi";
  if (h >= 10 && h < 16) return "cerah";
  if (h >= 16 && h < 19) return "senja";
  return "malam";
}

export function normalizeWeather(
  w: WeatherMode,
  date: Date = new Date()
): NormalizedWeather {
  if (w === "clear") return "cerah";
  if (w === "rain") return "hujan";
  if (w === "auto") {
    return getDayTimeWeather(date);
  }
  return w;
}

export function isRainingWeather(w: WeatherMode, autoRaining = false): boolean {
  if (w === "auto") return autoRaining;
  return w === "hujan" || w === "rain";
}

export function isNightWeather(w: WeatherMode, date: Date = new Date()): boolean {
  if (w === "hujan" || w === "rain") {
    return getDayTimeWeather(date) === "malam";
  }
  return normalizeWeather(w, date) === "malam";
}

export interface NavItem {
  path: string;
  label: string;
  badge?: string;
}
