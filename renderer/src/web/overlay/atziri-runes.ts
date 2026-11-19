// Atziri Exchange: "Rune Rewards". The hotkey makes the main process read the
// game screen (Windows OCR); every line that names an item with a poe.ninja
// price gets a price badge next to it, the most valuable one highlighted.
// Unlike fixed screen ratios, the OCR gives the position of each line, so it
// follows the interface scale and works in every game language Windows reads.
import { shallowRef } from "vue";
import { distance } from "fastest-levenshtein";
import { Host } from "@/web/background/IPC";
import { ITEM_BY_TRANSLATED, ITEM_NS_NAMES } from "@/assets/data";
import { usePoeninja } from "@/web/background/Prices";

export interface RuneBadge {
  line: string;
  name: string;
  icon?: string;
  qty: number;
  each: number; // Divine Orbs
  total: number; // Divine Orbs
  best: boolean;
  // position in CSS pixels of the overlay
  x: number;
  y: number;
  h: number;
}
export interface RuneScan {
  status: "scanning" | "done" | "error";
  at: number;
  error?: string;
  badges: RuneBadge[];
  unpriced: string[];
  lines: number;
}

export const runeScan = shallowRef<RuneScan | null>(null);
/** last finished scan, kept for the Rune Rewards view of Shift + Space */
const LAST_KEY = "atziri-rune-last";
export const lastRuneScan = shallowRef<RuneScan | null>(loadLast());
function loadLast(): RuneScan | null {
  try {
    return JSON.parse(localStorage.getItem(LAST_KEY) ?? "null");
  } catch {
    return null;
  }
}

// the Shift + Space page can live in its own window
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === LAST_KEY) lastRuneScan.value = loadLast();
  });
}

// prices stay until a click in the game; this is only a safety net
const HIDE_AFTER_MS = 5 * 60_000;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
export function hideRuneScan() {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = undefined;
  runeScan.value = null;
}

// lines of the reward panel that are not rewards
const IGNORE = /^(runeshape|combination|combinaison|rewards?|récompenses?)$/i;
// "3x Greater Exalted Orb", "3 x ...", "x3 ...". The OCR often reads the
// "1" of "1x" as "l", "I" or "|": those count as digits too.
const QTY = /^(?:([0-9lIi|!]{1,3})\s*[x×X]\s+|[x×X]\s*([0-9lIi|!]{1,3})\s+)/;
function ocrNumber(s: string): number {
  return Number(s.replace(/[lIi|!]/g, "1")) || 1;
}

// item names of the game language (rebuilt when the language changes)
let names: string[] | undefined;
let namesSource: unknown;
function itemNames() {
  if (!names || namesSource !== ITEM_NS_NAMES) {
    names = [...ITEM_NS_NAMES()];
    namesSource = ITEM_NS_NAMES;
  }
  return names;
}

/** item of the game language named by an OCR line, exact or close match */
export function matchItem(
  text: string,
  needQty = false,
): { name: string; qty: number } | null {
  let t = text.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
  t = t.replace(/[.,:;]+$/, "");
  if (t.length < 4 || IGNORE.test(t)) return null;
  let qty = 1;
  const m = t.match(QTY);
  if (m) {
    qty = ocrNumber(m[1] ?? m[2]);
    t = t.slice(m[0].length).trim();
  } else if (needQty) {
    // rewards of the panel always start with "1x", "3x"...: anything else is
    // another text on screen (item tooltip under the mouse...)
    return null;
  }
  t = t.replace(/\|/g, " ").replace(/\s+/g, " ").trim();
  // a tooltip next to the panel can glue a word or two at the end of the line
  const words = t.split(" ");
  for (let drop = 0; drop <= 2 && words.length - drop >= 2; drop++) {
    const hit = closestName(words.slice(0, words.length - drop).join(" "));
    if (hit) return { name: hit, qty };
  }
  return null;
}

function closestName(t: string): string | undefined {
  if (ITEM_BY_TRANSLATED("ITEM", t)) return t;
  // OCR mistakes: closest name, allowing about one wrong letter in seven
  const lower = t.toLowerCase();
  const max = Math.max(1, Math.floor(t.length / 7));
  let best: string | undefined;
  let bestD = max + 1;
  for (const n of itemNames()) {
    if (Math.abs(n.length - t.length) > max) continue;
    const d = distance(lower, n.toLowerCase());
    if (d < bestD) {
      bestD = d;
      best = n;
      if (d === 0) break;
    }
  }
  return best;
}

let started = false;
export function initRuneRewards() {
  if (started) return;
  started = true;
  const ninja = usePoeninja();
  Host.onEvent("MAIN->CLIENT::atziri-ocr", (e) => {
    if (e.target !== "atziri-rune-rewards") return;
    if (hideTimer) clearTimeout(hideTimer);
    if (e.status === "scanning") {
      ninja.queuePricesFetch();
      runeScan.value = { status: "scanning", at: Date.now(), badges: [], unpriced: [], lines: 0 };
      return;
    }
    if (e.status === "error") {
      runeScan.value = { status: "error", at: Date.now(), error: e.error, badges: [], unpriced: [], lines: 0 };
      hideTimer = setTimeout(hideRuneScan, 6000);
      return;
    }
    // game-window pixels -> CSS pixels of the overlay (same size as the game)
    const scale = window.innerWidth / (e.width || window.innerWidth);
    const badges: RuneBadge[] = [];
    const unpriced: string[] = [];
    // when the panel is found (lines with "3x ..."), only its lines count
    const needQty = e.lines.some((l) => QTY.test(l.t.trim()));
    for (const line of e.lines) {
      const hit = matchItem(line.t, needQty);
      if (!hit) continue;
      const base = ITEM_BY_TRANSLATED("ITEM", hit.name)?.[0];
      if (!base) continue;
      const price = ninja.findPriceByQuery({ ns: "ITEM", name: base.refName });
      if (!price) {
        unpriced.push(line.t);
        continue;
      }
      badges.push({
        line: line.t,
        name: base.name,
        icon: base.icon,
        qty: hit.qty,
        each: price.primaryValue,
        total: price.primaryValue * hit.qty,
        best: false,
        x: (line.x + line.w) * scale,
        y: line.y * scale,
        h: Math.max(line.h * scale, 16),
      });
    }
    if (badges.length > 1) {
      const top = badges.reduce((a, b) => (b.total > a.total ? b : a));
      top.best = true;
    }
    const scan: RuneScan = {
      status: "done",
      at: Date.now(),
      badges,
      unpriced,
      lines: e.lines.length,
    };
    runeScan.value = scan;
    lastRuneScan.value = scan;
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify(scan));
    } catch {
      // storage unavailable
    }
    hideTimer = setTimeout(hideRuneScan, badges.length ? HIDE_AFTER_MS : 5000);
  });
  // a click in the game removes the prices (sent by the main process)
  Host.onEvent("MAIN->CLIENT::widget-action", (e) => {
    if (e.target === "atziri-rune-hide") hideRuneScan();
  });
}
