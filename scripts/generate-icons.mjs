import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const svg = await fs.readFile("public/icons/icon.svg", "utf8");
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
  headless: true,
});
try {
  const page = await browser.newPage();
  for (const [name, size, mask] of [
    ["icon-192", 192, false],
    ["icon-512", 512, false],
    ["apple-touch-icon", 180, false],
    ["maskable-512", 512, true],
  ]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<html><body style="margin:0;background:#131b19;display:grid;place-items:center;width:100vw;height:100vh">${svg.replace('width="512" height="512"', `width="${size * (mask ? 0.78 : 1)}" height="${size * (mask ? 0.78 : 1)}"`)}</body></html>`,
    );
    await page.screenshot({ path: `public/icons/${name}.png` });
  }
} finally {
  await browser.close();
}
