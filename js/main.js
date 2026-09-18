/**
 * Portfolio — Home page
 * ─────────────────────
 * Eleventy renders the FR page at "/" and the EN page at "/en/" as two
 * fully static documents, so this file never renders any content — it only
 * wires up interaction. It goes through boot() so the same wiring can be
 * reapplied after a language swap replaces the markup.
 */

import {
  boot,
  initChrome,
  initNavScrollSpy,
  onTeardown,
} from "./ui.js";

/* ─────────────────────────────────────────────────────────────
   Hero — the terminal types `whoami` on the first visit
   ───────────────────────────────────────────────────────────── */

/* The inline script in <head> decides whether to play (html.intro). Nothing
   is ever blocked: any key, click, wheel or scroll finishes it at once. */

/** setTimeout as a promise, cut short when `signal` aborts. */
const wait = (ms, signal) =>
  new Promise((resolve) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(id);
      resolve();
    });
  });

function initTerminal() {
  const root = document.documentElement;
  const body = document.querySelector(".hero .term__body");
  if (!body) return;

  const cta = body.querySelector(".btn--accent");
  const suggest = body.querySelector(".term__suggest");
  const bound = new AbortController();
  onTeardown(() => bound.abort());

  // Enter accepts the suggestion — unless focus is on something Enter
  // already means something for, or the hero has scrolled away.
  function armEnter() {
    if (!cta || !suggest) return;
    suggest.hidden = false;
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key !== "Enter" || e.repeat || e.isComposing) return;
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        const active = document.activeElement;
        if (active && active !== document.body) return;
        if (body.getBoundingClientRect().bottom < 0) return;

        e.preventDefault();
        suggest.classList.add("is-run");
        setTimeout(() => suggest.classList.remove("is-run"), 700);
        cta.click();
      },
      { signal: bound.signal },
    );
  }

  if (!root.classList.contains("intro")) {
    armEnter();
    return;
  }
  root.setAttribute("data-intro-live", "");

  const lines = [...body.children];
  const first = lines[0];
  const actions = body.querySelector(".actions");
  const output = lines.slice(1, -1).filter((line) => line !== actions);
  const cursor = document.createElement("span");
  cursor.className = "term__cursor term__cursor--float";
  const skip = new AbortController();
  let done = false;

  /* Every text node the intro types out. Each one is split into what is
     typed so far and a "ghost" holding the rest, laid out but invisible:
     the text always takes its final place, so nothing moves while it types
     — whatever the wrapping, and even if the web fonts land mid-way. */
  const texts = [];
  for (const line of [first, ...output]) {
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
    }
    for (const node of nodes) {
      const text = node.nodeValue;
      // One wrapper, so a flex line (the status) still sees a single item.
      const wrap = document.createElement("span");
      const ghost = document.createElement("span");
      ghost.className = "term__ghost";
      ghost.textContent = text;
      node.nodeValue = "";
      node.replaceWith(wrap);
      wrap.append(node, ghost);
      texts.push({ node, ghost, wrap, line, text });
    }
  }
  body.setAttribute("aria-busy", "true");

  function finish() {
    if (done) return;
    done = true;
    skip.abort();
    texts.forEach(({ node, wrap, text }) => {
      node.nodeValue = text;
      wrap.replaceWith(node);
    });
    cursor.remove();
    lines.forEach((line) => line.classList.add("is-shown"));
    actions?.querySelectorAll(":scope > *").forEach((el) => el.classList.add("is-shown"));
    body.removeAttribute("aria-busy");
    root.classList.add("intro-reveal");
    root.classList.remove("intro");
    root.removeAttribute("data-intro-live");
    setTimeout(() => root.classList.remove("intro-reveal"), 700);
    armEnter();
  }

  // Synchronous on purpose: a language swap reboots the page right after.
  onTeardown(finish);
  ["keydown", "pointerdown", "wheel", "touchstart", "scroll"].forEach((type) =>
    window.addEventListener(type, finish, {
      passive: true,
      signal: skip.signal,
    }),
  );

  /* Types a text into place, the cursor riding at its end. Without a
     duration it is typed by hand (uneven keystrokes); with one, it streams
     out like program output, a few characters per frame. */
  async function type({ node, ghost, text }, duration) {
    node.after(cursor);
    const step = duration ? Math.ceil(text.length / (duration / 16)) : 1;
    for (let i = step; ; i += step) {
      if (done) return;
      node.nodeValue = text.slice(0, i);
      ghost.textContent = text.slice(i);
      if (i >= text.length) return;
      await wait(duration ? 16 : 50 + Math.random() * 70, skip.signal);
    }
  }

  // How long each line of output takes to print, in order.
  const durations = [300, 220, 420, 260];
  // Beats of the scene: Enter is pressed, the shell "thinks", then the output
  // arrives line by line with a short breath between lines.
  const RUN_PAUSE = 550;
  const LINE_GAP = 170;

  (async () => {
    const { signal } = skip;
    first.classList.add("is-shown");
    texts[0].node.after(cursor);
    await wait(300, signal);

    for (const t of texts.filter((t) => t.line === first)) await type(t);
    // Enter pressed: the cursor drops out while the command "runs".
    await wait(150, signal);
    cursor.remove();
    await wait(RUN_PAUSE, signal);

    for (const [i, line] of output.entries()) {
      if (done) return;
      line.classList.add("is-shown");
      for (const t of texts.filter((t) => t.line === line)) {
        await type(t, durations[i] ?? 400);
      }
      await wait(LINE_GAP, signal);
    }

    // The actions come up one command at a time.
    if (actions && !done) {
      cursor.remove();
      actions.classList.add("is-shown");
      for (const el of actions.children) {
        if (done) return;
        el.classList.add("is-shown");
        await wait(60, signal);
      }
    }
    await wait(120, signal);
    finish();
  })();
}

/* ─────────────────────────────────────────────────────────────
   Skills — pick a skill, see the projects that used it
   ───────────────────────────────────────────────────────────── */

/* Every skill's list of projects is already in the page, one hidden block
   each; this only chooses which block shows. Without JavaScript the chips
   stay a plain list and the panel stays hidden. */
function initSkills() {
  const root = document.querySelector("[data-skills]");
  if (!root) return;

  const chips = [...root.querySelectorAll("button[data-skill]")];
  const panel = root.querySelector(".skills__uses");
  const blocks = [...root.querySelectorAll("[data-uses]")];
  if (!chips.length || !panel) return;

  function select(skill) {
    panel.classList.toggle("is-open", Boolean(skill));
    chips.forEach((chip) =>
      chip.setAttribute("aria-pressed", String(chip.dataset.skill === skill)),
    );
    blocks.forEach((block) => {
      block.hidden = block.dataset.uses !== skill;
    });
  }

  // Clicking the selected skill again deselects it and hides the panel.
  chips.forEach((chip) =>
    chip.addEventListener("click", () =>
      select(chip.getAttribute("aria-pressed") === "true" ? null : chip.dataset.skill),
    ),
  );

  select(null);
}

boot(() => {
  initChrome();
  initTerminal();
  initNavScrollSpy();
  initSkills();
});
