// Atziri Exchange: background images of the Shift + Space page and of the
// price check window. Built-in images, none, or an image imported from the PC
// (stored by the app in its "uploads" folder).
import { shallowRef } from "vue";

export type BgSlot = "hub" | "price";

export const BUILTIN_BACKGROUNDS: Array<{ id: string; label: string; url: string }> = [
  { id: "temple", label: "Temple d'Atziri", url: "/images/atziri-bg.jpg" },
  { id: "reine", label: "Reine Atziri", url: "/images/atziri-reine.jpg" },
];

const DEFAULTS: Record<BgSlot, string> = { hub: "temple", price: "temple" };
const STORAGE_KEY = "atziri-backgrounds";

function load(): Record<BgSlot, string> {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved && typeof saved === "object") return { ...DEFAULTS, ...saved };
  } catch {
    // ignore unreadable storage
  }
  return { ...DEFAULTS };
}

/** "temple" | "reine" | "none" | "upload:<file name>" for each slot */
export const backgrounds = shallowRef<Record<BgSlot, string>>(load());

export function backgroundUrl(value: string): string | null {
  if (value === "none") return null;
  if (value.startsWith("upload:")) {
    return `/uploads/${encodeURIComponent(value.slice("upload:".length))}`;
  }
  return BUILTIN_BACKGROUNDS.find((b) => b.id === value)?.url ?? null;
}

function apply() {
  const root = document.documentElement.style;
  for (const slot of ["hub", "price"] as BgSlot[]) {
    const url = backgroundUrl(backgrounds.value[slot]);
    root.setProperty(`--atz-${slot}-bg`, url ? `url("${url}")` : "none");
  }
}

export function setBackground(slot: BgSlot, value: string) {
  backgrounds.value = { ...backgrounds.value, [slot]: value };
  apply();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backgrounds.value));
  } catch {
    // ignore unavailable storage
  }
}

// images imported by the player, kept to be picked again later
const UPLOADS_KEY = "atziri-bg-uploads";
function loadUploads(): string[] {
  let list: string[] = [];
  try {
    const v = JSON.parse(localStorage.getItem(UPLOADS_KEY) ?? "[]");
    if (Array.isArray(v)) list = v.filter((x) => typeof x === "string");
  } catch {
    // unreadable storage
  }
  // images chosen before the list existed
  for (const value of Object.values(backgrounds.value)) {
    if (value.startsWith("upload:") && !list.includes(value)) list.push(value);
  }
  return list;
}
/** "upload:<file name>" of every imported image */
export const bgUploads = shallowRef<string[]>(loadUploads());
function saveUploads(list: string[]) {
  bgUploads.value = list;
  try {
    localStorage.setItem(UPLOADS_KEY, JSON.stringify(list));
  } catch {
    // ignore unavailable storage
  }
}
export function addUpload(value: string) {
  if (!bgUploads.value.includes(value)) saveUploads([...bgUploads.value, value]);
}
/** removes an imported image from the list (the built-in ones stay) */
export function removeUpload(value: string) {
  saveUploads(bgUploads.value.filter((v) => v !== value));
  for (const slot of ["hub", "price"] as BgSlot[]) {
    if (backgrounds.value[slot] === value) setBackground(slot, DEFAULTS[slot]);
  }
}

export function initBackgrounds() {
  apply();
}
