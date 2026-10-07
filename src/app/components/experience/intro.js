import * as THREE from "three";

// Full-screen juice swirl that hides the cut from the burst fruit to the can.
// `uCover` closes it in from the edges (0 → 1) and opens it from the centre
// again (1 → 0). Drawn in clip space, so it always covers the view.
export function createSwirl() {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      uCover: { value: 0 },
      uTime: { value: 0 },
      uSpin: { value: 0 },
      uAspect: { value: 1 },
      uA: { value: new THREE.Color("#f4791a") },
      uB: { value: new THREE.Color("#ffb27c") },
      uC: { value: new THREE.Color("#b8311a") },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uCover;
      uniform float uTime;
      uniform float uSpin;
      uniform float uAspect;
      uniform vec3 uA;
      uniform vec3 uB;
      uniform vec3 uC;
      varying vec2 vUv;

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
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p = p * 2.07 + 13.1;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
        float r = length(p);
        float a = atan(p.y, p.x) + uSpin * 5.0 + 1.9 / (r + 0.22);
        vec2 q = vec2(cos(a), sin(a)) * r;
        float n = fbm(q * 3.2 + vec2(uTime * 0.2, 0.0));
        float m = fbm(q * 7.0 - uTime * 0.15 + n * 2.0);

        vec3 col = mix(uA, uB, smoothstep(0.3, 0.72, n));
        col = mix(col, uC, smoothstep(0.52, 0.86, m) * 0.7);
        col += vec3(1.0, 0.9, 0.75) * pow(smoothstep(0.62, 0.95, m), 3.0) * 0.6;
        col *= 1.0 - 0.4 * smoothstep(0.25, 1.0, r);

        float edge = (1.0 - uCover) * 1.3;
        float rr = r + (n - 0.5) * 0.28;
        float alpha = smoothstep(edge - 0.14, edge + 0.06, rr) * smoothstep(0.0, 0.12, uCover);
        gl_FragColor = vec4(col, alpha);
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1000;
  return { mesh, material };
}

// Two lines of brand type behind the orange, like a title card.
export function createIntroTitle(accent) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 900;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const draw = () => {
    const family = getComputedStyle(document.body).fontFamily || "sans-serif";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `400 330px ${family}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText("SHILAJIT", canvas.width / 2, 250);
    ctx.fillStyle = accent;
    ctx.fillText("ENERGY.", canvas.width / 2, 630);
    texture.needsUpdate = true;
  };
  draw();
  // The site font may still be loading; redraw once it is ready.
  if (document.fonts?.ready) document.fonts.ready.then(draw).catch(() => {});

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    opacity: 0,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, canvas.height / canvas.width), material);
  mesh.renderOrder = -1;
  return { mesh, material };
}
