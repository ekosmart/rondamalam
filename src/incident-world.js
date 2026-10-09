import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { box, cylinder, mesh, sign, orb, glow, beam } from "./models.js";
import { makeSaucer } from "./incident-models.js";
import { LAB, ET_CAMP, LAB_SAMPLES, ET_PARTS } from "./incident-data.js";
export function buildIncidentWorld(w) {
  const factory = new THREE.Group();
  factory.position.set(LAB.x, 0, LAB.z);
  w.scene.add(factory);
  box(factory, 34, 8, 25, "#879e9b", 0, 4, 0);
  box(factory, 35, 0.45, 26, "#485e65", 0, 8.25, 0);
  box(factory, 8, 5, 0.3, "#354a50", 0, 2.5, 12.65);
  // Segmented umbrella insignia and a beacon make the new lab readable from the road.
  for (let i = 0; i < 8; i++) {
    const canopy = mesh(
      factory,
      new THREE.CircleGeometry(2, 1, (i * Math.PI) / 4, Math.PI / 4),
      i % 2 ? "#e4e6d9" : "#a95847",
      0,
      11.2,
      10,
    );
    canopy.material.side = THREE.DoubleSide;
  }
  cylinder(factory, 0.12, 0.12, 2.3, "#d1d9cc", 0, 9, 10, 8);
  for (const x of [-12, -7, 7, 12]) {
    box(factory, 3.3, 2.4, 0.2, "#83b9b5", x, 5, 12.7, {
      emissive: "#447e79",
      emissiveIntensity: 0.4,
    });
    box(factory, 3.3, 0.14, 0.3, "#d3e0ce", x, 5, 12.9);
  }
  sign(
    factory,
    "PABRIK PAYUNG KORP",
    29,
    1.8,
    "#223f45",
    "#e4e5d2",
  ).position.set(0, 7.1, 12.85);
  sign(factory, "RISET ANTIVIRUS · AKSES TERBATAS", 17, 0.75).position.set(
    0,
    1,
    13,
  );
  for (const x of [-12, 12]) {
    cylinder(factory, 1.6, 1.8, 6, "#667e83", x, 11, -5, 12);
    cylinder(factory, 2, 2, 0.35, "#c0cabe", x, 14, -5, 12);
  }
  for (let i = 0; i < 3; i++) {
    cylinder(factory, 0.65, 0.7, 2, "#577e6b", -9 + i * 2.2, 1, 15.5, 10);
    orb(factory, 0.18, "#aff089", -9 + i * 2.2, 1.8, 16.2, 0, {
      emissive: "#91dd62",
      emissiveIntensity: 1,
    });
  }
  const labCollider = { x: LAB.x, z: LAB.z, w: 17.4, d: 12.9, h: 15 };
  w.colliders.push(labCollider);
  w.flightObstacles.push({ ...labCollider, w: 19, d: 15, h: 17 });
  w.buildingFootprints.push({
    id: "laboratory", group: factory,
    x: LAB.x,
    z: LAB.z,
    w: 35,
    d: 26,
  });
  const construction = new THREE.Group();
  w.scene.add(construction);
  box(construction, 35, 0.2, 27, "#70877b", LAB.x, 0.1, LAB.z);
  sign(construction, "SEGERA HADIR · PABRIK PAYUNG KORP", 24, 1.5).position.set(
    LAB.x,
    3,
    LAB.z + 15,
  );
  const camp = new THREE.Group();
  camp.position.set(ET_CAMP.x, 0, ET_CAMP.z);
  w.scene.add(camp);
  const wreck = makeSaucer(false, true);
  wreck.rotation.z = 0.45;
  wreck.rotation.x = 0.25;
  wreck.position.set(4, 0.8, -7);
  camp.add(wreck);
  const beacon = new THREE.Group();
  camp.add(beacon);
  beacon.position.set(-6, 0, -1);
  cylinder(beacon, 0.55, 0.9, 2.5, "#687f91", 0, 1.25, 0, 8);
  const crystal = mesh(
    beacon,
    new THREE.OctahedronGeometry(0.65),
    "#a6dfe8",
    0,
    3.1,
    0,
    { emissive: "#5ed4db", emissiveIntensity: 1.2 },
  );
  glow(beacon, "#a9e0db", 5, 0, 3, 0, 0.35);
  sign(camp, "ISYARAT DARI BINTANG", 5, 0.6).position.set(-10, 1.3, 1);
  const pickups = [];
  for (const item of [...LAB_SAMPLES, ...ET_PARTS]) {
    const g = new THREE.Group();
    g.position.set(item.x, 0, item.z);
    w.scene.add(g);
    if (item.id.startsWith("lab")) {
      cylinder(g, 0.24, 0.24, 0.8, "#c4e4c9", 0, 0.7, 0, 8);
      box(g, 0.6, 0.15, 0.6, "#6c8880", 0, 1.15, 0);
    } else
      mesh(g, new THREE.OctahedronGeometry(0.5), "#a7c7e8", 0, 1.1, 0, {
        emissive: "#588aa9",
        emissiveIntensity: 0.6,
      });
    glow(
      g,
      item.id.startsWith("lab") ? "#b5e987" : "#a4d6ec",
      2.2,
      0,
      1,
      0,
      0.5,
    );
    pickups.push({ ...item, group: g });
  }
  w.incidentWorld = {
    factory,
    construction,
    camp,
    wreck,
    beacon,
    crystal,
    pickups,
    labCollider,
  };
  // Each house is merged separately so destruction can hide one building without touching its neighbours.
  for (const house of w.houses) {
    house.group.removeFromParent();
    w.scene.add(house.group);
    house.group.updateMatrixWorld(true);
    const buckets = new Map(),
      remove = [];
    const inverse = new THREE.Matrix4().copy(house.group.matrixWorld).invert();
    house.group.traverse((o) => {
      if (!o.isMesh || o.material.map || o.material.transparent) return;
      let geo = o.geometry.clone();
      geo.applyMatrix4(
        new THREE.Matrix4().multiplyMatrices(inverse, o.matrixWorld),
      );
      if (geo.index) geo = geo.toNonIndexed();
      geo.deleteAttribute("uv");
      geo.deleteAttribute("normal");
      geo.computeVertexNormals();
      const k = o.material.uuid;
      if (!buckets.has(k)) buckets.set(k, { mat: o.material, geos: [] });
      buckets.get(k).geos.push(geo);
      remove.push(o);
    });
    for (const { mat, geos } of buckets.values()) {
      const m = new THREE.Mesh(mergeGeometries(geos), mat);
      m.castShadow = m.receiveShadow = true;
      house.group.add(m);
      geos.forEach((g) => g.dispose());
    }
    remove.forEach((o) => o.removeFromParent());
    const rubble = new THREE.Group();
    rubble.position.set(house.x, 0, house.z);
    w.scene.add(rubble);
    for (let i = 0; i < 16; i++) {
      const b = box(
        rubble,
        1.2 + (i % 3),
        0.6 + (i % 2) * 0.5,
        1.1,
        "#666855",
        Math.sin(i * 2.3) * house.w * 0.38,
        0.3,
        Math.cos(i * 2.3) * house.d * 0.38,
      );
      b.rotation.z = Math.sin(i) * 0.35;
    }
    rubble.visible = false;
    house.rubble = rubble;
  }
}
