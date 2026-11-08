<template>
  <!-- Atziri Exchange: farming journal (Farm tab of Shift + Space) -->
  <div class="ar-body fm">
    <div class="fm-wrap">
      <!-- session, timer, help -->
      <div class="fm-head">
        <select
          class="ar-search fm-select"
          :value="sess.id"
          @change="selectSession(Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="s in farm.sessions" :key="s.id" :value="s.id">
            {{ s.title }}
          </option>
        </select>
        <button type="button" class="fm-btn" @click="newSessionPrompt">
          + {{ tr("Session", "Session") }}
        </button>
        <template v-if="renaming">
          <input
            v-model="renameText"
            class="ar-search fm-rename"
            @keydown.enter="doRename"
            @keydown.esc="renaming = false"
          />
          <button type="button" class="fm-btn" @click="doRename">OK</button>
        </template>
        <button v-else type="button" class="fm-btn" @click="startRename">
          <i class="fas fa-pen"></i> {{ tr("Renommer", "Rename") }}
        </button>
        <button
          type="button"
          class="fm-btn fm-danger"
          :title="tr('Supprimer cette session', 'Delete this session')"
          @click="confirmDelete"
        >
          <i class="fas fa-trash"></i>
        </button>
        <span class="fm-sp"></span>
        <span class="fm-cap">{{ tr("Chrono auto", "Auto timer") }}</span>
        <button
          type="button"
          class="fm-clock"
          :class="{ on: farm.autoTimer }"
          :title="
            farm.autoTimer
              ? tr(
                  'Chrono auto activé : démarre à l\'entrée en map (clic pour couper)',
                  'Auto timer on: starts when you enter a map (click to turn off)',
                )
              : tr('Chrono auto coupé (clic pour activer)', 'Auto timer off (click to turn on)')
          "
          @click="setAutoTimer(!farm.autoTimer)"
        >
          <i class="fas fa-stopwatch"></i>
        </button>
        <span class="fm-chrono">{{ clock(t.elapsed) }}</span>
        <button type="button" class="fm-btn" @click="toggleTimer">
          <i :class="sess.runningSince ? 'fas fa-pause' : 'fas fa-play'"></i>
          {{ sess.runningSince ? tr("Pause", "Pause") : tr("Démarrer", "Start") }}
        </button>
        <button
          type="button"
          class="fm-btn"
          :title="tr('Remettre le chrono à zéro', 'Reset the timer')"
          @click="resetTimer"
        >
          <i class="fas fa-undo"></i>
        </button>
        <span class="fm-help" tabindex="0">
          ?
          <span class="fm-tip">
            <b>{{ tr("Journal de farm", "Farm journal") }}</b>
            <template v-if="isFr">
              <br />1. Indique tes divines investies (waystones, tablettes…).
              <br />2. Lance une map : avec le chrono auto ⏱, sa ligne démarre seule et prend le nom de la map.
              <br />3. Survole un loot en jeu et fais <b>{{ lootKey }}</b> : il s'ajoute aux loots de la map en cours.
              <br />4. De retour au repaire, tape les divines gagnées : la map suivante attend.
              <br />« + Ajouter » crée d'autres maps, « Exporter » ouvre le tableau dans Excel.
            </template>
            <template v-else>
              <br />1. Enter the divines you invested (waystones, tablets…).
              <br />2. Run a map: with the auto timer ⏱ its line starts by itself and takes the map name.
              <br />3. Hover a loot in game and press <b>{{ lootKey }}</b>: it is added to the current map.
              <br />4. Back in your hideout, type the divines gained: the next map waits.
              <br />"+ Add" creates more maps, "Export" opens the table in Excel.
            </template>
          </span>
        </span>
      </div>

      <!-- results -->
      <div class="fm-kpis">
        <div class="fm-kpi fm-kpi-main">
          <span class="fm-cap">{{ tr("Profit total", "Total profit") }}</span>
          <b :class="t.profit >= 0 ? 'fm-ok' : 'fm-bad'">
            {{ signed(t.profit) }}
            <img src="/images/divine.png" class="fm-div" />
          </b>
          <span class="fm-muted">
            {{ num(t.gained) }} {{ tr("gagnées", "gained") }} − {{ num(sess.invested) }}
            {{ tr("investies", "invested") }}
          </span>
        </div>
        <div class="fm-kpi">
          <span class="fm-cap">{{ tr("Divines investies", "Divines invested") }}</span>
          <input
            type="text"
            inputmode="decimal"
            class="ar-search fm-num fm-invest"
            :value="sess.invested ? num(sess.invested) : ''"
            placeholder="0"
            @change="setInvested(parseNum(($event.target as HTMLInputElement).value) ?? 0)"
          />
        </div>
        <div class="fm-kpi">
          <span class="fm-cap">{{ tr("Par heure", "Per hour") }}</span>
          <b>{{ t.perHour == null ? "—" : num(t.perHour) }}</b>
        </div>
        <div class="fm-kpi">
          <span class="fm-cap">{{ tr("Investi / map", "Invested / map") }}</span>
          <b>{{ t.investedPerMap == null ? "—" : num(t.investedPerMap) }}</b>
        </div>
        <div class="fm-kpi">
          <span class="fm-cap">{{ tr("Profit moyen / map", "Avg profit / map") }}</span>
          <b
            :class="(t.profitPerMap ?? 0) >= 0 ? 'fm-ok' : 'fm-bad'"
            >{{ t.profitPerMap == null ? "—" : signed(t.profitPerMap) }}</b
          >
        </div>
      </div>

      <!-- maps -->
      <div class="fm-table">
        <div class="fm-row fm-row-head">
          <span>#</span>
          <span>{{ tr("Map", "Map") }}</span>
          <span>{{ tr("Temps", "Time") }}</span>
          <span>{{ tr("Divines", "Divines") }}</span>
          <span
            >{{ tr("Loots", "Loots") }}
            <em
              >·
              {{
                tr(
                  `${lootKey} sur un objet pour l'ajouter à la map en cours`,
                  `${lootKey} on an item adds it to the current map`,
                )
              }}</em
            ></span
          >
          <span></span>
        </div>
        <div class="fm-list">
          <div
            v-for="(m, i) in sess.maps"
            :key="m.id"
            class="fm-row"
            :class="{ 'fm-cur': m.id === waitingId }"
          >
            <span class="fm-muted">{{ i + 1 }}</span>
            <span class="fm-name">
              <input
                class="fm-cell"
                :value="m.name"
                :placeholder="m.id === waitingId ? tr('en attente', 'waiting') : ''"
                @change="setMapName(m.id, ($event.target as HTMLInputElement).value)"
              />
              <span v-if="m.enteredAt" class="fm-tag">{{ tr("en cours", "running") }}</span>
            </span>
            <span class="fm-mono" :class="{ 'fm-acc': m.enteredAt }">{{
              mapTime(m, now) ? clock(mapTime(m, now)) : ""
            }}</span>
            <span>
              <input
                type="text"
                inputmode="decimal"
                class="ar-search fm-num"
                :class="{ 'fm-wait': m.id === waitingId }"
                :value="m.divines == null ? '' : num(m.divines)"
                @change="onDivines(m.id, ($event.target as HTMLInputElement).value)"
              />
            </span>
            <span class="fm-loots">
              <textarea
                v-if="openLoots === m.id"
                class="ar-search fm-loot-edit"
                :value="m.loots.join('\n')"
                rows="5"
                @change="setMapLoots(m.id, ($event.target as HTMLTextAreaElement).value)"
                @keydown.esc="openLoots = null"
              ></textarea>
              <span
                v-else
                class="fm-loot-short"
                :title="tr('Clic pour tout voir et modifier', 'Click to see and edit all')"
                @click="openLoots = m.id"
                >{{ m.loots.length ? lootPreview(m.loots) : "—" }}<em
                  v-if="m.loots.length > 3"
                  >+{{ m.loots.length - 3 }} ▾</em
                ></span
              >
              <em
                v-if="openLoots === m.id"
                class="fm-fold"
                @click="openLoots = null"
                >{{ tr("replier", "fold") }} ▴</em
              >
            </span>
            <button
              type="button"
              class="fm-x"
              :title="tr('Supprimer cette map', 'Delete this map')"
              @click="removeMap(m.id)"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="fm-foot">
        <button type="button" class="fm-btn" @click="addMaps(addCount)">
          + {{ tr("Ajouter", "Add") }}
        </button>
        <input
          v-model.number="addCount"
          type="number"
          min="1"
          max="50"
          class="ar-search fm-num fm-count"
        />
        <span class="fm-muted">maps</span>
        <span class="fm-sp"></span>
        <button type="button" class="fm-btn" @click="exportCsv(sess)">
          <i class="fas fa-file-excel"></i> {{ tr("Exporter vers Excel", "Export to Excel") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, onMounted, onUnmounted } from "vue";
import { tr, isFrench } from "@/web/atziri-lang";
import { AppConfig } from "@/web/Config";
import type { ItemCheckWidget } from "@/web/item-check/widget";
import {
  farm,
  session as sess,
  totals,
  mapTime,
  waitingMapId,
  selectSession,
  addSession,
  renameSession,
  deleteSession,
  setInvested,
  addMaps,
  removeMap,
  setMapName,
  setMapDivines,
  setMapLoots,
  toggleTimer,
  resetTimer,
  setAutoTimer,
  exportCsv,
} from "./atziri-farm";

const isFr = computed(() => isFrench());
const now = shallowRef(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 1000);
});
onUnmounted(() => clearInterval(timer));

const t = computed(() => totals(sess.value, now.value));
const waitingId = computed(() => waitingMapId(sess.value));
const openLoots = shallowRef<number | null>(null);
const addCount = shallowRef(5);
const renaming = shallowRef(false);
const renameText = shallowRef("");

const lootKey = computed(() => {
  try {
    const w = AppConfig("item-check") as ItemCheckWidget | undefined;
    return w?.atziriFarmKey || "Ctrl + T";
  } catch {
    return "Ctrl + T";
  }
});

function num(n: number) {
  return (Math.round(n * 100) / 100).toLocaleString(isFr.value ? "fr-FR" : "en-GB");
}
function signed(n: number) {
  return (n > 0 ? "+" : "") + num(n);
}
function clock(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}
function lootPreview(loots: string[]) {
  return loots.slice(0, 3).join(", ");
}

/** "3,5" or "3.5" -> 3.5 ; empty or not a number -> null */
function parseNum(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (s === "") return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

function onDivines(id: number, raw: string) {
  setMapDivines(id, parseNum(raw));
}

function newSessionPrompt() {
  addSession(`${tr("Session", "Session")} ${farm.value.sessions.length + 1}`);
  startRename();
}
function startRename() {
  renameText.value = sess.value.title;
  renaming.value = true;
}
function doRename() {
  renameSession(renameText.value);
  renaming.value = false;
}
function confirmDelete() {
  if (
    window.confirm(
      tr(
        `Supprimer la session « ${sess.value.title} » ?`,
        `Delete the session "${sess.value.title}"?`,
      ),
    )
  ) {
    deleteSession();
  }
}
</script>

<style lang="postcss">
.fm {
  overflow: auto;
}
.fm-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-self: flex-start;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgb(var(--c-gray-900) / 0.88);
}
.fm-head,
.fm-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.fm-sp {
  flex: 1;
}
.fm-select {
  width: auto !important;
  min-width: 12rem;
}
.fm-rename {
  width: 12rem !important;
}
.fm-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: 4px 10px;
  background: var(--surface);
  color: var(--fg);
  font-size: 0.85rem;
}
.fm-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.fm-danger:hover {
  border-color: #d9584a;
  color: #d9584a;
}
.fm-cap {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}
.fm-clock {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--line);
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.fm-clock.on {
  border-color: var(--accent);
  color: var(--accent);
  background: rgb(var(--c-blue-900) / 0.6);
}
.fm-chrono {
  font: 600 1.35rem "IBM Plex Mono", ui-monospace, Consolas, monospace;
  color: var(--fg);
}
.fm-help {
  position: relative;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid var(--muted);
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: help;
}
.fm-help:hover,
.fm-help:focus {
  border-color: var(--accent);
  color: var(--accent);
}
.fm-tip {
  display: none;
  position: absolute;
  right: 0;
  top: 26px;
  z-index: 20;
  width: 22rem;
  border: 1px solid var(--accent);
  border-radius: 6px;
  background: var(--bg);
  padding: 8px 10px;
  font-size: 0.8rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--fg);
  text-align: left;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
}
.fm-help:hover .fm-tip,
.fm-help:focus .fm-tip {
  display: block;
}
.fm-kpis {
  display: grid;
  grid-template-columns: 1.4fr repeat(4, 1fr);
  gap: 10px;
}
.fm-kpi {
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 8px 10px;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.fm-kpi b {
  font: 600 1.2rem "IBM Plex Mono", ui-monospace, Consolas, monospace;
  color: var(--fg);
}
.fm-kpi-main {
  border-color: var(--accent);
}
.fm-kpi-main b {
  font-size: 1.6rem;
  display: flex;
  align-items: center;
  gap: 6px;
}
.fm-div {
  width: 1.3rem;
  height: 1.3rem;
}
.fm-ok {
  color: #9cc46f !important;
}
.fm-bad {
  color: #d9584a !important;
}
.fm-acc {
  color: var(--accent);
}
.fm-muted {
  color: var(--muted);
  font-size: 0.8rem;
}
.fm-mono {
  font-family: "IBM Plex Mono", ui-monospace, Consolas, monospace;
}
.fm-num {
  width: 5.5rem !important;
  text-align: right;
  font-family: "IBM Plex Mono", ui-monospace, Consolas, monospace;
}
.fm-invest {
  margin-top: 2px;
}
.fm-count {
  width: 3.5rem !important;
  text-align: center;
}
.fm-wait {
  border-color: var(--accent) !important;
}
.fm-table {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.fm-row {
  display: grid;
  grid-template-columns: 2rem 14rem 5rem 6.5rem 1fr 1.6rem;
  gap: 8px;
  align-items: start;
  padding: 5px 6px;
  border-bottom: 1px solid var(--line);
}
.fm-row-head {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--muted);
}
.fm-row-head em {
  text-transform: none;
  letter-spacing: 0;
  font-style: normal;
}
.fm-cur {
  background: rgb(var(--c-blue-400) / 0.08);
  box-shadow: inset 3px 0 var(--accent);
}
.fm-name {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.fm-cell {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 1px 4px;
  color: var(--fg);
}
.fm-cell:hover,
.fm-cell:focus {
  border-color: var(--line);
  background: var(--bg);
}
.fm-tag {
  flex: none;
  font-size: 0.65rem;
  border: 1px solid var(--accent);
  border-radius: 3px;
  padding: 0 5px;
  color: var(--accent);
}
.fm-loots {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.fm-loot-short {
  color: var(--muted);
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fm-loot-short em,
.fm-fold {
  color: var(--accent);
  font-style: normal;
  font-size: 0.75rem;
  margin-left: 6px;
  cursor: pointer;
}
.fm-fold {
  align-self: flex-end;
}
.fm-loot-edit {
  width: 100% !important;
  border-color: var(--accent) !important;
  resize: vertical;
  font-size: 0.85rem;
}
.fm-x {
  color: var(--muted);
  opacity: 0.5;
}
.fm-x:hover {
  color: #d9584a;
  opacity: 1;
}
</style>
