import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
// Isolated production server: never changes the user's running 4173 tab or service worker.
const assets = new Map();
async function read(dir) {
  for (const f of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) await read(p);
    else
      assets.set(
        "/" + path.relative("dist", p).replaceAll("\\", "/"),
        await fs.readFile(p),
      );
  }
}
await read("dist");
let revision = 0;
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".wav": "audio/wav",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
const server = http.createServer((req, res) => {
  let p = new URL(req.url, "http://localhost").pathname;
  if (p === "/") p = "/index.html";
  let bytes = assets.get(p);
  if (!bytes) {
    res.writeHead(404);
    res.end();
    return;
  }
  if (p === "/sw.js")
    bytes = Buffer.concat([
      bytes,
      Buffer.from(`\n// Test revision ${revision}`),
    ]);
  res.writeHead(200, {
    "Content-Type": types[path.extname(p)] || "application/json",
    "Cache-Control": "no-store",
  });
  res.end(bytes);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  }),
  p = await context.newPage(),
  errors = [],
  checks = [];
p.on("pageerror", (e) => errors.push(e.message));
const check = (name, ok) => {
  assert.ok(ok, name);
  checks.push(name);
  console.log("PASS", name);
};
try {
  await p.goto(base);
  await p.locator("[data-action=start]").waitFor();
  await p.waitForFunction(
    async () => !!(await navigator.serviceWorker.getRegistration())?.active,
  );
  await p.waitForFunction(() => !!navigator.serviceWorker.controller);
  check(
    "production excludes development harness",
    await p.evaluate(() => !window.__ronda),
  );
  const manifest = await (
    await p.request.get(base + "/manifest.webmanifest")
  ).json();
  check(
    "manifest has identity, landscape, scope and standalone launch",
    manifest.id === "/" &&
      manifest.scope === "/" &&
      manifest.start_url === "/?source=pwa" &&
      manifest.display === "standalone" &&
      manifest.orientation === "landscape" &&
      manifest.lang === "id",
  );
  check(
    "regular and maskable icons are actual PNGs in declared sizes",
    manifest.icons.every((i) => {
      const b = assets.get(i.src),
        size = Number(i.sizes.split("x")[0]);
      return b && b.readUInt32BE(16) === size && b.readUInt32BE(20) === size;
    }) && manifest.icons.some((i) => i.purpose === "maskable"),
  );
  check(
    "all generated offline assets are cached",
    await p.evaluate(async () => {
      const keys = await caches.keys(),
        c = await caches.open(keys.find((k) => k.startsWith("ronda-static-"))),
        urls = (await c.keys()).map((r) => new URL(r.url).pathname);
      return (
        urls.includes("/index.html") &&
        urls.includes("/privacy.html") &&
        urls.includes("/audio/mancing-mania.wav") &&
        urls.includes("/manifest.webmanifest") &&
        urls.some((u) => u.endsWith(".woff2")) &&
        urls.some((u) => u.includes("/assets/three-"))
      );
    }),
  );
  await p.locator("[data-action=start]").click();
  await p.keyboard.press("Escape");
  check(
    "settings expose install, update, transfer and fullscreen actions",
    (await p.locator("[data-action^=pwa-]").count()) === 5,
  );
  const exported = p.waitForEvent("download");
  await p.locator("[data-action=pwa-export]").click();
  const file = await exported;
  const json = JSON.parse(await fs.readFile(await file.path(), "utf8"));
  check(
    "save export creates portable JSON with game identity",
    json.game === "ronda-malam" &&
      json.state.version === 1 &&
      json.state.weapons.includes("kentongan"),
  );
  const key = await p.evaluate(() =>
    Object.keys(localStorage).find((k) => k.includes("ronda")),
  );
  await context.setOffline(true);
  await p.reload();
  await p.locator("[data-action=start]").waitFor({ timeout: 30000 });
  await p.locator("[data-action=start]").click();
  check(
    "offline reload renders the 3D game and preserves save",
    await p.evaluate(
      (k) =>
        document.querySelector("#game canvas")?.width > 0 &&
        JSON.parse(localStorage.getItem(k)).coins === 160,
      key,
    ),
  );
  check(
    "Indonesian fishing cheer decodes from the offline PWA cache",
    await p.evaluate(async () => {
      const response = await fetch("/audio/mancing-mania.wav");
      const ctx = new AudioContext();
      const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
      const valid = response.ok && buffer.duration > 1 && buffer.duration < 8;
      await ctx.close();
      return valid;
    }),
  );
  const privacy = await context.newPage();
  await privacy.goto(base + "/privacy.html");
  check(
    "privacy page also works offline",
    (await privacy.locator("h1").textContent()) === "Privasi Ronda Malam",
  );
  await privacy.close();
  const updatePageOrigin = await p.evaluate(() => performance.timeOrigin);
  await context.setOffline(false);
  revision++;
  await p.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    await r.update();
  });
  await p.waitForFunction(
    async () =>
      !!(await navigator.serviceWorker.getRegistration())?.waiting &&
      !document.querySelector("#hud").classList.contains("hidden"),
  );
  check(
    "update waits for player instead of interrupting game",
    await p.evaluate(
      (origin) =>
        performance.timeOrigin === origin &&
        !document.querySelector("#hud").classList.contains("hidden"),
      updatePageOrigin,
    ),
  );
  await p.keyboard.press("Escape");
  await p.locator("[data-action=pwa-update]").click();
  await p.waitForURL(base + "/", { waitUntil: "domcontentloaded" });
  await p.waitForFunction(
    async () => !(await navigator.serviceWorker.getRegistration())?.waiting,
  );
  await p.locator("[data-action=start]").waitFor();
  check(
    "explicit update reloads safely and retains player coins",
    await p.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).coins === 160,
      key,
    ),
  );
  await p.locator("[data-action=start]").click();
  await p.keyboard.press("Escape");
  const old = p.waitForEvent("download");
  await p.locator("input[type=file]").setInputFiles({
    name: "progress.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ ...json, state: { ...json.state, coins: 654 } }),
    ),
  });
  await old;
  await p.waitForFunction(
    (k) => JSON.parse(localStorage.getItem(k)).coins === 654,
    key,
  );
  await p.locator("[data-action=start]").waitFor();
  check(
    "import replaces progress and exports previous save first",
    await p.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).coins === 654,
      key,
    ),
  );
  const mobile = await browser.newContext({
      viewport: { width: 844, height: 390 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    }),
    m = await mobile.newPage();
  m.on("pageerror", (e) => errors.push(e.message));
  await m.goto(base);
  await m.locator("[data-action=start]").click();
  const arrow = await m.locator("#move-joystick").boundingBox();
  check(
    "landscape phone exposes the analog joystick inside the viewport",
    arrow && arrow.x >= 0 && arrow.y >= 0 && arrow.y + arrow.height <= 390,
  );
  const touch = await mobile.newCDPSession(m);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: arrow.x + arrow.width / 2, y: arrow.y + arrow.height / 2 - 43 },
    ],
  });
  await m.waitForTimeout(700);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await m.getByRole("button", { name: "Pengaturan", exact: true }).click();
  await m.locator("[data-action=save]").click();
  check(
    "holding the analog joystick moves Hansip in the production game",
    await m.evaluate(() => {
      const k = Object.keys(localStorage).find((k) => k.includes("ronda"));
      return JSON.parse(localStorage.getItem(k)).z < 11.5;
    }),
  );
  check(
    "landscape touch settings are scrollable without horizontal overflow",
    await m.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth + 1 &&
        getComputedStyle(document.querySelector("#panel-content")).overflowY !==
          "visible",
    ),
  );
  await m.locator("[data-action=close]").click();
  await fs.mkdir("tmp/screenshots", { recursive: true });
  await m.screenshot({ path: "tmp/screenshots/pwa-landscape.png" });
  await mobile.close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: checks.length, errors }));
} finally {
  await browser.close();
  server.close();
}
