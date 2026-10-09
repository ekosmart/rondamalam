import { makeAlien } from "./incident-models.js";
import * as THREE from "three";
import { box, mesh, cylinder, orb, sign, beam } from "./models.js";
import {
  CROPS,
  SPACE_Z,
  DINO_PARK,
  DINO_NEST,
  PLAYER_HOME,
} from "./frontier-data.js";
import { makeRocket } from "./frontier-models.js";
export function buildFrontierWorld(w) {
  const h = w.building(
    PLAYER_HOME.x,
    PLAYER_HOME.z,
    10,
    9,
    "player-home",
    "#bbc0a5",
  );
  sign(h, "RUMAH PAK HANSIP", 8, 0.9).position.set(0, 3.6, 4.73);
  const park = w.building(-230, 199, 24, 16, "dino-park", "#a8b098");
  sign(park, "SUKARAME PARK", 20, 1.1).position.set(0, 3.6, 8.23);
  sign(park, "PUSAT PANTAU DINO", 16, 0.7).position.set(0, 5, 8.5);
  const control = w.building(57, 225, 22, 14, "space-z", "#aebdbe");
  sign(control, "SPACE Z · DIVISI Z", 19, 1).position.set(0, 3.6, 7.24);
  const pad = cylinder(
    w.static,
    13,
    13,
    0.3,
    "#687e82",
    SPACE_Z.x,
    0.15,
    SPACE_Z.z,
    48,
  );
  for (const x of [-11, 11])
    for (const z of [-11, 11])
      cylinder(
        w.static,
        0.4,
        0.4,
        6,
        "#d2ba7e",
        SPACE_Z.x + x,
        3,
        SPACE_Z.z + z,
      );
  const rocket = makeRocket();
  rocket.position.set(SPACE_Z.x, 0.4, SPACE_Z.z);
  rocket.userData.exhaust.visible = false;
  w.scene.add(rocket);
  w.colliders.push({ x: SPACE_Z.x, z: SPACE_Z.z, w: 4, d: 4, h: 20 });
  w.flightObstacles.push({ x: SPACE_Z.x, z: SPACE_Z.z, w: 5, d: 5, h: 21 });
  for (let y = 2; y < 20; y += 3)
    beam(w.static, [94, y, 227], [94, y + 3, 237], 0.12, "#82999b");
  for (const z of [227, 237])
    cylinder(w.static, 0.23, 0.23, 21, "#637e82", 94, 10.5, z);
  const cell = new THREE.Group();
  cell.position.set(55, 0, 209);
  w.scene.add(cell);
  box(cell, 5, 0.3, 5, "#546f77", 0, 0.15, 0);
  box(cell, 4.8, 3.5, 4.8, "#88d8e2", 0, 2, 0, {
    transparent: true,
    opacity: 0.11,
    depthWrite: false,
  });
  sign(cell, "RESEARCH / INTEROGASI", 6, 0.6).position.set(0, 4.5, 0);
  const captive = makeAlien();
  cell.add(captive);
  captive.position.y = 0.3;
  captive.visible = false;

  const crater = new THREE.Group();
  crater.position.set(DINO_NEST.x, 0, DINO_NEST.z);
  w.scene.add(crater);
  cylinder(crater, 12, 14, 0.6, "#5e6658", 0, 0.1, 0, 20);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    orb(crater, 1.8, "#6e7366", Math.sin(a) * 12, 0.7, Math.cos(a) * 12, 0);
  }
  orb(crater, 3, "#425b5f", 0, 2, 0, 1, {
    emissive: "#e2854a",
    emissiveIntensity: 0.45,
  });
  crater.visible = false;
  sign(w.static, "SARANG METEOR", 8, 1).position.set(-229, 3, 172);
  const pond = mesh(
    w.scene,
    new THREE.CircleGeometry(9, 48),
    "#338db9",
    -47,
    0.24,
    213,
  );
  pond.rotation.x = -Math.PI / 2;
  w.water.push(pond);
  cylinder(w.static, 9.5, 9.5, 0.13, "#b1b097", -47, 0.05, 213, 48);
  const channel = mesh(
    w.scene,
    new THREE.PlaneGeometry(57, 2, 45, 2),
    "#4499be",
    -126,
    0.23,
    -69,
  );
  channel.rotation.x = -Math.PI / 2;
  w.water.push(channel);
  const fields = [];
  for (const def of CROPS) {
    box(w.static, def.w, 0.12, def.d, "#746c43", def.x, 0.04, def.z);
    const cols = Math.floor(def.w / 0.85),
      rows = Math.floor(def.d / 0.85),
      count = cols * rows;
    const corn = def.id === "corn",
      height = corn ? 2.7 : 1.2;
    const stem = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(
        corn ? 0.045 : 0.018,
        corn ? 0.055 : 0.025,
        height,
        4,
      ),
      new THREE.MeshStandardMaterial({ color: corn ? "#638246" : "#c1aa59" }),
      count,
    );
    const heads = new THREE.InstancedMesh(
      new THREE.ConeGeometry(corn ? 0.13 : 0.075, corn ? 0.5 : 0.36, 5),
      new THREE.MeshStandardMaterial({ color: corn ? "#dcbb57" : "#e4ca7d" }),
      count,
    );
    const leaves = new THREE.InstancedMesh(
      new THREE.ConeGeometry(corn ? 0.5 : 0.16, corn ? 1.4 : 0.6, 3),
      new THREE.MeshStandardMaterial({ color: corn ? "#789953" : "#b3ab5b" }),
      count * 2,
    );
    const dummy = new THREE.Object3D();
    let i = 0;
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++, i++) {
        const x = def.x - def.w / 2 + 0.5 + col * 0.85,
          z = def.z - def.d / 2 + 0.5 + row * 0.85,
          s = 0.85 + Math.sin(i * 13) * 0.13;
        dummy.position.set(x, (height * s) / 2, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, s, 1);
        dummy.updateMatrix();
        stem.setMatrixAt(i, dummy.matrix);
        dummy.position.y = height * s;
        dummy.updateMatrix();
        heads.setMatrixAt(i, dummy.matrix);
        for (let side = 0; side < 2; side++) {
          dummy.position.y = height * s * (side ? 0.52 : 0.7);
          dummy.rotation.set(0.5, i, side ? -0.8 : 0.8);
          dummy.updateMatrix();
          leaves.setMatrixAt(i * 2 + side, dummy.matrix);
        }
      }
    for (const m of [stem, heads, leaves]) {
      m.castShadow = false;
      m.receiveShadow = true;
      w.scene.add(m);
    }
    fields.push({ def, stem, heads, leaves, count });
    sign(w.static, def.name.toUpperCase() + " · E PANEN", 12, 0.8).position.set(
      def.x,
      2.4,
      def.z - def.d / 2 - 2,
    );
  }
  mesh(
    w.static,
    new THREE.TorusGeometry(1.7, 0.27, 6, 20),
    "#877d56",
    -216,
    13,
    83,
  ).rotation.x = Math.PI / 2;
  w.frontier = { rocket, crater, cell, captive, fields };
}
export function frontierClearing(x, z) {
  return (
    CROPS.some(
      (p) => Math.abs(x - p.x) < p.w / 2 + 6 && Math.abs(z - p.z) < p.d / 2 + 6,
    ) ||
    Math.hypot(x - 78, z - 226) < 35 ||
    Math.hypot(x + 230, z - 202) < 45 ||
    Math.hypot(x + 244, z - 168) < 17 ||
    Math.hypot(x + 47, z - 213) < 13
  );
}
