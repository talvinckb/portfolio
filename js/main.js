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
  prefersReducedMotion,
} from "./ui.js";

/** An AbortController torn down with the page's wiring. */
function binding() {
  const controller = new AbortController();
  onTeardown(() => controller.abort());
  return controller.signal;
}

/* ─────────────────────────────────────────────────────────────
   Hero — the name rises once per visit
   ───────────────────────────────────────────────────────────── */

/* The letters animate in CSS. A language swap rebuilds the hero, which
   would replay it: once played, html.hero-played switches it off. */
function initHeroOnce() {
  const root = document.documentElement;
  if (root.classList.contains("hero-played")) return;
  const id = setTimeout(() => root.classList.add("hero-played"), 1600);
  onTeardown(() => {
    clearTimeout(id);
    root.classList.add("hero-played");
  });
}

/* ─────────────────────────────────────────────────────────────
   Strip — one project open at a time, in turn
   ───────────────────────────────────────────────────────────── */

/* Panels open on hover or focus. Left alone, they take turns. On a phone
   the strip is a row of cards to swipe through: nothing cycles there. */
function initStrip() {
  const strip = document.querySelector("[data-strip]");
  if (!strip) return;

  const panels = [...strip.querySelectorAll(".panel")];
  const signal = binding();
  const wide = window.matchMedia("(min-width: 721px)");
  let current = panels.findIndex((p) => p.classList.contains("is-open"));
  let held = false;
  let timer = 0;

  const open = (i) => {
    current = i;
    panels.forEach((p, k) => p.classList.toggle("is-open", k === i));
  };

  const cycle = () => {
    clearInterval(timer);
    if (prefersReducedMotion() || !wide.matches) return;
    timer = setInterval(() => {
      if (!held && !document.hidden) open((current + 1) % panels.length);
    }, 3400);
  };

  panels.forEach((panel, i) => {
    panel.addEventListener("pointerenter", () => { held = true; open(i); }, { signal });
    panel.addEventListener("focus", () => { held = true; open(i); }, { signal });
    panel.addEventListener("blur", () => { held = false; }, { signal });
  });
  strip.addEventListener("pointerleave", () => { held = false; cycle(); }, { signal });
  wide.addEventListener("change", cycle, { signal });

  // Starts once the strip has risen into place.
  const start = setTimeout(cycle, 1800);
  onTeardown(() => {
    clearTimeout(start);
    clearInterval(timer);
  });
}

/* ─────────────────────────────────────────────────────────────
   Work — the card being covered shrinks back
   ───────────────────────────────────────────────────────────── */

/* The cards are sticky (CSS); this only measures how much of each one the
   next card covers, as --p from 0 to 1, which the CSS turns into scale and
   fade. Six cards: measuring them per frame is cheap. */
function initStack() {
  const cards = [...document.querySelectorAll("[data-stack] .card")];
  if (cards.length < 2) return;

  const signal = binding();
  const sticky = window.matchMedia("(min-width: 960px) and (min-height: 620px)");
  let queued = false;

  function paint() {
    queued = false;
    const on = sticky.matches && !prefersReducedMotion();
    for (let i = 0; i < cards.length - 1; i++) {
      let p = 0;
      if (on) {
        const a = cards[i].getBoundingClientRect();
        const b = cards[i + 1].getBoundingClientRect();
        p = Math.max(0, Math.min(1, (a.bottom - b.top) / a.height));
      }
      cards[i].style.setProperty("--p", p.toFixed(3));
    }
  }

  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(paint);
  };

  window.addEventListener("scroll", onScroll, { passive: true, signal });
  window.addEventListener("resize", onScroll, { passive: true, signal });
  paint();
}

/* ─────────────────────────────────────────────────────────────
   Work — a badge follows the pointer over the visuals
   ───────────────────────────────────────────────────────────── */

function initCursor() {
  const stack = document.querySelector("[data-stack]");
  const targets = document.querySelectorAll("[data-cursor]");
  if (!stack || !targets.length) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  const badge = document.createElement("div");
  badge.className = "cursor";
  badge.setAttribute("aria-hidden", "true");
  badge.textContent = stack.dataset.cursorLabel || "";
  document.body.appendChild(badge);

  const signal = binding();
  onTeardown(() => badge.remove());

  const ease = prefersReducedMotion() ? 1 : 0.2;
  let x = 0, y = 0, tx = 0, ty = 0, frame = 0;

  function move() {
    x += (tx - x) * ease;
    y += (ty - y) * ease;
    badge.style.transform = `translate(${x}px, ${y}px)`;
    frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(move) : 0;
  }

  targets.forEach((el) => {
    el.addEventListener("pointerenter", (e) => {
      x = tx = e.clientX;
      y = ty = e.clientY;
      move();
      badge.classList.add("is-visible");
    }, { signal });
    el.addEventListener("pointermove", (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!frame) frame = requestAnimationFrame(move);
    }, { signal });
    el.addEventListener("pointerleave", () => badge.classList.remove("is-visible"), { signal });
  });
  // A wheel scroll moves the visual out from under a still pointer.
  window.addEventListener("scroll", () => badge.classList.remove("is-visible"), { passive: true, signal });
}

/* ─────────────────────────────────────────────────────────────
   Skills — point at a skill, see the projects that used it
   ───────────────────────────────────────────────────────────── */

/* Every skill's list of projects is already in the page, one hidden block
   each; this only chooses which block shows. The last one chosen stays,
   so the pointer can travel down to its links. Without JavaScript the
   skills stay a plain list and the panel stays hidden. */
function initSkills() {
  const root = document.querySelector("[data-skills]");
  if (!root) return;

  const skills = [...root.querySelectorAll("button[data-skill]")];
  const groups = root.querySelector(".skills__groups");
  const panel = root.querySelector(".skills__uses");
  const blocks = [...root.querySelectorAll("[data-uses]")];
  if (!skills.length || !panel) return;

  // Touch screens get a plain list: the panel would open far below the
  // tapped skill, so nothing is clickable there.
  if (matchMedia("(hover: none) and (pointer: coarse)").matches) {
    skills.forEach((skill) => {
      const label = document.createElement("span");
      label.className = `${skill.className} skill--static`;
      label.textContent = skill.textContent;
      skill.replaceWith(label);
    });
    return;
  }

  const signal = binding();

  function select(id) {
    panel.classList.toggle("is-open", Boolean(id));
    skills.forEach((skill) =>
      skill.setAttribute("aria-pressed", String(skill.dataset.skill === id)),
    );
    blocks.forEach((block) => {
      block.hidden = block.dataset.uses !== id;
    });
  }

  skills.forEach((skill) => {
    skill.addEventListener("pointerenter", () => select(skill.dataset.skill), { signal });
    skill.addEventListener("focus", () => select(skill.dataset.skill), { signal });
    skill.addEventListener("click", () => select(skill.dataset.skill), { signal });
  });

  // The other skills step back while one is pointed at.
  groups.addEventListener("pointerover", (e) => {
    groups.classList.toggle("is-dim", Boolean(e.target.closest("button[data-skill]")));
  }, { signal });
  groups.addEventListener("pointerleave", () => groups.classList.remove("is-dim"), { signal });

  select(null);
}

boot(() => {
  initChrome();
  initHeroOnce();
  initNavScrollSpy();
  initStrip();
  initStack();
  initCursor();
  initSkills();
});
