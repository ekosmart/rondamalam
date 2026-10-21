import * as THREE from "three";
import house from "./assets/karang-tirta/rumah-panggung.json" with { type: "json" };
import lighthouse from "./assets/karang-tirta/mercusuar.json" with { type: "json" };
import boat from "./assets/karang-tirta/perahu-motor.json" with { type: "json" };
import buto from "./assets/karang-tirta/buto-ijo.json" with { type: "json" };
const assets = { house, lighthouse, boat, buto },
  cache = new Map();
export function makeCoastAsset(id) {
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
        return {
          geometry,
          material: new THREE.MeshStandardMaterial({
            name: b.name,
            color,
            roughness: b.roughness,
            metalness: b.metalness,
            emissive: color,
            emissiveIntensity: b.emission || 0,
            flatShading: true,
            side: id === "boat" ? THREE.DoubleSide : THREE.FrontSide,
          }),
        };
      }),
    );
  const g = new THREE.Group();
  g.name = assets[id].name;
  g.userData.triangles = assets[id].triangles;
  for (const { geometry, material } of cache.get(id)) {
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  return g;
}
export function makeButoIjo(companion = false) {
  const g = new THREE.Group(),
    body = makeCoastAsset("buto");
  g.add(body);
  let own;
  body.traverse((m) => {
    if (m.isMesh && m.material.name.includes("green skin")) {
      m.material = m.material.clone();
      own = m.material;
      own.emissive.set("#6f9c41");
      own.emissiveIntensity = companion ? 0.2 : 0.08;
    }
  });
  g.userData = { body, own, baseScale: 1 };
  return g;
}
