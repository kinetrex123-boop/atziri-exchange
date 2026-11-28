<template>
  <div id="app" class="text-sm font-poe-sc">
    <!-- Atziri Exchange: detached Shift + Space page (second screen) -->
    <HubWindow v-if="detachedHub" />
    <OverlayWindow v-else />
  </div>
</template>

<script setup lang="ts">
import OverlayWindow from "./overlay/OverlayWindow.vue";
import HubWindow from "./overlay/HubWindow.vue";
import { isDetachedHub } from "./overlay/atziri-hub";

const detachedHub = isDetachedHub();
</script>

<style lang="postcss">
@import url("@fortawesome/fontawesome-free/css/all.min.css");
@import url("animate.css/animate.css");
@import url("../assets/font.css");
/* Atziri Exchange: visual styles picked in Atziri réglage */
@import url("./atziri-skins.css");
@tailwind base;
@tailwind components;
@tailwind utilities;

.table-stripped tbody tr:nth-child(odd) {
  background: #2a221b;
}

/* Atziri Regex theme: display font for titles and headings */
.font-display,
h1,
h2,
h3 {
  font-family: "Space Grotesk", "Inter", "Segoe UI", sans-serif;
  letter-spacing: -0.01em;
}

/* Atziri Regex theme: darkened temple artwork behind the main windows */
.atziri-bg {
  background-color: theme("colors.gray.800");
  background-image:
    linear-gradient(
      180deg,
      rgb(var(--c-gray-900) / 0.7) 0%,
      rgb(var(--c-gray-900) / 0.9) 45%,
      rgb(var(--c-gray-900) / 0.96) 100%
    ),
    var(--atz-price-bg, url("/images/atziri-bg.jpg"));
  background-size: cover;
  background-position: center 40%;
}

/* style "Bento": price check window slides in from its side of the screen */
#price-window {
  background-color: theme("colors.gray.900");
  border-left: 1px solid theme("colors.gray.700");
  border-right: 1px solid theme("colors.gray.700");
  box-shadow: 0 0 2.5rem rgba(0, 0, 0, 0.55);
  animation: atz-price-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.flex-row-reverse > #price-window {
  animation-name: atz-price-in-right;
}

@keyframes atz-price-in {
  from {
    opacity: 0;
    transform: translateX(-24px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes atz-price-in-right {
  from {
    opacity: 0;
    transform: translateX(24px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  #price-window,
  .atziri-frame {
    animation: none !important;
  }
}

/* Atziri theme: large framed artwork panel shown when the overlay is opened */
.atziri-frame {
  position: absolute;
  top: var(--atz-y, 7vh);
  bottom: var(--atz-y, 7vh);
  left: var(--atz-x, 10vw);
  right: var(--atz-x, 10vw);
  pointer-events: none;
  /* style "Bento": thin neutral edge, large radius, soft accent glow */
  border: 1px solid rgb(var(--c-gray-700));
  border-radius: 18px;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.6),
    0 0 3rem rgb(var(--c-blue-400) / 0.08),
    0 1.5rem 4rem rgba(0, 0, 0, 0.75);
  background:
    linear-gradient(
      180deg,
      rgb(var(--c-gray-900) / 0.55) 0%,
      rgb(var(--c-gray-900) / 0.82) 100%
    ),
    var(--atz-hub-bg, url("/images/atziri-bg.jpg")) center / cover no-repeat;
  animation: atziri-frame-in 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* Corner handle to resize the Atziri frame (double-click resets the size) */
.atziri-resize {
  position: absolute;
  right: calc(var(--atz-x, 10vw) - 0.6rem);
  bottom: calc(var(--atz-y, 7vh) - 0.6rem);
  width: 1.4rem;
  height: 1.4rem;
  z-index: 5;
  cursor: nwse-resize;
  border-right: 2px solid theme("colors.blue.400");
  border-bottom: 2px solid theme("colors.blue.400");
  border-bottom-right-radius: 18px;
  filter: drop-shadow(0 0 4px rgb(var(--c-blue-400) / 0.6));
  opacity: 0.6;
  transition: opacity 0.25s;

  &:hover {
    opacity: 1;
  }
}

@keyframes atziri-frame-in {
  from {
    opacity: 0;
    transform: scale(0.97) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

::selection {
  background: theme("colors.accent.soft");
  color: theme("colors.blue.300");
}

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  /* align-items: center; */
  overflow: hidden;
  justify-content: space-between;

  :focus {
    outline: 0;
  }
}

.layout-column {
  display: flex;
  flex-direction: column;
  height: 100%;
}

::-webkit-scrollbar {
  width: 0.875rem;
}

::-webkit-scrollbar-track {
  -webkit-box-shadow: inset 0 0 0.375rem rgba(0, 0, 0, 0.3);
}

::-webkit-scrollbar-thumb {
  -webkit-box-shadow: inset 0 0 0.375rem rgba(0, 0, 0, 0.5);
  background: theme("colors.gray.700");
  border-radius: 0.375rem;
}

::-webkit-scrollbar-thumb:hover {
  background: theme("colors.blue.800");
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
}

.btn {
  @apply bg-gray-700;
  @apply px-2 py-1;
  @apply text-gray-400;
  @apply leading-none;
  border-radius: 6px;
  border: 1px solid transparent;
  transition:
    color 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;

  &:hover {
    @apply text-blue-300;
    border-color: theme("colors.blue.800");
    box-shadow: 0 0 0.5rem theme("colors.accent.glow");
  }
}

.btn-icon {
  @apply text-xs text-gray-600;
}

@keyframes ring {
  0% {
    -webkit-transform: rotate(-15deg);
    -ms-transform: rotate(-15deg);
    transform: rotate(-15deg);
  }

  2% {
    -webkit-transform: rotate(15deg);
    -ms-transform: rotate(15deg);
    transform: rotate(15deg);
  }

  4% {
    -webkit-transform: rotate(-18deg);
    -ms-transform: rotate(-18deg);
    transform: rotate(-18deg);
  }

  6% {
    -webkit-transform: rotate(18deg);
    -ms-transform: rotate(18deg);
    transform: rotate(18deg);
  }

  8% {
    -webkit-transform: rotate(-22deg);
    -ms-transform: rotate(-22deg);
    transform: rotate(-22deg);
  }

  10% {
    -webkit-transform: rotate(22deg);
    -ms-transform: rotate(22deg);
    transform: rotate(22deg);
  }

  12% {
    -webkit-transform: rotate(-18deg);
    -ms-transform: rotate(-18deg);
    transform: rotate(-18deg);
  }

  14% {
    -webkit-transform: rotate(18deg);
    -ms-transform: rotate(18deg);
    transform: rotate(18deg);
  }

  16% {
    -webkit-transform: rotate(-12deg);
    -ms-transform: rotate(-12deg);
    transform: rotate(-12deg);
  }

  18% {
    -webkit-transform: rotate(12deg);
    -ms-transform: rotate(12deg);
    transform: rotate(12deg);
  }

  20% {
    -webkit-transform: rotate(0deg);
    -ms-transform: rotate(0deg);
    transform: rotate(0deg);
  }
}

.faa-ring {
  animation: ring 2s ease;
  transform-origin-x: 50%;
  transform-origin-y: 0px;
  transform-origin-z: initial;
}
</style>
