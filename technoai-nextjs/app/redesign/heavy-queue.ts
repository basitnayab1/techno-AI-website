/**
 * iPhone loading queue (2026-11-25, owner's iPhone recording).
 *
 * iPhone Safari compiles 3D shaders on the page's main thread and has no parallel shader compile, so
 * while a 3D scene starts the whole page freezes and Safari paints black/white tiles while the user
 * scrolls. On iPhone/iPad every heavy 3D start (Spline robot, card models, journey, globe) goes through
 * this queue: it only starts when the user has not scrolled or touched for QUIET ms, and only one job
 * runs at a time. The slot's poster image shows meanwhile. Other devices run the job at once.
 */

export const IS_IOS = typeof navigator !== "undefined" && (
  /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
);

const QUIET = 1000;
const MAX_JOB = 9000; // a job that never reports done frees the queue after this
type Job = { run: () => void | Promise<unknown>; cancelled: boolean };

const queue: Job[] = [];
let busy = false;
let lastInput = 0;
let timer = 0;
let listening = false;

function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  lastInput = performance.now();
  const touch = () => { lastInput = performance.now(); };
  for (const type of ["scroll", "touchstart", "touchmove", "wheel"]) {
    window.addEventListener(type, touch, { passive: true, capture: true });
  }
}

function pump() {
  clearTimeout(timer);
  if (busy) return;
  while (queue.length && queue[0].cancelled) queue.shift();
  if (!queue.length) return;
  const wait = QUIET - (performance.now() - lastInput);
  if (wait > 0 || document.hidden) {
    timer = window.setTimeout(pump, Math.max(120, wait));
    return;
  }
  const job = queue.shift()!;
  busy = true;
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    busy = false;
    // Let Safari paint a frame before the next heavy start.
    timer = window.setTimeout(pump, 250);
  };
  const cap = window.setTimeout(done, MAX_JOB);
  Promise.resolve()
    .then(job.run)
    .catch(() => {})
    .finally(() => { clearTimeout(cap); done(); });
}

/** Run a heavy 3D start when the iPhone user is not scrolling. Returns a cancel function. */
export function runWhenQuiet(run: () => void | Promise<unknown>): () => void {
  if (!IS_IOS) {
    run();
    return () => {};
  }
  listen();
  const job: Job = { run, cancelled: false };
  queue.push(job);
  pump();
  return () => { job.cancelled = true; };
}

/** Resolves when `event` fires on window, or after `ms`. */
export function waitFor(event: string, ms: number) {
  return new Promise<void>((resolve) => {
    const end = () => { clearTimeout(t); window.removeEventListener(event, end); resolve(); };
    const t = window.setTimeout(end, ms);
    window.addEventListener(event, end, { once: true });
  });
}
