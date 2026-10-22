import * as THREE from "three";
import { asset } from "./assets.js";
import { createStation } from "./station-model.js";
import { buildLocomotive, buildPortal } from "./portal-models.js";
import { makeHuman, box, sign } from "../models.js";
import { STATION, LARAS, BOOTH, BOOK, TROLLEY, PORTAL } from "./rules.js";
export function place(parent, id, h, x, z, y = 0) {
  const m = asset(id, h);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
export function buildMagicVillage(g) {
  const root = new THREE.Group();
  root.name = "Stasiun Tengah Malam";
  g.scene.add(root);

  box(root, 58, 0.1, 34, "#555e58", STATION.x + 4, 0.03, STATION.z + 2);
  const station = createStation();
  station.group.position.set(STATION.x, 0.12, STATION.z);
  root.add(station.group);
  const gate = place(root, "school_gate", 7, PORTAL.x, PORTAL.z - 0.5);
  gate.rotation.y = 0;
  const portal = buildPortal();
  portal.g.position.set(PORTAL.x, 0.12, PORTAL.z);
  root.add(portal.g);
  const booth = place(root, "ticket_booth", 3.7, BOOTH.x, BOOTH.z - 3);
  place(root, "platform_sign", 3, STATION.x + 9, STATION.z + 9);
  const trolley = place(root, "trolley", 1.7, TROLLEY.x, TROLLEY.z);
  const book = place(root, "spellbook", 0.3, BOOK.x, BOOK.z, 0.8);
  for (const x of [STATION.x - 19, STATION.x - 2, STATION.x + 14])
    place(root, "candle", 0.9, x, STATION.z + 7);
  const owl = place(root, "owl", 1, BOOTH.x - 1, BOOTH.z - 3, 4.3);
  const train = buildLocomotive();
  train.g.rotation.y = Math.PI / 2;
  root.add(train.g);
  const carriage = place(root, "carriage", 3.7, STATION.x - 19, STATION.z + 14);
  carriage.rotation.y = Math.PI / 2;
  for (const z of [STATION.z + 13, STATION.z + 15])
    box(root, 70, 0.1, 0.15, "#858783", STATION.x + 3, 0.14, z);
  for (let x = STATION.x - 29; x < STATION.x + 38; x += 2)
    box(root, 0.22, 0.08, 3, "#413a31", x, 0.08, STATION.z + 14);
  const guide = makeHuman("#6e5484");
  guide.position.set(LARAS.x, 0, LARAS.z);
  root.add(guide);
  const keeper = makeHuman("#566657");
  keeper.position.set(BOOTH.x + 3, 0, BOOTH.z);
  root.add(keeper);
  sign(root, "BU LARAS · KUTUKAN SAPU HITAM", 8, 0.6).position.set(
    LARAS.x,
    3.4,
    LARAS.z,
  );
  sign(root, "STASIUN TENGAH MALAM", 10, 0.8).position.set(
    STATION.x,
    4,
    STATION.z + 8,
  );
  sign(root, "PERON 13 · TIKET & TROLI · MALAM", 10, 0.7).position.set(
    PORTAL.x,
    6.3,
    PORTAL.z,
  );
  for (const c of [
    ...[-8, -4, 4, 8].map((x) => ({
      x: STATION.x + x,
      z: STATION.z - 3,
      w: 2,
      d: 0.25,
      h: 5,
    })),
    { x: PORTAL.x, z: PORTAL.z, w: 4.1, d: 0.4, h: 7 },
    { x: STATION.x, z: STATION.z - 2.4, w: 2.1, d: 1.7, h: 13 },
    { x: BOOTH.x, z: BOOTH.z - 3, w: 2, d: 1.4, h: 4 },
  ]) {
    g.world.colliders.push(c);
    g.world.flightObstacles.push(c);
  }
  const light = new THREE.PointLight("#c2b7ff", 75, 30, 1.4);
  light.position.set(PORTAL.x, 5, PORTAL.z + 3);
  root.add(light);
  const peronLight = new THREE.PointLight("#c2d6ae", 90, 35, 1.4);
  peronLight.position.set(STATION.x - 5, 6, STATION.z + 4);
  root.add(peronLight);
  return {
    root,
    station,
    portal,
    trolley,
    book,
    owl,
    train,
    carriage,
    guide,
    keeper,
  };
}
export function buildAcademy() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#13243a");
  scene.fog = new THREE.Fog("#293b54", 65, 145);
  scene.add(new THREE.HemisphereLight("#c9d8ff", "#344337", 2));
  const sun = new THREE.DirectionalLight("#e7d9b1", 2.5);
  sun.position.set(-20, 45, 25);
  scene.add(sun);
  box(scene, 100, 0.5, 110, "#34483d", 0, -0.3, -15);
  box(scene, 8, 0.05, 65, "#87918a", 0, 0, 5);
  const castle = place(scene, "castle", 29, 0, -36);
  place(scene, "school_gate", 8, -23, 23).rotation.y = Math.PI / 2;
  sign(scene, "KEMBALI KE PERON 13 · E", 7, 0.65).position.set(-23, 8.4, 23);
  const teacher = makeHuman("#575181");
  teacher.position.set(4, 0, 22);
  scene.add(teacher);
  sign(scene, "PROF. ARUN · AKADEMI SIHIR", 8, 0.7).position.set(4, 3.5, 22);
  sign(scene, "HALAMAN AKADEMI · INTERIOR BELUM TERBUKA", 16, 0.8).position.set(
    0,
    4,
    -19,
  );
  const targets = [
    [-15, 10],
    [15, 3],
    [-12, -10],
  ].map(([x, z], i) => {
    const m = place(scene, "scarecrow", 3.5, x, z);
    place(scene, "candle", 0.8, x - 1, z + 1);
    sign(scene, ["LENTERA", "BULAN", "OMBAK"][i], 4, 0.5).position.set(x, 4, z);
    return m;
  });
  for (let z = -13; z <= 18; z += 8) {
    for (const x of [-5.5, 5.5]) {
      place(scene, "candle", 1.1, x, z);
      box(scene, 0.65, 0.15, 0.65, "#7f8794", x, 0.06, z);
    }
  }
  for (const x of [-30, 30]) box(scene, 1.5, 0.7, 51, "#596c62", x, 0.2, 6);
  const source = place(scene, "curse_bolt", 1.8, 0, -15, 1);
  place(scene, "spellbook", 0.3, 6, 22, 1);
  place(scene, "potion", 0.8, 7, 22, 1);
  place(scene, "owl", 1.2, 7, 22, 3.5);
  return {
    scene,
    teacher,
    targets,
    source,
    castle,
    camera: new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 180),
  };
}
