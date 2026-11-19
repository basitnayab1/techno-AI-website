"use client";

import { useEffect, useRef } from "react";
import type Lenis from "lenis";
import "./spline-stage.css";

const slots = new Set<HTMLElement>();
const SLOT_EVENT = "technoai:robot-slots";
export function registerRobotSlot(slot: HTMLElement) {
  slots.add(slot);
  window.dispatchEvent(new Event(SLOT_EVENT));
  return () => { slots.delete(slot); window.dispatchEvent(new Event(SLOT_EVENT)); };
}

/** One browsing context, model decode and GPU scene shared between the two robot placements. */
export default function SplineStage() {
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let raf = 0;
    let ready = false;
    let playing = false;
    const send = (value: string) => frame.current?.contentWindow?.postMessage(value, location.origin);
    const setPlaying = (value: boolean) => {
      if (playing === value) return;
      playing = value;
      send(value ? "spline:play" : "spline:stop");
    };
    const write = (name: string, value: string) => {
      if (el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
    };
    const update = () => {
      raf = 0;
      let best: { slot: HTMLElement; rect: DOMRect; area: number } | null = null;
      // Read all geometry before writing styles. No work runs while the page is idle.
      for (const slot of slots) {
        const rect = slot.getBoundingClientRect();
        const area = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0))
          * Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0));
        if (area > 0 && (!best || area > best.area)) best = { slot, rect, area };
      }
      const show = !!best && ready && !document.hidden;
      if (best) {
        const { rect } = best;
        write("width", `${rect.width}px`);
        write("height", `${rect.height}px`);
        write("transform", `translate3d(${rect.left}px,${rect.top}px,0)`);
        el.dataset.placement = best.slot.closest(".section-robot") ? "section" : "card";
      }
      el.dataset.visible = String(show);
      el.inert = !show;
      setPlaying(show);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data === "spline:ready") {
        ready = true;
        el.dataset.ready = "true";
        playing = true; // the child's first rendered frame is live; pause if no placement is visible
        schedule();
      } else if (event.data?.type === "spline:wheel" && Number.isFinite(event.data.deltaY)) {
        if (document.documentElement.style.overflow === "hidden") return;
        const delta = event.data.deltaY * (event.data.deltaMode === 1 ? 16 : event.data.deltaMode === 2 ? innerHeight : 1);
        const lenis = (window as Window & { lenis?: Lenis }).lenis;
        if (lenis) lenis.scrollTo(lenis.targetScroll + delta, { programmatic: false });
        else window.scrollBy({ top: delta, behavior: "instant" });
      }
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    window.addEventListener("message", onMessage);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener(SLOT_EVENT, schedule);
    document.addEventListener("visibilitychange", schedule);
    window.addEventListener("pointermove", schedule, { passive: true });
    schedule();
    send("spline:status");
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      window.removeEventListener("message", onMessage);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener(SLOT_EVENT, schedule);
      document.removeEventListener("visibilitychange", schedule);
      window.removeEventListener("pointermove", schedule);
    };
  }, []);
  return <div ref={host} className="robot-stage" data-visible="false" data-ready="false" inert>
    <iframe ref={frame} src="/redesign/spline-frame/?fit=card" title="Interactive 3D robot" loading="eager"
      onLoad={() => frame.current?.contentWindow?.postMessage("spline:status", location.origin)} />
  </div>;
}
