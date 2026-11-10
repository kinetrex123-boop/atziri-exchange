// Atziri Exchange: name and icon chosen by the player (Atziri réglage).
// Applied to the tray icon (tooltip and image) and to the detached window.
// The shortcut, the .exe and the Windows programs list keep the installed ones.
import path from "path";
import fs from "fs";
import { app, nativeImage, net, BrowserWindow, type NativeImage } from "electron";
import type { IncomingMessage, Server, ServerResponse } from "http";

export interface Brand {
  name: string;
  icon: string; // "default" | "upload:<file>" | "url:<https://web.poecdn.com/...>"
}

const DEFAULT_BRAND: Brand = { name: "Atziri Exchange", icon: "default" };
const file = () => path.join(app.getPath("userData"), "atziri-brand.json");
const uploadsPath = () => path.join(app.getPath("userData"), "apt-data", "files");

let brand: Brand = loadBrand();
let image: NativeImage | null = null;
const listeners: Array<(name: string, img: NativeImage | null) => void> = [];

function loadBrand(): Brand {
  try {
    const v = JSON.parse(fs.readFileSync(file(), "utf8"));
    return {
      name: typeof v.name === "string" && v.name.trim() ? v.name.trim().slice(0, 40) : DEFAULT_BRAND.name,
      icon: typeof v.icon === "string" ? v.icon : "default",
    };
  } catch {
    return { ...DEFAULT_BRAND };
  }
}

export function brandName() {
  return brand.name;
}

/** called with the name and icon now, then on every change */
export function onBrand(fn: (name: string, img: NativeImage | null) => void) {
  listeners.push(fn);
  fn(brand.name, image);
}

async function loadImage(icon: string): Promise<NativeImage | null> {
  try {
    if (icon.startsWith("upload:")) {
      const name = path.basename(icon.slice("upload:".length));
      const img = nativeImage.createFromPath(path.join(uploadsPath(), name));
      return img.isEmpty() ? null : img.resize({ width: 32, height: 32, quality: "best" });
    }
    if (icon.startsWith("url:")) {
      const url = icon.slice("url:".length);
      if (!/^https:\/\/web\.poecdn\.com\//.test(url)) return null;
      const res = await net.fetch(url);
      if (!res.ok) return null;
      const img = nativeImage.createFromBuffer(Buffer.from(await res.arrayBuffer()));
      return img.isEmpty() ? null : img.resize({ width: 32, height: 32, quality: "best" });
    }
  } catch {
    // unreadable image: keep the default icon
  }
  return null;
}

async function apply() {
  image = brand.icon === "default" ? null : await loadImage(brand.icon);
  for (const fn of listeners) fn(brand.name, image);
}

/** detached / other app windows follow the chosen name and icon */
export function applyBrandToWindow(win: BrowserWindow, defaultIcon: string) {
  win.setTitle(brand.name);
  win.setIcon(image ?? nativeImage.createFromPath(defaultIcon));
  win.on("page-title-updated", (e) => { e.preventDefault(); });
}

/** Route /atziri-brand (GET: current; POST ?name=&icon=: change) */
export function setupAtziriBrand(server: Server) {
  apply().catch(() => undefined);
  server.prependListener("request", (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? "";
    if (!url.startsWith("/atziri-brand")) return;
    (req as IncomingMessage & { atziriHandled?: boolean }).atziriHandled = true;
    const q = new URL(url, "http://localhost").searchParams;
    const done = () => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(brand));
    };
    if (req.method !== "POST") { done(); return; }
    const name = (q.get("name") ?? "").trim().slice(0, 40);
    const icon = q.get("icon") ?? brand.icon;
    brand = {
      name: name || DEFAULT_BRAND.name,
      icon: /^(default|upload:[\w.-]+|url:https:\/\/web\.poecdn\.com\/\S+)$/.test(icon) ? icon : "default",
    };
    try {
      fs.writeFileSync(file(), JSON.stringify(brand));
    } catch {
      // read-only profile: the change lasts until the app closes
    }
    apply()
      .catch(() => undefined)
      .finally(done);
  });
}
