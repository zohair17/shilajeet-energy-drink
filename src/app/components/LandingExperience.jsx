"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Hero, { FLAVORS, canBoxFor } from "./Hero";
import FeaturesSection from "./FeaturesSection";
import BenefitsSection from "./BenefitsSection";
import ShopNowSection from "./ShopNowSection";
import AboutProductSection from "./AboutProductSection";
import IngredientsSection from "./IngredientsSection";
import VideoSection from "./VideoSection";
import Footer from "./Footer";
import useIsMobile from "./useIsMobile";

const DARK = "#12130F";

const gradientFor = (f) =>
  `radial-gradient(120% 85% at 50% -5%, ${f.bg[0]} 0%, ${f.bg[0]}d9 22%, ${f.bg[1]} 72%)`;

// Per-device tuning of the shared can journey.
//   morphIn / morphOut  — how far above a section top (in viewport heights) the
//                         morph starts and finishes.
//   tilt                — peak rotation, softened on phones where the can is
//                         proportionally wider and a 12deg tilt reads as a lean.
//   travelScale         — size while parked in the features/benefits slots.
// Phones stack the two-column sections, so the can has further to travel and a
// wider window keeps the movement from feeling like a snap.
const JOURNEY = {
  desktop: { morphIn: 0.6, morphOut: 0.1, tilt: 12, travelScale: 0.88 },
  mobile: { morphIn: 0.85, morphOut: 0.22, tilt: 7, travelScale: 0.82 },
};

export default function LandingExperience() {
  const [active, setActive] = useState(1);
  const flavor = FLAVORS[active];
  const isMobile = useIsMobile();
  const canBox = canBoxFor(isMobile);

  // Direction tracking for the shared can slide-in. Computed during render so
  // AnimatePresence reads the correct value the same tick the key changes —
  // otherwise the incoming can would flash at its destination before the slide.
  const prevActiveRef = useRef(active);
  const directionRef = useRef(1);
  if (prevActiveRef.current !== active) {
    const total = FLAVORS.length;
    const forward = (active - prevActiveRef.current + total) % total;
    const backward = (prevActiveRef.current - active + total) % total;
    directionRef.current = forward <= backward ? 1 : -1;
    prevActiveRef.current = active;
  }
  const direction = directionRef.current;

  const wrapperRef = useRef(null);
  const canRef = useRef(null);

  const featuresSectionRef = useRef(null);
  const featuresSlotRef = useRef(null);

  const benefitsSectionRef = useRef(null);
  const benefitsSlotRef = useRef(null);

  const shopSectionRef = useRef(null);
  const shopSlotRef = useRef(null);

  // Centering transform — applied once. From here on, GSAP only mutates x/y/rotate/scale.
  useLayoutEffect(() => {
    if (!canRef.current) return;
    gsap.set(canRef.current, {
      xPercent: -50,
      yPercent: -50,
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      transformOrigin: "50% 50%",
    });
  }, []);

  // Mobile browsers fire a resize every time the URL bar collapses or expands.
  // Left alone that re-measures every pinned trigger mid-scroll and makes the
  // pinned sections jump, so ScrollTrigger is told to ignore those, and a real
  // layout change (rotation, breakpoint crossing) refreshes explicitly instead.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("orientationchange", refresh);
    return () => window.removeEventListener("orientationchange", refresh);
  }, []);

  // Sizes, tilts, and morph windows all change at the breakpoint, so the whole
  // journey is re-measured once `isMobile` settles.
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [isMobile]);

  // Unified master timeline — one ScrollTrigger drives the can entire journey
  // across all three sections. Phases:
  //   A. Hero        → can at viewport center, no tilt
  //   B. Features-in → lerp center → features slot, rotate 0 → -tilt, scale down
  //   C. Features    → stick to features slot (tracks it as it scrolls)
  //   D. Benefits-in → lerp features slot → benefits slot, rotate -tilt → +tilt
  //   E. Benefits    → stick to benefits slot
  //   F. Shop-in     → drop benefits slot → shop menu slot, rotate +tilt → 0,
  //                    scale down to fit the small product-card slot
  //   G. Shop        → stick to the first menu slot
  //
  // Every anchor is read live from getBoundingClientRect, so the same code
  // drives the two-column desktop layout and the stacked mobile one — only the
  // window widths, tilt, and travel scale come from JOURNEY.
  useEffect(() => {
    if (!canRef.current || !wrapperRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const { morphIn, morphOut, tilt, travelScale } = isMobile
      ? JOURNEY.mobile
      : JOURNEY.desktop;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: wrapperRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const canEl = canRef.current;
          const fSection = featuresSectionRef.current;
          const bSection = benefitsSectionRef.current;
          const sSection = shopSectionRef.current;
          const fSlot = featuresSlotRef.current;
          const bSlot = benefitsSlotRef.current;
          const sSlot = shopSlotRef.current;
          if (!canEl || !fSection || !bSection || !sSection || !fSlot || !bSlot || !sSlot) return;

          const scrollY = self.scroll();
          const vh = window.innerHeight;
          const vw = window.innerWidth;
          const vpCenterX = vw / 2;
          const vpCenterY = vh / 2;

          const fTop = fSection.offsetTop;
          const bTop = bSection.offsetTop;
          const sTop = sSection.offsetTop;

          // Morph windows
          const fStart = fTop - morphIn * vh;
          const fEnd = fTop - morphOut * vh;
          const bStart = bTop - morphIn * vh;
          const bEnd = bTop - morphOut * vh;
          const sStart = sTop - morphIn * vh;
          const sEnd = sTop - morphOut * vh;

          // Live slot positions
          const fRect = fSlot.getBoundingClientRect();
          const bRect = bSlot.getBoundingClientRect();
          const sRect = sSlot.getBoundingClientRect();
          const fX = fRect.left + fRect.width / 2 - vpCenterX;
          const fY = fRect.top + fRect.height / 2 - vpCenterY;
          const bX = bRect.left + bRect.width / 2 - vpCenterX;
          const bY = bRect.top + bRect.height / 2 - vpCenterY;
          const sX = sRect.left + sRect.width / 2 - vpCenterX;
          const sY = sRect.top + sRect.height / 2 - vpCenterY;

          // Scale that shrinks the full-size can down to the small product-card
          // slot, derived live from the slot rendered height.
          const canH = canEl.offsetHeight || 1;
          const sScale = sRect.height / canH;

          let x, y, rotate, scale;

          if (scrollY < fStart) {
            // Phase A
            x = 0; y = 0; rotate = 0; scale = 1;
          } else if (scrollY < fEnd) {
            // Phase B
            const p = (scrollY - fStart) / (fEnd - fStart);
            x = fX * p;
            y = fY * p;
            rotate = -tilt * p;
            scale = 1 - (1 - travelScale) * p;
          } else if (scrollY < bStart) {
            // Phase C
            x = fX; y = fY; rotate = -tilt; scale = travelScale;
          } else if (scrollY < bEnd) {
            // Phase D — slot positions are live, so this also tracks the scroll
            const p = (scrollY - bStart) / (bEnd - bStart);
            x = fX + (bX - fX) * p;
            y = fY + (bY - fY) * p;
            rotate = -tilt + 2 * tilt * p;
            scale = travelScale;
          } else if (scrollY < sStart) {
            // Phase E
            x = bX; y = bY; rotate = tilt; scale = travelScale;
          } else if (scrollY < sEnd) {
            // Phase F — drop from benefits slot into the first menu slot
            const p = (scrollY - sStart) / (sEnd - sStart);
            x = bX + (sX - bX) * p;
            y = bY + (sY - bY) * p;
            rotate = tilt - tilt * p;
            scale = travelScale + (sScale - travelScale) * p;
          } else {
            // Phase G — parked as the first product in the menu grid
            x = sX; y = sY; rotate = 0; scale = sScale;
          }

          gsap.set(canEl, { x, y, rotate, scale });
        },
      });
    });

    return () => ctx.revert();
  }, [isMobile]);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full isolate"
      style={{ backgroundColor: DARK }}
    >
      {/* GLOBAL DYNAMIC BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {FLAVORS.map((f) => (
          <motion.div
            key={f.id}
            initial={false}
            animate={{ opacity: f.id === flavor.id ? 1 : 0 }}
            transition={{ duration: 0.9, ease: [0.32, 0.72, 0.32, 1] }}
            className="absolute inset-0"
            style={{ backgroundImage: gradientFor(f) }}
          />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_120%,rgba(0,0,0,0.55),transparent_70%)]" />
        <div className="absolute inset-0 mix-blend-overlay opacity-[0.07] [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:3px_3px]" />
      </div>

      {/* SECTIONS — transparent; visual continuity via global bg + shared can */}
      <Hero active={active} setActive={setActive} />
      <FeaturesSection
        sectionRef={featuresSectionRef}
        slotRef={featuresSlotRef}
      />
      <BenefitsSection
        sectionRef={benefitsSectionRef}
        slotRef={benefitsSlotRef}
      />
      <ShopNowSection
        sectionRef={shopSectionRef}
        slotRef={shopSlotRef}
        activeIndex={active}
      />
      <AboutProductSection />
      <IngredientsSection />
      <VideoSection mode="pin" />
      <Footer accent={flavor.bg[0]} />

      {/* SHARED MORPHING CAN — single DOM element shared across all sections.
          Its box matches the hero carousel slot box exactly (see CAN_BOX in
          Hero) so the hand-off between the two is seamless at any width. */}
      <div
        ref={canRef}
        className="fixed top-1/2 left-1/2 z-[25] pointer-events-none"
        style={{
          width: canBox.width,
          height: canBox.height,
          willChange: "transform",
        }}
      >
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={flavor.id}
            custom={direction}
            variants={{
              enter: (dir) => ({ opacity: 0, x: dir > 0 ? "150%" : "-150%" }),
              center: { opacity: 1, x: "0%" },
              exit: { opacity: 0, x: "0%" },
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { duration: 0.95, ease: [0.22, 0.61, 0.36, 1] },
              opacity: { duration: 0.55, ease: [0.22, 0.61, 0.36, 1] },
            }}
            className="absolute inset-0"
          >
            <Image
              src={flavor.can}
              alt={flavor.name}
              fill
              priority
              sizes="(max-width: 767px) 68vw, 460px"
              draggable={false}
              style={{
                objectFit: "contain",
                filter: "drop-shadow(0 40px 60px rgba(0,0,0,0.55))",
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
