import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    process.env.COAST_TEST_URL || "http://127.0.0.1:5176/?test=1",
  );
  await page.waitForFunction(() => window.__ronda);
  await page.locator('[data-action="start"]').click();
  const report = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { buildCoastWorld } = await import("/src/coast-world.js");
    const { ROADS, rectanglesOverlap } = await import("/src/layout.js");
    const { DOCKS } = await import("/src/coast-rules.js");
    const { DOCK_HEIGHT, COAST_PIERS, CAPTAIN, WARUNG } =
      await import("/src/coast-layout.js");
    const scene = new THREE.Scene(),
      staticGroup = new THREE.Group();
    scene.add(staticGroup);
    const fixture = {
      scene,
      static: staticGroup,
      water: [],
      colliders: [],
      flightObstacles: [],
    };
    const coast = buildCoastWorld(fixture);
    scene.updateMatrixWorld(true);
    const footprint = (o) => {
      const b = new THREE.Box3().setFromObject(o),
        c = b.getCenter(new THREE.Vector3()),
        s = b.getSize(new THREE.Vector3());
      return { x: c.x, z: c.z, w: s.x, d: s.z };
    };
    const roofs = [...coast.houses, coast.auction].map(footprint);
    const overlaps = roofs.flatMap((b, i) =>
      ROADS.filter((r) => rectanglesOverlap(b, r, 1)).map((r) => ({
        building: i,
        road: r,
      })),
    );
    // Scan rendered geometry too: backdrop hills and small roadside props had no colliders.
    const g = __ronda;
    g.state.data.time = 9 * 60;
    g.weather.set("clear", false);
    g.ui.panel = "layout-test";
    g.scene.updateMatrixWorld(true);
    const solids = g.scene.children.filter(
      (o) => o.isMesh && o.material?.depthWrite && !o.material?.transparent,
    );
    const ray = new THREE.Raycaster(),
      blocked = [];
    for (const [ax, az, bx, bz] of [
      [20, 278, 20, 460],
      [20, 330, 84, 330],
      [-35, 351, 20, 351],
      [-35, 400, 20, 400],
    ]) {
      for (const height of [1, 2, 3]) {
        const delta = new THREE.Vector3(bx - ax, 0, bz - az);
        ray.far = delta.length();
        ray.set(new THREE.Vector3(ax, height, az), delta.normalize());
        if (ray.intersectObjects(solids, false).length)
          blocked.push({ ax, az, bx, bz, height });
      }
    }
    const unwalkable = [];
    for (let z = 278; z <= 460; z += 0.5)
      for (const x of [18, 20, 22])
        if (!g.world.canMove(x, z)) unwalkable.push([x, z]);
    for (let x = 20; x <= 84; x += 0.5)
      if (!g.world.canMove(x, 330)) unwalkable.push([x, 330]);
    const deckChecks = COAST_PIERS.map((p, i) => {
      const top = new THREE.Box3().setFromObject(coast.decks[i]).max.y;
      let largestWave = -Infinity;
      for (let t = 0; t < 12; t += 0.25) {
        g.world.livingWater.update(t, 1);
        const water = g.world.coast.sea,
          pos = water.geometry.attributes.position;
        for (let v = 0; v < pos.count; v++)
          largestWave = Math.max(largestWave, water.position.y - pos.getZ(v));
      }
      const samples = [];
      for (
        let x = Math.min(p.rampStart, p.x - p.width / 2);
        x <= Math.max(p.rampEnd, p.x + p.width / 2);
        x += 0.25
      ) {
        g.state.data.x = x;
        g.state.data.z = p.z;
        g.state.data.riding = false;
        g.updatePlayer(0);
        ray.far = 5;
        ray.set(new THREE.Vector3(x, 3, p.z), new THREE.Vector3(0, -1, 0));
        const hit = ray.intersectObject(staticGroup, true)[0];
        samples.push(
          !!hit && Math.abs(g.player.position.y - hit.point.y) < 0.04,
        );
      }
      return { top, largestWave, followSurface: samples.every(Boolean) };
    });
    const boatVisible = DOCKS.every((d) => {
      const origin = new THREE.Vector3(d.x, 2, d.z),
        target = new THREE.Vector3(d.boatX, 1.5, d.boatZ);
      ray.far = origin.distanceTo(target);
      ray.set(origin, target.sub(origin).normalize());
      return ray.intersectObjects(solids, false).length === 0;
    });
    Object.assign(g.state.data, { x: CAPTAIN.x, z: CAPTAIN.z });
    g.findInteraction();
    const captain = g.interactable?.type === "coast-captain";
    Object.assign(g.state.data, { x: WARUNG.x, z: WARUNG.z });
    g.findInteraction();
    const warung = g.interactable?.type === "coast-warung";
    return {
      overlaps,
      blocked,
      unwalkable,
      deckChecks,
      boatVisible,
      captain,
      warung,
      DOCK_HEIGHT,
    };
  });
  assert.deepEqual(
    report.overlaps,
    [],
    "house stairs and market roofs must leave road margins clear",
  );
  assert.deepEqual(
    report.blocked,
    [],
    "rendered scenery must not block the approach or pier access",
  );
  assert.deepEqual(
    report.unwalkable,
    [],
    "main road and pier must be walkable along their length",
  );
  assert.ok(
    report.deckChecks.every(
      (d) =>
        Math.abs(d.top - report.DOCK_HEIGHT) < 0.001 &&
        d.top > d.largestWave + 0.25 &&
        d.followSurface,
    ),
    JSON.stringify(report.deckChecks),
  );
  assert.ok(
    report.boatVisible && report.captain && report.warung,
    JSON.stringify(report),
  );
  console.log(
    "PASS road footprints, rendered obstructions, continuous access, dry raised decks, ramp footing and relocated NPCs",
  );
  await mkdir("tmp/screenshots", { recursive: true });
  for (const view of [
    {
      name: "coast-clear-road",
      x: 20,
      z: 300,
      yaw: Math.PI,
      distance: 30,
      pitch: 0.45,
    },
    {
      name: "coast-dry-dock",
      x: 79,
      z: 330,
      yaw: -1.15,
      distance: 22,
      pitch: 0.55,
    },
  ]) {
    await page.evaluate((v) => {
      const g = __ronda;
      Object.assign(g.state.data, { x: v.x, z: v.z, riding: false });
      Object.assign(g.state.data.coast, { started: true, lighthouse: true });
      g.cameraYaw = v.yaw;
      g.cameraPitch = v.pitch;
      g.cameraDistance = v.distance;
      g.updatePlayer(0);
      g.findInteraction();
      g.coast.update(1, g.elapsed);
      g.world.update(0, g.elapsed, g.state, g.player);
      g.updateCamera(1);
      document.querySelector("#area-banner").style.display = "none";
      document.querySelector("#first-tip").style.display = "none";
      document.querySelector("#toast").classList.remove("show");
    }, view);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `tmp/screenshots/${view.name}.png` });
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
