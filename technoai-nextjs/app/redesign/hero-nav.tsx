"use client";

import { useEffect, useRef, useState } from "react";

type Item = { label: string; href: string; links: [string, string][] };

/** Floating glass navbar of the home hero. Desktop: hover/focus dropdowns. Mobile: slide-down panel. */
export default function HeroNav({ items }: { items: Item[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
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

        <button className="hx-burger" aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}>
          <span />
          <span />
        </button>
      </div>

      <div className="hx-mobile" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
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
  );
}
