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
   Hero — the lens: under the pointer the name keeps only its contours
   ───────────────────────────────────────────────────────────── */

/* The outline copy of the name is masked to a circle (CSS). This moves the
   circle after the mouse, opens it while the mouse is over the name, and
   passes it once across the name after the entrance, so that touch screens
   see it as well. */
function initHeroLens() {
  const name = document.querySelector("[data-lens]");
  if (!name || prefersReducedMotion()) return;

  const signal = binding();
  const em = () => parseFloat(getComputedStyle(name).fontSize);
  let x = 0, y = 0, tx = 0, ty = 0, frame = 0;
  let open = false;
  let sweep = 0; // the entrance pass, while it runs

  function glide() {
    x += (tx - x) * 0.2;
    y += (ty - y) * 0.2;
    name.style.setProperty("--lens-x", `${x.toFixed(1)}px`);
    name.style.setProperty("--lens-y", `${y.toFixed(1)}px`);
    frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(glide) : 0;
  }

  function aim(nx, ny, jump) {
    tx = nx;
    ty = ny;
    if (jump) {
      x = nx;
      y = ny;
    }
    if (!frame) frame = requestAnimationFrame(glide);
  }

  function setRadius(r) {
    open = r > 0;
    if (open) name.classList.add("is-lensing");
    name.style.setProperty("--lens-r", `${r}px`);
  }

  // The masks cost a repaint per frame: they go once the circle has closed.
  name.addEventListener("transitionend", (e) => {
    if (e.propertyName === "--lens-r" && !open) name.classList.remove("is-lensing");
  }, { signal });

  document.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || sweep) return;
    const box = name.getBoundingClientRect();
    const px = e.clientX - box.left;
    const py = e.clientY - box.top;
    const over = px >= 0 && py >= 0 && px <= box.width && py <= box.height;
    if (over && !open) {
      aim(px, py, true);
      setRadius(em() * 0.42);
    } else if (over) {
      aim(px, py, false);
    } else if (open) {
      setRadius(0);
    }
  }, { passive: true, signal });

  document.documentElement.addEventListener("pointerleave", () => {
    if (open && !sweep) setRadius(0);
  }, { signal });

  // The entrance pass: once per visit, after the letters have risen, left
  // to right between the two lines.
  if (document.documentElement.classList.contains("hero-played")) return;
  const start = setTimeout(() => {
    const box = name.getBoundingClientRect();
    if (open || box.bottom < 0 || box.top > window.innerHeight) return;
    const r = em() * 0.55;
    const t0 = performance.now();
    const duration = 2100;
    aim(-r, box.height / 2, true);
    setRadius(r);
    const step = (now) => {
      const k = Math.min(1, (now - t0) / duration);
      const eased = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      aim(-r + eased * (box.width + 2 * r), box.height / 2, true);
      if (k < 1) {
        sweep = requestAnimationFrame(step);
      } else {
        sweep = 0;
        setRadius(0);
      }
    };
    sweep = requestAnimationFrame(step);
  }, 1500);

  onTeardown(() => {
    clearTimeout(start);
    cancelAnimationFrame(sweep);
    cancelAnimationFrame(frame);
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

  // A link to a card (from the skills) can't rely on the browser: below the
  // stack every card is stuck in the same spot, so it would always land on
  // the last one. Scroll to where the card itself comes to rest instead.
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#p-"]');
    const card = a && document.getElementById(a.hash.slice(1));
    if (!card || getComputedStyle(card).position !== "sticky") return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    bringCard(card);
    history.pushState(history.state, "", a.hash);
  }, { signal });

  // Previous and next: the arrows around a card's index, and ← → while
  // the work is on screen. They act on the card in front.
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".card__step");
    if (!btn) return;
    const target = cards[cards.indexOf(btn.closest(".card")) + Number(btn.dataset.step)];
    if (target) bringCard(target);
  }, { signal });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.target.closest?.("input, textarea, select, [contenteditable], [data-matrix]")) return;
    const front = frontCard(cards);
    const target = front && cards[cards.indexOf(front) + (e.key === "ArrowLeft" ? -1 : 1)];
    if (!target) return;
    e.preventDefault();
    bringCard(target);
  }, { signal });
}

/* Brings a card to the front. Stuck in the stack, a card sits where every
   other one sits: scroll to where it comes to rest instead. In the carousel,
   slide the row to it; anywhere else, scroll to its top. */
function bringCard(card) {
  const behavior = prefersReducedMotion() ? "auto" : "smooth";
  if (getComputedStyle(card).position === "sticky") {
    card.style.position = "static";
    const rest = card.getBoundingClientRect().top + window.scrollY;
    card.style.position = "";
    window.scrollTo({ top: rest - parseFloat(getComputedStyle(card).top), behavior });
  } else if (getComputedStyle(card.parentElement).overflowX === "auto") {
    card.scrollIntoView({ behavior, block: "nearest", inline: "start" });
  } else {
    card.scrollIntoView({ behavior, block: "start" });
  }
}

/* The card the most in view, counting only what the next card leaves
   uncovered in the stack and what shows inside the carousel's row. */
function frontCard(cards) {
  const row = cards[0].parentElement.getBoundingClientRect();
  let front = null;
  let best = 0.3;
  for (const card of cards) {
    const r = card.getBoundingClientRect();
    const w = Math.min(r.right, row.right, window.innerWidth) - Math.max(r.left, row.left, 0);
    const h = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
    const covered = parseFloat(card.style.getPropertyValue("--p")) || 0;
    const seen = w > 0 && h > 0 ? ((w * h) / (r.width * r.height)) * (1 - covered) : 0;
    if (seen > best) {
      front = card;
      best = seen;
    }
  }
  return front;
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
   Background — the branch graph beside the timeline
   ───────────────────────────────────────────────────────────── */

/* Rows run from the most recent to the oldest. Rows marked data-trunk sit
   on the main line, the studies. Any other row is a branch: it forks off
   below its own row, has its dot at its title and merges back at the top
   of the first row that does not start after its end; with no end it stays
   open. The "today" row splits every line into done (solid) and planned
   (dotted). Lanes are handed out shortest branch first, so short detours
   hug the trunk and long ones go around them. */
function initTimeline() {
  const root = document.querySelector("[data-tl]");
  const list = root?.querySelector(".tl__list");
  if (!list) return;

  const NS = "http://www.w3.org/2000/svg";
  const signal = binding();
  const rows = [...list.children];
  const nowRow = list.querySelector(".tl__now");
  const iNow = rows.indexOf(nowRow);
  const items = rows
    .map((row, i) => ({
      row,
      i,
      id: row.id,
      end: row.dataset.end || null,
      trunk: row.hasAttribute("data-trunk"),
      state: ["past", "live", "next"].find((s) => row.classList.contains(`is-${s}`)),
    }))
    .filter((it) => it.state);

  // Extents in row units: boundary b is the top edge of row b.
  const branches = items.filter((it) => !it.trunk);
  branches.forEach((b) => {
    b.bottom = b.i + 1;
    b.top = b.end ? rows.findIndex((r) => r.dataset.start <= b.end) : iNow + 0.25;
  });
  const lanes = [];
  [...branches]
    .sort((a, b) => a.bottom - a.top - (b.bottom - b.top))
    .forEach((b) => {
      let l = 0;
      while ((lanes[l] ||= []).some((o) => o.top < b.bottom && b.top < o.bottom)) l++;
      lanes[l].push(b);
      b.lane = l + 1;
    });

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "tl__svg");
  svg.setAttribute("aria-hidden", "true");
  root.prepend(svg);
  root.classList.add("is-drawn");
  onTeardown(() => svg.remove());

  const narrow = window.matchMedia("(max-width: 719px)");
  let focused = null; // id of the row under the pointer, kept across redraws

  function draw() {
    const step = narrow.matches ? 14 : 18;
    const C = narrow.matches ? 14 : 18; // height of a fork or merge curve
    const x0 = 7;
    const gutter = x0 + lanes.length * step + (narrow.matches ? 16 : 18);
    root.style.setProperty("--tl-gutter", `${gutter}px`);

    // Measured after the gutter is set: it moves the text, so the rows.
    const base = list.getBoundingClientRect().top;
    const edges = rows.map((r) => r.getBoundingClientRect().top - base);
    edges.push(list.getBoundingClientRect().height);
    const at = (b) => {
      const k = Math.floor(b);
      return edges[k] + (b - k) * (edges[k + 1] - edges[k]);
    };
    const dotY = (row) => {
      const r = row.querySelector("[data-tl-dot]").getBoundingClientRect();
      return r.top + r.height / 2 - base;
    };
    const yNow = nowRow ? dotY(nowRow) : -Infinity;

    svg.replaceChildren();
    svg.setAttribute("width", String(gutter));
    svg.setAttribute("height", String(edges.at(-1)));

    const lines = document.createElementNS(NS, "g");
    const dots = document.createElementNS(NS, "g");
    svg.append(lines, dots);

    // Older rows draw first, from the bottom up.
    const delay = (i) => `${((rows.length - i) * 0.07).toFixed(2)}s`;
    const path = (d, cls, it) => {
      if (!d) return;
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("class", `tl__line ${cls}`);
      if (!cls.includes("is-next")) p.setAttribute("pathLength", "1");
      p.dataset.for = it.id;
      p.classList.toggle("is-on", it.id === focused);
      p.style.setProperty("--d", delay(it.i));
      lines.append(p);
    };
    const dot = (x, y, cls, it, r) => {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", x);
      c.setAttribute("cy", y);
      c.setAttribute("r", r);
      c.setAttribute("class", `tl__dot ${cls}`);
      if (it) {
        c.dataset.for = it.id;
        c.classList.toggle("is-on", it.id === focused);
        c.style.setProperty("--d", delay(it.i));
      }
      dots.append(c);
    };
    // Done in the item's colour (grey or blue), planned dotted.
    const solid = (it) => `is-${it.state}`;

    // The trunk: from each study up to the next one.
    const trunk = items.filter((it) => it.trunk);
    trunk.forEach((it, k) => {
      const above = trunk[k - 1];
      const y = dotY(it.row);
      dot(x0, y, `is-${it.state}`, it, 5.5);
      if (!above) return;
      const yTop = dotY(above.row);
      if (it.state === "next" || yNow >= y) return path(`M${x0},${y} L${x0},${yTop}`, "is-next", it);
      if (it.state === "past" || yNow <= yTop) return path(`M${x0},${y} L${x0},${yTop}`, solid(it), it);
      path(`M${x0},${y} L${x0},${yNow}`, solid(it), it);
      path(`M${x0},${yNow} L${x0},${yTop}`, "is-next", it);
    });

    branches.forEach((it) => {
      const x = x0 + it.lane * step;
      const y0 = at(it.bottom);
      const fork = `M${x0},${y0} C${x0},${y0 - C * 0.6} ${x},${y0 - C * 0.4} ${x},${y0 - C}`;
      dot(x, dotY(it.row), `is-${it.state}`, it, 4.5);

      if (!it.end) {
        // Still open: solid up to today, then a short dotted tail.
        path(`${fork} L${x},${yNow}`, solid(it), it);
        path(`M${x},${yNow} L${x},${yNow - 12}`, "is-next", it);
        return;
      }
      const y1 = at(it.top);
      const merge = `C${x},${y1 + C * 0.4} ${x0},${y1 + C * 0.6} ${x0},${y1}`;
      if (it.state === "live" && yNow > y1 + C) {
        path(`${fork} L${x},${yNow}`, solid(it), it);
        path(`M${x},${yNow} L${x},${y1 + C} ${merge}`, "is-next", it);
      } else {
        path(`${fork} L${x},${y1 + C} ${merge}`, solid(it), it);
      }
    });

    if (nowRow) dot(x0, yNow, "is-now", null, 4);
  }

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      draw();
    });
  };
  draw();
  const resize = new ResizeObserver(schedule);
  resize.observe(list);
  onTeardown(() => resize.disconnect());
  narrow.addEventListener("change", schedule, { signal });

  // The lines draw in once, when the timeline first shows.
  let settle = 0;
  const seen = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    root.classList.add("is-in");
    seen.disconnect();
    settle = setTimeout(() => root.classList.add("is-settled"), 1800);
  }, { threshold: 0.15 });
  seen.observe(root);
  onTeardown(() => {
    seen.disconnect();
    clearTimeout(settle);
  });

  // Rows open and close by sliding their height rather than snapping. A
  // click mid-way turns the slide around from where it is.
  const slides = new WeakMap();
  list.addEventListener("click", (e) => {
    const summary = e.target.closest("summary.tl__head");
    if (!summary || prefersReducedMotion()) return;
    e.preventDefault();
    const details = summary.parentElement;
    const from = details.offsetHeight;
    const opening = !details.open || details.classList.contains("is-closing");
    slides.get(details)?.cancel();
    details.classList.toggle("is-closing", !opening);
    details.open = true;
    const to = opening ? details.offsetHeight : summary.offsetHeight;
    details.style.overflow = "hidden";
    const slide = details.animate(
      { height: [`${from}px`, `${to}px`] },
      { duration: opening ? 320 : 240, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
    slides.set(details, slide);
    slide.onfinish = () => {
      if (!opening) details.open = false;
      details.classList.remove("is-closing");
      details.style.overflow = "";
      slides.delete(details);
    };
  }, { signal });

  // Pointing at a row brings its branch forward. A redraw (a row opening)
  // happens under the pointer, so draw() reapplies it too.
  const focus = (id) => {
    focused = id;
    root.classList.toggle("is-focus", Boolean(id));
    svg.querySelectorAll("[data-for]").forEach((el) => {
      el.classList.toggle("is-on", el.dataset.for === id);
    });
  };
  list.addEventListener("pointerover", (e) => focus(e.target.closest(".tl__item")?.id ?? null), { signal });
  list.addEventListener("pointerleave", () => focus(null), { signal });

  // A link to a row (from the skills) opens it.
  const open = (hash) => {
    if (!hash.startsWith("#tl-")) return;
    const details = document.getElementById(hash.slice(1))?.querySelector("details");
    if (details) details.open = true;
  };
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#tl-"]');
    if (a) open(a.getAttribute("href"));
  }, { signal });
  open(location.hash);
}

/* ─────────────────────────────────────────────────────────────
   Skills — the matrix lights the row and the column pointed at
   ───────────────────────────────────────────────────────────── */

/* A row lights up in CSS alone; a column needs its cells gathered. The
   column headers are links, so the keyboard lights a column on focus. */
function initMatrix() {
  const table = document.querySelector("[data-matrix] table");
  if (!table) return;

  const signal = binding();
  const columns = new Map();
  table.querySelectorAll("[data-col]").forEach((cell) => {
    const key = cell.dataset.col;
    if (!columns.has(key)) columns.set(key, []);
    columns.get(key).push(cell);
  });

  let row = null;
  let col = null;

  function point(nextRow, nextCol) {
    if (nextRow !== row) {
      row?.classList.remove("is-row");
      row = nextRow;
      row?.classList.add("is-row");
    }
    if (nextCol !== col) {
      columns.get(col)?.forEach((cell) => cell.classList.remove("is-col"));
      col = nextCol;
      columns.get(col)?.forEach((cell) => cell.classList.add("is-col"));
    }
    table.classList.toggle("is-pointing", Boolean(row || col));
  }

  table.addEventListener("pointerover", (e) => {
    const cell = e.target.closest("td, th");
    if (!cell) return;
    point(cell.closest(".matrix__row"), cell.dataset.col ?? null);
  }, { signal });
  table.addEventListener("pointerleave", () => point(null, null), { signal });
  table.addEventListener("focusin", (e) => {
    point(null, e.target.closest("[data-col]")?.dataset.col ?? null);
  }, { signal });
  table.addEventListener("focusout", () => point(null, null), { signal });
}

/* ─────────────────────────────────────────────────────────────
   Skills on a phone — a tap lists the works a skill served in
   ───────────────────────────────────────────────────────────── */

/* One list open at a time; tapping its pill again closes it. */
function initSkillset() {
  const root = document.querySelector("[data-skillset]");
  if (!root) return;
  const signal = binding();
  const pills = [...root.querySelectorAll(".skillset__pill")];

  root.addEventListener("click", (e) => {
    const pill = e.target.closest(".skillset__pill");
    if (!pill) return;
    const open = pill.getAttribute("aria-expanded") !== "true";
    pills.forEach((other) => {
      const on = open && other === pill;
      other.setAttribute("aria-expanded", String(on));
      document.getElementById(other.getAttribute("aria-controls")).hidden = !on;
    });
  }, { signal });
}

boot(() => {
  initChrome();
  initHeroLens();
  initHeroOnce();
  initNavScrollSpy();
  initStack();
  initStackNav();
  initCursor();
  initTimeline();
  initMatrix();
  initSkillset();
});
