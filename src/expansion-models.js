import {createWitchRig} from "./magic/rider-model.js";
import { VEHICLE_ASSETS, makeVehicleMount, animateVehicleMount } from "./vehicle-assets.js";
import { makeFarmAsset, animateFarmAsset } from "./farm-assets.js";
import { makeGyroBall } from "./frontier-models.js";
import {
  makeLivestock,
  animateLivestock,
  makeChurchResident,
} from "./rural-models.js";
import * as THREE from "three";
import { makeSaucer, makeAlien, upgradeMecha } from "./incident-models.js";
import {
  box,
  orb,
  mesh,
  cylinder,
  beam,
  glow,
  makeHuman,
  makeBicycle,
} from "./models.js";

export function makeMount(def, tech = {}) {
  if (VEHICLE_ASSETS[def.id]) return makeVehicleMount(def.id);
  if (def.id === "horse") return makeLivestock("horse");
  if (def.id === "tractor") return makeFarmAsset("tractor", makeBicycle("motor", "#b75538"));
  if (def.id === "sapu") return createWitchRig(true).group;
  if (def.id === "gyroball") return makeGyroBall();
  if (def.id === "sembrani") {
    const horse = makeLivestock("horse", false, true);
    if (tech.spiritAwakened) {
      const aura = new THREE.Group();
      horse.add(aura);
      for (let i = 0; i < 6; i++)
        orb(aura, 0.13, "#83edce", 0, 2.1 + i * 0.09, 0.2 + i * 0.16, 0,
          { emissive: "#50dfc4", emissiveIntensity: 1.4 });
      for (const side of [-1, 1]) {
        box(aura, 0.08, 0.4, 0.95, "#278c86", side * 0.5, 1.9, -0.1,
          { metalness: 0.35 });
        for (let i = 0; i < 5; i++)
          orb(aura, 0.055, "#e7c278", side * 0.56, 1.85 + Math.sin(i) * 0.08,
            -0.45 + i * 0.18, 0, { emissive: "#bf8735", emissiveIntensity: 0.3 });
      }
      const sparks = [];
      for (let i = 0; i < 8; i++)
        sparks.push(orb(aura, 0.05, "#f6d58e", Math.sin(i) * 0.65, 0.1,
          Math.cos(i) * 0.9, 0, { emissive: "#e6b94a", emissiveIntensity: 1.4 }));
      horse.userData.sukmaSparks = sparks;
      if (tech.spiritBlessed) {
        box(aura, 1.03, 0.12, 0.8, "#d7b56b", 0, 2.27, -0.12);
        orb(aura, 0.16, "#b6f9e6", 0, 2.42, 1.9, 0,
          { emissive: "#61d9be", emissiveIntensity: 1.5 });
      }
    }
    return horse;
  }
  if (def.id === "ufo") return makeSaucer(false, true);
  if (!["naga", "mecha"].includes(def.id))
    return makeBicycle(def.id, def.color);
  const g = new THREE.Group();
  g.userData.wheels = [];
  if (def.id === "naga") {
    const skin = "#994c36",
      gold = "#d8aa5b",
      dark = "#61352e";
    const body = orb(g, 1.8, skin, 0, 1.4, 0, 1);
    body.scale.set(0.9, 0.67, 1.8);
    const belly = orb(g, 1.3, gold, 0, 1.2, 0.5, 1);
    belly.scale.set(0.65, 0.5, 1.7);
    for (let i = 0; i < 6; i++) {
      const tail = orb(
        g,
        0.7 - i * 0.075,
        skin,
        Math.sin(i * 0.45) * 0.4,
        1.2 - i * 0.08,
        -2 - i * 0.63,
        0,
      );
      tail.rotation.y = i * 0.1;
    }
    beam(g, [0, 1.5, 1.8], [0, 2.65, 3.1], 0.63, skin);
    const head = orb(g, 0.86, skin, 0, 2.8, 3.45, 1);
    head.scale.set(0.9, 0.72, 1.2);
    box(g, 1, 0.35, 1.25, gold, 0, 2.43, 4.08);
    for (const s of [-1, 1]) {
      orb(g, 0.16, "#ffe996", s * 0.64, 2.97, 3.91, 1, {
        emissive: "#ff981c",
        emissiveIntensity: 3,
      });
      beam(g, [s * 0.42, 3.1, 3.25], [s * 0.78, 4.1, 2.65], 0.14, gold);
      for (const z of [-1.25, 1.15]) {
        beam(g, [s * 0.85, 1.4, z], [s * 1.2, 0.2, z + 0.15], 0.23, dark);
        for (let j = 0; j < 3; j++)
          beam(
            g,
            [s * 1.2, 0.18, z + 0.15],
            [s * 1.2 + (j - 1) * 0.18, 0.08, z + 0.5],
            0.055,
            gold,
          );
      }
    }
    const wings = [];
    for (const s of [-1, 1]) {
      const wing = new THREE.Group();
      wing.position.set(s * 0.9, 2, 0.1);
      g.add(wing);
      const vertices = [
        0,
        0,
        0,
        s * 3.3,
        1,
        -0.2,
        s * 5.7,
        0.2,
        -2,
        0,
        0,
        0,
        s * 5.7,
        0.2,
        -2,
        s * 3.4,
        -0.15,
        -2.6,
        0,
        0,
        0,
        s * 3.4,
        -0.15,
        -2.6,
        s * 1.5,
        -0.5,
        -2.2,
      ];
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3),
      );
      geo.computeVertexNormals();
      mesh(wing, geo, "#c76c3f", 0, 0, 0, { side: THREE.DoubleSide });
      for (const b of [
        [s * 3.3, 1, -0.2],
        [s * 5.7, 0.2, -2],
        [s * 3.4, -0.15, -2.6],
      ])
        beam(wing, [0, 0, 0], b, 0.09, gold);
      wings.push(wing);
    }
    g.userData.wings = wings;
    for (let i = 0; i < 7; i++)
      mesh(
        g,
        new THREE.ConeGeometry(0.25, 0.7, 4),
        gold,
        0,
        2.4,
        -2 + i * 0.55,
      );
    box(g, 1, 0.17, 0.9, "#403d32", 0, 2.58, 0.3);
    g.userData.mouth = new THREE.Vector3(0, 2.7, 4.7);
  } else {
    const white = "#dce5e3",
      blue = "#284c75",
      red = "#b84b42",
      gold = "#e3bb5b";
    const torso = new THREE.Group();
    g.add(torso);
    box(torso, 2.6, 2.1, 1.45, blue, 0, 4.6, 0);
    box(torso, 1.1, 0.9, 0.15, red, 0, 4.7, 0.82);
    orb(torso, 0.22, "#78e8f1", 0, 4.9, 0.95, 1, {
      emissive: "#3cbad4",
      emissiveIntensity: 3,
    });
    for (const s of [-1, 1]) {
      box(torso, 0.68, 0.65, 0.23, gold, s * 0.88, 5.05, 0.78);
      box(torso, 1.3, 1, 1.45, white, s * 1.85, 5.25, 0);
      box(torso, 0.75, 1.8, 0.85, blue, s * 1.75, 3.95, 0.05);
      box(torso, 0.7, 0.6, 0.72, white, s * 1.75, 3, 0.1);
    }
    box(g, 2, 0.7, 1.1, white, 0, 3.2, 0);
    g.userData.legs = [];
    for (const s of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(s * 0.63, 2.9, 0);
      g.add(leg);
      g.userData.legs.push(leg);
      box(leg, 0.83, 2.4, 0.95, white, 0, -1.2, 0);
      box(leg, 0.88, 0.72, 1.13, blue, 0, -0.8, 0.08);
      box(leg, 1, 0.48, 1.75, red, 0, -2.62, 0.35);
    }
    box(torso, 1.22, 1.03, 0.95, white, 0, 6.05, 0.1);
    box(torso, 0.92, 0.14, 0.1, "#80f0d7", 0, 6.19, 0.61, {
      emissive: "#45ffd2",
      emissiveIntensity: 3,
    });
    box(torso, 0.26, 0.33, 0.25, red, 0, 5.91, 0.66);
    for (const s of [-1, 1])
      beam(torso, [0, 6.46, 0.4], [s * 0.92, 7.22, 0.4], 0.09, gold);
    box(torso, 0.32, 2.7, 0.55, blue, 1.9, 3.35, 0.7);
    cylinder(torso, 0.16, 0.16, 2.6, "#c4e5ec", 1.9, 3.3, 1.03).rotation.x =
      Math.PI / 2;
    const shield = box(torso, 1.35, 2.35, 0.22, red, -1.9, 3.75, 0.8);
    box(torso, 0.17, 1.5, 0.06, gold, -1.9, 3.75, 0.96);
    const saber = mesh(
      torso,
      new THREE.CylinderGeometry(0.08, 0.16, 4.8, 8),
      new THREE.MeshBasicMaterial({
        color: "#98f1ff",
        transparent: true,
        opacity: 0.85,
      }),
      1.9,
      3.4,
      3.5,
    );
    saber.rotation.x = Math.PI / 2;
    saber.visible = false;
    g.userData.saber = saber;
    const ward = mesh(
      g,
      new THREE.IcosahedronGeometry(4.5, 1),
      new THREE.MeshBasicMaterial({
        color: "#70dcf1",
        wireframe: true,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
      0,
      3.6,
      0,
    );
    ward.visible = false;
    g.userData.ward = ward;
    for (const s of [-1, 1]) {
      box(torso, 0.63, 1.6, 0.75, blue, s * 0.6, 4.7, -1.1);
      glow(torso, "#72c6fa", 2, s * 0.6, 3.9, -1.1, 0.6);
    }
    g.userData.torso = torso;
    g.userData.shield = shield;
  }
  if (def.id === "mecha" && tech.mechaFlight) upgradeMecha(g);
  return g;
}
export function animateMount(g, id, t, moving) {
  if (VEHICLE_ASSETS[id]) { animateVehicleMount(g,t,moving); return; }
  if (id === "horse" || id === "tractor") { animateFarmAsset(g,t,moving,id==="tractor"); return; }
  if (id === "sapu") { g.rotation.z=Math.sin(t*2)*.05; return; }
  if (id === "gyroball") {
    if (moving) g.userData.shell.rotation.x = t * 6;
    return;
  }
  if (id === "sembrani") {
    animateLivestock(g, t, moving, g.position.y > 4);
    g.userData.sukmaSparks?.forEach((s, i) => {
      s.visible = moving;
      s.position.y = 0.08 + ((t * 0.7 + i / 8) % 1) * 0.65;
    });
    return;
  }
  if (id === "ufo") {
    g.rotation.z = Math.sin(t * 1.8) * 0.035;
    g.userData.dome.rotation.y = t * 0.5;
  }
  if (id === "naga") {
    g.userData.wings.forEach(
      (w, i) =>
        (w.rotation.z =
          Math.sin(t * 4) * (i ? -0.3 : 0.3) + (i ? -0.12 : 0.12)),
    );
    g.rotation.z = Math.sin(t * 1.5) * 0.035;
  }
  if (id === "mecha") {
    g.userData.torso.position.y = moving
      ? Math.sin(t * 7) * 0.1
      : Math.sin(t) * 0.025;
    g.userData.legs.forEach(
      (leg, i) =>
        (leg.rotation.x = moving ? Math.sin(t * 7 + i * Math.PI) * 0.3 : 0),
    );
  }
}
export function makeResident(def) {
  if (["pastor", "nun"].includes(def.outfit)) return makeChurchResident(def);
  if (def.outfit === "et") return makeAlien(true);
  const g = makeHuman(def.color || "#b4ba9e");
  if (def.outfit === "professor") {
    box(g, 1, 1.25, 0.58, "#e9ecde", 0, 1.5, 0);
    box(g, 0.18, 0.65, 0.06, "#798c95", 0, 1.76, 0.34);
    for (const x of [-0.13, 0.13])
      mesh(
        g,
        new THREE.TorusGeometry(0.105, 0.022, 5, 12),
        "#3e5260",
        x,
        2.4,
        0.32,
      );
    orb(g, 0.34, "#d8dccc", 0, 2.6, -0.07, 0).scale.y = 0.55;
  }
  if (def.outfit === "child") {
    g.scale.setScalar(0.7);
  }
  if (["kiai", "santri"].includes(def.outfit)) {
    cylinder(
      g,
      0.43,
      0.55,
      1.15,
      def.outfit === "kiai" ? "#c7c4a8" : "#536d65",
      0,
      0.65,
      0,
    );
    cylinder(
      g,
      0.3,
      0.31,
      0.23,
      def.outfit === "kiai" ? "#eeead6" : "#202d28",
      0,
      2.72,
      0,
    );
    if (def.outfit === "kiai")
      box(g, 0.22, 0.75, 0.055, "#768d6b", 0.28, 1.8, 0.28);
  }
  if (def.outfit === "farmer" || def.outfit === "harvester")
    mesh(g, new THREE.ConeGeometry(0.7, 0.3, 12), "#ba9d5e", 0, 2.8, 0);
  if (def.outfit === "dukun") {
    cylinder(g, 0.55, 0.8, 1.8, "#342838", 0, 1.1, 0);
    beam(g, [0.85, 0.1, 0], [0.85, 3.1, 0], 0.08, "#836252");
    orb(g, 0.22, "#c99adc", 0.85, 3.15, 0, 0, {
      emissive: "#a256cb",
      emissiveIntensity: 2,
    });
  }
  return g;
}
export function makeBuffalo() {
  const g = new THREE.Group();
  orb(g, 1.5, "#5c6666", 0, 1.45, 0, 1).scale.set(0.65, 0.68, 1.25);
  orb(g, 0.66, "#677274", 0, 1.55, 1.65, 1);
  for (const s of [-1, 1]) {
    for (const z of [-1, 1])
      cylinder(g, 0.16, 0.12, 1, "#444f50", s * 0.65, 0.5, z);
    beam(g, [s * 0.4, 1.8, 1.6], [s * 1.2, 2.15, 1.4], 0.12, "#b2b0a0");
    beam(g, [s * 1.2, 2.15, 1.4], [s * 1.35, 2.6, 1.35], 0.07, "#c8c6ad");
  }
  return g;
}
export function makeHarvestTruck() {
  const g = new THREE.Group();
  box(g, 3, 1.8, 3, "#bd984f", 0, 2, 3);
  box(g, 2.65, 0.9, 0.04, "#789d9d", 0, 2.35, 4.54);
  box(g, 3.4, 0.5, 6.5, "#5e6a53", 0, 1.2, -0.9);
  for (const x of [-1.7, 1.7]) box(g, 0.12, 1.8, 6.5, "#899376", x, 2, -0.9);
  box(g, 3.4, 1.8, 0.15, "#899376", 0, 2, -4.15);
  for (const x of [-1.6, 1.6])
    for (const z of [-2.5, 3]) {
      const w = mesh(
        g,
        new THREE.CylinderGeometry(0.73, 0.73, 0.42, 12),
        "#293632",
        x,
        0.76,
        z,
      );
      w.rotation.z = Math.PI / 2;
    }
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 3; col++)
      orb(
        g,
        0.6,
        ["#9e562f", "#bf773d", "#654534"][(row + col) % 3],
        (col - 1) * 0.93,
        2.2 + Math.sin(row) * 0.2,
        -3.3 + row * 0.9,
        0,
      );
  return g;
}
