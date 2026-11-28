import { describe, it, expect, beforeAll } from "vitest";
import { setupTests } from "@specs/vitest.setup";
import { init } from "@/assets/data";
import { parseClipboard } from "@/parser";
import { analyseWell } from "@/web/overlay/atziri-well";
import { matchItem } from "@/web/overlay/atziri-runes";
import { matchReveal } from "@/web/overlay/atziri-well-reveal";

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
{ Prefix Modifier "Healthy" (Tier: 3) — Life }
+29(20-29) to maximum Life
{ Suffix Modifier "of the Seal" (Tier: 4) — Elemental, Cold, Resistance }
+20(16-20)% to Cold Resistance
{ Prefix Modifier "Runner's" (Tier: 3) — Speed }
20% increased Movement Speed
`;

describe("Well of Souls", () => {
  beforeAll(async () => {
    setupTests();
    await init("en");
  });

  it("lists the reachable modifiers of a rare item", async () => {
    const parsed = parseClipboard(BOOTS);
    expect(parsed.isOk()).toBe(true);
    const r = await analyseWell(parsed._unsafeUnwrap(), "preserved", "none");
    expect(r.itemClass).toBe("Boots");
    expect(r.prefixes).toBe(2);
    expect(r.suffixes).toBe(1);
    expect(r.sides).toEqual(["p", "s"]);
    // life and movement speed already on the item: their families are removed
    expect(r.presentGroups).toContain("IncreasedLife");
    const all = [...r.ordinary, ...r.desecrated].flatMap((f) => f.tiers.map((t) => t.mod));
    expect(all.some((m) => m.gr.includes("IncreasedLife"))).toBe(false);
    expect(all.some((m) => m.gr.includes("MovementVelocity"))).toBe(false);
    expect(r.desecrated.length).toBeGreaterThan(0);
    expect(r.ordinary.length).toBeGreaterThan(0);
    // shares of each pool add up to 100 %
    const sum = r.ordinary.reduce((s, f) => s + f.share, 0);
    expect(sum).toBeCloseTo(1, 5);
    // no modifier above the item level
    expect(all.every((m) => m.l <= 82)).toBe(true);
    // eslint-disable-next-line no-console
    console.log(
      r.desecrated.slice(0, 4).map((f) => `${f.lord} ${(f.share * 100).toFixed(1)}% T${f.tiers[0].tier} ${f.tiers[0].text.join(" / ")}`),
      r.ordinary.slice(0, 4).map((f) => `${(f.share * 100).toFixed(1)}% T${f.tiers[0].tier}/${f.maxTier} ${f.tiers[0].text.join(" / ")}`),
    );
  });

  it("follows the omen and the bone", async () => {
    const item = parseClipboard(BOOTS)._unsafeUnwrap();
    const liege = await analyseWell(item, "preserved", "liege");
    expect(liege.desecrated.every((f) => f.lord === "Amanamu" || !f.lord)).toBe(true);
    const ancient = await analyseWell(item, "ancient", "none");
    const tiers = [...ancient.ordinary, ...ancient.desecrated].flatMap((f) => f.tiers);
    expect(tiers.every((t) => t.mod.l >= 40)).toBe(true);
    const gnawed = await analyseWell(item, "gnawed", "none");
    expect(gnawed.warnings).toContain("gnawed-ilvl");
    expect(gnawed.desecrated.flatMap((f) => f.tiers).every((t) => t.mod.l <= 64)).toBe(true);
  });

  it("only offers the side of an unrevealed modifier", async () => {
    const text = BOOTS + `{ Suffix Modifier }\nDesecrated Suffix\n`;
    const r = await analyseWell(parseClipboard(text)._unsafeUnwrap(), "preserved", "none");
    expect(r.veiled.s).toBe(1);
    expect(r.sides).toEqual(["s"]);
    expect([...r.ordinary, ...r.desecrated].every((f) => f.g === "s")).toBe(true);
  });
});

describe("Well of Souls choices on screen (French client)", () => {
  beforeAll(async () => {
    setupTests({ language: "fr" });
    await init("fr");
  });
  // audit A1: a value that fits no range gets no tier (and no crown)
  it("shows no tier when the value read fits no range", async () => {
    const line = (t: string, y: number) => ({ t, x: 100, y, w: 300, h: 20 });
    const scan = await matchReveal(
      [line("MANCHETTES ANTIQUES", 10), line("+9999 au Score de Précision", 300)],
      1,
    );
    expect(scan.badges.length).toBe(1);
    expect(scan.badges[0].tier).toBeUndefined();
    expect(scan.badges[0].outOfRange).toBe(true);
  });
  it("finds the tier of each choice", async () => {
    const line = (t: string, y: number) => ({ t, x: 100, y, w: 300, h: 20 });
    const scan = await matchReveal(
      [
        line("MANCHETTES ANTIQUES", 10),
        line("Armure: 89", 40),
        line("+131 au Score de Précision", 300),
        line("Ajoute 11 à 25 Dégâts Physiques aux Attaques", 380),
        line("Ajoute 28 à 39 Dégâts de Feu aux Attaques", 460),
      ],
      1,
    );
    // eslint-disable-next-line no-console
    console.log(scan.base, scan.badges.map((b) => `${b.line} => T${b.tier}/${b.count}${b.approx ? "~" : ""} lvl ${b.level} ${b.name}`));
    expect(scan.base).toBe("Ancient Cuffs");
    expect(scan.badges.length).toBe(3);
    expect(scan.badges.every((b) => !b.approx)).toBe(true);
  });

  it("staff: hybrid choice, cold damage on a fire staff", async () => {
    const line = (t: string, y: number) => ({ t, x: 100, y, w: 300, h: 20 });
    const scan = await matchReveal(
      [
        line("BÂTON CENDREUX", 10),
        line("61% d'Augmentation des Dégâts des Sorts", 300),
        line("+62 de Mana maximal", 324),
        line("Rajoute 53% des Dégâts sous forme de Dégâts de Froid", 400),
        line("+165 de Mana maximal", 480),
      ],
      1,
    );
    // eslint-disable-next-line no-console
    console.log(scan.base, scan.badges.map((b) => `${b.line} => T${b.tier}/${b.count} lvl ${b.level} ${b.lord ?? ""}`));
    expect(scan.base).toBe("Ashen Staff");
    expect(scan.badges.length).toBe(3);
    expect(scan.badges[0].lord).toBeUndefined(); // spell damage + mana hybrid, not Amanamu
    expect(scan.badges[1].tier).toBe(2); // 53% cold: T2 of 6
    expect(scan.badges[1].count).toBe(6);
  });

  it("lines really read in game (Roaring Staff)", async () => {
    const line = (t: string, y: number, x = 100) => ({ t, x, y, w: 300, h: 18 });
    const scan = await matchReveal(
      [
        line("LE PUITS DES ÂMES", 5),
        line("RAJOUTE 56% DES DÉGÂTS SOUS FORME DE DÉGÂTS DE FROID", 300),
        line("37% D'AUGMENTATION DES DÉGÂTS DES SORTS", 380),
        line("+34 DE MANA MAXIMAL", 400),
        line("800/0 D'AUGMENTATION DES DÉGÂTS DE FROID", 470),
        line("+265 DE MANA MAXIMAL", 550),
        line("BÂTON RUGISSANT", 20, 900),
        line("D'AUGMENTATION DES DÉGÂTS DE FROID", 60, 900),
        line("V Tl 18 .NIV.81", 80, 900),
        line("RAJOUTE 59% DES DÉGÂTS SOUS FORME DE T2 .NIV.65", 100, 900),
        line("1040/6 D'AUGMENTATION DES DÉGÂTS DES SORTS", 640),
      ],
      1,
    );
    const out = scan.badges.map((b) => `${b.line} => T${b.tier}/${b.count} lvl ${b.level}`);
    // eslint-disable-next-line no-console
    console.log(out);
    expect(scan.base).toBe("Roaring Staff");
    // "800/0" is 80 %, not 800: not the top tier
    const cold = scan.badges.find((b) => b.line.startsWith("80%"));
    expect(cold).toBeDefined();
    expect(cold!.level).toBeLessThan(81);
    expect(scan.badges.some((b) => /NIV/.test(b.line))).toBe(false);
    expect(scan.badges.some((b) => b.line.startsWith("D'AUGMENTATION"))).toBe(false);
    expect(scan.badges.find((b) => b.line.startsWith("104%"))).toBeDefined();
  });

  it("ring: modifier wrapped on two lines", async () => {
    const line = (t: string, y: number, x = 160) => ({ t, x, y, w: 440, h: 18 });
    const scan = await matchReveal(
      [
        line("+13 D'INTELLIGENCE", 460, 300),
        line("+6 DE DEXTÉRITÉ", 540, 310),
        line("DRAINE 6.36% DES DÉGÂTS PHYSIQUES D'ATTAQUE SOUS", 608),
        line("FORME DE VIE", 630, 330),
      ],
      1,
    );
    const out = scan.badges.map((b) => `${b.line} => T${b.tier}/${b.count} lvl ${b.level}`);
    // eslint-disable-next-line no-console
    console.log(out);
    expect(scan.badges.some((b) => b.line.startsWith("DRAINE"))).toBe(true);
  });

  it("staff: single spell damage line", async () => {
    const line = (t: string, y: number) => ({ t, x: 100, y, w: 300, h: 20 });
    const scan = await matchReveal(
      [
        line("BÂTON CENDREUX", 10),
        line("+185 de Mana maximal", 300),
        line("Rajoute 58% des Dégâts sous forme de Dégâts de Feu", 380),
        line("79% d'Augmentation des Dégâts des Sorts", 460),
      ],
      1,
    );
    // eslint-disable-next-line no-console
    console.log(scan.badges.map((b) => `${b.line} => T${b.tier}/${b.count} lvl ${b.level}`));
    expect(scan.badges.length).toBe(3);
  });
});

describe("Rune Rewards (French client)", () => {
  beforeAll(async () => {
    setupTests({ language: "fr" });
    await init("fr");
  });
  it("reads the French panel lines", () => {
    expect(matchItem("lx Orbe de joaillier mineur", true)?.name).toBe("Orbe de joaillier mineur");
    expect(matchItem("1x Gemme d'esprit brute (Niveau 19) Ge", true)?.name).toBe(
      "Gemme d'esprit brute (Niveau 19)",
    );
    expect(matchItem("3x Orbe royal", true)).toEqual({ name: "Orbe royal", qty: 3 });
    expect(matchItem("Orbe d'augmentation majeur", true)).toBeNull();
  });
});

describe("Rune Rewards", () => {
  beforeAll(async () => {
    setupTests();
    await init("en");
  });
  it("reads quantities and fixes small OCR mistakes", () => {
    expect(matchItem("3x Greater Exalted Orb")).toEqual({ name: "Greater Exalted Orb", qty: 3 });
    expect(matchItem("Divine Orb")).toEqual({ name: "Divine Orb", qty: 1 });
    // eslint-disable-next-line no-console
    console.log(matchItem("5x Lesser Regal 0rb"), matchItem("Greater Regal 0rb"), matchItem("Orb of Augmentaton"));
    expect(matchItem("2x Greater Regal 0rb")).toEqual({ name: "Greater Regal Orb", qty: 2 });
    expect(matchItem("Runeshape")).toBeNull();
    // tooltip text next to the panel: ignored once quantities are required
    expect(matchItem("Greater Exalted Orb", true)).toBeNull();
    expect(matchItem("1x Greater Exalted Orb", true)?.name).toBe("Greater Exalted Orb");
    // "1x" read as "lx" / "Ix", tooltip word glued at the end
    expect(matchItem("lx Greater Exalted Orb", true)).toEqual({ name: "Greater Exalted Orb", qty: 1 });
    expect(matchItem("Ix Divine Orb Ge", true)).toEqual({ name: "Divine Orb", qty: 1 });
    expect(matchItem("Unique Helmet")).toBeNull();
  });
});
