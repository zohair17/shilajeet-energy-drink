"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FLAVORS } from "./Hero";

const PRICE = "Rs. 10,200.00";

// Display names per flavor id. Products are derived from FLAVORS so their order
// (and therefore each card's index) matches the hero's `active` index — that's
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

  useEffect(() => {
    if (!sectionRef?.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          // Starts once the shared can has nearly finished dropping into its
          // menu slot, so the siblings + text cascade in afterward.
          start: "top 45%",
          end: "top -10%",
          scrub: 1,
        },
      });

      tl.from(headingRef.current, { y: 40, opacity: 0, ease: "power3.out" });

      // Other bottles appear first...
      const imgs = gridRef.current.querySelectorAll(".shop-img");
      tl.from(
        imgs,
        { y: 40, opacity: 0, scale: 0.8, stagger: 0.12, ease: "power3.out" },
        "<0.15"
      );

      // ...then every card's text + button fades up.
      const infos = gridRef.current.querySelectorAll(".shop-info");
      tl.from(
        infos,
        { y: 24, opacity: 0, stagger: 0.08, ease: "power2.out" },
        "<0.25"
      );
    });

    return () => ctx.revert();
    // Rebuilt when the landing slot moves to a different card so the reveal
    // animation always targets the correct (non-slot) bottles.
  }, [sectionRef, activeIndex]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-screen overflow-hidden z-10"
    >
      <div className="relative mx-auto max-w-[1320px] px-6 md:px-12 lg:px-16 py-24 md:py-28">
        <h2
          ref={headingRef}
          className="text-center font-black uppercase text-white tracking-[-0.02em]"
          style={{
            fontSize: "clamp(34px, 5vw, 64px)",
            textShadow: "0 6px 30px rgba(0,0,0,0.35)",
            willChange: "transform, opacity",
          }}
        >
          Products
        </h2>

        <div
          ref={gridRef}
          className="mt-14 md:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16"
        >
          {PRODUCTS.map((p, i) => {
            const isSlot = i === activeIndex;
            return (
              <div key={p.id} className="flex flex-col items-center text-center">
                {/* Image area — fixed height so the shared can can fit itself
                    to the slot, and so every card aligns on a baseline. */}
                <div className="relative w-full h-[220px] flex items-center justify-center">
                  {isSlot ? (
                    <div
                      ref={slotRef}
                      aria-hidden="true"
                      className="w-[120px] h-full"
                    />
                  ) : (
                    <div className="shop-img relative w-[130px] h-full" style={{ willChange: "transform, opacity" }}>
                      <Image
                        src={p.img}
                        alt={p.name}
                        fill
                        sizes="160px"
                        draggable={false}
                        style={{
                          objectFit: "contain",
                          filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.5))",
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="shop-info mt-5 flex flex-col items-center" style={{ willChange: "transform, opacity" }}>
                  <h3 className="text-white/90 text-base md:text-lg font-semibold tracking-tight">
                    {p.name}
                  </h3>
                  <p className="mt-1.5 text-white/75 text-sm md:text-[15px]">
                    {PRICE}
                  </p>
                  <button
                    type="button"
                    className="mt-3 px-5 py-2 rounded-full text-white text-[13px] font-semibold tracking-tight transition-all duration-300 hover:scale-105 active:scale-95"
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
