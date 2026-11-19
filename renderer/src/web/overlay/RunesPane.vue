<template>
  <!-- Atziri Exchange: Rune Rewards, how it works and the last scan -->
  <div class="ar-body rr">
    <fieldset class="ar-nav rr-nav">
      <legend>Rune Rewards</legend>
      <HubViewSwitch group="abyss" />
      <div class="rr-key">
        <span class="ar-sub">{{ tr("Raccourci", "Hotkey") }}</span>
        <span class="rr-kbd">{{ hotkey || tr("aucun", "none") }}</span>
      </div>
      <div class="ar-sub">
        {{
          tr(
            "Ouvre le panneau des récompenses de runes en jeu, puis appuie sur le raccourci : le prix de chaque récompense s'affiche à côté d'elle jusqu'au prochain clic, la plus chère est couronnée.",
            "Open the rune rewards panel in game, then press the hotkey: the price of each reward shows next to it until your next click, the most valuable one gets a crown.",
          )
        }}
      </div>
      <div class="ar-sub">
        {{
          tr(
            "Lecture par l'OCR de Windows (français et anglais), prix poe.ninja de la ligue choisie. Raccourci modifiable dans Paramètres > Atziri réglage.",
            "Read by the Windows OCR (French and English), poe.ninja prices of the selected league. Hotkey can be changed in Settings > Atziri settings.",
          )
        }}
      </div>
    </fieldset>

    <section class="ar-main">
      <div class="ar-main-head">
        <h2>{{ tr("Dernière lecture", "Last scan") }}</h2>
        <div v-if="last" class="ar-sub">
          {{ when(last.at) }} · {{ last.lines }} {{ tr("lignes lues", "lines read") }}
        </div>
      </div>
      <div v-if="!last" class="ar-empty">
        {{ tr("Aucune lecture pour l'instant.", "No scan yet.") }}
      </div>
      <div v-else class="ar-list">
        <div v-if="!last.badges.length" class="ar-empty">
          {{ tr("Aucune récompense avec un prix n'a été trouvée.", "No priced reward was found.") }}
        </div>
        <div
          v-for="(b, i) in sorted"
          :key="i"
          class="ar-row rr-row"
          :class="{ 'rr-best': b.best }"
        >
          <div class="ar-item">
            <img v-if="b.icon" :src="b.icon" class="ar-icon" />
            <span class="truncate">{{ b.qty > 1 ? `${b.qty} × ` : "" }}{{ b.name }}</span>
            <i v-if="b.best" class="fas fa-crown rr-crown"></i>
          </div>
          <div class="ar-sub truncate" :title="b.line">« {{ b.line }} »</div>
          <div class="rr-price">
            {{ money(b.total) }}
          </div>
        </div>
        <div v-if="last.unpriced.length" class="ar-sub rr-unpriced">
          {{ tr("Reconnu mais sans prix poe.ninja :", "Recognised but no poe.ninja price:") }}
          {{ last.unpriced.join(" · ") }}
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { tr, dateLocale } from "@/web/atziri-lang";
import { AppConfig } from "@/web/Config";
import type { ItemCheckWidget } from "@/web/item-check/widget";
import HubViewSwitch from "./HubViewSwitch.vue";
import { formatDivines } from "./atziri-money";
import { lastRuneScan as last } from "./atziri-runes";

const hotkey = computed(() => (AppConfig("item-check") as ItemCheckWidget | undefined)?.atziriRuneKey ?? "");
const sorted = computed(() => [...(last.value?.badges ?? [])].sort((a, b) => b.total - a.total));

function money(div: number) {
  const f = formatDivines(div);
  return f.divText ? `${f.divText} div` : `${f.chaosText} ${f.chaosIcon.includes("exa") ? "ex" : "c"}`;
}
function when(t: number) {
  return new Date(t).toLocaleString(dateLocale(), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<style lang="postcss">
.rr .rr-nav {
  width: 17rem;
}
.ar-hub .rr-nav .fv-switch {
  align-self: flex-start;
  margin-bottom: 4px;
}
.rr-key {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.rr-kbd {
  font-family: var(--mono);
  padding: 2px 8px;
  border: 1px solid var(--line);
  border-radius: 5px;
  color: var(--accent);
}
.rr-row {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 8rem;
}
.rr-best {
  border-color: var(--accent);
}
.rr-crown {
  color: var(--accent);
  font-size: 12px;
}
.rr-price {
  text-align: right;
  font-family: var(--mono);
}
.rr-unpriced {
  padding: 6px 2px;
}
</style>
