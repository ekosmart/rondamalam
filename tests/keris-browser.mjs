import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto("http://127.0.0.1:5174/?test=1");
  await page.waitForFunction(() => !!window.__ronda, { timeout: 60000 });
  await page.locator('[data-action="start"]').click();
  await page.evaluate(() => {
    Object.assign(__ronda.state.data, { coins: 300, iron: 7, essence: 5 });
    __ronda.ui.open("camp");
  });
  await page.locator('[data-action="craft"][data-id="keris-mpu-gandring"]').click();
  assert.equal(await page.evaluate(() => __ronda.state.data.weapon), "keris-mpu-gandring");
  assert.equal(await page.evaluate(() => __ronda.player.userData.holder.children[0].userData.triangles), 1094);
  await page.locator('[data-action="close"]').click();
  await page.waitForFunction(() => document.querySelector("#weapon-mini").textContent === "Keris Mpu Gandring");
  await mkdir("tmp/screenshots", { recursive: true });
  await page.screenshot({ path: "tmp/screenshots/keris-equipped.png" });
  await page.evaluate(() => __ronda.state.save());
  await page.reload();
  await page.waitForFunction(() => !!window.__ronda, { timeout: 60000 });
  assert.equal(await page.evaluate(() => __ronda.state.data.weapon), "keris-mpu-gandring");
  assert.equal(await page.evaluate(() => __ronda.player.userData.holder.children[0].name), "Keris_Mpu_Gandring");
  assert.deepEqual(errors, []);
  console.log("PASS: forge UI, equipped Blender model, HUD, and reload persistence.");

  // Inspect the exact runtime geometry at asset-review scale.
  await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { makeKerisMpuGandring } = await import("/src/keris-mpu-gandring.js");
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#18252a");
    const model = makeKerisMpuGandring();
    model.rotation.y = -0.24;
    scene.add(model);
    scene.add(new THREE.HemisphereLight(0xe3f3ff, 0x785039, 3));
    const key = new THREE.DirectionalLight(0xffe7c6, 4);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x91d3ff, 2);
    rim.position.set(2, 2, -3);
    scene.add(rim);
    const camera = new THREE.OrthographicCamera(-1.2, 1.2, 1.2, -1.2, .01, 20);
    camera.position.set(0, .69, 5);
    camera.lookAt(0, .69, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(800, 800);
    renderer.setPixelRatio(1);
    renderer.render(scene, camera);
    renderer.domElement.id = "asset-review";
    Object.assign(renderer.domElement.style, { position: "fixed", inset: "0", zIndex: "999999" });
    document.body.append(renderer.domElement);
  });
  await page.locator("#asset-review").screenshot({ path: "assets/weapons/keris-mpu-gandring-preview.png" });
} finally {
  await browser.close();
}
