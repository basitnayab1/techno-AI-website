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
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => frame.current?.contentWindow?.postMessage(e.isIntersecting ? "spline:play" : "spline:stop", window.location.origin));
    io.observe(el);
    const onMsg = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data === "spline:ready" && e.source === frame.current?.contentWindow) setReady(true);
    };
    window.addEventListener("message", onMsg);
    return () => {
      io.disconnect();
      window.removeEventListener("message", onMsg);
    };
  }, []);
  return (
    <div ref={wrap} className={`cx-spline${ready ? " is-ready" : ""}`}>
      <iframe ref={frame} src="/redesign/spline-frame/?fit=card" title="Interactive 3D robot" loading="lazy" />
    </div>
  );
}
