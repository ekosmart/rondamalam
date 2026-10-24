import * as THREE from "three";
import { FARM_ASSETS, makeFarmAsset, animateFarmAsset } from "./farm-assets.js";
import { box, orb, beam, mesh, cylinder, glow, makeHuman } from "./models.js";

export function makeLivestock(kind = "cow", infected = false, winged = false) {
  const fallback = makeLegacyLivestock(kind, infected, winged);
  return !infected && !winged && FARM_ASSETS[kind] ? makeFarmAsset(kind, fallback) : fallback;
}
function makeLegacyLivestock(kind, infected, winged) {
  const g = new THREE.Group(),
    horse = kind === "horse",
    bird = kind === "chicken",
    dog = kind === "dog",
    sheep = kind === "sheep";
  const coat = infected
    ? "#809356"
    : winged
      ? "#f1efde"
      : horse
        ? "#916747"
        : sheep
          ? "#e4dfcb"
          : dog
            ? "#9b8062"
            : bird
              ? "#473f38"
              : "#c8c6ad";
  const legs = [],
    wings = [];
  g.userData = { kind, legs, wings, wheels: [] };
  if (bird) {
    orb(g, 0.32, coat, 0, 0.5, 0, 1).scale.set(0.9, 1, 1.3);
    orb(g, 0.17, coat, 0, 0.85, 0.25, 1);
    mesh(
      g,
      new THREE.ConeGeometry(0.08, 0.2, 4),
      "#d4a65a",
      0,
      0.82,
      0.46,
    ).rotation.x = Math.PI / 2;
    box(g, 0.09, 0.14, 0.13, "#b44e40", 0, 1.05, 0.26);
    for (const s of [-1, 1])
      beam(g, [s * 0.1, 0.35, 0], [s * 0.1, 0.03, 0.05], 0.025, "#c0a25e");
  } else {
    const y = horse ? 1.6 : dog ? 0.7 : 1.15,
      length = horse ? 2 : dog ? 1.1 : 1.8,
      width = sheep ? 0.8 : dog ? 0.45 : 0.85;
    orb(g, 1, coat, 0, y, 0, 1).scale.set(
      width,
      sheep ? 0.68 : horse ? 0.7 : 0.55,
      length * 0.62,
    );
    if (sheep)
      for (let i = 0; i < 12; i++)
        orb(
          g,
          0.35,
          coat,
          Math.sin(i * 2.4) * 0.62,
          y + Math.cos(i * 1.7) * 0.25,
          Math.cos(i * 2.4) * 0.8,
          0,
        );
    beam(
      g,
      [0, y, length * 0.4],
      [0, y + (horse ? 0.8 : 0.25), length * 0.65],
      horse ? 0.32 : 0.28,
      coat,
    );
    const head = orb(
      g,
      0.4,
      coat,
      0,
      y + (horse ? 0.95 : 0.3),
      length * 0.75,
      1,
    );
    head.scale.set(dog ? 0.65 : 0.85, 1, horse ? 1.4 : 1);
    orb(
      g,
      0.27,
      infected ? "#6b7654" : horse ? "#d2c2a2" : "#b5a58b",
      0,
      y + (horse ? 0.83 : 0.18),
      length * 0.9,
      0,
    ).scale.z = 1.3;
    for (const s of [-1, 1]) {
      mesh(
        g,
        new THREE.ConeGeometry(0.12, horse ? 0.42 : 0.27, 4),
        coat,
        s * 0.22,
        y + (horse ? 1.5 : 0.85),
        length * 0.72,
      ).rotation.z = -s * 0.2;
      orb(
        g,
        0.065,
        infected ? "#eeb66c" : "#19272a",
        s * 0.3,
        y + (horse ? 1.02 : 0.4),
        length * 0.85,
        0,
        {
          emissive: infected ? "#dd822d" : "#000000",
          emissiveIntensity: infected ? 1 : 0,
        },
      );
      if (kind === "cow" || kind === "buffalo")
        beam(
          g,
          [s * 0.3, y + 0.55, length * 0.72],
          [s * 0.6, y + 0.8, length * 0.63],
          0.075,
          "#dbd1ab",
        );
      for (const z of [-1, 1]) {
        const leg = new THREE.Group();
        leg.position.set(s * width * 0.6, y - 0.2, z * length * 0.42);
        g.add(leg);
        box(leg, 0.18, y - 0.18, 0.21, coat, 0, -(y - 0.18) / 2, 0);
        box(leg, 0.22, 0.17, 0.29, "#474738", 0, -y + 0.18, 0.04);
        legs.push(leg);
      }
    }
    const tail = beam(
      g,
      [0, y, -length * 0.55],
      [0, y - 0.5, -length * 0.8],
      dog ? 0.12 : 0.055,
      horse ? "#423f33" : coat,
    );
    g.userData.tail = tail;
    if (horse) {
      box(
        g,
        0.17,
        0.55,
        1.15,
        winged ? "#d2d1bd" : "#443b2f",
        0,
        y + 0.7,
        0.42,
      );
      box(g, 0.95, 0.15, 0.7, "#796346", 0, y + 0.6, -0.12);
    }
    if (dog) {
      cylinder(
        g,
        0.24,
        0.24,
        0.14,
        "#bdab6e",
        0,
        y + 0.23,
        0.61,
        8,
      ).rotation.x = Math.PI / 2;
    }
    if (winged) {
      for (const s of [-1, 1]) {
        const wing = new THREE.Group();
        wing.position.set(s * 0.65, y + 0.5, -0.1);
        g.add(wing);
        for (let i = 0; i < 7; i++) {
          const feather = orb(
            wing,
            0.5,
            i % 2 ? "#e3e4d7" : "#f6f2de",
            s * (0.35 + i * 0.4),
            0.1 - i * 0.025,
            -i * 0.17,
            0,
          );
          feather.scale.set(0.55, 0.14, 1.5 + i * 0.18);
          feather.rotation.y = s * (0.3 + i * 0.07);
        }
        beam(wing, [0, 0, 0], [s * 2.75, 0.05, -0.9], 0.09, "#d8d5bd");
        wings.push(wing);
      }
      glow(g, "#efddaa", 2.3, 0, y + 0.3, 0, 0.18);
    }
  }
  return g;
}
export function animateLivestock(g, t, moving = false, flying = false) {
  if (g.userData.farmLoaded) { animateFarmAsset(g,t,moving); return; }
  const { legs = [], wings = [], kind } = g.userData;
  legs.forEach(
    (leg, i) =>
      (leg.rotation.x = flying
        ? 0.3
        : moving
          ? Math.sin(
              t * (kind === "horse" ? 9 : 5) +
                (i % 2) * Math.PI +
                (i > 1 ? Math.PI : 0),
            ) * 0.5
          : 0),
  );
  wings.forEach(
    (w, i) =>
      (w.rotation.z =
        (i ? 1 : -1) * (flying ? 0.25 + Math.sin(t * 4) * 0.45 : 0.65)),
  );
  if (kind === "chicken") g.rotation.z = Math.sin(t * 3) * 0.035;
}
export function makeChurchResident(def) {
  const nun = def.outfit === "nun",
    g = makeHuman(nun ? "#e3e1ce" : "#353c39");
  box(g, 0.86, 1.3, 0.55, nun ? "#e3e1ce" : "#343b39", 0, 0.82, 0);
  if (nun) {
    orb(g, 0.4, "#dadbcf", 0, 2.4, -0.08, 1).scale.set(1, 1.3, 0.9);
    box(g, 0.57, 0.45, 0.5, "#d4d8cd", 0, 2.62, -0.07);
    box(g, 0.65, 0.6, 0.15, "#e2e3d3", 0, 2.05, -0.3);
  } else box(g, 0.19, 0.09, 0.03, "#eeead8", 0, 2.04, 0.26);
  box(g, 0.05, 0.24, 0.04, "#c9b77d", 0, 1.66, 0.32);
  box(g, 0.18, 0.04, 0.04, "#c9b77d", 0, 1.7, 0.32);
  return g;
}
