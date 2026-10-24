import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Adapted from the supplied ghost-fx.js. Heights retain the baked hovering gap.
export const GHOST_ASSETS = {
  ngepet: { file: "babi_ngepet", height: 1.9, sway: 0.02, flicker: 0.5 },
  begu: {
    file: "begu_ganjang",
    height: 5.8,
    sway: 0.02,
    flicker: 0.3,
    smoke: true,
  },
  jelangkung: {
    file: "jelangkung",
    height: 2.6,
    bob: 0.03,
    sway: 0.1,
    flicker: 0.8,
  },
  keranda: {
    file: "keranda_terbang",
    height: 2.7,
    bob: 0.1,
    sway: 0.03,
    roll: 0.05,
  },
  kuyang: { file: "kuyang", height: 3.0, bob: 0.15, sway: 0.1, flicker: 0.7 },
  leak: { file: "leak", height: 3.2, bob: 0.12, sway: 0.08, flicker: 0.6 },
  palasik: {
    file: "palasik",
    height: 2.9,
    bob: 0.12,
    sway: 0.09,
    flicker: 0.6,
  },
  parakang: { file: "parakang", height: 3.0, sway: 0.04, flicker: 0.5 },
  ular: { file: "siluman_ular", height: 3.4, sway: 0.06, flicker: 0.3 },
  sundel: {
    file: "sundel_bolong",
    height: 3.2,
    bob: 0.06,
    sway: 0.04,
    flicker: 0.5,
  },
  tuyul: { file: "tuyul", height: 1.8, sway: 0.05, flicker: 0.4 },
  "wewe-gombel": { file: "wewe_gombel", height: 3.7, sway: 0.03, flicker: 0.4 },
};
const loader = new GLTFLoader(),
  pending = new Map(),
  loaded = new Map();
function load(id) {
  if (!pending.has(id)) {
    const promise = loader
      .loadAsync(`/models/ghosts/${GHOST_ASSETS[id].file}.glb`)
      .then((gltf) => {
        loaded.set(id, gltf.scene);
        return gltf.scene;
      });
    pending.set(id, promise);
    promise.catch(() => pending.delete(id));
  }
  return pending.get(id);
}

function ghostMaterial(material, clock, smoke, body) {
  // A private clock prevents ghost animation from changing plantation wind.
  material.onBeforeCompile = (shader) => {
    // Emissive light must follow the GLB vertex colors, otherwise the dark
    // hair, skin and clothing become one flat silhouette in the night scene.
    if (body) shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
       #if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)
         totalEmissiveRadiance *= vColor.rgb;
       #endif`,
    );
    if (!smoke) return;
    shader.uniforms.ghostTime = clock;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float ghostTime;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float bend = pow(clamp(position.y / 3.8, 0.0, 1.0), 2.0);
        float gust = sin(ghostTime * .9) + .5 * sin(ghostTime * 2.07);
        transformed.xz += vec2(1.0, .35) * gust * .19 * bend;`,
      );
  };
  material.customProgramCacheKey = () => `ghost-v2-${smoke}-${body}`;
}

export function makeImportedGhost(def, companion, fallback) {
  const root = fallback(),
    cfg = GHOST_ASSETS[def.id];
  root.userData.requestedGhost = def.id;
  const fallbackChildren = [...root.children],
    fallbackMaterial = root.userData.own;
  const install = (template) => {
    if (root.userData.disposed) return root;
    const body = new THREE.Group(),
      model = template.clone(true);
    const eyes = [],
      materials = [],
      clock = { value: 0 };
    model.traverse((mesh) => {
      if (!mesh.isMesh) return;
      // Each actor owns disposable geometry/materials; capture echoes cannot
      // invalidate the cached model or change another actor's hit flash.
      mesh.geometry = mesh.geometry.clone();
      const clone = (source) => {
        const m = source.clone();
        if (m.name.startsWith("glow_")) eyes.push(m);
        else {
          m.emissive.set("#ddd8ce");
          m.emissiveIntensity = companion ? 0.28 : 0.13;
          materials.push(m);
        }
        ghostMaterial(m, clock, !!cfg.smoke, !m.name.startsWith("glow_"));
        return m;
      };
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(clone)
        : clone(mesh.material);
      mesh.castShadow = mesh.receiveShadow = true;
    });
    const bounds = new THREE.Box3().setFromObject(model);
    const scale = cfg.height / Math.max(0.1, bounds.max.y);
    model.scale.setScalar(scale);
    model.position.y = Math.max(0, -bounds.min.y * scale);
    body.add(model);
    // The fallback uses shared materials: remove it without disposing them.
    for (const child of fallbackChildren) {
      root.remove(child);
      child.traverse((m) => {
        if (m.isMesh) m.geometry.dispose();
      });
    }
    fallbackMaterial.dispose();
    root.add(body);
    Object.assign(root.userData, {
      body,
      own: materials[0],
      materials,
      eyes,
      clock,
      importedGhost: def.id,
      folklore: def.id,
      baseScale: 1,
      loaded: true,
    });
    return root;
  };
  root.userData.ready = loaded.has(def.id)
    ? Promise.resolve(install(loaded.get(def.id)))
    : load(def.id)
        .then(install)
        .catch((error) => {
          root.userData.assetError = String(error);
          console.warn(`Ghost asset ${def.id}: using fallback`, error);
          return root;
        });
  return root;
}

export function animateImportedGhost(
  model,
  t,
  { moving = false, attack = 0, hit = 0 } = {},
) {
  const r = model.userData,
    cfg = GHOST_ASSETS[r.importedGhost];
  if (!cfg) return;
  const strike = Math.sin(Math.min(1, Math.max(0, attack)) * Math.PI);
  const groundStep =
    !cfg.bob && moving
      ? Math.abs(Math.sin(t * (r.importedGhost === "tuyul" ? 9 : 6))) * 0.07
      : 0;
  r.body.position.y = (cfg.bob || 0) * Math.sin(t * 1.3) + groundStep;
  r.body.rotation.z = (cfg.roll ?? cfg.sway) * Math.sin(t * 0.9);
  r.body.rotation.x =
    hit > 0 ? -0.13 : cfg.sway * 0.5 * Math.sin(t * 0.7) + strike * 0.18;
  r.body.rotation.y = r.importedGhost === "ular" ? Math.sin(t * 2.8) * 0.1 : 0;
  r.clock.value = t;
  if (r.own.emissiveIntensity <= .28) r.own.emissive.set("#ddd8ce");
  for (const m of r.materials) {
    if (m !== r.own) {
      m.emissive.copy(r.own.emissive);
      m.emissiveIntensity = r.own.emissiveIntensity;
    }
  }
  for (const m of r.eyes)
    m.emissiveIntensity =
      1.2 +
      (cfg.flicker || 0) * (0.5 * Math.sin(t * 9) + 0.25 * Math.sin(t * 17));
}

export function disposeImportedGhost(model) {
  if (model.userData.requestedGhost) model.userData.disposed = true;
  if (!model.userData.importedGhost) return false;
  model.userData.disposed = true;
  const materials = new Set();
  model.traverse((m) => {
    if (!m.isMesh) return;
    m.geometry.dispose();
    for (const mat of Array.isArray(m.material) ? m.material : [m.material])
      materials.add(mat);
  });
  materials.forEach((m) => m.dispose());
  return true;
}
