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
   Work — arrows for the carousel on small screens
   ───────────────────────────────────────────────────────────── */

/* Below 960px the cards scroll sideways (CSS). The arrows only show when
   the row actually overflows, move it by one card, and grey out at
   either end. Swiping and the trackpad keep working as usual. */
function initStackNav() {
  const stack = document.querySelector("[data-stack]");
  const nav = document.querySelector("[data-stack-nav]");
  if (!stack || !nav) return;

  const [prev, next] = nav.querySelectorAll("button");
  const signal = binding();
  let queued = false;

  function paint() {
    queued = false;
    const max = stack.scrollWidth - stack.clientWidth;
    nav.hidden = max <= 2;
    prev.disabled = stack.scrollLeft <= 2;
    next.disabled = stack.scrollLeft >= max - 2;
  }

  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(paint);
  };

  nav.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-dir]");
    if (!btn) return;
    const card = stack.querySelector(".card");
    const gap = parseFloat(getComputedStyle(stack).columnGap) || 0;
    stack.scrollBy({
      left: Number(btn.dataset.dir) * (card.offsetWidth + gap),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, { signal });

  stack.addEventListener("scroll", schedule, { passive: true, signal });
  window.addEventListener("resize", schedule, { passive: true, signal });
  paint();
}

/* ─────────────────────────────────────────────────────────────
   Work — a badge follows the pointer over the visuals
   ───────────────────────────────────────────────────────────── */

function initCursor() {
  const stack = document.querySelector("[data-stack]");
  if (!stack || !stack.querySelector("[data-cursor]")) return;
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
  let shown = false;
  let pointer = null; // last known position, null once it left the window

  function move() {
    x += (tx - x) * ease;
    y += (ty - y) * ease;
    // `translate`, not `transform`: the individual property is applied
    // after `scale`, so the badge shrinks in place instead of sliding
    // towards the corner as its offset shrinks with it.
    badge.style.translate = `${x}px ${y}px`;
    frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(move) : 0;
  }

  /* One question decides everything: is the pointer over a visual right
     now? Asked on every move, and again after a scroll, which slides the
     visuals under a still pointer without any pointer event. */
  function update(over) {
    if (over && !shown) {
      // Appears where the pointer is, rather than gliding in from afar.
      x = tx;
      y = ty;
      badge.style.translate = `${x}px ${y}px`;
    }
    shown = over;
    badge.classList.toggle("is-visible", over);
    if (over && !frame) frame = requestAnimationFrame(move);
  }

  document.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    pointer = { x: e.clientX, y: e.clientY };
    tx = e.clientX;
    ty = e.clientY;
    update(Boolean(e.target.closest?.("[data-cursor]")));
  }, { passive: true, signal });

  let queued = false;
  window.addEventListener("scroll", () => {
    if (queued || !pointer) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const el = document.elementFromPoint(pointer.x, pointer.y);
      update(Boolean(el?.closest("[data-cursor]")));
    });
  }, { passive: true, signal });

  document.documentElement.addEventListener("pointerleave", () => {
    pointer = null;
    update(false);
  }, { signal });
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
  initStack();
  initStackNav();
  initCursor();
  initSkills();
});
