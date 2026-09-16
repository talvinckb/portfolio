/**
 * Portfolio — Project case-study pages
 * ────────────────────────────────────
 * FR and EN are separate static documents, so the language switch is a
 * plain link. This file only adds page-local behaviour: image lightbox,
 * scrollable tables and math rendering.
 */

import { initChrome, initNavScrollSpy } from "./ui.js";

const LANG = document.documentElement.lang === "en" ? "en" : "fr";

const STRINGS = {
  fr: { close: "Fermer (Échap)", enlarged: "Vue agrandie" },
  en: { close: "Close (Esc)", enlarged: "Enlarged view" },
}[LANG];

/* ─────────────────────────────────────────────────────────────
   Lightbox — native <dialog> for focus trapping and Escape
   ───────────────────────────────────────────────────────────── */

function initLightbox() {
  const zoomables = document.querySelectorAll(
    ".project-content img, .project-thumbnail__img, .pipeline-workflow",
  );
  if (!zoomables.length) return;

  const dialog = document.createElement("dialog");
  dialog.className = "lightbox";
  dialog.innerHTML = `
    <button class="lightbox__close" type="button" aria-label="${STRINGS.close}" title="${STRINGS.close}">
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
      img.alt = source.alt || STRINGS.enlarged;
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
  document.querySelectorAll(".project-content table").forEach((table) => {
    if (table.parentElement.classList.contains("table-wrapper")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "table-wrapper";
    wrapper.tabIndex = 0;
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute(
      "aria-label",
      LANG === "en" ? "Scrollable table" : "Tableau défilable",
    );
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}

/* ─────────────────────────────────────────────────────────────
   KaTeX
   ───────────────────────────────────────────────────────────── */

function renderMath() {
  if (!window.renderMathInElement) return;
  window.renderMathInElement(document.querySelector(".project-content"), {
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

initChrome();
initNavScrollSpy();
initTableWrappers();
initLightbox();

// KaTeX ships as a deferred classic script, so it may land after this module.
if (window.renderMathInElement) renderMath();
else window.addEventListener("load", renderMath, { once: true });
