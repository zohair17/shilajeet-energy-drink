"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

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

  useEffect(() => {
    if (!sectionRef?.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Unified timeline: "PRIMAL POWER" + the five benefit tags share one
      // ScrollTrigger window so they reveal in sync once the morphing can has
      // nearly settled into the left slot.
      //
      // Timing rationale: the LandingExperience can-morph runs across
      // [sectionTop - 0.6*vh, sectionTop - 0.1*vh]. `start: "top 25%"` lands at
      // ~75% of that window, so the can is already anchored on the left when
      // the heading wipes in from the right and the tags slide out from
      // behind it.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 25%",
          end: "top -25%",
          scrub: 1,
        },
      });

      // Heading: slide-reveal from the right + subtle scale-up. power3.out
      // gives the wipe a confident finish.
      tl.fromTo(
        headingRef.current,
        { x: 280, opacity: 0, scale: 0.9 },
        { x: 0, opacity: 1, scale: 1, ease: "power3.out" }
      );

      // Tags follow with a small lead (< 0.1) so they begin emerging just
      // after the heading anchors, then cascade via stagger.
      const tags = tagsContainerRef.current.querySelectorAll(".benefit-tag");
      tl.fromTo(
        tags,
        { x: -360, opacity: 0 },
        { x: 0, opacity: 1, stagger: 0.18, ease: "power2.out" },
        "<0.1"
      );
    });

    return () => ctx.revert();
  }, [sectionRef]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-screen overflow-hidden z-10"
    >
      <div className="relative mx-auto max-w-[1320px] px-6 md:px-12 lg:px-16 py-24 md:py-28 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center min-h-screen">
        {/* LEFT COLUMN — anchor slot for the morphing can */}
        <div className="relative w-full h-[60vh] min-h-[460px] lg:h-[78vh] flex items-center justify-center order-2 lg:order-1">
          <div
            ref={slotRef}
            aria-hidden="true"
            className="w-[min(380px,80%)] h-full"
          />
        </div>

        {/* RIGHT COLUMN — heading + benefits list (rendered behind the can z-wise) */}
        <div className="relative flex flex-col gap-7 md:gap-10 order-1 lg:order-2 lg:pl-4 z-0">
          <h2
            ref={headingRef}
            className="font-black uppercase text-white leading-[0.95] tracking-[-0.02em] text-right"
            style={{
              fontSize: "clamp(48px, 7vw, 108px)",
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
            className="flex flex-col gap-4 md:gap-5 items-end"
          >
            {BENEFITS.map((label, i) => (
              <div
                key={label}
                className="benefit-tag font-semibold text-white tracking-tight text-right whitespace-nowrap"
                style={{
                  fontSize: "clamp(18px, 2.2vw, 32px)",
                  paddingRight: `${i * 14}px`,
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
