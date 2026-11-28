import { describe, it, expect, beforeAll, vi } from "vitest";

// the module reads the storage and listens to the window when imported
const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
});

let farm: typeof import("@/web/overlay/atziri-farm");
beforeAll(async () => {
  farm = await import("@/web/overlay/atziri-farm");
});

const H = 3600000;

describe("Farm", () => {
  // audit F1: game quit inside a map at 23:00, app relaunched the next day
  it("closes a timer left running at the last sign of life", () => {
    const sess = farm.newSession("t", 1);
    sess.maps[0].enteredAt = 0;
    const state = { sessions: [sess], currentId: sess.id, autoTimer: true };
    expect(farm.closeStaleTimers(state, 10 * 60000)).toBe(true);
    expect(sess.maps[0].enteredAt).toBeNull();
    expect(sess.maps[0].timeMs).toBe(10 * 60000);
    // a sign of life older than the start adds nothing
    sess.maps[0].enteredAt = 20 * H;
    farm.closeStaleTimers(state, 60000);
    expect(sess.maps[0].timeMs).toBe(10 * 60000);
  });

  // audit F5: net profit per hour, investment spread over all the maps
  it("computes net figures", () => {
    const sess = farm.newSession("t", 4);
    sess.invested = 8;
    sess.maps[0].divines = 5;
    sess.maps[0].timeMs = 0.5 * H;
    sess.maps[1].divines = 3;
    sess.maps[1].timeMs = 0.5 * H;
    const t = farm.totals(sess, 0);
    expect(t.investedPerMap).toBe(2);
    expect(t.profitPerMap).toBe(2); // 4 gained per map - 2 invested per map
    expect(t.perHour).toBe(4); // (8 gained - 2 × 2 invested) / 1 h
    expect(t.profit).toBe(0);
  });
});
