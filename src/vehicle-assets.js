import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Vehicle } from "../assets/source/vehicles/vehicle-kit.js";
export const VEHICLE_ASSETS = {
  bajaj: { file: "bajaj", scale: 2.25, drive: "Drive", idle: "Idle" },
  becak: { file: "becak", scale: 2.25, drive: "Pedal", idle: "Idle" },
  bemo: { file: "bemo", scale: 2.25, drive: "Drive", idle: "Idle" },
  oplet: { file: "oplet", scale: 2.25, drive: "Drive", idle: "Idle" },
  "getek-bambu": {
    file: "getek_bambu",
    scale: 1.6,
    drive: "Punt",
    idle: "Float",
    standing: true,
  },
  "buaya-putih": {
    file: "buaya_putih",
    scale: 1.3,
    drive: "Swim",
    idle: "Idle",
  },
  "naga-sulong": {
    file: "naga_sulong",
    scale: 1.5,
    drive: "Fly",
    idle: "Idle",
  },
  egrang: {
    file: "egrang",
    height: 3.6,
    drive: "Egrang_Walk_Cycle",
    standing: true,
  },
  "kereta-santa": {
    file: "kereta_santa",
    length: 13,
    drive: "Santa_Walk_Fly_Cycle",
  },
};
const loader = new GLTFLoader(),
  cache = new Map();
export function makeVehicleMount(id) {
  const cfg = VEHICLE_ASSETS[id],
    root = new THREE.Group();
  root.userData.wheels = [];
  root.userData.vehicleId = id;
  if (!cache.has(id))
    cache.set(id, loader.loadAsync(`/models/vehicles/${cfg.file}.glb`));
  root.userData.ready = cache
    .get(id)
    .then((gltf) => {
      if (root.userData.disposed) return root;
      const kit = new Vehicle(gltf),
        model = kit.root;
      if (id === "kereta-santa") {
        model.getObjectByName("Rig_Egrang")?.removeFromParent();
        delete kit.clips.Egrang_Walk_Cycle;
      }
      model.traverse((o) => {
        if (o.isMesh) {
          o.material = Array.isArray(o.material)
            ? o.material.map((m) => m.clone())
            : o.material.clone();
          o.frustumCulled = false;
          if (o.userData.type === "collider" || o.name.startsWith("Collider_"))
            o.visible = false;
        }
      });
      // Keep the supplied rig coordinate system intact inside a normalized wrapper.
      model.updateMatrixWorld(true);
      model.traverse((o) => {
        if (o.isSkinnedMesh) o.computeBoundingBox();
      });
      const bounds = new THREE.Box3().setFromObject(model),
        size = bounds.getSize(new THREE.Vector3());
      const scale =
        cfg.scale ||
        (cfg.height
          ? cfg.height / size.y
          : cfg.length / Math.max(size.x, size.z));
      const body = new THREE.Group();
      body.scale.setScalar(scale);
      body.add(model);
      body.position.set(
        (-(bounds.min.x + bounds.max.x) * scale) / 2,
        -bounds.min.y * scale,
        (-(bounds.min.z + bounds.max.z) * scale) / 2,
      );
      // The punt extends below the raft: do not lift the raft to its lowest tip.
      if (id === "getek-bambu") body.position.y = 0.08;
      root.add(body);
      const seat = Object.values(kit.seats).find((s) =>
        ["driver", "rider"].includes(s.userData.role),
      );
      Object.assign(root.userData, {
        vehicleKit: kit,
        vehicleBody: body,
        vehicleLoaded: true,
        driverSeat: seat,
        passengerSeat: Object.values(kit.seats).find(
          (s) => s.userData.role === "passenger",
        ),
        vehicleScale: scale,
        collisionRadius: Math.min(2.4, Math.max(0.55, size.x * scale * 0.45)),
      });
      root.userData.specialSeat =
        id === "kereta-santa" ? model.getObjectByName("Sleigh_Chassis") : null;
      if (id === "egrang") {
        // The supplied footrest bones start at the tops of the poles. Attach at
        // the actual wooden steps in bind space, so feet follow the walking rig.
        root.userData.footrests = ["L", "R"].map((side, i) => {
          let mesh;
          model.traverse((o) => {
            if (o.isSkinnedMesh && !mesh) mesh = o;
          });
          const bone = model.getObjectByName("Footrest_" + side),
            index = mesh.skeleton.bones.indexOf(bone),
            anchor = new THREE.Object3D();
          anchor.position
            .set(i ? -3.18 : -3.82, 1.02, 0.12)
            .applyMatrix4(mesh.bindMatrix)
            .applyMatrix4(mesh.skeleton.boneInverses[index]);
          bone.add(anchor);
          return anchor;
        });
        root.userData.specialSeat = root.userData.footrests[0];
      }
      const initial = cfg.idle || cfg.drive;
      if (initial) {
        kit.play(initial);
        root.userData.vehicleClip = initial;
        if (!cfg.idle) kit.mixer.timeScale = 0;
      }
      return root;
    })
    .catch((error) => {
      root.userData.assetError = String(error);
      console.error("Vehicle asset " + id, error);
      return root;
    });
  return root;
}
export function animateVehicleMount(root, t, moving) {
  const r = root.userData,
    kit = r.vehicleKit,
    cfg = VEHICLE_ASSETS[r.vehicleId];
  if (!kit) return;
  const dt = Math.max(
    0,
    Math.min(0.1, r.vehicleTime == null ? 1 / 60 : t - r.vehicleTime),
  );
  r.vehicleTime = t;
  const clip = moving ? cfg.drive : cfg.idle || cfg.drive;
  if (clip !== r.vehicleClip) {
    kit.play(clip);
    r.vehicleClip = clip;
  }
  kit.mixer.timeScale = moving || cfg.idle ? 1 : 0;
  kit.update(dt);
  // Roll wheel pivots by actual distance; source Drive can also animate suspension.
  const p = root.position,
    prev = r.vehiclePrevious;
  const travel = prev ? Math.hypot(p.x - prev.x, p.z - prev.z) : 0;
  r.vehiclePrevious = p.clone();
  if (moving && travel < 15) kit.roll(travel / r.vehicleScale);
  const turn =
    r.vehicleYaw == null
      ? 0
      : Math.atan2(
          Math.sin(root.rotation.y - r.vehicleYaw),
          Math.cos(root.rotation.y - r.vehicleYaw),
        );
  kit.setSteer(THREE.MathUtils.clamp(turn * 8, -0.45, 0.45));
  r.vehicleYaw = root.rotation.y;
  if (r.doorUntil != null) kit.setDoor(t < r.doorUntil ? 1 : 0);
}
export function vehicleSeatWorld(root, passenger = false) {
  const r = root.userData,
    seat = passenger ? r.passengerSeat : r.driverSeat || r.specialSeat;
  if (!seat) return null;
  root.updateWorldMatrix(true, true);
  const p = seat.getWorldPosition(new THREE.Vector3());
  if (!passenger && r.vehicleId === "egrang") {
    const other = r.footrests[1];
    if (other)
      p.add(other.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
  }
  if (!passenger && r.vehicleId === "kereta-santa") p.y += 0.7;
  if (!passenger && VEHICLE_ASSETS[r.vehicleId].standing) return p;
  p.y -= 1.1;
  return p;
}
export function disposeVehicleMount(root) {
  if (!root?.userData.vehicleId) return;
  root.userData.disposed = true;
  const kit = root.userData.vehicleKit;
  if (!kit) return;
  kit.mixer.stopAllAction();
  kit.mixer.uncacheRoot(kit.root);
  const mats = new Set(),
    skeletons = new Set();
  kit.root.traverse((o) => {
    if (o.isMesh) {
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        mats.add(m);
      if (o.skeleton) skeletons.add(o.skeleton);
    }
  });
  mats.forEach((m) => m.dispose());
  skeletons.forEach((s) => s.dispose());
}
