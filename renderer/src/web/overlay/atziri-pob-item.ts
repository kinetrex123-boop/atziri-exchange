// Atziri Exchange: turns a copied item (in the game language) into the
// English item text Path of Building reads.
//
// Each mod line is already recognised by the overlay (same as Ctrl + D):
// it knows the official mod behind it. The English line is the same mod's
// official English text with the numbers of the copied line.
import type { ParsedItem } from "@/parser/ParsedItem";
import { ItemRarity } from "@/parser";
import { ModifierType } from "@/parser/modifiers";
import type { ParsedStat } from "@/parser/stat-translations";

interface EnStat {
  matchers: Array<{ string: string; negate?: boolean }>;
}

let enStats: Promise<Map<string, EnStat>> | null = null;
function loadEnStats() {
  if (!enStats) {
    enStats = fetch("/data/en/stats.ndjson")
      .then(async (r) => await r.text())
      .then((text) => {
        const map = new Map<string, EnStat>();
        for (const line of text.split("\n")) {
          if (!line.trim()) continue;
          try {
            const o = JSON.parse(line) as { ref: string; matchers: EnStat["matchers"] };
            if (!map.has(o.ref)) map.set(o.ref, { matchers: o.matchers });
          } catch {
            // skip
          }
        }
        return map;
      });
    enStats.catch(() => {
      enStats = null;
    });
  }
  return enStats;
}

// a number, maybe followed by its roll range: "143(124-151)" keeps 143
const NUM = "([+-]?\\d+(?:[.,]\\d+)?)(?:\\([^)]*\\))?";
function templateRegex(template: string, anchorEnd = false) {
  const parts = template.split("#").map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp("^" + parts.join(NUM) + (anchorEnd ? "$" : ""), "i");
}

/** numbers of the copied line that matches this (localised) mod text */
function valuesFor(lines: string[], template: string): string[] | undefined {
  const re = templateRegex(template);
  for (const line of lines) {
    const m = re.exec(line);
    if (m) return m.slice(1).map((v) => v.replace(",", "."));
  }
  return undefined;
}

const placeholders = (s: string) => (s.match(/#/g) ?? []).length;

/**
 * English wording of the same mod. The French and English lists of wordings
 * are not always in the same order nor of the same length, so the position
 * is only trusted when the sign ("increased" / "reduced") and the number of
 * values agree; otherwise the first wording with the same sign is taken.
 * Undefined when none fits: the line is then reported as not understood
 * rather than sent with the wrong sign.
 */
export function pickEnMatcher(
  local: { string: string; negate?: boolean },
  localIdx: number,
  enMatchers: Array<{ string: string; negate?: boolean }>,
) {
  const negate = Boolean(local.negate);
  const count = placeholders(local.string);
  const fits = (m: { string: string; negate?: boolean }) =>
    Boolean(m.negate) === negate && placeholders(m.string) === count;
  const atIdx = localIdx >= 0 ? enMatchers[localIdx] : undefined;
  if (atIdx && fits(atIdx)) return atIdx;
  return (
    enMatchers.find(fits) ??
    enMatchers.find((m) => Boolean(m.negate) === negate)
  );
}

function fill(template: string, values: string[]) {
  let i = 0;
  return template.replace(/#/g, () => values[i++] ?? "0");
}

function englishLine(
  stat: ParsedStat,
  en: Map<string, EnStat>,
  lines: string[],
): string | undefined {
  const enStat = en.get(stat.stat.ref);
  if (!enStat) return undefined;
  const idx = stat.stat.matchers.indexOf(stat.translation);
  const enMatcher = pickEnMatcher(stat.translation, idx, enStat.matchers);
  if (!enMatcher) return undefined;
  const count = placeholders(enMatcher.string);
  if (count === 0) return enMatcher.string;
  // the numbers of this very mod: the line the parser read it from first
  // (a rune and a mod of the same stat must not share the rune's value)
  let values = stat.sourceLine
    ? valuesFor([stat.sourceLine], stat.translation.string)
    : undefined;
  if ((!values || values.length !== count) && count === 1 && stat.roll) {
    values = [String(Math.abs(stat.roll.value))];
  }
  if (!values || values.length !== count) {
    values = valuesFor(lines, stat.translation.string);
  }
  if (!values || values.length !== count) return undefined;
  return fill(enMatcher.string, values);
}

// ---- the other way: Path of Building's English lines -> game language ----
let enRegexes: Array<{ ref: string; idx: number; re: RegExp }> | null = null;

/** English mod lines (from PoB) written in the overlay's language */
export async function toGameLines(lines: string[], lang: string): Promise<string[]> {
  if (lang === "en" || !lines.length) return lines;
  const en = await loadEnStats();
  if (!enRegexes) {
    enRegexes = [];
    for (const [ref, st] of en) {
      st.matchers.forEach((m, idx) => {
        if (m.string.includes("#")) enRegexes!.push({ ref, idx, re: templateRegex(m.string, true) });
        else enRegexes!.push({ ref, idx, re: new RegExp("^" + m.string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i") });
      });
    }
  }
  const { STAT_BY_REF } = await import("@/assets/data");
  return lines.map((line) => {
    for (const r of enRegexes!) {
      const m = r.re.exec(line);
      if (!m) continue;
      const local = STAT_BY_REF(r.ref)?.matchers[r.idx]?.string;
      if (!local) return line;
      return fill(local, m.slice(1).map((v) => v.replace(".", lang === "fr" ? "," : ".")));
    }
    return line;
  });
}

const RARITY: Record<string, string> = {
  [ItemRarity.Normal]: "NORMAL",
  [ItemRarity.Magic]: "MAGIC",
  [ItemRarity.Rare]: "RARE",
  [ItemRarity.Unique]: "UNIQUE",
};

export interface PobItem {
  text: string;
  /** mod lines that could not be translated */
  unknown: string[];
}

export async function toPobItem(item: ParsedItem, clipboard: string): Promise<PobItem> {
  const en = await loadEnStats();
  const lines = clipboard
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && l !== "--------");

  const implicit: string[] = [];
  const explicit: string[] = [];
  const unknown: string[] = [];
  for (const mod of item.newMods) {
    const type = mod.info.type;
    if (type === ModifierType.Pseudo) continue;
    if (type === ModifierType.Skill) {
      // skills granted by the item are not sent to Path of Building: say so
      unknown.push(...mod.stats.map((s) => s.translation.string));
      continue;
    }
    const prefix =
      type === ModifierType.Augment || type === ModifierType.AddedAugment
        ? "{rune}"
        : type === ModifierType.Enchant
          ? "{enchant}"
          : type === ModifierType.Crafted
            ? "{crafted}"
            : type === ModifierType.Fractured
              ? "{fractured}"
              : type === ModifierType.Desecrated
                ? "{desecrated}"
                : "";
    for (const stat of mod.stats) {
      const line = englishLine(stat, en, lines);
      if (!line) {
        unknown.push(stat.translation.string);
        continue;
      }
      const target =
        type === ModifierType.Implicit ||
        type === ModifierType.Augment ||
        type === ModifierType.AddedAugment ||
        type === ModifierType.Enchant
          ? implicit
          : explicit;
      target.push(prefix + line);
    }
  }

  // lines the overlay itself did not understand are missing too
  for (const m of item.unknownModifiers) unknown.push(m.text);

  const rarity = RARITY[item.rarity ?? ItemRarity.Normal] ?? "NORMAL";
  const out: string[] = [`Rarity: ${rarity}`];
  if (item.rarity === ItemRarity.Unique) {
    out.push(item.info.refName);
    out.push(item.info.unique?.base ?? item.info.refName);
  } else if (item.rarity === ItemRarity.Rare) {
    out.push("Atziri Item");
    out.push(item.info.refName);
  } else {
    out.push(item.info.refName);
  }
  if (item.quality) out.push(`Quality: +${item.quality}%`);
  if (item.itemLevel) out.push(`Item Level: ${item.itemLevel}`);
  out.push(`Implicits: ${implicit.length}`);
  out.push(...implicit, ...explicit);
  if (item.isCorrupted) out.push("Corrupted");
  return { text: out.join("\n"), unknown };
}
