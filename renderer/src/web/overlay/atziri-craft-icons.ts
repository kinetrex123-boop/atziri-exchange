// Atziri Exchange: small icons for the crafting bases of the "Suivi craft" tab
// (one per PoE2 item class, simple drawings on a 24 x 24 grid)

export interface BaseIcon {
  id: string;
  fr: string;
  en: string;
  path: string;
}

export const CRAFT_BASE_ICONS: BaseIcon[] = [
  { id: "mace", fr: "Masse", en: "Mace", path: '<path d="M4 20l9-9"/><circle cx="16" cy="8" r="4"/><path d="M16 2v2M22 8h-2M20.3 3.7l-1.4 1.4"/>' },
  { id: "flail", fr: "Fléau", en: "Flail", path: '<path d="M4 20l6-6"/><path d="M10.5 13.5l1.5-1.5M13 11l1.5-1.5"/><circle cx="17.5" cy="6.5" r="3"/>' },
  { id: "quarterstaff", fr: "Bâton de combat", en: "Quarterstaff", path: '<path d="M4 20L20 4"/><path d="M6.5 15.5l2 2M15.5 6.5l2 2M11 11l2 2"/>' },
  { id: "spear", fr: "Lance", en: "Spear", path: '<path d="M4 20l9-9"/><path d="M20 4l-1.5 6.5L14 13l-3-3 2.5-4.5z"/>' },
  { id: "sword", fr: "Épée", en: "Sword", path: '<path d="M20 4v3L10 17l-3-3L17 4z"/><path d="M5 13l6 6M4 20l3-3"/>' },
  { id: "axe", fr: "Hache", en: "Axe", path: '<path d="M5 20L16 9"/><path d="M13 5c3-1 6 1 7 5l-4 2-5-5z"/>' },
  { id: "dagger", fr: "Dague", en: "Dagger", path: '<path d="M19 4l-1 4-6 6-2-2 6-6z"/><path d="M8 11l5 5M5 19l3-3"/>' },
  { id: "bow", fr: "Arc", en: "Bow", path: '<path d="M7 3c7 4 7 14 0 18"/><path d="M7 3v18"/>' },
  { id: "crossbow", fr: "Arbalète", en: "Crossbow", path: '<path d="M3 9c5-4 13-4 18 0"/><path d="M3 9l9 3 9-3"/><path d="M12 5v16M9 21h6"/>' },
  { id: "wand", fr: "Baguette", en: "Wand", path: '<path d="M5 19l9-9"/><path d="M17 3l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7z"/>' },
  { id: "staff", fr: "Bâton", en: "Staff", path: '<path d="M8 21l7.5-13"/><circle cx="17" cy="5" r="2.5"/>' },
  { id: "sceptre", fr: "Sceptre", en: "Sceptre", path: '<path d="M12 10v11M9 14h6"/><path d="M12 2l3 4-3 4-3-4z"/>' },
  { id: "talisman", fr: "Talisman", en: "Talisman", path: '<path d="M8 3h8l-1 6 2 3-2 3 1 6H8l1-6-2-3 2-3z"/><circle cx="12" cy="9" r="1"/>' },
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
  { id: "charm", fr: "Charme", en: "Charm", path: '<circle cx="12" cy="13" r="7"/><path d="M12 3v3M12 9v8M8 13h8"/>' },
];

/** SVG markup of an icon (fine golden line) */
export function baseIconSvg(id: string | undefined): string {
  const icon = CRAFT_BASE_ICONS.find((i) => i.id === id) ?? CRAFT_BASE_ICONS.find((i) => i.id === "body")!;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icon.path}</svg>`;
}
