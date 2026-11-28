<template>
  <!-- Atziri Exchange: Well of Souls, modifiers a desecration can offer -->
  <div class="ar-body wos">
    <fieldset class="ar-nav wos-nav">
      <legend>{{ tr("Objet", "Item") }}</legend>
      <HubViewSwitch group="abyss" />
      <div class="ar-sub">
        {{ tr("Fais Ctrl+D sur l'objet rare en jeu, il apparaît ici.", "Press Ctrl+D on the rare item in game, it shows up here.") }}
      </div>
      <div class="wos-tip">
        <i class="fas fa-keyboard"></i>
        {{
          tr(
            `${wellKey} en jeu, devant le Puits des Âmes : le tier de chacun des 3 choix s'affiche à côté (jusqu'au prochain clic).`,
            `${wellKey} in game, at the Well of Souls: the tier of each of the 3 choices shows next to it (until your next click).`,
          )
        }}
      </div>
      <details v-if="lastReveal" class="wos-last">
        <summary>
          {{ tr("Dernière lecture", "Last scan") }} ({{ lastReveal.badges.length }}
          {{ tr("mods reconnus", "modifiers recognised") }})
        </summary>
        <div v-for="b in lastReveal.badges" :key="b.line + b.y" class="wos-last-row">
          <span class="wos-tier">{{ b.tier == null ? "T ?" : `T${b.tier}/${b.count}` }}</span> {{ b.line }}
        </div>
        <div class="ar-sub wos-last-read">
          {{ tr("Texte lu :", "Text read:") }} {{ (lastReveal.read ?? []).join(" · ") }}
        </div>
      </details>
      <button
        v-for="e in candidates"
        :key="e.id"
        type="button"
        :aria-pressed="selectedId === e.id"
        :title="e.name"
        @click="selectedId = e.id"
      >
        <img v-if="e.icon" :src="e.icon" class="ar-catico" />
        <span class="truncate">{{ e.name }}</span>
      </button>
      <div v-if="!candidates.length" class="ar-sub wos-hint">
        {{ tr("Aucun objet rare vérifié pour l'instant.", "No rare item checked yet.") }}
      </div>
      <button type="button" class="wos-paste" @click="pasteItem">
        <i class="fas fa-paste"></i> {{ tr("Coller un objet copié", "Paste a copied item") }}
      </button>
      <div v-if="pasteError" class="ar-sub wos-warn">{{ pasteError }}</div>

      <legend class="wos-legend">{{ tr("Os", "Bone") }}</legend>
      <div class="wos-seg">
        <button
          v-for="b in BONES"
          :key="b.id"
          type="button"
          :aria-pressed="bone === b.id"
          :title="currencyName(boneRef(b.id)) ?? b.label()"
          @click="setBone(b.id)"
        >
          <img v-if="currencyIcon(boneRef(b.id))" :src="currencyIcon(boneRef(b.id))" class="wos-cur" />
          {{ b.label() }}
        </button>
      </div>
      <div class="ar-sub">{{ BONES.find((b) => b.id === bone)!.help() }}</div>

      <legend class="wos-legend">{{ tr("Présage", "Omen") }}</legend>
      <div class="wos-omens">
        <button
          v-for="o in OMENS"
          :key="o.id"
          type="button"
          :aria-pressed="omen === o.id"
          :class="o.lord ? `wos-lord-${o.lord.toLowerCase()}` : ''"
          @click="setOmen(o.id)"
        >
          <img v-if="o.ref && currencyIcon(o.ref)" :src="currencyIcon(o.ref)" class="wos-cur" />
          <span class="truncate flex-1">{{ (o.ref && currencyName(o.ref)) || o.label() }}</span>
          <span v-if="o.lord" class="wos-omen-lord">{{ o.lord }}</span>
        </button>
      </div>
      <div v-if="cost" class="wos-cost">
        <span class="ar-sub">{{ tr("Coût d'un essai", "Cost of one try") }}</span>
        <span class="wos-pct">{{ cost }}</span>
      </div>
    </fieldset>

    <section class="ar-main wos-main">
      <div v-if="loading" class="ar-empty">{{ tr("Analyse…", "Analysing…") }}</div>
      <div v-else-if="error" class="ar-empty">{{ error }}</div>
      <div v-else-if="!result" class="ar-empty">
        {{ tr("Choisis un objet rare à gauche.", "Pick a rare item on the left.") }}
      </div>
      <template v-else>
        <div class="ar-main-head wos-head">
          <div class="min-w-0">
            <h2 class="truncate">{{ result.itemName }}</h2>
            <div class="ar-sub">
              {{ result.baseName }} · {{ result.itemClass }} ·
              {{ tr("niveau d'objet", "item level") }}
              {{ result.ilvlKnown ? result.ilvl : tr(`inconnu (${result.ilvl} supposé)`, `unknown (${result.ilvl} assumed)`) }}
            </div>
          </div>
          <div class="wos-slots">
            <span :class="{ 'wos-open': result.sides.includes('p') }">
              {{ tr("Préfixes", "Prefixes") }} {{ result.prefixes }}/{{ result.maxAffixes }}
            </span>
            <span :class="{ 'wos-open': result.sides.includes('s') }">
              {{ tr("Suffixes", "Suffixes") }} {{ result.suffixes }}/{{ result.maxAffixes }}
            </span>
          </div>
        </div>
        <div v-if="notes.length" class="wos-notes">
          <div v-for="n in notes" :key="n" class="wos-note">{{ n }}</div>
        </div>

        <div class="wos-cols">
          <div class="wos-col">
            <div class="wos-col-head">
              <h3>{{ tr("Mods d'Abysse", "Abyssal modifiers") }}</h3>
              <span class="ar-sub">{{ result.desecrated.length }} {{ tr("familles", "families") }}</span>
            </div>
            <div class="ar-sub wos-col-help">
              {{ tr("Exclusifs Amanamu, Ulaman et Kurgal. Poids réels inconnus : part égale par mod.", "Amanamu, Ulaman and Kurgal exclusives. Real weights unknown: equal share per modifier.") }}
            </div>
            <div v-if="!result.desecrated.length" class="ar-sub wos-none">
              {{ tr("Aucun avec ces réglages.", "None with these settings.") }}
            </div>
            <FamilyRow v-for="f in result.desecrated" :key="f.key" :fam="f" />
          </div>
          <div class="wos-col">
            <div class="wos-col-head">
              <h3>{{ tr("Mods ordinaires", "Ordinary modifiers") }}</h3>
              <span class="ar-sub">{{ result.ordinary.length }} {{ tr("familles", "families") }}</span>
            </div>
            <div class="ar-sub wos-col-help">
              {{ tr("Pool normal de la base. % = poids (poe2db) / total du pool.", "Normal pool of the base. % = weight (poe2db) / pool total.") }}
            </div>
            <div v-if="!result.ordinary.length" class="ar-sub wos-none">
              {{ tr("Aucun avec ces réglages.", "None with these settings.") }}
            </div>
            <FamilyRow v-for="f in result.ordinary" :key="f.key" :fam="f" />
          </div>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, shallowRef, watch, type PropType } from "vue";
import { tr } from "@/web/atziri-lang";
import { parseClipboard, ItemRarity, type ParsedItem } from "@/parser";
import HubViewSwitch from "./HubViewSwitch.vue";
import { hubTab, hubVisible } from "./atziri-hub";
import { history, type HistoryEntry } from "./atziri-history";
import { formatDivines } from "./atziri-money";
import { usePoeninja } from "@/web/background/Prices";
import { ITEM_BY_REF } from "@/assets/data";
import { AppConfig } from "@/web/Config";
import { lastWellReveal } from "./atziri-well-reveal";
import type { ItemCheckWidget } from "@/web/item-check/widget";
import {
  analyseWell,
  wellSettings,
  saveWellSettings,
  OMEN_LORD,
  type Bone,
  type Omen,
  type WellFamily,
  type WellResult,
} from "./atziri-well";

const BONES: Array<{ id: Bone; label: () => string; help: () => string }> = [
  {
    id: "gnawed",
    label: () => tr("Rongé", "Gnawed"),
    help: () => tr("Objets de niveau 64 max. : mods limités au niveau 64.", "Items up to level 64: modifiers limited to level 64."),
  },
  {
    id: "preserved",
    label: () => tr("Préservé", "Preserved"),
    help: () => tr("Aucune limite en plus : le niveau d'objet décide.", "No extra limit: the item level decides."),
  },
  {
    id: "ancient",
    label: () => tr("Ancien", "Ancient"),
    help: () => tr("Retire les tiers de niveau inférieur à 40.", "Removes the tiers below level 40."),
  },
];
const OMENS: Array<{ id: Omen; label: () => string; lord?: string; ref?: string }> = [
  { id: "none", label: () => tr("Aucun", "None") },
  { id: "liege", label: () => "Omen of the Liege", lord: OMEN_LORD.liege, ref: "Omen of the Liege" },
  { id: "sovereign", label: () => "Omen of the Sovereign", lord: OMEN_LORD.sovereign, ref: "Omen of the Sovereign" },
  { id: "blackblooded", label: () => "Omen of the Blackblooded", lord: OMEN_LORD.blackblooded, ref: "Omen of the Blackblooded" },
];

// bones and omens: names / icons in the game language, poe.ninja prices
const ninja = usePoeninja();
function boneRef(b: Bone): string {
  const cls = result.value?.itemClass ?? "";
  const part = ["Amulet", "Ring", "Belt"].includes(cls)
    ? "Collarbone"
    : /Armour|Helmet|Gloves|Boots|Shield|Buckler|Focus/.test(cls)
      ? "Rib"
      : "Jawbone";
  return `${b === "gnawed" ? "Gnawed" : b === "ancient" ? "Ancient" : "Preserved"} ${part}`;
}
function currencyName(ref: string): string | undefined {
  return ITEM_BY_REF("ITEM", ref)?.[0]?.name;
}
function currencyIcon(ref: string): string | undefined {
  return ITEM_BY_REF("ITEM", ref)?.[0]?.icon;
}
const cost = computed(() => {
  if (!result.value) return "";
  // re-evaluate when prices arrive
  void ninja.marketUpdatedAt.value;
  const refs = [boneRef(bone.value)];
  const o = OMENS.find((x) => x.id === omen.value);
  if (o?.ref) refs.push(o.ref);
  let total = 0;
  for (const ref of refs) {
    const p = ninja.findPriceByQuery({ ns: "ITEM", name: ref });
    if (!p) return "";
    total += p.primaryValue;
  }
  const f = formatDivines(total);
  return f.divText ? `${f.divText} div` : `${f.chaosText} ${f.chaosIcon.includes("exa") ? "ex" : "c"}`;
});

const lastReveal = lastWellReveal;
const wellKey = computed(
  () => (AppConfig("item-check") as ItemCheckWidget | undefined)?.atziriWellKey || "Alt + W",
);
const bone = computed(() => wellSettings.value.bone);
const omen = computed(() => wellSettings.value.omen);
function setBone(b: Bone) {
  saveWellSettings({ ...wellSettings.value, bone: b });
}
function setOmen(o: Omen) {
  saveWellSettings({ ...wellSettings.value, omen: o });
}

// ---- items: rare equipment from the Ctrl+D history, or a pasted text ----
interface Candidate {
  id: number;
  name: string;
  icon?: string;
  rawText: string;
}
const pasted = shallowRef<Candidate | null>(null);
const pasteError = shallowRef("");

// the page can live in its own window: re-read the history saved by the overlay
function reloadHistory() {
  try {
    const v = JSON.parse(localStorage.getItem("atziri-history") ?? "null");
    if (Array.isArray(v)) history.value = v;
  } catch {
    // unreadable storage
  }
}
window.addEventListener("storage", (e) => {
  if (e.key === "atziri-history") reloadHistory();
});

const candidates = computed<Candidate[]>(() => {
  const out: Candidate[] = [];
  if (pasted.value) out.push(pasted.value);
  for (const e of history.value as HistoryEntry[]) {
    if (e.rarity !== ItemRarity.Rare) continue;
    if (out.some((c) => c.rawText === e.rawText)) continue;
    out.push({ id: e.id, name: e.name, icon: e.icon, rawText: e.rawText });
    if (out.length >= 12) break;
  }
  return out;
});
const selectedId = shallowRef<number | null>(null);
watch(
  candidates,
  (list) => {
    // follow the newest Ctrl+D item
    if (list.length && (selectedId.value == null || !list.some((c) => c.id === selectedId.value))) {
      selectedId.value = list[0].id;
    }
  },
  { immediate: true },
);
watch(
  () => candidates.value[0]?.id,
  (id, old) => {
    if (id != null && id !== old) selectedId.value = id;
  },
);

async function pasteItem() {
  pasteError.value = "";
  try {
    const text = await navigator.clipboard.readText();
    const parsed = parseClipboard(text);
    if (!parsed.isOk()) throw new Error("item");
    pasted.value = { id: -Date.now(), name: parsed.value.info.name, icon: parsed.value.info.icon, rawText: text };
    selectedId.value = pasted.value.id;
  } catch {
    pasteError.value = tr(
      "Le presse-papiers ne contient pas d'objet (copie-le en jeu avec Ctrl+Alt+C).",
      "The clipboard has no item (copy it in game with Ctrl+Alt+C).",
    );
  }
}

// ---- analysis ----
const result = shallowRef<WellResult | null>(null);
const loading = shallowRef(false);
const error = shallowRef("");
let run = 0;
watch(
  [selectedId, bone, omen, () => hubTab.value === "well"],
  async () => {
    if (hubTab.value !== "well") return;
    const cand = candidates.value.find((c) => c.id === selectedId.value);
    if (!cand) {
      result.value = null;
      return;
    }
    const id = ++run;
    loading.value = !result.value;
    error.value = "";
    try {
      const parsed = parseClipboard(cand.rawText);
      if (!parsed.isOk()) throw new Error("item");
      const r = await analyseWell(parsed.value as ParsedItem, bone.value, omen.value);
      if (id === run) result.value = r;
    } catch (e) {
      if (id !== run) return;
      console.warn("[Well of Souls]", e);
      result.value = null;
      error.value =
        (e as Error).message === "base"
          ? tr(
              "Cet objet ne peut pas être désacralisé (arme, carquois, armure ou bijou rare seulement).",
              "This item cannot be desecrated (rare weapon, quiver, armour or jewellery only).",
            )
          : tr("Impossible de lire cet objet.", "Could not read this item.");
    } finally {
      if (id === run) loading.value = false;
    }
  },
  { immediate: true },
);
watch(hubVisible, (v) => v && reloadHistory());
onMounted(reloadHistory);

const notes = computed(() => {
  const r = result.value;
  if (!r) return [];
  const out: string[] = [];
  if (r.veiled.p || r.veiled.s) {
    out.push(
      tr(
        `Mod désacré non révélé : ${r.veiled.p ? "préfixe" : "suffixe"}. Seuls les ${r.veiled.p ? "préfixes" : "suffixes"} sont listés.`,
        `Unrevealed desecrated modifier: ${r.veiled.p ? "prefix" : "suffix"}. Only ${r.veiled.p ? "prefixes" : "suffixes"} are listed.`,
      ),
    );
  }
  if (r.warnings.includes("gnawed-ilvl")) {
    out.push(tr("Un os rongé ne s'utilise que sur un objet de niveau 64 ou moins.", "A Gnawed bone only works on items of level 64 or less."));
  }
  if (r.warnings.includes("not-rare")) out.push(tr("Les os ne s'utilisent que sur des objets rares.", "Bones only work on rare items."));
  if (r.warnings.includes("corrupted")) out.push(tr("Objet corrompu : il ne peut plus être modifié.", "Corrupted item: it cannot be modified."));
  if (r.warnings.includes("full")) out.push(tr("Plus de préfixe ni de suffixe libre.", "No free prefix or suffix left."));
  if (r.presentGroups.length) {
    out.push(
      tr(
        `${r.presentGroups.length} famille(s) déjà sur l'objet retirée(s) de la liste.`,
        `${r.presentGroups.length} family(ies) already on the item removed from the list.`,
      ),
    );
  }
  if (!r.ilvlKnown) {
    out.push(tr("Copie avancée conseillée (Ctrl+D la fait déjà).", "Advanced copy recommended (Ctrl+D already does it)."));
  }
  return out;
});

// ---- one family row (best tier, share, tiers on demand) ----
const FamilyRow = defineComponent({
  props: { fam: { type: Object as PropType<WellFamily>, required: true } },
  setup(props) {
    const open = shallowRef(false);
    return () => {
      const f = props.fam;
      const best = f.tiers[0];
      const pct = (v: number) => (v >= 0.1 ? `${(v * 100).toFixed(0)}%` : v >= 0.01 ? `${(v * 100).toFixed(1)}%` : `${(v * 100).toFixed(2)}%`);
      return h(
        "div",
        {
          class: ["wos-fam", f.lord ? `wos-lord-${f.lord.toLowerCase()}` : ""],
          onClick: () => (open.value = !open.value),
          title: tr("Clic : voir tous les tiers", "Click: show every tier"),
        },
        [
          h("div", { class: "wos-fam-top" }, [
            h("span", { class: "wos-gen" }, f.g === "p" ? tr("P", "P") : tr("S", "S")),
            h("div", { class: "wos-fam-text" }, best.text.map((t) => h("div", t))),
            h("div", { class: "wos-fam-side" }, [
              h("span", { class: "wos-pct" }, pct(f.share)),
              h(
                "span",
                { class: "wos-tier" },
                `T${best.tier}${f.tiers.length > 1 ? `–T${f.tiers[f.tiers.length - 1].tier}` : ""} / ${f.maxTier}`,
              ),
            ]),
          ]),
          h("div", { class: "wos-bar" }, [h("i", { style: { width: `${Math.min(100, f.share * 100 * 4)}%` } })]),
          f.lord ? h("div", { class: "wos-lordname" }, f.lord) : null,
          open.value
            ? h(
                "div",
                { class: "wos-tiers" },
                f.tiers.map((t) =>
                  h("div", { class: "wos-tierrow" }, [
                    h("span", { class: "wos-tier" }, `T${t.tier}`),
                    h("span", { class: "ar-sub" }, `${tr("niv.", "lvl")} ${t.mod.l}`),
                    h("span", { class: "wos-tiertext" }, `${t.mod.n ? `${t.mod.n} — ` : ""}${t.text.join(" / ")}`),
                    h("span", { class: "wos-pct" }, pct(t.share)),
                  ]),
                ),
              )
            : null,
        ],
      );
    };
  },
});
</script>

<style lang="postcss">
.wos .wos-nav {
  width: 17rem;
}
.ar-hub .wos-nav .wos-legend {
  margin-top: 8px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent);
  opacity: 0.85;
}
.ar-hub .wos-nav .fv-switch {
  align-self: flex-start;
  margin-bottom: 4px;
}
.wos-tip {
  font-size: 12.5px;
  padding: 5px 7px;
  border: 1px dashed color-mix(in srgb, var(--accent) 50%, var(--line));
  border-radius: 6px;
  color: var(--fg);
}
.wos-tip i {
  color: var(--accent);
  margin-right: 4px;
}
.wos-last {
  font-size: 12.5px;
}
.wos-last summary {
  cursor: pointer;
  color: var(--muted);
}
.wos-last-row {
  padding: 2px 0;
}
.wos-last-read {
  font-size: 11.5px;
  word-break: break-word;
}
.wos-hint,
.wos-warn {
  padding: 2px 2px;
}
.wos-warn {
  color: #e2a26b;
}
.ar-hub .wos-nav .wos-paste {
  justify-content: center;
  color: var(--muted);
}
.ar-hub .wos-seg {
  display: flex;
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
}
.ar-hub .wos-nav .wos-seg button {
  flex: 1;
  justify-content: center;
  border: none;
  border-radius: 0;
  padding: 5px 4px;
  font-size: 12.5px;
}
.ar-hub .wos-nav .wos-seg button + button {
  border-left: 1px solid var(--line);
}
.wos-omens {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ar-hub .wos-nav .wos-omens button {
  justify-content: space-between;
}
.wos-omen-lord {
  font-size: 11px;
  opacity: 0.8;
}
.wos-cur {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex: none;
}
.ar-hub .wos-nav .wos-seg button {
  gap: 4px;
}
.wos-cost {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 4px 6px;
  border: 1px dashed var(--line);
  border-radius: 6px;
}
.wos-main {
  overflow: hidden;
}
.wos-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}
.wos-slots {
  display: flex;
  gap: 8px;
  flex: none;
}
.wos-slots span {
  padding: 2px 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 12.5px;
  color: var(--muted);
}
.wos-slots .wos-open {
  border-color: var(--accent);
  color: var(--accent);
}
.wos-notes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.wos-note {
  font-size: 12.5px;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--line));
  background: rgb(var(--c-gray-900) / 0.55);
}
.wos-cols {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.wos-col {
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 4px;
}
.wos-col-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  position: sticky;
  top: 0;
  background: var(--surface);
  padding-bottom: 2px;
  z-index: 1;
}
.wos-col-head h3 {
  margin: 0;
  font-family: var(--display);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.95rem;
  color: var(--accent);
}
.wos-col-help {
  font-size: 12px;
}
.wos-none {
  padding: 1rem 0;
}
.wos-fam {
  --lord: var(--line);
  border: 1px solid var(--line);
  border-left: 3px solid var(--lord);
  border-radius: 8px;
  padding: 6px 8px;
  background: rgb(var(--c-gray-900) / 0.55);
  cursor: pointer;
  font-size: 13px;
}
.wos-fam:hover {
  border-color: color-mix(in srgb, var(--accent) 55%, var(--line));
  border-left-color: var(--lord);
}
.wos-lord-amanamu {
  --lord: #d9573b;
}
.wos-lord-ulaman {
  --lord: #4fa3d9;
}
.wos-lord-kurgal {
  --lord: #9b6bd6;
}
.ar-hub .wos-omens .wos-lord-amanamu[aria-pressed="true"],
.ar-hub .wos-omens .wos-lord-ulaman[aria-pressed="true"],
.ar-hub .wos-omens .wos-lord-kurgal[aria-pressed="true"] {
  border-color: var(--lord);
  color: var(--lord);
}
.wos-fam-top {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.wos-gen {
  flex: none;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  display: inline-grid;
  place-items: center;
  font-size: 11px;
  border: 1px solid var(--line);
  color: var(--muted);
}
.wos-fam-text {
  flex: 1;
  min-width: 0;
  color: #b9c7ff;
}
.wos-lord-amanamu .wos-fam-text,
.wos-lord-ulaman .wos-fam-text,
.wos-lord-kurgal .wos-fam-text {
  color: #e8c9a0;
}
.wos-fam-side {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.wos-pct {
  font-family: var(--mono);
  color: var(--fg);
}
.wos-tier {
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--muted);
}
.wos-bar {
  height: 3px;
  margin-top: 5px;
  background: rgb(var(--c-gray-700) / 0.5);
  border-radius: 2px;
  overflow: hidden;
}
.wos-bar i {
  display: block;
  height: 100%;
  background: color-mix(in srgb, var(--lord) 70%, var(--accent));
}
.wos-lordname {
  margin-top: 3px;
  font-size: 11px;
  color: var(--lord);
}
.wos-tiers {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  border-top: 1px solid var(--line);
  padding-top: 5px;
}
.wos-tierrow {
  display: grid;
  grid-template-columns: 2.2rem 3.4rem minmax(0, 1fr) 3.6rem;
  gap: 6px;
  align-items: baseline;
  font-size: 12.5px;
}
.wos-tierrow .wos-pct {
  text-align: right;
}
.wos-tiertext {
  min-width: 0;
}
</style>
