/**
 * Portfolio — Project Page Script
 * ─────────────────────────────────
 * Handles theme toggle and mobile menu for project detail pages.
 */

/* ═══════════════════════════════════════════════════════════════
   Theme Toggle
   ═══════════════════════════════════════════════════════════════ */

function initTheme() {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  const stored = localStorage.getItem("theme");
  const theme = stored || "dark";
  document.documentElement.setAttribute("data-theme", theme);

  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });
}

/* ═══════════════════════════════════════════════════════════════
   Mobile Menu
   ═══════════════════════════════════════════════════════════════ */

function initMobileMenu() {
  const burger = document.getElementById("nav-burger");
  const menu = document.getElementById("mobile-menu");
  if (!burger || !menu) return;

  function closeMenu() {
    burger.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  burger.addEventListener("click", () => {
    const isOpen = burger.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      closeMenu();
    } else {
      burger.setAttribute("aria-expanded", "true");
      menu.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
  });

  menu.addEventListener("click", (e) => {
    if (e.target.tagName === "A") closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

/* ═══════════════════════════════════════════════════════════════
   Init
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initMobileMenu();
});
