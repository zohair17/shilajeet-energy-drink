"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useIsCompact } from "./useIsMobile";
import { experience } from "./experience/store";

const BENEFITS = [
  "Boost Vitality",
  "Raises Energy",
  "Enhances Strength",
  "Primal Endurance",
  "Pumps & Hydration",
];

// The selected can comes down to the middle of the screen as this section
// scrolls in, with its copy on the left. The section then pins: the left copy
// leaves, the can turns a full 360° (in 3D, see experience/Scene) and the
// benefits arrive on the right. Progress is handed to the scene through
// `experience.scroll`.
export default function ShowcaseSection() {
  const sectionRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const compact = useIsCompact();

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    gsap.registerPlugin(ScrollTrigger);
    const S = experience.scroll;

    const ctx = gsap.context(() => {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            // Refreshed before the sections below, which sit under its pin.
            refreshPriority: 2,
            start: "top bottom",
            end: "top top",
            scrub: true,
            onUpdate: (self) => {
              S.heroOut = self.progress;
            },
            onRefresh: (self) => {
              S.heroOut = self.progress;
            },
          },
        })
        .fromTo(
          leftRef.current.children,
          { autoAlpha: 0, y: compact ? 30 : 60 },
          { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.3, ease: "power2.out" },
          0.55
        );

      const heading = rightRef.current.querySelector("h2");
      const tags = rightRef.current.querySelectorAll(".benefit-tag");
      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            refreshPriority: 2,
            start: "top top",
            end: compact ? "+=170%" : "+=220%",
            pin: true,
            scrub: true,
            anticipatePin: 1,
            onUpdate: (self) => {
              S.showcase = self.progress;
            },
            onRefresh: (self) => {
              S.showcase = self.progress;
            },
          },
        })
        .to(leftRef.current, { autoAlpha: 0, x: compact ? 0 : -90, y: compact ? -30 : 0, duration: 0.16, ease: "power2.in" }, 0.26)
        .fromTo(
          heading,
          { autoAlpha: 0, x: compact ? 0 : 140, y: compact ? 30 : 0, scale: 0.92 },
          { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.18, ease: "power3.out" },
          0.44
        )
        .fromTo(
          tags,
          { autoAlpha: 0, x: compact ? 40 : 110 },
          { autoAlpha: 1, x: 0, stagger: 0.035, duration: 0.14, ease: "power2.out" },
          0.5
        )
        .set({}, {}, 1);
    }, section);

    return () => ctx.revert();
  }, [compact]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-[100svh] md:h-screen overflow-hidden z-10"
    >
      <div className="relative mx-auto max-w-[1320px] h-full px-5 md:px-12 lg:px-16">
        {/* LEFT — sits beside the can on desktop, above it on phones. */}
        <div
          ref={leftRef}
          className="absolute left-5 right-5 top-[11svh] md:left-12 md:right-12 lg:left-16 lg:right-[calc(50%+130px)] lg:top-1/2 lg:-translate-y-1/2"
        >
          <h2
            className="font-black uppercase text-white leading-[0.95] tracking-[-0.02em] text-[clamp(28px,8vw,40px)] md:text-5xl lg:text-[clamp(38px,5.2vw,84px)]"
            style={{ textShadow: "0 6px 30px rgba(0,0,0,0.35)" }}
          >
            UNLEASH THE
            <br />
            ANCIENT POWER.
          </h2>
          <p className="mt-4 lg:mt-8 text-white/85 text-[14px] md:text-base lg:text-lg leading-relaxed max-w-[440px] line-clamp-3 lg:line-clamp-none">
            Shilajit Energy Pre-Workout is the ultimate natural powerhouse.
            Packed with 85+ essential minerals from pure Himalayan Shilajit,
            charged with premium performance blends, and finished with a sharp
            fruit burst. No synthetic jitters. Just raw, primal endurance.
          </p>
          <div className="mt-10 hidden lg:flex flex-wrap items-center gap-3">
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

        {/* RIGHT — arrives while the can turns; below it on phones. */}
        <div
          ref={rightRef}
          className="absolute left-5 right-5 bottom-[7svh] md:left-12 md:right-12 lg:bottom-auto lg:left-auto lg:right-16 lg:top-1/2 lg:-translate-y-1/2 flex flex-col items-end gap-3 lg:gap-8"
        >
          <h2
            className="font-black uppercase text-white leading-[0.95] tracking-[-0.02em] text-right text-[clamp(32px,9vw,46px)] md:text-5xl lg:text-[clamp(48px,6.6vw,104px)]"
            style={{ textShadow: "0 6px 30px rgba(0,0,0,0.35)" }}
          >
            PRIMAL
            <br />
            POWER
          </h2>
          <ul className="flex flex-wrap justify-end gap-x-4 gap-y-1.5 lg:flex-col lg:items-end lg:gap-4">
            {BENEFITS.map((label, i) => (
              <li
                key={label}
                className="benefit-tag font-semibold text-white tracking-tight text-right whitespace-nowrap text-[15px] md:text-lg lg:text-[clamp(18px,2vw,30px)]"
                style={{
                  paddingRight: compact ? 0 : `${i * 14}px`,
                  textShadow: "0 4px 20px rgba(0,0,0,0.4)",
                }}
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
