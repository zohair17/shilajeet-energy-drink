"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { FLAVORS, INTRO_FLAVOR } from "../flavors";
import { experience } from "./store";
import {
  CAN_HEIGHT,
  CAN_RADIUS,
  MOUTH,
  buildCan,
  createCanGeometry,
  createCanMaterials,
  createLabelMaterial,
} from "./can";
import { createFruitMaterials, createOrangeChunks, createPeachGeometry, seeded } from "./fruit";
import { GLASS, createGlass, createLiquid, createStream } from "./pour";
import { createBackdrop } from "./backdrop";
import { createIntroTitle, createSwirl } from "./intro";
import {
  CAMERA_FOV,
  CAMERA_Z,
  TAU,
  centerPose,
  clamp01,
  copyPose,
  damp,
  easeIn,
  easeInOut,
  easeOut,
  easeOutBack,
  glassLayout,
  heroPose,
  mixPose,
  pose,
  pourPose,
  pourTilt,
  range,
  rectToWorld,
  shopPose,
  smoothstep,
  viewport,
  wrapSlot,
} from "./motion";

const LABEL_URLS = FLAVORS.map((f) => f.label);
const SCROLL_KEYS = ["heroOut", "showcase", "pourIn", "pour"];
const UP = new THREE.Vector3(0, 1, 0);

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const BG_RGB = FLAVORS.map((f) => hexToRgb(f.bg[0]));
const DRINK = FLAVORS.map((f) => new THREE.Color(f.drink));

// The one WebGL canvas behind the page. It draws the background (gradient and
// smoke), the intro, the cans on their scroll journey, and the pour.
export default function Scene({ onReady }) {
  return (
    <div className="fixed inset-x-0 top-0 h-lvh z-[1] pointer-events-none" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: false,
          stencil: false,
          powerPreference: "high-performance",
          toneMapping: THREE.NeutralToneMapping,
        }}
        camera={{ fov: CAMERA_FOV, position: [0, 0, CAMERA_Z], near: 0.1, far: 80 }}
        resize={{ scroll: false }}
        onCreated={(state) => {
          state.gl.transmissionResolutionScale = 0.75;
          experience.three = state;
        }}
      >
        <Studio />
        <Suspense fallback={null}>
          <World onReady={onReady} />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Studio lighting baked into an environment map once: tall soft boxes either
// side give the cans their vertical highlights, a top box and a dim fill keep
// the label readable.
function Studio() {
  return (
    <>
      <Environment resolution={256} frames={1}>
        <color attach="background" args={["#141414"]} />
        <Lightformer form="rect" intensity={2.2} position={[0, 6, 2]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={4.5} position={[-5, 1, 4]} scale={[2.4, 10, 1]} />
        <Lightformer form="rect" intensity={3} position={[5.5, 0.5, 2.5]} scale={[1.5, 10, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[0, -1, 8]} scale={[10, 5, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[0, 2, -8]} scale={[12, 6, 1]} />
        <Lightformer form="circle" intensity={1.8} position={[0, 8, 0]} scale={4} />
      </Environment>
      <ambientLight intensity={0.35} />
      <directionalLight position={[-3, 5, 6]} intensity={1.7} />
      <directionalLight position={[4, -2, -5]} intensity={0.6} />
    </>
  );
}

function World({ onReady }) {
  const gl = useThree((s) => s.gl);
  const labels = useLoader(THREE.TextureLoader, LABEL_URLS);
  const rig = useMemo(() => buildRig(labels, gl), [labels, gl]);
  // Per-frame working state (smoothed scroll, scratch vectors). Lives in a ref
  // because it changes every frame and never feeds a render.
  const state = useRef(null);

  const readyRef = useRef(onReady);
  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);

  useEffect(() => () => disposeRig(rig), [rig]);

  useFrame((root, delta) => {
    const st = (state.current ??= createState());
    step(root, Math.min(delta, 1 / 20), rig, st);
    if (!st.ready && st.frame >= 3) {
      st.ready = true;
      readyRef.current?.();
    }
  });

  return (
    <>
      {/* The smoke backdrop is the scene background, so the glass refracts it. */}
      <primitive attach="background" object={rig.backdrop.target.texture} />
      <primitive object={rig.root} />
    </>
  );
}

function buildRig(labels, gl) {
  const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
  for (const t of labels) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    t.needsUpdate = true;
  }

  const root = new THREE.Group();

  // Cans
  const canGeometry = createCanGeometry();
  const canMaterials = createCanMaterials();
  const cans = labels.map((t) => {
    const can = buildCan(canGeometry, canMaterials, createLabelMaterial(t));
    root.add(can.group);
    return can;
  });

  // Coloured rim light that takes the flavor colour.
  const rim = new THREE.DirectionalLight("#ffffff", 2.4);
  rim.position.set(-4, 3, -6);
  root.add(rim);

  // Intro fruit
  const random = seeded(23);
  const fm = createFruitMaterials(random);
  const fruit = new THREE.Group();
  root.add(fruit);

  const orange = new THREE.Group();
  orange.add(new THREE.Mesh(new THREE.SphereGeometry(1, 72, 54), fm.peel));
  const navel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.04, 16), fm.navel);
  navel.position.y = 0.995;
  orange.add(navel);
  fruit.add(orange);

  const chunks = createOrangeChunks(random).map((c) => {
    const mesh = new THREE.Mesh(c.geometry, [fm.peel, fm.flesh]);
    fruit.add(mesh);
    return {
      mesh,
      center: c.center,
      dir: c.dir,
      dist: 2.2 + random() * 1.7,
      spin: (random() * 2 - 1) * 4.5,
      axis: new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(),
    };
  });

  const peachGeometry = createPeachGeometry();
  const stemGeometry = new THREE.CylinderGeometry(0.03, 0.045, 0.22, 8);
  stemGeometry.translate(0, 0.92, 0);
  const leafGeometry = new THREE.SphereGeometry(1, 18, 8);
  leafGeometry.scale(0.34, 0.03, 0.13);
  leafGeometry.rotateZ(0.4);
  leafGeometry.translate(0.3, 1, 0);
  const peaches = Array.from({ length: 7 }, (_, i) => {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(peachGeometry, fm.peach), new THREE.Mesh(stemGeometry, fm.stem));
    if (i % 2 === 0) group.add(new THREE.Mesh(leafGeometry, fm.leaf));
    fruit.add(group);
    const angle = (i / 7) * TAU + random() * 0.5;
    return {
      group,
      angle,
      radius: 2.2 + random() * 1.1,
      y: (random() - 0.5) * 2,
      z: (random() - 0.5) * 2.4,
      size: 0.38 + random() * 0.12,
      from: new THREE.Vector3(Math.cos(angle) * 10, Math.sin(angle) * 7, 3 + random() * 4),
      tumble: new THREE.Vector3(random() * TAU, random() * TAU, random() * TAU),
      rate: 0.4 + random() * 0.6,
    };
  });

  const dropData = Array.from({ length: 220 }, () => ({
    dir: new THREE.Vector3(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1).normalize(),
    speed: 1.6 + random() * 3.4,
    size: 0.016 + random() * 0.048,
  }));
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), fm.juice, dropData.length);
  drops.frustumCulled = false;
  fruit.add(drops);

  const title = createIntroTitle(FLAVORS[INTRO_FLAVOR].bg[0]);
  root.add(title.mesh);

  // Pour
  const pour = new THREE.Group();
  root.add(pour);
  const glass = createGlass();
  const liquid = createLiquid();
  pour.add(glass, liquid);
  const stream = createStream();
  root.add(stream.mesh);
  const splashMaterial = new THREE.MeshStandardMaterial({ color: "#ff8424", roughness: 0.15 });
  const splashData = Array.from({ length: 28 }, () => ({
    phase: random(),
    vx: (random() - 0.5) * 1.4,
    vy: 0.9 + random() * 1.4,
    vz: (random() - 0.5) * 0.8,
    size: 0.4 + random() * 0.6,
  }));
  const splash = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), splashMaterial, splashData.length);
  splash.frustumCulled = false;
  root.add(splash);

  const swirl = createSwirl();
  root.add(swirl.mesh);

  const backdrop = createBackdrop();

  return {
    root,
    cans,
    rim,
    fruit,
    orange,
    chunks,
    peaches,
    drops,
    dropData,
    title,
    pour,
    glass,
    liquid,
    stream,
    splash,
    splashMaterial,
    splashData,
    swirl,
    backdrop,
  };
}

function disposeRig(rig) {
  const seen = new Set();
  rig.root.traverse((o) => {
    if (o.geometry && !seen.has(o.geometry)) {
      seen.add(o.geometry);
      o.geometry.dispose();
    }
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      if (seen.has(m)) continue;
      seen.add(m);
      for (const value of Object.values(m)) if (value?.isTexture) value.dispose();
      m.dispose();
    }
  });
  rig.backdrop.target.dispose();
  rig.backdrop.material.dispose();
}

function createState() {
  return {
    frame: 0,
    ready: false,
    ring: experience.active,
    sm: { heroOut: 0, showcase: 0, pourIn: 0, pour: 0, shopIn: 0 },
    hover: new Float32Array(FLAVORS.length),
    bg: [...BG_RGB[experience.active]],
    drink: DRINK[experience.active].clone(),
    focus: new THREE.Vector2(0.5, 0.5),
    stir: 0,
    burstQ: new THREE.Quaternion(),
    P: { hero: pose(), center: pose(), pour: pose(), shop: pose(), a: pose(), out: pose() },
    rect: {},
    stage: {},
    layout: {},
    v: new THREE.Vector3(),
    w: new THREE.Vector3(),
    mouth: new THREE.Vector3(),
    ctrl: new THREE.Vector3(),
    land: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    q: new THREE.Quaternion(),
    m: new THREE.Matrix4(),
    scl: new THREE.Vector3(),
  };
}

function applyCan(can, p) {
  const g = can.group;
  g.position.set(p.x, p.y, p.z);
  g.rotation.set(p.rx, 0, p.rz);
  can.spin.rotation.y = p.ry;
  g.scale.setScalar(Math.max(p.s, 1e-4));
  g.visible = p.s > 1e-3;
}

// Spiral used while the intro dives into the juice: things closer to the axis
// turn faster, everything is pulled in and towards the camera.
function vortex(v, sw) {
  if (sw <= 0) return v;
  const s2 = sw * sw;
  const a = s2 * (2.4 + 2.2 / (Math.hypot(v.x, v.y) + 0.6));
  const c = Math.cos(a);
  const s = Math.sin(a);
  const k = 1 - 0.55 * sw;
  return v.set((v.x * c - v.y * s) * k, (v.x * s + v.y * c) * k, v.z + s2 * 6);
}

function step(root, dt, rig, st) {
  const { gl, camera, size, clock } = root;
  const t = clock.elapsedTime;
  const view = viewport(size);
  const I = experience.intro;
  const intro = I.playing;
  const n = FLAVORS.length;
  const active = experience.active;
  // The first frames draw everything once so every shader is compiled before
  // the intro starts.
  const warm = st.frame < 2;
  st.frame += 1;

  // Scroll stages, eased a touch so wheel steps never read as jumps.
  const sm = st.sm;
  for (const key of SCROLL_KEYS) sm[key] = damp(sm[key], experience.scroll[key], 10, dt);
  let shopRaw = 0;
  if (experience.el.shop) {
    const r = experience.el.shop.getBoundingClientRect();
    shopRaw = clamp01((view.H - r.top) / (view.H * 0.85));
  }
  sm.shopIn = damp(sm.shopIn, intro ? 0 : shopRaw, 10, dt);

  // Carousel turns towards the selected can the short way round.
  st.ring = damp(st.ring, st.ring + wrapSlot(active - st.ring, n), 6.5, dt);

  // Camera: pushes in on the burst and dives into the swirl, and is back in
  // place (hidden by the swirl) before the can is revealed.
  const live = intro && I.reveal <= 0 && I.cover < 0.98;
  const dive = live ? easeIn(I.swirl) : 0;
  const push = live ? easeInOut(I.burst) : 0;
  camera.fov = CAMERA_FOV - 11 * dive;
  camera.position.set(0, 0, CAMERA_Z - 1.4 * push - 3.2 * dive);
  camera.updateProjectionMatrix();

  // Pour stage, measured before the cans because the travelling can uses it.
  let layout = null;
  if (experience.el.glass && !intro) {
    rectToWorld(experience.el.glass, view, st.stage);
    layout = glassLayout(st.stage, st.layout);
  }

  // Cans
  const P = st.P;
  let traveler = null;
  for (let i = 0; i < n; i++) {
    const can = rig.cans[i];
    const slot = wrapSlot(i - st.ring, n);
    const out = P.out;
    heroPose(slot, view, t, P.hero);

    const hovered = experience.hovered === i;
    st.hover[i] = hovered
      ? st.hover[i] + dt * 3.5
      : damp(st.hover[i], Math.round(st.hover[i] / TAU) * TAU, 5, dt);
    const sway = Math.sin(t * 0.8 + i * 1.3) * 0.3 + st.hover[i];
    const slotEl = experience.el.shopSlots[i];

    if (i === active) {
      traveler = can;
      if (intro) {
        // Spins into view in the middle, then drops into the carousel.
        centerPose(view, P.a);
        const rv = easeOut(I.reveal);
        P.a.s *= 0.9 + 0.1 * rv;
        P.a.ry = (1 - rv) * TAU * 1.25;
        mixPose(out, P.a, P.hero, easeInOut(I.toHero));
        if (I.reveal <= 0) out.s = 0;
      } else {
        // Hero → centre → 360° turn → beside the glass and pour → product card.
        copyPose(out, P.hero);
        centerPose(view, P.center);
        mixPose(out, out, P.center, easeInOut(sm.heroOut));
        const turn = easeInOut(range(sm.showcase, 0.2, 0.8));
        if (turn < 1) out.ry += turn * TAU;
        if (layout) {
          pourPose(layout, pourTilt(sm.pour), P.pour);
          mixPose(out, out, P.pour, easeInOut(sm.pourIn));
        }
        if (slotEl && sm.shopIn > 0) {
          rectToWorld(slotEl, view, st.rect);
          shopPose(st.rect, sway, P.shop);
          mixPose(out, out, P.shop, easeInOut(sm.shopIn));
        }
      }
    } else if (intro) {
      // Slide in from beyond the edges as the intro can lands.
      const e = easeOut(I.toHero);
      heroPose(slot * (1 + 1.6 * (1 - e)), view, t, out);
      out.s *= e;
    } else {
      // Drift up and away with the hero, reappear in their product cards.
      copyPose(out, P.hero);
      const away = easeIn(sm.heroOut);
      out.y += away * view.vh * 0.85;
      out.x *= 1 + away * 0.5;
      out.s *= 1 - smoothstep(0.3, 0.95, sm.heroOut);
      if (slotEl && sm.shopIn > 0.001) {
        const order = ((i - active + n) % n) - 1;
        const grow = easeOutBack(range(sm.shopIn, 0.3 + order * 0.08, 0.72 + order * 0.08));
        rectToWorld(slotEl, view, st.rect);
        shopPose(st.rect, sway, out);
        out.s *= grow;
      }
    }

    if (warm) out.s = Math.max(out.s, 2e-3);
    applyCan(can, out);
    can.opening.visible = (i === active && !intro && sm.pourIn > 0.5 && sm.shopIn < 0.6) || warm;

    // Screen box of each carousel can, for click-to-select in the hero.
    const box = (experience.heroCans[i] ??= { on: false, x: 0, y: 0, hw: 0, hh: 0, rz: 0, z: 0 });
    box.on = !intro && sm.heroOut < 0.3 && out.s > 1e-3;
    if (box.on) {
      st.v.set(out.x, out.y, out.z).project(camera);
      const px = view.H / (2 * (CAMERA_Z - out.z) * Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180));
      box.x = ((st.v.x + 1) / 2) * view.W;
      box.y = ((1 - st.v.y) / 2) * view.H;
      box.hw = CAN_RADIUS * out.s * px;
      box.hh = (CAN_HEIGHT / 2) * out.s * px;
      box.rz = out.rz;
      box.z = out.z;
    }
  }

  stepFruit(rig, st, view, t, warm);
  stepPour(rig, st, view, t, dt, layout, traveler, warm);

  // Intro swirl overlay
  const sw = rig.swirl.material.uniforms;
  rig.swirl.mesh.visible = (intro && I.cover > 0.001) || warm;
  sw.uCover.value = warm ? 0.0001 : I.cover;
  sw.uTime.value = t;
  sw.uAspect.value = view.W / view.H;
  sw.uSpin.value = I.swirl + I.reveal * 0.6;

  // Flavor colour for the background, smoke and rim light.
  const c = BG_RGB[active];
  for (let k = 0; k < 3; k++) st.bg[k] = damp(st.bg[k], c[k], 3.5, dt);
  rig.rim.color.setRGB(st.bg[0], st.bg[1], st.bg[2], THREE.SRGBColorSpace);

  // Background: smoke gathers behind the travelling can.
  let fx = 0.5;
  let fy = 0.5;
  if (traveler && traveler.group.visible && !intro) {
    st.v.copy(traveler.group.position).project(camera);
    fx = clamp01((st.v.x + 1) / 2);
    fy = clamp01((st.v.y + 1) / 2);
  }
  st.focus.x = damp(st.focus.x, fx, 2.5, dt);
  st.focus.y = damp(st.focus.y, fy, 2.5, dt);

  const bd = rig.backdrop;
  const dpr = root.viewport.dpr || 1;
  const w = Math.max(64, Math.round((view.W * dpr) / 2.5));
  const h = Math.max(64, Math.round((view.H * dpr) / 2.5));
  if (bd.target.width !== w || bd.target.height !== h) bd.target.setSize(w, h);
  const u = bd.material.uniforms;
  u.uTime.value = t;
  u.uAspect.value = view.W / view.H;
  u.uColor.value.set(st.bg[0], st.bg[1], st.bg[2]);
  u.uDark.value = intro ? I.dark : 0;
  u.uSmoke.value = (1 - 0.45 * sm.pourIn) * (1 - sm.shopIn);
  u.uFocus.value.copy(st.focus);
  gl.setRenderTarget(bd.target);
  gl.render(bd.scene, bd.camera);
  gl.setRenderTarget(null);
}

function stepFruit(rig, st, view, t, warm) {
  const I = experience.intro;
  const intro = I.playing;
  const pre = intro && I.reveal <= 0;
  const on = warm || (intro && (I.cover < 0.985 || I.reveal > 0));
  rig.fruit.visible = on;
  rig.title.mesh.visible = warm || (intro && I.burst < 0.2 && I.orange > 0);
  if (!on) return;

  const { v, w, q, m, scl } = st;
  const R = view.compact ? Math.min(0.72, view.vw * 0.3) : 1.15;
  const sw = I.swirl;

  // Title card far behind the orange.
  const depth = 4.5;
  const visH = 2 * (CAMERA_Z + depth) * Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180);
  rig.title.mesh.position.set(0, 0, -depth);
  rig.title.mesh.scale.setScalar(Math.min(visH * (view.W / view.H) * 0.88, visH * 1.7));
  rig.title.material.opacity = easeOut(I.orange) * (1 - smoothstep(0, 0.12, I.burst));

  // Whole orange, trembling just before it bursts.
  const shake = I.shake;
  rig.orange.visible = warm || (pre && I.burst <= 0 && I.orange > 0);
  rig.orange.position.set(Math.sin(t * 63) * 0.03 * shake * R, Math.cos(t * 57) * 0.03 * shake * R, 0);
  rig.orange.rotation.set(0.3, t * 0.7, 0.1);
  rig.orange.scale.setScalar(R * Math.max(1e-4, easeOutBack(I.orange)) * (1 + 0.04 * shake * Math.sin(t * 40)));
  if (I.burst <= 0) st.burstQ.copy(rig.orange.quaternion);

  // Burst: fast at first, then a slow drift.
  const b = I.burst;
  const disp = (1 - Math.exp(-5.5 * b)) / (1 - Math.exp(-5.5));
  const chunksOn = warm || (pre && b > 0);
  for (const c of rig.chunks) {
    c.mesh.visible = chunksOn;
    if (!chunksOn) continue;
    v.copy(c.dir).multiplyScalar(c.dist * disp + 0.12 * b).add(c.center).applyQuaternion(st.burstQ).multiplyScalar(R);
    vortex(v, sw);
    c.mesh.position.copy(v);
    q.setFromAxisAngle(c.axis, c.spin * (disp + 0.3 * b));
    c.mesh.quaternion.copy(st.burstQ).multiply(q);
    c.mesh.scale.setScalar(R);
  }

  // Juice spray, stretched along its direction while it is fast.
  const dropsOn = warm || (pre && b > 0 && b < 0.999);
  rig.drops.visible = dropsOn;
  if (dropsOn) {
    const fade = 1 - smoothstep(0.7, 1, b);
    const stretch = 1 + 3.2 * Math.exp(-7 * b);
    for (let j = 0; j < rig.dropData.length; j++) {
      const d = rig.dropData[j];
      w.copy(d.dir).applyQuaternion(st.burstQ);
      v.copy(w).multiplyScalar((0.92 + d.speed * disp) * R);
      v.y -= 0.9 * b * b * R;
      vortex(v, sw);
      const sz = Math.max(d.size * R * fade * smoothstep(0, 0.03, b), warm ? 1e-3 : 0);
      q.setFromUnitVectors(UP, w);
      scl.set(sz, sz * stretch, sz);
      m.compose(v, q, scl);
      rig.drops.setMatrixAt(j, m);
    }
    rig.drops.instanceMatrix.needsUpdate = true;
  }

  // Peaches fly in around the burst, then orbit the finished can.
  const canH = CAN_HEIGHT * centerPose(view, st.P.center).s;
  const canY = st.P.center.y;
  for (let k = 0; k < rig.peaches.length; k++) {
    const p = rig.peaches[k];
    let s = 0;
    if (pre && I.peaches > 0) {
      w.set(Math.cos(p.angle) * p.radius * R, p.y * R * 0.8, p.z);
      v.lerpVectors(p.from, w, easeOut(I.peaches));
      v.y += Math.sin(t * 1.3 + k) * 0.05;
      vortex(v, sw);
      s = p.size * R * smoothstep(0, 0.15, I.peaches);
    } else if (intro && I.reveal > 0) {
      const a = t * 0.6 + (k / rig.peaches.length) * TAU;
      const spread = 1 + 2.4 * easeIn(I.toHero);
      v.set(
        Math.cos(a) * canH * 0.52 * spread,
        canY + ((k % 3) - 1) * canH * 0.3 + Math.sin(t * 0.9 + k) * 0.05,
        Math.sin(a) * canH * 0.34 * spread
      );
      s = canH * 0.085 * easeOut(range(I.reveal, 0, 0.6)) * (1 - easeIn(I.toHero));
    }
    if (warm) s = Math.max(s, 1e-3);
    p.group.visible = s > 5e-4;
    p.group.position.copy(v);
    p.group.rotation.set(p.tumble.x + t * p.rate, p.tumble.y + t * p.rate * 0.7, p.tumble.z);
    p.group.scale.setScalar(Math.max(s, 1e-4));
  }
}

function stepPour(rig, st, view, t, dt, layout, traveler, warm) {
  const sm = st.sm;
  const active = experience.active;
  const glassOn = !!layout && st.stage.bottom > -view.H * 0.25 && st.stage.top < view.H * 1.25;
  rig.pour.visible = glassOn || warm;

  st.drink.lerp(DRINK[active], 1 - Math.exp(-4 * dt));
  const lu = rig.liquid.material.uniforms;
  const su = rig.stream.material.uniforms;
  lu.uColor.value.copy(st.drink);
  su.uColor.value.copy(st.drink);
  rig.splashMaterial.color.copy(st.drink);

  let flowing = false;
  let head = 0;
  if (layout) {
    const G = layout.G;
    rig.pour.position.set(layout.x, layout.base, 0);
    rig.pour.scale.setScalar(G);

    const q = sm.pour;
    const fill = easeOut(range(q, 0.18, 0.88));
    const level = GLASS.innerBase + 0.002 + fill * 0.74;
    lu.uLevel.value = level;
    lu.uTime.value = t;
    rig.liquid.visible = fill > 0.003 || warm;

    head = range(q, 0.13, 0.2);
    const tail = range(q, 0.82, 0.88);
    flowing = head > 0 && tail < 1 && sm.pourIn > 0.98;
    st.stir = damp(st.stir, flowing ? 1 : 0, 4, dt);
    lu.uStir.value = st.stir;
    lu.uFoam.value = smoothstep(0, 0.12, fill) * (0.55 + 0.45 * st.stir);

    if (flowing && traveler) {
      traveler.group.updateMatrixWorld(true);
      st.mouth.copy(MOUTH);
      traveler.spin.localToWorld(st.mouth);
      const tilt = traveler.group.rotation.z;
      st.dir.set(-Math.sin(tilt), Math.cos(tilt), 0);
      st.land.set(layout.x - G * 0.04, layout.base + level * G, 0);
      st.ctrl.copy(st.mouth).addScaledVector(st.dir, G * 0.18);
      rig.stream.update(st.mouth, st.ctrl, st.land, G * 0.036, G * 0.024, t);
      su.uHead.value = head;
      su.uTail.value = tail;
      su.uTime.value = t;
      const r = (GLASS.innerRadius + GLASS.innerSlope * (level - GLASS.innerBase)) * G;
      lu.uImpact.value.set((st.land.x - layout.x) / r, 0);
    }
  }
  rig.stream.mesh.visible = flowing || warm;
  if (warm) {
    su.uHead.value = 1;
    su.uTail.value = 0;
  }

  // Droplets kicked up where the stream hits the drink.
  const splashing = (flowing && head >= 1) || warm;
  rig.splash.visible = splashing;
  if (splashing && layout) {
    const G = layout.G;
    for (let j = 0; j < rig.splashData.length; j++) {
      const d = rig.splashData[j];
      const tau = (t * 1.8 + d.phase) % 1;
      st.v.set(
        st.land.x + d.vx * tau * G * 0.22,
        st.land.y + (d.vy * tau - 2.6 * tau * tau) * G * 0.22,
        st.land.z + d.vz * tau * G * 0.22
      );
      const sz = st.v.y < st.land.y ? 0 : 0.013 * G * d.size * (1 - tau);
      st.scl.setScalar(Math.max(sz, warm ? 1e-3 : 0));
      st.m.compose(st.v, st.q.identity(), st.scl);
      rig.splash.setMatrixAt(j, st.m);
    }
    rig.splash.instanceMatrix.needsUpdate = true;
  }
}
