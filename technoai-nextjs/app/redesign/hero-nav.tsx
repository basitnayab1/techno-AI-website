"use client";

import { useEffect, useRef, useState } from "react";
import { MENU_ICONS, MENU_LINKS } from "./menu-data";
import ThemeToggle from "./theme-toggle";

type Item = { label: string; href: string; links: [string, string][] };

/**
 * Fullscreen menu, same as the live technoai.ae header menu (Elementor popup 6860): left panel on the
 * circuit "AI" image slides in from the right with big white links rising one by one, a blue strip on the
 * right with the six solution icons, white X top-right. Opens animated, closes instantly (like the live site).
 */
function FullMenu({ onClose }: { onClose: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    const lenis = (window as unknown as { lenis?: { stop: () => void; start: () => void } }).lenis;
    lenis?.stop();
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(r);
      lenis?.start();
      document.documentElement.style.overflow = prev;
    };
  }, []);
  return (
    <div className={`tm${shown ? " is-open" : ""}`} role="dialog" aria-modal="true" aria-label="Menu" onClick={(e) => (e.target as HTMLElement).closest("a") && onClose()}>
      <div className="tm-left">
        <nav className="tm-links" aria-label="Main menu">
          {MENU_LINKS.map(([label, href], i) => (
            <a key={href} className="tm-item" href={href} style={{ ["--i" as string]: i }}>
              {label}
            </a>
          ))}
        </nav>
      </div>
      <div className="tm-right">
        {MENU_ICONS.map((ic) => (
          <a key={ic.href} className="tm-ico" href={ic.href} aria-label={ic.label} title={ic.label} dangerouslySetInnerHTML={{ __html: ic.svg }} />
        ))}
      </div>
      <button className="tm-close" aria-label="Close menu" onClick={onClose}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
      </button>
    </div>
  );
}

/** Floating glass navbar of the home hero. Desktop: hover/focus dropdowns. Mobile: slide-down panel. */
export default function HeroNav({ items }: { items: Item[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    // Lenis already tracks the scroll position; reading window.scrollY on every scroll event forced a
    // full-page layout each time (a big part of the scroll stutter)
    const on = () => {
      const lenis = (window as unknown as { lenis?: { scroll: number } }).lenis;
      setScrolled((lenis ? lenis.scroll : window.scrollY) > 12);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("keydown", esc);
    };
  }, []);

  return (
    <>
    <header ref={ref} className={`hx-nav${scrolled ? " is-scrolled" : ""}${open ? " is-open" : ""}`}>
      <div className="hx-nav-bar">
        <a className="hx-brand" href="/" aria-label="Techno AI home">
          <span className="hx-logo" aria-hidden="true" />
          <span className="hx-brand-sep" aria-hidden="true" />
          <span className="hx-brand-name">Techno AI</span>
        </a>

        <nav className="hx-menu" aria-label="Main">
          {items.map((it) => (
            <div className="hx-menu-item" key={it.label}>
              <a href={it.href} className="hx-menu-link">
                {it.label}
                <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" /></svg>
              </a>
              <div className="hx-drop">
                {it.links.map(([l, h]) => (
                  <a key={h + l} href={h}>{l}</a>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <a className="hx-btn hx-btn-primary hx-nav-cta hx-gloss" href="/request-a-quote/" data-stringy>
          Start a Project
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M11 5l5 5-5 5" /></svg>
        </a>

        {/* same menu icon as the live technoai.ae header: dark glass box, two long lines + a short one */}
        <ThemeToggle />
        <button className="hx-burger" aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}>
          {open ? (
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /></svg>
          ) : (
            <svg viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" clipRule="evenodd" fill="currentColor" d="m9 15c0-.5523.44772-1 1-1h6c.5523 0 1 .4477 1 1s-.4477 1-1 1h-6c-.55228 0-1-.4477-1-1zm-6-10c0-.55229.44771-1 1-1h12c.5523 0 1 .44771 1 1 0 .55228-.4477 1-1 1h-12c-.55229 0-1-.44772-1-1zm0 5c0-.55228.44771-1 1-1h12c.5523 0 1 .44772 1 1 0 .5523-.4477 1-1 1h-12c-.55229 0-1-.4477-1-1z" /></svg>
          )}
        </button>
      </div>

      <div className="hx-mobile" hidden onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
        {items.map((it) => (
          <details key={it.label}>
            <summary>{it.label}</summary>
            {it.links.map(([l, h]) => (
              <a key={h + l} href={h}>{l}</a>
            ))}
          </details>
        ))}
        <a className="hx-btn hx-btn-primary" href="/request-a-quote/">Start a Project</a>
      </div>
    </header>
    {/* outside the header: the header has a transform, which would trap a fixed overlay inside it */}
    {open && <FullMenu onClose={() => setOpen(false)} />}
    </>
  );
}
