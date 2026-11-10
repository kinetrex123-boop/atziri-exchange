// Atziri Exchange: icons for the crafting bases of the "Suivi craft" tab
// (one group of items each, shown with the game's own item art)

export interface BaseIcon {
  id: string;
  fr: string;
  en: string;
  img: string;
}

const ART = "https://web.poecdn.com/gen/image/";

export const CRAFT_BASE_ICONS: BaseIcon[] = [
  {
    id: "onehand",
    fr: "Armes à une main",
    en: "One-handed weapons",
    img: ART + "WzI1LDE0LHsiZiI6IjJESXRlbXMvV2VhcG9ucy9PbmVIYW5kV2VhcG9ucy9PbmVIYW5kU3dvcmRzL0Jhc2V0eXBlcy8xSFN3b3JkMTIiLCJ3IjoyLCJoIjozLCJzY2FsZSI6MSwicmVhbG0iOiJwb2UyIn1d/dcf3421daa/1HSword12.png",
  },
  {
    id: "twohand",
    fr: "Armes à deux mains",
    en: "Two-handed weapons",
    img: ART + "WzI1LDE0LHsiZiI6IjJESXRlbXMvV2VhcG9ucy9Ud29IYW5kV2VhcG9ucy9Ud29IYW5kTWFjZXMvQmFzZXR5cGVzLzJITWFjZTAzIiwidyI6MiwiaCI6NCwic2NhbGUiOjEsInJlYWxtIjoicG9lMiJ9XQ/8dc1317a4b/2HMace03.png",
  },
  {
    id: "offhand",
    fr: "Main secondaire",
    en: "Off-hand",
    img: ART + "WzI1LDE0LHsiZiI6IjJESXRlbXMvT2ZmaGFuZC9TaGllbGRzL1Rvd2VyMDIiLCJ3IjoyLCJoIjo0LCJzY2FsZSI6MSwicmVhbG0iOiJwb2UyIn1d/656c8bbd9a/Tower02.png",
  },
  {
    id: "armour",
    fr: "Pièces d'armure",
    en: "Armour pieces",
    img: ART + "WzI1LDE0LHsiZiI6IjJESXRlbXMvQXJtb3Vycy9Cb2R5QXJtb3Vycy9CYXNldHlwZXMvQm9keVN0ckRleDA4IiwidyI6MiwiaCI6Mywic2NhbGUiOjEsInJlYWxtIjoicG9lMiJ9XQ/e3f1f20a56/BodyStrDex08.png",
  },
  {
    id: "jewellery",
    fr: "Accessoires",
    en: "Jewellery",
    img: ART + "WzI1LDE0LHsiZiI6IjJESXRlbXMvUmluZ3MvQmFzZXR5cGVzL0FtZXRoeXN0UmluZyIsInciOjEsImgiOjEsInNjYWxlIjoxLCJyZWFsbSI6InBvZTIifV0/352427171d/AmethystRing.png",
  },
  {
    id: "belt",
    fr: "Ceintures",
    en: "Belts",
    img: ART + "WzI1LDE0LHsiZiI6IjJESXRlbXMvQmVsdHMvQmFzZXR5cGVzL0JlbHQwOCIsInciOjIsImgiOjEsInNjYWxlIjoxLCJyZWFsbSI6InBvZTIifV0/e061fc0043/Belt08.png",
  },
  {
    id: "jewel",
    fr: "Joyaux",
    en: "Jewels",
    img: ART + "WzI1LDE0LHsiZiI6IjJESXRlbXMvSmV3ZWxzL1J1YnlKZXdlbCIsInciOjEsImgiOjEsInNjYWxlIjoxLCJyZWFsbSI6InBvZTIifV0/8ef1a48ec8/RubyJewel.png",
  },
];

// icons of the earlier versions, now grouped
const OLD_IDS: Record<string, string> = {
  weapon: "onehand", magic: "onehand", mace: "onehand", sword: "onehand", axe: "onehand",
  dagger: "onehand", flail: "onehand", wand: "onehand", sceptre: "onehand", spear: "onehand",
  quarterstaff: "twohand", bow: "twohand", crossbow: "twohand", staff: "twohand", talisman: "twohand",
  shield: "offhand", buckler: "offhand", focus: "offhand", quiver: "offhand",
  helmet: "armour", body: "armour", gloves: "armour", boots: "armour",
  ring: "jewellery", amulet: "jewellery", charm: "jewel",
};

export function baseIcon(id: string | undefined): BaseIcon {
  const wanted = id && OLD_IDS[id] ? OLD_IDS[id] : id;
  return (
    CRAFT_BASE_ICONS.find((i) => i.id === wanted) ??
    CRAFT_BASE_ICONS.find((i) => i.id === "armour")!
  );
}
