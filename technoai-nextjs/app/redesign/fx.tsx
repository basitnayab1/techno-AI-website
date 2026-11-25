"use client";

import { useEffect, useRef, useState } from "react";
import { roboticsProductStack } from "./robotics-product-stack";
import "./opening.css";
import "./robot-framing.css";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Page-wide motion:
 * - Native compositor scrolling with smooth anchor navigation
 * - [data-reveal] fades in when it enters the screen
 * - [data-progress] sections get --p (0..1 scroll progress) and data-step="n" when data-steps is set
 * - [data-hscroll] gets --shift (px the inner track must move to show everything)
 * - header gets .scrolled
 */
export function Motion() {
  useEffect(() => {
    const root = document.documentElement;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    root.classList.add("fx");
    const reveal: IntersectionObserverCallback = (entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("in");
        observer.unobserve(entry.target);
      }
    };
    const io = new IntersectionObserver(reveal, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    const earlyReveal = new IntersectionObserver(reveal, { rootMargin: "0px 0px 300px 0px" });
    // more things rise in as you scroll: list items, cards, footer columns (staggered per group)
    const AUTO: [string, string?][] = [
      [".offices li"],
      [".ft-grid > *"],
      [".ft-bottom"],
      [".ft-word", "zoom"],
      [".center-head > *"],
      [".cx-head > *"],
    ];
    AUTO.forEach(([sel, kind]) => {
      const groups = new Map<Element | null, number>();
      document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        // a block that already rose as a whole now staggers its children instead (no double fade)
        if (el.parentElement?.hasAttribute("data-reveal")) el.parentElement.removeAttribute("data-reveal");
        const n = groups.get(el.parentElement) ?? 0;
        groups.set(el.parentElement, n + 1);
        el.setAttribute("data-reveal", kind ?? "");
        el.style.setProperty("--rd", `${Math.min(n, 6) * 0.09}s`);
      });
    });
    document.querySelectorAll<HTMLElement>(".rows li[data-reveal]").forEach((el, i) => el.style.setProperty("--rd", `${(i % 6) * 0.07}s`));
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      if (el.closest(".motion-reveal, .motion-stack, footer")) el.classList.add("in");
      else (el.matches('[data-reveal="capability"]') ? earlyReveal : io).observe(el);
    });

    const header = document.querySelector(".hd");
    const hero = document.querySelector<HTMLElement>(".hx-hero");
    const flow = hero?.querySelector<HTMLElement>(".hx-flow");
    let heroGeo: { top: number; h: number } | null = null;
    let lastFlow = "";
    const prog = Array.from(document.querySelectorAll<HTMLElement>("[data-progress]:not(#robotics)"));
    const hs = Array.from(document.querySelectorAll<HTMLElement>("[data-hscroll]"));
    const industries = document.getElementById("industries");
    const nativeTrack = CSS.supports("animation-timeline", "view()");

    const measure = () => {
      const sizes = hs.map((el) => {
        const track = el.querySelector<HTMLElement>(".h-track");
        const sticky = el.querySelector<HTMLElement>(".sticky");
        const pinned = sticky && getComputedStyle(sticky).position === "sticky";
        const shift = pinned && track && !motion.matches
          ? Math.max(track.scrollWidth - document.documentElement.clientWidth, 0) : 0;
        return { el, shift, viewport: sticky?.offsetHeight ?? window.innerHeight };
      });
      sizes.forEach(({ el, shift, viewport }) => {
        el.style.setProperty("--shift", `${shift}px`);
        const height = shift ? `${shift + viewport}px` : "";
        if (el.style.height !== height) el.style.height = height;
      });
    };
    // Section positions are measured once (and again when the page size changes), so scrolling only
    // reads window.scrollY. Measuring every frame forced a full layout per frame (the scroll stutter).
    const geo = new Map<HTMLElement, { top: number; h: number; travel: number }>();
    const remeasure = () => {
      const y = window.scrollY;
      if (hero) {
        const r = hero.getBoundingClientRect();
        heroGeo = { top: r.top + y, h: r.height };
      }
      prog.forEach((el) => {
        const r = el.getBoundingClientRect();
        const viewport = el === industries ? el.querySelector<HTMLElement>(".sticky")?.offsetHeight : undefined;
        geo.set(el, { top: r.top + y, h: r.height, travel: Math.max(1, r.height - (viewport ?? window.innerHeight)) });
      });
    };
    const last = new Map<HTMLElement, string>();
    const vhNow = { v: window.innerHeight };
    const pinnedRobotics = window.matchMedia("(min-width: 901px) and (min-height: 641px) and (prefers-reduced-motion: no-preference), (max-width: 760px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)");
    const products = roboticsProductStack(pinnedRobotics);
    const update = () => {
      const vh = vhNow.v;
      const y = window.scrollY;
      products.syncScroll();
      if (header) {
        const sc = y > 10;
        if (header.classList.contains("scrolled") !== sc) header.classList.toggle("scrolled", sc);
      }
      if (!motion.matches && flow && heroGeo && y < heroGeo.top + heroGeo.h + vh) {
        const p = Math.min(Math.max((y - heroGeo.top) / Math.max(heroGeo.h, 1), 0), 1).toFixed(3);
        if (p !== lastFlow) {
          lastFlow = p;
          hero?.style.setProperty("--hp", p);
          flow.style.setProperty("--flow-x", `${Math.round(-90 * +p)}px`);
          flow.style.setProperty("--flow-y", `${Math.round(145 * +p)}px`);
          flow.style.opacity = (0.68 + 0.2 * +p).toFixed(3);
        }
      }
      prog.forEach((el) => {
        if (el === industries && nativeTrack && !motion.matches) return;
        const g = geo.get(el);
        if (!g) return;
        const top = g.top - y;
        if (top + g.h < -vh || top > vh * 2) return;
        const p = Math.min(Math.max(-top / g.travel, 0), 1).toFixed(4);
        if (last.get(el) === p) return;
        last.set(el, p);
        el.style.setProperty("--p", p);
        const steps = Number(el.dataset.steps || 0);
        if (steps) {
          const position = Math.min(steps - 1, +p * steps);
          const step = String(Math.floor(position));
          if (el.dataset.step !== step) el.dataset.step = step;
        }
      });
    };
    let layoutRaf = 0;
    let disposed = false;
    const scheduleLayout = () => {
      if (disposed || layoutRaf) return;
      layoutRaf = requestAnimationFrame(() => {
        layoutRaf = 0;
        vhNow.v = window.innerHeight;
        measure();
        remeasure();
        last.clear();
        update();
      });
    };
    const ro = new ResizeObserver(scheduleLayout);
    ro.observe(document.body);
    const industryTrack = industries?.querySelector<HTMLElement>(".h-track");
    if (industryTrack) ro.observe(industryTrack);
    function focusIndustry(event: FocusEvent) {
      const card = event.target;
      const bounds = industries && geo.get(industries);
      if (!industryTrack || !bounds || !industries?.style.height || window.innerWidth > 760) return;
      if (!(card instanceof HTMLAnchorElement) || !card.matches(".ind:focus-visible")) return;
      const offset = card.getBoundingClientRect().left - industryTrack.getBoundingClientRect().left - industryTrack.clientLeft;
      const centered = offset - (document.documentElement.clientWidth - card.offsetWidth) / 2;
      window.scrollTo({ top: bounds.top + Math.min(bounds.travel, Math.max(0, centered)), behavior: "instant" });
    }
    industryTrack?.addEventListener("focusin", focusIndustry);
    motion.addEventListener("change", scheduleLayout);

    let raf = 0;
    let dirty = true;
    let lastY = -1;
    const loop = () => {
      raf = 0;
      const y = window.scrollY;
      if (dirty || y !== lastY) { dirty = false; lastY = y; update(); }
    };
    const requestTick = () => {
      dirty = true;
      if (!raf && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const visibility = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (!document.hidden) requestTick();
    };
    measure();
    remeasure();
    update();
    raf = requestAnimationFrame(loop);
    window.addEventListener("resize", scheduleLayout, { passive: true });
    pinnedRobotics.addEventListener("change", scheduleLayout);
    window.addEventListener("scroll", requestTick, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    document.fonts.ready.then(scheduleLayout);

    // Native smooth anchors keep scrolling independent of the WebGL frame budget.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a) return;
      a.closest("details")?.removeAttribute("open");
      const hash = a.getAttribute("href");
      if (!hash || hash === "#") return;
      let t: Element | null;
      try { t = document.querySelector(hash); } catch { return; }
      if (!t) return;
      e.preventDefault();
      const robotics = a.closest<HTMLElement>("#robotics-hardware .uses")?.closest("section");
      if (robotics) {
        const step = Number(a.parentElement?.dataset.i);
        products.goTo(step);
        return;
      }
      window.scrollTo({
        top: Math.max(0, window.scrollY + t.getBoundingClientRect().top - 90),
        behavior: motion.matches ? "instant" : "smooth",
      });
    };
    document.addEventListener("click", onClick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(layoutRaf);
      io.disconnect();
      earlyReveal.disconnect();
      ro.disconnect();
      industryTrack?.removeEventListener("focusin", focusIndustry);
      motion.removeEventListener("change", scheduleLayout);
      pinnedRobotics.removeEventListener("change", scheduleLayout);
      products.dispose();
      window.removeEventListener("resize", scheduleLayout);
      window.removeEventListener("scroll", requestTick);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("click", onClick);
      root.classList.remove("fx");
    };
  }, []);
  return null;
}

/** Start the loader exit as soon as the visible hero has its first frame. */
export function Loader({ preload }: { preload: string[] }) {
  const robotImage = "/redesign/hero/loader-robot-front.webp";
  const [done, setDone] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    document.documentElement.classList.add("loaded");
    document.documentElement.classList.remove("op-entering");
    setDone(true);
    document.documentElement.dataset.openingReady = "true";
    window.dispatchEvent(new Event("technoai:opening-ready"));
  };

  useEffect(() => {
    const root = document.documentElement;
    if (reduced() || root.hasAttribute("data-site-arrival")) {
      finish();
      return;
    }
    const stage = document.querySelector<HTMLElement>(".hx-stage");
    let offscreen = false;
    // iPhone (Safari) compiles the hero shaders 2-3x slower than Android (5.8-6.5 s vs 1.8-3 s,
    // 2026-11-25 test), so the dark opening stayed up that long. Cap the wait like Android: after
    // 2.5 s the hero poster shows and the live 3D fades in on its own when it is ready.
    let capped = false;
    const cap = window.setTimeout(() => { capped = true; reveal(); }, 2500);
    const reveal = () => {
      if (stage && !offscreen && !capped && !stage.dataset.openingSceneReady) return;
      clearTimeout(cap);
      scene.disconnect();
      viewport.disconnect();
      setRevealing(true);
      root.classList.add("loaded", "op-entering");
    };
    const scene = new MutationObserver(reveal);
    const viewport = new IntersectionObserver(([entry]) => {
      // Restored scroll positions and deep links can start below the hero.
      offscreen = !entry.isIntersecting;
      reveal();
    });
    if (stage) {
      scene.observe(stage, { attributes: true, attributeFilter: ["data-opening-scene-ready"] });
      viewport.observe(stage);
    }
    reveal();
    return () => {
      clearTimeout(cap);
      scene.disconnect();
      viewport.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!revealing) return;
    // Start the fallback after React paints the reveal, so a busy main thread cannot skip it.
    const safety = window.setTimeout(finish, 650);
    return () => clearTimeout(safety);
  }, [revealing]);

  const end = (e: React.AnimationEvent) => {
    if (e.target === e.currentTarget && e.animationName === "opExit") finish();
  };

  if (done) return null;
  return (
    <div className={revealing ? "op op-revealing" : "op"} aria-hidden="true" onAnimationEnd={end}>
      <link rel="preload" as="image" href={robotImage} fetchPriority="high" />
      <div className="op-center">
        <div className="op-emblem">
          <span className="op-orbit">
            <svg viewBox="0 0 240 240" fill="none">
              <circle className="op-orbit-base" cx="120" cy="120" r="113" />
              <circle className="op-orbit-trace" cx="120" cy="120" r="113" pathLength="100" />
            </svg>
          </span>
          <img className="op-robot" src={robotImage} alt="" width="420" height="490" fetchPriority="high" decoding="sync" />
        </div>
        <span className="op-logo" style={{ ["--op-logo" as string]: `url("${preload[0]}")` }} />
        <div className="op-status">
          <span className="op-track" />
          <span>Loading</span>
        </div>
      </div>
    </div>
  );
}

/** "Mission log" terminal: types the lines one by one when it scrolls into view. */
export function Terminal({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [out, setOut] = useState<string[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced()) {
      setOut(lines);
      return;
    }
    let timer = 0;
    let started = false;
    const run = () => {
      let li = 0;
      let ci = 0;
      const step = () => {
        if (li >= lines.length) {
          timer = window.setTimeout(() => {
            setOut([]);
            run();
          }, 4000);
          return;
        }
        ci++;
        setOut([...lines.slice(0, li), lines[li].slice(0, ci)]);
        if (ci >= lines[li].length) {
          li++;
          ci = 0;
          timer = window.setTimeout(step, 380);
        } else timer = window.setTimeout(step, 18);
      };
      step();
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) {
        started = true;
        run();
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, [lines]);

  return (
    <div className="term" ref={ref}>
      <div className="term-bar">
        <i />
        <i />
        <i />
        <span>technoai mission log</span>
      </div>
      <pre>
        {out.map((l, i) => (
          <div key={i} className={l.startsWith("✓") ? "ok" : undefined}>
            {l}
          </div>
        ))}
        <span className="caret" />
      </pre>
    </div>
  );
}

/** Pages without the opening (Loader) mark themselves ready at once, so the navbar and reveal animations run. */
export function Ready() {
  useEffect(() => {
    document.documentElement.classList.add("loaded");
  }, []);
  return null;
}
