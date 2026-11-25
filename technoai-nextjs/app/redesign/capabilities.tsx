"use client";

import { isIPhone, useIPhone } from "./iphone";

import { useReducedMotion } from "./reduced-motion";
import { useOpeningReady } from "./opening-ready";
import { runWhenQuiet } from "./heavy-queue";

import "./capabilities.css";
import DotField from "./dot-field";
import SplineCard from "./spline-card";
import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Kind } from "./capability-models";

// Section 02 — "Find your starting point": three capability cards, each with its own live 3D model.
// Reveal uses the page's existing [data-reveal] system (fx.tsx + Lenis); no second animation library.

const CapabilityModel = dynamic(() => import("./capability-models"), {
  ssr: false,
  loading: () => <span className="cx-model-wait" aria-hidden="true" />,
});

const CARDS: { n: string; kind: Kind; title: string; text: string; href: string; link: string }[] = [
  { n: "01", kind: "ai", title: "AI systems", text: "AI tools built for your daily operations.", href: "/ai-robotics/", link: "Explore AI" },
  { n: "02", kind: "robotics", title: "Robotics & automation", text: "Robots for cleaning, delivery and service.", href: "/robotics/", link: "Explore robotics" },
  { n: "03", kind: "edge", title: "AI hardware", text: "NVIDIA platforms and embedded boards for edge computing.", href: "/all-products/", link: "Browse hardware" },
];

function Arrow() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

class CardFallback extends Component<{ onWarm: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onWarm(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function Card({ c, show, moving, onWarm }: { c: (typeof CARDS)[number]; show: boolean; moving: boolean; onWarm: () => void }) {
  const [hover, setHover] = useState(false);
  const iphone = useIPhone();
  const poster = iphone ? `/redesign/capabilities/${c.kind}-iphone.webp` : c.kind === "robotics" ? "/redesign/section-robot.png" : `/redesign/capabilities/${c.kind}-still.webp`;
  return (
    <a className="cx-card" href={c.href} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
      <span className="cx-glow" aria-hidden="true" />
      <div className="cx-card-top">
        <span className="cx-n">{c.n}</span>
        <span className="cx-rule" aria-hidden="true" />
      </div>
      {/* Robotics card: the owner's Spline robot (iframe); the other cards keep their small 3D models */}
      <div className={`cx-model cx-model-${c.kind}`}>
        <img className="cx-model-poster" src={poster} width={c.kind === "robotics" ? (iphone ? 470 : 235) : (iphone ? 606 : 202)} height={c.kind === "robotics" ? (iphone ? 600 : 300) : (iphone ? 633 : 211)} alt="" loading="lazy" decoding="async" />
        {show && (c.kind === "robotics" ? <SplineCard /> :
          <CardFallback onWarm={onWarm}><CapabilityModel kind={c.kind} hovered={hover} moving={moving} onWarm={onWarm} /></CardFallback>)}
      </div>
      <h3>{c.title}</h3>
      <p>{c.text}</p>
      <span className="cx-link">
        {c.link}
        <Arrow />
      </span>
    </a>
  );
}

export default function Capabilities() {
  const section = useRef<HTMLElement>(null);
  const still = useReducedMotion() || isIPhone;
  const opened = useOpeningReady();
  const [near, setNear] = useState(false);
  const [moving, setMoving] = useState(false);
  const [warmed, setWarmed] = useState(0);
  const [mounted, setMounted] = useState(0);
  const [robotWarm, setRobotWarm] = useState(false);
  const cubeWarm = useCallback(() => setWarmed(1), []);
  const rackWarm = useCallback(() => setWarmed(2), []);
  useEffect(() => {
    if (!near || still) return;
    let scrolling = false;
    let timer = 0;
    const scroll = () => {
      if (!scrolling) { scrolling = true; setMoving(true); }
      clearTimeout(timer);
      timer = window.setTimeout(() => { scrolling = false; setMoving(false); }, 150);
    };
    window.addEventListener("scroll", scroll, { passive: true });
    return () => { clearTimeout(timer); window.removeEventListener("scroll", scroll); setMoving(false); };
  }, [near, still]);
  useEffect(() => {
    if (!near || still || robotWarm) return;
    const ready = () => setRobotWarm(true);
    if (document.querySelector('.robot-stage[data-ready="true"]')) { ready(); return; }
    window.addEventListener("technoai:robot-warm", ready, { once: true });
    const fallback = window.setTimeout(ready, 4000);
    return () => { clearTimeout(fallback); window.removeEventListener("technoai:robot-warm", ready); };
  }, [near, still, robotWarm]);
  useEffect(() => {
    if (!opened || !near || still || moving || !robotWarm || mounted !== warmed || mounted === 2) return;
    // Keep downloaded posters in place during a fast pass. Only start a new GPU
    // context in a quiet scroll interval, and never after the user has passed it.
    let timer = 0;
    let cancel = () => {};
    const schedule = () => {
      clearTimeout(timer);
      cancel();
      if (document.hidden) return;
      // iPhone: card models start only while the user is not scrolling, one 3D start at a time.
      timer = window.setTimeout(() => {
        cancel = runWhenQuiet(() => { setMounted(warmed + 1); return new Promise((r) => setTimeout(r, 2500)); });
      }, 180);
    };
    document.addEventListener("visibilitychange", schedule);
    schedule();
    return () => {
      clearTimeout(timer);
      cancel();
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [opened, near, still, moving, robotWarm, mounted, warmed]);
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    let prefetched = false;
    const observer = new IntersectionObserver(([entry]) => {
      setNear(entry.isIntersecting);
      if (!entry.isIntersecting || prefetched) return;
      prefetched = true;
      for (const poster of element.querySelectorAll("img")) {
        poster.loading = "eager";
        void poster.decode().catch(() => {});
      }
      if (!isIPhone && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        void import("./capability-models");
        // The shared iframe can reuse the decoded scene download when its turn arrives.
        // Wait until the hero 3D is live (or on its poster) so the 1.3 MB scene does not starve it on phones.
        const prefetch = () => void fetch("/redesign/spline/robot-13bd456a.splinecode", { priority: "low" }).catch(() => {});
        const stage = document.querySelector<HTMLElement>(".hx-stage");
        const settled = () => !stage || stage.dataset.ready === "true" || stage.dataset.mode === "fallback";
        if (settled()) prefetch();
        else {
          const watch = new MutationObserver(() => { if (settled()) { watch.disconnect(); clearTimeout(late); prefetch(); } });
          watch.observe(stage!, { attributes: true, attributeFilter: ["data-ready", "data-mode"] });
          const late = window.setTimeout(() => { watch.disconnect(); prefetch(); }, 15000);
        }
      }
    }, { rootMargin: isIPhone ? "160px 0px" : "1200px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <section ref={section} className="cx" id="solutions" data-scrolling={moving || undefined} aria-labelledby="cx-title">
      <DotField />
      {/* particles drifting on from the hero */}
      <div className="cx-particles" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => (
          <i key={i} style={{ ["--x" as string]: `${(i * 37) % 100}%`, ["--y" as string]: `${(i * 53) % 60}%`, ["--d" as string]: `${(i % 7) * 1.3}s`, ["--s" as string]: `${3 + (i % 4)}px` }} />
        ))}
      </div>
      <div className="cx-art" aria-hidden="true">
        <img src="/redesign/capabilities/robot-hand.jpg" width="1400" height="828" alt="" loading="lazy" decoding="async" />
      </div>

      <div className="cx-inner">
        <div className="cx-head" data-reveal>
          <p className="cx-eyebrow">
            <span className="cx-chip" aria-hidden="true">
              <svg viewBox="0 0 16 16"><path d="M8 3v9M4.5 8.5 8 12l3.5-3.5" /></svg>
            </span>
            Find your starting point
            <span className="cx-eyebrow-line" aria-hidden="true" />
          </p>
          <h2 id="cx-title">
            Intelligence <span>in action.</span>
          </h2>
          <div className="cx-progress" aria-hidden="true"><i /></div>
        </div>

        <div className="cx-grid">
          {CARDS.map((c) => (
            <div className="cx-cell" data-reveal="capability" key={c.n}>
              <Card c={c} moving={moving} show={!still && mounted >= ({ ai: 1, edge: 2, robotics: 0 }[c.kind])}
                onWarm={c.kind === "ai" ? cubeWarm : rackWarm} />
            </div>
          ))}
        </div>

        <a className="cx-next" href="#technology">
          <span className="cx-next-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20"><path d="M10 4v12M5 11l5 5 5-5" /></svg>
          </span>
          Explore TechnoAi solutions
          <Arrow />
          <span className="cx-next-line" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
