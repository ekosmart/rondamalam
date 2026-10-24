import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { purchaseAtKopdes } from "./kopdes-helper.mjs";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 850 } }),
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
  await page.evaluate(() => {
    const g = __ronda;
    g.renderer.setAnimationLoop(null);
    g.renderer.setPixelRatio(0.7);
    g.renderer.shadowMap.enabled = false;
    g.audio.setEnabled(false);
    g.weather.set("clear", false);
    g.state.data.time = 720;
    g.ui.close();
  });
  await check(
    "nine assets load with valid animated rig and rider seat",
    async () => {
      const { VEHICLE_MOUNTS } = await import("/src/vehicle-data.js");
      const { vehicleSeatWorld } = await import("/src/vehicle-assets.js");
      const THREE = await import("/node_modules/.vite/deps/three.js");
      const g = __ronda,
        d = g.state.data;
      window.vehicleDiagnostics = [];
      for (const m of VEHICLE_MOUNTS) {
        d.mounts.push(m.id);
        d.mount = m.id;
        g.equipMount();
        await g.bike.userData.ready;
        d.riding = true;
        Object.assign(d, { x: -65, z: -47 });
        g.updatePlayer(0);
        const r = g.bike.userData,
          seat = vehicleSeatWorld(g.bike),
          size = new THREE.Box3()
            .setFromObject(g.bike)
            .getSize(new THREE.Vector3());
        vehicleDiagnostics.push({
          id: m.id,
          size: size.toArray(),
          seat: seat?.toArray(),
          clips: Object.keys(r.vehicleKit?.clips || {}),
        });
        if (
          !r.vehicleLoaded ||
          r.assetError ||
          !seat ||
          !Number.isFinite(seat.y) ||
          size.y > 20
        )
          return false;
      }
      return true;
    },
  );
  await check('moving clips animate independent clones without moving actor roots',async()=>{
    const {VEHICLE_ASSETS,makeVehicleMount,animateVehicleMount,disposeVehicleMount}=await import('/src/vehicle-assets.js');
    for(const id of Object.keys(VEHICLE_ASSETS)){
      const a=makeVehicleMount(id),b=makeVehicleMount(id);await Promise.all([a.userData.ready,b.userData.ready]);
      const pose=m=>{const values=[];m.traverse(n=>values.push(...n.position.toArray(),...n.quaternion.toArray()));return values.join(',');};
      const before=pose(a),other=pose(b),position=a.position.clone();
      for(let i=0;i<25;i++)animateVehicleMount(a,i*.04,true);
      const ok=before!==pose(a)&&other===pose(b)&&a.position.equals(position)&&a.userData.vehicleClip===VEHICLE_ASSETS[id].drive;
      disposeVehicleMount(a);disposeVehicleMount(b);if(!ok)return false;
    }return true;
  });
  for (const id of [
    "egrang",
    "kereta-santa",
    "bajaj",
    "naga-sulong",
    "buaya-putih",
    "getek-bambu",
  ]) {
    await page.evaluate(async (id) => {
      const g = __ronda;
      g.state.data.mount = id;
      g.equipMount();
      await g.bike.userData.ready;
      g.state.data.riding = true;
      g.updatePlayer(0);
      g.world.update(0, 10, g.state, g.state.data);
      g.weather.render(0);
      g.ui.update(0.2);
      g.camera.position.set(-54, 9 + g.altitude, -34);
      g.camera.lookAt(-65, 2 + g.altitude, -47);
      g.renderer.render(g.scene, g.camera);
    }, id);
    await page.screenshot({ path: `artifacts/vehicle-${id}.png` });
  }
  await check("quest actors and objectives are reachable", async () => {
    const { vehicleCanMove } = await import("/src/vehicle-rules.js");
    const g = __ronda;
    return (
      g.vehicles.people.every((n) => g.world.canMove(n.x, n.z, 0.6)) &&
      g.vehicles.points.every((p) =>
        p.q.kind === "ward"
          ? vehicleCanMove(g.world, "getek-bambu", p.x, p.z)
          : g.world.canMove(p.x, p.z, 0.6),
      )
    );
  });
  await check(
    "E interaction detects every quest giver and journal exposes all waypoints",
    () => {
      const g = __ronda,
        d = g.state.data;
      g.altitude = 0;
      d.riding = false;
      for (const n of g.vehicles.people) {
        Object.assign(d, { x: n.x, z: n.z });
        g.findInteraction();
        if (
          g.interactable?.type !== "vehicle-npc" ||
          g.interactable.id !== n.id
        )
          return false;
      }
      g.ui.open("journal");
      const text = document.querySelector("#panel-content").textContent;
      g.ui.close();
      return ["Tujuh Bola Naga", "Narik Ojol", "Pak Rakit", "Nyai Tirta"].every(
        (s) => text.toLowerCase().includes(s.toLowerCase()),
      );
    },
  );
  await check(
    "all five quests require NPC acceptance and return to claim",
    async () => {
      const { freshVehicles } = await import("/src/vehicle-rules.js");
      const { VEHICLE_QUESTS } = await import("/src/vehicle-data.js");
      const g = __ronda,
        d = g.state.data;
      d.vehicles = freshVehicles();
      d.mounts = ["onthel"];
      d.riding = false;
      g.altitude = 0;
      for (const q of VEHICLE_QUESTS) {
        const n = g.vehicles.people.find((n) => n.id === q.id);
        Object.assign(d, { x: n.x, z: n.z });
        g.vehicles.showNpc(q.id);
        g.action("vehicle-accept", { id: q.id });
        if (!d.vehicles.quests[q.id]) return false;
        for (const p of g.vehicles.points.filter((p) => p.q.id === q.id)) {
          Object.assign(d, { x: p.x, z: p.z });
          d.riding = q.kind === "ward";
          if (d.riding) d.mount = "getek-bambu";
          g.vehicles.interact({
            type: "vehicle-point",
            id: q.id,
            index: p.index,
          });
        }
        if (d.mounts.includes(q.mount)) return false;
        d.riding = false;
        Object.assign(d, { x: n.x, z: n.z });
        g.vehicles.showNpc(q.id);
        g.action("vehicle-claim", { id: q.id });
        if (!d.mounts.includes(q.mount)) return false;
      }
      return d.vehicles.claimed.length === 5;
    },
  );
  await check(
    "Ojol requires eligible mount, carries passenger, pays exactly once",
    async () => {
      const g = __ronda,
        d = g.state.data,
        { ojolFare } = await import("/src/vehicle-rules.js");
      const n = g.vehicles.people.find((n) => n.id === "ojol");
      Object.assign(d, { x: n.x, z: n.z });
      d.riding = false;
      g.vehicles.showNpc("ojol");
      g.action("ojol-start");
      if (d.vehicles.job) return false;
      d.mounts.push("bajaj");
      g.vehicles.showNpc("ojol");
      g.action("ojol-start");
      if (!d.vehicles.job) return false;
      let p = g.vehicles.jobPoint();
      Object.assign(d, { x: p.x, z: p.z });
      g.vehicles.interact({ type: "vehicle-job" });
      if (d.vehicles.job.phase !== "pickup") return false;
      d.mount = "bajaj";
      g.equipMount();
      await g.bike.userData.ready;
      d.riding = true;
      g.updatePlayer(0);
      g.vehicles.interact({ type: "vehicle-job" });
      g.vehicles.update(0.1, 1);
      if (d.vehicles.job.phase !== "dropoff" || !g.vehicles.passenger.visible)
        return false;
      const pay = ojolFare(d.vehicles.job),
        before = d.coins;
      p = g.vehicles.jobPoint();
      Object.assign(d, { x: p.x, z: p.z });
      g.updatePlayer(0);
      g.vehicles.interact({ type: "vehicle-job" });
      g.vehicles.interact({ type: "vehicle-job" });
      return (
        d.coins === before + pay && d.vehicles.trips === 1 && !d.vehicles.job
      );
    },
  );
  await check(
    "getek launches on river and dismount returns player to land",
    async () => {
      const g = __ronda,
        d = g.state.data;
      d.mount = "getek-bambu";
      g.equipMount();
      await g.bike.userData.ready;
      d.riding = false;
      Object.assign(d, { x: 138, z: 52 });
      g.ui.close();
      g.action("mount");
      if (!d.riding || d.x !== 155) return false;
      g.action("mount");
      return !d.riding && g.world.canMove(d.x, d.z, 0.6);
    },
  );
  await check(
    "Sulong and Santa support altitude controls and safe landing",
    async () => {
      const g = __ronda,
        d = g.state.data;
      for (const id of ["kereta-santa", "naga-sulong"]) {
        d.riding = false;
        d.mount = id;
        g.equipMount();
        await g.bike.userData.ready;
        Object.assign(d, { x: -65, z: -47 });
        g.action("mount");
        if (!g.isFlying) return false;
        const before = g.cruiseAltitude;
        g.action("ascend");
        if (g.cruiseAltitude <= before) return false;
        g.action("descend");
        g.updatePlayer(0.1);
        g.action("mount");
        if (d.riding || g.altitude || !g.world.canMove(d.x, d.z)) return false;
      }
      return true;
    },
  );
  await check(
    "Buaya crosses river bank through actual movement, and attack dismount is safe",
    async () => {
      const g = __ronda,
        d = g.state.data;
      d.riding = false;
      d.mount = "buaya-putih";
      g.equipMount();
      await g.bike.userData.ready;
      Object.assign(d, { x: 138, z: 52 });
      d.riding = true;
      g.cameraYaw = 0;
      g.keys.add("KeyD");
      for (let i = 0; i < 100; i++) g.updatePlayer(0.016);
      g.keys.clear();
      if (d.x < 170) return false;
      Object.assign(d, { x: 155, z: 52 });
      g.cooldowns.attack = 0;
      g.attack();
      return !d.riding && g.world.canMove(d.x, d.z);
    },
  );
  await page.evaluate(() => {
    __ronda.state.data.mounts = ["onthel"];
    __ronda.state.data.coins = 10000;
  });
  for (const id of ["becak", "bajaj", "bemo", "oplet"]) {
    await purchaseAtKopdes(page, "mount", id);
    assert.ok(
      await page.evaluate((id) => __ronda.state.data.mounts.includes(id), id),
      id + " shop purchase",
    );
  }
  await check(
    "Kopdes displays only merchandise, four vehicle displays fit and prices deduct correctly",
    async () => {
      const g = __ronda;
      await Promise.all(g.kopdes.entries.map((e) => e.model?.userData.ready));
      return (
        g.state.data.coins === 7810 &&
        g.kopdes.entries
          .filter(
            (e) =>
              e.type === "mount" &&
              ["becak", "bajaj", "bemo", "oplet"].includes(e.def.id),
          )
          .every(
            (e) =>
              e.model.userData.vehicleLoaded &&
              g.kopdes.canWalk(e.x, e.z + 3.6),
          ) &&
        !g.kopdes.entries.some((e) => e.def.questOnly)
      );
    },
  );
  await check(
    "vehicle audio starts, switches voices and stops when muted",
    async () => {
      const g = __ronda;
      g.audio.setEnabled(true);
      g.audio.start();
      await g.audio.ctx.resume();
      for (const id of [
        "bajaj",
        "becak",
        "oplet",
        "bemo",
        "egrang",
        "kereta-santa",
        "naga-sulong",
        "getek-bambu",
        "buaya-putih",
      ]) {
        g.audio.vehicle.update(id, true);
        if (g.audio.vehicle.current?.id !== id) return false;
      }
      g.audio.setEnabled(false);
      return !g.audio.vehicle.current;
    },
  );
  assert.deepEqual(errors, []);
  console.log("PASS browser console clean");
} finally {
  await browser.close();
}
