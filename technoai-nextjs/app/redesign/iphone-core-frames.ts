/** Measure visible display frames independently of the chosen draw rate.
 * Use sustained pressure and recovery windows to avoid resizing on one hitch. */
export function runIPhoneCore(invalidate: () => void, setDpr: (dpr: number) => void) {
  let raf = 0;
  let start = 0;
  let samples = 0;
  let lastDraw = -Infinity;
  let budget = 0;
  let healthy = 0;
  const ratios = [1, .9, .8];
  const tick = (now: number) => {
    if (!start) start = now;
    else samples++;
    if (now - start >= 1200 && samples) {
      const interval = (now - start) / samples;
      const previous = budget;
      if (interval > 26) {
        budget = Math.min(budget + 1, ratios.length - 1);
        healthy = 0;
      } else if (interval < 19) {
        if (++healthy >= 4) { budget = Math.max(0, budget - 1); healthy = 0; }
      } else healthy = 0;
      if (budget !== previous) setDpr(ratios[budget]);
      start = now;
      samples = 0;
    }
    const interval = 1000 / (budget ? 30 : 60);
    if (now - lastDraw >= interval - 1) {
      invalidate();
      lastDraw = now;
    }
    raf = requestAnimationFrame(tick);
  };
  setDpr(1);
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
