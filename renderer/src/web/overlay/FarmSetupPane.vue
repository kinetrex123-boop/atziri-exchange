<template>
  <!-- Atziri Exchange: farming setups (Setup farm tab of Shift + Space) -->
  <div class="ar-body fs" @dragover.prevent @drop.prevent>
    <div class="fs-wrap">
      <div class="fs-head">
        <button
          type="button"
          class="fm-btn"
          :disabled="!setups.length"
          @click="scrollBy(-1)"
        >
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="fs-count">
          {{
            setups.length
              ? `${tr("Fiche", "Card")} ${current + 1} / ${setups.length}`
              : tr("Aucune fiche", "No card")
          }}
        </span>
        <button
          type="button"
          class="fm-btn"
          :disabled="!setups.length"
          @click="scrollBy(1)"
        >
          <i class="fas fa-chevron-right"></i>
        </button>
        <span class="fm-sp"></span>
        <button type="button" class="fm-btn" @click="create()">
          <i class="fas fa-plus"></i> {{ tr("Nouvelle fiche", "New card") }}
        </button>
        <span class="fm-help" tabindex="0">
          ?
          <span class="fm-tip">
            <b>{{ tr("Setup farm", "Farm setups") }}</b>
            <template v-if="isFr">
              <br />Une fiche par stratégie de farm. <br />• Titre : clique
              dessus pour l'écrire. <br />• Liens : clic = ouvre la recherche
              dans l'onglet Trade. Crayon = renommer ou changer le lien (« Page
              Trade ouverte » reprend la recherche affichée dans l'onglet
              Trade). <br />• Grand cadre : clique pour choisir une image,
              glisse un fichier, ou fais Ctrl + V après une capture (Win + Maj +
              S). Clic sur l'image = plein écran. <br />• Cadre du bas : tes
              notes, enregistrées toutes seules. <br />• Flèche à droite :
              nouvelle fiche. Fais défiler avec la molette ou les flèches du
              haut.
            </template>
            <template v-else>
              <br />One card per farming strategy. <br />• Title: click it to
              write it. <br />• Links: click = opens the search in the Trade
              tab. Pencil = rename or change the link ("Open Trade page" takes
              the search shown in the Trade tab). <br />• Large frame: click to
              pick an image, drop a file, or press Ctrl + V after a screenshot
              (Win + Shift + S). Click the image = full screen. <br />• Bottom
              frame: your notes, saved automatically. <br />• Arrow on the
              right: new card. Scroll with the wheel or the arrows at the top.
            </template>
          </span>
        </span>
      </div>

      <div ref="strip" class="fs-strip" @wheel="onWheel" @scroll="onScroll">
        <section
          v-for="(card, ci) in setups"
          :key="card.id"
          class="fs-card"
          :class="{ active: activeId === card.id, tinted: !!card.color }"
          :style="card.color ? { '--card': card.color } : undefined"
          :data-id="card.id"
          @mouseenter="activeId = card.id"
          @mousedown="activeId = card.id"
        >
          <div class="fs-tools" :class="{ open: colorFor === card.id }">
            <button
              type="button"
              :title="tr('Couleur de la fiche', 'Card color')"
              @click="colorFor = colorFor === card.id ? null : card.id"
            >
              <i class="fas fa-palette"></i>
            </button>
            <button
              type="button"
              :title="tr('Déplacer à gauche', 'Move left')"
              :disabled="ci === 0"
              @click="moveCard(card.id, -1)"
            >
              <i class="fas fa-arrow-left"></i>
            </button>
            <button
              type="button"
              :title="tr('Déplacer à droite', 'Move right')"
              :disabled="ci === setups.length - 1"
              @click="moveCard(card.id, 1)"
            >
              <i class="fas fa-arrow-right"></i>
            </button>
            <button
              type="button"
              :title="tr('Dupliquer la fiche', 'Duplicate the card')"
              @click="duplicate(card.id)"
            >
              <i class="fas fa-clone"></i>
            </button>
            <button
              type="button"
              class="fs-del"
              :title="tr('Supprimer la fiche', 'Delete the card')"
              @click="remove(card)"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>

          <!-- color of the card -->
          <div v-if="colorFor === card.id" class="fs-colors">
            <button
              v-for="c in COLORS"
              :key="c"
              type="button"
              class="fs-swatch"
              :class="{ on: card.color === c }"
              :style="{ background: c }"
              @click="setColor(card.id, c)"
            ></button>
            <label
              class="fs-swatch fs-custom"
              :title="tr('Autre couleur', 'Other color')"
            >
              <i class="fas fa-eye-dropper"></i>
              <input
                type="color"
                :value="card.color ?? '#7a2a1c'"
                @input="
                  setColor(card.id, ($event.target as HTMLInputElement).value)
                "
              />
            </label>
            <button
              type="button"
              class="fm-btn"
              @click="setColor(card.id, null)"
            >
              {{ tr("Par défaut", "Default") }}
            </button>
            <button type="button" class="fm-btn" @click="colorFor = null">
              OK
            </button>
          </div>

          <input
            class="fs-title"
            :value="card.title"
            :placeholder="tr('Titre de la stratégie', 'Strategy title')"
            spellcheck="false"
            @input="
              setTitle(card.id, ($event.target as HTMLInputElement).value)
            "
          />

          <div class="fs-grid">
            <div
              v-for="(link, li) in card.links"
              :key="li"
              class="fs-link"
              :class="[`fs-l${li}`, { empty: !link.url }]"
            >
              <button
                type="button"
                class="fs-link-go"
                :title="
                  link.url || tr('Ajouter un lien trade', 'Add a trade link')
                "
                @click="link.url ? go(link.url) : startEdit(card, li)"
              >
                <template v-if="link.url">{{
                  link.name || `${tr("Lien", "Link")} ${li + 1}`
                }}</template>
                <template v-else
                  ><i class="fas fa-plus"></i>
                  {{ tr("Lien trade", "Trade link") }}</template
                >
              </button>
              <button
                v-if="link.url"
                type="button"
                class="fs-link-edit"
                :title="tr('Renommer / modifier', 'Rename / edit')"
                @click="startEdit(card, li)"
              >
                <i class="fas fa-pen"></i>
              </button>
            </div>

            <div
              class="fs-img"
              :class="{ over: dropOn === card.id }"
              @dragover.prevent.stop="dropOn = card.id"
              @dragleave="dropOn = dropOn === card.id ? null : dropOn"
              @drop.prevent.stop="onDrop(card.id, $event)"
              @mouseenter="pasteSlot = 'imageId'"
            >
              <template
                v-if="card.imageId != null && imageUrls.get(card.imageId)"
              >
                <img
                  :src="imageUrls.get(card.imageId)"
                  alt=""
                  @click="zoom = imageUrls.get(card.imageId)!"
                />
                <div class="fs-img-tools">
                  <button
                    type="button"
                    :title="tr('Changer l\'image', 'Change the image')"
                    @click="pick(card.id)"
                  >
                    <i class="fas fa-image"></i>
                  </button>
                  <button
                    type="button"
                    class="fs-del"
                    :title="tr('Retirer l\'image', 'Remove the image')"
                    @click="removeImage(card.id)"
                  >
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </template>
              <button
                v-else
                type="button"
                class="fs-img-empty"
                @click="pick(card.id)"
              >
                <i class="fas fa-camera"></i>
                <span>{{
                  tr(
                    "Clique, glisse une image ou Ctrl + V",
                    "Click, drop an image or Ctrl + V",
                  )
                }}</span>
              </button>
            </div>
          </div>

          <div class="fs-bottom">
            <textarea
              class="fs-notes"
              :value="card.notes"
              :placeholder="
                tr(
                  'Notes : atlas, tablettes, waystones, mods à éviter…',
                  'Notes: atlas, tablets, waystones, mods to avoid…',
                )
              "
              @input="
                setNotes(card.id, ($event.target as HTMLTextAreaElement).value)
              "
            ></textarea>
            <!-- small screenshot (tablet size) -->
            <div
              class="fs-thumb"
              :class="{ over: dropOn === -card.id }"
              @dragover.prevent.stop="dropOn = -card.id"
              @dragleave="dropOn = dropOn === -card.id ? null : dropOn"
              @drop.prevent.stop="onDrop(card.id, $event, 'thumbId')"
              @mouseenter="pasteSlot = 'thumbId'"
              @mouseleave="pasteSlot = 'imageId'"
            >
              <template
                v-if="card.thumbId != null && imageUrls.get(card.thumbId)"
              >
                <img
                  :src="imageUrls.get(card.thumbId)"
                  alt=""
                  @click="zoom = imageUrls.get(card.thumbId)!"
                />
                <div class="fs-img-tools">
                  <button
                    type="button"
                    :title="tr('Changer l\'image', 'Change the image')"
                    @click="pick(card.id, 'thumbId')"
                  >
                    <i class="fas fa-image"></i>
                  </button>
                  <button
                    type="button"
                    class="fs-del"
                    :title="tr('Retirer l\'image', 'Remove the image')"
                    @click="removeImage(card.id, 'thumbId')"
                  >
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </template>
              <button
                v-else
                type="button"
                class="fs-img-empty"
                :title="
                  tr(
                    'Petite image : clique, glisse ou Ctrl + V',
                    'Small image: click, drop or Ctrl + V',
                  )
                "
                @click="pick(card.id, 'thumbId')"
              >
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </div>

          <!-- link editor -->
          <div
            v-if="edit && edit.cardId === card.id"
            class="fs-edit"
            @keydown.esc="edit = null"
          >
            <b>{{ tr("Lien", "Link") }} {{ edit.slot + 1 }}</b>
            <input
              v-model="edit.name"
              class="ar-search"
              :placeholder="
                tr(
                  'Nom (ex. : Tablettes Délire)',
                  'Name (e.g. Delirium tablets)',
                )
              "
            />
            <input
              v-model="edit.url"
              class="ar-search"
              placeholder="https://www.pathofexile.com/trade2/search/…"
              @keydown.enter="saveEdit"
            />
            <div class="fs-edit-row">
              <button
                type="button"
                class="fm-btn"
                :title="currentTrade"
                @click="edit.url = currentTrade"
              >
                <i class="fas fa-balance-scale"></i>
                {{ tr("Page Trade ouverte", "Open Trade page") }}
              </button>
              <span class="fm-sp"></span>
              <button type="button" class="fm-btn fm-danger" @click="clearEdit">
                {{ tr("Effacer", "Clear") }}
              </button>
              <button type="button" class="fm-btn" @click="edit = null">
                {{ tr("Annuler", "Cancel") }}
              </button>
              <button
                type="button"
                class="fm-btn fs-ok"
                :disabled="!validUrl(edit.url)"
                @click="saveEdit"
              >
                OK
              </button>
            </div>
          </div>
        </section>

        <!-- arrow: new card -->
        <button
          type="button"
          class="fs-add"
          :title="tr('Nouvelle fiche', 'New card')"
          @click="create()"
        >
          <i class="fas fa-arrow-right"></i>
          <span>{{ tr("Nouvelle fiche", "New card") }}</span>
        </button>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      hidden
      @change="onFile"
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
} from "vue";
import { askConfirm } from "./atziri-confirm";
import {
  hubTab,
  hubVisible,
  openInHub,
  isTradeUrl,
  webTabUrls,
} from "./atziri-hub";
import { tr, isFrench } from "@/web/atziri-lang";
import {
  setups,
  imageUrls,
  addCard,
  duplicateCard,
  deleteCard,
  moveCard,
  setTitle,
  setNotes,
  setLink,
  setImage,
  removeImage,
  setColor,
  type ImageSlot,
  type SetupCard,
} from "./atziri-farm-setup";

const isFr = computed(() => isFrench());
const strip = shallowRef<HTMLElement | null>(null);
const fileInput = shallowRef<HTMLInputElement | null>(null);
const activeId = shallowRef<number | null>(null);
const dropOn = shallowRef<number | null>(null);
const zoom = shallowRef<string | null>(null);
const current = shallowRef(0);
const currentTrade = computed(() => webTabUrls.value.trade);

// ---- cards ----
async function scrollToCard(id: number) {
  await nextTick();
  const el = strip.value?.querySelector<HTMLElement>(`[data-id="${id}"]`);
  el?.scrollIntoView({
    behavior: "smooth",
    inline: "nearest",
    block: "nearest",
  });
  activeId.value = id;
}
function create(afterId?: number) {
  scrollToCard(addCard(afterId));
}
async function duplicate(id: number) {
  const copy = await duplicateCard(id);
  if (copy != null) scrollToCard(copy);
}
async function remove(card: SetupCard) {
  const name = card.title || tr("cette fiche", "this card");
  if (await askConfirm(tr(`Supprimer « ${name} » ?`, `Delete "${name}"?`))) {
    await deleteCard(card.id);
  }
}

// ---- left / right scrolling ----
function cardStep(): number {
  const first = strip.value?.querySelector<HTMLElement>(".fs-card");
  return first ? first.offsetWidth + 14 : 400;
}
function scrollBy(dir: -1 | 1) {
  strip.value?.scrollBy({ left: dir * cardStep(), behavior: "smooth" });
}
function onScroll() {
  if (!strip.value) return;
  current.value = Math.min(
    Math.max(setups.value.length - 1, 0),
    Math.round(strip.value.scrollLeft / cardStep()),
  );
}
// mouse wheel scrolls sideways (except inside the notes)
function onWheel(e: WheelEvent) {
  if ((e.target as HTMLElement).closest("textarea") || !strip.value) return;
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    strip.value.scrollLeft += e.deltaY;
    e.preventDefault();
  }
}

// ---- links ----
function validUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
function go(url: string) {
  if (isTradeUrl(url)) openInHub(url, "trade");
  else if (url.includes("poe.ninja")) openInHub(url, "ninja");
  else openInHub(url, "poedb");
}
const edit = ref<{
  cardId: number;
  slot: number;
  name: string;
  url: string;
} | null>(null);
function startEdit(card: SetupCard, slot: number) {
  const l = card.links[slot];
  edit.value = { cardId: card.id, slot, name: l.name, url: l.url };
}
function saveEdit() {
  const e = edit.value;
  if (!e || !validUrl(e.url)) return;
  setLink(e.cardId, e.slot, { name: e.name.trim(), url: e.url.trim() });
  edit.value = null;
}
function clearEdit() {
  const e = edit.value;
  if (!e) return;
  setLink(e.cardId, e.slot, { name: "", url: "" });
  edit.value = null;
}

// ---- screenshot ----
// Ctrl + V goes to the small image while the mouse is over it
const pasteSlot = shallowRef<ImageSlot>("imageId");
// card whose color picker is open
const colorFor = shallowRef<number | null>(null);
const COLORS = [
  "#7a2a1c",
  "#8a6a1e",
  "#2f6b3a",
  "#1f5f6b",
  "#27408b",
  "#5b2c83",
  "#7a1f4f",
  "#4a4a4a",
];

let pickFor: number | null = null;
let pickSlot: ImageSlot = "imageId";
function pick(id: number, slot: ImageSlot = "imageId") {
  pickFor = id;
  pickSlot = slot;
  fileInput.value?.click();
}
function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file && pickFor != null) setImage(pickFor, file, pickSlot);
  input.value = "";
}
function onDrop(id: number, e: DragEvent, slot: ImageSlot = "imageId") {
  dropOn.value = null;
  const file = Array.from(e.dataTransfer?.files ?? []).find((f) =>
    f.type.startsWith("image/"),
  );
  if (file) setImage(id, file, slot);
}
// Ctrl + V of a screenshot: goes to the card under the mouse (or the last used)
function onPaste(e: ClipboardEvent) {
  if (
    !hubVisible.value ||
    hubTab.value !== "farmsetup" ||
    activeId.value == null
  )
    return;
  const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
    i.type.startsWith("image/"),
  );
  const file = item?.getAsFile();
  if (!file) return;
  e.preventDefault();
  setImage(activeId.value, file, pasteSlot.value);
}
function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && zoom.value) zoom.value = null;
}
onMounted(() => {
  window.addEventListener("paste", onPaste);
  window.addEventListener("keydown", onKey);
});
onUnmounted(() => {
  window.removeEventListener("paste", onPaste);
  window.removeEventListener("keydown", onKey);
});
</script>

<style lang="postcss">
.ar-hub .fs {
  min-width: 0;
}
.ar-hub .fs-wrap {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgb(var(--c-gray-900) / 0.88);
}
.ar-hub .fs-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ar-hub .fs-head .fm-btn:disabled {
  opacity: 0.4;
  pointer-events: none;
}
.ar-hub .fs-count {
  min-width: 6.5rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--muted);
}
.ar-hub .fs-strip {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 14px;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  padding-bottom: 6px;
}
.ar-hub .fs-card {
  position: relative;
  flex: 0 0 calc((100% - 14px - 90px) / 2);
  min-width: 340px;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 2px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
  overflow: auto;
}
.ar-hub .fs-card.active {
  border-color: var(--accent);
}
.ar-hub .fs-tools {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}
.ar-hub .fs-card:hover .fs-tools {
  opacity: 1;
}
.ar-hub .fs-tools button,
.ar-hub .fs-img-tools button {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  color: var(--muted);
  font-size: 0.75rem;
}
.ar-hub .fs-tools button:hover,
.ar-hub .fs-img-tools button:hover {
  color: var(--accent);
}
.ar-hub .fs-tools button:disabled {
  opacity: 0.3;
  pointer-events: none;
}
.ar-hub .fs-tools .fs-del:hover,
.ar-hub .fs-img-tools .fs-del:hover {
  color: var(--bad);
}

/* plain buttons (the hub gives every button a frame) */
.ar-hub .fs-tools button,
.ar-hub .fs-img-tools button,
.ar-hub .fs-link-edit,
.ar-hub .fs-img-empty,
.ar-hub .fs-add {
  padding: 0;
  border: none;
  background: transparent;
}
.ar-hub .fs-link-go {
  border: 1px solid transparent;
}

/* colored card */
.ar-hub .fs-card.tinted {
  background: color-mix(in srgb, var(--card) 22%, var(--bg));
  border-color: color-mix(in srgb, var(--card) 70%, var(--line));
}
.ar-hub .fs-card.tinted.active {
  border-color: var(--card);
}
.ar-hub .fs-tools.open {
  opacity: 1;
}
.ar-hub .fs-colors {
  position: absolute;
  top: 34px;
  right: 8px;
  z-index: 11;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  max-width: 260px;
  padding: 8px;
  border: 1px solid var(--accent);
  border-radius: 6px;
  background: var(--bg);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
}
.ar-hub .fs-swatch.fs-swatch {
  position: relative;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 50%;
  border: 2px solid var(--line);
  cursor: pointer;
}
.ar-hub .fs-swatch.on,
.ar-hub .fs-swatch:hover {
  border-color: var(--fg);
}
.ar-hub .fs-custom {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 0.7rem;
  background: var(--surface);
}
.ar-hub .fs-custom input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

/* notes + small image */
.ar-hub .fs-bottom {
  display: flex;
  gap: 10px;
}
.ar-hub .fs-bottom .fs-notes {
  flex: 1;
  min-width: 0;
}
.ar-hub .fs-thumb {
  position: relative;
  flex: 0 0 auto;
  width: 84px;
  height: 84px;
  align-self: flex-end;
  border-radius: 4px;
  background: rgb(0 0 0 / 0.45);
  border: 1px dashed var(--line);
  overflow: hidden;
}
.ar-hub .fs-thumb.over {
  border-color: var(--accent);
}
.ar-hub .fs-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  cursor: zoom-in;
}
.ar-hub .fs-thumb:hover .fs-img-tools {
  opacity: 1;
}

/* title */
.ar-hub .fs-title {
  align-self: center;
  width: 70%;
  text-align: center;
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--fg);
  font-family: var(--display);
  font-weight: 600;
  font-size: 1rem;
}
.ar-hub .fs-title::placeholder {
  color: var(--muted);
}
.ar-hub .fs-title:focus {
  outline: none;
  border-color: var(--accent);
}

/* links on the left, screenshot on the right, 5th link under it */
.ar-hub .fs-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
  grid-template-rows: repeat(4, minmax(42px, 1fr));
  grid-template-areas:
    "l0 img"
    "l1 img"
    "l2 img"
    "l3 l4";
  gap: 10px;
  flex: 1;
  min-height: 250px;
}
.ar-hub .fs-l0 {
  grid-area: l0;
}
.ar-hub .fs-l1 {
  grid-area: l1;
}
.ar-hub .fs-l2 {
  grid-area: l2;
}
.ar-hub .fs-l3 {
  grid-area: l3;
}
.ar-hub .fs-l4 {
  grid-area: l4;
}
.ar-hub .fs-link {
  position: relative;
  display: flex;
}
.ar-hub .fs-link-go {
  flex: 1;
  min-width: 0;
  padding: 4px 26px 4px 8px;
  border-radius: 4px;
  background: var(--surface);
  color: var(--fg);
  font-weight: 600;
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ar-hub .fs-link-go:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.ar-hub .fs-link.empty .fs-link-go {
  padding-right: 8px;
  background: transparent;
  border: 1px dashed var(--line);
  color: var(--muted);
  font-weight: 400;
}
.ar-hub .fs-link-edit {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--muted);
  font-size: 0.7rem;
}
.ar-hub .fs-link-edit:hover {
  color: var(--accent);
}

/* screenshot */
.ar-hub .fs-img {
  grid-area: img;
  position: relative;
  min-height: 0;
  border-radius: 4px;
  background: rgb(0 0 0 / 0.45);
  border: 1px solid var(--line);
  overflow: hidden;
}
.ar-hub .fs-img.over {
  border-color: var(--accent);
}
.ar-hub .fs-img img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  cursor: zoom-in;
}
.ar-hub .fs-img-empty.fs-img-empty {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  color: var(--muted);
  font-size: 0.8rem;
}
.ar-hub .fs-img-empty i {
  font-size: 1.6rem;
}
.ar-hub .fs-img-empty:hover {
  color: var(--accent);
}
.ar-hub .fs-img-tools {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 2px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.7);
  opacity: 0;
}
.ar-hub .fs-img:hover .fs-img-tools {
  opacity: 1;
}

/* notes */
.ar-hub .fs-notes {
  min-height: 70px;
  resize: vertical;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--fg);
  font-size: 0.85rem;
  line-height: 1.4;
}
.ar-hub .fs-notes:focus {
  outline: none;
  border-color: var(--accent);
}

/* link editor */
.ar-hub .fs-edit {
  position: absolute;
  left: 12px;
  right: 12px;
  top: 52px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--accent);
  border-radius: 6px;
  background: var(--bg);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
}
.ar-hub .fs-edit-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.ar-hub .fs-edit .fm-btn:disabled {
  opacity: 0.4;
  pointer-events: none;
}
.ar-hub .fs-ok {
  border-color: var(--accent);
}

/* arrow: new card */
.ar-hub .fs-add.fs-add {
  flex: 0 0 76px;
  align-self: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 4px;
  color: var(--accent);
  font-size: 0.75rem;
  text-align: center;
  border-radius: 8px;
}
.ar-hub .fs-add i {
  font-size: 2.6rem;
}
.ar-hub .fs-add:hover {
  background: var(--surface);
}

/* full screen image */
.ar-hub .fs-zoom {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.85);
  cursor: zoom-out;
}
.ar-hub .fs-zoom img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
