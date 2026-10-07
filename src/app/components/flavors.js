const DARK = "#12130F";
const LABELS = "/asset/labels";

// One entry per can. `bg[0]` colours the page background and smoke, `label`
// is the wrap-around artwork for the 3D can (built by `npm run labels`), and
// `drink` is the colour of the liquid poured into the glass.
export const FLAVORS = [
  {
    id: "kiwi-lemon",
    name: "KIWI LEMON",
    shopName: "Kiwi Lemon",
    bg: ["#A5A946", DARK],
    label: `${LABELS}/kiwi-lemon.webp`,
    drink: "#c8d33a",
    desc: "Kiwi and lemon, lifted with Zamzam water, saffron and pure Himalayan shilajit.",
  },
  {
    id: "orange-peach",
    name: "ORANGE PEACH",
    shopName: "Orange Peach Zamzam",
    bg: ["#ED7A37", DARK],
    label: `${LABELS}/orange-peach.webp`,
    drink: "#ff8424",
    desc: "Juicy orange and ripe peach, lifted with Zamzam water, saffron and pure Himalayan shilajit.",
  },
  {
    id: "pineapple-guava",
    name: "PINEAPPLE GUAVA",
    shopName: "Pineapple Guava",
    bg: ["#E086A0", DARK],
    label: `${LABELS}/pineapple-guava.webp`,
    drink: "#ff8f74",
    desc: "Tropical pineapple and pink guava with Zamzam water, saffron and zero sugar.",
  },
  {
    id: "strawberry",
    name: "STRAWBERRY",
    shopName: "Strawberry",
    bg: ["#DC2E42", DARK],
    label: `${LABELS}/strawberry.webp`,
    drink: "#e2374d",
    desc: "Sun-ripe strawberry, lifted with Zamzam water, saffron and pure Himalayan shilajit.",
  },
  {
    id: "pre-workout-orange-peach",
    name: "PRE-WORKOUT",
    shopName: "Pre-Workout Supplement",
    bg: ["#ED7A37", DARK],
    label: `${LABELS}/pre-workout-orange-peach.webp`,
    drink: "#ff8424",
    desc: "Orange peach pre-workout with fulvic acid and saffron for primal endurance.",
  },
];

// The intro builds the orange peach can, so the page opens on it.
export const INTRO_FLAVOR = 1;
