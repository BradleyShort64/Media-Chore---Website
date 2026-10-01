/* ==========================================================================
   MEDIA CHORE — script.js

   Everything is wrapped in small, named functions and called at the bottom,
   so you can comment out any single feature without breaking the rest.

   CONTENTS
   01  Setup + helpers
   02  Icons (Lucide)
   03  Smooth scrolling (Lenis) + anchor links
   04  Navigation state, active link, scroll progress, back-to-top
   05  Mobile menu
   06  Hero intro + cursor tilt on the laptop
   07  The chore list engine
   08  Scroll reveals
   09  Cursor + scroll parallax
   10  Number counters
   11  Before / after slider
   12  Work tiles (click-to-play video, YouTube facades)
   13  Lightbox (video, YouTube and full-size artwork)
   14  Contact form
   15  Image fallbacks + small details
   16  Portfolio filters (portfolio.html only)
   ========================================================================== */

/* ==========================================================================
   01  SETUP + HELPERS
   ========================================================================== */

/* Does this visitor want animation? */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Is a real mouse present? Tilt and cursor parallax are pointless on touch. */
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* Are the animation libraries actually available? */
const hasGsap = typeof window.gsap !== "undefined";
const hasScrollTrigger = hasGsap && typeof window.ScrollTrigger !== "undefined";

/* Only pre-hide reveal elements once we know we can animate them back in.
   If a CDN fails, this class is never added and the page renders normally. */
if (hasScrollTrigger && !reduceMotion) {
  document.documentElement.classList.add("anim-on");
  gsap.registerPlugin(ScrollTrigger);
}

/* Tiny query helpers */
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

/* Keeps a number inside a range */
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/* Height of the sticky nav, used as a scroll offset for anchor links */
function navHeight() {
  const nav = $("#siteNav");
  return nav ? nav.offsetHeight : 72;
}

/* ==========================================================================
   02  ICONS
   Lucide swaps every <i data-lucide="..."> for an inline SVG.
   ========================================================================== */
function initIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

/* ==========================================================================
   03  SMOOTH SCROLLING + ANCHOR LINKS
   ========================================================================== */
let lenis = null;

function initSmoothScroll() {
  if (reduceMotion || typeof window.Lenis === "undefined") return;

  /* Shorter duration and a 1:1 wheel ratio: the smoothing should take the
     edge off the scroll, not make the page feel like it is lagging behind
     the wheel. */
  lenis = new Lenis({
    duration: 0.85,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // gentle ease-out
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.6
  });

  /* Drive Lenis from the GSAP ticker so both stay on the same frame clock */
  if (hasGsap) {
    if (hasScrollTrigger) lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }
}

/* One handler for every in-page link, including the mobile menu */
function initAnchors() {
  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;

      const target = document.querySelector(id);
      if (!target) return;

      event.preventDefault();
      closeMenu();

      const offset = -(navHeight() + 12);
      if (lenis) {
        lenis.scrollTo(target, { offset, duration: 1.2 });
      } else {
        const top = target.getBoundingClientRect().top + window.pageYOffset + offset;
        window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
      }
    });
  });
}

/* ==========================================================================
   04  NAV STATE, ACTIVE LINK, PROGRESS, BACK-TO-TOP
   ========================================================================== */
function initNavState() {
  const nav = $("#siteNav");
  const bar = $("#progressBar");
  const toTop = $("#toTop");
  let lastY = window.scrollY;

  function update() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;

    /* Solid, blurred bar once we leave the top of the hero */
    if (nav) {
      nav.classList.toggle("is-stuck", y > 24);

      /* Hide on scroll down, show on scroll up — but never over the hero */
      const goingDown = y > lastY && y > window.innerHeight * 0.9;
      nav.classList.toggle("is-hidden", goingDown && !$("#mobileMenu")?.classList.contains("is-open"));
    }

    if (bar) bar.style.width = `${clamp((y / (max || 1)) * 100, 0, 100)}%`;
    if (toTop) toTop.classList.toggle("is-in", y > window.innerHeight * 0.8);

    lastY = y;
  }

  window.addEventListener("scroll", update, { passive: true });
  update();

  /* Back to top */
  if (toTop) {
    toTop.addEventListener("click", () => {
      if (lenis) lenis.scrollTo(0, { duration: 1.3 });
      else window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }
}

/* Highlight the nav link for the section currently on screen */
function initActiveLink() {
  /* Only the in-page links take part. On the portfolio page the nav points at
     index.html#about and friends, which are not valid selectors. */
  const links = $$(".site-nav__links a").filter((link) =>
    (link.getAttribute("href") || "").startsWith("#")
  );
  if (!links.length || !("IntersectionObserver" in window)) return;

  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
          link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
        });
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );

  sections.forEach((section) => observer.observe(section));
}

/* ==========================================================================
   05  MOBILE MENU
   ========================================================================== */
function openMenu() {
  const menu = $("#mobileMenu");
  const burger = $("#burger");
  if (!menu || !burger) return;

  menu.hidden = false;
  /* Next frame, so the opacity transition has a starting point */
  requestAnimationFrame(() => menu.classList.add("is-open"));
  burger.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
  if (lenis) lenis.stop();

  if (hasGsap && !reduceMotion) {
    gsap.fromTo(
      $$(".menu__links a", menu),
      { y: 26, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", stagger: 0.05, delay: 0.05 }
    );
  }
}

function closeMenu() {
  const menu = $("#mobileMenu");
  const burger = $("#burger");
  if (!menu || !burger || menu.hidden) return;

  menu.classList.remove("is-open");
  burger.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
  if (lenis) lenis.start();

  window.setTimeout(() => {
    menu.hidden = true;
  }, 320);
}

function initMenu() {
  const burger = $("#burger");
  const menu = $("#mobileMenu");
  if (!burger || !menu) return;

  burger.addEventListener("click", () => {
    if (burger.getAttribute("aria-expanded") === "true") closeMenu();
    else openMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  /* A resize into desktop width should never leave the sheet open */
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1080) closeMenu();
  });
}

/* ==========================================================================
   06  HERO INTRO + LAPTOP TILT
   ========================================================================== */
function initHero() {
  if (!hasGsap || reduceMotion) return;

  const words = $$(".hero__title .word");
  const bits = $$(".hero [data-reveal]");
  const stage = $("#stage");

  /* The portfolio page has its own hero and none of these parts */
  if (!words.length && !bits.length && !stage) return;

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  /* Headline words rise out of their masked lines. The mask now carries
     extra padding under the baseline so descenders are not clipped, so the
     words have to start further down to stay hidden behind it. */
  tl.from(words, {
    yPercent: 150,
    duration: 1,
    stagger: 0.05
  });

  /* Eyebrow, sub-line, buttons and facts follow.
     fromTo, not from: the CSS already sets opacity 0 on these, so a plain
     "from" tween would animate them from 0 back to 0. */
  tl.fromTo(
    bits,
    { y: 22, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.8, stagger: 0.08 },
    0.35
  );

  /* The laptop settles in from below and slightly rotated */
  if (stage) {
    tl.from(
      stage,
      {
        y: 54,
        opacity: 0,
        rotateX: 10,
        duration: 1.3
      },
      0.25
    );
  }
}

/* Cursor-aware tilt: the laptop leans toward the pointer */
function initTilt() {
  const stage = $("#stage");
  const laptop = $("#laptop");
  if (!stage || !laptop || !finePointer || reduceMotion || !hasGsap) return;

  const setRotX = gsap.quickTo(laptop, "rotateX", { duration: 0.7, ease: "power3.out" });
  const setRotY = gsap.quickTo(laptop, "rotateY", { duration: 0.7, ease: "power3.out" });
  const setY = gsap.quickTo(laptop, "y", { duration: 0.7, ease: "power3.out" });

  const hero = $(".hero");
  const zone = hero || stage;

  zone.addEventListener("pointermove", (event) => {
    const box = stage.getBoundingClientRect();
    const nx = (event.clientX - (box.left + box.width / 2)) / (box.width / 2);
    const ny = (event.clientY - (box.top + box.height / 2)) / (box.height / 2);

    stage.classList.add("is-tilting");
    setRotY(clamp(nx, -1.4, 1.4) * 9);
    setRotX(clamp(-ny, -1.4, 1.4) * 7);
    setY(clamp(ny, -1, 1) * -6);
  });

  zone.addEventListener("pointerleave", () => {
    setRotX(0);
    setRotY(0);
    setY(0);
    window.setTimeout(() => stage.classList.remove("is-tilting"), 700);
  });
}

/* ==========================================================================
   07  THE CHORE LIST ENGINE
   Ticks the chores off one by one, resets, and repeats. Hovering pauses it;
   clicking a row lets the visitor tick things off themselves.
   ========================================================================== */
function initChores() {
  const list = $("#chores");
  const meter = $("#meterFill");
  const status = $("#choreStatus");
  if (!list) return;

  const rows = $$(".chore", list);
  const STEP = 1500; // ms between automatic ticks
  const HOLD = 2800; // ms to admire a finished list before resetting
  let timer = null;
  let paused = false;
  let inView = true;

  function done() {
    return rows.filter((row) => row.classList.contains("is-done")).length;
  }

  function paint() {
    const count = done();
    if (meter) meter.style.width = `${(count / rows.length) * 100}%`;
    if (status) {
      if (count === 0) status.textContent = "Media Chore is on it…";
      else if (count < rows.length) status.textContent = `${count} of ${rows.length} handled`;
      else status.textContent = "All clear ✓";
    }
  }

  function setRow(row, isDone) {
    row.classList.toggle("is-done", isDone);
    row.setAttribute("aria-pressed", String(isDone));
  }

  function stop() {
    if (timer) window.clearTimeout(timer);
    timer = null;
  }

  function queue(delay) {
    stop();
    timer = window.setTimeout(run, delay);
  }

  function run() {
    if (paused || !inView) {
      queue(STEP);
      return;
    }

    const next = rows.find((row) => !row.classList.contains("is-done"));
    if (next) {
      setRow(next, true);
      paint();
      queue(STEP);
    } else {
      paint();
      queue(HOLD);
      /* Clear the board after the hold, then start over */
      window.setTimeout(() => {
        if (paused || !inView) return;
        rows.forEach((row) => setRow(row, false));
        paint();
      }, HOLD - 200);
    }
  }

  /* Visitors can tick rows themselves. The auto-run pauses briefly after. */
  rows.forEach((row) => {
    row.addEventListener("click", () => {
      setRow(row, !row.classList.contains("is-done"));
      paint();
      paused = true;
      window.setTimeout(() => {
        paused = false;
      }, 6000);
    });
  });

  /* Pause while the pointer or keyboard focus is inside the screen */
  const screen = $(".app");
  if (screen) {
    screen.addEventListener("pointerenter", () => (paused = true));
    screen.addEventListener("pointerleave", () => (paused = false));
    screen.addEventListener("focusin", () => (paused = true));
    screen.addEventListener("focusout", () => (paused = false));
  }

  /* Do not burn CPU animating a laptop nobody can see */
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => (inView = entry.isIntersecting)),
      { threshold: 0.1 }
    );
    observer.observe(list);
  }

  if (reduceMotion) {
    /* Static, honest snapshot instead of a loop */
    rows.slice(0, 4).forEach((row) => setRow(row, true));
    paint();
    return;
  }

  paint();
  queue(900);
}

/* ==========================================================================
   08  SCROLL REVEALS
   Two passes: grouped children animate with a stagger, everything else
   animates on its own. The hero is handled by its own intro timeline.

   Timing note. These used to start at "top 85%" and run for 0.9s with a
   0.075s stagger, which meant a section only began appearing once it was
   well inside the viewport — long enough on a tall section to read as a
   blank screen. Everything now starts the moment its top edge crosses the
   bottom of the viewport ("top 99%") and settles in roughly half the time,
   over a shorter distance. The movement is still there; it just no longer
   makes the visitor wait for it.
   ========================================================================== */
const REVEAL = {
  y: 16,
  opacity: 0,
  duration: 0.5,
  ease: "power2.out",
  stagger: 0.04
};
const REVEAL_START = "top 99%";

function initReveals() {
  if (!hasScrollTrigger || reduceMotion) return;

  /* Already on screen? Animate it now and never hide it. This is what keeps
     a deep link such as /#contact from opening on an empty screen. */
  const onScreen = (el) => el.getBoundingClientRect().top < window.innerHeight;

  /* Grouped, staggered reveals */
  $$("[data-stagger]")
    .filter((group) => !group.closest(".hero"))
    .forEach((group) => {
      const items = $$("[data-reveal]", group);
      if (!items.length) return;

      if (onScreen(group)) gsap.from(items, REVEAL);
      else
        gsap.from(items, {
          ...REVEAL,
          scrollTrigger: { trigger: group, start: REVEAL_START, once: true, fastScrollEnd: true }
        });
    });

  /* Everything else, one at a time */
  $$("[data-reveal]")
    .filter((el) => !el.closest("[data-stagger]") && !el.closest(".hero"))
    .forEach((el) => {
      const settings = { y: REVEAL.y, opacity: 0, duration: REVEAL.duration, ease: REVEAL.ease };

      if (onScreen(el)) gsap.from(el, settings);
      else
        gsap.from(el, {
          ...settings,
          scrollTrigger: { trigger: el, start: REVEAL_START, once: true, fastScrollEnd: true }
        });
    });

  /* Safety net. If anything scrolls the page before the reveals are wired up
     (a deep link, a restored scroll position, a slow image shifting the
     layout), or if the visitor flings the page faster than ScrollTrigger can
     fire, some in-view elements can be left hidden. Sweep for those and fade
     them in. This runs throttled on every scroll now, not just the first one,
     so nothing can sit invisible in front of the visitor. */
  let sweepQueued = false;
  const sweep = () => {
    sweepQueued = false;
    $$("[data-reveal]").forEach((el) => {
      const box = el.getBoundingClientRect();
      const inView = box.bottom > 0 && box.top < window.innerHeight;
      if (inView && Number(window.getComputedStyle(el).opacity) < 0.05) {
        gsap.to(el, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", overwrite: "auto" });
      }
    });
  };
  const queueSweep = () => {
    if (sweepQueued) return;
    sweepQueued = true;
    requestAnimationFrame(sweep);
  };

  window.addEventListener("scroll", queueSweep, { passive: true });
  window.addEventListener("resize", queueSweep, { passive: true });
  window.addEventListener("load", () => {
    window.setTimeout(sweep, 200);
    window.setTimeout(sweep, 900);
  });
  sweep();

  /* Section headings get a subtle letter-spacing settle */
  $$(".sec-title").forEach((title) => {
    gsap.from(title, {
      letterSpacing: "0.05em",
      duration: 0.7,
      ease: "power2.out",
      scrollTrigger: { trigger: title, start: REVEAL_START, once: true }
    });
  });
}

/* ==========================================================================
   09  CURSOR + SCROLL PARALLAX
   ========================================================================== */
function initParallax() {
  const visual = $("#techVisual");
  if (!visual || !hasGsap) return;

  const layers = $$(".pfx", visual);

  /* Cursor parallax — layers drift by their own depth */
  if (finePointer && !reduceMotion) {
    const movers = layers.map((layer) => ({
      el: layer,
      depth: Number(layer.dataset.depth || 20),
      x: gsap.quickTo(layer, "x", { duration: 0.9, ease: "power3.out" }),
      y: gsap.quickTo(layer, "y", { duration: 0.9, ease: "power3.out" })
    }));

    const section = visual.closest("section") || visual;

    section.addEventListener("pointermove", (event) => {
      const box = section.getBoundingClientRect();
      const nx = (event.clientX - (box.left + box.width / 2)) / (box.width / 2);
      const ny = (event.clientY - (box.top + box.height / 2)) / (box.height / 2);

      movers.forEach((mover) => {
        mover.x(nx * mover.depth);
        mover.y(ny * mover.depth * 0.6);
      });
    });

    section.addEventListener("pointerleave", () => {
      movers.forEach((mover) => {
        mover.x(0);
        mover.y(0);
      });
    });
  }

  /* Scroll parallax — slow drift as the section passes through */
  if (hasScrollTrigger && !reduceMotion) {
    layers.forEach((layer, index) => {
      gsap.to(layer, {
        yPercent: index % 2 === 0 ? -7 : 7,
        ease: "none",
        scrollTrigger: { trigger: visual, start: "top bottom", end: "bottom top", scrub: 1 }
      });
    });

    /* Hero background drifts a little slower than the page */
    const heroBg = $(".hero__bg");
    if (heroBg) {
      gsap.to(heroBg, {
        yPercent: 12,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 }
      });
    }
  }
}

/* ==========================================================================
   10  NUMBER COUNTERS
   ========================================================================== */
function initCounters() {
  const numbers = $$("[data-count]");
  if (!numbers.length) return;

  numbers.forEach((node) => {
    const target = Number(node.dataset.count);
    /* A year should count from just below itself, not from zero */
    const start = node.dataset.plain === "true" ? Math.max(target - 26, 0) : 0;

    if (!hasScrollTrigger || reduceMotion) {
      node.textContent = String(target);
      return;
    }

    const value = { n: start };
    node.textContent = String(start);

    gsap.to(value, {
      n: target,
      duration: 1.6,
      ease: "power2.out",
      scrollTrigger: { trigger: node, start: "top 90%", once: true },
      onUpdate: () => {
        node.textContent = String(Math.round(value.n));
      }
    });
  });
}

/* ==========================================================================
   11  BEFORE / AFTER SLIDER
   ========================================================================== */
function initBeforeAfter() {
  const range = $("#baRange");
  const before = $("#baBefore");
  const handle = $("#baHandle");
  if (!range || !before || !handle) return;

  function apply(value) {
    before.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
    handle.style.left = `${value}%`;
  }

  range.addEventListener("input", () => apply(Number(range.value)));
  apply(Number(range.value));
}

/* ==========================================================================
   12  WORK TILES
   Nothing heavy is fetched until the visitor asks for it. Local videos carry
   preload="none" behind a branded cover; YouTube pieces show a real poster
   frame and only swap in the player on click. On a slow connection that is
   the difference between a page that loads and one that does not.
   ========================================================================== */
function initWorkTiles() {
  /* YouTube posters: maxres does not exist for every upload, so fall back to
     the hq frame, which always does. */
  $$("img[data-fallback-src]").forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        const next = img.dataset.fallbackSrc;
        delete img.dataset.fallbackSrc;
        if (next) img.src = next;
      },
      { once: true }
    );
  });

  $$(".vtile__cover").forEach((cover) => {
    const tile = cover.closest(".vtile");
    const media = cover.closest(".vtile__media");
    if (!tile || !media) return;

    cover.addEventListener("click", () => {
      const ytId = tile.dataset.yt;

      if (ytId) {
        const frame = document.createElement("iframe");
        frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId)}?autoplay=1&rel=0`;
        frame.title = tile.querySelector(".vtile__name")?.textContent || "Media Chore video";
        frame.allow =
          "accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen";
        frame.allowFullscreen = true;
        media.appendChild(frame);
        const poster = $(".vtile__poster", media);
        if (poster) poster.hidden = true;
      } else {
        const video = $(".vtile__video", media);
        if (!video) return;
        video.preload = "auto";
        video.load();
        const play = video.play();
        if (play && typeof play.catch === "function") {
          /* Autoplay with sound can be refused; the visitor still has the
             native controls, so this only needs to not throw. */
          play.catch(() => {});
        }
      }

      cover.hidden = true;
    });
  });
}

/* ==========================================================================
   13  LIGHTBOX
   Any element carrying data-lb opens it. data-lb is the kind ("image",
   "video" or "youtube"), data-lb-src is what to show and data-lb-title names
   it. Used on the portfolio page so artwork can be seen at full size.
   ========================================================================== */
function initLightbox() {
  const box = $("#lightbox");
  const frame = $("#lbFrame");
  const title = $("#lbTitle");
  const close = $("#lbClose");
  if (!box || !frame) return;

  let lastFocus = null;

  function open(trigger) {
    lastFocus = trigger;
    const kind = trigger.dataset.lb || "image";
    const src = trigger.dataset.lbSrc || "";
    const label = trigger.dataset.lbTitle || "Media Chore";
    if (title) title.textContent = label;

    frame.className = "lb__frame lb__frame--free";
    if (kind === "youtube") {
      frame.className = "lb__frame";
      frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(
        src
      )}?autoplay=1&rel=0" title="${label}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    } else if (kind === "video") {
      frame.innerHTML = `<video src="${src}" controls autoplay playsinline preload="auto"></video>`;
    } else {
      frame.innerHTML = `<img src="${src}" alt="${label}" />`;
    }
    box.classList.add("has-video");

    box.hidden = false;
    requestAnimationFrame(() => box.classList.add("is-open"));
    document.body.style.overflow = "hidden";
    if (lenis) lenis.stop();
    if (close) close.focus();
  }

  function shut() {
    box.classList.remove("is-open");
    document.body.style.overflow = "";
    if (lenis) lenis.start();

    window.setTimeout(() => {
      box.hidden = true;
      frame.innerHTML = "";
      frame.className = "lb__frame";
      if (lastFocus) lastFocus.focus();
    }, 300);
  }

  /* Delegated, so tiles added to the grid later still work */
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const trigger = event.target.closest("[data-lb]");
    if (trigger) open(trigger);
  });
  if (close) close.addEventListener("click", shut);

  /* Click the backdrop, not the sheet */
  box.addEventListener("click", (event) => {
    if (event.target === box) shut();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !box.hidden) shut();
  });
}

/* ==========================================================================
   14  CONTACT FORM
   Validates in the browser, then posts to contact.php, which emails the
   enquiry to info@mediachore.co.za. The thank-you panel only shows once the
   server confirms the send.
   ========================================================================== */
function initForm() {
  const form = $("#contactForm");
  const thanks = $("#thanks");
  const thanksLine = $("#thanksLine");
  const again = $("#againBtn");
  if (!form || !thanks) return;

  const submit = $('button[type="submit"]', form);
  const status = $(".form__fine", form);
  const fineText = status ? status.textContent : "";

  const emailPattern = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

  function fail(field, message) {
    const wrap = field.closest(".field");
    if (!wrap) return;
    wrap.classList.add("has-error");
    const slot = $("[data-err]", wrap);
    if (slot) slot.textContent = message;
  }

  function pass(field) {
    const wrap = field.closest(".field");
    if (wrap) wrap.classList.remove("has-error");
  }

  /* Clear an error as soon as the visitor starts fixing it */
  $$("input, textarea", form).forEach((field) => {
    field.addEventListener("input", () => pass(field));
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = $("#cfName");
    const email = $("#cfEmail");
    const message = $("#cfMessage");
    const honey = $("#cfHoney");
    let ok = true;

    if (!name.value.trim()) {
      fail(name, "Please tell us your name");
      ok = false;
    }
    if (!emailPattern.test(email.value.trim())) {
      fail(email, "A valid email address, please");
      ok = false;
    }
    if (message.value.trim().length < 8) {
      fail(message, "A sentence or two is plenty");
      ok = false;
    }

    /* Honeypot filled in means a bot: pretend it worked, send nothing */
    if (honey && honey.value) {
      showThanks();
      return;
    }

    if (!ok) {
      const firstError = $(".field.has-error input, .field.has-error textarea", form);
      if (firstError) firstError.focus();
      return;
    }

    /* contact.php emails the enquiry to the inbox; only thank the visitor
       once the server confirms it went */
    submit.disabled = true;
    status.textContent = "Sending…";
    status.classList.remove("is-error");

    fetch(form.getAttribute("action") || "contact.php", {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" },
    })
      .then((res) => res.json().catch(() => ({})).then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (!res.ok || !data.ok) throw new Error(data.error || "Send failed");
        status.textContent = fineText;
        showThanks();
      })
      .catch(() => {
        status.textContent =
          "Sorry, that did not send. Please try again, or WhatsApp us on 082 464 2851.";
        status.classList.add("is-error");
      })
      .finally(() => {
        submit.disabled = false;
      });
  });

  function showThanks() {
    /* Personalise the thank-you message */
    const picks = $$('input[name="need[]"]:checked', form).map((box) => box.value);
    if (thanksLine) {
      const first = $("#cfName").value.trim().split(" ")[0];
      const about = picks.length ? ` about ${picks.slice(0, 2).join(" and ").toLowerCase()}` : "";
      thanksLine.textContent = `Thanks ${first ? first : "there"} — we have your details and will come back to you personally${about}. If it is urgent, WhatsApp is fastest.`;
    }

    form.hidden = true;
    thanks.hidden = false;

    if (hasGsap && !reduceMotion) {
      gsap.from(thanks, { y: 18, opacity: 0, duration: 0.6, ease: "power3.out" });
    }
    thanks.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    initIcons(); // the panel's icon needs drawing
  }

  if (again) {
    again.addEventListener("click", () => {
      form.reset();
      form.hidden = false;
      thanks.hidden = true;
      $$(".field", form).forEach((field) => field.classList.remove("has-error"));
      $("#cfName").focus();
    });
  }
}

/* Arriving on a link like /#contact: re-position once the layout has settled,
   so the sticky nav does not cover the heading and the section is measured
   with its images in place. */
function initDeepLink() {
  if (!window.location.hash) return;

  const target = document.querySelector(window.location.hash);
  if (!target) return;

  const land = () => {
    const offset = -(navHeight() + 12);
    if (lenis) {
      lenis.scrollTo(target, { offset, immediate: true });
    } else {
      window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset + offset, behavior: "auto" });
    }
    if (hasScrollTrigger) ScrollTrigger.refresh();
  };

  window.addEventListener("load", () => window.setTimeout(land, 240));
}

/* ==========================================================================
   15  IMAGE FALLBACKS + SMALL DETAILS
   ========================================================================== */

/* If a stock photo fails to load, turn its box into a labelled placeholder
   so the layout still reads as deliberate. */
function initImageFallbacks() {
  $$("img").forEach((img) => {
    /* Images with their own fallback handler (YouTube posters) opt out */
    if (img.dataset.fallbackSrc !== undefined) return;

    img.addEventListener("error", () => {
      const holder = img.parentElement;
      img.style.display = "none";
      if (!holder) return;
      holder.classList.add("ph");
      if (!holder.dataset.ph) {
        holder.dataset.ph = `Image ${img.getAttribute("width") || ""}×${img.getAttribute("height") || ""} — replace`;
      }
    });
  });
}

function initYear() {
  const year = $("#year");
  if (year) year.textContent = String(Math.max(new Date().getFullYear(), 2026));
}

/* ==========================================================================
   16  PORTFOLIO FILTERS
   Two independent dimensions, combined with AND.

     industry  — which industry the work was done for  (all | equine | real-estate | other)
     service   — what Media Chore actually did         (all | photography-videography |
                 graphic-design | website-development | social-media-management)

   Each project tile carries its own tags in the markup:

     data-industry="equine"                         one industry
     data-industry="equine real-estate"             several, space separated
     data-service="photography-videography graphic-design"

   "all" is a wildcard on the FILTER side only. A tile tagged
   data-industry="all" is a piece with no specific industry assigned, so it
   shows under the All tab and nowhere else — a project never appears under
   Equine unless Equine is in its own tag list. Neither filter ever resets
   the other; changing one leaves the other exactly where the visitor left
   it, and the grid simply re-evaluates the pair.

   To add a project: copy a tile, set its two data attributes, done. There is
   no separate list to keep in sync, and nothing is duplicated to make a
   project show up in more than one combination.
   ========================================================================== */
function initPortfolio() {
  const grid = $("#pfGrid");
  if (!grid) return;

  const tiles = $$("[data-industry][data-service]", grid);
  const industryTabs = $$('[data-filter="industry"] .tab');
  const serviceTabs = $$('[data-filter="service"] .tab');
  const empty = $("#pfEmpty");
  const stateIndustry = $("#fsIndustry");
  const stateService = $("#fsService");
  const stateCount = $("#fsCount");
  const reset = $("#fsReset");

  const state = { industry: "all", service: "all" };

  const tagsOf = (el, name) => (el.dataset[name] || "").split(/\s+/).filter(Boolean);

  /* A tile matches a filter when the filter is "all", or when the tile
     actually carries that tag. */
  const matches = (tile, dimension, value) =>
    value === "all" || tagsOf(tile, dimension).includes(value);

  const labelOf = (tabs, value) => {
    const tab = tabs.find((t) => t.dataset.value === value);
    return tab ? (tab.dataset.label || tab.textContent).trim() : value;
  };

  function paintTabs(tabs, dimension) {
    tabs.forEach((tab) => {
      const isOn = tab.dataset.value === state[dimension];
      tab.setAttribute("aria-pressed", String(isOn));

      /* Live count: how many tiles this tab would show, given whatever the
         OTHER filter is currently set to. */
      const slot = $(".tab__count", tab);
      if (!slot) return;
      const other = dimension === "industry" ? "service" : "industry";
      const n = tiles.filter(
        (tile) => matches(tile, dimension, tab.dataset.value) && matches(tile, other, state[other])
      ).length;
      slot.textContent = String(n);
    });
  }

  function apply() {
    let shown = 0;

    tiles.forEach((tile) => {
      const on = matches(tile, "industry", state.industry) && matches(tile, "service", state.service);
      tile.hidden = !on;
      if (on) {
        shown += 1;
        /* A tile that was hidden when the reveal animations were wired up may
           still be sitting at opacity 0. Filtering must never hand the
           visitor an empty box. */
        if (tile.style.opacity !== "" && Number(tile.style.opacity) < 1) {
          tile.style.opacity = "1";
          tile.style.transform = "none";
        }
      }
    });

    paintTabs(industryTabs, "industry");
    paintTabs(serviceTabs, "service");

    if (empty) empty.classList.toggle("is-on", shown === 0);
    if (stateIndustry) stateIndustry.textContent = labelOf(industryTabs, state.industry);
    if (stateService) stateService.textContent = labelOf(serviceTabs, state.service);
    if (stateCount) {
      stateCount.textContent = `${shown} ${shown === 1 ? "chore" : "chores"}`;
    }

    /* The grid just changed height, so the reveal triggers below it moved */
    if (hasScrollTrigger) ScrollTrigger.refresh();
  }

  function wire(tabs, dimension) {
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        /* Selecting a service must not touch the industry, and vice versa */
        state[dimension] = tab.dataset.value;
        apply();
      });
    });
  }

  wire(industryTabs, "industry");
  wire(serviceTabs, "service");

  if (reset) {
    reset.addEventListener("click", () => {
      state.industry = "all";
      state.service = "all";
      apply();
    });
  }

  /* Links such as portfolio.html?service=graphic-design arrive pre-filtered */
  const params = new URLSearchParams(window.location.search);
  const known = (tabs, value) => tabs.some((tab) => tab.dataset.value === value);
  const wantIndustry = params.get("industry");
  const wantService = params.get("service");
  if (wantIndustry && known(industryTabs, wantIndustry)) state.industry = wantIndustry;
  if (wantService && known(serviceTabs, wantService)) state.service = wantService;

  apply();
}

/* ==========================================================================
   BOOT
   ========================================================================== */
function boot() {
  initIcons();
  initSmoothScroll();
  initAnchors();
  initNavState();
  initActiveLink();
  initMenu();
  initHero();
  initTilt();
  initChores();
  initPortfolio();
  initReveals();
  initParallax();
  initCounters();
  initBeforeAfter();
  initWorkTiles();
  initLightbox();
  initForm();
  initDeepLink();
  initImageFallbacks();
  initYear();

  /* Recalculate trigger positions once fonts and images have settled */
  if (hasScrollTrigger) {
    window.addEventListener("load", () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
