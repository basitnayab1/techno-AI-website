/* Motion + chrome behaviour for the archived WordPress pages (injected by app/theme-document.ts).
   The home page does the same in React (app/redesign/motion.tsx) — keep the two in step.
   Needs /vendor/lenis.min.js (copied from node_modules/lenis/dist) loaded before this file. */
(() => {
  const root = document.documentElement;
  const reduce = root.dataset.motion !== "full" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  root.classList.add("js");
  if (!reduce) root.classList.add("fx");

  // ---- smooth scroll (not inside popups, dropdowns or anything marked data-lenis-prevent)
  const lenis = !reduce && fine && window.Lenis
    ? new window.Lenis({
        lerp: 0.085,
        wheelMultiplier: 0.9,
        anchors: true,
        prevent: (node) => !!node.closest?.(".elementor-popup-modal, .dialog-widget, .brand-select-popover, [data-lenis-prevent]"),
      })
    : null;

  if (lenis) { window.lenis = lenis; window.dispatchEvent(new Event('site:scroll-source')); }

  // ---- header + menu
  const header = document.querySelector("[data-shared-header], .hx");
  const menuBtn = document.querySelector("[data-site-menu-toggle], .hx-menu");
  const menu = document.getElementById("menu");
  const setMenu = (open) => {
    root.classList.toggle("menu-open", open);
    menuBtn?.setAttribute("aria-expanded", String(open));
    if (menuBtn?.hasAttribute("data-site-menu-toggle")) menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu?.toggleAttribute("inert", !open);
    if (open) { lenis?.stop(); menu?.querySelector("a, button")?.focus(); }
    else { lenis?.start(); if (menu?.contains(document.activeElement)) menuBtn?.focus(); }
  };
  menuBtn?.addEventListener("click", () => setMenu(!root.classList.contains("menu-open")));
  menu?.addEventListener("click", (e) => e.target.closest("a") && setMenu(false));
  addEventListener("keydown", (e) => {
    if (!root.classList.contains("menu-open")) return;
    if (e.key === "Escape") { e.preventDefault(); setMenu(false); }
    if (e.key === "Tab") {
      const items = [menuBtn, ...menu.querySelectorAll("a[href], button")].filter(el => el && el.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  });
  const here = location.pathname;
  document.querySelectorAll(".hx-nav a, .menu-nav a").forEach((a) => {
    const p = new URL(a.href).pathname;
    if (p === here) a.setAttribute("aria-current", "page");
  });

  // Keep the archived hero's scroll parallax and background drift.
  const hero = document.querySelector(".brand-content .brand-hero");
  if (hero && !reduce) {
    // move the hero photo onto its own layer so it can drift slowly forever (Ken Burns) + parallax
    const bg = getComputedStyle(hero).backgroundImage;
    if (bg && bg !== "none") {
      const layer = document.createElement("div");
      layer.className = "hero-bg";
      layer.setAttribute("aria-hidden", "true");
      layer.style.backgroundImage = bg;
      hero.prepend(layer);
      hero.classList.add("has-bg-layer");
    }
    hero.classList.add("hero-on");
  }

  document.querySelectorAll("[data-reveal]").forEach(el => el.classList.add("in"));
  requestAnimationFrame(() => root.classList.add("ready"));

  // ---- glow that follows the pointer ([data-glow], e.g. the closing CTA)
  document.querySelectorAll("[data-glow]").forEach((g) => {
    g.addEventListener("pointermove", (e) => {
      const r = g.getBoundingClientRect();
      g.style.setProperty("--mx", `${e.clientX - r.left}px`);
      g.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  // ---- cursor + magnetic buttons (fine pointers only)
  let cursor = null;
  const mouse = { x: innerWidth / 2, y: innerHeight / 2, cx: innerWidth / 2, cy: innerHeight / 2 };
  if (fine && !reduce) {
    cursor = document.createElement("div");
    cursor.className = "cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML = '<i></i><span class="cursor-label"></span>';
    document.body.appendChild(cursor);
    root.classList.add("has-cursor");
    addEventListener("pointermove", (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      root.classList.add("cursor-on");
      const t = e.target.closest?.("a, button, [role=button], summary, label, [data-cursor]");
      cursor.classList.toggle("hover", !!t);
    }, { passive: true });
    document.addEventListener("pointerleave", () => root.classList.remove("cursor-on"));
    document.querySelectorAll("[data-magnetic]").forEach((m) => {
      m.addEventListener("pointermove", (e) => {
        const r = m.getBoundingClientRect();
        m.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
      });
      m.addEventListener("pointerleave", () => (m.style.transform = ""));
    });
  }

  // ---- one loop
  let lastY = scrollY;
  let raf = 0;
  let measuredY = -1;
  const tick = (t) => {
    raf = 0;
    lenis?.raf(t);
    const y = scrollY;
    if (header) {
      header.classList.toggle("solid", y > 40);
      if (Math.abs(y - lastY) > 4) {
        header.classList.toggle("away", y > lastY && y > 400 && !root.classList.contains("menu-open"));
        lastY = y;
      }
    }
    if (hero && !reduce && measuredY !== y) {
      measuredY = y;
      const r = hero.getBoundingClientRect();
      if (r.bottom > 0) hero.style.setProperty("--hp", Math.min(Math.max(-r.top / r.height, 0), 1).toFixed(4));
    }
    if (cursor && (Math.abs(mouse.x - mouse.cx) > 0.05 || Math.abs(mouse.y - mouse.cy) > 0.05)) {
      mouse.cx += (mouse.x - mouse.cx) * 0.2;
      mouse.cy += (mouse.y - mouse.cy) * 0.2;
      cursor.style.transform = `translate3d(${mouse.cx}px, ${mouse.cy}px, 0)`;
    }
    raf = lenis || cursor ? requestAnimationFrame(tick) : 0;
  };
  const requestTick = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(tick); };
  addEventListener("scroll", requestTick, { passive: true });
  addEventListener("resize", requestTick, { passive: true });
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) { measuredY = -1; raf = requestAnimationFrame(tick); }
  });
  addEventListener("resize", () => { measuredY = -1; }, { passive: true });
  raf = requestAnimationFrame(tick);
})();
