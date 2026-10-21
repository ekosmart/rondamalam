import * as THREE from "three";
import { box, cylinder, orb, beam, sign } from "./models.js";
import { makeCoastAsset } from "./coast-models.js";
import { ISLAND, LIGHTHOUSE } from "./coast-rules.js";
import { onRoad } from "./layout.js";
import {
  COAST_HOUSES,
  AUCTION,
  FOOD_STALL,
  COAST_PIERS,
  DOCK_HEIGHT,
} from "./coast-layout.js";
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
  for (const [x, z] of COAST_HOUSES) {
    const g = makeCoastAsset("house");
    g.position.set(x, 0, z);
    s.add(g);
    houses.push(g);
    w.colliders.push({ x, z: z + 1.3, w: 3.8, d: 4.6, h: 7.5 });
    w.flightObstacles.push({ x, z: z + 1.3, w: 4, d: 4.6, h: 8 });
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
  const decks = [];
  for (const { x, z, width, rampStart, rampEnd, startY, endY } of COAST_PIERS) {
    const deck = box(s, width, 0.18, 8, "#8a7150", x, DOCK_HEIGHT - 0.09, z);
    decks.push(deck);
    const profile = new THREE.Shape();
    profile.moveTo(rampStart, -0.1);
    profile.lineTo(rampEnd, -0.1);
    profile.lineTo(rampEnd, endY);
    profile.lineTo(rampStart, startY);
    profile.closePath();
    const ramp = new THREE.Mesh(
      new THREE.ExtrudeGeometry(profile, { depth: 8, bevelEnabled: false }),
      deck.material,
    );
    ramp.position.z = z - 4;
    ramp.receiveShadow = ramp.castShadow = true;
    s.add(ramp);
    for (let dx = -width / 2; dx <= width / 2; dx += 2) {
      box(s, 0.06, 0.025, 8, "#554b37", x + dx, DOCK_HEIGHT + 0.01, z);
      for (const dz of [-3.7, 3.7])
        cylinder(s, 0.13, 0.18, 1.8, "#65553e", x + dx, 0.65, z + dz, 6);
    }
  }
  for (const facing of [-1, 1]) {
    const welcome = sign(s, "KARANG TIRTA", 17, 2, "#274c50", "#f0dca1");
    welcome.position.set(20, 6, 298 + facing * 0.025);
    welcome.rotation.y = facing < 0 ? Math.PI : 0;
    welcome.material.side = THREE.FrontSide;
  }
  for (const x of [10, 30])
    beam(s, [x, 0, 298], [x, 6.8, 298], 0.18, "#82674b");
  // Open fish auction: tables, crates, nets and a shade canopy.
  const auction = new THREE.Group();
  auction.position.set(AUCTION.x, 0, AUCTION.z);
  s.add(auction);
  for (const x of [-10, 10])
    for (const z of [-6, 6]) {
      beam(auction, [x, 0, z], [x, 4, z], 0.13, "#6b513c");
      w.colliders.push({
        x: AUCTION.x + x,
        z: AUCTION.z + z,
        w: 0.2,
        d: 0.2,
        h: 4,
      });
    }
  box(auction, 24, 0.18, 16, "#547b80", 0, 4, 0);
  sign(auction, "PELELANGAN IKAN • BU SARI", 16, 1).position.set(0, 3.1, 8);
  w.flightObstacles.push({ x: AUCTION.x, z: AUCTION.z, w: 12, d: 8, h: 4.2 });
  for (const x of [-7, 0, 7]) {
    box(auction, 4, 0.25, 2, "#9b8259", x, 1.2, 1);
    w.colliders.push({
      x: AUCTION.x + x,
      z: AUCTION.z + 1,
      w: 2,
      d: 1,
      h: 1.6,
    });
    for (let i = 0; i < 5; i++)
      orb(
        auction,
        0.25,
        i % 2 ? "#a9c7ce" : "#dfcba7",
        x - 1.5 + i * 0.7,
        1.5,
        1,
        0,
      ).scale.set(1.6, 0.4, 0.7);
    box(auction, 1.5, 0.8, 1.3, "#6e6750", x, 0.4, -4);
  }
  for (const [x, z, label] of [
    [FOOD_STALL.x, FOOD_STALL.z, "WARUNG BU NINGSIH"],
    [-28, 390, "BENGKEL PERAHU"],
  ]) {
    for (const dx of [-4, 4])
      for (const dz of [-3, 3])
        beam(s, [x + dx, 0, z + dz], [x + dx, 3.5, z + dz], 0.14, "#735d45");
    box(s, 10, 0.18, 8, "#9d6749", x, 3.6, z);
    box(s, 6, 1, 1.5, "#b09a6c", x, 0.6, z);
    w.colliders.push({ x, z, w: 3, d: 0.75, h: 1.2 });
    w.flightObstacles.push({ x, z, w: 5, d: 4, h: 3.8 });
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
    const lampZ = onRoad(42, z, 1) ? z + 7 : z;
    cylinder(s, 0.2, 0.3, 3, "#675743", 42, 1.5, lampZ, 6);
    orb(s, 0.25, "#efd4a0", 42, 3, lampZ, 0, {
      emissive: "#efbb6b",
      emissiveIntensity: 0.7,
    });
  }
  return { sea, tower, wreck, houses, auction, decks };
}
