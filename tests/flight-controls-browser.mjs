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
  for (const mount of ["sembrani", "naga", "ufo", "mecha", "sapu"]) {
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
  for (const [width, height] of [[1440, 960], [390, 844], [360, 640], [320, 568], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    assert.ok(await page.evaluate(() => {
      const controls = document.querySelector('#flight-controls');
      const box = controls.getBoundingClientRect();
      const overlaps = other => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top;
      return controls.textContent.trim() === '' && controls.querySelectorAll('button svg').length === 2
        && box.width <= 104 && box.height <= 48 && box.left >= 0 && box.bottom <= innerHeight
        && [...controls.querySelectorAll('button')].every(b => b.getBoundingClientRect().width >= 44)
        && ['.map-hud', '.skills', '.mobile-pad > button:last-child'].every(selector => {
          const el = document.querySelector(selector), b = el.getBoundingClientRect();
          return !b.width || !b.height || !overlaps(b);
        });
    }), `icon controls stay compact and clear of map/actions at ${width}x${height}`);
    console.log('PASS compact icons without overlap:', width, height);
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
