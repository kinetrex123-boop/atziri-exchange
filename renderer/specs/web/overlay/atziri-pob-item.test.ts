import { describe, it, expect, beforeAll } from "vitest";
import { setupTests } from "@specs/vitest.setup";
import { init } from "@/assets/data";
import { parseClipboard } from "@/parser";
import { toPobItem, pickEnMatcher } from "@/web/overlay/atziri-pob-item";

// a rune and a mod with the same stat: each must keep its own value (audit B1)
const BOOTS = `Item Class: Boots
Rarity: Rare
Gale Tread
Iron Greaves
--------
Armour: 120
--------
Requires: Level 54
--------
Item Level: 82
--------
+12% to Fire Resistance (rune)
--------
{ Suffix Modifier "of the Furnace" (Tier: 2) — Elemental, Fire, Resistance }
+38(36-40)% to Fire Resistance
`;

describe("Ctrl + B: item for Path of Building", () => {
  beforeAll(async () => {
    setupTests();
    await init("en");
  });

  it("keeps the mod's own value when a rune has the same stat", async () => {
    const parsed = parseClipboard(BOOTS);
    if (parsed.isErr()) throw new Error(String(parsed.error));
    const item = parsed._unsafeUnwrap();
    const pob = await toPobItem(item, BOOTS);
    expect(pob.text).toContain("{rune}+12% to Fire Resistance");
    expect(pob.text).toContain("\n+38% to Fire Resistance");
    expect(pob.text).not.toContain("\n+12% to Fire Resistance");
  });

  // audit B3: same position, opposite sign between French and English
  it("never takes an English wording of the opposite sign", () => {
    const fr = { string: "#% d'Augmentation du Taux de régénération du Mana en étant stationnaire" };
    const en = [
      { string: "#% increased Mana Regeneration Rate while stationary" },
      { string: "#% reduced Mana Regeneration Rate while stationary", negate: true },
    ];
    expect(pickEnMatcher(fr, 1, en)).toBe(en[0]);
    expect(pickEnMatcher({ string: "# réduit", negate: true }, 0, en)).toBe(en[1]);
    expect(pickEnMatcher({ string: "#", negate: true }, 0, [en[0]])).toBeUndefined();
  });
});
