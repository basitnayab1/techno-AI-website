"use client";

import { isIPhone } from "../iphone";

import { Component, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Spline from "@splinetool/react-spline";
import type { Application } from "@splinetool/runtime";
import { createCardIdle } from "./card-idle";

// Preserve the owner's 16:10 composition/crop with a smaller drawing buffer.
// CSS applies the same final size; the GPU renders 56% fewer pixels.
const BASE_WIDTH = 960;
const BASE_HEIGHT = 600;
const CROP_PERCENT = 15;
const SIZE_MULTIPLIER = 0.85;
const SCENE = "/redesign/spline/robot-13bd456a.splinecode";

// Contain a failed WebGL context without interrupting the rest of the site.
class RobotBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function Frame() {
  const outerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const [cardIdle] = useState(createCardIdle);
  const [showcase, setShowcase] = useState(false);
  const [showcaseReady, setShowcaseReady] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [idleCard, setIdleCard] = useState(false);
  const [scale, setScale] = useState(1);
  const [pixelRatio, setPixelRatio] = useState(() => isIPhone ? window.devicePixelRatio || 1 : 1);
  // ?fit=card Ã¢â€ â€™ small card view: zoom on the robot's upper body, centred (Section 02 "Robotics" card)
  const [cardWidth, setCardWidth] = useState<number | null>(null);
  const card = cardWidth !== null;
  const [box, setBox] = useState({ w: 300, h: 250 });
  const readyFrame = useRef(0);
  const sizeFrame = useRef(0);
  const playing = useRef(true);
  const resumeFraming = useRef<() => void>(() => {});
  const loaded = useRef(false);

  useEffect(() => {
    // This same-origin frame is narrower than the page that chooses its layout.
    const query = (window.frameElement?.ownerDocument.defaultView ?? window).matchMedia("(min-width: 901px)");
    const sync = () => setDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("fit") === "card") {
      cardIdle.setCard(true);
      // Both placements use the same GPU surface. Resizing its CSS crop should
      // never rebuild the render targets while the page is moving.
      setCardWidth(Math.min(704, Math.max(400, window.screen.width)));
    }
  }, []);

  useEffect(() => {
    // the parent page pauses/resumes the scene when its section leaves/enters the screen
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      if (typeof e.data === "string" && e.data.startsWith("spline:placement:")) {
        setIdleCard(e.data === "spline:placement:card");
        cardIdle.setCard(e.data === "spline:placement:card");
      }
      if (e.data === "spline:placement:showcase") setShowcase(true);
      if (e.data === "spline:placement:card" || e.data === "spline:placement:section") setShowcase(false);
      if (e.data === "spline:stop") { playing.current = false; appRef.current?.stop?.(); cardIdle.setPlaying(false); }
      if (e.data === "spline:play") { playing.current = true; appRef.current?.play?.(); cardIdle.setPlaying(true); resumeFraming.current(); }
      if (e.data === "spline:status" && loaded.current) window.parent.postMessage("spline:ready", location.origin);
      if (e.data?.type === "spline:pointer" && loaded.current && Number.isFinite(e.data.x) && Number.isFinite(e.data.y)) {
        const canvas = outerRef.current?.querySelector("canvas");
        if (!canvas) return;
        const point = { clientX: e.data.x, clientY: e.data.y, bubbles: true };
        canvas.dispatchEvent(new PointerEvent("pointermove", { ...point, pointerType: "mouse", isPrimary: true }));
        appRef.current?.requestRender?.();
      }
    };
    window.addEventListener("message", onMsg);
    let nativePointer: { x: number; y: number } | null = null;
    const onNativePointer = (event: PointerEvent) => {
      if (!event.isTrusted || event.pointerType !== "mouse") return;
      // Moving the iframe under a stationary cursor is not a new mouse gesture.
      if (nativePointer && nativePointer.x === event.screenX && nativePointer.y === event.screenY) {
        event.stopImmediatePropagation();
        return;
      }
      nativePointer = { x: event.screenX, y: event.screenY };
    };
    window.addEventListener("pointermove", onNativePointer, { capture: true, passive: true });
    // This embedded scene must not swallow the page's wheel gestures.
    const onWheel = (event: WheelEvent) => {
      if (window.parent === window || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      window.parent.postMessage({ type: "spline:wheel", deltaX: event.deltaX, deltaY: event.deltaY, deltaMode: event.deltaMode }, window.location.origin);
    };
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      cardIdle.dispose();
      cancelAnimationFrame(readyFrame.current);
      cancelAnimationFrame(sizeFrame.current);
      window.removeEventListener("message", onMsg);
      window.removeEventListener("pointermove", onNativePointer, true);
      window.removeEventListener("wheel", onWheel, true);
    };
  }, []);

  // Pointer height represents depth on the floor: lower is closer to the viewer.
  useEffect(() => {
    const stage = outerRef.current;
    if (!stage || !showcase) return;
    const motion = matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    const follow = (event: PointerEvent) => {
      if (!playing.current || event.pointerType !== "mouse" || !motion.matches) return;
      const axis = (position: number, size: number) => Math.max(-1, Math.min(1, 2 * position / Math.max(1, size) - 1));
      const x = axis(event.clientX, innerWidth);
      const depth = axis(event.clientY, innerHeight);
      stage.style.setProperty("--follow-x", x * 4 + "%");
      stage.style.setProperty("--follow-scale", String(1 + depth * 0.08));
    };
    const reset = () => {
      stage.style.removeProperty("--follow-x");
      stage.style.removeProperty("--follow-scale");
    };
    window.addEventListener("pointermove", follow);
    motion.addEventListener("change", reset);
    return () => {
      window.removeEventListener("pointermove", follow);
      motion.removeEventListener("change", reset);
      reset();
    };
  }, [showcase]);

  useLayoutEffect(() => {
    if (!showcase) return;
    const app = appRef.current;
    const bot = app?.findObjectByName("Bot");
    if (!app || !bot) return;
    // Keep the feet and head inside the final full-body camera shot.
    const scale = { x: bot.scale.x, y: bot.scale.y, z: bot.scale.z };
    const originalY = bot.position.y;
    const showcaseScale = 0.62;
    bot.scale.x = scale.x * showcaseScale;
    bot.scale.y = scale.y * showcaseScale;
    bot.scale.z = scale.z * showcaseScale;
    bot.position.y = originalY + 120;
    app.requestRender();
    return () => {
      Object.assign(bot.scale, scale);
      bot.position.y = originalY;
      app.requestRender();
    };
  }, [showcase]);

  useEffect(() => {
    if (!showcase) setShowcaseReady(false);
  }, [showcase]);

  useEffect(() => {
    // Acknowledge the crop only after React and the scene have painted the new size.
    // The shared parent keeps a stale-sized frame hidden while switching placements.
    if (!idleCard && !showcase && new URLSearchParams(location.search).get("fit") === "card") return;
    const camera = showcase || idleCard ? appRef.current?.findObjectByName("Camera 2") : undefined;
    // The authored start event moves this camera from z=360 to z=1000.
    // Keep the matching poster up while the card's close-up is still playing.
    const acknowledge = () => {
      if (camera && camera.position.z < 999.99) {
        if (playing.current) sizeFrame.current = requestAnimationFrame(acknowledge);
        return;
      }
      // Finish the camera warm-up at card resolution before allocating the HD surface.
      if (showcase && !showcaseReady) { setShowcaseReady(true); return; }
      const canvas = outerRef.current?.querySelector("canvas");
      if (canvas?.clientWidth && Math.abs(canvas.width - canvas.clientWidth * pixelRatio) > 2) {
        sizeFrame.current = requestAnimationFrame(acknowledge);
        return;
      }
      resumeFraming.current = () => {};
      appRef.current?.requestRender?.();
      sizeFrame.current = requestAnimationFrame(() => {
        window.parent.postMessage({ type: "spline:viewport-ready", width: box.w, height: box.h, showcase }, location.origin);
      });
    };
    resumeFraming.current = () => { cancelAnimationFrame(sizeFrame.current); sizeFrame.current = requestAnimationFrame(acknowledge); };
    resumeFraming.current();
    return () => cancelAnimationFrame(sizeFrame.current);
  }, [box, card, showcase, idleCard, showcaseReady, pixelRatio]);

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

  useEffect(() => {
    const outer = outerRef.current;
    if (!isIPhone || !outer) return;
    const onLoss = () => window.frameElement?.dispatchEvent(new Event("technoai:spline-context-lost", { bubbles: true }));
    outer.addEventListener("webglcontextlost", onLoss, true);
    return () => outer.removeEventListener("webglcontextlost", onLoss, true);
  }, []);

  const cropHeight = BASE_HEIGHT * (1 - CROP_PERCENT / 100);
  const spline = (
    <RobotBoundary>
      <Spline
        scene={SCENE}
        wasmPath="/redesign/spline/runtime-2.0.129"
        onLoad={(app) => {
          // Clear the scene background completely so the parent surface shows through.
          // Matching hex colours is unreliable across the canvas post-processing pipeline.
          app.setBackgroundColor("rgba(0, 0, 0, 0)");
          appRef.current = app;
          const canvas = outerRef.current?.querySelector("canvas");
          if (canvas?.clientWidth) setPixelRatio(Math.max(1, canvas.width / canvas.clientWidth));
          app.play?.();
          cardIdle.attach(app);
          app.requestRender?.();
          // Let the first canvas frame paint before the parent fades out the poster.
          readyFrame.current = requestAnimationFrame(() => {
            app.requestRender?.();
            readyFrame.current = requestAnimationFrame(() => {
              loaded.current = true;
              window.parent?.postMessage("spline:ready", window.location.origin);
            });
          });
        }}
      />
    </RobotBoundary>
  );
  // Keep one component tree when the card crop is applied: remounting Spline loaded the scene twice.
  // Match the displayed showcase resolution without changing its composition.
  // Cards/mobile retain the small buffer; desktop is capped at a 1920px surface.
  // Preserve the CSS camera crop. Budget the actual GPU surface in physical
  // pixels instead of multiplying screen.width by the iframe DPR a second time.
  const slotWidth = showcase ? Math.min(box.w, box.h * BASE_WIDTH / BASE_HEIGHT) : box.h * BASE_WIDTH / BASE_HEIGHT * 1.05;
  const baseRenderWidth = isIPhone && card
    ? Math.ceil(Math.min(960, Math.max(240, slotWidth * 1.5)) / pixelRatio)
    : cardWidth ?? BASE_WIDTH;
  const closeUp = showcase && desktop;
  const displayWidth = closeUp ? box.h * 1.48 * BASE_WIDTH / BASE_HEIGHT : Math.min(box.w, box.h * BASE_WIDTH / BASE_HEIGHT);
  const highResolution = card && showcase && showcaseReady && typeof window !== "undefined" && matchMedia("(pointer: fine)").matches;
  const renderWidth = highResolution
    ? Math.ceil(Math.min(1920, Math.max(baseRenderWidth * pixelRatio, displayWidth)) / pixelRatio)
    : baseRenderWidth;
  const renderHeight = renderWidth * BASE_HEIGHT / BASE_WIDTH;
  const showcaseScale = closeUp ? box.h * 1.48 / renderHeight : Math.min(box.w / renderWidth, box.h / renderHeight);
  const s = showcase ? showcaseScale : box.h / renderHeight * 1.05;
  const top = closeUp ? -box.h * 0.06 : box.h / 2 - renderHeight * (showcase ? 0.5 : 560 / 900) * s;
  return (
    <div ref={outerRef} style={{ width: "100%", height: "100vh", overflow: "hidden", position: "relative" }}>
      <div
        style={card ? {
          position: "absolute", left: box.w / 2 - renderWidth * .5 * s, top,
          width: renderWidth, height: renderHeight, transform: `scale(${s})`, transformOrigin: "0 0",
        } : {
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
        <div style={{ width: renderWidth, height: renderHeight, transition: showcase ? "transform 180ms ease-out" : undefined, transformOrigin: "center 70%", transform: showcase ? "translateX(var(--follow-x, 0%)) scale(var(--follow-scale, 1))" : card ? undefined : `translateY(-${CROP_PERCENT / 2}%)` }}>
          {spline}
        </div>
      </div>
    </div>
  );
}
