"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import Hero from "./Hero";
import ShowcaseSection from "./ShowcaseSection";
import PourSection from "./PourSection";
import ShopNowSection from "./ShopNowSection";
import Footer from "./Footer";
import { FLAVORS, INTRO_FLAVOR } from "./flavors";
import { experience } from "./experience/store";

// three.js and the scene only load in the browser, in their own chunk.
const Scene = dynamic(() => import("./experience/Scene"), { ssr: false });

const DARK = "#12130F";

// Page background for whatever the 3D canvas is not drawing (before it loads,
// or if WebGL is unavailable). The canvas paints the same gradient on top.
const gradientFor = (f) =>
  `radial-gradient(120% 85% at 50% -5%, ${f.bg[0]} 0%, ${f.bg[0]}d9 22%, ${f.bg[1]} 72%)`;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The intro, in seconds. Values are 0..1 progress for each beat; the scene
// applies its own easing to them.
function buildIntro(I, caption, onShowPage) {
  const tl = gsap.timeline();
  tl.to(I, { orange: 1, duration: 1, ease: "none" }, 0.15)
    .to(I, { shake: 1, duration: 0.45, ease: "power1.in" }, 0.85)
    .to(I, { burst: 1, duration: 1.95, ease: "none" }, 1.3)
    .to(I, { peaches: 1, duration: 1.15, ease: "none" }, 1.2)
    .to(I, { swirl: 1, duration: 1.05, ease: "none" }, 2.55)
    .to(I, { cover: 1, duration: 0.5, ease: "power2.in" }, 3.1)
    .to(I, { reveal: 1, duration: 1.3, ease: "none" }, 3.6)
    .to(I, { cover: 0, duration: 0.85, ease: "power2.out" }, 3.62)
    .fromTo(caption, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out" }, 4.05)
    .to(caption, { autoAlpha: 0, y: -12, duration: 0.4, ease: "power2.in" }, 4.95)
    .to(I, { toHero: 1, duration: 1.25, ease: "none" }, 5)
    .to(I, { dark: 0, duration: 1.1, ease: "power1.inOut" }, 5.1)
    .add(onShowPage, 5.4);
  return tl;
}

export default function LandingExperience() {
  const [active, setActive] = useState(INTRO_FLAVOR);
  // loading → intro → done. `pageShown` fades the page in near the end of the
  // intro, while the can is still landing.
  const [phase, setPhase] = useState("loading");
  const [pageShown, setPageShown] = useState(false);
  const flavor = FLAVORS[active];

  const captionRef = useRef(null);
  const shopRef = useRef(null);

  useEffect(() => {
    experience.active = active;
  }, [active]);

  // Smooth scrolling, wired into GSAP's ticker so ScrollTrigger and the
  // scene read the same scroll position every frame. Paused until the intro
  // has finished.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("orientationchange", refresh);

    if (prefersReducedMotion()) {
      return () => window.removeEventListener("orientationchange", refresh);
    }

    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
    experience.lenis = lenis;

    return () => {
      window.removeEventListener("orientationchange", refresh);
      gsap.ticker.remove(raf);
      lenis.destroy();
      if (experience.lenis === lenis) experience.lenis = null;
    };
  }, []);

  const finishIntro = useCallback(() => {
    experience.intro.playing = false;
    setPageShown(true);
    setPhase("done");
  }, []);

  // The scene reports once its textures are in and its shaders are compiled.
  // With reduced motion the intro is skipped and the can starts in the hero.
  const onSceneReady = useCallback(() => {
    if (prefersReducedMotion()) {
      Object.assign(experience.intro, { orange: 1, burst: 1, peaches: 1, swirl: 1, cover: 0, reveal: 1, toHero: 1, dark: 0 });
      finishIntro();
      return;
    }
    setPhase((p) => (p === "loading" ? "intro" : p));
  }, [finishIntro]);

  // Without WebGL there is no intro to wait for; on a very slow connection
  // the page is shown anyway after a while and the cans appear when ready.
  useEffect(() => {
    if (phase !== "loading") return;
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") || probe.getContext("webgl");
    const supported = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    const timer = setTimeout(finishIntro, supported ? 30000 : 0);
    return () => clearTimeout(timer);
  }, [phase, finishIntro]);

  useEffect(() => {
    if (phase !== "intro") return;
    const tl = buildIntro(experience.intro, captionRef.current, () => setPageShown(true));
    tl.eventCallback("onComplete", finishIntro);
    return () => tl.kill();
  }, [phase, finishIntro]);

  useEffect(() => {
    if (phase !== "done") return;
    experience.lenis?.start();
    ScrollTrigger.refresh();
  }, [phase]);

  // Nothing 3D is on screen once the products have scrolled away, so the
  // canvas stops redrawing there (it keeps its last frame as the background).
  useEffect(() => {
    const section = shopRef.current;
    if (!section) return;
    const st = ScrollTrigger.create({
      trigger: section,
      start: "bottom top",
      onEnter: () => experience.three?.setFrameloop("demand"),
      onLeaveBack: () => {
        experience.three?.setFrameloop("always");
        experience.three?.invalidate();
      },
    });
    return () => st.kill();
  }, []);

  const scrollToShop = useCallback(() => {
    const target = shopRef.current;
    if (!target) return;
    if (experience.lenis) experience.lenis.scrollTo(target, { duration: 3 });
    else target.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="relative w-full isolate" style={{ backgroundColor: DARK }}>
      {/* Fallback background, under the canvas. */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 transition-[background-image] duration-700"
          style={{ backgroundImage: gradientFor(flavor) }}
        />
      </div>

      <Scene onReady={onSceneReady} />

      {/* Fine grain over the canvas, under the copy. */}
      <div className="fixed inset-0 z-[2] pointer-events-none mix-blend-overlay opacity-[0.07] [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:3px_3px]" />

      {/* SECTIONS — transparent; the cans, glass and background are drawn by
          the canvas behind them. */}
      <div
        className="relative z-10"
        style={{
          opacity: pageShown ? 1 : 0,
          transition: "opacity 0.9s ease",
          pointerEvents: phase === "done" ? "auto" : "none",
        }}
      >
        <Hero active={active} setActive={setActive} ready={pageShown} onShop={scrollToShop} />
        <ShowcaseSection />
        <PourSection />
        <ShopNowSection sectionRef={shopRef} />
        <Footer accent={flavor.bg[0]} />
      </div>

      {/* Intro caption under the finished can. */}
      <p
        ref={captionRef}
        className="invisible fixed inset-x-0 bottom-[12svh] z-20 px-6 text-center font-black uppercase tracking-tight text-white text-2xl md:text-4xl pointer-events-none"
        style={{ textShadow: "0 6px 30px rgba(0,0,0,0.5)" }}
      >
        Unleash the ancient power.
      </p>

      {/* Shown while the 3D scene downloads. */}
      <div
        aria-hidden={phase !== "loading"}
        className="fixed inset-0 z-[60] grid place-items-center pointer-events-none transition-opacity duration-700"
        style={{ backgroundColor: DARK, opacity: phase === "loading" ? 1 : 0 }}
      >
        <div className="flex flex-col items-center gap-4">
          <p className="text-white/80 text-sm tracking-[0.4em] uppercase">Shilajit Energy</p>
          <span className="block h-px w-32 overflow-hidden bg-white/15">
            <span className="block h-full w-1/3 bg-white/80 animate-[loader-bar_1.1s_ease-in-out_infinite]" />
          </span>
        </div>
      </div>
    </div>
  );
}
