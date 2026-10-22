// Adapted from user supplied HTML; original retained in assets/magic-source.
import * as THREE from "three";
const T = THREE,
  Q = Math.PI / 2;
const mk = (c, n, o) => {
  const m = new T.MeshStandardMaterial(
    Object.assign(
      { color: c, flatShading: true, roughness: 0.8, metalness: 0.1 },
      o,
    ),
  );
  m.name = n;
  return m;
};
const gw = (c, n, o) => {
  const m = new T.MeshBasicMaterial(Object.assign({ color: c }, o));
  m.name = n;
  return m;
};
const M = {
  crimson: mk(0x8c0f22, "MAT_Crimson"),
  char: mk(0x1d1e24, "MAT_Charcoal"),
  brass: mk(0xb08a3a, "MAT_Brass", { metalness: 0.5, roughness: 0.5 }),
  coal: mk(0x0b0b0e, "MAT_Coal"),
  stone: mk(0x6c6a76, "MAT_Stone"),
  ground: mk(0x0e0d14, "MAT_Ground"),
  brick: mk(0xffffff, "MAT_Brick"),
  head: gw(0x39ff6a, "MAT_Glow_Headlight"),
  cab: gw(0x1fd470, "MAT_Glow_Cab"),
  beam: gw(0x39ff6a, "MAT_Glow_Beam", {
    transparent: true,
    opacity: 0.14,
    blending: T.AdditiveBlending,
    depthWrite: false,
    side: T.DoubleSide,
  }),
  steam: gw(0x8fd9ab, "MAT_Steam", {
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  }),
};
const P = (g, m, n, x, y, z, par) => {
  const o = new T.Mesh(g, m);
  o.name = n;
  o.position.set(x, y, z);
  par.add(o);
  return o;
};
const B = (w, h, d) => new T.BoxGeometry(w, h, d),
  C = (a, b, h, s) => new T.CylinderGeometry(a, b, h, s || 8),
  IC = (r, d) => new T.IcosahedronGeometry(r, d);

/* ---------- Locomotive (front = +Z, 1 unit = 1 m) ---------- */
function buildLocomotive() {
  const g = new T.Group();
  g.name = "Locomotive";
  g.position.y = 0.16;
  const wheels = [],
    rods = [],
    puffs = [];
  function wheel(r, x, z) {
    const w = new T.Group(),
      s = Math.sign(x);
    w.name = "Wheel";
    w.position.set(x, r, z);
    w.userData.r = r;
    P(C(r, r, 0.14, 10).rotateZ(Q), M.char, "WheelDisc", 0, 0, 0, w);
    P(
      C(r * 0.4, r * 0.4, 0.2, 6).rotateZ(Q),
      M.crimson,
      "WheelHub",
      s * 0.03,
      0,
      0,
      w,
    );
    if (r > 0.5) {
      P(B(0.1, r * 1.7, 0.08), M.crimson, "Spoke", s * 0.1, 0, 0, w);
      P(B(0.1, 0.08, r * 1.7), M.crimson, "Spoke", s * 0.1, 0, 0, w);
    }
    g.add(w);
    wheels.push(w);
  }
  P(B(1.6, 0.28, 5.8), M.char, "Chassis", 0, 0.8, 0.15, g);
  P(C(0.7, 0.7, 3.2).rotateX(Q), M.crimson, "Boiler", 0, 1.6, 0.7, g);
  [-0.3, 0.7, 1.7].forEach((z) =>
    P(C(0.73, 0.73, 0.12).rotateX(Q), M.brass, "BoilerBand", 0, 1.6, z, g),
  );
  P(C(0.72, 0.72, 0.7).rotateX(Q), M.char, "Smokebox", 0, 1.6, 2.55, g);
  P(C(0.3, 0.2, 0.9), M.char, "Chimney", 0, 2.8, 1.9, g);
  P(C(0.36, 0.36, 0.08), M.brass, "ChimneyRim", 0, 3.28, 1.9, g);
  const dome = new T.SphereGeometry(0.32, 8, 5, 0, 6.283, 0, Q);
  P(dome, M.crimson, "SteamDome", 0, 2.3, 1, g);
  P(dome, M.brass, "SandDome", 0, 2.3, 0.1, g);
  P(C(0.24, 0.24, 0.4).rotateX(Q), M.brass, "LampHousing", 0, 2.55, 2.55, g);
  P(IC(0.17, 1), M.head, "Headlight_Top", 0, 2.55, 2.78, g);
  [-1, 1].forEach((s) => {
    const k = s < 0 ? "L" : "R";
    P(C(0.2, 0.2, 0.1).rotateX(Q), M.brass, "EyeRing", s * 0.32, 1.75, 2.92, g);
    P(IC(0.15, 1), M.head, "Headlight_" + k, s * 0.32, 1.75, 2.97, g);
    P(
      new T.ConeGeometry(0.55, 3, 8, 1, true).rotateX(-Q),
      M.beam,
      "Beam_" + k,
      s * 0.32,
      1.75,
      4.47,
      g,
    );
  });
  P(B(1.7, 1.6, 1.7), M.crimson, "Cab", 0, 1.75, -1.7, g);
  P(B(1.76, 0.2, 1.76), M.char, "CabTrim", 0, 1.05, -1.7, g);
  P(B(2, 0.14, 2.1), M.char, "CabRoof", 0, 2.62, -1.7, g);
  [-1, 1].forEach((s) =>
    P(B(0.04, 0.5, 0.6), M.cab, "CabWindow", s * 0.86, 1.95, -1.7, g),
  );
  P(B(0.6, 0.5, 0.04), M.cab, "CabWindowBack", 0, 1.95, -2.56, g);
  P(B(1.7, 0.2, 0.15), M.crimson, "BufferBeam", 0, 0.7, 3, g);
  P(
    new T.ConeGeometry(0.85, 1.1, 4).rotateY(Math.PI / 4).rotateX(Q),
    M.char,
    "Cowcatcher",
    0,
    0.45,
    3.45,
    g,
  ).scale.y = 0.55;
  [-0.2, 0.8, 1.8].forEach((z) =>
    [-0.92, 0.92].forEach((x) => wheel(0.55, x, z)),
  );
  [-0.9, 0.9].forEach((x) => wheel(0.3, x, 2.5));
  [-1, 1].forEach((s) =>
    rods.push(
      P(B(0.06, 0.1, 2.1), M.brass, "ConnectingRod", s * 1.12, 0.55, 0.8, g),
    ),
  );
  P(B(1.7, 1, 2.2), M.char, "Tender", 0, 0.95, -4, g);
  P(B(1.78, 0.18, 2.28), M.crimson, "TenderTrim", 0, 1.45, -4, g);
  P(IC(0.7, 0), M.coal, "Coal", 0, 1.6, -4, g).scale.set(1.1, 0.45, 1.35);
  P(B(0.16, 0.16, 0.5), M.brass, "Coupler", 0, 0.7, -2.85, g);
  [-3.5, -4.5].forEach((z) => [-0.8, 0.8].forEach((x) => wheel(0.4, x, z)));
  for (let i = 0; i < 9; i++) {
    const p = P(IC(0.22, 0), M.steam, "SteamPuff", 0, 3.4, 1.9, g);
    p.userData.o = i * 0.29;
    puffs.push(p);
  }
  return { g, wheels, rods, puffs };
}
function buildTrack() {
  const t = new T.Group(),
    sl = new T.Group();
  t.name = "Track";
  sl.name = "Sleepers";
  t.add(sl);
  for (let i = -30; i < 30; i++)
    P(B(2.7, 0.08, 0.28), M.char, "Sleeper", 0, 0.04, i * 1.2, sl);
  [-0.92, 0.92].forEach((x) =>
    P(B(0.12, 0.12, 80), M.brass, "Rail", x, 0.1, 0, t),
  );
  return { t, sl };
}

/* ---------- Brick wall portal (opening faces +Z) ---------- */
const FRAG = `uniform float uTime,uProx;varying vec2 vP;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.03+7.1;a*=.5;}return v;}
vec3 brick(vec2 p){float r=floor(p.y/.25);float od=mod(r,2.);vec2 q=vec2(p.x/.5-.5*od,p.y/.25);vec2 c=floor(q),f=fract(q);
 float m=step(.04,f.x)*step(f.x,.96)*step(.1,f.y)*step(f.y,.9);
 vec3 col=mix(vec3(.42,.15,.11),vec3(.3,.1,.09),h(c+r));col*=.8+.35*n(p*8.);return mix(vec3(.1,.09,.1),col,m);}
vec3 galaxy(vec2 c){float r=length(c);float a=atan(c.y,c.x)+2./(r+.35)-uTime*.45;vec2 q=vec2(cos(a),sin(a))*r;
 float f=fbm(q*2.6+uTime*.04),g=fbm(q*5.+4.);
 vec3 col=mix(vec3(.03,0.,.14),vec3(.05,.65,.5),f);col=mix(col,vec3(.75,.2,.95),g*smoothstep(.2,1.,r));
 col+=vec3(1.,.95,.8)*exp(-r*4.5)*1.4;
 vec2 s=floor(c*38.+vec2(uTime*.2,0.));col+=step(.975,h(s))*(.6+.4*sin(uTime*3.+h(s)*30.));return col;}
void main(){vec2 c=vP-vec2(0.,2.);float d=length(c);
 vec2 off=normalize(c+1e-4)*sin(d*14.-uTime*4.)*.035*uProx;
 vec2 p=vP+off;
 float nz=fbm(vP*3.)*.75+d*.2;float th=mix(-.1,1.3,uProx);
 float m=smoothstep(th-.03,th+.03,nz);
 float e=(1.-smoothstep(0.,.07,abs(nz-th)))*(1.-smoothstep(.9,1.,uProx));
 vec3 col=mix(galaxy(c*.9+off),brick(p)*.85,m)+vec3(.2,1.,.5)*e*1.8;
 gl_FragColor=vec4(col,1.);}`;
function buildPortal() {
  const g = new T.Group();
  g.name = "BrickPortal";
  const pos = [];
  for (let r = 0; r < 22; r++) {
    const od = r % 2,
      cy = (r + 0.5) * 0.25;
    for (let i = -9; i < 9; i++) {
      const cx = (i + 0.5 + 0.5 * od) * 0.5,
        ax = Math.abs(cx);
      if (
        ax > 4.1 ||
        (ax < 1.95 && (cy < 2.5 || Math.hypot(cx, cy - 2.5) < 1.95))
      )
        continue;
      pos.push([cx, cy]);
    }
  }
  const bricks = new T.InstancedMesh(B(0.46, 0.21, 0.3), M.brick, pos.length),
    mt = new T.Matrix4(),
    col = new T.Color();
  bricks.name = "Bricks";
  pos.forEach((p, i) => {
    mt.setPosition(p[0], p[1], 0);
    bricks.setMatrixAt(i, mt);
    col.setHSL(0.02 + Math.random() * 0.02, 0.5, 0.2 + Math.random() * 0.1);
    bricks.setColorAt(i, col);
  });
  bricks.instanceMatrix.needsUpdate = true;
  bricks.instanceColor.needsUpdate = true;
  g.add(bricks);
  [-1, 1].forEach((s) => {
    for (let y = 0.15; y < 2.5; y += 0.3)
      P(B(0.4, 0.28, 0.4), M.stone, "Jamb", s * 1.7, y, 0.05, g);
  });
  for (let k = 0; k < 11; k++) {
    const a = ((k + 0.5) / 11) * Math.PI,
      v = P(
        B(0.4, 0.5, 0.4),
        M.stone,
        k == 5 ? "Keystone" : "Voussoir",
        Math.cos(a) * 1.7,
        2.5 + Math.sin(a) * 1.7,
        0.05,
        g,
      );
    v.rotation.z = a;
    if (k == 5) v.scale.set(1.35, 1.1, 1);
  }
  const sh = new T.Shape();
  sh.moveTo(-1.5, 0);
  sh.lineTo(1.5, 0);
  sh.lineTo(1.5, 2.5);
  sh.absarc(0, 2.5, 1.5, 0, Math.PI, false);
  sh.lineTo(-1.5, 0);
  const mat = new T.ShaderMaterial({
    name: "MAT_Portal_Nebula",
    side: T.DoubleSide,
    uniforms: { uTime: { value: 0 }, uProx: { value: 0 } },
    vertexShader:
      "varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: FRAG,
  });
  P(new T.ShapeGeometry(sh, 24), mat, "PortalSurface", 0, 0, 0.12, g);
  return { g, mat };
}

export { buildLocomotive, buildTrack, buildPortal };
