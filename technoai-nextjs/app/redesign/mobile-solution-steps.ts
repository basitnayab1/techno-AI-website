import { bindStepGestures, scrollToStep } from "./step-gestures";

/** The first two solutions share the live 3D stage. The remaining stops share the film stage. */
export function mobileSolutionSteps(films: HTMLElement) {
  const journey = document.getElementById("technology");
  const liveStage = journey?.querySelector<HTMLElement>(":scope > .sticky");
  const filmStage = films.querySelector<HTMLElement>(".mj-stage");
  const panels = Array.from(films.querySelectorAll<HTMLElement>(".mj-panel"));
  if (!journey || !liveStage || !filmStage || !panels.length) return;
  const phone = matchMedia("(max-width: 760px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)");

  function enable() {
    if (!journey || !liveStage || !filmStage) return;
    films.setAttribute("data-stepped", "");
    let stops: number[] = [];
    let selected = -1;
    let frame = 0;
    function indexAt(y: number) {
      return stops.reduce((best, stop, index) => Math.abs(y - stop) < Math.abs(y - stops[best]) ? index : best, 0);
    }
    function show() {
      frame = 0;
      const index = Math.max(0, indexAt(window.scrollY) - 2);
      if (index === selected) return;
      selected = index;
      const hadFocus = panels.some(panel => panel.contains(document.activeElement));
      panels.forEach((panel, i) => { panel.hidden = i !== index; });
      if (hadFocus) panels[index].querySelector("a")?.focus({ preventScroll: true });
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(show); };
    const measure = () => {
      const y = window.scrollY;
      const start = journey.getBoundingClientRect().top + y;
      const filmStart = films.getBoundingClientRect().top + y;
      const step = (films.offsetHeight - filmStage.offsetHeight) / Math.max(1, panels.length - 1);
      stops = [start, start + journey.offsetHeight - liveStage.offsetHeight, ...panels.map((_, i) => filmStart + i * step)];
      show();
    };
    measure();
    const size = new ResizeObserver(measure);
    for (const el of [document.body, journey, liveStage, films, filmStage]) size.observe(el);
    const gestures = bindStepGestures([journey, films], direction => {
      const y = window.scrollY;
      const index = indexAt(y);
      return y >= stops[0] - 2 && y <= stops[stops.length - 1] + 2 && stops[index + direction] !== undefined;
    }, direction => scrollToStep(stops[indexAt(window.scrollY) + direction]));
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      cancelAnimationFrame(frame);
      size.disconnect();
      gestures();
      films.removeAttribute("data-stepped");
      panels.forEach(panel => { panel.hidden = false; });
    };
  }
  let disable = phone.matches ? enable() : undefined;
  const change = () => { disable?.(); disable = phone.matches ? enable() : undefined; };
  phone.addEventListener("change", change);
  return () => { disable?.(); phone.removeEventListener("change", change); };
}
