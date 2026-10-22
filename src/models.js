import {magicWand} from "./magic/assets.js";
import * as THREE from "three";
import { makeButoIjo } from "./coast-models.js";
import { FOLKLORE_IDS, makeFolkloreGhost } from "./folklore-models.js";
import { ELEMENTS } from "./data.js";
import { makeKerisMpuGandring } from "./keris-mpu-gandring.js";

const materials = new Map();
export function material(color, options = {}) {
  const key = color + JSON.stringify(options);
  if (!materials.has(key))
    materials.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.9,
        flatShading: true,
        ...options,
      }),
    );
  return materials.get(key);
}
export function mesh(
  parent,
  geometry,
  color,
  x = 0,
  y = 0,
  z = 0,
  options = {},
) {
  const m = new THREE.Mesh(
    geometry,
    typeof color === "object" ? color : material(color, options),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const boxes = new Map();
export function box(p, w, h, d, color, x = 0, y = 0, z = 0, options) {
  const k = `${w},${h},${d}`;
  if (!boxes.has(k)) boxes.set(k, new THREE.BoxGeometry(w, h, d));
  return mesh(p, boxes.get(k), color, x, y, z, options);
}
export function cylinder(
  p,
  r1,
  r2,
  h,
  color,
  x = 0,
  y = 0,
  z = 0,
  sides = 8,
  options,
) {
  return mesh(
    p,
    new THREE.CylinderGeometry(r1, r2, h, sides),
    color,
    x,
    y,
    z,
    options,
  );
}
export function orb(p, r, color, x, y, z, detail = 1, options) {
  return mesh(
    p,
    new THREE.IcosahedronGeometry(r, detail),
    color,
    x,
    y,
    z,
    options,
  );
}
export function beam(p, a, b, radius, color, sides = 6) {
  const start = new THREE.Vector3(...a),
    end = new THREE.Vector3(...b),
    delta = end.clone().sub(start);
  const obj = cylinder(
    p,
    radius,
    radius,
    delta.length(),
    color,
    ...start.add(end).multiplyScalar(0.5).toArray(),
    sides,
  );
  obj.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    delta.normalize(),
  );
  return obj;
}
export function sign(
  parent,
  text,
  width = 5,
  height = 1,
  bg = "#2c3d34",
  fg = "#e1d5b4",
) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = Math.round((768 * height) / width);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 3;
  ctx.strokeRect(9, 9, canvas.width - 18, canvas.height - 18);
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.min(canvas.height * 0.38, canvas.width / (text.length * 0.66))}px Georgia`;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = mesh(
    parent,
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.8,
      side: THREE.DoubleSide,
    }),
  );
  return m;
}
export const glowTexture = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d"),
    g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.13, "rgba(255,255,255,.6)");
  g.addColorStop(0.5, "rgba(255,255,255,.09)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
export function glow(parent, color, size, x, y, z, opacity = 0.5) {
  const obj = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  obj.position.set(x, y, z);
  obj.scale.set(size, size, size);
  parent.add(obj);
  return obj;
}
export function makeWeapon(id) {
  if (id === "tongkat-sihir") return magicWand();
  if (id === "keris-mpu-gandring") return makeKerisMpuGandring();
  const g = new THREE.Group();
  cylinder(g, 0.09, 0.12, 0.65, "#544536", 0, 0.1, 0);
  if (id === "laras-surya") {
    box(g, 0.22, 0.3, 1.2, "#6c5139", 0, 0.45, 0.35);
    cylinder(g, 0.11, 0.11, 1.35, "#c0b078", 0, 0.55, 0.8, 8).rotation.x =
      Math.PI / 2;
    mesh(
      g,
      new THREE.TorusGeometry(0.27, 0.06, 6, 18),
      "#e4ca77",
      0,
      0.55,
      1.25,
    );
    orb(g, 0.16, "#ffe5a2", 0, 0.55, 1.5, 1, {
      emissive: "#ffc357",
      emissiveIntensity: 2,
    });
    box(g, 0.1, 0.22, 0.1, "#c9c3a0", 0, 0.8, 0.6);
  } else if (id === "kentongan") {
    cylinder(g, 0.18, 0.14, 1.2, "#b79253", 0, 0.72, 0);
    box(g, 0.045, 0.72, 0.035, "#403b2a", 0, 0.78, 0.173);
  } else if (id === "keris") {
    box(g, 0.62, 0.11, 0.14, "#dab879", 0, 0.34, 0);
    for (let i = 0; i < 8; i++) {
      const b = box(
        g,
        0.17 - i * 0.013,
        0.2,
        0.055,
        "#b8e3db",
        Math.sin(i * 1.8) * 0.07,
        0.5 + i * 0.16,
        0,
        { metalness: 0.8, emissive: "#2a7970", emissiveIntensity: 0.4 },
      );
      b.rotation.z = Math.sin(i * 1.8) * 0.3;
    }
  } else if (id === "obor") {
    cylinder(g, 0.16, 0.1, 0.8, "#754a2d", 0, 0.7, 0);
    const flame = orb(g, 0.3, "#ffb954", 0, 1.22, 0, 1, {
      emissive: "#ff6729",
      emissiveIntensity: 3,
    });
    flame.scale.y = 1.8;
    glow(g, "#ff9d41", 2.5, 0, 1.2, 0);
  } else if (id === "pecut") {
    for (let i = 0; i < 6; i++)
      beam(
        g,
        [0, 0.3, 0],
        [Math.sin(i) * 0.28, 1.65, Math.cos(i) * 0.22],
        0.025,
        "#baa66d",
      );
  } else if (id === "senter") {
    cylinder(g, 0.2, 0.1, 0.65, "#858872", 0, 0.6, 0);
    cylinder(g, 0.18, 0.2, 0.08, "#e5e6bd", 0, 0.97, 0, 12, {
      emissive: "#c0d596",
      emissiveIntensity: 1,
    });
  } else {
    cylinder(g, 0.045, 0.06, 2.4, "#657b6e", 0, 0.85, 0);
    mesh(g, new THREE.ConeGeometry(0.22, 0.8, 4), "#98e2db", 0, 2.34, 0, {
      metalness: 0.7,
      emissive: "#398f9c",
      emissiveIntensity: 0.5,
    });
  }
  return g;
}
export function makeHuman(color = "#71816b", hansip = false) {
  const g = new THREE.Group(),
    torso = new THREE.Group();
  g.add(torso);
  box(torso, 0.86, 1.05, 0.48, color, 0, 1.55, 0);
  box(torso, 0.92, 0.12, 0.54, "#343c34", 0, 1.13, 0);
  box(torso, 0.18, 0.13, 0.025, "#d9bb70", 0, 1.13, 0.29);
  const head = orb(torso, 0.32, "#bd9775", 0, 2.35, 0);
  head.scale.set(0.85, 1.08, 0.9);
  box(torso, 0.48, 0.13, 0.46, "#384b3d", 0, 2.64, 0);
  if (hansip) {
    box(torso, 0.53, 0.055, 0.32, "#34463a", 0, 2.6, 0.25);
    box(torso, 0.14, 0.16, 0.03, "#d6bc7c", 0, 2.68, 0.237);
    box(torso, 0.15, 0.21, 0.03, "#d8c89e", 0.24, 1.82, 0.25);
    box(torso, 0.26, 0.11, 0.03, "#cfcdc0", -0.23, 1.87, 0.25);
  }
  for (const x of [-0.12, 0.12])
    box(torso, 0.045, 0.04, 0.035, "#2c302a", x, 2.4, 0.285);
  const legs = [],
    arms = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.24, 1.08, 0);
    g.add(leg);
    box(leg, 0.32, 0.85, 0.36, hansip ? "#424e3f" : "#514d44", 0, -0.41, 0);
    box(leg, 0.36, 0.22, 0.57, "#282f2b", 0, -0.93, 0.08);
    legs.push(leg);
    const arm = new THREE.Group();
    arm.position.set(side * 0.56, 1.94, 0);
    torso.add(arm);
    box(arm, 0.27, 0.67, 0.3, color, 0, -0.28, 0);
    orb(arm, 0.145, "#bd9775", 0, -0.69, 0, 0);
    arms.push(arm);
  }
  const holder = new THREE.Group();
  holder.position.set(0, -0.68, 0.15);
  holder.rotation.x = 0.5;
  arms[0].add(holder);
  if (hansip) {
    const flash = cylinder(
      arms[1],
      0.11,
      0.08,
      0.46,
      "#293835",
      0,
      -0.62,
      0.17,
    );
    flash.rotation.x = Math.PI / 2;
    orb(arms[1], 0.09, "#fff0bc", 0, -0.62, 0.42, 1, {
      emissive: "#ffdfa3",
      emissiveIntensity: 2,
    });
  }
  g.userData = { torso, legs, arms, holder };
  return g;
}
export function animateHuman(g, time, moving, riding, swing = 0) {
  const { legs, arms, torso } = g.userData;
  for (let i = 0; i < 2; i++) {
    legs[i].rotation.x = riding
      ? -0.85 + Math.sin(time * 11 + i * Math.PI) * 0.3
      : moving
        ? Math.sin(time * 10 + i * Math.PI) * 0.55
        : 0;
    arms[i].rotation.x = riding
      ? -1.05
      : moving
        ? Math.sin(time * 10 + i * Math.PI + Math.PI) * 0.3
        : -0.2;
  }
  if (swing > 0) {
    arms[0].rotation.x = -1.2 + Math.sin(swing * Math.PI) * 2.5;
    arms[0].rotation.z = Math.sin(swing * Math.PI) * -0.8;
  } else arms[0].rotation.z = -0.06;
  torso.position.y = moving
    ? Math.abs(Math.sin(time * 10)) * 0.045
    : Math.sin(time * 2) * 0.018;
}
export function makeBicycle(id = "onthel", color = "#637e6c") {
  const g = new THREE.Group(),
    wheels = [];
  for (const z of [-0.98, 1.05]) {
    const wheel = new THREE.Group();
    wheel.position.set(0, 0.6, z);
    wheel.rotation.y = Math.PI / 2;
    g.add(wheel);
    mesh(
      wheel,
      new THREE.TorusGeometry(0.56, id === "motor" ? 0.12 : 0.065, 6, 20),
      "#262f2b",
    );
    mesh(wheel, new THREE.TorusGeometry(0.48, 0.02, 4, 20), "#a0a79a");
    for (let j = 0; j < 8; j++) {
      const a = (j / 8) * Math.PI;
      beam(
        wheel,
        [-Math.sin(a) * 0.49, -Math.cos(a) * 0.49, 0],
        [Math.sin(a) * 0.49, Math.cos(a) * 0.49, 0],
        0.009,
        "#a0a79a",
      );
    }
    wheels.push(wheel);
  }
  for (const [a, b] of [
    [
      [0, 0.6, -0.98],
      [0, 1.35, -0.36],
    ],
    [
      [0, 1.35, -0.36],
      [0, 0.55, 0.1],
    ],
    [
      [0, 0.55, 0.1],
      [0, 0.6, -0.98],
    ],
    [
      [0, 1.35, -0.36],
      [0, 1.4, 0.72],
    ],
    [
      [0, 1.4, 0.72],
      [0, 0.55, 0.1],
    ],
    [
      [0, 1.65, 0.73],
      [0, 0.6, 1.05],
    ],
  ])
    beam(g, a, b, 0.05, color);
  box(g, 0.38, 0.11, 0.55, "#3d3930", 0, 1.5, -0.38);
  beam(g, [-0.49, 1.75, 0.7], [0.49, 1.75, 0.7], 0.045, "#9a9e8a");
  if (id === "motor") {
    box(g, 0.65, 0.45, 1.2, color, 0, 1.1, -0.05);
    box(g, 0.55, 0.19, 0.9, "#363b36", 0, 1.46, -0.35);
    orb(g, 0.19, "#e8dfb2", 0, 1.5, 0.99, 1, {
      emissive: "#ffd887",
      emissiveIntensity: 1,
    });
  }
  g.userData.wheels = wheels;
  return g;
}
export function makeGhost(def, companion = false) {
  if (FOLKLORE_IDS.includes(def.id)) return makeFolkloreGhost(def, companion);
  if (def.id === "buto-ijo") return makeButoIjo(companion);
  const g = new THREE.Group(),
    body = new THREE.Group();
  g.add(body);
  const own = new THREE.MeshStandardMaterial({
    color: def.color,
    roughness: 0.88,
    flatShading: true,
    emissive: ELEMENTS[def.element],
    emissiveIntensity: companion ? 0.28 : 0.13,
  });
  const dark = "#273030",
    skin = "#b7baa7",
    kind = def.kind;
  if (kind === "flame") {
    const core = orb(body, 0.85, own, 0, 1.7, 0, 1);
    core.scale.y = 1.25;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2,
        f = mesh(
          body,
          new THREE.ConeGeometry(0.28, 1.6, 5),
          own,
          Math.sin(a) * 0.7,
          2.2 + Math.cos(a) * 0.25,
          Math.cos(a) * 0.7,
        );
      f.rotation.z = -Math.sin(a) * 0.4;
    }
    orb(body, 0.22, "#ffedb7", 0, 1.8, 0.75, 0, {
      emissive: "#ffd670",
      emissiveIntensity: 2,
    });
    glow(body, "#ff9e43", 5, 0, 1.7, 0, 0.42);
  } else if (kind === "coffin") {
    box(body, 1.6, 0.8, 2.8, own, 0, 1.5, 0);
    mesh(
      body,
      new THREE.CylinderGeometry(0.8, 0.8, 2.8, 3),
      own,
      0,
      2.04,
      0,
    ).rotation.x = Math.PI / 2;
    for (const x of [-1, 1])
      beam(body, [x, 1.2, -1.9], [x, 1.2, 1.9], 0.09, "#9b8860");
    sign(body, "لا إله إلا الله", 1.2, 0.3, "#377467", "#ddd0a0").position.set(
      0,
      1.7,
      1.41,
    );
  } else if (kind === "head") {
    orb(body, 0.55, own, 0, 2.7, 0);
    orb(body, 0.6, dark, 0, 2.87, -0.12);
    for (let i = 0; i < 6; i++)
      beam(
        body,
        [(i - 2.5) * 0.12, 2.3, 0],
        [Math.sin(i) * 0.3, 0.6 + Math.cos(i) * 0.25, 0.1],
        0.04,
        "#ae5658",
      );
  } else if (kind === "boar" || kind === "fox") {
    const b = orb(body, 1, own, 0, 0.9, 0);
    b.scale.set(0.7, 0.65, 1.25);
    orb(body, 0.52, own, 0, 1.12, 1.05);
    for (const s of [-1, 1]) {
      mesh(
        body,
        new THREE.ConeGeometry(0.17, 0.5, 4),
        own,
        s * 0.32,
        1.65,
        1.04,
      );
      for (const z of [-0.65, 0.65])
        cylinder(body, 0.12, 0.09, 0.6, dark, s * 0.45, 0.38, z);
    }
    if (kind === "fox")
      for (let i = 0; i < 5; i++) {
        const tail = mesh(
          body,
          new THREE.ConeGeometry(0.26, 1.75, 6),
          own,
          (i - 2) * 0.28,
          1.18,
          -1.17,
        );
        tail.rotation.x = -0.75;
        tail.rotation.z = (i - 2) * 0.25;
      }
  } else if (kind === "snake") {
    mesh(
      body,
      new THREE.TorusGeometry(0.95, 0.3, 7, 16),
      own,
      0,
      0.4,
      0,
    ).rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++)
      orb(
        body,
        0.31,
        own,
        Math.sin(i * 0.5) * 0.4,
        0.65 + i * 0.3,
        0.35 + i * 0.05,
        0,
      );
    orb(body, 0.48, own, 0.3, 2.5, 0.5);
    mesh(
      body,
      new THREE.ConeGeometry(0.16, 0.4, 3),
      "#d4d7b6",
      0.3,
      2.44,
      1,
    ).rotation.x = Math.PI / 2;
  } else {
    const female = kind === "woman",
      giant = ["beast", "antler", "tall"].includes(kind),
      child = kind === "child",
      tall = kind === "tall",
      mage = kind === "mage",
      shroud = kind === "shroud";
    const h = tall ? 4.2 : giant ? 2.7 : child ? 1.2 : 2.1;
    cylinder(
      body,
      female ? 0.32 : giant ? 0.7 : 0.4,
      female ? 0.8 : giant ? 0.48 : 0.35,
      h,
      own,
      0,
      h / 2 + 0.3,
      0,
      female ? 9 : 7,
    );
    orb(body, giant ? 0.51 : child ? 0.4 : 0.38, skin, 0, h + 0.53, 0.04, 1);
    if (female) {
      orb(body, 0.47, dark, 0, h + 0.63, -0.1);
      box(body, 0.8, 1.48, 0.45, dark, 0, h - 0.1, -0.23);
      box(body, 0.37, 0.3, 0.07, skin, 0, h + 0.41, 0.38);
    }
    if (shroud) {
      orb(body, 0.45, own, 0, h + 0.49, 0);
      orb(body, 0.31, dark, 0, h + 0.5, 0.29);
      orb(body, 0.22, own, 0, h + 1, 0, 0);
      cylinder(body, 0.1, 0.17, 0.36, own, 0, 0.14, 0);
    }
    if (kind === "mummy")
      for (let i = 0; i < 9; i++)
        cylinder(body, 0.418, 0.418, 0.06, "#777963", 0, 0.43 + i * 0.22, 0);
    if (kind === "vampire" || mage) {
      const cape = mesh(
        body,
        new THREE.ConeGeometry(1.1, 2.9, 5),
        own,
        0,
        1.7,
        -0.27,
      );
      cape.scale.z = 0.45;
    }
    for (const side of [-1, 1]) {
      if (!shroud) {
        const arm = box(
          body,
          giant ? 0.3 : 0.19,
          h * 0.65,
          0.23,
          own,
          side * (giant ? 0.84 : 0.52),
          h * 0.65 + 0.28,
          0,
        );
        arm.rotation.z = side * (female ? 0.2 : 0.1);
        if (kind === "jiangshi") {
          arm.rotation.x = Math.PI / 2;
          arm.position.set(side * 0.55, h, 0.6);
        }
      }
      if (!female && !shroud && !mage)
        cylinder(
          body,
          giant ? 0.24 : 0.14,
          giant ? 0.2 : 0.1,
          0.72,
          own,
          side * 0.25,
          0.4,
          0,
        );
      if (kind === "antler") {
        beam(
          body,
          [side * 0.22, h + 0.88, 0],
          [side * 0.85, h + 2, -0.1],
          0.1,
          "#b7af91",
        );
        for (let j = 0; j < 3; j++)
          beam(
            body,
            [side * (0.4 + j * 0.12), h + 1.15 + j * 0.25, 0],
            [side * (0.8 + j * 0.12), h + 1.25 + j * 0.36, 0.1],
            0.05,
            "#b7af91",
          );
      }
    }
    if (kind === "jiangshi") {
      cylinder(body, 0.48, 0.48, 0.23, "#343e61", 0, h + 0.86, 0);
      box(body, 0.15, 0.65, 0.03, "#d9bd6f", 0, h + 0.5, 0.43);
    }
    if (kind === "doll") {
      beam(body, [-0.9, 1.8, 0], [0.9, 1.8, 0], 0.05, "#9c8053");
      cylinder(body, 0.21, 0.29, 0.3, "#bba878", 0, h + 0.5, 0);
    }
    if (kind === "mask") {
      for (const s of [-1, 1]) {
        mesh(
          body,
          new THREE.ConeGeometry(0.25, 1, 4),
          "#d3b788",
          s * 0.5,
          h + 1.15,
          0,
        ).rotation.z = s * -0.4;
        orb(body, 0.19, "#eee9c7", s * 0.21, h + 0.6, 0.39);
      }
    }
    if (mage) {
      mesh(body, new THREE.ConeGeometry(0.7, 0.7, 6), "#394957", 0, h + 1, 0);
      beam(body, [0.8, 0.1, 0], [0.8, 3.6, 0], 0.06, "#788587");
      orb(body, 0.22, "#a8ddd4", 0.8, 3.7, 0, 1, {
        emissive: "#66caca",
        emissiveIntensity: 3,
      });
    }
  }
  const eyeHeight =
    kind === "coffin"
      ? 1.7
      : kind === "head"
        ? 2.72
        : kind === "boar" || kind === "fox"
          ? 1.25
          : kind === "snake"
            ? 2.6
            : kind === "tall"
              ? 4.77
              : kind === "beast" || kind === "antler"
                ? 3.25
                : kind === "child"
                  ? 1.74
                  : 2.66;
  for (const s of [-1, 1])
    orb(
      body,
      0.055,
      "#efe4ad",
      s * 0.13,
      eyeHeight,
      kind === "boar" || kind === "fox" ? 1.5 : kind === "snake" ? 0.88 : 0.37,
      1,
      { emissive: companion ? "#8ceab1" : "#efc97c", emissiveIntensity: 3 },
    );
  const aura = glow(g, ELEMENTS[def.element], 3.6, 0, 1.1, 0, 0.18);
  g.userData = { body, own, aura, baseScale: 1 };
  return g;
}
