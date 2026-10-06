"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useIsMobile from "./useIsMobile";

const ING = "/asset/Ingredients";

// Three ingredient images begin stacked at center, then spread into a row as
// the pinned section is scrubbed; afterwards the caption fades up beneath them.
// Order left → center → right: Ancient Ingredients ring, Shilajit box, Zam Zam.
const CARDS = [
  { src: `${ING}/ing%202.webp`, slot: -1 },
  { src: `${ING}/ing%201.webp`, slot: 0 },
  { src: `${ING}/ing%203.webp`, slot: 1 },
];

// Resting rotation of each card while stacked, for a hand-dealt look.
const STACK_ROTATE = [-6, 0, 6];

export default function IngredientsSection() {
  const sectionRef = useRef(null);
  const cardRefs = useRef([]);
  const captionRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!sectionRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const cards = cardRefs.current.filter(Boolean);

      // Horizontal spread distance between adjacent cards, recomputed on every
      // refresh/resize so the row stays centered and edge-safe.
      //
      // The row is three cards wide, so the outer pair sits at +/-gap: the span
      // is 2*gap + cardW and it has to clear the viewport. The mobile ceiling
      // is tightened to 31vw (and the breathing room between cards cut to 2vw)
      // because the desktop 32vw cap would push the outer two off a phone.
      const gap = () => {
        const el = cards[0];
        const cardW = el ? el.offsetWidth : 320;
        const vw = window.innerWidth;
        return isMobile
          ? Math.min(cardW + 0.02 * vw, vw * 0.31)
          : Math.min(cardW + 0.04 * vw, vw * 0.32);
      };

      // Stacked starting state.
      cards.forEach((el, i) => {
        gsap.set(el, { x: 0, y: 0, rotate: STACK_ROTATE[i], zIndex: i });
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: isMobile ? "+=120%" : "+=160%",
          pin: true,
          pinSpacing: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // Spread the stack into a horizontal row (all simultaneously).
      cards.forEach((el, i) => {
        const slot = CARDS[i].slot;
        tl.to(
          el,
          { x: () => slot * gap(), y: 0, rotate: 0, ease: "power3.inOut" },
          0
        );
      });

      // Caption reveals once the cards have settled.
      tl.from(
        captionRef.current,
        { y: isMobile ? 24 : 36, opacity: 0, ease: "power3.out" },
        ">-0.1"
      );
    });

    return () => ctx.revert();
  }, [isMobile]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-[100svh] min-h-[560px] md:h-screen md:min-h-[680px] overflow-hidden z-10"
    >
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        {/* TITLE */}
        <h2
          className="absolute top-[10svh] md:top-[12vh] left-1/2 -translate-x-1/2 font-black text-white tracking-[-0.01em] text-center text-[clamp(28px,8vw,40px)] md:text-[clamp(34px,5vw,72px)]"
          style={{ textShadow: "0 6px 30px rgba(0,0,0,0.35)" }}
        >
          Ingredients
        </h2>

        {/* CARD STACK → ROW — absolutely centered; GSAP drives x/rotate. */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {CARDS.map((c, i) => (
            <div
              key={i}
              ref={(el) => (cardRefs.current[i] = el)}
              className="absolute rounded-2xl overflow-hidden w-[clamp(84px,27vw,130px)] h-[clamp(84px,27vw,130px)] md:w-[clamp(180px,19vw,280px)] md:h-[clamp(180px,19vw,280px)]"
              style={{
                boxShadow: "0 30px 60px rgba(0,0,0,0.45)",
                border: "1px solid rgba(255,255,255,0.14)",
                willChange: "transform",
              }}
            >
              <Image
                src={c.src}
                alt=""
                fill
                sizes="(max-width: 767px) 130px, 280px"
                draggable={false}
                style={{ objectFit: "cover" }}
              />
            </div>
          ))}
        </div>

        {/* CAPTION — revealed beneath the row once cards settle. */}
        <p
          ref={captionRef}
          className="absolute bottom-[12svh] md:bottom-[14vh] left-1/2 -translate-x-1/2 w-full max-w-[640px] px-6 text-center text-white/90 leading-relaxed text-[clamp(14px,4vw,17px)] md:text-[clamp(15px,1.5vw,20px)]"
          style={{ textShadow: "0 2px 16px rgba(0,0,0,0.45)" }}
        >
          The combination of these legendary ingredients creates a blend that
          transcends ordinary energy drinks.
        </p>
      </div>
    </section>
  );
}
