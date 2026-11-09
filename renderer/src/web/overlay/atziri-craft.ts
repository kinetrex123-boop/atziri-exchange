// Atziri Exchange: "Suivi craft" tab of the Shift + Space page.
// Craft sessions: the currencies, omens and essences used, counted with
// Shift + left click in the game while one of them is "armed", and their cost
// in Divine Orbs from poe.ninja prices. Also a list of crafting bases (trade
// links). Saved on this PC (localStorage), shared with the detached window.
import { shallowRef, computed } from "vue";
import { Host } from "@/web/background/IPC";
import { ITEM_BY_REF } from "@/assets/data";
import { useLeagues } from "@/web/background/Leagues";
import { setRates } from "./atziri-money";

export interface CraftEntry {
  key: string; // "<poe.ninja category>|<English name>"
  type: string;
  ref: string;
  icon?: string;
  count: number;
  price: number; // Divine Orbs each, last known
}

export interface CraftSession {
  id: number;
  title: string;
  entries: CraftEntry[];
  firstAt: number | null; // first counted use
  lastAt: number | null; // last counted use
}

export interface CraftBase {
  id: number;
  name: string;
  url: string;
}

interface CraftState {
  sessions: CraftSession[];
  currentId: number;
  armedKey: string | null;
  paused: boolean;
  bases: CraftBase[];
}

const KEY = "atziri-craft";
let nextId = Date.now();
const newId = () => ++nextId;

function newSession(title: string): CraftSession {
  return { id: newId(), title, entries: [], firstAt: null, lastAt: null };
}

function load(): CraftState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (s && Array.isArray(s.sessions) && s.sessions.length) {
      return {
        sessions: s.sessions,
        currentId: s.currentId ?? s.sessions[0].id,
        armedKey: s.armedKey ?? null,
        paused: Boolean(s.paused),
        bases: Array.isArray(s.bases) ? s.bases : [],
      };
    }
  } catch {
    // unreadable storage
  }
  const first = newSession("Craft 1");
  return {
    sessions: [first],
    currentId: first.id,
    armedKey: null,
    paused: false,
    bases: [],
  };
}

export const craft = shallowRef<CraftState>(load());

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(craft.value));
  } catch {
    // storage unavailable
  }
}

// the other window (overlay / detached window) changed the data
window.addEventListener("storage", (e) => {
  if (e.key === KEY) craft.value = load();
});

function update(fn: (s: CraftState) => void) {
  const copy: CraftState = JSON.parse(JSON.stringify(craft.value));
  fn(copy);
  craft.value = copy;
  save();
}

function cur(s: CraftState) {
  return s.sessions.find((x) => x.id === s.currentId) ?? s.sessions[0];
}

export const craftSession = computed(
  () =>
    craft.value.sessions.find((s) => s.id === craft.value.currentId) ??
    craft.value.sessions[0],
);

export const armedEntry = computed(() => {
  const key = craft.value.armedKey;
  return key ? craftSession.value.entries.find((e) => e.key === key) : undefined;
});

/** Name in the game language (French names from the item lists) */
export function entryName(e: { ref: string }) {
  return ITEM_BY_REF("ITEM", e.ref)?.[0]?.name ?? e.ref;
}

export function entryIcon(e: { ref: string; icon?: string }) {
  const listIcon = ITEM_BY_REF("ITEM", e.ref)?.[0]?.icon;
  if (listIcon && listIcon.startsWith("http")) return listIcon;
  return e.icon;
}

// ---- totals ----
export function craftTotals(sess: CraftSession) {
  const used = sess.entries.reduce((a, e) => a + e.count, 0);
  const divines = sess.entries.reduce((a, e) => a + e.count * e.price, 0);
  const duration =
    sess.firstAt && sess.lastAt ? Math.max(0, sess.lastAt - sess.firstAt) : 0;
  const hours = duration / 3600000;
  return {
    used,
    divines,
    duration,
    perHour: hours > 5 / 60 ? divines / hours : null,
  };
}

// ---- actions ----
export function selectCraftSession(id: number) {
  update((s) => {
    s.currentId = id;
    s.armedKey = null;
  });
}

export function addCraftSession(title: string) {
  update((s) => {
    const sess = newSession(title || `Craft ${s.sessions.length + 1}`);
    // same currencies as the session in use, counters at 0
    sess.entries = cur(s).entries.map((e) => ({ ...e, count: 0 }));
    s.sessions.unshift(sess);
    s.currentId = sess.id;
    s.armedKey = null;
  });
}

export function renameCraftSession(title: string) {
  update((s) => {
    if (title.trim()) cur(s).title = title.trim();
  });
}

export function deleteCraftSession() {
  update((s) => {
    s.sessions = s.sessions.filter((x) => x.id !== s.currentId);
    if (!s.sessions.length) s.sessions.push(newSession("Craft 1"));
    s.currentId = s.sessions[0].id;
    s.armedKey = null;
  });
}

export function resetCraftSession() {
  update((s) => {
    const sess = cur(s);
    for (const e of sess.entries) e.count = 0;
    sess.firstAt = null;
    sess.lastAt = null;
  });
}

export function addEntry(item: CatalogItem) {
  update((s) => {
    const sess = cur(s);
    if (sess.entries.some((e) => e.key === item.key)) return;
    sess.entries.push({
      key: item.key,
      type: item.type,
      ref: item.ref,
      icon: item.icon,
      count: 0,
      price: item.divines,
    });
  });
}

export function removeEntry(key: string) {
  update((s) => {
    const sess = cur(s);
    sess.entries = sess.entries.filter((e) => e.key !== key);
    if (s.armedKey === key) s.armedKey = null;
  });
}

export function changeCount(key: string, delta: number) {
  update((s) => {
    const sess = cur(s);
    const e = sess.entries.find((x) => x.key === key);
    if (!e) return;
    e.count = Math.max(0, e.count + delta);
    if (delta > 0) {
      const now = Date.now();
      sess.firstAt ??= now;
      sess.lastAt = now;
    }
  });
}

export function setCount(key: string, count: number) {
  update((s) => {
    const e = cur(s).entries.find((x) => x.key === key);
    if (e) e.count = Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
  });
}

/** Arms a currency (clicking the armed one disarms it) */
export function toggleArm(key: string) {
  update((s) => {
    s.armedKey = s.armedKey === key ? null : key;
    s.paused = false;
  });
}

export function setPaused(paused: boolean) {
  update((s) => {
    s.paused = paused;
  });
}

// ---- crafting bases ----
export function addBase(url: string, name: string) {
  update((s) => {
    s.bases.push({ id: newId(), name, url });
  });
}

export function renameBase(id: number, name: string) {
  update((s) => {
    const b = s.bases.find((x) => x.id === id);
    if (b && name.trim()) b.name = name.trim();
  });
}

export function removeBase(id: number) {
  update((s) => {
    s.bases = s.bases.filter((x) => x.id !== id);
  });
}

// ---- prices (poe.ninja, the same live data as the Economy tab) ----
export interface CatalogItem {
  key: string;
  type: string;
  ref: string;
  icon?: string;
  divines: number;
}

/** poe.ninja categories offered in the list (Ritual = omens) */
export const CRAFT_TYPES = ["Currency", "Ritual", "Essences"] as const;

export const catalog = shallowRef<CatalogItem[]>([]);
export const catalogAt = shallowRef<number | null>(null);
export const catalogLoading = shallowRef(false);

export async function loadCatalog(force = false) {
  if (catalogLoading.value) return;
  if (!force && catalogAt.value && Date.now() - catalogAt.value < 5 * 60 * 1000)
    return;
  const league = useLeagues().selectedId.value;
  if (!league) return;
  catalogLoading.value = true;
  try {
    const items: CatalogItem[] = [];
    let exalted: number | undefined;
    let chaos: number | undefined;
    for (const type of CRAFT_TYPES) {
      const query = `league=${encodeURIComponent(league).replace(/%20/g, "+")}&type=${type}`;
      const res = await Host.proxy(
        `poe.ninja/poe2/api/economy/exchange/current/overview?${query}`,
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        core?: { rates?: Record<string, number> };
        lines?: Array<{ id: string; primaryValue: number }>;
        items?: Array<{ id: string; name: string; image?: string }>;
      };
      exalted ??= data.core?.rates?.exalted;
      chaos ??= data.core?.rates?.chaos;
      const byId = new Map((data.items ?? []).map((i) => [i.id, i]));
      for (const line of data.lines ?? []) {
        const item = byId.get(line.id);
        if (!item) continue;
        items.push({
          key: `${type}|${item.name}`,
          type,
          ref: item.name,
          icon: item.image ? `https://web.poecdn.com${item.image}` : undefined,
          divines: line.primaryValue,
        });
      }
    }
    if (!items.length) return;
    // the Divine Orb itself is the unit
    for (const it of items) if (it.ref === "Divine Orb") it.divines = 1;
    setRates(chaos, exalted);
    catalog.value = items;
    catalogAt.value = Date.now();
    // fresh prices for the currencies already in the sessions
    const price = new Map(items.map((i) => [i.key, i]));
    update((s) => {
      for (const sess of s.sessions) {
        for (const e of sess.entries) {
          const p = price.get(e.key);
          if (p) {
            e.price = p.divines;
            e.icon = p.icon ?? e.icon;
          }
        }
      }
    });
  } catch (e) {
    console.warn("craft prices failed", e);
  } finally {
    catalogLoading.value = false;
  }
}

// ---- inputs from the game (in-game overlay only, never counted twice) ----
let started = false;
export function initCraftCapture() {
  if (started) return;
  started = true;
  Host.onEvent("MAIN->CLIENT::widget-action", (e) => {
    if (e.target === "atziri-craft-click") {
      const s = craft.value;
      if (s.armedKey && !s.paused) changeCount(s.armedKey, 1);
    } else if (e.target === "atziri-craft-pause") {
      if (craft.value.armedKey) setPaused(!craft.value.paused);
    }
  });
}
