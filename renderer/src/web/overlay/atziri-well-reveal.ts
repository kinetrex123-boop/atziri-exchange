// Atziri Exchange: Well of Souls, tier of the 3 choices shown in game.
// The hotkey makes the main process read the screen (Windows OCR); each line
// that matches a modifier (text in the game language + values inside the
// tier ranges) gets a badge with its tier next to it.
// The base comes from the item tooltip on screen (its name is read too) or,
// failing that, from the last rare item checked with Ctrl + D.
import { shallowRef } from "vue";
import { distance } from "fastest-levenshtein";
import { Host } from "@/web/background/IPC";
import { ITEM_BY_TRANSLATED, ITEM_NS_NAMES, STAT_BY_REF } from "@/assets/data";
import { parseClipboard, ItemRarity } from "@/parser";
import { loadWellData, spawnWeight, tiersForTags, type WellMod } from "./atziri-well";

export interface RevealBadge {
  line: string;
  // undefined: tier unknown (value read outside every range, or modifier
  // missing from the tier table): no tier is invented (audit A1, A2)
  tier?: number;
  count?: number;
  outOfRange?: boolean; // the value read fits no tier of this modifier
  level: number;
  lord?: WellMod["lord"];
  name: string;
  approx: boolean; // base unknown: tier counted over every base
  x: number;
  y: number;
  h: number;
}
export interface RevealScan {
  status: "scanning" | "done" | "error";
  error?: string;
  base?: string;
  badges: RevealBadge[];
  read?: string[]; // every line read on screen (shown in the Abyss tab)
}
export const wellReveal = shallowRef<RevealScan | null>(null);

/** last finished scan, for the Abyss tab (the page may be another window) */
const LAST_KEY = "atziri-well-reveal-last";
function loadLast(): (RevealScan & { at: number }) | null {
  try {
    return JSON.parse(localStorage.getItem(LAST_KEY) ?? "null");
  } catch {
    return null;
  }
}
export const lastWellReveal = shallowRef(typeof window !== "undefined" ? loadLast() : null);
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === LAST_KEY) lastWellReveal.value = loadLast();
  });
}

let hideTimer: ReturnType<typeof setTimeout> | undefined;
export function hideWellReveal() {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = undefined;
  wellReveal.value = null;
}

/** lower case, no accents, numbers as "#", letters and "#" only */
export function normText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[+-]?\d+(?:[.,]\d+)?/g, "#")
    .replace(/[^a-z#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * OCR fixes seen in game: "%" read as "0/0", "o/o" or "0/6"
 * ("800/0 D'AUGMENTATION" = "80% D'AUGMENTATION", "1040/6" = "104%")
 */
export function fixOcr(s: string): string {
  return s
    .replace(/(\d+)\s*[0oO]\s*\/\s*[0oO6]\b/g, "$1%")
    .replace(/(\d+)\s*[oO]\s*\/\s*[oO0]/g, "$1%");
}

function numbers(s: string): number[] {
  return [...s.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => Number(m[0].replace(",", ".")));
}

// ---- index: normalised text of each modifier line in the game language ----
interface Entry {
  mod: WellMod;
  line: number;
}
let index: { source: unknown; map: Map<string, Entry[]>; keys: string[] } | undefined;
async function lineIndex() {
  const data = await loadWellData();
  if (index && index.source === STAT_BY_REF) return index;
  const map = new Map<string, Entry[]>();
  for (const mod of data.mods) {
    mod.lines.forEach((l, i) => {
      const stat = l.r ? STAT_BY_REF(l.r) : undefined;
      const matcher =
        stat?.matchers.find((m) => !!m.negate === !!l.ng && m.value === l.vl) ??
        stat?.matchers[l.mi] ??
        stat?.matchers[0];
      const keys = new Set([normText(matcher?.string ?? l.t), normText(l.t)]);
      for (const k of keys) {
        const list = map.get(k) ?? [];
        list.push({ mod, line: i });
        map.set(k, list);
      }
    });
  }
  index = { source: STAT_BY_REF, map, keys: [...map.keys()] };
  return index;
}

function findEntries(idx: NonNullable<typeof index>, text: string): Entry[] {
  const key = normText(text);
  if (key.length < 6) return [];
  const exact = idx.map.get(key);
  if (exact) return exact;
  // OCR mistakes: closest text, about one wrong letter in eight
  const max = Math.max(2, Math.floor(key.length / 8));
  let best: string | undefined;
  let bestD = max + 1;
  for (const k of idx.keys) {
    if (Math.abs(k.length - key.length) > max) continue;
    const d = distance(key, k);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return best ? idx.map.get(best)! : [];
}

/** how far the read values are from the ranges of a modifier line */
function rangeGap(mod: WellMod, line: number, values: number[]): number {
  const v = mod.lines[line]?.v ?? [];
  let gap = 0;
  values.forEach((x, i) => {
    const r = v[i];
    if (!r) return;
    if (x < r[0]) gap += (r[0] - x) / Math.max(1, r[0]);
    else if (x > r[1]) gap += (x - r[1]) / Math.max(1, r[1]);
  });
  return gap;
}

// ---- base of the item ----
let lowerNames: { source: unknown; map: Map<string, string> } | undefined;
function baseFromLines(lines: string[], bases: Record<string, unknown>): string | undefined {
  if (!lowerNames || lowerNames.source !== ITEM_NS_NAMES) {
    const map = new Map<string, string>();
    for (const n of ITEM_NS_NAMES()) map.set(n.toLowerCase(), n);
    lowerNames = { source: ITEM_NS_NAMES, map };
  }
  for (const l of lines) {
    const name = lowerNames.map.get(l.trim().toLowerCase());
    if (!name) continue;
    const ref = ITEM_BY_TRANSLATED("ITEM", name)?.[0]?.refName;
    if (ref && bases[ref]) return ref;
  }
  return undefined;
}
function baseFromHistory(bases: Record<string, unknown>): string | undefined {
  try {
    const h = JSON.parse(localStorage.getItem("atziri-history") ?? "[]");
    for (const e of h) {
      if (e.rarity !== ItemRarity.Rare) continue;
      const p = parseClipboard(e.rawText);
      if (p.isOk() && bases[p.value.info.refName]) return p.value.info.refName;
      return undefined;
    }
  } catch {
    // unreadable history
  }
  return undefined;
}

export async function matchReveal(
  lines: Array<{ t: string; x: number; y: number; w: number; h: number }>,
  scale: number,
): Promise<RevealScan> {
  const data = await loadWellData();
  const idx = await lineIndex();
  const base = baseFromLines(lines.map((l) => l.t), data.bases) ?? baseFromHistory(data.bases);
  // base tags without the "no_cold_spell_mods"-like exclusions: the Well of
  // Souls can offer them (seen in game: cold damage on a fire staff), and the
  // tiers are counted over the whole family of the item class
  const tags = base
    ? new Set([...data.bases[base].t.filter((t) => !t.startsWith("no_")), "default"])
    : undefined;
  const tierOnBase = tags ? tiersForTags(data.mods, tags) : undefined;
  // without a base: tiers counted over every modifier of the family
  const tierAll = tiersForTags(data.mods, new Set(data.mods.flatMap((m) => m.sw.map(([t]) => t))));

  // skipped: item properties of the tooltip ("Armure: 89", "Prérequis : …"),
  // badges of a previous scan still on screen ("T2 · NIV. 65"), and lines
  // without any number (half a line: the value is on another line)
  // a long modifier wraps on two lines in the game ("Draine 6.36% des Dégâts
  // Physiques d'Attaque sous" + "forme de Vie"): glue the second half back
  const fixed = lines.map((l) => ({ ...l, t: fixOcr(l.t) }));
  const joined: typeof fixed = [];
  for (let i = 0; i < fixed.length; i++) {
    const l = fixed[i];
    const next = fixed[i + 1];
    if (
      next &&
      /\d/.test(l.t) &&
      !/\d/.test(next.t) &&
      next.y > l.y &&
      next.y - l.y < l.h * 2.4 &&
      next.x < l.x + l.w &&
      next.x + next.w > l.x &&
      !findEntries(idx, l.t).length
    ) {
      const both = `${l.t} ${next.t}`;
      if (findEntries(idx, both).length) {
        joined.push({ ...l, t: both, w: Math.max(l.x + l.w, next.x + next.w) - l.x });
        i++;
        continue;
      }
    }
    joined.push(l);
  }
  const usable = joined
    .filter((l) => !l.t.includes(":"))
    .filter((l) => !/\bniv\b|\bT[1Il]?\s*\d+\s*\/|\bT\d\b/i.test(l.t))
    .filter((l) => /\d/.test(l.t));
  const found = usable.map((l) => {
    const entries = findEntries(idx, l.t);
    if (!tags) return entries;
    const onBase = entries.filter((e) => spawnWeight(e.mod, tags) > 0);
    return onBase.length ? onBase : entries;
  });

  const badges: RevealBadge[] = [];
  for (let i = 0; i < usable.length; i++) {
    const l = usable[i];
    let entries = found[i];
    if (!entries.length) continue;
    const values = numbers(l.t);
    let gap = (e: Entry) => rangeGap(e.mod, e.line, values);

    // two-line (hybrid) choice: "61% increased Spell Damage" + "+62 to maximum
    // Mana" is one modifier when the next line, just below, belongs to it
    const next = usable[i + 1];
    let pair = false;
    if (next && next.y - l.y < l.h * 2.4 && found[i + 1].length) {
      const nextValues = numbers(next.t);
      const shared = entries.filter((e) =>
        found[i + 1].some((n) => n.mod === e.mod && n.line !== e.line),
      );
      if (shared.length) {
        entries = shared;
        const lineOf = (e: Entry) => found[i + 1].find((n) => n.mod === e.mod)!.line;
        gap = (e: Entry) => rangeGap(e.mod, e.line, values) + rangeGap(e.mod, lineOf(e), nextValues);
        pair = true;
      }
    }
    // a single line is a one-line modifier rather than half of a hybrid one
    const score = (e: Entry) => gap(e) + (!pair && e.mod.lines.length > 1 ? 0.5 : 0);
    entries = [...entries].sort((a, b) => score(a) - score(b) || b.mod.l - a.mod.l);
    const best = entries[0].mod;
    // the value read sits outside every range of the closest modifier (OCR
    // mistake, "%" read as "96"...): show the modifier without a tier
    const outOfRange = gap(entries[0]) > 0;
    if (pair) i++; // next line used
    const t = outOfRange ? undefined : (tierOnBase?.get(best.id) ?? tierAll.get(best.id));
    badges.push({
      line: l.t,
      tier: t?.tier,
      count: t?.count,
      outOfRange,
      level: best.l,
      lord: best.lord,
      name: best.n,
      approx: !tierOnBase?.has(best.id),
      x: (l.x + l.w) * scale,
      y: l.y * scale,
      h: Math.max(l.h * scale, 16),
    });
  }
  return { status: "done", base, badges, read: lines.map((l) => l.t) };
}

let started = false;
export function initWellReveal() {
  if (started) return;
  started = true;
  Host.onEvent("MAIN->CLIENT::atziri-ocr", (e) => {
    if (e.target !== "atziri-well-reveal") return;
    if (hideTimer) clearTimeout(hideTimer);
    if (e.status === "scanning") {
      wellReveal.value = { status: "scanning", badges: [] };
      return;
    }
    if (e.status === "error") {
      wellReveal.value = { status: "error", error: e.error, badges: [] };
      hideTimer = setTimeout(hideWellReveal, 6000);
      return;
    }
    const scale = window.innerWidth / (e.width || window.innerWidth);
    matchReveal(e.lines, scale)
      .then((scan) => {
        wellReveal.value = scan;
        const last = { ...scan, at: Date.now() };
        lastWellReveal.value = last;
        try {
          localStorage.setItem(LAST_KEY, JSON.stringify(last));
        } catch {
          // storage unavailable
        }
        // stays until a click in the game; safety net after 5 min
        hideTimer = setTimeout(hideWellReveal, scan.badges.length ? 5 * 60_000 : 5000);
      })
      .catch((err: Error) => {
        wellReveal.value = { status: "error", error: err.message, badges: [] };
        hideTimer = setTimeout(hideWellReveal, 6000);
      });
  });
  Host.onEvent("MAIN->CLIENT::widget-action", (e) => {
    if (e.target === "atziri-rune-hide") hideWellReveal();
  });
}
