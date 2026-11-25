import { bindStepGestures, scrollToStep } from "./step-gestures";

export function roboticsProductStack(pinned: MediaQueryList) {
  const section = document.getElementById("robotics-hardware");
  if (section?.closest(".robotics-sequence")) {
    return { goTo() {}, syncScroll() {}, dispose() {} };
  }
  const panels = Array.from(section?.querySelectorAll<HTMLElement>(".robotics-products figure") ?? []);
  const links = Array.from(section?.querySelectorAll<HTMLAnchorElement>(".uses a") ?? []);
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sticky = section?.querySelector<HTMLElement>(":scope > .sticky");
  const showcase = section?.querySelector<HTMLElement>(".robotics-showcase");
  let stickyTop = 0;
  let travel = 0;
  let visible = false;
  let current = 0;
  let target = 0;
  let leaving = false;
  let playback: Animation | undefined;

  const preload = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    preload.disconnect();
    for (const image of section?.querySelectorAll<HTMLImageElement>(".robotics-products img") ?? []) {
      image.loading = "eager";
      void image.decode().catch(() => {});
    }
  }, { rootMargin: "600px 0px" });
  if (section) preload.observe(section);

  function stop() {
    playback?.cancel();
    playback = undefined;
    leaving = false;
    section?.removeAttribute("data-product-transition");
  }
  function display(index: number) {
    current = index;
    panels.forEach((panel, i) => {
      panel.toggleAttribute("data-panel-visible", i === index);
      panel.setAttribute("aria-hidden", String(i !== index));
    });
  }
  function animate(keyframes: Keyframe[], duration: number, finish: () => void) {
    section?.setAttribute("data-product-transition", "");
    const options: KeyframeAnimationOptions = { duration, easing: "cubic-bezier(.25,.65,.3,1)", fill: "both" };
    playback = panels[current].animate(keyframes, options);
    playback.onfinish = finish;
  }
  function enter() {
    stop();
    display(target);
    animate([{ opacity: 0, translate: "0 20px" }, { opacity: 1, translate: "0 0" }], 400, stop);
  }
  function select(index: number) {
    if (!section || !panels[index] || target === index) return;
    target = index;
    section.dataset.step = String(index);
    markSelected(index);
    if (!visible || still.matches) {
      stop();
      display(index);
      return;
    }
    // While leaving, only the destination changes. Never queue intermediate tabs.
    if (leaving) return;
    const style = getComputedStyle(panels[current]);
    const start = { opacity: style.opacity, translate: style.translate };
    stop();
    leaving = true;
    animate([start, { opacity: 0, translate: "0 -20px" }], 250, enter);
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) syncScroll();
    else { stop(); display(target); }
  });
  if (section) observer.observe(section);

  function measureTrack() {
    if (!section || !sticky || !pinned.matches) return;
    stickyTop = parseFloat(getComputedStyle(sticky).top);
    travel = section.offsetHeight - sticky.offsetHeight;
    syncScroll();
  }
  function syncScroll() {
    if (!visible || !section || !pinned.matches || travel <= 0) return;
    const progress = (stickyTop - section.getBoundingClientRect().top) / travel;
    select(Math.round(Math.min(1, Math.max(0, progress)) * (panels.length - 1)));
  }
  function goTo(index: number) {
    if (!section || !panels[index]) return;
    select(index);
    if (!pinned.matches || travel <= 0) return;
    const start = window.scrollY + section.getBoundingClientRect().top - stickyTop;
    const top = start + travel * index / (panels.length - 1);
    scrollToStep(top);
  }
  const size = new ResizeObserver(measureTrack);
  if (section && sticky) { size.observe(section); size.observe(sticky); }

  function readyForGesture() {
    if (!visible || !section) return false;
    if (!pinned.matches) return true;
    const offset = stickyTop - section.getBoundingClientRect().top;
    return offset >= -2 && offset <= travel + 2;
  }
  const gestures = bindStepGestures(section ? [section] : [], (direction, event) => {
    if (!readyForGesture() || !panels[target + direction]) return false;
    if (pinned.matches && (event.type === "wheel" || matchMedia("(max-width: 760px)").matches)) return true;
    return event.type === "touchmove" && event.target instanceof Node && !!showcase?.contains(event.target);
  }, direction => goTo(target + direction));
  function markSelected(index: number) {
    links.forEach((link, i) => {
      link.tabIndex = i === index ? 0 : -1;
      link.setAttribute("aria-selected", String(i === index));
    });
  }
  function configure() {
    measureTrack();
    stop();
    display(target);
    markSelected(target);
  }
  function onKey(event: KeyboardEvent) {
    const index = links.indexOf(event.target as HTMLAnchorElement);
    if (index < 0) return;
    const next = { ArrowRight: (index + 1) % links.length, ArrowDown: (index + 1) % links.length,
      ArrowLeft: (index + links.length - 1) % links.length, ArrowUp: (index + links.length - 1) % links.length,
      Home: 0, End: links.length - 1 };
    if (event.key === " ") { event.preventDefault(); links[index].click(); return; }
    if (!Object.prototype.hasOwnProperty.call(next, event.key)) return;
    event.preventDefault();
    const link = links[next[event.key as keyof typeof next]];
    link.focus({ preventScroll: true });
    link.click();
  }
  const list = section?.querySelector<HTMLElement>(".uses");
  list?.setAttribute("role", "tablist");
  list?.setAttribute("aria-label", "Robotics hardware");
  links.forEach((link, i) => {
    link.parentElement?.setAttribute("role", "presentation");
    link.id = `robotics-tab-${i}`;
    link.setAttribute("role", "tab");
    link.setAttribute("aria-controls", panels[i].id);
    panels[i].setAttribute("role", "tabpanel");
    panels[i].setAttribute("aria-labelledby", link.id);
  });
  list?.addEventListener("keydown", onKey);
  const followHash = () => {
    const i = panels.findIndex(panel => "#" + panel.id === location.hash);
    if (i >= 0) links[i].click();
  };
  // Motion's delegated anchor handler is installed before the next frame.
  const initialHash = requestAnimationFrame(followHash);
  window.addEventListener("hashchange", followHash);
  configure();
  pinned.addEventListener("change", configure);
  still.addEventListener("change", configure);
  return {
    goTo,
    syncScroll,
    dispose() {
      stop();
      cancelAnimationFrame(initialHash);
      window.removeEventListener("hashchange", followHash);
      list?.removeEventListener("keydown", onKey);
      still.removeEventListener("change", configure);
      observer.disconnect();
      preload.disconnect();
      size.disconnect();
      gestures();
      pinned.removeEventListener("change", configure);
    },
  };
}
