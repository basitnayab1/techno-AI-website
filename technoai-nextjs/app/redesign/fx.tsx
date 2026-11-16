"use client";

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";

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
    const update = () => {
      header?.classList.toggle("scrolled", window.scrollY > 10);
      const vh = window.innerHeight;
      prog.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) return;
        const p = Math.min(Math.max(-r.top / Math.max(r.height - vh, 1), 0), 1);
        el.style.setProperty("--p", p.toFixed(4));
        const steps = Number(el.dataset.steps || 0);
        if (steps) el.dataset.step = String(Math.min(steps - 1, Math.floor(p * steps)));
      });
    };

    let raf = 0;
    const loop = (time: number) => {
      lenis?.raf(time);
      update();
      raf = requestAnimationFrame(loop);
    };
    measure();
    update();
    raf = requestAnimationFrame(loop);
    window.addEventListener("resize", measure);

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
      window.removeEventListener("resize", measure);
      document.removeEventListener("click", onClick);
      lenis?.destroy();
      root.classList.remove("fx");
    };
  }, []);
  return null;
}

/** Opening screen: the //:ai mark draws itself while the first visuals load (once per session). */
export function Loader({ preload }: { preload: string[] }) {
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);
  const shown = useRef(0);

  useEffect(() => {
    const root = document.documentElement;
    let seen = false;
    try {
      seen = sessionStorage.getItem("tai-loaded") === "1";
    } catch {}
    if (seen || reduced()) {
      setDone(true);
      root.classList.add("loaded");
      return;
    }
    let loaded = 0;
    const total = preload.length + 1;
    const bump = () => (loaded += 1);
    preload.forEach((src) => {
      const img = new Image();
      img.onload = img.onerror = bump;
      img.src = src;
    });
    document.fonts?.ready.then(bump, bump);
    const t0 = performance.now();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setPct(100);
      setTimeout(() => {
        setDone(true);
        root.classList.add("loaded");
        try {
          sessionStorage.setItem("tai-loaded", "1");
        } catch {}
      }, 300);
    };
    // Time-based (not per frame), so a slow or background tab can't get stuck.
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - t0;
      const v = Math.min(loaded / total, elapsed / 1400) * 100; // at least ~1.4 s, so the mark can draw
      shown.current = Math.max(shown.current, v);
      setPct(Math.round(shown.current));
      if (shown.current >= 100 || elapsed > 5000) finish(); // never block longer than 5 s
    }, 50);
    return () => clearInterval(timer);
  }, [preload]);

  if (done) return null;
  return (
    <div className={pct >= 100 ? "loader out" : "loader"} style={{ ["--lp" as string]: pct / 100 }} aria-hidden="true">
      <svg className="loader-mark" viewBox="0 0 120 60">
        <path d="M14 50 L30 10 M34 50 L50 10" />
        <circle cx="62" cy="20" r="3.2" />
        <circle cx="62" cy="44" r="3.2" />
        <circle cx="86" cy="39" r="10" />
        <path d="M96 28 V50 M108 28 V50" />
        <circle cx="108" cy="17" r="3.2" />
      </svg>
      <div className="loader-bar"><i /></div>
      <span className="loader-pct">{String(pct).padStart(3, "0")}</span>
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
