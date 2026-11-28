// Atziri Exchange: visual styles ("skins") chosen in Atziri réglage.
// A style only changes the look (colors, borders, glows, backgrounds):
// fonts, layout and features stay the same. The CSS of each style is in
// atziri-skins.css, scoped by the data-atz-skin attribute on <html>.
// "classic" is the current look and stays the default.
import { shallowRef } from "vue";
import { activeTheme, applyTheme, setTheme, themeColors, type ThemeColors } from "./atziri-theme";
import { backgrounds, setBackground } from "./atziri-backgrounds";

export interface Skin {
  id: string;
  fr: string;
  en: string;
  /** colors applied when the style is picked (the palette can still be changed afterwards) */
  colors?: ThemeColors;
  /** two colors for the preview in the settings */
  preview: [string, string];
  /** frame ornament of the style (used until the player picks another one) */
  ornament?: string;
  /** background picture of the Shift + Space page picked with the style */
  background?: string;
  /** "custom" style: keeps the current colors and backgrounds, gives access to every ornament and effect */
  custom?: boolean;
}

export const SKINS: Skin[] = [
  { id: "classic", fr: "Classique", en: "Classic", preview: ["#111111", "#f5a524"] },
  {
    id: "neon",
    ornament: "pack-neon",
    background: "pack-neon",
    fr: "Neon Gaming",
    en: "Neon Gaming",
    colors: { bg: "#0b0616", surface: "#150c27", line: "#4a2585", fg: "#f3ecff", muted: "#a690d0", accent: "#c04dff" },
    preview: ["#150c27", "#c04dff"],
  },
  {
    id: "darkred",
    ornament: "pack-darkred",
    background: "pack-darkred",
    fr: "Dark Red",
    en: "Dark Red",
    colors: { bg: "#0a0606", surface: "#150b0c", line: "#4f1a1d", fg: "#f3e7e7", muted: "#b39595", accent: "#e3262f" },
    preview: ["#150b0c", "#e3262f"],
  },
  {
    id: "cyber",
    ornament: "pack-cyber",
    background: "pack-cyber",
    fr: "Cyberpunk",
    en: "Cyberpunk",
    colors: { bg: "#050b12", surface: "#0a1622", line: "#14435c", fg: "#e2f6ff", muted: "#7fa8bd", accent: "#19d3ff" },
    preview: ["#0a1622", "#19d3ff"],
  },
  {
    id: "minimal",
    ornament: "pack-minimal",
    background: "pack-minimal",
    fr: "Minimaliste",
    en: "Minimalist",
    colors: { bg: "#0d0d0e", surface: "#161617", line: "#2a2a2c", fg: "#ececec", muted: "#8d8d90", accent: "#d4d4d4" },
    preview: ["#161617", "#d4d4d4"],
  },
  {
    id: "nature",
    ornament: "pack-nature",
    background: "pack-nature",
    fr: "Terre & Nature",
    en: "Earth & Nature",
    colors: { bg: "#0b0f08", surface: "#151b10", line: "#3a4a26", fg: "#eef2dc", muted: "#a3ad88", accent: "#9ccc3c" },
    preview: ["#151b10", "#9ccc3c"],
  },
  {
    id: "glass",
    ornament: "pack-glass",
    background: "pack-glass",
    fr: "Glassmorphism",
    en: "Glassmorphism",
    colors: { bg: "#0c1022", surface: "#1a2040", line: "#4a5590", fg: "#f0f3ff", muted: "#a5afd6", accent: "#8b98ff" },
    preview: ["#1a2040", "#8b98ff"],
  },
  {
    id: "custom",
    custom: true,
    fr: "Personnalisé",
    en: "Custom",
    preview: ["#141414", "#f5a524"],
  },
];

const KEY = "atziri-skin";
// colors used before a style was picked, given back when "Classique" is picked again
const PREV_KEY = "atziri-skin-prev-colors";
// same for the background picture of the Shift + Space page
const PREV_BG_KEY = "atziri-skin-prev-bg";

function load(): string {
  try {
    const v = localStorage.getItem(KEY);
    if (v && SKINS.some((s) => s.id === v)) return v;
  } catch {
    // storage unavailable
  }
  return "classic";
}

export const activeSkin = shallowRef<string>(load());

function applySkin(id: string) {
  const root = document.documentElement;
  if (id === "classic") delete root.dataset.atzSkin;
  else root.dataset.atzSkin = id;
  applyFx();
}

// ---- extra look settings: effect intensity, overlay opacity, ornament, ambient ----
export interface SkinFx {
  /** glows and lights, 0 to 100 % */
  intensity: number;
  /** big background frame, 30 to 100 % */
  opacity: number;
  /** ornament picked for each style (none saved = the style's own one) */
  ornaments: Record<string, string>;
  /** speed of the ambient effects, 25 to 300 % */
  speed: number;
  /** images per second of the ambient effects (0 = as fast as the screen) */
  fps: number;
  /** ambient effects turned on, for each style */
  ambients: Record<string, string[]>;
  /** color of the ornaments, for each style */
  ornTints: Record<string, OrnTint>;
  /** color of the style itself (interface colors and effects), for each style */
  styleTints: Record<string, OrnTint>;
}

// ---- color of the ornaments ----
// "hue": every color of the ornament turns together (hue, saturation, brightness),
// so an ornament with several colors keeps several colors.
// "color": duotone, dark and mid tones take the main color, light parts the highlight
// color, so the relief stays.
export interface OrnTint {
  mode: "none" | "hue" | "color";
  /** -180 to 180 degrees */
  hue: number;
  /** 0 to 200 % */
  sat: number;
  /** 40 to 160 % */
  light: number;
  /** main color */
  c1: string;
  /** highlight color */
  c2: string;
}
export const DEFAULT_TINT: OrnTint = { mode: "none", hue: 0, sat: 100, light: 100, c1: "#f5a524", c2: "#ffffff" };

/** ready-made pairs (main color, highlight color) */
export const TINT_PALETTE: Array<{ fr: string; en: string; c1: string; c2: string }> = [
  { fr: "Or", en: "Gold", c1: "#c8901a", c2: "#fff1c2" },
  { fr: "Argent", en: "Silver", c1: "#7d848f", c2: "#ffffff" },
  { fr: "Bronze", en: "Bronze", c1: "#8c5a2b", c2: "#f3c99a" },
  { fr: "Sang", en: "Blood", c1: "#9b0f12", c2: "#ff8a6e" },
  { fr: "Braise", en: "Ember", c1: "#d4520f", c2: "#ffe08a" },
  { fr: "Émeraude", en: "Emerald", c1: "#1f8a4c", c2: "#c9ffb3" },
  { fr: "Turquoise", en: "Turquoise", c1: "#0e9aa7", c2: "#d4fffb" },
  { fr: "Cyan", en: "Cyan", c1: "#00a8e0", c2: "#e6fbff" },
  { fr: "Saphir", en: "Sapphire", c1: "#2347c4", c2: "#c9d9ff" },
  { fr: "Améthyste", en: "Amethyst", c1: "#7a2fc0", c2: "#f0d4ff" },
  { fr: "Rose", en: "Pink", c1: "#d02f7f", c2: "#ffd6ec" },
  { fr: "Obsidienne", en: "Obsidian", c1: "#2b2b30", c2: "#b9b9c4" },
];

export function ornTintFor(skin: string): OrnTint {
  const accent = SKINS.find((s) => s.id === skin)?.preview[1] ?? DEFAULT_TINT.c1;
  const saved: Partial<OrnTint> = skinFx.value.ornTints[skin] ?? {};
  return { ...DEFAULT_TINT, c1: accent, ...saved };
}

export function setOrnTint(next: Partial<OrnTint>) {
  const skin = activeSkin.value;
  setSkinFx({ ornTints: { ...skinFx.value.ornTints, [skin]: { ...ornTintFor(skin), ...next } } });
}

/** CSS filter of a tint (also used by the preview in the settings) */
export function ornTintFilter(t: OrnTint): string {
  if (t.mode === "hue") {
    const sat = Math.min(200, Math.max(0, t.sat)) / 100;
    const light = Math.min(160, Math.max(40, t.light)) / 100;
    return `hue-rotate(${Math.round(t.hue)}deg) saturate(${sat}) brightness(${light})`;
  }
  if (t.mode === "color") {
    ensureDuoFilter("atz-orn-duo", t.c1, t.c2);
    return "url(#atz-orn-duo)";
  }
  return "none";
}

function hexRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : 0xffffff;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// hidden SVG holding the duotone filter, rewritten when the colors change
function ensureDuoFilter(id: string, c1: string, c2: string) {
  if (typeof document === "undefined") return;
  const a = hexRgb(c1);
  const b = hexRgb(c2);
  // brightness 0, 0.25, 0.5, 0.75, 1 -> deep shade, shade, main color, mix, highlight
  const ch = (i: number) =>
    [a[i] * 0.12, a[i] * 0.55, a[i], (a[i] + b[i]) / 2, b[i]].map((v) => v.toFixed(3)).join(" ");
  let svg = document.getElementById(`${id}-svg`) as SVGSVGElement | null;
  if (!svg) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    el.id = `${id}-svg`;
    el.setAttribute("width", "0");
    el.setAttribute("height", "0");
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none");
    (document.body ?? document.documentElement).appendChild(el);
    svg = el;
  }
  svg.innerHTML =
    `<filter id="${id}" color-interpolation-filters="sRGB" x="-50%" y="-50%" width="200%" height="200%">` +
    '<feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0"/>' +
    "<feComponentTransfer>" +
    `<feFuncR type="table" tableValues="${ch(0)}"/>` +
    `<feFuncG type="table" tableValues="${ch(1)}"/>` +
    `<feFuncB type="table" tableValues="${ch(2)}"/>` +
    "</feComponentTransfer></filter>";
}

// ---- color of the style itself ----
// "hue": the 6 colors of the style turn together; "color": a new accent color,
// the dark tones of the style take its hue. The ambient effects follow, and so
// does the frame ornament while its own color is left on "original colors".

/** accent colors offered for the style */
export const STYLE_PALETTE: Array<{ fr: string; en: string; c: string }> = [
  { fr: "Or", en: "Gold", c: "#f5a524" },
  { fr: "Argent", en: "Silver", c: "#d4d4d4" },
  { fr: "Bronze", en: "Bronze", c: "#c98a4b" },
  { fr: "Sang", en: "Blood", c: "#e3262f" },
  { fr: "Braise", en: "Ember", c: "#ff6a1a" },
  { fr: "Lime", en: "Lime", c: "#9ccc3c" },
  { fr: "Émeraude", en: "Emerald", c: "#2fd47a" },
  { fr: "Turquoise", en: "Turquoise", c: "#1fd1c4" },
  { fr: "Cyan", en: "Cyan", c: "#19d3ff" },
  { fr: "Saphir", en: "Sapphire", c: "#4f7bff" },
  { fr: "Améthyste", en: "Amethyst", c: "#c04dff" },
  { fr: "Rose", en: "Pink", c: "#ff4fa3" },
];

export function styleTintFor(skin: string): OrnTint {
  const accent = SKINS.find((s) => s.id === skin)?.colors?.accent ?? DEFAULT_TINT.c1;
  const saved: Partial<OrnTint> = skinFx.value.styleTints[skin] ?? {};
  return { ...DEFAULT_TINT, c1: accent, ...saved };
}

export function setStyleTint(next: Partial<OrnTint>) {
  const skin = activeSkin.value;
  setSkinFx({ styleTints: { ...skinFx.value.styleTints, [skin]: { ...styleTintFor(skin), ...next } } });
}

type HSL = [number, number, number];
function toHsl(hex: string): HSL {
  const [r, g, b] = hexRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h, s, l];
}
function fromHsl([h, s, l]: HSL): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [f(0), f(8), f(4)].map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("");
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** colors of a style once its color setting is applied */
export function tintColors(colors: ThemeColors, t: OrnTint): ThemeColors {
  if (t.mode === "hue") {
    const sat = Math.min(200, Math.max(0, t.sat)) / 100;
    const light = Math.min(160, Math.max(40, t.light)) / 100;
    const turn = (hex: string, lit: boolean) => {
      const [h, s, l] = toHsl(hex);
      return fromHsl([(h + t.hue + 360) % 360, clamp01(s * sat), lit ? clamp01(l * light) : l]);
    };
    // brightness only on the accent and the borders: backgrounds and texts stay readable
    return {
      bg: turn(colors.bg, false),
      surface: turn(colors.surface, false),
      line: turn(colors.line, true),
      fg: turn(colors.fg, false),
      muted: turn(colors.muted, false),
      accent: turn(colors.accent, true),
    };
  }
  if (t.mode === "color") {
    const [ah, as] = toHsl(t.c1);
    // the other colors take the hue of the accent and keep their own lightness
    const take = (hex: string, minSat: number) => {
      const [, s, l] = toHsl(hex);
      return fromHsl([ah, as < 0.05 ? 0 : Math.max(Math.min(s, as), minSat * as), l]);
    };
    return {
      bg: take(colors.bg, 0.25),
      surface: take(colors.surface, 0.25),
      line: take(colors.line, 0.35),
      fg: take(colors.fg, 0.15),
      muted: take(colors.muted, 0.15),
      accent: t.c1,
    };
  }
  return { ...colors };
}

/** filter for the ambient effects (and the ornament) of a tinted style */
function styleTintFilter(skin: Skin | undefined, t: OrnTint): string {
  if (!skin?.colors) return "none";
  if (t.mode === "hue") {
    const sat = Math.min(200, Math.max(0, t.sat)) / 100;
    return `hue-rotate(${Math.round(t.hue)}deg) saturate(${sat})`;
  }
  if (t.mode === "color") {
    const [r, g, b] = hexRgb(t.c1);
    const hi = "#" + [r, g, b].map((v) => Math.round((v + (1 - v) * 0.7) * 255).toString(16).padStart(2, "0")).join("");
    ensureDuoFilter("atz-style-duo", t.c1, hi);
    return "url(#atz-style-duo)";
  }
  return "none";
}

/** two colors for the card of a style in the settings */
export function stylePreview(skin: Skin): [string, string] {
  if (!skin.colors) return skin.preview;
  const c = tintColors(skin.colors, styleTintFor(skin.id));
  return [c.surface, c.accent];
}

// applies the style colors (with the player's color setting)
function applyStyleColors(skin: Skin) {
  if (skin.colors) setTheme(tintColors(skin.colors, styleTintFor(skin.id)), null);
}
export const ORNAMENTS: Array<{ id: string; fr: string; en: string }> = [
  { id: "none", fr: "Aucun", en: "None" },
  { id: "line", fr: "Double ligne", en: "Double line" },
  { id: "brackets", fr: "Équerres", en: "Brackets" },
  { id: "angles", fr: "Coins anguleux", en: "Sharp corners" },
  { id: "vines", fr: "Lianes", en: "Vines" },
  { id: "filigree", fr: "Filigrane", en: "Filigree" },
  { id: "pack-darkred", fr: "Pack Dark Red", en: "Dark Red pack" },
  { id: "pack-neon", fr: "Pack Neon", en: "Neon pack" },
  { id: "pack-cyber", fr: "Pack Cyberpunk", en: "Cyberpunk pack" },
  { id: "pack-minimal", fr: "Pack Minimaliste", en: "Minimalist pack" },
  { id: "pack-nature", fr: "Pack Nature", en: "Nature pack" },
  { id: "pack-glass", fr: "Pack Glass", en: "Glass pack" },
  { id: "orn-neon-arcade", fr: "Arcade", en: "Arcade" },
  { id: "orn-neon-eclair", fr: "Éclair", en: "Lightning" },
  { id: "orn-cyber-hazard", fr: "Hazard", en: "Hazard" },
  { id: "orn-cyber-circuit", fr: "Circuit imprimé", en: "Circuit board" },
  { id: "orn-darkred-crocs", fr: "Crocs", en: "Fangs" },
  { id: "orn-darkred-epines", fr: "Épines", en: "Thorns" },
  { id: "orn-minimal-regle", fr: "Règle", en: "Ruler" },
  { id: "orn-minimal-arc", fr: "Arc", en: "Arc" },
  { id: "orn-nature-fleurs", fr: "Fleurs", en: "Flowers" },
  { id: "orn-nature-bois", fr: "Bois noueux", en: "Gnarled wood" },
  { id: "orn-glass-halo", fr: "Halo irisé", en: "Iridescent halo" },
  { id: "orn-glass-givre", fr: "Givre", en: "Frost" },
];
// ornaments offered for each style ("custom" gets all of them)
export const STYLE_ORNAMENTS: Record<string, string[]> = {
  classic: ["none", "line", "brackets", "angles", "vines", "filigree"],
  neon: ["pack-neon", "orn-neon-arcade", "orn-neon-eclair", "none"],
  darkred: ["pack-darkred", "orn-darkred-crocs", "orn-darkred-epines", "none"],
  cyber: ["pack-cyber", "orn-cyber-hazard", "orn-cyber-circuit", "none"],
  minimal: ["pack-minimal", "orn-minimal-regle", "orn-minimal-arc", "none"],
  nature: ["pack-nature", "orn-nature-fleurs", "orn-nature-bois", "none"],
  glass: ["pack-glass", "orn-glass-halo", "orn-glass-givre", "none"],
};
export function styleOrnaments(skin: string): string[] {
  if (SKINS.find((s) => s.id === skin)?.custom) return ORNAMENTS.map((o) => o.id);
  return STYLE_ORNAMENTS[skin] ?? ["none"];
}
/** ornament shown for a style: the one picked, else the style's own one */
export function ornamentFor(skin: string): string {
  const list = styleOrnaments(skin);
  const picked = skinFx.value.ornaments[skin];
  if (picked && list.includes(picked)) return picked;
  return SKINS.find((s) => s.id === skin)?.ornament ?? "none";
}
export function setOrnament(id: string) {
  setSkinFx({ ornaments: { ...skinFx.value.ornaments, [activeSkin.value]: id } });
}
/** effects offered for a style ("custom" gets all of them) */
export function styleAmbients(skin: string): Array<{ id: string; fr: string; en: string }> {
  if (SKINS.find((s) => s.id === skin)?.custom) return Object.values(SKIN_AMBIENTS).flat();
  return SKIN_AMBIENTS[skin] ?? [];
}

// 3 animated effects per style (classic has none); one is on at a time
export const SKIN_AMBIENTS: Record<string, Array<{ id: string; fr: string; en: string }>> = {
  neon: [
    { id: "neon-scan", fr: "Balayage néon", en: "Neon sweep" },
    { id: "neon-grid", fr: "Grille synthwave", en: "Synthwave grid" },
    { id: "neon-motes", fr: "Particules néon", en: "Neon motes" },
  ],
  cyber: [
    { id: "cyber-rain", fr: "Pluie de code", en: "Code rain" },
    { id: "cyber-glitch", fr: "Glitch", en: "Glitch" },
    { id: "cyber-holo", fr: "Scan holographique", en: "Holo scan" },
  ],
  darkred: [
    { id: "red-embers", fr: "Braises", en: "Embers" },
    { id: "red-mist", fr: "Brume sanglante", en: "Blood mist" },
    { id: "red-ash", fr: "Cendres et pouls", en: "Ash and pulse" },
  ],
  minimal: [
    { id: "min-trace", fr: "Trait lumineux", en: "Light trace" },
    { id: "min-dust", fr: "Poussière", en: "Dust" },
    { id: "min-sheen", fr: "Reflet", en: "Sheen" },
  ],
  nature: [
    { id: "nat-fireflies", fr: "Lucioles", en: "Fireflies" },
    { id: "nat-leaves", fr: "Feuilles", en: "Leaves" },
    { id: "nat-rays", fr: "Rayons de soleil", en: "Sun rays" },
  ],
  glass: [
    { id: "glass-aurora", fr: "Aurore", en: "Aurora" },
    { id: "glass-bubbles", fr: "Bulles", en: "Bubbles" },
    { id: "glass-prism", fr: "Reflets prismatiques", en: "Prism glints" },
  ],
};
const FX_KEY = "atziri-skin-fx";
export const DEFAULT_FX: SkinFx = {
  intensity: 100,
  opacity: 100,
  ornaments: {},
  speed: 100,
  fps: 30,
  ambients: {},
  ornTints: {},
  styleTints: {},
};

function loadFx(): SkinFx {
  try {
    const v = JSON.parse(localStorage.getItem(FX_KEY) ?? "null");
    if (v && typeof v === "object") {
      const fx: SkinFx = { ...DEFAULT_FX, ...v };
      // older versions kept one shared effect ("embers", ...): dropped
      delete (fx as unknown as Record<string, unknown>).ambient;
      // older versions kept one ornament for every style: dropped
      delete (fx as unknown as Record<string, unknown>).ornament;
      if (!fx.ambients || typeof fx.ambients !== "object") fx.ambients = {};
      if (!fx.ornaments || typeof fx.ornaments !== "object") fx.ornaments = {};
      if (!fx.ornTints || typeof fx.ornTints !== "object") fx.ornTints = {};
      if (!fx.styleTints || typeof fx.styleTints !== "object") fx.styleTints = {};
      if (![0, 30, 60].includes(fx.fps)) fx.fps = DEFAULT_FX.fps;
      return fx;
    }
  } catch {
    // unreadable storage
  }
  return { ...DEFAULT_FX };
}

export const skinFx = shallowRef<SkinFx>(loadFx());

function applyFx() {
  const root = document.documentElement;
  const fx = skinFx.value;
  root.style.setProperty("--fx", String(Math.min(100, Math.max(0, fx.intensity)) / 100));
  const opacity = Math.min(100, Math.max(30, fx.opacity));
  root.style.setProperty("--atz-frame-opacity", String(opacity / 100));
  if (opacity < 100) root.dataset.atzFrameFade = "";
  else delete root.dataset.atzFrameFade;
  const orn = ornamentFor(activeSkin.value);
  root.dataset.atzOrn = orn;
  const tint = ornTintFor(activeSkin.value);
  const styleFilter = styleTintFilter(
    SKINS.find((s) => s.id === activeSkin.value),
    styleTintFor(activeSkin.value),
  );
  if (styleFilter !== "none") {
    root.dataset.atzStyleTint = "";
    root.style.setProperty("--atz-style-filter", styleFilter);
  } else {
    delete root.dataset.atzStyleTint;
    root.style.removeProperty("--atz-style-filter");
  }
  // the ornament has its own color, or follows the style (pictures only: drawn ones use the accent)
  let filter = ornTintFilter(tint);
  if (filter === "none" && /^(pack|orn)-/.test(orn)) filter = styleFilter;
  if (orn !== "none" && filter !== "none") {
    root.dataset.atzOrnTint = tint.mode === "none" ? "style" : tint.mode;
    root.style.setProperty("--atz-orn-filter", filter);
  } else {
    delete root.dataset.atzOrnTint;
    root.style.removeProperty("--atz-orn-filter");
  }
  const known = styleAmbients(activeSkin.value).map((a) => a.id);
  // one effect at a time (older versions allowed several: the last one wins)
  const on = (fx.ambients[activeSkin.value] ?? []).filter((id) => known.includes(id)).slice(-1);
  if (on.length) root.dataset.atzAmbient = on.join(" ");
  else delete root.dataset.atzAmbient;
  root.style.setProperty("--atz-amb-speed", String(Math.min(300, Math.max(25, fx.speed)) / 100));
  applyFpsCap();
}

// ---- images per second of the ambient effects ----
// The overlay is a transparent window over the game: every new image costs.
// With a limit, the effect animations are paused and moved forward by a timer
// (30 or 60 times a second) instead of being redrawn at every screen refresh
// (up to 144 or more on fast screens).
const seeked = new WeakMap<Animation, { base: number; t0: number }>();
let fpsTimer = 0;
let fpsRate = 0;

type NamedAnimation = Animation & { animationName?: string };
function effectAnimations(): NamedAnimation[] {
  const doc = document as Document & { getAnimations?: () => Animation[] };
  return (doc.getAnimations?.() ?? []).filter((a: NamedAnimation) => !!a.animationName?.startsWith("atzA-"));
}

function fpsTick() {
  const now = performance.now();
  for (const a of effectAnimations()) {
    let st = seeked.get(a);
    if (!st) {
      st = { base: Number(a.currentTime ?? 0), t0: now };
      seeked.set(a, st);
      a.pause();
    }
    a.currentTime = st.base + (now - st.t0);
  }
}

function applyFpsCap() {
  if (typeof document === "undefined") return;
  const fps = skinFx.value.fps;
  const on = fps > 0 && !!document.documentElement.dataset.atzAmbient;
  if (on && fpsRate === fps) return;
  if (fpsTimer) {
    window.clearInterval(fpsTimer);
    fpsTimer = 0;
    fpsRate = 0;
  }
  if (on) {
    fpsRate = fps;
    fpsTimer = window.setInterval(fpsTick, 1000 / fps);
  } else {
    // no limit: the effects run again on their own
    for (const a of effectAnimations()) {
      if (seeked.has(a)) {
        seeked.delete(a);
        a.play();
      }
    }
  }
}

export function setSkinFx(next: Partial<SkinFx>) {
  skinFx.value = { ...skinFx.value, ...next };
  try {
    localStorage.setItem(FX_KEY, JSON.stringify(skinFx.value));
  } catch {
    // storage unavailable
  }
  if (next.styleTints) {
    const skin = SKINS.find((s) => s.id === activeSkin.value);
    if (skin) applyStyleColors(skin);
  }
  applyFx();
}

// background pictures (Shift + Space page and Ctrl + D window) of a style
function applySkinBackground(skin: Skin, fromClassic: boolean) {
  try {
    if (skin.background) {
      if (fromClassic && !localStorage.getItem(PREV_BG_KEY)) {
        localStorage.setItem(PREV_BG_KEY, JSON.stringify({ hub: backgrounds.value.hub, price: backgrounds.value.price }));
      }
      setBackground("hub", skin.background);
      setBackground("price", skin.background);
    } else {
      const raw = localStorage.getItem(PREV_BG_KEY);
      if (raw) {
        let prev: { hub?: string; price?: string } = {};
        try {
          prev = JSON.parse(raw);
        } catch {
          prev = { hub: raw }; // older format: only the hub picture
        }
        if (typeof prev.hub === "string") setBackground("hub", prev.hub);
        if (typeof prev.price === "string") setBackground("price", prev.price);
      }
      localStorage.removeItem(PREV_BG_KEY);
    }
  } catch {
    // storage unavailable
  }
}

/** picks an ambient effect of the current style (one at a time); clicking it again turns it off */
export function toggleAmbient(id: string) {
  const skin = activeSkin.value;
  const list = skinFx.value.ambients[skin] ?? [];
  const next = list.includes(id) ? [] : [id];
  setSkinFx({ ambients: { ...skinFx.value.ambients, [skin]: next } });
}

export function setSkin(id: string) {
  const skin = SKINS.find((s) => s.id === id);
  if (!skin) return;
  if (id === activeSkin.value) {
    // clicking the current style again puts its background back
    if (skin.background) applySkinBackground(skin, false);
    return;
  }
  // classic and custom use the player's own colors and backgrounds
  const wasClassic = !SKINS.find((s) => s.id === activeSkin.value)?.colors;
  try {
    // kept until the player goes back to classic (custom can sit in between)
    if (wasClassic && skin.colors && !localStorage.getItem(PREV_KEY)) {
      localStorage.setItem(PREV_KEY, JSON.stringify({ colors: themeColors.value, active: activeTheme.value }));
    }
  } catch {
    // storage unavailable
  }
  if (skin.custom) {
    // custom: the current colors stay
  } else if (skin.colors) {
    applyStyleColors(skin);
  } else {
    // back to the classic look: the player's own colors come back
    try {
      const prev = JSON.parse(localStorage.getItem(PREV_KEY) ?? "null");
      if (prev?.colors) setTheme(prev.colors, prev.active ?? null);
      localStorage.removeItem(PREV_KEY);
    } catch {
      // unreadable storage: keep current colors
    }
  }
  // matching background pictures (the player can still pick other ones)
  if (!skin.custom) applySkinBackground(skin, wasClassic);
  activeSkin.value = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // storage unavailable
  }
  applySkin(id);
}

const BG_SYNC_KEY = "atziri-skin-bg-synced";

export function initSkin() {
  applySkin(activeSkin.value);
  // a style picked with an older version gets its background once
  try {
    if (!localStorage.getItem(BG_SYNC_KEY)) {
      localStorage.setItem(BG_SYNC_KEY, "1");
      const skin = SKINS.find((s) => s.id === activeSkin.value);
      if (skin?.background && backgrounds.value.hub !== skin.background) {
        if (!localStorage.getItem(PREV_BG_KEY)) {
          localStorage.setItem(PREV_BG_KEY, JSON.stringify({ hub: backgrounds.value.hub, price: backgrounds.value.price }));
        }
        applySkinBackground(skin, false);
      }
    }
  } catch {
    // storage unavailable
  }
  // other windows (detached Shift + Space page) follow the change
  window.addEventListener("storage", (e) => {
    if (e.key === FX_KEY) {
      skinFx.value = loadFx();
      applyFx();
    }
    if (e.key === "atziri-theme") {
      try {
        const colors = JSON.parse(e.newValue ?? "null");
        if (colors && typeof colors === "object") {
          themeColors.value = { ...themeColors.value, ...colors };
          applyTheme(themeColors.value);
        }
      } catch {
        // unreadable storage
      }
    }
    if (e.key === KEY) {
      activeSkin.value = load();
      applySkin(activeSkin.value);
      try {
        const colors = JSON.parse(localStorage.getItem("atziri-theme") ?? "null");
        if (colors && typeof colors === "object") {
          themeColors.value = { ...themeColors.value, ...colors };
          applyTheme(themeColors.value);
        }
      } catch {
        // unreadable storage
      }
    }
  });
}
