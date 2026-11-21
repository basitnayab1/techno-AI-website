"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./reduced-motion";
import { afterScroll } from "./after-scroll";

// Keep the three.js journey, globe, and frame player out of the first-page bundle.
const Journey = dynamic(() => import("./scenes").then((m) => m.JourneyScene), { ssr: false });
const Globe = dynamic(() => import("./presence-globe"), { ssr: false });
const Film = dynamic(() => import("./scenes").then((m) => m.DroneFilm), { ssr: false });

function useNear(waitForScroll = false) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const target = ref.current;
    if (!target) return;
    let cancel = () => {};
    const ready = () => {
      setNear(true);
      observer.disconnect();
    };
    const observer = new IntersectionObserver(([entry]) => {
      cancel();
      if (!entry.isIntersecting) return;
      if (waitForScroll) cancel = afterScroll(ready);
      else ready();
    }, { rootMargin: "500px 0px" });
    observer.observe(target);
    return () => { cancel(); observer.disconnect(); };
  }, [waitForScroll]);
  return { ref, near };
}

export function JourneyScene() {
  const { ref, near } = useNear();
  const still = useReducedMotion();
  return <div ref={ref} style={{ position: "absolute", inset: 0 }} aria-hidden="true">{near && !still && <Journey />}</div>;
}

export function GlobeScene({ active = 0, onSelect }: { active?: number; onSelect?: (index: number) => void }) {
  const still = useReducedMotion();
  const { ref, near } = useNear(!still);
  return <div ref={ref} style={{ width: "100%", height: "100%" }}>
    {near && (still
      ? <img src="/redesign/globe/presence-still.webp" width="632" height="632" loading="lazy" alt="Globe showing TechnoAi hubs in Abu Dhabi, Prague and Lahore" />
      : <Globe active={active} onSelect={onSelect} />)}
  </div>;
}

export function DroneFilm({ count, dir, poster, video }: { count: number; dir: string; poster: string; video: string }) {
  const { ref, near } = useNear();
  return <div ref={ref} style={{ position: "absolute", inset: 0 }}>
    {near ? <Film count={count} dir={dir} poster={poster} video={video} /> : <img className="film" src={poster} alt="" loading="lazy" />}
  </div>;
}
