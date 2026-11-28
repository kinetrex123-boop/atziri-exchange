// Atziri Exchange: backup file of everything Atziri saves on this PC
// (Atziri réglage > Sauvegarde): Farm journal and Setup cards, craft sessions
// and methods, favorites, history, themes, settings of the page... One JSON
// file, images included (base64), to keep a copy or move them to another PC.
import {
  backupSetups,
  restoreSetups,
} from "./atziri-farm-setup";
import {
  backupMethods,
  restoreMethods,
  countRestorableMethods,
} from "./atziri-craft-methods";

const FORMAT = "atziri-backup";
/** 1: Setup cards and methods only; 2: every saved key (audit R1) */
const VERSION = 2;

// restored by their own module (with their images), not as raw keys
const KEYS_WITH_IMAGES = new Set(["atziri-farm-setups", "atziri-craft-methods"]);
// meaningless on another PC or another day
const VOLATILE_KEYS = new Set(["atziri-farm-alive"]);

interface BackupFile {
  format: typeof FORMAT;
  version: number;
  savedAt: string;
  farmSetups?: unknown;
  craftMethods?: unknown;
  farmImages?: Record<string, string>; // image id -> data: URL
  craftImages?: Record<string, string>;
  /** version 2: every other "atziri-…" key of the storage, raw */
  storage?: Record<string, string>;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(url: string): Promise<Blob | null> {
  if (!/^data:image\/[a-z0-9.+-]+;base64,/i.test(url)) return null;
  try {
    return await (await fetch(url)).blob();
  } catch {
    return null;
  }
}

/** every "atziri-…" key of the storage, except the ones saved apart */
function storageKeys(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith("atziri")) continue;
    if (KEYS_WITH_IMAGES.has(k) || VOLATILE_KEYS.has(k)) continue;
    const v = localStorage.getItem(k);
    if (v != null) out[k] = v;
  }
  return out;
}

/** builds the backup and downloads it as a .json file */
export async function exportBackup(
  suffix = "",
): Promise<{ setups: number; methods: number; keys: number }> {
  const farm = await backupSetups();
  const craft = await backupMethods();
  const toUrls = async (m: Map<number, Blob>) => {
    const out: Record<string, string> = {};
    for (const [id, blob] of m) out[String(id)] = await blobToDataUrl(blob);
    return out;
  };
  const storage = storageKeys();
  const file: BackupFile = {
    format: FORMAT,
    version: VERSION,
    savedAt: new Date().toISOString(),
    farmSetups: farm.cards,
    craftMethods: craft.data,
    farmImages: await toUrls(farm.images),
    craftImages: await toUrls(craft.images),
    storage,
  };
  const day = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(file)], { type: "application/json" }),
  );
  a.download = `atziri-sauvegarde-${day}${suffix}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  return {
    setups: farm.cards.length,
    methods: craft.data.methods.length,
    keys: Object.keys(storage).length,
  };
}

export interface ParsedBackup {
  file: BackupFile;
  setups: number;
  methods: number; // methods that will really be restored
  keys: number; // other saved data (journal, sessions, favorites...)
  savedAt: string;
}

/**
 * Reads and checks a backup file; null if it is not one, or if it was made
 * by a newer version of Atziri. The counts are the ones that will really be
 * restored (a broken list of methods counts 0 and is left untouched).
 */
export async function readBackup(f: File): Promise<ParsedBackup | null> {
  try {
    const file = JSON.parse(await f.text()) as BackupFile;
    if (!file || file.format !== FORMAT) return null;
    if (typeof file.version !== "number" || file.version > VERSION) return null;
    const storage =
      file.storage && typeof file.storage === "object" ? file.storage : {};
    const keys = Object.entries(storage).filter(
      ([k, v]) =>
        k.startsWith("atziri") &&
        typeof v === "string" &&
        !KEYS_WITH_IMAGES.has(k) &&
        !VOLATILE_KEYS.has(k),
    ).length;
    return {
      file,
      setups: Array.isArray(file.farmSetups) ? file.farmSetups.length : 0,
      methods: countRestorableMethods(file.craftMethods) ?? 0,
      keys,
      savedAt: typeof file.savedAt === "string" ? file.savedAt : "",
    };
  } catch {
    return null;
  }
}

async function toBlobs(rec: Record<string, string> | undefined) {
  const images = new Map<number, Blob>();
  for (const [id, url] of Object.entries(rec ?? {})) {
    const blob = typeof url === "string" ? await dataUrlToBlob(url) : null;
    if (blob && Number.isFinite(Number(id))) images.set(Number(id), blob);
  }
  return images;
}

/**
 * Replaces the saved data with the backup. The current data is first
 * downloaded as a backup of its own ("…-avant-import.json"), so an import is
 * never a way to lose anything. Returns true when the page must be reloaded
 * (other data than the Setup cards and the methods was restored).
 */
export async function importBackup(b: ParsedBackup): Promise<boolean> {
  await exportBackup("-avant-import");
  if (Array.isArray(b.file.farmSetups)) {
    await restoreSetups(b.file.farmSetups, await toBlobs(b.file.farmImages));
  }
  if (countRestorableMethods(b.file.craftMethods) != null) {
    await restoreMethods(
      b.file.craftMethods,
      await toBlobs(b.file.craftImages),
    );
  }
  let restored = 0;
  for (const [k, v] of Object.entries(b.file.storage ?? {})) {
    if (!k.startsWith("atziri") || typeof v !== "string") continue;
    if (KEYS_WITH_IMAGES.has(k) || VOLATILE_KEYS.has(k)) continue;
    localStorage.setItem(k, v); // a failure stops the import (shown as failed)
    restored++;
  }
  return restored > 0;
}
