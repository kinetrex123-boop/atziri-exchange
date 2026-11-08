// Atziri Exchange: Farm tab of the Shift + Space page.
// Farming sessions: divines invested, one line per map (divines gained,
// loots, time), totals. Saved on this PC (localStorage) and kept in sync
// between the overlay and the detached window.
import { shallowRef, computed } from "vue";
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
  elapsedMs: number; // session timer, paused part
  runningSince: number | null;
}

interface FarmState {
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
  return {
    id: newId(),
    title,
    invested: 0,
    maps: Array.from({ length: count }, emptyMap),
    elapsedMs: 0,
    runningSince: null,
  };
}

function load(): FarmState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (s && Array.isArray(s.sessions) && s.sessions.length) {
      return {
        sessions: s.sessions,
        currentId: s.currentId ?? s.sessions[0].id,
        autoTimer: s.autoTimer !== false,
      };
    }
  } catch {
    // unreadable storage
  }
  const first = newSession("Session 1");
  return { sessions: [first], currentId: first.id, autoTimer: true };
}

export const farm = shallowRef<FarmState>(load());

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(farm.value));
  } catch {
    // storage unavailable
  }
}

// the other window (overlay / detached window) changed the data
window.addEventListener("storage", (e) => {
  if (e.key === KEY) farm.value = load();
});

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

/** The map waiting to be filled: first one without divines */
function waitingMap(sess: FarmSession, create = true): FarmMap | undefined {
  let m = sess.maps.find((x) => x.divines == null);
  if (!m && create) {
    m = emptyMap();
    sess.maps.push(m);
  }
  return m;
}

export function waitingMapId(sess: FarmSession) {
  return sess.maps.find((x) => x.divines == null)?.id;
}

// ---- totals ----
export function totals(sess: FarmSession, now: number) {
  const done = sess.maps.filter((m) => m.divines != null);
  const gained = done.reduce((a, m) => a + (m.divines ?? 0), 0);
  const profit = gained - sess.invested;
  const elapsed =
    sess.elapsedMs + (sess.runningSince ? now - sess.runningSince : 0);
  const hours = elapsed / 3600000;
  return {
    done: done.length,
    gained,
    profit,
    elapsed,
    perHour: hours > 1 / 60 ? gained / hours : null,
    investedPerMap: done.length ? sess.invested / done.length : null,
    profitPerMap: done.length ? profit / done.length : null,
  };
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

/** Divines gained by a map: filling it closes its timer */
export function setMapDivines(id: number, value: number | null) {
  update((s) => {
    const m = cur(s).maps.find((x) => x.id === id);
    if (!m) return;
    m.divines = value != null && Number.isFinite(value) ? value : null;
    if (m.divines != null && m.enteredAt) {
      m.timeMs += Date.now() - m.enteredAt;
      m.enteredAt = null;
    }
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

export function toggleTimer() {
  update((s) => {
    const sess = cur(s);
    if (sess.runningSince) {
      sess.elapsedMs += Date.now() - sess.runningSince;
      sess.runningSince = null;
    } else {
      sess.runningSince = Date.now();
    }
  });
}

export function resetTimer() {
  update((s) => {
    const sess = cur(s);
    sess.elapsedMs = 0;
    sess.runningSince = sess.runningSince ? Date.now() : null;
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
        const sess = cur(s);
        if (!sess.runningSince) sess.runningSince = now;
        const m = waitingMap(sess)!;
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
