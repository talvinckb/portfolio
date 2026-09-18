/**
 * Portfolio — Shared UI behaviours
 * ────────────────────────────────
 * Imported by both main.js (home) and project.js (case studies) so the
 * chrome — theme, menu, scroll affordances, toasts — exists exactly once.
 *
 * Every page is fully rendered at build time by Eleventy; nothing here
 * produces content, it only wires up interaction.
 */

/* Switching language swaps the page contents in place instead of navigating.
   Anything bound outside that markup — window, document, matchMedia, observers
   — must therefore be undone before the swap, or it would stack up on every
   switch. Everything below registers against this bus; the swap aborts it. */
let bus = new AbortController();

/** Re-runs the current page's own wiring after a swap. */
let bootPage = null;

export function boot(fn) {
  bootPage = fn;
  fn();
}

/** Runs `fn` when the current page's wiring is torn down (language swap). */
export function onTeardown(fn) {
  bus.signal.addEventListener("abort", fn, { once: true });
}

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const scrollBehavior = () => (prefersReducedMotion() ? "auto" : "smooth");

/* ─────────────────────────────────────────────────────────────
   Theme
   ───────────────────────────────────────────────────────────── */

/** Swap thumbnails that ship a dedicated light-theme variant. */
function syncThemedImages(theme) {
  document.querySelectorAll("img[data-src-light]").forEach((img) => {
    const next =
      theme === "light"
        ? img.dataset.srcLight || img.dataset.srcDark
        : img.dataset.srcDark;
    if (next && img.getAttribute("src") !== next) img.src = next;
  });
}

export function initTheme() {
  const toggle = document.getElementById("theme-toggle");

  const apply = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    if (toggle) toggle.setAttribute("aria-pressed", String(theme === "light"));
    syncThemedImages(theme);
  };

  const systemTheme = () =>
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

  // The inline script in <head> already resolved the theme before paint;
  // the fallback only matters if it never ran, and must not contradict the
  // CSS media query that covers that same case.
  apply(document.documentElement.getAttribute("data-theme") || systemTheme());

  // A click is an explicit choice; it outranks the system preference from
  // then on. Tracked in memory too, since private mode can refuse to store it.
  let chosen = false;
  try {
    const v = localStorage.getItem("theme");
    chosen = v === "light" || v === "dark";
  } catch (e) {
    /* storage blocked — treat as no explicit choice */
  }

  // Until then, follow the system live rather than only on reload.
  if (window.matchMedia) {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = (e) => {
      if (!chosen) apply(e.matches ? "dark" : "light");
    };
    if (media.addEventListener)
      media.addEventListener("change", follow, { signal: bus.signal });
    else if (media.addListener) media.addListener(follow);
  }

  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const next =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    chosen = true;
    // A short cross-fade between the two themes where the browser can do it;
    // an instant switch otherwise, and whenever motion is reduced.
    if (document.startViewTransition && !prefersReducedMotion()) {
      document.startViewTransition(() => apply(next));
    } else {
      apply(next);
    }
    try {
      localStorage.setItem("theme", next);
    } catch (e) {
      /* private mode — the choice simply won't persist */
    }
  });
}

/* ─────────────────────────────────────────────────────────────
   Language switch — swap the page without navigating
   ───────────────────────────────────────────────────────────── */

/* Eleventy renders /  and /en/ as two complete static documents. The link is a
   real href, so without JS — or on a middle click — the browser navigates
   normally. With JS we fetch the other document and swap its body in, which
   keeps the scroll position exactly where it was: no reload, no jump. */

const pageCache = new Map();

/* Head tags whose content differs between languages. The stylesheet, fonts and
   scripts are identical, so the head is patched rather than replaced. */
const TRANSLATED_HEAD = [
  "title",
  'meta[name="description"]',
  'meta[property="og:title"]',
  'meta[property="og:description"]',
  'meta[property="og:url"]',
  'meta[property="og:locale"]',
  'link[rel="canonical"]',
];

function fetchPage(url) {
  if (!pageCache.has(url)) {
    pageCache.set(
      url,
      fetch(url, { credentials: "same-origin" })
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status}`);
          return res.text();
        })
        .then((html) => new DOMParser().parseFromString(html, "text/html"))
        .catch((err) => {
          pageCache.delete(url); // never cache a failure
          throw err;
        }),
    );
  }
  return pageCache.get(url);
}

/** Path of the document on screen — updated by every swap. */
let shownPath = window.location.pathname;

function applyPage(doc, url) {
  shownPath = new URL(url, window.location.href).pathname;
  document.documentElement.lang = doc.documentElement.lang;

  TRANSLATED_HEAD.forEach((sel) => {
    const next = doc.head.querySelector(sel);
    const current = document.head.querySelector(sel);
    if (next && current) current.replaceWith(next.cloneNode(true));
  });

  // Tear down everything bound outside the markup before discarding it.
  bus.abort();
  bus = new AbortController();

  const body = doc.body.cloneNode(true);
  // A script node adopted from a parsed document would run a second time.
  body.querySelectorAll("script").forEach((el) => el.remove());

  document.body.replaceChildren(...body.childNodes);
  document.body.className = doc.body.className;

  if (bootPage) bootPage();
}

let historyBound = false;

export function initLangSwitch() {
  const link = document.querySelector(".nav__lang");
  if (!link) return;

  // The other language is one small document; fetching it on hover makes the
  // swap feel immediate without costing anything on load.
  link.addEventListener("pointerenter", () => {
    fetchPage(link.href).catch(() => {});
  });

  link.addEventListener("click", (e) => {
    // Leave modified clicks alone: they mean "open elsewhere".
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }

    const url = link.href;
    e.preventDefault();
    const y = window.scrollY;

    fetchPage(url)
      .then((doc) => {
        applyPage(doc, url);
        history.pushState({ swapped: true }, "", url);
        // scroll-behavior is smooth on <html>; an instant jump here keeps the
        // position from visibly animating back.
        window.scrollTo({ top: y, left: 0, behavior: "instant" });
      })
      .catch(() => {
        window.location.href = url; // network trouble — let the browser do it
      });
  });

  if (historyBound) return;
  historyBound = true;

  // Registered once for the session: back/forward must swap too, and this
  // listener has to outlive the bus that the swap itself aborts.
  // Clicking an in-page anchor (#work…) fires popstate as well: only a change
  // of document may swap the page, or the swap would cancel the anchor's
  // scroll — which is what made some links need a second click.
  window.addEventListener("popstate", () => {
    if (window.location.pathname === shownPath) return;
    const y = window.scrollY;
    fetchPage(window.location.href)
      .then((doc) => {
        applyPage(doc, window.location.href);
        window.scrollTo({ top: y, left: 0, behavior: "instant" });
      })
      .catch(() => window.location.reload());
  });
}

/* ─────────────────────────────────────────────────────────────
   Mobile menu
   ───────────────────────────────────────────────────────────── */

export function initMobileMenu() {
  const burger = document.getElementById("nav-burger");
  const menu = document.getElementById("mobile-menu");
  if (!burger || !menu) return;

  const labelOpen = burger.getAttribute("aria-label");
  const labelClose = burger.dataset.labelClose || labelOpen;

  function setOpen(open) {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? labelClose : labelOpen);
    menu.hidden = !open;
    document.body.classList.toggle("has-menu-open", open);
  }

  burger.addEventListener("click", () =>
    setOpen(burger.getAttribute("aria-expanded") !== "true"),
  );

  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        burger.focus();
      }
    },
    { signal: bus.signal },
  );

  // Leaving the mobile breakpoint with the menu open would trap scrolling.
  window
    .matchMedia("(min-width: 900px)")
    .addEventListener(
      "change",
      (e) => {
        if (e.matches) setOpen(false);
      },
      { signal: bus.signal },
    );
}

/* ─────────────────────────────────────────────────────────────
   Back to top
   ───────────────────────────────────────────────────────────── */

export function initBackToTop() {
  const btn = document.getElementById("back-to-top");
  if (!btn) return;

  const onScroll = () =>
    btn.classList.toggle("is-visible", window.scrollY > 400);

  window.addEventListener("scroll", onScroll, { passive: true, signal: bus.signal });
  onScroll();

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
    document.querySelector(".nav__logo")?.focus({ preventScroll: true });
  });
}

/* ─────────────────────────────────────────────────────────────
   Reading progress
   ───────────────────────────────────────────────────────────── */

export function initScrollProgress() {
  const bar = document.getElementById("scroll-progress");
  if (!bar) return;

  let queued = false;

  function paint() {
    const el = document.scrollingElement || document.documentElement;
    const total = el.scrollHeight - el.clientHeight;
    const ratio = total > 0 ? Math.min(1, Math.max(0, el.scrollTop / total)) : 0;
    bar.style.transform = `scaleX(${ratio})`;
    queued = false;
  }

  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(paint);
  }

  window.addEventListener("scroll", onScroll, { passive: true, signal: bus.signal });
  window.addEventListener("resize", onScroll, { passive: true, signal: bus.signal });
  paint();
}

/* ─────────────────────────────────────────────────────────────
   Nav elevation + scroll spy
   ───────────────────────────────────────────────────────────── */

export function initNavScrollSpy() {
  const links = [
    ...document.querySelectorAll('.nav__links a[href*="#"], .mobile-menu__links a[href*="#"]'),
  ];
  const sections = [...document.querySelectorAll("main section[id]")].filter((s) =>
    links.some((link) => link.hash === `#${s.id}`),
  );
  if (!sections.length) return;

  // One underline slides between the desktop links instead of each link
  // drawing its own: the move between two sections reads as one motion.
  const bar = document.querySelector(".nav__links");
  let indicator = null;
  if (bar) {
    // A list may only hold <li>; this one is presentational.
    indicator = document.createElement("li");
    indicator.className = "nav__indicator";
    indicator.setAttribute("role", "none");
    indicator.setAttribute("aria-hidden", "true");
    bar.appendChild(indicator);
  }

  let current;

  function place(link) {
    if (!indicator) return;
    if (!link) {
      indicator.classList.remove("is-visible");
      return;
    }
    indicator.style.setProperty("--x", `${link.offsetLeft}px`);
    indicator.style.setProperty("--w", `${link.offsetWidth}px`);
    // The first placement must not slide in from the left edge.
    if (!indicator.classList.contains("is-visible")) {
      indicator.classList.add("is-placing");
      indicator.getBoundingClientRect();
      indicator.classList.remove("is-placing");
    }
    indicator.classList.add("is-visible");
  }

  // The active section is the last one whose top has passed 40% of the
  // viewport — so between two sections the previous one stays active
  // instead of the underline blinking off.
  let queued = false;

  function update(force) {
    queued = false;
    const line = window.innerHeight * 0.4;
    let active = null;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= line) active = section.id;
      else break;
    }
    // At the very bottom the last section may never reach the line.
    const el = document.scrollingElement || document.documentElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
      active = sections[sections.length - 1].id;
    }
    if (active === current && !force) return;
    current = active;

    links.forEach((link) =>
      link.classList.toggle("is-active", Boolean(active) && link.hash === `#${active}`),
    );
    place(bar && active ? bar.querySelector(`a[href$="#${active}"]`) : null);
  }

  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => update(false));
  };

  window.addEventListener("scroll", onScroll, { passive: true, signal: bus.signal });
  window.addEventListener("resize", () => update(true), { passive: true, signal: bus.signal });
  // Webfonts change the links' widths once they land.
  document.fonts?.ready.then(() => update(true));
  update(true);
}

/* ─────────────────────────────────────────────────────────────
   Toasts
   ───────────────────────────────────────────────────────────── */

const CHECK_ICON = `<svg class="toast__icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;

export function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  // textContent for the message: it can contain user data (email, phone).
  toast.innerHTML = CHECK_ICON;
  const span = document.createElement("span");
  span.textContent = message;
  toast.appendChild(span);

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));

  setTimeout(() => {
    toast.classList.remove("is-visible");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    setTimeout(() => toast.remove(), 1000); // fallback if the transition never fires
  }, 2800);
}

/* ─────────────────────────────────────────────────────────────
   Copy-to-clipboard
   ───────────────────────────────────────────────────────────── */

export function initCopyButtons() {
  const messages = {
    fr: { email: "Email copié", phone: "Numéro copié", error: "Copie impossible" },
    en: { email: "Email copied", phone: "Phone number copied", error: "Copy failed" },
  };
  const lang = document.documentElement.lang === "en" ? "en" : "fr";
  const t = messages[lang];

  document.addEventListener(
    "click",
    async (e) => {
      const btn = e.target.closest("[data-copy]");
      if (!btn) return;

      e.preventDefault();
      const value = btn.dataset.copy;
      if (!value) return;

      try {
        await navigator.clipboard.writeText(value);
        showToast(`${t[btn.dataset.copyKind] || t.email} : ${value}`);
        btn.classList.add("is-copied");
        setTimeout(() => btn.classList.remove("is-copied"), 1200);
      } catch (err) {
        showToast(t.error);
      }
    },
    { signal: bus.signal },
  );
}

/* ─────────────────────────────────────────────────────────────
   Shared bootstrap
   ───────────────────────────────────────────────────────────── */

export function initChrome() {
  initTheme();
  initLangSwitch();
  initMobileMenu();
  initBackToTop();
  initScrollProgress();
  initCopyButtons();
}
