import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { onRoad } from "./layout.js";
import { sign, box } from "./models.js";
import { CROPS } from "./frontier-data.js";
import {
  PLANT_ASSETS,
  BAMBOO_GROVE,
  BANANA_GROVE,
  VILLAGE_BANANAS,
} from "./plantation-data.js";
import { applyWindSway, windTime, windWeather } from "./plantation-wind.js";

const profiles = {
  bambu_rumpun: { height: 12, strength: 0.035, speed: 1 },
  gandum_rumpun: { height: 1.4, strength: 0.12, speed: 2 },
  jagung_dewasa: { height: 2.8, strength: 0.08 },
  jagung_mati: { height: 2.1, strength: 0.035 },
  pisang_pohon_berbuah: { height: 5.5, strength: 0.055, speed: 1.2 },
  pisang_anakan: { height: 1.9, strength: 0.08 },
  pisang_daun_kering: { height: 1.1, strength: 0.035 },
  sawit_pohon: { height: 12, strength: 0.025, speed: 0.85 },
  sawit_tbs: { height: 0.9 },
  sawit_pelepah_tumpuk: { height: 0.8 },
  jerami_gulungan: { height: 1.7 },
  orang_orangan_sawah: { height: 3 },
};
const variation = (x, z) =>
  (Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;

export class PlantationWorld {
  constructor(w) {
    this.w = w;
    this.root = new THREE.Group();
    this.root.name = "Perkebunan Sukarame";
    w.scene.add(this.root);
    this.placements = [];
    this.entries = [];
    this.villageSites = [];
    this.orchardSites = [];
    this.canopyHomes = [];
    this.batches = [];
    this.ready = false;
    this.plan();
    this.loading = this.load().catch((error) => {
      this.error = error.message;
      console.error("Aset perkebunan gagal dimuat:", error);
    });
  }

  clear(x, z, margin) {
    return (
      !onRoad(x, z, margin) &&
      this.w.canMove(x, z, margin) &&
      !this.w.buildingFootprints.some(
        (b) =>
          Math.abs(x - b.x) < b.w / 2 + margin &&
          Math.abs(z - b.z) < b.d / 2 + margin,
      )
    );
  }

  place(id, x, z, extra = {}) {
    const p = { id, x, z, scale: 1, yaw: variation(x, z) * Math.PI, ...extra };
    this.placements.push(p);
    return p;
  }

  tree(id, x, z, extra = {}) {
    const p = this.place(id, x, z, extra),
      h = profiles[id].height * p.scale;
    const group = new THREE.Group();
    this.root.add(group);
    // These remain visible if a local asset cannot be loaded.
    group.position.set(x, 0, z);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.4, h * 0.65, 5),
      new THREE.MeshStandardMaterial({ color: 0x66613c }),
    );
    trunk.position.y = h * 0.325;
    group.add(trunk);
    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(2, h * 0.4, 5),
      new THREE.MeshStandardMaterial({ color: 0x557347 }),
    );
    leaves.position.y = h * 0.8;
    group.add(leaves);
    const entry = {
      x,
      z,
      h,
      group,
      plantation: true,
      bamboo: id === "bambu_rumpun",
      palm: id === "sawit_pohon",
      banana: id === "pisang_pohon_berbuah",
    };
    p.entry = entry;
    this.entries.push(entry);
    this.w.trees.push(entry);
    const r = entry.bamboo ? 0.8 : 0.5;
    this.w.colliders.push({ x, z, w: r, d: r, h: h * 0.7 });
    this.w.flightObstacles.push({
      x,
      z,
      w: entry.palm ? 5 : 2.5,
      d: entry.palm ? 5 : 2.5,
      h,
    });
    return p;
  }

  sign(text, x, z, width = 15) {
    sign(this.root, text, width, 1).position.set(x, 3.8, z);
    for (const dx of [-width / 2 + 0.4, width / 2 - 0.4])
      box(this.root, 0.15, 3.8, 0.15, "#796747", x + dx, 1.9, z);
  }

  ghostSite(tree, radius = 11) {
    for (const [dx, dz] of [
      [3.5, 0],
      [-3.5, 0],
      [0, 3.5],
      [0, -3.5],
    ]) {
      const home = {
        x: tree.x + dx,
        z: tree.z + dz,
        radius,
        tree: { x: tree.x, z: tree.z },
      };
      if (this.w.canMove(home.x, home.z, 1)) return home;
    }
    return null;
  }

  plan() {
    for (let z = 47; z <= 137; z += 18)
      for (let x = -244; x <= -174; x += 14) {
        if (!this.clear(x, z, 6)) continue;
        this.tree("sawit_pohon", x, z, { scale: 1 + variation(x, z) * 0.12 });
        if ((x + 244) % 28 === 0) {
          this.place("sawit_tbs", x + 1.6, z + 1.8);
          this.place("sawit_pelepah_tumpuk", x - 3, z + 3, { scale: 0.8 });
        }
      }
    for (let i = 0; i < 8; i++)
      this.place(
        "sawit_tbs",
        -191 + (i % 4) * 0.85,
        81 + Math.floor(i / 4) * 0.9,
      );
    this.sign("KEBUN SAWIT · JALUR PANEN", -219, 41, 19);
    const b = BAMBOO_GROVE;
    for (let z = b.z0 + 5; z < b.z1; z += 10)
      for (let x = b.x0 + 5; x < b.x1; x += 10) {
        const px = x + variation(x, z) * 1.5,
          pz = z + variation(z, x) * 1.5;
        // A north-south walking path connects the road to the deeper grove.
        if (Math.abs(px + 250) < 3.8 || !this.clear(px, pz, 3.5)) continue;
        this.tree("bambu_rumpun", px, pz, {
          scale: 1 + variation(px, pz) * 0.14,
        });
      }
    for (const z of [-165, -108, -48])
      this.canopyHomes.push({ x: -250, z, radius: 23, canopy: true });
    this.sign("HUTAN BAMBU · SARANG KUNTILANAK", -249, -139, 24);
    const p = BANANA_GROVE;
    for (let z = p.z - p.d / 2 + 4; z < p.z + p.d / 2; z += 9)
      for (let x = p.x - p.w / 2 + 4; x < p.x + p.w / 2; x += 9) {
        if (Math.abs(x - p.x) < 3.5 || !this.clear(x, z, 3.3)) continue;
        const tree = this.tree("pisang_pohon_berbuah", x, z, {
          scale: 1 + variation(x, z) * 0.12,
        });
        this.place("pisang_anakan", x + 1.8, z + 1.4, { scale: 0.7 });
        this.place("pisang_daun_kering", x - 1.7, z + 1.5, { yaw: 1.2 });
        const site = this.ghostSite(tree);
        if (
          site &&
          this.orchardSites.length < 3 &&
          this.orchardSites.every(
            (s) => Math.hypot(s.x - site.x, s.z - site.z) > 18,
          )
        )
          this.orchardSites.push(site);
      }
    this.sign("KEBUN PISANG · WASPADA POCONG", -123, 103, 23);
    for (const point of VILLAGE_BANANAS) {
      let tree;
      for (const [dx, dz] of [
        [0, 0],
        [4, 0],
        [-4, 0],
        [0, 4],
        [0, -4],
        [7, 7],
        [-7, -7],
      ]) {
        if (this.clear(point.x + dx, point.z + dz, 3.4)) {
          tree = this.tree("pisang_pohon_berbuah", point.x + dx, point.z + dz);
          break;
        }
      }
      if (tree) {
        const site = this.ghostSite(tree, 9);
        if (site) this.villageSites.push(site);
      }
    }
    for (const def of CROPS) {
      const corn = def.id === "corn",
        step = corn ? 1.9 : 3.2;
      for (let z = def.z - def.d / 2 + 2; z < def.z + def.d / 2 - 1; z += step)
        for (
          let x = def.x - def.w / 2 + 2;
          x < def.x + def.w / 2 - 1;
          x += step
        ) {
          if (Math.abs(x - def.x) < 1.8 || Math.abs(z - def.z) < 1.5) continue;
          this.place(corn ? "jagung_dewasa" : "gandum_rumpun", x, z, {
            field: def.id,
            scale: 1 + variation(x, z) * 0.12,
            spread: corn ? 1 : 1.7,
          });
        }
      this.place("orang_orangan_sawah", def.x - 6, def.z - 5);
      for (let i = 0; i < 3; i++)
        this.place(
          corn ? "jagung_mati" : "jerami_gulungan",
          def.x + def.w / 2 - 3 - i * 2,
          def.z + def.d / 2 - 2,
        );
    }
  }

  async load() {
    const loader = new GLTFLoader();
    this.assets = new Map(
      await Promise.all(
        PLANT_ASSETS.map(async (id) => {
          const gltf = await loader.loadAsync(`/models/plantation/${id}.glb`);
          gltf.scene.updateMatrixWorld(true);
          const geometries = [];
          let material;
          gltf.scene.traverse((o) => {
            if (o.isMesh) {
              material ??= o.material;
              const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
              geometries.push(g.index ? g.toNonIndexed() : g);
            }
          });
          const geometry = mergeGeometries(geometries);
          if (!geometry) throw new Error(`Geometri tidak dapat digabung: ${id}`);
          geometry.computeBoundingBox();
          const bounds = geometry.boundingBox,
            height = bounds.max.y - bounds.min.y,
            scale = profiles[id].height / height;
          geometry.translate(0, -bounds.min.y, 0);
          geometry.scale(scale, scale, scale);
          geometries.forEach((g) => g.dispose());
          return [id, { geometry, material }];
        }),
      ),
    );
    // Small spatial batches allow the renderer to cull distant groves/fields.
    const buckets = new Map();
    for (const p of this.placements) {
      const key = `${p.id}:${p.field || ""}:${Math.floor(p.x / 32)}:${Math.floor(p.z / 32)}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(p);
    }
    const fieldMeshes = new Map();
    for (const points of buckets.values()) {
      const m = this.batch(points[0].id, points);
      if (points[0].field) {
        const id = points[0].field;
        if (!fieldMeshes.has(id)) fieldMeshes.set(id, []);
        const dead = id === "corn" ? this.batch("jagung_mati", points) : null;
        if (dead) dead.visible = false;
        fieldMeshes
          .get(id)
          .push({ m, dead, original: m.instanceMatrix.array.slice() });
      }
    }
    for (const f of this.w.frontier.fields) {
      f.assetMeshes = fieldMeshes.get(f.def.id) || [];
      f.setVisualRuined = (ruined) => {
        for (const { m, dead, original } of f.assetMeshes) {
          if (dead) {
            m.visible = !ruined;
            dead.visible = ruined;
          } else {
            const a = m.instanceMatrix.array;
            a.set(original);
            if (ruined)
              for (let i = 0; i < a.length; i += 16)
                for (const k of [1, 5, 9, 13]) a[i + k] *= 0.055;
            m.instanceMatrix.needsUpdate = true;
          }
        }
      };
      f.setVisualRuined(!!f.ruined);
      for (const m of [f.stem, f.heads, f.leaves]) m.visible = false;
    }
    for (const e of this.entries) {
      e.group.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          o.material.dispose();
        }
      });
      e.group.clear();
      e.setVisualRuined?.(!!e.ruined);
    }
    this.ready = true;
  }

  batch(id, points) {
    const source = this.assets.get(id),
      profile = profiles[id];
    const mat = profile.strength
      ? applyWindSway(source.material, profile)
      : source.material;
    const m = new THREE.InstancedMesh(source.geometry, mat, points.length);
    m.name = id;
    m.userData.plantAsset = id;
    m.castShadow = id !== "gandum_rumpun" && !id.startsWith("jagung");
    m.receiveShadow = true;
    if (profile.strength)
      m.customDepthMaterial = applyWindSway(
        new THREE.MeshDepthMaterial({
          depthPacking: THREE.RGBADepthPacking,
          side: THREE.DoubleSide,
        }),
        profile,
      );
    const dummy = new THREE.Object3D();
    points.forEach((p, i) => {
      dummy.position.set(p.x, 0.08, p.z);
      dummy.rotation.set(0, p.yaw, 0);
      dummy.scale.set(
        p.scale * (p.spread || 1),
        p.scale,
        p.scale * (p.spread || 1),
      );
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      if (p.entry) {
        const original = dummy.matrix.clone();
        p.entry.setVisualRuined = (ruined) => {
          const matrix = original.clone();
          if (ruined) for (const k of [1, 5, 9]) matrix.elements[k] *= 0.045;
          m.setMatrixAt(i, matrix);
          m.instanceMatrix.needsUpdate = true;
        };
      }
    });
    m.computeBoundingSphere();
    m.boundingSphere.radius += 4;
    this.root.add(m);
    this.batches.push(m);
    return m;
  }

  update(dt, t, weather) {
    windTime.value = t;
    const target = ["tornado", "storm", "blizzard", "thunder"].includes(weather)
      ? 1.8
      : weather === "rain"
        ? 1.25
        : 1;
    windWeather.value = THREE.MathUtils.damp(windWeather.value, target, 2, dt);
  }
}
