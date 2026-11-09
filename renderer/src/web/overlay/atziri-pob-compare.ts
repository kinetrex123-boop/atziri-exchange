// Atziri Exchange: Ctrl + B, compares the hovered item with the gear of the
// player's Path of Building build (overlay window only)
import { shallowRef } from "vue";
import { Host } from "@/web/background/IPC";
import { parseClipboard } from "@/parser";
import { toPobItem } from "./atziri-pob-item";
import { pobCompare, type PobCompare } from "./atziri-pob";

export interface CompareState {
  status: "loading" | "done" | "error";
  itemName: string;
  data?: PobCompare;
  unknown: string[];
  error?: string;
}

export const pobCompareState = shallowRef<CompareState | null>(null);

export function closePobCompare() {
  pobCompareState.value = null;
}

/** name lines of the copied item, for the panel title */
function nameOf(clipboard: string) {
  const first = clipboard.replace(/\r/g, "").split("\n--------\n")[0];
  return first.split("\n").slice(2).join(" — ").trim();
}

let started = false;
export function initPobCompare() {
  if (started) return;
  started = true;
  // for checks from the developer tools: atziriPobTranslate(itemText)
  Object.assign(window, {
    atziriPobTranslate: async (clipboard: string) => {
      const parsed = parseClipboard(clipboard);
      if (!parsed.isOk()) return { error: String(parsed.error) };
      return await toPobItem(parsed.value, clipboard);
    },
    // shows the Ctrl + B panel for an item text, like the hotkey does
    atziriPobPreview: async (clipboard: string) => {
      await run(clipboard);
    },
  });
  Host.onEvent("MAIN->CLIENT::item-text", (e) => {
    if (e.target !== "atziri-pob-compare") return;
    run(e.clipboard).catch(() => undefined);
  });
}

async function run(clipboard: string) {
  const itemName = nameOf(clipboard);
  pobCompareState.value = { status: "loading", itemName, unknown: [] };
  const parsed = parseClipboard(clipboard);
  if (!parsed.isOk()) {
    pobCompareState.value = { status: "error", itemName, unknown: [], error: "item" };
    return;
  }
  try {
    const pobItem = await toPobItem(parsed.value, clipboard);
    const data = await pobCompare(pobItem.text);
    if (pobCompareState.value?.itemName !== itemName) return; // another one since
    pobCompareState.value = { status: "done", itemName, data, unknown: pobItem.unknown };
  } catch (e) {
    pobCompareState.value = {
      status: "error",
      itemName,
      unknown: [],
      error: (e as Error).message,
    };
  }
}
