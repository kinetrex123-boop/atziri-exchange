<template>
  <transition
    enter-active-class="animate__animated animate__fadeIn"
    leave-active-class="animate__animated animate__backOutDown"
  >
    <div :class="$style.widget" v-if="show">
      <div :class="$style.box">
        <div class="py-2 px-4">
          <div class="text-base">Atziri Exchange</div>
          <p>{{ t("app_is_ready") }}</p>
          <!-- Atziri Exchange: the two hotkeys to remember -->
          <p class="mt-1">
            <kbd :class="$style.kbd">{{ menuKey }}</kbd>
            {{ tr("ouvrir le menu", "open the menu") }}
          </p>
          <p v-if="priceKey" class="mt-1">
            <kbd :class="$style.kbd">{{ priceKey }}</kbd>
            {{ tr("vérification du prix", "price check") }}
          </p>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { shallowRef, computed } from "vue";
import { tr } from "@/web/atziri-lang";
import type { PriceCheckWidget } from "./interfaces";
import { useI18n } from "vue-i18n";
import { Host } from "@/web/background/IPC";
import { AppConfig } from "@/web/Config";

const { t } = useI18n();

const show = shallowRef(false);

const menuKey = computed(() =>
  tr(
    (AppConfig().overlayKey || "Shift + Space").replace("Space", "Espace"),
    AppConfig().overlayKey || "Shift + Space",
  ),
);
const priceKey = computed(() => {
  const pc = AppConfig<PriceCheckWidget>("price-check");
  if (!pc?.hotkey) return "";
  return pc.hotkeyHold ? `${pc.hotkeyHold} + ${pc.hotkey}` : pc.hotkey;
});

Host.onEvent("MAIN->OVERLAY::overlay-attached", () => {
  if (!show.value && AppConfig().showAttachNotification) {
    show.value = true;
    setTimeout(() => {
      show.value = false;
    }, 5000); // Atziri Exchange: longer, to read the hotkeys
  }
});
</script>

<style lang="postcss" module>
.kbd {
  display: inline-block;
  padding: 0 6px;
  margin-right: 4px;
  border: 1px solid theme("colors.blue.400");
  border-radius: 4px;
  color: theme("colors.blue.400");
  font-family: inherit;
}

.widget {
  position: absolute;
  display: flex;
  width: 100%;
  justify-content: center;
  bottom: 20%;
}

.box {
  position: relative;
  display: flex;
  @apply bg-gray-800;
  @apply text-gray-100;
  @apply rounded;
  box-shadow: 0px 0px 1px 2px rgb(255 255 255 / 20%);
}

.box::before {
  position: absolute;
  content: "";
  /* Atziri Exchange: Atziri medallion instead of the upstream jeweller orb */
  background: url("/icon.png") no-repeat center/contain;
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  width: 64px;
  height: 64px;
  border-radius: 50%;
  @apply mr-3;
  pointer-events: none;
  filter: drop-shadow(2px 4px 6px #000);
}
</style>
