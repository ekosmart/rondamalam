import * as THREE from 'three';

export class LaserEffects {
  constructor(scene) { this.scene = scene; this.beams = []; this.geometry = new THREE.CylinderGeometry(1, 1, 1, 8); }
  fire(start, end, color = '#65f5ff', life = 0.34) {
    if (this.beams.length >= 24) this.remove(0);
    const group = new THREE.Group(), delta = end.clone().sub(start), length = delta.length();
    group.position.copy(start).lerp(end, 0.5);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    for (const [radius, tint, opacity] of [[0.26, color, 0.32], [0.10, color, 0.92], [0.035, '#ffffff', 1]]) {
      const mesh = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      mesh.scale.set(radius, length, radius); mesh.userData.opacity = opacity; group.add(mesh);
    }
    this.scene.add(group); this.beams.push({ group, life, max: life });
  }
  remove(i) { const { group } = this.beams[i]; group.removeFromParent(); group.children.forEach(m => m.material.dispose()); this.beams.splice(i, 1); }
  update(dt) { for (let i = this.beams.length - 1; i >= 0; i--) { const b = this.beams[i]; b.life -= dt; if (b.life <= 0) this.remove(i); else b.group.children.forEach(m => m.material.opacity = m.userData.opacity * Math.min(1, b.life / b.max * 2)); } }
}
