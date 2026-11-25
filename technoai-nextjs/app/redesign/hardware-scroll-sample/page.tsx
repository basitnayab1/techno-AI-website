"use client";

import { useEffect, useRef, useState } from "react";
import HeroNav from "../hero-nav";
import SplineStage from "../spline-stage";
import SplineCard from "../spline-card";
import DotField from "../dot-field";
import { useReducedMotion } from "../reduced-motion";
import "../hero.css";
import "../section-robot.css";
import "./sample.css";

const chapters = [
  { title: "Robotics & Automation", text: "Intelligent robots for service, cleaning, delivery, and industrial operations, built to support your teams and simplify everyday work.", link: "Explore Robotics Solutions", href: "/robotics/" },
  { title: "NVIDIA Jetson Thor", text: "Accelerated computing for intelligent machines, robotics, and AI at the edge.", link: "Explore AI Hardware", href: "/all-products/" },
  { title: "Seeed Studio XIAO", text: "Compact development boards for connected devices, embedded intelligence, and your next prototype.", link: "Explore XIAO Boards", href: "/seeed-studio-xiao/" },
  { title: "Raspberry Pi", text: "Flexible computing platforms for prototyping, automation, and connected applications.", link: "Explore Raspberry Pi", href: "/raspberry-pi/" },
  { title: "AI Hardware & Edge Computing", text: "From intelligent machines to connected devices, find the hardware that brings your ideas into the real world.", link: "Explore AI Hardware", href: "/all-products/" },
];

export default function HardwareScrollSample() {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [chapter, setChapter] = useState(0);
  const [near, setNear] = useState(false);
  const still = useReducedMotion();

  useEffect(() => {
    // Reuse the existing shared robot after this standalone sample has mounted.
    document.documentElement.classList.add("loaded");
    document.documentElement.dataset.openingReady = "true";
    window.dispatchEvent(new Event("technoai:opening-ready"));
  }, []);

  useEffect(() => {
    const section = root.current;
    const media = video.current;
    if (!section || !media) return;
    let top = 0;
    let frame = 0;
    let target = 0;
    let visible = false;
    const seek = () => {
      if (still || document.hidden || !visible || media.seeking || !Number.isFinite(media.duration)) return;
      if (Math.abs(media.currentTime - target) > 1 / 48) media.currentTime = target;
    };
    const update = () => {
      frame = 0;
      if (!visible) return;
      const screens = Math.max(0, (scrollY - top) / innerHeight);
      const progress = Math.max(0, Math.min(1, (screens - 3) / 4));
      const time = progress * (Number.isFinite(media.duration) ? media.duration - .08 : 9.92);
      target = time;
      const next = still ? 4 : screens < 3 ? 0 : time < 1.8 ? 1 : time < 3.8 ? 2 : time < 6.5 ? 3 : 4;
      setChapter(previous => previous === next ? previous : next);
      seek();
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const measure = () => { top = section.getBoundingClientRect().top + scrollY; schedule(); };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) setNear(true);
      schedule();
    }, { rootMargin: "500px 0px" });
    observer.observe(section);
    const resize = new ResizeObserver(measure);
    resize.observe(section);
    media.addEventListener("loadedmetadata", schedule);
    media.addEventListener("seeked", seek);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    document.addEventListener("visibilitychange", schedule);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect(); resize.disconnect(); media.pause();
      media.removeEventListener("loadedmetadata", schedule);
      media.removeEventListener("seeked", seek);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [still]);

  const copy = chapters[chapter];
  return <>
    <HeroNav />
    <SplineStage />
    <main className="hardware-sample">
      <section id="robotics" ref={root} data-step={chapter === 0 ? "0" : "1"}>
        <div className="hs-pin">
          <DotField />
          <div className="hs-layout">
            <div className="hs-copy">
              <p className="hs-eyebrow"><span aria-hidden="true">//:</span>Intelligence in motion</p>
              <h1 key={copy.title}>{copy.title}</h1>
              <p className="hs-description">{copy.text}</p>
              <a className="hs-button" href={copy.href}>{copy.link}<span aria-hidden="true">→</span></a>
              <ol className="hs-chapters" aria-label="Hardware showcase">
                {chapters.map((item, index) => <li key={item.title} aria-current={chapter === index ? "step" : undefined}>{index === 0 ? "Robot showcase" : item.title}</li>)}
              </ol>
            </div>
            <div className="hs-visual">
              <div className="section-robot" style={{ display: chapter === 0 ? "block" : "none" }}><SplineCard /></div>
              <div className="hs-film" style={{ visibility: chapter === 0 ? "hidden" : "visible" }}>
                <video ref={video} src={near && !still ? "/redesign/samples/hardware-scroll.mp4" : undefined}
                  poster={still ? "/redesign/samples/hardware-all.webp" : "/redesign/samples/hardware-scroll.webp"} muted playsInline preload="metadata"
                  disablePictureInPicture aria-label="NVIDIA Jetson Thor, XIAO boards and Raspberry Pi hardware showcase" />
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="hs-end"><a href="/">Back to TechnoAI <span aria-hidden="true">→</span></a></div>
    </main>
  </>;
}
