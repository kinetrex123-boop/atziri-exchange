// Atziri Exchange: "Setup farm" tab of Shift + Space. One card per farming
// strategy: a title, trade links that can be renamed, a screenshot and notes.
// Cards are saved on this PC (localStorage), screenshots in IndexedDB (too big
// for localStorage). The overlay and the detached window stay in sync.
import { shallowRef } from "vue";

export const LINK_SLOTS = 5;

export interface SetupLink {
  name: string;
  url: string;
}

export interface SetupCard {
  id: number;
  title: string;
  links: SetupLink[]; // always LINK_SLOTS entries (empty url = free slot)
  notes: string;
  imageId: number | null;
  thumbId: number | null; // small screenshot (tablet size)
  color: string | null; // card color, null = theme
}

const KEY = "atziri-farm-setups";

function emptyLinks(): SetupLink[] {
  return Array.from({ length: LINK_SLOTS }, () => ({ name: "", url: "" }));
}

function clean(raw: unknown): SetupCard[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c) => c && typeof c === "object" && typeof c.id === "number")
    .map((c) => {
      const links = emptyLinks();
      if (Array.isArray(c.links)) {
        c.links
          .slice(0, LINK_SLOTS)
          .forEach((l: Partial<SetupLink> | null, i: number) => {
            links[i] = {
              name: typeof l?.name === "string" ? l.name : "",
              url: typeof l?.url === "string" ? l.url : "",
            };
          });
      }
      return {
        id: c.id,
        title: typeof c.title === "string" ? c.title : "",
        links,
        notes: typeof c.notes === "string" ? c.notes : "",
        imageId: typeof c.imageId === "number" ? c.imageId : null,
        thumbId: typeof c.thumbId === "number" ? c.thumbId : null,
        color:
          typeof c.color === "string" && /^#[0-9a-f]{6}$/i.test(c.color)
            ? c.color
            : null,
      };
    });
}

function load(): SetupCard[] {
  try {
    return clean(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export const setups = shallowRef<SetupCard[]>(load());

function save(list: SetupCard[]) {
  setups.value = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // storage unavailable
  }
}

window.addEventListener("storage", (e) => {
  if (e.key === KEY) {
    setups.value = load();
    loadImages();
  }
});

function newId(): number {
  return Math.max(Date.now(), ...setups.value.map((c) => c.id + 1));
}

/** new empty card, placed after `afterId` (or at the end) */
export function addCard(afterId?: number): number {
  const card: SetupCard = {
    id: newId(),
    title: "",
    links: emptyLinks(),
    notes: "",
    imageId: null,
    thumbId: null,
    color: null,
  };
  const list = [...setups.value];
  const at = afterId == null ? -1 : list.findIndex((c) => c.id === afterId);
  list.splice(at === -1 ? list.length : at + 1, 0, card);
  save(list);
  return card.id;
}

/** copy of a card (same links, notes and screenshot) placed right after it */
export async function duplicateCard(id: number): Promise<number | null> {
  const src = setups.value.find((c) => c.id === id);
  if (!src) return null;
  const copyImage = async (from: number | null, offset: number) => {
    const blob = from != null ? await idbGet(from) : undefined;
    if (!blob) return null;
    const to = newId() + offset;
    await idbPut(to, blob);
    setImageUrl(to, blob);
    return to;
  };
  const copy: SetupCard = {
    id: newId(),
    title: src.title ? `${src.title} (2)` : "",
    links: src.links.map((l) => ({ ...l })),
    notes: src.notes,
    imageId: await copyImage(src.imageId, 1),
    thumbId: await copyImage(src.thumbId, 2),
    color: src.color,
  };
  const list = [...setups.value];
  list.splice(list.findIndex((c) => c.id === id) + 1, 0, copy);
  save(list);
  return copy.id;
}

export async function deleteCard(id: number) {
  const card = setups.value.find((c) => c.id === id);
  save(setups.value.filter((c) => c.id !== id));
  if (card?.imageId != null) await dropImage(card.imageId);
  if (card?.thumbId != null) await dropImage(card.thumbId);
}

export function moveCard(id: number, delta: -1 | 1) {
  const list = [...setups.value];
  const i = list.findIndex((c) => c.id === id);
  const j = i + delta;
  if (i === -1 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  save(list);
}

function patch(id: number, fn: (c: SetupCard) => SetupCard) {
  save(setups.value.map((c) => (c.id === id ? fn(c) : c)));
}

export function setTitle(id: number, title: string) {
  patch(id, (c) => ({ ...c, title }));
}

export function setColor(id: number, color: string | null) {
  patch(id, (c) => ({ ...c, color }));
}

export function setNotes(id: number, notes: string) {
  patch(id, (c) => ({ ...c, notes }));
}

export function setLink(id: number, slot: number, link: SetupLink) {
  patch(id, (c) => {
    const links = c.links.map((l, i) => (i === slot ? { ...link } : l));
    return { ...c, links };
  });
}

// ---- screenshots (IndexedDB) ----
const DB_NAME = "atziri-farm-setups";
const STORE = "images";
let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(d.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      }),
  );
}

const idbGet = (id: number) =>
  run<Blob | undefined>("readonly", (s) => s.get(id)).catch(() => undefined);
const idbPut = (id: number, blob: Blob) =>
  run<unknown>("readwrite", (s) => s.put(blob, id));
const idbDel = (id: number) =>
  run<unknown>("readwrite", (s) => s.delete(id)).catch(() => undefined);

/** imageId -> object URL shown in the cards */
export const imageUrls = shallowRef(new Map<number, string>());

function setImageUrl(imageId: number, blob: Blob) {
  const map = new Map(imageUrls.value);
  const old = map.get(imageId);
  if (old) URL.revokeObjectURL(old);
  map.set(imageId, URL.createObjectURL(blob));
  imageUrls.value = map;
}

async function dropImage(imageId: number) {
  await idbDel(imageId);
  const map = new Map(imageUrls.value);
  const old = map.get(imageId);
  if (old) URL.revokeObjectURL(old);
  map.delete(imageId);
  imageUrls.value = map;
}

export async function loadImages() {
  for (const c of setups.value) {
    for (const imageId of [c.imageId, c.thumbId]) {
      if (imageId == null || imageUrls.value.has(imageId)) continue;
      const blob = await idbGet(imageId);
      if (blob) setImageUrl(imageId, blob);
    }
  }
}

/** big screenshots are shrunk (at most 1600 px wide, JPEG) to keep the PC light */
async function shrink(file: Blob): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / bmp.width, 1600 / bmp.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.86),
    );
    return out && out.size < file.size ? out : file;
  } catch {
    return file;
  }
}

export type ImageSlot = "imageId" | "thumbId";

/** puts a screenshot on a card (replaces the previous one) */
export async function setImage(
  id: number,
  file: Blob,
  slot: ImageSlot = "imageId",
): Promise<boolean> {
  const card = setups.value.find((c) => c.id === id);
  if (!card || !file.type.startsWith("image/")) return false;
  const blob = await shrink(file);
  const imageId = newId();
  try {
    await idbPut(imageId, blob);
  } catch {
    return false;
  }
  setImageUrl(imageId, blob);
  const old = card[slot];
  patch(id, (c) => ({ ...c, [slot]: imageId }));
  if (old != null) await dropImage(old);
  return true;
}

export async function removeImage(id: number, slot: ImageSlot = "imageId") {
  const card = setups.value.find((c) => c.id === id);
  const old = card?.[slot];
  if (old == null) return;
  patch(id, (c) => ({ ...c, [slot]: null }));
  await dropImage(old);
}

loadImages();
