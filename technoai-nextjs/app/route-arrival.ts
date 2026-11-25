// Runs before paint on document navigations.
// 2026-11-25 owner:
//  - The home opening (Loader) plays on EVERY visit to the home page (link, back button, reload, typed URL).
//  - Every other page change is a simple swipe: an ink panel with the //:ai logo slides in from one side
//    (left / right / up / down), the next page loads underneath, and the panel slides on out of view.
export const ROUTE_ARRIVAL = `(() => {
  if (window.top !== window.self || (location.pathname.startsWith("/redesign/") && location.pathname !== "/redesign/")) {
    const skip = event => event.viewTransition?.skipTransition();
    addEventListener("pagereveal", skip);
    addEventListener("pageswap", skip);
    return;
  }
  const root = document.documentElement;
  const isHome = path => ["/", "/redesign", "/redesign/"].includes(path);
  const home = isHome(location.pathname);
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const KEY = "technoai:swap";
  const read = () => { try { return sessionStorage.getItem(KEY); } catch { return null; } };
  const write = value => { try { value ? sessionStorage.setItem(KEY, value) : sessionStorage.removeItem(KEY); } catch {} };
  // The swipe replaces the browser's own page transition.
  addEventListener("pagereveal", event => event.viewTransition?.skipTransition());
  addEventListener("pageswap", event => event.viewTransition?.skipTransition());

  // ---- arriving: finish the swipe that the previous page started (not on home: its own loader shows)
  const arriving = read();
  write(null);
  if (arriving && !home && !still) {
    root.dataset.swapIn = arriving;
    const done = () => { delete root.dataset.swapIn; };
    setTimeout(done, 1100);
    addEventListener("animationend", event => { if (event.target === root && event.animationName === "swap-in-" + arriving) done(); });
  }

  // ---- leaving: cover the page with the logo panel, then load the next one
  const DIRS = ["left", "right", "up", "down"];
  let leaving = false;
  addEventListener("click", event => {
    if (still || leaving || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    let url;
    try { url = new URL(link.href, location.href); } catch { return; }
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
    if (url.pathname === location.pathname && url.search === location.search) return; // same page / #anchor
    if (/\\.(pdf|zip|jpe?g|png|webp|gif|svg|mp4|webm|docx?|xlsx?|csv)$/i.test(url.pathname) || url.pathname.startsWith("/wp-admin")) return;
    event.preventDefault();
    leaving = true;
    const dir = DIRS[Math.floor(Math.random() * DIRS.length)];
    write(dir);
    root.dataset.swapOut = dir;
    setTimeout(() => { location.href = url.href; }, 460);
  });

  addEventListener("pageshow", event => {
    if (!event.persisted) return;
    // Back/forward cache: the page comes back as it was left.
    if (home) { location.reload(); return; } // home always replays its opening
    leaving = false;
    write(null);
    delete root.dataset.swapOut;
    delete root.dataset.swapIn;
  });

  if (!home) return;
  const navigation = performance.getEntriesByType("navigation")[0];
  if (navigation?.type === "reload") {
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    // An old product fragment would otherwise reactivate its tab after hydration.
    if (location.hash) history.replaceState(history.state, "", location.pathname + location.search);
    const reset = () => {
      window.lenis?.scrollTo(0, { immediate: true, force: true });
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };
    let shown = false;
    let opened = false;
    const restore = () => { history.scrollRestoration = previous; };
    const handoff = () => { if (shown && opened) requestAnimationFrame(restore); };
    reset();
    addEventListener("pageshow", () => { shown = true; if (!opened) reset(); handoff(); }, { once: true });
    addEventListener("technoai:opening-ready", () => { reset(); opened = true; handoff(); }, { once: true });
    addEventListener("pagehide", restore, { once: true });
  }
})();`;

export const ROUTE_HEAD = `<link rel="stylesheet" href="/route-motion.css"><script>${ROUTE_ARRIVAL}</script>`;
