// vehicle-kit.js — kendali kendaraan & tunggangan Ronda Malam (Three.js)
// Konvensi model: meter, +Z = depan, +Y = atas. Node dikenali lewat nama dan userData (dari "extras" di .glb):
//   Wheel_*   userData.type='wheel'  {radius}          -> berputar pada sumbu X
//   Steer_* / Fork_Front / Handlebar  type='steer' {maxSteer} -> berbelok pada sumbu Y
//   Door_*    type='door' {openAngle}                  -> engsel pada sumbu Y
//   Seat_*    type='seat' {role: driver|passenger|rider}  -> tempat menempel NPC/pemain
//   Collider_* type='collider' {shape:'box', size:[w,h,d], trigger}
//   Buoy_*    type='buoy'                              -> titik sampel gaya apung (getek)
//   Exit_*    titik turun penumpang
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export async function loadVehicle(url) {
  return new Vehicle(await new GLTFLoader().loadAsync(url));
}

export class Vehicle {
  constructor(gltf) {
    this.root = SkeletonUtils.clone(gltf.scene);
    this.mixer = new THREE.AnimationMixer(this.root);
    this.clips = Object.fromEntries(gltf.animations.map((c) => [c.name, c]));
    this.nodes = {}; this.wheels = []; this.steers = []; this.doors = []; this.seats = {}; this.colliders = []; this.buoys = []; this.exits = {};
    this.occupants = {};
    this.root.traverse((o) => {
      if (o.name) this.nodes[o.name] = o;
      const u = o.userData || {};
      if (o.isMesh) o.castShadow = true;
      if (u.type === 'wheel') this.wheels.push(o);
      else if (u.type === 'steer') this.steers.push(o);
      else if (u.type === 'door') this.doors.push(o);
      else if (u.type === 'seat') this.seats[o.name] = o;
      else if (u.type === 'collider') this.colliders.push({ node: o, size: new THREE.Vector3(...u.size), trigger: !!u.trigger });
      else if (u.type === 'buoy') this.buoys.push(o);
      if (o.name?.startsWith('Exit_')) this.exits[o.name] = o;
    });
    this.info = this.root.children.find((c) => c.userData?.vehicle)?.userData ?? this.root.userData;
    this.maxSteer = this.info.maxSteer ?? 0.55;
    this.root.rotation.order = 'YXZ';
    this.actions = {};
  }

  // --- gerak ---
  setSteer(a) {                                   // a dalam radian, dibatasi maxSteer
    const v = THREE.MathUtils.clamp(a, -this.maxSteer, this.maxSteer);
    for (const s of this.steers) s.rotation.y = v;
    return v;
  }
  roll(distance) {                                // distance = jarak tempuh frame ini (meter), maju = positif
    for (const w of this.wheels) w.rotation.x += distance / (w.userData.radius || 0.3);
  }
  setDoor(open01) {                               // 0 = tutup, 1 = terbuka penuh
    for (const d of this.doors) d.rotation.y = (d.userData.openAngle ?? 1.6) * open01;
  }

  // --- penumpang ---
  freeSeat(role = 'passenger') {
    return Object.values(this.seats).find((s) => s.userData.role === role && !this.occupants[s.name]);
  }
  board(npc, role = 'passenger') {               // npc = Object3D (warga desa / pemain)
    const seat = typeof role === 'string' && this.seats[role] ? this.seats[role] : this.freeSeat(role);
    if (!seat) return null;
    seat.add(npc); npc.position.set(0, 0, 0); npc.rotation.set(0, 0, 0);
    this.occupants[seat.name] = npc;
    return seat;
  }
  alight(npc, scene, exitName) {                  // turunkan penumpang di titik Exit_*
    const seatName = Object.keys(this.occupants).find((k) => this.occupants[k] === npc);
    if (seatName) delete this.occupants[seatName];
    const ex = this.exits[exitName] ?? Object.values(this.exits)[0];
    const p = new THREE.Vector3(); (ex ?? this.root).getWorldPosition(p);
    scene.add(npc); npc.position.copy(p); npc.rotation.set(0, this.root.rotation.y, 0);
  }

  // --- apung (getek, buaya): heightAt(x, z) -> tinggi permukaan air ---
  floatOn(heightAt, floatHeight = this.info.floatHeight ?? 0.08) {
    if (this.buoys.length < 4) return;
    const pos = (n) => { const v = new THREE.Vector3(); n.getWorldPosition(v); return v; };
    const h = {}; for (const b of this.buoys) { const p = pos(b); h[b.name.slice(5)] = heightAt(p.x, p.z); }
    const front = (h.FL + h.FR) / 2, back = (h.BL + h.BR) / 2, left = (h.FL + h.BL) / 2, right = (h.FR + h.BR) / 2;
    this.root.position.y = (front + back) / 2 + floatHeight;
    this.root.rotation.x = -Math.atan2(front - back, 3.0);
    this.root.rotation.z = Math.atan2(left - right, 1.2);
  }

  // --- animasi bawaan ---
  play(name, { loop = true, fade = 0.2 } = {}) {
    const clip = this.clips[name]; if (!clip) return null;
    const a = this.actions[name] ?? (this.actions[name] = this.mixer.clipAction(clip));
    a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1); a.clampWhenFinished = !loop;
    for (const [n, other] of Object.entries(this.actions)) if (n !== name) other.fadeOut(fade);
    a.reset().fadeIn(fade).play();
    return a;
  }
  update(dt) { this.mixer.update(dt); }
}

/* Pemakaian (oplet + penumpang warga):
   const oplet = await loadVehicle('/models/oplet.glb'); scene.add(oplet.root);
   oplet.setDoor(1); oplet.board(wargaDesa);         // duduk di Seat_* kosong
   oplet.setSteer(input.x * 0.5); oplet.roll(speed * dt);
   // getek:  getek.floatOn((x, z) => 0.15 * Math.sin(x * 0.6 + t) + 0.1 * Math.sin(z * 0.9 + t * 1.3));
   // naga/buaya (tunggangan): const naga = await loadVehicle('/models/naga_sulong.glb'); naga.play('Fly');
   //   naga.board(player, 'Seat_Rider');  // Seat_Rider menempel ke tulang punggung, ikut bergelombang
*/
