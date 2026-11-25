/** One vertical gesture selects one step, including the momentum events that follow it. */
export function bindStepGestures(
  elements: HTMLElement[],
  canStep: (direction: number, event: WheelEvent | TouchEvent) => boolean,
  step: (direction: number) => void,
) {
  let lastWheel = -Infinity, wheelDirection = 0, wheelDistance = 0, wheelUsed = false;
  function wheel(event: WheelEvent) {
    if (!event.cancelable || event.ctrlKey || event.metaKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const direction = Math.sign(event.deltaY);
    const now = performance.now();
    if (direction !== wheelDirection || now - lastWheel > 150) {
      wheelDistance = 0;
      wheelUsed = false;
    }
    lastWheel = now;
    wheelDirection = direction;
    if (wheelUsed) { event.preventDefault(); return; }
    if (!canStep(direction, event)) return;
    event.preventDefault();
    wheelDistance += Math.abs(event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    if (wheelDistance >= 6) { wheelUsed = true; step(direction); }
  }

  let start: Touch | undefined, touchUsed = false;
  function end() { start = undefined; touchUsed = false; }
  function touchStart(event: TouchEvent) {
    end();
    if (event.touches.length === 1) start = event.touches[0];
  }
  function touchMove(event: TouchEvent) {
    if (!start || !event.cancelable || event.touches.length !== 1) return;
    if (touchUsed) { event.preventDefault(); return; }
    const dx = start.clientX - event.touches[0].clientX;
    const dy = start.clientY - event.touches[0].clientY;
    if (!dx && !dy) return;
    const direction = Math.sign(dy);
    if (Math.abs(dx) >= Math.abs(dy) || !canStep(direction, event)) { end(); return; }
    event.preventDefault();
    if (Math.abs(dy) >= 24) { touchUsed = true; step(direction); }
  }

  for (const element of elements) {
    element.addEventListener("wheel", wheel, { passive: false });
    element.addEventListener("touchstart", touchStart, { passive: true });
    element.addEventListener("touchmove", touchMove, { passive: false });
    element.addEventListener("touchend", end);
    element.addEventListener("touchcancel", end);
  }
  return () => {
    for (const element of elements) {
      element.removeEventListener("wheel", wheel);
      element.removeEventListener("touchstart", touchStart);
      element.removeEventListener("touchmove", touchMove);
      element.removeEventListener("touchend", end);
      element.removeEventListener("touchcancel", end);
    }
  };
}

export function scrollToStep(top: number) {
  const lenis = (window as Window & { lenis?: import("lenis").default }).lenis;
  if (lenis) lenis.scrollTo(top, { immediate: true });
  else window.scrollTo({ top, behavior: "instant" });
}
