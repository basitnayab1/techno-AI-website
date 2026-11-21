"use client";

import { useOpeningReady } from "./opening-ready";
import { useReducedMotion } from "./reduced-motion";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import "./fibre-background.css";

const Scene = dynamic(() => import("./fibre-background-scene"), { ssr: false });

export default function FibreBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [started, setStarted] = useState(false);
  const openingReady = useOpeningReady();
  const still = useReducedMotion();
  useEffect(() => {
    if (!openingReady || still) return;
    const main = document.querySelector("main");
    if (!main) return;
    let inView = false;
    let hardwareCoversViewport = false;
    const update = () => {
      const active = inView && !document.hidden && !hardwareCoversViewport;
      setVisible(active);
      if (active) setStarted(true);
    };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); });
    observer.observe(main);
    // The full-height hardware film is opaque. Leave the GPU to the visible video.
    const hardware = main.querySelector(".hw-visual");
    const cover = new IntersectionObserver(([entry]) => {
      hardwareCoversViewport = entry.intersectionRatio >= .98;
      update();
    }, { threshold: .98 });
    if (hardware) cover.observe(hardware);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      cover.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [openingReady, still]);
  return <div ref={ref} className="hero-fibres" style={{ visibility: visible ? "visible" : "hidden" }} aria-hidden="true">{!still && started && <Scene visible={visible} />}</div>;
}
