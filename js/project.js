/**
 * Portfolio — Project Page Script
 * ─────────────────────────────────
 * Handles theme toggle, mobile menu, interactive lightbox,
 * and exact scroll position restoration on refresh for project detail pages.
 */

/* ═══════════════════════════════════════════════════════════════
   Theme Toggle
   ═══════════════════════════════════════════════════════════════ */

function updateThemeThumbnails(theme) {
  document.querySelectorAll("img[data-src-light]").forEach((img) => {
    const darkSrc = img.getAttribute("data-src-dark");
    const lightSrc = img.getAttribute("data-src-light");
    if (theme === "light" && lightSrc) {
      img.src = lightSrc;
    } else if (darkSrc) {
      img.src = darkSrc;
    }
  });
}

function initTheme() {
  const toggle = document.getElementById("theme-toggle");
  const stored = localStorage.getItem("theme");
  const theme = stored || "dark";
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeThumbnails(theme);

  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    updateThemeThumbnails(next);
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
      const figure = document.createElement("figure");
      figure.className = "lightbox-figure";

      const img = document.createElement("img");
      img.src = element.src;
      img.alt = element.alt || "Aperçu agrandi";
      figure.appendChild(img);

      // Retrieve caption from figcaption sibling/parent or alt text
      const figcaptionText =
        element.closest("figure")?.querySelector("figcaption")?.textContent ||
        element.alt;

      if (figcaptionText && figcaptionText.trim().length > 0) {
        const caption = document.createElement("figcaption");
        caption.className = "lightbox-caption";
        caption.textContent = figcaptionText.trim();
        figure.appendChild(caption);
      }

      contentContainer.appendChild(figure);
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
    ".project-content img, .project-thumbnail__img, .pipeline-workflow",
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
   Language Switcher (Project pages - In-Place SPA Swap)
   ═══════════════════════════════════════════════════════════════ */

async function switchProjectLanguage(targetUrl) {
  if (!targetUrl) return;
  try {
    const res = await fetch(targetUrl);
    if (!res.ok) {
      window.location.href = targetUrl;
      return;
    }
    const htmlText = await res.text();
    const doc = new DOMParser().parseFromString(htmlText, "text/html");

    // 1. Swap main project content
    const newMain = doc.querySelector("main.project-page");
    const currentMain = document.querySelector("main.project-page");
    if (newMain && currentMain) {
      currentMain.innerHTML = newMain.innerHTML;
    }

    // 2. Swap nav links
    const newNavLinks = doc.querySelector(".nav__links");
    const currentNavLinks = document.querySelector(".nav__links");
    if (newNavLinks && currentNavLinks) {
      currentNavLinks.innerHTML = newNavLinks.innerHTML;
    }

    // 3. Swap mobile menu links
    const newMobileLinks = doc.querySelector(".mobile-menu__links");
    const currentMobileLinks = document.querySelector(".mobile-menu__links");
    if (newMobileLinks && currentMobileLinks) {
      currentMobileLinks.innerHTML = newMobileLinks.innerHTML;
    }

    // 4. Update nav logo link
    const newLogo = doc.querySelector(".nav__logo");
    const currentLogo = document.querySelector(".nav__logo");
    if (newLogo && currentLogo) {
      currentLogo.href = newLogo.getAttribute("href");
    }

    // 5. Update language toggle button
    const btn = document.getElementById("lang-toggle");
    const newBtn = doc.querySelector("#lang-toggle");
    if (btn && newBtn) {
      btn.setAttribute("data-lang-url", newBtn.getAttribute("data-lang-url"));
      btn.setAttribute("aria-label", newBtn.getAttribute("aria-label"));
      btn.textContent = newBtn.textContent;
    }

    // 6. Update html lang & title
    document.documentElement.lang = doc.documentElement.lang || "fr";
    document.title = doc.title;

    // 7. Sync current theme thumbnails on new images
    const currentTheme =
      document.documentElement.getAttribute("data-theme") || "dark";
    updateThemeThumbnails(currentTheme);

    // 8. Re-initialize interactive components
    initLightbox();
    initTableWrappers();

    // 9. Re-render KaTeX math
    if (window.renderMathInElement) {
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
      });
    }

    // 10. Update browser URL without page reload
    history.pushState({ url: targetUrl }, "", targetUrl);
  } catch (err) {
    console.error("Language switch error:", err);
    window.location.href = targetUrl;
  }
}

function initLangSwitcher() {
  const btn = document.getElementById("lang-toggle");
  if (!btn) return;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const altLangUrl =
      btn.getAttribute("data-lang-url") || btn.getAttribute("href");
    if (altLangUrl) {
      switchProjectLanguage(altLangUrl);
    }
  });

  window.addEventListener("popstate", () => {
    switchProjectLanguage(location.pathname);
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
  initLangSwitcher();
  document.body.classList.add("is-ready");
});
