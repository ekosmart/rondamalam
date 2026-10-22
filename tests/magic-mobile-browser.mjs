import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5176/?test=1");
  await page.waitForFunction(() => window.__ronda?.magic?.ready, {
    timeout: 60000,
  });
  await page.locator('[data-action="start"]').tap();
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
    m.frame(0.05, g.elapsed);
  });
  for (const [width, height] of [
    [390, 844],
    [320, 568],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => __ronda.magic.frame(0.05, __ronda.elapsed));
    assert.ok(
      await page.evaluate(() => {
        const h = document
            .querySelector("#magic-controls")
            .getBoundingClientRect(),
          joy = document
            .querySelector("#move-joystick")
            .getBoundingClientRect();
        const visible = [
          ...document.querySelectorAll("#magic-controls button"),
        ].every((b) => {
          const r = b.getBoundingClientRect();
          return (
            r.width >= 44 &&
            r.height >= 42 &&
            r.left >= 0 &&
            r.right <= innerWidth &&
            r.bottom <= innerHeight
          );
        });
        return visible && h.bottom <= joy.top;
      }),
      "controls fit and do not cover joystick",
    );
    await page.screenshot({ path: `artifacts/magic-mobile-${width}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const before = await page.evaluate(() => __ronda.magic.position.z);
  const joy = page.locator("#move-joystick");
  const box = await joy.boundingBox();
  await joy.dispatchEvent("pointerdown", {
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    clientX: box.x + box.width / 2,
    clientY: box.y + box.height / 2,
    button: 0,
    buttons: 1,
  });
  await joy.dispatchEvent("pointermove", {
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    clientX: box.x + box.width / 2,
    clientY: box.y + 10,
    button: 0,
    buttons: 1,
  });
  await page.evaluate(() => {
    for (let i = 0; i < 30; i++) __ronda.magic.frame(0.05, __ronda.elapsed);
  });
  await joy.dispatchEvent("pointerup", {
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    buttons: 0,
  });
  assert.ok(
    (await page.evaluate(() => __ronda.magic.position.z)) < before,
    "touch joystick moves avatar",
  );
  await page.locator('[data-action="magic-exit"]').tap();
  assert.equal(await page.evaluate(() => __ronda.magic.active), false);
  assert.deepEqual(errors, []);
  console.log(
    "PASS mobile 390 / 320 / landscape layout, touch movement and return button",
  );
} finally {
  await browser.close();
}
