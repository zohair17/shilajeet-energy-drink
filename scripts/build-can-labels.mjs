// Builds the wrap-around label textures used by the 3D cans.
//
// Each source PNG is a front-on render of a can, so it shows the front half of
// the label squeezed by the cylinder. This script undoes that: every texture
// column is an angle around the can, sampled from the render at
// x = centre + radius * sin(angle). The render's baked lighting is divided out
// (measured on the plain white band at the top of the label) so the 3D lights
// do the shading instead. The front half of the artwork is used twice (front
// and back of the can) and the gaps at the sides are blended from the edges.
//
// Run with `npm run labels` after replacing any can artwork in
// public/asset/bottles. Output goes to public/asset/labels/<id>.webp.

import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SRC = "public/asset/bottles";
const OUT = "public/asset/labels";

// `top` / `bottom` are the first and last rows of the printed label in each
// render (just inside the metal neck and base).
const CANS = [
  { id: "kiwi-lemon", file: "kiwi-lemon.png", top: 130, bottom: 1309 },
  { id: "orange-peach", file: "orange-peech.png", top: 137, bottom: 1134 },
  { id: "pineapple-guava", file: "Pineapple-guava.png", top: 127, bottom: 897 },
  { id: "strawberry", file: "strawberry.png", top: 96, bottom: 815 },
  { id: "pre-workout-orange-peach", file: "pree-workut-orange-peech.png", top: 115, bottom: 1082 },
];

const OUT_W = 1536;
const OUT_H = 1312;
// Widest angle sampled from the render. Past this the artwork is too squeezed
// and too dark to use, so the sides are filled from this column instead.
const EDGE = (68 * Math.PI) / 180;
// White the plain label area is normalised to (sRGB, 0-255).
const WHITE = 247;

const toLin = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const toSrgb = (l) => {
  const v = l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
};

async function build({ id, file, top, bottom }) {
  const { data, info } = await sharp(`${SRC}/${file}`)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  // Silhouette per row, then a straight-line fit so the centre and radius are
  // smooth down the whole label.
  const rows = [];
  for (let y = top; y <= bottom; y += 2) {
    let l = -1;
    let r = -1;
    for (let x = 0; x < W; x++) if (data[(y * W + x) * C + 3] > 128) { l = x; break; }
    for (let x = W - 1; x >= 0; x--) if (data[(y * W + x) * C + 3] > 128) { r = x; break; }
    if (l >= 0 && r > l) rows.push({ y, c: (l + r) / 2, h: (r - l + 1) / 2 });
  }
  const fit = (key) => {
    const n = rows.length;
    const my = rows.reduce((a, p) => a + p.y, 0) / n;
    const mv = rows.reduce((a, p) => a + p[key], 0) / n;
    let num = 0;
    let den = 0;
    for (const p of rows) {
      num += (p.y - my) * (p[key] - mv);
      den += (p.y - my) ** 2;
    }
    const slope = den ? num / den : 0;
    return (y) => mv + slope * (y - my);
  };
  const centreAt = fit("c");
  const radiusAt = fit("h");

  // Bilinear sample of the render, returned in linear light.
  const sample = (x, y, out) => {
    const x0 = Math.max(0, Math.min(W - 2, Math.floor(x)));
    const y0 = Math.max(0, Math.min(H - 2, Math.floor(y)));
    const fx = Math.min(1, Math.max(0, x - x0));
    const fy = Math.min(1, Math.max(0, y - y0));
    for (let k = 0; k < 3; k++) {
      const a = toLin(data[(y0 * W + x0) * C + k]);
      const b = toLin(data[(y0 * W + x0 + 1) * C + k]);
      const c = toLin(data[((y0 + 1) * W + x0) * C + k]);
      const d = toLin(data[((y0 + 1) * W + x0 + 1) * C + k]);
      out[k] = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
    }
    return out;
  };

  // Front-half strip: STRIP_W columns covering [-EDGE, EDGE].
  const STRIP_W = Math.round((OUT_W * (2 * EDGE)) / (2 * Math.PI));
  const strip = new Float32Array(STRIP_W * OUT_H * 3);
  const px = [0, 0, 0];
  for (let v = 0; v < OUT_H; v++) {
    const sy = top + ((v + 0.5) / OUT_H) * (bottom - top);
    const cx = centreAt(sy);
    const rad = radiusAt(sy) - 1.5;
    for (let u = 0; u < STRIP_W; u++) {
      const a = -EDGE + ((u + 0.5) / STRIP_W) * 2 * EDGE;
      sample(cx + rad * Math.sin(a), sy, px);
      const i = (v * STRIP_W + u) * 3;
      strip[i] = px[0];
      strip[i + 1] = px[1];
      strip[i + 2] = px[2];
    }
  }

  // Baked lighting: the brightest quarter of each column within the plain white
  // band near the top of the label, smoothed across columns.
  const bandFrom = Math.round(OUT_H * 0.01);
  const bandTo = Math.round(OUT_H * 0.06);
  const level = new Float32Array(STRIP_W);
  for (let u = 0; u < STRIP_W; u++) {
    const lum = [];
    for (let v = bandFrom; v < bandTo; v++) {
      const i = (v * STRIP_W + u) * 3;
      lum.push(0.2126 * strip[i] + 0.7152 * strip[i + 1] + 0.0722 * strip[i + 2]);
    }
    lum.sort((a, b) => a - b);
    level[u] = lum[Math.floor(lum.length * 0.75)];
  }
  const target = toLin(WHITE);
  const gain = new Float32Array(STRIP_W);
  const R = 2;
  for (let u = 0; u < STRIP_W; u++) {
    let s = 0;
    let n = 0;
    for (let k = -R; k <= R; k++) {
      const j = Math.max(0, Math.min(STRIP_W - 1, u + k));
      s += level[j];
      n++;
    }
    gain[u] = Math.max(0.85, Math.min(1.9, target / Math.max(1e-4, s / n)));
  }
  for (let v = 0; v < OUT_H; v++) {
    for (let u = 0; u < STRIP_W; u++) {
      const i = (v * STRIP_W + u) * 3;
      strip[i] *= gain[u];
      strip[i + 1] *= gain[u];
      strip[i + 2] *= gain[u];
    }
  }

  // Full wrap. Column OUT_W / 2 is the front of the can; the strip is placed
  // there and again at the back, and the side gaps blend edge to edge.
  const out = Buffer.alloc(OUT_W * OUT_H * 3);
  const gapStart = EDGE;
  const gapLen = Math.PI - 2 * EDGE;
  const stripAt = (a, v, k) => {
    const u = Math.max(0, Math.min(STRIP_W - 1, Math.round(((a + EDGE) / (2 * EDGE)) * STRIP_W - 0.5)));
    return strip[(v * STRIP_W + u) * 3 + k];
  };
  for (let u = 0; u < OUT_W; u++) {
    const phi = ((u + 0.5) / OUT_W) * 2 * Math.PI - Math.PI;
    const local = Math.abs(phi) <= Math.PI / 2 ? phi : phi - Math.sign(phi) * Math.PI;
    for (let v = 0; v < OUT_H; v++) {
      const o = (v * OUT_W + u) * 3;
      for (let k = 0; k < 3; k++) {
        let lin;
        if (Math.abs(local) <= EDGE) {
          lin = stripAt(local, v, k);
        } else {
          // Right-hand gaps run from the +EDGE column to the -EDGE column.
          const right = phi > 0 ? phi : phi + Math.PI;
          const w = Math.min(1, Math.max(0, (right - gapStart) / gapLen));
          const t = w * w * (3 - 2 * w);
          lin = stripAt(EDGE, v, k) * (1 - t) + stripAt(-EDGE, v, k) * t;
        }
        out[o + k] = toSrgb(lin);
      }
    }
  }

  await sharp(out, { raw: { width: OUT_W, height: OUT_H, channels: 3 } })
    .webp({ quality: 88 })
    .toFile(`${OUT}/${id}.webp`);
  console.log(`${id}: centre ${centreAt(top).toFixed(1)}, radius ${radiusAt(top).toFixed(1)}`);
}

await mkdir(OUT, { recursive: true });
for (const can of CANS) await build(can);
