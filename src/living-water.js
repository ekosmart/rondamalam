import * as THREE from "three";
export class LivingWater {
  constructor(w) {
    this.water = w.water;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const c = canvas.getContext("2d");
    c.fillStyle = "#429dd0";
    c.fillRect(0, 0, 256, 256);
    for (let y = -16; y < 280; y += 12) {
      c.beginPath();
      for (let x = -2; x < 260; x += 2) {
        const yy =
          y + Math.sin(x * 0.055 + y) * 5 + Math.sin(x * 0.13 + y * 0.1) * 2;
        if (x === -2) c.moveTo(x, yy);
        else c.lineTo(x, yy);
      }
      c.strokeStyle = y % 24 === 0 ? "#a1e1ee" : "#5ebada";
      c.lineWidth = y % 24 === 0 ? 1.3 : 3;
      c.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    for (const water of this.water) {
      const tex = texture.clone(),
        b = new THREE.Box3().setFromObject(water),
        size = b.getSize(new THREE.Vector3());
      tex.repeat.set(Math.max(1, size.x / 8), Math.max(1, size.z / 8));
      water.material = new THREE.MeshPhysicalMaterial({
        map: tex,
        bumpMap: tex,
        bumpScale: 0.22,
        color: "#72cef7",
        roughness: 0.17,
        metalness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        transparent: true,
        opacity: 0.8,
        emissive: "#17629d",
        emissiveIntensity: 0.2,
        side: THREE.DoubleSide,
      });
      water.position.y = 0.24;
      water.castShadow = false;
      water.userData.waterBase =
        water.geometry.attributes.position.array.slice();
      water.userData.livingWater = true;
    }
  }
  update(t, day) {
    for (const w of this.water) {
      w.material.map.offset.set(t * 0.019, t * 0.008);
      w.material.emissiveIntensity = 0.1 + day * 0.2;
      const p = w.geometry.attributes.position,
        b = w.userData.waterBase;
      for (let i = 0; i < p.count; i++)
        p.setZ(
          i,
          b[i * 3 + 2] +
            Math.sin(b[i * 3] * 0.62 + t * 1.6) *
              Math.cos(b[i * 3 + 1] * 0.31 + t * 0.7) *
              0.047,
        );
      p.needsUpdate = true;
    }
  }
}
