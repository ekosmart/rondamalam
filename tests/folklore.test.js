import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Box3, Vector3 } from "three";
import { GHOSTS } from "../src/data.js";
import {
  FOLKLORE_IDS,
  makeFolkloreGhost,
  animateFolkloreGhost,
} from "../src/folklore-models.js";
import { synthesizeGhostVoice, GHOST_VOICES } from "../src/ghost-audio.js";
import { GHOST_ASSETS } from "../src/ghost-assets.js";

test("supplied ghost binaries retain their source checksums and have roster entries", () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL("../assets/source/ghosts/manifest.json", import.meta.url),
    ),
  );
  for (const [id, cfg] of Object.entries(GHOST_ASSETS)) {
    assert.equal(GHOSTS.filter((g) => g.id === id).length, 1);
    const glb = readFileSync(
      new URL(`../public/models/ghosts/${cfg.file}.glb`, import.meta.url),
    );
    assert.equal(glb.subarray(0, 4).toString(), "glTF");
    assert.equal(glb.readUInt32LE(8), glb.length);
    assert.equal(
      createHash("sha256").update(glb).digest("hex"),
      manifest[`${cfg.file}.glb`],
    );
  }
});

test("folklore silhouettes stay low poly and animate without moving world position", () => {
  const sizes = {};
  for (const id of FOLKLORE_IDS) {
    const m = makeFolkloreGhost(GHOSTS.find((g) => g.id === id));
    let triangles = 0,
      meshes = 0;
    m.traverse((o) => {
      if (o.isMesh) {
        meshes++;
        triangles +=
          (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
      }
    });
    assert.ok(
      triangles < 6000 && meshes <= 20,
      `${id}: ${triangles} triangles, ${meshes} meshes`,
    );
    sizes[id] = new Box3().setFromObject(m).getSize(new Vector3());
    animateFolkloreGhost(m, 1, { moving: true, attack: 0.5, hit: 0.1 });
    assert.ok(m.userData.body.rotation.x < 0);
    assert.equal(m.position.length(), 0);
    animateFolkloreGhost(m, 2, { moving: false });
    assert.equal(m.userData.body.rotation.x, 0);
    if (id === "pocong") assert.ok(m.userData.body.position.y !== 0);
    if (id === "kuntilanak") assert.ok(m.userData.hair.length >= 8);
    if (id === "genderuwo") assert.equal(m.userData.legs.length, 2);
  }
  assert.ok(sizes.genderuwo.y > sizes.kuntilanak.y);
  assert.ok(sizes.genderuwo.x > sizes.pocong.x * 1.5);
});
test("all almanac portraits and three portable models are valid binary assets", () => {
  for (const g of GHOSTS) {
    const png = readFileSync(
      new URL(`../public/portraits/${g.id}.png`, import.meta.url),
    );
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), 384);
    assert.equal(png.readUInt32BE(20), 480);
  }
  for (const id of FOLKLORE_IDS) {
    const glb = readFileSync(
      new URL(`../public/models/folklore/${id}.glb`, import.meta.url),
    );
    assert.equal(glb.subarray(0, 4).toString(), "glTF");
    assert.equal(glb.readUInt32LE(8), glb.length);
  }
});
test("synthesized voices are distinct, finite, audible, bounded and decay to silence", () => {
  const signatures = new Set();
  for (const id of GHOST_VOICES)
    for (const event of ["idle", "attack", "capture"]) {
      const samples = synthesizeGhostVoice(id, 22050, event);
      assert.ok(samples.length >= 14332);
      assert.ok(
        samples.every((x) => Number.isFinite(x) && Math.abs(x) <= 0.85),
      );
      const rms = Math.sqrt(
        samples.reduce((sum, x) => sum + x * x, 0) / samples.length,
      );
      assert.ok(rms > 0.025 && rms < 0.5, `${id}:${event} RMS ${rms}`);
      assert.ok(Math.abs(samples.at(-1)) < 0.001);
      signatures.add(samples.slice(1000, 1010).join(","));
    }
  assert.equal(signatures.size, GHOST_VOICES.size * 3);
  assert.equal(synthesizeGhostVoice("unknown").length, 0);
});
