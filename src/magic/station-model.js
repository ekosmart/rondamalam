// Adapted from user supplied HTML; original retained in assets/magic-source.
import * as THREE from "three";
export function createStation() {
  const S = new THREE.Group(),
    PI = Math.PI,
    V = THREE.Vector3;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function ctex(n, fn) {
    const c = document.createElement("canvas");
    c.width = c.height = n;
    fn(c.getContext("2d"), n);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    return t;
  }
  const tcl = (t, x, y) => {
    const c = t.clone();
    c.needsUpdate = true;
    c.repeat.set(x, y);
    return c;
  };
  const brickT = ctex(256, (g, n) => {
    g.fillStyle = "#1c1511";
    g.fillRect(0, 0, n, n);
    for (let r = 0; r < 8; r++)
      for (let i = -1; i < 4; i++) {
        const v = rnd();
        g.fillStyle = `hsl(${10 + v * 12},${30 + rnd() * 20}%,${18 + v * 14}%)`;
        g.fillRect(i * 64 + (r % 2 ? 32 : 0) + 2, r * 32 + 2, 60, 28);
      }
    for (let k = 0; k < 70; k++) {
      g.fillStyle = `rgba(${(20 + rnd() * 20) | 0},${(70 + rnd() * 60) | 0},50,${0.1 + rnd() * 0.22})`;
      g.beginPath();
      g.arc(rnd() * n, rnd() * n, 3 + rnd() * 16, 0, 7);
      g.fill();
    }
    for (let k = 0; k < 14; k++) {
      g.fillStyle = "rgba(8,6,5,.65)";
      g.fillRect(rnd() * n, rnd() * n, 6 + rnd() * 22, 4 + rnd() * 14);
    }
  });
  const woodT = ctex(128, (g, n) => {
    g.fillStyle = "#3a2a1d";
    g.fillRect(0, 0, n, n);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? "15,10,6" : "90,85,70"},${0.2 + rnd() * 0.3})`;
      g.fillRect(rnd() * n, 0, 1 + rnd() * 2, n);
    }
  });
  const stoneT = ctex(128, (g, n) => {
    g.fillStyle = "#3a403b";
    g.fillRect(0, 0, n, n);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? "10,20,14" : "110,130,115"},${0.15 + rnd() * 0.25})`;
      g.fillRect(rnd() * n, rnd() * n, 2 + rnd() * 8, 2 + rnd() * 8);
    }
  });
  const mt = (o) =>
    new THREE.MeshStandardMaterial(
      Object.assign({ flatShading: true, roughness: 1, metalness: 0 }, o),
    );
  const brickW = mt({ map: tcl(brickT, 0.5, 0.5) }),
    brickB = mt({ map: tcl(brickT, 2, 3.2) }),
    wood = mt({ map: woodT }),
    stone = mt({ map: tcl(stoneT, 2, 2) }),
    iron = mt({ color: 0x2b2420, metalness: 0.4 }),
    rust = mt({ color: 0x5a3220, metalness: 0.4 }),
    roofM = mt({ color: 0x3a1e18 }),
    ballast = mt({ color: 0x1c211d }),
    brass = mt({ color: 0x7a6a2a, metalness: 0.6 }),
    darkM = new THREE.MeshBasicMaterial({ color: 0x020504 }),
    glow = new THREE.MeshBasicMaterial({ color: 0x14503a }),
    handM = new THREE.MeshBasicMaterial({ color: 0x9dffc0 }),
    tickM = new THREE.MeshBasicMaterial({ color: 0x4f6a58 });
  const mistT = ctex(64, (g, n) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, n, n);
  });
  mistT.magFilter = THREE.LinearFilter;

  // ---------- helpers ----------
  const mods = [],
    TYPES = {
      wall: [0, -2.5],
      roof: [4, 0],
      plat: [-1.5, 0],
      track: [-1, 3],
      col: [0, 2.5],
      arch: [1.5, 2.5],
      bench: [1.5, 1.5],
      prop: [2, 1.5],
      tower: [0, -2.5],
      lamp: [1, 2],
    };
  function reg(g, t) {
    S.add(g);
    mods.push({ g, base: g.position.clone(), t });
    return g;
  }
  function box(p, w, h, d, m, x, y, z) {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x || 0, y || 0, z || 0);
    p.add(o);
    return o;
  }
  function poly(pts, m, depth, holes) {
    const s = new THREE.Shape();
    pts.forEach((q, i) => (i ? s.lineTo(q[0], q[1]) : s.moveTo(q[0], q[1])));
    if (holes) {
      const h = new THREE.Path();
      holes.forEach((q, i) =>
        i ? h.lineTo(q[0], q[1]) : h.moveTo(q[0], q[1]),
      );
      s.holes.push(h);
    }
    return new THREE.Mesh(
      new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }),
      m,
    );
  }

  // ---------- modules ----------
  // Wall module 4x4 with Gothic lancet window (variant: ragged, collapsed top)
  function wall(x, rag) {
    const g = new THREE.Group();
    const top = rag
      ? [
          [2, 3.6],
          [1.2, 3.9],
          [0.6, 3.5],
          [-0.4, 3.9],
          [-1, 3.6],
          [-2, 3.8],
        ]
      : [
          [2, 4],
          [-2, 4],
        ];
    const win = [
      [-0.6, 1.2],
      [0.6, 1.2],
      [0.6, 2.5],
      [0.3, 2.95],
      [0, 3.2],
      [-0.3, 2.95],
      [-0.6, 2.5],
    ];
    const w = poly([[-2, 0], [2, 0], ...top], brickW, 0.4, win);
    w.position.z = -0.2;
    g.add(w);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2), glow);
    gl.position.set(0, 2.2, -0.12);
    g.add(gl);
    box(g, 0.06, 2, 0.08, iron, 0, 2.2, 0.05);
    box(g, 1.2, 0.06, 0.08, iron, 0, 2, 0.05);
    box(g, 4.1, 0.35, 0.55, stone, 0, 0.175, 0.05);
    g.position.set(x, 0, -3);
    return reg(g, "wall");
  }
  [-8, -4, 4, 8].forEach((x) => wall(x, x === 8));
  // rubble at the collapsed wall
  {
    const r = new THREE.Group();
    [
      [0.5, 0.3, 0.4, -0.3, 0],
      [0.35, 0.25, 0.3, 0.4, 0.5],
      [0.6, 0.2, 0.4, 0.1, 1],
    ].forEach((a) => {
      const b = box(r, a[0], a[1], a[2], brickB, a[3], a[1] / 2, a[4]);
      b.rotation.y = a[3] * 2;
    });
    r.position.set(8.2, 0, -2.3);
    reg(r, "prop");
  }

  // Clock-tower module
  function face(r) {
    const g = new THREE.Group();
    const d = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, 0.06, 12),
      mt({ color: 0x1d241f }),
    );
    d.rotation.x = PI / 2;
    g.add(d);
    g.add(new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.07, 4, 12), iron));
    for (let i = 0; i < 12; i++) {
      const a = (i * PI) / 6,
        t = box(
          g,
          r * 0.07,
          r * (i % 3 ? 0.1 : 0.2),
          0.03,
          tickM,
          Math.sin(a) * r * 0.82,
          Math.cos(a) * r * 0.82,
          0.04,
        );
      t.rotation.z = -a;
    }
    const h = new THREE.Group();
    box(h, r * 0.06, r * 0.85, 0.03, handM, 0, r * 0.42, 0.07);
    box(h, r * 0.1, r * 0.55, 0.03, handM, 0, r * 0.27, 0.05);
    box(h, r * 0.14, r * 0.14, 0.04, handM, 0, 0, 0.06);
    g.add(h);
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: mistT,
        color: 0x5dff9a,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0.5,
      }),
    );
    sp.scale.set(r * 4, r * 4, 1);
    sp.position.z = 0.12;
    g.add(sp);
    g.userData = { h, sp };
    clocks.push(g);
    return g;
  }
  const clocks = [];
  {
    const t = new THREE.Group();
    box(t, 4, 8, 3.2, brickB, 0, 4, -2.4);
    box(t, 4.5, 0.4, 3.7, stone, 0, 8.2, -2.4);
    box(t, 4.2, 0.3, 3.4, stone, 0, 0.15, -2.4);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.4, 4), roofM);
    roof.rotation.y = PI / 4;
    roof.position.set(0, 10.1, -2.4);
    t.add(roof);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.6, 4), iron);
    sp.position.set(0, 12.6, -2.4);
    t.add(sp);
    const door = new THREE.Mesh(
      new THREE.ShapeGeometry(
        new THREE.Shape(
          [
            [-0.9, 0],
            [0.9, 0],
            [0.9, 2],
            [0.45, 2.65],
            [0, 2.95],
            [-0.45, 2.65],
            [-0.9, 2],
          ]
            .map((p) => new V(p[0], p[1], 0))
            .map((v) => new THREE.Vector2(v.x, v.y)),
        ),
      ),
      darkM,
    );
    door.position.set(0, 0.3, -0.78);
    t.add(door);
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = "#1a1a14";
    g.fillRect(0, 0, 256, 64);
    g.strokeStyle = "#4a5a46";
    g.lineWidth = 3;
    g.strokeRect(3, 3, 250, 58);
    g.fillStyle = "#9fb89a";
    g.font = "bold 21px monospace";
    g.textAlign = "center";
    g.fillText("STASIUN", 128, 28);
    g.fillText("TENGAH MALAM", 128, 52);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = "rgba(10,10,8,.7)";
      g.fillRect(rnd() * 256, rnd() * 64, 2 + rnd() * 14, 1 + rnd() * 3);
    }
    const st = new THREE.CanvasTexture(c);
    st.colorSpace = THREE.SRGBColorSpace;
    const sg = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 0.65),
      new THREE.MeshBasicMaterial({ map: st }),
    );
    sg.position.set(0, 3.9, -0.77);
    sg.rotation.z = 0.05;
    t.add(sg);
    const f = face(1.25);
    f.position.set(0, 6, -0.78);
    t.add(f);
    reg(t, "tower");
  }

  // Roof modules (asymmetric Gothic-colonial pitch)
  function roofGeo(L) {
    const s = new THREE.Shape();
    [
      [-3.4, 0],
      [-0.2, 1.9],
      [3.1, 0],
      [3.1, -0.15],
      [-3.4, -0.15],
    ].forEach((q, i) => (i ? s.lineTo(q[0], q[1]) : s.moveTo(q[0], q[1])));
    const g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false });
    g.rotateY(-PI / 2);
    g.translate(L, 0, 0);
    return g;
  }
  [
    [-10, 8],
    [2, 5.2],
    [8.8, 1.2],
  ].forEach((a) => {
    const m = new THREE.Mesh(roofGeo(a[1]), roofM);
    m.position.set(a[0], 4, 0);
    reg(m, "roof");
  });
  {
    const sl = new THREE.Group();
    box(sl, 2.4, 0.14, 1.6, roofM, 0, 0, 0);
    sl.position.set(7.9, 0.45, 1.4);
    sl.rotation.set(0.1, 0.5, 0.3);
    reg(sl, "prop");
  }

  // Platform tiles (one sunken & cracked)
  for (let i = 0; i < 5; i++) {
    const x = -8.8 + i * 4.4,
      g = new THREE.Group(),
      bad = i === 2;
    box(g, 4.4, 0.6, 6, stone, 0, bad ? -0.4 : -0.3, 0);
    box(
      g,
      4.4,
      0.02,
      0.12,
      mt({ color: 0x6b6a2a }),
      0,
      bad ? -0.09 : 0.01,
      2.85,
    );
    if (bad) {
      g.rotation.z = 0.04;
    }
    g.position.x = x;
    reg(g, "plat");
  }

  // Rail modules (one with a snapped, bent rail and missing sleepers)
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group(),
      br = i === 3;
    g.position.set(-10 + i * 4, -0.6, 5.4);
    box(g, 4, 0.2, 2.8, ballast, 0, 0.1, 0);
    [-0.7, 0.7].forEach((z, k) => {
      const cut = br && k === 1;
      box(g, cut ? 2.4 : 4, 0.16, 0.12, rust, cut ? -0.8 : 0, 0.38, z);
      if (cut) {
        const b = box(g, 1.1, 0.16, 0.12, rust, 1, 0.55, z);
        b.rotation.z = 0.5;
      }
    });
    for (let s = 0; s < 4; s++) {
      if (br && s === 2) continue;
      box(g, 0.22, 0.1, 2.4, wood, -1.5 + s, 0.25, 0);
    }
    reg(g, "track");
  }

  // Gothic arcade: iron columns + pointed-arch spandrels
  [-9.5, -6, -2.5, 2.5, 6, 9.5].forEach((x) => {
    const g = new THREE.Group();
    const c = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 4.2, 6),
      iron,
    );
    c.position.y = 2.1;
    g.add(c);
    box(g, 0.5, 0.25, 0.5, stone, 0, 0.12, 0);
    box(g, 0.45, 0.2, 0.45, iron, 0, 4.1, 0);
    g.position.set(x, 0, 2.4);
    reg(g, "col");
  });
  [
    [-7.75, 0],
    [-4.25, 0],
    [4.25, 0],
    [7.75, 1],
  ].forEach((a) => {
    const hw = 1.75,
      m = poly(
        [
          [-hw, 0],
          [-hw + 0.2, 0],
          [-hw + 0.2, 0.35],
          [-hw * 0.5, 0.8],
          [0, 1],
          [hw * 0.5, 0.8],
          [hw - 0.2, 0.35],
          [hw - 0.2, 0],
          [hw, 0],
          [hw, 1.1],
          [-hw, 1.1],
        ],
        iron,
        0.12,
      );
    m.position.set(a[0], 3.1, 2.35);
    if (a[1]) {
      m.rotation.z = 0.18;
      m.position.y = 2.6;
      m.position.x += 0.2;
    }
    reg(m, "arch");
  });

  // Benches (second one broken)
  function bench(x, z, bad) {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      if (bad && i === 1) continue;
      box(g, 2, 0.05, 0.16, wood, 0, 0.5, -0.2 + i * 0.2);
    }
    for (let i = 0; i < 2; i++) {
      const p = box(g, 2, 0.05, 0.16, wood, 0, 0.8 + i * 0.18, -0.35);
      if (bad && i === 1) {
        p.rotation.x = 0.9;
        p.position.set(0.3, 0.55, -0.2);
      }
    }
    [-0.85, 0.85].forEach((l) => box(g, 0.06, 0.5, 0.5, iron, l, 0.25, 0));
    if (bad) {
      g.rotation.z = 0.2;
      g.position.y = -0.08;
    }
    g.position.x = x;
    g.position.z = z;
    return reg(g, "bench");
  }
  bench(-6.2, -2.2, false);
  bench(5.8, -2.2, true);
  bench(9.2, -1.6, false).rotation.y = 0.4;

  // Grandfather clock hero prop (hands frozen at midnight)
  const pend = new THREE.Group();
  {
    const g = new THREE.Group();
    box(g, 1.2, 0.5, 0.8, wood, 0, 0.25, 0);
    box(g, 0.8, 1.6, 0.55, wood, 0, 1.3, 0);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 1.05), glow);
    gl.position.set(0, 1.3, 0.278);
    g.add(gl);
    pend.position.set(0, 1.95, 0.29);
    box(pend, 0.03, 0.9, 0.02, brass, 0, -0.45, 0);
    const bob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.04, 8),
      brass,
    );
    bob.rotation.x = PI / 2;
    bob.position.y = -0.95;
    pend.add(bob);
    g.add(pend);
    box(g, 1, 1, 0.65, wood, 0, 2.6, 0);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.75, 4), wood);
    cap.rotation.y = PI / 4;
    cap.position.y = 3.48;
    g.add(cap);
    const f = face(0.38);
    f.position.set(0, 2.6, 0.33);
    g.add(f);
    const L = new THREE.PointLight(0x5dff9a, 2.2, 9, 2);
    L.position.set(0, 2.6, 1.2);
    g.add(L);
    g.userData.L = L;
    g.position.set(-2.8, 0, -2.25);
    reg(g, "prop");
  }

  // Hanging lanterns (green light, one swings)
  const lamps = [];
  [
    [-4.25, 1],
    [4.25, 1],
    [-8, 0],
  ].forEach((a) => {
    const g = new THREE.Group();
    box(g, 0.02, 1.1, 0.02, iron, 0, -0.55, 0);
    const lb = box(
      g,
      0.3,
      0.4,
      0.3,
      new THREE.MeshBasicMaterial({ color: 0x7dffb0 }),
      0,
      -1.3,
      0,
    );
    box(g, 0.38, 0.08, 0.38, iron, 0, -1.1, 0);
    if (a[1]) {
      const L = new THREE.PointLight(0x5dff9a, 2, 10, 2);
      L.position.y = -1.3;
      g.add(L);
      g.userData.L = L;
    }
    g.position.set(a[0], 4.2, 1.7);
    lamps.push(g);
    reg(g, "lamp");
  });

  return {
    group: S,
    update(t) {
      pend.rotation.z = Math.sin(t) * 0.09;
      lamps.forEach((l, i) => (l.rotation.z = Math.sin(t + i) * 0.03));
      clocks.forEach((c) => (c.userData.sp.opacity = 0.3 + Math.sin(t) * 0.1));
    },
  };
}
