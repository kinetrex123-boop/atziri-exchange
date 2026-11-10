// Atziri Exchange: name and icon of the overlay chosen in Atziri réglage.
// The main process applies them to the tray icon and the detached window;
// the Shift + Space page shows the icon as its logo.
import { shallowRef } from "vue";

const CDN = "https://web.poecdn.com/gen/image/";
export const BRAND_ICON_PRESETS: Array<{ id: string; fr: string; en: string; url: string }> = [
  { id: "default", fr: "Atziri", en: "Atziri", url: "/icon.png" },
  { id: `url:${CDN}WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQ3VycmVuY3lNb2RWYWx1ZXMiLCJzY2FsZSI6MSwicmVhbG0iOiJwb2UyIn1d/2986e220b3/CurrencyModValues.png`, fr: "Orbe divin", en: "Divine Orb", url: "" },
  { id: `url:${CDN}WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQ3VycmVuY3lBZGRNb2RUb1JhcmUiLCJzY2FsZSI6MSwicmVhbG0iOiJwb2UyIn1d/ad7c366789/CurrencyAddModToRare.png`, fr: "Orbe exalté", en: "Exalted Orb", url: "" },
  { id: `url:${CDN}WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQ3VycmVuY3lSZXJvbGxSYXJlIiwic2NhbGUiOjEsInJlYWxtIjoicG9lMiJ9XQ/c0ca392a78/CurrencyRerollRare.png`, fr: "Orbe du chaos", en: "Chaos Orb", url: "" },
  { id: `url:${CDN}WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQ3VycmVuY3lEdXBsaWNhdGUiLCJzY2FsZSI6MSwicmVhbG0iOiJwb2UyIn1d/26bc31680e/CurrencyDuplicate.png`, fr: "Miroir", en: "Mirror", url: "" },
  { id: `url:${CDN}WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQ3VycmVuY3lWYWFsIiwic2NhbGUiOjEsInJlYWxtIjoicG9lMiJ9XQ/72bc84396c/CurrencyVaal.png`, fr: "Orbe vaal", en: "Vaal Orb", url: "" },
].map((p) => ({ ...p, url: p.url || p.id.slice("url:".length) }));

export interface Brand {
  name: string;
  icon: string;
}
const KEY = "atziri-brand";
const DEFAULT: Brand = { name: "Atziri Exchange", icon: "default" };

function load(): Brand {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v && typeof v === "object") return { ...DEFAULT, ...v };
  } catch {
    // unreadable storage
  }
  return { ...DEFAULT };
}

export const brand = shallowRef<Brand>(load());

window.addEventListener("storage", (e) => {
  if (e.key === KEY) brand.value = load();
});

/** image shown for an icon choice */
export function brandIconUrl(icon: string): string {
  if (icon.startsWith("upload:")) return `/uploads/${encodeURIComponent(icon.slice("upload:".length))}`;
  if (icon.startsWith("url:")) return icon.slice("url:".length);
  return "/icon.png";
}

export async function setBrand(next: Partial<Brand>) {
  brand.value = { ...brand.value, ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(brand.value));
  } catch {
    // storage unavailable
  }
  try {
    const q = new URLSearchParams({ name: brand.value.name, icon: brand.value.icon });
    await fetch(`/atziri-brand?${q.toString()}`, { method: "POST" });
  } catch {
    // dev mode: no main process
  }
}
