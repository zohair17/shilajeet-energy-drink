"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const ABOUT = "/asset/About%20Product";

// Two cards begin stacked at center, then spread to the left and right edges as
// the section is pinned and scrubbed; once they settle, the title and
// description reveal in the cleared 30vw center channel. `position` keeps each
// image's headline text in frame under object-cover.
const CARDS = [
  { src: `${ABOUT}/abt%203.webp`, side: "left", position: "right center" }, // POTENT SHILAJIT
  { src: `${ABOUT}/abt%204.webp`, side: "right", position: "left center" }, // GOLDEN SAFFRON
];

// Resting rotation of each card while stacked, for a hand-dealt look.
const STACK_ROTATE = [-5, 5];

export default function AboutProductSection() {
  const sectionRef = useRef(null);
  const cardRefs = useRef([]);
  const titleRef = useRef(null);
  const descRef = useRef(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const cards = cardRefs.current.filter(Boolean);

      // Each card is a full-height, 35vw column. To sit flush against an edge
      // its center moves from the viewport center by ±(viewport/2 - card/2).
      // Computed live so resize stays exact.
      const dx = () => (cards[0] ? cards[0].offsetWidth / 2 - window.innerWidth / 2 : 0);
      const targetFor = {
        left: () => ({ x: dx() }),
        right: () => ({ x: -dx() }),
      };

      // Stacked starting state.
      cards.forEach((el, i) => {
        gsap.set(el, { x: 0, y: 0, rotate: STACK_ROTATE[i], zIndex: i });
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=180%",
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
          { x: () => targetFor[side]().x, rotate: 0, ease: "power3.inOut" },
          0
        );
      });

      // Then the title, then the description reveal in the cleared center.
      tl.from(
        titleRef.current,
        { y: 40, opacity: 0, ease: "power3.out" },
        ">-0.15"
      );
      tl.from(
        descRef.current,
        { y: 30, opacity: 0, ease: "power3.out" },
        ">-0.1"
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen min-h-[680px] overflow-hidden z-10"
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* CARD STACK — absolutely centered; GSAP drives x/rotate. Cards are
            full-height 35vw columns that spread flush to the left/right edges,
            leaving a 30vw center channel (35vw → 65vw) for the text. */}
        <div className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none">
          {CARDS.map((c, i) => (
            <div
              key={i}
              ref={(el) => (cardRefs.current[i] = el)}
              className="absolute overflow-hidden"
              style={{
                width: "35vw",
                height: "100vh",
                willChange: "transform",
              }}
            >
              <Image
                src={c.src}
                alt=""
                fill
                sizes="35vw"
                draggable={false}
                style={{ objectFit: "cover", objectPosition: c.position }}
              />
            </div>
          ))}
        </div>

        {/* CENTER TEXT — lives in the cleared channel, revealed after the
            cards settle. Width is clamped to stay within the 30vw gap. */}
        <div
          className="relative z-10 px-4 text-center pointer-events-none"
          style={{ width: "clamp(280px, 30vw, 460px)" }}
        >
          <h2
            ref={titleRef}
            className="font-black text-white tracking-[-0.01em] leading-[1.0]"
            style={{
              fontSize: "clamp(28px, 3.2vw, 50px)",
              textShadow: "0 4px 18px rgba(0,0,0,0.35)",
              willChange: "transform, opacity",
            }}
          >
            About Product
          </h2>
          <p
            ref={descRef}
            className="mt-5 text-white leading-relaxed"
            style={{
              fontSize: "clamp(12px, 1.05vw, 15px)",
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
