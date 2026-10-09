import * as THREE from "three";
import { orb, mesh } from "./models.js";
export function makeFish(fish, cm = 35) {
  const group = new THREE.Group();
  const length = Math.min(3.2, Math.max(1.2, cm / 65));
  const body = orb(group, 0.5, fish.color, 0, 0, 0, 1, {
    metalness: 0.3,
    roughness: 0.35,
    emissive: fish.legendary ? "#1e8a84" : "#000000",
    emissiveIntensity: 0.6,
  });
  body.scale.set(length, 0.45 * length, 0.32 * length);
  const tail = mesh(
    group,
    new THREE.ConeGeometry(length * 0.27, length * 0.42, 3),
    fish.color,
  );
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -length * 0.62;
  const fin = mesh(
    group,
    new THREE.ConeGeometry(length * 0.17, length * 0.26, 3),
    fish.color,
  );
  fin.position.set(0, length * 0.29, 0);
  for (const s of [-1, 1]) {
    orb(
      group,
      length * 0.045,
      "#eff3d3",
      length * 0.3,
      length * 0.07,
      s * length * 0.14,
      1,
    );
    orb(
      group,
      length * 0.023,
      "#12292c",
      length * 0.32,
      length * 0.07,
      s * length * 0.17,
      1,
    );
  }
  group.userData.length = length;
  return group;
}
