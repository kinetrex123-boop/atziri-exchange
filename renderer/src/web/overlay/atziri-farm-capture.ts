// Atziri Exchange: Farm tab inputs that only the in-game overlay receives
// (never the detached window, so nothing is counted twice):
// - zone changes from the game log (automatic timer per map),
// - the "add loot" hotkey (Ctrl + T by default).
import { Host } from "@/web/background/IPC";
import { parseClipboard } from "@/parser";
import { onAtziriLogEvent } from "@/web/client-log/client-log";
import { handleFarmLogEvent, addLoot } from "./atziri-farm";

/** Short label of a copied item: its name lines, plus the stack size */
export function lootLabel(clipboard: string): string | undefined {
  const first = clipboard.replace(/\r/g, "").split("\n--------\n")[0];
  const lines = first.split("\n").map((l) => l.trim()).filter(Boolean);
  // line 1: item class, line 2: rarity, then the name (1 or 2 lines)
  const name = lines.slice(2).join(" — ");
  if (!name) return undefined;
  const parsed = parseClipboard(clipboard);
  const stack = parsed.isOk() ? parsed.value.stackSize?.value : undefined;
  return stack && stack > 1 ? `${name} ×${stack}` : name;
}

let started = false;
export function initFarmCapture() {
  if (started) return;
  started = true;
  onAtziriLogEvent(handleFarmLogEvent);
  Host.onEvent("MAIN->CLIENT::item-text", (e) => {
    if (e.target !== "atziri-farm-loot") return;
    const label = lootLabel(e.clipboard);
    if (label) addLoot(label);
  });
}
