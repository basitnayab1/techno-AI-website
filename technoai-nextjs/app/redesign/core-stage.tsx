"use client";

import { isIPhone } from "./iphone";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./reduced-motion";
import "./hero-robot.css";

const CoreScene = dynamic(() => import("./core-scene"), {
  ssr: false,
  // The server-rendered poster also covers this loading state.
  loading: () => null,
});

function hasWebGL() {
  // Cheap check only: creating a test WebGL context cost ~0.9 s on the first load. If the real
  // context fails, CoreScene's onFail switches to the CSS fallback anyway.
  return typeof window !== "undefined" && !!(window.WebGL2RenderingContext || window.WebGLRenderingContext);
}

const LABELS: [string, string][] = [
  ["ai", "AI Systems"],
  ["robotics", "Robotics"],
  ["edge", "Edge Computing"],
];

export default function CoreStage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const [mode, setMode] = useState<"wait" | "gl" | "fallback">("wait");
  // Phones: compiling the hero shaders froze the main thread for seconds (iPhone Safari has no
  // parallel shader compile), which kept the dark opening on screen. On touch screens the poster
  // (same picture as the 3D core) is the opening frame and the live 3D starts once the opening
  // has finished; it fades in over the poster when ready. Desktop is unchanged.
  const [phoneWait, setPhoneWait] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    if (!matchMedia("(hover: none) and (pointer: coarse)").matches || root.dataset.openingReady === "true") return;
    setPhoneWait(true);
    const go = () => setPhoneWait(false);
    window.addEventListener("technoai:opening-ready", go, { once: true });
    return () => window.removeEventListener("technoai:opening-ready", go);
  }, []);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || still || phoneWait || mode !== "wait") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setMode(hasWebGL() ? "gl" : "fallback");
      observer.disconnect();
    }, { rootMargin: "150px" });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [still, mode, phoneWait]);
  const fail = useCallback(() => setMode("fallback"), []);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => { if (still) setReady(false); }, [still]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!isIPhone || !stage || mode !== "gl") return;
    let timer = 0;
    const observer = new IntersectionObserver(([entry]) => {
      clearTimeout(timer);
      if (!entry.isIntersecting) timer = window.setTimeout(() => {
        setReady(false);
        setMode("wait");
      }, 5000);
    }, {rootMargin: "450px 0px"});
    observer.observe(stage);
    stage.addEventListener("webglcontextlost", fail, true);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      stage.removeEventListener("webglcontextlost", fail, true);
    };
  }, [mode, fail]);
  const live = !still && mode === "gl";
  useEffect(() => {
    if (!live || ready) return;
    // Some drivers never return from shader initialization. The poster is the
    // finished scene for this visit if the visible canvas cannot start.
    // Phones get longer: iPhone Safari compiles slowly and the poster covers the wait anyway.
    const timer = window.setTimeout(fail, matchMedia("(hover: none) and (pointer: coarse)").matches ? 20000 : 10000);
    return () => clearTimeout(timer);
  }, [live, ready, fail]);

  return (
    <div ref={stageRef} className="hx-stage" data-mode={still ? "fallback" : mode} data-ready={(live && ready) || undefined}
      data-opening-scene-ready={(phoneWait || mode === "fallback" || (live && ready)) || undefined}>
      <picture className="hx-core-poster" aria-hidden="true">
        <source media="(max-width: 760px)" srcSet="/redesign/hero/core-mobile.webp" width="390" height="421" />
        <img src="/redesign/hero/core-desktop.webp" width="736" height="684" alt="" fetchPriority="high" />
      </picture>
      {live && <CoreScene onFail={fail} onReady={onReady} />}
      <span className="hx-robot-greeting" aria-hidden="true">Hello!</span>
      {LABELS.map(([k, text]) => (
        <p className={`hx-label hx-label-${k}`} data-label={k} key={k}>
          <span>{text}</span>
          <i className="hx-label-dot" />
        </p>
      ))}
    </div>
  );
}
