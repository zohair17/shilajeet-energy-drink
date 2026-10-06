"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useIsMobile from "./useIsMobile";

const ABOUT = "/asset/About%20Product";

// Two cards begin stacked at center, then spread apart as the section is pinned
// and scrubbed; once they settle, the title and description reveal in the
// cleared center channel.
//
// Desktop clears the channel horizontally (cards fly to the left/right edges);
// a phone has no horizontal room to give, so the same gesture is rotated 90deg
// and the cards fly to the top/bottom edges instead, clearing a full-width
// band. `position` keeps each image headline in frame under object-cover, and
// the crop changes with the card aspect, so it is set per axis.
const CARDS = [
  { src: `${ABOUT}/abt%203.webp`, side: "left", position: "right center", mobilePosition: "center 40%" }, // POTENT SHILAJIT
  { src: `${ABOUT}/abt%204.webp`, side: "right", position: "left center", mobilePosition: "center 60%" }, // GOLDEN SAFFRON
];

// Resting rotation of each card while stacked, for a hand-dealt look.
const STACK_ROTATE = [-5, 5];

export default function AboutProductSection() {
  const sectionRef = useRef(null);
  const cardRefs = useRef([]);
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!sectionRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const cards = cardRefs.current.filter(Boolean);

      // Distance from the viewport center to an edge-flush resting place:
      // horizontally on desktop (full-height 35vw columns), vertically on
      // mobile (full-width 28svh bands). Computed live so resize stays exact.
      const dx = () => (cards[0] ? cards[0].offsetWidth / 2 - window.innerWidth / 2 : 0);
      const dy = () => (cards[0] ? window.innerHeight / 2 - cards[0].offsetHeight / 2 : 0);

      const targetFor = {
        left: () => (isMobile ? { x: 0, y: -dy() } : { x: dx(), y: 0 }),
        right: () => (isMobile ? { x: 0, y: dy() } : { x: -dx(), y: 0 }),
      };

      // Stacked starting state.
      cards.forEach((el, i) => {
        gsap.set(el, { x: 0, y: 0, rotate: STACK_ROTATE[i], zIndex: i });
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          // A shorter pin on phones: the same 180% of a tall, narrow viewport
          // is a lot of thumb-scrolling for one reveal.
          end: isMobile ? "+=130%" : "+=180%",
          pin: true,
          pinSpacing: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // Spread the stack out to the edges (both simultaneously).
      cards.forEach((el, i) => {
        const side = CARDS[i].side;
        tl.to(
          el,
          {
            x: () => targetFor[side]().x,
            y: () => targetFor[side]().y,
            rotate: 0,
            ease: "power3.inOut",
          },
          0
        );
      });

      // Then the title, then the description reveal in the cleared center.
      tl.from(
        titleRef.current,
        { y: isMobile ? 24 : 40, opacity: 0, ease: "power3.out" },
        ">-0.15"
      );
      tl.from(
        descRef.current,
        { y: isMobile ? 18 : 30, opacity: 0, ease: "power3.out" },
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
      <div className="relative w-full h-full flex items-center justify-center">
        {/* CARD STACK — absolutely centered; GSAP drives x/y/rotate. Desktop
            cards are full-height 35vw columns that spread flush to the left and
            right edges, leaving a 30vw center channel for the text. Mobile
            cards are full-width 28svh bands that spread to the top and bottom
            edges, leaving a ~44svh center band. */}
        <div className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none">
          {CARDS.map((c, i) => (
            <div
              key={i}
              ref={(el) => (cardRefs.current[i] = el)}
              className="absolute overflow-hidden w-screen h-[28svh] md:w-[35vw] md:h-screen"
              style={{ willChange: "transform" }}
            >
              <Image
                src={c.src}
                alt=""
                fill
                sizes="(max-width: 767px) 100vw, 35vw"
                draggable={false}
                style={{
                  objectFit: "cover",
                  objectPosition: isMobile ? c.mobilePosition : c.position,
                }}
              />
            </div>
          ))}
        </div>

        {/* CENTER TEXT — lives in the cleared channel, revealed after the
            cards settle. Width is clamped to stay within the gap the cards
            leave behind on each axis. */}
        <div
          className="relative z-10 px-4 text-center pointer-events-none w-[min(88vw,420px)] md:w-[clamp(280px,30vw,460px)]"
        >
          <h2
            ref={titleRef}
            className="font-black text-white tracking-[-0.01em] leading-[1.0] text-[clamp(24px,7vw,34px)] md:text-[clamp(28px,3.2vw,50px)]"
            style={{
              textShadow: "0 4px 18px rgba(0,0,0,0.35)",
              willChange: "transform, opacity",
            }}
          >
            About Product
          </h2>
          <p
            ref={descRef}
            className="mt-3 md:mt-5 text-white leading-snug md:leading-relaxed text-[clamp(11px,3.1vw,13px)] md:text-[clamp(12px,1.05vw,15px)]"
            style={{
              textShadow: "0 2px 12px rgba(0,0,0,0.4)",
              willChange: "transform, opacity",
            }}
          >
            Complementing this powerful ingredient is the sacred Zam Zam water,
            sourced from the ancient well in the holy city of Mecca. Known for
            its purity and spiritual significance, Zam Zam water infuses our
            elixir with a unique vibrancy, elevating it to a realm of divine
            nourishment. To complete this magical blend, we have added the
            exquisite saffron, the golden spice cherished for its mood-lifting
            and revitalizing properties. Cultivated with care in the lush fields
            of Kashmir, saffron adds a touch of luxury and an aromatic essence
            that transforms our elixir into a sensory delight.
          </p>
        </div>
      </div>
    </section>
  );
}
