/**
 * Portfolio — Project Page Script
 * ─────────────────────────────────
 * Handles theme toggle, mobile menu, interactive lightbox,
 * and exact scroll position restoration on refresh for project detail pages.
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
   Lightbox (Image & Workflow Zoom)
   ═══════════════════════════════════════════════════════════════ */

function initLightbox() {
  // Create modal container if not present
  let modal = document.getElementById("lightbox-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "lightbox-modal";
    modal.className = "lightbox-modal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <button class="lightbox-modal__close" id="lightbox-close" aria-label="Fermer (Échap)">&times;</button>
      <div class="lightbox-modal__content" id="lightbox-content"></div>
    `;
    document.body.appendChild(modal);
  }

  const contentContainer = document.getElementById("lightbox-content");
  const closeBtn = document.getElementById("lightbox-close");

  function openLightbox(element) {
    contentContainer.innerHTML = "";
    if (element.tagName === "IMG") {
      const img = document.createElement("img");
      img.src = element.src;
      img.alt = element.alt || "Aperçu agrandi";
      contentContainer.appendChild(img);
    } else if (element.classList.contains("pipeline-workflow")) {
      const clone = element.cloneNode(true);
      clone.classList.add("pipeline-workflow--enlarged");
      contentContainer.appendChild(clone);
    }
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  // Attach click to images & pipeline workflows
  const clickableItems = document.querySelectorAll(
    ".project-content img, .project-thumbnail__img, .pipeline-workflow"
  );

  clickableItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      openLightbox(item);
    });
  });

  closeBtn.addEventListener("click", closeLightbox);
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target === contentContainer) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.getAttribute("aria-hidden") === "false") {
      closeLightbox();
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   Responsive Table Wrapper
   ═══════════════════════════════════════════════════════════════ */

function initTableWrappers() {
  document.querySelectorAll(".project-content table").forEach((table) => {
    if (!table.parentElement.classList.contains("table-wrapper")) {
      const wrapper = document.createElement("div");
      wrapper.className = "table-wrapper";
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   Init
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initMobileMenu();
  initLightbox();
  initTableWrappers();
});


