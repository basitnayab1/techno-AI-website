"use client";

import "./section-motion.css";
import { useCallback, useEffect, useRef, type ReactNode, type RefObject } from "react";
import { usePathname } from "next/navigation";
import { attachFooterReveal, revealOnce, watchProgress } from "../public/section-motion.mjs";

export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  measure: (rect: DOMRect, height: number, viewport: number) => number,
  paint: (progress: number, height: number, moving: boolean) => void,
  reset: () => void,
) {
  useEffect(() => {
    if (ref.current) return watchProgress(ref.current, measure, paint, reset);
  }, [ref, measure, paint, reset]);
}

export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) return revealOnce(ref.current, delay);
  }, [delay]);
  return <div className="motion-reveal" ref={ref}>{children}</div>;
}

const exitProgress = (rect: DOMRect, height: number, viewport: number) =>
  1 - rect.bottom / Math.max(1, Math.min(height, viewport));

export function StackSection({ children }: { children: ReactNode }) {
  const bounds = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const reset = useCallback(() => {
    const style = surface.current?.style;
    if (style) { style.transform = ""; style.opacity = ""; style.willChange = ""; }
  }, []);
  const paint = useCallback((p: number, height: number, moving: boolean) => {
    const style = surface.current?.style;
    if (!style) return;
    const distance = Math.min(height, window.innerHeight) * .42;
    style.transform = p ? `translateY(${distance * p}px) scale(${1 - p * .05})` : "";
    style.opacity = p ? String(1 - .4 * p) : "";
    style.willChange = moving ? "transform, opacity" : "";
  }, []);
  useScrollProgress(bounds, exitProgress, paint, reset);
  return <div className="motion-stack" ref={bounds}><div ref={surface}>{children}</div></div>;
}

export function FooterReveal() {
  const pathname = usePathname();
  useEffect(() => {
    const footer = document.querySelector<HTMLElement>("footer.ft, footer.fo");
    if (footer) return attachFooterReveal(footer);
  }, [pathname]);
  return null;
}
