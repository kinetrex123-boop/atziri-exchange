<template>
  <!-- Atziri Exchange: favourite trade searches (Trade tab of Shift + Space) -->
  <div class="tf">
    <button
      type="button"
      class="tf-star"
      :class="{ on: isFav }"
      :title="isFav ? tr('Déjà dans les favoris', 'Already in the favourites') : tr('Ajouter cette page aux favoris', 'Add this page to the favourites')"
      @click="starCurrent"
    >
      <i :class="isFav ? 'fas fa-star' : 'far fa-star'"></i>
    </button>
    <button type="button" class="ar-quick tf-open" :class="{ on: open }" @click="toggle">
      <i class="fas fa-star"></i> {{ tr("Favoris", "Favourites") }}
      <i :class="open ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
    </button>

    <div v-if="open" class="tf-panel">
      <div class="tf-head">
        <span class="fm-cap">{{ tr("Recherches favorites", "Favourite searches") }}</span>
        <span class="fm-sp"></span>
        <button v-if="!form" type="button" class="fm-btn" @click="startAdd('')">
          + {{ tr("Coller un lien trade", "Paste a trade link") }}
        </button>
      </div>
      <div v-if="favs.length" class="tf-list">
        <div v-for="f in favs" :key="f.id" class="tf-item" :title="f.url" @click="go(f.url)">
          <span class="cr-bi"><img :src="baseIcon(f.icon).img" alt="" /></span>
          <b class="cr-bname">{{ f.name }}</b>
          <button type="button" class="cr-x" :title="tr('Modifier', 'Edit')" @click.stop="startEdit(f)"><i class="fas fa-pen"></i></button>
          <button type="button" class="cr-x" :title="tr('Supprimer', 'Delete')" @click.stop="remove(f)">✕</button>
        </div>
      </div>
      <p v-else-if="!form" class="fm-muted">
        {{ tr("Aucun favori : clique l'étoile pour ajouter la page ouverte, ou colle un lien.", "No favourites yet: click the star to add the open page, or paste a link.") }}
      </p>

      <div v-if="form" class="cr-form tf-form">
        <span class="fm-cap">{{ form.id ? tr("Modifier le favori", "Edit the favourite") : tr("Nouveau favori", "New favourite") }}</span>
        <input
          ref="urlEl"
          v-model.trim="form.url"
          class="ar-search cr-mt"
          :placeholder="tr('Lien trade : https://www.pathofexile.com/trade2/search/…', 'Trade link: https://www.pathofexile.com/trade2/search/…')"
          @keydown.enter="save"
          @keydown.esc="form = null"
        />
        <input
          ref="nameEl"
          v-model="form.name"
          class="ar-search cr-mt"
          :placeholder="tr('Nom (ex. Waystones T15 bon prix)', 'Name (e.g. Cheap T15 waystones)')"
          @keydown.enter="save"
          @keydown.esc="form = null"
        />
        <span class="fm-cap cr-mt">{{ tr("Icône", "Icon") }}</span>
        <div class="cr-icons tf-icons">
          <button
            v-for="ic in ICONS"
            :key="ic.id"
            type="button"
            class="cr-icb"
            :class="{ on: form.icon === ic.id }"
            @click="form.icon = ic.id"
          >
            <span><img :src="ic.img" alt="" /></span>
            {{ isFr ? ic.fr : ic.en }}
          </button>
        </div>
        <div class="fm-head cr-mt">
          <span v-if="error" class="cr-err">{{ error }}</span>
          <span class="fm-sp"></span>
          <button type="button" class="fm-btn" @click="form = null">{{ tr("Annuler", "Cancel") }}</button>
          <button type="button" class="fm-btn cr-done" @click="save">OK</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, nextTick } from "vue";
import { tr, isFrench } from "@/web/atziri-lang";
import { CRAFT_BASE_ICONS, TRADE_EXTRA_ICONS, baseIcon } from "./atziri-craft-icons";
import { askConfirm } from "./atziri-confirm";
import { isTradeUrl } from "./atziri-hub";

interface TradeFav {
  id: number;
  name: string;
  url: string;
  icon?: string;
}

const props = defineProps<{ currentUrl: string }>();
const emit = defineEmits<{ (e: "go", url: string): void }>();

const isFr = computed(() => isFrench());
const ICONS = [...CRAFT_BASE_ICONS, ...TRADE_EXTRA_ICONS];
const KEY = "atziri-trade-favs";

function load(): TradeFav[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
const favs = shallowRef<TradeFav[]>(load());
function save_(list: TradeFav[]) {
  favs.value = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // storage unavailable
  }
}
// the other window (overlay / detached window) changed the list
window.addEventListener("storage", (e) => {
  if (e.key === KEY) favs.value = load();
});

const open = shallowRef(false);
const form = ref<{ id: number | null; url: string; name: string; icon: string } | null>(null);
const error = shallowRef("");
const urlEl = shallowRef<HTMLInputElement | null>(null);
const nameEl = shallowRef<HTMLInputElement | null>(null);

const isFav = computed(() => favs.value.some((f) => f.url === props.currentUrl));

function toggle() {
  open.value = !open.value;
  if (!open.value) form.value = null;
}
function starCurrent() {
  if (isFav.value) {
    open.value = true;
    return;
  }
  open.value = true;
  startAdd(props.currentUrl);
}
function startAdd(url: string) {
  form.value = { id: null, url, name: "", icon: "armour" };
  error.value = "";
  nextTick(() => (url ? nameEl.value : urlEl.value)?.focus());
}
function startEdit(f: TradeFav) {
  form.value = { id: f.id, url: f.url, name: f.name, icon: baseIcon(f.icon).id };
  error.value = "";
}
function save() {
  const f = form.value;
  if (!f) return;
  if (!isTradeUrl(f.url)) {
    error.value = tr(
      "Colle un lien du site trade (pathofexile.com/trade2/…).",
      "Paste a link from the trade site (pathofexile.com/trade2/…).",
    );
    return;
  }
  const name = f.name.trim() || `${tr("Favori", "Favourite")} ${favs.value.length + 1}`;
  if (f.id) {
    save_(favs.value.map((x) => (x.id === f.id ? { ...x, name, url: f.url, icon: f.icon } : x)));
  } else {
    save_([...favs.value, { id: Date.now(), name, url: f.url, icon: f.icon }]);
  }
  form.value = null;
}
async function remove(f: TradeFav) {
  if (await askConfirm(tr(`Supprimer « ${f.name} » ?`, `Delete "${f.name}"?`))) {
    save_(favs.value.filter((x) => x.id !== f.id));
  }
}
function go(url: string) {
  emit("go", url);
  open.value = false;
}
</script>

<style lang="postcss">
.tf {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ar-hub .tf-star {
  color: var(--muted);
}
.ar-hub .tf-star.on,
.ar-hub .tf-star:hover {
  color: var(--accent);
}
.ar-hub .tf-open.on {
  border-color: var(--accent);
  color: var(--accent);
}
.tf-panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 30;
  width: 46rem;
  max-width: 80vw;
  max-height: 70vh;
  overflow: auto;
  border: 1px solid var(--accent);
  border-radius: 8px;
  background: var(--bg);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.7);
}
.tf-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tf-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 8px;
}
.tf-item {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  padding: 6px 10px;
  cursor: pointer;
}
.tf-item:hover {
  border-color: var(--accent);
}
.tf-icons {
  grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
}
.ar-hub .tf-panel .cr-icb {
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
.ar-hub .tf-panel .cr-icb.on,
.ar-hub .tf-panel .cr-icb:hover {
  border-color: var(--accent);
  background: rgb(216 162 79 / 0.12);
}
.ar-hub .tf-panel .cr-x {
  color: var(--muted);
  font-size: 0.75rem;
  padding: 2px 4px;
}
.ar-hub .tf-panel .cr-x:hover {
  color: var(--accent);
}
</style>
