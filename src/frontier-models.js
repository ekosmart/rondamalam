import * as THREE from "three";
import {
  box,
  orb,
  beam,
  mesh,
  cylinder,
  glow,
  makeHuman,
  sign,
} from "./models.js";
import { DINOSAURS } from "./frontier-data.js";
export function makeDinosaur(id) {
  const def = DINOSAURS.find((d) => d.id === id) || DINOSAURS[0],
    g = new THREE.Group(),
    legs = [],
    wings = [];
  let head, tail;
  const c = def.color,
    bronto = id === "brontosaurus",
    stego = id === "stegosaurus",
    ptero = id === "pteranodon";
  if (ptero) {
    orb(g, 0.6, c, 0, 0.4, 0, 1).scale.set(0.65, 0.7, 1.4);
    head = orb(g, 0.32, c, 0, 0.6, 0.8, 1);
    beam(g, [0, 0.6, 0.8], [0, 0.48, 2], 0.2, "#bba779");
    mesh(
      g,
      new THREE.ConeGeometry(0.23, 1.3, 4),
      "#987355",
      0,
      1,
      0.6,
    ).rotation.x = -0.9;
    for (const side of [-1, 1]) {
      const wing = new THREE.Group();
      g.add(wing);
      const geom = new THREE.BufferGeometry();
      geom.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          [
            0,
            0.5,
            0.2,
            side * 3.5,
            0.3,
            -0.3,
            side * 1.2,
            0.2,
            -1.2,
            0,
            0.5,
            0.2,
            side * 1.2,
            0.2,
            -1.2,
            0,
            0.3,
            -0.7,
          ],
          3,
        ),
      );
      geom.computeVertexNormals();
      mesh(
        wing,
        geom,
        new THREE.MeshStandardMaterial({
          color: "#b59b77",
          side: THREE.DoubleSide,
        }),
      );
      beam(wing, [0, 0.5, 0.2], [side * 3.5, 0.3, -0.3], 0.06, c);
      wings.push(wing);
    }
    g.userData = { legs, wings, head };
    return g;
  }
  const y = bronto ? 3.7 : stego ? 1.5 : 1.8,
    body = orb(g, 1, c, 0, y, 0, 1);
  body.scale.set(
    bronto ? 1.8 : stego ? 1.05 : 0.65,
    bronto ? 1.6 : stego ? 0.9 : 0.7,
    bronto ? 3.1 : stego ? 1.6 : 1.1,
  );
  const neckEnd = bronto
    ? [0, 9.5, 5.5]
    : stego
      ? [0, 1.2, 2.1]
      : [0, 2.8, 1.15];
  beam(g, [0, y, bronto ? 2.1 : 1], neckEnd, bronto ? 0.65 : 0.32, c);
  head = orb(g, bronto ? 0.6 : stego ? 0.4 : 0.6, c, ...neckEnd, 1);
  head.scale.set(
    bronto || stego ? 1 : 0.85,
    bronto || stego ? 1 : 0.7,
    bronto ? 1.6 : stego ? 1.3 : 1.55,
  );
  if (!bronto && !stego) {
    box(g, 0.83, 0.32, 0.85, c, 0, neckEnd[1] - 0.05, neckEnd[2] + 0.75);
    box(
      g,
      0.77,
      0.16,
      1.25,
      "#b6b88a",
      0,
      neckEnd[1] - 0.37,
      neckEnd[2] + 0.42,
    );
    box(g, 0.8, 0.14, 1.05, "#425344", 0, neckEnd[1] - 0.22, neckEnd[2] + 0.54);
    for (const side of [-1, 1])
      orb(
        g,
        0.045,
        "#24382f",
        side * 0.3,
        neckEnd[1] + 0.09,
        neckEnd[2] + 1.13,
        1,
      );
    for (const side of [-1, 1])
      for (let i = 0; i < 5; i++)
        mesh(
          g,
          new THREE.ConeGeometry(0.06, 0.18, 4),
          "#ece4c5",
          side * 0.38,
          neckEnd[1] - 0.24,
          neckEnd[2] + i * 0.2 + 0.15,
        ).rotation.z = Math.PI;
    for (const side of [-1, 1])
      beam(g, [side * 0.5, 1.9, 0.65], [side * 0.58, 1.65, 1.16], 0.11, c);
  }
  for (const side of [-1, 1]) {
    orb(
      g,
      0.07,
      "#e3b66d",
      side * (bronto ? 0.58 : stego ? 0.38 : 0.52),
      neckEnd[1] + 0.12,
      neckEnd[2] + 0.38,
      0,
    );
    orb(
      g,
      0.036,
      "#162520",
      side * (bronto ? 0.63 : stego ? 0.42 : 0.57),
      neckEnd[1] + 0.12,
      neckEnd[2] + 0.41,
      0,
    );
    for (const z of bronto || stego ? [-1, 1] : [0]) {
      const leg = new THREE.Group();
      leg.position.set(
        side * (bronto ? 1.18 : stego ? 0.72 : 0.45),
        y - 0.2,
        z * (bronto ? 1.9 : 1),
      );
      g.add(leg);
      if (bronto || stego)
        beam(leg, [0, 0, 0], [0, -y + 0.25, 0.35], bronto ? 0.42 : 0.27, c);
      else {
        orb(leg, 0.43, c, 0, -0.35, 0.05, 1).scale.set(0.85, 1.45, 0.85);
        beam(leg, [0, -0.55, 0.18], [0, -1.08, -0.15], 0.21, c);
        beam(leg, [0, -1.08, -0.15], [0, -y + 0.25, 0.35], 0.12, c);
        for (let claw = -1; claw <= 1; claw++)
          beam(
            leg,
            [claw * 0.12, -y + 0.32, 0.4],
            [claw * 0.15, -y + 0.33, 0.92],
            0.045,
            "#d0c39b",
          );
      }
      box(
        leg,
        bronto ? 0.85 : 0.5,
        0.27,
        bronto ? 1 : 0.8,
        "#78836a",
        0,
        -y + 0.32,
        0.5,
      );
      legs.push(leg);
    }
  }
  tail = new THREE.Group();
  tail.position.set(0, y, -(bronto ? 2.1 : stego ? 1.1 : 0.8));
  g.add(tail);
  const l = bronto ? 9 : stego ? 3 : 2.5;
  beam(tail, [0, 0, 0], [0, -0.5, -l], bronto ? 0.65 : 0.26, c);
  beam(tail, [0, -0.5, -l * 0.75], [0, -0.8, -l * 1.05], 0.1, c);
  if (stego) {
    for (let i = 0; i < 9; i++) {
      const plate = mesh(
        g,
        new THREE.ConeGeometry(0.4, 0.9 + Math.sin((i / 8) * Math.PI) * 0.8, 3),
        "#b07a59",
        i % 2 ? 0.15 : -0.15,
        2.55,
        -2 + i * 0.48,
      );
      plate.rotation.y = Math.PI / 2;
    }
    for (const s of [-1, 1])
      for (const z of [-2, -2.7])
        beam(tail, [0, -0.3, z], [s * 0.75, 0.4, z - 0.2], 0.09, "#c7b789");
  }
  const bounds = new THREE.Box3().setFromObject(g),
    size = bounds.getSize(new THREE.Vector3()),
    factor = def.length / size.z;
  g.scale.setScalar(factor);
  g.userData = { legs, wings, head, tail, body, factor };
  return g;
}
export function animateDinosaur(g, t, moving) {
  g.userData.legs?.forEach(
    (l, i) =>
      (l.rotation.x = moving ? Math.sin(t * 5 + i * Math.PI) * 0.28 : 0),
  );
  g.userData.wings?.forEach(
    (w, i) => (w.rotation.z = (i ? 1 : -1) * (0.2 + Math.sin(t * 3) * 0.45)),
  );
  if (g.userData.tail) g.userData.tail.rotation.y = Math.sin(t * 1.5) * 0.09;
}
export function makeGyroBall() {
  const g = new THREE.Group();
  g.userData.wheels = [];
  orb(g, 2.05, "#a7dce6", 0, 2.1, 0, 3, {
    transparent: true,
    opacity: 0.17,
    roughness: 0.08,
    depthWrite: false,
  });
  const shell = new THREE.Group();
  g.add(shell);
  shell.position.y = 2.1;
  for (const axis of [0, 1]) {
    const ring = mesh(
      shell,
      new THREE.TorusGeometry(2.04, 0.065, 8, 48),
      "#90b8bb",
    );
    if (axis) ring.rotation.y = Math.PI / 2;
  }
  g.userData.shell = shell;
  box(g, 1, 0.18, 1.1, "#657775", 0, 1.1, 0);
  box(g, 0.9, 1, 0.18, "#667b7d", 0, 1.6, -0.45);
  glow(g, "#8de0ed", 2, 0, 0.3, 0, 0.25);
  return g;
}
export function makeRocket() {
  const g = new THREE.Group();
  g.userData.wheels = [];
  cylinder(g, 1.6, 1.8, 13, "#d3d8d5", 0, 8, 0, 16);
  mesh(g, new THREE.ConeGeometry(1.6, 4, 16), "#e1e3d8", 0, 16.5, 0);
  cylinder(g, 1.85, 1.85, 1, "#283e46", 0, 5.8, 0, 16);
  for (const s of [-1, 1]) {
    box(g, 0.35, 4.6, 2.4, "#586e75", s * 2, 3.2, 0);
    cylinder(g, 0.6, 0.9, 8, "#b9c8c8", s * 2, 6, 0, 10);
  }
  sign(g, "SPACE Z", 4, 1, "#273c46", "#dce8dd").position.set(0, 10, 1.64);
  g.userData.exhaust = mesh(
    g,
    new THREE.ConeGeometry(1.3, 7, 14),
    new THREE.MeshBasicMaterial({
      color: "#73d9ef",
      transparent: true,
      opacity: 0.65,
    }),
    0,
    -1.5,
    0,
  );
  g.userData.exhaust.rotation.z = Math.PI;
  return g;
}
export function makeRod() {
  const g = new THREE.Group();
  beam(g, [0, 0, 0], [0, 2.4, 0.7], 0.025, "#c9b483");
  beam(g, [0, 2.4, 0.7], [0, 0.2, 2.3], 0.009, "#d1e7dd");
  cylinder(g, 0.09, 0.09, 0.08, "#697e7e", 0, 0.4, 0.08, 10).rotation.x =
    Math.PI / 2;
  return g;
}
export function makeAgent() {
  const g = makeHuman("#303e49");
  box(g, 0.68, 0.55, 0.12, "#64747a", 0, 1.62, 0.29);
  sign(g, "Z", 0.34, 0.32).position.set(0, 1.72, 0.4);
  box(g, 0.15, 0.18, 0.8, "#4c6268", -0.55, 1.1, 0.4);
  return g;
}
