<template>
  <!-- Atziri Exchange: big price banner at the top of the price check -->
  <div v-if="view" :key="view.main + view.mainUnit" class="atz-hero">
    <!-- Atziri Exchange: price on the left; confidence and range stacked on the right -->
    <div class="atz-hero-top">
      <div class="atz-hero-left">
        <div class="atz-hero-cap">
          <span>{{ view.caption }}</span>
        </div>
        <div class="atz-hero-main">
          <span class="atz-hero-big">{{ view.main }}</span>
          <img :src="view.mainIcon" class="atz-hero-cur" />
          <span class="atz-hero-unit">{{ view.mainUnit }}</span>
        </div>
      </div>
      <div v-if="view.confidence" class="atz-hero-right">
        <span
          class="atz-hero-conf"
          :class="`atz-conf-${view.confidence.level}`"
          :title="view.confidence.hint"
          ><i class="atz-hero-dot"></i>{{ view.confidence.label }}</span
        >
      </div>
    </div>
    <!-- Atziri Exchange: range, cheapest and to-sell in a small row inside the banner, under the price -->
    <div v-if="view.cells?.length" class="atz-hero-cells">
      <div
        v-for="c in view.cells"
        :key="c.label"
        class="atz-hero-cell"
        :title="`${c.label} : ${c.text} ${c.unit}`"
      >
        <span class="atz-hero-cell-l">{{ c.label }}</span>
        <span class="atz-hero-cell-v">
          <b>{{ c.text }}</b>
          <img v-if="c.icon" :src="c.icon" class="atz-hero-cur-sm" />
        </span>
      </div>
    </div>
    <div v-if="view.sub" class="atz-hero-sub" :title="view.sub">
      {{ view.sub }}
    </div>
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
    return {
      text: displayRounding(div, false, true),
      icon: CURRENCY_ICONS.div,
      unit: "Divines",
    };
  }
  if (div * chaos >= 1 || !exalted) {
    return {
      text: displayRounding(div * chaos, false, true),
      icon: CURRENCY_ICONS.chaos,
      unit: "Chaos",
    };
  }
  return {
    text: displayRounding(div * exalted, true, true),
    icon: CURRENCY_ICONS.exalted,
    unit: tr("Exaltés", "Exalted"),
  };
}

function confidenceView(
  level: "low" | "medium" | "high",
  kept: number,
  sellers: number,
) {
  // what the level was computed on, in the tooltip
  const basis = tr(
    `${kept} annonce${kept > 1 ? "s" : ""} retenue${kept > 1 ? "s" : ""}, ${sellers} vendeur${sellers > 1 ? "s" : ""}`,
    `${kept} listing${kept > 1 ? "s" : ""} kept, ${sellers} seller${sellers > 1 ? "s" : ""}`,
  );
  switch (level) {
    case "low":
      return {
        level,
        label: tr("Fiabilité faible", "Low confidence"),
        hint: tr(
          `${basis}. Moins de 4 annonces, moins de 3 vendeurs ou prix très dispersés : vérifie les filtres.`,
          `${basis}. Under 4 listings, under 3 sellers or prices all over the place: check the filters.`,
        ),
      };
    case "medium":
      return {
        level,
        label: tr("Fiabilité moyenne", "Medium confidence"),
        hint: tr(
          `${basis}. Peu d'annonces ou de vendeurs, ou prix assez dispersés.`,
          `${basis}. Few listings or sellers, or prices rather spread out.`,
        ),
      };
    default:
      return {
        level,
        label: tr("Fiabilité bonne", "Good confidence"),
        hint: tr(`${basis}, prix cohérents.`, `${basis}, consistent prices.`),
      };
  }
}

const view = computed(() => {
  // 1) trade search results: range of the cheapest listings
  const s = tradeSummary.value;
  if (props.tradeSearch && s) {
    // one suggested price (median of the cheapest listings once the odd ones
    // are left out), then the range, the cheapest listing and a quick-sale price
    const main = inBestUnit(s.median);
    const low = inBestUnit(s.low);
    const high = inBestUnit(s.high);
    const cheapest = inBestUnit(s.cheapest);
    const sell = inBestUnit(s.sell);
    const pl = (n: number) => (n > 1 ? "s" : "");
    const kept = s.sample - s.ignored - s.ignoredHigh;
    const notes: string[] = [];
    const left: string[] = [];
    if (s.ignored > 0)
      left.push(
        tr(`${s.ignored} trop basse${pl(s.ignored)}`, `${s.ignored} too cheap`),
      );
    if (s.ignoredHigh > 0)
      left.push(
        tr(
          `${s.ignoredHigh} trop chère${pl(s.ignoredHigh)}`,
          `${s.ignoredHigh} too expensive`,
        ),
      );
    if (left.length)
      notes.push(
        tr(`ignorées : ${left.join(", ")}`, `left out: ${left.join(", ")}`),
      );
    if (s.unconverted > 0)
      notes.push(
        tr(
          `${s.unconverted} annonce${pl(s.unconverted)} en exalté/chaos non comptée${pl(s.unconverted)} : taux pas encore chargé`,
          `${s.unconverted} exalted/chaos listing${pl(s.unconverted)} not counted: rate not loaded yet`,
        ),
      );
    return {
      caption: tr(
        `Médiane des ${kept} moins chères · ${s.count} annonce${pl(s.count)}`,
        `Median of the ${kept} cheapest · ${s.count} listing${pl(s.count)}`,
      ),
      confidence: confidenceView(s.confidence, kept, s.sellers),
      main: main.text,
      mainIcon: main.icon,
      mainUnit: main.unit,
      cells: [
        {
          label: tr("Fourchette", "Range"),
          text:
            low.unit === high.unit && low.text !== high.text
              ? `${low.text} – ${high.text}`
              : low.unit === high.unit
                ? low.text
                : `${low.text} ${low.unit} – ${high.text} ${high.unit}`,
          icon: low.unit === high.unit ? low.icon : undefined,
          unit: low.unit === high.unit ? low.unit : "",
        },
        {
          label: tr("Moins chère", "Cheapest"),
          text: cheapest.text,
          icon: cheapest.icon,
          unit: cheapest.unit,
        },
        {
          label: tr("À vendre ≈", "To sell ≈"),
          text: sell.text,
          icon: sell.icon,
          unit: sell.unit,
        },
      ],
      sub: notes.join(" · "),
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

.atz-hero-top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.atz-hero-left {
  flex: 1;
  min-width: 0;
}

.atz-hero-right {
  flex: none;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
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
  font-size: 0.68rem;
  text-transform: uppercase;
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
  width: 0.9rem;
  height: 0.9rem;
  flex: none;
}

.atz-hero-unit {
  color: theme("colors.gray.400");
}

/* Fourchette, Moins chère, À vendre: one small row of three, under the price */
.atz-hero-cells {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  margin-top: 6px;
}

.atz-hero-cell {
  min-width: 0;
  padding: 2px 6px 3px;
  border: 1px solid theme("colors.gray.700");
  border-radius: 5px;
  background: rgb(var(--c-gray-900) / 0.6);
  line-height: 1.2;
}

.atz-hero-cell-l {
  display: block;
  font-size: 0.56rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: theme("colors.gray.400");
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.atz-hero-cell-v {
  display: flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
  font-family: "IBM Plex Mono", ui-monospace, Consolas, monospace;
  font-size: 0.72rem;
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
