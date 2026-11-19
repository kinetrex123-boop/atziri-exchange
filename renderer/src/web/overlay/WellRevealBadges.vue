<template>
  <!-- Atziri Exchange: Well of Souls, tier badges next to the 3 choices -->
  <div v-if="scan" class="rb-layer">
    <div v-if="scan.status === 'scanning'" class="rb-status">
      <i class="fas fa-circle-notch fa-spin"></i>
      {{ tr("Lecture des choix…", "Reading the choices…") }}
    </div>
    <div v-else-if="scan.status === 'error'" class="rb-status rb-status--err">
      {{ tr("Lecture de l'écran impossible", "Could not read the screen") }}
      <span v-if="scan.error" class="rb-sub">({{ scan.error }})</span>
    </div>
    <div v-else-if="!scan.badges.length" class="rb-status">
      {{ tr("Aucun mod reconnu à l'écran.", "No modifier recognised on screen.") }}
    </div>
    <div
      v-for="(b, i) in scan.badges"
      :key="i"
      class="rb-badge wr-badge"
      :class="[
        b.tier === 1 ? 'rb-badge--best' : '',
        b.lord ? `wr-lord-${b.lord.toLowerCase()}` : '',
      ]"
      :style="{ left: `${b.x + 12}px`, top: `${b.y + b.h / 2}px` }"
      :title="b.name"
    >
      <i v-if="b.tier === 1" class="fas fa-crown rb-crown"></i>
      <span class="rb-total">T{{ b.tier }}</span>
      <span class="rb-sub">/ {{ b.count }}{{ b.approx ? " ~" : "" }}</span>
      <span class="rb-sub">· {{ tr("niv.", "lvl") }} {{ b.level }}</span>
      <span v-if="b.lord" class="wr-lord">{{ b.lord }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { tr } from "@/web/atziri-lang";
import { wellReveal as scan } from "./atziri-well-reveal";
</script>

<style lang="postcss">
.wr-badge {
  gap: 6px;
}
.wr-lord {
  font-size: 12px;
  padding-left: 4px;
  border-left: 1px solid rgba(240, 220, 180, 0.25);
}
.wr-lord-amanamu .wr-lord {
  color: #f07a5c;
}
.wr-lord-ulaman .wr-lord {
  color: #6fbbeb;
}
.wr-lord-kurgal .wr-lord {
  color: #b48ae8;
}
</style>
