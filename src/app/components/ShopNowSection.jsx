"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FLAVORS } from "./flavors";
import useIsMobile from "./useIsMobile";
import { experience } from "./experience/store";

const PRICE = "Rs. 10,200.00";

// Product grid. Every card has an empty slot that its 3D can is fitted into
// (experience/Scene): the selected flavor's can flies in from the glass, the
// others grow in as the grid arrives, and hovering a card spins its can.
export default function ShopNowSection({ sectionRef }) {
  const headingRef = useRef(null);
  const gridRef = useRef(null);
  const slotRefs = useRef([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    const section = sectionRef?.current;
    const slots = slotRefs.current;
    experience.el.shop = section;
    experience.el.shopSlots = slots;
    return () => {
      if (experience.el.shop === section) experience.el.shop = null;
      if (experience.el.shopSlots === slots) experience.el.shopSlots = [];
    };
  }, [sectionRef]);

  useEffect(() => {
    if (!sectionRef?.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const rise = isMobile ? 24 : 40;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: isMobile ? "top 85%" : "top 75%",
          end: isMobile ? "top 10%" : "top 15%",
          scrub: 1,
        },
      });
      tl.from(headingRef.current, { y: rise, opacity: 0, ease: "power3.out" });
      tl.from(
        gridRef.current.querySelectorAll(".shop-info"),
        { y: isMobile ? 16 : 24, opacity: 0, stagger: isMobile ? 0.06 : 0.08, ease: "power2.out" },
        "<0.35"
      );
    });

    return () => ctx.revert();
  }, [sectionRef, isMobile]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-[100svh] md:min-h-screen overflow-hidden z-10"
    >
      <div className="relative mx-auto max-w-[1320px] px-5 md:px-12 lg:px-16 py-16 md:py-28">
        <h2
          ref={headingRef}
          className="text-center font-black uppercase text-white tracking-[-0.02em] text-[clamp(28px,8vw,40px)] md:text-[clamp(34px,5vw,64px)]"
          style={{
            textShadow: "0 6px 30px rgba(0,0,0,0.35)",
            willChange: "transform, opacity",
          }}
        >
          Products
        </h2>

        {/* Two-up on phones rather than a single column: five stacked full-width
            cards would run several screens long. */}
        <div
          ref={gridRef}
          className="mt-10 md:mt-20 grid grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-8 gap-y-10 md:gap-y-16"
        >
          {FLAVORS.map((f, i) => (
            <div
              key={f.id}
              className="flex flex-col items-center text-center"
              onMouseEnter={() => {
                experience.hovered = i;
              }}
              onMouseLeave={() => {
                if (experience.hovered === i) experience.hovered = -1;
              }}
            >
              {/* Fixed-height slot: the can is fitted to it, and every card
                  aligns on the same baseline. */}
              <div className="relative w-full h-[170px] md:h-[240px] flex items-center justify-center">
                <div
                  ref={(el) => {
                    slotRefs.current[i] = el;
                  }}
                  aria-hidden="true"
                  className="w-[90px] md:w-[124px] h-full"
                />
              </div>

              <div
                className="shop-info mt-4 md:mt-5 flex flex-col items-center"
                style={{ willChange: "transform, opacity" }}
              >
                <h3 className="text-white/90 text-[14px] md:text-lg font-semibold tracking-tight">
                  {f.shopName}
                </h3>
                <p className="mt-1 md:mt-1.5 text-white/75 text-[13px] md:text-[15px]">
                  {PRICE}
                </p>
                <button
                  type="button"
                  className="mt-3 px-4 md:px-5 py-2 rounded-full text-white text-[12px] md:text-[13px] font-semibold tracking-tight transition-all duration-300 hover:scale-105 active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.28)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  Shop Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
