"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

/** CSS-only version of the core, shown while three.js loads and when WebGL is not available. */
function CoreFallback() {
  return (
    <div className="hx-fallback" aria-hidden="true">
      <div className="hx-fb-orb">
        <span className="hx-fb-core" />
        <span className="hx-fb-ring" />
        <span className="hx-fb-ring hx-fb-ring2" />
      </div>
      <div className="hx-fb-base" />
    </div>
  );
}

// three.js + the scene are loaded only on the client, after the page is interactive.
const CoreScene = dynamic(() => import("./core-scene"), { ssr: false, loading: () => <CoreFallback /> });

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const LABELS: [string, string][] = [
  ["ai", "AI Systems"],
  ["robotics", "Robotics"],
  ["edge", "Edge Computing"],
];

export default function CoreStage() {
  const [mode, setMode] = useState<"wait" | "gl" | "fallback">("wait");
  useEffect(() => setMode(hasWebGL() ? "gl" : "fallback"), []);
  const fail = useCallback(() => setMode("fallback"), []);

  return (
    <div className="hx-stage" data-mode={mode}>
      {mode === "gl" ? <CoreScene onFail={fail} /> : <CoreFallback />}
      {LABELS.map(([k, text]) => (
        <p className={`hx-label hx-label-${k}`} data-label={k} key={k}>
          <span>{text}</span>
          <i className="hx-label-dot" />
        </p>
      ))}
    </div>
  );
}
