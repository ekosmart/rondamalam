import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [], checks = [];
p.on('pageerror', e => errors.push(e.message));
const check = async (name, fn, page = p) => { const result = await page.evaluate(fn); assert.ok(result, name); checks.push(name); console.log('PASS', name); };
const boot = async page => {
  await page.goto('http://127.0.0.1:5173/?test=1'); await page.waitForFunction(() => window.__ronda);
  await page.locator('[data-action=start]').click();
  await page.evaluate(() => { __ronda.renderer.setAnimationLoop(null); __ronda.audio.setEnabled(false); });
};
try {
  await boot(p);
  await check('weather changes at dawn and dusk only, including crossing midnight', () => {
    const g = __ronda; g.state.data.time = 720; g.weather.set('cloudy', false);
    for (let i = 0; i < 300; i++) g.weather.update(1);
    if (g.weather.data.type !== 'cloudy') return false;
    let changes = 0;
    for (let i = 0; i < 720; i++) {
      const prev = g.weather.data.type, transition = g.state.advance(1);
      g.weather.update(0.001);
      if (prev !== g.weather.data.type) { changes++; if (!['dawn', 'dusk'].includes(transition)) return false; }
    }
    return changes === 2;
  });
  await check('tornado roams unaided, destroys several houses and moves beyond injured victims', () => {
    const g = __ronda; g.state.data.time = 1200; g.life.update(0, 0); g.updateEnemies(0); g.weather.set('tornado', false);
    const start = g.weather.tornado.position.clone(); let traveled = 0;
    for (let i = 0; i < 1200; i++) { const prev = g.weather.tornado.position.clone(); g.weather.update(0.1); traveled += prev.distanceTo(g.weather.tornado.position); }
    const destroyed = g.world.houses.filter(h => (g.incidents.data.houses[h.id] ?? 100) <= 0);
    return traveled > 160 && start.distanceTo(g.weather.tornado.position) > 20 && destroyed.length >= 3 && destroyed.every(h => !h.group.visible && h.rubble.visible && h.collider.disabled);
  });
  await check('buildings, bamboo, palms and banyan physically collapse without deleting neighbouring batches', () => {
    const g = __ronda, w = g.weather;
    for (const kind of ['building', 'bamboo', 'palm', 'banyan']) {
      const t = w.staticTargets.find(t => kind === 'building' ? t.ref.id === 'farm' : t.kind === 'tree' && t.ref[kind]);
      w.damage(t, 200);
      const span = t.ref.damageSpans[0];
      if (!t.ref.ruined || !span || span.geometry.attributes.position.getY(span.start) > 2 || t.ref.group.visible) return false;
      if (!t.ref.damageColliders.every(c => c.disabled)) return false;
    }
    return g.world.buildingFootprints.some(b => b.id !== 'house' && !b.ruined && b.group.visible);
  });
  await check('tornado flattens corn, wheat and rice; dawn restores geometry and collision', () => {
    const g = __ronda;
    for (const t of g.weather.staticTargets.filter(t => ['crop', 'field'].includes(t.kind))) g.weather.damage(t, 150);
    const fields = g.world.frontier.fields;
    if (!fields.every(f => f.ruined && f.stem.instanceMatrix.array[13] < 0.1)) return false;
    g.weather.restoreMorning(); g.incidents.data.houses = {}; g.incidents.updateHouses();
    return fields.every(f => !f.ruined && f.stem.instanceMatrix.array[13] > 0.3) && g.world.damage.entries.every(e => !e.ruined && (!e.group || e.group.visible) && e.damageColliders.every(c => !c.disabled));
  });
  await check('weather phase, tornado position and building damage survive save reload preparation', () => {
    const g = __ronda; g.weather.set('tornado', false); g.weather.update(2);
    const t = g.weather.staticTargets.find(t => t.ref.id === 'farm'); g.weather.damage(t, 200);
    g.state.save(); window.savedWeather = JSON.stringify(g.weather.data); return !!g.weather.data.tornadoPosition;
  });
  const saved = await p.evaluate(() => JSON.parse(window.savedWeather));
  await p.reload(); await p.waitForFunction(() => window.__ronda);
  await p.evaluate(() => __ronda.renderer.setAnimationLoop(null));
  const restored = await p.evaluate(() => ({ phase: __ronda.weather.data.phase, index: __ronda.weather.data.index, pos: __ronda.weather.tornado.position.toArray(), ruined: __ronda.world.buildingFootprints.find(b => b.id === 'farm').ruined }));
  assert.equal(restored.phase, saved.phase); assert.equal(restored.index, saved.index); assert.equal(restored.pos[0], saved.tornadoPosition.x); assert.ok(restored.ruined);
  checks.push('reload preserves weather without reroll and restores actual structural damage'); console.log('PASS', checks.at(-1));
  await p.locator('[data-action=start]').click();
  await check('angler is Pak Yudi and existing rod quest remains compatible', () => {
    const g = __ronda; g.weather.restoreMorning(); g.weather.set('clear', false);
    const n = g.npcs.find(n => n.def.id === 'pemancing-0'); return n.def.name === 'Pak Yudi' && n.def.quest === 'bowo-tirta';
  });
  await check('every ghost species has three separated spawn sites inside its original habitat', () => {
    const ghosts = __ronda.enemies.filter(e => e.spawnId), ids = [...new Set(ghosts.map(e => e.def.id))];
    return ids.every(id => { const group = ghosts.filter(e => e.def.id === id); return group.length === 3 && group.every(e => Math.hypot(e.home.x - e.def.x, e.home.z - e.def.z) <= e.def.radius && group.every(other => other === e || Math.hypot(e.home.x - other.home.x, e.home.z - other.home.z) >= 6)); });
  });
  await check('shooting a ghost beyond its territory makes it close distance and retaliate', () => {
    const g = __ronda, d = g.state.data; d.time = 1200; d.riding = false; g.altitude = 0;
    const e = g.enemies.find(e => e.def.id === 'pocong'); e.hp = e.maxHp; e.respawn = 0; e.pos.set(-74, 0, -150);
    Object.assign(d, { x: -74, z: -120, hp: 100 }); g.updateEnemies(0); const initial = e.pos.distanceTo(g.player.position);
    g.damageEnemy(e, 1); const z = e.pos.z;
    for (let i = 0; i < 240; i++) { g.cooldowns.hurt = 0; g.updateEnemies(0.05); }
    const closed = e.pos.z > z + 20 && d.hp < 100;
    Object.assign(d, { x: 0, z: 0 }); g.updateEnemies(0.05);
    return closed && e.provoked === 0 && Math.hypot(e.pos.x, e.pos.z) > 23;
  });
  await check('unprovoked UFO repeatedly abducts villagers and livestock instead of following player', () => {
    const g = __ronda, d = g.state.data; d.time = 1200; d.night++; d.hp = 100; d.incidents.labBuilt = true;
    g.incidents.data.residents = {}; g.incidents.data.lostCaptives = []; g.incidents.applyResidents(); g.life.update(0, 0); g.updateEnemies(0);
    g.incidents.start('alien'); g.incidents.event.phase = 'active';
    const e = g.incidents.spawn('saucer', -60, -75); e.incident.delivered = true;
    window.shipTest = e;
    let second = false;
    for (let i = 0; i < 2400; i++) { d.x = e.pos.x + 8; d.z = e.pos.z; g.incidents.updateAlien(e, 0.1, i * 0.1); if (g.incidents.data.lostCaptives.length >= 2) { second = true; break; } }
    return second && d.hp === 100 && !e.incident.retaliation;
  });
  await check('weather and village defenders do not provoke UFO; player attack does, then revenge expires', () => {
    const g = __ronda, e = window.shipTest, d = g.state.data;
    e.incident.captive = null; e.pos.set(-70, 14, -120); d.x = -60; d.z = -120; d.hp = 100; g.altitude = 0;
    g.damageEnemy(e, 1, 'weather'); g.damageEnemy(e, 1, 'santri'); if (e.incident.retaliation) return false;
    g.damageEnemy(e, 1); e.attackTimer = 0; g.cooldowns.hurt = 0; g.incidents.updateAlien(e, 0.1, 0);
    const attacked = d.hp < 100 && g.effects.lasers.beams.length > 0;
    for (let i = 0; i < 125; i++) g.incidents.updateAlien(e, 0.1, i * 0.1);
    return attacked && e.incident.retaliation === 0 && !!(e.incident.victim || e.incident.captive || e.incident.villageTarget);
  });
  await check('UFO with no free victims attacks houses without shooting an innocent player', () => {
    const g = __ronda, e = window.shipTest, d = g.state.data;
    for (const v of g.incidents.availableVictims()) g.incidents.restrain(v, 'abducted', 'mothership');
    const h = g.world.houses.find(h => Math.hypot(h.x, h.z) > 30);
    e.incident.victim = null; e.incident.captive = null; e.incident.retaliation = 0; e.incident.villageTarget = h.id;
    e.pos.set(h.x + 8, 17, h.z + 8); e.attackTimer = 0; d.x = h.x + 11; d.z = h.z + 11; d.hp = 100;
    const hp = g.incidents.data.houses[h.id] ?? 100; g.incidents.updateAlien(e, 0.1, 0);
    return g.incidents.data.houses[h.id] < hp && d.hp === 100;
  });
  await check('plasma has a continuous visible beam; range is limited in 3D and expired beams are removed', () => {
    const g = __ronda, e = window.shipTest, d = g.state.data;
    Object.assign(d, { x: 20, z: 100, riding: true, mount: 'mecha' }); g.altitude = 0;
    e.hp = e.maxHp = 1000; e.active = true; e.pos.set(20, 14, 140); g.lockedTarget = e;
    g.mountCombat.timer = 0; g.mountCombat.fire(); const hp = e.hp;
    if (!(hp < 1000 && g.effects.lasers.beams.some(b => b.group.children[0].scale.y > 35))) return false;
    e.pos.set(20, 65, 100); g.mountCombat.timer = 0; g.mountCombat.fire();
    if (e.hp !== hp) return false;
    g.effects.update(1); return g.effects.lasers.beams.length === 0;
  });
  await check('ranged pusaka rejects distant targets and homing shots cannot chase indefinitely', () => {
    const g = __ronda, e = window.shipTest, d = g.state.data;
    Object.assign(d, { x: 20, z: 100, riding: false }); g.altitude = 0; e.pos.set(20, 2, 170); e.active = true;
    for (const other of g.enemies) if (other !== e) other.active = false;
    g.cooldowns.attack = 0; if (g.ranged.shoot()) return false;
    e.pos.z = 125; if (!g.ranged.shoot()) return false;
    const hp = e.hp; e.pos.z = 190; g.ranged.update(1);
    return e.hp === hp && g.ranged.shots.length === 0;
  });
  await p.evaluate(() => { const g = __ronda; g.cameraPitch = 0.58; g.cameraYaw = 0; g.ui.close(); g.cameraShake = 0; g.updatePlayer(0); });
  await p.mouse.move(680, 660); await p.mouse.down(); await p.mouse.move(680, 70, { steps: 12 }); await p.mouse.up();
  await check('actual camera drag opens the sky while keeping the camera above ground', () => {
    const g = __ronda; g.updateCamera(2); const dir = g.camera.getWorldDirection(g.player.position.clone());
    return g.cameraPitch < -1 && g.camera.position.y >= 1.05 && dir.y > 0.85;
  });
  await check('aerial ship can be picked from ground in the upward camera view', () => {
    const g = __ronda, e = window.shipTest;
    const dir = g.camera.getWorldDirection(e.pos.clone()); e.pos.copy(g.camera.position).addScaledVector(dir, 35);
    e.model.visible = true; e.active = true; g.scene.updateMatrixWorld(true); g.lockedTarget = null;
    const screen = e.pos.clone().project(g.camera); g.pickTarget((screen.x + 1) * innerWidth / 2, (1 - screen.y) * innerHeight / 2);
    g.world.update(0, 20, g.state, g.state.data); g.weather.render(0); g.renderer.render(g.scene, g.camera);
    return g.lockedTarget === e && g.altitude === 0;
  });
  await p.screenshot({ path: 'tmp/screenshots/refinements-sky.png' });
  const phone = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const m = await phone.newPage(); m.on('pageerror', e => errors.push(e.message)); await boot(m);
  await m.evaluate(() => { __ronda.cameraYaw = 0; __ronda.ui.close(); });
  const r = await m.locator('#move-joystick').boundingBox(); assert.ok(r && r.y >= 0 && r.y + r.height <= 390);
  const touch = await phone.newCDPSession(m), center = { x: r.x + r.width / 2, y: r.y + r.height / 2, id: 0 };
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [center] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...center, y: center.y - 22 }] });
  await check('touch joystick offers proportional movement with a real dead zone', () => {
    const g = __ronda, z = g.state.data.z, amount = g.movementInput().amount; g.updatePlayer(0.2);
    return amount > 0.3 && amount < 0.6 && z - g.state.data.z > 0.3 && z - g.state.data.z < 1;
  }, m);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...center, y: center.y - 44 }] });
  const second = { x: 560, y: 240, id: 1 };
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...center, y: center.y - 44 }, second] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...center, y: center.y - 44 }, { ...second, x: 630, y: 170 }] });
  await check('two fingers can move the character and turn the camera independently', () => __ronda.movementInput().z < -0.95 && __ronda.cameraYaw < -0.2 && __ronda.cameraPitch < 0.5, m);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await check('touch cancellation releases joystick and camera immediately', () => __ronda.movementInput().amount === 0 && !__ronda.dragging, m);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...center, x: center.x + 44 }] });
  await check('opening a menu clears a held joystick', () => { const g = __ronda; g.ui.open('settings'); return g.movementInput().amount === 0 && g.ui.joystick.pointer === null; }, m);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await m.evaluate(() => { __ronda.ui.close(); __ronda.expeditions.enter('home'); });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...center, x: center.x + 44 }] });
  await check('same joystick moves inside the family home', () => { const g = __ronda, x = g.expeditions.position.x; g.expeditions.frame(0.2, 0); return g.expeditions.position.x > x + 0.3; }, m);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await m.evaluate(() => { const g = __ronda; g.expeditions.exit(); g.state.data.frontier.spaceUnlocked = true; g.expeditions.enter('space'); g.expeditions.launch = 0; });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...center, y: center.y - 44 }] });
  await check('same joystick moves the rocket during space exploration', () => { const g = __ronda, z = g.expeditions.position.z; g.expeditions.frame(0.2, 0); return g.expeditions.position.z < z - 2; }, m);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await m.evaluate(() => { const g = __ronda; g.expeditions.exit(); g.updatePlayer(0); g.updateCamera(1); g.ui.update(0.1); g.renderer.render(g.scene, g.camera); });
  await m.screenshot({ path: 'tmp/screenshots/refinements-joystick.png' });
  await m.setViewportSize({ width: 1180, height: 820 });
  assert.ok(await m.locator('#move-joystick').isVisible()); checks.push('joystick remains available on a wide touch tablet'); console.log('PASS', checks.at(-1));
  assert.deepEqual(errors, []); checks.push('no browser exceptions');
  await fs.writeFile('tmp/refinements-results.json', JSON.stringify({ passed: checks.length, checks, errors }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, errors }));
} finally { await browser.close(); }
