// Atziri Exchange: price summary shown at the top of the price check window
import { shallowRef } from "vue";
import { rates, ratesAt, requestFreshRates } from "@/web/overlay/atziri-money";

export type Confidence = "low" | "medium" | "high";

export interface TradeSummary {
  count: number; // listings found on the trade site
  sample: number; // listings used for the summary (the cheapest, at most 12)
  sellers: number; // different sellers among the kept listings
  cheapest: number; // Divine Orbs: cheapest listing of the sample (none left out)
  low: number; // Divine Orbs: 1st quarter of the kept listings
  high: number; // 3rd quarter
  median: number; // suggested price: median of the kept listings
  ignored: number; // cheap listings left out (price fixers, never instant buyout)
  ignoredHigh: number; // abnormally expensive listings left out
  unconverted: number; // listings in a currency whose rate is not known yet
  confidence: Confidence;
  sell: number; // suggested price to sell quickly, in Divine Orbs
  ratesAt?: number; // when the exchange rates were fetched (ms)
}

export interface SummaryListing {
  priceAmount: number;
  priceCurrency: string;
  accountName?: string;
  isInstantBuyout?: boolean;
}

export interface SummaryRates {
  chaos?: number; // Chaos Orbs per Divine Orb
  exalted?: number; // Exalted Orbs per Divine Orb
}

/** Listings used for the summary: the cheapest ones, as the site sorts them */
export const SAMPLE_SIZE = 12;

export const tradeSummary = shallowRef<TradeSummary | null>(null);

/** Value of one unit of a trade currency in Divine Orbs, if known */
function divinesPer(currency: string, r: SummaryRates): number | undefined {
  switch (currency) {
    case "divine":
      return 1;
    case "exalted":
      return r.exalted ? 1 / r.exalted : undefined;
    case "chaos":
      return r.chaos ? 1 / r.chaos : undefined;
  }
  return undefined;
}

function median(sorted: number[]) {
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

/** Quantile with linear interpolation between two listings */
function quantile(sorted: number[], p: number) {
  const pos = p * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

interface Priced {
  value: number; // Divine Orbs
  account: string;
  instant: boolean;
}

/**
 * Leaves out "price fixers": the cheapest listings that sit far below the
 * rest (under half of the median of the following ones). Never removes more
 * than a third of the sample, needs at least 5 listings to judge, and never
 * removes an instant buyout listing: that one can be bought right now, so it
 * is the real floor price.
 */
function dropPriceFixers(sorted: Priced[]) {
  if (sorted.length < 5) return { kept: sorted, ignored: 0 };
  const maxDrop = Math.floor(sorted.length / 3);
  let start = 0;
  while (start < maxDrop && !sorted[start].instant) {
    const rest = sorted.slice(start + 1).map((p) => p.value);
    if (sorted[start].value < 0.5 * median(rest)) start++;
    else break;
  }
  return { kept: sorted.slice(start), ignored: start };
}

/**
 * Like PoE2 MultiTool's suggested price: also leaves out listings far above
 * the others (over 3 × the median), at most a third of the sample.
 */
function dropOverpriced(sorted: Priced[]) {
  if (sorted.length < 4) return sorted;
  const m = median(sorted.map((p) => p.value));
  const maxDrop = Math.floor(sorted.length / 3);
  let end = sorted.length;
  while (sorted.length - end < maxDrop && sorted[end - 1].value > 3 * m) end--;
  return sorted.slice(0, end);
}

/**
 * Confidence of the suggested price, from what it was really computed on:
 * how many listings were kept, how many different sellers they come from,
 * and how far apart their prices are.
 */
export function confidenceOf(
  kept: number,
  sellers: number,
  low: number,
  high: number,
): Confidence {
  let level = kept < 4 || sellers < 3 ? 0 : kept < 8 || sellers < 5 ? 1 : 2;
  // prices all over the place: trust it a bit less
  if (low > 0 && high / low > 2) level = Math.max(0, level - 1);
  return (["low", "medium", "high"] as const)[level];
}

/**
 * Builds the summary from the first listings (cheapest first): the median of
 * the cheapest 12 once the abnormal ones are left out, a range from the 1st
 * to the 3rd quarter, the cheapest listing and a quick-sale price.
 * Pure function: everything it needs is passed in (tested in the specs).
 */
export function summarizeListings(
  total: number,
  listings: readonly SummaryListing[],
  r: SummaryRates,
  at?: number,
): TradeSummary | null {
  let unconverted = 0;
  const priced: Priced[] = [];
  for (const l of listings) {
    if (!(l.priceAmount > 0)) continue;
    const per = divinesPer(l.priceCurrency, r);
    if (per == null) {
      // known currency whose rate is not loaded yet: say so instead of hiding it
      if (l.priceCurrency === "exalted" || l.priceCurrency === "chaos")
        unconverted++;
      continue;
    }
    priced.push({
      value: l.priceAmount * per,
      account: l.accountName ?? "",
      instant: l.isInstantBuyout === true,
    });
  }
  const sample = priced.slice(0, SAMPLE_SIZE).sort((a, b) => a.value - b.value);
  if (!sample.length) return null;

  const { kept: noFixers, ignored } = dropPriceFixers(sample);
  const kept = dropOverpriced(noFixers);
  const values = kept.map((p) => p.value);
  const sellers = new Set(kept.map((p) => p.account)).size;
  // with fewer than 4 listings, the range is simply the cheapest to the dearest
  const low = values.length < 4 ? values[0] : quantile(values, 0.25);
  const high =
    values.length < 4 ? values[values.length - 1] : quantile(values, 0.75);
  const cheapest = sample[0].value;
  return {
    count: total,
    sample: sample.length,
    sellers,
    cheapest,
    low,
    high,
    median: median(values),
    ignored,
    ignoredHigh: noFixers.length - kept.length,
    unconverted,
    confidence: confidenceOf(values.length, sellers, low, high),
    // just under the cheapest serious listing, to sell quickly
    sell: values[0] * 0.95,
    ratesAt: at,
  };
}

export function setTradeSummary(
  total: number,
  listings: readonly SummaryListing[],
) {
  // rates too old or missing: ask the Economy tab for fresh ones (the summary
  // is rebuilt when they arrive)
  requestFreshRates();
  tradeSummary.value = summarizeListings(
    total,
    listings,
    rates.value,
    ratesAt.value,
  );
}

export function clearTradeSummary() {
  tradeSummary.value = null;
}
