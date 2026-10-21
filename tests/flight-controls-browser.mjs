import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 960 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    process.env.FLIGHT_TEST_URL || "http://127.0.0.1:5175/?test=1",
  );
  await page.waitForFunction(() => window.__ronda);
  await page.locator('[data-action="start"]').click();
  for (const mount of ["sembrani", "naga", "ufo", "mecha"]) {
    await page.evaluate((mount) => {
      const g = __ronda;
      Object.assign(g.state.data, {
        mount,
        riding: true,
        x: 20,
        z: 350,
        time: 540,
      });
      g.state.data.incidents.tech.mechaFlight = true;
      g.mechaAirborne = mount === "mecha";
      g.equipMount();
      g.altitude = g.cruiseAltitude = 30;
      g.weather.set("clear", false);
    }, mount);
    const up = page.locator('#flight-controls [data-action="ascend"]');
    await up.waitFor({ state: "visible" });
    await up.click();
    assert.ok((await page.evaluate(() => __ronda.cruiseAltitude)) >= 35);
    const before = await page.evaluate(() => __ronda.cruiseAltitude);
    const box = await up.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.evaluate(() => {
      for (let i = 0; i < 40; i++) __ronda.updatePlayer(0.025);
    });
    await page.mouse.up();
    assert.ok(
      (await page.evaluate(() => __ronda.cruiseAltitude)) > before + 10,
    );
    assert.equal(await page.evaluate(() => __ronda.flightInput), 0);
    await page.locator('#flight-controls [data-action="descend"]').click();
    await page.evaluate(() => {
      __ronda.cruiseAltitude = 80;
      __ronda.action("ascend");
    });
    assert.equal(await page.evaluate(() => __ronda.cruiseAltitude), 80);
    await page.evaluate(() => {
      __ronda.cruiseAltitude = 8;
      __ronda.action("descend");
    });
    assert.equal(await page.evaluate(() => __ronda.cruiseAltitude), 8);
    console.log("PASS click, hold, release and height limits:", mount);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  assert.ok(
    await page.evaluate(() => {
      const b = document
        .querySelector('#flight-controls [data-action="ascend"]')
        .getBoundingClientRect();
      return (
        document
          .elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
          ?.closest("#flight-controls") &&
        b.right <= innerWidth &&
        b.bottom <= innerHeight
      );
    }),
    "mobile altitude buttons remain above coastal HUD",
  );
  const touchButton = await page.locator('#flight-controls [data-action="ascend"]').boundingBox();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {type:"touchStart",touchPoints:[{x:touchButton.x+30,y:touchButton.y+20}]});
  assert.equal(await page.evaluate(() => __ronda.flightInput), 1);
  await cdp.send("Input.dispatchTouchEvent", {type:"touchCancel",touchPoints:[]});
  await cdp.detach();
  assert.equal(await page.evaluate(() => __ronda.flightInput), 0);
  await mkdir("tmp/screenshots", { recursive: true });
  await page.screenshot({ path: "tmp/screenshots/flight-controls-mobile.png" });
  await page.evaluate(() => {
    __ronda.state.data.riding = false;
    __ronda.flightInput = 0;
  });
  await page.locator("#flight-controls").waitFor({ state: "hidden" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS mobile visibility, cancelled touch, and hidden controls when dismounted",
  );
} finally {
  await browser.close();
}
