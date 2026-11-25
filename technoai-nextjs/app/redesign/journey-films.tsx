"use client";

import { useEffect, useRef, useState } from "react";
import { SOLUTIONS } from "./data";
import "./solution-zoom.css";
import { journeyFilmPoster, journeyFilmVideo, journeyFilmWebm, journeyWebmType } from "./journey-film-assets";

export function hasJourneyFilm(slug: string) {
  return ["industry", "satellite", "security", "financial"].includes(slug);
}

export default function JourneyFilms() {
  const root = useRef<HTMLDivElement>(null);
  const [films, setFilms] = useState({ current: "", previous: "" });
  useEffect(() => {
    root.current?.querySelectorAll<HTMLVideoElement>("video").forEach(video => {
      if (video.dataset.slug === films.current) video.play().catch(() => {});
      else video.pause();
    });
  }, [films]);
  useEffect(() => {
    const section = root.current?.closest<HTMLElement>(".journey");
    if (!section) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const phone = matchMedia("(max-width: 760px)");
    const stations = Array.from(section.querySelectorAll<HTMLElement>(".station"));
    const copy = section.querySelector<HTMLElement>(".stations")!;
    let shown = Number(section.dataset.active || 0);
    let wanted = shown;
    let animation: Animation | undefined;
    let fadingOut = false;
    let accessKey = "";
    const syncAccess = (index: number) => {
      const key = motion.matches ? "all" : String(index);
      if (key === accessKey) return;
      accessKey = key;
      const moveFocus = stations.some(station => station !== stations[index] && station.contains(document.activeElement));
      for (const station of stations) {
        const inactive = !motion.matches && Number(station.dataset.i) !== index;
        station.inert = inactive;
        station.setAttribute("aria-hidden", String(inactive));
      }
      if (moveFocus && !motion.matches) stations[index]?.querySelector<HTMLElement>("a[href]")?.focus({ preventScroll: true });
    };
    syncAccess(shown);
    function settleCopy(index: number) {
      animation?.cancel();
      animation = undefined;
      fadingOut = false;
      shown = wanted = index;
      syncAccess(index);
    }
    function selectCopy(index: number) {
      wanted = index;
      if (fadingOut || shown === index) return;
      const opacity = getComputedStyle(copy).opacity;
      animation?.cancel();
      fadingOut = true;
      animation = copy.animate([{ opacity }, { opacity: 0 }], { duration: 250, fill: "both" });
      animation.onfinish = () => {
        settleCopy(wanted);
        animation = copy.animate([{ opacity: 0, translate: "0 12px" }, { opacity: 1, translate: "0 0" }],
          { duration: 350, easing: "ease-out" });
      };
    }
    const layers = Array.from(root.current?.querySelectorAll<HTMLElement>(".jx-film") || []);
    const selectFilm = (current: string) => setFilms(old => old.current === current ? old : {
      current, previous: current ? old.current : "",
    });
    let top = 0, height = 0, visible = false, frame = 0;
    let easedProgress: number | null = null;
    let lastTime = 0;
    let activeIndex = -1;
    const update = () => {
      frame = 0;
      if (motion.matches) { settleCopy(0); selectFilm(""); return; }
      if (!visible || document.hidden) { settleCopy(wanted); selectFilm(""); return; }
      const target = Math.max(0, Math.min(1, (window.scrollY - top) / Math.max(1, height - innerHeight)));
      const now = performance.now();
      const dt = Math.min(64, now - (lastTime || now - 16));
      lastTime = now;
      easedProgress = easedProgress === null ? target : easedProgress + (target - easedProgress) * (1 - Math.exp(-dt / 90));
      if (Math.abs(target - easedProgress) < .00005) easedProgress = target;
      const progress = easedProgress;
      const count = phone.matches ? 2 : SOLUTIONS.length;
      // A small dead band prevents trackpad noise from flipping two stations repeatedly.
      const position = progress * count;
      if (activeIndex < 0) activeIndex = Math.min(count - 1, Math.floor(position));
      else if (position > activeIndex + 1.025 || position < activeIndex - .025)
        activeIndex = Math.max(0, Math.min(count - 1, Math.floor(position)));
      const index = activeIndex;
      const slug = SOLUTIONS[index].slug;
      // Only composited transforms change during scroll; geometry is cached by measure().
      for (const layer of layers) {
        const i = Number(layer.dataset.i);
        const local = Math.max(0, Math.min(1, progress * count - i));
        const zoom = SOLUTIONS[i].slug === "security" ? .22 : .2;
        layer.style.setProperty("--solution-zoom", (1 + local * zoom).toFixed(4));
        layer.style.setProperty("--jx-pan", `${(1 - local * 2).toFixed(3)}%`);
        layer.style.setProperty("--jx-zoom", (1.05 - local * .02).toFixed(4));
        stations[i]?.style.setProperty("--jx-copy-y", `${(6 - local * 12).toFixed(2)}px`);
      }
      // Keep station navigation working even on devices without WebGL.
      if (section.dataset.active !== String(index)) section.dataset.active = String(index);
      syncAccess(shown);
      selectCopy(index);
      selectFilm(hasJourneyFilm(slug) ? slug : "");
      if (easedProgress !== target) frame = requestAnimationFrame(update);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const measure = () => {
      const rect = section.getBoundingClientRect();
      top = rect.top + scrollY;
      height = rect.height;
      schedule();
    };
    const size = new ResizeObserver(measure);
    size.observe(document.body);
    size.observe(section);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; measure(); });
    observer.observe(section);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    document.addEventListener("visibilitychange", schedule);
    motion.addEventListener("change", schedule);
    return () => {
      size.disconnect(); observer.disconnect();
      animation?.cancel();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", schedule);
      motion.removeEventListener("change", schedule);
      stations.forEach(station => { station.inert = false; station.removeAttribute("aria-hidden"); station.style.removeProperty("--jx-copy-y"); });
    };
  }, []);
  return <div className="jx-films" ref={root} aria-hidden="true">
    {SOLUTIONS.map(({ slug }, i) => hasJourneyFilm(slug) && <div className="jx-film" data-i={i} data-slug={slug} key={slug}>
      <div className="jx-film-media">
        <img src={journeyFilmPoster(slug)} alt="" loading="lazy" decoding="async" />
        {(films.current === slug || films.previous === slug) && <video data-slug={slug} muted playsInline loop autoPlay disablePictureInPicture
          preload="metadata" style={{ opacity: 0, transition: "opacity .25s ease" }}
          onPlaying={event => { event.currentTarget.style.opacity = "1"; }}
          poster={journeyFilmPoster(slug)}>
          {slug === "satellite" && <source media="(min-width: 1921px)" src={journeyFilmVideo(slug, "4k")} type="video/mp4" />}
          {slug === "financial" && <source media="(min-width: 761px)" src={journeyFilmVideo(slug, "4k")} type="video/mp4" />}
          {slug === "security" && <source media="(min-width: 761px)" src={journeyFilmVideo(slug, "2k", "webm")} type={journeyWebmType} />}
          {journeyFilmWebm(slug) && <source src={journeyFilmWebm(slug)} type={journeyWebmType} />}
          <source src={journeyFilmVideo(slug)} type="video/mp4" />
        </video>}
      </div>
    </div>)}
  </div>;
}
