/**
 * Portfolio — Home page
 * ─────────────────────
 * Eleventy renders the FR page at "/" and the EN page at "/en/" as two
 * fully static documents, so this file never renders any content — it only
 * wires up the chrome. It goes through boot() so the same wiring can be
 * reapplied after a language swap replaces the markup.
 */

import { boot, initChrome, initNavScrollSpy } from "./ui.js";

boot(() => {
  initChrome();
  initNavScrollSpy();
});
