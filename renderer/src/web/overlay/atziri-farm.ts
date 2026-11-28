// Atziri Exchange: Farm tab of the Shift + Space page.
// Farming sessions: divines invested, one line per map (divines gained,
// loots, time), totals. Saved on this PC (localStorage) and kept in sync
// between the overlay and the detached window.
import { shallowRef, computed } from "vue";
import { readJson, writeItem, setAside, guardVersion, DATA_VERSION } from "@/web/atziri-storage";
import type { ClientLogEvent } from "@ipc/types";

export interface FarmMap {
  id: number;
  name: string;
  nameAuto: boolean; // filled from the game log, can be replaced
  divines: number | null; // null: map still waiting to be filled
  loots: string[];
  timeMs: number; // time spent inside the map
  enteredAt: number | null; // inside the map since (auto timer)
}

export interface FarmSession {
  id: number;
  title: string;
  invested: number;
  maps: FarmMap[];
  /** map of the current run (moved on by the "Run suivante" button) */
  currentMapId?: number | null;
  // timer of the first versions, no longer used: the session time is now
  // the sum of the time spent inside the maps
  elapsedMs?: number;
  runningSince?: number | null;
}

interface FarmState {
  v?: number; // version of this structure (atziri-storage DATA_VERSION)
  sessions: FarmSession[];
  currentId: number;
  autoTimer: boolean;
}

const KEY = "atziri-farm";
let nextId = Date.now();
const newId = () => ++nextId;

function emptyMap(): FarmMap {
  return {
    id: newId(),
    name: "",
    nameAuto: false,
    divines: null,
    loots: [],
    timeMs: 0,
    enteredAt: null,
  };
}

export function newSession(title: string, count = 5): FarmSession {
  const maps = Array.from({ length: count }, emptyMap);
  return {
    id: newId(),
    title,
    invested: 0,
    maps,
    currentMapId: maps[0].id,
  };
}

// While a map timer runs, the overlay notes every minute that it is still
// alive. A timer found running at launch (game or PC closed inside a map) is
// closed at the last sign of life, not counted until now (audit F1).
const ALIVE_KEY = "atziri-farm-alive";
const ALIVE_EVERY_MS = 60 * 1000;

/** Closes the timers left running, at `until` (never before they started) */
export function closeStaleTimers(state: FarmState, until: number) {
  let changed = false;
  for (const sess of state.sessions) {
    for (const m of sess.maps) {
      if (m.enteredAt == null) continue;
      m.timeMs += Math.max(0, until - m.enteredAt);
      m.enteredAt = null;
      changed = true;
    }
  }
  return changed;
}

function lastAlive() {
  const v = Number(localStorage.getItem(ALIVE_KEY));
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function load(atLaunch = false): FarmState {
  try {
    const { value, raw } = readJson(KEY);
    // saved by a newer version: a copy is kept aside first
    guardVersion(KEY, value, raw);
    const s = value as Partial<FarmState> | null;
    if (raw != null && !(s && Array.isArray(s.sessions)))
      setAside(KEY, raw); // unreadable journal: never lost
    if (s && Array.isArray(s.sessions) && s.sessions.length) {
      const state: FarmState = {
        v: DATA_VERSION,
        sessions: s.sessions,
        currentId: s.currentId ?? s.sessions[0].id,
        autoTimer: s.autoTimer !== false,
      };
      // the time since the last sign of life (plus one minute at most) was
      // spent with the app or the PC closed: not inside the map
      if (atLaunch && closeStaleTimers(state, lastAlive() + ALIVE_EVERY_MS)) {
        writeItem(KEY, JSON.stringify(state));
      }
      return state;
    }
  } catch {
    // unreadable storage
  }
  const first = newSession("Session 1");
  return {
    v: DATA_VERSION,
    sessions: [first],
    currentId: first.id,
    autoTimer: true,
  };
}

// only the main overlay window closes the timers left open (the detached
// window opening later must not stop a map that is really running)
// (no window in the tests)
const isMainWindow =
  typeof window !== "undefined" &&
  !new URLSearchParams(window.location.search).has("atziri");
export const farm = shallowRef<FarmState>(load(isMainWindow));

setInterval(() => {
  if (!farm.value.sessions.some((sess) => timerRunning(sess))) return;
  try {
    localStorage.setItem(ALIVE_KEY, String(Date.now()));
  } catch {
    // storage unavailable
  }
}, ALIVE_EVERY_MS);

function save() {
  // a failed write is shown on the page (atziri-storage)
  writeItem(KEY, JSON.stringify({ ...farm.value, v: DATA_VERSION }));
}

// the other window (overlay / detached window) changed the data
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) farm.value = load();
  });
}

/** Applies a change to the state, then saves it */
export function update(fn: (s: FarmState) => void) {
  const copy: FarmState = JSON.parse(JSON.stringify(farm.value));
  fn(copy);
  farm.value = copy;
  save();
}

export const session = computed(
  () =>
    farm.value.sessions.find((s) => s.id === farm.value.currentId) ??
    farm.value.sessions[0],
);

function cur(s: FarmState) {
  return s.sessions.find((x) => x.id === s.currentId) ?? s.sessions[0];
}

/**
 * The map of the current run: the one chosen by "Run suivante" (sessions of
 * the first versions: the first map without divines).
 */
function waitingMap(sess: FarmSession, create = true): FarmMap | undefined {
  let m =
    sess.maps.find((x) => x.id === sess.currentMapId) ??
    sess.maps.find((x) => x.divines == null);
  if (!m && create) {
    m = emptyMap();
    sess.maps.push(m);
  }
  if (m) sess.currentMapId = m.id;
  return m;
}

export function waitingMapId(sess: FarmSession) {
  return (
    sess.maps.find((x) => x.id === sess.currentMapId) ??
    sess.maps.find((x) => x.divines == null)
  )?.id;
}

/** true while the time of a map is counted */
export function timerRunning(sess: FarmSession) {
  return sess.maps.some((m) => m.enteredAt != null);
}

// ---- totals ----
export function totals(sess: FarmSession, now: number) {
  const done = sess.maps.filter((m) => m.divines != null);
  const gained = done.reduce((a, m) => a + (m.divines ?? 0), 0);
  const profit = gained - sess.invested;
  // session time = time spent inside the maps only
  const elapsed = sess.maps.reduce((a, m) => a + mapTime(m, now), 0);
  const hours = elapsed / 3600000;
  // the investment is spread over all the maps of the session (the lines
  // planned), not only over the ones already filled (audit F5)
  const planned = Math.max(sess.maps.length, done.length);
  const investedPerMap = planned ? sess.invested / planned : null;
  return {
    done: done.length,
    gained,
    profit,
    elapsed,
    // net: the investment of the maps played is taken off (time in maps only,
    // the time in the hideout is not counted)
    perHour:
      hours > 1 / 60
        ? (gained - (investedPerMap ?? 0) * done.length) / hours
        : null,
    investedPerMap,
    profitPerMap:
      done.length && investedPerMap != null
        ? gained / done.length - investedPerMap
        : null,
  };
}

/** Time of a map typed by hand (minutes), the map timer is stopped */
export function setMapTime(id: number, minutes: number | null) {
  update((s) => {
    const m = cur(s).maps.find((x) => x.id === id);
    if (!m) return;
    m.enteredAt = null;
    m.timeMs =
      minutes != null && Number.isFinite(minutes) && minutes >= 0
        ? Math.round(minutes * 60000)
        : 0;
  });
}

export function mapTime(m: FarmMap, now: number) {
  return m.timeMs + (m.enteredAt ? now - m.enteredAt : 0);
}

// ---- actions ----
export function selectSession(id: number) {
  update((s) => {
    s.currentId = id;
  });
}

export function addSession(title: string) {
  update((s) => {
    const sess = newSession(title || `Session ${s.sessions.length + 1}`);
    s.sessions.unshift(sess);
    s.currentId = sess.id;
  });
}

export function renameSession(title: string) {
  update((s) => {
    if (title.trim()) cur(s).title = title.trim();
  });
}

export function deleteSession() {
  update((s) => {
    s.sessions = s.sessions.filter((x) => x.id !== s.currentId);
    if (!s.sessions.length) s.sessions.push(newSession("Session 1"));
    s.currentId = s.sessions[0].id;
  });
}

export function setInvested(v: number) {
  update((s) => {
    cur(s).invested = Number.isFinite(v) && v >= 0 ? v : 0;
  });
}

export function addMaps(count: number) {
  const n = Math.max(1, Math.min(50, Math.floor(count) || 1));
  update((s) => {
    for (let i = 0; i < n; i++) cur(s).maps.push(emptyMap());
  });
}

export function removeMap(id: number) {
  update((s) => {
    const sess = cur(s);
    sess.maps = sess.maps.filter((m) => m.id !== id);
  });
}

export function setMapName(id: number, name: string) {
  update((s) => {
    const m = cur(s).maps.find((x) => x.id === id);
    if (m) {
      m.name = name;
      m.nameAuto = false;
    }
  });
}

/** Divines gained by a map (the next run starts only with "Run suivante") */
export function setMapDivines(id: number, value: number | null) {
  update((s) => {
    const m = cur(s).maps.find((x) => x.id === id);
    if (!m) return;
    m.divines = value != null && Number.isFinite(value) ? value : null;
  });
}

/**
 * "Run suivante" button: the current map is finished, the next line becomes
 * the current run (created if needed). Still inside a map: the time goes on
 * on the new line.
 */
export function nextRun() {
  update((s) => {
    const sess = cur(s);
    const now = Date.now();
    const m = waitingMap(sess)!;
    const running = m.enteredAt != null;
    if (m.enteredAt) {
      m.timeMs += now - m.enteredAt;
      m.enteredAt = null;
    }
    const i = sess.maps.indexOf(m);
    let next = sess.maps[i + 1];
    if (!next) {
      next = emptyMap();
      sess.maps.push(next);
    }
    sess.currentMapId = next.id;
    if (running) next.enteredAt = now;
  });
}

export function setMapLoots(id: number, text: string) {
  update((s) => {
    const m = cur(s).maps.find((x) => x.id === id);
    if (m) {
      m.loots = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    }
  });
}

/** Ctrl + T: adds an item to the loots of the map waiting to be filled */
export function addLoot(label: string) {
  update((s) => {
    const m = waitingMap(cur(s))!;
    m.loots.push(label);
  });
}

/** Start / Pause by hand: counts the time of the current map */
export function toggleTimer() {
  update((s) => {
    const sess = cur(s);
    const now = Date.now();
    if (timerRunning(sess)) {
      for (const m of sess.maps) {
        if (m.enteredAt) {
          m.timeMs += now - m.enteredAt;
          m.enteredAt = null;
        }
      }
    } else {
      waitingMap(sess)!.enteredAt = now;
    }
  });
}

/** Back to zero: the times of all the maps of the session */
export function resetTimer() {
  update((s) => {
    const now = Date.now();
    for (const m of cur(s).maps) {
      m.timeMs = 0;
      if (m.enteredAt) m.enteredAt = now;
    }
  });
}

export function setAutoTimer(on: boolean) {
  update((s) => {
    s.autoTimer = on;
  });
}

// ---- automatic timer from the game log ----
let inMapSince = 0; // when the current map zone was entered (for its name)

function isMapZone(zone: string) {
  const z = zone.toLowerCase();
  return z.startsWith("map") && !z.includes("hideout") && !z.includes("town");
}

function prettyZone(zone: string) {
  const z = zone.replace(/^map_?/i, "");
  return z.charAt(0).toUpperCase() + z.slice(1);
}

/** Called for zone changes read in the game log (overlay window only) */
export function handleFarmLogEvent(e: ClientLogEvent) {
  if (!farm.value.autoTimer) return;
  const now = Date.now();
  if (e.type === "load-zone") {
    if (isMapZone(e.zone)) {
      inMapSince = now;
      update((s) => {
        const m = waitingMap(cur(s))!;
        if (!m.enteredAt) m.enteredAt = now;
        if (!m.name) {
          m.name = prettyZone(e.zone);
          m.nameAuto = true;
        }
      });
    } else {
      inMapSince = 0;
      // left the map (hideout, town...): its timer stops until it comes back
      update((s) => {
        for (const m of cur(s).maps) {
          if (m.enteredAt) {
            m.timeMs += now - m.enteredAt;
            m.enteredAt = null;
          }
        }
      });
    }
  } else if (e.type === "map-nav") {
    // translated name of the area, written just after entering it
    const name = e.mapName.trim();
    if (
      !inMapSince ||
      now - inMapSince > 15000 ||
      /^\(.*\)$/.test(name) ||
      name === "Atlas" ||
      /^Act \d/.test(name)
    ) {
      return;
    }
    update((s) => {
      const m = waitingMap(cur(s), false);
      if (m && m.enteredAt && (m.nameAuto || !m.name)) {
        m.name = name;
        m.nameAuto = true;
      }
    });
  }
}

// ---- export (Excel opens .csv files) ----
export function exportCsv(sess: FarmSession) {
  const t = totals(sess, Date.now());
  const fmt = (n: number | null) =>
    n == null ? "" : String(Math.round(n * 100) / 100).replace(".", ",");
  const time = (ms: number) => {
    const m = Math.round(ms / 60000);
    return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
  };
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows: string[][] = [
    [esc(sess.title)],
    [],
    ["Map", "Nom", "Divines", "Temps", "Loots"],
    ...sess.maps.map((m, i) => [
      String(i + 1),
      esc(m.name),
      fmt(m.divines),
      m.timeMs ? time(m.timeMs) : "",
      esc(m.loots.join(", ")),
    ]),
    [],
    ["Divines investies", fmt(sess.invested)],
    ["Total gagné", fmt(t.gained)],
    ["Profit total", fmt(t.profit)],
    ["Investi par map", fmt(t.investedPerMap)],
    ["Profit moyen par map", fmt(t.profitPerMap)],
    ["Divines par heure", fmt(t.perHour)],
    ["Temps de session", time(t.elapsed)],
  ];
  const csv = "﻿" + rows.map((r) => r.join(";")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `${sess.title.replace(/[\\/:*?"<>|]/g, "_")}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
