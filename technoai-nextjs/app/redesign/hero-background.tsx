"use client";

import { useEffect, useState } from "react";

export default function HeroBackground() {
  const [play, setPlay] = useState(false);

  // Show the small poster immediately; start the decorative video after the opener.
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce), (max-width: 640px)").matches) return;
    const hero = document.querySelector(".hx-hero");
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => setPlay(entry.isIntersecting));
    const timer = window.setTimeout(() => observer.observe(hero), 2200);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, []);

  return <>
    <img className="hx-bg-video" src="/redesign/landing/hero-poster.jpg" alt="" fetchPriority="high" />
    {play && <video className="hx-bg-video" autoPlay muted loop playsInline preload="none" poster="/redesign/landing/hero-poster.jpg">
      <source src="/redesign/landing/hero-bg.mp4" type="video/mp4" />
    </video>}
  </>;
}
