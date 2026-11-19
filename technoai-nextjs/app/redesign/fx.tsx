"use client";

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import PageCurtain from "../page-curtain";
import { pageTransitions } from "../interior-kit/motion";
import "./opening.css";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Page-wide motion:
 * - Lenis smooth scrolling
 * - [data-reveal] fades in when it enters the screen
 * - [data-progress] sections get --p (0..1 scroll progress) and data-step="n" when data-steps is set
 * - [data-hscroll] gets --shift (px the inner track must move to show everything)
 * - header gets .scrolled
 */
export function Motion() {
  useEffect(() => {
    const root = document.documentElement;
    const still = reduced();
    const cleanPageTransitions = pageTransitions(root);
    let lenis: Lenis | null = null;
    // Touch stays native; only a desktop wheel needs an interpolated scroll position.
    if (!still && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      lenis = new Lenis({ lerp: .12, smoothWheel: true, syncTouch: false, overscroll: false });
      (window as unknown as { lenis: Lenis }).lenis = lenis;
    }

    root.classList.add("fx");
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );
    // more things rise in as you scroll: list items, cards, footer columns (staggered per group)
    const AUTO: [string, string?][] = [
      [".offices li"],
      [".ind", "right"],
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
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

    const header = document.querySelector(".hd");
    const hero = document.querySelector<HTMLElement>(".hx-hero");
    const flow = hero?.querySelector<HTMLElement>(".hx-flow");
    let heroGeo: { top: number; h: number } | null = null;
    let lastFlow = "";
    const prog = Array.from(document.querySelectorAll<HTMLElement>("[data-progress]"));
    const hs = Array.from(document.querySelectorAll<HTMLElement>("[data-hscroll]"));

    const measure = () => {
      const sizes = hs.map((el) => {
        const track = el.querySelector<HTMLElement>(".h-track");
        const shift = window.innerWidth < 760 || !track ? 0 : Math.max(track.scrollWidth - window.innerWidth, 0);
        return { el, shift };
      });
      sizes.forEach(({ el, shift }) => {
        el.style.setProperty("--shift", `${shift}px`);
        const height = shift ? `${shift + window.innerHeight}px` : "";
        if (el.style.height !== height) el.style.height = height;
      });
    };
    // Section positions are measured once (and again when the page size changes), so scrolling only
    // reads window.scrollY. Measuring every frame forced a full layout per frame (the scroll stutter).
    const geo = new Map<HTMLElement, { top: number; h: number }>();
    const remeasure = () => {
      const y = window.scrollY;
      if (hero) {
        const r = hero.getBoundingClientRect();
        heroGeo = { top: r.top + y, h: r.height };
      }
      prog.forEach((el) => {
        const r = el.getBoundingClientRect();
        geo.set(el, { top: r.top + y, h: r.height });
      });
    };
    const last = new Map<HTMLElement, string>();
    const vhNow = { v: window.innerHeight };
    const update = () => {
      const vh = vhNow.v;
      // Lenis already knows the scroll position; reading window.scrollY after style writes forces a layout
      const y = lenis ? lenis.scroll : window.scrollY;
      if (header) {
        const sc = y > 10;
        if (header.classList.contains("scrolled") !== sc) header.classList.toggle("scrolled", sc);
      }
      if (flow && heroGeo && y < heroGeo.top + heroGeo.h + vh) {
        const p = Math.min(Math.max((y - heroGeo.top) / Math.max(heroGeo.h, 1), 0), 1).toFixed(3);
        if (p !== lastFlow) {
          lastFlow = p;
          flow.style.setProperty("--flow-x", `${Math.round(-90 * +p)}px`);
          flow.style.setProperty("--flow-y", `${Math.round(145 * +p)}px`);
          flow.style.opacity = (0.68 + 0.2 * +p).toFixed(3);
        }
      }
      prog.forEach((el) => {
        const g = geo.get(el);
        if (!g) return;
        const top = g.top - y;
        if (top + g.h < -vh || top > vh * 2) return;
        const p = Math.min(Math.max(-top / Math.max(g.h - vh, 1), 0), 1).toFixed(4);
        if (last.get(el) === p) return;
        last.set(el, p);
        el.style.setProperty("--p", p);
        const steps = Number(el.dataset.steps || 0);
        if (steps) {
          const step = String(Math.min(steps - 1, Math.floor(+p * steps)));
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
        lenis?.resize();
        remeasure();
        last.clear();
        update();
      });
    };
    const ro = new ResizeObserver(scheduleLayout);
    ro.observe(document.body);

    let raf = 0;
    let dirty = true;
    let lastY = -1;
    const loop = (time: number) => {
      raf = 0;
      lenis?.raf(time);
      const y = lenis ? lenis.scroll : window.scrollY;
      if (dirty || y !== lastY) { dirty = false; lastY = y; update(); }
      if (lenis && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const requestTick = () => {
      dirty = true;
      if (!raf && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const visibility = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (!document.hidden) { lenis?.resize(); requestTick(); }
    };
    measure();
    remeasure();
    update();
    raf = requestAnimationFrame(loop);
    window.addEventListener("resize", scheduleLayout, { passive: true });
    window.addEventListener("scroll", requestTick, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    document.fonts.ready.then(scheduleLayout);

    // in-page links through Lenis
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
      if (lenis) lenis.scrollTo(t as HTMLElement, { offset: -70 });
      else window.scrollTo({
        top: Math.max(0, window.scrollY + t.getBoundingClientRect().top - 90),
        behavior: still ? "instant" : "smooth",
      });
    };
    document.addEventListener("click", onClick);

    return () => {
      disposed = true;
      cleanPageTransitions();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(layoutRaf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", scheduleLayout);
      window.removeEventListener("scroll", requestTick);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("click", onClick);
      if ((window as Window & { lenis?: Lenis }).lenis === lenis) delete (window as Window & { lenis?: Lenis }).lenis;
      lenis?.destroy();
      root.classList.remove("fx");
    };
  }, []);
  return <PageCurtain />;
}

/** A short brand opener while the hero warms up; slower assets never block entry. */
export function Loader({ preload }: { preload: string[] }) {
  const [done, setDone] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    document.documentElement.classList.add("loaded");
    document.documentElement.classList.remove("op-entering");
    setDone(true);
  };

  useEffect(() => {
    const root = document.documentElement;
    // A normal refresh repeats the horizontal reveal. In-site navigation uses the shared curtain.
    if (reduced() || root.classList.contains("arriving")) {
      finish();
      return;
    }
    let active = true;
    let elapsed = false;
    let revealed = false;
    const stage = document.querySelector<HTMLElement>(".hx-stage");
    const reveal = () => {
      if (active && !revealed) {
        revealed = true;
        setRevealing(true);
        root.classList.add("loaded", "op-entering");
      }
    };
    const check = () => {
      if (elapsed && (!stage || stage.dataset.ready || stage.dataset.mode === "fallback")) reveal();
    };
    const observer = new MutationObserver(check);
    if (stage) observer.observe(stage, { attributes: true, attributeFilter: ["data-ready", "data-mode"] });
    import("./models").then(({ preloadModel }) =>
      Promise.allSettled(["drone", "robot"].map(preloadModel))
    ).catch(() => { /* Product assets can finish after the opener. */ });
    const minimum = window.setTimeout(() => { elapsed = true; check(); }, 650);
    const deadline = window.setTimeout(reveal, 2200);
    return () => {
      active = false;
      observer.disconnect();
      clearTimeout(minimum);
      clearTimeout(deadline);
    };
  }, []);

  useEffect(() => {
    if (!revealing) return;
    // Start the fallback after React paints the reveal, so a busy main thread cannot skip it.
    const safety = window.setTimeout(finish, 1100);
    return () => clearTimeout(safety);
  }, [revealing]);

  const end = (e: React.AnimationEvent) => {
    if (e.target === e.currentTarget && e.animationName === "opExit") finish();
  };

  if (done) return null;
  return (
    <div className={revealing ? "op op-revealing" : "op"} aria-hidden="true" onAnimationEnd={end}>
      <div className="op-center">
        <div className="op-emblem">
          <svg className="op-orbit" viewBox="0 0 240 240" fill="none">
            <circle className="op-orbit-base" cx="120" cy="120" r="113" />
            <circle className="op-orbit-trace" cx="120" cy="120" r="113" pathLength="100" />
          </svg>
          <span className="op-logo" style={{ ["--op-logo" as string]: `url("${preload[0]}")` }} />
        </div>
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
        <span>technoai — mission log</span>
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
