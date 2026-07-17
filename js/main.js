/**
 * Portfolio — Main Script
 * ───────────────────────
 * Handles bilingual rendering (FR / EN), theme toggle,
 * mobile menu, scroll fade-in, and nav scroll state.
 */

import { content, identityGlobal } from "./data.js";

let currentLang = localStorage.getItem("lang") || "fr";

/* ═══════════════════════════════════════════════════════════════
   SVG Icon Helpers (Lucide-style inline SVGs)
   ═══════════════════════════════════════════════════════════════ */
const icons = {
  mail: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn__icon"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  phone: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn__icon"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  linkedin: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn__icon"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>`,
  github: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn__icon"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>`,
  download: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn__icon"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
  externalLink: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>`,
  users: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
};

/* ═══════════════════════════════════════════════════════════════
   Render Functions
   ═══════════════════════════════════════════════════════════════ */

function renderNav() {
  const t = content[currentLang].nav;
  const linksHtml = `
    <li><a href="#about">${t.about}</a></li>
    <li><a href="#experience">${t.experience}</a></li>
    <li><a href="#projects">${t.projects}</a></li>
    <li><a href="#skills">${t.skills}</a></li>
    <li><a href="#contact">${t.contact}</a></li>
  `;

  document.querySelector(".nav__links").innerHTML = linksHtml;
  document.querySelector(".mobile-menu__links").innerHTML = linksHtml;

  const langBtnText = document.querySelector("#lang-toggle .lang-text");
  if (langBtnText) {
    langBtnText.textContent = currentLang === "fr" ? "EN" : "FR";
  }
}

function renderHero() {
  const t = content[currentLang].hero;
  document.querySelector(".hero__greeting").textContent = t.greeting;
  document.getElementById("hero-name").textContent = t.name;
  document.getElementById("hero-headline").textContent = t.headline;
  document.getElementById("hero-status").textContent = t.status;

  const actions = document.getElementById("hero-actions");
  actions.innerHTML = `
    <a href="mailto:${identityGlobal.email}" class="btn btn--primary" id="hero-email-btn">
      ${icons.mail} ${identityGlobal.email}
    </a>
    <a href="tel:${identityGlobal.phone}" class="btn btn--outline" id="hero-phone-btn">
      ${icons.phone} ${identityGlobal.phoneDisplay}
    </a>
    <a href="${identityGlobal.linkedin}" target="_blank" rel="noopener noreferrer" class="btn btn--outline" id="hero-linkedin-btn">
      ${icons.linkedin} ${t.linkedinBtn}
    </a>
    <a href="${identityGlobal.github}" target="_blank" rel="noopener noreferrer" class="btn btn--outline" id="hero-github-btn">
      ${icons.github} ${t.githubBtn}
    </a>
    ${
      t.cvUrl
        ? `<a href="${t.cvUrl}" target="_blank" rel="noopener noreferrer" class="btn btn--outline" id="hero-cv-btn">
      ${icons.download} ${t.cvBtn}
    </a>`
        : ""
    }
  `;
}

function renderAbout() {
  const t = content[currentLang].about;
  document.querySelector("#about .section__title").textContent = t.title;
  document.getElementById("about-intro").textContent = t.intro;

  const educationEl = document.getElementById("about-education");
  educationEl.innerHTML = t.education
    .map(
      (edu) => `
    <div class="edu-item fade-in">
      <div class="edu-item__header">
        <span class="edu-item__institution">${edu.institution}</span>
        <span class="edu-item__location">${edu.location}</span>
      </div>
      <p class="edu-item__degree">${edu.degree}</p>
      <p class="edu-item__period">${edu.period}</p>
      ${
        edu.description
          ? `<p class="edu-item__description">${edu.description}</p>`
          : ""
      }
    </div>
  `
    )
    .join("");

  if (t.certifications.length > 0) {
    const certEl = document.getElementById("about-certifications");
    certEl.innerHTML = t.certifications
      .map((c) => {
        const parts = c.split(" : ");
        if (parts.length > 1) {
          return `<p><span class="cert-label">${parts[0]}</span> : ${parts.slice(1).join(" : ")}</p>`;
        }
        const colonParts = c.split(": ");
        if (colonParts.length > 1) {
          return `<p><span class="cert-label">${colonParts[0]}</span>: ${colonParts.slice(1).join(": ")}</p>`;
        }
        return `<p>${c}</p>`;
      })
      .join("");
  }
}

function renderExperiences() {
  const t = content[currentLang].experiences;
  document.querySelector("#experience .section__title").textContent = t.title;

  const listEl = document.getElementById("experience-list");
  listEl.innerHTML = t.items
    .map(
      (exp) => `
    <article class="exp-item fade-in">
      <div class="exp-item__meta">
        <span class="exp-item__period">${exp.period}</span>
        <span class="exp-item__type">${exp.type}</span>
      </div>
      <div class="exp-item__content">
        <h3 class="exp-item__title">${exp.title}</h3>
        <p class="exp-item__company">${exp.company}</p>
        <p class="exp-item__description">${exp.description}</p>
        <div class="exp-item__tags">
          ${exp.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
        </div>
      </div>
    </article>
  `
    )
    .join("");
}

function renderProjects() {
  const t = content[currentLang].projects;
  document.querySelector("#projects .section__title").textContent = t.title;

  const gridEl = document.getElementById("projects-grid");
  gridEl.innerHTML = t.items
    .map(
      (p) => `
    <article class="project-card fade-in" id="project-${p.id}">
      <div class="project-card__header">
        <span class="project-card__name">${p.name}</span>
        ${p.period ? `<span class="project-card__period">${p.period}</span>` : ""}
      </div>
      <p class="project-card__title">${p.title}</p>
      <p class="project-card__description">${p.description}</p>
      ${
        p.highlights && p.highlights.length > 0
          ? `<ul class="project-card__highlights">
          ${p.highlights.map((h) => `<li>${h}</li>`).join("")}
        </ul>`
          : ""
      }
      <div class="project-card__footer">
        ${p.stack.map((s) => `<span class="tag">${s}</span>`).join("")}
        ${
          p.team
            ? `<span class="project-card__team">${icons.users} ${p.team} ${currentLang === "fr" ? "pers." : "people"}</span>`
            : ""
        }
        ${
          p.github
            ? `<a href="${p.github}" target="_blank" rel="noopener noreferrer" class="project-card__link">
              GitHub ${icons.externalLink}
            </a>`
            : ""
        }
      </div>
    </article>
  `
    )
    .join("");
}

function renderSkills() {
  const t = content[currentLang].skills;
  document.querySelector("#skills .section__title").textContent = t.title;

  const gridEl = document.getElementById("skills-grid");
  gridEl.innerHTML = t.groups
    .map(
      (group) => `
    <div class="skill-group fade-in">
      <h3 class="skill-group__title">${group.category}</h3>
      <div class="skill-group__items">
        ${group.items.map((item) => `<span class="tag">${item}</span>`).join("")}
      </div>
    </div>
  `
    )
    .join("");
}

function renderContact() {
  const t = content[currentLang].contact;
  document.querySelector("#contact .section__title").textContent = t.title;
  document.getElementById("contact-text").textContent = t.text;

  const linksEl = document.getElementById("contact-links");
  linksEl.innerHTML = `
    <a href="mailto:${identityGlobal.email}" class="btn btn--primary" id="contact-email-btn">
      ${icons.mail} ${identityGlobal.email}
    </a>
    <a href="tel:${identityGlobal.phone}" class="btn btn--outline" id="contact-phone-btn">
      ${icons.phone} ${identityGlobal.phoneDisplay}
    </a>
    <a href="${identityGlobal.linkedin}" target="_blank" rel="noopener noreferrer" class="btn btn--outline" id="contact-linkedin-btn">
      ${icons.linkedin} ${t.linkedinBtn}
    </a>
    <a href="${identityGlobal.github}" target="_blank" rel="noopener noreferrer" class="btn btn--outline" id="contact-github-btn">
      ${icons.github} ${t.githubBtn}
    </a>
  `;
}

function renderFooter() {
  document.getElementById("footer-year").textContent = new Date().getFullYear();

  const footerLinks = document.getElementById("footer-links");
  footerLinks.innerHTML = `
    <li><a href="${identityGlobal.linkedin}" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
    <li><a href="${identityGlobal.github}" target="_blank" rel="noopener noreferrer">GitHub</a></li>
  `;
}

function renderAll() {
  document.documentElement.setAttribute("lang", currentLang);
  renderNav();
  renderHero();
  renderAbout();
  renderExperiences();
  renderProjects();
  renderSkills();
  renderContact();
  renderFooter();
  initScrollFadeIn();
}

/* ═══════════════════════════════════════════════════════════════
   Language Toggle
   ═══════════════════════════════════════════════════════════════ */
function initLang() {
  const toggle = document.getElementById("lang-toggle");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    currentLang = currentLang === "fr" ? "en" : "fr";
    localStorage.setItem("lang", currentLang);
    renderAll();
  });
}

/* ═══════════════════════════════════════════════════════════════
   Theme Toggle
   ═══════════════════════════════════════════════════════════════ */
function initTheme() {
  const toggle = document.getElementById("theme-toggle");
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
    if (e.target.tagName === "A") {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

/* ═══════════════════════════════════════════════════════════════
   Scroll Fade-In (IntersectionObserver)
   ═══════════════════════════════════════════════════════════════ */
function initScrollFadeIn() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));
}

/* ═══════════════════════════════════════════════════════════════
   Init
   ═══════════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  initLang();
  initTheme();
  initMobileMenu();
});
