export type MapThemeId = "light" | "dark" | "color";

export type MapTheme = {
  id: MapThemeId;
  label: string;
  tileUrl: string;
  matchesUiScheme?: "light" | "dark";
};

export type MapProvider = {
  id: string;
  label: string;
  paid: boolean;
  themes: MapTheme[];
  attribution: string;
  maxZoom: number;
  subdomains?: string;
};

export const cartoProvider: MapProvider = {
  id: "carto",
  label: "CARTO basemaps",
  paid: false,
  attribution:
    '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> · © <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
  maxZoom: 19,
  subdomains: "abcd",
  themes: [
    {
      id: "light",
      label: "Light",
      tileUrl:
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      matchesUiScheme: "light",
    },
    {
      id: "dark",
      label: "Dark",
      tileUrl: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      matchesUiScheme: "dark",
    },
    {
      id: "color",
      label: "Color",
      tileUrl:
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    },
  ],
};

export const providers: MapProvider[] = [cartoProvider];

export function getThemeForScheme(
  provider: MapProvider,
  scheme: "light" | "dark",
): MapTheme {
  return (
    provider.themes.find((t) => t.matchesUiScheme === scheme) ??
    provider.themes[0]
  );
}

export function getTheme(
  provider: MapProvider,
  themeId: MapThemeId,
): MapTheme {
  return provider.themes.find((t) => t.id === themeId) ?? provider.themes[0];
}
