// Atziri Exchange: exchange rates (from poe.ninja live data) and price formatting
import { shallowRef } from "vue";
import { displayRounding } from "@/web/background/Prices";

export const CURRENCY_ICONS = {
  exalted: "/images/exa.png",
  chaos: "/images/chaos.png",
  div: "/images/divine.png",
} as const;

/** Chaos and Exalted Orbs per Divine Orb, updated by the Economy tab */
export const rates = shallowRef<{ chaos?: number; exalted?: number }>({});
/** When the rates above were fetched from poe.ninja (ms), if known */
export const ratesAt = shallowRef<number | undefined>(undefined);

export function setRates(chaos?: number, exalted?: number, at?: number) {
  if (!chaos && !exalted) return;
  rates.value = {
    chaos: chaos ?? rates.value.chaos,
    exalted: exalted ?? rates.value.exalted,
  };
  if (at) ratesAt.value = at;
}

/** Rates older than this are refreshed when a price check needs them */
export const RATES_MAX_AGE_MS = 30 * 60 * 1000;

let ratesRefresher: (() => void) | undefined;
let lastRequest = 0;

/** The Economy tab registers how to fetch fresh rates (even page closed) */
export function registerRatesRefresher(fn: () => void) {
  ratesRefresher = fn;
}

/** Asks for fresh rates when they are missing or too old (at most once a minute) */
export function requestFreshRates(now = Date.now()) {
  const fresh =
    rates.value.exalted &&
    ratesAt.value != null &&
    now - ratesAt.value < RATES_MAX_AGE_MS;
  if (fresh || !ratesRefresher || now - lastRequest < 60 * 1000) return;
  lastRequest = now;
  ratesRefresher();
}

/**
 * Divine Orbs (only when worth at least 1), and Chaos Orbs or, under 1 Chaos,
 * Exalted Orbs.
 */
export function formatDivines(divines: number) {
  const { chaos: chaosRate, exalted: exaRate } = rates.value;
  const divText = divines >= 1 ? displayRounding(divines, false, true) : "";
  const chaos = chaosRate ? divines * chaosRate : undefined;
  if (chaos != null && chaos < 1 && exaRate) {
    return {
      divText,
      chaosText: displayRounding(divines * exaRate, true, true),
      chaosIcon: CURRENCY_ICONS.exalted as string,
    };
  }
  return {
    divText,
    chaosText: chaos != null ? displayRounding(chaos, true, true) : "—",
    chaosIcon: CURRENCY_ICONS.chaos as string,
  };
}
