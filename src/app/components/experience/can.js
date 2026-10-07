import * as THREE from "three";

// A slim 12 oz can, modelled in its own units: radius 0.5, height 3, centred
// on the origin. The printed label is a straight cylinder; the neck, rim, lid
// and base are lathed metal.
export const CAN_RADIUS = 0.5;
export const CAN_HEIGHT = 3;
const HALF = CAN_HEIGHT / 2;
const LABEL_BOTTOM = 0.15;
const LABEL_TOP = 2.82;
const LID_Y = 2.944;

// Where the drink leaves the can, in the can's local space. The opening sits on
// the +x side of the lid, so tipping the can clockwise puts it lowest.
export const MOUTH = new THREE.Vector3(0.33, LID_Y - HALF + 0.012, 0);

// [radius, height above the base] — base dome and standing ring, inside to out.
const BASE_PROFILE = [
  [0, 0.1],
  [0.12, 0.096],
  [0.24, 0.08],
  [0.32, 0.05],
  [0.365, 0.018],
  [0.385, 0.003],
  [0.4, 0],
  [0.418, 0.004],
  [0.445, 0.025],
  [0.472, 0.06],
  [0.49, 0.1],
  [0.498, 0.13],
  [0.5, LABEL_BOTTOM],
];

// Neck, double-seamed rim, then in across the lid.
const TOP_PROFILE = [
  [0.5, LABEL_TOP],
  [0.499, 2.85],
  [0.493, 2.875],
  [0.482, 2.9],
  [0.466, 2.925],
  [0.452, 2.943],
  [0.445, 2.956],
  [0.446, 2.966],
  [0.451, 2.977],
  [0.453, 2.988],
  [0.449, 2.997],
  [0.441, 3],
  [0.433, 2.996],
  [0.428, 2.984],
  [0.426, 2.968],
  [0.42, 2.952],
  [0.41, 2.946],
  [0.39, LID_Y],
  [0, LID_Y],
];

const toPoints = (profile) => profile.map(([r, y]) => new THREE.Vector2(r, y - HALF));

const roundedRect = (shape, x0, y0, x1, y1, r) => {
  shape.moveTo(x0 + r, y0);
  shape.lineTo(x1 - r, y0);
  shape.quadraticCurveTo(x1, y0, x1, y0 + r);
  shape.lineTo(x1, y1 - r);
  shape.quadraticCurveTo(x1, y1, x1 - r, y1);
  shape.lineTo(x0 + r, y1);
  shape.quadraticCurveTo(x0, y1, x0, y1 - r);
  shape.lineTo(x0, y0 + r);
  shape.quadraticCurveTo(x0, y0, x0 + r, y0);
  return shape;
};

// Shapes are drawn in x / y and laid flat on the lid (shape y becomes -z).
const layFlat = (geometry, y) => {
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, y, 0);
  return geometry;
};

export function createCanGeometry() {
  const segments = 96;

  // thetaStart = PI puts the texture seam at the back, so the centre of the
  // label artwork (u = 0.5) faces +z, towards the camera.
  const body = new THREE.CylinderGeometry(
    CAN_RADIUS,
    CAN_RADIUS,
    LABEL_TOP - LABEL_BOTTOM,
    segments,
    1,
    true,
    Math.PI
  );
  body.translate(0, (LABEL_TOP + LABEL_BOTTOM) / 2 - HALF, 0);

  const base = new THREE.LatheGeometry(toPoints(BASE_PROFILE), segments);
  const top = new THREE.LatheGeometry(toPoints(TOP_PROFILE), segments);

  // Pull tab: rounded plate with a finger hole, nose pointing at the opening.
  const tabShape = roundedRect(new THREE.Shape(), -0.21, -0.078, 0.15, 0.078, 0.07);
  tabShape.holes.push(roundedRect(new THREE.Path(), -0.17, -0.038, -0.05, 0.038, 0.034));
  const tab = layFlat(
    new THREE.ExtrudeGeometry(tabShape, {
      depth: 0.008,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.003,
      bevelSegments: 2,
      curveSegments: 10,
    }),
    LID_Y - HALF + 0.004
  );

  const rivet = new THREE.CylinderGeometry(0.03, 0.036, 0.02, 20);
  rivet.translate(0, LID_Y - HALF + 0.012, 0);

  const opening = layFlat(
    new THREE.ShapeGeometry(roundedRect(new THREE.Shape(), 0.2, -0.1, 0.35, 0.1, 0.06), 10),
    LID_Y - HALF + 0.002
  );

  return { body, base, top, tab, rivet, opening };
}

export function createCanMaterials() {
  return {
    metal: new THREE.MeshStandardMaterial({ color: "#e1e4e7", metalness: 1, roughness: 0.2 }),
    lid: new THREE.MeshStandardMaterial({ color: "#cfd3d7", metalness: 1, roughness: 0.3 }),
    opening: new THREE.MeshStandardMaterial({ color: "#0d0d0d", metalness: 0.3, roughness: 0.55 }),
  };
}

// Printed aluminium under a gloss varnish.
export function createLabelMaterial(map) {
  return new THREE.MeshPhysicalMaterial({
    map,
    metalness: 0.08,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.14,
  });
}

// `group` carries position, lean (x), tilt (z) and scale; the inner `spin`
// group turns the can about its own axis. Rotation order ZXY on the outer
// group means: spin first, then lean, then tilt in the picture plane.
export function buildCan(geometry, materials, labelMaterial) {
  const group = new THREE.Group();
  group.rotation.order = "ZXY";
  const spin = new THREE.Group();
  group.add(spin);

  const add = (g, m) => {
    const mesh = new THREE.Mesh(g, m);
    spin.add(mesh);
    return mesh;
  };
  add(geometry.body, labelMaterial);
  add(geometry.base, materials.metal);
  add(geometry.top, materials.metal);
  add(geometry.tab, materials.lid);
  add(geometry.rivet, materials.lid);
  const opening = add(geometry.opening, materials.opening);
  opening.visible = false;

  return { group, spin, opening };
}
