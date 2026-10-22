import {freshMagic,restoreMagic} from "./magic/rules.js";
import { freshWeather, restoreWeather } from "./weather-rules.js";
import { freshSpirit, restoreSpirit } from "./spirit-rules.js";
import { freshCoast, restoreCoast, WORLD_BOUNDS, coastLand } from "./coast-rules.js";
import { freshFrontier, restoreFrontier } from "./frontier-rules.js";
import { patrolPosts, POST_POOL } from "./layout.js";
import { freshIncidents, restoreIncidents } from "./incident-rules.js";
import { SAVE_KEY, POSTS, GHOSTS, WEAPONS, MOUNTS, QUESTS } from "./data.js";
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const captureChance = (hp, maxHp) =>
  hp / maxHp > 0.25 ? 0 : clamp(0.68 + (0.25 - hp / maxHp) * 1.2, 0.68, 0.97);
export function freshState() {
  return {
    version: 1,
    patrolVersion: 2,
    incidents: freshIncidents(),
    rural: { cared: [] },
    spirit: freshSpirit(),
    coast: freshCoast(),
    magic: freshMagic(),
    frontier: freshFrontier(),
    weather: freshWeather(),
    village: { treasury: 800, damage: 0 },
    raid: { night: 0, entries: [], suppressed: false, fires: [] },
    sports: {
      footballTitles: 0,
      raceWins: 0,
      bestRace: null,
      lastFootballReward: -1,
      lastRaceReward: -1,
    },
    hp: 100,
    stamina: 100,
    coins: 160,
    iron: 5,
    herb: 5,
    essence: 2,
    glass: 8,
    bottles: 6,
    level: 1,
    xp: 0,
    time: 19 * 60 + 12,
    night: 1,
    security: 84,
    x: 0,
    z: 12,
    weapon: "kentongan",
    weapons: ["kentongan"],
    mount: "onthel",
    mounts: ["onthel"],
    riding: false,
    companion: null,
    collection: [],
    posts: [],
    upgrades: { health: 0, strength: 0, stamina: 0, ward: 0 },
    quests: { patrol: "active" },
    stats: {
      fished: 0,
      anglerCatches: 0,
      aliensCaptured: 0,
      dinoTagged: 0,
      dinoHunted: 0,
      dinoWaves: 0,
      spaceDiscoveries: 0,
      bestPatrol: 0,
      captured: 0,
      criminals: 0,
      crafted: 0,
      globals: 0,
      herbsFound: 0,
      restored: 0,
      wards: 0,
      raidsStopped: 0,
      firesOut: 0,
      farmCare: 0,
      labSamples: 0,
      zombies: 0,
      outbreaks: 0,
      ufoDown: 0,
      rescued: 0,
      alienWaves: 0,
      etParts: 0,
      signalReady: 0,
    },
    settings: { sound: true, quality: "high" },
    introSeen: false,
    bribeDay: -1,
  };
}
export class GameState {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.data = freshState();
    this.load();
  }
  load() {
    try {
      const saved = JSON.parse(this.storage?.getItem(SAVE_KEY) || "null");
      if (saved?.version !== 1) return;
      const base = freshState();
      const d = {
        ...base,
        ...saved,
        upgrades: { ...base.upgrades, ...saved.upgrades },
        stats: { ...base.stats, ...saved.stats },
        settings: { ...base.settings, ...saved.settings },
        village: { ...base.village, ...saved.village },
        sports: { ...base.sports, ...saved.sports },
        raid: { ...base.raid, ...saved.raid },
        incidents: restoreIncidents(saved.incidents, base.incidents.seed),
        frontier: restoreFrontier(saved.frontier),
        weather: restoreWeather(saved.weather),
        spirit: restoreSpirit(saved.spirit),
        coast: restoreCoast(saved.coast),
        magic: restoreMagic(saved.magic),
        rural: {
          ...base.rural,
          ...saved.rural,
          cared: Array.isArray(saved.rural?.cared)
            ? saved.rural.cared.filter((x) => typeof x === "string")
            : [],
        },
      };
      for (const key of [
        "hp",
        "stamina",
        "coins",
        "iron",
        "herb",
        "essence",
        "glass",
        "bottles",
        "xp",
        "level",
        "night",
        "time",
        "x",
        "z",
        "security",
      ])
        if (!Number.isFinite(d[key])) d[key] = base[key];
      d.time = ((d.time % 1440) + 1440) % 1440;
      d.x = clamp(d.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX);
      d.z = clamp(d.z, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ);
      if (d.z > 285 && !coastLand(d.x, d.z)) { d.x = 84; d.z = 330; }
      d.posts = Array.isArray(d.posts)
        ? d.posts.filter((id) => POST_POOL.some((p) => p.id === id))
        : [];
      if (saved.patrolVersion !== 2) {
        const old = ["kampung", "pasar", "sawah", "makam", "beringin"];
        d.posts = d.posts
          .map((id) => patrolPosts(d.night)[old.indexOf(id)]?.id)
          .filter(Boolean);
      }
      d.patrolVersion = 2;
      d.posts = d.posts.filter((id) =>
        patrolPosts(d.night).some((p) => p.id === id),
      );
      if (!Array.isArray(d.raid.entries)) d.raid.entries = [];
      if (!Array.isArray(d.raid.fires)) d.raid.fires = [];
      d.weapons = Array.isArray(d.weapons)
        ? d.weapons.filter((id) => WEAPONS.some((w) => w.id === id))
        : ["kentongan"];
      if (!d.weapons.includes(d.weapon)) d.weapon = "kentongan";
      d.mounts = Array.isArray(d.mounts)
        ? d.mounts.filter((id) => MOUNTS.some((m) => m.id === id))
        : ["onthel"];
      if (!d.mounts.includes(d.mount)) d.mount = "onthel";
      d.collection = Array.isArray(d.collection)
        ? d.collection
            .filter(
              (g) => GHOSTS.some((t) => t.id === g.id) && Number.isFinite(g.xp),
            )
            .map((g) => ({ ...g, level: clamp(Number(g.level) || 1, 1, 5) }))
        : [];
      if (!d.collection.some((g) => g.id === d.companion)) d.companion = null;
      d.quests =
        d.quests && typeof d.quests === "object"
          ? d.quests
          : { patrol: "active" };
      d.riding = false;
      this.data = d;
    } catch {
      this.data = freshState();
    }
  }
  save() {
    try {
      this.storage?.setItem(SAVE_KEY, JSON.stringify(this.data));
      return true;
    } catch {
      return false;
    }
  }
  get patrolPosts() {
    return patrolPosts(this.data.night);
  }
  get maxHp() {
    return 100 + this.data.upgrades.health * 25;
  }
  get maxStamina() {
    return 100 + this.data.upgrades.stamina * 20;
  }
  get isNight() {
    return this.data.time >= 18 * 60 || this.data.time < 6 * 60;
  }
  get isKliwon() {
    return this.data.night % 3 === 1;
  }
  get weapon() {
    return WEAPONS.find((w) => w.id === this.data.weapon) || WEAPONS[0];
  }
  get companion() {
    return this.data.collection.find((g) => g.id === this.data.companion);
  }
  afford(cost) {
    return Object.entries(cost || {}).every(([k, v]) => this.data[k] >= v);
  }
  spend(cost) {
    if (!this.afford(cost)) return false;
    for (const [k, v] of Object.entries(cost || {})) this.data[k] -= v;
    return true;
  }
  craft(id) {
    if (id === "bottle") {
      if (!this.spend({ glass: 2, herb: 1, coins: 15 })) return false;
      this.data.bottles += 3;
      return true;
    }
    const w = WEAPONS.find((w) => w.id === id);
    if (
      !w ||
      w.questOnly ||
      this.data.weapons.includes(id) ||
      !this.spend(w.cost)
    )
      return false;
    this.data.weapons.push(id);
    this.data.weapon = id;
    this.data.stats.crafted++;
    return true;
  }
  upgrade(key) {
    if (!(key in this.data.upgrades) || this.data.upgrades[key] >= 5)
      return false;
    const cost = 90 + this.data.upgrades[key] * 70;
    if (!this.spend({ coins: cost })) return false;
    this.data.upgrades[key]++;
    if (key === "health") this.data.hp = this.maxHp;
    return true;
  }
  buyMount(id) {
    const m = MOUNTS.find((m) => m.id === id);
    if (!m) return false;
    if (!this.data.mounts.includes(id)) {
      if (m.questOnly) return false;
      if (!this.spend({ coins: m.cost })) return false;
      this.data.mounts.push(id);
    }
    this.data.mount = id;
    return true;
  }
  ring(id) {
    if (
      !this.isNight ||
      this.data.posts.includes(id) ||
      !this.patrolPosts.some((p) => p.id === id)
    )
      return false;
    this.data.posts.push(id);
    this.data.coins += 15;
    this.data.security = clamp(this.data.security + 3, 0, 100);
    this.data.stats.bestPatrol = Math.max(
      this.data.stats.bestPatrol,
      this.data.posts.length,
    );
    if (this.data.posts.length === 5) {
      this.data.coins += 75;
      this.data.essence += 2;
    }
    return true;
  }
  catchGhost(id) {
    if (!GHOSTS.some((g) => g.id === id)) return false;
    this.data.stats.captured++;
    this.data.essence += 2;
    if (!this.data.collection.some((g) => g.id === id))
      this.data.collection.push({ id, level: 1, xp: 0, awakened: false });
    else this.addCompanionXp(35, id);
    if (!this.data.companion) this.data.companion = id;
    return true;
  }
  addCompanionXp(amount, id = this.data.companion) {
    const g = this.data.collection.find((g) => g.id === id);
    if (!g) return;
    g.xp += amount;
    while (g.level < 5 && g.xp >= g.level * 40) {
      g.xp -= g.level * 40;
      g.level++;
    }
  }
  awaken(id) {
    const g = this.data.collection.find((g) => g.id === id);
    if (
      !g ||
      g.level < 5 ||
      g.awakened ||
      !this.spend({ coins: 200, essence: 8, iron: 6 })
    )
      return false;
    g.awakened = true;
    return true;
  }
  addXp(amount) {
    this.data.xp += amount;
    this.addCompanionXp(amount);
    while (this.data.xp >= this.data.level * 80) {
      this.data.xp -= this.data.level * 80;
      this.data.level++;
      this.data.coins += 40;
      this.data.hp = this.maxHp;
    }
  }
  respawn() {
    const loss = Math.min(
      this.data.coins,
      Math.max(15, Math.floor(this.data.coins * 0.15)),
    );
    this.data.coins -= loss;
    this.data.hp = this.maxHp;
    this.data.stamina = this.maxStamina;
    this.data.x = 0;
    this.data.z = 12;
    this.data.riding = false;
    return loss;
  }
  claimQuest(id) {
    const q = QUESTS.find((q) => q.id === id);
    if (
      !q ||
      this.data.quests[id] !== "active" ||
      this.data.stats[q.stat] < q.target ||
      (q?.requiresMount && !this.data.mounts.includes(q.requiresMount)) ||
      (q?.requiresQuest && this.data.quests[q.requiresQuest] !== "done")
    )
      return false;
    this.data.quests[id] = "done";
    if (id === "bowo-tirta") this.data.frontier.rod = 3;
    if (id === "elon-orbit") this.data.frontier.spaceUnlocked = true;
    if (q.weapon && !this.data.weapons.includes(q.weapon)) {
      this.data.weapons.push(q.weapon);
      this.data.weapon = q.weapon;
    }
    if (q.mount && !this.data.mounts.includes(q.mount)) {
      this.data.mounts.push(q.mount);
      this.data.mount = q.mount;
    }
    if (id === "william-samples") this.data.incidents.tech.serum += 3;
    if (id === "william-flight") this.data.incidents.tech.mechaFlight = true;
    if (id === "et-parts") this.data.incidents.tech.cells += 3;
    if (id === "et-home") this.data.incidents.tech.etDeparted = true;
    if (id === "et-tractor") this.data.incidents.tech.ufoTractor = true;
    this.data.coins += q.coins;
    this.data.essence += q.essence;
    this.addXp(50);
    return true;
  }
  advance(dt) {
    const wasNight = this.isNight;
    this.data.time += dt * (wasNight ? 1.5 : 3);
    if (this.data.time >= 1440) this.data.time -= 1440;
    if (wasNight && !this.isNight) {
      this.data.hp = this.maxHp;
      return "dawn";
    }
    if (!wasNight && this.isNight) {
      this.data.night++;
      this.data.posts = [];
      return "dusk";
    }
    return null;
  }
}
