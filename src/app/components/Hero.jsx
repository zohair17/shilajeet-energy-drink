"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useIsMobile from "./useIsMobile";

const FRUITS = "/asset/Hero%20background";
const BOTTLES = "/asset/bottles";
const DARK = "#12130F";

// Box the can is rendered into, per device. Exported because LandingExperience
// renders the *shared* morphing can, and it must occupy exactly the same box as
// this carousel slot or the hand-off would jump on flavor change. The mobile box
// keeps the desktop aspect (~0.62) so the artwork reads at the same relative
// size, and uses `svh` so a collapsing mobile URL bar cannot resize the can.
export const CAN_BOX = {
  desktop: { width: "min(38vw, 460px)", height: "min(78vh, 740px)" },
  mobile: { width: "min(68vw, 320px)", height: "min(54svh, 470px)" },
};

export const canBoxFor = (isMobile) =>
  isMobile ? CAN_BOX.mobile : CAN_BOX.desktop;

export const FLAVORS = [
  {
    id: "kiwi-lemon",
    name: "KIWI LEMON",
    bg: ["#A5A946", DARK],
    can: `${BOTTLES}/kiwi-lemon.png`,
    fruits: [
      {
        src: `${FRUITS}/kiwi.png`, anchor: "top-left", size: 35, rotate: -14, depth: 42, offsetX: -60,
        offsetY: 50,
      },
      {
        src: `${FRUITS}/lemon.png`, anchor: "bottom-right", size: 42, rotate: 18, depth: -48, offsetX: 80,
        offsetY: 50,
      },
    ],
  },
  {
    id: "orange-peach",
    name: "ORANGE PEACH",
    bg: ["#ED7A37", DARK],
    can: `${BOTTLES}/orange-peech.png`,
    fruits: [
      {
        src: `${FRUITS}/peach.png`, anchor: "bottom-right", size: 38, rotate: 16, depth: -50, offsetX: -60,
        offsetY: 50,
      },
      {
        src: `${FRUITS}/orange.png`, anchor: "top-left", size: 40, rotate: -12, depth: 44, offsetX: 80,
        offsetY: 50,
      },

    ],
  },
  {
    id: "pineapple-guava",
    name: "PINEAPPLE GUAVA",
    bg: ["#E086A0", DARK],
    can: `${BOTTLES}/Pineapple-guava.png`,
    fruits: [
        { src: `${FRUITS}/guava.png`, anchor: "bottom-right", size: 38, depth: -52, offsetX: -60,
        offsetY: 50, },
      { src: `${FRUITS}/pineapple.png`, anchor: "top-left", size: 40, depth: 46,offsetX: 80,
        offsetY: 50, },

    ],
  },
  {
    id: "strawberry",
    name: "STRAWBERRY",
    bg: ["#DC2E42", DARK],
    can: `${BOTTLES}/strawberry.png`,
    fruits: [
      { src: `${FRUITS}/strawberries1.png`, anchor: "top-center", size: 44, rotate: 0, depth: 50 },
       { src: `${FRUITS}/strawberries1.png`, anchor: "top-center", size: 44, rotate: 0, depth: 50 },
    ],
  },
  {
    id: "pre-workout-orange-peach",
    name: "PRE-WORKOUT",
    bg: ["#ED7A37", DARK],
    can: `${BOTTLES}/pree-workut-orange-peech.png`,
    fruits: [
          {
        src: `${FRUITS}/peach.png`, anchor: "bottom-right", size: 40, rotate: 16, depth: -50, offsetX: -60,
        offsetY: 50,
      },
      {
        src: `${FRUITS}/orange.png`, anchor: "top-left", size: 40, rotate: -12, depth: 44, offsetX: 80,
        offsetY: 50,
      }, ],
  },
];

const NAV_LINKS = [
  "Home",
  "Feature",
  "Benefits",
  "Products",
  "About Shilajeet",
  "Ingredients",
  "Contact",
  // "Wholesale",
  // "Distributor",
];

// NOTE: `center` is intentionally opacity 0 — the actual active can is rendered
// by LandingExperience as a single shared element across both sections, so this
// slot only reserves space and handles the slide-out/in for the carousel peeks.
//
// Offsets are device-scaled: the mobile can is proportionally wider (64vw vs
// 38vw), so its neighbours must travel further out — and shrink further — to
// leave the centre can readable on a phone.
const slotVariantsFor = (isMobile) => {
  const peek = isMobile ? 62 : 52;
  const peekScale = isMobile ? 0.46 : 0.58;
  const hidden = isMobile ? 150 : 140;
  return {
    center: { x: "0vw", scale: 1.0, opacity: 0, filter: "blur(0px)", zIndex: 4 },
    right: { x: `${peek}vw`, scale: peekScale, opacity: 0.85, filter: "blur(1px)", zIndex: 3 },
    left: { x: `-${peek}vw`, scale: peekScale, opacity: 0.85, filter: "blur(1px)", zIndex: 3 },
    hiddenRight: { x: `${hidden}vw`, scale: 0.4, opacity: 0, filter: "blur(6px)", zIndex: 1 },
    hiddenLeft: { x: `-${hidden}vw`, scale: 0.4, opacity: 0, filter: "blur(6px)", zIndex: 1 },
  };
};

const ANCHOR_POSITIONS = {
  "top-left": { left: "6vw", top: "14vh", originX: "left", originY: "top" },
  "top-right": { right: "6vw", top: "14vh", originX: "right", originY: "top" },
  "bottom-left": { left: "6vw", bottom: "12vh", originX: "left", originY: "bottom" },
  "bottom-right": { right: "6vw", bottom: "12vh", originX: "right", originY: "bottom" },
  "top-center": { left: "50%", top: "10vh", originX: "center", originY: "top", translateX: "-50%" },
};

// Same key set as the desktop table (so the "unknown anchor falls back to
// top-left" behaviour stays identical), pulled tighter and switched to `svh`.
const ANCHOR_POSITIONS_MOBILE = {
  "top-left": { left: "2vw", top: "11svh", originX: "left", originY: "top" },
  "top-right": { right: "2vw", top: "11svh", originX: "right", originY: "top" },
  "bottom-left": { left: "2vw", bottom: "9svh", originX: "left", originY: "bottom" },
  "bottom-right": { right: "2vw", bottom: "9svh", originX: "right", originY: "bottom" },
  "top-center": { left: "50%", top: "8svh", originX: "center", originY: "top", translateX: "-50%" },
};

const slotFor = (i, active, total) => {
  const diff = ((i - active) % total + total) % total;
  if (diff === 0) return "center";
  if (diff === 1) return "right";
  if (diff === total - 1) return "left";
  return diff <= total / 2 ? "hiddenRight" : "hiddenLeft";
};

export default function Hero({ active: activeProp, setActive: setActiveProp } = {}) {
  const total = FLAVORS.length;
  const isMobile = useIsMobile();
  const [internalActive, setInternalActive] = useState(1);
  const active = activeProp ?? internalActive;
  const setActive = setActiveProp ?? setInternalActive;
  // Defensive fallback — if `active` is ever out of range during hydration,
  // render the first flavor so the hollow title text node never goes empty.
  const flavor = FLAVORS[active] ?? FLAVORS[0];

  const sectionRef = useRef(null);
  const titleRef = useRef(null);
  const stageRef = useRef(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 70, damping: 22, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 70, damping: 22, mass: 0.6 });

  const onMouseMove = useCallback(
    (e) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      mx.set((e.clientX / w - 0.5) * 2);
      my.set((e.clientY / h - 0.5) * 2);
    },
    [mx, my]
  );

  const goPrev = useCallback(() => setActive((a) => (a - 1 + total) % total), [total]);
  const goNext = useCallback(() => setActive((a) => (a + 1) % total), [total]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  // Touch equivalent of the arrow keys and arrow buttons. A horizontal swipe
  // only counts when it clearly out-runs the vertical component, so it never
  // steals a vertical scroll gesture from the page.
  const touchRef = useRef(null);
  const onTouchStart = useCallback((e) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  }, []);
  const onTouchEnd = useCallback(
    (e) => {
      const start = touchRef.current;
      if (!start) return;
      touchRef.current = null;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      if (dx < 0) goNext();
      else goPrev();
    },
    [goNext, goPrev]
  );

  useEffect(() => {
    if (!sectionRef.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from(".hero-entrance", {
        y: 70,
        opacity: 0,
        duration: 1.2,
        ease: "expo.out",
        stagger: 0.1,
      });
      gsap.from(".hero-stage", {
        scale: 0.85,
        opacity: 0,
        duration: 1.4,
        ease: "expo.out",
        delay: 0.15,
      });
      gsap.to(titleRef.current, {
        // Gentler parallax on phones: the hero is shorter there, so the full
        // -28% would drag the title out of the visible band too early.
        yPercent: isMobile ? -16 : -28,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, [isMobile]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-[100svh] min-h-[560px] md:h-screen md:min-h-[680px] overflow-hidden font-sans select-none z-10"
      onMouseMove={onMouseMove}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <HollowTitle flavor={flavor} titleRef={titleRef} isMobile={isMobile} />
      <FloatingFruits flavor={flavor} sx={sx} sy={sy} isMobile={isMobile} />
      <CansCarousel active={active} total={total} stageRef={stageRef} isMobile={isMobile} />
      <Header />
      <NavControls onPrev={goPrev} onNext={goNext} />
      <Pagination active={active} setActive={setActive} />
    </section>
  );
}

function HollowTitle({ flavor, titleRef, isMobile }) {
  // Fluid sizing that scales DOWN for longer names so nothing ever clips.
  // Multiplier is calibrated so "PINEAPPLE GUAVA" (15 chars) still fits inside
  // a 92vw safe area at the upper bound. Phones need their own calibration:
  // the 40px desktop floor alone would overflow 15 characters on a 360px
  // screen, so the floor drops to 22px and the fluid term is re-tuned.
  const len = Math.max(flavor.name.length, 8);
  const fluidVw = isMobile ? Math.min(11, 108 / len) : Math.min(13, 150 / len);
  const fontSize = isMobile
    ? `clamp(22px, ${fluidVw.toFixed(2)}vw, 64px)`
    : `clamp(40px, ${fluidVw.toFixed(2)}vw, 200px)`;

  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none px-4 md:px-6">
      <div
        ref={titleRef}
        className="w-full max-w-[92vw] flex items-center justify-center"
      >
        {/* initial={false} makes the very first child mount in its `animate`
            state (opacity 1) instead of running the entry fade. This is critical
            because the parent runs `gsap.from(".hero-entrance", { opacity: 0 })`
            in a useEffect: gsap.from() reads the element current opacity as the
            tween destination, so if framer-motion has already set the initial
            state to opacity 0, GSAP captures 0 and the title stays invisible
            until the next slider click forces a fresh mount. initial={false}
            sidesteps that collision on first paint while still letting
            subsequent flavor changes use the full enter animation. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.h2
            key={flavor.id}
            initial={{ opacity: 0, y: isMobile ? 28 : 50, letterSpacing: "0.12em" }}
            animate={{ opacity: 1, y: 0, letterSpacing: "-0.045em" }}
            exit={{ opacity: 0, y: isMobile ? -28 : -50, letterSpacing: "0.12em" }}
            transition={{ duration: 0.75, ease: [0.22, 0.61, 0.36, 1] }}
            className="whitespace-nowrap font-black uppercase text-center hero-entrance leading-none"
            style={{
              fontSize,
              color: "transparent",
              WebkitTextStroke: `${isMobile ? "1px" : "1.5px"} ${flavor.bg[0]}`,
              textShadow: `0 0 80px ${flavor.bg[0]}66, 0 0 24px ${flavor.bg[0]}44`,
              transform: "translateY(-6%)",
            }}
          >
            {flavor.name}
          </motion.h2>
        </AnimatePresence>
      </div>
    </div>
  );
}

function FloatingFruits({ flavor, sx, sy, isMobile }) {
  const backFruits = flavor.fruits.slice(0, Math.ceil(flavor.fruits.length / 2));
  const frontFruits = flavor.fruits.slice(Math.ceil(flavor.fruits.length / 2));

  return (
    <>
      {/* BACK FRUITS */}
      <div className="absolute inset-0 z-[12] pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${flavor.id}-back`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0"
          >
            {backFruits.map((fr, idx) => (
              <FloatingFruit
                key={`${flavor.id}-back-${idx}`}
                fruit={{
                  ...fr,

                  // custom cinematic positions
                  anchor:
                    idx % 2 === 0 ? "top-center" : "bottom-center",

                  // bigger fruits behind bottle
                  size: fr.size + 8,

                  // deeper parallax
                  depth: fr.depth * 1.4,

                  rotate: fr.rotate - 8,

                }}
                sx={sx}
                sy={sy}
                index={idx}
                isMobile={isMobile}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* FRONT FRUITS */}
      <div className="absolute inset-0 z-[12] pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${flavor.id}-front`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0"
          >
            {frontFruits.map((fr, idx) => (
              <FloatingFruit
                key={`${flavor.id}-front-${idx}`}
                fruit={{
                  ...fr,

                  anchor:
                    idx % 2 === 0 ? "top-center" : "bottom-center",

                  size: fr.size + 4,
                  depth: fr.depth,

                  rotate: fr.rotate + 6,
                }}
                sx={sx}
                sy={sy}
                index={idx}
                isMobile={isMobile}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}

function FloatingFruit({ fruit, sx, sy, index, isMobile }) {
  const table = isMobile ? ANCHOR_POSITIONS_MOBILE : ANCHOR_POSITIONS;
  const anchor = table[fruit.anchor] || table["top-left"];
  // const px = useTransform(sx, (v) => v * fruit.depth);
  // const py = useTransform(sy, (v) => v * fruit.depth);

  // Convert size (a number expressed in vw) to a responsive clamp() so the
  // asset never balloons on ultra-wide displays. On phones the 180px floor is
  // the opposite problem — half the screen — so it drops, and the ceiling is
  // capped at 200px instead of the desktop size*12.
  const sizeCss = isMobile
    ? `clamp(96px, ${fruit.size}vw, 200px)`
    : `clamp(180px, ${fruit.size}vw, ${fruit.size * 12}px)`;

  // The authored offsets are pixel nudges tuned against a desktop-width stage;
  // at phone width they would shove the artwork off-canvas, so they scale down.
  const nudge = isMobile ? 0.45 : 1;

  return (
    <motion.div
      className="absolute"
      style={{
        ...anchor,
        width: sizeCss,
        height: sizeCss,
        x: (fruit.offsetX || 0) * nudge,
        y: (fruit.offsetY || 0) * nudge,
        ...(anchor.translateX ? { translateX: anchor.translateX } : null),
        willChange: "transform",
      }}
    >
      <motion.div
        initial={{ scale: 0.65, opacity: 0, rotate: fruit.rotate - 14 }}
        animate={{
          scale: 1,
          opacity: 1,
          rotate: fruit.rotate,
        }}
        transition={{
          scale: { duration: 1.0, ease: [0.22, 0.61, 0.36, 1] },
          opacity: { duration: 0.8 },
          rotate: { duration: 1.0, ease: [0.22, 0.61, 0.36, 1] },
        }}
        className="w-full h-full relative"
      >
        <Image
          src={fruit.src}
          alt=""
          fill
          sizes="(max-width: 767px) 55vw, 50vw"
          draggable={false}
          style={{
            objectFit: "contain",
            filter: "drop-shadow(0 32px 40px rgba(0,0,0,0.5))",
          }}
        />
      </motion.div>
    </motion.div>
  );
}

function CansCarousel({ active, total, stageRef, isMobile }) {
  const box = canBoxFor(isMobile);
  const variants = slotVariantsFor(isMobile);

  return (
    <div ref={stageRef} className="absolute inset-0 z-20 pointer-events-none hero-stage">
      {FLAVORS.map((f, i) => {
        const slot = slotFor(i, active, total);
        return (
          <motion.div
            key={f.id}
            initial={false}
            animate={variants[slot]}
            transition={{
              duration: 0.95,
              ease: [0.22, 0.61, 0.36, 1],
              opacity: { duration: 0.55 },
              filter: { duration: 0.6 },
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: box.width,
              height: box.height,
              willChange: "transform, opacity",
            }}
          >
            <div className="relative w-full h-full">
              <Image
                src={f.can}
                alt={f.name}
                fill
                priority={i === active}
                sizes="(max-width: 767px) 68vw, 460px"
                draggable={false}
                style={{
                  objectFit: "contain",
                  filter: "drop-shadow(0 40px 60px rgba(0,0,0,0.55))",
                }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  // Flipped by the first tap on the burger, never in an effect: that keeps the
  // portal (and its document reference) strictly client-side, while leaving it
  // mounted afterwards so AnimatePresence can still run the close animation.
  const [everOpened, setEverOpened] = useState(false);

  // Escape closes the sheet, and page scroll is frozen while it is up so a
  // touch drag over the overlay cannot scroll the pinned sections behind it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="absolute top-0 left-0 right-0 z-30 px-3 md:px-6 pt-3 md:pt-5 pointer-events-none hero-entrance">
      <div
        className="mx-auto max-w-[1320px] flex items-center gap-2 md:gap-3 pl-2.5 md:pl-3 pr-2.5 md:pr-6 py-1.5 md:py-2 rounded-full backdrop-blur-md pointer-events-auto"
        style={{
          background: "rgba(217, 217, 217, 0.5)",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow:
            "0 8px 30px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.35)",
        }}
      >
        <a
          href="#"
          aria-label="Shilajit Energy home"
          className="flex items-center gap-2 shrink-0 transition-transform duration-300 hover:scale-105"
        >
          {/* Logo natural ratio is 529x191 (wide horizontal). Passing the actual
              intrinsic dimensions to next/image gives the browser the correct
              aspect ratio up-front (no CLS), and h-10 md:h-16 w-auto then scales
              the image by height with the natural width. The phone step is h-10
              so the pill stays a slim bar instead of eating the hero. */}
          <Image
            src="/asset/logo.png"
            alt="Shilajit Energy"
            width={529}
            height={191}
            sizes="(max-width: 768px) 120px, 180px"
            priority
            className="h-10 md:h-16 w-auto object-contain"
          />
        </a>

        <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1.5 ml-auto">
          {NAV_LINKS.map((label) => (
            <a
              key={label}
              href="#"
              className="px-2.5 xl:px-3 py-2 text-[13px] xl:text-[14px] font-bold text-white tracking-tight whitespace-nowrap transition-transform duration-300 hover:scale-110"
              style={{ textShadow: "0 1px 6px rgba(0,0,0,0.45)" }}
            >
              {label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => { setEverOpened(true); setMenuOpen(true); }}
          className="lg:hidden ml-auto w-10 h-10 rounded-full grid place-items-center text-white transition-transform active:scale-95"
          style={{ background: "rgba(0,0,0,0.28)" }}
        >
          <span className="relative block w-5 h-[2px] bg-white before:content-[''] before:absolute before:left-0 before:right-0 before:-top-1.5 before:h-[2px] before:bg-white after:content-[''] after:absolute after:left-0 after:right-0 after:top-1.5 after:h-[2px] after:bg-white" />
        </button>
      </div>

      <MobileMenu enabled={everOpened} open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}

// Portalled to <body> on purpose: the hero lives inside the landing wrapper
// `isolate` stacking context at z-10, below the shared morphing can at z-25, so
// a sheet rendered in place would be painted underneath the can.
function MobileMenu({ enabled, open, onClose }) {
  if (!enabled) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          id="mobile-nav"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] lg:hidden"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.nav
            initial={{ y: "-100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
            className="relative pt-safe bg-[#12130F] border-b border-white/15 px-6 pb-8 shadow-2xl"
          >
            <div className="flex items-center justify-between py-4">
              <Image
                src="/asset/logo.png"
                alt="Shilajit Energy"
                width={529}
                height={191}
                sizes="120px"
                className="h-9 w-auto object-contain"
              />
              <button
                type="button"
                aria-label="Close menu"
                onClick={onClose}
                className="w-10 h-10 rounded-full grid place-items-center text-white transition-transform active:scale-95"
                style={{ background: "rgba(255,255,255,0.12)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ul className="flex flex-col">
              {NAV_LINKS.map((label) => (
                <li key={label}>
                  <a
                    href="#"
                    onClick={onClose}
                    className="block py-3.5 text-white text-lg font-bold tracking-tight border-b border-white/10 last:border-b-0"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.nav>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function NavControls({ onPrev, onNext }) {
  return (
    <>
      <button
        type="button"
        aria-label="Previous flavor"
        onClick={onPrev}
        className="group absolute left-2 md:left-10 top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-14 md:h-14 rounded-full grid place-items-center backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          background: "rgba(255,255,255,0.16)",
          border: "1px solid rgba(255,255,255,0.28)",
          boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
        }}
      >
        <ChevronLeft className="text-white w-5 h-5 md:w-7 md:h-7 transition-transform duration-300 group-hover:-translate-x-0.5" />
      </button>
      <button
        type="button"
        aria-label="Next flavor"
        onClick={onNext}
        className="group absolute right-2 md:right-10 top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-14 md:h-14 rounded-full grid place-items-center backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          background: "rgba(255,255,255,0.16)",
          border: "1px solid rgba(255,255,255,0.28)",
          boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
        }}
      >
        <ChevronRight className="text-white w-5 h-5 md:w-7 md:h-7 transition-transform duration-300 group-hover:translate-x-0.5" />
      </button>
    </>
  );
}

function Pagination({ active, setActive }) {
  return (
    <div className="absolute bottom-4 md:bottom-7 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 md:gap-2.5 pb-safe">
      {FLAVORS.map((f, i) => (
        <button
          key={f.id}
          type="button"
          aria-label={`Show ${f.name}`}
          onClick={() => setActive(i)}
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: i === active ? 36 : 10,
            background: i === active ? "#fff" : "rgba(255,255,255,0.45)",
            boxShadow: i === active ? "0 0 14px rgba(255,255,255,0.55)" : "none",
          }}
        />
      ))}
    </div>
  );
}
