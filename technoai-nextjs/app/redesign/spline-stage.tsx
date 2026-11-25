"use client";

import { isIPhone } from "./iphone";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "./reduced-motion";
import type Lenis from "lenis";
import { IS_IOS, runWhenQuiet, waitFor } from "./heavy-queue";
import "./spline-stage.css";

const slots = new Set<HTMLElement>();
const SLOT_EVENT = "technoai:robot-slots";
type StableContainer = HTMLElement & { moveBefore?: (node: Node, before: Node | null) => void };
export function registerRobotSlot(slot: HTMLElement) {
  slots.add(slot);
  window.dispatchEvent(new Event(SLOT_EVENT));
  return () => { slots.delete(slot); window.dispatchEvent(new Event(SLOT_EVENT)); };
}

/** True once the hero 3D core is live or showing its poster fallback (or there is no hero). */
export function heroSettled() {
  const stage = document.querySelector<HTMLElement>(".hx-stage");
  return !stage || stage.dataset.ready === "true" || stage.dataset.mode === "fallback";
}

/** One browsing context, model decode and GPU scene shared between the two robot placements. */
export default function SplineStage() {
  const still = useReducedMotion();
  const [near, setNear] = useState(false);
  const [opened, setOpened] = useState(false);
  const live = near && !still && !isIPhone;
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (isIPhone || still || near) return;
    // Start the Spline robot (1.3 MB scene + its own WebGL runtime) only after the hero 3D is live
    // (or has fallen back to its poster). On iPhone, loading both at once starved the hero past its
    // 10 s limit and the live core never appeared (2026-11-25 test).
    if (!opened && !heroSettled()) {
      const stage = document.querySelector(".hx-stage");
      const check = () => { if (heroSettled()) setOpened(true); };
      const watch = new MutationObserver(check);
      if (stage) watch.observe(stage, { attributes: true, attributeFilter: ["data-ready", "data-mode"] });
      const fallback = window.setTimeout(() => setOpened(true), 15000);
      return () => { watch.disconnect(); clearTimeout(fallback); };
    }
    let cancel = () => {};
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      // iPhone: the Spline runtime + 1.3 MB scene froze the page for ~25 s (black screen while
      // scrolling). There it starts only when the user pauses, one 3D start at a time; the queue
      // is freed when the robot reports its first frame.
      cancel = runWhenQuiet(() => { setNear(true); return waitFor("technoai:robot-warm", 9000); });
    }, { rootMargin: IS_IOS ? `${innerHeight}px 0px` : `${Math.max(1200, innerHeight * 2)}px 0px` });
    const watchSlots = () => {
      observer.disconnect();
      // The cards sit below a pinned hero. Starting from the section boundary
      // gives the shared robot time to compile before a fast pass through them.
      const cards = document.getElementById("solutions");
      if (cards) observer.observe(cards);
      for (const slot of slots) observer.observe(slot);
    };
    window.addEventListener(SLOT_EVENT, watchSlots);
    watchSlots();
    return () => {
      observer.disconnect();
      cancel();
      window.removeEventListener(SLOT_EVENT, watchSlots);
    };
  }, [near, still, opened]);

  useLayoutEffect(() => {
    const el = host.current;
    if (!live || !el) return;
    const home = el.parentElement;
    const homeNext = el.nextSibling;
    const robotics = document.getElementById("robotics");
    let attachedSlot: HTMLElement | null = null;
    let raf = 0;
    let ready = false;
    let sentPlacement = "";
    let playing = false;
    let paintedSize = { width: 0, height: 0, showcase: false };
    let lastPointer: { x: number; y: number } | null = null;
    // iPhone Safari has no Element.moveBefore, so the iframe stays a fixed layer that JS moves after
    // each scroll. During momentum scrolling that move lags and the robot floated over the text
    // (owner's iPhone video, 2026-11-25). There the 3D robot hides while scrolling (the slot's own
    // poster shows) and fades back in place once scrolling stops. Android/desktop are unchanged.
    const canAttach = "moveBefore" in Element.prototype;
    let scrolling = false;
    let idle = 0;
    const onScroll = () => {
      if (!canAttach) {
        scrolling = true;
        clearTimeout(idle);
        idle = window.setTimeout(() => { scrolling = false; schedule(); }, 160);
      }
      schedule();
    };
    const send = (value: string | { type: "spline:pointer"; x: number; y: number }) => frame.current?.contentWindow?.postMessage(value, location.origin);
    const pointer = { active: false, dirty: false, seen: false, x: 0, y: 0 };
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
        if (slot.closest("[inert]")) continue;
        const rect = slot.getBoundingClientRect();
        const area = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0))
          * Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0));
        if (area > 0 && (!best || area > best.area)) best = { slot, rect, area };
      }
      const attached = !!best && typeof (best.slot as StableContainer).moveBefore === "function";
      const width = best ? attached ? best.slot.clientWidth : best.rect.width : 0;
      const height = best ? attached ? best.slot.clientHeight : best.rect.height : 0;
      const sized = !!best && Math.abs(width - paintedSize.width) < 1 && Math.abs(height - paintedSize.height) < 1;
      const showcase = !!best?.slot.closest(".closer-robot .section-robot");
      const show = !!best && ready && sized && paintedSize.showcase === showcase && !document.hidden && !(scrolling && !attached);
      if (best) {
        const { rect } = best;
        const container = best.slot as StableContainer;
        if (typeof container.moveBefore === "function") {
          // Preserve the browsing context while attaching its layer to the card.
          // Native scrolling then moves both together, without a JS-frame delay.
          if (attachedSlot !== best.slot) {
            attachedSlot?.removeAttribute("data-live-robot");
            container.moveBefore(el, null);
            attachedSlot = best.slot;
            attachedSlot.dataset.liveRobot = "true";
            el.dataset.attached = "true";
          }
          write("width", "100%");
          write("height", "100%");
          write("transform", "none");
        } else {
          write("width", `${rect.width}px`);
          write("height", `${rect.height}px`);
          write("transform", `translate3d(${rect.left}px,${rect.top}px,0)`);
        }
        const placement = best.slot.closest(".section-robot") ? "section" : "card";
        if (el.dataset.placement !== placement) el.dataset.placement = placement;
        const framing = showcase ? "showcase" : placement;
        if (ready && sentPlacement !== framing) {
          el.dataset.framing = framing;
          send(`spline:placement:${framing}`);
          sentPlacement = framing;
        }
      }
      if (el.dataset.visible !== String(show)) el.dataset.visible = String(show);
      if (el.inert !== !show) el.inert = !show;
      robotics?.toggleAttribute("data-live-showcase", show && showcase);
      const animate = !best?.slot.closest(".cx[data-scrolling]");
      setPlaying(!!best && ready && !document.hidden && animate);
      if (!show) lastPointer = null;
      const moved = pointer.dirty;
      pointer.dirty = false;
      if (playing && best && el.dataset.placement !== "card" && pointer.active && moved) {
        const x = Math.max(0, Math.min(width, (pointer.x - best.rect.left) * width / Math.max(1, best.rect.width)));
        const y = Math.max(0, Math.min(height, (pointer.y - best.rect.top) * height / Math.max(1, best.rect.height)));
        if (!lastPointer || Math.abs(x - lastPointer.x) > .5 || Math.abs(y - lastPointer.y) > .5) {
          send({ type: "spline:pointer", x, y });
          lastPointer = { x, y };
        }
      }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
      if (pointer.seen && Math.abs(event.clientX - pointer.x) < .5 && Math.abs(event.clientY - pointer.y) < .5) return;
      pointer.active = true;
      pointer.dirty = true;
      pointer.seen = true;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      schedule();
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "spline:viewport-ready" && Number.isFinite(event.data.width) && Number.isFinite(event.data.height)) {
        paintedSize = { width: event.data.width, height: event.data.height, showcase: event.data.showcase === true };
        schedule();
      } else if (event.data === "spline:ready") {
        if (!ready) window.dispatchEvent(new Event("technoai:robot-warm"));
        ready = true;
        sentPlacement = "";
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
    const stepObserver = new MutationObserver(schedule);
    const cards = document.getElementById("solutions");
    if (cards) stepObserver.observe(cards, { attributeFilter: ["data-scrolling"] });
    const useNativePointer = () => { pointer.active = false; pointer.dirty = false; lastPointer = null; };
    const iframe = frame.current;
    iframe?.addEventListener("pointerenter", useNativePointer);
    resize.observe(document.body);
    window.addEventListener("message", onMessage);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchmove", onScroll, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener(SLOT_EVENT, schedule);
    document.addEventListener("visibilitychange", schedule);
    window.addEventListener("pointermove", onPointer, { passive: true });
    schedule();
    send("spline:status");
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      stepObserver.disconnect();
      iframe?.removeEventListener("pointerenter", useNativePointer);
      window.removeEventListener("message", onMessage);
      clearTimeout(idle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchmove", onScroll);
      window.removeEventListener("resize", schedule);
      window.removeEventListener(SLOT_EVENT, schedule);
      document.removeEventListener("visibilitychange", schedule);
      window.removeEventListener("pointermove", onPointer);
      attachedSlot?.removeAttribute("data-live-robot");
      robotics?.removeAttribute("data-live-showcase");
      el.dataset.visible = "false";
      el.dataset.ready = "false";
      delete el.dataset.attached;
      el.inert = true;
      // Restore React's host parent before it removes this component's DOM node.
      if (home && el.parentElement !== home) (home as StableContainer).moveBefore?.(el, homeNext?.parentNode === home ? homeNext : null);
    };
  }, [live]);
  return <div ref={host} className="robot-stage" data-visible="false" data-ready="false" inert>
    {/* Spline selects WebGPU when supported and falls back to WebGL on older devices. */}
    <iframe ref={frame} src={live ? "/redesign/spline-frame/?fit=card" : undefined} title="Interactive 3D robot"
      onLoad={() => frame.current?.contentWindow?.postMessage("spline:status", location.origin)} />
  </div>;
}
