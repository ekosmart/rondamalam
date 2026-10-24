import { stationClearing } from "./magic/rules.js";
import { spiritLandingClearing } from "./spirit-rules.js";
import { PlantationWorld } from "./plantation-world.js";
import { plantationClearing } from "./plantation-data.js";
import { WorldDamage } from "./world-damage.js";
import { buildCoastWorld } from "./coast-world.js";
import { WORLD_BOUNDS, coastLand } from "./coast-rules.js";
import { coastGroundHeight } from "./coast-layout.js";
import { buildFrontierWorld, frontierClearing } from "./frontier-world.js";
import { LivingWater } from "./living-water.js";
import { buildRuralWorld } from "./rural-world.js";
import { ROADS, onRoad, rectanglesOverlap, POST_POOL } from "./layout.js";
import { buildExpansionWorld } from "./expansion-world.js";
import { buildIncidentWorld } from "./incident-world.js";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  box,
  cylinder,
  orb,
  beam,
  mesh,
  material,
  sign,
  glow,
  glowTexture,
} from "./models.js";
import { POSTS, WORLD_SIZE, SAFE_RADIUS, ZONES } from "./data.js";

let seed = 42011;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const range = (a, b) => a + rand() * (b - a);
export class World {
  constructor(scene) {
    this.scene = scene;
    this.static = new THREE.Group();
    scene.add(this.static);
    this.colliders = [];
    this.houses = [];
    this.trees = [];
    this.flightObstacles = [];
    this.sceneryHills = [];
    this.buildingFootprints = [];
    this.ricePlots = [];
    this.lamps = [];
    this.postObjects = [];
    this.pickups = [];
    this.portals = [];
    this.water = [];
    this.animated = [];
    this.buildGround();
    this.buildVillage();
    buildExpansionWorld(this);
    buildRuralWorld(this);
    buildIncidentWorld(this);
    buildFrontierWorld(this);
    this.coast = buildCoastWorld(this);
    this.vegetation = new PlantationWorld(this);
    this.buildNature();
    this.livingWater = new LivingWater(this);
    this.buildDetails();
    this.buildSky();
    this.damage = new WorldDamage(this);
    this.batchStatic();
    this.lightPool = Array.from({ length: 5 }, () => {
      const l = new THREE.PointLight("#ffc680", 35, 28, 1.65);
      scene.add(l);
      return l;
    });
    this.buildAmbient();
  }
  building(x, z, w = 10, d = 8, type = "house", color = "#949785") {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    this.static.add(g);
    const h = type === "hall" ? 6 : type === "school" ? 4.4 : 4;
    box(g, w + 0.8, 0.4, d + 0.8, "#767968", 0, 0.2, 0);
    box(g, w, h, d, color, 0, h / 2 + 0.4, 0);
    box(g, w, 0.22, d + 0.2, "#68715f", 0, 1.1, 0);
    box(g, 1.6, 2.8, 0.12, "#494b38", 0, 1.8, d / 2 + 0.06);
    box(g, 0.06, 0.1, 0.08, "#c3aa75", 0.52, 1.65, d / 2 + 0.15);
    for (const xx of [-w * 0.31, w * 0.31]) {
      box(g, 1.7, 1.9, 0.17, "#354f48", xx, 2.7, d / 2 + 0.12);
      box(g, 1.35, 1.5, 0.2, "#d3b879", xx, 2.7, d / 2 + 0.2, {
        emissive: "#d6a75d",
        emissiveIntensity: 0.52,
      });
      box(g, 0.07, 1.52, 0.23, "#596553", xx, 2.7, d / 2 + 0.3);
      box(g, 1.4, 0.07, 0.23, "#596553", xx, 2.7, d / 2 + 0.3);
      for (const side of [-1, 1])
        box(
          g,
          0.35,
          1.94,
          0.15,
          "#586752",
          xx + side * 1.01,
          2.7,
          d / 2 + 0.13,
        );
    }
    this.roof(g, w + 2, d + 2, h + 0.4, Math.max(2, w * 0.25));
    if (!["house", "player-home", "dino-park", "space-z"].includes(type)) {
      const labels = {
        hall: "BALAI DESA SUKARAME",
        kopdes: "KOPDES MERAH PUTIH",
        school: "SEKOLAH RAKYAT",
        pesantren: "PESANTREN NURUL FAJAR",
        dukun: "PADEPOKAN UJUNG ALAS",
        kitchen: "DAPUR MBG",
        farm: "LUMBUNG PAK MULYONO",
      };
      const s = sign(g, labels[type] || "WARUNG", w * 0.78, 0.95);
      s.position.set(0, h - 0.35, d / 2 + 0.2);
    }
    this.colliders.push({ x, z, w: w / 2 + 0.25, d: d / 2 + 0.25, h: h + 3 });
    this.buildingFootprints.push({ id: type, x, z, w: w + 1, d: d + 1, group: g });
    this.flightObstacles.push({
      x,
      z,
      w: w / 2 + 2,
      d: d / 2 + 2,
      h: h + Math.max(2, w * 0.25) + 1,
    });
    if (type === "house")
      this.houses.push({
        id: `house-${x}-${z}`,
        x,
        z,
        w,
        d,
        group: g,
        collider: this.colliders.at(-1),
        flight: this.flightObstacles.at(-1),
      });
    if (type === "hall" || type === "school")
      for (const side of [-1, 1]) {
        cylinder(
          g,
          0.17,
          0.2,
          h,
          "#a5a892",
          side * (w / 2 - 0.4),
          h / 2 + 0.4,
          d / 2 + 2,
        );
        this.colliders.push({
          x: x + side * (w / 2 - 0.4),
          z: z + d / 2 + 2,
          w: 0.3,
          d: 0.3,
        });
      }
    return g;
  }
  roof(g, w, d, y, h) {
    const geo = new THREE.BufferGeometry();
    const v = [
      -w / 2,
      0,
      -d / 2,
      w / 2,
      0,
      -d / 2,
      0,
      h,
      -d / 2,
      -w / 2,
      0,
      d / 2,
      0,
      h,
      d / 2,
      w / 2,
      0,
      d / 2,
      -w / 2,
      0,
      -d / 2,
      0,
      h,
      -d / 2,
      0,
      h,
      d / 2,
      -w / 2,
      0,
      -d / 2,
      0,
      h,
      d / 2,
      -w / 2,
      0,
      d / 2,
      w / 2,
      0,
      -d / 2,
      w / 2,
      0,
      d / 2,
      0,
      h,
      d / 2,
      w / 2,
      0,
      -d / 2,
      0,
      h,
      d / 2,
      0,
      h,
      -d / 2,
    ];
    for (let i = 0; i < v.length; i += 9)
      for (let j = 0; j < 3; j++) {
        const t = v[i + 3 + j];
        v[i + 3 + j] = v[i + 6 + j];
        v[i + 6 + j] = t;
      }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    geo.computeVertexNormals();
    mesh(g, geo, "#86614c", 0, y, 0);
    for (const side of [-1, 1]) {
      beam(g, [(side * w) / 2, y, -d / 2], [0, y + h, -d / 2], 0.11, "#a78059");
      beam(g, [(side * w) / 2, y, d / 2], [0, y + h, d / 2], 0.11, "#a78059");
      for (let i = 1; i < 8; i++) {
        const t = i / 8;
        beam(
          g,
          [side * w * 0.5 * (1 - t), y + h * t, -d / 2],
          [side * w * 0.5 * (1 - t), y + h * t, d / 2],
          0.045,
          "#805d47",
        );
      }
    }
    for (let zz = -d / 2 + 0.45; zz < d / 2; zz += 0.7)
      for (const side of [-1, 1])
        beam(
          g,
          [(side * w) / 2, y + 0.025, zz],
          [0, y + h + 0.025, zz],
          0.028,
          "#a78059",
        );
    beam(
      g,
      [0, y + h, -d / 2 - 0.15],
      [0, y + h, d / 2 + 0.15],
      0.17,
      "#987653",
    );
  }
  lamp(x, z, height = 6) {
    if (onRoad(x, z, 0.3)) return;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    this.static.add(g);
    cylinder(g, 0.11, 0.17, height, "#645e4c", 0, height / 2, 0);
    beam(g, [0, height, 0], [0.95, height, -0.1], 0.07, "#575d4d");
    box(g, 0.55, 0.55, 0.5, "#414e3e", 0.85, height - 0.23, 0);
    box(g, 0.4, 0.33, 0.36, "#e7c58a", 0.85, height - 0.23, 0.04, {
      emissive: "#ffc174",
      emissiveIntensity: 2,
    });
    const halo = glow(
      this.scene,
      "#ffc987",
      5.5,
      x + 0.85,
      height - 0.25,
      z,
      0.38,
    );
    this.lamps.push({ x: x + 0.85, z, y: height - 0.25, halo });
    const pool = mesh(
      this.static,
      new THREE.CircleGeometry(4.6, 24),
      new THREE.MeshBasicMaterial({
        color: "#e9b974",
        transparent: true,
        opacity: 0.075,
        depthWrite: false,
      }),
      x,
      0.025,
      z,
    );
    pool.rotation.x = -Math.PI / 2;
  }
  tree(x, z, size = 1, palm = false) {
    if (spiritLandingClearing(x, z, 5 * size)) return;
    if (frontierClearing(x, z) || stationClearing(x, z) || plantationClearing(x, z)) return;
    if (Math.abs(x + 126) < 46 && Math.abs(z - 182) < 45) return;
    if (
      (Math.abs(x - 235) < 31 && Math.abs(z + 232) < 33) ||
      (Math.abs(x - 260) < 28 && Math.abs(z - 218) < 36)
    )
      return;
    if (
      onRoad(x, z, 1.4) ||
      this.colliders.some(
        (c) => Math.abs(x - c.x) < c.w + 1 && Math.abs(z - c.z) < c.d + 1,
      )
    )
      return;
    this.flightObstacles.push({ x, z, w: 5 * size, d: 5 * size, h: 13 * size });
    const g = new THREE.Group();
    this.trees.push({ x, z, size, palm, h: 13 * size, group: g });
    g.position.set(x, 0, z);
    g.scale.setScalar(size);
    this.static.add(g);
    cylinder(g, 0.25, 0.65, palm ? 10 : 7, "#5c6250", 0, palm ? 5 : 3.5, 0, 7);
    if (palm) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        beam(
          g,
          [0, 9.5, 0],
          [Math.sin(a) * 3.2, 10.2, Math.cos(a) * 3.2],
          0.08,
          "#667452",
        );
        const leaf = orb(
          g,
          2.3,
          i % 2 ? "#56755e" : "#607d61",
          Math.sin(a) * 3.2,
          9.7,
          Math.cos(a) * 3.2,
          0,
        );
        leaf.scale.set(0.45, 0.15, 1.5);
        leaf.rotation.y = a;
        leaf.rotation.z = 0.18;
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const yy = range(6, 9);
        beam(
          g,
          [0, 4, 0],
          [Math.sin(a) * 2.2, yy, Math.cos(a) * 2.2],
          0.19,
          "#5c6250",
        );
        const leaf = orb(
          g,
          range(2.7, 3.7),
          ["#4b6856", "#59705b", "#3f6055"][i % 3],
          Math.sin(a) * 2,
          yy,
          Math.cos(a) * 2,
          1,
        );
        leaf.scale.y = 0.75;
      }
    }
    this.colliders.push({ x, z, w: 0.55 * size, d: 0.55 * size });
  }
  fence(x, z, length, axis = "x") {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    if (axis === "z") g.rotation.y = Math.PI / 2;
    this.static.add(g);
    for (let i = 0; i <= length; i += 2) {
      box(g, 0.13, 1.4, 0.13, "#7a7960", i - length / 2, 0.7, 0);
    }
    for (const y of [0.5, 1.05]) box(g, length, 0.13, 0.1, "#8e896b", 0, y, 0);
  }
  buildGround() {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#657260";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 6000; i++) {
      ctx.fillStyle =
        rand() > 0.5 ? "rgba(178,178,124,.055)" : "rgba(20,38,30,.065)";
      ctx.fillRect(rand() * 256, rand() * 256, range(1, 4), range(1, 4));
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(55, 55);
    tex.colorSpace = THREE.SRGBColorSpace;
    const ground = mesh(
      this.static,
      new THREE.PlaneGeometry(900, 900),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.roads = ROADS;
    for (const r of this.roads) {
      box(this.static, r.w, 0.035, r.d, "#8d8870", r.x, 0.017, r.z);
      box(
        this.static,
        Math.max(1, r.w - 0.5),
        0.04,
        Math.max(1, r.d - 0.5),
        "#999179",
        r.x,
        0.02,
        r.z,
      );
    }
    // River banks and water, crossed by three usable bridges.
    box(this.static, 25, 0.16, 630, "#777f6b", 155, 0.02, 0);
    const water = mesh(
      this.scene,
      new THREE.PlaneGeometry(20, 630, 10, 70),
      new THREE.MeshStandardMaterial({
        color: "#497d7a",
        metalness: 0.38,
        roughness: 0.25,
        transparent: true,
        opacity: 0.9,
      }),
      155,
      0.13,
      0,
    );
    water.rotation.x = -Math.PI / 2;
    this.water.push(water);
    for (const z of [-130, 30, 143]) {
      box(this.static, 29, 0.32, 7, "#897b60", 155, 0.4, z);
      for (const zz of [-3.5, 3.5]) {
        for (let x = 142; x <= 169; x += 3)
          cylinder(this.static, 0.11, 0.13, 1.6, "#776e55", x, 1.15, z + zz);
        beam(
          this.static,
          [141, 1.8, z + zz],
          [170, 1.8, z + zz],
          0.09,
          "#b2a07a",
        );
      }
      for (let x = 142; x < 169; x += 0.65)
        box(this.static, 0.07, 0.03, 6.9, "#5f6050", x, 0.575, z);
    }
    // Terraced rice fields.
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3; col++) {
        const x = -148 + col * 22,
          z = -77 - row * 17;
        const rice = new THREE.Group(); this.static.add(rice);
        this.ricePlots.push({ x, z, w: 20, d: 14, group: rice });
        box(rice, 20, 0.1, 14, "#3d6550", x, 0.07, z);
        box(rice, 20, 0.07, 14, "#5d8270", x, 0.14, z);
        for (let xx = -8; xx < 9; xx += 2)
          for (let zz = -6; zz < 7; zz += 2) {
            const a = mesh(
              rice,
              new THREE.ConeGeometry(0.27, 0.8, 3),
              "#90a66d",
              x + xx,
              0.48,
              z + zz,
            );
            a.rotation.z = 0.13;
          }
      }
    for (let i = 0; i < 15; i++) {
      const a = (i / 15) * Math.PI * 2;
      const hill = orb(
        this.static,
        range(50, 100),
        i % 2 ? "#465f55" : "#354e4d",
        Math.sin(a) * 410,
        range(7, 20),
        Math.cos(a) * 410,
        1,
      );
      hill.scale.y = range(0.65, 1.35);
      // The old southern backdrop is now playable coast. Keep its full volume
      // beyond the new shore and the player's camera, not inside the harbor.
      const radius = hill.geometry.parameters.radius;
      if (hill.position.x + radius > -100 && hill.position.x - radius < WORLD_BOUNDS.maxX + 50 &&
          hill.position.z + radius > 250 && hill.position.z - radius < WORLD_BOUNDS.maxZ + 50)
        hill.position.z = WORLD_BOUNDS.maxZ + radius + 80;
      this.sceneryHills.push({x: hill.position.x, z: hill.position.z, radius});
    }
  }
  buildVillage() {
    // Open-sided pos ronda.
    const g = new THREE.Group();
    g.position.set(-12, 0, -3);
    this.static.add(g);
    box(g, 11, 0.5, 8, "#888977", 0, 0.25, 0);
    box(g, 10, 0.28, 7, "#7c6b4f", 0, 0.64, 0);
    for (const x of [-4.5, 4.5])
      for (const z of [-3, 3])
        cylinder(g, 0.16, 0.2, 4.5, "#806d4e", x, 2.8, z);
    this.roof(g, 12, 9, 5.1, 2.45);
    box(g, 9, 2.6, 0.2, "#6a7056", 0, 2, -3);
    for (const x of [-4.5, 4.5]) {
      box(g, 0.2, 0.15, 6, "#a28e62", x, 1.8, 0);
      box(g, 0.7, 0.24, 5.8, "#a08d64", x, 1.05, 0);
    }
    const s = sign(g, "POS RONDA", 6.5, 1.1, "#34463b", "#e4d4a3");
    s.position.set(0, 4.45, 3.2);
    const s2 = sign(g, "RT 04 / RW 02  •  SUKARAME", 4.7, 0.55);
    s2.position.set(0, 3.05, -2.86);
    box(g, 2.4, 0.16, 1.3, "#8f7951", 1, 1.2, 0);
    for (const x of [0.1, 1.9]) box(g, 0.15, 1.1, 1, "#796548", x, 0.65, 0);
    cylinder(g, 0.1, 0.09, 0.23, "#e0d2aa", 1, 1.43, 0.2, 10);
    cylinder(g, 0.24, 0.22, 1.2, "#c09558", 3.7, 3.5, 2.8);
    box(g, 0.06, 0.75, 0.03, "#3c4332", 3.7, 3.5, 3.03);
    this.colliders.push({ x: -12, z: -6, w: 4.7, d: 0.3 });
    this.lamp(-7, -1, 4.3);
    this.lamp(6, 7, 6.2);
    // Safe boundary uses a subtle in-world ring.
    const safe = mesh(
      this.scene,
      new THREE.RingGeometry(SAFE_RADIUS - 0.12, SAFE_RADIUS, 96),
      new THREE.MeshBasicMaterial({
        color: "#91bca0",
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      0,
      0.06,
      0,
    );
    safe.rotation.x = -Math.PI / 2;
    this.safeRing = safe;
    for (const [x, z, w, d, c] of [
      [-22, -33, 11, 9, "#92947b"],
      [19, -36, 12, 10, "#acaa8c"],
      [-23, -62, 13, 10, "#849383"],
      [22, -79, 11, 9, "#b2ab8c"],
      [-24, -99, 10, 9, "#a69e7f"],
      [22, -109, 13, 9, "#8b9986"],
      [-38, 31, 10, 8, "#a8a187"],
      [38, 68, 10, 9, "#939b84"],
      [23, 70, 12, 8, "#a2a48b"],
    ]) {
      this.building(x, z, w, d, "house", c);
      this.fence(x, z + d / 2 + 4, w + 3);
      this.tree(x - 9, z - 3, 0.7);
    }
    this.building(75, -77, 22, 14, "hall", "#aeb199");
    this.building(74, -26, 18, 11, "kopdes", "#a2a68b");
    this.building(96, 65, 20, 13, "kitchen", "#b1ad94");
    this.building(-89, 73, 30, 13, "school", "#b3b392");
    // Indonesian flag in the civic courtyard.
    cylinder(this.static, 0.055, 0.08, 11, "#c7c7b5", 68, 5.5, -58);
    box(this.static, 2.8, 0.9, 0.045, "#be554b", 69.4, 10, -58);
    box(this.static, 2.8, 0.9, 0.045, "#d8d4bd", 69.4, 9.1, -58);
    for (let i = 0; i < 7; i++) {
      const x = -134 + (i % 4) * 10,
        z = -18 - Math.floor(i / 4) * 15;
      const stall = new THREE.Group();
      stall.position.set(x, 0, z);
      this.static.add(stall);
      for (const xx of [-3, 3])
        for (const zz of [-2.5, 2.5])
          cylinder(stall, 0.08, 0.1, 3, "#847457", xx, 1.5, zz);
      const awning = box(
        stall,
        7,
        0.15,
        6,
        ["#928364", "#6d8875", "#9c7460"][i % 3],
        0,
        3.2,
        0,
      );
      awning.rotation.x = 0.12;
      box(stall, 5.8, 1.15, 1.5, "#806a4c", 0, 0.57, 1);
      this.colliders.push({ x, z: z + 1, w: 3, d: 0.85 });
      for (let j = 0; j < 8; j++)
        orb(
          stall,
          0.2,
          ["#a7a560", "#bd9254", "#7c9363"][j % 3],
          -2 + j * 0.56,
          1.31,
          1,
          0,
        );
      if (i % 2 === 0) this.lamp(x + 3, z, 3.5);
    }
    // Tarkam pitch, goals and benches.
    box(this.static, 70, 0.05, 88, "#677d5c", -18, 0.03, 143);
    const white = "#b8bba0";
    for (const x of [-51, 15])
      box(this.static, 0.13, 0.035, 84, white, x, 0.07, 143);
    for (const z of [101, 143, 185])
      box(this.static, 66, 0.035, 0.13, white, -18, 0.07, z);
    const circle = mesh(
      this.static,
      new THREE.RingGeometry(9, 9.15, 40),
      white,
      -18,
      0.075,
      143,
    );
    circle.rotation.x = -Math.PI / 2;
    for (const z of [102, 184]) {
      for (const x of [-23, -13])
        cylinder(this.static, 0.08, 0.1, 3, white, x, 1.5, z);
      beam(this.static, [-23, 3, z], [-13, 3, z], 0.09, white);
      for (let i = 0; i <= 10; i++)
        beam(
          this.static,
          [-23 + i, 3, z],
          [-23 + i, 0.1, z + (z < 143 ? -2 : 2)],
          0.013,
          "#a6afa1",
        );
    }
    // Graveyard gate and individually arranged graves.
    for (const x of [-78, -67])
      box(this.static, 1.2, 4.3, 1.2, "#777e72", x, 2.15, -198);
    sign(this.static, "PEMAKAMAN UMUM", 10, 1).position.set(-72.5, 4.35, -198);
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 6; col++) {
        const x = -138 + col * 11,
          z = -203 - row * 9;
        box(this.static, 2.1, 0.22, 4, "#7b8670", x, 0.15, z);
        const grave = box(
          this.static,
          0.74,
          1.2,
          0.25,
          "#a9ac98",
          x,
          0.68,
          z - 1.5,
        );
        grave.rotation.z = range(-0.12, 0.12);
        orb(this.static, 0.36, "#a9ac98", x, 1.28, z - 1.5, 0).scale.z = 0.4;
        if (rand() > 0.6) orb(this.static, 0.2, "#baa481", x, 0.35, z, 0);
      }
    this.fence(-112, -195, 49);
    this.fence(-149, -222, 53, "z");
    for (const p of POST_POOL) {
      this.lamp(p.x, p.z, 8);
      const pole = new THREE.Group();
      pole.position.set(p.x, 0, p.z);
      this.scene.add(pole);
      cylinder(pole, 0.2, 0.25, 7.6, "#8c9183", 0, 3.8, 0);
      box(pole, 2, 0.13, 0.15, "#777c6d", 0, 7.4, 0);
      box(pole, 0.5, 0.8, 0.25, "#586454", 0, 1.5, 0.25);
      const marker = glow(pole, "#e9c986", 3, 0, 3, 0, 0.65);
      this.postObjects.push({ def: p, group: pole, marker });
      this.colliders.push({ x: p.x, z: p.z, w: 0.35, d: 0.35 });
    }
    // Sagging overhead cables along the main village street.
    for (let z = -113; z < 13; z += 28) {
      this.lamp(7, z, 7.8);
      if (z < 0) {
        const points = [];
        for (let j = 0; j <= 12; j++) {
          const t = j / 12;
          points.push(
            new THREE.Vector3(
              7,
              7.8 - Math.sin(t * Math.PI) * 0.65,
              z + t * 28,
            ),
          );
        }
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({ color: "#3a4b43" }),
        );
        this.static.add(line);
      }
    }
    const welcome = sign(
      this.static,
      "KAMPUNG SUKARAME",
      10,
      1.1,
      "#344d3f",
      "#cfc6a0",
    );
    welcome.position.set(0, 7.2, -25);
    for (const x of [-5.5, 5.5])
      cylinder(this.static, 0.15, 0.23, 7.7, "#63735a", x, 3.85, -25);
  }
  buildNature() {
    for (let i = 0; i < 160; i++) {
      const x = range(-285, 285),
        z = range(-285, 285);
      if (
        Math.hypot(x, z) < 30 ||
        Math.abs(x - 155) < 19 ||
        this.roads.some(
          (r) =>
            Math.abs(x - r.x) < r.w / 2 + 5 && Math.abs(z - r.z) < r.d / 2 + 5,
        ) ||
        this.colliders.some(
          (c) => Math.abs(x - c.x) < c.w + 6 && Math.abs(z - c.z) < c.d + 6,
        ) ||
        ZONES.some(
          (a) =>
            [
              "Lapangan Tarkam",
              "Sawah Wetan",
              "Pasar Sore",
              "Pemakaman Umum",
            ].includes(a.name) && Math.hypot(x - a.x, z - a.z) < a.r,
        )
      )
        continue;
      this.tree(x, z, range(0.8, 1.7));
    }
    // Hand placed trees frame the starting scene.
    for (const [x, z, s] of [
      [-26, 8, 1.4],
      [25, -10, 1.35],
      [-40, -43, 1.3],
      [40, -55, 1.6],
      [-26, 48, 1],
      [42, 22, 1.3],
    ])
      this.tree(x, z, s);
    // Detailed palm and bamboo groves are owned by PlantationWorld so their
    // wind shaders, instances and weather damage remain synchronized.
    // Banyan and sacred spring.
    const bx = 213,
      bz = -154;
    const banyan = new THREE.Group(); this.static.add(banyan);
    cylinder(banyan, 2, 3.9, 17, "#626858", bx, 8.5, bz, 10);
    this.trees.push({ x: bx, z: bz, h: 24, banyan: true, group: banyan });
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      const xx = bx + Math.sin(a) * range(9, 17),
        zz = bz + Math.cos(a) * range(9, 17);
      beam(
        banyan,
        [bx, 8, bz],
        [xx, range(15, 19), zz],
        range(0.5, 1),
        "#697060",
      );
      const leaves = orb(
        banyan,
        range(7, 10),
        "#435f51",
        xx,
        range(18, 23),
        zz,
        1,
      );
      leaves.scale.y = 0.6;
      for (let k = 0; k < 3; k++)
        beam(
          banyan,
          [xx + k * 0.6, 16, zz],
          [xx + k * 0.6 + range(-1, 1), 0.2, zz],
          range(0.03, 0.11),
          "#737666",
        );
      beam(
        banyan,
        [bx, 2, bz],
        [bx + Math.sin(a) * 6, 0.1, bz + Math.cos(a) * 6],
        0.65,
        "#67705d",
      );
    }
    this.colliders.push({ x: bx, z: bz, w: 3.5, d: 3.5 });
    const spring = mesh(
      this.scene,
      new THREE.CircleGeometry(10, 40),
      new THREE.MeshStandardMaterial({
        color: "#62b9b0",
        metalness: 0.4,
        roughness: 0.19,
        emissive: "#215d59",
        emissiveIntensity: 0.35,
      }),
      209,
      0.15,
      -136,
    );
    spring.rotation.x = -Math.PI / 2;
    this.water.push(spring);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      orb(
        this.static,
        range(0.6, 1.1),
        "#829086",
        209 + Math.sin(a) * 10,
        0.32,
        -136 + Math.cos(a) * 10,
        0,
      );
    }
    this.shrine = new THREE.Group();
    this.shrine.position.set(211, 0, -123);
    this.scene.add(this.shrine);
    box(this.shrine, 2, 0.65, 2, "#858a72", 0, 0.35, 0);
    const crystal = mesh(
      this.shrine,
      new THREE.OctahedronGeometry(0.65),
      "#a8d9cb",
      0,
      1.55,
      0,
      { emissive: "#65d1bb", emissiveIntensity: 1 },
    );
    this.animated.push(crystal);
    glow(this.shrine, "#8de1c6", 5, 0, 1.5, 0);
  }
  buildDetails() {
    // Grass clusters are instanced, with no per-blade draw calls.
    const geo = new THREE.BufferGeometry(),
      v = [];
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      v.push(
        -Math.cos(a) * 0.22,
        0,
        -Math.sin(a) * 0.22,
        Math.cos(a) * 0.22,
        0,
        Math.sin(a) * 0.22,
        0.12 * Math.cos(a),
        0.8 + i * 0.09,
        0.12 * Math.sin(a),
      );
    }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    geo.computeVertexNormals();
    const mat = material("#82966c", { side: THREE.DoubleSide });
    const grass = new THREE.InstancedMesh(geo, mat, 14000);
    const dummy = new THREE.Object3D();
    let count = 0;
    for (let i = 0; i < 27000 && count < 14000; i++) {
      const extent = i < 12000 ? 145 : 280,
        x = range(-extent, extent),
        z = range(-extent, extent);
      if (
        stationClearing(x, z) ||
        Math.abs(x - 155) < 15 ||
        this.roads.some(
          (r) =>
            Math.abs(x - r.x) < r.w / 2 + 0.7 &&
            Math.abs(z - r.z) < r.d / 2 + 0.7,
        ) ||
        this.colliders.some(
          (c) => Math.abs(x - c.x) < c.w + 0.5 && Math.abs(z - c.z) < c.d + 0.5,
        ) ||
        (x > -54 && x < 18 && z > 98 && z < 188) ||
        (x > 55 && x < 140 && z > -196 && z < -157) ||
        (x > -145 && x < -94 && z > -40 && z < 10)
      )
        continue;
      dummy.position.set(x, 0.02, z);
      dummy.scale.set(range(0.5, 1.5), range(0.35, 1.1), range(0.5, 1.5));
      dummy.rotation.y = rand() * 6.28;
      dummy.updateMatrix();
      grass.setMatrixAt(count++, dummy.matrix);
    }
    grass.count = count;
    grass.receiveShadow = true;
    this.scene.add(grass);
    for (let i = 0; i < 68; i++) {
      let x = range(-250, 250),
        z = range(-250, 250);
      if (i < 12) {
        x = range(-25, 25);
        z = range(-100, -28);
      }
      if (
        Math.abs(x - 155) < 16 ||
        this.colliders.some(
          (c) => Math.abs(x - c.x) < c.w + 2 && Math.abs(z - c.z) < c.d + 2,
        )
      )
        continue;
      const type = ["herb", "glass", "iron"][i % 3],
        g = new THREE.Group();
      g.position.set(x, 0, z);
      this.scene.add(g);
      if (type === "herb") {
        for (let j = 0; j < 3; j++) {
          const leaf = orb(
            g,
            0.34,
            "#b2bd7d",
            Math.sin(j * 2) * 0.2,
            0.35 + j * 0.08,
            Math.cos(j * 2) * 0.2,
            0,
          );
          leaf.scale.set(0.6, 1.5, 0.4);
        }
      } else if (type === "glass")
        cylinder(g, 0.13, 0.2, 0.6, "#93c8ae", 0, 0.3, 0, 6, {
          transparent: true,
          opacity: 0.7,
          metalness: 0.3,
        });
      else orb(g, 0.38, "#90978b", 0, 0.25, 0, 0);
      glow(g, type === "herb" ? "#bcd997" : "#a3d6c6", 1.9, 0, 0.5, 0, 0.27);
      this.pickups.push({ type, x, z, group: g, cooldown: 0 });
    }
    for (const [x, z] of [
      [215, -219],
      [244, -38],
      [-247, -39],
      [242, 130],
      [125, 191],
    ]) {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      this.scene.add(g);
      const ring = mesh(
        g,
        new THREE.TorusGeometry(2.4, 0.12, 8, 48),
        new THREE.MeshBasicMaterial({
          color: "#bd9ddf",
          transparent: true,
          opacity: 0.65,
        }),
        0,
        2.8,
        0,
      );
      glow(g, "#a592d3", 9, 0, 2.8, 0, 0.23);
      this.portals.push({ group: g, ring });
    }
    // Roadside stone markers, planks, pots and flowering bushes.
    for (let i = 0; i < 55; i++) {
      const x = range(-55, 55),
        z = range(-118, 55);
      if (
        this.roads.some(
          (r) =>
            Math.abs(x - r.x) < r.w / 2 + 2 && Math.abs(z - r.z) < r.d / 2 + 2,
        ) ||
        this.colliders.some(
          (c) => Math.abs(x - c.x) < c.w + 1 && Math.abs(z - c.z) < c.d + 1,
        )
      )
        continue;
      const rock = orb(this.static, range(0.3, 0.8), "#8d9380", x, 0.2, z, 0);
      rock.scale.y = 0.55;
    }
    for (const [x, z] of [
      [-16, 3],
      [-2, -8],
      [14, -33],
      [-18, -53],
      [64, -7],
    ]) {
      cylinder(this.static, 0.45, 0.3, 0.8, "#a47c5d", x, 0.4, z);
      for (let j = 0; j < 4; j++) {
        const leaf = orb(
          this.static,
          0.5,
          "#92a17a",
          x + Math.sin(j) * 0.25,
          1.1,
          z + Math.cos(j) * 0.25,
          0,
        );
        leaf.scale.y = 1.4;
      }
    }
  }
  batchStatic() {
    this.static.updateMatrixWorld(true);
    const buckets = new Map(),
      remove = [];
    this.static.traverse((o) => {
      if (
        !o.isMesh ||
        Array.isArray(o.material) ||
        o.material.map ||
        o.material.transparent
      )
        return;
      const p = new THREE.Vector3();
      o.getWorldPosition(p);
      const key = `${Math.floor(p.x / 70)},${Math.floor(p.z / 70)},${o.material.uuid}`;
      if (!buckets.has(key))
        buckets.set(key, { material: o.material, geometries: [], owners: [] });
      let g = o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      if (g.index) g = g.toNonIndexed();
      g.deleteAttribute("uv");
      g.deleteAttribute("normal");
      g.computeVertexNormals();
      buckets.get(key).geometries.push(g);
      buckets.get(key).owners.push(o.userData.damageOwner);
      remove.push(o);
    });
    for (const { material: mat, geometries, owners } of buckets.values()) {
      const merged = mergeGeometries(geometries, false);
      if (!merged) continue;
      let offset = 0;
      geometries.forEach((geo, i) => { const count = geo.attributes.position.count; this.damage.addSpan(owners[i], merged, offset, count); offset += count; });
      merged.computeBoundingSphere();
      const m = new THREE.Mesh(merged, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
      for (const g of geometries) g.dispose();
    }
    remove.forEach((o) => o.removeFromParent());
  }
  buildSky() {
    this.scene.background = new THREE.Color("#1c3335");
    this.scene.fog = new THREE.FogExp2("#294242", 0.008);
    this.hemisphere = new THREE.HemisphereLight("#b2d5d4", "#525b3d", 1.6);
    this.scene.add(this.hemisphere);
    this.sun = new THREE.DirectionalLight("#d9e8cc", 2.2);
    this.sun.position.set(-70, 100, -100);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, {
      left: -65,
      right: 65,
      top: 65,
      bottom: -65,
      near: 1,
      far: 250,
    });
    this.sun.shadow.bias = -0.001;
    this.sun.shadow.normalBias = 0.08;
    this.scene.add(this.sun, this.sun.target);
    this.moon = mesh(
      this.scene,
      new THREE.SphereGeometry(6.7, 24, 16),
      new THREE.MeshBasicMaterial({ color: "#e4e0b8", fog: false }),
      32,
      65,
      -240,
    );
    glow(this.moon, "#b9d8c1", 52, 0, 0, 0, 0.15);
    const positions = [];
    for (let i = 0; i < 700; i++) {
      const a = rand() * Math.PI * 2,
        y = range(90, 300),
        r = 400;
      positions.push(Math.sin(a) * r, y, Math.cos(a) * r);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    this.stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: "#d1dccb",
        size: 0.7,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true,
        fog: false,
      }),
    );
    this.scene.add(this.stars);
  }
  buildAmbient() {
    const positions = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      positions[i * 3] = range(-90, 90);
      positions[i * 3 + 1] = range(0.5, 10);
      positions[i * 3 + 2] = range(-90, 90);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.fireflies = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        map: glowTexture,
        color: "#e4d59b",
        size: 0.32,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.scene.add(this.fireflies);
    this.mist = [];
    for (let i = 0; i < 24; i++) {
      const m = glow(
        this.scene,
        "#95b7b0",
        30,
        range(-150, 150),
        range(0.8, 2.5),
        range(-200, 100),
        0.055,
      );
      m.scale.set(range(25, 50), range(3, 7), 1);
      m.userData.baseX = m.position.x;
      this.mist.push(m);
    }
  }
  flightClearance(x, z) {
    return this.flightObstacles.reduce(
      (h, c) =>
        Math.abs(x - c.x) < c.w + 5 && Math.abs(z - c.z) < c.d + 5
          ? Math.max(h, c.h + 5)
          : h,
      10,
    );
  }
  nearestLanding(x, z) {
    for (let r = 0; r < 40; r += 2)
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2,
          p = { x: x + Math.sin(a) * r, z: z + Math.cos(a) * r };
        if (this.canMove(p.x, p.z, 1)) return p;
      }
    return { x: 0, z: 12 };
  }
  canMove(x, z, r = 0.55) {
    if (x < WORLD_BOUNDS.minX + 2 || x > WORLD_BOUNDS.maxX - 2 ||
        z < WORLD_BOUNDS.minZ + 2 || z > WORLD_BOUNDS.maxZ - 2)
      return false;
    if (z > 285 && !coastLand(x, z, r)) return false;
    if (
      z <= 285 && x > 143 &&
      x < 167 &&
      ![-130, 30, 143].some((b) => Math.abs(z - b) < 2.7)
    )
      return false;
    return !this.colliders.some(
      (c) =>
        !c.disabled &&
        Math.abs(x - c.x) < c.w + r &&
        Math.abs(z - c.z) < c.d + r,
    );
  }
  groundHeight(x, z) {
    return coastGroundHeight(x, z);
  }
  zone(x, z) {
    return (
      ZONES.find((a) => Math.hypot(x - a.x, z - a.z) < a.r) || {
        name: "Jalan Antardusun",
        sub: "Tetap di jalan. Tetap berjaga.",
      }
    );
  }
  update(dt, t, state, player) {
    this.vegetation.update(dt, t, state.data.weather?.type);
    const h = state.data.time / 60,
      day = Math.max(0, Math.min(1, Math.min((h - 5) / 2, (19 - h) / 2)));
    const color = new THREE.Color("#1d353b").lerp(
      new THREE.Color("#abc2b3"),
      day,
    );
    this.scene.background.copy(color);
    this.scene.fog.color.copy(color);
    this.scene.fog.density = 0.0078 - day * 0.0035;
    this.hemisphere.intensity = 0.82 + day * 1.8;
    this.sun.intensity = 0.72 + day * 2.3;
    this.sun.color.set(day > 0.4 ? "#ffe5b2" : "#abcfd4");
    this.sun.position.set(player.x - 55, 95, player.z - 65);
    this.sun.target.position.set(player.x, 0, player.z);
    this.moon.visible = day < 0.7;
    this.stars.material.opacity = (1 - day) * 0.65;
    this.fireflies.material.opacity = (1 - day) * 0.8;
    this.fireflies.position.set(
      Math.round(player.x / 70) * 70,
      0,
      Math.round(player.z / 70) * 70,
    );
    const arr = this.fireflies.geometry.attributes.position.array;
    for (let i = 0; i < 180; i++)
      arr[i * 3 + 1] += Math.sin(t * 0.8 + i) * dt * 0.15;
    this.fireflies.geometry.attributes.position.needsUpdate = true;
    const nearest = [...this.lamps]
      .sort(
        (a, b) =>
          Math.hypot(a.x - player.x, a.z - player.z) -
          Math.hypot(b.x - player.x, b.z - player.z),
      )
      .slice(0, 5);
    this.lightPool.forEach((l, i) => {
      const p = nearest[i];
      if (p) {
        l.position.set(p.x, p.y, p.z);
        l.intensity = (1 - day * 0.9) * (42 + Math.sin(t * 5 + i) * 1.8);
      }
    });
    this.lamps.forEach(
      (l) => (l.halo.material.opacity = (1 - day * 0.9) * 0.34),
    );
    this.postObjects.forEach((p) => {
      const active = state.patrolPosts.some((post) => post.id === p.def.id);
      p.marker.visible = active;
      const done = state.data.posts.includes(p.def.id);
      p.marker.material.color.set(done ? "#83cda6" : "#e9c986");
      p.marker.material.opacity = done ? 0.25 : 0.55 + Math.sin(t * 2) * 0.15;
    });
    this.portals.forEach((p) => {
      p.group.visible = state.isNight && state.isKliwon;
      p.ring.rotation.z = t * 0.25;
      p.ring.scale.setScalar(1 + Math.sin(t) * 0.04);
    });
    this.animated.forEach((m) => {
      m.rotation.y = t * 0.6;
      m.position.y = 1.55 + Math.sin(t * 1.8) * 0.15;
    });
    this.mist.forEach((m, i) => {
      m.position.x = m.userData.baseX + Math.sin(t * 0.045 + i) * 12;
      m.material.opacity = (1 - day * 0.7) * 0.055;
    });
    this.livingWater.update(t, day);
    for (const p of this.pickups)
      if (p.cooldown > 0) {
        p.cooldown -= dt;
        if (p.cooldown <= 0) p.group.visible = true;
      }
  }
}
