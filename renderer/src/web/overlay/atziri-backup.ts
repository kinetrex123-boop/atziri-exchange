// Atziri Exchange: backup file of the Farm > Setup cards and of the craft
// methods (Atziri réglage > Sauvegarde). One JSON file, images included
// (base64), to keep a copy or move them to another PC.
import { backupSetups, restoreSetups } from "./atziri-farm-setup";
import { backupMethods, restoreMethods } from "./atziri-craft-methods";

const FORMAT = "atziri-backup";

interface BackupFile {
  format: typeof FORMAT;
  version: 1;
  savedAt: string;
  farmSetups?: unknown;
  craftMethods?: unknown;
  farmImages?: Record<string, string>; // image id -> data: URL
  craftImages?: Record<string, string>;
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

/** builds the backup and downloads it as a .json file */
export async function exportBackup(): Promise<{ setups: number; methods: number }> {
  const farm = await backupSetups();
  const craft = await backupMethods();
  const toUrls = async (m: Map<number, Blob>) => {
    const out: Record<string, string> = {};
    for (const [id, blob] of m) out[String(id)] = await blobToDataUrl(blob);
    return out;
  };
  const file: BackupFile = {
    format: FORMAT,
    version: 1,
    savedAt: new Date().toISOString(),
    farmSetups: farm.cards,
    craftMethods: craft.data,
    farmImages: await toUrls(farm.images),
    craftImages: await toUrls(craft.images),
  };
  const day = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: "application/json" }));
  a.download = `atziri-sauvegarde-${day}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  return { setups: farm.cards.length, methods: craft.data.methods.length };
}

export interface ParsedBackup {
  file: BackupFile;
  setups: number;
  methods: number;
  savedAt: string;
}

/** reads a backup file; null if it is not one */
export async function readBackup(f: File): Promise<ParsedBackup | null> {
  try {
    const file = JSON.parse(await f.text()) as BackupFile;
    if (!file || file.format !== FORMAT) return null;
    const methods = (file.craftMethods as { methods?: unknown[] } | undefined)?.methods;
    return {
      file,
      setups: Array.isArray(file.farmSetups) ? file.farmSetups.length : 0,
      methods: Array.isArray(methods) ? methods.length : 0,
      savedAt: typeof file.savedAt === "string" ? file.savedAt : "",
    };
  } catch {
    return null;
  }
}

/** replaces the Farm > Setup cards and the craft methods with the backup */
async function toBlobs(rec: Record<string, string> | undefined) {
  const images = new Map<number, Blob>();
  for (const [id, url] of Object.entries(rec ?? {})) {
    const blob = typeof url === "string" ? await dataUrlToBlob(url) : null;
    if (blob && Number.isFinite(Number(id))) images.set(Number(id), blob);
  }
  return images;
}

export async function importBackup(b: ParsedBackup) {
  if (Array.isArray(b.file.farmSetups)) {
    await restoreSetups(b.file.farmSetups, await toBlobs(b.file.farmImages));
  }
  if (b.file.craftMethods) {
    await restoreMethods(b.file.craftMethods, await toBlobs(b.file.craftImages));
  }
}
