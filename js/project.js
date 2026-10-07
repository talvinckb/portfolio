/**
 * Portfolio — Project case-study pages
 * ────────────────────────────────────
 * FR and EN are separate static documents; the language switch swaps one
 * for the other (see ui.js). This file only adds page-local behaviour: image
 * lightbox, charts and step viewers, scrollable tables and math rendering.
 */

import {
  boot,
  initChrome,
  initNavScrollSpy,
  onTeardown,
  prefersReducedMotion,
} from "./ui.js";

const lang = () => (document.documentElement.lang === "en" ? "en" : "fr");

// Resolved per call, not at module load: a language swap does not re-evaluate
// this module, so a value captured here would stay in the previous language.
const strings = () =>
  ({
    fr: { close: "Fermer (Échap)", enlarged: "Vue agrandie" },
    en: { close: "Close (Esc)", enlarged: "Enlarged view" },
  })[lang()];

/* ─────────────────────────────────────────────────────────────
   Lightbox — native <dialog> for focus trapping and Escape
   ───────────────────────────────────────────────────────────── */

function initLightbox() {
  const zoomables = document.querySelectorAll(
    ".prose img:not(.stepper img), .case-cover__img, .pipeline-workflow",
  );
  if (!zoomables.length) return;

  const dialog = document.createElement("dialog");
  dialog.className = "lightbox";
  dialog.innerHTML = `
    <button class="lightbox__close" type="button" aria-label="${strings().close}" title="${strings().close}">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div class="lightbox__content"></div>
  `;
  document.body.appendChild(dialog);

  const content = dialog.querySelector(".lightbox__content");
  const closeBtn = dialog.querySelector(".lightbox__close");

  function open(source) {
    content.replaceChildren();

    if (source.tagName === "IMG") {
      const figure = document.createElement("figure");
      figure.className = "lightbox__figure";

      const img = document.createElement("img");
      img.src = source.currentSrc || source.src;
      img.alt = source.alt || strings().enlarged;
      figure.appendChild(img);

      const captionText = (
        source.closest("figure")?.querySelector("figcaption")?.textContent ||
        source.alt ||
        ""
      ).trim();

      if (captionText) {
        const caption = document.createElement("figcaption");
        caption.className = "lightbox__caption";
        caption.textContent = captionText;
        figure.appendChild(caption);
      }
      content.appendChild(figure);
    } else {
      const clone = source.cloneNode(true);
      clone.classList.add("pipeline-workflow--enlarged");
      clone.removeAttribute("title");
      content.appendChild(clone);
    }

    dialog.showModal();
    document.body.classList.add("has-menu-open");
    closeBtn.focus();
  }

  zoomables.forEach((el) => {
    el.classList.add("is-zoomable");
    el.addEventListener("click", () => open(el));
    // Keyboard parity: zoomable images are reachable and activatable.
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(el);
      }
    });
  });

  closeBtn.addEventListener("click", () => dialog.close());

  // Backdrop click: the dialog element itself is the only hit area outside content.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  dialog.addEventListener("close", () => {
    document.body.classList.remove("has-menu-open");
    content.replaceChildren();
  });
}

/* ─────────────────────────────────────────────────────────────
   Wide tables get their own scroll container
   ───────────────────────────────────────────────────────────── */

function initTableWrappers() {
  document.querySelectorAll(".prose table").forEach((table) => {
    if (table.parentElement.classList.contains("table-wrapper")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "table-wrapper";
    wrapper.tabIndex = 0;
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute(
      "aria-label",
      lang() === "en" ? "Scrollable table" : "Tableau défilable",
    );
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}

/* ─────────────────────────────────────────────────────────────
   Table of contents — highlight the section being read
   ───────────────────────────────────────────────────────────── */

function initTocSpy() {
  const links = [...document.querySelectorAll(".toc__list a")];
  if (!links.length) return;

  const pairs = links
    .map((link) => [document.getElementById(link.hash.slice(1)), link])
    .filter(([target]) => target);
  if (!pairs.length) return;

  // The section being read is the last heading above the upper third of the
  // viewport. A handful of headings: measuring them per frame is cheap.
  let queued = false;

  function paint() {
    queued = false;
    const line = window.innerHeight / 3;
    let active = pairs[0][1];
    for (const [target, link] of pairs) {
      if (target.getBoundingClientRect().top <= line) active = link;
      else break;
    }
    links.forEach((link) => link.classList.toggle("is-active", link === active));
  }

  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(paint);
  }

  const controller = new AbortController();
  window.addEventListener("scroll", onScroll, { passive: true, signal: controller.signal });
  window.addEventListener("resize", onScroll, { passive: true, signal: controller.signal });
  onTeardown(() => controller.abort());
  paint();
}

/* ─────────────────────────────────────────────────────────────
   Bar charts — the bars grow once, when the chart comes into view
   ───────────────────────────────────────────────────────────── */

function initBars() {
  const charts = document.querySelectorAll("[data-bars]");
  if (!charts.length) return;

  const seen = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      seen.unobserve(entry.target);
    });
  }, { threshold: 0.35 });

  charts.forEach((chart) => {
    chart.classList.add("is-armed");
    seen.observe(chart);
  });
  onTeardown(() => seen.disconnect());
}

/* ─────────────────────────────────────────────────────────────
   Step viewers — one step at a time
   ───────────────────────────────────────────────────────────── */

/* The steps pass on by themselves while the viewer is in view, until the
   reader picks one: from then on it is theirs. */
function initSteppers() {
  document.querySelectorAll("[data-stepper]").forEach((root) => {
    const frames = [...root.querySelectorAll(".stepper__frame")];
    const nav = root.querySelector(".stepper__nav");
    const buttons = nav ? [...nav.querySelectorAll("button")] : [];
    if (!frames.length || frames.length !== buttons.length) return;

    const controller = new AbortController();
    let current = 0;
    let timer = 0;
    let auto = !prefersReducedMotion();
    let inView = false;

    const show = (index) => {
      current = index;
      frames.forEach((frame, i) => frame.classList.toggle("is-on", i === index));
      buttons.forEach((btn, i) => btn.setAttribute("aria-pressed", String(i === index)));
    };

    const tick = () => {
      clearTimeout(timer);
      if (!auto || !inView || document.hidden) return;
      timer = setTimeout(() => {
        show((current + 1) % frames.length);
        tick();
      }, 2400);
    };

    buttons.forEach((btn, i) => {
      btn.addEventListener("click", () => {
        auto = false;
        clearTimeout(timer);
        show(i);
      }, { signal: controller.signal });
    });

    const seen = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      tick();
    }, { threshold: 0.6 });
    seen.observe(root);
    document.addEventListener("visibilitychange", tick, { signal: controller.signal });

    root.classList.add("is-ready");
    nav.hidden = false;
    show(0);

    onTeardown(() => {
      clearTimeout(timer);
      seen.disconnect();
      controller.abort();
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   ← and → go to the project before or after
   ───────────────────────────────────────────────────────────── */

/* The arrows follow the switcher's links, unless the key belongs to
   something else: a field, an open lightbox, a table or formula that
   scrolls sideways, or a modifier (the browser's own history keys). */
function initProjectKeys() {
  const controller = new AbortController();
  document.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const t = e.target;
    if (t.closest?.("input, textarea, select, [contenteditable], .table-wrapper, .katex-display, .stepper__nav, video")) return;
    if (document.querySelector("dialog[open]")) return;
    const link = document.querySelector(`[data-switch="${e.key === "ArrowLeft" ? "prev" : "next"}"]`);
    if (!link) return;
    e.preventDefault();
    link.click();
  }, { signal: controller.signal });
  onTeardown(() => controller.abort());
}

/* ─────────────────────────────────────────────────────────────
   KaTeX
   ───────────────────────────────────────────────────────────── */

function renderMath() {
  if (!window.renderMathInElement) return;
  window.renderMathInElement(document.querySelector(".prose"), {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
    ],
    throwOnError: false,
  });
}

/* ─────────────────────────────────────────────────────────────
   Init
   ───────────────────────────────────────────────────────────── */

boot(() => {
  initChrome();
  initNavScrollSpy();
  initTableWrappers();
  initLightbox();
  initBars();
  initSteppers();
  initProjectKeys();
  initTocSpy();
  renderMath(); // no-op until KaTeX has landed; re-runs after a language swap
});

// KaTeX ships as a deferred classic script, so it may land after this module.
if (!window.renderMathInElement) {
  window.addEventListener("load", renderMath, { once: true });
}
