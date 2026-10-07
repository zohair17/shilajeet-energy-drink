import * as THREE from "three";

// Page background: the flavor gradient the page used before (as a shader, so
// it can live inside the 3D canvas) with drifting smoke on top. It is rendered
// at a fraction of the canvas resolution into a texture used as
// scene.background, which also lets the glass refract it.
export function createBackdrop() {
  const material = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uColor: { value: new THREE.Vector3(0.93, 0.48, 0.22) },
      uBase: { value: new THREE.Vector3(18 / 255, 19 / 255, 15 / 255) },
      uFocus: { value: new THREE.Vector2(0.5, 0.5) },
      uSmoke: { value: 1 },
      uDark: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uAspect;
      uniform vec3 uColor;
      uniform vec3 uBase;
      uniform vec2 uFocus;
      uniform float uSmoke;
      uniform float uDark;
      varying vec2 vUv;

      float hash(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
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
        mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p = r * p * 2.03 + 11.7;
          a *= 0.5;
        }
        return v;
      }
      vec3 toLinear(vec3 c) {
        return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
      }

      void main() {
        // Same look as the old CSS background (sRGB maths, like CSS):
        // radial-gradient(120% 85% at 50% -5%, c 0%, c/85% 22%, base 72%)
        float yTop = 1.0 - vUv.y;
        float g = length(vec2((vUv.x - 0.5) / 1.2, (yTop + 0.05) / 0.85));
        vec3 c85 = mix(uBase, uColor, 0.85);
        vec3 col = g < 0.22
          ? mix(uColor, c85, g / 0.22)
          : mix(c85, uBase, clamp((g - 0.22) / 0.5, 0.0, 1.0));
        // radial-gradient(60% 50% at 50% 120%, rgba(0,0,0,.55), transparent 70%)
        float b = length(vec2((vUv.x - 0.5) / 0.6, (yTop - 1.2) / 0.5));
        col *= 1.0 - 0.55 * (1.0 - clamp(b / 0.7, 0.0, 1.0));

        // Smoke: domain-warped fbm, gathered around the can.
        vec2 p = (vUv - uFocus) * vec2(uAspect, 1.0) * 1.7;
        float t = uTime * 0.035;
        vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
        // Gentler warp than a marble pattern: soft, billowing clouds.
        vec2 r = vec2(
          fbm(p + 2.2 * q + vec2(1.7, 9.2) + 0.6 * t),
          fbm(p + 2.2 * q + vec2(8.3, 2.8) - 0.5 * t)
        );
        float f = fbm(p + 1.8 * r);
        float mask = smoothstep(1.15, 0.0, length(p * vec2(0.55, 0.8)));
        float smoke = smoothstep(0.3, 0.95, f + 0.2 * mask) * mask * uSmoke;
        vec3 tint = mix(uColor, vec3(1.0), 0.22);
        col = mix(col, tint, smoke * 0.72);
        col += tint * pow(smoke, 2.0) * 0.45;

        // Intro: near-black with a faint warm glow in the middle.
        float glow = 1.0 - smoothstep(0.0, 0.75, length((vUv - 0.5) * vec2(uAspect, 1.0)));
        vec3 dark = uBase * 0.55 + uColor * 0.07 * glow;
        col = mix(col, dark, uDark);

        gl_FragColor = vec4(toLinear(col), 1.0);
      }
    `,
  });

  const scene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  scene.add(quad);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // sRGB target: the shader writes linear light, the hardware stores it
  // sRGB-encoded (more precision in the darks), and the background pass then
  // draws it without tone mapping.
  const target = new THREE.WebGLRenderTarget(4, 4, {
    depthBuffer: false,
    colorSpace: THREE.SRGBColorSpace,
  });

  return { scene, camera, material, target };
}
