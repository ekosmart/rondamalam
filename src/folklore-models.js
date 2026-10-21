import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const FOLKLORE_IDS = ["pocong", "kuntilanak", "genderuwo"];
const mat = (color, glow = 0) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.94,
    flatShading: true,
    emissive: color,
    emissiveIntensity: glow,
  });
function shape(parent, geometry, material, position, scale = [1, 1, 1]) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...position);
  m.scale.set(...scale);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
const ball = (p, m, x, y, z, sx, sy, sz) =>
  shape(p, new THREE.IcosahedronGeometry(1, 1), m, [x, y, z], [sx, sy, sz]);
const block = (p, m, x, y, z, w, h, d) =>
  shape(p, new THREE.BoxGeometry(w, h, d), m, [x, y, z]);
const cone = (p, m, x, y, z, r, h) =>
  shape(p, new THREE.ConeGeometry(r, h, 5), m, [x, y, z]);
function cloth(parent, material, rings, segments = 12, ragged = false) {
  const v = [],
    idx = [];
  rings.forEach(([y, rx, rz], j) => {
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      v.push(
        Math.sin(a) * rx,
        y + (ragged && j === 0 ? (i % 2) * 0.17 : 0),
        Math.cos(a) * rz,
      );
    }
  });
  for (let j = 0; j < rings.length - 1; j++)
    for (let i = 0; i < segments; i++) {
      const a = j * segments + i,
        b = j * segments + ((i + 1) % segments),
        c = a + segments,
        d = b + segments;
      idx.push(a, b, c, b, d, c);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return shape(parent, geo, material, [0, 0, 0]);
}
function joint(parent, x, y, z, name) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}
function batchParts(group) {
  for (const child of [...group.children]) if (child.isGroup) batchParts(child);
  const buckets = new Map();
  for (const m of [...group.children])
    if (m.isMesh) {
      m.updateMatrix();
      let geometry = m.geometry.clone().applyMatrix4(m.matrix);
      if (geometry.index) geometry = geometry.toNonIndexed();
      geometry.deleteAttribute("uv");
      if (!buckets.has(m.material)) buckets.set(m.material, []);
      buckets.get(m.material).push(geometry);
      group.remove(m);
      m.geometry.dispose();
    }
  for (const [material, geometries] of buckets) {
    const merged = mergeGeometries(geometries);
    shape(group, merged, material, [0, 0, 0]);
    geometries.forEach((g) => g.dispose());
  }
}

export function makeFolkloreGhost(def, companion = false) {
  const root = new THREE.Group(),
    body = new THREE.Group();
  root.name = def.name;
  root.add(body);
  const own = mat(
    def.id === "genderuwo" ? "#50372e" : "#d3cfb5",
    companion ? 0.15 : 0.03,
  );
  const dark = mat("#14191c"),
    skin = mat("#a8a697"),
    stain = mat("#7e7a61"),
    eye = mat("#d5d1b5", 0.25);
  const arms = [],
    legs = [],
    hair = [];
  const head = joint(body, 0, def.id === "genderuwo" ? 3.6 : 2.55, 0, "head");
  if (def.id === "pocong") {
    cloth(body, own, [
      [0.1, 0.16, 0.16],
      [0.35, 0.29, 0.26],
      [1, 0.36, 0.31],
      [1.7, 0.49, 0.34],
      [2.15, 0.43, 0.3],
      [2.32, 0.21, 0.2],
    ]);
    ball(head, own, 0, 0, 0, 0.47, 0.56, 0.4);
    ball(head, dark, 0, -0.01, 0.33, 0.32, 0.4, 0.095);
    ball(head, skin, 0, -0.04, 0.4, 0.235, 0.29, 0.06);
    for (const side of [-1, 1]) {
      ball(head, dark, side * 0.105, 0.055, 0.455, 0.087, 0.085, 0.025);
      ball(head, stain, side * 0.19, -0.12, 0.445, 0.038, 0.1, 0.015);
      const folded = block(
        body,
        stain,
        side * 0.2,
        1.45,
        0.315,
        0.035,
        0.85,
        0.012,
      );
      folded.rotation.z = side * 0.19;
      const tie = block(head, own, side * 0.13, 0.73, 0, 0.18, 0.42, 0.065);
      tie.rotation.z = side * -0.5;
      const ankle = block(body, own, side * 0.17, 0.13, 0.12, 0.13, 0.35, 0.06);
      ankle.rotation.z = side * 0.7;
    }
    ball(head, stain, 0, -0.045, 0.48, 0.04, 0.09, 0.04);
    block(head, dark, 0, -0.19, 0.462, 0.13, 0.038, 0.015);
    for (const y of [0.3, 1.65, 2.27]) {
      const band = shape(
        body,
        new THREE.TorusGeometry(
          y === 1.65 ? 0.45 : y === 0.3 ? 0.24 : 0.23,
          0.038,
          4,
          12,
        ),
        stain,
        [0, y, 0],
      );
      band.rotation.x = Math.PI / 2;
      band.scale.y = 0.75;
      ball(body, own, 0.1, y, 0.29, 0.1, 0.07, 0.08);
    }
    ball(head, own, 0, 0.49, 0, 0.17, 0.12, 0.15);
    for (let i = 0; i < 7; i++)
      block(
        body,
        stain,
        ((i % 3) - 1) * 0.13,
        0.48 + i * 0.11,
        0.3,
        0.04,
        0.15,
        0.018,
      ).rotation.z = 0.24;
  } else if (def.id === "kuntilanak") {
    cloth(
      body,
      own,
      [
        [0.06, 0.78, 0.47],
        [0.62, 0.57, 0.36],
        [1.35, 0.34, 0.24],
        [1.92, 0.42, 0.25],
        [2.2, 0.27, 0.22],
      ],
      14,
      true,
    );
    ball(head, skin, 0, 0, 0.04, 0.3, 0.39, 0.28);
    ball(head, dark, 0, 0.13, -0.1, 0.38, 0.43, 0.29);
    for (let i = 0; i < 9; i++) {
      const a = (i / 8) * Math.PI * 1.5 + 0.25;
      const lock = joint(
        head,
        Math.sin(a) * 0.29,
        0.1,
        Math.cos(a) * 0.22 - 0.08,
        "hair",
      );
      const strand = cone(lock, dark, 0, -0.69, 0, 0.17, 1.65);
      strand.rotation.z = Math.PI;
      strand.scale.z = 0.6;
      hair.push(lock);
    }
    const fringe = block(head, dark, -0.13, 0.02, 0.29, 0.24, 0.65, 0.06);
    fringe.rotation.z = -0.2;
    ball(head, dark, 0.12, 0.035, 0.29, 0.08, 0.065, 0.025);
    ball(head, eye, 0.12, 0.035, 0.318, 0.027, 0.021, 0.008);
    block(head, dark, 0.015, -0.2, 0.305, 0.12, 0.085, 0.02);
    for (const side of [-1, 1]) {
      const arm = joint(body, side * 0.4, 2.05, 0, "arm");
      arms.push(arm);
      shape(arm, new THREE.CylinderGeometry(0.18, 0.11, 0.7, 7), own, [
        side * 0.08,
        -0.31,
        0,
      ]);
      ball(arm, skin, side * 0.14, -0.76, 0.04, 0.095, 0.22, 0.09);
      for (let i = 0; i < 4; i++)
        block(
          arm,
          skin,
          side * (0.08 + i * 0.04),
          -1.03,
          0.08,
          0.025,
          0.23,
          0.035,
        ).rotation.x = -0.2;
    }
    for (let i = 0; i < 8; i++)
      block(
        body,
        stain,
        ((i % 4) - 1.5) * 0.23,
        0.22 + (i % 3) * 0.08,
        0.4,
        0.035,
        0.16,
        0.015,
      ).rotation.z = i % 2 ? 0.3 : -0.3;
  } else {
    const fur = mat("#312a26"),
      face = mat("#865a49"),
      red = mat("#e27147", 0.6),
      tooth = mat("#d4c7a1");
    ball(body, own, 0, 2.35, 0, 0.96, 1.17, 0.53);
    ball(body, fur, 0, 2.65, 0.42, 0.66, 0.75, 0.16);
    ball(body, own, 0, 1.35, 0, 0.65, 0.48, 0.45);
    ball(head, own, 0, 0, 0, 0.6, 0.62, 0.49);
    ball(head, face, 0, -0.17, 0.39, 0.43, 0.34, 0.19);
    ball(head, fur, 0, 0.34, -0.04, 0.57, 0.32, 0.42);
    ball(head, face, 0, 0.03, 0.51, 0.16, 0.14, 0.13);
    block(head, dark, 0, -0.29, 0.56, 0.48, 0.16, 0.045);
    for (const side of [-1, 1]) {
      ball(head, dark, side * 0.24, 0.14, 0.43, 0.17, 0.11, 0.06);
      ball(head, red, side * 0.24, 0.13, 0.49, 0.06, 0.045, 0.025);
      const brow = block(head, fur, side * 0.24, 0.27, 0.47, 0.36, 0.1, 0.12);
      brow.rotation.z = side * -0.23;
      cone(head, tooth, side * 0.18, -0.31, 0.62, 0.055, 0.23).rotation.z =
        Math.PI;
      const arm = joint(body, side * 0.88, 3.05, 0, "arm");
      arms.push(arm);
      ball(arm, own, side * 0.12, -0.36, 0, 0.38, 0.69, 0.36);
      ball(arm, own, side * 0.28, -1.14, 0.12, 0.3, 0.57, 0.29);
      ball(arm, face, side * 0.3, -1.61, 0.22, 0.29, 0.24, 0.25);
      for (let i = 0; i < 4; i++)
        ball(
          arm,
          face,
          side * (0.12 + i * 0.11),
          -1.79,
          0.33,
          0.07,
          0.17,
          0.09,
        );
      const leg = joint(body, side * 0.42, 1.27, 0, "leg");
      legs.push(leg);
      ball(leg, own, 0, -0.43, 0, 0.31, 0.57, 0.3);
      ball(leg, face, 0, -1.08, 0.2, 0.3, 0.18, 0.45);
      for (let i = 0; i < 8; i++) {
        const tuft = cone(
          body,
          fur,
          side * (0.6 + (i % 3) * 0.14),
          1.6 + i * 0.18,
          -0.1,
          0.17,
          0.46,
        );
        tuft.rotation.z = Math.PI + side * 0.25;
      }
      for (let i = 0; i < 4; i++)
        cone(
          arm,
          fur,
          side * 0.25,
          -0.2 - i * 0.34,
          -0.19,
          0.17,
          0.48,
        ).rotation.z = Math.PI + side * 0.25;
    }
  }
  batchParts(body);
  root.userData = {
    body,
    own,
    head,
    arms,
    legs,
    hair,
    folklore: def.id,
    baseScale: 1,
  };
  return root;
}

export function animateFolkloreGhost(
  model,
  t,
  { moving = false, attack = 0, hit = 0 } = {},
) {
  const r = model.userData;
  if (!r.folklore) return;
  const pace = t * (r.folklore === "genderuwo" ? 5 : 3),
    strike = Math.sin(Math.min(1, attack) * Math.PI);
  r.body.rotation.x = hit > 0 ? -0.13 : strike * 0.15;
  r.body.rotation.z = Math.sin(t * 1.7) * 0.025;
  r.head.rotation.y = Math.sin(t * 0.65) * 0.12;
  r.head.rotation.z =
    r.folklore === "kuntilanak" ? -0.1 + Math.sin(t * 0.8) * 0.035 : 0;
  r.arms.forEach((a, i) => {
    a.rotation.x =
      -strike * 1.25 +
      (moving ? Math.sin(pace + i * Math.PI) * 0.25 : Math.sin(t + i) * 0.04);
    a.rotation.z = (i ? 1 : -1) * -0.12;
  });
  r.legs.forEach(
    (l, i) => (l.rotation.x = moving ? Math.sin(pace + i * Math.PI) * 0.28 : 0),
  );
  r.hair.forEach((h, i) => {
    h.rotation.x = Math.sin(t * 1.9 + i) * 0.06;
    h.rotation.z = Math.sin(t + i) * 0.05;
  });
  if (r.folklore === "pocong") {
    const hop = moving
      ? Math.max(0, Math.sin(t * 5.2))
      : 0.03 * Math.sin(t * 1.5);
    r.body.position.y = hop * 0.48;
    r.body.rotation.x += moving ? -0.06 : 0;
    r.body.scale.set(1 + hop * 0.015, 1 - hop * 0.02, 1 + hop * 0.015);
  }
}
