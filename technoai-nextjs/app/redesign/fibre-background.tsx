"use client";

import { useOpeningReady } from "./opening-ready";
import { useReducedMotion } from "./reduced-motion";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { isIPhone } from "./iphone";
import "./fibre-background.css";

const Scene = dynamic(() => import("./fibre-background-scene"), { ssr: false });

export default function FibreBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [started, setStarted] = useState(false);
  const openingReady = useOpeningReady();
  const still = useReducedMotion();
  useEffect(() => {
    if (isIPhone || !openingReady || still) return;
    const main = document.querySelector("main");
    if (!main) return;
    let inView = false;
    const opaqueScenes = new Set<Element>();
    const update = () => {
      const active = inView && !document.hidden && opaqueScenes.size === 0;
      setVisible(active);
      if (active) setStarted(true);
    };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); });
    observer.observe(main);
    // Stop drawing the background under an opaque hardware film or pinned robotics scene.
    const cover = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.intersectionRatio >= .98) opaqueScenes.add(entry.target);
        else opaqueScenes.delete(entry.target);
      }
      update();
    }, { threshold: .98 });
    main.querySelectorAll(".hw-visual, #robotics > .sticky").forEach(scene => cover.observe(scene));
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      cover.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [openingReady, still]);
  return <div ref={ref} className="hero-fibres" style={{ visibility: visible ? "visible" : "hidden" }} aria-hidden="true">{!still && started && <Scene visible={visible} />}</div>;
}
