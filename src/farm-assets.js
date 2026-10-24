import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const FARM_ASSETS = {
  barn: { file: "barn", size: [21, 10, 13] },
  cow: { file: "cow", height: 2.7 },
  horse: { file: "horse", height: 3.1 },
  chicken: { file: "chicken", height: 1 },
  duck: { file: "duck", height: 0.9 },
  goat: { file: "goat", height: 1.8 },
  pig: { file: "pig", height: 1.6 },
  sheep: { file: "sheep", height: 1.8 },
  dog: { file: "guard_dog", height: 1.6 },
  tractor: { file: "tractor", height: 3.6 },
};
const loader = new GLTFLoader(),
  cache = new Map();
export function makeFarmAsset(kind, fallback = new THREE.Group()) {
  const cfg = FARM_ASSETS[kind],
    root = fallback,
    old = [...root.children];
  root.userData.wheels ??= [];
  root.userData.farmKind = kind;
  if (!cache.has(kind))
    cache.set(
      kind,
      loader.loadAsync(`/models/farm/${cfg.file}.glb`).then((g) => g.scene),
    );
  root.userData.ready = cache
    .get(kind)
    .then((template) => {
      const model = template.clone(true),
        body = new THREE.Group();
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.material = Array.isArray(o.material)
          ? o.material.map((m) => m.clone())
          : o.material.clone();
        o.castShadow = o.receiveShadow = true;
      });
      const bounds = new THREE.Box3().setFromObject(model),
        size = bounds.getSize(new THREE.Vector3());
      const scale = cfg.size
        ? Math.min(...cfg.size.map((v, i) => v / size.getComponent(i)))
        : cfg.height / size.y;
      model.scale.setScalar(scale);
      model.position.set(
        (-(bounds.min.x + bounds.max.x) * scale) / 2,
        -bounds.min.y * scale,
        (-(bounds.min.z + bounds.max.z) * scale) / 2,
      );
      body.add(model);
      for (const child of old) root.remove(child);
      root.add(body);
      const joints = {};
      model.traverse((o) => {
        if (
          /^(leg_[A-Z]+|wing_[LR]|wheel_[A-Z]+|head|tail|door_[LR])$/.test(
            o.name,
          )
        ) {
          joints[o.name] = { node: o, rotation: o.rotation.clone() };
        }
      });
      Object.assign(root.userData, {
        farmBody: body,
        farmModel: model,
        joints,
        farmLoaded: true,
        wheels: [],
      });
      // Feet origin is below the avatar's seated hips, not on top of the saddle.
      root.userData.mountSeat = { y: 1.2, z: -0.2 };
      if (kind === "tractor") {
        root.updateWorldMatrix(true, true);
        const seat = model.getObjectByName("seat");
        if (seat) {
          const point = seat.getWorldPosition(new THREE.Vector3());
          root.worldToLocal(point);
          root.userData.mountSeat = {
            y: Math.max(0.3, point.y - 1.05),
            z: point.z,
          };
        }
        const smoke = new THREE.Group();
        const exhaust = model.getObjectByName("exhaust");
        const point = exhaust
          ? root.worldToLocal(exhaust.getWorldPosition(new THREE.Vector3()))
          : new THREE.Vector3(0.3, 2.8, 1);
        smoke.position.copy(point);
        smoke.position.y += 0.5;
        body.add(smoke);
        for (let i = 0; i < 4; i++) {
          const puff = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.13, 0),
            new THREE.MeshBasicMaterial({
              color: "#aab3aa",
              transparent: true,
              opacity: 0.25,
              depthWrite: false,
            }),
          );
          smoke.add(puff);
        }
        root.userData.exhaust = smoke;
      }
      return root;
    })
    .catch((error) => {
      root.userData.assetError = String(error);
      console.warn(`Farm ${kind}: fallback`, error);
      return root;
    });
  return root;
}

export function animateFarmAsset(root, t, moving = false, engine = false) {
  const r = root.userData,
    kind = r.farmKind;
  if (!r.farmLoaded) return;
  const pace =
    t * (kind === "horse" ? 8 : kind === "chicken" || kind === "duck" ? 9 : 5);
  const dt = Math.min(0.1, Math.max(0, t - (r.lastAnimationTime ?? t)));
  r.lastAnimationTime = t;
  r.wheelAngle = (r.wheelAngle || 0) + (moving ? dt * 7 : 0);
  for (const [name, j] of Object.entries(r.joints)) {
    j.node.rotation.copy(j.rotation);
    if (name.startsWith("leg_")) {
      const alternate = ["leg_FL", "leg_BR", "leg_L"].includes(name)
        ? 0
        : Math.PI;
      j.node.rotation.x += moving ? Math.sin(pace + alternate) * 0.32 : 0;
    } else if (name.startsWith("wheel_")) j.node.rotation.x -= r.wheelAngle;
    else if (name === "head") {
      j.node.rotation.x += Math.sin(t * 1.4) * 0.06;
      j.node.rotation.y += Math.sin(t * 0.8) * 0.1;
    } else if (name === "tail")
      j.node.rotation.z += Math.sin(t * (kind === "dog" ? 7 : 2)) * 0.16;
    else if (name.startsWith("wing_"))
      j.node.rotation.z += Math.sin(t * 3) * 0.05;
  }
  r.farmBody.position.y = moving
    ? Math.abs(Math.sin(pace)) * (kind === "tractor" ? 0.025 : 0.04)
    : 0;
  if (r.exhaust) {
    r.exhaust.visible = engine;
    r.exhaust.children.forEach((p, i) => {
      const f = (t * 0.8 + i / 4) % 1;
      p.position.set(f * 0.15, f * 0.9, 0);
      p.scale.setScalar(0.6 + f * 1.4);
      p.material.opacity = (1 - f) * 0.22;
    });
  }
}
