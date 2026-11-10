<template>
  <!-- Atziri Exchange: yes / no question inside the overlay -->
  <div v-if="confirmAsk" class="atz-confirm-bg" @click.self="confirmAsk.resolve(false)">
    <div class="atz-confirm" role="dialog">
      <p>{{ confirmAsk.text }}</p>
      <div class="atz-confirm-btns">
        <button type="button" class="fm-btn" @click="confirmAsk.resolve(false)">{{ tr("Annuler", "Cancel") }}</button>
        <button ref="okEl" type="button" class="fm-btn cr-done" @click="confirmAsk.resolve(true)">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, watch, nextTick } from "vue";
import { tr } from "@/web/atziri-lang";
import { confirmAsk } from "./atziri-confirm";

const okEl = shallowRef<HTMLButtonElement | null>(null);
watch(confirmAsk, (v) => {
  if (v) nextTick(() => okEl.value?.focus());
});
window.addEventListener("keydown", (e) => {
  if (confirmAsk.value && e.key === "Escape") confirmAsk.value.resolve(false);
});
</script>

<style lang="postcss">
.atz-confirm-bg {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 0.45);
}
.atz-confirm {
  min-width: 22rem;
  max-width: 34rem;
  border: 1px solid var(--accent);
  border-radius: 8px;
  background: var(--bg);
  padding: 14px 16px 12px;
  box-shadow: 0 12px 34px rgb(0 0 0 / 0.75);
  color: var(--fg);
}
.atz-confirm p {
  margin: 0 0 12px;
}
.atz-confirm-btns {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
