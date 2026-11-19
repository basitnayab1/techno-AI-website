"use client";

import { useEffect, useState } from "react";
import "./theme.css";
import { applyTheme, readTheme } from "../theme-preference";

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const theme = readTheme();
    applyTheme(theme);
    setDark(theme === "dark");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    applyTheme(next ? "dark" : "light", true);
  };

  return <button type="button" className="theme-toggle" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} aria-pressed={dark} title={dark ? "Light mode" : "Dark mode"}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      {dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" /></> : <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" />}
    </svg>
  </button>;
}
