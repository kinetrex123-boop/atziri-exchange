<template>
  <!-- Atziri Exchange: big price banner at the top of the price check -->
  <div v-if="view" :key="view.main + view.mainUnit" class="atz-hero">
    <div class="atz-hero-cap">
      <span>{{ view.caption }}</span>
      <span
        v-if="view.confidence"
        class="atz-hero-conf"
        :class="`atz-conf-${view.confidence.level}`"
        :title="view.confidence.hint"
        ><i class="atz-hero-dot"></i>{{ view.confidence.label }}</span
      >
    </div>
    <div class="atz-hero-main">
      <span class="atz-hero-big">{{ view.main }}</span>
      <img :src="view.mainIcon" class="atz-hero-cur" />
      <span class="atz-hero-unit">{{ view.mainUnit }}</span>
    </div>
    <!-- small cells under the price: each one on a single line, never overflows -->
    <div v-if="view.cells?.length" class="atz-hero-cells">
      <div v-for="c in view.cells" :key="c.label" class="atz-hero-cell" :title="`${c.label} : ${c.text} ${c.unit}`">
        <span class="atz-hero-cell-l">{{ c.label }}</span>
        <span class="atz-hero-cell-v">
          <b>{{ c.text }}</b>
          <img v-if="c.icon" :src="c.icon" class="atz-hero-cur-sm" />
        </span>
      </div>
    </div>
    <div v-if="view.sub" class="atz-hero-sub" :title="view.sub">{{ view.sub }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ParsedItem } from "@/parser";
import { usePoeninja, displayRounding } from "@/web/background/Prices";
import { getDetailsId } from "./trends/getDetailsId";
import { tradeSummary } from "./atziri-price-summary";
import { rates, CURRENCY_ICONS } from "@/web/overlay/atziri-money";
import { tr } from "@/web/atziri-lang";

const props = defineProps<{ item: ParsedItem; tradeSearch: boolean }>();
const ninja = usePoeninja();

/** Shows a Divine amount in Divines (≥ 1), Chaos, or Exalted (< 1 Chaos) */
function inBestUnit(div: number) {
  const { chaos, exalted } = rates.value;
  if (div >= 1 || !chaos) {
    return { text: displayRounding(div, false, true), icon: CURRENCY_ICONS.div, unit: "Divines" };
  }
  if (div * chaos >= 1 || !exalted) {
    return { text: displayRounding(div * chaos, false, true), icon: CURRENCY_ICONS.chaos, unit: "Chaos" };
  }
  return { text: displayRounding(div * exalted, true, true), icon: CURRENCY_ICONS.exalted, unit: tr("Exaltés", "Exalted") };
}

function confidenceView(level: "low" | "medium" | "high") {
  switch (level) {
    case "low":
      return { level, label: tr("Fiabilité faible", "Low confidence"), hint: tr("Moins de 5 annonces ou prix très dispersés", "Under 5 listings or prices all over the place") };
    case "medium":
      return { level, label: tr("Fiabilité moyenne", "Medium confidence"), hint: tr("Entre 5 et 20 annonces", "Between 5 and 20 listings") };
    default:
      return { level, label: tr("Fiabilité bonne", "Good confidence"), hint: tr("Plus de 20 annonces aux prix cohérents", "Over 20 listings with consistent prices") };
  }
}


const view = computed(() => {
  // 1) trade search results: range of the cheapest listings
  const s = tradeSummary.value;
  if (props.tradeSearch && s) {
    // like PoE2 MultiTool: one suggested price (median once the odd listings
    // are left out), then the range, the quick-sale price and the cheapest
    const main = inBestUnit(s.median);
    const low = inBestUnit(s.low);
    const high = inBestUnit(s.high);
    const pl = (n: number) => (n > 1 ? "s" : "");
    const left: string[] = [];
    if (s.ignored > 0)
      left.push(tr(`${s.ignored} trop basse${pl(s.ignored)}`, `${s.ignored} too cheap`));
    if (s.ignoredHigh > 0)
      left.push(tr(`${s.ignoredHigh} trop chère${pl(s.ignoredHigh)}`, `${s.ignoredHigh} too expensive`));
    const ignoredText = left.length
      ? tr(` · ignorées : ${left.join(", ")}`, ` · left out: ${left.join(", ")}`)
      : "";
    return {
      caption: tr(
        `Prix conseillé · ${s.count} annonce${pl(s.count)}`,
        `Suggested price · ${s.count} listing${pl(s.count)}`,
      ),
      confidence: confidenceView(s.confidence),
      main: main.text,
      mainIcon: main.icon,
      mainUnit: main.unit,
      cells: [
        {
          label: tr("Fourchette", "Range"),
          text: low.unit === high.unit && low.text !== high.text ? `${low.text} – ${high.text}` : low.text,
          icon: low.icon,
          unit: low.unit,
        },
      ],
      sub: ignoredText ? ignoredText.replace(/^ · /, "") : "",
    };
  }
  // 2) poe.ninja price (currency, uniques, gems...)
  try {
    const q = getDetailsId(props.item);
    const p = q ? ninja.findPriceByQuery(q) : null;
    if (p) {
      const count = props.item.stackSize?.value ?? 1;
      const one = inBestUnit(p.primaryValue);
      const all = inBestUnit(p.primaryValue * count);
      return {
        caption: tr("Prix poe.ninja", "poe.ninja price"),
        main: all.text,
        mainIcon: all.icon,
        mainUnit: all.unit + (count > 1 ? ` (×${count})` : ""),
        cells: [],
        sub: count > 1 ? `1 = ${one.text} ${one.unit}` : "",
      };
    }
  } catch {
    // no poe.ninja price for this item
  }
  return null;
});
</script>

<style lang="postcss">
/* look of the price banner from before the "Bento" restyle (gold edge, dark gradient) */
.atz-hero {
  position: relative;
  /* the parent is a flex column: never let it squash the banner */
  flex: none;
  margin: 0 0 8px;
  padding: 8px 12px 10px;
  border: 1px solid theme("colors.blue.400");
  border-radius: 8px;
  background: linear-gradient(
    180deg,
    rgb(var(--c-blue-900) / 0.95),
    rgb(var(--c-gray-900) / 0.95)
  );
  box-shadow: 0 0 18px rgb(var(--c-blue-400) / 0.15);
  animation: atz-hero-in 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes atz-hero-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .atz-hero {
    animation: none;
  }
}

.atz-hero-cap {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: theme("colors.gray.400");
}

.atz-hero-cap > span:first-child {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.atz-hero-conf {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.atz-hero-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.atz-conf-low {
  color: #e05a4f;
}

.atz-conf-medium {
  color: #e0a84f;
}

.atz-conf-high {
  color: #6fc46a;
}

.atz-hero-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  margin-top: 2px;
}

.atz-hero-big {
  font-family: "IBM Plex Mono", ui-monospace, Consolas, monospace;
  font-size: 1.75rem;
  font-weight: 600;
  line-height: 1.1;
  color: theme("colors.gray.100");
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.atz-hero-cur {
  width: 1.6rem;
  height: 1.6rem;
  flex: none;
}

.atz-hero-cur-sm {
  width: 1.1rem;
  height: 1.1rem;
  flex: none;
}

.atz-hero-unit {
  color: theme("colors.gray.400");
}

/* Fourchette / Vente rapide / Le moins cher: one line each, never overflow */
.atz-hero-cells {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.atz-hero-cell {
  min-width: 0;
  max-width: 100%;
  padding: 3px 8px 4px;
  border: 1px solid theme("colors.gray.700");
  border-radius: 6px;
  background: rgb(var(--c-gray-900) / 0.6);
  line-height: 1.25;
}

.atz-hero-cell-l {
  display: block;
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: theme("colors.gray.400");
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.atz-hero-cell-v {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  font-family: "IBM Plex Mono", ui-monospace, Consolas, monospace;
  font-size: 0.85rem;
  color: theme("colors.blue.400");

  b {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.atz-hero-sub {
  margin-top: 4px;
  font-family: "IBM Plex Mono", ui-monospace, Consolas, monospace;
  font-size: 0.72rem;
  color: theme("colors.gray.400");
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
