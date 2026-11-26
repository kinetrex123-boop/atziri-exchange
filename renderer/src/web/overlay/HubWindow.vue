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
import { Host } from "@/web/background/IPC";
import { parseClipboard } from "@/parser";
import { openPoedb } from "@/web/item-check/hotkeyable-actions";

document.title = "Atziri Exchange";
// same start-up as the overlay: league list, then poe.ninja prices
usePoeninja();
useLeagues().load();
// PoEDB shortcut while detached: the page opens here, the overlay stays closed
Host.onEvent("MAIN->CLIENT::item-text", (e) => {
  if (e.target !== "open-poedb") return;
  const parsed = parseClipboard(e.clipboard);
  if (parsed.isOk()) openPoedb(parsed.value);
});
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
      rgb(var(--c-gray-900) / 0.55) 0%,
      rgb(var(--c-gray-900) / 0.82) 100%
    ),
    var(--atz-hub-bg, url("/images/atziri-bg.jpg")) center / cover no-repeat;
  background-color: rgb(var(--c-gray-900));
}
</style>
