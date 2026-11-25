/** Mount the shared Spline frame only for a nearby, active placement. Keep it
 * briefly on departure so reversing a swipe doesn't recompile the scene. */
export function observeIPhoneRobot(slots: Set<HTMLElement>, event: string, setLive: (live: boolean) => void,
  whenQuiet: (start: () => void) => () => void = start => {
    const timer = window.setTimeout(start, 180);
    return () => clearTimeout(timer);
  }) {
  const nearby = new Set<HTMLElement>();
  let cancelStart: (() => void) | undefined;
  let release = 0;
  let failed = false;
  const update = () => {
    const visible = [...nearby].some(el => slots.has(el) && !el.closest("[inert]"));
    if (!visible) failed = false;
    if (visible && !document.hidden && !failed) {
      clearTimeout(release);
      release = 0;
      cancelStart ??= whenQuiet(() => setLive(true));
    } else {
      cancelStart?.();
      cancelStart = undefined;
      if (!release) release = window.setTimeout(() => setLive(false), 6000);
    }
  };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const slot = entry.target as HTMLElement;
      if (entry.isIntersecting) nearby.add(slot);
      else nearby.delete(slot);
    }
    update();
  }, {rootMargin: "160px 0px"});
  const watched = new Set<HTMLElement>();
  const sync = () => {
    for (const el of watched) if (!slots.has(el)) {
      observer.unobserve(el);
      watched.delete(el);
      nearby.delete(el);
    }
    for (const el of slots) if (!watched.has(el)) {
      watched.add(el);
      observer.observe(el);
    }
    update();
  };
  const onLoss = (e: Event) => {
    if (e.target !== document.querySelector(".robot-stage iframe")) return;
    failed = true;
    cancelStart?.();
    cancelStart = undefined;
    setLive(false);
  };
  sync();
  window.addEventListener(event, sync);
  document.addEventListener("technoai:spline-context-lost", onLoss);
  document.addEventListener("visibilitychange", update);
  return () => {
    cancelStart?.();
    clearTimeout(release);
    observer.disconnect();
    window.removeEventListener(event, sync);
    document.removeEventListener("technoai:spline-context-lost", onLoss);
    document.removeEventListener("visibilitychange", update);
  };
}
