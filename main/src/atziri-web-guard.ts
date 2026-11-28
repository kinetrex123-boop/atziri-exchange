// Atziri Exchange: limits of the web tabs of the Shift + Space page (PoEDB,
// Craft of Exile, poe2.re, poe.ninja, trade site, address bar).
//  - no permission is granted to the pages: no microphone, camera, screen,
//    location, notifications, clipboard reading... (audit H3). Without this,
//    Electron grants every request without asking.
//  - the pages cannot open or navigate to the addresses of this PC (the local
//    page of the app, other local servers) (audit H7).
import { session } from "electron";
import { BROWSER_PARTITION } from "./adblock";

// harmless, and used by the sites: "copy" buttons (regex of poe2.re, trade
// whispers) and videos in full screen
const ALLOWED_PERMISSIONS = new Set(["clipboard-sanitized-write", "fullscreen"]);

export function lockDownBrowserSession() {
  const ses = session.fromPartition(BROWSER_PARTITION);
  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission));
  });
  ses.setPermissionCheckHandler((_wc, permission) =>
    ALLOWED_PERMISSIONS.has(permission),
  );
  // USB, HID, serial and Bluetooth devices: never
  ses.setDevicePermissionHandler(() => false);
}

/** http(s) page on the internet: never this PC nor the local network */
export function isPublicWebUrl(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (host === "::1" || host === "0.0.0.0" || host === "::") return false;
  if (/^127\./.test(host)) return false;
  // private networks (router pages, other PCs of the house)
  if (/^10\./.test(host) || /^192\.168\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  if (/^169\.254\./.test(host)) return false;
  if (/^f[cd][0-9a-f]{2}:/.test(host) || /^fe80:/.test(host)) return false;
  return true;
}
