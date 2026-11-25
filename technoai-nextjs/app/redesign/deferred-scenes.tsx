"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./reduced-motion";
import { isIPhone, useIPhone } from "./iphone";
import { runWhenQuiet } from "./heavy-queue";

// Keep the three.js journey, globe, and frame player out of the first-page bundle.
const Journey = dynamic(() => import("./scenes").then((m) => m.JourneyScene), { ssr: false });
const Globe = dynamic(() => import("./presence-globe"), { ssr: false });
const Film = dynamic(() => import("./scenes").then((m) => m.DroneFilm), { ssr: false });

function useNear(margin = 500, enabled = true) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const target = ref.current;
    if (!target || !enabled) return;
    let cancel = () => {};
    if (isIPhone) {
      let release = 0;
      const observer = new IntersectionObserver(([entry]) => {
        clearTimeout(release);
        cancel();
        if (entry.isIntersecting) cancel = runWhenQuiet(() => setNear(true));
        else release = window.setTimeout(() => setNear(false), 5000);
      }, {rootMargin: "240px 0px"});
      observer.observe(target);
      return () => { clearTimeout(release); cancel(); observer.disconnect(); };
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      // iPhone: start the 3D only while the user is not scrolling, one scene at a time (heavy-queue.ts).
      cancel = runWhenQuiet(() => { setNear(true); return new Promise((r) => setTimeout(r, 2500)); });
    }, { rootMargin: `${margin}px 0px` });
    observer.observe(target);
    return () => { observer.disconnect(); cancel(); };
  }, [margin, enabled]);
  return { ref, near };
}

export function JourneyScene() {
  const { ref, near } = useNear(1400, !isIPhone);
  const still = useReducedMotion();
  return <div ref={ref} style={{ position: "absolute", inset: 0 }} aria-hidden="true">{near && !still && <Journey />}</div>;
}

export function GlobeScene({ active = 0, onSelect }: { active?: number; onSelect?: (index: number) => void }) {
  const still = useReducedMotion();
  const iphone = useIPhone();
  const { ref, near } = useNear(800, !isIPhone);
  return <div ref={ref} className="presence-surface">
    <img className="presence-poster" src={iphone ? "/redesign/globe/presence-iphone.webp" : "/redesign/globe/presence-still.webp"}
      width={iphone ? 1100 : 632} height={iphone ? 1100 : 632}
      loading={near ? "eager" : "lazy"} decoding="async" alt="Globe showing TechnoAi hubs in Abu Dhabi, Prague and Lahore" />
    {near && !still && <Globe active={active} onSelect={onSelect} />}
  </div>;
}

export function DroneFilm({ count, dir, poster, video }: { count: number; dir: string; poster: string; video: string }) {
  const { ref, near } = useNear();
  return <div ref={ref} style={{ position: "absolute", inset: 0 }}>
    {near ? <Film count={count} dir={dir} poster={poster} video={video} /> : <img className="film" src={poster} alt="" loading="lazy" />}
  </div>;
}
