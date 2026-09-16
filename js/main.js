/**
 * Portfolio — Home page
 * ─────────────────────
 * Eleventy renders the FR page at "/" and the EN page at "/en/" as two
 * fully static documents, so switching language is a plain link and this
 * file never has to re-render any content.
 */

import { initChrome, initNavScrollSpy } from "./ui.js";

/* ─────────────────────────────────────────────────────────────
   Skill filter — highlight the projects and roles using a skill
   ───────────────────────────────────────────────────────────── */

function initSkillFilter() {
  const filters = [...document.querySelectorAll(".tag--filter")];
  if (!filters.length) return;

  const cards = [...document.querySelectorAll(".project-card")];
  const roles = [...document.querySelectorAll(".exp-item")];
  const targets = [...cards, ...roles];

  // Pre-compute each target's skill set once rather than on every click.
  const skillsOf = new Map(
    targets.map((el) => [
      el,
      new Set(
        [...el.querySelectorAll(".tag")].map((t) =>
          t.textContent.trim().toLowerCase(),
        ),
      ),
    ]),
  );

  let active = null;

  function clear() {
    active = null;
    filters.forEach((f) => {
      f.classList.remove("is-active");
      f.setAttribute("aria-pressed", "false");
    });
    targets.forEach((el) => el.classList.remove("is-dimmed", "is-highlighted"));
    document.body.classList.remove("has-filter");
  }

  function apply(skill) {
    active = skill;
    filters.forEach((f) => {
      const on = f.dataset.skill === skill;
      f.classList.toggle("is-active", on);
      f.setAttribute("aria-pressed", String(on));
    });
    targets.forEach((el) => {
      const match = skillsOf.get(el).has(skill);
      el.classList.toggle("is-highlighted", match);
      el.classList.toggle("is-dimmed", !match);
    });
    document.body.classList.add("has-filter");
  }

  filters.forEach((filter) => {
    filter.addEventListener("click", () => {
      const skill = filter.dataset.skill;
      if (active === skill) clear();
      else apply(skill);
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && active) clear();
  });
}

/* ─────────────────────────────────────────────────────────────
   Init
   ───────────────────────────────────────────────────────────── */

initChrome();
initNavScrollSpy();
initSkillFilter();
