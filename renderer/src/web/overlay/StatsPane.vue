<template>
  <!-- Atziri Exchange: the player's Path of Building build at a glance -->
  <div class="ar-body st">
    <div class="st-wrap">
      <div class="st-switch"><HubViewSwitch group="ninja" /></div>
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
        <!-- one small refresh button: asks poe.ninja to fetch the character again
             (when following poe.ninja), then computes the build again -->
        <button
          type="button"
          class="st-icon-btn"
          :disabled="refreshing"
          :title="status?.selected === 'ninja' ? tr('Actualiser mon perso sur poe.ninja', 'Refresh my character on poe.ninja') : tr('Recalculer', 'Recompute')"
          @click="refreshAll"
        >
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': refreshing || loading }"></i>
        </button>
        <span v-if="build" class="st-muted">
          {{ build.className }}<template v-if="build.ascendancy"> · {{ build.ascendancy }}</template>
          · {{ tr("niv.", "lvl") }} {{ build.level }}
        </span>
        <span v-if="loading" class="st-muted"><i class="fas fa-spinner fa-spin"></i> {{ tr("Calcul…", "Computing…") }}</span>
        <span class="st-sp"></span>
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
      <!-- ask poe.ninja to fetch the character again (its "Refresh character") -->
      <div v-if="status?.selected === 'ninja' && status.ninja" class="st-ninja st-small">
        <span v-if="refreshing" class="st-muted">{{ tr("poe.ninja relit ton perso…", "poe.ninja is fetching your character…") }}</span>
        <label class="st-muted st-check">
          <input type="checkbox" :checked="status.ninjaAuto" @change="setAuto(($event.target as HTMLInputElement).checked)" />
          {{ tr("Automatiquement toutes les 15 min", "Automatically every 15 min") }}
        </label>
        <span v-if="refreshMsg" :class="refreshOk ? 'st-ok' : 'st-err'">{{ refreshMsg }}</span>
        <button v-if="needLogin" type="button" class="st-btn" @click="openNinjaLogin">
          {{ tr("Ouvrir poe.ninja pour me connecter", "Open poe.ninja to log in") }}
        </button>
      </div>
      <div v-if="error && ready" class="st-err">{{ error }}</div>

      <template v-if="build">
        <!-- layout A: stats column on the left (poe.ninja order), skills on the right -->
        <div class="st-grid">
          <div class="st-left">
            <div class="st-box">
              <h3>{{ tr("Attributs", "Attributes") }}</h3>
              <div class="st-attrs">
                <div class="a-str">{{ fmtNum(s.Str, isFr) }} {{ tr("For", "Str") }}</div>
                <div class="a-dex">{{ fmtNum(s.Dex, isFr) }} Dex</div>
                <div class="a-int">{{ fmtNum(s.Int, isFr) }} Int</div>
              </div>
              <div class="st-kv st-mt"><span>{{ tr("Vitesse de déplacement", "Movement speed") }}</span><span>{{ pctMod(s.MovementSpeedMod) }}</span></div>
              <div class="st-kv"><span>{{ tr("Rareté des objets", "Item rarity") }}</span><span>{{ pctMod(s.EffectiveLootRarityMod) }}</span></div>
            </div>
            <div class="st-box">
              <h3>{{ tr("Défense", "Defensive") }}</h3>
              <div class="st-kv"><span>{{ tr("Vie", "Life") }}</span><span>{{ fmtNum(s.Life, isFr) }}</span></div>
              <div class="st-kv"><span>{{ tr("Bouclier d'énergie", "Energy shield") }}</span><span>{{ fmtNum(s.EnergyShield, isFr) }}</span></div>
              <div class="st-kv"><span>Mana</span><span>{{ fmtNum(s.Mana, isFr) }}</span></div>
              <div class="st-kv"><span>{{ tr("Esprit", "Spirit") }}</span><span>{{ fmtNum(s.Spirit, isFr) }}</span></div>
              <div class="st-kv"><span>{{ tr("Armure", "Armour") }}</span><span>{{ fmtNum(s.Armour, isFr) }}</span></div>
              <div class="st-kv"><span>{{ tr("Évasion", "Evasion rating") }}</span><span>{{ fmtNum(s.Evasion, isFr) }}</span></div>
              <div class="st-kv"><span>{{ tr("Déviation", "Deflection rating") }}</span><span>{{ fmtNum(s.DeflectionRating, isFr) }}</span></div>
            </div>
            <div class="st-box">
              <h3>{{ tr("Résistances", "Resistances") }}</h3>
              <div class="st-res">
                <div class="r-fire">{{ fmtNum(s.FireResist, isFr) }} %</div>
                <div class="r-cold">{{ fmtNum(s.ColdResist, isFr) }} %</div>
                <div class="r-light">{{ fmtNum(s.LightningResist, isFr) }} %</div>
                <div class="r-chaos">{{ fmtNum(s.ChaosResist, isFr) }} %</div>
              </div>
            </div>
            <div class="st-box">
              <h3>{{ tr("Réserve de PV effectifs", "Effective Health Pool") }}</h3>
              <div class="st-kv"><span>{{ tr("PV effectifs", "Effective HP") }}</span><span>{{ short(s.TotalEHP) }}</span></div>
              <div class="st-cap st-mt">{{ tr("Coup max encaissé", "Max hit") }}</div>
              <div class="st-maxhit">
                <div class="r-phys" :title="tr('Physique', 'Physical')">{{ short(s.PhysicalMaximumHitTaken) }}</div>
                <div class="r-fire" :title="tr('Feu', 'Fire')">{{ short(s.FireMaximumHitTaken) }}</div>
                <div class="r-cold" :title="tr('Froid', 'Cold')">{{ short(s.ColdMaximumHitTaken) }}</div>
                <div class="r-light" :title="tr('Foudre', 'Lightning')">{{ short(s.LightningMaximumHitTaken) }}</div>
                <div class="r-chaos" title="Chaos">{{ short(s.ChaosMaximumHitTaken) }}</div>
              </div>
            </div>
            <div class="st-box">
              <h3>{{ tr("Récupération", "Recovery") }}</h3>
              <div class="st-kv"><span>{{ tr("Régén. de vie", "Life regen") }}</span><span>{{ fmtNum(s.LifeRegenRecovery, isFr) }} /s</span></div>
              <div v-if="s.LifeLeechGainRate" class="st-kv"><span>{{ tr("Vol de vie", "Life leech") }}</span><span>{{ fmtNum(s.LifeLeechGainRate, isFr) }} /s</span></div>
              <div v-if="s.EnergyShieldRegenRecovery" class="st-kv"><span>{{ tr("Régén. de bouclier", "ES regen") }}</span><span>{{ fmtNum(s.EnergyShieldRegenRecovery, isFr) }} /s</span></div>
              <div class="st-kv"><span>{{ tr("Régén. de mana", "Mana regen") }}</span><span>{{ fmtNum(s.ManaRegenRecovery, isFr) }} /s</span></div>
            </div>
          </div>

          <div class="st-right">
            <div class="st-cap">{{ tr("Compétences principales", "Main skills") }}</div>
            <div v-for="(sk, i) in build.skills" :key="sk.label + i" class="st-skill">
              <button type="button" class="st-sk-head" @click="toggleSkill(sk.label)">
                <span class="st-chev">{{ openSkills.has(sk.label) ? "▾" : "▸" }}</span>
                <span class="st-gemdot g-skill"></span>
                <span class="st-sk-name" :class="{ 'st-acc': sk.label === build.mainSkill }">{{ sk.label }}</span>
                <span class="st-sk-dps">{{ fmtNum(sk.dps, isFr) }} DPS</span>
              </button>
              <div v-if="openSkills.has(sk.label)" class="st-sk-body">
                <div>
                  <div v-for="g in sk.gems ?? []" :key="g.name" class="st-gem">
                    <span class="st-gemdot" :class="g.support ? 'g-support' : 'g-skill'"></span>
                    {{ g.name }}
                    <span v-if="!g.support && g.level" class="st-muted">{{ tr("niv.", "lvl") }} {{ g.level }}<template v-if="g.quality"> · {{ g.quality }} %</template></span>
                  </div>
                </div>
                <div>
                  <div class="st-kv"><span>DPS</span><span class="st-acc">{{ fmtNum(sk.dps, isFr) }}</span></div>
                  <div v-if="sk.average" class="st-kv"><span>{{ tr("Coup moyen", "Average hit") }}</span><span>{{ fmtNum(sk.average, isFr) }}</span></div>
                  <div v-if="sk.crit != null" class="st-kv"><span>{{ tr("Critique", "Crit chance") }}</span><span>{{ fmtNum(sk.crit, isFr) }} %</span></div>
                  <div v-if="sk.critMulti" class="st-kv"><span>{{ tr("Multiplicateur crit.", "Crit multiplier") }}</span><span>×{{ fmtNum(sk.critMulti, isFr) }}</span></div>
                  <div v-if="sk.speed" class="st-kv"><span>{{ tr("Vitesse", "Speed") }}</span><span>{{ fmtNum(sk.speed, isFr) }} /s</span></div>
                  <div v-if="sk.hit != null" class="st-kv"><span>{{ tr("Précision", "Hit chance") }}</span><span>{{ fmtNum(sk.hit, isFr) }} %</span></div>
                </div>
              </div>
            </div>

            <div class="st-box st-mt">
              <h3>{{ tr("Équipement", "Gear") }}</h3>
              <div class="st-gear">
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
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch, onMounted } from "vue";
import { tr, isFrench } from "@/web/atziri-lang";
import { hubTab, openInHub } from "./atziri-hub";
import HubViewSwitch from "./HubViewSwitch.vue";
import {
  pobStatus,
  pobSelect,
  pobStats,
  pobOpen,
  pobSelectNinja,
  pobNinjaRefresh,
  pobNinjaAuto,
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
const s = computed<Record<string, number | undefined>>(() => build.value?.stats ?? {});

// "1.785" (multiplier) -> "+78,5 %"
function pctMod(m: number | undefined) {
  if (m == null) return "—";
  const v = (m - 1) * 100;
  return (v >= 0 ? "+" : "") + fmtNum(v, isFr.value) + " %";
}
// 20146 -> "20,1k"
function short(n: number | undefined) {
  if (n == null) return "—";
  if (Math.abs(n) >= 1000) {
    return (n / 1000).toLocaleString(isFr.value ? "fr-FR" : "en-GB", { maximumFractionDigits: 1 }) + "k";
  }
  return fmtNum(n, isFr.value);
}

// skills unfolded (the main one at first)
const openSkills = shallowRef(new Set<string>());
watch(build, (b) => {
  if (b?.mainSkill && openSkills.value.size === 0) openSkills.value = new Set([b.mainSkill]);
});
function toggleSkill(label: string) {
  const next = new Set(openSkills.value);
  if (next.has(label)) next.delete(label);
  else next.add(label);
  openSkills.value = next;
}
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

// --- poe.ninja "Refresh character" ---
const refreshing = shallowRef(false);
const refreshMsg = shallowRef("");
const refreshOk = shallowRef(false);
const needLogin = shallowRef(false);
async function ninjaRefresh() {
  refreshing.value = true;
  refreshMsg.value = "";
  needLogin.value = false;
  try {
    const r = await pobNinjaRefresh();
    status.value = r;
    refreshOk.value = r.refresh === "ok";
    needLogin.value = r.refresh === "login";
    refreshMsg.value =
      r.refresh === "ok"
        ? tr("Perso actualisé.", "Character refreshed.")
        : r.refresh === "login"
          ? tr("Connecte-toi d'abord à poe.ninja dans l'onglet poe.ninja (icône profil en haut à droite > Log in), puis réessaie.", "Log in to poe.ninja first in the poe.ninja tab (profile icon top right > Log in), then try again.")
          : r.refresh === "cooldown"
            ? tr("poe.ninja limite les actualisations : réessaie dans quelques minutes.", "poe.ninja limits refreshes: try again in a few minutes.")
            : tr("poe.ninja n'a pas pu actualiser le perso.", "poe.ninja could not refresh the character.");
  } catch (e) {
    refreshOk.value = false;
    refreshMsg.value = (e as Error).message;
  } finally {
    refreshing.value = false;
  }
  if (refreshOk.value) await refresh();
}
/** the small ↻ button: poe.ninja refresh when following poe.ninja, else recompute */
async function refreshAll() {
  if (status.value?.selected === "ninja" && status.value.ninja) await ninjaRefresh();
  else await refresh();
}
async function setAuto(on: boolean) {
  try {
    status.value = await pobNinjaAuto(on);
  } catch {
    // ignore
  }
}
function openNinjaLogin() {
  openInHub("https://poe.ninja/poe2/builds", "ninja");
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
.st-switch {
  display: flex;
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
.st-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: transparent;
  color: var(--muted);
  font-size: 0.75rem;
}
.st-icon-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.st-icon-btn:disabled {
  opacity: 0.6;
}
.st-small {
  font-size: 0.8rem;
}
.st-muted {
  color: var(--muted);
  font-size: 0.85rem;
}
.st-ok {
  color: #9cc46f;
  font-size: 0.85rem;
}
.st-check {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
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
.st-grid {
  display: grid;
  grid-template-columns: 20rem 1fr;
  gap: 12px;
  align-items: start;
}
.st-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.st-right {
  min-width: 0;
}
.st-attrs,
.st-maxhit {
  display: grid;
  gap: 5px;
  text-align: center;
  font-family: "IBM Plex Mono", ui-monospace, Consolas, monospace;
  font-size: 0.85rem;
}
.st-attrs {
  grid-template-columns: repeat(3, 1fr);
}
.st-maxhit {
  grid-template-columns: repeat(5, 1fr);
}
.st-attrs div,
.st-maxhit div {
  border-radius: 5px;
  padding: 3px;
}
.a-str {
  background: #4a1c14;
}
.a-dex {
  background: #173f1f;
}
.a-int {
  background: #16305a;
}
.r-phys {
  background: #3a3a3a;
}
.st-skill {
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  margin-top: 6px;
}
.st-sk-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  text-align: left;
  color: var(--fg);
}
.st-sk-head:hover .st-sk-name {
  color: var(--accent);
}
.st-chev {
  color: var(--muted);
  width: 0.8rem;
}
.st-sk-name {
  flex: 1;
  font-weight: 600;
}
.st-sk-dps {
  font-family: "IBM Plex Mono", ui-monospace, Consolas, monospace;
  color: var(--accent);
}
.st-sk-body {
  border-top: 1px solid var(--line);
  padding: 8px 10px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  font-size: 0.85rem;
}
.st-gem {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 1px 0;
}
.st-gemdot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: none;
}
.g-skill {
  background: #56c9a6;
}
.g-support {
  background: #8fa2ff;
}
.st-gear {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 18px;
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
