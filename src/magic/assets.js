import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
export const ASSETS = [
  "candle",
  "carriage",
  "castle",
  "curse_bolt",
  "frog",
  "owl",
  "Penyihir",
  "platform_sign",
  "potion",
  "scarecrow",
  "school_gate",
  "spellbook",
  "ticket_booth",
  "trolley",
  "wand",
];
const cache = new Map();
let loading;
export function loadMagicAssets() {
  return (loading ??= Promise.all(
    ASSETS.map(async (id) => {
      const gltf = await new GLTFLoader().loadAsync(`/models/magic/${id}.glb`);
      // Static supplied models: merge by material to keep draw calls practical on phones.
      gltf.scene.updateMatrixWorld(true);
      const buckets = new Map(),
        root = new THREE.Group();
      gltf.scene.traverse((m) => {
        if (m.isMesh) {
          const geo = m.geometry.clone().applyMatrix4(m.matrixWorld);
          const g = geo.index ? geo.toNonIndexed() : geo;
          if (!buckets.has(m.material)) buckets.set(m.material, []);
          buckets.get(m.material).push(g);
        }
      });
      for (const [mat, geos] of buckets) {
        const merged = mergeGeometries(geos);
        if (!merged) throw Error(`Cannot batch ${id}`);
        const mesh = new THREE.Mesh(merged, mat);
        mesh.castShadow = mesh.receiveShadow = true;
        root.add(mesh);
        geos.forEach((g) => g.dispose());
      }
      root.name = id;
      cache.set(id, root);
    }),
  ));
}
export function asset(id, height = 1) {
  if (!cache.has(id)) throw Error(`Asset not ready: ${id}`);
  const source = cache.get(id).clone(true),
    group = new THREE.Group();
  const bounds = new THREE.Box3().setFromObject(source),
    size = bounds.getSize(new THREE.Vector3()),
    center = bounds.getCenter(new THREE.Vector3());
  source.position.set(-center.x, -bounds.min.y, -center.z);
  group.add(source);
  group.scale.setScalar(height / Math.max(0.001, size.y));
  group.name = id;
  return group;
}
export function magicWand() {
  const group = new THREE.Group();
  loadMagicAssets()
    .then(() => {
      const wand = asset("wand", 1.5);
      wand.rotation.z = -0.3;
      group.add(wand);
    })
    .catch(() => {});
  return group;
}
