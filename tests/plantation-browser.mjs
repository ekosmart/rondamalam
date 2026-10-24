import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
await fs.mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const check = async (name, fn) => {
  const result = await page.evaluate(fn);
  assert.ok(result, name);
  console.log("PASS", name);
};
try {
  await page.goto("http://127.0.0.1:5176/?test=1");
  await page.waitForFunction(
    () =>
      window.__ronda?.world.vegetation.ready ||
      window.__ronda?.world.vegetation.error,
    { timeout: 60000 },
  );
  await page.locator('[data-action="start"]').click();
  await page.evaluate(() => {
    const g = __ronda;
    g.renderer.setAnimationLoop(null);
    g.audio.setEnabled(false);
    g.weather.set("clear", false);
    g.state.data.time = 720;
    g.updateEnemies(0);
  });
  console.log(
    await page.evaluate(() => {
      const v = __ronda.world.vegetation;
      return {
        error: v.error,
        assets: v.assets?.size,
        trees: v.entries.length,
        batches: v.batches.length,
        counts: Object.fromEntries(
          [...new Set(v.placements.map((p) => p.id))].map((id) => [
            id,
            v.placements.filter((p) => p.id === id).length,
          ]),
        ),
        village: v.villageSites,
        orchard: v.orchardSites,
      };
    }),
  );
  await check("all twelve GLBs are loaded and placed", () => {
    const v = __ronda.world.vegetation;
    return (
      v.ready &&
      v.assets.size === 12 &&
      new Set(v.batches.map((b) => b.name)).size === 12
    );
  });
  await check(
    "five separate village banana sites and three orchard pocong",
    () => {
      const v = __ronda.world.vegetation;
      return (
        v.villageSites.length === 5 &&
        v.orchardSites.length === 3 &&
        v.villageSites.every((s, i) =>
          v.villageSites.every(
            (t, j) => i === j || Math.hypot(t.x - s.x, t.z - s.z) > 30,
          ),
        )
      );
    },
  );
  await check("one ghost per banana site, all spawns walkable", () => {
    const g = __ronda,
      v = g.world.vegetation;
    return (
      [...v.villageSites, ...v.orchardSites].every(
        (s) =>
          g.enemies.filter(
            (e) => e.bananaSite && e.home.x === s.x && e.home.z === s.z,
          ).length === 1,
      ) &&
      g.enemies
        .filter((e) => e.bananaSite || e.canopy)
        .every((e) => g.world.canMove(e.home.x, e.home.z, 0.8))
    );
  });
  await check(
    "bamboo expansion reaches north and south with open road and walking path",
    () => {
      const g = __ronda,
        v = g.world.vegetation,
        trees = v.entries.filter((e) => e.bamboo);
      return (
        trees.length > 60 &&
        Math.min(...trees.map((e) => e.z)) < -175 &&
        Math.max(...trees.map((e) => e.z)) > -40 &&
        [-170, -150, -130, -110, -80, -50].every((z) =>
          g.world.canMove(-250, z, 0.8),
        ) &&
        [-270, -250, -230, -210, -190].every((x) =>
          g.world.canMove(x, -130, 0.8),
        )
      );
    },
  );
  await check(
    "new crop models preserve harvest sites and clear cross paths",
    () => {
      const g = __ronda;
      return g.world.frontier.fields.every(
        (f) =>
          f.assetMeshes.length &&
          !f.stem.visible &&
          g.world.canMove(f.def.x, f.def.z, 0.8),
      );
    },
  );
  await check("harvest still rewards five crops once per shift", () => {
    const g = __ronda;
    return g.world.frontier.fields.every(f => {
      const before = g.frontier.data.bag[f.def.id];
      const action = {type: "harvest", obj: f.def};
      g.frontier.interact(action); g.frontier.interact(action);
      return g.frontier.data.bag[f.def.id] === before + 5;
    });
  });
  for (const [name, x, z, cx, cy, cz] of [
    ["sawit", -215, 90, -196, 20, 123],
    ["jagung", -126, 245, -113, 10, 274],
    ["gandum", -65, 245, -49, 10, 275],
    ["pisang", -124, 122, -106, 15, 145],
    ["bambu", -250, -100, -247, 19, -69],
  ]) {
    await page.evaluate(
      ([x, z, cx, cy, cz]) => {
        const g = __ronda;
        Object.assign(g.state.data, { x, z });
        g.updatePlayer(0);
        g.world.update(0.05, 8, g.state, g.state.data);
        g.weather.render(0);
        g.updateLight();
        g.ui.update(0.2);
        g.camera.position.set(cx, cy, cz);
        g.camera.lookAt(x, 3, z);
        g.renderer.render(g.scene, g.camera);
      },
      [x, z, cx, cy, cz],
    );
    await page.screenshot({ path: `artifacts/plantation-${name}.png` });
  }
  await check(
    "wind shaders compile for foliage and shadows and share advancing time",
    () => {
      const g = __ronda,
        v = g.world.vegetation;
      g.world.update(0.1, 12, g.state, g.state.data);
      return [
        "bambu_rumpun",
        "gandum_rumpun",
        "jagung_dewasa",
        "pisang_pohon_berbuah",
        "sawit_pohon",
      ].every((id) =>
        v.batches.some(
          (b) =>
            b.name === id &&
            b.material.userData.windShader?.uniforms.uPlantTime.value === 12,
        ),
      );
    },
  );
  await check(
    "weather destroys and restores the new field and tree models",
    () => {
      const g = __ronda,
        w = g.world,
        f = w.frontier.fields[0],
        tree = w.vegetation.entries[0];
      w.damage.setFieldRuined(f, true);
      const dead = f.assetMeshes.every((p) => !p.m.visible && p.dead.visible);
      w.damage.setRuined(tree, true);
      const blocked = tree.damageColliders.every((c) => c.disabled);
      w.damage.restore();
      return (
        dead &&
        blocked &&
        f.assetMeshes.every((p) => p.m.visible && !p.dead.visible) &&
        !tree.ruined
      );
    },
  );
  await check("wind produces visible movement while the rest of the scene is frozen", () => {
    const g=__ronda, gl=g.renderer.getContext(), pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
    const hash = t => {
      g.world.vegetation.update(0,t,"clear");g.renderer.render(g.scene,g.camera);
      gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      let h=2166136261;for(let i=0;i<pixels.length;i+=7)h=Math.imul(h^pixels[i],16777619);
      return h;
    };
    return hash(20)!==hash(21);
  });
  await check("kuntilanak patrols bamboo tops at night", () => {
    const g = __ronda;
    Object.assign(g.state.data, { night: 2, time: 1320, x: 0, z: 0 });
    for (let i = 0; i < 100; i++) {
      g.elapsed += 0.05;
      g.updateEnemies(0.05);
    }
    const e = g.enemies.filter((e) => e.canopy);
    return (
      e.length === 3 && e.every((e) => e.active && e.pos.y > 8 && e.pos.y < 13)
    );
  });
  await page.evaluate(() => {
    const g=__ronda,e=g.enemies.find(e=>e.canopy);
    g.world.update(.05,26,g.state,e.home);g.weather.render(0);g.ui.update(.2);
    g.camera.position.set(e.pos.x+17,17,e.pos.z+24);g.camera.lookAt(e.pos.x,e.pos.y+1,e.pos.z);
    g.renderer.render(g.scene,g.camera);
  });
  await page.screenshot({path:"artifacts/plantation-kuntilanak-night.png"});
  await check("kuntilanak descends for ground combat", () => {
    const g = __ronda,
      e = g.enemies.find((e) => e.canopy);
    Object.assign(g.state.data, { x: e.home.x, z: e.home.z });
    g.altitude = 0;
    for (let i = 0; i < 100; i++) {
      g.elapsed += 0.05;
      g.updateEnemies(0.05);
    }
    return e.pos.y < 2 && e.active;
  });
  await check("habitat ghosts disappear in daylight", () => {
    const g = __ronda;
    g.state.data.time = 720;
    g.updateEnemies(0.05);
    return g.enemies
      .filter((e) => e.canopy || e.bananaSite)
      .every((e) => !e.active && !e.model.visible);
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await page.evaluate(() => {
    const g = __ronda;
    Object.assign(g.state.data, { x: -126, z: 245 });
    g.camera.position.set(-111, 13, 271);
    g.camera.aspect = innerWidth / innerHeight;
    g.camera.updateProjectionMatrix();
    g.camera.lookAt(-126, 2, 245);
    g.world.update(0.05, 15, g.state, g.state.data);
    g.renderer.render(g.scene, g.camera);
  });
  await page.screenshot({ path: "artifacts/plantation-mobile.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS plantations, habitats, GPU wind, weather damage and mobile WebGL",
  );
} finally {
  await browser.close();
}
