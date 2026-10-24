import * as THREE from "three";
import { box, orb, mesh, cylinder, beam, sign } from "./models.js";
import { CHURCH, NEW_HOMES } from "./rural-data.js";
import { makeFarmAsset } from "./farm-assets.js";
export function buildRuralWorld(w) {
  for (const [x, z] of NEW_HOMES) {
    w.building(x, z, 10, 8, "house", ["#a4a890", "#9caa97"][Math.abs(z) % 2]);
    w.fence(x, z + 7, 11);
  }
  const church = new THREE.Group();
  church.position.set(CHURCH.x, 0, CHURCH.z);
  w.static.add(church);
  box(church, 27, 0.25, 27, "#9eab96", 0, 0.13, 1);
  box(church, 22, 9, 21, "#c9c7b4", 0, 4.5, 0);
  w.roof(church, 24, 23, 9, 5);
  const arch = (x, y, z, wide = 1.1, high = 3.7) => {
    const s = new THREE.Shape();
    s.moveTo(-wide, 0);
    s.lineTo(wide, 0);
    s.lineTo(wide, high * 0.68);
    s.quadraticCurveTo(wide * 0.55, high * 0.9, 0, high);
    s.quadraticCurveTo(-wide * 0.55, high * 0.9, -wide, high * 0.68);
    s.closePath();
    mesh(church, new THREE.ShapeGeometry(s), "#506e75", x, y, z, {
      emissive: "#527986",
      emissiveIntensity: 0.17,
    });
  };
  for (const x of [-8, 8]) {
    box(church, 4.5, 15, 5, "#d9d6c1", x, 7.5, 8);
    box(church, 4.9, 0.5, 5.4, "#939c8a", x, 13.8, 8);
    for (const side of [-1, 1])
      box(church, 0.35, 15.2, 0.5, "#9da798", x + side * 2, 7.6, 10.55);
    arch(x, 9.5, 10.6, 1.2, 3);
    mesh(
      church,
      new THREE.ConeGeometry(3.2, 10, 4),
      "#667974",
      x,
      20,
      8,
    ).rotation.y = Math.PI / 4;
    box(church, 0.14, 1.9, 0.16, "#d4cfad", x, 25.7, 8);
    box(church, 0.85, 0.13, 0.16, "#d4cfad", x, 26, 8);
  }
  arch(0, 0.4, 10.62, 1.8, 4.9);
  arch(-3.6, 0.4, 10.62, 0.8, 3.2);
  arch(3.6, 0.4, 10.62, 0.8, 3.2);
  const rose = mesh(
    church,
    new THREE.CircleGeometry(1.7, 24),
    "#6e939d",
    0,
    7.4,
    10.65,
    { emissive: "#8b617f", emissiveIntensity: 0.3 },
  );
  mesh(
    church,
    new THREE.TorusGeometry(1.75, 0.16, 6, 32),
    "#a6a990",
    0,
    7.4,
    10.7,
  );
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    beam(
      church,
      [0, 7.4, 10.75],
      [Math.sin(a) * 1.65, 7.4 + Math.cos(a) * 1.65, 10.75],
      0.055,
      "#d4cfb6",
    );
  }
  for (const s of [-1, 1])
    for (const z of [-8, -2, 4]) {
      box(church, 0.7, 10, 0.7, "#a5ae9c", s * 11.15, 5, z);
      box(church, 0.75, 5, 1.3, "#9ca78f", s * 11.7, 2.5, z);
    }
  sign(church, "GEREJA SANTA MARIA SUKARAME", 19, 0.75).position.set(
    0,
    5.55,
    10.85,
  );
  w.colliders.push({ x: CHURCH.x, z: CHURCH.z, w: 12.2, d: 11, h: 27 });
  w.flightObstacles.push({ x: CHURCH.x, z: CHURCH.z, w: 13, d: 12, h: 28 });
  w.buildingFootprints.push({
    id: "gereja", group: church,
    x: CHURCH.x,
    z: CHURCH.z,
    w: 25,
    d: 23,
  });
  const barn = w.building(-126, 194, 22, 14, "farm", "#ab9c77");
  // Keep the async replacement out of the static batch so the old barn is
  // actually removed when the GLB arrives, including during weather damage.
  w.scene.add(barn);
  makeFarmAsset("barn", barn);
  sign(barn, "PETERNAKAN PAK MULYONO", 19, 1).position.set(0, 3.4, 7.25);
  const silo = cylinder(w.static, 2, 2.1, 7, "#939e91", -143, 3.5, 196, 12);
  mesh(
    w.static,
    new THREE.ConeGeometry(2.25, 2.1, 12),
    "#69786b",
    -143,
    8,
    196,
  );
  w.colliders.push({ x: -143, z: 196, w: 2.2, d: 2.2, h: 9 });
  w.flightObstacles.push({ x: -143, z: 196, w: 3, d: 3, h: 10 });
  w.fence(-124, 145, 74);
  w.fence(-136, 187, 50);
  w.fence(-95, 187, 16);
  for (const x of [-163, -85]) w.fence(x, 166, 42, "z");
  box(w.static, 8, 0.3, 1.2, "#817b61", -126, 0.15, 183);
  box(w.static, 7.4, 0.17, 0.8, "#a99d68", -126, 0.4, 183);
  for (const x of [-153, -148]) {
    cylinder(w.static, 1.3, 1.3, 2, "#c1b578", x, 1, 209, 10).rotation.z =
      Math.PI / 2;
  }
  sign(w.static, "PADANG TERNAK · TUTUP PAGAR SAAT MALAM", 22, 1).position.set(
    -123,
    3.8,
    187,
  );
  w.ruralWorld = { church, barn, silo, rose };
}
