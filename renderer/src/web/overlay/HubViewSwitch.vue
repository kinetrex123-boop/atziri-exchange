<template>
  <!-- Atziri Exchange: switch between the views that share one tab button
       (same look as the Farm switch, .fv-switch in FarmViewSwitch.vue) -->
  <div class="fv-switch" role="tablist">
    <button
      v-for="v in TAB_GROUPS[group]"
      :key="v.tab"
      type="button"
      role="tab"
      :aria-selected="hubTab === v.tab"
      @click="hubTab = v.tab"
    >
      <i class="fas" :class="v.icon"></i> {{ tr(v.fr, v.en) }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { hubTab, TAB_GROUPS } from "./atziri-hub";
import { tr } from "@/web/atziri-lang";

defineProps<{ group: string }>();
</script>
