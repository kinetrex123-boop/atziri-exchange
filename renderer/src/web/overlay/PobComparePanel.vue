<template>
  <!-- Atziri Exchange: Ctrl + B result, item vs the gear of the PoB build -->
  <div v-if="state" class="pc-panel" @click.stop>
    <div class="pc-head">
      <span class="pc-title">{{ state.itemName || tr("Objet", "Item") }}</span>
      <button type="button" class="pc-x" :title="tr('Fermer (Échap)', 'Close (Esc)')" @click="close">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div v-if="state.status === 'loading'" class="pc-muted pc-pad">
      <i class="fas fa-spinner fa-spin"></i>
      {{ tr("Calcul avec Path of Building…", "Computing with Path of Building…") }}
    </div>

    <div v-else-if="state.status === 'error'" class="pc-pad">
      <div class="pc-bad">{{ errorText }}</div>
      <div class="pc-muted pc-mt">
        {{ tr("Vérifie l'onglet Stats de Shift + Espace (build PoB choisi).", "Check the Stats tab of Shift + Space (PoB build chosen).") }}
      </div>
    </div>

    <template v-else-if="state.data">
      <div v-if="state.data.slots.length > 1" class="pc-slots">
        <button
          v-for="(sl, i) in state.data.slots"
          :key="sl.slot"
          type="button"
          :class="{ on: i === slotIndex }"
          @click="slotIndex = i"
        >
          {{ slotLabel(sl.slot, isFr) }}
        </button>
      </div>
      <div class="pc-muted pc-pad pc-replace">
        {{ tr("Remplace :", "Replaces:") }}
        <b>{{ slot?.current ? slot.current.split(",")[0] : tr("(emplacement vide)", "(empty slot)") }}</b>
        <span v-if="slot"> ({{ slotLabel(slot.slot, isFr) }})</span>
      </div>

      <div v-if="damageRows.length" class="pc-grp">{{ tr("Dégâts", "Damage") }}</div>
      <div v-for="r in damageRows" :key="r.label" class="pc-row">
        <span>{{ r.label }}</span>
        <span class="pc-num">{{ fmtNum(r.before, isFr) }}</span>
        <span class="pc-muted">→</span>
        <span class="pc-num">{{ fmtNum(r.after, isFr) }}</span>
        <span class="pc-num" :class="cls(r.after - r.before)">{{ pct(r.before, r.after) }}</span>
      </div>

      <template v-if="offence.rows.length">
        <div class="pc-grp">{{ tr("Attaque", "Offence") }} · {{ offence.label }}</div>
        <div v-for="o in offence.rows" :key="o.key" class="pc-row">
          <span>{{ tr(o.fr, o.en) }}</span>
          <span class="pc-num">{{ fmtNum(o.before, isFr) }}{{ o.unit }}</span>
          <span class="pc-muted">→</span>
          <span class="pc-num">{{ fmtNum(o.after, isFr) }}{{ o.unit }}</span>
          <span class="pc-num" :class="cls(o.after - o.before)">{{ signed(o.after - o.before) }}</span>
        </div>
      </template>

      <div class="pc-grp">{{ tr("Défense", "Defence") }}</div>
      <template v-for="d in DEF" :key="d.key">
        <div v-if="shown(d.key)" class="pc-row">
          <span>{{ tr(d.fr, d.en) }}</span>
          <span class="pc-num">{{ fmtNum(slot!.before[d.key], isFr) }}{{ d.unit }}</span>
          <span class="pc-muted">→</span>
          <span class="pc-num">{{ fmtNum(slot!.after[d.key], isFr) }}{{ d.unit }}</span>
          <span class="pc-num" :class="cls(diff(d.key))">{{ signed(diff(d.key)) }}</span>
        </div>
      </template>

      <!-- mod lines, this item vs the equipped one -->
      <template v-if="(state.data.lines?.length ?? 0) || (slot?.currentLines?.length ?? 0)">
        <div class="pc-grp">{{ tr("Mods", "Mods") }}</div>
        <div class="pc-mods">
          <div>
            <div class="pc-cap">{{ tr("Cet objet", "This item") }}</div>
            <div v-for="(l, i) in state.data.lines ?? []" :key="'n' + i" :class="currentSet.has(l) ? 'pc-muted' : 'pc-ok'">{{ l }}</div>
          </div>
          <div>
            <div class="pc-cap">{{ tr("Équipé", "Equipped") }}</div>
            <div v-for="(l, i) in slot?.currentLines ?? []" :key="'c' + i" :class="newSet.has(l) ? 'pc-muted' : 'pc-bad'">{{ l }}</div>
          </div>
        </div>
      </template>

      <div v-if="reqWarn" class="pc-pad pc-bad">{{ reqWarn }}</div>
      <div class="pc-verdict">
        <span :class="verdict.cls">{{ verdict.text }}</span>
      </div>
      <div v-if="state.unknown.length" class="pc-pad pc-muted pc-small">
        {{ tr("Mods non pris en compte :", "Mods not taken into account:") }}
        {{ state.unknown.join(" · ") }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch, onMounted, onUnmounted } from "vue";
import { Host } from "@/web/background/IPC";
import { tr, isFrench } from "@/web/atziri-lang";
import { pobCompareState as state, closePobCompare } from "./atziri-pob-compare";
import { slotLabel, fmtNum } from "./atziri-pob";

const isFr = computed(() => isFrench());
const slotIndex = shallowRef(0);
watch(state, () => {
  slotIndex.value = 0;
});
const slot = computed(() => state.value?.data?.slots[slotIndex.value]);
// same line on both items: shown grey; only on one: green / red
const newSet = computed(() => new Set(state.value?.data?.lines ?? []));
const currentSet = computed(() => new Set(slot.value?.currentLines ?? []));

const DEF = [
  { key: "Life", fr: "Vie", en: "Life", unit: "" },
  { key: "EnergyShield", fr: "Bouclier d'énergie", en: "Energy shield", unit: "" },
  { key: "TotalEHP", fr: "PV effectifs", en: "Effective HP", unit: "" },
  { key: "Armour", fr: "Armure", en: "Armour", unit: "" },
  { key: "Evasion", fr: "Évasion", en: "Evasion", unit: "" },
  { key: "FireResist", fr: "Résistance feu", en: "Fire resistance", unit: " %" },
  { key: "ColdResist", fr: "Résistance froid", en: "Cold resistance", unit: " %" },
  { key: "LightningResist", fr: "Résistance foudre", en: "Lightning resistance", unit: " %" },
  { key: "ChaosResist", fr: "Résistance chaos", en: "Chaos resistance", unit: " %" },
  { key: "BlockChance", fr: "Blocage", en: "Block", unit: " %" },
  { key: "Mana", fr: "Mana", en: "Mana", unit: "" },
  { key: "Spirit", fr: "Esprit", en: "Spirit", unit: "" },
  { key: "MovementSpeedMod", fr: "Vitesse de déplacement", en: "Movement speed", unit: "" },
  { key: "DeflectionRating", fr: "Déviation", en: "Deflection rating", unit: "" },
  { key: "SpellBlockChance", fr: "Blocage des sorts", en: "Spell block", unit: " %" },
  { key: "PhysicalMaximumHitTaken", fr: "Coup max physique", en: "Max physical hit", unit: "" },
  { key: "ChaosMaximumHitTaken", fr: "Coup max chaos", en: "Max chaos hit", unit: "" },
  { key: "LifeRegenRecovery", fr: "Régén. de vie /s", en: "Life regen /s", unit: "" },
  { key: "LifeLeechGainRate", fr: "Vol de vie /s", en: "Life leech /s", unit: "" },
  { key: "ManaRegenRecovery", fr: "Régén. de mana /s", en: "Mana regen /s", unit: "" },
  { key: "Str", fr: "Force", en: "Strength", unit: "" },
  { key: "Dex", fr: "Dextérité", en: "Dexterity", unit: "" },
  { key: "Int", fr: "Intelligence", en: "Intelligence", unit: "" },
];

// attack / spell numbers of the first skill listed
const OFF = [
  { key: "AverageHit", fr: "Coup moyen", en: "Average hit", unit: "" },
  { key: "AverageDamage", fr: "Dégâts moyens", en: "Average damage", unit: "" },
  { key: "CritChance", fr: "Chances de critique", en: "Crit chance", unit: " %" },
  { key: "CritMultiplier", fr: "Multiplicateur crit.", en: "Crit multiplier", unit: "" },
  { key: "Speed", fr: "Vitesse (attaques/s)", en: "Speed (per second)", unit: "" },
  { key: "HitChance", fr: "Précision", en: "Hit chance", unit: " %" },
  { key: "BleedDPS", fr: "Saignement (DPS)", en: "Bleed DPS", unit: "" },
  { key: "IgniteDPS", fr: "Embrasement (DPS)", en: "Ignite DPS", unit: "" },
  { key: "PoisonDPS", fr: "Poison (DPS)", en: "Poison DPS", unit: "" },
];

const offence = computed(() => {
  const sk = state.value?.data?.skills[0];
  const before = sk?.statsBefore;
  const after = sk?.statsAfter?.[slotIndex.value];
  if (!sk || !before || !after) return { label: "", rows: [] };
  const rows = OFF.filter((o) => {
    const b = before[o.key];
    const a = after[o.key];
    return (b != null || a != null) && Math.abs((a ?? 0) - (b ?? 0)) > 0.0005;
  }).map((o) => ({ ...o, before: before[o.key] ?? 0, after: after[o.key] ?? 0 }));
  return { label: sk.label, rows };
});

function diff(key: string) {
  const s = slot.value;
  if (!s) return 0;
  return (s.after[key] ?? 0) - (s.before[key] ?? 0);
}
// always show life / EHP, the others only when they change
function shown(key: string) {
  if (!slot.value) return false;
  if (key === "Life" || key === "TotalEHP") return true;
  return Math.abs(diff(key)) > 0.001;
}

const damageRows = computed(() => {
  const d = state.value?.data;
  if (!d) return [];
  return d.skills
    .filter((s) => s.before > 1 || (s.after[slotIndex.value] ?? 0) > 1)
    .slice(0, 4)
    .map((s) => ({ label: s.label, before: s.before, after: s.after[slotIndex.value] ?? 0 }));
});

function cls(v: number) {
  if (Math.abs(v) < 0.001) return "pc-muted";
  return v > 0 ? "pc-ok" : "pc-bad";
}
function signed(v: number) {
  if (Math.abs(v) < 0.001) return "=";
  return (v > 0 ? "+" : "") + fmtNum(v, isFr.value);
}
function pct(before: number, after: number) {
  if (Math.abs(after - before) < 0.001) return "=";
  if (!before) return "+" + fmtNum(after, isFr.value);
  const p = ((after - before) / before) * 100;
  return (p > 0 ? "+" : "") + fmtNum(p, isFr.value) + " %";
}

const reqWarn = computed(() => {
  const s = slot.value;
  if (!s) return "";
  const missing: string[] = [];
  for (const [req, have, fr, en] of [
    ["ReqStr", "Str", "Force", "Strength"],
    ["ReqDex", "Dex", "Dextérité", "Dexterity"],
    ["ReqInt", "Int", "Intelligence", "Intelligence"],
  ] as const) {
    if ((s.after[req] ?? 0) > (s.after[have] ?? 0)) missing.push(tr(fr, en));
  }
  return missing.length
    ? tr(`Exigences non remplies : ${missing.join(", ")}`, `Requirements not met: ${missing.join(", ")}`)
    : "";
});

const verdict = computed(() => {
  const main = damageRows.value[0];
  const dps = main && main.before ? (main.after - main.before) / main.before : 0;
  const ehp = slot.value && slot.value.before.TotalEHP
    ? diff("TotalEHP") / slot.value.before.TotalEHP
    : 0;
  if (dps > 0.005 && ehp >= -0.005)
    return { cls: "pc-ok", text: tr(`Meilleur pour ton build (DPS ${pct(main.before, main.after)})`, `Better for your build (DPS ${pct(main.before, main.after)})`) };
  if (dps < -0.005 && ehp <= 0.005)
    return { cls: "pc-bad", text: tr("Moins bon que ton équipement actuel", "Worse than your current gear") };
  if (Math.abs(dps) <= 0.005 && ehp > 0.005)
    return { cls: "pc-ok", text: tr("Plus résistant, DPS identique", "Tankier, same DPS") };
  if (Math.abs(dps) <= 0.005 && ehp < -0.005)
    return { cls: "pc-bad", text: tr("Moins résistant, DPS identique", "Less tanky, same DPS") };
  if (Math.abs(dps) <= 0.005 && Math.abs(ehp) <= 0.005)
    return { cls: "pc-muted", text: tr("Pas de différence notable", "No notable difference") };
  return { cls: "pc-acc", text: tr("Compromis : regarde les lignes ci-dessus", "Trade-off: check the lines above") };
});

const errorText = computed(() => {
  const e = state.value?.error ?? "";
  if (e === "item") return tr("Objet non reconnu.", "Item not recognised.");
  if (e.includes("no build")) return tr("Aucun build Path of Building choisi.", "No Path of Building build chosen.");
  if (e.includes("not found")) return tr("Path of Building (PoE2) introuvable sur ce PC.", "Path of Building (PoE2) not found on this PC.");
  if (e.includes("unknown base")) return tr("Base d'objet inconnue de Path of Building.", "Item base unknown to Path of Building.");
  if (e.includes("no slot")) return tr("Cet objet ne va dans aucun emplacement de ton build.", "This item fits no slot of your build.");
  return tr("Erreur : ", "Error: ") + e;
});

function close() {
  closePobCompare();
  Host.sendEvent({ name: "OVERLAY->MAIN::focus-game", payload: undefined });
}
function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && state.value) close();
}
onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
</script>

<style lang="postcss">
.pc-panel {
  position: absolute;
  top: 8vh;
  right: calc(var(--game-panel, 0px) + 1.5rem);
  z-index: 60;
  width: 34rem;
  max-height: 84vh;
  overflow: auto;
  border: 1px solid theme("colors.blue.400");
  border-radius: 8px;
  background: rgb(var(--c-gray-900) / 0.97);
  color: theme("colors.gray.200");
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  font-size: 0.85rem;
  font-family: "IBM Plex Sans", system-ui, "Segoe UI", sans-serif;
  font-variant: normal;
}
.pc-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid theme("colors.gray.700");
}
.pc-title {
  flex: 1;
  font-weight: 600;
  color: theme("colors.blue.400");
}
.pc-x {
  color: theme("colors.gray.400");
}
.pc-pad {
  padding: 6px 10px;
}
.pc-mt {
  margin-top: 4px;
}
.pc-small {
  font-size: 0.75rem;
}
.pc-muted {
  color: theme("colors.gray.400");
}
.pc-ok {
  color: #9cc46f;
}
.pc-bad {
  color: #d9584a;
}
.pc-acc {
  color: theme("colors.blue.400");
}
.pc-replace b {
  color: theme("colors.gray.200");
}
.pc-slots {
  display: flex;
  gap: 4px;
  padding: 6px 10px 0;
}
.pc-slots button {
  border: 1px solid theme("colors.gray.700");
  border-radius: 4px;
  padding: 2px 8px;
  color: theme("colors.gray.400");
}
.pc-slots button.on {
  border-color: theme("colors.blue.400");
  color: theme("colors.blue.400");
}
.pc-grp {
  margin: 6px 10px 2px;
  padding: 3px 6px;
  border-radius: 4px;
  background: rgb(var(--c-blue-900) / 0.6);
  color: theme("colors.blue.400");
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}
.pc-row {
  display: grid;
  grid-template-columns: 1fr 5.5rem 1rem 5.5rem 4.5rem;
  gap: 4px;
  align-items: center;
  padding: 3px 16px;
  border-bottom: 1px solid theme("colors.gray.800");
}
.pc-num {
  font-family: "IBM Plex Mono", ui-monospace, Consolas, monospace;
  text-align: right;
}
.pc-mods {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 4px 16px 6px;
  font-size: 0.78rem;
  line-height: 1.45;
}
.pc-cap {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: theme("colors.gray.400");
  margin-bottom: 2px;
}
.pc-verdict {
  padding: 8px 10px;
  text-align: center;
  font-weight: 600;
}
</style>
