import * as THREE from 'three';

// Keep ownership of merged vertex spans: destroying a tree must not remove its whole terrain batch.
export class WorldDamage {
  constructor(world) {
    this.world = world;
    this.entries = [...world.buildingFootprints.filter(b => b.id !== 'house'), ...world.trees, ...world.ricePlots];
    for (const entry of this.entries) {
      entry.damageSpans = [];
      entry.group?.traverse(o => { o.userData.damageOwner = entry; });
      const tree = world.trees.includes(entry), margin = tree ? 0.6 : 3;
      const inside = o => Math.abs(o.x - entry.x) < (tree ? 0.6 : entry.w / 2 + margin) && Math.abs(o.z - entry.z) < (tree ? 0.6 : entry.d / 2 + margin);
      entry.damageColliders = world.colliders.filter(inside);
      entry.damageFlights = world.flightObstacles.filter(inside).map(ref => ({ ref, h: ref.h }));
    }
    this.fields = world.frontier.fields;
    for (const f of this.fields) f.originalMatrices = [f.stem, f.heads, f.leaves].map(m => m.instanceMatrix.array.slice());
  }
  addSpan(owner, geometry, start, count) {
    if (!owner) return;
    owner.damageSpans.push({ geometry, start, original: geometry.attributes.position.array.slice(start * 3, (start + count) * 3) });
  }
  setRuined(entry, ruined) {
    if (!!entry.ruined === ruined) return;
    entry.ruined = ruined;
    entry.setVisualRuined?.(ruined);
    if (entry.group) { entry.group.visible = !ruined; entry.group.userData.weatherRuined = ruined; }
    for (const { geometry, start, original } of entry.damageSpans || []) {
      const attr = geometry.attributes.position;
      attr.array.set(original, start * 3);
      if (ruined) for (let i = 1; i < original.length; i += 3) attr.array[start * 3 + i] = 0.06 + original[i] * 0.045;
      attr.needsUpdate = true;
    }
    for (const c of entry.damageColliders || []) c.disabled = ruined;
    for (const { ref, h } of entry.damageFlights || []) ref.h = ruined ? 0.5 : h;
    this.world.sun.shadow.needsUpdate = true;
  }
  setFieldRuined(f, ruined) {
    if (!!f.ruined === ruined) return;
    f.ruined = ruined;
    f.setVisualRuined?.(ruined);
    [f.stem, f.heads, f.leaves].forEach((m, j) => {
      const a = m.instanceMatrix.array, original = f.originalMatrices[j]; a.set(original);
      if (ruined) for (let i = 0; i < a.length; i += 16) {
        // Flatten every stalk and leaf onto the soil, including its translation.
        for (const k of [1, 5, 9, 13]) a[i + k] *= 0.055;
      }
      m.instanceMatrix.needsUpdate = true;
    });
  }
  restore() { this.entries.forEach(e => this.setRuined(e, false)); this.fields.forEach(f => this.setFieldRuined(f, false)); }
}
