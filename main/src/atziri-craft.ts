// Atziri Exchange: "Suivi craft" tab. The overlay says when a currency is
// armed (and not paused); only then are the Shift + left clicks of the game
// forwarded to it, so nothing is sent during normal play.
import type { IncomingMessage, Server, ServerResponse } from "http";

let armed = false;

export function isCraftArmed() {
  return armed;
}

/** Route POST /atziri-craft/armed?on=1|0 */
export function setupAtziriCraft(server: Server) {
  server.prependListener("request", (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? "";
    if (!url.startsWith("/atziri-craft/")) return;
    (req as IncomingMessage & { atziriHandled?: boolean }).atziriHandled = true;
    if (req.method === "POST" && url.startsWith("/atziri-craft/armed")) {
      armed = new URL(url, "http://localhost").searchParams.get("on") === "1";
    }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ armed }));
  });
}
