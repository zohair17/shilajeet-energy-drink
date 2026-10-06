"use client";

import { useEffect, useState } from "react";

// Single source of truth for the mobile breakpoint. It matches Tailwind's `md`
// boundary (768px) so the JS-driven GSAP/framer animations branch on exactly
// the same line as the `max-md:` utility classes used for layout.
export const MOBILE_QUERY = "(max-width: 767px)";

export default function useIsMobile() {
  // Starts `false` so SSR and the first client render emit the untouched
  // desktop tree — the effect flips it before any timeline is built, and every
  // consumer keeps `isMobile` in its effect deps so the timelines rebuild.
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isMobile;
}
