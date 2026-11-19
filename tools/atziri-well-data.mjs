// Atziri Exchange: builds renderer/public/data/atziri/well-of-souls.json, the
// modifier pool used by the "Well of Souls" tab (desecration with Abyssal bones).
//
// Sources (all public):
//  - RePoE PoE2 export (repoe-fork.github.io/poe2): mods, base items, tags,
//    spawn weights by tag, required levels, families;
//  - poe2db.tw modifier pages: the real spawn weight ("DropChance") of the
//    ordinary item modifiers (RePoE normalises them to 1);
//  - the Exiled Exchange 2 stat list (renderer/public/data/en/stats.ndjson):
//    the stat "ref" of each modifier line, so the tab can show it in the
//    game language.
//
// Usage: node tools/atziri-well-data.mjs [cacheDir]
// The pages are cached in cacheDir (default: tools/.cache-well) so a second
// run does not download them again.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.resolve(process.argv[2] ?? path.join(ROOT, "tools/.cache-well"));
const OUT = path.join(ROOT, "renderer/public/data/atziri/well-of-souls.json");
const REPOE = "https://repoe-fork.github.io/poe2/";
const POE2DB = "https://poe2db.tw/us/";

// Item classes a bone can desecrate (weapons, quivers, armours, jewellery)
const CLASSES = new Set([
  "One Hand Sword", "Two Hand Sword", "One Hand Axe", "Two Hand Axe",
  "One Hand Mace", "Two Hand Mace", "Spear", "Claw", "Dagger", "Warstaff",
  "Flail", "Wand", "Staff", "Bow", "Crossbow", "Sceptre", "Talisman", "Quiver",
  "Body Armour", "Helmet", "Gloves", "Boots", "Shield", "Buckler", "Focus",
  "Amulet", "Ring", "Belt",
]);

// poe2db modifier pages that carry the real weights of ordinary modifiers
const ATTR = ["str", "dex", "int", "str_dex", "str_int", "dex_int", "str_dex_int"];
const POE2DB_PAGES = [
  ...["Body_Armours", "Helmets", "Gloves", "Boots", "Shields"].flatMap((c) =>
    ATTR.map((a) => `${c}_${a}`),
  ),
  "Bucklers", "Foci", "Quivers", "Amulets", "Rings", "Belts",
  "One_Hand_Swords", "Two_Hand_Swords", "One_Hand_Axes", "Two_Hand_Axes",
  "One_Hand_Maces", "Two_Hand_Maces", "Spears", "Claws", "Daggers",
  "Quarterstaves", "Flails", "Wands", "Staves", "Bows", "Crossbows",
  "Sceptres", "Talismans",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cached(name, url, { optional = false } = {}) {
  const file = path.join(CACHE, name);
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    // not cached yet
  }
  const res = await fetch(url, { headers: { "user-agent": "atziri-exchange-data-builder" } });
  if (!res.ok) {
    if (optional) return null;
    throw new Error(`${url}: HTTP ${res.status}`);
  }
  const text = await res.text();
  await fs.mkdir(CACHE, { recursive: true });
  await fs.writeFile(file, text);
  await sleep(400); // be gentle with the sites
  return text;
}

/** "[ArmourBreak|Fully Broken Armour]" -> "Fully Broken Armour", "[Fire]" -> "Fire" */
function stripMarkup(text) {
  return text.replace(/\[([^\]|]*)\|([^\]]*)\]/g, "$2").replace(/\[([^\]]*)\]/g, "$1");
}

/** a line with every number replaced by "#", lower case, for comparisons */
export function normLine(text) {
  return stripMarkup(text)
    .replace(/\(\s*-?[\d.]+\s*[-—–]\s*-?[\d.]+\s*\)/g, "#")
    .replace(/-?\d+(?:\.\d+)?/g, "#")
    .replace(/\+#/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** values of a line, in order: "(5-10)% ... +3" -> [[5,10],[3,3]] */
function lineValues(text) {
  const out = [];
  const re = /\(\s*(-?[\d.]+)\s*[-—–]\s*(-?[\d.]+)\s*\)|(-?\d+(?:\.\d+)?)/g;
  let m;
  while ((m = re.exec(stripMarkup(text)))) {
    if (m[3] !== undefined) out.push([Number(m[3]), Number(m[3])]);
    else {
      // RePoE writes some ranges backwards: "(40-36)% reduced ..."
      const a = Number(m[1]);
      const b = Number(m[2]);
      out.push([Math.min(a, b), Math.max(a, b)]);
    }
  }
  return out;
}

const LORDS = { amanamu_mod: "Amanamu", ulaman_mod: "Ulaman", kurgal_mod: "Kurgal" };

async function main() {
  console.log("cache:", CACHE);
  const mods = JSON.parse(await cached("mods.min.json", REPOE + "mods.min.json"));
  const baseItems = JSON.parse(await cached("base_items.min.json", REPOE + "base_items.min.json"));

  // --- bases: name -> class + tags
  const bases = {};
  const usefulTags = new Set();
  for (const b of Object.values(baseItems)) {
    if (b.domain !== "item" || b.release_state !== "released" || !CLASSES.has(b.item_class)) continue;
    const tags = b.tags.filter((t) => t !== "default");
    bases[b.name] = { c: b.item_class, t: tags };
    for (const t of tags) usefulTags.add(t);
  }

  // --- EE2 stat refs, by normalised text
  // ref + index of the matcher with the same wording ("increased" / "reduced"...)
  const refByNorm = new Map();
  const statsText = await fs.readFile(path.join(ROOT, "renderer/public/data/en/stats.ndjson"), "utf8");
  for (const line of statsText.split("\n")) {
    if (!line.trim()) continue;
    const s = JSON.parse(line);
    (s.matchers ?? []).forEach((m, i) => {
      const n = normLine(m.string);
      if (!refByNorm.has(n)) {
        refByNorm.set(n, {
          r: s.ref,
          mi: i,
          ...(m.negate ? { ng: true } : {}),
          ...(m.value !== undefined ? { vl: m.value } : {}),
        });
      }
    });
    const n = normLine(s.ref);
    if (!refByNorm.has(n)) refByNorm.set(n, { r: s.ref, mi: 0 });
  }

  // --- real weights of ordinary modifiers, from poe2db
  const weights = new Map(); // mod id -> Set of weights seen
  let pages = 0;
  for (const page of POE2DB_PAGES) {
    const html = await cached(`poe2db-${page}.html`, POE2DB + page, { optional: true });
    if (!html) continue;
    pages++;
    const re = /\{"Name":[^{}]*?"DropChance":"?(\d+)"?[^{}]*?"hover":"\?s=Data%5CMods%2F([A-Za-z0-9_]+)"/g;
    let m;
    while ((m = re.exec(html))) {
      const set = weights.get(m[2]) ?? new Set();
      set.add(Number(m[1]));
      weights.set(m[2], set);
    }
  }
  console.log(`poe2db: ${pages} pages, ${weights.size} weighted modifiers`);

  // --- modifiers that can appear on a desecrated equipment item
  const out = [];
  let unmatchedLines = 0;
  let lines = 0;
  for (const [id, m] of Object.entries(mods)) {
    if (m.generation_type !== "prefix" && m.generation_type !== "suffix") continue;
    if (m.domain !== "item" && m.domain !== "desecrated") continue;
    if (m.is_essence_only) continue;
    const sw = m.spawn_weights.map((w) => [w.tag, w.weight]);
    // must be able to spawn on at least one equipment tag (first matching tag wins)
    if (!sw.some(([t, w]) => w > 0 && usefulTags.has(t))) continue;
    if (!m.text) continue;

    const lord = Object.entries(LORDS).find(([t]) => m.implicit_tags.includes(t))?.[1];
    const textLines = m.text.split("\n").filter(Boolean);
    const outLines = textLines.map((t) => {
      lines++;
      const ref = refByNorm.get(normLine(t));
      if (!ref) unmatchedLines++;
      return {
        t: stripMarkup(t).replace(/\((-?[\d.]+)-(-?[\d.]+)\)/g, (s, a, b) =>
          Number(a) > Number(b) ? `(${b}-${a})` : s,
        ),
        r: ref?.r ?? null,
        mi: ref?.mi ?? 0,
        ...(ref?.ng ? { ng: true } : {}),
        ...(ref?.vl !== undefined ? { vl: ref.vl } : {}),
        v: lineValues(t),
      };
    });
    const seen = weights.get(id);
    out.push({
      id,
      n: m.name,
      d: m.domain === "desecrated" ? "d" : "i",
      g: m.generation_type === "prefix" ? "p" : "s",
      l: m.required_level,
      f: m.type,
      gr: m.groups,
      sw,
      ...(lord ? { lord } : {}),
      tg: m.implicit_tags.filter((t) => !t.endsWith("_mod")),
      w: seen ? Math.max(...seen) : null,
      lines: outLines,
    });
  }

  const data = {
    generatedAt: new Date().toISOString(),
    sources: ["repoe-fork.github.io/poe2", "poe2db.tw", "Exiled Exchange 2 stats"],
    bases,
    mods: out,
  };
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(data));
  const size = (await fs.stat(OUT)).size;
  console.log(
    `${Object.keys(bases).length} bases, ${out.length} modifiers ` +
      `(${out.filter((x) => x.d === "d").length} desecrated-only, ` +
      `${out.filter((x) => x.d === "i" && x.w == null).length} ordinary without poe2db weight), ` +
      `${unmatchedLines}/${lines} lines without a stat ref, ${(size / 1024).toFixed(0)} KB -> ${OUT}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
