"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FLAVORS } from "./Hero";
import useIsMobile from "./useIsMobile";

const PRICE = "Rs. 10,200.00";

// Display names per flavor id. Products are derived from FLAVORS so their order
// (and therefore each card index) matches the hero `active` index — that is
// what lets the shared morphing can land in the slot of the selected flavor.
const NAMES = {
  "kiwi-lemon": "Kiwi Lemon",
  "orange-peach": "Orange Peach Zamzam",
  "pineapple-guava": "Pineapple Guava",
  strawberry: "Strawberry",
  "pre-workout-orange-peach": "Pre-Workout Supplement",
};

const PRODUCTS = FLAVORS.map((f) => ({
  id: f.id,
  name: NAMES[f.id] ?? f.name,
  img: f.can,
}));

// Pure layout/content section — transparent so the global gradient background
// (the same one shown behind the Features and Benefits sections) reads through.
//
// The card whose index === activeIndex is the landing slot for the shared can
// (owned by LandingExperience); it renders an empty placeholder carrying
// `slotRef`. Every other card renders its own static bottle.
export default function ShopNowSection({ sectionRef, slotRef, activeIndex = 0 }) {
  const headingRef = useRef(null);
  const gridRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!sectionRef?.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          // Starts once the shared can has nearly finished dropping into its
          // menu slot, so the siblings + text cascade in afterward. The grid is
          // taller relative to the viewport on phones, so the reveal is pulled
          // earlier there or the last row would already be past the fold.
          start: isMobile ? "top 65%" : "top 45%",
          end: isMobile ? "top -20%" : "top -10%",
          scrub: 1,
        },
      });

      const rise = isMobile ? 24 : 40;

      tl.from(headingRef.current, { y: rise, opacity: 0, ease: "power3.out" });

      // Other bottles appear first...
      const imgs = gridRef.current.querySelectorAll(".shop-img");
      tl.from(
        imgs,
        {
          y: rise,
          opacity: 0,
          scale: 0.8,
          stagger: isMobile ? 0.08 : 0.12,
          ease: "power3.out",
        },
        "<0.15"
      );

      // ...then every card text + button fades up.
      const infos = gridRef.current.querySelectorAll(".shop-info");
      tl.from(
        infos,
        {
          y: isMobile ? 16 : 24,
          opacity: 0,
          stagger: isMobile ? 0.06 : 0.08,
          ease: "power2.out",
        },
        "<0.25"
      );
    });

    return () => ctx.revert();
    // Rebuilt when the landing slot moves to a different card so the reveal
    // animation always targets the correct (non-slot) bottles.
  }, [sectionRef, activeIndex, isMobile]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-[100svh] md:min-h-screen overflow-hidden z-10"
    >
      <h2>Contact Form</h2>
      <div>
        <form>
          <input type="text" placeholder="Name" />
          <input type="email" placeholder="Email" />
          <input type="mobile" placeholder="Mobile" />
          <textarea placeholder="Message" />
          <button type="submit">Submit</button>
        </form>
      </div>
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
            cards would run several screens long, and the shared can only parks
            correctly while its card is on screen. */}
        <div
          ref={gridRef}
          className="mt-10 md:mt-20 grid grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-8 gap-y-10 md:gap-y-16"
        >
          {PRODUCTS.map((p, i) => {
            const isSlot = i === activeIndex;
            return (
              <div key={p.id} className="flex flex-col items-center text-center">
                {/* Image area — fixed height so the shared can can fit itself
                    to the slot, and so every card aligns on a baseline. */}
                <div className="relative w-full h-[150px] md:h-[220px] flex items-center justify-center">
                  {isSlot ? (
                    <div
                      ref={slotRef}
                      aria-hidden="true"
                      className="w-[86px] md:w-[120px] h-full"
                    />
                  ) : (
                    <div
                      className="shop-img relative w-[92px] md:w-[130px] h-full"
                      style={{ willChange: "transform, opacity" }}
                    >
                      <Image
                        src={p.img}
                        alt={p.name}
                        fill
                        sizes="(max-width: 767px) 100px, 160px"
                        draggable={false}
                        style={{
                          objectFit: "contain",
                          filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.5))",
                        }}
                      />
                    </div>
                  )}
                </div>

                <div
                  className="shop-info mt-4 md:mt-5 flex flex-col items-center"
                  style={{ willChange: "transform, opacity" }}
                >
                  <h3 className="text-white/90 text-[14px] md:text-lg font-semibold tracking-tight">
                    {p.name}
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
            );
          })}
        </div>
      </div>
    </section>
  );
}
