<template>
  <!-- Atziri Exchange: switch between Craft of Exile and the craft tracking
       (same look as the Farm switch, .fv-switch in FarmViewSwitch.vue) -->
  <div class="fv-switch" role="tablist">
    <button type="button" role="tab" :aria-selected="hubTab === 'craft'" @click="hubTab = 'craft'">
      <i class="fas fa-hammer"></i> Craft of Exile
    </button>
    <button
      type="button"
      role="tab"
      :aria-selected="hubTab === 'crafttrack'"
      @click="hubTab = 'crafttrack'"
    >
      <i class="fas fa-flask"></i> {{ tr("Suivi", "Tracking") }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { hubTab } from "./atziri-hub";
import { tr } from "@/web/atziri-lang";
</script>
