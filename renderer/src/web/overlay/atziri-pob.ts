// Atziri Exchange: calls to the Path of Building bridge (main process)
export interface PobStatus {
  pobFound: boolean;
  engineFound: boolean;
  buildsDir: string;
  builds: Array<{ file: string; name: string; mtime: number }>;
  selected: string;
  current: string | null;
  lastError: string | null;
  ninja: { account: string; league: string; character: string } | null;
  ninjaUpdatedUtc: string | null;
  ninjaCheckedAt: number | null;
  ninjaError: string | null;
  ninjaAuto: boolean;
}

export type PobStats = Record<string, number>;

export interface PobBuild {
  file: string;
  className?: string;
  ascendancy?: string;
  level?: number;
  mainSkill?: string;
  mainDps: number;
  stats: PobStats;
  skills: Array<{
    label: string;
    dps: number;
    gems?: Array<{ name: string; level?: number; quality?: number; support: boolean }>;
    crit?: number;
    critMulti?: number;
    speed?: number;
    hit?: number;
    average?: number;
  }>;
  equipment: Array<{ slot: string; name: string; rarity: string }>;
}

export interface PobCompare {
  item: string;
  lines?: string[];
  slots: Array<{
    slot: string;
    current?: string;
    currentLines?: string[];
    before: PobStats;
    after: PobStats;
  }>;
  skills: Array<{
    label: string;
    before: number;
    after: number[];
    statsBefore?: PobStats;
    statsAfter?: PobStats[];
  }>;
}

async function json<T>(r: Response): Promise<T> {
  const body = (await r.json()) as T & { error?: string };
  if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
  return body;
}

export async function pobStatus() {
  return await json<PobStatus>(await fetch("/atziri-pob/status"));
}
export async function pobSelect(file: string) {
  return await json<PobStatus>(
    await fetch(`/atziri-pob/select?file=${encodeURIComponent(file)}`, { method: "POST" }),
  );
}
export async function pobStats() {
  return await json<PobBuild>(await fetch("/atziri-pob/stats"));
}
export async function pobCompare(itemText: string) {
  return await json<PobCompare>(
    await fetch("/atziri-pob/compare", { method: "POST", body: itemText }),
  );
}
export async function pobOpen() {
  await fetch("/atziri-pob/open", { method: "POST" });
}

/** PoB slot names in the overlay language */
export function slotLabel(slot: string, fr: boolean) {
  if (!fr) return slot;
  const FR: Record<string, string> = {
    "Weapon 1": "Arme",
    "Weapon 2": "Arme secondaire",
    "Helmet": "Casque",
    "Body Armour": "Torse",
    "Gloves": "Gants",
    "Boots": "Bottes",
    "Amulet": "Amulette",
    "Ring 1": "Anneau 1",
    "Ring 2": "Anneau 2",
    "Belt": "Ceinture",
    "Charm 1": "Charme 1",
    "Charm 2": "Charme 2",
    "Charm 3": "Charme 3",
    "Flask 1": "Flacon de vie",
    "Flask 2": "Flacon de mana",
  };
  return FR[slot] ?? slot;
}

export function fmtNum(n: number | undefined, fr: boolean) {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const v = abs >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
  if (abs >= 1e6) return (n / 1e6).toLocaleString(fr ? "fr-FR" : "en-GB", { maximumFractionDigits: 2 }) + " M";
  return v.toLocaleString(fr ? "fr-FR" : "en-GB");
}

/** follows a character on poe.ninja (profile link pasted by the player) */
export async function pobSelectNinja(url: string) {
  return await json<PobStatus>(
    await fetch(`/atziri-pob/select?file=ninja&url=${encodeURIComponent(url)}`, {
      method: "POST",
    }),
  );
}

/** asks poe.ninja to fetch the character again (needs the poe.ninja login) */
export async function pobNinjaRefresh() {
  return await json<PobStatus & { refresh: "ok" | "login" | "cooldown" | "error" }>(
    await fetch("/atziri-pob/ninja-refresh", { method: "POST" }),
  );
}
export async function pobNinjaAuto(on: boolean) {
  return await json<PobStatus>(
    await fetch(`/atziri-pob/ninja-auto?on=${on ? 1 : 0}`, { method: "POST" }),
  );
}
