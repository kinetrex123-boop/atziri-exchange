<template>
  <!-- Atziri Exchange: small in-game counter of the armed currency (Suivi craft) -->
  <div v-if="entry" class="cr-mini" :class="{ paused: craft.paused }">
    <img v-if="entryIcon(entry)" :src="entryIcon(entry)" alt="" />
    <b>{{ entryName(entry) }}</b>
    <span class="cr-mini-n">{{ entry.count }}</span>
    <span class="cr-mini-dot"></span>
    <span class="cr-mini-sub">
      {{ craft.paused ? tr("en pause", "paused") : `${tr("session", "session")} ${num(total)} div` }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { tr, isFrench } from "@/web/atziri-lang";
import { craft, craftSession, craftTotals, armedEntry, entryName, entryIcon } from "./atziri-craft";

const entry = armedEntry;
const total = computed(() => craftTotals(craftSession.value).divines);
function num(n: number) {
  return (Math.round(n * 100) / 100).toLocaleString(isFrench() ? "fr-FR" : "en-GB");
}
</script>

<style lang="postcss">
.cr-mini {
  position: absolute;
  top: 0.6rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  pointer-events: none;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  border: 1px solid #d8a24f;
  border-radius: 20px;
  background: rgb(14 10 9 / 0.92);
  padding: 4px 14px 4px 6px;
  color: #ebdfc6;
  font-size: 0.85rem;
  box-shadow: 0 4px 18px rgb(0 0 0 / 0.6);
}
.cr-mini img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}
.cr-mini-n {
  font: 600 1.05rem "IBM Plex Mono", ui-monospace, Consolas, monospace;
  color: #d8a24f;
}
.cr-mini-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9cc46f;
  box-shadow: 0 0 6px #9cc46f;
}
.cr-mini.paused {
  border-style: dashed;
  opacity: 0.85;
}
.cr-mini.paused .cr-mini-dot {
  background: #d8a24f;
  box-shadow: none;
}
.cr-mini-sub {
  color: #a8977b;
  font-size: 0.75rem;
}
</style>
