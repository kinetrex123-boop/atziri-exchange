// Atziri Exchange: text recognition with the OCR built into Windows
// (Windows.Media.Ocr, used through one long-lived PowerShell process).
// Used by the "Rune Rewards" hotkey: screenshot of the game window -> lines
// of text with their position -> prices shown next to each reward.
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { app, nativeImage } from "electron";
import fs from "fs/promises";
import path from "path";

export interface OcrLine {
  t: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const SCRIPT = String.raw`$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation${"`"}1' })[0]
function Await($op, [Type]$type) {
  $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
  $null = $t.Wait(-1)
  $t.Result
}
$engines = @{}
function Get-Engine([string]$lang) {
  if (-not $engines.ContainsKey($lang)) {
    $e = $null
    try { $e = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new($lang)) } catch {}
    if ($null -eq $e) { $e = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages() }
    $engines[$lang] = $e
  }
  $engines[$lang]
}
[Console]::Out.WriteLine('{"ready":true}')
[Console]::Out.Flush()
while ($true) {
  $req = [Console]::In.ReadLine()
  if ($null -eq $req) { break }
  try {
    $parts = $req.Split('|')
    $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($parts[0])) ([Windows.Storage.StorageFile])
    $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $engine = Get-Engine $parts[1]
    $res = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
    $lines = @()
    foreach ($l in $res.Lines) {
      $x1 = 1e9; $y1 = 1e9; $x2 = 0; $y2 = 0
      foreach ($w in $l.Words) {
        $r = $w.BoundingRect
        if ($r.X -lt $x1) { $x1 = $r.X }
        if ($r.Y -lt $y1) { $y1 = $r.Y }
        if ($r.X + $r.Width -gt $x2) { $x2 = $r.X + $r.Width }
        if ($r.Y + $r.Height -gt $y2) { $y2 = $r.Y + $r.Height }
      }
      $lines += @{ t = $l.Text; x = [int]$x1; y = [int]$y1; w = [int]($x2 - $x1); h = [int]($y2 - $y1) }
    }
    $stream.Dispose()
    [Console]::Out.WriteLine((@{ lines = $lines; lang = $engine.RecognizerLanguage.LanguageTag } | ConvertTo-Json -Compress -Depth 4))
  } catch {
    [Console]::Out.WriteLine((@{ error = $_.Exception.Message } | ConvertTo-Json -Compress))
  }
  [Console]::Out.Flush()
}
`;

const LANGS: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  de: "de-DE",
  es: "es-ES",
  pt: "pt-BR",
  ru: "ru-RU",
  ja: "ja-JP",
  ko: "ko-KR",
};

type Pending = { resolve: (v: OcrLine[]) => void; reject: (e: Error) => void };

export class AtziriOcr {
  private proc: ChildProcessWithoutNullStreams | undefined;
  private ready: Promise<void> | undefined;
  private queue: Pending[] = [];
  private buffer = "";
  private dir = path.join(app.getPath("temp"), "atziri-ocr");

  private start(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      await fs.mkdir(this.dir, { recursive: true });
      const script = path.join(this.dir, "atziri-ocr.ps1");
      // UTF-8 with BOM so Windows PowerShell 5.1 reads it correctly
      await fs.writeFile(script, "﻿" + SCRIPT, "utf8");
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(
          "powershell.exe",
          ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script],
          { windowsHide: true },
        );
        this.proc = proc;
        let started = false;
        proc.stdout.setEncoding("utf8");
        proc.stdout.on("data", (chunk: string) => {
          this.buffer += chunk;
          let nl: number;
          while ((nl = this.buffer.indexOf("\n")) !== -1) {
            const line = this.buffer.slice(0, nl).trim();
            this.buffer = this.buffer.slice(nl + 1);
            if (!line) continue;
            if (!started) {
              started = true;
              resolve();
              continue;
            }
            const job = this.queue.shift();
            if (!job) continue;
            try {
              const res = JSON.parse(line);
              if (res.error) job.reject(new Error(res.error));
              else job.resolve((res.lines ?? []) as OcrLine[]);
            } catch (e) {
              job.reject(e as Error);
            }
          }
        });
        proc.on("error", (e) => {
          if (!started) reject(e);
        });
        proc.on("exit", () => {
          for (const job of this.queue.splice(0)) job.reject(new Error("OCR stopped"));
          this.proc = undefined;
          this.ready = undefined;
          if (!started) reject(new Error("OCR could not start"));
        });
      });
    })();
    this.ready.catch(() => {
      this.ready = undefined;
    });
    return this.ready;
  }

  /** text lines of a BGRA screenshot, coordinates in screenshot pixels */
  async recognize(
    bgra: Buffer,
    width: number,
    height: number,
    language: string,
  ): Promise<OcrLine[]> {
    if (process.platform !== "win32") throw new Error("Windows only");
    await this.start();
    // small text is read better when enlarged
    const scale = height < 1200 ? 1.5 : 1;
    let image = nativeImage.createFromBitmap(bgra, { width, height });
    if (scale !== 1) {
      image = image.resize({
        width: Math.round(width * scale),
        height: Math.round(height * scale),
        quality: "best",
      });
    }
    const file = path.join(this.dir, `shot-${Date.now()}.png`);
    await fs.writeFile(file, image.toPNG());
    try {
      const lines = await new Promise<OcrLine[]>((resolve, reject) => {
        this.queue.push({ resolve, reject });
        this.proc!.stdin.write(`${file}|${LANGS[language] ?? "en-US"}\n`);
      });
      return lines.map((l) => ({
        t: l.t,
        x: Math.round(l.x / scale),
        y: Math.round(l.y / scale),
        w: Math.round(l.w / scale),
        h: Math.round(l.h / scale),
      }));
    } finally {
      fs.unlink(file).catch(() => {});
    }
  }

  stop() {
    this.proc?.kill();
  }
}
