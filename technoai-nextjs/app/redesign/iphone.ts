import { useEffect, useState } from "react";

// Scope these budgets to iPhone browsers, including Chrome and Safari.
export const isIPhone = typeof navigator !== "undefined" && /\biPhone\b/i.test(navigator.userAgent);

export function useIPhone() {
  const [iphone, setIPhone] = useState(false);
  useEffect(() => {
    if (isIPhone) setIPhone(true);
  }, []);
  return iphone;
}
