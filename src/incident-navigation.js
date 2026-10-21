// Ground invaders route around buildings, rivers and the protected pos ronda.
export class IncidentNavigation {
  constructor(game) {
    this.game = game;
    this.step = 4;
    this.size = 141;
    this.height = 201;
    this.cache = new Map();
  }
  clear(x, z) {
    return Math.hypot(x, z) > 24.5 && this.game.world.canMove(x, z, 0.5);
  }
  line(a, b) {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 1.5);
    for (let i = 1; i <= n; i++)
      if (!this.clear(a.x + ((b.x - a.x) * i) / n, a.z + ((b.z - a.z) * i) / n))
        return false;
    return true;
  }
  point(id) {
    return {
      x: (id % this.size) * 4 - 280,
      z: Math.floor(id / this.size) * 4 - 280,
    };
  }
  valid(id) {
    if (!this.cache.has(id)) {
      const p = this.point(id);
      this.cache.set(id, this.clear(p.x, p.z));
    }
    return this.cache.get(id);
  }
  node(p) {
    let best = null,
      dist = Infinity;
    const x = Math.round((p.x + 280) / 4),
      z = Math.round((p.z + 280) / 4);
    for (let dz = -3; dz <= 3; dz++)
      for (let dx = -3; dx <= 3; dx++) {
        const xx = x + dx,
          zz = z + dz;
        if (xx < 0 || xx >= this.size || zz < 0 || zz >= this.height) continue;
        const id = zz * this.size + xx,
          q = this.point(id),
          d = Math.hypot(q.x - p.x, q.z - p.z);
        if (d < dist && this.valid(id) && this.line(p, q)) {
          best = id;
          dist = d;
        }
      }
    return best;
  }
  path(a, b) {
    const start = this.node(a),
      end = this.node(b);
    if (start === null || end === null) return [];
    const goal = this.point(end),
      heap = [],
      scores = new Map([[start, 0]]),
      previous = new Map(),
      closed = new Set();
    const push = (id, f) => {
      let i = heap.length;
      heap.push({ id, f });
      while (i) {
        const p = (i - 1) >> 1;
        if (heap[p].f <= f) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = () => {
      const first = heap[0],
        last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        while (true) {
          let n = i,
            l = i * 2 + 1,
            r = l + 1;
          if (l < heap.length && heap[l].f < heap[n].f) n = l;
          if (r < heap.length && heap[r].f < heap[n].f) n = r;
          if (n === i) break;
          [heap[i], heap[n]] = [heap[n], heap[i]];
          i = n;
        }
      }
      return first.id;
    };
    push(start, 0);
    let visits = 0;
    while (heap.length && visits++ < 16000) {
      const id = pop();
      if (closed.has(id)) continue;
      if (id === end) {
        const result = [b];
        let c = id;
        while (c !== undefined) {
          result.unshift(this.point(c));
          c = previous.get(c);
        }
        return result;
      }
      closed.add(id);
      const p = this.point(id),
        x = id % this.size,
        z = Math.floor(id / this.size);
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ]) {
        const xx = x + dx,
          zz = z + dz,
          n = zz * this.size + xx;
        if (
          xx < 0 ||
          zz < 0 ||
          xx >= this.size ||
          zz >= this.height ||
          closed.has(n) ||
          !this.valid(n)
        )
          continue;
        const q = this.point(n);
        if (!this.line(p, q)) continue;
        const score = scores.get(id) + Math.hypot(dx, dz) * 4;
        if (score >= (scores.get(n) ?? Infinity)) continue;
        scores.set(n, score);
        previous.set(n, id);
        push(n, score + Math.hypot(goal.x - q.x, goal.z - q.z));
      }
    }
    return [];
  }
  move(e, x, z, speed, dt) {
    const target = { x, z };
    let nav = e.navigation;
    if (!nav || Math.hypot(nav.target.x - x, nav.target.z - z) > 3) {
      nav = e.navigation = {
        target,
        path: this.line(e.pos, target) ? [target] : this.path(e.pos, target),
        index: 0,
      };
    }
    while (
      nav.index < nav.path.length &&
      Math.hypot(
        nav.path[nav.index].x - e.pos.x,
        nav.path[nav.index].z - e.pos.z,
      ) < 0.65
    )
      nav.index++;
    const p = nav.path[nav.index] || target;
    this.game.steer(e, p.x, p.z, speed, dt);
  }
}
