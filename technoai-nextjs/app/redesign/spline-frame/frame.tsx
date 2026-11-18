"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";

// Same crop/scale as the owner's snippet: the scene is laid out at 1440x900, 15 % cropped, scaled to the frame width.
const BASE_WIDTH = 1440;
const BASE_HEIGHT = 900;
const CROP_PERCENT = 15;
const SIZE_MULTIPLIER = 0.85;
const SCENE = "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";

type SplineApp = { play?: () => void; stop?: () => void };
type SplineProps = { scene: string; onLoad?: (app: SplineApp) => void };

export default function Frame() {
  const outerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<SplineApp | null>(null);
  const [scale, setScale] = useState(1);
  // ?fit=card → small card view: zoom on the robot's upper body, centred (Section 02 "Robotics" card)
  const [card, setCard] = useState(false); // read after mount (no server/client mismatch)
  const [box, setBox] = useState({ w: 300, h: 250 });
  const [Spline, setSpline] = useState<ComponentType<SplineProps> | null>(null);

  useEffect(() => {
    setCard(new URLSearchParams(window.location.search).get("fit") === "card");
  }, []);

  useEffect(() => {
    let alive = true;
    import("@splinetool/react-spline").then((mod) => {
      if (alive) setSpline(() => mod.default as unknown as ComponentType<SplineProps>);
    });
    // the parent page pauses/resumes the scene when its section leaves/enters the screen
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data === "spline:stop") appRef.current?.stop?.();
      if (e.data === "spline:play") appRef.current?.play?.();
    };
    window.addEventListener("message", onMsg);
    return () => {
      alive = false;
      window.removeEventListener("message", onMsg);
    };
  }, []);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = (width: number, height: number) => {
      setScale((width / BASE_WIDTH) * SIZE_MULTIPLIER);
      setBox({ w: width, h: height });
    };
    update(el.offsetWidth, el.offsetHeight);
    const ro = new ResizeObserver((entries) => entries.forEach((en) => update(en.contentRect.width, en.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cropHeight = BASE_HEIGHT * (1 - CROP_PERCENT / 100);
  const spline = Spline && (
    <Spline
      scene={SCENE}
      onLoad={(app) => {
        appRef.current = app;
        window.parent?.postMessage("spline:ready", window.location.origin);
      }}
    />
  );
  if (card) {
    // scene point (720, 560) = the robot's chest, kept in the middle of the card
    const s = (box.h / BASE_HEIGHT) * 1.05;
    return (
      <div ref={outerRef} style={{ width: "100%", height: "100vh", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", left: box.w / 2 - 720 * s, top: box.h / 2 - 560 * s, width: BASE_WIDTH, height: BASE_HEIGHT, transform: `scale(${s})`, transformOrigin: "0 0" }}>
          {spline}
        </div>
      </div>
    );
  }
  return (
    <div ref={outerRef} style={{ width: "100%", height: "100vh", overflow: "hidden", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          width: BASE_WIDTH,
          height: cropHeight,
          overflow: "hidden",
          transform: `translateX(-50%) scale(${scale})`,
          transformOrigin: "bottom center",
        }}
      >
        <div style={{ width: BASE_WIDTH, height: BASE_HEIGHT, transform: `translateY(-${CROP_PERCENT / 2}%)` }}>
          {spline}
        </div>
      </div>
    </div>
  );
}
