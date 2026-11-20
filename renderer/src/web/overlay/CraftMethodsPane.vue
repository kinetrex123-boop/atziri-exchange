<template>
  <!-- Atziri Exchange: crafting methods (Méthodes view of the Craft tab) -->
  <div class="ar-body fm cm">
    <div class="fm-wrap cm-wrap" :class="{ 'cm-full': method }">
      <!-- ================= list of the methods ================= -->
      <template v-if="!method">
        <div class="fm-head">
          <HubViewSwitch group="craft" />
          <span class="fm-sp"></span>
          <template v-if="catForm && catForm.id == null">
            <input
              ref="catInput"
              v-model="catForm.name"
              class="ar-search fm-rename"
              :placeholder="tr('Nom de la catégorie', 'Category name')"
              @keydown.enter="saveCat"
              @keydown.esc="catForm = null"
            />
            <button type="button" class="fm-btn" @click="catForm = null">
              {{ tr("Annuler", "Cancel") }}
            </button>
            <button type="button" class="fm-btn cr-done" @click="saveCat">
              OK
            </button>
          </template>
          <button v-else type="button" class="fm-btn" @click="startAddCat">
            + {{ tr("Catégorie", "Category") }}
          </button>
        </div>

        <div
          v-for="(cat, ci) in data.categories"
          :key="cat.id"
          class="cr-panel cm-cat"
          :class="{ 'cm-drop': dropCat === cat.id && dropBefore == null }"
          @dragover.prevent="onDragOverCat(cat.id)"
          @drop.prevent="onDrop(cat.id, null)"
        >
          <div class="fm-head">
            <template v-if="catForm && catForm.id === cat.id">
              <input
                ref="catInput"
                v-model="catForm.name"
                class="ar-search fm-rename"
                @keydown.enter="saveCat"
                @keydown.esc="catForm = null"
              />
              <button type="button" class="fm-btn" @click="saveCat">OK</button>
            </template>
            <template v-else>
              <span class="fm-cap cm-catname">{{ cat.name }}</span>
              <button
                type="button"
                class="cr-x"
                :title="tr('Renommer', 'Rename')"
                @click="startRenameCat(cat)"
              >
                <i class="fas fa-pen"></i>
              </button>
              <button
                v-if="ci > 0"
                type="button"
                class="cr-x"
                :title="tr('Monter', 'Move up')"
                @click="moveCategory(cat.id, -1)"
              >
                <i class="fas fa-arrow-up"></i>
              </button>
              <button
                v-if="ci < data.categories.length - 1"
                type="button"
                class="cr-x"
                :title="tr('Descendre', 'Move down')"
                @click="moveCategory(cat.id, 1)"
              >
                <i class="fas fa-arrow-down"></i>
              </button>
              <button
                type="button"
                class="cr-x"
                :title="tr('Supprimer la catégorie', 'Delete the category')"
                @click="confirmDeleteCat(cat)"
              >
                ✕
              </button>
            </template>
            <span class="fm-sp"></span>
            <button
              type="button"
              class="fm-btn"
              @click="startAddMethod(cat.id)"
            >
              + {{ tr("Méthode", "Method") }}
            </button>
          </div>

          <div class="cm-grid">
            <div
              v-for="m in methodsOf(cat.id)"
              :key="m.id"
              class="cr-base cm-card"
              :class="{ 'cm-drop': dropBefore === m.id }"
              draggable="true"
              :title="tr('Ouvrir la page de notes', 'Open the notes page')"
              @click="openMethod(m.id)"
              @dragstart="onDragStart(m.id, $event)"
              @dragend="dragId = dropCat = dropBefore = null"
              @dragover.prevent.stop="onDragOverCard(m)"
              @drop.prevent.stop="onDrop(cat.id, m.id)"
            >
              <span
                class="cr-bi"
                :title="isFr ? baseIcon(m.icon).fr : baseIcon(m.icon).en"
                ><img :src="baseIcon(m.icon).img" alt=""
              /></span>
              <b class="cr-bname">{{ m.name }}</b>
              <i
                v-if="m.url"
                class="fas fa-link cm-has"
                :title="tr('Lien trade enregistré', 'Trade link saved')"
              ></i>
              <button
                type="button"
                class="cr-x"
                :title="tr('Modifier', 'Edit')"
                @click.stop="startEditMethod(m)"
              >
                <i class="fas fa-pen"></i>
              </button>
              <button
                type="button"
                class="cr-x"
                :title="tr('Supprimer', 'Delete')"
                @click.stop="confirmDeleteMethod(m)"
              >
                ✕
              </button>
            </div>
            <button
              type="button"
              class="cm-add"
              @click="startAddMethod(cat.id)"
            >
              + {{ tr("Nouvelle méthode", "New method") }}
            </button>
          </div>

          <div v-if="methodForm && methodForm.catId === cat.id" class="cr-form">
            <span class="fm-cap">{{
              methodForm.id
                ? tr("Modifier la méthode", "Edit the method")
                : tr("Nouvelle méthode", "New method")
            }}</span>
            <input
              ref="methodInput"
              v-model="methodForm.name"
              class="ar-search cr-mt"
              :placeholder="
                tr(
                  'Nom (ex. Tunique ES essence)',
                  'Name (e.g. ES tunic essence)',
                )
              "
              @keydown.enter="saveMethod"
              @keydown.esc="methodForm = null"
            />
            <span class="fm-cap cr-mt">{{ tr("Icône", "Icon") }}</span>
            <div class="cr-icons">
              <button
                v-for="ic in CRAFT_BASE_ICONS"
                :key="ic.id"
                type="button"
                class="cr-icb"
                :class="{ on: methodForm.icon === ic.id }"
                @click="methodForm.icon = ic.id"
              >
                <span><img :src="ic.img" alt="" /></span>
                {{ isFr ? ic.fr : ic.en }}
              </button>
            </div>
            <div class="fm-head cr-mt">
              <span class="fm-sp"></span>
              <button type="button" class="fm-btn" @click="methodForm = null">
                {{ tr("Annuler", "Cancel") }}
              </button>
              <button type="button" class="fm-btn cr-done" @click="saveMethod">
                OK
              </button>
            </div>
          </div>
        </div>

        <p v-if="!data.categories.length" class="fm-muted">
          {{
            tr(
              "Aucune catégorie : « + Catégorie » pour en créer une.",
              'No category: "+ Category" to create one.',
            )
          }}
        </p>
        <p class="fm-muted cm-tip">
          {{
            tr(
              "Clic sur une méthode = sa page de notes. Glisse une méthode pour la déplacer (aussi vers une autre catégorie).",
              "Click a method = its notes page. Drag a method to move it (also to another category).",
            )
          }}
        </p>
      </template>

      <!-- ================= notes page of a method ================= -->
      <template v-else>
        <div class="fm-head">
          <button type="button" class="fm-btn" @click="closeMethod">
            <i class="fas fa-arrow-left"></i> {{ tr("Méthodes", "Methods") }}
          </button>
          <span class="cr-bi cm-bi"
            ><img :src="baseIcon(method.icon).img" alt=""
          /></span>
          <b class="cm-title">{{ method.name }}</b>
          <span class="fm-cap">· {{ catName(method.catId) }}</span>
          <span class="fm-sp"></span>
          <span v-if="savedFlash" class="cm-saved"
            ><i class="fas fa-check"></i> {{ tr("Sauvegardé", "Saved") }}</span
          >
          <button
            type="button"
            class="fm-btn cm-lock"
            :class="{ on: method.locked }"
            :title="
              method.locked
                ? tr(
                    'Déverrouiller pour modifier la page',
                    'Unlock to edit the page',
                  )
                : tr(
                    'Figer la page (rien ne bouge) et sauvegarder',
                    'Freeze the page (nothing moves) and save',
                  )
            "
            @click="toggleLock"
          >
            <i
              class="fas"
              :class="method.locked ? 'fa-lock' : 'fa-lock-open'"
            ></i>
            {{
              method.locked
                ? tr("Déverrouiller", "Unlock")
                : tr("Verrouiller", "Lock")
            }}
          </button>
        </div>

        <!-- trade link of the base -->
        <div class="cm-link">
          <span class="fm-cap">{{ tr("Base trade", "Trade base") }}</span>
          <template v-if="method.locked">
            <a
              v-if="method.url"
              class="cm-url"
              href="#"
              :title="
                tr('Ouvrir dans l\'onglet Trade', 'Open in the Trade tab')
              "
              @click.prevent="openTrade"
              >{{ method.url }}</a
            >
            <span v-else class="fm-muted cm-url">{{
              tr(
                "Aucun lien (déverrouille la page pour en coller un)",
                "No link (unlock the page to paste one)",
              )
            }}</span>
          </template>
          <input
            v-else
            v-model.trim="urlText"
            class="ar-search cm-url"
            :placeholder="
              tr(
                'Lien trade : https://www.pathofexile.com/trade2/search/…',
                'Trade link: https://www.pathofexile.com/trade2/search/…',
              )
            "
            @change="saveUrl"
            @keydown.enter="saveUrl"
          />
          <span v-if="urlError" class="cr-err">{{ urlError }}</span>
          <template v-if="!method.locked">
            <button
              type="button"
              class="fm-btn"
              :title="tr('Coller le lien copié', 'Paste the copied link')"
              @click="pasteUrl"
            >
              <i class="fas fa-paste"></i> {{ tr("Coller", "Paste") }}
            </button>
            <button
              v-if="isTradeUrl(currentTrade)"
              type="button"
              class="fm-btn"
              :title="
                tr(
                  'Prendre la recherche affichée dans l\'onglet Trade',
                  'Use the search shown in the Trade tab',
                )
              "
              @click="useCurrentTrade"
            >
              <i class="fas fa-balance-scale"></i>
              {{ tr("Page Trade ouverte", "Open Trade page") }}
            </button>
          </template>
          <button
            v-if="method.url"
            type="button"
            class="fm-btn"
            :title="tr('Copier le lien', 'Copy the link')"
            @click="copyUrl"
          >
            <i class="fas fa-copy"></i>
          </button>
          <button
            v-if="method.url"
            type="button"
            class="fm-btn cr-done"
            @click="openTrade"
          >
            {{ tr("Ouvrir", "Open") }} <i class="fas fa-external-link-alt"></i>
          </button>
        </div>

        <!-- tools -->
        <div v-if="!method.locked" class="cm-tools">
          <button
            v-for="tl in TOOLS"
            :key="tl.id"
            type="button"
            class="fm-btn"
            :class="{ on: tool === tl.id }"
            :title="tr(tl.tipFr, tl.tipEn)"
            @click="chooseTool(tl.id)"
          >
            <i class="fas" :class="tl.icon"></i> {{ tr(tl.fr, tl.en) }}
          </button>
          <span class="cm-sep"></span>
          <button
            v-for="c in BOARD_COLORS"
            :key="c"
            type="button"
            class="cm-dot"
            :class="{ on: color === c }"
            :style="{ background: c }"
            :title="tr('Couleur', 'Color')"
            @click="setColor(c)"
          ></button>
          <span class="cm-sep"></span>
          <button
            type="button"
            class="fm-btn"
            :disabled="!selItem || selItem.kind === 'image'"
            :title="tr('Plus petit / plus fin', 'Smaller / thinner')"
            @click="changeSize(-1)"
          >
            <i class="fas fa-minus"></i>
          </button>
          <button
            type="button"
            class="fm-btn"
            :disabled="!selItem || selItem.kind === 'image'"
            :title="tr('Plus grand / plus épais', 'Bigger / thicker')"
            @click="changeSize(1)"
          >
            <i class="fas fa-plus"></i>
          </button>
          <span class="fm-sp"></span>
          <button
            type="button"
            class="fm-btn"
            :disabled="!undoStack.length"
            :title="tr('Annuler (Ctrl + Z)', 'Undo (Ctrl + Z)')"
            @click="undo"
          >
            <i class="fas fa-undo"></i>
          </button>
          <button
            type="button"
            class="fm-btn"
            :disabled="!redoStack.length"
            :title="tr('Rétablir (Ctrl + Y)', 'Redo (Ctrl + Y)')"
            @click="redo"
          >
            <i class="fas fa-redo"></i>
          </button>
          <button
            type="button"
            class="fm-btn fm-danger"
            :disabled="sel == null"
            :title="
              tr(
                'Effacer l\'élément choisi (Suppr)',
                'Delete the selected element (Del)',
              )
            "
            @click="removeSelected"
          >
            <i class="fas fa-trash"></i>
          </button>
        </div>

        <!-- free notes board -->
        <div
          ref="scroller"
          class="cm-board"
          :class="{ locked: method.locked, ['tool-' + tool]: !method.locked }"
          @dragover.prevent
          @drop.prevent="onBoardDrop"
        >
          <div
            ref="canvas"
            class="cm-canvas"
            :style="{ width: extent.w + 'px', height: extent.h + 'px' }"
            @pointerdown="onBoardDown"
            @pointermove="lastPoint = pt($event)"
          >
            <p v-if="!items.length && !method.locked" class="cm-empty">
              {{
                tr(
                  "Page vide. Outil Texte puis clic pour écrire, Flèche ou Cadre puis glisser pour tracer, Ctrl + V pour coller une capture.",
                  "Empty page. Text tool then click to write, Arrow or Frame then drag to draw, Ctrl + V to paste a screenshot.",
                )
              }}
            </p>

            <!-- frames, images, texts (in this order: texts stay clickable inside a frame) -->
            <div
              v-for="it in layered"
              :key="it.id"
              class="cm-item"
              :class="[
                'cm-' + it.kind,
                { sel: sel === it.id && !method.locked },
              ]"
              :style="itemStyle(it)"
              @pointerdown.stop="onItemDown(it, $event)"
              @dblclick.stop="
                it.kind === 'text' && !method.locked && startEdit(it)
              "
            >
              <img
                v-if="it.kind === 'image'"
                :src="
                  it.imageId != null ? imageUrls.get(it.imageId) : undefined
                "
                alt=""
                draggable="false"
                @click="
                  method.locked &&
                  it.imageId != null &&
                  (zoom = imageUrls.get(it.imageId) ?? null)
                "
              />
              <template v-else-if="it.kind === 'text'">
                <textarea
                  v-if="editing === it.id"
                  ref="editBox"
                  v-model="editText"
                  class="cm-edit"
                  :style="{ color: it.color, fontSize: it.size + 'px' }"
                  spellcheck="false"
                  @pointerdown.stop
                  @input="autoGrow"
                  @blur="endEdit"
                  @keydown.esc.stop.prevent="endEdit"
                ></textarea>
                <div v-else class="cm-txt">{{ it.text }}</div>
              </template>
              <span
                v-if="sel === it.id && !method.locked && editing !== it.id"
                class="cm-handle"
                :title="tr('Redimensionner', 'Resize')"
                @pointerdown.stop="onResizeDown(it, $event)"
              ></span>
            </div>

            <!-- arrows -->
            <svg class="cm-svg" :width="extent.w" :height="extent.h">
              <g
                v-for="a in arrows"
                :key="a.id"
                :class="{ sel: sel === a.id && !method.locked }"
              >
                <line
                  v-if="!method.locked"
                  class="cm-hit"
                  :x1="a.x"
                  :y1="a.y"
                  :x2="a.x2"
                  :y2="a.y2"
                  @pointerdown.stop="onItemDown(a, $event)"
                />
                <line
                  :x1="a.x"
                  :y1="a.y"
                  :x2="lineEnd(a).x"
                  :y2="lineEnd(a).y"
                  :stroke="a.color"
                  :stroke-width="a.size"
                  stroke-linecap="round"
                />
                <polygon :points="arrowHead(a)" :fill="a.color" />
                <template v-if="sel === a.id && !method.locked">
                  <circle
                    class="cm-end"
                    :cx="a.x"
                    :cy="a.y"
                    r="6"
                    @pointerdown.stop="onEndDown(a, 1, $event)"
                  />
                  <circle
                    class="cm-end"
                    :cx="a.x2"
                    :cy="a.y2"
                    r="6"
                    @pointerdown.stop="onEndDown(a, 2, $event)"
                  />
                </template>
              </g>
            </svg>
          </div>
        </div>
      </template>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      hidden
      @change="onFilePicked"
    />
    <div v-if="zoom" class="fs-zoom" @click="zoom = null">
      <img :src="zoom" alt="" />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import { tr, isFrench } from "@/web/atziri-lang";
import {
  hubTab,
  hubVisible,
  openInHub,
  isTradeUrl,
  webTabUrls,
} from "./atziri-hub";
import HubViewSwitch from "./HubViewSwitch.vue";
import { CRAFT_BASE_ICONS, baseIcon } from "./atziri-craft-icons";
import { askConfirm } from "./atziri-confirm";
import {
  methodsData as data,
  openMethodId,
  imageUrls,
  addCategory,
  renameCategory,
  deleteCategory,
  moveCategory,
  addMethod,
  updateMethod,
  deleteMethod,
  placeMethod,
  storeImage,
  gcImages,
  newId,
  BOARD_COLORS,
  type BoardItem,
  type CraftMethod,
  type MethodCategory,
} from "./atziri-craft-methods";

const isFr = computed(() => isFrench());

// ======================= list =======================
function methodsOf(catId: number) {
  return data.value.methods.filter((m) => m.catId === catId);
}
function catName(catId: number) {
  return data.value.categories.find((c) => c.id === catId)?.name ?? "";
}

// categories
const catForm = ref<{ id: number | null; name: string } | null>(null);
const catInput = shallowRef<HTMLInputElement[] | HTMLInputElement | null>(null);
function focusRef(r: HTMLElement[] | HTMLElement | null) {
  (Array.isArray(r) ? r[0] : r)?.focus();
}
function startAddCat() {
  catForm.value = { id: null, name: "" };
  nextTick(() => focusRef(catInput.value));
}
function startRenameCat(c: MethodCategory) {
  catForm.value = { id: c.id, name: c.name };
  nextTick(() => focusRef(catInput.value));
}
function saveCat() {
  const f = catForm.value;
  if (!f) return;
  const name = f.name.trim();
  if (name) {
    if (f.id == null) addCategory(name);
    else renameCategory(f.id, name);
  }
  catForm.value = null;
}
async function confirmDeleteCat(c: MethodCategory) {
  const n = methodsOf(c.id).length;
  const what = n
    ? tr(
        `la catégorie « ${c.name} » et ses ${n} méthode(s)`,
        `the category "${c.name}" and its ${n} method(s)`,
      )
    : tr(`la catégorie « ${c.name} »`, `the category "${c.name}"`);
  if (await askConfirm(tr(`Supprimer ${what} ?`, `Delete ${what}?`)))
    deleteCategory(c.id);
}

// methods
const methodForm = ref<{
  catId: number;
  id: number | null;
  name: string;
  icon: string;
} | null>(null);
const methodInput = shallowRef<HTMLInputElement[] | HTMLInputElement | null>(
  null,
);
function startAddMethod(catId: number) {
  methodForm.value = { catId, id: null, name: "", icon: "armour" };
  nextTick(() => focusRef(methodInput.value));
}
function startEditMethod(m: CraftMethod) {
  methodForm.value = {
    catId: m.catId,
    id: m.id,
    name: m.name,
    icon: baseIcon(m.icon).id,
  };
  nextTick(() => focusRef(methodInput.value));
}
function saveMethod() {
  const f = methodForm.value;
  if (!f) return;
  const name =
    f.name.trim() ||
    tr(
      `Méthode ${methodsOf(f.catId).length + 1}`,
      `Method ${methodsOf(f.catId).length + 1}`,
    );
  if (f.id == null) {
    const id = addMethod(f.catId, name, f.icon);
    methodForm.value = null;
    openMethod(id);
    return;
  }
  updateMethod(f.id, (m) => ({ ...m, name, icon: f.icon }));
  methodForm.value = null;
}
async function confirmDeleteMethod(m: CraftMethod) {
  if (
    await askConfirm(
      tr(
        `Supprimer « ${m.name} » et sa page de notes ?`,
        `Delete "${m.name}" and its notes page?`,
      ),
    )
  ) {
    deleteMethod(m.id);
  }
}

// drag and drop of the methods
const dragId = shallowRef<number | null>(null);
const dropCat = shallowRef<number | null>(null);
const dropBefore = shallowRef<number | null>(null);
function onDragStart(id: number, e: DragEvent) {
  dragId.value = id;
  e.dataTransfer?.setData("text/plain", String(id));
}
function onDragOverCat(catId: number) {
  if (dragId.value == null) return;
  dropCat.value = catId;
  dropBefore.value = null;
}
function onDragOverCard(m: CraftMethod) {
  if (dragId.value == null) return;
  dropCat.value = m.catId;
  dropBefore.value = m.id;
}
function onDrop(catId: number, beforeId: number | null) {
  if (dragId.value != null) placeMethod(dragId.value, catId, beforeId);
  dragId.value = dropCat.value = dropBefore.value = null;
}

// ======================= notes page =======================
const method = computed(
  () => data.value.methods.find((m) => m.id === openMethodId.value) ?? null,
);

function openMethod(id: number) {
  const m = data.value.methods.find((x) => x.id === id);
  if (!m) return;
  // a method already filled opens locked (nothing moves by mistake)
  if (m.items.length && !m.locked)
    updateMethod(id, (x) => ({ ...x, locked: true }));
  openMethodId.value = id;
}
function closeMethod() {
  endEdit();
  openMethodId.value = null;
}
// leaving a page: forget its history and the images nobody uses any more
watch(openMethodId, () => {
  sel.value = null;
  editing.value = null;
  draft.value = null;
  undoStack.value = [];
  redoStack.value = [];
  tool.value = "select";
  urlText.value = method.value?.url ?? "";
  urlError.value = "";
  gcImages();
});
// method deleted from the other window
watch(method, (m) => {
  if (!m && openMethodId.value != null) openMethodId.value = null;
});

// ---- lock ----
const savedFlash = shallowRef(false);
let flashTimer: ReturnType<typeof setTimeout> | undefined;
function toggleLock() {
  const m = method.value;
  if (!m) return;
  endEdit();
  if (!m.locked) saveUrl();
  sel.value = null;
  tool.value = "select";
  updateMethod(m.id, (x) => ({ ...x, locked: !x.locked }));
  if (!m.locked) {
    savedFlash.value = true;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => (savedFlash.value = false), 1800);
  }
}

// ---- trade link ----
const urlText = shallowRef("");
const urlError = shallowRef("");
const currentTrade = computed(() => webTabUrls.value.trade);
watch(
  () => method.value?.url,
  (u) => {
    if (
      u != null &&
      document.activeElement?.classList.contains("cm-url") !== true
    )
      urlText.value = u;
  },
);
function saveUrl() {
  const m = method.value;
  if (!m || m.locked) return;
  const url = urlText.value.trim();
  if (url && !isTradeUrl(url)) {
    urlError.value = tr(
      "Colle un lien du site trade (pathofexile.com/trade2/…).",
      "Paste a link from the trade site (pathofexile.com/trade2/…).",
    );
    return;
  }
  urlError.value = "";
  if (url !== m.url) updateMethod(m.id, (x) => ({ ...x, url }));
}
async function pasteUrl() {
  try {
    urlText.value = (await navigator.clipboard.readText()).trim();
    saveUrl();
  } catch {
    urlError.value = tr(
      "Presse-papiers illisible : colle le lien avec Ctrl + V dans la case.",
      "Clipboard unreadable: paste the link with Ctrl + V in the box.",
    );
  }
}
function useCurrentTrade() {
  urlText.value = currentTrade.value;
  saveUrl();
}
function copyUrl() {
  if (method.value?.url)
    navigator.clipboard.writeText(method.value.url).catch(() => undefined);
}
function openTrade() {
  const url = method.value?.url;
  if (url && isTradeUrl(url)) openInHub(url, "trade");
}

// ---- board state ----
type Tool = "select" | "text" | "arrow" | "rect" | "image";
const TOOLS: {
  id: Tool;
  icon: string;
  fr: string;
  en: string;
  tipFr: string;
  tipEn: string;
}[] = [
  {
    id: "select",
    icon: "fa-mouse-pointer",
    fr: "Sélection",
    en: "Select",
    tipFr:
      "Choisir, déplacer, redimensionner (double-clic sur un texte pour le modifier)",
    tipEn: "Pick, move, resize (double-click a text to edit it)",
  },
  {
    id: "text",
    icon: "fa-font",
    fr: "Texte",
    en: "Text",
    tipFr: "Clic sur la page pour écrire",
    tipEn: "Click the page to write",
  },
  {
    id: "arrow",
    icon: "fa-long-arrow-alt-right",
    fr: "Flèche",
    en: "Arrow",
    tipFr: "Glisser pour tracer une flèche",
    tipEn: "Drag to draw an arrow",
  },
  {
    id: "rect",
    icon: "fa-vector-square",
    fr: "Cadre",
    en: "Frame",
    tipFr: "Glisser pour tracer un cadre",
    tipEn: "Drag to draw a frame",
  },
  {
    id: "image",
    icon: "fa-image",
    fr: "Image",
    en: "Image",
    tipFr: "Choisir une image (ou Ctrl + V, ou glisser un fichier sur la page)",
    tipEn: "Pick an image (or Ctrl + V, or drop a file on the page)",
  },
];
const tool = shallowRef<Tool>("select");
function chooseTool(t: Tool) {
  endEdit();
  if (t === "image") {
    pickImage();
    return;
  }
  // a drawing tool starts fresh: the color picked next is for the new element
  if (t !== "select") sel.value = null;
  tool.value = t;
}
const color = shallowRef(BOARD_COLORS[0]);
const sel = shallowRef<number | null>(null);
const draft = shallowRef<BoardItem[] | null>(null); // items while dragging
const items = computed<BoardItem[]>(
  () => draft.value ?? method.value?.items ?? [],
);
const selItem = computed(
  () => items.value.find((i) => i.id === sel.value) ?? null,
);
const ORDER: Record<string, number> = { rect: 0, image: 1, text: 2 };
const layered = computed(() =>
  items.value
    .filter((i) => i.kind !== "arrow")
    .sort((a, b) => ORDER[a.kind] - ORDER[b.kind]),
);
const arrows = computed(() => items.value.filter((i) => i.kind === "arrow"));

const scroller = shallowRef<HTMLElement | null>(null);
const canvas = shallowRef<HTMLElement | null>(null);
const lastPoint = shallowRef<{ x: number; y: number } | null>(null);
const zoom = shallowRef<string | null>(null);

/** size of the drawing area: always some free room right of and below the notes */
const extent = computed(() => {
  let w = 0;
  let h = 0;
  for (const i of items.value) {
    const right = i.kind === "arrow" ? Math.max(i.x, i.x2) : i.x + i.w;
    const bottom =
      i.kind === "arrow"
        ? Math.max(i.y, i.y2)
        : i.y + (i.kind === "text" ? i.size * 4 : i.h);
    w = Math.max(w, right);
    h = Math.max(h, bottom);
  }
  return { w: Math.round(w + 300), h: Math.round(h + 300) };
});

// ---- history ----
const undoStack = shallowRef<BoardItem[][]>([]);
const redoStack = shallowRef<BoardItem[][]>([]);
function commit(next: BoardItem[]) {
  const m = method.value;
  draft.value = null;
  if (!m || m.locked) return;
  undoStack.value = [...undoStack.value.slice(-59), m.items];
  redoStack.value = [];
  updateMethod(m.id, (x) => ({ ...x, items: next }));
}
function undo() {
  const m = method.value;
  if (!m || m.locked || !undoStack.value.length) return;
  endEdit();
  const prev = undoStack.value[undoStack.value.length - 1];
  undoStack.value = undoStack.value.slice(0, -1);
  redoStack.value = [...redoStack.value, m.items];
  updateMethod(m.id, (x) => ({ ...x, items: prev }));
  sel.value = null;
}
function redo() {
  const m = method.value;
  if (!m || m.locked || !redoStack.value.length) return;
  const next = redoStack.value[redoStack.value.length - 1];
  redoStack.value = redoStack.value.slice(0, -1);
  undoStack.value = [...undoStack.value, m.items];
  updateMethod(m.id, (x) => ({ ...x, items: next }));
  sel.value = null;
}
function patchItem(list: BoardItem[], id: number, p: Partial<BoardItem>) {
  return list.map((i) => (i.id === id ? { ...i, ...p } : i));
}
function removeSelected() {
  if (sel.value == null) return;
  const id = sel.value;
  sel.value = null;
  editing.value = null;
  commit(items.value.filter((i) => i.id !== id));
}
function setColor(c: string) {
  color.value = c;
  if (selItem.value && selItem.value.kind !== "image")
    commit(patchItem(items.value, selItem.value.id, { color: c }));
}
function changeSize(dir: -1 | 1) {
  const it = selItem.value;
  if (!it || it.kind === "image") return;
  const size =
    it.kind === "text"
      ? Math.min(48, Math.max(10, it.size + dir * 2))
      : Math.min(14, Math.max(1, it.size + dir));
  if (size !== it.size) commit(patchItem(items.value, it.id, { size }));
}

// ---- drawing helpers ----
function itemStyle(it: BoardItem) {
  const s: Record<string, string> = {
    left: it.x + "px",
    top: it.y + "px",
    width: it.w + "px",
  };
  if (it.kind !== "text") s.height = it.h + "px";
  if (it.kind === "rect") s.border = `${it.size}px solid ${it.color}`;
  if (it.kind === "text") {
    s.color = it.color;
    s.fontSize = it.size + "px";
  }
  return s;
}
function headLen(a: BoardItem) {
  return 10 + a.size * 2.5;
}
function lineEnd(a: BoardItem) {
  const ang = Math.atan2(a.y2 - a.y, a.x2 - a.x);
  const back = headLen(a) * 0.7;
  return { x: a.x2 - Math.cos(ang) * back, y: a.y2 - Math.sin(ang) * back };
}
function arrowHead(a: BoardItem) {
  const ang = Math.atan2(a.y2 - a.y, a.x2 - a.x);
  const l = headLen(a);
  const p = (d: number) =>
    `${a.x2 - Math.cos(ang + d) * l},${a.y2 - Math.sin(ang + d) * l}`;
  return `${a.x2},${a.y2} ${p(0.45)} ${p(-0.45)}`;
}
function pt(e: { clientX: number; clientY: number }) {
  const r = canvas.value!.getBoundingClientRect();
  return {
    x: Math.round(e.clientX - r.left),
    y: Math.round(e.clientY - r.top),
  };
}
function newItem(kind: BoardItem["kind"], p: Partial<BoardItem>): BoardItem {
  return {
    id: newId(),
    kind,
    x: 0,
    y: 0,
    w: 260,
    h: 40,
    x2: 0,
    y2: 0,
    color: color.value,
    text: "",
    size: kind === "text" ? 16 : 3,
    imageId: null,
    ...p,
  };
}

// ---- pointer: move / resize / draw ----
let drag: ((e: PointerEvent) => void) | null = null;
function startDrag(onMove: (e: PointerEvent) => void) {
  drag = onMove;
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    drag = null;
    if (draft.value) commit(draft.value);
  };
  const move = (e: PointerEvent) => drag?.(e);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

function onBoardDown(e: PointerEvent) {
  if (e.button !== 0 || !method.value || method.value.locked) return;
  if (editing.value != null) {
    endEdit();
    return;
  }
  const p = pt(e);
  if (tool.value === "text") {
    e.preventDefault();
    const it = newItem("text", { x: p.x, y: p.y - 10 });
    draft.value = [...items.value, it];
    sel.value = it.id;
    tool.value = "select";
    startEdit(it, true);
    return;
  }
  if (tool.value === "arrow" || tool.value === "rect") {
    const kind = tool.value;
    const it = newItem(
      kind,
      kind === "arrow"
        ? { x: p.x, y: p.y, x2: p.x, y2: p.y }
        : { x: p.x, y: p.y, w: 1, h: 1 },
    );
    const base = items.value;
    sel.value = it.id;
    e.preventDefault();
    startDrag((ev) => {
      const q = pt(ev);
      const cur =
        kind === "arrow"
          ? { ...it, x2: q.x, y2: q.y }
          : {
              ...it,
              x: Math.min(p.x, q.x),
              y: Math.min(p.y, q.y),
              w: Math.abs(q.x - p.x),
              h: Math.abs(q.y - p.y),
            };
      draft.value = [...base, cur];
    });
    // a plain click draws nothing
    const stop = () => {
      window.removeEventListener("pointerup", stop, { capture: true });
      const d = draft.value?.find((i) => i.id === it.id);
      const tiny =
        !d ||
        (kind === "arrow"
          ? Math.hypot(d.x2 - d.x, d.y2 - d.y) < 10
          : d.w < 10 || d.h < 10);
      if (tiny) {
        draft.value = null;
        sel.value = null;
      } else tool.value = "select";
    };
    window.addEventListener("pointerup", stop, { capture: true });
    return;
  }
  sel.value = null;
}

function onItemDown(it: BoardItem, e: PointerEvent) {
  if (e.button !== 0 || !method.value || method.value.locked) return;
  if (editing.value === it.id) return;
  if (editing.value != null) endEdit();
  if (tool.value === "text" && it.kind === "text") {
    e.preventDefault();
    sel.value = it.id;
    tool.value = "select";
    startEdit(it);
    return;
  }
  if (tool.value !== "select") {
    onBoardDown(e);
    return;
  }
  sel.value = it.id;
  e.preventDefault();
  const start = pt(e);
  const base = items.value;
  startDrag((ev) => {
    const q = pt(ev);
    const dx = q.x - start.x;
    const dy = q.y - start.y;
    if (!draft.value && Math.abs(dx) + Math.abs(dy) < 3) return;
    draft.value = patchItem(base, it.id, {
      x: Math.max(0, it.x + dx),
      y: Math.max(0, it.y + dy),
      x2: it.x2 + dx,
      y2: it.y2 + dy,
    });
  });
}

function onResizeDown(it: BoardItem, e: PointerEvent) {
  if (method.value?.locked) return;
  e.preventDefault();
  const start = pt(e);
  const base = items.value;
  const ratio = it.h / Math.max(1, it.w);
  startDrag((ev) => {
    const q = pt(ev);
    const w = Math.max(40, it.w + q.x - start.x);
    const h =
      it.kind === "image"
        ? Math.round(w * ratio)
        : Math.max(20, it.h + q.y - start.y);
    draft.value = patchItem(base, it.id, { w, h });
  });
}

function onEndDown(a: BoardItem, end: 1 | 2, e: PointerEvent) {
  if (method.value?.locked) return;
  e.preventDefault();
  const base = items.value;
  startDrag((ev) => {
    const q = pt(ev);
    draft.value = patchItem(
      base,
      a.id,
      end === 1 ? { x: q.x, y: q.y } : { x2: q.x, y2: q.y },
    );
  });
}

// ---- text editing ----
const editing = shallowRef<number | null>(null);
const editText = shallowRef("");
const editBox = shallowRef<HTMLTextAreaElement[] | HTMLTextAreaElement | null>(
  null,
);
let editIsNew = false;
function startEdit(it: BoardItem, isNew = false) {
  editing.value = it.id;
  editText.value = it.text;
  editIsNew = isNew;
  // after the click is over (the click itself would take the focus back)
  setTimeout(() => {
    const box = Array.isArray(editBox.value) ? editBox.value[0] : editBox.value;
    if (!box || editing.value !== it.id) return;
    box.focus({ preventScroll: true });
    autoGrow({ target: box } as unknown as Event);
  }, 0);
}
function autoGrow(e: Event) {
  const box = e.target as HTMLTextAreaElement;
  box.style.height = "auto";
  box.style.height = box.scrollHeight + "px";
}
function endEdit() {
  const id = editing.value;
  if (id == null) return;
  editing.value = null;
  const text = editText.value.replace(/\s+$/, "");
  const list = draft.value ?? items.value;
  const it = list.find((i) => i.id === id);
  if (!it) {
    draft.value = null;
    return;
  }
  if (!text) {
    sel.value = null;
    if (editIsNew) draft.value = null;
    else commit(list.filter((i) => i.id !== id));
    return;
  }
  if (text === it.text && !editIsNew) {
    draft.value = null;
    return;
  }
  commit(patchItem(list, id, { text }));
}

// ---- images ----
const fileInput = shallowRef<HTMLInputElement | null>(null);
function pickImage() {
  fileInput.value?.click();
}
function onFilePicked(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (file) addImage(file);
}
function onBoardDrop(e: DragEvent) {
  if (!method.value || method.value.locked) return;
  const file = Array.from(e.dataTransfer?.files ?? []).find((f) =>
    f.type.startsWith("image/"),
  );
  if (file) addImage(file, pt(e));
}
/** where a pasted element goes: under the mouse, or the top left of the visible area */
function placeAt(): { x: number; y: number } {
  if (lastPoint.value) return lastPoint.value;
  const s = scroller.value;
  return { x: (s?.scrollLeft ?? 0) + 20, y: (s?.scrollTop ?? 0) + 20 };
}
async function addImage(file: Blob, at?: { x: number; y: number }) {
  const m = method.value;
  if (!m || m.locked) return;
  const p = at ?? placeAt();
  const img = await storeImage(file);
  if (!img || method.value?.id !== m.id) return;
  // fits in the visible part of the page (its corner stays reachable)
  const sc = scroller.value;
  const viewW = sc?.clientWidth ?? 800;
  const viewH = sc?.clientHeight ?? 500;
  const w = Math.round(
    Math.min(img.w, 520, viewW - 40, ((viewH - 40) * img.w) / img.h),
  );
  const h = Math.round((img.h * w) / img.w);
  const left = sc?.scrollLeft ?? 0;
  const top = sc?.scrollTop ?? 0;
  const it = newItem("image", {
    x: Math.max(left + 10, Math.min(p.x, left + viewW - w - 20)),
    y: Math.max(top + 10, Math.min(p.y, top + viewH - h - 20)),
    w,
    h,
    imageId: img.imageId,
  });
  commit([...items.value, it]);
  sel.value = it.id;
  tool.value = "select";
}

// ---- keyboard and clipboard ----
function pageActive() {
  return (
    hubVisible.value &&
    hubTab.value === "methods" &&
    method.value != null &&
    !method.value.locked
  );
}
function typingIn(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return (
    !!el &&
    (el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.isContentEditable)
  );
}
function onPaste(e: ClipboardEvent) {
  if (!pageActive() || typingIn(e.target)) return;
  const file = Array.from(e.clipboardData?.items ?? [])
    .find((i) => i.type.startsWith("image/"))
    ?.getAsFile();
  if (file) {
    e.preventDefault();
    addImage(file);
    return;
  }
  const text = e.clipboardData?.getData("text/plain")?.trim();
  if (!text) return;
  e.preventDefault();
  const p = placeAt();
  commit([...items.value, newItem("text", { x: p.x, y: p.y, text })]);
}
function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && zoom.value) {
    zoom.value = null;
    return;
  }
  if (!pageActive() || typingIn(e.target)) return;
  const k = e.key.toLowerCase();
  if ((e.key === "Delete" || e.key === "Backspace") && sel.value != null) {
    e.preventDefault();
    removeSelected();
  } else if (e.ctrlKey && k === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if (e.ctrlKey && (k === "y" || (k === "z" && e.shiftKey))) {
    e.preventDefault();
    redo();
  } else if (
    e.key === "Escape" &&
    (sel.value != null || tool.value !== "select")
  ) {
    sel.value = null;
    tool.value = "select";
  }
}
onMounted(() => {
  window.addEventListener("paste", onPaste);
  window.addEventListener("keydown", onKey);
});
onUnmounted(() => {
  window.removeEventListener("paste", onPaste);
  window.removeEventListener("keydown", onKey);
  clearTimeout(flashTimer);
});
</script>

<style lang="postcss">
/* the list keeps the Suivi look (.fm-*, .cr-* of FarmPane / CraftPane) */
.cm-wrap.cm-full {
  align-self: stretch;
  min-height: 0;
}
.cm-cat.cm-drop,
.cm-card.cm-drop {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}
.cm-catname {
  font-size: 0.75rem;
  color: var(--accent);
}
.cm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 8px 10px;
}
.cm-card {
  cursor: pointer;
}
.cm-card:hover {
  border-color: var(--accent);
}
.cm-has {
  color: var(--muted);
  font-size: 0.75rem;
}
.fm-wrap .cm-add {
  border: 1px dashed var(--line);
  border-radius: 6px;
  color: var(--muted);
  min-height: 54px;
  font-size: 0.85rem;
}
.fm-wrap .cm-add:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.cm-tip {
  font-size: 0.78rem;
}

/* notes page */
.cm-bi {
  width: 30px !important;
  height: 30px !important;
}
.cm-bi img {
  width: 20px !important;
  height: 20px !important;
}
.cm-title {
  color: var(--accent);
  font-size: 1.05rem;
}
.cm-saved {
  color: #5ec97a;
  font-size: 0.8rem;
}
.fm-wrap .cm-lock.on {
  border-color: var(--accent);
  color: var(--accent);
  background: rgb(216 162 79 / 0.12);
}
.cm-link {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  padding: 6px 10px;
}
.cm-link .cm-url {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cm-link a.cm-url {
  color: #7fb4ff;
}
.cm-link a.cm-url:hover {
  text-decoration: underline;
}
.cm-tools {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.fm-wrap .cm-tools .fm-btn.on {
  border-color: var(--accent);
  color: var(--accent);
  background: rgb(216 162 79 / 0.12);
}
.fm-wrap .cm-tools .fm-btn:disabled {
  opacity: 0.4;
  pointer-events: none;
}
.cm-sep {
  width: 1px;
  height: 20px;
  background: var(--line);
  margin: 0 4px;
}
.fm-wrap .cm-dot {
  flex: none;
  padding: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #000;
}
.fm-wrap .cm-dot.on {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.cm-board {
  flex: 1;
  min-height: 320px;
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
  background-color: rgb(14 11 9 / 0.85);
  background-image: radial-gradient(
    rgb(255 255 255 / 0.07) 1px,
    transparent 1px
  );
  background-size: 18px 18px;
  background-attachment: local;
}
.cm-board.locked {
  background-image: none;
}
.cm-canvas {
  position: relative;
  min-width: 100%;
  min-height: 100%;
}
.cm-board.tool-text .cm-canvas {
  cursor: text;
}
.cm-board.tool-arrow .cm-canvas,
.cm-board.tool-rect .cm-canvas {
  cursor: crosshair;
}
.cm-empty {
  position: absolute;
  left: 20px;
  top: 16px;
  color: var(--muted);
  font-size: 0.85rem;
  pointer-events: none;
}
.cm-item {
  position: absolute;
  box-sizing: border-box;
}
.cm-board:not(.locked) .cm-item {
  cursor: move;
}
.cm-item.sel {
  outline: 1px dashed var(--accent);
  outline-offset: 3px;
}
.cm-rect {
  border-radius: 6px;
}
.cm-image img {
  width: 100%;
  height: 100%;
  object-fit: fill;
  border-radius: 4px;
  display: block;
  user-select: none;
}
.cm-board.locked .cm-image img {
  cursor: zoom-in;
}
.cm-text {
  line-height: 1.4;
  min-height: 1.4em;
}
.cm-txt {
  white-space: pre-wrap;
  word-break: break-word;
  user-select: none;
}
.cm-board.locked .cm-txt {
  user-select: text;
}
.cm-edit {
  display: block;
  width: 100%;
  resize: none;
  overflow: hidden;
  background: rgb(0 0 0 / 0.35);
  border: none;
  outline: 1px solid var(--accent);
  border-radius: 3px;
  padding: 0;
  font: inherit;
  line-height: 1.4;
  cursor: text;
}
.cm-handle {
  position: absolute;
  right: -7px;
  bottom: -7px;
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: var(--accent);
  cursor: nwse-resize;
}
.cm-svg {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  overflow: visible;
}
.cm-hit {
  stroke: transparent;
  stroke-width: 16;
  pointer-events: stroke;
  cursor: move;
}
.cm-svg g.sel line:not(.cm-hit) {
  filter: drop-shadow(0 0 3px var(--accent));
}
.cm-end {
  fill: var(--accent);
  stroke: #1a120c;
  stroke-width: 2;
  pointer-events: all;
  cursor: grab;
}
</style>
