"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useIsMobile from "./useIsMobile";

// Premium full-bleed video section.
//
// Two modes are wired up and toggleable via the `mode` prop:
//   - "pin"   (default): Option A — Cinema Reveal. Section pins while video plays naturally.
//   - "scrub":           Option B — Scroll-Scrubbed Playback. video.currentTime is bound to
//                        scroll progress so frames advance/rewind as the user scrolls.
export default function VideoSection({
  src = "/shilajeet.mov",
  mode = "pin",
  pinDuration = "+=100%",
  scrubDuration = "+=200%",
  // Phones hold a pin for far more thumb-travel than a wheel does, so both
  // windows are shortened there unless a caller overrides them.
  mobilePinDuration = "+=65%",
  mobileScrubDuration = "+=130%",
}) {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!sectionRef.current || !videoRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const video = videoRef.current;
    const pinEnd = isMobile ? mobilePinDuration : pinDuration;
    const scrubEnd = isMobile ? mobileScrubDuration : scrubDuration;
    let cleanupMeta;
    let cleanupGesture;

    const ctx = gsap.context(() => {
      if (mode === "scrub") {
        // Frames bound to scrollbar: pause natural playback, drive currentTime by progress.
        video.pause();
        video.removeAttribute("loop");

        const setupScrub = () => {
          ScrollTrigger.create({
            trigger: sectionRef.current,
            start: "top top",
            end: scrubEnd,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            onUpdate: (self) => {
              if (
                video.duration &&
                Number.isFinite(video.duration) &&
                video.duration > 0
              ) {
                const target = video.duration * self.progress;
                // Avoid spamming seeks on tiny deltas.
                if (Math.abs(video.currentTime - target) > 0.01) {
                  video.currentTime = target;
                }
              }
            },
          });
          ScrollTrigger.refresh();
        };

        if (video.readyState >= 1) {
          setupScrub();
        } else {
          video.addEventListener("loadedmetadata", setupScrub, { once: true });
          cleanupMeta = () =>
            video.removeEventListener("loadedmetadata", setupScrub);
        }
      } else {
        // Option A — Cinema Reveal: pin section, video plays normally throughout.
        ScrollTrigger.create({
          trigger: sectionRef.current,
          start: "top top",
          end: pinEnd,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
        });

        // Kick off playback (muted autoplay should succeed, but catch silently).
        const tryPlay = () => {
          const p = video.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        };
        tryPlay();

        // iOS refuses muted autoplay in Low Power Mode, and some Android
        // browsers refuse it on a metered connection — in both cases the
        // section would sit on a frozen first frame. Retry once on the first
        // user gesture, which is all those policies actually require.
        const onFirstGesture = () => {
          if (video.paused) tryPlay();
        };
        window.addEventListener("touchstart", onFirstGesture, { once: true, passive: true });
        window.addEventListener("click", onFirstGesture, { once: true });
        cleanupGesture = () => {
          window.removeEventListener("touchstart", onFirstGesture);
          window.removeEventListener("click", onFirstGesture);
        };
      }
    });

    return () => {
      if (cleanupMeta) cleanupMeta();
      if (cleanupGesture) cleanupGesture();
      ctx.revert();
    };
  }, [
    mode,
    pinDuration,
    scrubDuration,
    mobilePinDuration,
    mobileScrubDuration,
    isMobile,
  ]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-[100svh] md:h-screen overflow-hidden z-10 bg-black"
    >
      <video
        ref={videoRef}
        src={src}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        loop={mode !== "scrub"}
        playsInline
        autoPlay={mode === "pin"}
        preload="auto"
        aria-hidden="true"
      />

      {/* Brand-consistent luxury overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "rgba(0, 0, 0, 0.3)" }}
      />

      {/* Optional headline anchor — leave the content slot here so the section
          stays a single semantic block. Add a centered tagline by composing on top. */}
      <div className="relative z-10 w-full h-full flex items-end justify-center pb-14 md:pb-24 mb-safe">
        <div className="max-w-[1320px] w-full px-5 md:px-12 lg:px-16 text-center">
          <p
            className="uppercase font-black text-white tracking-[-0.02em] leading-[0.95] text-[clamp(26px,7.5vw,40px)] md:text-[clamp(36px,5.5vw,80px)]"
            style={{ textShadow: "0 10px 40px rgba(0,0,0,0.6)" }}
          >
            Born From The Mountain.
            <br />
            Forged For The Modern.
          </p>
        </div>
      </div>
    </section>
  );
}
