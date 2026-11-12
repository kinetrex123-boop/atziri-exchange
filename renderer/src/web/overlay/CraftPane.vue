<template>
  <!-- Atziri Exchange: craft cost tracking (Suivi craft tab of Shift + Space) -->
  <div class="ar-body fm">
    <div class="fm-wrap">
      <!-- session, counter state, help -->
      <div class="fm-head">
        <CraftViewSwitch />
        <select
          class="ar-search fm-select"
          :value="sess.id"
          @change="selectCraftSession(Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="s in craft.sessions" :key="s.id" :value="s.id">
            {{ s.title }}{{ s.finishedAt ? tr(" (terminée)", " (finished)") : "" }}
          </option>
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
        <button
          type="button"
          class="fm-btn"
          :title="tr('Terminer cette session (elle reste enregistrée) et en commencer une nouvelle', 'Finish this session (it stays saved) and start a new one')"
          @click="confirmFinish"
        >
          <i class="fas fa-flag-checkered"></i> {{ tr("Terminer", "Finish") }}
        </button>
        <button type="button" class="fm-btn fm-danger" :title="tr('Supprimer cette session', 'Delete this session')" @click="confirmDelete">
          <i class="fas fa-trash"></i>
        </button>
        <span class="fm-sp"></span>
        <span class="fm-cap">{{ tr("Comptage des clics", "Click counting") }}</span>
        <span class="cr-state" :class="counterState" :title="stateTitle"><i class="fas fa-circle"></i></span>
        <span class="fm-muted fm-mono">{{ tr("Shift + clic gauche", "Shift + left click") }}</span>
        <button
          v-if="armed"
          type="button"
          class="fm-btn"
          :title="tr(`Raccourci : ${pauseKey}`, `Hotkey: ${pauseKey}`)"
          @click="setPaused(!craft.paused)"
        >
          <i :class="craft.paused ? 'fas fa-play' : 'fas fa-pause'"></i>
          {{ craft.paused ? tr("Reprendre", "Resume") : tr("Pause", "Pause") }}
        </button>
        <span class="fm-help" tabindex="0">
          ?
          <span class="fm-tip">
            <b>{{ tr("Suivi de craft", "Craft tracking") }}</b>
            <template v-if="isFr">
              <br />1. Clique une case de la grille : la currency passe « en cours », compte +1 et elle est <b>armée</b>.
              <br />2. En jeu, chaque <b>Shift + clic gauche</b> ajoute +1 à la currency armée.
              <br />3. <b>{{ pauseKey }}</b> met le compteur en pause (ou le relance).
              <br />4. Clic sur un nombre pour le taper, + et − pour le corriger.
              <br />« Modifier les cases » change le contenu de la grille. Les prix viennent de poe.ninja.
            </template>
            <template v-else>
              <br />1. Click a cell of the grid: the currency becomes "in use" and is <b>armed</b>.
              <br />2. In game, each <b>Shift + left click</b> adds +1 to the armed currency.
              <br />3. <b>{{ pauseKey }}</b> pauses (or resumes) the counter.
              <br />4. Click a number to type it, + and − to fix it.
              <br />"Edit cells" changes what the grid holds. Prices come from poe.ninja.
            </template>
          </span>
        </span>
      </div>

      <!-- results -->
      <div class="cr-sum">
        <div class="fm-kpi fm-kpi-main cr-kpi">
          <span class="fm-cap">{{ tr("Coût total", "Total cost") }}</span>
          <b class="fm-acc">
            {{ num(t.divines) }}
            <img src="/images/divine.png" class="fm-div" />
          </b>
          <span class="fm-muted">{{ pricesText }}</span>
        </div>
        <div class="fm-kpi cr-kpi">
          <span class="fm-cap">{{ tr("Currencies utilisées", "Currencies used") }}</span>
          <b>{{ t.used }}</b>
        </div>
      </div>

      <!-- currencies in use -->
      <div class="cr-panel">
        <span class="fm-cap">{{
          tr(
            "En cours · clic sur une carte : l'armer · clic sur le nombre : le taper",
            "In use · click a card: arm it · click the number: type it",
          )
        }}</span>
        <div v-if="sess.entries.length" class="cr-grid">
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
            <button type="button" class="cr-del" :title="tr('Retirer', 'Remove')" @click.stop="removeEntry(e.key)">✕</button>
            <img v-if="entryIcon(e)" :src="entryIcon(e)" class="cr-ico" alt="" />
            <span v-else class="cr-ico cr-noico"></span>
            <div class="cr-n">
              <b>{{ entryName(e) }}</b>
              <span>{{ unitText(e.price) }} · {{ tr("total", "total") }} {{ unitText(e.count * e.price) }}</span>
            </div>
            <input
              v-if="editingCount === e.key"
              ref="countEl"
              v-model="countText"
              class="cr-cntin"
              inputmode="numeric"
              @click.stop
              @keydown.enter="commitCount(e.key)"
              @keydown.esc="editingCount = null"
              @blur="commitCount(e.key)"
            />
            <span
              v-else
              class="cr-cnt"
              :class="{ 'fm-acc': craft.armedKey === e.key }"
              :title="tr('Clic : taper le nombre', 'Click: type the number')"
              @click.stop="startCount(e.key, e.count)"
            >{{ e.count }}</span>
            <div class="cr-pm" @click.stop>
              <button type="button" @click="changeCount(e.key, 1)">+</button>
              <button type="button" @click="changeCount(e.key, -1)">−</button>
            </div>
          </div>
        </div>
        <p v-else class="fm-muted">
          {{ tr("Clique une case de la grille ci-dessous pour commencer.", "Click a cell of the grid below to start.") }}
        </p>
      </div>

      <!-- grid like the game's Currency stash tab -->
      <div class="cr-cols">
        <div class="cr-panel cr-gridpanel">
          <div class="fm-head">
            <span class="fm-cap">{{
              editing
                ? tr("Modification des cases · clic sur une case pour choisir ce qu'elle contient", "Editing · click a cell to choose what it holds")
                : tr("Mes currencies · clic sur une case : +1 et l'armer", "My currencies · click a cell: +1 and arm it")
            }}</span>
            <span class="fm-sp"></span>
            <template v-if="editing">
              <button type="button" class="fm-btn" @click="confirmResetSlots">
                <i class="fas fa-undo"></i> {{ tr("Disposition par défaut", "Default layout") }}
              </button>
              <button type="button" class="fm-btn cr-done" @click="stopEditing">{{ tr("Terminé", "Done") }}</button>
            </template>
            <button v-else type="button" class="fm-btn" @click="startEditing()">
              <i class="fas fa-pen"></i> {{ tr("Modifier les cases", "Edit cells") }}
            </button>
          </div>
          <div class="cr-stash" :class="{ editing }">
            <div v-for="blk in ['left', 'mid', 'right'] as const" :key="blk" class="cr-blk">
              <template v-for="c in GRID_BLOCKS[blk]" :key="c.id">
                <div
                  v-if="slotKey(c.id) || editing || !c.spacer"
                  class="cr-sl"
                  :class="slotClass(c.id)"
                  :title="slotTitle(c.id)"
                  @click="clickSlot(c.id)"
                >
                  <template v-if="slotKey(c.id)">
                    <img v-if="keyIcon(slotKey(c.id)!)" :src="keyIcon(slotKey(c.id)!)" alt="" />
                    <span v-if="slotCount(c.id)" class="cr-sl-c">{{ slotCount(c.id) }}</span>
                    <span v-if="tierOf(slotKey(c.id)!)" class="cr-sl-t">{{ tierOf(slotKey(c.id)!) }}</span>
                  </template>
                  <span v-else-if="editing" class="cr-sl-plus">+</span>
                </div>
                <div v-else class="cr-gap"></div>
              </template>
            </div>
            <div class="cr-freerow">
              <span class="fm-cap">{{ tr("Mes cases libres", "My free cells") }}</span>
              <div class="cr-frees">
                <div
                  v-for="c in GRID_BLOCKS.free"
                  :key="c.id"
                  class="cr-sl"
                  :class="[slotClass(c.id), { free: !slotKey(c.id) }]"
                  :title="slotTitle(c.id)"
                  @click="clickSlot(c.id)"
                >
                  <template v-if="slotKey(c.id)">
                    <img v-if="keyIcon(slotKey(c.id)!)" :src="keyIcon(slotKey(c.id)!)" alt="" />
                    <span v-if="slotCount(c.id)" class="cr-sl-c">{{ slotCount(c.id) }}</span>
                  </template>
                  <span v-else class="cr-sl-plus">+</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- what to put in the chosen cell -->
        <div v-if="editing" class="cr-panel">
          <span class="fm-cap">{{
            pickCell ? tr("Que mettre dans cette case ?", "What goes in this cell?") : tr("Choisis une case à gauche", "Pick a cell on the left")
          }}</span>
          <div v-if="pickCell" class="cr-pick">
            <div class="cr-ptabs">
              <button
                v-for="ty in CRAFT_TYPES"
                :key="ty"
                type="button"
                :class="{ on: pickType === ty }"
                @click="pickType = ty"
              >
                {{ typeLabel(ty) }}
              </button>
            </div>
            <input
              ref="searchEl"
              v-model="search"
              class="ar-search cr-search"
              :placeholder="tr('Rechercher…', 'Search…')"
            />
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
                :class="{ on: slotKey(pickCell) === it.key }"
                @click="chooseForCell(it.key)"
              >
                <img v-if="entryIcon(it)" :src="entryIcon(it)" alt="" />
                {{ entryName(it) }}
                <span class="fm-muted">{{ unitText(it.divines) }}</span>
              </button>
            </div>
            <div class="fm-head cr-mt">
              <button type="button" class="fm-btn" @click="chooseForCell(null)">{{ tr("Vider la case", "Empty the cell") }}</button>
              <span class="fm-sp"></span>
              <button type="button" class="fm-btn" @click="pickCell = null">{{ tr("Annuler", "Cancel") }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- crafting bases -->
      <div class="cr-panel">
        <div class="fm-head">
          <span class="fm-cap">{{ tr("Bases à crafter", "Bases to craft") }}</span>
          <span class="fm-sp"></span>
          <button v-if="!baseForm" type="button" class="fm-btn" @click="startAddBase">+ {{ tr("Coller un lien trade", "Paste a trade link") }}</button>
        </div>
        <div v-if="craft.bases.length" class="cr-bases">
          <div v-for="b in craft.bases" :key="b.id" class="cr-base">
            <span class="cr-bi" :title="isFr ? baseIcon(b.icon).fr : baseIcon(b.icon).en"><img :src="baseIcon(b.icon).img" alt="" /></span>
            <b class="cr-bname">{{ b.name }}</b>
            <button type="button" class="fm-btn" :title="tr('Ouvrir dans l\'onglet Trade', 'Open in the Trade tab')" @click="openInHub(b.url, 'trade')">
              {{ tr("Ouvrir", "Open") }} <i class="fas fa-external-link-alt"></i>
            </button>
            <button type="button" class="cr-x" :title="tr('Modifier', 'Edit')" @click="startEditBase(b)"><i class="fas fa-pen"></i></button>
            <button type="button" class="cr-x" :title="tr('Supprimer', 'Delete')" @click="confirmRemoveBase(b.id, b.name)">✕</button>
          </div>
        </div>
        <p v-else-if="!baseForm" class="fm-muted">
          {{ tr("Colle ici les liens trade de tes bases : « Ouvrir » relance la recherche dans l'onglet Trade.", "Paste the trade links of your bases here: \"Open\" runs the search again in the Trade tab.") }}
        </p>

        <div v-if="baseForm" class="cr-form">
          <span class="fm-cap">{{ baseForm.id ? tr("Modifier la base", "Edit the base") : tr("Nouvelle base", "New base") }}</span>
          <input
            ref="baseUrlEl"
            v-model.trim="baseForm.url"
            class="ar-search cr-mt"
            :placeholder="tr('Lien trade : https://www.pathofexile.com/trade2/search/…', 'Trade link: https://www.pathofexile.com/trade2/search/…')"
            @keydown.enter="saveBase"
            @keydown.esc="baseForm = null"
          />
          <input
            v-model="baseForm.name"
            class="ar-search cr-mt"
            :placeholder="tr('Nom de la case (ex. Tunique évasion ilvl 82)', 'Name (e.g. Evasion tunic ilvl 82)')"
            @keydown.enter="saveBase"
            @keydown.esc="baseForm = null"
          />
          <span class="fm-cap cr-mt">{{ tr("Icône", "Icon") }}</span>
          <div class="cr-icons">
            <button
              v-for="ic in CRAFT_BASE_ICONS"
              :key="ic.id"
              type="button"
              class="cr-icb"
              :class="{ on: baseForm.icon === ic.id }"
              @click="baseForm.icon = ic.id"
            >
              <span><img :src="ic.img" alt="" /></span>
              {{ isFr ? ic.fr : ic.en }}
            </button>
          </div>
          <div class="fm-head cr-mt">
            <span v-if="baseError" class="cr-err">{{ baseError }}</span>
            <span class="fm-sp"></span>
            <button type="button" class="fm-btn" @click="baseForm = null">{{ tr("Annuler", "Cancel") }}</button>
            <button type="button" class="fm-btn cr-done" @click="saveBase">OK</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, ref, watch, nextTick, onMounted, onUnmounted } from "vue";
import { tr, isFrench } from "@/web/atziri-lang";
import { AppConfig } from "@/web/Config";
import type { ItemCheckWidget } from "@/web/item-check/widget";
import { hubTab, hubVisible, openInHub, isTradeUrl } from "./atziri-hub";
import CraftViewSwitch from "./CraftViewSwitch.vue";
import { rates } from "./atziri-money";
import { CRAFT_BASE_ICONS, baseIcon } from "./atziri-craft-icons";
import { askConfirm } from "./atziri-confirm";
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
  finishCraftSession,
  removeEntry,
  changeCount,
  setCount,
  toggleArm,
  setPaused,
  addBase,
  updateBase,
  removeBase,
  catalog,
  catalogAt,
  catalogLoading,
  loadCatalog,
  CRAFT_TYPES,
  CRAFT_TYPE_LABELS,
  GRID_BLOCKS,
  slotKey,
  setSlot,
  resetSlots,
  useSlotItem,
  type CraftBase,
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
    ? tr("Aucune currency armée : les clics ne sont pas comptés", "Nothing armed: clicks are not counted")
    : craft.value.paused
      ? tr("En pause", "Paused")
      : tr("Les Shift + clic gauche en jeu sont comptés", "Shift + left clicks in game are counted"),
);

function num(n: number) {
  return (Math.round(n * 100) / 100).toLocaleString(isFr.value ? "fr-FR" : "en-GB");
}
/** an amount: Exalted Orbs up to 100, then Chaos Orbs up to 30, then Divine Orbs */
function unitText(divines: number) {
  const { exalted: exa, chaos } = rates.value;
  const short = (n: number) => (n >= 10 ? Math.round(n).toLocaleString(isFr.value ? "fr-FR" : "en-GB") : num(n));
  if (exa && divines * exa <= 100) return `${short(divines * exa)} ex`;
  if (chaos && divines * chaos <= 30) return `${short(divines * chaos)} chaos`;
  return `${num(divines)} div`;
}

// clock for "updated N min ago"
const now = shallowRef(Date.now());
let clock: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  clock = setInterval(() => {
    // nothing to refresh while the page is closed or on another tab
    if (!hubVisible.value || hubTab.value !== "crafttrack") return;
    now.value = Date.now();
    loadCatalog().catch(() => undefined);
  }, 30000);
});
onUnmounted(() => clearInterval(clock));
const pricesText = computed(() => {
  if (!catalogAt.value) {
    return catalogLoading.value
      ? tr("chargement des prix…", "loading prices…")
      : tr("prix poe.ninja", "poe.ninja prices");
  }
  const m = Math.floor((now.value - catalogAt.value) / 60000);
  return m < 1
    ? tr("prix poe.ninja, à l'instant", "poe.ninja prices, just now")
    : tr(`prix poe.ninja, il y a ${m} min`, `poe.ninja prices, ${m} min ago`);
});

watch(
  [hubTab, hubVisible],
  ([tab, visible]) => {
    if (tab !== "crafttrack" || !visible) return;
    now.value = Date.now();
    loadCatalog().catch(() => undefined);
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
async function confirmFinish() {
  if (
    await askConfirm(
      tr(
        `Terminer « ${sess.value.title} » ? Elle reste enregistrée dans la liste des sessions, et une nouvelle session vide commence.`,
        `Finish "${sess.value.title}"? It stays saved in the session list, and a new empty session starts.`,
      ),
    )
  ) {
    finishCraftSession(`Craft ${craft.value.sessions.length + 1}`);
  }
}
async function confirmDelete() {
  if (
    await askConfirm(
      tr(`Supprimer la session « ${sess.value.title} » ?`, `Delete the session "${sess.value.title}"?`),
    )
  ) {
    deleteCraftSession();
  }
}

// ---- typing a count ----
const editingCount = shallowRef<string | null>(null);
const countText = shallowRef("");
const countEl = ref<HTMLInputElement[] | HTMLInputElement | null>(null);
function startCount(key: string, n: number) {
  editingCount.value = key;
  countText.value = String(n);
  nextTick(() => {
    const el = Array.isArray(countEl.value) ? countEl.value[0] : countEl.value;
    el?.focus();
    el?.select();
  });
}
function commitCount(key: string) {
  if (editingCount.value !== key) return;
  const v = Number(countText.value.trim().replace(/\s/g, ""));
  if (Number.isFinite(v)) setCount(key, v);
  editingCount.value = null;
}

// ---- grid ----
const editing = shallowRef(false);
const pickCell = shallowRef<string | null>(null);
const pickType = shallowRef<string>("Currency");
const search = shallowRef("");
const searchEl = shallowRef<HTMLInputElement | null>(null);

const counts = computed(() => new Map(sess.value.entries.map((e) => [e.key, e.count])));
const catalogByKey = computed(() => new Map(catalog.value.map((c) => [c.key, c])));

function refOf(key: string) {
  return key.split("|").slice(1).join("|");
}
function keyIcon(key: string) {
  const c = catalogByKey.value.get(key);
  return entryIcon({ ref: refOf(key), icon: c?.icon });
}
function tierOf(key: string) {
  const r = refOf(key);
  if (/^Greater /.test(r) && !/Jeweller/.test(r)) return "II";
  if (/^Perfect /.test(r) && !/Jeweller/.test(r)) return "III";
  return "";
}
function slotCount(id: string) {
  const k = slotKey(id);
  return k ? counts.value.get(k) ?? 0 : 0;
}
function slotClass(id: string) {
  const k = slotKey(id);
  return {
    has: k != null && counts.value.has(k),
    arm: k != null && craft.value.armedKey === k,
    picking: editing.value && pickCell.value === id,
  };
}
function slotTitle(id: string) {
  const k = slotKey(id);
  if (!k) return editing.value ? tr("Case vide : clic pour choisir", "Empty cell: click to choose") : "";
  const c = catalogByKey.value.get(k);
  const name = entryName({ ref: refOf(k) });
  return c ? `${name} · ${unitText(c.divines)}` : name;
}
function clickSlot(id: string) {
  if (editing.value) {
    pickCell.value = id;
    const k = slotKey(id);
    if (k) pickType.value = k.split("|")[0];
    search.value = "";
    nextTick(() => searchEl.value?.focus());
    return;
  }
  const k = slotKey(id);
  if (k) useSlotItem(k);
  else startEditing(id);
}
function startEditing(id?: string) {
  editing.value = true;
  pickCell.value = id ?? null;
  loadCatalog().catch(() => undefined);
}
function stopEditing() {
  editing.value = false;
  pickCell.value = null;
}
async function confirmResetSlots() {
  if (await askConfirm(tr("Remettre toutes les cases par défaut ?", "Put every cell back to the default?"))) {
    resetSlots();
  }
}
function chooseForCell(key: string | null) {
  if (!pickCell.value) return;
  setSlot(pickCell.value, key);
  pickCell.value = null;
}
function typeLabel(ty: string) {
  const l = CRAFT_TYPE_LABELS[ty];
  return l ? tr(l[0], l[1]) : ty;
}
function plain(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
const pickList = computed(() => {
  const q = plain(search.value.trim());
  return catalog.value
    .filter((it) => it.type === pickType.value)
    .filter((it) => !q || plain(entryName(it)).includes(q) || plain(it.ref).includes(q))
    .sort((a, b) => b.divines - a.divines)
    .slice(0, 150);
});

// ---- crafting bases ----
const baseForm = ref<{ id: number | null; url: string; name: string; icon?: string } | null>(null);
const baseError = shallowRef("");
const baseUrlEl = shallowRef<HTMLInputElement | null>(null);
function startAddBase() {
  baseForm.value = { id: null, url: "", name: "", icon: "armour" };
  baseError.value = "";
  nextTick(() => baseUrlEl.value?.focus());
}
function startEditBase(b: CraftBase) {
  baseForm.value = { id: b.id, url: b.url, name: b.name, icon: baseIcon(b.icon).id };
  baseError.value = "";
}
function saveBase() {
  const f = baseForm.value;
  if (!f) return;
  if (!isTradeUrl(f.url)) {
    baseError.value = tr(
      "Colle un lien du site trade (pathofexile.com/trade2/…).",
      "Paste a link from the trade site (pathofexile.com/trade2/…).",
    );
    return;
  }
  const name = f.name.trim() || `Base ${craft.value.bases.length + 1}`;
  if (f.id) updateBase(f.id, { name, url: f.url, icon: f.icon });
  else addBase(f.url, name, f.icon);
  baseForm.value = null;
}
async function confirmRemoveBase(id: number, name: string) {
  if (await askConfirm(tr(`Supprimer « ${name} » ?`, `Delete "${name}"?`))) removeBase(id);
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
.cr-sum {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.cr-kpi {
  flex-direction: row !important;
  align-items: center;
  gap: 14px !important;
  padding: 8px 14px !important;
}
.cr-cols {
  display: grid;
  grid-template-columns: auto 1fr;
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
  grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
  gap: 12px 8px;
  margin-top: 8px;
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
  border-bottom: 1px dashed transparent;
  cursor: text;
}
.cr-cnt:hover {
  border-bottom-color: var(--muted);
}
.fm-wrap .cr-cntin {
  width: 4.2rem;
  font: 600 1.1rem "IBM Plex Mono", ui-monospace, Consolas, monospace;
  text-align: right;
  border: 1px solid var(--accent);
  border-radius: 4px;
  background: var(--bg);
  color: var(--fg);
  padding: 0 6px;
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
  top: -8px;
  right: -8px;
  width: 18px;
  height: 18px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid #d9584a;
  background: var(--bg);
  color: #d9584a;
  font-size: 0.6rem;
  line-height: 16px;
  text-align: center;
  display: none;
  z-index: 2;
}
.cr-card:hover .cr-del {
  display: block;
}
/* grid like the game stash */
.cr-gridpanel {
  width: fit-content;
}
.cr-stash {
  display: grid;
  grid-template-columns: repeat(3, auto);
  justify-content: space-between;
  gap: 14px 26px;
  margin-top: 4px;
  padding: 12px;
  border: 1px solid #2c241c;
  border-radius: 6px;
  background: #15110e;
}
.cr-blk {
  display: grid;
  grid-template-columns: repeat(3, 52px);
  grid-auto-rows: 52px;
  gap: 6px;
  align-content: start;
}
.cr-freerow {
  grid-column: 1 / -1;
  border-top: 1px solid #2c241c;
  padding-top: 10px;
}
.cr-frees {
  display: grid;
  grid-template-columns: repeat(7, 52px);
  gap: 6px;
  margin-top: 6px;
}
.cr-sl {
  position: relative;
  width: 52px;
  height: 52px;
  border: 1px solid #3d3223;
  border-radius: 3px;
  background: #0d1626;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.cr-sl img {
  width: 42px;
  height: 42px;
  object-fit: contain;
  opacity: 0.4;
  filter: grayscale(0.6);
}
.cr-sl:hover {
  border-color: var(--accent);
}
.cr-sl:hover img,
.cr-sl.has img,
.cr-sl.arm img {
  opacity: 1;
  filter: none;
}
.cr-sl.has {
  border-color: #7a5f3a;
}
.cr-sl.arm {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent), 0 0 12px rgb(216 162 79 / 0.45);
}
.cr-sl.free {
  background: #120e0b;
  border-style: dashed;
}
.cr-sl.picking {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent);
}
.editing .cr-sl {
  outline: 1px dashed rgb(216 162 79 / 0.45);
  outline-offset: 2px;
}
.cr-sl-c {
  position: absolute;
  top: 1px;
  left: 3px;
  font: 600 0.8rem "IBM Plex Mono", ui-monospace, Consolas, monospace;
  color: #fff;
  text-shadow: 0 0 3px #000, 0 0 3px #000;
}
.cr-sl-t {
  position: absolute;
  bottom: 1px;
  right: 3px;
  font: 600 0.62rem Cinzel, serif;
  color: #cdb98f;
}
.cr-sl-plus {
  color: var(--muted);
  font-size: 1.1rem;
}
.cr-gap {
  width: 52px;
  height: 52px;
}
.cr-done {
  border-color: var(--accent) !important;
  color: var(--accent) !important;
}
/* picker */
.cr-pick {
  border: 1px solid var(--accent);
  border-radius: 7px;
  background: var(--bg);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cr-ptabs {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--line);
}
.fm-wrap .cr-ptabs button {
  padding: 4px 12px;
  font-size: 0.82rem;
  color: var(--muted);
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 5px 5px 0 0;
}
.fm-wrap .cr-ptabs button.on {
  background: var(--surface);
  border-color: var(--line);
  color: var(--fg);
  box-shadow: inset 0 2px var(--accent);
}
.cr-search {
  width: 100% !important;
}
.cr-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 22rem;
  overflow: auto;
}
.fm-wrap .cr-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 2px 10px 2px 3px;
  font-size: 0.8rem;
  background: var(--surface);
  color: var(--fg);
}
.fm-wrap .cr-chip.on,
.fm-wrap .cr-chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.fm-wrap .cr-item img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}
/* bases */
.cr-bases {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 10px;
}
.cr-base {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  padding: 7px 10px;
}
.cr-bi,
.cr-icb > span {
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 50%;
  border: 2px solid #b8873f;
  background: radial-gradient(circle at 40% 35%, #2a2018, #0e0b09);
  box-shadow: inset 0 0 6px #000;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}
.cr-bi {
  color: #e6c27a;
}
.cr-bi img,
.cr-icb > span img {
  width: 26px;
  height: 26px;
  object-fit: contain;
}
.cr-icb > span {
  display: flex;
  align-items: center;
  justify-content: center;
}
.cr-bname {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fm-wrap .cr-x {
  color: var(--muted);
  font-size: 0.75rem;
  padding: 2px 4px;
}
.fm-wrap .cr-x:hover {
  color: var(--accent);
}
.cr-form {
  border: 1px solid var(--accent);
  border-radius: 7px;
  background: var(--bg);
  padding: 10px;
  display: flex;
  flex-direction: column;
}
.cr-icons {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  margin-top: 6px;
}
.fm-wrap .cr-icb {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  padding: 7px 2px 5px;
  font-size: 0.68rem;
  color: var(--fg);
}
.fm-wrap .cr-icb.on,
.fm-wrap .cr-icb:hover {
  border-color: var(--accent);
  background: rgb(216 162 79 / 0.12);
}
.cr-mt {
  margin-top: 8px;
}
.cr-err {
  color: #d9584a;
  font-size: 0.8rem;
}
</style>
