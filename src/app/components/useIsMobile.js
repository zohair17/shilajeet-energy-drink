"use client";

import { useSyncExternalStore } from "react";

// Single source of truth for the mobile breakpoint. It matches Tailwind's `md`
// boundary (768px) so the JS-driven GSAP/framer animations branch on exactly
// the same line as the `max-md:` utility classes used for layout.
export const MOBILE_QUERY = "(max-width: 767px)";

// Below Tailwind's `lg`, or any tall screen, the scroll sections stack their
// copy above and below the can instead of beside it. The 3D scene uses the
// same rule (experience/motion.js `compact`).
export const COMPACT_QUERY = "(max-width: 1023px), (max-aspect-ratio: 17/20)";

// `false` on the server and during hydration, so SSR emits the desktop tree;
// React then re-renders with the real value. Consumers keep the result in
// their effect deps so timelines rebuild when it changes.
function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

export default function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY);
}

export function useIsCompact() {
  return useMediaQuery(COMPACT_QUERY);
}
