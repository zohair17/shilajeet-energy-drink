// Shared state between the DOM side (GSAP timelines, ScrollTriggers, section
// elements) and the 3D scene. It is a plain mutable object on purpose: these
// values change every frame and must never cause a React render. The DOM side
// writes, the scene reads inside useFrame.
export const experience = {
  // Selected flavor index, mirrored from React state.
  active: 1,

  // Intro (loader) progress values, animated by the intro GSAP timeline.
  // `playing` stays true until the can has landed in the hero.
  intro: {
    playing: true,
    orange: 0, // whole orange grows in
    shake: 0, // tremble before it bursts
    burst: 0, // explosion: chunks, juice, then slow drift
    peaches: 0, // peaches fly in
    swirl: 0, // everything spins into a vortex and the camera dives in
    cover: 0, // juice swirl covering the screen
    reveal: 0, // the can spins into view
    toHero: 0, // the can drops into the hero, the other cans slide in
    dark: 1, // background darkness while the intro plays
  },

  // Scroll progress (0..1) of each stage of the can journey.
  scroll: {
    heroOut: 0, // hero → centre of the showcase
    showcase: 0, // pinned showcase (360° turn)
    pourIn: 0, // showcase → beside the glass
    pour: 0, // pinned pour
    shopIn: 0, // glass → product card
  },

  // DOM anchors the 3D objects line up with, measured every frame.
  el: {
    glass: null,
    shopSlots: [],
  },

  // Product card under the pointer (its can spins), or -1.
  hovered: -1,

  // Where each hero can is on screen (CSS px), written by the scene every
  // frame, so a click on a can in the hero can select it.
  heroCans: [],

  // Smooth-scroll instance (Lenis), so the menu and the intro can pause it.
  lenis: null,

  // R3F root state, so the page can pause rendering below the products.
  three: null,
};
