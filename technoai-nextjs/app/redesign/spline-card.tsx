"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The owner's Spline robot inside the Section 02 "Robotics & automation" card. Runs in an iframe
 * (/redesign/spline-frame/?fit=card) because the Spline runtime ships its own three.js. Paused while the card is
 * off screen; fades in when the scene has loaded. It follows the mouse while the pointer is over it.
 */
export default function SplineCard() {
  const wrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [near, setNear] = useState(false);
  const visible = useRef(false);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const preload = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setNear(true); preload.disconnect(); }
    }, { rootMargin: "150px" });
    preload.observe(el);
    const io = new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting;
      frame.current?.contentWindow?.postMessage(e.isIntersecting ? "spline:play" : "spline:stop", window.location.origin);
    });
    io.observe(el);
    const onMsg = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data === "spline:ready" && e.source === frame.current?.contentWindow) {
        setReady(true);
        frame.current?.contentWindow?.postMessage(visible.current ? "spline:play" : "spline:stop", window.location.origin);
      }
    };
    window.addEventListener("message", onMsg);
    return () => {
      io.disconnect();
      preload.disconnect();
      window.removeEventListener("message", onMsg);
    };
  }, []);
  return (
    <div ref={wrap} className={`cx-spline${ready ? " is-ready" : ""}`}>
      {near && <iframe ref={frame} src="/redesign/spline-frame/?fit=card" title="Interactive 3D robot" loading="eager" />}
    </div>
  );
}
