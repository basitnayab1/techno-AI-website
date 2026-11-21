"use client";

import { useOpeningReady } from "./opening-ready";
import { useReducedMotion } from "./reduced-motion";
import { afterScroll } from "./after-scroll";

import "./capabilities.css";
import DotField from "./dot-field";
import SplineCard from "./spline-card";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Kind } from "./capability-models";

// Section 02 — "Find your starting point": three capability cards, each with its own live 3D model.
// Reveal uses the page's existing [data-reveal] system (fx.tsx + Lenis); no second animation library.

const CapabilityModel = dynamic(() => import("./capability-models"), {
  ssr: false,
  loading: () => <span className="cx-model-wait" aria-hidden="true" />,
});

const CARDS: { n: string; kind: Kind; title: string; text: string; href: string; link: string }[] = [
  { n: "01", kind: "ai", title: "AI & intelligent systems", text: "Bring AI into everyday operations with systems built around your requirements.", href: "/ai-robotics/", link: "Explore AI solutions" },
  { n: "02", kind: "robotics", title: "Robotics & automation", text: "Connect autonomous robots and automation tools to the way your teams work.", href: "/robotics/", link: "Explore robotics" },
  { n: "03", kind: "edge", title: "AI hardware & edge computing", text: "Find computing hardware, NVIDIA platforms, and embedded intelligence for your next deployment.", href: "/all-products/", link: "Browse hardware" },
];

function Arrow() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

function Card({ c }: { c: (typeof CARDS)[number] }) {
  const model = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [show, setShow] = useState(false);
  const openingReady = useOpeningReady();
  const still = useReducedMotion();
  useEffect(() => {
    if (!openingReady || still || show || !model.current) return;
    let cancel = () => {};
    const observer = new IntersectionObserver(([entry]) => {
      cancel();
      if (!entry.isIntersecting) return;
      cancel = afterScroll(() => {
        setShow(true);
        observer.disconnect();
      });
    }, { rootMargin: "400px 0px" });
    observer.observe(model.current);
    return () => { cancel(); observer.disconnect(); };
  }, [openingReady, still, show]);
  const poster = c.kind === "robotics" ? "/redesign/section-robot.png" : `/redesign/capabilities/${c.kind}-still.webp`;
  return (
    <a className="cx-card" href={c.href} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
      <span className="cx-glow" aria-hidden="true" />
      <div className="cx-card-top">
        <span className="cx-n">{c.n}</span>
        <span className="cx-rule" aria-hidden="true" />
      </div>
      {/* Robotics card: the owner's Spline robot (iframe); the other cards keep their small 3D models */}
      <div className="cx-model" ref={model}>
        <img className="cx-model-poster" src={poster} width={c.kind === "robotics" ? 235 : 202} height={c.kind === "robotics" ? 300 : 211} alt="" loading="lazy" decoding="async" />
        {!still && show && (c.kind === "robotics" ? <SplineCard /> : <CapabilityModel kind={c.kind} hovered={hover} />)}
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
  return (
    <section className="cx" id="solutions" aria-labelledby="cx-title">
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
            From intelligence
            <br />
            <span>to real-world action.</span>
          </h2>
          <p className="cx-sub">Explore a capability, browse the hardware, or talk to us about a complete system.</p>
          <div className="cx-progress" aria-hidden="true"><i /></div>
        </div>

        <div className="cx-grid">
          {CARDS.map((c) => (
            <div className="cx-cell" data-reveal="capability" key={c.n}>
              <Card c={c} />
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
