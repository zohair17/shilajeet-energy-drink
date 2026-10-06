"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useIsMobile from "./useIsMobile";

const BENEFITS = [
  "Boost Vitality",
  "Raises Energy",
  "Enhances Strength",
  "Primal Endurance",
  "Pumps & Hydration",
];

// Right-column text section. The shared can morphs into the left-column slot
// owned by this section; the right column hosts the heading and the
// staggered benefits list that slides out from behind the can.
export default function BenefitsSection({ sectionRef, slotRef }) {
  const headingRef = useRef(null);
  const tagsContainerRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!sectionRef?.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Unified timeline: "PRIMAL POWER" + the five benefit tags share one
      // ScrollTrigger window so they reveal in sync once the morphing can has
      // nearly settled into the left slot.
      //
      // Timing rationale: the LandingExperience can-morph runs across
      // [sectionTop - morphIn*vh, sectionTop - morphOut*vh]. `start: "top 25%"`
      // lands near the end of that window, so the can is already anchored when
      // the heading wipes in from the right and the tags slide out from behind
      // it. Phones start a touch earlier because the stacked layout puts the
      // heading above the can rather than beside it.
      //
      // Travel distances are viewport-relative on mobile: a fixed 280px/360px
      // slide is most of a phone screen, which both reads as a lurch and pushes
      // the elements far enough out that the clipped section shows empty space.
      const headingTravel = isMobile ? 120 : 280;
      const tagTravel = isMobile ? -160 : -360;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: isMobile ? "top 45%" : "top 25%",
          end: isMobile ? "top -15%" : "top -25%",
          scrub: 1,
        },
      });

      // Heading: slide-reveal from the right + subtle scale-up. power3.out
      // gives the wipe a confident finish.
      tl.fromTo(
        headingRef.current,
        { x: headingTravel, opacity: 0, scale: 0.9 },
        { x: 0, opacity: 1, scale: 1, ease: "power3.out" }
      );

      // Tags follow with a small lead (< 0.1) so they begin emerging just
      // after the heading anchors, then cascade via stagger.
      const tags = tagsContainerRef.current.querySelectorAll(".benefit-tag");
      tl.fromTo(
        tags,
        { x: tagTravel, opacity: 0 },
        { x: 0, opacity: 1, stagger: isMobile ? 0.12 : 0.18, ease: "power2.out" },
        "<0.1"
      );
    });

    return () => ctx.revert();
  }, [sectionRef, isMobile]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-[100svh] md:min-h-screen overflow-hidden z-10"
    >
      <div className="relative mx-auto max-w-[1320px] px-5 md:px-12 lg:px-16 py-16 md:py-28 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12 lg:gap-8 items-center min-h-[100svh] md:min-h-screen">
        {/* LEFT COLUMN — anchor slot for the morphing can */}
        <div className="relative w-full h-[46svh] min-h-[300px] md:h-[60vh] md:min-h-[460px] lg:h-[78vh] flex items-center justify-center order-2 lg:order-1">
          <div
            ref={slotRef}
            aria-hidden="true"
            className="w-[min(380px,80%)] h-full"
          />
        </div>

        {/* RIGHT COLUMN — heading + benefits list (rendered behind the can z-wise) */}
        <div className="relative flex flex-col gap-5 md:gap-10 order-1 lg:order-2 lg:pl-4 z-0">
          <h2
            ref={headingRef}
            className="font-black uppercase text-white leading-[0.95] tracking-[-0.02em] text-right text-[clamp(38px,11vw,58px)] md:text-[clamp(48px,7vw,108px)]"
            style={{
              textShadow: "0 6px 30px rgba(0,0,0,0.35)",
              willChange: "transform, opacity",
            }}
          >
            PRIMAL
            <br />
            POWER
          </h2>

          <div
            ref={tagsContainerRef}
            className="flex flex-col gap-3 md:gap-5 items-end"
          >
            {BENEFITS.map((label, i) => (
              <div
                key={label}
                className="benefit-tag font-semibold text-white tracking-tight text-right whitespace-nowrap text-[clamp(16px,4.6vw,22px)] md:text-[clamp(18px,2.2vw,32px)]"
                style={{
                  // The staircase indent is a desktop flourish; at phone width
                  // it would eat the right margin the tags are aligned to.
                  paddingRight: `${i * (isMobile ? 5 : 14)}px`,
                  textShadow: "0 4px 20px rgba(0,0,0,0.4)",
                  willChange: "transform, opacity",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
