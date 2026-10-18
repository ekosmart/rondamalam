import * as THREE from "three";
import palace from "./assets/spirit-realm/keraton-samudra-sunyi.json" with { type: "json" };
import gate from "./assets/spirit-realm/gerbang-sukma.json" with { type: "json" };
import boss from "./assets/spirit-realm/penjaga-palung.json" with { type: "json" };
const assets = { palace, gate, boss },
  cache = new Map();
export function makeSpiritAsset(id) {
  if (!cache.has(id))
    cache.set(
      id,
      assets[id].batches.map((b) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(b.positions, 3),
        );
        geometry.computeVertexNormals();
        const color = new THREE.Color(...b.color);
        const material = new THREE.MeshStandardMaterial({
          name: b.name,
          color,
          metalness: b.metalness,
          roughness: b.roughness,
          flatShading: true,
          emissive: color,
          emissiveIntensity: b.emission || 0,
        });
        return { geometry, material };
      }),
    );
  const g = new THREE.Group();
  g.name = assets[id].name;
  g.userData.triangles = assets[id].triangles;
  for (const part of cache.get(id)) {
    const m = new THREE.Mesh(part.geometry, part.material);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}
