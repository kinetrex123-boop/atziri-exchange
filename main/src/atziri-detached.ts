// Atziri Exchange: the Shift + Space page in its own window.
//
// "Détacher" opens the page (Economy, Farm, PoEDB...) in a normal window the
// player can move to a second screen and resize; its position, screen and
// size are remembered. Pressing Shift + Space in game puts it back into the
// overlay (the overlay calls /atziri-hub/attach when it opens).
import path from "path";
import fs from "fs";
import { app, BrowserWindow, screen, shell } from "electron";
import type { Server, IncomingMessage, ServerResponse } from "http";
import { applyBrandToWindow } from "./atziri-brand";

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

let win: BrowserWindow | null = null;
const boundsFile = () => path.join(app.getPath("userData"), "atziri-hub-window.json");

function isWebUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function loadBounds(): Partial<Bounds> {
  try {
    const b = JSON.parse(fs.readFileSync(boundsFile(), "utf8")) as Bounds;
    // only if still visible on one of the screens (screen unplugged...)
    const visible = screen.getAllDisplays().some((d) => {
      const a = d.workArea;
      return (
        b.x + 100 > a.x &&
        b.y + 50 > a.y &&
        b.x < a.x + a.width - 100 &&
        b.y < a.y + a.height - 50
      );
    });
    if (visible && b.width >= 600 && b.height >= 400) return b;
  } catch {
    // first time
  }
  return { width: 1400, height: 900 };
}

function saveBounds() {
  if (!win || win.isDestroyed() || win.isMinimized() || win.isMaximized()) return;
  try {
    fs.writeFileSync(boundsFile(), JSON.stringify(win.getBounds()));
  } catch {
    // ignore
  }
}

function openWindow(port: number) {
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    return;
  }
  win = new BrowserWindow({
    ...loadBounds(),
    title: "Atziri Exchange",
    icon: path.join(__dirname, process.env.STATIC!, "icon.png"),
    autoHideMenuBar: true,
    backgroundColor: "#0e0c0a",
    webPreferences: {
      allowRunningInsecureContent: false,
      webviewTag: true,
      spellcheck: false,
    },
  });
  win.setMenu(null);
  applyBrandToWindow(win, path.join(__dirname, process.env.STATIC!, "icon.png"));

  // same protections as the overlay: web tabs are plain web pages
  const wc = win.webContents;
  wc.on("will-attach-webview", (event, webPreferences, params) => {
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInSubFrames = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    if (params.src && !isWebUrl(params.src)) event.preventDefault();
  });
  wc.on("did-attach-webview", (_, webviewWc) => {
    webviewWc.setWindowOpenHandler((details) => {
      if (isWebUrl(details.url)) webviewWc.loadURL(details.url);
      return { action: "deny" };
    });
    webviewWc.on("will-navigate", (e, url) => {
      if (!isWebUrl(url)) e.preventDefault();
    });
  });
  wc.setWindowOpenHandler((details) => {
    if (isWebUrl(details.url)) shell.openExternal(details.url);
    return { action: "deny" };
  });
  // the app page itself never navigates away
  wc.on("will-navigate", (e) => {
    e.preventDefault();
  });

  win.on("moved", saveBounds);
  win.on("resized", saveBounds);
  win.on("close", saveBounds);
  win.on("closed", () => {
    win = null;
  });

  const base =
    process.env.VITE_DEV_SERVER_URL || `http://localhost:${port}/index.html`;
  win.loadURL(`${base}?atziri=hub`);
}

function closeWindow() {
  if (win && !win.isDestroyed()) win.close();
}

/** Routes /atziri-hub/status, /atziri-hub/detach, /atziri-hub/attach */
export function setupAtziriDetach(server: Server, getPort: () => number) {
  server.prependListener("request", (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? "";
    if (!url.startsWith("/atziri-hub/")) return;
    (req as IncomingMessage & { atziriHandled?: boolean }).atziriHandled = true;
    if (req.method === "POST" && url.startsWith("/atziri-hub/detach")) {
      openWindow(getPort());
    } else if (req.method === "POST" && url.startsWith("/atziri-hub/attach")) {
      closeWindow();
    }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ detached: Boolean(win && !win.isDestroyed()) }));
  });
}
