"use client";

import { useEffect, useState } from "react";
import FlightScene from "./flight-scene";

// Mounts the scroll-flight drone (flight-scene.tsx).
// Skipped for users who prefer reduced motion.
export default function Flight() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    setMounted(true);
  }, []);
  return mounted ? <FlightScene /> : null;
}
