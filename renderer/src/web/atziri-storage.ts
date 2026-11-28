// Atziri Exchange: safety net for the data saved on this PC (localStorage).
//  - a write that fails is reported on screen instead of being lost silently;
//  - a saved value that cannot be read (or comes from a newer version of the
//    app) is copied aside before anything can overwrite it;
//  - the page must run on its fixed address: the saved data is filed by
//    address, so on another port it looks empty (see the banner of the page).
import { shallowRef } from "vue";

/** Version of the saved data structures written by this version of the app */
export const DATA_VERSION = 1;

/** Fixed port of the local page (main/src/server.ts) */
export const ATZIRI_PORT = 41917;

/** Last write that failed (shown on the Shift + Space page), null when fine */
export const storageError = shallowRef<{ key: string; at: number } | null>(
  null,
);

/** Saves a value; false (and a notice on screen) when the storage refuses */
export function writeItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    if (storageError.value?.key === key) storageError.value = null;
    return true;
  } catch {
    storageError.value = { key, at: Date.now() };
    return false;
  }
}

/** Suffix of the copies kept aside */
export const SET_ASIDE = ".illisible";

/**
 * Keeps an unreadable (or too recent) saved value aside, under
 * "<key>.illisible", so the defaults written afterwards never destroy it.
 * An older copy kept aside is never replaced.
 */
export function setAside(key: string, raw: string | null) {
  if (raw == null || raw === "") return;
  try {
    if (localStorage.getItem(key + SET_ASIDE) == null)
      localStorage.setItem(key + SET_ASIDE, raw);
  } catch {
    // storage unavailable: nothing more can be done
  }
}

/**
 * Reads a JSON value. `failed` is true when something was saved but could
 * not be read; the raw text is then kept aside.
 */
export function readJson(key: string): {
  value: unknown;
  raw: string | null;
  failed: boolean;
} {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return { value: null, raw: null, failed: false };
  }
  if (raw == null) return { value: null, raw, failed: false };
  try {
    return { value: JSON.parse(raw), raw, failed: false };
  } catch {
    setAside(key, raw);
    return { value: null, raw, failed: true };
  }
}

/**
 * Data saved by a newer version of the app: kept aside before this version
 * reads it the way it knows (true when it was set aside).
 */
export function guardVersion(key: string, value: unknown, raw: string | null) {
  const v = (value as { v?: unknown } | null)?.v;
  if (typeof v === "number" && v > DATA_VERSION) {
    setAside(key, raw);
    return true;
  }
  return false;
}

/**
 * The page does not run on its usual address (fixed port busy at launch):
 * the data saved on this PC is not visible and what is typed now would be
 * filed elsewhere.
 */
export function onWrongAddress(): boolean {
  if (import.meta.env.DEV) return false;
  if (typeof window === "undefined") return false;
  const port = Number(window.location.port);
  return (
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost"
  )
    ? port !== ATZIRI_PORT
    : false;
}
