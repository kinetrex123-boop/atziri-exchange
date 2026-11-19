// Atziri Exchange: "Well of Souls" tab. From a copied rare item (Ctrl + D),
// lists the modifiers the Well of Souls can offer after a desecration with an
// Abyssal bone: item class and base tags, item level, bone, omen, free prefix
// / suffix, families already on the item.
// Data: public/data/atziri/well-of-souls.json (tools/atziri-well-data.mjs).
import { shallowRef } from "vue";
import { CLIENT_STRINGS as _$, STAT_BY_REF } from "@/assets/data";
import { ItemRarity, type ParsedItem } from "@/parser";
import { ModifierType } from "@/parser/modifiers";
import { isModInfoLine, parseModInfoLine } from "@/parser/advanced-mod-desc";

export interface WellLine {
  t: string;
  r: string | null;
  mi: number; // matcher with the same wording ("increased" / "reduced")
  ng?: true; // that matcher is the negated one
  vl?: number; // that matcher is for a fixed value
  v: Array<[number, number]>;
}
export interface WellMod {
  id: string;
  n: string;
  d: "i" | "d";
  g: "p" | "s";
  l: number;
  f: string;
  gr: string[];
  sw: Array<[string, number]>;
  lord?: "Amanamu" | "Ulaman" | "Kurgal";
  tg: string[];
  w: number | null;
  lines: WellLine[];
}
interface WellData {
  generatedAt: string;
  bases: Record<string, { c: string; t: string[] }>;
  mods: WellMod[];
}

export type Bone = "gnawed" | "preserved" | "ancient";
export type Omen = "none" | "liege" | "sovereign" | "blackblooded";

export const OMEN_LORD: Record<Exclude<Omen, "none">, WellMod["lord"]> = {
  liege: "Amanamu",
  sovereign: "Ulaman",
  blackblooded: "Kurgal",
};

/** weight given to an ordinary modifier poe2db has no weight for */
const DEFAULT_WEIGHT = 1000;
/** item level assumed when the copied text has none */
const DEFAULT_ILVL = 82;

let dataPromise: Promise<WellData> | undefined;
export function loadWellData(): Promise<WellData> {
  dataPromise ??= fetch("/data/atziri/well-of-souls.json").then((r) => {
    if (!r.ok) throw new Error(`well-of-souls.json: HTTP ${r.status}`);
    return r.json() as Promise<WellData>;
  });
  return dataPromise;
}

export interface WellTier {
  mod: WellMod;
  tier: number; // 1 = best
  weight: number;
  share: number; // share of this tier inside its pool (0-1)
  text: string[]; // lines in the game language
}
export interface WellFamily {
  key: string;
  g: "p" | "s";
  lord?: WellMod["lord"];
  tiers: WellTier[]; // reachable tiers, best first
  maxTier: number; // number of tiers of this family on the base
  share: number; // sum of the reachable tiers
  tags: string[];
}
export interface WellResult {
  itemName: string;
  baseName: string;
  itemClass: string;
  ilvl: number;
  ilvlKnown: boolean;
  prefixes: number;
  suffixes: number;
  maxAffixes: number;
  veiled: { p: number; s: number };
  sides: Array<"p" | "s">;
  presentGroups: string[];
  warnings: string[];
  ordinary: WellFamily[];
  desecrated: WellFamily[];
  weightsMissing: number;
}

/** first matching tag decides, like the game */
export function spawnWeight(mod: WellMod, tags: Set<string>): number {
  for (const [tag, w] of mod.sw) {
    if (tags.has(tag)) return w;
  }
  return 0;
}

/** tier of every modifier that can spawn with these base tags (1 = best) */
export function tiersForTags(mods: WellMod[], tags: Set<string>) {
  const byFamily = new Map<string, WellMod[]>();
  for (const m of mods) {
    if (spawnWeight(m, tags) <= 0) continue;
    const key = `${m.d}|${m.g}|${m.f}`;
    const list = byFamily.get(key) ?? [];
    list.push(m);
    byFamily.set(key, list);
  }
  const tierOf = new Map<string, { tier: number; count: number }>();
  for (const list of byFamily.values()) {
    list.sort((a, b) => b.l - a.l);
    list.forEach((m, i) => tierOf.set(m.id, { tier: i + 1, count: list.length }));
  }
  return tierOf;
}

/** fills the "#" of a stat text with "(min-max)" values */
function fill(template: string, values: Array<[number, number]>): string {
  let i = 0;
  return template.replace(/#/g, () => {
    const v = values[i++];
    if (!v) return "#";
    return v[0] === v[1] ? String(v[0]) : `(${v[0]}-${v[1]})`;
  });
}

/** modifier lines in the game language when the stat is known */
export function modText(mod: WellMod): string[] {
  return mod.lines.map((line) => {
    if (!line.r) return line.t;
    const stat = STAT_BY_REF(line.r);
    // same wording in the game language: same "negate" / fixed value flags
    const matcher =
      stat?.matchers.find((m) => !!m.negate === !!line.ng && m.value === line.vl) ??
      stat?.matchers[line.mi] ??
      stat?.matchers[0];
    if (!matcher) return line.t;
    // a "+" in front of a positive flat value, like the game
    const text = fill(matcher.string, line.v);
    return /^\+/.test(line.t) && !/^[+-]/.test(text) ? `+${text}` : text;
  });
}

function normRef(ref: string) {
  return ref.replace(/\d+(?:\.\d+)?/g, "#").replace(/\+#/g, "#").toLowerCase();
}

/** prefix / suffix lines of the advanced item text ("{ Prefix Modifier ... }") */
function countAffixes(rawText: string) {
  const out = { p: 0, s: 0, veiledP: 0, veiledS: 0 };
  const lines = rawText.replace(/\r/g, "").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isModInfoLine(line)) {
      let gen: string | undefined;
      try {
        gen = parseModInfoLine(line, ModifierType.Explicit).generation;
      } catch {
        continue;
      }
      if (gen === "prefix") out.p++;
      else if (gen === "suffix") out.s++;
      else continue;
      const next = lines[i + 1]?.trim();
      if (next === _$.VEILED_PREFIX || next === _$.VEILED_SUFFIX) {
        if (gen === "prefix") out.veiledP++;
        else out.veiledS++;
        i++; // line used
      }
    } else if (line.trim() === _$.VEILED_PREFIX) {
      // simple copy (without the advanced lines)
      out.veiledP++;
    } else if (line.trim() === _$.VEILED_SUFFIX) {
      out.veiledS++;
    }
  }
  return out;
}

export async function analyseWell(
  item: ParsedItem,
  bone: Bone,
  omen: Omen,
): Promise<WellResult> {
  const data = await loadWellData();
  const warnings: string[] = [];
  const baseName = item.info.unique?.base ?? item.info.refName;
  const base = data.bases[baseName];
  if (!base) {
    throw new Error("base");
  }
  const tags = new Set([...base.t, "default"]);

  const ilvlKnown = item.itemLevel !== undefined;
  const ilvl = item.itemLevel ?? DEFAULT_ILVL;
  let maxLevel = ilvl;
  if (bone === "gnawed") {
    if (ilvl > 64) warnings.push("gnawed-ilvl");
    maxLevel = Math.min(maxLevel, 64);
  }
  const minLevel = bone === "ancient" ? 40 : 0;
  if (item.rarity !== ItemRarity.Rare) warnings.push("not-rare");
  if (item.isCorrupted) warnings.push("corrupted");

  // affixes on the item, free slots
  const counted = countAffixes(item.rawText);
  const maxAffixes = 3;
  let prefixes = counted.p;
  let suffixes = counted.s;
  if (!prefixes && !suffixes) {
    // simple copy: count the explicit modifiers the parser recognised
    for (const m of item.newMods) {
      if (m.info.generation === "prefix") prefixes++;
      else if (m.info.generation === "suffix") suffixes++;
    }
  }
  let sides: Array<"p" | "s">;
  if (counted.veiledP && !counted.veiledS) sides = ["p"];
  else if (counted.veiledS && !counted.veiledP) sides = ["s"];
  else {
    sides = [];
    if (prefixes < maxAffixes) sides.push("p");
    if (suffixes < maxAffixes) sides.push("s");
    if (!counted.veiledP && !counted.veiledS && !sides.length) warnings.push("full");
  }

  // families already on the item (a modifier group cannot appear twice)
  const presentGroups = new Set<string>();
  const explicit = item.newMods.filter(
    (m) =>
      (m.info.type === ModifierType.Explicit ||
        m.info.type === ModifierType.Fractured ||
        m.info.type === ModifierType.Desecrated ||
        m.info.type === ModifierType.Crafted) &&
      m.stats.length,
  );
  for (const m of explicit) {
    const refs = new Set(m.stats.map((s) => normRef(s.stat.ref)));
    for (const cand of data.mods) {
      if (m.info.generation && cand.g !== (m.info.generation === "prefix" ? "p" : "s")) continue;
      const candRefs = cand.lines.filter((l) => l.r).map((l) => normRef(l.r!));
      if (!candRefs.length || candRefs.length !== refs.size) continue;
      if (!candRefs.every((r) => refs.has(r))) continue;
      if (spawnWeight(cand, tags) <= 0) continue;
      for (const g of cand.gr) presentGroups.add(g);
    }
  }

  // every modifier of the base (to number the tiers), then the reachable ones
  const onBase = data.mods.filter((m) => spawnWeight(m, tags) > 0);
  const tierOf = tiersForTags(data.mods, tags);

  const omenLord = omen === "none" ? undefined : OMEN_LORD[omen];
  let weightsMissing = 0;
  const reachable = onBase.filter((m) => {
    if (!sides.includes(m.g)) return false;
    if (m.l > maxLevel || m.l < minLevel) return false;
    if (m.gr.some((g) => presentGroups.has(g))) return false;
    if (m.lord && omenLord && m.lord !== omenLord) return false;
    return true;
  });

  const build = (pool: WellMod[]): WellFamily[] => {
    const weightOf = (m: WellMod) => {
      if (m.d === "d") return 1; // poe2db / RePoE: no real weight known
      if (m.w == null) {
        weightsMissing++;
        return DEFAULT_WEIGHT;
      }
      return m.w;
    };
    const total = pool.reduce((s, m) => s + weightOf(m), 0) || 1;
    const families = new Map<string, WellFamily>();
    for (const m of pool) {
      const key = `${m.d}|${m.g}|${m.f}`;
      const fam =
        families.get(key) ??
        ({
          key,
          g: m.g,
          lord: m.lord,
          tiers: [],
          maxTier: tierOf.get(m.id)?.count ?? 1,
          share: 0,
          tags: m.tg,
        } as WellFamily);
      const weight = weightOf(m);
      fam.tiers.push({
        mod: m,
        tier: tierOf.get(m.id)?.tier ?? 1,
        weight,
        share: weight / total,
        text: modText(m),
      });
      fam.share += weight / total;
      families.set(key, fam);
    }
    const list = [...families.values()];
    for (const f of list) f.tiers.sort((a, b) => a.tier - b.tier);
    return list.sort((a, b) => b.share - a.share);
  };

  const ordinary = build(reachable.filter((m) => m.d === "i"));
  const desecrated = build(reachable.filter((m) => m.d === "d"));

  // a rare item's own name is the 3rd line of the copied text
  const head = item.rawText.replace(/\r/g, "").split("\n--------\n")[0].split("\n");
  const ownName = item.rarity === ItemRarity.Rare && head.length >= 4 ? head[2] : undefined;

  return {
    itemName: ownName ?? item.info.name,
    baseName,
    itemClass: base.c,
    ilvl,
    ilvlKnown,
    prefixes,
    suffixes,
    maxAffixes,
    veiled: { p: counted.veiledP, s: counted.veiledS },
    sides,
    presentGroups: [...presentGroups],
    warnings,
    ordinary,
    desecrated,
    weightsMissing,
  };
}

/** bone and omen chosen in the tab (remembered on this PC) */
const SETTINGS_KEY = "atziri-well";
function loadSettings(): { bone: Bone; omen: Omen } {
  try {
    const v = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
    return {
      bone: ["gnawed", "preserved", "ancient"].includes(v.bone) ? v.bone : "preserved",
      omen: ["none", "liege", "sovereign", "blackblooded"].includes(v.omen) ? v.omen : "none",
    };
  } catch {
    return { bone: "preserved", omen: "none" };
  }
}
export const wellSettings = shallowRef(loadSettings());
export function saveWellSettings(v: { bone: Bone; omen: Omen }) {
  wellSettings.value = v;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(v));
  } catch {
    // storage unavailable
  }
}
