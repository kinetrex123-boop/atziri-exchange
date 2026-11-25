// Atziri Exchange: "Méthodes" view of the Craft tab. Crafting methods sorted in
// categories (League start, Avancé by default, more can be added). Each method
// has a trade link and a free notes board (text, arrows, frames, pasted images
// that can be moved and resized), which can be locked.
// Saved on this PC: methods in the localStorage, images in IndexedDB (too big
// for localStorage). The overlay and the detached window stay in sync.
import { shallowRef } from "vue";

export type BoardKind = "text" | "arrow" | "rect" | "image";

export interface BoardItem {
  id: number;
  kind: BoardKind;
  x: number;
  y: number;
  /** text, rect, image: size; arrow: end point (x2, y2) */
  w: number;
  h: number;
  x2: number;
  y2: number;
  color: string;
  text: string;
  size: number; // font size (text) or line width (arrow, rect)
  imageId: number | null;
}

export interface MethodLink {
  id: number;
  name: string;
  url: string;
}

export interface CraftMethod {
  id: number;
  catId: number;
  name: string;
  icon: string;
  /** the user's own icon (small PNG data URL), shown instead of `icon` */
  customIcon?: string;
  links: MethodLink[];
  locked: boolean;
  items: BoardItem[];
}

export interface MethodCategory {
  id: number;
  name: string;
}

export interface MethodsData {
  categories: MethodCategory[];
  methods: CraftMethod[];
}

export const BOARD_COLORS = [
  "#eadfcf",
  "#e0a64e",
  "#e05a4e",
  "#5ec97a",
  "#6aa8ff",
  "#c38cf2",
];

const KEY = "atziri-craft-methods";

function defaults(): MethodsData {
  return {
    categories: [
      { id: 1, name: "League start" },
      { id: 2, name: "Avancé" },
    ],
    methods: [],
  };
}

const num = (v: unknown, d = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : d;
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw JSON, checked field by field
type Raw = any;

function cleanItem(raw: Raw): BoardItem | null {
  if (!raw || typeof raw !== "object" || typeof raw.id !== "number")
    return null;
  const kind: BoardKind = ["text", "arrow", "rect", "image"].includes(raw.kind)
    ? raw.kind
    : "text";
  return {
    id: raw.id,
    kind,
    x: num(raw.x),
    y: num(raw.y),
    w: Math.max(10, num(raw.w, 200)),
    h: Math.max(10, num(raw.h, 40)),
    x2: num(raw.x2),
    y2: num(raw.y2),
    color: /^#[0-9a-f]{6}$/i.test(raw.color) ? raw.color : BOARD_COLORS[0],
    text: str(raw.text),
    size: Math.min(48, Math.max(1, num(raw.size, kind === "text" ? 15 : 3))),
    imageId: typeof raw.imageId === "number" ? raw.imageId : null,
  };
}

function cleanLinks(m: Raw): MethodLink[] {
  if (Array.isArray(m.links)) {
    return m.links
      .filter((l: Raw) => l && typeof l.url === "string" && l.url)
      .map((l: Raw, i: number) => ({
        id: typeof l.id === "number" ? l.id : i + 1,
        name: str(l.name, "Base"),
        url: l.url,
      }));
  }
  // first version: one link without a name
  return typeof m.url === "string" && m.url
    ? [{ id: 1, name: "Base", url: m.url }]
    : [];
}

function clean(raw: Raw): MethodsData {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.categories))
    return defaults();
  const categories: MethodCategory[] = raw.categories
    .filter((c: Raw) => c && typeof c.id === "number")
    .map((c: Raw) => ({ id: c.id, name: str(c.name, "?") }));
  const catIds = new Set(categories.map((c) => c.id));
  const methods: CraftMethod[] = (Array.isArray(raw.methods) ? raw.methods : [])
    .filter((m: Raw) => m && typeof m.id === "number" && catIds.has(m.catId))
    .map((m: Raw) => ({
      id: m.id,
      catId: m.catId,
      name: str(m.name, "?"),
      icon: str(m.icon, "armour"),
      ...(typeof m.customIcon === "string" &&
      m.customIcon.startsWith("data:image/")
        ? { customIcon: m.customIcon }
        : {}),
      links: cleanLinks(m),
      locked: m.locked === true,
      items: (Array.isArray(m.items) ? m.items : [])
        .map(cleanItem)
        .filter((i: BoardItem | null): i is BoardItem => i != null),
    }));
  return { categories, methods };
}

function load(): MethodsData {
  try {
    const saved = localStorage.getItem(KEY);
    return saved == null ? defaults() : clean(JSON.parse(saved));
  } catch {
    return defaults();
  }
}

export const methodsData = shallowRef<MethodsData>(load());

function save(data: MethodsData) {
  methodsData.value = data;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage unavailable
  }
}

window.addEventListener("storage", (e) => {
  if (e.key === KEY) {
    methodsData.value = load();
    loadImages();
  }
});

let lastId = 0;
export function newId(): number {
  lastId = Math.max(Date.now(), lastId + 1);
  return lastId;
}

/** method whose notes page is open (null = list) */
export const openMethodId = shallowRef<number | null>(null);

// ---- categories ----
export function addCategory(name: string): number {
  const id = newId();
  const d = methodsData.value;
  save({ ...d, categories: [...d.categories, { id, name }] });
  return id;
}
export function renameCategory(id: number, name: string) {
  const d = methodsData.value;
  save({
    ...d,
    categories: d.categories.map((c) => (c.id === id ? { ...c, name } : c)),
  });
}
export function deleteCategory(id: number) {
  const d = methodsData.value;
  save({
    categories: d.categories.filter((c) => c.id !== id),
    methods: d.methods.filter((m) => m.catId !== id),
  });
  gcImages();
}
export function moveCategory(id: number, delta: -1 | 1) {
  const list = [...methodsData.value.categories];
  const i = list.findIndex((c) => c.id === id);
  const j = i + delta;
  if (i === -1 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  save({ ...methodsData.value, categories: list });
}

// ---- methods ----
export function addMethod(
  catId: number,
  name: string,
  icon: string,
  customIcon?: string,
): number {
  const id = newId();
  const d = methodsData.value;
  const m: CraftMethod = {
    id,
    catId,
    name,
    icon,
    ...(customIcon ? { customIcon } : {}),
    links: [],
    locked: false,
    items: [],
  };
  save({ ...d, methods: [...d.methods, m] });
  return id;
}
export function updateMethod(id: number, fn: (m: CraftMethod) => CraftMethod) {
  const d = methodsData.value;
  save({ ...d, methods: d.methods.map((m) => (m.id === id ? fn(m) : m)) });
}
export function deleteMethod(id: number) {
  const d = methodsData.value;
  save({ ...d, methods: d.methods.filter((m) => m.id !== id) });
  if (openMethodId.value === id) openMethodId.value = null;
  gcImages();
}
/** moves a method before another one (beforeId) or at the end of a category */
export function placeMethod(
  id: number,
  catId: number,
  beforeId: number | null,
) {
  const d = methodsData.value;
  const m = d.methods.find((x) => x.id === id);
  if (!m || id === beforeId) return;
  const list = d.methods.filter((x) => x.id !== id);
  const moved = { ...m, catId };
  const at = beforeId == null ? -1 : list.findIndex((x) => x.id === beforeId);
  if (at === -1) list.push(moved);
  else list.splice(at, 0, moved);
  save({ ...d, methods: list });
}

// ---- images (IndexedDB) ----
const DB_NAME = "atziri-craft-methods";
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
const idbKeys = () =>
  run<IDBValidKey[]>("readonly", (s) => s.getAllKeys()).catch(
    () => [] as IDBValidKey[],
  );

/** imageId -> object URL shown on the boards */
export const imageUrls = shallowRef(new Map<number, string>());

function setImageUrl(imageId: number, blob: Blob) {
  const map = new Map(imageUrls.value);
  const old = map.get(imageId);
  if (old) URL.revokeObjectURL(old);
  map.set(imageId, URL.createObjectURL(blob));
  imageUrls.value = map;
}

function usedImages(): Set<number> {
  const used = new Set<number>();
  for (const m of methodsData.value.methods) {
    for (const it of m.items) if (it.imageId != null) used.add(it.imageId);
  }
  return used;
}

export async function loadImages() {
  for (const imageId of usedImages()) {
    if (imageUrls.value.has(imageId)) continue;
    const blob = await idbGet(imageId);
    if (blob) setImageUrl(imageId, blob);
  }
}

/**
 * Removes the images no board uses any more. Called when a notes page is
 * closed (its undo history is gone then) and at start.
 */
export async function gcImages() {
  const used = usedImages();
  const keys = await idbKeys();
  const map = new Map(imageUrls.value);
  for (const k of keys) {
    if (typeof k !== "number" || used.has(k)) continue;
    await idbDel(k);
    const url = map.get(k);
    if (url) URL.revokeObjectURL(url);
    map.delete(k);
  }
  imageUrls.value = map;
}

/** big screenshots are shrunk (at most 1600 px, JPEG) to keep the PC light */
async function shrink(
  file: Blob,
): Promise<{ blob: Blob; w: number; h: number }> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / bmp.width, 1600 / bmp.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.88),
    );
    return {
      blob: out && out.size < file.size ? out : file,
      w: canvas.width,
      h: canvas.height,
    };
  } catch {
    return { blob: file, w: 400, h: 300 };
  }
}

/** stores a pasted / dropped image; returns its id and natural size */
export async function storeImage(
  file: Blob,
): Promise<{ imageId: number; w: number; h: number } | null> {
  if (!file.type.startsWith("image/")) return null;
  const { blob, w, h } = await shrink(file);
  const imageId = newId();
  try {
    await idbPut(imageId, blob);
  } catch {
    return null;
  }
  setImageUrl(imageId, blob);
  return { imageId, w, h };
}

// ---- backup (Atziri réglage > Sauvegarde) ----
/** methods + their images as blobs, for the backup file */
export async function backupMethods(): Promise<{
  data: MethodsData;
  images: Map<number, Blob>;
}> {
  const images = new Map<number, Blob>();
  for (const id of usedImages()) {
    const blob = await idbGet(id);
    if (blob) images.set(id, blob);
  }
  return { data: methodsData.value, images };
}

/** replaces all the methods (and their images) with the ones of a backup */
export async function restoreMethods(raw: unknown, images: Map<number, Blob>) {
  const data = clean(raw as Raw);
  openMethodId.value = null;
  save(data);
  for (const id of usedImages()) {
    const blob = images.get(id);
    if (!blob) continue;
    await idbPut(id, blob);
    setImageUrl(id, blob);
  }
  await gcImages();
}

loadImages().then(gcImages);

/** size of a user icon: square, the picture fitted inside (transparency kept) */
const CUSTOM_ICON_PX = 96;

/** reads a picture file and fits it into a small square PNG for a method icon */
export async function makeCustomIcon(file: Blob): Promise<string | null> {
  try {
    const bmp = await createImageBitmap(file);
    const c = document.createElement("canvas");
    c.width = c.height = CUSTOM_ICON_PX;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    const k = Math.min(CUSTOM_ICON_PX / bmp.width, CUSTOM_ICON_PX / bmp.height);
    const w = Math.max(1, Math.round(bmp.width * k));
    const h = Math.max(1, Math.round(bmp.height * k));
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      bmp,
      Math.round((CUSTOM_ICON_PX - w) / 2),
      Math.round((CUSTOM_ICON_PX - h) / 2),
      w,
      h,
    );
    bmp.close();
    return c.toDataURL("image/png");
  } catch {
    return null;
  }
}
