"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import "./fibre-background.css";

const Scene = dynamic(() => import("./fibre-background-scene"), { ssr: false });

export default function FibreBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    let inView = false;
    const update = () => {
      const active = inView && !document.hidden;
      setVisible(active);
      if (active) setStarted(true);
    };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); });
    observer.observe(main);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);
  return <div ref={ref} className="hero-fibres" style={{ visibility: visible ? "visible" : "hidden" }} aria-hidden="true">{started && <Scene visible={visible} />}</div>;
}
