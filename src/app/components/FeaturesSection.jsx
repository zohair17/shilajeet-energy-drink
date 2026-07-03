"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Pure layout/content section. The active can image and the background gradient
// are owned by LandingExperience — this section only renders text content and
// reserves a target slot that the parent's morphing can lands into via scroll.
export default function FeaturesSection({ sectionRef, slotRef }) {
  const textRef = useRef(null);
  const headingRef = useRef(null);
  const paragraphRef = useRef(null);
  const buttonsRef = useRef(null);

  useEffect(() => {
    if (!sectionRef?.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Single timeline tied to the section's scroll window so the heading,
      // paragraph, and CTAs cascade with one synchronized scrub. Each step
      // runs the same fade-and-rise per the spec (y:40 → 0, opacity 0 → 1,
      // power3.out) and is positioned with "<0.2" to overlap with the prior
      // item rather than waiting for it to finish — the result is a smooth
      // cascade rather than a sequential pop.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
          end: "top 30%",
          scrub: 1,
        },
      });

      if (headingRef.current) {
        tl.from(headingRef.current, {
          y: 40,
          opacity: 0,
          ease: "power3.out",
        });
      }
      if (paragraphRef.current) {
        tl.from(
          paragraphRef.current,
          { y: 40, opacity: 0, ease: "power3.out" },
          "<0.2"
        );
      }
      if (buttonsRef.current) {
        tl.from(
          buttonsRef.current,
          { y: 40, opacity: 0, ease: "power3.out" },
          "<0.2"
        );
      }
    });

    return () => ctx.revert();
  }, [sectionRef]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-screen overflow-hidden z-10"
    >
      <div className="relative mx-auto max-w-[1320px] px-6 md:px-12 lg:px-16 py-24 md:py-28 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center min-h-screen">
        <div
          ref={textRef}
          className="flex flex-col justify-center max-w-[560px]"
        >
          <h2
            ref={headingRef}
            className="font-black uppercase text-white leading-[0.95] tracking-[-0.02em]"
            style={{
              fontSize: "clamp(40px, 6.4vw, 88px)",
              textShadow: "0 6px 30px rgba(0,0,0,0.35)",
              willChange: "transform, opacity",
            }}
          >
            UNLEASH THE
            <br />
            ANCIENT POWER.
          </h2>
          <p
            ref={paragraphRef}
            className="mt-7 md:mt-9 text-white/85 text-base md:text-lg leading-relaxed max-w-[460px]"
            style={{ willChange: "transform, opacity" }}
          >
            Shilajit Energy Pre-Workout is the ultimate natural powerhouse.
            Packed with 85+ essential minerals from pure Himalayan Shilajit,
            charged with premium performance blends, and finished with a sharp
            fruit burst. No synthetic jitters. Just raw, primal endurance.
          </p>
          <div
            ref={buttonsRef}
            className="mt-9 md:mt-11 flex flex-wrap items-center gap-3"
            style={{ willChange: "transform, opacity" }}
          >
            <button
              type="button"
              className="px-7 py-3.5 rounded-full bg-white text-black text-sm font-bold tracking-tight transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95"
            >
              Shop Now
            </button>
            <button
              type="button"
              className="px-7 py-3.5 rounded-full text-white text-sm font-bold tracking-tight transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.3)",
                backdropFilter: "blur(8px)",
              }}
            >
              Learn More
            </button>
          </div>
        </div>

        {/* TARGET SLOT — invisible placeholder. The shared can in the parent uses
            slotRef.getBoundingClientRect() to find this anchor and morphs onto it. */}
        <div className="relative w-full h-[60vh] min-h-[460px] lg:h-[78vh] flex items-center justify-center">
          <div
            ref={slotRef}
            aria-hidden="true"
            className="w-[min(380px,80%)] h-full"
          />
        </div>
      </div>
    </section>
  );
}
