export type ThemeMode = "light" | "dark";
export type WeatherMode = "clear" | "rain";

export interface NavItem {
  path: string;
  label: string;
  badge?: string;
}
