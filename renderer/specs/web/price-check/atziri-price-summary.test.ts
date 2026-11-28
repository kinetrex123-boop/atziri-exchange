import { describe, it, expect } from "vitest";
import {
  summarizeListings,
  type SummaryListing,
} from "@/web/price-check/atziri-price-summary";

const R = { chaos: 100, exalted: 400 };

function div(
  values: number[],
  opts: { instant?: boolean; sameSeller?: boolean } = {},
): SummaryListing[] {
  return values.map((v, i) => ({
    priceAmount: v,
    priceCurrency: "divine",
    accountName: opts.sameSeller ? "seller" : `seller${i}`,
    isInstantBuyout: opts.instant ?? false,
  }));
}

describe("atziri price summary", () => {
  // audit P1: low instant-buyout listings are the real floor price
  it("never leaves out instant buyout listings", () => {
    const s = summarizeListings(
      12,
      div([0.5, 0.5, 0.5, 0.6, 3, 3.2, 3.4, 3.5, 3.6, 3.8, 3.9, 4], {
        instant: true,
      }),
      R,
    )!;
    expect(s.ignored).toBe(0);
    expect(s.cheapest).toBe(0.5);
    expect(s.median).toBeLessThan(3.5);
  });

  it("still leaves out cheap listings that cannot be bought instantly", () => {
    const s = summarizeListings(
      12,
      div([0.5, 0.5, 0.5, 0.6, 3, 3.2, 3.4, 3.5, 3.6, 3.8, 3.9, 4]),
      R,
    )!;
    expect(s.ignored).toBe(4);
    expect(s.cheapest).toBe(0.5); // still shown as the cheapest listing
  });

  // audit P1: [1, 2, 50] used to give 26
  it("does not judge price fixers on a tiny sample", () => {
    const s = summarizeListings(3, div([1, 2, 50]), R)!;
    expect(s.ignored).toBe(0);
    expect(s.median).toBe(2);
  });

  // audit P5: [1, 10] used to give 5.5 with a range of "1"
  it("gives a range that contains the price with two listings", () => {
    const s = summarizeListings(2, div([1, 10]), R)!;
    expect(s.median).toBe(5.5);
    expect(s.low).toBe(1);
    expect(s.high).toBe(10);
  });

  // audit P2: confidence from the kept listings and the sellers
  it("rates confidence on the kept listings and the sellers", () => {
    const many = div([1, 1, 1.05, 1.1, 1.1, 1.15, 1.2, 1.2, 1.25, 1.3]);
    expect(summarizeListings(500, many, R)!.confidence).toBe("high");
    const oneSeller = div([1, 1, 1.05, 1.1, 1.1, 1.15, 1.2, 1.2], {
      sameSeller: true,
    });
    const s = summarizeListings(500, oneSeller, R)!;
    expect(s.sellers).toBe(1);
    expect(s.confidence).toBe("low");
    expect(summarizeListings(500, div([1, 1.1]), R)!.confidence).toBe("low");
  });

  // audit P3: exalted listings without a rate are counted, not hidden
  it("counts the listings it could not convert", () => {
    const listings: SummaryListing[] = [
      { priceAmount: 50, priceCurrency: "exalted" },
      { priceAmount: 1, priceCurrency: "divine" },
    ];
    const s = summarizeListings(2, listings, {})!;
    expect(s.unconverted).toBe(1);
    expect(s.sample).toBe(1);
    const withRate = summarizeListings(2, listings, R)!;
    expect(withRate.unconverted).toBe(0);
    expect(withRate.cheapest).toBe(50 / 400);
  });

  // audit P4: the quick-sale price exists and sits under the cheapest kept
  it("suggests a quick-sale price just under the cheapest kept listing", () => {
    const s = summarizeListings(4, div([2, 2.2, 2.4, 2.6]), R)!;
    expect(s.sell).toBeCloseTo(1.9);
  });

  it("returns nothing without priced listings", () => {
    expect(summarizeListings(0, [], R)).toBeNull();
  });
});
