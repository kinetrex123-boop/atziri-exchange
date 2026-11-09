import type { Widget } from "../overlay/widgets.js";
import type { MapCheckConfig } from "../map-check/common.js";

export interface ItemCheckWidget extends Widget {
  hotkey: string | null;
  wikiKey: string | null;
  poedbKey: string | null;
  // Atziri Exchange: adds the hovered item to the Farm tab (current map)
  atziriFarmKey?: string | null;
  // Atziri Exchange: compares the hovered item with the Path of Building build
  atziriPobKey?: string | null;
  craftOfExileKey: string | null;
  stashSearchKey: string | null;
  samePricedKey: string | null;
  samePricedType: "price" | "both";
  maps: MapCheckConfig;
}
