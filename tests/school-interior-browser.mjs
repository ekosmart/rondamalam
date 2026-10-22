import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 960 },
  hasTouch: true,
});
const errors = [];
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
  await page.waitForFunction(() => window.__ronda?.magic?.ready, {
    timeout: 60000,
  });
  await page.locator('[data-action="start"]').click();
  await page.evaluate(() => {
    const g = __ronda,
      m = g.magic;
    g.renderer.setAnimationLoop(null);
    Object.assign(m.s, {
      accepted: true,
      stationAccepted: true,
      ticket: true,
      bookSolved: true,
    });
    Object.assign(g.state.data, { x: -167, z: 252, time: 1320 });
    m.trainTime = 4;
    m.pushing = true;
    m.world.trolley.position.set(-167, 0, 251);
    m.enter();
    m.position.set(0, 0, -16);
  });
  await page.keyboard.press("e");
  await check(
    "school door opens interior with E",
    () =>
      __ronda.magic.insideSchool &&
      document.body.classList.contains("inside-school"),
  );
  await page.evaluate(() => __ronda.magic.frame(0.05, 1));
  await page.screenshot({ path: "artifacts/school-aula.png" });
  console.log(
    "Scene stats",
    await page.evaluate(() => ({
      calls: __ronda.renderer.info.render.calls,
      triangles: __ronda.renderer.info.render.triangles,
      rooms: __ronda.magic.school.model.ROOMS.length,
    })),
  );
  await check("spawn clear and camera inside room", () => {
    const s = __ronda.magic.school;
    return (
      s.canWalk(s.position.x, s.position.z) && s.camera.position.y === 1.68
    );
  });
  await check("movement follows first-person camera", () => {
    const g = __ronda,
      s = g.magic.school,
      x = s.position.x;
    g.cameraYaw = Math.PI / 2;
    g.keys.add("KeyW");
    s.frame(0.1, 1);
    g.keys.clear();
    g.cameraYaw = 0;
    const ok = s.position.x < x - 0.3;
    s.position.set(0, 0, 12.5);
    return ok;
  });
  // Flood-fill the real collision map; every exhibit must be reachable from
  // the entrance. Follow the resulting paths with the actual movement method.
  const reach = await page.evaluate(() => {
    const s = __ronda.magic.school,
      key = (x, z) => `${x},${z}`;
    const q = [[0, 12.5]],
      seen = new Map([[key(0, 12.5), null]]);
    for (let i = 0; i < q.length; i++) {
      const [x, z] = q[i];
      for (const [dx, dz] of [
        [0.5, 0],
        [-0.5, 0],
        [0, 0.5],
        [0, -0.5],
      ]) {
        const nx = x + dx,
          nz = z + dz,
          k = key(nx, nz);
        if (
          !seen.has(k) &&
          s.canWalk(nx, nz) &&
          s.canWalk(x + dx / 2, z + dz / 2)
        ) {
          seen.set(k, [x, z]);
          q.push([nx, nz]);
        }
      }
    }
    window.schoolRoutes = {};
    const results = s.model.INT.map((item) => {
      const candidates = q
        .filter(([x, z]) => Math.hypot(x - item.p.x, z - item.p.z) < item.r)
        .sort(
          (a, b) =>
            Math.hypot(a[0] - item.p.x, a[1] - item.p.z) -
            Math.hypot(b[0] - item.p.x, b[1] - item.p.z),
        );
      const target = candidates.find(([x, z]) => {
        s.position.set(x, 0, z);
        return s.nearby() === item;
      });
      if (target) {
        const path = [target];
        let prev = seen.get(key(...target));
        while (prev) {
          path.unshift(prev);
          prev = seen.get(key(...prev));
        }
        window.schoolRoutes[item.label] = path;
      }
      return { label: item.label, reachable: !!target };
    });
    const rooms = s.model.ROOMS.map((r) => ({
      name: r.n,
      reachable: q.some(
        ([x, z]) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1,
      ),
    }));
    s.position.set(0, 0, 12.5);
    return { exhibits: results, rooms };
  });
  console.log(JSON.stringify(reach));
  assert.ok(
    reach.rooms.every((r) => r.reachable),
    "all seven rooms/corridors reachable",
  );
  assert.ok(
    reach.exhibits.every((r) => r.reachable),
    "all exhibits reachable without walking through furniture",
  );
  for (const label of [
    "Buku Mantra",
    "Ramuan Penawar",
    "Sumur halaman dalam",
  ]) {
    await page.evaluate((label) => {
      const g = __ronda,
        s = g.magic.school,
        path = window.schoolRoutes[label];
      if (!path) throw new Error(`Missing route ${label}`);
      s.position.set(0, 0, 12.5);
      for (const [x, z] of path.slice(1))
        s.move(x - s.position.x, z - s.position.z, 1 / 3.2);
      const item = s.nearby();
      if (item?.label !== label)
        throw new Error(`Route ended at ${item?.label}`);
      g.cameraYaw = Math.atan2(
        s.position.x - item.p.x,
        s.position.z - item.p.z,
      );
      s.frame(0.05, 3);
    }, label);
    await page.screenshot({
      path: `artifacts/school-${label.split(" ")[0].toLowerCase()}.png`,
    });
    await page.keyboard.press("e");
    await check(
      `inspect ${label} opens dialogue`,
      () => __ronda.ui.panel === "dialogue",
    );
    await page.locator('[data-action="close"]').first().click();
  }
  await check(
    "interior exhibits do not skip professor quest or grant rewards",
    () => !__ronda.magic.s.trialAccepted && !__ronda.magic.s.completed,
  );
  await check("walls block long movement and outside is invalid", () => {
    const s = __ronda.magic.school;
    s.position.set(0, 0, 12.5);
    s.move(1, 0, 10);
    return s.position.x < 12 && !s.canWalk(50, 0) && !s.canWalk(0, -50);
  });
  for (const [width, height] of [
    [390, 844],
    [320, 568],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await page.evaluate(() => {
      __ronda.cameraYaw = 0;
      __ronda.magic.school.position.set(0, 0, 12.5);
      __ronda.magic.frame(0.05, 3);
    });
    await check(`touch controls fit ${width}x${height}`, () => {
      const h = document
          .querySelector("#magic-controls")
          .getBoundingClientRect(),
        joy = document.querySelector("#move-joystick").getBoundingClientRect();
      return (
        h.bottom <= joy.top &&
        [...document.querySelectorAll("#magic-controls button")].every((b) => {
          const r = b.getBoundingClientRect();
          return (
            r.width >= 44 &&
            r.height >= 42 &&
            r.left >= 0 &&
            r.right <= innerWidth &&
            r.bottom <= innerHeight
          );
        })
      );
    });
    await page.screenshot({ path: `artifacts/school-mobile-${width}.png` });
  }
  const joy = page.locator("#move-joystick");
  const box = await joy.boundingBox();
  const touch = {
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    buttons: 1,
  };
  await joy.dispatchEvent("pointerdown", {
    ...touch,
    clientX: box.x + box.width / 2,
    clientY: box.y + box.height / 2,
  });
  await joy.dispatchEvent("pointermove", {
    ...touch,
    clientX: box.x + box.width / 2,
    clientY: box.y + 8,
  });
  await check("touch joystick moves inside school", () => {
    const s = __ronda.magic.school,
      before = s.position.z;
    for (let i = 0; i < 10; i++) s.frame(0.05, 4);
    return s.position.z < before - 0.5;
  });
  await joy.dispatchEvent("pointerup", { ...touch, buttons: 0 });
  await check("joystick release stops movement", () => {
    const s = __ronda.magic.school,
      before = s.position.clone();
    s.frame(0.1, 4);
    return before.distanceTo(s.position) < 0.001;
  });
  await page.locator('[data-action="school-exit"]').click();
  await check(
    "return button restores courtyard",
    () =>
      __ronda.magic.active &&
      !__ronda.magic.insideSchool &&
      __ronda.magic.position.z === -13,
  );
  await page.evaluate(() => {
    __ronda.magic.position.set(0, 0, -16);
    __ronda.action("interact");
    __ronda.magic.school.position.set(0, 0, 16);
  });
  await page.keyboard.press("e");
  await check(
    "front door also returns to courtyard",
    () => !__ronda.magic.insideSchool && __ronda.magic.active,
  );
  await page.evaluate(() => {
    __ronda.magic.position.set(0, 0, -16);
    __ronda.action("interact");
  });
  await page.locator('[data-action="magic-exit"]').click();
  await check(
    "direct station return clears interior and restores village",
    () =>
      !__ronda.magic.active &&
      !__ronda.magic.insideSchool &&
      !document.body.classList.contains("inside-school") &&
      __ronda.state.data.z === 263,
  );
  await page.evaluate(() => {
    const g = __ronda,
      m = g.magic;
    Object.assign(g.state.data, { x: -167, z: 252, time: 1320 });
    m.trainTime = 4;
    m.pushing = true;
    m.world.trolley.position.set(-167, 0, 251);
    if (!m.enter()) throw new Error("Could not revisit academy");
    m.position.set(0, 0, -16);
    g.action("interact");
    if (!m.insideSchool) throw new Error("Could not revisit interior");
    m.school.position.set(0, 0, -30);
    g.state.save();
  });
  await page.reload();
  await page.waitForFunction(() => window.__ronda?.magic?.ready, {
    timeout: 60000,
  });
  await check(
    "reload preserves safe station location and quest",
    () =>
      !__ronda.magic.active &&
      __ronda.state.data.z === 263 &&
      __ronda.magic.s.ticket,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS interior integration, collision, exhibits, mobile layout, exits and save",
  );
} finally {
  await browser.close();
}
