"use client";

import Lenis from "lenis";
import { useEffect, useRef, type ReactNode } from "react";
import { isIPhone } from "./iphone";
import "./robotics-sequence.css";

const clamp = (value: number) => Math.min(1, Math.max(0, value));
// power2.out, expressed directly so this stage needs no animation dependency.
const ease = (value: number) => 1 - Math.pow(1 - clamp(value), 3);

export default function RoboticsSequence({ hardware, robot, industries }: {
  hardware: ReactNode;
  robot: ReactNode;
  industries: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const progress = useRef({ current: 0, target: 0 });

  useEffect(() => {
    const track = root.current;
    if (!track) return;
    if (isIPhone) track.dataset.iphone = "";
    const stage = track.querySelector<HTMLElement>(".rs-stage")!;
    const hardwareScene = track.querySelector<HTMLElement>(".rs-hardware")!;
    const robotScene = track.querySelector<HTMLElement>(".rs-robot")!;
    const industryScene = track.querySelector<HTMLElement>(".rs-industries")!;
    const panels = Array.from(track.querySelectorAll<HTMLElement>(".robotics-products figure"));
    const zooms = panels.map(panel => panel.querySelector<HTMLElement>(".robotics-product-media") ?? panel);
    const tabs = Array.from(track.querySelectorAll<HTMLAnchorElement>(".uses a"));
    const tablist = track.querySelector<HTMLElement>(".uses")!;
    const industryTrack = track.querySelector<HTMLElement>(".h-track")!;
    const industryViewport = track.querySelector<HTMLElement>(".industry-viewport")!;
    const industryCards = Array.from(industryTrack.querySelectorAll<HTMLAnchorElement>("a.ind"));
    const bar = track.querySelector<HTMLElement>(".h-bar i")!;
    const media = matchMedia("(min-height: 600px) and (prefers-reduced-motion: no-preference)");
    const shared = window as Window & { lenis?: Lenis };
    let scroll = shared.lenis;
    let owned: Lenis | undefined;
    if (!scroll && matchMedia("(hover: hover) and (pointer: fine)").matches && media.matches) {
      owned = new Lenis({ autoRaf: false, lerp: .12, syncTouch: false, anchors: false });
      scroll = owned;
      shared.lenis = owned;
    }
    let top = 0, travel = 1, shift = 0, visibleFraction = 0;
    let frame = 0, previousTime = 0, selected = -1, phase = -1;
    let mounted = true, geometryDirty = true;

    function measure() {
      top = track!.getBoundingClientRect().top + window.scrollY;
      travel = Math.max(1, track!.offsetHeight - stage.offsetHeight);
      const width = industryViewport.clientWidth || stage.clientWidth;
      shift = Math.max(0, industryTrack.scrollWidth - width);
      visibleFraction = industryViewport.clientWidth ? Math.min(1, width / industryTrack.scrollWidth) : 0;
      geometryDirty = false;
    }
    function mark(index: number) {
      if (index === selected) return;
      selected = index;
      tabs.forEach((tab, i) => {
        tab.setAttribute("aria-selected", String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
      });
      panels.forEach((panel, i) => panel.setAttribute("aria-hidden", String(i !== index)));
    }
    function setPhase(index: number) {
      if (phase === index) return;
      phase = index;
      [hardwareScene, robotScene, industryScene].forEach((scene, i) => {
        scene.inert = i !== index;
        scene.setAttribute("aria-hidden", String(i !== index));
      });
      // The shared live robot must follow the active stage, including reverse scrolling.
      window.dispatchEvent(new Event("technoai:robot-slots"));
    }
    function paint(p: number) {
      const hardwareEnter = ease((p - .26) / .04);
      const hardwareExit = ease((p - .64) / .04);
      hardwareScene.style.opacity = String(hardwareEnter * (1 - hardwareExit));
      hardwareScene.style.transform = "translate3d(0," + (24 * (1 - hardwareEnter) - 24 * hardwareExit) + "px,0)";
      const robotOpacity = 1 - ease((p - .20) / .06);
      robotScene.style.opacity = String(robotOpacity);
      robotScene.style.transform = "translate3d(0," + (-24 * ease((p - .20) / .06)) + "px,0)";
      document.documentElement.style.setProperty("--robotics-stage-opacity", String(robotOpacity));
      industryScene.style.opacity = String(ease((p - .68) / .055));
      industryScene.style.transform = "translate3d(0," + (28 * (1 - ease((p - .68) / .055))) + "px,0)";
      const position = Math.max(0, Math.min(2.99999, (p - .26) / .42 * 3));
      panels.forEach((panel, i) => {
        const enter = i === 0 ? 1 : ease((position - i) / .14);
        const exit = i === panels.length - 1 ? 1 : 1 - ease((position - i - .86) / .14);
        panel.style.opacity = String(enter * exit);
        // Zoom only the photo: the caption stays on the heading's left line (2026-11-25 owner).
        zooms[i].style.transform = "translate3d(0,0,0) scale(" + (1.025 - .025 * ease(position - i)) + ")";
      });
      const horizontal = clamp((p - .735) / .265);
      industryTrack.style.transform = "translate3d(" + (-shift * horizontal) + "px,0,0)";
      bar.style.transform = "scaleX(" + (visibleFraction + (1 - visibleFraction) * horizontal) + ")";
      mark(Math.floor(position));
      setPhase(p < .26 ? 1 : p < .68 ? 0 : 2);
    }
    function tick(time: number) {
      frame = 0;
      if (!mounted || document.hidden) return;
      if (owned) owned.raf(time);
      if (geometryDirty) measure();
      const target = media.matches ? clamp(((scroll?.scroll ?? window.scrollY) - top) / travel) : 0;
      const dt = Math.min(64, time - (previousTime || time - 1000 / 60));
      previousTime = time;
      progress.current.target = target;
      progress.current.current += (target - progress.current.current) * (1 - Math.pow(1 - .12, dt / (1000 / 60)));
      if (Math.abs(target - progress.current.current) < .00001) progress.current.current = target;
      if (media.matches) paint(progress.current.current);
      if (!frame && (owned || Math.abs(target - progress.current.current) > .00001)) frame = requestAnimationFrame(tick);
    }
    function schedule() {
      if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
    }
    function configure() {
      if (!media.matches && owned) {
        if (shared.lenis === owned) delete shared.lenis;
        owned.destroy();
        owned = undefined;
        scroll = shared.lenis;
      }
      track!.toggleAttribute("data-pinned", media.matches);
      geometryDirty = true;
      measure();
      progress.current.current = progress.current.target = clamp(((scroll?.scroll ?? window.scrollY) - top) / travel);
      phase = selected = -1;
      if (media.matches) paint(progress.current.current);
      else {
        [hardwareScene, robotScene, industryScene, ...panels, ...zooms, industryTrack, bar].forEach(el => {
          el.style.removeProperty("opacity");
          el.style.removeProperty("transform");
          el.removeAttribute("aria-hidden");
          el.inert = false;
        });
        tabs.forEach(tab => { tab.tabIndex = 0; tab.removeAttribute("aria-selected"); });
        document.documentElement.style.removeProperty("--robotics-stage-opacity");
        window.dispatchEvent(new Event("technoai:robot-slots"));
      }
      schedule();
    }
    function goTo(p: number) {
      const y = top + travel * p;
      if (scroll) scroll.scrollTo(y, { duration: .8, easing: ease });
      else window.scrollTo({ top: y, behavior: "smooth" });
      schedule();
    }
    function click(event: MouseEvent) {
      const link = (event.target as Element).closest<HTMLAnchorElement>(".uses a");
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const index = tabs.indexOf(link);
      if (index < 0) return;
      event.preventDefault();
      if (!media.matches) {
        panels[index].scrollIntoView({ block: "center", behavior: "instant" });
        return;
      }
      goTo(.26 + (index + .35) * .14);
    }
    function keyboard(event: KeyboardEvent) {
      const index = tabs.indexOf(event.target as HTMLAnchorElement);
      if (!media.matches || index < 0) return;
      let next = index;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else if (event.key === " ") { event.preventDefault(); tabs[index].click(); return; }
      else return;
      event.preventDefault();
      tabs[next].focus({ preventScroll: true });
      goTo(.26 + (next + .35) * .14);
    }
    function focusIndustry(event: FocusEvent) {
      if (!media.matches) return;
      const index = industryCards.indexOf(event.target as HTMLAnchorElement);
      if (index < 0) return;
      const card = industryCards[index];
      const width = industryViewport.clientWidth || stage.clientWidth;
      const offset = card.getBoundingClientRect().left - industryTrack.getBoundingClientRect().left - (width - card.offsetWidth) / 2;
      goTo(.735 + (shift ? clamp(offset / shift) : 0) * .265);
    }
    function invalidate() { geometryDirty = true; schedule(); }
    function visibility() {
      cancelAnimationFrame(frame);
      frame = previousTime = 0;
      if (!document.hidden) { geometryDirty = true; schedule(); }
    }
    const preload = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      panels.forEach(panel => panel.querySelectorAll("img").forEach(img => {
        img.loading = "eager";
        void img.decode().catch(() => {});
      }));
      preload.disconnect();
    }, { rootMargin: "800px 0px" });
    preload.observe(track);
    const resize = new ResizeObserver(invalidate);
    resize.observe(document.body);
    resize.observe(stage);
    resize.observe(industryTrack);
    resize.observe(industryViewport);
    tablist.setAttribute("role", "tablist");
    tablist.setAttribute("aria-label", "Robotics hardware");
    tabs.forEach((tab, i) => {
      tab.id = "hardware-tab-" + i;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panels[i].id);
      panels[i].setAttribute("role", "tabpanel");
      panels[i].setAttribute("aria-labelledby", tab.id);
      tab.parentElement?.setAttribute("role", "presentation");
    });
    configure();
    track.addEventListener("click", click);
    tablist.addEventListener("keydown", keyboard);
    industryTrack.addEventListener("focusin", focusIndustry);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", invalidate, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    media.addEventListener("change", configure);
    scroll?.on("scroll", schedule);
    void document.fonts.ready.then(() => { if (mounted) invalidate(); });
    return () => {
      mounted = false;
      cancelAnimationFrame(frame);
      resize.disconnect();
      preload.disconnect();
      track.removeEventListener("click", click);
      tablist.removeEventListener("keydown", keyboard);
      industryTrack.removeEventListener("focusin", focusIndustry);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", invalidate);
      document.removeEventListener("visibilitychange", visibility);
      media.removeEventListener("change", configure);
      scroll?.off("scroll", schedule);
      if (owned) {
        if (shared.lenis === owned) delete shared.lenis;
        owned.destroy();
      }
      document.documentElement.style.removeProperty("--robotics-stage-opacity");
    };
  }, []);

  return <div className="robotics-sequence" ref={root}>
    <div className="rs-stage">
      <div className="rs-scene rs-robot">{robot}</div>
      <div className="rs-scene rs-hardware">{hardware}</div>
      <div className="rs-scene rs-industries">{industries}</div>
    </div>
  </div>;
}
