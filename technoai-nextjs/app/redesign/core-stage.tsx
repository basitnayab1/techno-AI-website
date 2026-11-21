"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [mode, setMode] = useState<"wait" | "gl" | "fallback">("wait");
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setMode(hasWebGL() ? "gl" : "fallback");
      observer.disconnect();
    }, { rootMargin: "150px" });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);
  const fail = useCallback(() => setMode("fallback"), []);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  return (
    <div ref={stageRef} className="hx-stage" data-mode={mode} data-ready={(mode === "gl" && ready) || undefined}>
      <picture className="hx-core-poster" aria-hidden="true">
        <source media="(max-width: 760px)" srcSet="/redesign/hero/core-mobile.webp" width="390" height="421" />
        <img src="/redesign/hero/core-desktop.webp" width="736" height="684" alt="" fetchPriority="high" />
      </picture>
      {mode === "gl" && <CoreScene onFail={fail} onReady={onReady} />}
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
