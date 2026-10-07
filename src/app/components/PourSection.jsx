"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useIsCompact } from "./useIsMobile";
import { experience } from "./experience/store";

// The can comes down beside a glass as this section scrolls in. The section
// then pins while the can tips and pours. The glass, the drink and the stream
// are 3D (experience/Scene); this component holds the copy and the empty
// stage element the glass is lined up with.
export default function PourSection() {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const textRef = useRef(null);
  const outroRef = useRef(null);
  const compact = useIsCompact();

  useEffect(() => {
    const stage = stageRef.current;
    experience.el.glass = stage;
    return () => {
      if (experience.el.glass === stage) experience.el.glass = null;
    };
  }, []);

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
            refreshPriority: 1,
            start: "top bottom",
            end: "top top",
            scrub: true,
            onUpdate: (self) => {
              S.pourIn = self.progress;
            },
            onRefresh: (self) => {
              S.pourIn = self.progress;
            },
          },
        })
        .fromTo(
          // The last line belongs to the pinned timeline below.
          [...textRef.current.children].filter((el) => el !== outroRef.current),
          { autoAlpha: 0, y: compact ? 30 : 60 },
          { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.3, ease: "power2.out" },
          0.55
        );

      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            refreshPriority: 1,
            start: "top top",
            end: compact ? "+=150%" : "+=170%",
            pin: true,
            scrub: true,
            anticipatePin: 1,
            onUpdate: (self) => {
              S.pour = self.progress;
            },
            onRefresh: (self) => {
              S.pour = self.progress;
            },
          },
        })
        .fromTo(
          outroRef.current,
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 0.14, ease: "power2.out" },
          0.62
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
      <div className="relative mx-auto max-w-[1320px] h-full px-5 md:px-12 lg:px-16 lg:grid lg:grid-cols-2 lg:items-center">
        <div
          ref={textRef}
          className="pt-[11svh] lg:pt-0 max-w-[520px]"
        >
          <p className="text-[10px] md:text-xs font-semibold tracking-[0.38em] uppercase text-white/70">
            Pour it cold
          </p>
          <h2
            className="mt-3 font-black uppercase text-white leading-[0.95] tracking-[-0.02em] text-[clamp(30px,8.6vw,44px)] md:text-5xl lg:text-[clamp(44px,5.6vw,88px)]"
            style={{ textShadow: "0 6px 30px rgba(0,0,0,0.35)" }}
          >
            FROM CAN
            <br />
            TO GLASS.
          </h2>
          <p className="mt-4 lg:mt-7 text-white/85 text-[14px] md:text-base lg:text-lg leading-relaxed max-w-[420px]">
            Crack it open and pour it over ice. Himalayan shilajit, Zamzam water
            and saffron, ready the moment you are.
          </p>
          <p
            ref={outroRef}
            className="mt-4 lg:mt-7 font-black uppercase text-white/95 tracking-tight text-xl lg:text-3xl"
          >
            Sip. Rise. Repeat.
          </p>
        </div>

        {/* Stage the 3D glass and can are fitted into. */}
        <div className="absolute inset-x-5 bottom-[4svh] h-[44svh] md:inset-x-12 lg:static lg:h-[72vh]">
          <div ref={stageRef} aria-hidden="true" className="w-full h-full" />
        </div>
      </div>
    </section>
  );
}
