import * as THREE from "three";
import { box, mesh, cylinder, orb, beam, sign, glow } from "./models.js";
import { RITUAL } from "./layout.js";
import { makeHarvestTruck } from "./expansion-models.js";
export function buildExpansionWorld(w) {
  const mosque = new THREE.Group();
  mosque.position.set(75, 0, -178);
  w.static.add(mosque);
  box(mosque, 37, 0.2, 34, "#aaad93", 0, 0.1, 2);
  box(mosque, 28, 6.3, 20, "#d4d4ba", 0, 3.35, 0);
  for (const x of [-10, -5, 0, 5, 10]) {
    box(mosque, 2.4, 3.4, 0.18, "#3e6559", x, 2.2, 10.12);
    mesh(
      mosque,
      new THREE.CircleGeometry(1.2, 20, 0, Math.PI),
      "#3e6559",
      x,
      3.9,
      10.13,
    );
  }
  cylinder(mosque, 7.1, 7.1, 0.8, "#acb59a", 0, 6.75, 0, 24);
  mesh(
    mosque,
    new THREE.SphereGeometry(7.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    "#478875",
    0,
    7.1,
    0,
    { metalness: 0.22, roughness: 0.55 },
  );
  cylinder(mosque, 0.09, 0.12, 2, "#e2c27b", 0, 14.5, 0);
  mesh(
    mosque,
    new THREE.TorusGeometry(0.48, 0.075, 6, 24, Math.PI * 1.55),
    "#e2c27b",
    0,
    15.65,
    0,
  ).rotation.z = -0.6;
  for (const s of [-1, 1]) {
    cylinder(mosque, 1.15, 1.4, 15, "#c6ccb1", s * 16, 7.5, -7, 10);
    cylinder(mosque, 1.65, 1.65, 0.45, "#b5ad7e", s * 16, 12, -7, 12);
    mesh(mosque, new THREE.ConeGeometry(1.5, 3, 12), "#55826a", s * 16, 16, -7);
    w.colliders.push({ x: 75 + s * 16, z: -185, w: 1.5, d: 1.5, h: 18 });
  }
  sign(
    mosque,
    "MASJID RAYA SUKARAME",
    18,
    1.2,
    "#385d50",
    "#e5dab2",
  ).position.set(0, 5.4, 10.2);
  w.colliders.push({ x: 75, z: -178, w: 14.3, d: 10.3, h: 15.5 });
  w.buildingFootprints.push({ id: "masjid", group: mosque, x: 75, z: -178, w: 29, d: 21 });
  w.flightObstacles.push({ x: 75, z: -178, w: 19, d: 13, h: 20 });
  const pesantren = w.building(119, -178, 27, 17, "pesantren", "#bcc6a2");
  for (let x = -10; x <= 10; x += 5)
    box(pesantren, 2.4, 1.5, 0.15, "#60785e", x, 2.5, 8.7);
  sign(w.static, "PESANTREN NURUL FAJAR", 19, 1.1).position.set(
    119,
    4.1,
    -168.9,
  );
  for (const x of [59, 91, 108, 132]) w.lamp(x, -162, 5);
  for (const x of [61, 88, 105, 133]) {
    cylinder(w.static, 0.65, 0.45, 1, "#ad9d73", x, 0.5, -158);
    orb(w.static, 1.3, "#688765", x, 1.8, -158, 1);
  }
  w.building(-253, -263, 14, 11, "dukun", "#625b58");
  const altar = new THREE.Group();
  altar.position.set(RITUAL.x, 0, RITUAL.z);
  w.scene.add(altar);
  box(altar, 3, 0.5, 3, "#5c5658", 0, 0.25, 0);
  const stone = mesh(
    altar,
    new THREE.OctahedronGeometry(0.8),
    "#b894cf",
    0,
    1.5,
    0,
    { emissive: "#773ba0", emissiveIntensity: 1.3 },
  );
  glow(altar, "#c275e4", 8, 0, 1.4, 0, 0.4);
  w.ritualObject = { group: altar, stone };
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    cylinder(
      altar,
      0.08,
      0.11,
      0.65,
      "#bba66f",
      Math.sin(a) * 2,
      0.45,
      Math.cos(a) * 2,
    );
    orb(altar, 0.12, "#cb9adf", Math.sin(a) * 2, 0.82, Math.cos(a) * 2, 0, {
      emissive: "#e3a4ff",
      emissiveIntensity: 2,
    });
  }
  sign(w.static, "UJUNG ALAS", 6, 1).position.set(-217, 3.2, -235);
  // Animal pen beside the fields and a parked palm-fruit harvest truck, clear of the road.
  w.fence(-181, -81, 19);
  w.fence(-190, -91, 20, "z");
  const truck = makeHarvestTruck();
  truck.position.set(-183, 0, 78);
  w.static.add(truck);
  w.colliders.push({ x: -183, z: 78, w: 2, d: 5, h: 4 });
  sign(w.static, "TIMBANG HASIL SAWIT", 9, 1).position.set(-194, 3.8, 72);
  const stand = new THREE.Group();
  stand.position.set(-60, 0, 131);
  w.static.add(stand);
  for (let i = 0; i < 3; i++)
    box(stand, 5, 1 + i * 0.3, 24, "#85775a", -i * 1.6, 0.5 + i * 0.15, 0);
  sign(w.static, "PIALA SUKARAME · TARKAM", 19, 1.5).position.set(-18, 4.8, 96);
  for (const x of [-28, -8])
    cylinder(w.static, 0.09, 0.1, 5, "#776e52", x, 2.5, 96);
  const start = new THREE.Group();
  start.position.set(0, 0, 26);
  w.static.add(start);
  for (const x of [-5.8, 5.8])
    cylinder(start, 0.09, 0.12, 5, "#997e54", x, 2.5, 0);
  sign(
    start,
    "BOCIL GOWES · START / FINISH",
    11.5,
    1,
    "#a28551",
    "#f2e5c4",
  ).position.set(0, 5, 0);
  sign(w.static, "RUMAH BU RINI", 4, 0.7).position.set(-23, 3.3, -56.8);
}
