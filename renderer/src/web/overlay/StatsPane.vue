<template>
  <!-- Atziri Exchange: the player's Path of Building build at a glance -->
  <div class="ar-body st">
    <div class="st-wrap">
      <!-- prerequisites -->
      <div v-if="!ready" class="st-box">
        <h3>{{ tr("Pour activer l'onglet Stats et Ctrl + B", "To enable the Stats tab and Ctrl + B") }}</h3>
        <ol class="st-steps">
          <li :class="{ done: status?.pobFound }">
            <i :class="status?.pobFound ? 'fas fa-check-circle' : 'far fa-circle'"></i>
            <span v-if="isFr"><b>Path of Building (PoE2)</b> installé sur ce PC.
              <a href="https://pathofbuilding.community/" target="_blank" rel="noreferrer">Le télécharger</a></span>
            <span v-else><b>Path of Building (PoE2)</b> installed on this PC.
              <a href="https://pathofbuilding.community/" target="_blank" rel="noreferrer">Download it</a></span>
          </li>
          <li :class="{ done: Boolean(status?.current) }">
            <i :class="status?.current ? 'fas fa-check-circle' : 'far fa-circle'"></i>
            <span v-if="isFr">Un build à suivre : <b>ton personnage sur poe.ninja</b> (conseillé, mis à jour tout seul, profil PoE public) ou un <b>build sauvegardé</b> dans PoB.</span>
            <span v-else>A build to follow: <b>your character on poe.ninja</b> (recommended, updates by itself, public PoE profile) or a <b>saved build</b> in PoB.</span>
          </li>
          <li :class="{ done: Boolean(status?.current) }">
            <i :class="status?.current ? 'fas fa-check-circle' : 'far fa-circle'"></i>
            <span>{{ tr("Choisir le build à suivre (ci-dessous).", "Choose the build to follow (below).") }}</span>
          </li>
        </ol>
        <p class="st-muted">
          {{ tr(
            "poe.ninja : ouvre ton personnage sur poe.ninja/poe2 (Profil), copie le lien de la page et colle-le ci-dessous. L'overlay le relit toutes les 5 minutes. Build PoB : dans PoB, Importer puis Sauvegarder ; l'overlay le relit à chaque sauvegarde.",
            "poe.ninja: open your character on poe.ninja/poe2 (Profile), copy the page link and paste it below. The overlay reads it again every 5 minutes. PoB build: in PoB, Import then Save; the overlay reloads it on each save.",
          ) }}
        </p>
        <div v-if="status?.lastError" class="st-err">{{ tr("Erreur :", "Error:") }} {{ status.lastError }}</div>
      </div>

      <!-- build choice -->
      <div class="st-head">
        <select class="ar-search st-select" :value="status?.selected ?? 'latest'" @change="choose(($event.target as HTMLSelectElement).value)">
          <option value="ninja">
            {{ status?.ninja ? `poe.ninja · ${status.ninja.character}` : tr("Mon personnage sur poe.ninja (auto)", "My character on poe.ninja (auto)") }}
          </option>
          <option value="latest">{{ tr("Le dernier build PoB sauvegardé", "Latest saved PoB build") }}</option>
          <option v-for="b in status?.builds ?? []" :key="b.file" :value="b.file">PoB · {{ b.name }}</option>
        </select>
        <span v-if="build" class="st-muted">
          {{ build.className }}<template v-if="build.ascendancy"> · {{ build.ascendancy }}</template>
          · {{ tr("niv.", "lvl") }} {{ build.level }}
        </span>
        <span v-if="loading" class="st-muted"><i class="fas fa-spinner fa-spin"></i> {{ tr("Calcul…", "Computing…") }}</span>
        <span class="st-sp"></span>
        <button type="button" class="st-btn" @click="refresh()"><i class="fas fa-redo"></i> {{ tr("Actualiser", "Refresh") }}</button>
        <button v-if="status?.pobFound" type="button" class="st-btn" @click="pobOpen()">{{ tr("Ouvrir PoB", "Open PoB") }}</button>
      </div>
      <!-- poe.ninja character -->
      <div v-if="ninjaMode" class="st-ninja">
        <input
          v-model.trim="ninjaUrl"
          class="ar-search st-url"
          :placeholder="tr('Lien de ton personnage : https://poe.ninja/poe2/profile/…/character/…', 'Your character link: https://poe.ninja/poe2/profile/…/character/…')"
          @keydown.enter="useNinja"
        />
        <button type="button" class="st-btn" @click="useNinja">{{ tr("Suivre", "Follow") }}</button>
        <span v-if="status?.ninja && status.ninjaUpdatedUtc" class="st-muted">
          {{ tr("Mis à jour par poe.ninja :", "Updated by poe.ninja:") }} {{ when(status.ninjaUpdatedUtc) }}
          · {{ tr("vérifié toutes les 5 min", "checked every 5 min") }}
        </span>
        <span v-if="status?.ninjaError" class="st-err">{{ status.ninjaError }}</span>
      </div>
      <div v-if="error && ready" class="st-err">{{ error }}</div>

      <template v-if="build">
        <div class="st-kpis">
          <div class="st-kpi st-main">
            <span class="st-cap">DPS · {{ build.mainSkill ?? "—" }}</span>
            <b>{{ fmtNum(build.mainDps, isFr) }}</b>
          </div>
          <div class="st-kpi"><span class="st-cap">{{ tr("Vie", "Life") }}</span><b>{{ fmtNum(s.Life, isFr) }}</b></div>
          <div class="st-kpi"><span class="st-cap">{{ tr("Bouclier d'énergie", "Energy shield") }}</span><b>{{ fmtNum(s.EnergyShield, isFr) }}</b></div>
          <div class="st-kpi"><span class="st-cap">{{ tr("PV effectifs", "Effective HP") }}</span><b>{{ fmtNum(s.TotalEHP, isFr) }}</b></div>
        </div>

        <div class="st-cols">
          <div class="st-box">
            <h3>{{ tr("Défenses", "Defences") }}</h3>
            <div class="st-kv"><span>{{ tr("Armure", "Armour") }}</span><span>{{ fmtNum(s.Armour, isFr) }}</span></div>
            <div class="st-kv"><span>{{ tr("Évasion", "Evasion") }}</span><span>{{ fmtNum(s.Evasion, isFr) }}</span></div>
            <div class="st-kv"><span>{{ tr("Blocage", "Block") }}</span><span>{{ fmtNum(s.BlockChance, isFr) }} %</span></div>
            <div class="st-kv"><span>{{ tr("Mana / Esprit", "Mana / Spirit") }}</span><span>{{ fmtNum(s.Mana, isFr) }} / {{ fmtNum(s.Spirit, isFr) }}</span></div>
            <div class="st-kv"><span>{{ tr("Vitesse de déplacement", "Movement speed") }}</span><span>{{ s.MovementSpeedMod ? fmtNum((s.MovementSpeedMod - 1) * 100, isFr) + " %" : "—" }}</span></div>
            <div class="st-cap st-mt">{{ tr("Résistances", "Resistances") }}</div>
            <div class="st-res">
              <div class="r-fire">{{ fmtNum(s.FireResist, isFr) }} %</div>
              <div class="r-cold">{{ fmtNum(s.ColdResist, isFr) }} %</div>
              <div class="r-light">{{ fmtNum(s.LightningResist, isFr) }} %</div>
              <div class="r-chaos">{{ fmtNum(s.ChaosResist, isFr) }} %</div>
            </div>
          </div>
          <div class="st-box">
            <h3>{{ tr("Compétences", "Skills") }}</h3>
            <div v-for="(sk, i) in build.skills" :key="sk.label + i" class="st-kv">
              <span :class="{ 'st-acc': sk.label === build.mainSkill }">{{ sk.label }}</span>
              <span>{{ fmtNum(sk.dps, isFr) }}</span>
            </div>
            <div class="st-cap st-mt">{{ tr("Attributs", "Attributes") }}</div>
            <div class="st-kv"><span>{{ tr("For / Dex / Int", "Str / Dex / Int") }}</span><span>{{ fmtNum(s.Str, isFr) }} / {{ fmtNum(s.Dex, isFr) }} / {{ fmtNum(s.Int, isFr) }}</span></div>
          </div>
          <div class="st-box">
            <h3>{{ tr("Équipement", "Gear") }}</h3>
            <div v-for="e in build.equipment" :key="e.slot" class="st-kv">
              <span class="st-muted">{{ slotLabel(e.slot, isFr) }}</span>
              <span class="st-item" :class="`rar-${e.rarity.toLowerCase()}`">{{ e.name.split(",")[0] }}</span>
            </div>
          </div>
        </div>
        <p class="st-muted st-mt">
          {{ tr(
            "Chiffres calculés par Path of Building pour le build suivi. Ctrl + B sur un objet en jeu le compare à ton équipement.",
            "Numbers computed by Path of Building for the followed build. Ctrl + B on an item in game compares it with your gear.",
          ) }}
        </p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch, onMounted } from "vue";
import { tr, isFrench } from "@/web/atziri-lang";
import { hubTab } from "./atziri-hub";
import {
  pobStatus,
  pobSelect,
  pobStats,
  pobOpen,
  pobSelectNinja,
  slotLabel,
  fmtNum,
  type PobStatus,
  type PobBuild,
} from "./atziri-pob";

const isFr = computed(() => isFrench());
const status = shallowRef<PobStatus | null>(null);
const build = shallowRef<PobBuild | null>(null);
const loading = shallowRef(false);
const error = shallowRef("");
const s = computed(() => build.value?.stats ?? {});
const ready = computed(
  () => Boolean(status.value?.pobFound && status.value.current && status.value.engineFound),
);

async function refresh() {
  try {
    status.value = await pobStatus();
  } catch {
    return; // dev mode: no main-process routes
  }
  if (!ready.value) return;
  loading.value = true;
  error.value = "";
  try {
    build.value = await pobStats();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

async function choose(file: string) {
  if (file === "ninja" && !status.value?.ninja) {
    pickingNinja.value = true; // link to paste first
    return;
  }
  pickingNinja.value = false;
  try {
    status.value = file === "ninja" ? await pobSelectNinja("") : await pobSelect(file);
  } catch {
    // ignore
  }
  await refresh();
}

// --- character followed on poe.ninja ---
const pickingNinja = shallowRef(false);
const ninjaUrl = shallowRef("");
const ninjaMode = computed(() => pickingNinja.value || status.value?.selected === "ninja");
async function useNinja() {
  if (!ninjaUrl.value) return;
  loading.value = true;
  error.value = "";
  try {
    status.value = await pobSelectNinja(ninjaUrl.value);
    pickingNinja.value = false;
  } catch (e) {
    error.value = /bad poe.ninja link/.test((e as Error).message)
      ? tr("Lien non reconnu : colle le lien de la page « Profil » de ton personnage sur poe.ninja.", "Link not recognised: paste the link of your character's \"Profile\" page on poe.ninja.")
      : (e as Error).message;
    loading.value = false;
    return;
  }
  loading.value = false;
  await refresh();
}
function when(iso: string) {
  try {
    return new Date(iso).toLocaleString(isFr.value ? "fr-FR" : "en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

onMounted(() => {
  if (hubTab.value === "stats") refresh().catch(() => undefined);
});
watch(hubTab, (t) => {
  if (t === "stats") refresh().catch(() => undefined);
});
</script>

<style lang="postcss">
.st {
  overflow: auto;
}
.st-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-self: flex-start;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgb(var(--c-gray-900) / 0.88);
}
.st-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.st-sp {
  flex: 1;
}
.st-ninja {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.st-url {
  flex: 1;
  min-width: 20rem;
}
.st-select {
  width: auto !important;
  min-width: 16rem;
}
.st-btn {
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
.st-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.st-muted {
  color: var(--muted);
  font-size: 0.85rem;
}
.st-err {
  color: #d9584a;
  font-size: 0.85rem;
}
.st-cap {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}
.st-mt {
  margin-top: 8px;
}
.st-acc {
  color: var(--accent);
}
.st-kpis {
  display: grid;
  grid-template-columns: 1.4fr repeat(3, 1fr);
  gap: 10px;
}
.st-kpi {
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 8px 10px;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.st-kpi b {
  font: 600 1.3rem "IBM Plex Mono", ui-monospace, Consolas, monospace;
  color: var(--fg);
}
.st-main {
  border-color: var(--accent);
}
.st-main b {
  color: var(--accent);
}
.st-cols {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.st-box {
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface);
  padding: 10px 12px;
}
.st-box h3 {
  margin: 0 0 6px;
  font-size: 0.95rem;
  color: var(--accent);
}
.st-kv {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 0;
  font-size: 0.85rem;
}
.st-kv span:last-child {
  font-family: "IBM Plex Mono", ui-monospace, Consolas, monospace;
  text-align: right;
}
.st-item {
  font-family: inherit !important;
}
.rar-unique {
  color: #c98a3c;
}
.rar-rare {
  color: #e6c96a;
}
.rar-magic {
  color: #8fa2ff;
}
.st-res {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  text-align: center;
  font-family: "IBM Plex Mono", ui-monospace, Consolas, monospace;
  font-size: 0.85rem;
}
.st-res div {
  border-radius: 5px;
  padding: 3px;
}
.r-fire {
  background: #5a1e14;
}
.r-cold {
  background: #173a5a;
}
.r-light {
  background: #5a4a14;
}
.r-chaos {
  background: #3a1a4a;
}
.st-steps {
  margin: 8px 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.st-steps li {
  display: flex;
  gap: 8px;
  align-items: baseline;
  color: var(--fg);
}
.st-steps li i {
  color: var(--muted);
}
.st-steps li.done i {
  color: #9cc46f;
}
.st-steps a {
  color: var(--accent);
  text-decoration: underline;
}
</style>
