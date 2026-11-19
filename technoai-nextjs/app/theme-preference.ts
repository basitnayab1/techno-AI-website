export type SiteTheme = "dark" | "light";

export const THEME_BOOT_SCRIPT = "(()=>{let t='dark';try{const s=localStorage.getItem('technoai-theme');if(s==='light'||s==='dark')t=s}catch(e){}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t})()";

export function readTheme(): SiteTheme {
  try {
    const saved = localStorage.getItem("technoai-theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch { /* Storage may be disabled; the default remains available. */ }
  return "dark";
}

export function applyTheme(theme: SiteTheme, persist = false) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#030505" : "#f6fafb");
  if (persist) {
    try { localStorage.setItem("technoai-theme", theme); } catch { /* Toggle still works without storage. */ }
  }
}
