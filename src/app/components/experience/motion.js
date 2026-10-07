import { CAN_HEIGHT, MOUTH } from "./can";

// Camera every pose is laid out for. Visible height at z = 0 is
// 2 * CAMERA_Z * tan(fov / 2).
export const CAMERA_FOV = 30;
export const CAMERA_Z = 12;
export const VISIBLE_HEIGHT = 2 * CAMERA_Z * Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180);

export const TAU = Math.PI * 2;

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
export const range = (x, from, to) => clamp01((x - from) / (to - from));
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOut = (t) => 1 - (1 - t) ** 3;
export const easeIn = (t) => t * t * t;
export const easeOutBack = (t) => {
  const c = 1.5;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};
// Frame-rate independent exponential approach.
export const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));

// Wraps an index offset into [-n/2, n/2) so the carousel is endless.
export const wrapSlot = (v, n) => {
  const h = n / 2;
  return ((((v + h) % n) + n) % n) - h;
};

export const pose = () => ({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 0 });

export function copyPose(out, p) {
  out.x = p.x;
  out.y = p.y;
  out.z = p.z;
  out.rx = p.rx;
  out.ry = p.ry;
  out.rz = p.rz;
  out.s = p.s;
  return out;
}

export function mixPose(out, a, b, t) {
  out.x = lerp(a.x, b.x, t);
  out.y = lerp(a.y, b.y, t);
  out.z = lerp(a.z, b.z, t);
  out.rx = lerp(a.rx, b.rx, t);
  out.ry = lerp(a.ry, b.ry, t);
  out.rz = lerp(a.rz, b.rz, t);
  out.s = lerp(a.s, b.s, t);
  return out;
}

// Canvas size in CSS px → world units on the z = 0 plane.
export function viewport(size) {
  const W = size.width || 1;
  const H = size.height || 1;
  const k = VISIBLE_HEIGHT / H;
  // `compact` matches the stacked (below lg) page layout: text above and
  // below the can instead of beside it.
  return { W, H, k, vh: VISIBLE_HEIGHT, vw: W * k, compact: W < 1024 || W / H < 0.85 };
}

// Centre and size of a DOM element in world units (z = 0 plane).
export function rectToWorld(el, view, out) {
  const r = el.getBoundingClientRect();
  out.x = (r.left + r.width / 2 - view.W / 2) * view.k;
  out.y = (view.H / 2 - (r.top + r.height / 2)) * view.k;
  out.w = r.width * view.k;
  out.h = r.height * view.k;
  out.top = r.top;
  out.bottom = r.bottom;
  return out;
}

// Hero carousel: the selected can (slot 0) stands in front, the others fan
// out to either side on a falling diagonal, further back and turned inwards.
export function heroPose(slot, view, time, out) {
  const ax = Math.abs(slot);
  const p = view.compact;
  const size = p
    ? Math.min((view.vh * 0.36) / CAN_HEIGHT, view.vw * 0.34)
    : (view.vh * 0.46) / CAN_HEIGHT;
  const spacing = p ? view.vw * 0.36 : Math.min(view.vw * 0.19, view.vh * 0.44);

  out.x = slot * spacing * (1 + 0.1 * ax);
  out.y = view.vh * (p ? 0.11 : 0.125) - slot * view.vh * 0.045 - ax * ax * view.vh * 0.01;
  out.y += Math.sin(time * 1.1 + slot * 1.7) * view.vh * 0.006;
  out.z = -ax * 1.5 - ax * ax * 0.5;
  out.rx = 0.14;
  out.rz = -0.26 - slot * 0.04;
  out.ry = -slot * 0.5 + Math.sin(time * 0.55 + slot) * 0.1;
  out.s = size * (1 - 0.04 * ax) * smoothstep(2.5, 2.02, ax);
  return out;
}

// Upright in the middle of the screen (showcase, intro reveal).
export function centerPose(view, out) {
  const p = view.compact;
  out.x = 0;
  out.y = p ? -view.vh * 0.02 : 0;
  out.z = 0;
  out.rx = 0;
  out.ry = 0;
  out.rz = 0;
  out.s = p
    ? Math.min((view.vh * 0.36) / CAN_HEIGHT, view.vw * 0.48)
    : (view.vh * 0.62) / CAN_HEIGHT;
  return out;
}

// Glass placement inside the pour stage element: the glass stands at the
// bottom, right of centre, half the stage tall. Everything about the pour is
// measured in glass heights (G).
export function glassLayout(stage, out) {
  const G = stage.h * 0.5;
  out.G = G;
  out.x = stage.x + G * 0.42;
  out.base = stage.y - stage.h / 2 + stage.h * 0.04;
  out.top = out.base + G;
  out.canScale = (G * 1.2) / CAN_HEIGHT;
  out.mouthX = out.x - G * 0.4 * 0.45;
  out.mouthY = out.top + G * 0.42;
  return out;
}

// Tilt of the can over the pour (radians, negative = clockwise): tip over,
// keep tipping as it empties, then come back up.
export function pourTilt(q) {
  if (q < 0.16) return -1.15 * easeInOut(q / 0.16);
  if (q < 0.84) return -1.15 - 0.47 * smoothstep(0.16, 0.84, q);
  return lerp(-1.62, -0.5, easeInOut((q - 0.84) / 0.16));
}

// The can pivots about its mouth once it is tipped, so the mouth stays over
// the glass; upright, it stands a little further left.
export function pourPose(layout, tilt, out) {
  const s = layout.canScale;
  const mx = MOUTH.x * s;
  const my = MOUTH.y * s;
  const c = Math.cos(tilt);
  const sn = Math.sin(tilt);
  const away = 1 - smoothstep(0, 1.1, -tilt);
  out.x = layout.mouthX - (mx * c - my * sn) - away * layout.G * 0.5;
  out.y = layout.mouthY - (mx * sn + my * c) + away * layout.G * 0.1;
  out.z = 0;
  out.rx = 0;
  out.ry = 0;
  out.rz = tilt;
  out.s = s;
  return out;
}

// Parked in a product card.
export function shopPose(slot, sway, out) {
  out.x = slot.x;
  out.y = slot.y;
  out.z = 0;
  out.rx = 0.05;
  out.ry = sway;
  out.rz = 0;
  out.s = (slot.h * 0.94) / CAN_HEIGHT;
  return out;
}
