// ghost-fx.js — animasi idle ringan untuk hantu (tanpa rig/skeleton): melayang, goyang, mata berkedip.
// Model punya material bernama "glow_red|amber|green|yellow|white" (emissive) dan "body_vertex_color".
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyWindSway, windTime } from './wind-sway.js';

// Konfigurasi per hantu. Tinggi melayang sudah "dibakar" di model (pivot di tanah), jadi bob hanya naik-turun kecil.
export const HANTU = {
  tuyul:           { bob: 0,    sway: 0.05, flicker: 0.4 },
  babi_ngepet:     { bob: 0,    sway: 0.02, flicker: 0.5 },
  leak:            { bob: 0.12, sway: 0.08, flicker: 0.6 },
  keranda_terbang: { bob: 0.10, sway: 0.03, roll: 0.05 },
  jelangkung:      { bob: 0.03, sway: 0.10, flicker: 0.8 },
  sundel_bolong:   { bob: 0.06, sway: 0.04, flicker: 0.5 },
  wewe_gombel:     { bob: 0,    sway: 0.03, flicker: 0.4 },
  siluman_ular:    { bob: 0,    sway: 0.06, flicker: 0.3 },
  begu_ganjang:    { bob: 0,    sway: 0.02, smoke: { height: 3.8, strength: 0.05, speed: 0.9 }, flicker: 0.3 },
  kuyang:          { bob: 0.15, sway: 0.10, flicker: 0.7 },
  palasik:         { bob: 0.12, sway: 0.09, flicker: 0.6 },
  parakang:        { bob: 0,    sway: 0.04, flicker: 0.5 },
};

export async function spawnHantu(scene, name, { url = `/models/${name}.glb`, position = new THREE.Vector3() } = {}) {
  const cfg = HANTU[name] ?? {};
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene;
  const eyes = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    if (o.material.name?.startsWith('glow_')) eyes.push(o.material);
    else if (cfg.smoke) o.material = applyWindSway(o.material, cfg.smoke);   // asap/bayangan Begu Ganjang bergoyang
  });
  const holder = new THREE.Group();
  holder.add(root);
  holder.position.copy(position);
  scene.add(holder);

  const phase = Math.random() * 10;
  return {
    object: holder,
    update(t) {
      windTime.value = t;                                                      // untuk shader asap
      holder.position.y = position.y + (cfg.bob ?? 0) * Math.sin(t * 1.3 + phase);
      holder.rotation.z = (cfg.roll ?? cfg.sway ?? 0) * Math.sin(t * 0.9 + phase);
      holder.rotation.x = (cfg.sway ?? 0) * 0.5 * Math.sin(t * 0.7 + phase * 2);
      const f = cfg.flicker ?? 0;
      for (const m of eyes) m.emissiveIntensity = 1.2 + f * (Math.sin(t * 9 + phase) * 0.5 + Math.random() * 0.25);
    },
  };
}

/* Pemakaian:
   const kuyang = await spawnHantu(scene, 'kuyang', { position: new THREE.Vector3(4, 0, -6) });
   // di render loop:
   kuyang.update(clock.getElapsedTime());
   // Rekomendasi: UnrealBloomPass (threshold ~0.8) supaya mata emissive terlihat menyala di malam hari.
   // Arah hadap model: +Z. Gunakan holder.lookAt(player.position) atau rotation.y untuk menghadap pemain.
*/
