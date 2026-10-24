import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const check = async (name, fn) => {
  assert.ok(await page.evaluate(fn), name);
  console.log("PASS", name);
};
try {
  await page.goto("http://127.0.0.1:5176/?test=1");
  await page.waitForFunction(() => window.__ronda, { timeout: 60000 });
  await page.locator('[data-action="start"]').click();
  await page.evaluate(async () => {
    const g = __ronda;
    g.renderer.setAnimationLoop(null);
    g.renderer.setPixelRatio(0.65);
    g.renderer.shadowMap.enabled = false;
    g.audio.setEnabled(false);
    g.weather.set("clear", false);
    g.state.data.time = 720;
    g.ui.close();
    await Promise.all([
      ...g.life.animals.map((a) => a.model.userData.ready),
      g.rural.tractorModel.userData.ready,
      g.world.ruralWorld.barn.userData.ready,
    ]);
  });
  await check("all ten farm assets load and keep articulated parts", () => {
    const g = __ronda;
    return (
      ["cow", "horse", "chicken", "duck", "goat", "pig", "sheep", "dog"].every(
        (kind) =>
          g.life.animals.some(
            (a) =>
              a.kind === kind &&
              a.model.userData.farmLoaded &&
              !a.model.userData.assetError &&
              Object.keys(a.model.userData.joints).length >= 2,
          ),
      ) &&
      g.rural.tractorModel.userData.farmLoaded &&
      g.world.ruralWorld.barn.userData.farmLoaded &&
      g.world.ruralWorld.barn.parent === g.scene
    );
  });
  await check(
    "farm animation changes joints without moving actor roots",
    async () => {
      const { animateFarmAsset } = await import("/src/farm-assets.js");
      const g = __ronda;
      for (const model of [
        ...g.life.animals.filter((a) => a.kind).map((a) => a.model),
        g.rural.tractorModel,
      ]) {
        const p = model.position.clone(),
          q = model.quaternion.clone();
        animateFarmAsset(model, 1, true, true);
        const before = Object.values(model.userData.joints)
          .map((j) => j.node.rotation.toArray().join())
          .join();
        animateFarmAsset(model, 2, true, true);
        if (
          !model.position.equals(p) ||
          !model.quaternion.equals(q) ||
          before ===
            Object.values(model.userData.joints)
              .map((j) => j.node.rotation.toArray().join())
              .join()
        )
          return false;
      }
      return true;
    },
  );
  await page.evaluate(() => {
    const g=__ronda;
    Object.assign(g.state.data,{x:-114,z:182});
    g.world.update(0,10,g.state,g.state.data);g.weather.render(0);g.ui.update(.2);
    g.camera.position.set(-91,15,210);g.camera.lookAt(-128,2,174);
    g.renderer.render(g.scene,g.camera);
  });
  await page.screenshot({path:"artifacts/farm-updated.png"});
  await check(
    "pos ronda cannot purchase, craft or upgrade; ownership menus remain",
    () => {
      const g = __ronda,
        d = g.state.data;
      Object.assign(d, {
        x: 0,
        z: 0,
        coins: 10000,
        iron: 100,
        glass: 100,
        herb: 100,
        essence: 100,
      });
      const before = JSON.stringify({
        coins: d.coins,
        mounts: d.mounts,
        weapons: d.weapons,
        upgrades: d.upgrades,
        bottles: d.bottles,
      });
      for (const [a, id] of [
        ["buy-mount", "horse"],
        ["craft", "bottle"],
        ["upgrade", "health"],
        ["frontier-buy", "bait"],
      ])
        g.action(a, { id });
      g.ui.currentTab = "mounts";
      g.ui.open("camp");
      const buttons = document.querySelectorAll(
        '[data-action="buy-mount"], [data-action="craft"], [data-action="upgrade"]',
      ).length;
      g.ui.close();
      return (
        buttons === 0 &&
        before ===
          JSON.stringify({
            coins: d.coins,
            mounts: d.mounts,
            weapons: d.weapons,
            upgrades: d.upgrades,
            bottles: d.bottles,
          })
      );
    },
  );
  await page.evaluate(async () => {
    const g = __ronda;
    Object.assign(g.state.data, { x: 74, z: -16 });
    g.findInteraction();
    g.action("interact");
    if (!g.kopdes.active) throw Error("door did not enter shop");
    await Promise.all(g.kopdes.entries.map((e) => e.model?.userData.ready));
    g.kopdes.frame(0.016, 1);
  });
  await check("all catalog entries have 3D displays and price tags", () => {
    const k = __ronda.kopdes;
    return (
      k.active &&
      k.entries
        .filter((e) => e.type !== "counter")
        .every((e) => e.model && e.priceTag) &&
      k.entries.find((e) => e.def.id === "mecha").priceTag &&
      k.people.length === 3
    );
  });
  await check(
    "entrance, cashier and every display are reachable without crossing counters",
    () => {
      const k = __ronda.kopdes;
      return (
        k.canWalk(0, 23) &&
        k.canWalk(0, -21) &&
        !k.canWalk(0, -24) &&
        !k.canWalk(25, 0) &&
        k.entries.every((e) =>
          k.canWalk(
            e.x,
            e.z + (e.type === "mount" ? 3.6 : e.type === "counter" ? 2.5 : 1.8),
          ),
        )
      );
    },
  );
  await page.screenshot({ path: "artifacts/kopdes-entrance.png" });
  await check(
    "purchase requires inspection and proximity, rejects forged distant purchase",
    () => {
      const g = __ronda,
        k = g.kopdes,
        d = g.state.data;
      const coins = d.coins;
      g.action("buy-mount", { id: "horse" });
      return coins === d.coins && !d.mounts.includes("horse");
    },
  );
  for (const id of ["horse", "tractor", "mecha"]) {
    await page.evaluate((id) => {
      const g = __ronda,
        k = g.kopdes,
        e = k.entries.find((e) => e.type === "mount" && e.def.id === id);
      k.position.set(e.x, 0, e.z + 3.6);
      g.ui.close();
      g.action("interact");
    }, id);
    await page.locator(`[data-action="buy-mount"][data-id="${id}"]`).click();
    assert.ok(
      await page.evaluate((id) => __ronda.state.data.mounts.includes(id), id),
    );
    console.log("PASS bought", id);
  }
  await check("duplicate purchases never charge again", () => {
    const g = __ronda,
      c = g.state.data.coins;
    g.action("buy-mount", { id: "mecha" });
    return c === g.state.data.coins;
  });
  await check("quest rewards have no display and cannot be purchased", () => {
    const g = __ronda,
      k = g.kopdes,
      coins = g.state.data.coins;
    g.ui.close();
    g.action("buy-mount", { id: "ufo" });
    return k.entries.every((e) => !e.def.questOnly) &&
      !g.state.data.mounts.includes("ufo") && g.state.data.coins === coins;
  });
  await check(
    "shelf purchase and cashier resale update inventory and coins",
    () => {
      const g = __ronda,
        k = g.kopdes,
        d = g.state.data,
        e = k.entries.find((e) => e.type === "item" && e.def.id === "corn");
      g.ui.close();
      k.position.set(e.x, 0, e.z + 1.8);
      g.action("interact");
      const n = d.frontier.bag.corn || 0,
        c = d.coins;
      g.action("frontier-buy", { id: "corn" });
      if (d.frontier.bag.corn !== n + 1 || d.coins !== c - 8) return false;
      g.ui.close();
      k.position.set(0, 0, -21.5);
      g.action("interact");
      g.action("frontier-sell", { id: "corn" });
      return d.frontier.bag.corn === n && d.coins === c - 3;
    },
  );
  await check("workshop services still work only at their displays", () => {
    const g = __ronda,
      k = g.kopdes,
      d = g.state.data;
    let n = d.upgrades.health;
    g.action("upgrade", { id: "health" });
    if (d.upgrades.health !== n + 1) return false;
    const e = k.entries.find((e) => e.key === "bottle");
    g.ui.close();
    k.position.set(e.x, 0, e.z + 1.8);
    g.action("interact");
    n = d.bottles;
    g.action("craft", { id: "bottle" });
    return d.bottles === n + 3;
  });
  await page.evaluate(() => {
    const g = __ronda,
      k = g.kopdes;
    g.ui.close();
    const e = k.entries.find((e) => e.def.id === "mecha");
    k.position.set(e.x - 4, 0, e.z + 6);
    g.cameraYaw = -0.5;
    g.cameraPitch = -0.15;
    k.frame(0.016, 5);
  });
  await page.screenshot({ path: "artifacts/kopdes-mecha.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.evaluate(() => __ronda.kopdes.frame(0.016, 6));
  await check(
    "mobile shop controls fit and remain available",
    () =>
      document.documentElement.scrollWidth <= innerWidth &&
      document
        .querySelector('[data-action="kopdes-exit"]')
        .getBoundingClientRect().right <= innerWidth,
  );
  await page.screenshot({ path: "artifacts/kopdes-mobile.png" });
  await page.locator('[data-action="kopdes-exit"]').click();
  await check(
    "leaving restores village and prevents remote shop transactions",
    () => {
      const g = __ronda,
        c = g.state.data.coins;
      g.action("frontier-buy", { id: "corn" });
      return (
        !g.kopdes.active &&
        g.state.data.x === 74 &&
        g.state.data.z === -14 &&
        g.state.data.coins === c
      );
    },
  );
  await page.setViewportSize({ width: 1440, height: 960 });
  for (const id of ["horse", "tractor"]) {
    await page.evaluate(async (id) => {
      const g = __ronda;
      Object.assign(g.state.data, { x: 0, z: 36 });
      g.ui.close();
      g.action("equip-mount", { id });
      await g.bike.userData.ready;
      g.action("mount");
      g.keys.add("KeyW");
      g.updatePlayer(0.05);
      g.keys.clear();
      g.updatePlayer(0.016);
      g.world.update(0, 10, g.state, g.state.data);
      g.weather.render(0);
      g.camera.position.set(g.state.data.x + 8, 5, g.state.data.z + 8);
      g.camera.lookAt(g.state.data.x, 1.8, g.state.data.z);
      g.renderer.render(g.scene, g.camera);
    }, id);
    await check(`riding ${id} remains grounded with a valid seat`, () => {
      const g = __ronda;
      return (
        g.state.data.riding &&
        !g.isFlying &&
        g.altitude === 0 &&
        g.bike.userData.farmLoaded &&
        Number.isFinite(g.player.position.y) &&
        g.player.position.y > 0.2 &&
        g.player.position.y < 2.5
      );
    });
    await page.screenshot({ path: `artifacts/riding-${id}.png` });
    await page.evaluate(() => __ronda.action("mount"));
  }
  await check("animal sound and tractor motor respect mute", async () => {
    const g = __ronda;
    g.audio.setEnabled(true);
    await g.audio.ctx.resume();
    const played = g.audio.farm.play("cow", 0);
    g.audio.farm.motor(true, true);
    const engine = !!g.audio.farm.engine;
    g.audio.setEnabled(false);
    return (
      played && engine && !g.audio.farm.engine && g.audio.farm.voices.size === 0
    );
  });
  await page.evaluate(() => __ronda.state.save());
  await page.reload();
  await page.waitForFunction(() => window.__ronda);
  await check(
    "purchased mounts persist and reload starts safely outside",
    () =>
      !__ronda.kopdes.active &&
      ["horse", "tractor", "mecha"].every((id) =>
        __ronda.state.data.mounts.includes(id),
      ),
  );
  assert.deepEqual(errors, []);
  console.log("PASS no browser or WebGL errors");
} finally {
  await browser.close();
}
