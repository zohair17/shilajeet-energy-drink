"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Hero, { FLAVORS } from "./Hero";
import FeaturesSection from "./FeaturesSection";
import BenefitsSection from "./BenefitsSection";
import ShopNowSection from "./ShopNowSection";
import AboutProductSection from "./AboutProductSection";
import IngredientsSection from "./IngredientsSection";
import VideoSection from "./VideoSection";
import Footer from "./Footer";

const DARK = "#12130F";

const gradientFor = (f) =>
  `radial-gradient(120% 85% at 50% -5%, ${f.bg[0]} 0%, ${f.bg[0]}d9 22%, ${f.bg[1]} 72%)`;

export default function LandingExperience() {
  const [active, setActive] = useState(1);
  const flavor = FLAVORS[active];

  // Direction tracking for the shared can's slide-in. Computed during render so
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

  // Unified master timeline — one ScrollTrigger drives the can's entire journey
  // across all three sections. Phases:
  //   A. Hero        → can at viewport center, no tilt
  //   B. Features-in → lerp center → features slot, rotate 0 → -12, scale 1 → 0.88
  //   C. Features    → stick to features slot (tracks it as it scrolls)
  //   D. Benefits-in → lerp features slot → benefits slot, rotate -12 → +12
  //   E. Benefits    → stick to benefits slot
  //   F. Shop-in     → drop benefits slot → shop menu slot, rotate +12 → 0,
  //                    scale down to fit the small product-card slot
  //   G. Shop        → stick to the first menu slot
  useEffect(() => {
    if (!canRef.current || !wrapperRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

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
          const fStart = fTop - 0.6 * vh;
          const fEnd = fTop - 0.1 * vh;
          const bStart = bTop - 0.6 * vh;
          const bEnd = bTop - 0.1 * vh;
          const sStart = sTop - 0.6 * vh;
          const sEnd = sTop - 0.1 * vh;

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
          // slot, derived live from the slot's rendered height.
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
            rotate = -12 * p;
            scale = 1 - 0.12 * p;
          } else if (scrollY < bStart) {
            // Phase C
            x = fX; y = fY; rotate = -12; scale = 0.88;
          } else if (scrollY < bEnd) {
            // Phase D — slot positions are live, so this also tracks the scroll
            const p = (scrollY - bStart) / (bEnd - bStart);
            x = fX + (bX - fX) * p;
            y = fY + (bY - fY) * p;
            rotate = -12 + 24 * p;
            scale = 0.88;
          } else if (scrollY < sStart) {
            // Phase E
            x = bX; y = bY; rotate = 12; scale = 0.88;
          } else if (scrollY < sEnd) {
            // Phase F — drop from benefits slot into the first menu slot
            const p = (scrollY - sStart) / (sEnd - sStart);
            x = bX + (sX - bX) * p;
            y = bY + (sY - bY) * p;
            rotate = 12 - 12 * p;
            scale = 0.88 + (sScale - 0.88) * p;
          } else {
            // Phase G — parked as the first product in the menu grid
            x = sX; y = sY; rotate = 0; scale = sScale;
          }

          gsap.set(canEl, { x, y, rotate, scale });
        },
      });
    });

    return () => ctx.revert();
  }, []);

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

      {/* SHARED MORPHING CAN — single DOM element shared across all sections */}
      <div
        ref={canRef}
        className="fixed top-1/2 left-1/2 z-[25] pointer-events-none"
        style={{
          width: "min(38vw, 460px)",
          height: "min(78vh, 740px)",
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
              sizes="(max-width: 768px) 70vw, 460px"
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
