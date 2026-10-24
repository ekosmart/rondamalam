import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto(process.env.ASSET_URL || "http://127.0.0.1:5175/?test=1");
  await page.waitForFunction(() => window.__ronda);
  await mkdir("public/portraits", { recursive: true });
  await mkdir("public/models/folklore", { recursive: true });
  const assets = await page.evaluate(async (importedOnly) => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { GLTFExporter } =
      await import("/node_modules/three/examples/jsm/exporters/GLTFExporter.js");
    const { makeGhost } = await import("/src/models.js"),
      { GHOSTS } = await import("/src/data.js");
    const { FOLKLORE_IDS } = await import("/src/folklore-models.js");
    const { GHOST_ASSETS } = await import("/src/ghost-assets.js");
    __ronda.ui.panel = "asset-render";
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(384, 480);
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight("#e4f5ee", "#787363", 2.5));
    const light = new THREE.DirectionalLight("#fff0d4", 3);
    light.position.set(-3, 6, 7);
    scene.add(light);
    const rim = new THREE.DirectionalLight("#86c9d3", 2);
    rim.position.set(4, 3, -5);
    scene.add(rim);
    const out = [];
    for (const def of GHOSTS) {
      if (importedOnly && !GHOST_ASSETS[def.id]) continue;
      const model = makeGhost(def);
      await model.userData.ready;
      if (model.userData.assetError) throw new Error(model.userData.assetError);
      scene.add(model);
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3();
      model.traverse((m) => {
        if (m.isMesh) {
          m.geometry.computeBoundingBox();
          bounds.union(
            m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld),
          );
        }
      });
      const center = bounds.getCenter(new THREE.Vector3()),
        size = bounds.getSize(new THREE.Vector3());
      const height = Math.max(size.y * 1.18, (size.x / 0.8) * 1.4),
        camera = new THREE.OrthographicCamera(
          -height * 0.4,
          height * 0.4,
          height * 0.5,
          -height * 0.5,
          0.1,
          100,
        );
      camera.position.set(
        center.x + height * 0.35,
        center.y + height * 0.1,
        center.z + height * 2.5,
      );
      camera.lookAt(center);
      renderer.render(scene, camera);
      const item = {
        id: def.id,
        png: renderer.domElement.toDataURL("image/png").split(",")[1],
      };
      if (FOLKLORE_IDS.includes(def.id)) {
        model.traverse((o) => (o.userData = {}));
        const glb = await new GLTFExporter().parseAsync(model, {
          binary: true,
          onlyVisible: true,
        });
        const bytes = new Uint8Array(glb);
        let str = "";
        for (let i = 0; i < bytes.length; i += 8192)
          str += String.fromCharCode(...bytes.subarray(i, i + 8192));
        item.glb = btoa(str);
      }
      out.push(item);
      scene.remove(model);
    }
    renderer.dispose();
    return out;
  }, process.env.IMPORTED_ONLY === "1");
  for (const a of assets) {
    await writeFile(
      `public/portraits/${a.id}.png`,
      Buffer.from(a.png, "base64"),
    );
    if (a.glb)
      await writeFile(
        `public/models/folklore/${a.id}.glb`,
        Buffer.from(a.glb, "base64"),
      );
    console.log("Rendered", a.id);
  }
} finally {
  await browser.close();
}
