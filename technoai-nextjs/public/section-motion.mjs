// React pages and archived HTML use the same scheduler. Lenis publishes native scroll
// positions on desktop; other layouts already scroll natively.
const subscribers = new Set();
let detachSource;
let frame = 0;
function tick() {
  frame = 0;
  for (const update of subscribers) if (update()) schedule();
}
function schedule() {
  if (!frame && subscribers.size) frame = requestAnimationFrame(tick);
}
function bindSource() {
  detachSource?.();
  if (typeof window.lenis?.on === "function") detachSource = window.lenis.on("scroll", schedule);
  else {
    window.addEventListener("scroll", schedule, { passive: true });
    detachSource = () => window.removeEventListener("scroll", schedule);
  }
  schedule();
}
function subscribe(update) {
  subscribers.add(update);
  if (subscribers.size === 1) {
    bindSource();
    window.addEventListener("site:scroll-source", bindSource);
    window.addEventListener("resize", schedule);
  }
  schedule();
  return () => {
    subscribers.delete(update);
    if (subscribers.size) return;
    detachSource?.();
    window.removeEventListener("site:scroll-source", bindSource);
    window.removeEventListener("resize", schedule);
    cancelAnimationFrame(frame);
    frame = 0;
  };
}
export function revealOnce(element, delay = 0, fadeOnly = false) {
  let animation;
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    const simple = fadeOnly || matchMedia("(max-width:767.98px), (prefers-reduced-motion:reduce)").matches;
    animation = element.animate(simple ? [{opacity:.65},{opacity:1}] :
      [{opacity:0,transform:"translateY(24px)"},{opacity:1,transform:"translateY(0)"}],
      {duration:500,delay,easing:"cubic-bezier(.215,.61,.355,1)",fill:"backwards"});
  });
  observer.observe(element);
  return () => { observer.disconnect(); animation?.cancel(); };
}

// measure returns the target progress. Paint receives the smoothed progress and
// the measured block height. All consumers share one event source and one RAF.
export function watchProgress(element, measure, paint, reset) {
  const simple = matchMedia("(max-width:767.98px), (prefers-reduced-motion:reduce)");
  let release;
  function configure() {
    release?.();
    if (simple.matches) { release = revealOnce(element); return; }
    let height = element.offsetHeight;
    let previous = NaN;
    let unsubscribe;
    let lastHeight = -1;
    const resize = new ResizeObserver(() => { height = element.offsetHeight; schedule(); });
    function update() {
      const target = Math.max(0, Math.min(1, measure(element.getBoundingClientRect(), height, innerHeight)));
      const value = Number.isFinite(previous) ? previous + (target - previous) * .45 : target;
      const moving = Math.abs(target - value) > .001;
      const progress = moving ? value : target;
      if (progress !== previous || height !== lastHeight) paint(progress, height, moving);
      previous = progress;
      lastHeight = height;
      return moving;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !unsubscribe) {
        previous = NaN;
        resize.observe(element);
        height = element.offsetHeight;
        unsubscribe = subscribe(update);
      } else if (!entry.isIntersecting && unsubscribe) {
        unsubscribe(); unsubscribe = undefined;
        resize.unobserve(element);
        reset();
      }
    }, {rootMargin:"96px 0px"});
    io.observe(element);
    release = () => { unsubscribe?.(); io.disconnect(); resize.disconnect(); reset(); };
  }
  configure();
  simple.addEventListener("change", configure);
  return () => { simple.removeEventListener("change", configure); release?.(); };
}

export function attachFooterReveal(footer) {
  const layers = [...footer.children].filter(el => el instanceof HTMLElement && !["SCRIPT","STYLE"].includes(el.tagName));
  const overflow = footer.style.overflow;
  footer.style.overflow = "clip";
  function reset() {
    for (const layer of layers) layer.style.removeProperty("translate");
  }
  const stop = watchProgress(footer,
    (rect, height, vh) => (vh - rect.top) / Math.max(1,Math.min(height,vh)),
    (progress,height) => {
      const offset = -(1-progress)*Math.min(height,innerHeight)*.65;
      for (const layer of layers) layer.style.translate = offset ? "0 "+offset.toFixed(2)+"px" : "";
    },reset);
  return () => { stop(); footer.style.overflow = overflow; };
}
