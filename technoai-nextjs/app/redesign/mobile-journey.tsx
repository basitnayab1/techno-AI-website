"use client";

import { useEffect, useRef, useState } from "react";
import { SOLUTIONS } from "./data";
import SolutionProgress from "./solution-progress";
import { mobileSolutionSteps } from "./mobile-solution-steps";
import "./mobile-solutions.css";
import { journeyFilmPoster, journeyFilmVideo, journeyFilmWebm, journeyWebmType } from "./journey-film-assets";

function Film({ slug }: { slug: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [started, setStarted] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const phone = matchMedia("(max-width: 760px)");
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    const prepare = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || !phone.matches) return;
      setNear(true);
      prepare.disconnect();
    }, { rootMargin: "400px 0px" });
    prepare.observe(video.closest(".mobile-journey") ?? video);
    const observer = new IntersectionObserver(([entry]) => {
      const on = entry.isIntersecting && phone.matches && !still.matches;
      setVisible(on);
      if (on) setStarted(true);
    }, { threshold: .15 });
    const sync = () => {
      observer.disconnect();
      setVisible(false);
      if (phone.matches && !still.matches) observer.observe(video);
    };
    sync();
    phone.addEventListener("change", sync);
    still.addEventListener("change", sync);
    return () => { prepare.disconnect(); observer.disconnect(); phone.removeEventListener("change", sync); still.removeEventListener("change", sync); };
  }, [slug]);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const sync = () => {
      if (started && visible && !document.hidden) video.play().catch(() => {});
      else video.pause();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    document.addEventListener("pointerdown", sync, { passive: true });
    return () => { video.pause(); document.removeEventListener("visibilitychange", sync); document.removeEventListener("pointerdown", sync); };
  }, [started, visible]);
  return <video ref={ref} autoPlay={visible} muted playsInline loop preload="metadata" disablePictureInPicture
    onCanPlay={() => {
      if (visible && !document.hidden) ref.current?.play().catch(() => {});
    }}
    poster={near ? journeyFilmPoster(slug) : undefined}>
    {started && <FilmSources slug={slug} />}
  </video>;
}

function FilmSources({ slug }: { slug: string }) {
  const webm = journeyFilmWebm(slug);
  return <>
    {webm && <source src={webm} type={journeyWebmType} />}
    <source src={journeyFilmVideo(slug)} type="video/mp4" />
  </>;
}

export default function MobileJourney() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => ref.current ? mobileSolutionSteps(ref.current) : undefined, []);
  const films = SOLUTIONS.slice(2);
  return <section ref={ref} className="mobile-journey" aria-label="More technology solutions"
    style={{ "--film-intervals": films.length - 1 } as React.CSSProperties}>
    <div className="mj-stage">
      {films.map((s, i) => <article className="mj-panel" data-solution={s.slug} key={s.slug}>
        <div className="mj-head"><span className="mj-brand"><i className="mj-chip" aria-hidden="true">//:</i>TechnoAi Solutions</span><span>0{i + 3} / {String(SOLUTIONS.length).padStart(2, "0")}</span></div>
        <div className="solution-intro">
          <h2>{s.title}</h2>
          <p>{s.text}</p>
        </div>
        <div className="solution-visual"><Film slug={s.slug} /></div>
        <SolutionProgress index={i + 2} />
        <a className="solution-link" href={s.href} aria-label={`Explore ${s.title}`}>Explore Solution <span aria-hidden="true">→</span></a>
      </article>)}
    </div>
  </section>;
}
