// Atziri Exchange: small icons for the crafting bases of the "Suivi craft" tab
// (one per PoE2 item class, simple drawings on a 24 x 24 grid)

export interface BaseIcon {
  id: string;
  fr: string;
  en: string;
  path: string;
}

export const CRAFT_BASE_ICONS: BaseIcon[] = [
  { id: "weapon", fr: "Arme physique", en: "Physical weapon", path: '<path d="M20 4v3L10 17l-3-3L17 4z"/><path d="M5 13l6 6M4 20l3-3"/>' },
  { id: "magic", fr: "Arme magique", en: "Caster weapon", path: '<path d="M5 19l9-9"/><path d="M17 3l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7z"/>' },
  { id: "shield", fr: "Bouclier", en: "Shield", path: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>' },
  { id: "buckler", fr: "Targe", en: "Buckler", path: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/>' },
  { id: "focus", fr: "Focus", en: "Focus", path: '<circle cx="12" cy="9" r="5"/><path d="M12 14v6M8 20h8"/>' },
  { id: "quiver", fr: "Carquois", en: "Quiver", path: '<path d="M8 9h8l-1 12H9z"/><path d="M12 9V2M10 9V4M14 9V4"/>' },
  { id: "helmet", fr: "Casque", en: "Helmet", path: '<path d="M4 15a8 8 0 0116 0v5h-5v-4H9v4H4z"/><path d="M12 7v5"/>' },
  { id: "body", fr: "Armure", en: "Body armour", path: '<path d="M8 3L4 6v6l3 1v8h10v-8l3-1V6l-4-3"/><path d="M8 3c1.5 2 6.5 2 8 0"/><path d="M12 6v15"/>' },
  { id: "gloves", fr: "Gants", en: "Gloves", path: '<path d="M8 21v-5l-3-4 1.5-1.5L9 13V6a1 1 0 012 0v4V4a1 1 0 012 0v6V5a1 1 0 012 0v6V7a1 1 0 012 0v8l-2 6z"/>' },
  { id: "boots", fr: "Bottes", en: "Boots", path: '<path d="M7 3h6v9l6 3v4H5V3z"/><path d="M5 19v2h14v-2"/>' },
  { id: "belt", fr: "Ceinture", en: "Belt", path: '<rect x="2" y="9" width="20" height="6" rx="1"/><rect x="9" y="8" width="6" height="8" rx="1"/>' },
  { id: "ring", fr: "Anneau", en: "Ring", path: '<circle cx="12" cy="14" r="6"/><path d="M10 5l2-3 2 3-2 2z"/>' },
  { id: "amulet", fr: "Amulette", en: "Amulet", path: '<path d="M6 3c0 5 3 8 6 9 3-1 6-4 6-9"/><circle cx="12" cy="16.5" r="3.5"/>' },
  { id: "jewel", fr: "Joyau", en: "Jewel", path: '<path d="M12 3l7.5 4.5v9L12 21l-7.5-4.5v-9z"/><path d="M12 8l3.5 2v4L12 16l-3.5-2v-4z"/>' },
];

// icons of the first version, now grouped
const OLD_IDS: Record<string, string> = {
  mace: "weapon", flail: "weapon", quarterstaff: "weapon", spear: "weapon", sword: "weapon",
  axe: "weapon", dagger: "weapon", bow: "weapon", crossbow: "weapon", talisman: "weapon",
  wand: "magic", staff: "magic", sceptre: "magic", charm: "jewel",
};

/** SVG markup of an icon (fine golden line, shown inside a medallion) */
export function baseIconSvg(id: string | undefined): string {
  const wanted = id && OLD_IDS[id] ? OLD_IDS[id] : id;
  const icon = CRAFT_BASE_ICONS.find((i) => i.id === wanted) ?? CRAFT_BASE_ICONS.find((i) => i.id === "body")!;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icon.path}</svg>`;
}
