<template>
  <!-- Render nothing directly, all behavior is applied to the element passed via ref -->
  <tr
    ref="target"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <td class="px-2 whitespace-nowrap">
      <span
        :class="{
          'line-through': false,
        }"
        >{{ result.priceAmount }} {{ result.priceCurrency
        }}{{
          result.normalizedPriceCurrency &&
          result.priceCurrency !== result.normalizedPriceCurrency.id &&
          result.priceCurrency !== "divine" &&
          result.normalizedPrice
            ? ` (${result.normalizedPrice} ${result.normalizedPriceCurrency.abbrev})`
            : ""
        }}</span
      >
      <span
        v-if="result.listedTimes > 2"
        class="rounded px-1 text-gray-800 bg-gray-400 -mr-2"
        ><span class="font-sans">×</span> {{ result.listedTimes }}</span
      ><i v-else-if="!result.hasNote" class="fas fa-question" />
    </td>
    <td v-if="item.stackSize" class="px-2 text-right">
      {{ result.stackSize }}
    </td>

    <td v-if="itemLevel" class="px-2 whitespace-nowrap text-right">
      {{ result.itemLevel }}
    </td>
    <td
      v-if="isGem || item.category === ItemCategory.UncutGem"
      class="pl-2 whitespace-nowrap"
    >
      {{ result.level }}
    </td>
    <td v-if="isGem || grantsSkill" class="pl-2 whitespace-nowrap">
      {{ result.gemSockets }}
    </td>
    <td
      v-if="(quality && !quality.disabled) || isGem"
      class="px-2 whitespace-nowrap text-blue-400 text-right"
    >
      {{ result.quality }}
    </td>
    <td class="pr-2 pl-4 whitespace-nowrap">
      <div class="inline-flex items-center">
        <div
          class="account-status"
          :class="
            result.isInstantBuyout ? 'instantBuyout' : result.accountStatus
          "
        ></div>
        <div class="ml-1 font-sans text-xs">
          {{ result.relativeDate }}
        </div>
      </div>
      <span
        v-if="!showSeller && result.isMine"
        class="rounded px-1 text-gray-800 bg-gray-400 ml-1"
        >{{ t("You") }}</span
      >
      <span
        v-if="!showSeller && result.inDemand"
        class="rounded px-1 bg-yellow-500 text-black ml-1"
        >{{ t("in demand") }}</span
      >
      <span
        v-if="!showSeller && result.gone"
        class="rounded border px-1 border-red-500 text-red-500 ml-1"
        >{{ t("Gone") }}</span
      >
    </td>
    <td v-if="showSeller" class="px-2 whitespace-nowrap">
      <span
        v-if="result.isMine"
        class="rounded px-1 text-gray-800 bg-gray-400"
        >{{ t("You") }}</span
      >
      <span v-else class="font-sans text-xs">{{
        showSeller === "ign" ? result.ign : result.accountName
      }}</span>
      <span
        v-if="result.inDemand"
        class="rounded px-1 bg-yellow-500 text-black ml-1"
        >{{ t("in demand") }}</span
      >
      <span
        v-if="!showSeller && result.gone"
        class="rounded border-2 px-1 border-red-500 text-red-500 ml-1"
        >{{ t("Gone") }}</span
      >
    </td>
    <!-- Atziri Exchange: Travel to Hideout, own column on the right edge -->
    <td class="atz-hideout-cell">
      <button
        v-if="result.hideoutToken && !result.isMine"
        type="button"
        class="atz-hideout-btn"
        :class="'atz-hideout-' + hideoutState"
        :disabled="hideoutState === 'loading'"
        :title="hideoutTitle"
        @click.stop="goToHideout"
      >
        <i
          :class="
            hideoutState === 'loading'
              ? 'fas fa-spinner fa-spin'
              : hideoutState === 'ok'
                ? 'fas fa-check'
                : 'fas fa-home'
          "
        ></i>
      </button>
      <span
        v-else-if="result.isInstantBuyout && !result.isMine"
        class="atz-hideout-off"
        :title="
          tr(
            'Aller au repaire : connecte-toi au site trade (bouton Trade du Ctrl+D)',
            'Travel to hideout: log in to the trade site (Trade button of Ctrl+D)',
          )
        "
        ><i class="fas fa-home"></i
      ></span>
    </td>
  </tr>
  <div ref="content">
    <!-- isHovered is mostly used here to prevent tooltip from rendering on initial load, tooltip is kinda expensive to mount -->
    <tooltip-item :result="result" v-if="isHovered" />
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  onBeforeUnmount,
  onMounted,
  PropType,
  ref,
} from "vue";
import { PricingResult, travelToHideout } from "./pathofexile-trade";
import { tr } from "@/web/atziri-lang";
import { ParsedItem } from "@/parser/ParsedItem";
import { FilterNumeric } from "../filters/interfaces";
import { useI18nNs } from "@/web/i18n";
import { PriceCheckWidget } from "@/web/overlay/widgets";
import tippy, { Instance } from "tippy.js";
import "tippy.js/dist/tippy.css";
import { AppConfig } from "@/web/Config";
import { ItemCategory } from "@/parser";
import TooltipItem from "./TooltipItem.vue";
import { GEM, GRANTS_REAL_SKILL } from "@/parser/meta";

export default defineComponent({
  name: "TradeItem",
  components: { TooltipItem },
  props: {
    result: {
      type: Object as PropType<
        PricingResult & {
          listedTimes: number;
        }
      >,
      required: true,
    },
    item: {
      type: Object as PropType<ParsedItem>,
      required: true,
    },
    showSeller: {
      type: [Boolean, String] as PropType<PriceCheckWidget["showSeller"]>,
      default: undefined,
    },
    itemLevel: {
      type: Object as PropType<FilterNumeric>,
      default: undefined,
    },
    quality: {
      type: Object as PropType<FilterNumeric>,
      default: undefined,
    },
  },

  setup(props) {
    const tooltipOption = computed(
      () => AppConfig<PriceCheckWidget>("price-check")!.itemHoverTooltip,
    );
    const target = ref<HTMLElement>(null!);
    const content = ref<HTMLElement>(null!);
    const { t } = useI18nNs("trade_result");
    let instance: Instance;

    // Shift Key Detection
    const isShiftPressed = ref(false);
    const isHovered = ref(false); // Track hover state

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        instance.enable();
        if (isHovered.value) {
          instance.show();
        }
        isShiftPressed.value = true;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        instance.hide();
        instance.disable();
        isShiftPressed.value = false;
      }
    };

    onMounted(() => {
      if (tooltipOption.value === "off") return;
      if (tooltipOption.value === "keybind") {
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
      }

      // tippy stuff
      instance = tippy(target.value, {
        content: content.value,
        interactive: true,
        theme: "item-tooltip",
        trigger: "mouseenter",
        placement: "left",
        arrow: true,
        delay: [0, 0],
        animation: false,
        maxWidth: "none",
      });
      if (tooltipOption.value === "keybind") {
        instance.disable();
      }
    });

    onBeforeUnmount(() => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);

      instance?.destroy();
    });
    // Atziri Exchange: Travel to Hideout, one request per click
    const hideoutState = ref<
      "idle" | "loading" | "ok" | "login" | "gone" | "error"
    >("idle");
    async function goToHideout() {
      const token = props.result.hideoutToken;
      if (!token || hideoutState.value === "loading") return;
      hideoutState.value = "loading";
      try {
        hideoutState.value = await travelToHideout(token);
      } catch (e) {
        console.error(e);
        hideoutState.value = "error";
      }
    }
    const hideoutLabel = computed(() => {
      switch (hideoutState.value) {
        case "loading":
          return tr("Envoi…", "Sending…");
        case "ok":
          return tr("Envoyé", "Sent");
        case "login":
          return tr("Connexion ?", "Log in?");
        case "gone":
          return tr("Vendu", "Gone");
        case "error":
          return tr("Erreur", "Error");
        default:
          return tr("Repaire", "Hideout");
      }
    });
    const hideoutTitle = computed(() => {
      switch (hideoutState.value) {
        case "ok":
          return tr(
            "Demande envoyée : le jeu te téléporte au repaire du vendeur",
            "Request sent: the game takes you to the seller's hideout",
          );
        case "login":
          return tr(
            "Connecte-toi au site trade : bouton Trade du Ctrl+D, puis Log in",
            "Log in to the trade site: Trade button of Ctrl+D, then Log in",
          );
        case "gone":
          return tr(
            "L'objet n'est plus en vente",
            "The item is no longer listed",
          );
        case "error":
          return tr(
            "Le site trade a refusé la demande. Re-clique pour réessayer",
            "The trade site refused the request. Click again to retry",
          );
        default:
          return tr(
            "Aller au repaire du vendeur (achat instantané)",
            "Travel to the seller's hideout (instant buyout)",
          );
      }
    });

    return {
      t,
      tr,
      hideoutState,
      hideoutLabel,
      hideoutTitle,
      goToHideout,
      target,
      content,
      isHovered,
      isShiftPressed,
      ItemCategory,
      isGem: computed(
        () => props.item.category && GEM.has(props.item.category),
      ),
      grantsSkill: computed(
        () => props.item.category && GRANTS_REAL_SKILL.has(props.item.category),
      ),
    };
  },
});
</script>

<style lang="postcss">
/* Atziri Exchange: Travel to Hideout button */
.atz-hideout-cell {
  width: 1px;
  padding: 0 6px 0 4px;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
}
.atz-hideout-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.2rem;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #fff;
  background: transparent;
  transition:
    opacity 0.12s,
    background-color 0.12s;

  &:hover:not(:disabled) {
    background: rgb(255 255 255 / 0.12);
  }
}
.atz-hideout-loading {
  @apply cursor-wait;
  opacity: 0.8;
}
.atz-hideout-ok {
  @apply text-green-400;
}
.atz-hideout-login,
.atz-hideout-gone,
.atz-hideout-error {
  @apply text-red-400;
}
.atz-hideout-off {
  font-size: 0.8rem;
  @apply text-gray-600;
  cursor: help;
}

.tippy-box[data-theme~="item-tooltip"] {
  @apply w-fit h-fit;
  /* hiding box more */
  @apply shadow-none bg-transparent;
}

div[data-tippy-root] .tippy-box[data-theme~="item-tooltip"] {
  @apply bg-transparent;
}

.tippy-box[data-theme~="item-tooltip"] .tippy-content {
  @apply p-0 w-fit h-fit;
}

.tippy-box[data-theme~="item-tooltip"] > .tippy-arrow::before {
  @apply text-white;
}
</style>
