"use client";

import { useEffect, useRef, useState } from "react";
import { SOLUTIONS } from "./data";

export function hasJourneyFilm(slug: string) {
  return ["industry", "satellite", "security", "financial"].includes(slug);
}

export default function JourneyFilms() {
  const root = useRef<HTMLDivElement>(null);
  const [film, setFilm] = useState("");
  useEffect(() => {
    const section = root.current?.closest<HTMLElement>(".journey");
    if (!section) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const stations = Array.from(section.querySelectorAll<HTMLElement>(".station"));
    let accessKey = "";
    const syncAccess = (index: number) => {
      const key = motion.matches ? "all" : String(index);
      if (key === accessKey) return;
      accessKey = key;
      for (const station of stations) {
        const inactive = !motion.matches && Number(station.dataset.i) !== index;
        if (inactive && station.contains(document.activeElement)) {
          stations[index]?.querySelector<HTMLElement>("a[href]")?.focus({ preventScroll: true });
        }
        station.inert = inactive;
        station.setAttribute("aria-hidden", String(inactive));
      }
    };
    syncAccess(Number(section.dataset.active || 0));
    let top = 0, height = 0, visible = false;
    const update = () => {
      if (motion.matches) { syncAccess(0); setFilm(""); return; }
      if (!visible || document.hidden) { setFilm(""); return; }
      const progress = Math.max(0, (window.scrollY - top) / Math.max(1, height - innerHeight));
      const index = Math.min(SOLUTIONS.length - 1, Math.floor(progress * SOLUTIONS.length));
      const slug = SOLUTIONS[index].slug;
      // Keep station navigation working even on devices without WebGL.
      if (section.dataset.active !== String(index)) section.dataset.active = String(index);
      syncAccess(index);
      setFilm(hasJourneyFilm(slug) ? slug : "");
    };
    const measure = () => {
      const rect = section.getBoundingClientRect();
      top = rect.top + scrollY;
      height = rect.height;
      update();
    };
    const size = new ResizeObserver(measure);
    size.observe(document.body);
    size.observe(section);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; measure(); });
    observer.observe(section);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", measure);
    document.addEventListener("visibilitychange", update);
    motion.addEventListener("change", update);
    return () => {
      size.disconnect(); observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", update);
      motion.removeEventListener("change", update);
      stations.forEach(station => { station.inert = false; station.removeAttribute("aria-hidden"); });
    };
  }, []);
  return <div className="jx-films" ref={root} aria-hidden="true">
    {film && <video key={film} muted playsInline loop autoPlay disablePictureInPicture
      poster={`/redesign/journey/films/${film}.webp`} src={`/redesign/journey/films/${film}-1080.mp4`} />}
  </div>;
}
