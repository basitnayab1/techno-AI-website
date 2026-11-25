"use client";

import { useEffect, useState } from "react";
import { IS_IOS } from "./heavy-queue";

/**
 * Timing overlay for real-device checks (2026-11-25). Open the home page with ?perf=1 and take a
 * screenshot: it lists when the opening, hero 3D, robot and other 3D scenes became ready, and every
 * freeze (a gap between two frames longer than 250 ms). Nothing runs without ?perf=1.
 */
export default function PerfOverlay() {
  const [lines, setLines] = useState<string[] | null>(null);

  useEffect(() => {
    if (!/[?&]perf=1\b/.test(location.search)) return;
    const t = () => (performance.now() / 1000).toFixed(1) + "s";
    const events: string[] = [];
    const freezes: { at: number; ms: number }[] = [];
    let maxGap = 0;
    let frozen = 0;
    const note = (text: string) => { events.push(`${t()}  ${text}`); };

    note("script start");
    addEventListener("technoai:opening-ready", () => note("loader gone"), { once: true });
    addEventListener("technoai:robot-warm", () => note("Spline robot ready"), { once: true });
    const stage = document.querySelector<HTMLElement>(".hx-stage");
    const seen = new Set<string>();
    const watch = new MutationObserver(() => {
      if (stage?.dataset.ready === "true" && !seen.has("hero")) { seen.add("hero"); note("hero 3D live"); }
      if (stage?.dataset.mode === "fallback" && !seen.has("fb")) { seen.add("fb"); note("hero 3D FAILED -> poster"); }
      const canvases = document.querySelectorAll("canvas").length;
      if (!seen.has("c" + canvases)) { seen.add("c" + canvases); note(`canvases: ${canvases}`); }
    });
    if (stage) watch.observe(stage, { attributes: true });
    watch.observe(document.body, { childList: true, subtree: true });

    let last = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const gap = now - last;
      last = now;
      if (gap > 250 && !document.hidden) {
        freezes.push({ at: now / 1000, ms: Math.round(gap) });
        frozen += gap;
      }
      maxGap = Math.max(maxGap, gap);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const render = setInterval(() => {
      setLines([
        `iOS: ${IS_IOS}  now ${t()}  scrollY ${Math.round(scrollY)}`,
        `freezes >250ms: ${freezes.length}  total ${(frozen / 1000).toFixed(1)}s  longest ${(maxGap / 1000).toFixed(1)}s`,
        ...events.slice(-12),
        ...freezes.slice(-6).map((f) => `freeze ${(f.ms / 1000).toFixed(1)}s ending ${f.at.toFixed(1)}s`),
      ]);
    }, 500);
    return () => { cancelAnimationFrame(raf); clearInterval(render); watch.disconnect(); };
  }, []);

  if (!lines) return null;
  return (
    <pre style={{
      position: "fixed", left: 6, bottom: 70, zIndex: 2147483646, maxWidth: "calc(100vw - 12px)",
      margin: 0, padding: "6px 8px", font: "10px/1.35 ui-monospace, Menlo, monospace", color: "#9fe7e7",
      background: "rgba(0,0,0,.82)", border: "1px solid #146b8c", borderRadius: 6, whiteSpace: "pre-wrap",
      pointerEvents: "none",
    }}>{lines.join("\n")}</pre>
  );
}
