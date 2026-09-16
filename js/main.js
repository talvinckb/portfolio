/**
 * Portfolio — Home page
 * ─────────────────────
 * Eleventy renders the FR page at "/" and the EN page at "/en/" as two
 * fully static documents, so switching language is a plain link and this
 * file never has to render any content — it only wires up the chrome.
 */

import { initChrome, initNavScrollSpy } from "./ui.js";

initChrome();
initNavScrollSpy();
