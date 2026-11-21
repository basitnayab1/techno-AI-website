/** Defer nonessential GPU initialization until the current scroll settles. */
export function afterScroll(run: () => void) {
  let timer: number;
  const cancel = () => {
    clearTimeout(timer);
    window.removeEventListener("scroll", schedule);
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      cancel();
      run();
    }, 250);
  };
  window.addEventListener("scroll", schedule, { passive: true });
  schedule();
  return cancel;
}
