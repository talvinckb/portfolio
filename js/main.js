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
   GitHub graph — the latest weeks first, a count on each day
   ───────────────────────────────────────────────────────────── */

/* Where the graph is wider than the column (a phone), it scrolls, and the
   recent weeks are the ones worth seeing first. Pointing at a day, or
   tapping it, shows its count above it. */
function initContrib() {
  const scroller = document.querySelector("[data-contrib]");
  if (!scroller) return;
  scroller.scrollLeft = scroller.scrollWidth;

  const fig = scroller.parentElement;
  const tip = fig.querySelector(".contrib__tip");
  const signal = binding();

  const show = (day) => {
    const box = day.getBoundingClientRect();
    const frame = fig.getBoundingClientRect();
    tip.textContent = day.dataset.tip;
    tip.hidden = false;
    // Kept inside the figure near its edges; the arrow still points at
    // the day, wherever the bubble had to move.
    // It may reach a little into the block's padding, and the arrow stays
    // clear of its rounded corners.
    const half = tip.offsetWidth / 2;
    const cell = box.left + box.width / 2 - frame.left;
    const x = Math.min(frame.width + 12 - half, Math.max(half - 12, cell));
    const arrow = Math.max(10 - half, Math.min(half - 10, cell - x));
    tip.style.left = `${x}px`;
    tip.style.top = `${box.top - frame.top}px`;
    tip.style.setProperty("--arrow", `${arrow}px`);
  };

  // Only a day the pointer rests on gets its bubble: sweeping across the
  // graph shows nothing.
  let timer = 0;
  let current = null;
  const hide = () => {
    clearTimeout(timer);
    current = null;
    tip.hidden = true;
  };
  onTeardown(() => clearTimeout(timer));

  scroller.addEventListener("pointerover", (e) => {
    const day = e.target.closest(".contrib__day");
    if (day === current) return;
    hide();
    if (!day) return;
    current = day;
    timer = setTimeout(() => show(day), 350);
  }, { signal });
  scroller.addEventListener("pointerleave", hide, { signal });
  scroller.addEventListener("scroll", hide, { passive: true, signal });
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
  initNavScrollSpy();
  initContrib();
  initTimeline();
  initMatrix();
  initSkillset();
});
