// Freelance page. Everything here is an enhancement: without it the page
// still reads top to bottom, the video has native controls and the form
// falls back to a plain mailto.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const toast = (() => {
  const el = document.getElementById("toast");
  let timer;
  return (message) => {
    if (!el) return;
    el.textContent = message;
    el.classList.add("is-on");
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove("is-on"), 2600);
  };
})();

/* ─── Hero: the word and the mockups change together ─── */

function initSwap() {
  const swap = document.getElementById("swap");
  const stage = document.getElementById("stage");
  if (!swap || !stage) return;

  const words = [...swap.querySelectorAll(".swap__word")];
  const views = [...stage.querySelectorAll(".view")];
  let index = 0;
  let timer = null;

  // The tag hugs the current word: its width is the word's plus padding.
  const fit = () => {
    const style = getComputedStyle(swap);
    const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    swap.style.setProperty("--w", `${words[index].offsetWidth + padding}px`);
  };

  const show = (next) => {
    const prev = words[index];
    prev.classList.remove("is-on");
    prev.classList.add("is-out");
    setTimeout(() => prev.classList.remove("is-out"), 650);

    index = next;
    words[index].classList.add("is-on");
    const kind = words[index].dataset.kind;
    stage.dataset.kind = kind;
    views.forEach((view) => view.classList.toggle("is-on", view.dataset.kind === kind));
    fit();
  };

  const start = () => {
    if (timer) return;
    timer = setInterval(() => show((index + 1) % words.length), 2600);
  };

  const stop = () => {
    clearInterval(timer);
    timer = null;
  };

  fit();
  document.fonts?.ready.then(fit);
  window.addEventListener("resize", fit, { passive: true });

  // Only turn while the hero is on screen and the tab is visible.
  let visible = true;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible && !document.hidden ? start() : stop();
  }).observe(swap);
  document.addEventListener("visibilitychange", () => {
    visible && !document.hidden ? start() : stop();
  });
}

/* ─── Hero: the stage leans towards the pointer ─── */

function initTilt() {
  const hero = document.querySelector(".hero");
  const stage = document.getElementById("stage");
  if (!hero || !stage || !finePointer || reduceMotion) return;

  let frame = 0;
  hero.addEventListener("pointermove", (event) => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      stage.style.setProperty("--ry", `${-9 + x * 10}deg`);
      stage.style.setProperty("--rx", `${5 - y * 8}deg`);
    });
  });
  hero.addEventListener("pointerleave", () => {
    stage.style.removeProperty("--ry");
    stage.style.removeProperty("--rx");
  });
}

/* ─── Scroll reveals ─── */

function initReveal() {
  const targets = document.querySelectorAll(".reveal, .features, #steps");
  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-in", "is-live"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add(entry.target.id === "steps" ? "is-live" : "is-in");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
  );
  targets.forEach((el) => observer.observe(el));
}

/* ─── Bento spotlight ─── */

function initSpotlight() {
  if (!finePointer) return;
  document.querySelectorAll(".tile").forEach((tile) => {
    tile.addEventListener("pointermove", (event) => {
      const rect = tile.getBoundingClientRect();
      tile.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      tile.style.setProperty("--my", `${event.clientY - rect.top}px`);
    });
  });
}

/* ─── Header state and the mobile dock ─── */

function initChrome() {
  const bar = document.getElementById("bar");
  const dock = document.getElementById("dock");
  const hero = document.querySelector(".hero");
  const contact = document.getElementById("contact");

  const onScroll = () => bar?.classList.toggle("is-scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (!dock || !hero || !contact) return;
  // The dock shows once the hero's own button is gone, and steps aside at
  // the form it leads to.
  const actions = hero.querySelector(".hero__actions") || hero;
  const onScreen = new Map();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => onScreen.set(entry.target, entry.isIntersecting));
    const pastHero = !onScreen.get(actions) && actions.getBoundingClientRect().top < 0;
    dock.classList.toggle("is-shown", pastHero && !onScreen.get(contact));
  });
  observer.observe(actions);
  observer.observe(contact);
}

/* ─── Video: a branded play button, native controls once playing ─── */

function initPlayer() {
  const player = document.getElementById("player");
  const video = player?.querySelector("video");
  const button = player?.querySelector(".player__play");
  if (!video || !button) return;

  video.controls = false;
  button.hidden = false;
  button.addEventListener("click", () => {
    button.hidden = true;
    video.controls = true;
    video.play().catch(() => {
      // Playback refused (data saver, codec…): the native controls stay.
    });
    video.focus();
  });
}

/* ─── Copy email ─── */

function initCopy() {
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        toast(button.dataset.copied || "Copié");
      } catch {
        toast(button.dataset.copy);
      }
    });
  });
}

/* ─── Brief form: builds a ready-to-send email ─── */

function initBrief() {
  const form = document.getElementById("brief");
  if (!form) return;
  const message = form.elements.message;
  const error = document.getElementById("brief-error");

  const clearError = () => {
    message.removeAttribute("aria-invalid");
    error.textContent = "";
  };
  message.addEventListener("input", clearError);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const text = String(data.get("message") || "").trim();
    if (!text) {
      message.setAttribute("aria-invalid", "true");
      error.textContent = error.dataset.message;
      message.focus();
      return;
    }
    clearError();

    const types = data.getAll("type");
    const name = String(data.get("name") || "").trim();
    const company = String(data.get("company") || "").trim();
    const subject = [form.dataset.subject, types.join(", "), name].filter(Boolean).join(" — ");
    const details = [
      types.length && `Projet : ${types.join(", ")}`,
      `Échéance : ${data.get("timing")}`,
      name && `Nom : ${name}`,
      company && `Entreprise : ${company}`,
    ].filter(Boolean);
    const body = ["Bonjour Talvin,", "", text, "", "—", ...details].join("\n");

    window.location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast("Votre messagerie s'ouvre…");
  });
}

initSwap();
initTilt();
initReveal();
initSpotlight();
initChrome();
initPlayer();
initCopy();
initBrief();
