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

/* ─────────────────────────────────────────────────────────────
   Skills — pick a skill, see the projects that used it
   ───────────────────────────────────────────────────────────── */

/* Every skill's list of projects is already in the page, one hidden block
   each; this only chooses which block shows. Without JavaScript the chips
   stay a plain list and the panel stays hidden. */
function initSkills() {
  const root = document.querySelector("[data-skills]");
  if (!root) return;

  const chips = [...root.querySelectorAll("button[data-skill]")];
  const panel = root.querySelector(".skills__uses");
  const blocks = [...root.querySelectorAll("[data-uses]")];
  if (!chips.length || !panel) return;

  function select(skill) {
    chips.forEach((chip) =>
      chip.setAttribute("aria-pressed", String(chip.dataset.skill === skill)),
    );
    blocks.forEach((block) => {
      block.hidden = block.dataset.uses !== skill;
    });
  }

  // Radio-like: one skill is always shown once the panel has been revealed.
  chips.forEach((chip) =>
    chip.addEventListener("click", () => select(chip.dataset.skill)),
  );

  panel.hidden = false;
  document.querySelector(".skills__hint")?.removeAttribute("hidden");
  // Start on an example, so the panel explains itself.
  select(chips[0].dataset.skill);
}

/* ─────────────────────────────────────────────────────────────
   Hero video — plays only while visible, never against the
   reduced-motion preference
   ───────────────────────────────────────────────────────────── */

function initHeroVideo() {
  const video = document.querySelector(".hero__video");
  if (!video || prefersReducedMotion()) return; // the poster stands in

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      // The file is fetched only once the hero is actually on screen.
      if (!video.src) video.src = video.dataset.src;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });

  observer.observe(video);
  onTeardown(() => observer.disconnect());
}

boot(() => {
  initChrome();
  initNavScrollSpy();
  initSkills();
  initHeroVideo();
});
