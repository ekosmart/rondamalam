import * as THREE from "three";
import {
  box,
  mesh,
  orb,
  cylinder,
  beam,
  glow,
  makeHuman,
  material,
} from "./models.js";
export function makeSaucer(mothership = false, friendly = false) {
  const g = new THREE.Group(),
    metal = friendly ? "#a3cbbf" : "#697d93",
    light = friendly ? "#a0ffda" : "#a18fff";
  const plate = orb(g, 3.4, metal, 0, 0, 0, 1, {
    metalness: 0.65,
    roughness: 0.38,
  });
  plate.scale.set(1, 0.21, 1);
  const rim = mesh(
    g,
    new THREE.TorusGeometry(2.75, 0.17, 6, 32),
    new THREE.MeshBasicMaterial({ color: light }),
    0,
    0,
    0,
  );
  rim.rotation.x = Math.PI / 2;
  const dome = orb(g, 1.6, "#6ea8ba", 0, 0.62, 0, 1, {
    transparent: true,
    opacity: 0.7,
    metalness: 0.2,
  });
  dome.scale.y = 0.7;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    orb(g, 0.15, light, Math.sin(a) * 2.6, -0.35, Math.cos(a) * 2.6, 0, {
      emissive: light,
      emissiveIntensity: 2,
    });
  }
  cylinder(g, 0.65, 0.95, 0.38, "#2c394d", 0, -0.48, 0, 12);
  glow(g, light, 3, 0, -0.65, 0, 0.55);
  if (mothership) {
    g.scale.setScalar(7);
    for (const x of [-1, 1]) {
      box(g, 0.75, 0.6, 2.8, "#425369", x * 2, 0.3, 0);
      box(g, 0.35, 0.15, 1.4, light, x * 2, 0.65, 0, {
        emissive: light,
        emissiveIntensity: 2,
      });
    }
  }
  g.userData.wheels = [];
  g.userData.dome = dome;
  return g;
}
export function makeAlien(friendly = false) {
  const g = makeHuman(friendly ? "#9ebdae" : "#5d7c9c");
  for (const part of [...g.userData.torso.children])
    if (part.isMesh && part.position.y > 2) part.removeFromParent();
  const head = orb(g, 0.58, friendly ? "#a2c6af" : "#98b2cb", 0, 2.58, 0, 1);
  head.scale.set(1, 1.25, 0.9);
  for (const x of [-0.27, 0.27]) {
    const eye = orb(g, 0.24, "#131e2b", x, 2.68, 0.44, 1);
    eye.scale.set(0.65, 1, 0.35);
    eye.rotation.z = x > 0 ? -0.35 : 0.35;
  }
  if (!friendly) {
    box(g, 0.18, 0.2, 1, "#3d485b", 0.64, 1.1, 0.5);
    orb(g, 0.1, "#a6e4ff", 0.64, 1.1, 1, 0, {
      emissive: "#5ebde6",
      emissiveIntensity: 2,
    });
  } else glow(g, "#ffd798", 0.65, 0, 1.6, 0.4, 0.6);
  return g;
}
export function makeIncidentEnemy(def) {
  if (def.kind === "saucer" || def.kind === "mothership")
    return makeSaucer(def.kind === "mothership");
  if (def.kind === "alien") return makeAlien();
  const g = makeHuman(def.color),
    torso = g.userData.torso;
  for (const part of [...torso.children])
    if (part.isMesh && part.position.y > 2) part.removeFromParent();
  g.traverse((o) => {
    if (o.isMesh && o.material.color?.getHexString() === "bd9775")
      o.material = material("#9caa74");
  });
  const head = orb(torso, 0.39, "#91a076", 0, 2.39, 0.04, 0);
  head.scale.set(0.95, 1.15, 0.92);
  box(torso, 0.28, 0.48, 0.06, "#554c39", -0.2, 1.7, 0.26).rotation.z = 0.18;
  box(torso, 0.3, 0.2, 0.06, "#5e694e", 0.2, 1.35, 0.26);
  for (const x of [-0.13, 0.13])
    orb(torso, 0.07, "#db925b", x, 2.48, 0.38, 0, {
      emissive: "#d13f26",
      emissiveIntensity: 1.5,
    });
  box(torso, 0.28, 0.15, 0.05, "#443e34", 0, 2.22, 0.39);
  g.userData.arms.forEach((a) => (a.rotation.x = -1.45));
  if (def.kind === "titan") {
    g.scale.set(3.4, 3.5, 3.4);
    for (const side of [-1, 1]) {
      orb(g, 0.6, "#666d4c", side * 0.72, 1.85, 0, 0);
      mesh(
        g,
        new THREE.ConeGeometry(0.18, 0.75, 4),
        "#b4b491",
        side * 0.8,
        2.32,
        0,
      ).rotation.z = side * -0.4;
    }
    box(g, 1.18, 0.35, 0.6, "#555d50", 0, 1.45, 0);
  }
  g.userData.zombieHead = head;
  return g;
}
export function makeMissile() {
  const g = new THREE.Group();
  cylinder(g, 0.11, 0.14, 0.9, "#d8dfcf", 0, 0, 0, 6);
  mesh(g, new THREE.ConeGeometry(0.14, 0.35, 6), "#b96c4c", 0, 0.6, 0);
  for (const s of [-1, 1])
    box(g, 0.28, 0.25, 0.07, "#808e93", s * 0.12, -0.35, 0);
  glow(g, "#ffc276", 1.2, 0, -0.6, 0, 0.65);
  return g;
}
export function upgradeMecha(g) {
  const pack = new THREE.Group();
  g.add(pack);
  pack.position.set(0, 4.6, -1.3);
  for (const s of [-1, 1]) {
    box(pack, 1.1, 1.5, 1.2, "#374d69", s * 1.15, 0.45, -0.25);
    for (let i = 0; i < 3; i++) {
      cylinder(
        pack,
        0.13,
        0.13,
        0.9,
        "#b9c8ce",
        s * 1.15 + (i - 1) * 0.27,
        1.3,
        -0.25,
        6,
      );
      mesh(
        pack,
        new THREE.ConeGeometry(0.13, 0.28, 6),
        "#de9b64",
        s * 1.15 + (i - 1) * 0.27,
        1.9,
        -0.25,
      );
    }
    beam(pack, [s * 1.25, 0.3, -0.2], [s * 3, 1.1, -1.4], 0.14, "#c5d2d9");
    box(pack, 1.9, 0.15, 1.4, "#6587a2", s * 2.1, 0.45, -0.55);
  }
  const jets = [];
  for (const s of [-1, 1]) {
    const jet = mesh(
      pack,
      new THREE.ConeGeometry(0.38, 2, 10),
      new THREE.MeshBasicMaterial({
        color: "#73daff",
        transparent: true,
        opacity: 0.7,
      }),
      s * 0.7,
      -1.6,
      -0.2,
    );
    jet.rotation.z = Math.PI;
    jets.push(jet);
  }
  g.userData.flightJets = jets;
}
