export type ThemeMode = "light" | "dark";
export type WeatherMode = "auto" | "cerah" | "hujan" | "senja" | "malam" | "clear" | "rain";

export function normalizeWeather(w: WeatherMode): "cerah" | "hujan" | "senja" | "malam" {
  if (w === "clear") return "cerah";
  if (w === "rain") return "hujan";
  if (w === "auto") {
    const h = new Date().getHours();
    if (h >= 6 && h < 16) return "cerah";
    if (h >= 16 && h < 19) return "senja";
    return "malam";
  }
  return w;
}

export function isRainingWeather(w: WeatherMode): boolean {
  return w === "hujan" || w === "rain";
}

export function isNightWeather(w: WeatherMode): boolean {
  return w === "malam";
}


export interface NavItem {
  path: string;
  label: string;
  badge?: string;
}
