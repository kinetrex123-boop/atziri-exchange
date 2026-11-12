<template>
  <!-- Atziri Exchange: switch between the farm journal and the setup cards -->
  <div class="fv-switch" role="tablist">
    <button
      type="button"
      role="tab"
      :aria-selected="farmView === 'journal'"
      @click="farmView = 'journal'"
    >
      <i class="fas fa-map"></i> {{ tr("Journal", "Journal") }}
    </button>
    <button
      type="button"
      role="tab"
      :aria-selected="farmView === 'setup'"
      @click="farmView = 'setup'"
    >
      <i class="fas fa-th-large"></i> {{ tr("Setup", "Setup") }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { farmView } from "./atziri-hub";
import { tr } from "@/web/atziri-lang";
</script>

<style lang="postcss">
.ar-hub .fv-switch {
  flex: 0 0 auto;
  white-space: nowrap;
  display: inline-flex;
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
}
.ar-hub .fv-switch.fv-switch button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: none;
  border-radius: 0;
  background: var(--surface);
  color: var(--muted);
  font-size: 0.85rem;
}
.ar-hub .fv-switch.fv-switch button + button {
  border-left: 1px solid var(--line);
}
.ar-hub .fv-switch.fv-switch button:hover {
  color: var(--accent);
}
.ar-hub .fv-switch.fv-switch button[aria-selected="true"] {
  background: var(--accent-soft, var(--surface));
  color: var(--accent);
}
</style>
