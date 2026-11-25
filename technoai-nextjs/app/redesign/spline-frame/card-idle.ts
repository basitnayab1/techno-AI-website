import type { Application } from "@splinetool/runtime";

/** The card holds the authored final camera and animates only a gentle head turn. */
export function createCardIdle() {
  let app: Application | null = null;
  let card = false;
  let playing = true;
  let held = false;
  let frame = 0;
  let restoreHead: (() => void) | undefined;

  function cancel() {
    cancelAnimationFrame(frame);
    frame = 0;
    restoreHead?.();
    restoreHead = undefined;
  }

  function sync() {
    cancel();
    if (!app) return;
    if (!card) {
      if (held && playing && !app.isStopped) app.eventManager.resume();
      held = false;
      return;
    }
    // play() reactivates Spline's authored Start event. Pause its events while
    // retaining rendering, so scrolling/resuming cannot replay the camera dolly.
    if (app.eventManager.isEnabled) app.eventManager.pause();
    held = true;
    const camera = app.findObjectByName("Camera 2");
    if (camera) Object.assign(camera.position, { x: 0, y: 146.98, z: 1000 });
    app.requestRender();
    const head = app.findObjectByName("Head");
    if (!playing || !head || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rest = head.rotation.y;
    const start = performance.now();
    restoreHead = () => { head.rotation.y = rest; };
    function glance(now: number) {
      if (!app || !head) return;
      head.rotation.y = rest + Math.sin((now - start) / 1450) * .28;
      app.requestRender();
      frame = requestAnimationFrame(glance);
    }
    frame = requestAnimationFrame(glance);
  }

  return {
    attach(value: Application) { app = value; sync(); },
    setCard(value: boolean) { if (card !== value) { card = value; sync(); } },
    setPlaying(value: boolean) { playing = value; sync(); },
    dispose() { cancel(); app = null; },
  };
}
