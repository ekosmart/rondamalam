// wind-sway.js — efek tertiup angin lewat vertex shader (tanpa animasi di file .glb)
// Cocok untuk: jagung, gandum, bambu, daun pisang, pelepah sawit.
// Asset punya pivot di dasar (y = 0), jadi bobot lengkung = (y / tinggi)^2 : dasar diam, ujung paling bergoyang.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const windTime = { value: 0 };           // update tiap frame: windTime.value = clock.getElapsedTime()

export function applyWindSway(material, { height = 2, strength = 0.12, speed = 1.6, dir = [1, 0.35] } = {}) {
  const m = material.clone();
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windTime;
    shader.uniforms.uHeight = { value: height };
    shader.uniforms.uStrength = { value: strength };
    shader.uniforms.uSpeed = { value: speed };
    shader.uniforms.uDir = { value: new THREE.Vector2(dir[0], dir[1]).normalize() };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; uniform float uHeight; uniform float uStrength; uniform float uSpeed; uniform vec2 uDir;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float bend = clamp(position.y / uHeight, 0.0, 1.0);
        bend *= bend;
        vec2 wp = vec2(0.0);
        #ifdef USE_INSTANCING
          wp = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);   // fase beda tiap instance
        #endif
        float ph = wp.x * 0.35 + wp.y * 0.25;
        float gust = sin(uTime * uSpeed + ph) + 0.5 * sin(uTime * uSpeed * 2.3 + ph * 1.7);
        transformed.x += uDir.x * gust * uStrength * bend * uHeight;
        transformed.z += uDir.y * gust * uStrength * bend * uHeight;`);
  };
  m.customProgramCacheKey = () => `sway-${height}-${strength}-${speed}`;
  return m;
}

// Contoh: sebar ladang jagung dengan InstancedMesh (1 draw call untuk ratusan tanaman)
export async function scatterField(scene, url, { count = 400, area = 30, height = 2.2, ...wind } = {}) {
  const gltf = await new GLTFLoader().loadAsync(url);
  let src; gltf.scene.traverse(o => { if (o.isMesh && !src) src = o; });
  const mat = applyWindSway(src.material, { height, ...wind });
  const inst = new THREE.InstancedMesh(src.geometry, mat, count);
  const d = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    d.position.set((Math.random() - 0.5) * area, 0, (Math.random() - 0.5) * area);
    d.rotation.y = Math.random() * Math.PI * 2;
    d.scale.setScalar(0.85 + Math.random() * 0.35);
    d.updateMatrix();
    inst.setMatrixAt(i, d.matrix);
  }
  inst.castShadow = true;
  scene.add(inst);
  return inst;
}

/* Pemakaian:
   import { scatterField, windTime } from './wind-sway.js';
   await scatterField(scene, '/models/jagung_dewasa.glb', { count: 500, area: 40, height: 2.2, strength: 0.10 });
   await scatterField(scene, '/models/gandum_rumpun.glb', { count: 120, area: 40, height: 1.1, strength: 0.14, speed: 2.0 });
   await scatterField(scene, '/models/bambu_rumpun.glb',  { count: 12,  area: 40, height: 9,   strength: 0.05, speed: 1.0 });
   // di render loop:  windTime.value = clock.getElapsedTime();
*/
