// Atziri Exchange: shared state of the Shift + Space hub (active tab, web pages)
import { shallowRef, watch } from "vue";
import { isFrench } from "@/web/atziri-lang";
import { poeWebApi } from "@/web/Config";

export type WebTabId = "poedb" | "craft" | "ninja" | "trade" | "regexeng";
export type HubTab =
  | "market"
  | "regex"
  | "farm"
  | "stats"
  | "crafttrack"
  | "history"
  | WebTabId;

export interface WebTab {
  id: WebTabId;
  label: string;
  home: string;
  icon: string;
}

export const WEB_TABS: WebTab[] = [
  { id: "poedb", label: "PoEDB", home: "https://poe2db.tw/fr/", icon: "fa-book" },
  {
    id: "craft",
    label: "Craft",
    home: "https://www.craftofexile.com/?cl=fr",
    icon: "fa-hammer",
  },
  {
    id: "ninja",
    label: "poe.ninja",
    home: "https://poe.ninja/poe2/economy",
    icon: "fa-chart-line",
  },
  {
    id: "trade",
    label: "Trade",
    home: "https://www.pathofexile.com/trade2",
    icon: "fa-balance-scale",
  },
  {
    id: "regexeng",
    label: "Regex ENG",
    home: "https://poe2.re/tablet",
    icon: "fa-code",
  },
];

export const hubTab = shallowRef<HubTab>("market");

/**
 * Puts a page in the overlay language: French PoEDB / Craft of Exile when the
 * overlay is in French, English otherwise; the trade site follows the
 * "trade site" setting (always English when the overlay is in English).
 */
export function localizeUrl(url: string): string {
  const fr = isFrench();
  try {
    const u = new URL(url);
    if (u.hostname === "poe2db.tw") {
      const seg = u.pathname.split("/");
      if (/^[a-z]{2}$/.test(seg[1] ?? "")) seg[1] = fr ? "fr" : "us";
      u.pathname = seg.join("/");
      return u.toString();
    }
    if (u.hostname.endsWith("craftofexile.com")) {
      u.searchParams.set("cl", fr ? "fr" : "en");
      return u.toString();
    }
    if (/^(www|fr)\.pathofexile\.com$/.test(u.hostname) && u.pathname.startsWith("/trade2")) {
      u.hostname = fr ? (poeWebApi() ?? "www.pathofexile.com") : "www.pathofexile.com";
      return u.toString();
    }
  } catch {
    // not a valid URL: leave it
  }
  return url;
}

// Last page of each web tab, remembered between sessions on this PC
const URLS_KEY = "atziri-web-tabs";
function loadUrls(): Record<WebTabId, string> {
  const defaults = Object.fromEntries(
    WEB_TABS.map((t) => [t.id, t.home]),
  ) as Record<WebTabId, string>;
  try {
    const saved = JSON.parse(localStorage.getItem(URLS_KEY) ?? "null");
    if (saved && typeof saved === "object") {
      for (const t of WEB_TABS) {
        if (typeof saved[t.id] === "string") defaults[t.id] = saved[t.id];
      }
      // trade site in English (www) instead of the French one
      defaults.trade = defaults.trade.replace(
        "://fr.pathofexile.com/",
        "://www.pathofexile.com/",
      );
    }
  } catch {
    // ignore unreadable storage
  }
  return defaults;
}

export const webTabUrls = shallowRef<Record<WebTabId, string>>(loadUrls());

watch(webTabUrls, (urls) => {
  try {
    localStorage.setItem(URLS_KEY, JSON.stringify(urls));
  } catch {
    // ignore unavailable storage
  }
});

/** A page requested from outside (shortcut, link): tab id + url + counter */
export const webTabRequest = shallowRef<{
  tab: WebTabId;
  url: string;
  n: number;
} | null>(null);

/** Opens a web page in one of the web tabs of the Shift + Space page */
export function openInHub(url: string, tab: WebTabId = "poedb") {
  webTabRequest.value = {
    tab,
    url: localizeUrl(url),
    n: (webTabRequest.value?.n ?? 0) + 1,
  };
  hubTab.value = tab;
}

/** Records the page a web tab is showing */
export function rememberTabUrl(tab: WebTabId, url: string) {
  if (webTabUrls.value[tab] === url) return;
  webTabUrls.value = { ...webTabUrls.value, [tab]: url };
}

/** True in the detached window (Shift + Space page opened on its own) */
export function isDetachedHub(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("atziri") === "hub";
  } catch {
    return false;
  }
}

/** a page of the official trade site (and of no look-alike domain) */
export function isTradeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const official = ["pathofexile.com", "pathofexile.tw", "poe.game.qq.com", "poe.kakaogames.com"];
    return (
      u.protocol === "https:" &&
      official.some((d) => host === d || host.endsWith(`.${d}`)) &&
      (u.pathname === "/trade2" || u.pathname.startsWith("/trade2/") || u.pathname.startsWith("/trade/"))
    );
  } catch {
    return false;
  }
}

/** true while the Shift + Space page is on screen (overlay open, or its own window shown) */
export const hubVisible = shallowRef(false);

/** Farm tab: farming journal or setup cards (remembered on this PC) */
export type FarmView = "journal" | "setup";
const FARM_VIEW_KEY = "atziri-farm-view";
function loadFarmView(): FarmView {
  try {
    return localStorage.getItem(FARM_VIEW_KEY) === "setup" ? "setup" : "journal";
  } catch {
    return "journal";
  }
}
export const farmView = shallowRef<FarmView>(loadFarmView());
watch(farmView, (v) => {
  try {
    localStorage.setItem(FARM_VIEW_KEY, v);
  } catch {
    // storage unavailable
  }
});

/**
 * Tabs that share one button in the tab bar (switch inside the page): the
 * first view is the button's own tab, the last view used is reopened.
 */
export interface TabView {
  tab: HubTab;
  icon: string;
  fr: string;
  en: string;
}
export const TAB_GROUPS: Record<string, TabView[]> = {
  craft: [
    { tab: "craft", icon: "fa-hammer", fr: "Craft of Exile", en: "Craft of Exile" },
    { tab: "crafttrack", icon: "fa-flask", fr: "Suivi", en: "Tracking" },
  ],
  ninja: [
    { tab: "ninja", icon: "fa-chart-line", fr: "poe.ninja", en: "poe.ninja" },
    { tab: "stats", icon: "fa-chart-bar", fr: "Stats", en: "Stats" },
  ],
};
const GROUP_KEY = "atziri-tab-groups";
function loadGroupViews(): Record<string, HubTab> {
  const out: Record<string, HubTab> = {};
  try {
    const saved = JSON.parse(localStorage.getItem(GROUP_KEY) ?? "{}");
    for (const [g, views] of Object.entries(TAB_GROUPS)) {
      const v = views.find((x) => x.tab === saved?.[g]);
      if (v) out[g] = v.tab;
    }
  } catch {
    // unreadable storage
  }
  return out;
}
const groupViews = shallowRef<Record<string, HubTab>>(loadGroupViews());
/** group of a tab, if it shares a button with another one */
export function tabGroup(tab: HubTab): string | undefined {
  return Object.keys(TAB_GROUPS).find((g) => TAB_GROUPS[g].some((v) => v.tab === tab));
}
/** tab opened by the button of a group (the last view used) */
export function groupLastTab(group: string): HubTab {
  return groupViews.value[group] ?? TAB_GROUPS[group][0].tab;
}
watch(hubTab, (tab) => {
  const g = tabGroup(tab);
  if (!g || groupViews.value[g] === tab) return;
  groupViews.value = { ...groupViews.value, [g]: tab };
  try {
    localStorage.setItem(GROUP_KEY, JSON.stringify(groupViews.value));
  } catch {
    // storage unavailable
  }
});
