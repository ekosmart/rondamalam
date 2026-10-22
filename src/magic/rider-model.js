// Adapted from user supplied HTML; original retained in assets/magic-source.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
const T = THREE,
  Q = Math.PI / 2,
  V = (x, y, z) => new T.Vector3(x, y, z);
let sd = 7;
const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;

/* ===== Texture atlas: 512x512, 4x4 colour cells + tall strip for the rune handle ===== */
const mkC = () => {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  return c;
};
const AC = mkC(),
  ca = AC.getContext("2d"),
  EC = mkC(),
  ce = EC.getContext("2d");
ce.fillStyle = "#000";
ce.fillRect(0, 0, 512, 512);
const CR = (i) => [(i % 4) * 96, (i >> 2) * 128, 96, 128],
  HR = [384, 0, 128, 512];
const ROBE = 0,
  LINE = 1,
  HAT = 2,
  GOLD = 3,
  SKIN = 4,
  HAIR = 5,
  STRAW = 6,
  CORD = 7,
  EYE = 8,
  LEATH = 9,
  GEM = 10,
  WOOD = 11;
function fc(i, col, n, glow) {
  const [x, y, w, h] = CR(i);
  ca.fillStyle = col;
  ca.fillRect(x, y, w, h);
  for (let k = 0; k < n; k++) {
    ca.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.2)";
    ca.fillRect(x + rnd() * w, y + rnd() * h, 2 + rnd() * 3, 6 + rnd() * 30);
  }
  if (glow) {
    ce.fillStyle = glow;
    ce.fillRect(x, y, w, h);
  }
}
fc(ROBE, "#2b1346", 60);
fc(LINE, "#4d2080", 30);
fc(HAT, "#170c26", 40);
fc(GOLD, "#c9a23c", 12);
fc(SKIN, "#8b9886", 20);
fc(HAIR, "#cfcbe0", 40);
fc(STRAW, "#6e5527", 70);
fc(CORD, "#5c1a36", 20);
fc(EYE, "#200030", 0, "#e070ff");
fc(LEATH, "#130d12", 25);
fc(GEM, "#7a14b0", 0, "#ff4dff");
fc(WOOD, "#33200f", 30);
ca.fillStyle = "#3b2416";
ca.fillRect(...HR);
for (let k = 0; k < 50; k++) {
  ca.strokeStyle = rnd() < 0.5 ? "rgba(0,0,0,.35)" : "rgba(255,200,150,.08)";
  ca.lineWidth = 1 + rnd() * 1.5;
  const x = 384 + rnd() * 128,
    y = rnd() * 512;
  ca.beginPath();
  ca.moveTo(x, y);
  ca.lineTo(x + rnd() * 4 - 2, y + 30 + rnd() * 120);
  ca.stroke();
}
for (let r = 0; r < 18; r++)
  for (let c = 0; c < 6; c++) {
    if (rnd() < 0.4) continue;
    const x = 384 + c * 21.33 + 10.7,
      y = 16 + r * 28,
      s = 9,
      sg = [[0, -s, 0, s]];
    for (let k = 1 + ((rnd() * 3) | 0); k > 0; k--) {
      const yy = (rnd() * 2 - 1) * s * 0.8,
        dx = (rnd() < 0.5 ? -1 : 1) * 6;
      sg.push([0, yy, dx, yy + (rnd() * 2 - 1) * s * 0.7]);
    }
    [
      [ca, "#ff9bff", 0],
      [ce, "#d040ff", 6],
    ].forEach(([g, col, bl]) => {
      g.strokeStyle = col;
      g.lineWidth = 2.4;
      g.shadowColor = "#c040ff";
      g.shadowBlur = bl;
      g.beginPath();
      sg.forEach((l) => {
        g.moveTo(x + l[0], y + l[1]);
        g.lineTo(x + l[2], y + l[3]);
      });
      g.stroke();
      g.shadowBlur = 0;
    });
  }
const tex = new T.CanvasTexture(AC),
  etex = new T.CanvasTexture(EC);
[tex, etex].forEach((t) => {
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
});
const atlasMat = new T.MeshStandardMaterial({
  name: "MAT_WitchAtlas",
  map: tex,
  emissiveMap: etex,
  emissive: 0xffffff,
  emissiveIntensity: 1.3,
  flatShading: true,
  roughness: 0.9,
  metalness: 0,
  side: T.DoubleSide,
});
const uvIn = (rc, u, v) => {
  const [x, y, w, h] = rc,
    d = 3;
  return [
    (x + d + u * (w - 2 * d)) / 512,
    1 - (y + d + (1 - v) * (h - 2 * d)) / 512,
  ];
};

/* ===== Rig: broom + rider merged into ONE static mesh, plus one animated tatter mesh ===== */
const C = (a, b, h, s) => new T.CylinderGeometry(a, b, h, s || 8),
  IC = (r, d) => new T.IcosahedronGeometry(r, d);
function handleGeo(z0, z1, N) {
  const S = 6,
    P = [],
    U = [],
    I = [];
  for (let i = 0; i <= N; i++) {
    const z = z0 + ((z1 - z0) * i) / N,
      tw = i * 0.45,
      k = 1 + 0.22 * Math.sin(i * 1.3);
    for (let j = 0; j <= S; j++) {
      const a = (j / S) * Math.PI * 2 + tw,
        r = (j % 2 ? 0.035 : 0.066) * k;
      P.push(Math.cos(a) * r, Math.sin(a) * r, z);
      U.push(j / S, i / N);
    }
  }
  for (let i = 0; i < N; i++)
    for (let j = 0; j < S; j++) {
      const a = i * (S + 1) + j,
        b = a + 1,
        c = a + S + 1,
        d = c + 1;
      I.push(a, c, b, b, c, d);
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(P, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(U, 2));
  g.setIndex(I);
  g.computeVertexNormals();
  return g;
}

function createWitchRig(broomOnly = false) {
  const G = [],
    pm = new T.Matrix4()
      .makeTranslation(0, 0.12, -0.1)
      .multiply(new T.Matrix4().makeRotationX(0.22));
  const tm = new T.Matrix4(),
    tq = new T.Quaternion(),
    te = new T.Euler();
  function part(g, rc, p, r, s, m) {
    g = g.index ? g.toNonIndexed() : g;
    tm.compose(
      V(...(p || [0, 0, 0])),
      tq.setFromEuler(te.set(...(r || [0, 0, 0]))),
      V(...(s || [1, 1, 1])),
    );
    if (m) tm.premultiply(m);
    g.applyMatrix4(tm);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const q = uvIn(rc, uv.getX(i), uv.getY(i));
      uv.setXY(i, q[0], q[1]);
    }
    G.push(g);
  }
  function limb(a, b, r1, r2, rc, sg) {
    const A = V(...a),
      B = V(...b),
      d = B.clone().sub(A),
      mid = A.clone().add(B).multiplyScalar(0.5);
    part(
      C(r2, r1, d.length(), sg || 5)
        .applyMatrix4(
          new T.Matrix4().makeRotationFromQuaternion(
            new T.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()),
          ),
        )
        .translate(mid.x, mid.y, mid.z),
      rc,
    );
  }
  /* broom */
  part(handleGeo(-1.35, 1.5, 16), HR);
  part(IC(0.09, 0), CR(WOOD), [0, 0, 1.56]);
  part(IC(0.055, 0), CR(GEM), [0, 0, 1.68]);
  const bg = new T.CylinderGeometry(0.07, 0.3, 1.1, 8, 1, true).rotateX(Q),
    bp = bg.attributes.position;
  for (let i = 0; i < bp.count; i++)
    if (bp.getZ(i) < -0.5) {
      const j =
        0.12 +
        0.2 * Math.abs(Math.sin(Math.atan2(bp.getY(i), bp.getX(i)) * 3.1 + 1));
      bp.setXYZ(
        i,
        bp.getX(i) * (1 + j),
        bp.getY(i) * (1 + j),
        bp.getZ(i) - j * 0.9,
      );
    }
  part(bg, CR(STRAW), [0, 0, -1.8]);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    part(
      new T.ConeGeometry(0.035, 1.1, 3).rotateX(-Q),
      CR(STRAW),
      [Math.cos(a) * 0.2, Math.sin(a) * 0.2, -2.55],
      [Math.sin(a) * 0.3, -Math.cos(a) * 0.3, 0],
    );
  }
  part(C(0.115, 0.12, 0.12).rotateX(Q), CR(CORD), [0, 0, -1.42]);
  part(C(0.16, 0.165, 0.1).rotateX(Q), CR(CORD), [0, 0, -1.62]);
  if (broomOnly) {
    const group = new T.Group();
    group.add(new T.Mesh(mergeGeometries(G), atlasMat));
    group.position.y = 1.1;
    const root = new T.Group();
    root.add(group);
    return { group: root };
  }
  /* robe (ragged hem via alternating hem verts) */
  const pts = [
      [0.55, -0.15],
      [0.42, 0.15],
      [0.32, 0.5],
      [0.27, 0.8],
      [0.33, 0.98],
      [0.22, 1.14],
      [0.12, 1.2],
    ].map((p) => new T.Vector2(p[0], p[1])),
    rg = new T.LatheGeometry(pts, 8),
    rp = rg.attributes.position,
    np = pts.length;
  for (let i = 0; i <= 8; i++) {
    const k = i * np,
      o = i % 2;
    rp.setXYZ(
      k,
      rp.getX(k) * (o ? 0.82 : 1.12),
      rp.getY(k) + (o ? 0.14 : -0.12),
      rp.getZ(k) * (o ? 0.82 : 1.12),
    );
  }
  part(rg, CR(ROBE), 0, 0, 0, pm);
  part(C(0.29, 0.3, 0.09).translate(0, 0.62, 0), CR(LINE), 0, 0, 0, pm);
  /* head, beard, eyes, hat */
  part(IC(0.17, 0), CR(SKIN), [0, 1.4, 0.04], 0, 0, pm);
  part(
    new T.ConeGeometry(0.05, 0.18, 4).rotateX(Q),
    CR(SKIN),
    [0, 1.37, 0.2],
    0,
    0,
    pm,
  );
  [-1, 1].forEach((s) =>
    part(
      new T.BoxGeometry(0.05, 0.025, 0.02),
      CR(EYE),
      [s * 0.07, 1.42, 0.17],
      0,
      0,
      pm,
    ),
  );
  part(
    new T.ConeGeometry(0.13, 0.6, 6).rotateX(Math.PI),
    CR(HAIR),
    [0, 1.1, 0.14],
    [0.15, 0, 0],
    0,
    pm,
  );
  const hg = new T.CylinderGeometry(0.02, 0.26, 1, 8, 3).translate(0, 0.5, 0),
    hp = hg.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    const y = hp.getY(i);
    hp.setXYZ(
      i,
      hp.getX(i) + y * y * 0.06,
      y - y * y * 0.1,
      hp.getZ(i) - y * y * 0.55,
    );
  }
  part(hg, CR(HAT), [0, 1.52, 0], [0, 0, 0.04], 0, pm);
  part(C(0.47, 0.47, 0.035), CR(HAT), [0, 1.5, 0], [0.02, 0, 0.04], 0, pm);
  part(C(0.265, 0.275, 0.08), CR(LINE), [0, 1.58, 0], 0, 0, pm);
  part(new T.BoxGeometry(0.1, 0.1, 0.03), CR(GOLD), [0, 1.58, 0.275], 0, 0, pm);
  part(IC(0.035, 0), CR(GEM), [0, 1.58, 0.3], 0, 0, pm);
  /* arms (world space, reach the handle), legs and boots */
  [-1, 1].forEach((s) => {
    const S = [s * 0.27, 1.19, 0.14],
      E = [s * 0.38, 0.66, 0.42],
      H = [s * 0.13, 0.08, 0.62];
    part(IC(0.14, 0), CR(ROBE), S);
    limb(S, E, 0.1, 0.115, CR(ROBE));
    limb(E, H, 0.11, 0.2, CR(ROBE), 6);
    part(IC(0.07, 0), CR(SKIN), [s * 0.13, 0.05, 0.7]);
    limb([s * 0.32, -0.02, 0.02], [s * 0.32, -0.7, 0], 0.09, 0.075, CR(LEATH));
    part(new T.BoxGeometry(0.14, 0.14, 0.3), CR(LEATH), [
      s * 0.32,
      -0.78,
      0.08,
    ]);
  });
  /* merge static parts into one geometry */
  let n = 0;
  G.forEach((g) => (n += g.attributes.position.count));
  const PP = new Float32Array(n * 3),
    NN = new Float32Array(n * 3),
    UU = new Float32Array(n * 2);
  let o = 0;
  G.forEach((g) => {
    PP.set(g.attributes.position.array, o * 3);
    NN.set(g.attributes.normal.array, o * 3);
    UU.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  });
  const mg = new T.BufferGeometry();
  mg.setAttribute("position", new T.BufferAttribute(PP, 3));
  mg.setAttribute("normal", new T.BufferAttribute(NN, 3));
  mg.setAttribute("uv", new T.BufferAttribute(UU, 2));
  const body = new T.Mesh(mg, atlasMat);
  body.name = "WizardBroom_Static";
  /* ragged tatters: 14 triangles, tips animated on the CPU */
  const NT = 14,
    tp = new Float32Array(NT * 9),
    tu = new Float32Array(NT * 6);
  for (let k = 0; k < NT; k++) {
    const o2 = k > 6,
      i = k % 7,
      ph = Math.PI + (i - 3) * 0.42 + (o2 ? 0.2 : 0),
      r = o2 ? 0.55 : 0.47,
      cx = Math.sin(ph) * r,
      cz = -0.12 + Math.cos(ph) * r,
      tx = Math.cos(ph),
      tz = -Math.sin(ph),
      w = 0.12,
      Ln = (o2 ? 1.3 : 0.95) + 0.2 * (i % 2);
    tp.set(
      [
        cx - tx * w,
        0.03,
        cz - tz * w,
        cx + tx * w,
        0.03,
        cz + tz * w,
        cx * 1.25,
        -0.25 - (o2 ? 0.15 : 0),
        cz - Ln,
      ],
      k * 9,
    );
    const rc = CR(o2 ? LINE : ROBE);
    tu.set([...uvIn(rc, 0, 0), ...uvIn(rc, 1, 0), ...uvIn(rc, 0.5, 1)], k * 6);
  }
  const tb = tp.slice(),
    tg = new T.BufferGeometry();
  tg.setAttribute("position", new T.BufferAttribute(tp, 3));
  tg.setAttribute("normal", new T.BufferAttribute(new Float32Array(NT * 9), 3));
  tg.setAttribute("uv", new T.BufferAttribute(tu, 2));
  const tat = new T.Mesh(tg, atlasMat);
  tat.name = "RobeTatters";
  tat.frustumCulled = false;
  const group = new T.Group();
  group.name = "WizardBroomRig";
  group.add(body, tat);
  const tris = n / 3 + NT,
    EM = V(0, 0, -3);
  function update(t) {
    for (let k = 0; k < NT; k++) {
      const i = k * 9 + 6;
      tp[i] = tb[i] + Math.sin(t * 5 + k) * 0.1;
      tp[i + 1] = tb[i + 1] + Math.sin(t * 4.3 + k * 1.7) * 0.12;
      tp[i + 2] = tb[i + 2] + Math.sin(t * 3.1 + k * 0.9) * 0.14;
    }
    tg.attributes.position.needsUpdate = true;
    group.position.y = Math.sin(t * 1.6) * 0.12;
    group.rotation.z = Math.sin(t * 0.9) * 0.12;
    group.rotation.x = Math.sin(t * 1.2) * 0.04;
    group.updateMatrixWorld(true);
  }
  return { group, update, tris, emitter: () => group.localToWorld(EM.clone()) };
}

export { createWitchRig };
