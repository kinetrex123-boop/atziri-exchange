<template>
  <div :class="$style.titlebar">
    <slot />
    <button @click="emit('click')" class="truncate">{{ title }}</button>
    <button
      @click.stop="emit('close')"
      tabindex="-1"
      :class="[$style.button, $style.close]"
      title="Close"
    >
      <i class="fas fa-window-close"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
}>();

const emit = defineEmits<{
  (e: "click" | "close"): void;
}>();
</script>

<style lang="postcss" module>
.titlebar {
  @apply bg-gray-900 text-gray-200;
  font-family: "Space Grotesk", "Inter", Fontin, Georgia, serif;
  font-weight: 600;
  border-bottom: 1px solid theme("colors.gray.700");
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 1.75rem;
  line-height: 1.75rem;

  button {
    @apply px-2 pt-px;
    border-radius: 6px;
    transition:
      color 0.2s,
      background-color 0.2s;

    &:hover {
      @apply text-blue-400;
      background: theme("colors.gray.800");
    }

    &.close:hover {
      @apply text-red-200;
      background: theme("colors.red.500");
    }
  }
}
</style>
