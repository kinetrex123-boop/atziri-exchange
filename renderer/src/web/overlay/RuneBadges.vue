<template>
  <!-- Atziri Exchange: Rune Rewards, price badges next to the rewards on screen -->
  <div v-if="scan" class="rb-layer">
    <div v-if="scan.status === 'scanning'" class="rb-status">
      <i class="fas fa-circle-notch fa-spin"></i>
      {{ tr("Lecture des récompenses…", "Reading the rewards…") }}
    </div>
    <div v-else-if="scan.status === 'error'" class="rb-status rb-status--err">
      {{ tr("Lecture de l'écran impossible", "Could not read the screen") }}
      <span v-if="scan.error" class="rb-sub">({{ scan.error }})</span>
    </div>
    <div v-else-if="!scan.badges.length" class="rb-status">
      {{
        tr(
          "Aucune récompense avec un prix trouvée à l'écran.",
          "No priced reward found on screen.",
        )
      }}
    </div>
    <div
      v-for="(b, i) in scan.badges"
      :key="i"
      class="rb-badge"
      :class="{ 'rb-badge--best': b.best }"
      :style="{ left: `${b.x + 10}px`, top: `${b.y + b.h / 2}px` }"
    >
      <i v-if="b.best" class="fas fa-crown rb-crown"></i>
      <span class="rb-total">{{ money(b.total).text }}</span>
      <img :src="money(b.total).icon" class="rb-cur" />
      <span v-if="b.qty > 1" class="rb-sub">({{ money(b.each).text }} / u)</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { tr } from "@/web/atziri-lang";
import { formatDivines } from "./atziri-money";
import { runeScan as scan } from "./atziri-runes";

function money(div: number) {
  const f = formatDivines(div);
  if (f.divText) return { text: f.divText, icon: "/images/divine.png" };
  return { text: f.chaosText, icon: f.chaosIcon };
}
</script>

<style lang="postcss">
.rb-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 990;
}
.rb-status {
  position: absolute;
  top: 12%;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid #a8743f;
  background: rgba(14, 10, 7, 0.92);
  color: #f0dcb4;
  font-size: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
}
.rb-status--err {
  border-color: #b5452f;
}
.rb-badge {
  position: absolute;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px;
  border-radius: 7px;
  border: 1px solid #6b5233;
  background: rgba(14, 10, 7, 0.9);
  color: #f0dcb4;
  font-size: 15px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
}
.rb-badge--best {
  border-color: #e7b86a;
  color: #ffe7b3;
  box-shadow:
    0 0 0 1px rgba(231, 184, 106, 0.45),
    0 0 14px rgba(231, 184, 106, 0.45);
}
.rb-crown {
  color: #e7b86a;
  font-size: 12px;
}
.rb-total {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.rb-cur {
  width: 20px;
  height: 20px;
  object-fit: contain;
}
.rb-sub {
  font-size: 12px;
  opacity: 0.75;
}
</style>
