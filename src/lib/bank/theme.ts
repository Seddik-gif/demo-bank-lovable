// Colour palettes for the app. Each palette overrides CSS variables in styles.css
// via <html data-palette="...">. The choice is remembered on this device only.

export type PaletteId = "black-metal" | "midnight-ocean" | "emerald-night" | "ember" | "silver-light";

export const PALETTES: { id: PaletteId; name: string; description: string; swatches: [string, string, string] }[] = [
  { id: "black-metal", name: "Black metal", description: "Graphite, silver sheen and cyan accents", swatches: ["#15171b", "#22d3ee", "#7c5cff"] },
  { id: "midnight-ocean", name: "Midnight ocean", description: "Deep navy with blue and teal", swatches: ["#0f1a2e", "#38bdf8", "#2563eb"] },
  { id: "emerald-night", name: "Emerald night", description: "Forest-black with emerald highlights", swatches: ["#0e1a14", "#34d399", "#10b981"] },
  { id: "ember", name: "Ember", description: "Warm charcoal with amber and copper", swatches: ["#1a1210", "#fbbf24", "#f97316"] },
  { id: "silver-light", name: "Silver light", description: "A light, clean theme with steel accents", swatches: ["#eef0f4", "#4b5563", "#334155"] },
];

const KEY = "demo-bank:palette";

export function storedPalette(): PaletteId {
  try {
    const v = window.localStorage.getItem(KEY);
    return PALETTES.some((p) => p.id === v) ? (v as PaletteId) : "black-metal";
  } catch {
    return "black-metal";
  }
}

export function applyPalette(id: PaletteId): void {
  document.documentElement.setAttribute("data-palette", id);
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    // Storage blocked: the palette still applies for this visit.
  }
}
