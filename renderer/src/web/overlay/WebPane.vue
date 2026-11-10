<template>
  <!-- Atziri Exchange: one web page tab of the Shift + Space hub -->
  <div class="ar-body ar-browser">
    <div class="ar-browser-bar">
      <button type="button" :title="tr('Précédent', 'Back')" @click="webviewDo('goBack')">
        <i class="fas fa-arrow-left"></i>
      </button>
      <button type="button" :title="tr('Suivant', 'Forward')" @click="webviewDo('goForward')">
        <i class="fas fa-arrow-right"></i>
      </button>
      <button type="button" :title="tr('Recharger', 'Reload')" @click="webviewDo('reload')">
        <i class="fas fa-redo"></i>
      </button>
      <button type="button" :title="tr('Accueil', 'Home')" @click="load(localizeUrl(tab.home))">
        <i class="fas fa-home"></i>
      </button>
      <input
        v-model="addressInput"
        type="text"
        class="ar-search ar-address"
        spellcheck="false"
        @keydown.enter="goToAddress"
      />
      <button
        type="button"
        class="ar-quick"
        :title="tr('Copier l’adresse de la page', 'Copy the page address')"
        @click="copyUrl"
      >
        <i :class="copied ? 'fas fa-check' : 'far fa-copy'"></i>
        {{ copied ? tr("Copié !", "Copied!") : tr("Copier l'URL", "Copy URL") }}
      </button>
      <!-- Trade: favourite searches instead of "open in my browser" -->
      <TradeFavorites v-if="tab.id === 'trade'" :current-url="addressInput" @go="load" />
      <button
        v-else
        type="button"
        class="ar-quick"
        :title="tr('Ouvrir cette page dans ton navigateur habituel', 'Open this page in your usual browser')"
        @click="openExternal"
      >
        <i class="fas fa-external-link-alt"></i>
        {{ tr("Ouvrir dans mon navigateur", "Open in my browser") }}
      </button>
    </div>
    <webview
      ref="webviewEl"
      class="ar-webview"
      :style="{ opacity: painted ? 1 : 0 }"
      partition="persist:atziri-browser"
      :src="initialSrc"
      allowpopups
    ></webview>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, watch, type PropType } from "vue";
import { tr } from "@/web/atziri-lang";
import TradeFavorites from "./TradeFavorites.vue";
import {
  type WebTab,
  webTabUrls,
  webTabRequest,
  rememberTabUrl,
  localizeUrl,
} from "./atziri-hub";

const props = defineProps({
  tab: { type: Object as PropType<WebTab>, required: true },
});

// set once: later navigation goes through loadURL so the page keeps its history
const initialSrc = localizeUrl(webTabUrls.value[props.tab.id] ?? props.tab.home);
const addressInput = shallowRef(initialSrc);
// the parts of Electron's <webview> element used here
interface WebviewElement extends HTMLElement {
  loadURL(url: string): void;
  getURL(): string;
  goBack(): void;
  goForward(): void;
  reload(): void;
}
const webviewEl = shallowRef<WebviewElement | null>(null);
const painted = shallowRef(false);
// never stay invisible if a page is very slow
setTimeout(() => (painted.value = true), 4000);
// first time the tab is shown: the page draws itself only now, so give it
// a short moment hidden as well
let shownOnce = false;
const seen = new IntersectionObserver((entries) => {
  if (shownOnce || !entries.some((e) => e.isIntersecting)) return;
  shownOnce = true;
  seen.disconnect();
  painted.value = false;
  // not loaded yet: "dom-ready" will show it
  if (ready) setTimeout(() => (painted.value = true), 250);
});
watch(webviewEl, (el) => {
  if (el) seen.observe(el);
});
let ready = false;
let pendingUrl: string | null = null;

watch(webviewEl, (el) => {
  if (!el) return;
  el.addEventListener("dom-ready", () => {
    ready = true;
    if (pendingUrl) {
      const url = pendingUrl;
      pendingUrl = null;
      el.loadURL(url);
      return; // show it once the requested page is there
    }
    // Atziri Exchange: the page stays invisible (dark background behind)
    // until it has had time to draw, instead of a white flash
    if (!painted.value) setTimeout(() => (painted.value = true), 150);
  });
  const onNav = (e: Event & { url?: string }) => {
    if (!e.url) return;
    addressInput.value = e.url;
    rememberTabUrl(props.tab.id, e.url);
  };
  el.addEventListener("did-navigate", onNav as EventListener);
  el.addEventListener("did-navigate-in-page", onNav as EventListener);
});

function load(url: string) {
  addressInput.value = url;
  const el = webviewEl.value;
  if (el && ready) {
    el.loadURL(url);
  } else {
    pendingUrl = url;
  }
}

// pages requested from outside (PoEDB shortcut...)
watch(webTabRequest, (req) => {
  if (req && req.tab === props.tab.id) load(req.url);
});
if (webTabRequest.value?.tab === props.tab.id) {
  pendingUrl = webTabRequest.value.url;
}

function goToAddress() {
  let url = addressInput.value.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) {
    url =
      url.includes(".") && !url.includes(" ")
        ? `https://${url}`
        : `https://www.google.com/search?q=${encodeURIComponent(url)}`;
  }
  load(url);
}

function webviewDo(method: "goBack" | "goForward" | "reload") {
  try {
    webviewEl.value?.[method]?.();
  } catch {
    // webview not ready yet
  }
}

function currentUrl() {
  let url = addressInput.value;
  try {
    url = webviewEl.value?.getURL?.() || url;
  } catch {
    // keep the address bar value
  }
  return url;
}

const copied = shallowRef(false);
async function copyUrl() {
  try {
    await navigator.clipboard.writeText(currentUrl());
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    // clipboard unavailable
  }
}

// window.open is turned into "open in the default browser" by the main process
function openExternal() {
  const url = currentUrl();
  if (/^https?:\/\//i.test(url)) window.open(url);
}
</script>
