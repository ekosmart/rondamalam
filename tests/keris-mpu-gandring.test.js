import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { GameState } from "../src/state.js";
import { WEAPONS } from "../src/data.js";
import { makeKerisMpuGandring } from "../src/keris-mpu-gandring.js";

test("Gandring can be crafted, equipped and restored from a save", () => {
  const data = new Map();
  const storage = {
    getItem: (key) => data.get(key),
    setItem: (key, value) => data.set(key, value),
  };
  const state = new GameState(storage);
  const weapon = WEAPONS.find((w) => w.id === "keris-mpu-gandring");
  assert.ok(weapon);
  Object.assign(state.data, weapon.cost);
  assert.equal(state.craft(weapon.id), true);
  for (const key of Object.keys(weapon.cost)) assert.equal(state.data[key], 0);
  assert.equal(state.weapon.id, weapon.id);
  assert.equal(state.craft(weapon.id), false);
  state.save();
  const restored = new GameState(storage);
  assert.equal(restored.weapon.id, weapon.id);
  assert.ok(restored.data.weapons.includes(weapon.id));
});

test("Blender weapon is finite, low poly and has the grip between its ends", () => {
  const model = makeKerisMpuGandring();
  let triangles = 0;
  model.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const positions = mesh.geometry.getAttribute("position");
    assert.ok([...positions.array].every(Number.isFinite));
    triangles += positions.count / 3;
    assert.ok(mesh.geometry.getAttribute("normal"));
  });
  assert.equal(triangles, model.userData.triangles);
  assert.ok(triangles < 1500);
  const bounds = new THREE.Box3().setFromObject(model);
  assert.ok(bounds.min.y < 0 && bounds.max.y > 1.5);
  assert.ok(bounds.max.z - bounds.min.z < 0.2);
  const second = makeKerisMpuGandring();
  assert.notEqual(second, model);
  assert.equal(second.children[0].geometry, model.children[0].geometry);
});

test("portable GLB contains the same triangle count as the game mesh", () => {
  const glb = readFileSync(new URL("../public/models/weapons/keris-mpu-gandring.glb", import.meta.url));
  assert.equal(glb.toString("ascii", 0, 4), "glTF");
  assert.equal(glb.readUInt32LE(4), 2);
  const jsonLength = glb.readUInt32LE(12);
  const gltf = JSON.parse(glb.toString("utf8", 20, 20 + jsonLength));
  const triangles = gltf.meshes.flatMap((m) => m.primitives)
    .reduce((sum, primitive) => sum + gltf.accessors[primitive.indices].count / 3, 0);
  assert.equal(triangles, makeKerisMpuGandring().userData.triangles);
});
