import * as THREE from "three";
import asset from "./assets/keris-mpu-gandring.json" with { type: "json" };

// Exact triangulated Blender mesh, already converted from Z-up to Y-up.
// Shared immutable geometry/materials keep repeated equipment swaps inexpensive.
let parts;
export function makeKerisMpuGandring() {
  parts ??= asset.batches.map((batch) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(batch.positions, 3),
    );
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      name: batch.name,
      color: new THREE.Color(...batch.color),
      metalness: batch.metalness,
      roughness: batch.roughness,
      flatShading: true,
    });
    return { geometry, material };
  });
  const group = new THREE.Group();
  group.name = asset.name;
  group.userData.weaponId = asset.weaponId;
  group.userData.triangles = asset.triangles;
  // Match the game's stylized weapon scale; the origin stays inside the grip.
  group.scale.setScalar(2.6);
  for (const { geometry, material } of parts) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
