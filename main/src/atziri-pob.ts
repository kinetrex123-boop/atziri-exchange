// Atziri Exchange: bridge to Path of Building (PoE2).
//
// Runs Path of Building's own calculations (no window) with the LuaJIT
// shipped with the app, in the folder where the player installed Path of
// Building (only read). The build is the player's saved PoB build: the
// latest saved one, or the one chosen in the Stats tab. It is reloaded
// when the file changes (saved again in PoB).
//
// Routes: GET /atziri-pob/status, POST /atziri-pob/select?file=,
//         GET /atziri-pob/stats, POST /atziri-pob/compare (body: item text)
import { app, shell } from "electron";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import type { Server, IncomingMessage, ServerResponse } from "http";
import type { Logger } from "./RemoteLogger";

const POB_DIR = () =>
  path.join(app.getPath("appData"), "Path of Building Community (PoE2)");
const BUILDS_DIR = () =>
  path.join(app.getPath("documents"), "Path of Building (PoE2)", "Builds");
const SETTINGS_FILE = () => path.join(app.getPath("userData"), "atziri-pob.json");

function bridgeDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "pob")
    : path.join(__dirname, "..", "pob");
}

interface NinjaChar {
  account: string; // "kinetrex-7298"
  league: string; // "forbiddenrites"
  character: string;
}
interface Settings {
  // a saved PoB build, "latest" saved one, or "ninja" (character on poe.ninja)
  file: string | "latest" | "ninja";
  ninja?: NinjaChar;
}
function loadSettings(): Settings {
  try {
    return { file: "latest", ...JSON.parse(fs.readFileSync(SETTINGS_FILE(), "utf8")) };
  } catch {
    return { file: "latest" };
  }
}

// ---- character followed on poe.ninja (its "Path of Building" export) ----
const NINJA_EVERY_MS = 5 * 60 * 1000;
const NINJA_FILE = () => path.join(app.getPath("userData"), "atziri-pob-ninja.xml");
const UA = { "User-Agent": "Atziri-Exchange (PoE2 overlay)" };
let ninjaState: { version?: number; checkedAt: number; updatedUtc?: string; error?: string } = {
  checkedAt: 0,
};
let ninjaRunning: Promise<void> | null = null;

/** "https://poe.ninja/poe2/profile/kinetrex-7298/forbiddenrites/character/NAME" */
export function parseNinjaUrl(url: string): NinjaChar | null {
  const m = /poe\.ninja\/poe2\/(?:profile|builds)\/([^/?#]+)\/([^/?#]+)\/character\/([^/?#]+)/i.exec(url);
  if (m && /profile/i.test(url)) {
    return { account: decodeURIComponent(m[1]), league: decodeURIComponent(m[2]), character: decodeURIComponent(m[3]) };
  }
  return null;
}

/** latest version number poe.ninja announces for the character */
async function ninjaVersion(c: NinjaChar): Promise<number> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => { ctrl.abort(); }, 15000);
  try {
    const res = await fetch(
      `https://poe.ninja/poe2/api/events/character/${encodeURIComponent(c.account)}/${encodeURIComponent(c.league)}/${encodeURIComponent(c.character)}`,
      { headers: UA, signal: ctrl.signal },
    );
    if (!res.ok || !res.body) throw new Error(`poe.ninja ${res.status}`);
    const reader = res.body.getReader();
    let text = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      text += Buffer.from(value).toString("utf8");
      const m = /data:\s*(\{[^\n]*\})/.exec(text);
      if (m) {
        ctrl.abort();
        const v = (JSON.parse(m[1]) as { version?: number }).version;
        if (typeof v === "number") return v;
      }
      if (text.length > 4000) break;
    }
    throw new Error("poe.ninja: no version");
  } finally {
    clearTimeout(timer);
  }
}

async function refreshNinja(logger: Logger, force = false) {
  const s = loadSettings();
  if (s.file !== "ninja" || !s.ninja) return;
  if (!force && Date.now() - ninjaState.checkedAt < NINJA_EVERY_MS && fs.existsSync(NINJA_FILE())) return;
  if (ninjaRunning) { await ninjaRunning; return; }
  const c = s.ninja;
  ninjaRunning = (async () => {
    try {
      const version = await ninjaVersion(c);
      if (version !== ninjaState.version || !fs.existsSync(NINJA_FILE())) {
        const res = await fetch(
          `https://poe.ninja/poe2/api/profile/characters/${encodeURIComponent(c.account)}/${encodeURIComponent(c.league)}/${encodeURIComponent(c.character)}/model/${version}`,
          { headers: UA },
        );
        if (!res.ok) throw new Error(`poe.ninja ${res.status}`);
        const body = (await res.json()) as {
          charModel?: { pathOfBuildingExport?: string; updatedUtc?: string };
        };
        const code = body.charModel?.pathOfBuildingExport;
        if (!code) throw new Error("poe.ninja: no Path of Building export");
        const xml = zlib
          .inflateSync(Buffer.from(code.replace(/-/g, "+").replace(/_/g, "/"), "base64"))
          .toString("utf8");
        if (!xml.includes("<PathOfBuilding")) throw new Error("poe.ninja: bad export");
        fs.writeFileSync(NINJA_FILE(), xml);
        ninjaState.version = version;
        ninjaState.updatedUtc = body.charModel?.updatedUtc;
      }
      ninjaState.checkedAt = Date.now();
      ninjaState.error = undefined;
    } catch (e) {
      ninjaState.checkedAt = Date.now();
      ninjaState.error = (e as Error).message;
      logger.write(`warn [Atziri PoB] ${ninjaState.error}`);
    } finally {
      ninjaRunning = null;
    }
  })();
  await ninjaRunning;
}
function saveSettings(s: Settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE(), JSON.stringify(s));
  } catch {
    // ignore
  }
}

interface BuildFile {
  file: string;
  name: string;
  mtime: number;
}
/** saved PoB builds (Builds folder and its sub-folders) */
function listBuilds(): BuildFile[] {
  const out: BuildFile[] = [];
  const walk = (dir: string, depth: number) => {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && depth < 3) walk(full, depth + 1);
      else if (e.isFile() && e.name.toLowerCase().endsWith(".xml")) {
        try {
          out.push({
            file: full,
            name: path.relative(BUILDS_DIR(), full).replace(/\.xml$/i, ""),
            mtime: fs.statSync(full).mtimeMs,
          });
        } catch {
          // ignore
        }
      }
    }
  };
  walk(BUILDS_DIR(), 0);
  return out.sort((a, b) => b.mtime - a.mtime);
}

// ---- the LuaJIT process ----
let proc: ChildProcessWithoutNullStreams | null = null;
let ready: Promise<void> | null = null;
let nextId = 1;
const waiting = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
let loaded: { file: string; mtime: number } | null = null;
let lastError: string | null = null;
let queue: Promise<unknown> = Promise.resolve();

function stop() {
  if (proc) proc.kill();
  proc = null;
  ready = null;
  loaded = null;
  for (const w of waiting.values()) w.reject(new Error("engine stopped"));
  waiting.clear();
}

async function start(logger: Logger): Promise<void> {
  if (ready) { await ready; return; }
  ready = new Promise<void>((resolve, reject) => {
    const dir = bridgeDir();
    if (!fs.existsSync(path.join(POB_DIR(), "Launch.lua"))) {
      reject(new Error("Path of Building (PoE2) not found"));
      return;
    }
    const p = spawn(path.join(dir, "luajit.exe"), [path.join(dir, "atziri-pob.lua")], {
      cwd: POB_DIR(),
      env: { ...process.env, ATZIRI_POB_WRAPPER: path.join(dir, "HeadlessWrapper.lua") },
      windowsHide: true,
    });
    proc = p;
    let buf = "";
    const timer = setTimeout(() => { reject(new Error("engine start timeout")); }, 60000);
    p.stdout.setEncoding("utf8");
    p.stdout.on("data", (chunk: string) => {
      buf += chunk;
      let i: number;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).replace(/\r$/, "");
        buf = buf.slice(i + 1);
        if (!line.startsWith("@@ATZ@@")) continue;
        try {
          const msg = JSON.parse(line.slice(7)) as { id: number; ok: boolean; data: unknown };
          if (msg.id === 0) {
            clearTimeout(timer);
            resolve();
            continue;
          }
          const w = waiting.get(msg.id);
          if (!w) continue;
          waiting.delete(msg.id);
          if (msg.ok) w.resolve(msg.data);
          else w.reject(new Error(String(msg.data)));
        } catch {
          // ignore
        }
      }
    });
    p.stderr.on("data", (d: Buffer) => {
      logger.write(`warn [Atziri PoB] ${d.toString().slice(0, 300)}`);
    });
    p.on("exit", () => {
      if (proc === p) stop();
    });
  });
  ready.catch((e: Error) => {
    lastError = e.message;
    stop();
  });
  await ready;
}

async function send<T>(logger: Logger, cmd: Record<string, unknown>): Promise<T> {
  // one command at a time
  const run = async () => {
    await start(logger);
    const id = nextId++;
    return await new Promise<T>((resolve, reject) => {
      waiting.set(id, { resolve: resolve as (v: unknown) => void, reject });
      proc!.stdin.write(JSON.stringify({ ...cmd, id }) + "\n");
      setTimeout(() => {
        if (waiting.delete(id)) reject(new Error("engine timeout"));
      }, 60000);
    });
  };
  const p = queue.then(run, run);
  queue = p.catch(() => undefined);
  return await p;
}

function currentFile(): string | null {
  const s = loadSettings();
  if (s.file === "ninja") return fs.existsSync(NINJA_FILE()) ? NINJA_FILE() : null;
  if (s.file !== "latest" && fs.existsSync(s.file)) return s.file;
  return listBuilds()[0]?.file ?? null;
}

/** loads (or reloads, if saved again in PoB) the chosen build */
async function ensureBuild(logger: Logger) {
  await refreshNinja(logger);
  const file = currentFile();
  if (!file) throw new Error("no build");
  const mtime = fs.statSync(file).mtimeMs;
  if (!loaded || loaded.file !== file || loaded.mtime !== mtime) {
    await send(logger, { cmd: "load", file });
    loaded = { file, mtime };
  }
}

function status() {
  const builds = listBuilds();
  const s = loadSettings();
  return {
    pobFound: fs.existsSync(path.join(POB_DIR(), "Launch.lua")),
    engineFound: fs.existsSync(path.join(bridgeDir(), "luajit.exe")),
    buildsDir: BUILDS_DIR(),
    builds: builds.map((b) => ({ file: b.file, name: b.name, mtime: b.mtime })),
    selected: s.file,
    current: currentFile(),
    lastError,
    ninja: s.ninja ?? null,
    ninjaUpdatedUtc: ninjaState.updatedUtc ?? null,
    ninjaCheckedAt: ninjaState.checkedAt || null,
    ninjaError: ninjaState.error ?? null,
  };
}

async function readBody(req: IncomingMessage): Promise<string> {
  return await new Promise((resolve) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (c: string) => {
      if (body.length < 200000) body += c;
    });
    req.on("end", () => { resolve(body); });
  });
}

function sendJson(res: ServerResponse, code: number, body: unknown) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

export function setupAtziriPob(server: Server, logger: Logger) {
  server.prependListener("request", (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? "";
    if (!url.startsWith("/atziri-pob/")) return;
    (req as IncomingMessage & { atziriHandled?: boolean }).atziriHandled = true;

    const fail = (e: unknown) => {
      lastError = (e as Error).message;
      sendJson(res, 500, { error: lastError });
    };

    if (url.startsWith("/atziri-pob/status")) {
      sendJson(res, 200, status());
    } else if (url.startsWith("/atziri-pob/select") && req.method === "POST") {
      const params = new URL(url, "http://x").searchParams;
      const file = params.get("file") ?? "latest";
      const prev = loadSettings();
      if (file === "ninja") {
        // poe.ninja profile link of the character
        const c = parseNinjaUrl(params.get("url") ?? "") ?? prev.ninja ?? null;
        if (!c) {
          sendJson(res, 400, { ...status(), error: "bad poe.ninja link" });
          return;
        }
        saveSettings({ file, ninja: c });
        ninjaState = { checkedAt: 0 };
        try {
          fs.rmSync(NINJA_FILE(), { force: true });
        } catch {
          // ignore
        }
        refreshNinja(logger, true)
          .then(() => { sendJson(res, 200, status()); })
          .catch(fail);
        return;
      }
      const ok = file === "latest" || listBuilds().some((b) => b.file === file);
      if (ok) saveSettings({ file, ninja: prev.ninja });
      sendJson(res, ok ? 200 : 400, status());
    } else if (url.startsWith("/atziri-pob/open") && req.method === "POST") {
      const exe = path.join(POB_DIR(), "Path of Building-PoE2.exe");
      if (fs.existsSync(exe)) shell.openPath(exe);
      sendJson(res, 200, { ok: true });
    } else if (url.startsWith("/atziri-pob/stats")) {
      ensureBuild(logger)
        .then(async () => await send(logger, { cmd: "stats" }))
        .then((data) => {
          lastError = null;
          sendJson(res, 200, data);
        })
        .catch(fail);
    } else if (url.startsWith("/atziri-pob/compare") && req.method === "POST") {
      readBody(req)
        .then(async (item) => {
          await ensureBuild(logger);
          return await send(logger, { cmd: "compare", item });
        })
        .then((data) => { sendJson(res, 200, data); })
        .catch(fail);
    } else {
      sendJson(res, 404, {});
    }
  });
  app.on("will-quit", stop);
  // keep the poe.ninja character fresh (only when that source is chosen)
  setInterval(() => {
    refreshNinja(logger).catch(() => undefined);
  }, NINJA_EVERY_MS);
}
