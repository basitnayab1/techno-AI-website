"use client";

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
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
    let lenis: Lenis | null = null;
    if (!still) {
      lenis = new Lenis({ duration: 1.15, smoothWheel: true });
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
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

    const header = document.querySelector(".hd");
    const prog = Array.from(document.querySelectorAll<HTMLElement>("[data-progress]"));
    const hs = Array.from(document.querySelectorAll<HTMLElement>("[data-hscroll]"));

    const measure = () => {
      hs.forEach((el) => {
        const track = el.querySelector<HTMLElement>(".h-track");
        const shift = window.innerWidth < 760 || !track ? 0 : Math.max(track.scrollWidth - window.innerWidth, 0);
        el.style.setProperty("--shift", `${shift}px`);
        el.style.height = shift ? `${shift + window.innerHeight}px` : "";
      });
    };
    // Section positions are measured once (and again when the page size changes), so scrolling only
    // reads window.scrollY. Measuring every frame forced a full layout per frame (the scroll stutter).
    const geo = new Map<HTMLElement, { top: number; h: number }>();
    const remeasure = () => {
      const y = window.scrollY;
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
    const ro = new ResizeObserver(() => {
      vhNow.v = window.innerHeight;
      remeasure();
      update();
    });
    ro.observe(document.body);

    let raf = 0;
    const loop = (time: number) => {
      lenis?.raf(time);
      raf = requestAnimationFrame(loop);
    };
    measure();
    remeasure();
    update();
    raf = requestAnimationFrame(loop);
    window.addEventListener("resize", measure);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });

    // in-page links through Lenis
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a) return;
      a.closest("details")?.removeAttribute("open");
      if (!lenis) return;
      const t = document.querySelector(a.getAttribute("href")!);
      if (!t) return;
      e.preventDefault();
      lenis.scrollTo(t as HTMLElement, { offset: -70 });
    };
    document.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
      document.removeEventListener("click", onClick);
      lenis?.destroy();
      root.classList.remove("fx");
    };
  }, []);
  return null;
}

/** Brief, CSS-only brand reveal. It does not wait for video, fonts, or WebGL. */
export function Loader({ preload }: { preload: string[] }) {
  const [done, setDone] = useState(false);
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    document.documentElement.classList.add("loaded");
    setDone(true);
    try {
      sessionStorage.setItem("tai-opener-v4", "1");
    } catch {}
  };

  useEffect(() => {
    const root = document.documentElement;
    let seen = false;
    try {
      seen = sessionStorage.getItem("tai-opener-v4") === "1";
    } catch {}
    if (seen || reduced()) {
      finish();
      return;
    }
    const reveal = window.setTimeout(() => root.classList.add("loaded"), 780);
    const safety = window.setTimeout(finish, 1800);
    return () => {
      clearTimeout(reveal);
      clearTimeout(safety);
    };
  }, []);

  const end = (e: React.AnimationEvent) => {
    if (e.target === e.currentTarget && e.animationName === "opExit") finish();
  };

  if (done) return null;
  return (
    <div className="op" aria-hidden="true" onAnimationEnd={end}>
      <span className="op-cover" />
      <span className="op-aura" />
      <span className="op-wave" />
      <div className="op-center">
        <img className="op-logo" src={preload[0]} alt="" width="225" height="105" />
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
