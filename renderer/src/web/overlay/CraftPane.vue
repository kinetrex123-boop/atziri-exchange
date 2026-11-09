<template>
  <!-- Atziri Exchange: craft cost tracking (Suivi craft tab of Shift + Space) -->
  <div class="ar-body fm">
    <div class="fm-wrap">
      <!-- session, counter state, help -->
      <div class="fm-head">
        <select
          class="ar-search fm-select"
          :value="sess.id"
          @change="selectCraftSession(Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="s in craft.sessions" :key="s.id" :value="s.id">{{ s.title }}</option>
        </select>
        <button type="button" class="fm-btn" @click="newSessionPrompt">+ {{ tr("Session", "Session") }}</button>
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
        <button type="button" class="fm-btn" :title="tr('Remettre les compteurs à 0', 'Reset the counters')" @click="confirmReset">
          <i class="fas fa-undo"></i> {{ tr("Remettre à 0", "Reset") }}
        </button>
        <button type="button" class="fm-btn fm-danger" :title="tr('Supprimer cette session', 'Delete this session')" @click="confirmDelete">
          <i class="fas fa-trash"></i>
        </button>
        <span class="fm-sp"></span>
        <span class="fm-cap">{{ tr("Comptage des clics", "Click counting") }}</span>
        <span class="cr-state" :class="counterState" :title="stateTitle"><i class="fas fa-circle"></i></span>
        <button v-if="armed" type="button" class="fm-btn" @click="setPaused(!craft.paused)">
          <i :class="craft.paused ? 'fas fa-play' : 'fas fa-pause'"></i>
          {{ craft.paused ? tr("Reprendre", "Resume") : tr("Pause", "Pause") }}
          <span class="fm-muted fm-mono">{{ pauseKey }}</span>
        </button>
        <span class="fm-help" tabindex="0">
          ?
          <span class="fm-tip">
            <b>{{ tr("Suivi de craft", "Craft tracking") }}</b>
            <template v-if="isFr">
              <br />1. « + Ajouter » : choisis les currencies, présages et essences que tu vas utiliser.
              <br />2. Clique sur une carte pour l'<b>armer</b>.
              <br />3. En jeu, chaque <b>Shift + clic gauche</b> ajoute +1 à la carte armée.
              <br />4. <b>{{ pauseKey }}</b> met le compteur en pause (ou le relance). Clique encore sur la carte pour la désarmer.
              <br />Les boutons + et − corrigent un compteur. Le coût vient des prix d'Economy (poe.ninja).
            </template>
            <template v-else>
              <br />1. "+ Add": pick the currencies, omens and essences you will use.
              <br />2. Click a card to <b>arm</b> it.
              <br />3. In game, each <b>Shift + left click</b> adds +1 to the armed card.
              <br />4. <b>{{ pauseKey }}</b> pauses (or resumes) the counter. Click the card again to disarm it.
              <br />The + and − buttons fix a counter. Costs come from the Economy prices (poe.ninja).
            </template>
          </span>
        </span>
      </div>

      <!-- results -->
      <div class="fm-kpis">
        <div class="fm-kpi fm-kpi-main">
          <span class="fm-cap">{{ tr("Coût total de la session", "Total cost of the session") }}</span>
          <b class="fm-acc">
            {{ num(t.divines) }}
            <img src="/images/divine.png" class="fm-div" />
          </b>
          <span class="fm-muted">{{ pricesText }}</span>
        </div>
        <div class="fm-kpi">
          <span class="fm-cap">{{ tr("Currencies utilisées", "Currencies used") }}</span>
          <b>{{ t.used }}</b>
        </div>
        <div class="fm-kpi">
          <span class="fm-cap">{{ tr("En exalts", "In exalts") }}</span>
          <b>{{ exalts }}</b>
        </div>
        <div class="fm-kpi">
          <span class="fm-cap">{{ tr("Durée", "Duration") }}</span>
          <b>{{ duration }}</b>
        </div>
        <div class="fm-kpi">
          <span class="fm-cap">{{ tr("Coût / heure", "Cost / hour") }}</span>
          <b>{{ t.perHour != null ? num(t.perHour) : "—" }}</b>
        </div>
      </div>

      <div class="cr-cols">
        <!-- currencies -->
        <div class="cr-panel">
          <span class="fm-cap">{{
            tr(
              "Mes currencies · clique sur une carte pour l'armer : chaque Shift + clic gauche en jeu ajoute +1",
              "My currencies · click a card to arm it: each Shift + left click in game adds +1",
            )
          }}</span>
          <div class="cr-grid">
            <div
              v-for="e in sess.entries"
              :key="e.key"
              class="cr-card"
              :class="{ arm: craft.armedKey === e.key, paused: craft.armedKey === e.key && craft.paused }"
              :title="tr('Clic : armer / désarmer', 'Click: arm / disarm')"
              @click="toggleArm(e.key)"
            >
              <span v-if="craft.armedKey === e.key" class="cr-armtag">{{
                craft.paused ? tr("EN PAUSE", "PAUSED") : tr("ARMÉE", "ARMED")
              }}</span>
              <img v-if="entryIcon(e)" :src="entryIcon(e)" class="cr-ico" alt="" />
              <span v-else class="cr-ico cr-noico"></span>
              <div class="cr-n">
                <b>{{ entryName(e) }}</b>
                <span>{{ unitText(e.price) }} · {{ tr("total", "total") }} {{ num(e.count * e.price) }} div</span>
              </div>
              <span class="cr-cnt" :class="{ 'fm-acc': craft.armedKey === e.key }">{{ e.count }}</span>
              <div class="cr-pm" @click.stop>
                <button type="button" @click="changeCount(e.key, 1)">+</button>
                <button type="button" @click="changeCount(e.key, -1)">−</button>
              </div>
              <button type="button" class="cr-del" :title="tr('Retirer', 'Remove')" @click.stop="removeEntry(e.key)">✕</button>
            </div>
            <button type="button" class="cr-add" @click="openPicker">
              + {{ tr("Ajouter une currency, un présage ou une essence", "Add a currency, an omen or an essence") }}
            </button>
          </div>

          <!-- picker -->
          <div v-if="picking" class="cr-pick">
            <div class="fm-head">
              <input
                ref="searchEl"
                v-model="search"
                class="ar-search cr-search"
                :placeholder="tr('Rechercher…', 'Search…')"
                @keydown.esc="picking = false"
              />
              <span class="fm-sp"></span>
              <button
                v-for="ty in CRAFT_TYPES"
                :key="ty"
                type="button"
                class="cr-chip"
                :class="{ on: types.has(ty) }"
                @click="toggleType(ty)"
              >
                {{ typeLabel(ty) }}
              </button>
              <button type="button" class="fm-btn" @click="picking = false">{{ tr("Fermer", "Close") }} ✕</button>
            </div>
            <div class="cr-row">
              <span v-if="catalogLoading && !catalog.length" class="fm-muted">
                <i class="fas fa-spinner fa-spin"></i> {{ tr("Chargement des prix…", "Loading prices…") }}
              </span>
              <span v-else-if="!pickList.length" class="fm-muted">{{ tr("Rien trouvé.", "Nothing found.") }}</span>
              <button
                v-for="it in pickList"
                :key="it.key"
                type="button"
                class="cr-chip cr-item"
                :class="{ added: inSession.has(it.key) }"
                @click="addEntry(it)"
              >
                <img v-if="entryIcon(it)" :src="entryIcon(it)" alt="" />
                {{ entryName(it) }}
                <span class="fm-muted">{{ unitText(it.divines) }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- crafting bases -->
        <div class="cr-panel">
          <div class="fm-head">
            <span class="fm-cap">{{ tr("Bases à crafter", "Bases to craft") }}</span>
            <span class="fm-sp"></span>
            <button type="button" class="fm-btn" @click="startAddBase">+ {{ tr("Coller un lien trade", "Paste a trade link") }}</button>
          </div>
          <div v-if="addingBase" class="cr-base on">
            <div class="cr-n">
              <input
                ref="baseUrlEl"
                v-model.trim="baseUrl"
                class="ar-search"
                :placeholder="tr('Lien trade : https://www.pathofexile.com/trade2/search/…', 'Trade link: https://www.pathofexile.com/trade2/search/…')"
                @keydown.enter="saveBase"
                @keydown.esc="addingBase = false"
              />
              <input
                v-model="baseName"
                class="ar-search cr-mt"
                :placeholder="tr('Nom de la case (ex. Tunique évasion ilvl 82)', 'Name (e.g. Evasion tunic ilvl 82)')"
                @keydown.enter="saveBase"
                @keydown.esc="addingBase = false"
              />
              <span v-if="baseError" class="cr-err">{{ baseError }}</span>
            </div>
            <button type="button" class="fm-btn" @click="saveBase">OK</button>
          </div>
          <div v-for="b in craft.bases" :key="b.id" class="cr-base">
            <div class="cr-n">
              <input
                v-if="renamingBase === b.id"
                v-model="baseRenameText"
                class="ar-search"
                @keydown.enter="doRenameBase(b.id)"
                @keydown.esc="renamingBase = null"
                @blur="doRenameBase(b.id)"
              />
              <b v-else>{{ b.name }}</b>
              <span class="cr-url">{{ b.url.replace(/^https?:\/\//, "") }}</span>
            </div>
            <button type="button" class="fm-btn" :title="tr('Ouvrir dans l\'onglet Trade', 'Open in the Trade tab')" @click="openInHub(b.url, 'trade')">
              {{ tr("Ouvrir", "Open") }} <i class="fas fa-external-link-alt"></i>
            </button>
            <button type="button" class="cr-x" :title="tr('Renommer', 'Rename')" @click="startRenameBase(b.id, b.name)"><i class="fas fa-pen"></i></button>
            <button type="button" class="cr-x" :title="tr('Supprimer', 'Delete')" @click="removeBase(b.id)">✕</button>
          </div>
          <p v-if="!craft.bases.length && !addingBase" class="fm-muted">
            {{ tr("Colle ici les liens trade de tes bases : « Ouvrir » relance la recherche dans l'onglet Trade.", "Paste the trade links of your bases here: \"Open\" runs the search again in the Trade tab.") }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch, nextTick, onMounted, onUnmounted } from "vue";
import { tr, isFrench } from "@/web/atziri-lang";
import { AppConfig } from "@/web/Config";
import type { ItemCheckWidget } from "@/web/item-check/widget";
import { hubTab, openInHub } from "./atziri-hub";
import { rates } from "./atziri-money";
import {
  craft,
  craftSession as sess,
  craftTotals,
  armedEntry,
  entryName,
  entryIcon,
  selectCraftSession,
  addCraftSession,
  renameCraftSession,
  deleteCraftSession,
  resetCraftSession,
  addEntry,
  removeEntry,
  changeCount,
  toggleArm,
  setPaused,
  addBase,
  renameBase,
  removeBase,
  catalog,
  catalogAt,
  catalogLoading,
  loadCatalog,
  CRAFT_TYPES,
} from "./atziri-craft";

const isFr = computed(() => isFrench());
const t = computed(() => craftTotals(sess.value));
const armed = computed(() => armedEntry.value != null);

const pauseKey = computed(() => {
  try {
    const w = AppConfig("item-check") as ItemCheckWidget | undefined;
    return w?.atziriCraftPauseKey || "Ctrl + Alt + C";
  } catch {
    return "Ctrl + Alt + C";
  }
});

const counterState = computed(() =>
  !armed.value ? "off" : craft.value.paused ? "paused" : "on",
);
const stateTitle = computed(() =>
  !armed.value
    ? tr("Aucune carte armée : les clics ne sont pas comptés", "No card armed: clicks are not counted")
    : craft.value.paused
      ? tr("En pause", "Paused")
      : tr("Les Shift + clic gauche en jeu sont comptés", "Shift + left clicks in game are counted"),
);

function num(n: number) {
  return (Math.round(n * 100) / 100).toLocaleString(isFr.value ? "fr-FR" : "en-GB");
}
/** price of one: Exalted Orbs under 1 Divine, else Divine Orbs */
function unitText(divines: number) {
  const exa = rates.value.exalted;
  if (divines >= 1 || !exa) return `${num(divines)} div`;
  const e = divines * exa;
  return `${e >= 10 ? Math.round(e) : num(e)} ex`;
}
const exalts = computed(() => {
  const exa = rates.value.exalted;
  return exa ? Math.round(t.value.divines * exa).toLocaleString(isFr.value ? "fr-FR" : "en-GB") : "—";
});
const duration = computed(() => {
  const m = Math.round(t.value.duration / 60000);
  if (!t.value.duration) return "—";
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`;
});

// clock for "updated N min ago"
const now = shallowRef(Date.now());
let clock: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  clock = setInterval(() => {
    now.value = Date.now();
    if (hubTab.value === "crafttrack") loadCatalog().catch(() => undefined);
  }, 30000);
});
onUnmounted(() => clearInterval(clock));
const pricesText = computed(() => {
  if (!catalogAt.value) {
    return catalogLoading.value
      ? tr("chargement des prix…", "loading prices…")
      : tr("prix Economy (poe.ninja)", "Economy prices (poe.ninja)");
  }
  const m = Math.floor((now.value - catalogAt.value) / 60000);
  return m < 1
    ? tr("prix Economy (poe.ninja), à l'instant", "Economy prices (poe.ninja), just now")
    : tr(`prix Economy (poe.ninja), il y a ${m} min`, `Economy prices (poe.ninja), ${m} min ago`);
});

watch(
  hubTab,
  (tab) => {
    if (tab === "crafttrack") loadCatalog().catch(() => undefined);
  },
  { immediate: true },
);

// ---- sessions ----
const renaming = shallowRef(false);
const renameText = shallowRef("");
function newSessionPrompt() {
  addCraftSession(`Craft ${craft.value.sessions.length + 1}`);
  startRename();
}
function startRename() {
  renameText.value = sess.value.title;
  renaming.value = true;
}
function doRename() {
  renameCraftSession(renameText.value);
  renaming.value = false;
}
function confirmReset() {
  if (window.confirm(tr("Remettre tous les compteurs de cette session à 0 ?", "Reset all the counters of this session?"))) {
    resetCraftSession();
  }
}
function confirmDelete() {
  if (
    window.confirm(
      tr(`Supprimer la session « ${sess.value.title} » ?`, `Delete the session "${sess.value.title}"?`),
    )
  ) {
    deleteCraftSession();
  }
}

// ---- picker ----
const picking = shallowRef(false);
const search = shallowRef("");
const searchEl = shallowRef<HTMLInputElement | null>(null);
const types = shallowRef(new Set<string>(CRAFT_TYPES));
function openPicker() {
  picking.value = true;
  loadCatalog().catch(() => undefined);
  nextTick(() => searchEl.value?.focus());
}
function toggleType(ty: string) {
  const next = new Set(types.value);
  if (next.has(ty)) next.delete(ty);
  else next.add(ty);
  types.value = next;
}
function typeLabel(ty: string) {
  if (ty === "Ritual") return tr("Présages", "Omens");
  if (ty === "Essences") return tr("Essences", "Essences");
  return "Currency";
}
const inSession = computed(() => new Set(sess.value.entries.map((e) => e.key)));
function plain(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
const pickList = computed(() => {
  const q = plain(search.value.trim());
  return catalog.value
    .filter((it) => types.value.has(it.type))
    .filter((it) => !q || plain(entryName(it)).includes(q) || plain(it.ref).includes(q))
    .slice(0, 60);
});

// ---- crafting bases ----
const addingBase = shallowRef(false);
const baseUrl = shallowRef("");
const baseName = shallowRef("");
const baseError = shallowRef("");
const baseUrlEl = shallowRef<HTMLInputElement | null>(null);
function startAddBase() {
  addingBase.value = true;
  baseUrl.value = "";
  baseName.value = "";
  baseError.value = "";
  nextTick(() => baseUrlEl.value?.focus());
}
function saveBase() {
  const url = baseUrl.value;
  if (!/^https:\/\/[\w.-]*(pathofexile\.com|poe\.game\.qq\.com)\/trade2?\//.test(url)) {
    baseError.value = tr(
      "Colle un lien du site trade (pathofexile.com/trade2/…).",
      "Paste a link from the trade site (pathofexile.com/trade2/…).",
    );
    return;
  }
  addBase(url, baseName.value.trim() || `Base ${craft.value.bases.length + 1}`);
  addingBase.value = false;
}
const renamingBase = shallowRef<number | null>(null);
const baseRenameText = shallowRef("");
function startRenameBase(id: number, name: string) {
  renamingBase.value = id;
  baseRenameText.value = name;
}
function doRenameBase(id: number) {
  if (renamingBase.value !== id) return;
  renameBase(id, baseRenameText.value);
  renamingBase.value = null;
}
</script>

<style lang="postcss">
.cr-state {
  font-size: 0.7rem;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid var(--line);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
}
.cr-state.on {
  border-color: #9cc46f;
  color: #9cc46f;
}
.cr-state.paused {
  border-color: var(--accent);
  color: var(--accent);
}
.cr-cols {
  display: grid;
  grid-template-columns: 1.75fr 1fr;
  gap: 14px;
  align-items: start;
}
.cr-panel {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px 12px;
  background: rgb(var(--c-gray-900) / 0.6);
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.cr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15.5rem, 1fr));
  gap: 10px 8px;
  margin-top: 6px;
}
.cr-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface);
  padding: 7px 9px;
  cursor: pointer;
}
.cr-card:hover {
  border-color: var(--accent);
}
.cr-card.arm {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent), 0 0 14px rgb(216 162 79 / 0.25);
}
.cr-card.paused {
  box-shadow: none;
  border-style: dashed;
}
.cr-armtag {
  position: absolute;
  top: -8px;
  left: 10px;
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  background: var(--accent);
  color: #1a120c;
  border-radius: 3px;
  padding: 0 6px;
}
.cr-ico {
  width: 30px;
  height: 30px;
  flex: none;
  object-fit: contain;
}
.cr-noico {
  border-radius: 50%;
  background: var(--line);
}
.cr-n {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.cr-n b {
  font-weight: 600;
  line-height: 1.2;
}
.cr-n span {
  font-size: 0.75rem;
  color: var(--muted);
}
.cr-cnt {
  font: 600 1.3rem "IBM Plex Mono", ui-monospace, Consolas, monospace;
  min-width: 2.2rem;
  text-align: right;
}
.cr-pm {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.fm-wrap .cr-pm button {
  width: 20px;
  height: 18px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 3px;
  font-size: 0.8rem;
  line-height: 16px;
  text-align: center;
  color: var(--fg);
}
.fm-wrap .cr-pm button:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.fm-wrap .cr-del {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 0.65rem;
  color: var(--muted);
  display: none;
}
.cr-card:hover .cr-del {
  display: block;
}
.fm-wrap .cr-del:hover {
  color: #d9584a;
}
.fm-wrap .cr-add {
  border: 1px dashed var(--line);
  border-radius: 7px;
  color: var(--muted);
  min-height: 48px;
  padding: 6px 10px;
  font-size: 0.85rem;
}
.fm-wrap .cr-add:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.cr-pick {
  border: 1px solid var(--accent);
  border-radius: 7px;
  background: var(--bg);
  padding: 8px 10px;
}
.cr-search {
  width: 16rem !important;
}
.cr-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  max-height: 16rem;
  overflow: auto;
}
.fm-wrap .cr-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 2px 10px;
  font-size: 0.8rem;
  background: var(--surface);
  color: var(--fg);
}
.fm-wrap .cr-chip.on,
.fm-wrap .cr-chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.fm-wrap .cr-item {
  padding-left: 3px;
}
.fm-wrap .cr-item img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}
.fm-wrap .cr-item.added {
  opacity: 0.45;
}
.cr-base {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  padding: 7px 10px;
}
.cr-base.on {
  border-color: var(--accent);
}
.cr-url {
  font-family: "IBM Plex Mono", ui-monospace, Consolas, monospace;
  font-size: 0.7rem !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fm-wrap .cr-x {
  color: var(--muted);
  font-size: 0.75rem;
}
.fm-wrap .cr-x:hover {
  color: var(--accent);
}
.cr-mt {
  margin-top: 6px;
}
.cr-err {
  color: #d9584a !important;
  margin-top: 4px;
}
</style>
