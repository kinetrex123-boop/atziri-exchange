<template>
  <!-- Atziri Exchange: the Shift + Space page alone, in its own window -->
  <div class="atz-hub-window" :style="{ '--atz-x': '0vw', '--atz-y': '0vh' }">
    <MarketPrices :visible="visible" />
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from "vue";
import MarketPrices from "./MarketPrices.vue";
import { usePoeninja } from "@/web/background/Prices";
import { useLeagues } from "@/web/background/Leagues";

document.title = "Atziri Exchange";
// same start-up as the overlay: league list, then poe.ninja prices
usePoeninja();
useLeagues().load();
// refresh prices only while the window is shown
const visible = shallowRef(!document.hidden);
document.addEventListener("visibilitychange", () => {
  visible.value = !document.hidden;
});
</script>

<style lang="postcss">
.atz-hub-window {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background:
    linear-gradient(
      180deg,
      rgb(var(--c-gray-900) / 0.2) 0%,
      rgb(var(--c-gray-900) / 0.5) 100%
    ),
    var(--atz-hub-bg, url("/images/atziri-bg.jpg")) center / cover no-repeat;
  background-color: rgb(var(--c-gray-900));
}
</style>
