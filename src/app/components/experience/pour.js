import * as THREE from "three";

// Pour rig: a tapered tumbler, the drink inside it and the stream from the can.
// The glass is modelled one unit tall, standing on y = 0.

// [radius, height] from the centre of the base, up the outside, over the rim
// and down the inside to the top of the thick base.
const GLASS_PROFILE = [
  [0, 0],
  [0.29, 0],
  [0.322, 0.006],
  [0.336, 0.022],
  [0.34, 0.05],
  [0.4, 1],
  [0.4035, 1.006],
  [0.4, 1.0125],
  [0.392, 1.012],
  [0.385, 1.004],
  [0.383, 0.996],
  [0.326, 0.1],
  [0.318, 0.088],
  [0.3, 0.084],
  [0, 0.084],
];

export const GLASS = {
  topRadius: 0.4,
  innerBase: 0.086,
  innerTop: 0.996,
  // Inner wall radius at the inner base, and how much it widens per unit up.
  innerRadius: 0.3245,
  innerSlope: (0.383 - 0.326) / (0.996 - 0.1),
};

export const glassInnerRadius = (y) => GLASS.innerRadius + GLASS.innerSlope * (y - GLASS.innerBase);

export function createGlass() {
  const geometry = new THREE.LatheGeometry(
    GLASS_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)),
    96
  );
  const material = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    metalness: 0,
    roughness: 0.03,
    transmission: 1,
    thickness: 0.06,
    ior: 1.5,
    specularIntensity: 1,
    envMapIntensity: 1.35,
    attenuationColor: new THREE.Color("#eef6ff"),
    attenuationDistance: 8,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    // The background behind the glass is drawn without tone mapping; the glass
    // must match it or it reads as tinted (the toe darkens dark tones).
    toneMapped: false,
  });
  return new THREE.Mesh(geometry, material);
}

const NOISE = /* glsl */ `
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
`;

// The drink. A unit cylinder (y in 0..1) that the vertex shader fits inside the
// glass up to `uLevel`. Opaque on purpose: the glass's transmission pass only
// sees opaque objects, so this is what shows (refracted) through the glass.
export function createLiquid() {
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 72, 6, false);
  geometry.translate(0, 0.5, 0);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color("#ff8a2a") },
      uLevel: { value: GLASS.innerBase + 0.001 },
      uFoam: { value: 0 },
      uTime: { value: 0 },
      uImpact: { value: new THREE.Vector2(0, 0) },
      uStir: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform float uLevel;
      uniform float uTime;
      uniform float uStir;
      varying vec3 vLocal;
      varying vec3 vPosW;
      varying vec3 vNormalW;
      varying float vTop;
      void main() {
        float base = ${GLASS.innerBase.toFixed(4)};
        float y = mix(base, uLevel, position.y);
        float r = (${GLASS.innerRadius.toFixed(5)} + ${GLASS.innerSlope.toFixed(5)} * (y - base)) * 0.986;
        vec3 p = vec3(position.x * r, y, position.z * r);
        vTop = step(0.5, normal.y);
        // ripples on the surface while the stream is hitting it
        if (vTop > 0.5) {
          float d = length(position.xz);
          p.y += sin(d * 26.0 - uTime * 14.0) * 0.004 * uStir * (1.0 - d);
        }
        vLocal = vec3(position.x, position.y, position.z);
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vPosW = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uFoam;
      uniform float uTime;
      uniform vec2 uImpact;
      uniform float uStir;
      varying vec3 vLocal;
      varying vec3 vPosW;
      varying vec3 vNormalW;
      varying float vTop;
      ${NOISE}
      void main() {
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(cameraPosition - vPosW);
        float fres = pow(1.0 - abs(dot(N, V)), 2.0);
        vec3 col;
        if (vTop > 0.5) {
          vec2 uv = vLocal.xz * 7.0;
          float n = noise(uv * 1.7 + uTime * 0.25) * 0.6 + noise(uv * 4.3 - uTime * 0.45) * 0.4;
          float rim = smoothstep(0.7, 1.0, length(vLocal.xz));
          float near = 1.0 - smoothstep(0.0, 0.55, length(vLocal.xz - uImpact));
          float foam = clamp(smoothstep(0.4, 0.75, n) * uFoam + rim * uFoam * 0.9 + near * uStir * 0.8, 0.0, 1.0);
          col = mix(uColor * 1.12, vec3(1.0, 0.95, 0.88), foam);
        } else {
          float h = vLocal.y;
          col = uColor * mix(0.5, 1.0, smoothstep(0.0, 1.0, h));
          col += uColor * fres * 0.55;
          float ang = atan(vLocal.z, vLocal.x);
          vec2 bp = vec2(ang * 7.0, h * 16.0 - uTime * 1.7);
          vec2 cell = floor(bp);
          vec2 f = fract(bp) - 0.5;
          vec2 off = vec2(hash(cell + 3.1) - 0.5, hash(cell + 7.7) - 0.5) * 0.5;
          float bubble = smoothstep(0.13, 0.05, length(f - off)) * step(0.6, hash(cell));
          col = mix(col, vec3(1.0, 0.97, 0.9), bubble * 0.65);
        }
        vec3 L = normalize(vec3(-0.45, 0.75, 0.6));
        vec3 H = normalize(L + V);
        col += vec3(pow(max(dot(N, H), 0.0), 70.0) * 0.55);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}

// The stream: a tube along a quadratic curve from the can's mouth into the
// glass, rebuilt in place every frame. `along` runs 0 (mouth) to 1 (landing),
// and the shader clips it between uTail and uHead so the stream can start and
// stop flowing.
export function createStream(segments = 56, radial = 12) {
  const verts = (segments + 1) * (radial + 1);
  const position = new Float32Array(verts * 3);
  const normal = new Float32Array(verts * 3);
  const along = new Float32Array(verts);
  const around = new Float32Array(verts);
  const index = [];
  for (let i = 0; i <= segments; i++) {
    for (let j = 0; j <= radial; j++) {
      along[i * (radial + 1) + j] = i / segments;
      around[i * (radial + 1) + j] = j / radial;
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = (i + 1) * (radial + 1) + j;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normal, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("along", new THREE.BufferAttribute(along, 1));
  geometry.setAttribute("around", new THREE.BufferAttribute(around, 1));
  geometry.setIndex(index);

  const material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color("#ff8a2a") },
      uTime: { value: 0 },
      uHead: { value: 0 },
      uTail: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float along;
      attribute float around;
      varying float vAlong;
      varying float vAround;
      varying vec3 vPosW;
      varying vec3 vNormalW;
      void main() {
        vAlong = along;
        vAround = around;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vPosW = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uHead;
      uniform float uTail;
      varying float vAlong;
      varying float vAround;
      varying vec3 vPosW;
      varying vec3 vNormalW;
      ${NOISE}
      void main() {
        if (vAlong > uHead || vAlong < uTail) discard;
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(cameraPosition - vPosW);
        float fres = pow(1.0 - abs(dot(N, V)), 1.6);
        float flow = noise(vec2(vAround * 5.0, vAlong * 14.0 - uTime * 7.0));
        vec3 col = uColor * (0.72 + 0.4 * flow) + uColor * fres * 0.6;
        vec3 L = normalize(vec3(-0.5, 0.6, 0.7));
        vec3 H = normalize(L + V);
        col += vec3(pow(max(abs(dot(N, H)), 0.0), 40.0) * 0.9);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;

  const c = new THREE.Vector3();
  const t = new THREE.Vector3();
  const n = new THREE.Vector3();
  const z = new THREE.Vector3(0, 0, 1);

  // p0 mouth, p1 control point, p2 landing point (world space); radii in world
  // units at the mouth and at the landing point.
  const update = (p0, p1, p2, r0, r1, time) => {
    for (let i = 0; i <= segments; i++) {
      const s = i / segments;
      const u = 1 - s;
      c.set(
        u * u * p0.x + 2 * u * s * p1.x + s * s * p2.x,
        u * u * p0.y + 2 * u * s * p1.y + s * s * p2.y,
        u * u * p0.z + 2 * u * s * p1.z + s * s * p2.z
      );
      t.set(
        2 * u * (p1.x - p0.x) + 2 * s * (p2.x - p1.x),
        2 * u * (p1.y - p0.y) + 2 * s * (p2.y - p1.y),
        2 * u * (p1.z - p0.z) + 2 * s * (p2.z - p1.z)
      ).normalize();
      n.crossVectors(t, z).normalize();
      // A falling stream necks down as it speeds up, and wobbles a little.
      const r = (r0 + (r1 - r0) * Math.sqrt(s)) * (1 + 0.09 * Math.sin(s * 23 - time * 17) * s);
      for (let j = 0; j <= radial; j++) {
        const a = (j / radial) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const k = (i * (radial + 1) + j) * 3;
        const nx = ca * n.x + sa * z.x;
        const ny = ca * n.y + sa * z.y;
        const nz = ca * n.z + sa * z.z;
        position[k] = c.x + nx * r;
        position[k + 1] = c.y + ny * r;
        position[k + 2] = c.z + nz * r;
        normal[k] = nx;
        normal[k + 1] = ny;
        normal[k + 2] = nz;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.normal.needsUpdate = true;
  };

  return { mesh, material, update };
}
