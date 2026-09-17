/**
 * Portfolio — Shared UI behaviours
 * ────────────────────────────────
 * Imported by both main.js (home) and project.js (case studies) so the
 * chrome — theme, menu, scroll affordances, toasts — exists exactly once.
 *
 * Every page is fully rendered at build time by Eleventy; nothing here
 * produces content, it only wires up interaction.
 */

const prefersReducedMotion = () =>
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
    if (media.addEventListener) media.addEventListener("change", follow);
    else if (media.addListener) media.addListener(follow);
  }

  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const next =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    chosen = true;
    apply(next);
    try {
      localStorage.setItem("theme", next);
    } catch (e) {
      /* private mode — the choice simply won't persist */
    }
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

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      burger.focus();
    }
  });

  // Leaving the mobile breakpoint with the menu open would trap scrolling.
  window.matchMedia("(min-width: 900px)").addEventListener("change", (e) => {
    if (e.matches) setOpen(false);
  });
}

/* ─────────────────────────────────────────────────────────────
   Back to top
   ───────────────────────────────────────────────────────────── */

export function initBackToTop() {
  const btn = document.getElementById("back-to-top");
  if (!btn) return;

  const onScroll = () =>
    btn.classList.toggle("is-visible", window.scrollY > 400);

  window.addEventListener("scroll", onScroll, { passive: true });
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

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  paint();
}

/* ─────────────────────────────────────────────────────────────
   Nav elevation + scroll spy
   ───────────────────────────────────────────────────────────── */

export function initNavScrollSpy() {
  const nav = document.getElementById("nav");
  const links = [
    ...document.querySelectorAll('.nav__links a[href*="#"], .mobile-menu__links a[href*="#"]'),
  ];
  const sections = [...document.querySelectorAll("main section[id]")];

  if (nav) {
    const elevate = () => nav.classList.toggle("is-scrolled", window.scrollY > 20);
    window.addEventListener("scroll", elevate, { passive: true });
    elevate();
  }

  if (!sections.length || !links.length) return;

  // IntersectionObserver instead of measuring offsets on every scroll tick.
  const visible = new Set();

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      });

      const active = sections.find((s) => visible.has(s.id))?.id;
      links.forEach((link) =>
        link.classList.toggle(
          "is-active",
          Boolean(active) && link.getAttribute("href").endsWith(`#${active}`),
        ),
      );
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
  );

  sections.forEach((s) => observer.observe(s));
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

  document.addEventListener("click", async (e) => {
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
  });
}

/* ─────────────────────────────────────────────────────────────
   Shared bootstrap
   ───────────────────────────────────────────────────────────── */

export function initChrome() {
  initTheme();
  initMobileMenu();
  initBackToTop();
  initScrollProgress();
  initCopyButtons();
}
