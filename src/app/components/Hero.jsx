"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { FLAVORS } from "./flavors";
import { experience } from "./experience/store";

export { FLAVORS };

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

const EASE = [0.22, 0.61, 0.36, 1];

// The cans themselves are 3D (see experience/Scene): they stand in an arc in
// the upper part of this section. This component is the DOM layer on top:
// header, the selected flavor's name and copy, and the carousel controls.
export default function Hero({ active, setActive, ready = true, onShop }) {
  const total = FLAVORS.length;
  const flavor = FLAVORS[active] ?? FLAVORS[0];

  const sectionRef = useRef(null);
  const fadeRefs = useRef([]);

  // The copy and arrows clear out as soon as the page scrolls, so they never
  // sit over the can on its way down to the next section.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    gsap.registerPlugin(ScrollTrigger);
    const tween = gsap.to(fadeRefs.current, {
      autoAlpha: 0,
      y: -40,
      ease: "none",
      scrollTrigger: { trigger: section, start: "top top", end: "30% top", scrub: true },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  const goPrev = useCallback(() => setActive((a) => (a - 1 + total) % total), [setActive, total]);
  const goNext = useCallback(() => setActive((a) => (a + 1) % total), [setActive, total]);

  // Arrow keys only drive the carousel while it is on screen.
  useEffect(() => {
    if (!ready) return;
    const onKey = (e) => {
      if (experience.scroll.heroOut > 0.5) return;
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext, ready]);

  // A horizontal swipe only counts when it clearly out-runs the vertical
  // component, so it never steals a vertical scroll gesture from the page.
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

  // The cans are drawn by the 3D scene behind this section; it publishes where
  // each one is on screen, so clicking a can in the arc selects it.
  const canAt = (x, y) => {
    let hit = -1;
    let nearest = -Infinity;
    experience.heroCans.forEach((box, i) => {
      if (!box?.on) return;
      const dx = x - box.x;
      const dy = box.y - y;
      const c = Math.cos(-box.rz);
      const s = Math.sin(-box.rz);
      const lx = dx * c - dy * s;
      const ly = dx * s + dy * c;
      if (Math.abs(lx) <= box.hw * 1.15 && Math.abs(ly) <= box.hh && box.z > nearest) {
        hit = i;
        nearest = box.z;
      }
    });
    return hit;
  };
  const onCanClick = (e) => {
    if (e.target.closest("button, a")) return;
    const i = canAt(e.clientX, e.clientY);
    if (i >= 0 && i !== active) setActive(i);
  };
  const onCanHover = (e) => {
    const i = e.target.closest("button, a") ? -1 : canAt(e.clientX, e.clientY);
    e.currentTarget.style.cursor = i >= 0 && i !== active ? "pointer" : "";
  };

  const rise = (delay) => ({
    initial: { opacity: 0, y: 30 },
    animate: ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 },
    transition: { duration: 0.9, ease: EASE, delay },
  });

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-[100svh] min-h-[560px] md:h-screen md:min-h-[680px] overflow-hidden font-sans select-none z-10"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={onCanClick}
      onMouseMove={onCanHover}
    >
      <motion.div {...rise(0)} className="relative z-30">
        <Header />
      </motion.div>

      <motion.div {...rise(0.15)} className="absolute inset-0 z-30 pointer-events-none">
        <div ref={(el) => { fadeRefs.current[0] = el; }} className="absolute inset-0">
          <NavControls onPrev={goPrev} onNext={goNext} />
        </div>
      </motion.div>

      <motion.div
        {...rise(0.25)}
        className="absolute inset-x-0 bottom-[6svh] md:bottom-[6vh] z-30 px-6 pb-safe"
      >
        <div ref={(el) => { fadeRefs.current[1] = el; }} className="flex flex-col items-center text-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={flavor.id}
              initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -18, filter: "blur(6px)" }}
              transition={{ duration: 0.55, ease: EASE }}
              className="flex flex-col items-center"
            >
              <p className="text-[10px] md:text-xs font-semibold tracking-[0.38em] uppercase text-white/70">
                Shilajit Energy
              </p>
              <h1
                className="mt-2 md:mt-3 font-black uppercase leading-[0.9] tracking-[-0.02em] text-white whitespace-nowrap text-[clamp(30px,8.4vw,44px)] md:text-[clamp(44px,6.2vw,92px)]"
                style={{ textShadow: `0 0 40px ${flavor.bg[0]}aa, 0 6px 24px rgba(0,0,0,0.35)` }}
              >
                {flavor.name}.
              </h1>
              <p className="mt-2.5 md:mt-4 max-w-[340px] md:max-w-[460px] text-white/80 text-[13px] md:text-[15px] leading-relaxed">
                {flavor.desc}
              </p>
            </motion.div>
          </AnimatePresence>

          <button
            type="button"
            onClick={onShop}
            className="mt-4 md:mt-6 px-6 md:px-7 py-2.5 md:py-3 rounded-full bg-white text-black text-sm font-bold tracking-tight transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95"
          >
            Shop Now
          </button>

          <Pagination active={active} setActive={setActive} />
        </div>
      </motion.div>
    </section>
  );
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  // Flipped by the first tap on the burger, never in an effect: that keeps the
  // portal (and its document reference) strictly client-side, while leaving it
  // mounted afterwards so AnimatePresence can still run the close animation.
  const [everOpened, setEverOpened] = useState(false);

  // Escape closes the sheet, and the page (and smooth scroll) is frozen while
  // it is up so a drag over the overlay cannot scroll the sections behind it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    experience.lenis?.stop();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      experience.lenis?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="absolute top-0 left-0 right-0 z-30 px-3 md:px-6 pt-3 md:pt-5 pointer-events-none">
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
              aspect ratio up-front (no CLS), and h-8 md:h-11 w-auto then scales
              the image by height with the natural width. The phone step is h-10
              so the pill stays a slim bar instead of eating the hero. */}
          <Image
            src="/asset/logo.png"
            alt="Shilajit Energy"
            width={529}
            height={191}
            sizes="(max-width: 768px) 120px, 180px"
            priority
            className="h-8 md:h-11 w-auto object-contain"
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

// Portalled to <body> on purpose: the hero lives inside the page's stacking
// context, so a sheet rendered in place could end up under later sections.
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
            transition={{ duration: 0.4, ease: EASE }}
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
  const base =
    "group pointer-events-auto absolute top-[40%] -translate-y-1/2 w-10 h-10 md:w-14 md:h-14 rounded-full grid place-items-center backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95";
  const style = {
    background: "rgba(255,255,255,0.16)",
    border: "1px solid rgba(255,255,255,0.28)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
  };
  return (
    <>
      <button type="button" aria-label="Previous flavor" onClick={onPrev} className={`${base} left-2 md:left-10`} style={style}>
        <ChevronLeft className="text-white w-5 h-5 md:w-7 md:h-7 transition-transform duration-300 group-hover:-translate-x-0.5" />
      </button>
      <button type="button" aria-label="Next flavor" onClick={onNext} className={`${base} right-2 md:right-10`} style={style}>
        <ChevronRight className="text-white w-5 h-5 md:w-7 md:h-7 transition-transform duration-300 group-hover:translate-x-0.5" />
      </button>
    </>
  );
}

function Pagination({ active, setActive }) {
  return (
    <div className="mt-4 md:mt-5 flex items-center gap-2 md:gap-2.5">
      {FLAVORS.map((f, i) => (
        <button
          key={f.id}
          type="button"
          aria-label={`Show ${f.name}`}
          onClick={() => setActive(i)}
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: i === active ? 32 : 9,
            background: i === active ? "#fff" : "rgba(255,255,255,0.45)",
            boxShadow: i === active ? "0 0 14px rgba(255,255,255,0.55)" : "none",
          }}
        />
      ))}
    </div>
  );
}
