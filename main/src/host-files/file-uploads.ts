import path from "path";
import crypto from "crypto";
import fs from "fs";
import { app } from "electron";
import type { Server } from "http";

// Atziri Exchange: imported files are images only, read and written by their
// plain file name inside the uploads folder (never a path).
const IMAGE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jfif": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
};

function imageExt(url: string): string | undefined {
  let name = url.split("?")[0];
  try {
    name = decodeURIComponent(name);
  } catch {
    return undefined;
  }
  const ext = path.extname(name).toLowerCase();
  return ext in IMAGE_TYPES ? ext : undefined;
}

export function addFileUploadRoutes(server: Server) {
  const uploadsPath = path.join(app.getPath("userData"), "apt-data", "files");

  server.addListener("request", (req, res) => {
    if (req.method !== "GET" || !req.url?.startsWith("/uploads/")) return;

    const ext = imageExt(req.url);
    let name = "";
    try {
      name = path.basename(decodeURIComponent(req.url.slice("/uploads/".length).split("?")[0]));
    } catch {
      // bad escape sequence: no file
    }
    if (!ext || !/^[\w.-]+$/.test(name)) {
      res.statusCode = 404;
      res.end();
      return;
    }
    res.setHeader("content-type", IMAGE_TYPES[ext]);
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("cache-control", "max-age=31536000, immutable"); // named by content hash
    const stream = fs.createReadStream(path.join(uploadsPath, name));
    stream.on("error", () => {
      if (!res.headersSent) res.statusCode = 404;
      res.end();
    });
    stream.pipe(res);
  });

  server.addListener("request", (req, res) => {
    if (req.method !== "POST" || !req.url?.startsWith("/uploads/")) return;

    const ext = imageExt(req.url);
    if (!ext) {
      res.statusCode = 415;
      res.end();
      req.destroy();
      return;
    }
    let contents = Buffer.alloc(0);
    req.on("data", (chunk) => {
      if (contents.length > 16_000_000) {
        req.destroy();
        return;
      }
      contents = Buffer.concat([contents, chunk]);
    });
    req.once("end", () => {
      const hash = crypto.createHash("md5").update(contents).digest("hex");
      const filename = `${hash}${ext}`;

      try {
        fs.mkdirSync(uploadsPath, { recursive: true });
        fs.writeFileSync(path.join(uploadsPath, filename), contents);
      } catch {
        res.statusCode = 500;
        res.end();
        return;
      }

      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ name: filename }));
    });
  });
}
