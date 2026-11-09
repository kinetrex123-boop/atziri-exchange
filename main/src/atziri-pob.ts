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

interface Settings {
  file: string | "latest";
}
function loadSettings(): Settings {
  try {
    return { file: "latest", ...JSON.parse(fs.readFileSync(SETTINGS_FILE(), "utf8")) };
  } catch {
    return { file: "latest" };
  }
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
  if (s.file !== "latest" && fs.existsSync(s.file)) return s.file;
  return listBuilds()[0]?.file ?? null;
}

/** loads (or reloads, if saved again in PoB) the chosen build */
async function ensureBuild(logger: Logger) {
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
      const file = new URL(url, "http://x").searchParams.get("file") ?? "latest";
      const ok = file === "latest" || listBuilds().some((b) => b.file === file);
      if (ok) saveSettings({ file });
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
}
