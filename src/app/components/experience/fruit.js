import * as THREE from "three";

// Procedural fruit for the intro: textures are painted on canvases at runtime,
// geometry is generated, nothing is loaded from disk.

// Small seeded RNG so the fracture pattern and textures are identical on every
// load.
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function paint(width, height, draw, srgb = true) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function blob(ctx, x, y, r, inner, outer) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// Orange peel colour plus a bump map of pores.
export function createOrangeTextures(random) {
  const map = paint(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = "#f88c1c";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 420; i++) {
      const tone = random();
      blob(
        ctx,
        random() * w,
        random() * h,
        12 + random() * 48,
        tone < 0.55 ? "rgba(255,176,60,0.32)" : tone < 0.95 ? "rgba(226,108,12,0.16)" : "rgba(170,150,40,0.08)",
        "rgba(0,0,0,0)"
      );
    }
    for (let i = 0; i < 26000; i++) {
      ctx.fillStyle = random() < 0.5 ? "rgba(190,86,6,0.32)" : "rgba(255,192,96,0.28)";
      ctx.fillRect(random() * w, random() * h, 1.6, 1.6);
    }
  });

  const bump = paint(
    1024,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = "#8c8c8c";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 32000; i++) {
        ctx.fillStyle = `rgba(30,30,30,${0.3 + random() * 0.45})`;
        ctx.beginPath();
        ctx.arc(random() * w, random() * h, 0.8 + random() * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    false
  );

  return { map, bump };
}

// Inside of a broken orange. The top rows are the cut edge (peel, then the
// white pith), the rest is juicy flesh with vesicles pointing at the core.
export function createFleshTexture(random) {
  return paint(512, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#ff9a22");
    g.addColorStop(1, "#ffb447");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 1500; i++) {
      ctx.save();
      ctx.translate(random() * w, h * (0.08 + random() * 0.92));
      ctx.rotate((random() - 0.5) * 0.35);
      ctx.fillStyle = random() < 0.5 ? "rgba(255,210,120,0.55)" : "rgba(232,104,6,0.45)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.5 + random() * 5, 10 + random() * 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.strokeStyle = "rgba(255,238,196,0.8)";
    ctx.lineWidth = 3;
    for (let k = 0; k < 4; k++) {
      const x = ((k + 0.5) * w) / 4 + (random() - 0.5) * 30;
      ctx.beginPath();
      ctx.moveTo(x, h * 0.08);
      ctx.lineTo(x + (random() - 0.5) * 24, h);
      ctx.stroke();
    }

    ctx.fillStyle = "#e5740e";
    ctx.fillRect(0, 0, w, h * 0.035);
    const pith = ctx.createLinearGradient(0, h * 0.035, 0, h * 0.1);
    pith.addColorStop(0, "#fff5de");
    pith.addColorStop(1, "rgba(255,226,170,0)");
    ctx.fillStyle = pith;
    ctx.fillRect(0, h * 0.035, w, h * 0.065);
  });
}

// Peach skin: warm yellow base, red blush on one side, fine speckles.
export function createPeachTexture(random) {
  return paint(512, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#f0a03a");
    g.addColorStop(0.5, "#f7b653");
    g.addColorStop(1, "#e88f36");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 80; i++) {
      const r = 30 + random() * 90;
      blob(
        ctx,
        w * (0.18 + random() * 0.55),
        h * (0.1 + random() * 0.8),
        r,
        `rgba(${(196 + random() * 34) | 0},${(44 + random() * 30) | 0},${(36 + random() * 20) | 0},0.36)`,
        "rgba(200,60,40,0)"
      );
    }
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = `rgba(150,40,30,${0.18 + random() * 0.35})`;
      ctx.fillRect(random() * w, random() * h, 1.3, 1.3);
    }
  });
}

// computeVertexNormals leaves the UV seam and the poles of a sphere with
// mismatched normals; average them back so the shading has no visible seam.
function smoothSphereNormals(geometry, widthSegments, heightSegments) {
  geometry.computeVertexNormals();
  const n = geometry.attributes.normal;
  const row = widthSegments + 1;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let y = 0; y <= heightSegments; y++) {
    if (y === 0 || y === heightSegments) {
      a.set(0, 0, 0);
      for (let x = 0; x <= widthSegments; x++) a.add(b.fromBufferAttribute(n, y * row + x));
      a.normalize();
      for (let x = 0; x <= widthSegments; x++) n.setXYZ(y * row + x, a.x, a.y, a.z);
    } else {
      a.fromBufferAttribute(n, y * row).add(b.fromBufferAttribute(n, y * row + widthSegments)).normalize();
      n.setXYZ(y * row, a.x, a.y, a.z);
      n.setXYZ(y * row + widthSegments, a.x, a.y, a.z);
    }
  }
  n.needsUpdate = true;
}

// Unit peach: slightly squat sphere with a crease down one side and a dimple
// where the stem sits.
export function createPeachGeometry() {
  const W = 64;
  const H = 48;
  const geometry = new THREE.SphereGeometry(1, W, H);
  const p = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const around = Math.atan2(v.x, v.z);
    const crease = Math.exp(-((around / 0.2) ** 2)) * (1 - Math.abs(v.y) ** 3);
    const stem = Math.exp(-(((1 - v.y) / 0.16) ** 2));
    const tip = Math.exp(-(((1 + v.y) / 0.22) ** 2));
    v.multiplyScalar(1 - 0.07 * crease - 0.1 * stem + 0.03 * tip);
    v.y *= 0.93;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  smoothSphereNormals(geometry, W, H);
  return geometry;
}

// Same parametrisation as THREE.SphereGeometry, so a chunk's peel lines up with
// the whole orange's texture at the moment it bursts.
function onSphere(theta, phi, out) {
  return out.set(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
}

// One piece of the burst orange: a patch of peel (group 0) closed off with
// cut faces running to the core (group 1). Returned centred on its own middle
// so it can tumble in place; `center` is where it sits inside the whole fruit.
function buildChunk(t0, t1, p0, p1) {
  const NT = 6;
  const NP = 8;
  const grid = [];
  for (let i = 0; i <= NT; i++) {
    const row = [];
    for (let j = 0; j <= NP; j++) {
      const t = t0 + ((t1 - t0) * i) / NT;
      const p = p0 + ((p1 - p0) * j) / NP;
      row.push({ pos: onSphere(t, p, new THREE.Vector3()), uv: [p / (Math.PI * 2), 1 - t / Math.PI] });
    }
    grid.push(row);
  }

  const middle = onSphere((t0 + t1) / 2, (p0 + p1) / 2, new THREE.Vector3());
  const interior = middle.clone().multiplyScalar(0.5);

  const pos = [];
  const nor = [];
  const uvs = [];
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();

  const pushTri = (a, b, c, na, nb, nc, ua, ub, uc) => {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    nor.push(na.x, na.y, na.z, nb.x, nb.y, nb.z, nc.x, nc.y, nc.z);
    uvs.push(...ua, ...ub, ...uc);
  };

  // Peel, wound so it faces outwards.
  for (let i = 0; i < NT; i++) {
    for (let j = 0; j < NP; j++) {
      const a = grid[i][j];
      const b = grid[i][j + 1];
      const c = grid[i + 1][j + 1];
      const d = grid[i + 1][j];
      for (const [x, y, z] of [[a, b, d], [b, c, d]]) {
        tmpA.subVectors(y.pos, x.pos).cross(tmpB.subVectors(z.pos, x.pos));
        const outward = tmpA.dot(x.pos) >= 0;
        const [q, r] = outward ? [y, z] : [z, y];
        pushTri(x.pos, q.pos, r.pos, x.pos, q.pos, r.pos, x.uv, q.uv, r.uv);
      }
    }
  }
  const peelCount = pos.length / 3;

  // Cut faces: fan from the patch outline to the centre of the fruit.
  const outline = [];
  for (let j = 0; j <= NP; j++) outline.push(grid[0][j].pos);
  for (let i = 1; i <= NT; i++) outline.push(grid[i][NP].pos);
  for (let j = NP - 1; j >= 0; j--) outline.push(grid[NT][j].pos);
  for (let i = NT - 1; i >= 1; i--) outline.push(grid[i][0].pos);

  let total = 0;
  const along = [0];
  for (let k = 0; k < outline.length; k++) {
    total += outline[k].distanceTo(outline[(k + 1) % outline.length]);
    along.push(total);
  }
  const core = new THREE.Vector3();
  const faceN = new THREE.Vector3();
  const centre = new THREE.Vector3();
  for (let k = 0; k < outline.length; k++) {
    let a = outline[k];
    let b = outline[(k + 1) % outline.length];
    if (a.distanceToSquared(b) < 1e-8) continue;
    let ua = [(along[k] / total) * 4, 1];
    let ub = [(along[k + 1] / total) * 4, 1];
    faceN.subVectors(b, a).cross(tmpA.subVectors(core, a));
    centre.copy(a).add(b).add(core).divideScalar(3);
    if (faceN.dot(tmpB.subVectors(centre, interior)) < 0) {
      [a, b] = [b, a];
      [ua, ub] = [ub, ua];
      faceN.negate();
    }
    faceN.normalize();
    const uc = [(ua[0] + ub[0]) / 2, 0];
    pushTri(a, b, core, faceN, faceN, faceN, ua, ub, uc);
  }

  const center = middle.clone().multiplyScalar(0.55);
  for (let k = 0; k < pos.length; k += 3) {
    pos[k] -= center.x;
    pos[k + 1] -= center.y;
    pos[k + 2] -= center.z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.addGroup(0, peelCount, 0);
  geometry.addGroup(peelCount, pos.length / 3 - peelCount, 1);
  geometry.computeBoundingSphere();
  return { geometry, center, dir: middle.clone().normalize() };
}

// Breaks the unit sphere into latitude bands, each split into jittered
// wedges (fewer at the poles), and builds a chunk for every cell.
export function createOrangeChunks(random, bands = 4, sectors = 6) {
  const thetas = [0];
  for (let b = 1; b < bands; b++) thetas.push((Math.PI * b) / bands + (random() - 0.5) * 0.3);
  thetas.push(Math.PI);

  const chunks = [];
  for (let b = 0; b < bands; b++) {
    const count = b === 0 || b === bands - 1 ? sectors - 2 : sectors;
    const offset = random() * Math.PI * 2;
    const phis = [];
    for (let s = 0; s <= count; s++) {
      const jitter = s > 0 && s < count ? (random() - 0.5) * 0.4 : 0;
      phis.push(offset + (Math.PI * 2 * s) / count + jitter);
    }
    for (let s = 0; s < count; s++) chunks.push(buildChunk(thetas[b], thetas[b + 1], phis[s], phis[s + 1]));
  }
  return chunks;
}

export function createFruitMaterials(random) {
  const orange = createOrangeTextures(random);
  return {
    peel: new THREE.MeshPhysicalMaterial({
      map: orange.map,
      bumpMap: orange.bump,
      bumpScale: 1.2,
      roughness: 0.42,
      clearcoat: 0.35,
      clearcoatRoughness: 0.35,
    }),
    flesh: new THREE.MeshPhysicalMaterial({
      map: createFleshTexture(random),
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      emissive: new THREE.Color("#ff5200"),
      emissiveIntensity: 0.14,
      side: THREE.DoubleSide,
    }),
    peach: new THREE.MeshPhysicalMaterial({
      map: createPeachTexture(random),
      roughness: 0.62,
      sheen: 1,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color("#ffd2a6"),
    }),
    stem: new THREE.MeshStandardMaterial({ color: "#5b3a1e", roughness: 0.8 }),
    leaf: new THREE.MeshStandardMaterial({ color: "#3f7a26", roughness: 0.55, side: THREE.DoubleSide }),
    navel: new THREE.MeshStandardMaterial({ color: "#6e7a24", roughness: 0.7 }),
    juice: new THREE.MeshPhysicalMaterial({
      color: "#ff9324",
      roughness: 0.05,
      clearcoat: 1,
      emissive: new THREE.Color("#ff6400"),
      emissiveIntensity: 0.22,
    }),
  };
}
