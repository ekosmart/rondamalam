// Adapted from user supplied HTML; original retained in assets/magic-source.
import * as THREE from "three";
export function createStatue() {
  const PI = Math.PI;
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const segs = [];
  (function crack(x, y, a, len, d) {
    let px = x,
      py = y;
    for (let i = 0; i < len; i++) {
      a += (rnd() - 0.5) * 0.9;
      const nx = px + Math.cos(a) * (0.02 + rnd() * 0.025),
        ny = py + Math.sin(a) * (0.02 + rnd() * 0.025);
      segs.push([px, py, nx, ny, d]);
      px = nx;
      py = ny;
      if (d < 3 && rnd() < 0.13)
        crack(
          px,
          py,
          a + (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 0.6),
          (len * 0.55) | 0,
          d + 1,
        );
    }
  });
  for (let i = 0; i < 10; i++)
    (function c(x, y, a, len, d) {
      let px = x,
        py = y;
      for (let k = 0; k < len; k++) {
        a += (rnd() - 0.5) * 0.9;
        const nx = px + Math.cos(a) * (0.02 + rnd() * 0.025),
          ny = py + Math.sin(a) * (0.02 + rnd() * 0.025);
        segs.push([px, py, nx, ny, d]);
        px = nx;
        py = ny;
        if (d < 3 && rnd() < 0.13)
          c(
            px,
            py,
            a + (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 0.6),
            (len * 0.55) | 0,
            d + 1,
          );
      }
    })(rnd(), rnd(), rnd() * 6.28, 11, 0);
  function cv(n) {
    const c = document.createElement("canvas");
    c.width = c.height = n;
    return c;
  }
  function stone(kind) {
    const n = 256,
      c = cv(n),
      g = c.getContext("2d"),
      e = cv(n),
      h = e.getContext("2d");
    g.fillStyle =
      kind === "shirt" ? "#8b8d8a" : kind === "sarong" ? "#6f716f" : "#7d7f7c";
    g.fillRect(0, 0, n, n);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? "20,22,24" : "200,203,198"},${0.05 + rnd() * 0.14})`;
      g.fillRect(rnd() * n, rnd() * n, 1 + rnd() * 5, 1 + rnd() * 5);
    }
    for (let i = 0; i < 28; i++) {
      g.fillStyle = `rgba(25,26,30,${0.04 + rnd() * 0.07})`;
      g.fillRect(rnd() * n, rnd() * n * 0.6, 1 + rnd() * 3, 30 + rnd() * 120);
    }
    g.strokeStyle = "rgba(20,21,24,.55)";
    g.lineWidth = 2;
    if (kind === "sarong") {
      for (let i = 0; i <= n; i += 32) {
        g.beginPath();
        g.moveTo(i, 0);
        g.lineTo(i, n);
        g.stroke();
        g.beginPath();
        g.moveTo(0, i);
        g.lineTo(n, i);
        g.stroke();
      }
      g.fillStyle = "rgba(20,21,24,.25)";
      for (let i = 0; i < n; i += 64) g.fillRect(i, 0, 12, n);
      for (let i = 0; i < n; i += 64) g.fillRect(0, i, n, 12);
    }
    if (kind === "shirt") {
      g.lineWidth = 1.5;
      for (let i = 0; i < 9; i++) {
        g.beginPath();
        g.moveTo(rnd() * n, 0);
        g.quadraticCurveTo(rnd() * n, n / 2, rnd() * n, n);
        g.stroke();
      }
    }
    h.fillStyle = "#000";
    h.fillRect(0, 0, n, n);
    g.lineCap = h.lineCap = "round";
    segs.forEach((s) => {
      const w = 3 - s[4] * 0.6;
      g.strokeStyle = "#17181b";
      g.lineWidth = w + 1.8;
      g.beginPath();
      g.moveTo(s[0] * n, s[1] * n);
      g.lineTo(s[2] * n, s[3] * n);
      g.stroke();
      h.strokeStyle = "rgba(150,60,255,.3)";
      h.lineWidth = w + 3;
      h.beginPath();
      h.moveTo(s[0] * n, s[1] * n);
      h.lineTo(s[2] * n, s[3] * n);
      h.stroke();
      h.strokeStyle = "#d9a6ff";
      h.lineWidth = Math.max(1, w - 1);
      h.beginPath();
      h.moveTo(s[0] * n, s[1] * n);
      h.lineTo(s[2] * n, s[3] * n);
      h.stroke();
    });
    const t = (a) => {
      const x = new THREE.CanvasTexture(a);
      x.wrapS = x.wrapT = THREE.RepeatWrapping;
      x.colorSpace = THREE.SRGBColorSpace;
      return x;
    };
    return { map: t(c), em: t(e) };
  }
  const mats = [];
  function M(k, rep, col) {
    const s = stone(k);
    s.map.repeat.set(rep, rep);
    s.em.repeat.set(rep, rep);
    const m = new THREE.MeshStandardMaterial({
      map: s.map,
      emissiveMap: s.em,
      emissive: 0xffffff,
      emissiveIntensity: 1.2,
      flatShading: true,
      roughness: 0.95,
      metalness: 0,
      color: col || 0xffffff,
    });
    mats.push(m);
    return m;
  }
  const skin = M("skin", 0.6),
    shirt = M("shirt", 0.7),
    sarong = M("sarong", 1),
    base = M("skin", 1, 0x9a9c99);
  const dark = new THREE.MeshStandardMaterial({
    color: 0x101114,
    flatShading: true,
    roughness: 1,
  });

  // ---------- geometry helpers ----------
  function J(g, a) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        h = (k) => {
          const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + k) * 43758.5453;
          return s - Math.floor(s) - 0.5;
        };
      p.setXYZ(i, x + h(0) * a, y + h(1) * a, z + h(2) * a);
    }
    return g;
  }
  function P(par, g, m, x, y, z, rx, ry, rz) {
    const o = new THREE.Mesh(g, m);
    o.position.set(x || 0, y || 0, z || 0);
    o.rotation.set(rx || 0, ry || 0, rz || 0);
    par.add(o);
    return o;
  }
  const cyl = (a, b, h, s) => J(new THREE.CylinderGeometry(a, b, h, s), 0.012),
    bx = (w, h, d) => J(new THREE.BoxGeometry(w, h, d), 0.01);

  // ---------- statue ----------
  const root = new THREE.Group();
  P(
    root,
    J(new THREE.CylinderGeometry(1, 1.18, 0.25, 7), 0.06),
    base,
    0,
    0.125,
    0,
  );
  [
    [0.8, 0.3, 0.75, 0.16],
    [-0.85, 0.28, 0.4, 0.12],
    [0.2, 0.3, -0.95, 0.14],
    [-0.4, 0.3, -0.8, 0.1],
  ].forEach((a) =>
    P(
      root,
      J(new THREE.DodecahedronGeometry(a[3], 0), 0.03),
      base,
      a[0],
      a[1],
      a[2],
    ),
  );
  const F = new THREE.Group();
  F.position.y = 0.25;
  F.rotation.y = -0.35;
  root.add(F);

  // feet & calves (front foot braced, back heel lifted)
  P(F, bx(0.2, 0.12, 0.4), skin, 0.17, 0.06, 0.3);
  P(F, bx(0.2, 0.12, 0.4), skin, -0.2, 0.1, -0.28, -0.45);
  P(F, cyl(0.07, 0.09, 0.3, 6), skin, 0.17, 0.22, 0.24, 0.2);
  P(F, cyl(0.07, 0.09, 0.3, 6), skin, -0.2, 0.26, -0.22, -0.45);
  // sarong: skirt, bunched pleat, rolled waistband, knot tails
  const sk = P(
    F,
    J(new THREE.CylinderGeometry(0.3, 0.36, 0.95, 8), 0.035),
    sarong,
    0,
    0.83,
    0,
    0.1,
  );
  P(F, bx(0.18, 0.6, 0.1), sarong, 0.12, 0.75, 0.33, 0.1, 0, 0.1);
  P(
    F,
    J(new THREE.CylinderGeometry(0.33, 0.33, 0.14, 8), 0.025),
    sarong,
    0,
    1.33,
    0,
    0.1,
  );
  P(F, bx(0.09, 0.3, 0.05), sarong, -0.15, 1.15, 0.36, 0.1, 0, 0.2);
  P(F, bx(0.08, 0.24, 0.05), sarong, -0.07, 1.18, 0.37, 0.1, 0, -0.15);

  // upper body leans back, off-balance
  const U = new THREE.Group();
  U.position.set(0, 1.33, 0);
  U.rotation.set(-0.2, 0, 0.05);
  F.add(U);
  const torso = P(U, cyl(0.3, 0.25, 0.8, 8), shirt, 0, 0.4, 0);
  torso.scale.set(1.15, 1, 0.75);
  P(U, cyl(0.28, 0.28, 0.08, 8), shirt, 0, 0.03, 0).scale.set(1.15, 1, 0.78);
  P(U, cyl(0.14, 0.16, 0.06, 8), shirt, 0, 0.82, 0);

  // head: wide-eyed, mouth open, chin up, turned toward the threat
  const H = new THREE.Group();
  H.position.set(0, 1.1, 0.02);
  H.rotation.set(-0.28, 0.55, 0.08);
  U.add(H);
  P(U, cyl(0.09, 0.1, 0.2, 6), skin, 0, 0.9, 0);
  P(H, J(new THREE.SphereGeometry(0.24, 8, 6), 0.012), skin).scale.set(
    1,
    1.12,
    1.02,
  );
  P(H, bx(0.2, 0.12, 0.2), skin, 0, -0.17, 0.06);
  P(H, bx(0.06, 0.1, 0.08), skin, 0, -0.02, 0.24, -0.4);
  P(H, bx(0.09, 0.04, 0.06), skin, -0.09, 0.1, 0.21, 0, 0, 0.3);
  P(H, bx(0.09, 0.04, 0.06), skin, 0.09, 0.1, 0.21, 0, 0, -0.3);
  P(H, bx(0.07, 0.05, 0.04), dark, -0.085, 0.04, 0.22);
  P(H, bx(0.07, 0.05, 0.04), dark, 0.085, 0.04, 0.22);
  P(H, bx(0.1, 0.09, 0.05), dark, 0, -0.12, 0.215);
  P(H, bx(0.04, 0.08, 0.05), skin, -0.245, 0, 0);
  P(H, bx(0.04, 0.08, 0.05), skin, 0.245, 0, 0);
  P(
    H,
    J(new THREE.SphereGeometry(0.26, 8, 5, 0, PI * 2, 0, 1.5), 0.015),
    skin,
    0,
    0.03,
    -0.02,
    -0.3,
  );

  // arms: right shields face, left thrown out palm-first
  function arm(x, u, f) {
    const g = new THREE.Group();
    g.position.set(x, 0.68, 0);
    U.add(g);
    P(g, cyl(0.09, 0.075, 0.42, 6), skin, 0, -0.21, 0);
    P(g, cyl(0.125, 0.14, 0.2, 6), shirt, 0, -0.1, 0);
    const q = new THREE.Group();
    q.position.y = -0.42;
    g.add(q);
    P(q, cyl(0.07, 0.055, 0.4, 6), skin, 0, -0.2, 0);
    P(q, bx(0.11, 0.12, 0.05), skin, 0, -0.46, 0);
    [-0.04, -0.013, 0.013, 0.04].forEach((fx, i) =>
      P(
        q,
        bx(0.025, 0.1 + (i % 3 ? 0.015 : 0), 0.03),
        skin,
        fx * 1.2,
        -0.57,
        0,
        0,
        0,
        fx * -5,
      ),
    );
    g.rotation.set(...u);
    q.rotation.set(...f);
  }
  arm(0.36, [-1.35, 0, -0.35], [-1.7, 0, 0]);
  arm(-0.36, [-0.6, 0, -1], [-0.9, 0, 0]);

  return {
    group: root,
    update(t) {
      mats.forEach(
        (m) => (m.emissiveIntensity = 0.6 + 0.35 * Math.sin(t * 1.5)),
      );
    },
  };
}
