import * as THREE from "three";
import { box, cylinder, orb, beam, sign } from "./models.js";
import { makeCoastAsset } from "./coast-models.js";
import { ISLAND, LIGHTHOUSE } from "./coast-rules.js";
export function buildCoastWorld(w) {
  const s = w.static;
  box(s, 120, 0.3, 237, "#b4ac86", 0, -0.14, 402.5);
  box(s, 18, 0.035, 232, "#d4c39a", 51, 0.025, 401);
  const bay = new THREE.Shape();
  bay.moveTo(60, -521);
  bay.lineTo(278, -521);
  bay.lineTo(278, -284);
  bay.lineTo(60, -284);
  bay.closePath();
  const islandHole = new THREE.Path();
  islandHole.absarc(ISLAND.x, -ISLAND.z, ISLAND.radius, 0, Math.PI * 2, true);
  bay.holes.push(islandHole);
  const sea = new THREE.Mesh(
    new THREE.ShapeGeometry(bay, 32),
    new THREE.MeshStandardMaterial({
      color: "#367d8b",
      roughness: 0.3,
      metalness: 0.35,
      transparent: true,
      opacity: 0.94,
    }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0.16;
  w.scene.add(sea);
  w.water.push(sea);
  cylinder(s, 27, 29, 2, "#b8ad83", ISLAND.x, -0.99, ISLAND.z, 32);
  cylinder(s, 24, 24, 0.025, "#a9ac7b", ISLAND.x, 0.015, ISLAND.z, 24);
  const houses = [];
  for (const [x, z] of [
    [-30, 320],
    [-10, 345],
    [-28, 370],
    [17, 385],
    [-27, 410],
  ]) {
    const g = makeCoastAsset("house");
    g.position.set(x, 0, z);
    s.add(g);
    houses.push(g);
    w.colliders.push({ x, z, w: 3.6, d: 3.2, h: 7.5 });
    w.flightObstacles.push({ x, z, w: 4, d: 5, h: 8 });
  }
  const tower = makeCoastAsset("lighthouse");
  tower.position.set(LIGHTHOUSE.x, 0, LIGHTHOUSE.z);
  s.add(tower);
  w.colliders.push({ x: LIGHTHOUSE.x, z: LIGHTHOUSE.z, w: 3.4, d: 3.4, h: 20 });
  w.flightObstacles.push({
    x: LIGHTHOUSE.x,
    z: LIGHTHOUSE.z,
    w: 4,
    d: 4,
    h: 21,
  });
  sign(s, "MERCUSUAR KARANG TIRTA", 11, 0.8).position.set(30, 3.2, 446);
  for (const [x, z, width] of [
    [74, 330, 28],
    [165, 420, 14],
  ]) {
    box(s, width, 0.18, 8, "#8a7150", x, 0.09, z);
    for (let dx = -width / 2; dx <= width / 2; dx += 2) {
      box(s, 0.06, 0.025, 8, "#554b37", x + dx, 0.19, z);
      for (const dz of [-3.7, 3.7])
        cylinder(s, 0.13, 0.18, 1.5, "#65553e", x + dx, 0.4, z + dz, 6);
    }
  }
  sign(s, "KARANG TIRTA", 17, 2, "#274c50", "#f0dca1").position.set(20, 6, 298);
  for (const x of [10, 30])
    beam(s, [x, 0, 298], [x, 6.8, 298], 0.18, "#82674b");
  // Open fish auction: tables, crates, nets and a shade canopy.
  for (const x of [10, 30])
    for (const z of [315, 327]) beam(s, [x, 0, z], [x, 4, z], 0.13, "#6b513c");
  box(s, 24, 0.18, 16, "#547b80", 20, 4, 321);
  sign(s, "PELELANGAN IKAN • BU SARI", 16, 1).position.set(20, 3.1, 329);
  for (const x of [13, 20, 27]) {
    box(s, 4, 0.25, 2, "#9b8259", x, 1.2, 322);
    for (let i = 0; i < 5; i++)
      orb(
        s,
        0.25,
        i % 2 ? "#a9c7ce" : "#dfcba7",
        x - 1.5 + i * 0.7,
        1.5,
        322,
        0,
      ).scale.set(1.6, 0.4, 0.7);
    box(s, 1.5, 0.8, 1.3, "#6e6750", x, 0.4, 317);
  }
  for (const [x, z, label] of [
    [17, 365, "WARUNG BU NINGSIH"],
    [-28, 390, "BENGKEL PERAHU"],
  ]) {
    for (const dx of [-4, 4])
      for (const dz of [-3, 3])
        beam(s, [x + dx, 0, z + dz], [x + dx, 3.5, z + dz], 0.14, "#735d45");
    box(s, 10, 0.18, 8, "#9d6749", x, 3.6, z);
    box(s, 6, 1, 1.5, "#b09a6c", x, 0.6, z);
    sign(s, label, 9, 0.7).position.set(x, 3, z + 4);
  }
  for (let i = 0; i < 4; i++) {
    const x = -42 + i * 3;
    beam(s, [x, 0, 345], [x, 2.4, 345], 0.08, "#675c46");
    for (let j = 0; j < 5; j++)
      beam(
        s,
        [x, 0.6 + j * 0.35, 345],
        [x + 2.8, 0.6 + j * 0.35, 345],
        0.015,
        "#a8a58c",
        4,
      );
  }
  // Palm silhouettes, coastal rocks and the wreck on the island.
  for (const [x, z] of [
    [-45, 299],
    [42, 305],
    [-45, 355],
    [42, 390],
    [-43, 445],
    [46, 477],
    [184, 400],
    [210, 431],
    [180, 439],
  ]) {
    beam(s, [x, 0, z], [x + 1, 7, z], 0.28, "#897253");
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3,
        leaf = orb(
          s,
          1,
          "#477958",
          x + 1 + Math.sin(a) * 2,
          7,
          z + Math.cos(a) * 2,
          0,
        );
      leaf.scale.set(1.3, 0.18, 3);
      leaf.rotation.y = a;
    }
  }
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    orb(
      s,
      1.1,
      "#7f8c83",
      190 + Math.sin(a) * 25,
      -0.15,
      420 + Math.cos(a) * 25,
      0,
    ).scale.y = 0.7;
  }
  const wreck = makeCoastAsset("boat");
  wreck.position.set(195, 0.15, 437);
  wreck.rotation.set(0.1, 0.65, 0.22);
  s.add(wreck);
  sign(s, "KAPAL TANPA AWAK", 9, 0.7).position.set(195, 4, 440);
  for (let z = 300; z < 510; z += 30) {
    cylinder(s, 0.2, 0.3, 3, "#675743", 42, 1.5, z, 6);
    orb(s, 0.25, "#efd4a0", 42, 3, z, 0, {
      emissive: "#efbb6b",
      emissiveIntensity: 0.7,
    });
  }
  return { sea, tower, wreck, houses };
}
