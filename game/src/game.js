(() => {
'use strict';
const T = window.THREE, X = window.THREEX;
const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const deg = d => (d * Math.PI) / 180;
const UP = V(0, 1, 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const $ = s => document.querySelector(s);
const isTouch = matchMedia('(pointer: coarse)').matches;

/* ================= 렌더러 ================= */
const canvas = $('#c');
const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

/*CAR*/

const QUALITY = { high: { pr: 2, shadow: 4096 }, mid: { pr: 1.5, shadow: 2048 }, low: { pr: 1, shadow: 1024 } };
const opt = { dead: true, tape: true, sound: true, keys: true, speed: 0.8, quality: isTouch ? 'low' : 'mid' };

/* ================= 장면과 빛 ================= */
const scene = new T.Scene();
scene.background = new T.Color(0x20242b);
const pmrem = new T.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new X.RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;
const hemi = new T.HemisphereLight(0xfff4e8, 0x8a6e52, 1.05);
scene.add(hemi);
const SUN_DIR = V(0.3, -0.58, 0.76).normalize();
const sun = new T.DirectionalLight(0xffe6c4, 3.0);
sun.castShadow = true;
sun.shadow.bias = -0.0002;
sun.shadow.normalBias = 2.5;
sun.shadow.radius = 2.5;
Object.assign(sun.shadow.camera, { left: -6000, right: 6000, top: 6000, bottom: -6000, near: 500, far: 24000 });
sun.target.position.set(3600, 0, 1750);
sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, -11000);
scene.add(sun, sun.target);
const fillL = new T.DirectionalLight(0xdbe5ff, 0.4);
fillL.position.set(5200, 5000, 8000);
fillL.target.position.set(3600, 0, 1750);
scene.add(fillL, fillL.target);

/* ================= 텍스처 ================= */
let rs = 5;
const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
function ctex(w, h, draw, rep, o = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c);
  t.colorSpace = o.linear ? T.NoColorSpace : T.SRGBColorSpace;
  t.anisotropy = maxAniso;
  if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
const woodTex = ctex(2048, 2048, (c, w, h) => {
  const rows = 12, pw = h / rows;
  for (let r = 0; r < rows; r++) {
    let x = -rnd() * w * 0.6;
    while (x < w) {
      const len = (0.33 + rnd() * 0.5) * w, hue = 30 + rnd() * 7, sat = 32 + rnd() * 10, li = 55 + rnd() * 11;
      const grain = Array.from({ length: 20 }, () => ({ y: r * pw + 3 + rnd() * (pw - 6), a: 0.05 + rnd() * 0.12, lw: 0.8 + rnd() * 1.8, l: li - 15 - rnd() * 12, amp: 0.8 + rnd() * 2.2, ph: rnd() * 6 }));
      const plank = ox => {
        c.fillStyle = `hsl(${hue},${sat}%,${li}%)`;
        c.fillRect(x + ox, r * pw, len, pw);
        for (const g of grain) {
          c.strokeStyle = `hsla(${hue - 5},${sat + 10}%,${g.l}%,${g.a})`;
          c.lineWidth = g.lw;
          c.beginPath();
          c.moveTo(x + ox, g.y);
          for (let q = 1; q <= 10; q++) c.lineTo(x + ox + (len * q) / 10, g.y + Math.sin(q * 0.9 + g.ph) * g.amp);
          c.stroke();
        }
        c.fillStyle = 'rgba(70,46,28,0.55)';
        c.fillRect(x + ox + len - 2, r * pw, 2, pw);
      };
      plank(0);
      if (x < 0) plank(w);
      if (x + len > w) plank(-w);
      x += len;
    }
    c.fillStyle = 'rgba(64,42,26,0.6)';
    c.fillRect(0, r * pw, w, 2);
  }
}, [1 / 1800, 1 / 1800]);
const tileTex = (base, line, sizePx) => ctex(512, 512, (c, w, h) => {
  c.fillStyle = base; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) { c.fillStyle = `rgba(0,0,0,${rnd() * 0.035})`; c.fillRect(rnd() * w, rnd() * h, 2, 2); }
  c.fillStyle = line;
  for (let p = 0; p <= w; p += sizePx) { c.fillRect(p - 2, 0, 4, h); c.fillRect(0, p - 2, w, 4); }
});
const greyTile = tileTex('#d9d9d6', 'rgba(120,120,118,0.55)', 256);
const darkTile = tileTex('#9a9690', 'rgba(70,66,60,0.6)', 256);
const kitchenTile = tileTex('#e7e4de', 'rgba(150,146,138,0.55)', 128);
const rugTex = ctex(1024, 800, (c, w, h) => {
  c.fillStyle = '#d8cdbd'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 26000; i++) { const v = 170 + rnd() * 60 | 0; c.fillStyle = `rgba(${v},${v - 10},${v - 24},0.35)`; c.fillRect(rnd() * w, rnd() * h, 1.6, 1.6); }
  c.strokeStyle = '#a8977f'; c.lineWidth = 10; c.strokeRect(40, 40, w - 80, h - 80);
  c.lineWidth = 3; c.strokeRect(64, 64, w - 128, h - 128);
  c.strokeStyle = 'rgba(168,151,127,0.45)'; c.lineWidth = 2;
  for (let x = 120; x < w - 100; x += 60) { c.beginPath(); c.moveTo(x, 110); c.lineTo(x + 30, h / 2); c.lineTo(x, h - 110); c.stroke(); }
});
const runnerTex = ctex(1024, 160, (c, w, h) => {
  c.fillStyle = '#5c6b7c'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const v = 70 + rnd() * 60 | 0; c.fillStyle = `rgba(${v},${v + 12},${v + 26},0.4)`; c.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
  c.fillStyle = '#d9d3c6'; c.fillRect(0, 14, w, 6); c.fillRect(0, h - 20, w, 6);
});
const matTex = ctex(512, 256, (c, w, h) => {
  c.fillStyle = '#7d8a6e'; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 3;
  for (let x = -h; x < w; x += 28) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + h, h); c.stroke(); }
});
const fabricTex = ctex(256, 256, (c, w, h) => {
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const v = 200 + rnd() * 55 | 0; c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
}, [4, 4]);
const walnutTex = ctex(1024, 256, (c, w, h) => {
  c.fillStyle = '#6b4a33'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { const y = rnd() * h; c.strokeStyle = `rgba(${40 + rnd() * 30},${25 + rnd() * 20},${15},${0.15 + rnd() * 0.25})`; c.lineWidth = 1 + rnd() * 3; c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= w; x += 64) c.lineTo(x, y + Math.sin(x / 90 + i) * 4); c.stroke(); }
});
const stoneTex = ctex(512, 512, (c, w, h) => {
  c.fillStyle = '#cfccc6'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 6000; i++) { const v = 120 + rnd() * 120 | 0; c.fillStyle = `rgba(${v},${v},${v - 6},0.5)`; c.fillRect(rnd() * w, rnd() * h, 2, 2); }
}, [3, 1]);
const skyTex = ctex(16, 256, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#9cc3ef'); g.addColorStop(0.55, '#d8e9f7'); g.addColorStop(0.85, '#fff4df'); g.addColorStop(1, '#f2e2c6');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});
const blobTex = ctex(128, 128, (c, w, h) => {
  const g = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});
const stripTex = ctex(4, 64, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});
const tapeTex = ctex(64, 16, (c, w, h) => {
  c.fillStyle = '#3f7fe0'; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,0.12)'; for (let x = 0; x < w; x += 6) c.fillRect(x, 0, 2, h);
}, null);
tapeTex.wrapS = T.RepeatWrapping;

/* ================= 재질 ================= */
const MC = new Map();
const M = (name, make) => { if (!MC.has(name)) MC.set(name, make()); return MC.get(name); };
const std = (name, p) => M(name, () => new T.MeshStandardMaterial(p));
const mWall = std('wall', { color: 0xece7df, roughness: 0.92 });
const mCap = std('cap', { color: 0x30343a, roughness: 0.8 });
const mTrim = std('trim', { color: 0xf7f6f2, roughness: 0.45 });
const mWood = std('wood', { map: woodTex, roughness: 0.4 });
const mWalnut = std('walnut', { map: walnutTex, roughness: 0.5 });
const mOak = std('oak', { color: 0xcaa77c, roughness: 0.55 });
const mWhite = std('whiteF', { color: 0xf3f1ec, roughness: 0.45 });
const mBlack = std('blackM', { color: 0x1d1f22, roughness: 0.4, metalness: 0.4 });
const mGloss = std('gloss', { color: 0x0b0c0e, roughness: 0.14, metalness: 0.3 });
const mSteel = std('steel', { color: 0xd3d6da, roughness: 0.3, metalness: 0.55 });
const mStone = std('stone', { map: stoneTex, roughness: 0.3 });
const mFabric = std('fabric', { map: fabricTex, color: 0x8b8f95, roughness: 0.95 });
const mLeaf = std('leaf', { color: 0x3e7a43, roughness: 0.65 });
const mPot = std('pot', { color: 0xe6e0d6, roughness: 0.6 });
const mTerra = std('terra', { color: 0xb5643e, roughness: 0.75 });
const mDark = std('darkline', { color: 0x2b2420, roughness: 0.8 });
const mGlass = M('glass', () => new T.MeshBasicMaterial({ map: skyTex, toneMapped: false }));
const mCurtain = M('curtain', () => new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, transparent: true, opacity: 0.78, side: T.DoubleSide }));
const mLamp = M('lamp', () => new T.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffd9a0, emissiveIntensity: 0.9, roughness: 0.8, side: T.DoubleSide }));
const aoMat = op => M('ao' + op, () => new T.MeshBasicMaterial({ color: 0x000000, map: blobTex, transparent: true, opacity: op, depthWrite: false, toneMapped: false }));
const stripMat = M('strip', () => new T.MeshBasicMaterial({ color: 0x000000, map: stripTex, transparent: true, opacity: 0.2, depthWrite: false, toneMapped: false }));

/* ================= 세계: 충돌체, 높이 ================= */
const statics = new T.Group();
scene.add(statics);
const colliders = [];
const features = { plates: [], ramps: [], adds: [] };
function addBox(x0, x1, z0, z1, o = {}) {
  const ang = o.ang || 0;
  colliders.push({ t: 'b', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hx: Math.abs(x1 - x0) / 2, hz: Math.abs(z1 - z0) / 2, c: Math.cos(ang), s: Math.sin(ang), wall: !!o.wall, tall: o.tall !== false });
}
function addCircle(x, z, r, o = {}) { colliders.push({ t: 'c', x, z, r, wall: false, tall: o.tall !== false }); }
function box(mat, [x0, x1], [y0, y1], [z0, z1], o = {}) {
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const r = Math.min(o.r || 0, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01);
  const geo = r > 0.5 ? new X.RoundedBoxGeometry(w, h, d, 2, r) : new T.BoxGeometry(w, h, d);
  const m = new T.Mesh(geo, mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  if (o.ry) m.rotation.y = o.ry;
  if (o.rx) m.rotation.x = o.rx;
  if (o.rz) m.rotation.z = o.rz;
  m.castShadow = o.cast !== false;
  m.receiveShadow = true;
  (o.parent || statics).add(m);
  return m;
}
function cyl(mat, x, y0, z, r, h, o = {}) {
  const m = new T.Mesh(new T.CylinderGeometry(o.rt ?? r, r, h, o.seg || 24), mat);
  m.position.set(x, y0 + h / 2, z);
  m.castShadow = o.cast !== false;
  m.receiveShadow = true;
  (o.parent || statics).add(m);
  return m;
}
function plane(mat, w, d, x, y, z, o = {}) {
  const g = new T.PlaneGeometry(w, d);
  if (o.uvScale) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * o.uvScale[0], uv.getY(i) * o.uvScale[1]); }
  const m = new T.Mesh(g, mat);
  m.rotation.x = -Math.PI / 2;
  if (o.rz) m.rotation.z = o.rz;
  m.position.set(x, y, z);
  m.receiveShadow = o.recv !== false;
  m.castShadow = false;
  if (o.order) m.renderOrder = o.order;
  (o.parent || statics).add(m);
  return m;
}
const ao = (x, z, w, d, op = 0.4, y = 0.6) => plane(aoMat(op), w, d, x, y, z, { recv: false, order: 1 });
function aoStrip(x0, x1, z0, z1, dir) {
  // dir: 벽이 있는 쪽 'n' 's' 'w' 'e'
  const w = x1 - x0, d = z1 - z0;
  const m = plane(stripMat, w, d, (x0 + x1) / 2, 0.5, (z0 + z1) / 2, { recv: false, order: 1 });
  m.rotation.z = { n: 0, s: Math.PI, w: -Math.PI / 2, e: Math.PI / 2 }[dir];
  if (dir === 'w' || dir === 'e') { m.geometry.dispose(); m.geometry = new T.PlaneGeometry(d, w); }
}

function baseLevel(x, z) {
  if (z < -150 && z > -1300 && x > 0 && x < 3800) return -100;
  if (x > 6400 && x < 7200 && z > 3720 && z < 4800) return -120;
  return 0;
}
function plateH(f, x, z) {
  if (x <= f.x0 || x >= f.x1 || z <= f.z0 || z >= f.z1) return 0;
  const d = Math.min(x - f.x0, f.x1 - x, z - f.z0, f.z1 - z);
  return f.h * Math.min(1, d / f.e);
}
function segDist(ax, az, bx, bz, x, z) {
  const vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz;
  const t = clamp(((x - ax) * vx + (z - az) * vz) / L2, 0, 1);
  return Math.hypot(x - (ax + vx * t), z - (az + vz * t));
}
function groundH(x, z) {
  let h = baseLevel(x, z);
  for (const r of features.ramps) {
    if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) {
      const u = r.axis === 'x' ? (x - r.x0) / (r.x1 - r.x0) : (z - r.z0) / (r.z1 - r.z0);
      h = Math.max(h, lerp(r.h0, r.h1, u));
    }
  }
  let p = 0;
  for (const f of features.plates) p = Math.max(p, plateH(f, x, z));
  h += p;
  for (const f of features.adds) {
    if (f.type === 'ridge') {
      const d = segDist(f.ax, f.az, f.bx, f.bz, x, z), hw = f.w / 2;
      if (d < hw) h += f.h; else if (d < hw + f.e) h += f.h * (1 - (d - hw) / f.e);
    } else if (f.type === 'cable') {
      const d = segDist(f.ax, f.az, f.bx, f.bz, x, z), R = f.r * 3;
      if (d < R) h += 2 * f.r * (1 - (d / R) ** 2);
    } else if (f.type === 'bump') {
      const q = ((x - f.x) / f.rx) ** 2 + ((z - f.z) / f.rz) ** 2;
      if (q < 4) h += f.h * Math.exp(-q * 2.2);
    }
  }
  return h;
}

/* ================= 집 짓기 ================= */
const WH = 2400;
function wall(x0, x1, z0, z1, y0 = 0, y1 = WH, o = {}) {
  box(mWall, [x0, x1], [y0, y1], [z0, z1], { cast: true });
  if (y1 >= WH - 1) box(mCap, [x0, x1], [WH, WH + 12], [z0, z1], { cast: false });
  if (y0 < 300 && o.collide !== false) addBox(x0, x1, z0, z1, { wall: true });
}
function casing(xa, xb, z0, z1, top) {
  for (const zf of [z0 - 14, z1]) {
    box(mTrim, [xa - 70, xa], [0, top + 70], [zf, zf + 14], { cast: false });
    box(mTrim, [xb, xb + 70], [0, top + 70], [zf, zf + 14], { cast: false });
    box(mTrim, [xa - 70, xb + 70], [top, top + 70], [zf, zf + 14], { cast: false });
  }
}
function floorPlate(mat, x0, x1, z0, z1, h, e, uv) {
  const m = box(mat, [x0, x1], [0, h], [z0, z1], { cast: false });
  if (uv) { const a = m.geometry.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * uv[0], a.getY(i) * uv[1]); }
  features.plates.push({ x0, x1, z0, z1, h, e });
  return m;
}
function plant(x, z, s = 1, pot = mPot) {
  cyl(pot, x, baseLevel(x, z), z, 160 * s, 380 * s, { rt: 185 * s });
  const y0 = baseLevel(x, z) + 380 * s;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rnd() * 0.4, tilt = 0.5 + rnd() * 0.5, len = (420 + rnd() * 260) * s;
    const leaf = new T.Mesh(new T.SphereGeometry(1, 14, 10), mLeaf);
    leaf.scale.set(len * 0.5, 22 * s, 120 * s);
    leaf.position.set(x + Math.cos(a) * len * 0.42, y0 + 120 * s + Math.sin(tilt) * len * 0.35, z + Math.sin(a) * len * 0.42);
    leaf.rotation.set(0, -a, tilt * 0.9);
    leaf.castShadow = true;
    statics.add(leaf);
  }
  addCircle(x, z, 185 * s);
}

function buildHouse() {
  // 바닥: 거실·주방·복도 (현관 자리는 비움). 단위 mm, 거실 3.8×3.6m, 주방·식탁 3.4×3.6m, 복도 폭 1.08m
  const fl = new T.Shape([[0, 0], [7200, 0], [7200, -3720], [6400, -3720], [6400, -4800], [0, -4800]].map(([a, b]) => new T.Vector2(a, b)));
  const fg = new T.ShapeGeometry(fl);
  fg.rotateX(-Math.PI / 2);
  const floor = new T.Mesh(fg, mWood);
  floor.receiveShadow = true;
  statics.add(floor);
  plane(std('ktile', { map: kitchenTile, roughness: 0.32 }), 3300, 1250, 5550, 0.4, 625, { uvScale: [3300 / 600, 1250 / 600] });
  plane(std('btile', { map: greyTile, roughness: 0.38 }), 3800, 1150, 1900, -100, -725, { uvScale: [3800 / 600, 1150 / 600] });
  plane(std('htile', { map: darkTile, roughness: 0.4 }), 800, 1080, 6800, -120, 4260, { uvScale: [800 / 600, 1080 / 600] });
  box(mTrim, [6390, 6410], [-120, 2], [3720, 4800], { cast: false });

  // 천장: 아래를 향한 면만 그려서 위에서 내려다볼 때는 보이지 않음. 그림자는 만들지 않음
  {
    const ceil = new T.Mesh(new T.PlaneGeometry(7500, 6400), M('ceil', () => new T.MeshBasicMaterial({ color: 0xcdc8c0 })));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(3600, WH, 1750);
    ceil.castShadow = false;
    statics.add(ceil);
    const lampM = M('downlight', () => new T.MeshBasicMaterial({ color: 0xfff3dc, toneMapped: false }));
    const rimM = M('downrim', () => new T.MeshBasicMaterial({ color: 0xb9b3aa }));
    for (const [x, z] of [[1900, 1800], [900, 700], [2900, 3000], [5200, 650], [6300, 2400], [2000, 4260], [4400, 4260], [6800, 4260], [1900, -720]]) {
      for (const [m, r, y] of [[rimM, 120, WH - 1], [lampM, 95, WH - 2]]) {
        const d = new T.Mesh(new T.CircleGeometry(r, 32), m);
        d.rotation.x = Math.PI / 2;
        d.position.set(x, y, z);
        d.castShadow = false;
        statics.add(d);
      }
    }
  }

  // 바깥벽
  wall(-150, 0, -1450, 4950);
  wall(-150, 7350, 4800, 4950);
  wall(7200, 7350, -150, 4950);
  wall(3800, 7350, -150, 0);
  wall(3800, 3950, -1450, -150);
  // 거실-베란다 사이 벽 (문 두 개: D1 경사로, D2 턱)
  wall(0, 500, -150, 0);
  wall(1500, 2300, -150, 0);
  wall(3300, 3800, -150, 0);
  for (const [a, b] of [[500, 1500], [2300, 3300]]) {
    wall(a, b, -150, 0, 2150, WH);
    box(std('sill', { color: 0xbdb8ae, roughness: 0.5 }), [a, b], [-100, 0], [-150, 0], { cast: false });
    box(mSteel, [a, b], [0, 16], [-55, -25], { cast: false });
    features.adds.push({ type: 'ridge', ax: a, az: -40, bx: b, bz: -40, h: 16, w: 26, e: 14 });
    box(mTrim, [a - 50, a], [0, 2150], [-150, 0], { cast: false });
    box(mTrim, [b, b + 50], [0, 2150], [-150, 0], { cast: false });
    for (const [c0, c1] of [[a + 30, a + 290], [b - 290, b - 30]]) {
      const g = new T.PlaneGeometry(c1 - c0, 2250, 32, 1);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin((pos.getX(i) / 65) * Math.PI) * 22);
      g.computeVertexNormals();
      const cm = new T.Mesh(g, mCurtain);
      cm.position.set((c0 + c1) / 2, 1160, 70);
      statics.add(cm);
    }
  }
  // 베란다 바깥 창
  wall(-150, 3950, -1450, -1300, -100, 400);
  wall(-150, 3950, -1450, -1300, 2250, WH);
  for (const x of [0, 950, 1900, 2850, 3750]) box(mTrim, [x, x + 50], [400, 2250], [-1350, -1310], { cast: true });
  box(mTrim, [0, 3800], [1300, 1340], [-1350, -1315], { cast: true });
  const gl = new T.Mesh(new T.PlaneGeometry(3800, 1850), mGlass);
  gl.position.set(1900, 1325, -1390);
  statics.add(gl);
  // 복도 벽 (거실 쪽 문 W, 식탁 쪽 문 E)
  wall(0, 800, 3600, 3720);
  wall(1700, 4500, 3600, 3720);
  wall(5400, 7200, 3600, 3720);
  wall(800, 1700, 3600, 3720, 2100, WH);
  wall(4500, 5400, 3600, 3720, 2100, WH);
  casing(800, 1700, 3600, 3720, 2100);
  casing(4500, 5400, 3600, 3720, 2100);
  for (const [a, b] of [[800, 1700], [4500, 5400]]) {
    box(std('thr', { color: 0x8c6f52, roughness: 0.5 }), [a, b], [0, 15], [3640, 3680], { cast: false, r: 4 });
    features.adds.push({ type: 'ridge', ax: a, az: 3660, bx: b, bz: 3660, h: 15, w: 40, e: 25 });
  }
  // 걸레받이
  for (const [x0, x1, z0, z1] of [[0, 500, 0, 14], [1500, 2300, 0, 14], [3300, 4000, 0, 14], [0, 800, 3586, 3600], [1700, 4500, 3586, 3600], [5400, 7200, 3586, 3600],
    [0, 800, 3720, 3734], [1700, 4500, 3720, 3734], [5400, 6400, 3720, 3734], [0, 6400, 4786, 4800], [0, 14, 0, 3600], [0, 14, 3720, 4800], [7186, 7200, 720, 3600]]) box(mTrim, [x0, x1], [0, 70], [z0, z1], { cast: false });
  aoStrip(0, 7200, 0, 170, 'n');
  aoStrip(0, 7200, 3430, 3600, 's');
  aoStrip(0, 6400, 3720, 3890, 'n');
  aoStrip(0, 6400, 4630, 4800, 's');
  aoStrip(0, 170, 0, 4800, 'w');
  aoStrip(7030, 7200, 0, 3600, 'e');

  /* 거실 */
  box(mWalnut, [40, 470], [80, 470], [1000, 2600], { r: 6 });
  for (const [x, z] of [[90, 1050], [420, 1050], [90, 2550], [420, 2550]]) box(mBlack, [x - 15, x + 15], [0, 80], [z - 15, z + 15]);
  for (const z of [1533, 2066]) box(mDark, [470, 472], [120, 430], [z - 2, z + 2], { cast: false });
  addBox(40, 470, 1000, 2600);
  box(mGloss, [8, 60], [950, 1700], [1250, 2350], { r: 6 });
  box(std('soundbar', { color: 0x2a2c30, roughness: 0.6 }), [70, 150], [470, 530], [1500, 2100], { r: 10 });
  ao(255, 1800, 700, 1900, 0.45);
  floorPlate(std('rug', { map: rugTex, roughness: 1 }), 1000, 2900, 1000, 2600, 6, 40);
  // 소파 테이블 (차는 아래로 지나갈 수 있음)
  box(mWhite, [1500, 2300], [370, 400], [1550, 2050], { r: 5 });
  for (const [x, z] of [[1540, 1590], [2260, 1590], [1540, 2010], [2260, 2010]]) { box(mOak, [x - 20, x + 20], [6, 370], [z - 20, z + 20]); addBox(x - 20, x + 20, z - 20, z + 20); }
  ao(1900, 1800, 1000, 700, 0.3, 6.6);
  box(std('book1', { color: 0x2f5d8a, roughness: 0.7 }), [2040, 2250], [400, 432], [1640, 1800], { r: 3 });
  box(std('book2', { color: 0xc8553d, roughness: 0.7 }), [2060, 2230], [432, 458], [1660, 1780], { r: 3 });
  cyl(mWhite, 1700, 400, 1900, 42, 96);
  // 소파 (서쪽을 봄, 등받이가 식탁 쪽 칸막이 역할)
  for (const [x, z] of [[2810, 860], [3540, 860], [2810, 1800], [3540, 1800], [2810, 2740], [3540, 2740]]) cyl(mBlack, x, 0, z, 18, 120, { seg: 10 });
  box(mFabric, [2750, 3600], [120, 300], [800, 2800], { r: 30 });
  for (const [z0, z1] of [[985, 1527], [1537, 2077], [2087, 2615]]) {
    box(mFabric, [2790, 3430], [300, 450], [z0, z1], { r: 45 });
    box(mFabric, [3250, 3430], [450, 800], [z0 + 10, z1 - 10], { r: 55 });
  }
  box(mFabric, [3420, 3600], [300, 860], [800, 2800], { r: 40 });
  box(mFabric, [2750, 3600], [300, 650], [800, 980], { r: 40 });
  box(mFabric, [2750, 3600], [300, 650], [2620, 2800], { r: 40 });
  box(std('pillow', { color: 0xd9b382, roughness: 0.95 }), [3230, 3380], [450, 760], [1100, 1480], { r: 60, ry: 0.3 });
  addBox(2750, 3600, 800, 2800);
  ao(3175, 1800, 1050, 2250, 0.55);
  // 스탠드, 화분
  cyl(mBlack, 300, 0, 3300, 150, 22);
  cyl(mBlack, 300, 22, 3300, 12, 1480, { seg: 10 });
  {
    const shade = new T.Mesh(new T.CylinderGeometry(150, 220, 300, 32, 1, true), mLamp);
    shade.position.set(300, 1650, 3300);
    statics.add(shade);
  }
  addCircle(300, 3300, 155);
  plant(330, 420, 1);
  // 선풍기
  {
    const fanM = std('fan', { color: 0xf4f4f1, roughness: 0.4 });
    cyl(fanM, 600, 0, 2950, 170, 28);
    cyl(fanM, 600, 28, 2950, 14, 940, { seg: 10 });
    const motor = new T.Mesh(new T.CylinderGeometry(70, 80, 150, 24), fanM);
    motor.rotation.z = Math.PI / 2;
    motor.position.set(570, 1030, 2950);
    const ring = new T.Mesh(new T.TorusGeometry(190, 10, 8, 40), fanM);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(680, 1030, 2950);
    const hub = new T.Mesh(new T.CylinderGeometry(40, 40, 30, 20), std('fanhub', { color: 0x9fb7d0, roughness: 0.3 }));
    hub.rotation.z = Math.PI / 2;
    hub.position.set(670, 1030, 2950);
    for (const m of [motor, ring, hub]) { m.castShadow = true; statics.add(m); }
    for (let i = 0; i < 3; i++) {
      const bl = new T.Mesh(new T.BoxGeometry(6, 150, 60), std('fanblade', { color: 0xbfd2e6, roughness: 0.3, transparent: true, opacity: 0.8 }));
      bl.position.set(668, 1030 + Math.cos((i * 2 * Math.PI) / 3) * 85, 2950 + Math.sin((i * 2 * Math.PI) / 3) * 85);
      bl.rotation.x = (i * 2 * Math.PI) / 3;
      statics.add(bl);
    }
    addCircle(600, 2950, 175);
  }
  // 책장 (거실 남쪽, 복도 벽에 붙음)
  box(mWhite, [2200, 3600], [0, 1800], [3560, 3600], { cast: true });
  for (const x of [2200, 2890, 3580]) box(mWhite, [x, x + 20], [0, 1800], [3300, 3600]);
  for (const y of [0, 440, 880, 1320, 1780]) box(mWhite, [2200, 3600], [y, y + 22], [3300, 3600]);
  const bookCols = [0x2f5d8a, 0xc8553d, 0xe0b04b, 0x4d8b6a, 0x7a5c99, 0xdedad2, 0x3b3f46];
  for (const y of [22, 462, 902, 1342]) {
    let x = 2230;
    while (x < 3550) {
      const w = 22 + rnd() * 30, h = 230 + rnd() * 140;
      if (Math.abs(x - 2900) < 30) { x += 40; continue; }
      box(std('bk' + Math.floor(rnd() * 7), { color: bookCols[Math.floor(rnd() * 7)], roughness: 0.75 }), [x, x + w], [y, y + h], [3340, 3560], { cast: false });
      x += w + 2;
    }
  }
  addBox(2200, 3600, 3300, 3600);
  ao(2900, 3450, 1500, 420, 0.35);
  // 바닥 쿠션 (넘을 수 있음), 푸프 (못 넘음)
  box(std('cushion', { color: 0x6f8fb8, roughness: 0.95 }), [2230, 2670], [0, 70], [2730, 3170], { r: 32 });
  features.adds.push({ type: 'bump', x: 2450, z: 2950, rx: 240, rz: 240, h: 55 });
  cyl(std('pouf', { color: 0xc9a27a, roughness: 0.95 }), 1650, 0, 3150, 200, 380, { rt: 190 });
  addCircle(1650, 3150, 205);
  // 멀티탭 전선 (경로를 가로지름)
  {
    const pts = new T.CatmullRomCurve3([V(480, 4, 2450), V(900, 4, 2560), V(1350, 9, 2700), V(1750, 4, 2800)]).getPoints(60);
    pts.forEach(p => { p.y = groundH(p.x, p.z) + 4; });
    const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 80, 4, 8), std('cable', { color: 0xf2f2f0, roughness: 0.5 }));
    m.castShadow = true;
    statics.add(m);
    for (let i = 0; i < pts.length - 1; i += 6) { const p = pts[i], q = pts[Math.min(pts.length - 1, i + 6)]; features.adds.push({ type: 'cable', ax: p.x, az: p.z, bx: q.x, bz: q.z, r: 4 }); }
    box(mWhite, [1750, 1990], [0, 42], [2760, 2840], { r: 8 });
    addBox(1750, 1990, 2760, 2840, { tall: false });
  }
  // 책 다리 (경사로 - 평평 - 경사로), 경로 위
  {
    const mBoard = std('board', { color: 0xc49a6c, roughness: 0.6 });
    const z0 = 230, z1 = 670, H = 45;
    const ang = Math.atan2(H, 300), len = Math.hypot(300, H);
    box(mBoard, [2100 + 150 - len / 2, 2100 + 150 + len / 2], [H / 2 - 6, H / 2 + 6], [z0, z1], { rz: ang });
    box(mBoard, [2800 + 150 - len / 2, 2800 + 150 + len / 2], [H / 2 - 6, H / 2 + 6], [z0, z1], { rz: -ang });
    box(mBoard, [2400, 2800], [H - 12, H], [z0, z1]);
    for (const x of [2420, 2780]) for (const [zz, col] of [[z0 + 40, 0x2f5d8a], [z1 - 120, 0xc8553d]]) box(std('bb' + col, { color: col, roughness: 0.7 }), [x - 10, x + 10], [0, H - 12], [zz, zz + 80]);
    box(std('bookB', { color: 0x4d8b6a, roughness: 0.7 }), [2450, 2750], [0, H - 12], [z0 + 20, z1 - 20], { cast: false });
    features.ramps.push({ x0: 2100, x1: 2400, z0, z1, axis: 'x', h0: 0, h1: H });
    features.ramps.push({ x0: 2400, x1: 2800, z0, z1, axis: 'x', h0: H, h1: H });
    features.ramps.push({ x0: 2800, x1: 3100, z0, z1, axis: 'x', h0: H, h1: 0 });
  }

  /* 베란다 */
  {
    const mBoard = std('board', {});
    const ang = Math.atan2(100, 410), len = Math.hypot(410, 100);
    const r = box(mBoard, [700, 1300], [-56, -44], [-355 - len / 2, -355 + len / 2], { rx: -ang });
    r.position.y = -50;
    features.ramps.push({ x0: 700, x1: 1300, z0: -560, z1: -150, axis: 'z', h0: -100, h1: 0 });
    plant(300, -1000, 1.0, mTerra);
    plant(2950, -1080, 0.85);
    // 세탁기
    box(std('washer', { color: 0xf2f2f0, roughness: 0.35 }), [3150, 3750], [-100, 750], [-1250, -650], { r: 20 });
    const door = new T.Mesh(new T.CylinderGeometry(190, 190, 16, 40), mSteel);
    door.rotation.z = Math.PI / 2;
    door.position.set(3143, 330, -950);
    const glassD = new T.Mesh(new T.CylinderGeometry(150, 150, 18, 40), std('washglass', { color: 0x2b3440, roughness: 0.1, metalness: 0.2 }));
    glassD.rotation.z = Math.PI / 2;
    glassD.position.set(3140, 330, -950);
    statics.add(door, glassD);
    box(mDark, [3144, 3150], [620, 720], [-1200, -700], { cast: false });
    addBox(3150, 3750, -1250, -650);
    // 빨래 건조대
    const rack = std('rack', { color: 0xdedfe2, roughness: 0.35, metalness: 0.6 });
    for (const [x, z] of [[1700, -1150], [2500, -1150], [1700, -500], [2500, -500]]) { cyl(rack, x, -100, z, 10, 1050, { seg: 8 }); addCircle(x, z, 14); }
    for (const z of [-1150, -500]) box(rack, [1700, 2500], [930, 950], [z - 8, z + 8]);
    for (let i = 0; i < 7; i++) box(rack, [1700 + i * 130, 1708 + i * 130], [940, 952], [-1150, -500]);
    box(std('towel', { color: 0xf0c9a8, roughness: 0.95 }), [1900, 1920], [520, 945], [-1050, -600], { cast: true });
    box(std('towel2', { color: 0xa9c6e8, roughness: 0.95 }), [2250, 2270], [600, 945], [-1000, -650], { cast: true });
    cyl(std('bucket', { color: 0x4f8fd6, roughness: 0.5 }), 500, -100, -480, 150, 260, { rt: 170 });
    addCircle(500, -480, 175);
    box(std('cardboard', { color: 0xc89a62, roughness: 0.9 }), [900, 1250], [-100, 200], [-1250, -1000], { r: 6 });
    addBox(900, 1250, -1250, -1000);
  }

  /* 주방 */
  box(mWhite, [4000, 6400], [100, 880], [0, 580], { r: 3 });
  box(std('kick', { color: 0x3a3c40, roughness: 0.6 }), [4000, 6400], [0, 100], [0, 530], { cast: false });
  box(mStone, [3980, 6420], [880, 920], [0, 620], { r: 4 });
  for (let x = 4600; x < 6400; x += 600) box(mDark, [x - 2, x + 2], [110, 870], [579, 582], { cast: false });
  for (let x = 4300; x < 6400; x += 600) box(mSteel, [x - 120, x + 120], [800, 816], [582, 600], { cast: false });
  box(std('splash', { map: kitchenTile, roughness: 0.3 }), [4000, 6400], [920, 1500], [0, 8], { cast: false });
  box(mWhite, [4000, 6400], [1500, 2200], [0, 340], { r: 3 });
  for (let x = 4480; x < 6400; x += 480) box(mDark, [x - 2, x + 2], [1510, 2190], [339, 342], { cast: false });
  box(mSteel, [4700, 5300], [920, 924], [110, 500], { cast: false });
  cyl(mSteel, 5000, 920, 70, 18, 300, { seg: 12 });
  box(mGloss, [5750, 6250], [920, 926], [90, 540], { cast: false });
  addBox(4000, 6400, 0, 580);
  box(mSteel, [6450, 7180], [0, 1820], [0, 720], { r: 8 });
  box(mDark, [6813, 6817], [20, 1800], [719, 723], { cast: false });
  for (const x of [6775, 6855]) box(std('handle', { color: 0x9da2a8, roughness: 0.3, metalness: 0.8 }), [x - 10, x + 10], [700, 1300], [722, 750]);
  addBox(6450, 7180, 0, 720);
  floorPlate(std('kmat', { map: matTex, roughness: 0.95 }), 4600, 5800, 650, 1100, 8, 20);
  cyl(std('trash', { color: 0xbfc3c8, roughness: 0.3, metalness: 0.6 }), 3830, 0, 300, 150, 560);
  addCircle(3830, 300, 160);
  cyl(std('bowlpet', { color: 0xd65a5a, roughness: 0.5 }), 4250, 0, 1450, 100, 60, { rt: 120 });
  addCircle(4250, 1450, 120);
  cyl(std('bowlpet2', { color: 0x4f8fd6, roughness: 0.5 }), 4470, 0, 1490, 90, 55, { rt: 110 });
  addCircle(4470, 1490, 110);

  /* 식탁 */
  box(mWalnut, [4500, 5900], [720, 752], [1700, 2500], { r: 6 });
  for (const [x, z] of [[4570, 1770], [5830, 1770], [4570, 2430], [5830, 2430]]) { box(mWalnut, [x - 30, x + 30], [0, 720], [z - 30, z + 30]); addBox(x - 30, x + 30, z - 30, z + 30); }
  ao(5200, 2100, 1700, 1100, 0.3);
  for (const [cx, cz, back] of [[4850, 1480, -1], [5550, 1480, -1], [4850, 2720, 1], [5550, 2720, 1]]) {
    box(mOak, [cx - 225, cx + 225], [430, 465], [cz - 220, cz + 220], { r: 10 });
    for (const [dx, dz] of [[-190, -185], [190, -185], [-190, 185], [190, 185]]) { box(mOak, [cx + dx - 13, cx + dx + 13], [0, 430], [cz + dz - 13, cz + dz + 13]); addBox(cx + dx - 13, cx + dx + 13, cz + dz - 13, cz + dz + 13); }
    const bz = cz + back * 205;
    for (const dx of [-190, 190]) box(mOak, [cx + dx - 13, cx + dx + 13], [465, 880], [bz - 10, bz + 10]);
    box(mOak, [cx - 205, cx + 205], [700, 860], [bz - 9, bz + 9], { r: 6 });
    ao(cx, cz, 560, 560, 0.25);
  }
  {
    const bowl = new T.Mesh(new T.LatheGeometry([[0, 0], [90, 4], [150, 50], [160, 80]].map(([a, b]) => new T.Vector2(a, b)), 32), std('bowl', { color: 0xe9e4da, roughness: 0.4, side: T.DoubleSide }));
    bowl.position.set(5200, 752, 2100);
    bowl.castShadow = true;
    statics.add(bowl);
    const orange = std('orange', { color: 0xf08a24, roughness: 0.6 });
    for (const [dx, dz] of [[-50, 20], [40, -30], [30, 50], [-20, -45]]) { const o = new T.Mesh(new T.SphereGeometry(42, 18, 14), orange); o.position.set(5200 + dx, 800 + (dx > 0 ? 6 : 0), 2100 + dz); o.castShadow = true; statics.add(o); }
    cyl(mBlack, 5200, 1600, 2100, 3, 800, { seg: 6, cast: false });
    const pend = new T.Mesh(new T.CylinderGeometry(70, 230, 220, 32, 1, true), mLamp);
    pend.position.set(5200, 1500, 2100);
    statics.add(pend);
  }
  // 동쪽 벽 수납장, 발판, 분리수거함, 로봇청소기 충전대
  box(std('sideboard', { color: 0xe9e4da, roughness: 0.55 }), [6780, 7180], [0, 820], [1150, 2650], { r: 6 });
  for (const z of [1650, 2150]) box(mDark, [6779, 6781], [40, 800], [z - 2, z + 2], { cast: false });
  cyl(mPot, 6980, 820, 1400, 60, 180);
  addBox(6780, 7180, 1150, 2650);
  ao(6980, 1900, 600, 1700, 0.3);
  box(std('stool', { color: 0xe0705a, roughness: 0.6 }), [6500, 6780], [0, 350], [2110, 2390], { r: 12 });
  addBox(6500, 6780, 2110, 2390);
  // 분리수거함
  box(std('bin', { color: 0x4f8fd6, roughness: 0.55 }), [6490, 6750], [0, 600], [2960, 3240], { r: 12 });
  box(std('binlid', { color: 0x2f5d8a, roughness: 0.5 }), [6475, 6765], [600, 635], [2945, 3255], { r: 8 });
  box(mWhite, [6486, 6490], [380, 500], [3040, 3160], { cast: false });
  addBox(6475, 6765, 2945, 3255);
  box(std('dock', { color: 0x2a2c30, roughness: 0.4 }), [6930, 7180], [0, 110], [3150, 3450], { r: 10 });
  addBox(6930, 7180, 3150, 3450, { tall: false });

  /* 복도와 현관 */
  floorPlate(std('runner', { map: runnerTex, roughness: 1 }), 1200, 6000, 3990, 4430, 4, 15);
  for (const [x0, x1] of [[1300, 2100], [3600, 4400]]) {
    box(std('door', { color: 0xd8c3a5, roughness: 0.55 }), [x0, x1], [0, 2100], [4775, 4800], { cast: false });
    box(mSteel, [x1 - 160, x1 - 60], [990, 1010], [4755, 4775], { cast: false });
    box(mTrim, [x0 - 60, x0], [0, 2160], [4780, 4800], { cast: false });
    box(mTrim, [x1, x1 + 60], [0, 2160], [4780, 4800], { cast: false });
    box(mTrim, [x0 - 60, x1 + 60], [2100, 2160], [4780, 4800], { cast: false });
  }
  for (const [x0, x1, col] of [[2300, 2850, 0x6f8fb8], [3100, 3650, 0xe0b04b]]) {
    box(mBlack, [x0, x1], [1100, 1600], [3720, 3750], { cast: false });
    box(std('art' + x0, { color: col, roughness: 0.8 }), [x0 + 40, x1 - 40], [1140, 1560], [3750, 3752], { cast: false });
  }
  // 복도 물건들: 빨래 바구니, 택배 상자, 가방, 무선청소기 거치대, 우산꽂이
  cyl(std('basket', { color: 0xcaa16b, roughness: 0.9 }), 2500, 0, 4560, 170, 420, { rt: 195 });
  addCircle(2500, 4560, 195);
  box(std('cardboard', {}), [3000, 3550], [0, 300], [4400, 4780], { r: 6 });
  box(std('cardboard2', { color: 0xb88a55, roughness: 0.9 }), [3060, 3490], [300, 520], [4450, 4740], { r: 6, ry: 0.05 });
  box(std('ptape', { color: 0xd8c9a8, roughness: 0.4 }), [3060, 3490], [520, 523], [4580, 4610], { cast: false });
  addBox(3000, 3550, 4400, 4780);
  box(std('bag', { color: 0x3b4a5c, roughness: 0.8 }), [3700, 4020], [0, 380], [3730, 3960], { r: 40 });
  box(std('bag2', { color: 0x2f3b4a, roughness: 0.8 }), [3760, 3960], [60, 260], [3955, 3990], { r: 14 });
  addBox(3700, 4020, 3730, 3960);
  cyl(mBlack, 5700, 0, 4650, 130, 25);
  cyl(std('stickvac', { color: 0x8a8f99, roughness: 0.35, metalness: 0.4 }), 5700, 25, 4700, 14, 1050, { seg: 10 });
  box(std('stickvac2', { color: 0x6b4fa0, roughness: 0.4 }), [5640, 5760], [900, 1120], [4640, 4760], { r: 30 });
  addCircle(5700, 4650, 135);
  cyl(std('umb', { color: 0x3d5a80, roughness: 0.5 }), 6250, 0, 3920, 100, 450);
  for (const [dx, dz, col] of [[-30, 20, 0x2b2b2b], [35, -15, 0xc8553d]]) cyl(std('umbh' + col, { color: col, roughness: 0.5 }), 6250 + dx, 450, 3920 + dz, 9, 380, { seg: 8 });
  addCircle(6250, 3920, 110);
  const slip = std('slipper', { color: 0x9ab0c6, roughness: 0.9 });
  box(slip, [4870, 5130], [0, 30], [4540, 4640], { r: 14, ry: 0.15 });
  box(slip, [5040, 5300], [0, 30], [4600, 4700], { r: 14, ry: -0.1 });
  features.adds.push({ type: 'bump', x: 5000, z: 4590, rx: 140, rz: 55, h: 20 });
  features.adds.push({ type: 'bump', x: 5170, z: 4650, rx: 140, rz: 55, h: 20 });
  box(std('shoecab', { color: 0xe9e4da, roughness: 0.55 }), [6450, 7180], [-120, 950], [4500, 4800], { r: 6 });
  addBox(6450, 7180, 4500, 4800);
  box(std('fdoor', { color: 0x6b6f75, roughness: 0.4, metalness: 0.3 }), [7175, 7200], [-120, 2100], [3780, 4460], { cast: false });
  for (const [x, z, r, col] of [[6600, 4000, 0.4, 0xffffff], [6780, 4180, -0.2, 0x2f2f33], [6990, 3960, 0.1, 0xd94b3a]]) {
    box(std('shoe' + col, { color: col, roughness: 0.7 }), [x - 130, x + 130], [-120, -60], [z - 50, z + 50], { r: 20, ry: r });
    addCircle(x, z, 90, { tall: false });
  }
}

/* ================= 정적 메시 합치기 ================= */
// 같은 설정의 재질은 하나로 보고 묶는다 (부품마다 재질을 새로 만들어 그리기 호출이 많아지는 것 방지)
const matKeys = new Map();
function matKey(m, quant) {
  // quant: 차처럼 작은 물체는 눈에 안 띄는 색·거칠기 차이를 무시하고 묶는다
  const c = x => {
    if (!x || !x.isColor) return '';
    if (!quant) return x.getHexString();
    const h = x.getHex();
    return [16, 8, 0].map(sh => Math.round(((h >> sh) & 255) / 20)).join(',');
  };
  const q = (v, st) => (quant && typeof v === 'number' ? Math.round(v / st) : v);
  const tx = x => (x ? x.uuid : '');
  return [m.type, c(m.color), c(m.emissive), m.emissiveIntensity, q(m.roughness, 0.15), q(m.metalness, 0.5), tx(m.map), tx(m.normalMap), tx(m.roughnessMap), tx(m.alphaMap),
    m.transparent, m.opacity, m.side, m.depthWrite, m.depthTest, m.flatShading, m.vertexColors, m.envMapIntensity, m.clearcoat, m.clearcoatRoughness, m.sheen,
    m.toneMapped, m.alphaTest, m.polygonOffset, m.polygonOffsetFactor, m.wireframe, m.blending].join('|');
}
function sharedMat(m, quant) {
  const k = (quant ? 'q' : '') + matKey(m, quant);
  if (!matKeys.has(k)) matKeys.set(k, m);
  return matKeys.get(k);
}
function mergeInto(root, isDyn, quant = false) {
  root.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map(), victims = [];
  const walk = o => {
    for (const ch of o.children) {
      if (isDyn && isDyn(ch)) continue;
      if (ch.isMesh && !Array.isArray(ch.material) && !ch.userData.keep) {
        const mat = sharedMat(ch.material, quant);
        const key = mat.uuid + (ch.castShadow ? 'c' : 'n') + (ch.renderOrder || 0);
        if (!buckets.has(key)) buckets.set(key, { mat, cast: ch.castShadow, order: ch.renderOrder || 0, geos: [] });
        let g = ch.geometry.clone();
        g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, ch.matrixWorld));
        if (g.index) g = g.toNonIndexed();
        for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
        if (!g.attributes.normal) g.computeVertexNormals();
        if (!g.attributes.uv) g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        g.morphAttributes = {};
        buckets.get(key).geos.push(g);
        victims.push(ch);
      }
      walk(ch);
    }
  };
  walk(root);
  for (const v of victims) v.parent.remove(v);
  for (const b of buckets.values()) {
    const merged = X.BufferGeometryUtils.mergeGeometries(b.geos, false);
    if (!merged) continue;
    const m = new T.Mesh(merged, b.mat);
    m.castShadow = b.cast;
    m.receiveShadow = true;
    m.renderOrder = b.order;
    root.add(m);
  }
}

buildHouse();
mergeInto(statics);

/* ================= 경로, 체크포인트, 테이프 ================= */
const WP = [[1700, 450], [2400, 450], [3000, 450], [3550, 570], [4150, 860], [5200, 950], [6050, 1120], [6350, 1700], [6350, 2500], [6150, 3020], [5650, 3230], [5150, 3330], [4950, 3680], [4650, 4130], [4000, 4200], [3000, 4170], [2100, 4140], [1550, 3950], [1300, 3550], [1150, 3000], [1000, 2100], [1020, 1300], [1200, 750], [1400, 520]];
const route = new T.CatmullRomCurve3(WP.map(([x, z]) => V(x, 0, z)), true, 'centripetal');
const ROUTE_N = 800;
const RP = route.getSpacedPoints(ROUTE_N);
const ROUTE_LEN = route.getLength();
const CP_N = 12;
const TAPE_HALF = 225, OFF_TRACK = 270;
const gates = [];
for (let i = 0; i < CP_N; i++) {
  const u = i / CP_N, p = route.getPointAt(u), t = route.getTangentAt(u).setY(0).normalize();
  gates.push({ p, t, n: V(-t.z, 0, t.x) });
}
const START = (() => {
  const u = 110 / ROUTE_LEN, p = route.getPointAt(u), t = route.getTangentAt(u);
  return { x: p.x, z: p.z, yaw: Math.atan2(-t.z, t.x) };
})();
const tapeGroup = new T.Group();
scene.add(tapeGroup);
{
  const mTape = new T.MeshStandardMaterial({ map: tapeTex, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const side of [-1, 1]) {
    const pos = [], uv = [], idx = [];
    let acc = 0;
    for (let i = 0; i <= ROUTE_N; i++) {
      const u = i / ROUTE_N, p = route.getPointAt(u), t = route.getTangentAt(u).setY(0).normalize(), n = V(-t.z, 0, t.x);
      const c = p.clone().addScaledVector(n, side * TAPE_HALF);
      if (i) acc += c.distanceTo(V(pos[pos.length - 3], 0, pos[pos.length - 1]).add(n.clone().multiplyScalar(-side * 18)));
      for (const k of [-1, 1]) {
        const q = c.clone().addScaledVector(n, k * 18);
        pos.push(q.x, groundH(q.x, q.z) + 0.9, q.z);
        uv.push(acc / 64, k < 0 ? 0 : 1);
      }
      if (i < ROUTE_N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new T.Mesh(g, mTape);
    m.receiveShadow = true;
    tapeGroup.add(m);
  }
}
const gateMesh = new T.Group();
scene.add(gateMesh);
const gateMat = new T.MeshBasicMaterial({ color: 0x5b82ff, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false });
const gateBar = new T.Mesh(new T.PlaneGeometry(40, 520), gateMat);
gateBar.rotation.x = -Math.PI / 2;
gateMesh.add(gateBar);
const gateNumCanvas = document.createElement('canvas');
gateNumCanvas.width = 128; gateNumCanvas.height = 128;
const gateNumTex = new T.CanvasTexture(gateNumCanvas);
gateNumTex.colorSpace = T.SRGBColorSpace;
const gateSprite = new T.Sprite(new T.SpriteMaterial({ map: gateNumTex, depthTest: true, toneMapped: false }));
gateSprite.scale.set(130, 130, 1);
gateMesh.add(gateSprite);
function drawGateNumber(n, finish) {
  const c = gateNumCanvas.getContext('2d');
  c.clearRect(0, 0, 128, 128);
  c.fillStyle = finish ? '#ffffff' : '#5b82ff';
  c.beginPath(); c.arc(64, 64, 56, 0, Math.PI * 2); c.fill();
  c.fillStyle = finish ? '#111' : '#fff';
  c.font = '700 60px "IBM Plex Sans KR", sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(finish ? '🏁' : String(n), 64, 68);
  gateNumTex.needsUpdate = true;
}
function placeGate(i) {
  const g = gates[i];
  gateMesh.position.set(g.p.x, groundH(g.p.x, g.p.z) + 1.2, g.p.z);
  gateMesh.rotation.y = Math.atan2(-g.t.z, g.t.x);
  gateSprite.position.set(0, 230, 0);
  drawGateNumber(i, i === 0);
}

/* ================= 내 차 ================= */
const built = buildCar();
const car3d = built.car, rig = built.rig;
rig.planEdges.visible = false;
car3d.traverse(o => {
  if (!o.isMesh) return;
  for (const m of [].concat(o.material)) {
    if (m.transmission > 0) { m.transmission = 0; m.transparent = true; m.opacity = 0.3; m.depthWrite = false; m.roughness = 0.08; }
  }
});
car3d.getObjectByName('powerbank').traverse(o => {
  if (o.isMesh && o.material.transparent && o.material.opacity > 0.5) { o.material.transparent = false; o.material.opacity = 1; o.material.depthWrite = true; o.castShadow = true; }
});
for (const id of ['fpc', 'servocables', 'powerwires', 'i2c']) car3d.getObjectByName(id).traverse(o => { if (o.isMesh) o.castShadow = false; });
const dyn = new Set([...rig.frontPivots, ...rig.wheels, ...rig.knuckles, rig.tie, ...rig.tieEnds, rig.horn, rig.drag, ...rig.dragEnds, rig.fan]);
mergeInto(car3d, o => dyn.has(o), true);
for (const g of [...rig.wheels, ...rig.knuckles, rig.horn, rig.fan]) mergeInto(g, null, true);
const CAR_CX = (built.RX + built.FX) / 2;
const carRoot = new T.Group();
const carBody = new T.Group();
scene.add(carRoot);
carRoot.add(carBody);
car3d.position.x = -CAR_CX;
carBody.add(car3d);
const carShadow = new T.Mesh(new T.PlaneGeometry(430, 210), new T.MeshBasicMaterial({ color: 0x000000, map: blobTex, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }));
carShadow.rotation.x = -Math.PI / 2;
carShadow.renderOrder = 2;
scene.add(carShadow);
function placeRod(m, A, B) {
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.scale.set(1, Math.max(A.distanceTo(B), 0.01), 1);
  m.quaternion.setFromUnitVectors(UP, B.clone().sub(A).normalize());
}
function applySteer(a) {
  for (const pv of rig.frontPivots) pv.rotation.y = a;
  for (const k of rig.knuckles) k.rotation.y = a;
  const ends = rig.knuckles.map(k => V(-14, 4.8, 0).applyAxisAngle(UP, a).add(k.position));
  placeRod(rig.tie, ends[0], ends[1]);
  rig.tieEnds.forEach((m, i) => m.position.copy(ends[i]));
  rig.horn.rotation.y = a * 1.25;
  const h = V(-10, 0, 0).applyAxisAngle(UP, rig.horn.rotation.y).add(rig.horn.position);
  const k = V(6, 9.5, 0).applyAxisAngle(UP, a).add(rig.knuckles[0].position);
  placeRod(rig.drag, h, k);
  rig.dragEnds[0].position.copy(h);
  rig.dragEnds[1].position.copy(k);
}
const pipCam = new T.PerspectiveCamera(72, 4 / 3, 12, 30000);
pipCam.position.set(18, 0, 0);
pipCam.rotation.set(0, -Math.PI / 2, 0);
rig.camHead.add(pipCam);

/* ================= 밀 수 있는 물건, 로봇청소기 ================= */
const props = [];
function addProp(kind, x, z, o = {}) {
  let mesh, r, m, fr, rest, yoff;
  if (kind === 'ball') {
    const tex = ctex(256, 128, (c, w, h) => { c.fillStyle = '#ffd23f'; c.fillRect(0, 0, w, h); c.fillStyle = '#ef4f4f'; for (let i = 0; i < 4; i++) c.fillRect(i * 64, 0, 32, h); });
    mesh = new T.Mesh(new T.SphereGeometry(65, 28, 20), new T.MeshStandardMaterial({ map: tex, roughness: 0.45 }));
    r = 65; m = 0.12; fr = 0.55; rest = 0.6; yoff = 65;
  } else if (kind === 'block') {
    mesh = new T.Mesh(new X.RoundedBoxGeometry(52, 52, 52, 2, 6), new T.MeshStandardMaterial({ color: o.color, roughness: 0.5 }));
    r = 31; m = 0.05; fr = 4.5; rest = 0.3; yoff = 26;
  } else if (kind === 'bottle') {
    mesh = new T.Mesh(new T.CylinderGeometry(28, 36, 220, 20), new T.MeshStandardMaterial({ color: 0xbfe3ff, roughness: 0.08, transparent: true, opacity: 0.55 }));
    r = 37; m = 0.04; fr = 3; rest = 0.35; yoff = 110;
  } else {
    mesh = new T.Mesh(new X.RoundedBoxGeometry(280, 220, 260, 2, 8), new T.MeshStandardMaterial({ color: 0xc89a62, roughness: 0.9 }));
    r = 150; m = 0.6; fr = 6; rest = 0.15; yoff = 110;
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  const p = { kind, x, z, x0: x, z0: z, vx: 0, vz: 0, r, m, fr, rest, yoff, mesh, ry: rnd() * 6, spin: 0 };
  mesh.rotation.y = p.ry;
  props.push(p);
  return p;
}
addProp('ball', 1950, 3380);
addProp('ball', 4250, 3330);
[0xef4f4f, 0x4f8fef, 0xffd23f, 0x3ccf7a, 0xb56fe8, 0xff9f43, 0x4f8fef, 0xef4f4f].forEach((c, i) => addProp('block', 1500 + (i % 4) * 66 + (i > 3 ? 30 : 0), 3390 + Math.floor(i / 4) * 70, { color: c }));
[0xef4f4f, 0xffd23f, 0x3ccf7a].forEach((c, i) => addProp('block', 3920 + i * 70, 4480 + (i % 2) * 40, { color: c }));
addProp('bottle', 6480, 1380);
addProp('bottle', 6545, 1450);
addProp('bottle', 6610, 1385);
addProp('box', 5950, 4300);
addProp('box', 1350, -900);
const vac = { name: '로봇청소기', x: 4300, z: 2950, x0: 4300, z0: 2950, a: 0.6, a0: 0.6, v: 210, r: 170, share: 0.3, turn: 0, mesh: new T.Group(), led: null };
vac.onHit = () => { vac.turn = 1.2; };
{
  const body = new T.Mesh(new T.CylinderGeometry(170, 170, 80, 40), new T.MeshStandardMaterial({ color: 0x24262a, roughness: 0.35, metalness: 0.2 }));
  body.position.y = 50;
  const top = new T.Mesh(new T.CylinderGeometry(150, 150, 6, 40), new T.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.2, metalness: 0.5 }));
  top.position.y = 92;
  const bump = new T.Mesh(new T.CylinderGeometry(172, 172, 40, 40, 1, true, -1.2, 2.4), new T.MeshStandardMaterial({ color: 0x8d9198, roughness: 0.5, side: T.DoubleSide }));
  bump.position.y = 40;
  bump.rotation.y = Math.PI / 2;
  vac.led = new T.Mesh(new T.SphereGeometry(8, 10, 8), new T.MeshStandardMaterial({ color: 0x3ccf7a, emissive: 0x3ccf7a, emissiveIntensity: 2 }));
  vac.led.position.set(90, 96, 0);
  const lidar = new T.Mesh(new T.CylinderGeometry(40, 40, 24, 24), new T.MeshStandardMaterial({ color: 0x15171a, roughness: 0.3 }));
  lidar.position.set(-30, 106, 0);
  for (const m of [body, top, bump, vac.led, lidar]) { m.castShadow = true; vac.mesh.add(m); }
  scene.add(vac.mesh);
}
/* 고양이: 집 안을 어슬렁거리다가 차가 빠르게 다가오면 피한다 */
const cat = { name: '고양이', x: 2350, z: 3250, x0: 2350, z0: 3250, a: 2.6, a0: 2.6, vis: 2.6, v: 0, r: 125, share: 0.5, mode: 'idle', t: 1.5, phase: 0, meowT: -9, mesh: new T.Group(), legs: [], tail: null, head: null, body: null };
{
  const furTex = ctex(256, 64, (c, w, h) => {
    c.fillStyle = '#d88a3c'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(150,80,30,0.55)';
    for (let x = 10; x < w; x += 34) { c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + 8, h / 2, x, h); c.lineTo(x + 9, h); c.quadraticCurveTo(x + 17, h / 2, x + 9, 0); c.fill(); }
  });
  const fur = new T.MeshStandardMaterial({ map: furTex, roughness: 0.92 });
  const furPlain = new T.MeshStandardMaterial({ color: 0xd88a3c, roughness: 0.92 });
  const white = new T.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.92 });
  const dark = new T.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.35 });
  const pink = new T.MeshStandardMaterial({ color: 0xe89a9a, roughness: 0.6 });
  const body = new T.Mesh(new T.CapsuleGeometry(64, 200, 8, 16), fur);
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 185, 0);
  const chest = new T.Mesh(new T.SphereGeometry(55, 16, 12), white);
  chest.position.set(118, 172, 0);
  chest.scale.set(0.75, 1, 0.95);
  const head = new T.Group();
  head.position.set(178, 248, 0);
  const skull = new T.Mesh(new T.SphereGeometry(60, 20, 16), furPlain);
  skull.scale.set(0.95, 0.9, 1.05);
  const muzzle = new T.Mesh(new T.SphereGeometry(28, 14, 10), white);
  muzzle.position.set(44, -18, 0);
  muzzle.scale.set(0.75, 0.68, 1.25);
  const nose = new T.Mesh(new T.SphereGeometry(7, 8, 6), pink);
  nose.position.set(64, -6, 0);
  head.add(skull, muzzle, nose);
  for (const sd of [-1, 1]) {
    const eye = new T.Mesh(new T.SphereGeometry(9, 10, 8), dark);
    eye.position.set(46, 14, sd * 24);
    const ear = new T.Mesh(new T.ConeGeometry(24, 52, 4), furPlain);
    ear.position.set(4, 54, sd * 32);
    ear.rotation.set(sd * 0.25, 0, -0.15);
    head.add(eye, ear);
  }
  for (const [lx, lz] of [[95, -36], [95, 36], [-95, -36], [-95, 36]]) {
    const pivot = new T.Group();
    pivot.position.set(lx, 160, lz);
    const leg = new T.Mesh(new T.CylinderGeometry(15, 13, 160, 10), furPlain);
    leg.position.y = -80;
    const paw = new T.Mesh(new T.SphereGeometry(17, 10, 8), white);
    paw.position.y = -156;
    paw.scale.set(1.2, 0.6, 1);
    pivot.add(leg, paw);
    cat.legs.push(pivot);
    cat.mesh.add(pivot);
  }
  const tail = new T.Group();
  tail.position.set(-120, 200, 0);
  tail.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([V(0, 0, 0), V(-70, 30, 0), V(-120, 110, 0), V(-105, 200, 0)]), 24, 14, 8), fur));
  Object.assign(cat, { body, head, tail });
  cat.mesh.add(body, chest, head, tail);
  cat.mesh.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(cat.mesh);
}
cat.onHit = into => {
  if (into > 60) startFlee(cat, Math.atan2(-(cat.z - car.z), cat.x - car.x));
};
const movers = [vac, cat];

/* ================= 충돌 격자 ================= */
const CELL = 1000;
const grid = new Map();
function cellsOf(x, z, r) {
  const out = [];
  for (let ix = Math.floor((x - r) / CELL); ix <= Math.floor((x + r) / CELL); ix++) for (let iz = Math.floor((z - r) / CELL); iz <= Math.floor((z + r) / CELL); iz++) out.push(ix + ',' + iz);
  return out;
}
colliders.forEach((c, i) => {
  const r = c.t === 'c' ? c.r : Math.hypot(c.hx, c.hz);
  for (const k of cellsOf(c.x, c.z, r)) { if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); }
});
function nearby(x, z, r) {
  const set = new Set();
  for (const k of cellsOf(x, z, r)) { const a = grid.get(k); if (a) for (const i of a) set.add(i); }
  return [...set].map(i => colliders[i]);
}
// 원과 충돌체: 겹치면 [밀어낼 방향 x, z, 깊이]
function circleHit(c, px, pz, pr) {
  if (c.t === 'c') {
    const dx = px - c.x, dz = pz - c.z, d = Math.hypot(dx, dz), pen = c.r + pr - d;
    if (pen > 0 && d > 1e-6) return [dx / d, dz / d, pen];
    return null;
  }
  const dx = px - c.x, dz = pz - c.z;
  const lx = dx * c.c - dz * c.s, lz = dx * c.s + dz * c.c;
  const qx = clamp(lx, -c.hx, c.hx), qz = clamp(lz, -c.hz, c.hz);
  let nx, nz, pen;
  if (qx === lx && qz === lz) {
    const ex = c.hx - Math.abs(lx), ez = c.hz - Math.abs(lz);
    if (ex < ez) { nx = Math.sign(lx) || 1; nz = 0; pen = ex + pr; } else { nx = 0; nz = Math.sign(lz) || 1; pen = ez + pr; }
  } else {
    const ox = lx - qx, oz = lz - qz, d = Math.hypot(ox, oz);
    pen = pr - d;
    if (pen <= 0) return null;
    nx = ox / d; nz = oz / d;
  }
  return [nx * c.c + nz * c.s, -nx * c.s + nz * c.c, pen];
}
function rayWall(x0, z0, x1, z1) {
  // 카메라가 벽을 뚫지 않게: 0~1 사이 처음 막히는 비율
  let best = 1;
  const steps = 18;
  for (let i = 1; i <= steps; i++) {
    const f = i / steps, x = lerp(x0, x1, f), z = lerp(z0, z1, f);
    for (const c of nearby(x, z, 60)) {
      if (!c.wall && !c.tall) continue;
      if (c.t === 'b' && circleHit(c, x, z, 45)) { best = Math.min(best, (i - 1) / steps); break; }
    }
    if (best < 1) break;
  }
  return best;
}

/* ================= 차 상태와 물리 ================= */
const L_WB = 190, TRACK = 88, R_TIRE = 35.5, DMAX = deg(25);
const CAR_CIRCLES = [-112, 0, 112], CAR_R = 60, CAR_MASS = 1.2;
const car = { x: 0, z: 0, yaw: 0, v: 0, delta: 0, wh: [0, 0, 0, 0], y: 0, pitch: 0, roll: 0, spin: 0, stuckT: 0 };
function wheelPts(x, z, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw), out = [];
  for (const [lx, lz] of [[95, -44], [95, 44], [-95, -44], [-95, 44]]) out.push([x + lx * c + lz * s, z - lx * s + lz * c]);
  return out;
}
function placeCar(x, z, yaw) {
  car.x = x; car.z = z; car.yaw = yaw; car.v = 0; car.delta = 0;
  car.wh = wheelPts(x, z, yaw).map(([wx, wz]) => groundH(wx, wz));
  car.y = car.wh.reduce((a, b) => a + b) / 4;
  car.pitch = 0; car.roll = 0;
}
placeCar(START.x, START.z, START.yaw);

const input = { steer: 0, thr: 0 };
const state = {
  playing: false, paused: false, mode: 'collect', drive: 'user', rec: false, constant: false, maxThr: 0.6,
  records: 0, bad: [], recAcc: 0, lastCrash: -99, crashes: 0, deleted: 0, time: 0,
  cp: 1, lap: 0, lapStart: 0, laps: [], best: null, offTrack: false, routeIdx: 0, camMode: 0, stutter: false, deadZone: false,
};
const CAMS = [['chase', '추격 카메라'], ['fpv', '차 카메라 (넓게)'], ['model', '모델 입력 160×120'], ['top', '위에서 보기'], ['orbit', '자유 시점 (마우스로 돌리기)']];

function motorTarget(u) {
  // u: 최대 스로틀을 곱한 값 (-1 ~ 1). 실제 ESC: 정지 구간 359~402 → 전진 0.42, 후진 0.40부터 움직임
  state.deadZone = false; state.stutter = false;
  if (!opt.dead) return u * 1300;
  if (u > 0.42) { if (u < 0.52) state.stutter = true; return ((u - 0.42) / 0.58) * 1600; }
  if (u < -0.4) return ((u + 0.4) / 0.6) * 1100;
  if (Math.abs(u) > 0.02) state.deadZone = true;
  return 0;
}
function nearestRoute(x, z) {
  let bi = state.routeIdx, bd = Infinity;
  for (let k = -40; k <= 40; k++) {
    const i = (state.routeIdx + k + ROUTE_N) % ROUTE_N, p = RP[i], d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < bd) { bd = d; bi = i; }
  }
  if (bd > 600 * 600) {
    for (let i = 0; i < ROUTE_N; i++) { const p = RP[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; bi = i; } }
  }
  state.routeIdx = bi;
  return Math.sqrt(bd);
}
function autopilotSteer() {
  const look = Math.round((clamp(250 + Math.abs(car.v) * 0.3, 320, 650) / ROUTE_LEN) * ROUTE_N);
  const p = RP[(state.routeIdx + look) % ROUTE_N];
  const dx = p.x - car.x, dz = p.z - car.z, c = Math.cos(car.yaw), s = Math.sin(car.yaw);
  const f = dx * c - dz * s, lft = -dx * s - dz * c;
  const kappa = (2 * lft) / Math.max(1, f * f + lft * lft);
  return clamp(Math.atan(L_WB * kappa) / DMAX, -1, 1);
}

let lastImpact = 0;
function physicsStep(dt) {
  const t = state.time;
  // 명령
  let steerCmd = input.steer, thrCmd = input.thr;
  if (state.drive !== 'user') steerCmd = autopilotSteer();
  if (state.drive === 'local' || state.constant) thrCmd = 1;
  const u = thrCmd * state.maxThr;
  car.u = u;
  car.steerCmd = steerCmd;
  // 조향 (서보 속도 제한)
  const dTarget = steerCmd * DMAX, rate = deg(330) * dt;
  const prevDelta = car.delta;
  car.delta += clamp(dTarget - car.delta, -rate, rate);
  car.steerRate = (car.delta - prevDelta) / dt;
  // 속도
  let vt = motorTarget(u);
  if (state.stutter) vt *= 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 8));
  const slope = car.pitch;
  if (vt !== 0) vt *= clamp(1 - Math.sin(slope) * 2.2 * Math.sign(vt), 0.3, 1.25);
  const same = Math.sign(vt) === Math.sign(car.v) || car.v === 0;
  const acc = vt === 0 ? 2400 : same && Math.abs(vt) > Math.abs(car.v) ? 1600 : 2600;
  car.v += clamp(vt - car.v, -acc * dt, acc * dt);
  if (Math.abs(car.v) < 2 && vt === 0) car.v = 0;
  // 이동 후보
  const yaw2 = car.yaw + (car.v * Math.tan(car.delta) / L_WB) * dt;
  let x2 = car.x + car.v * Math.cos(yaw2) * dt, z2 = car.z - car.v * Math.sin(yaw2) * dt;
  // 턱 검사 (바퀴가 한 번에 24mm 넘게 올라가면 막힘)
  const wp = wheelPts(x2, z2, yaw2), wh2 = wp.map(([wx, wz]) => groundH(wx, wz));
  let blocked = false;
  for (let i = 0; i < 4; i++) if (wh2[i] - car.wh[i] > 24) blocked = true;
  if (blocked) {
    if (Math.abs(car.v) > 120) bump(Math.abs(car.v));
    car.v = 0;
    car.stuckT += dt;
    return;
  }
  car.x = x2; car.z = z2; car.yaw = yaw2; car.wh = wh2;
  // 벽, 가구와 충돌
  const c = Math.cos(car.yaw), s = Math.sin(car.yaw);
  let impact = 0, impactWhat = '';
  for (let pass = 0; pass < 2; pass++) {
    for (const lx of CAR_CIRCLES) {
      const px = car.x + lx * c, pz = car.z - lx * s;
      const list = nearby(px, pz, CAR_R + 10);
      for (const col of list) {
        const h = circleHit(col, px, pz, CAR_R);
        if (!h) continue;
        car.x += h[0] * h[2];
        car.z += h[1] * h[2];
        const into = -(car.v * c * h[0] - car.v * s * h[1]);
        if (into > impact) { impact = into; impactWhat = ''; }
      }
      // 로봇청소기, 고양이
      for (const m of movers) {
        const dx = px - m.x, dz = pz - m.z, d = Math.hypot(dx, dz), pen = CAR_R + m.r - d;
        if (pen <= 0 || d < 1e-6) continue;
        car.x += (dx / d) * pen * (1 - m.share); car.z += (dz / d) * pen * (1 - m.share);
        m.x -= (dx / d) * pen * m.share; m.z -= (dz / d) * pen * m.share;
        const into = -(car.v * c * (dx / d) - car.v * s * (dz / d));
        if (into > impact) { impact = into; impactWhat = m.name; }
        m.onHit(into);
      }
    }
  }
  if (impact > 0) {
    car.v *= impact > 150 ? -0.15 : 0.35;
    if (impact > 140 && t - lastImpact > 0.5) { lastImpact = t; crash(impact, impactWhat); }
  }
  car.wh = wheelPts(car.x, car.z, car.yaw).map(([wx, wz]) => groundH(wx, wz));
  car.spin += (car.v / R_TIRE) * dt;
  // 물건 밀기
  for (const p of props) {
    for (const lx of CAR_CIRCLES) {
      const px = car.x + lx * c, pz = car.z - lx * s, dx = p.x - px, dz = p.z - pz, d = Math.hypot(dx, dz), pen = CAR_R + p.r - d;
      if (pen <= 0 || d < 1e-6) continue;
      const nx = dx / d, nz = dz / d;
      p.x += nx * pen; p.z += nz * pen;
      const cvx = car.v * c, cvz = -car.v * s, cn = cvx * nx + cvz * nz, pn = p.vx * nx + p.vz * nz;
      if (cn > pn) {
        const j = ((1 + p.rest) * (cn - pn)) / (1 / CAR_MASS + 1 / p.m);
        p.vx += (j / p.m) * nx; p.vz += (j / p.m) * nz; p.spin += (rnd() - 0.5) * 6;
        car.v -= (j / CAR_MASS) * (nx * c - nz * s);
        if (p.kind === 'box' && cn - pn > 220 && t - lastImpact > 0.5) { lastImpact = t; crash(cn - pn, '상자'); }
      }
    }
  }
}
function propsStep(dt) {
  for (const p of props) {
    p.x += p.vx * dt; p.z += p.vz * dt;
    const f = Math.exp(-p.fr * dt);
    p.vx *= f; p.vz *= f; p.spin *= Math.exp(-3 * dt);
    p.ry += p.spin * dt;
    for (const col of nearby(p.x, p.z, p.r + 10)) {
      const h = circleHit(col, p.x, p.z, p.r);
      if (!h) continue;
      p.x += h[0] * h[2]; p.z += h[1] * h[2];
      const vn = p.vx * h[0] + p.vz * h[1];
      if (vn < 0) { p.vx -= (1 + p.rest) * vn * h[0]; p.vz -= (1 + p.rest) * vn * h[1]; }
    }
    for (const m of movers) {
      const dx = p.x - m.x, dz = p.z - m.z, d = Math.hypot(dx, dz), pen = p.r + m.r - d;
      if (pen > 0 && d > 1e-6) { p.x += (dx / d) * pen; p.z += (dz / d) * pen; p.vx += (dx / d) * 120; p.vz += (dz / d) * 120; if (m === vac) vac.turn = 0.8; }
    }
  }
  for (let i = 0; i < props.length; i++) for (let j = i + 1; j < props.length; j++) {
    const a = props[i], b = props[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), pen = a.r + b.r - d;
    if (pen <= 0 || d < 1e-6) continue;
    const nx = dx / d, nz = dz / d, wa = b.m / (a.m + b.m), wb = a.m / (a.m + b.m);
    a.x -= nx * pen * wa; a.z -= nz * pen * wa; b.x += nx * pen * wb; b.z += nz * pen * wb;
    const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
    if (rv < 0) { const j2 = (-(1 + 0.4) * rv) / (1 / a.m + 1 / b.m); a.vx -= (j2 / a.m) * nx; a.vz -= (j2 / a.m) * nz; b.vx += (j2 / b.m) * nx; b.vz += (j2 / b.m) * nz; }
  }
}
function vacStep(dt) {
  for (const col of nearby(vac.x, vac.z, vac.r + 10)) { const h = circleHit(col, vac.x, vac.z, vac.r); if (h) { vac.x += h[0] * h[2]; vac.z += h[1] * h[2]; } }
  if (vac.turn > 0) { vac.turn -= dt; vac.a += 2.4 * dt; return; }
  if (rnd() < 0.15 * dt) vac.turn = 0.4 + rnd() * 0.9;
  const nx = vac.x + Math.cos(vac.a) * vac.v * dt, nz = vac.z - Math.sin(vac.a) * vac.v * dt;
  let hit = false;
  for (const col of nearby(nx, nz, vac.r + 10)) if (circleHit(col, nx, nz, vac.r)) { hit = true; break; }
  if (Math.abs(groundH(nx, nz) - groundH(vac.x, vac.z)) > 12) hit = true;
  if (hit) { vac.turn = 0.6 + rnd() * 1.1; return; }
  vac.x = nx; vac.z = nz;
}
function startFlee(m, a) {
  if (m.mode === 'flee') return;
  m.mode = 'flee'; m.t = 0.7 + rnd() * 0.4; m.a = a + (rnd() - 0.5) * 0.8;
  if (state.time - m.meowT > 2.5) { m.meowT = state.time; meow(); }
}
function catStep(dt) {
  cat.t -= dt;
  // 차가 가까이서 빠르게 다가오면 도망
  const dx = cat.x - car.x, dz = cat.z - car.z, d = Math.hypot(dx, dz) || 1;
  const approach = (car.v * Math.cos(car.yaw) * dx - car.v * Math.sin(car.yaw) * dz) / d;
  if (d < 420 + Math.abs(car.v) * 0.55 && approach > 150) {
    // 차가 오는 길에서 옆으로 비켜 뜀
    const hx = Math.cos(car.yaw) * Math.sign(car.v || 1), hz = -Math.sin(car.yaw) * Math.sign(car.v || 1);
    const side = Math.sign(dx * -hz + dz * hx) || 1;
    const fx = side * -hz + (0.5 * dx) / d, fz = side * hx + (0.5 * dz) / d;
    startFlee(cat, Math.atan2(-fz, fx));
  }
  // 청소기와 겹치면 비켜서 도망
  const vx = cat.x - vac.x, vz = cat.z - vac.z, vd = Math.hypot(vx, vz), vpen = cat.r + vac.r - vd;
  if (vpen > 0 && vd > 1e-6) { cat.x += (vx / vd) * vpen; cat.z += (vz / vd) * vpen; startFlee(cat, Math.atan2(-vz, vx)); }
  if (cat.t <= 0) {
    if (cat.mode === 'idle') { cat.mode = 'walk'; cat.t = 2 + rnd() * 4; cat.a += (rnd() - 0.5) * 2.4; }
    else { cat.mode = 'idle'; cat.t = 2 + rnd() * 5; }
  }
  const sp = cat.mode === 'walk' ? 230 : cat.mode === 'flee' ? 760 : 0;
  cat.v = lerp(cat.v, sp, 1 - Math.exp(-dt * 6));
  for (const col of nearby(cat.x, cat.z, cat.r + 10)) { const h = circleHit(col, cat.x, cat.z, cat.r); if (h) { cat.x += h[0] * h[2]; cat.z += h[1] * h[2]; } }
  if (cat.v < 5) return;
  const nx = cat.x + Math.cos(cat.a) * cat.v * dt, nz = cat.z - Math.sin(cat.a) * cat.v * dt;
  let hit = false;
  for (const col of nearby(nx, nz, cat.r + 10)) if (circleHit(col, nx, nz, cat.r)) { hit = true; break; }
  if (Math.abs(groundH(nx, nz) - groundH(cat.x, cat.z)) > 20) hit = true;
  if (hit) { cat.a += (rnd() < 0.5 ? 1 : -1) * (0.8 + rnd() * 1.4); return; }
  cat.x = nx; cat.z = nz;
  cat.phase += cat.v * dt * 0.045;
}

/* ================= 기록, 체크포인트, 랩 ================= */
function crash(speed, what = '') {
  state.crashes++;
  state.lastCrash = state.time;
  thud(Math.min(1, speed / 600));
  const hit = what ? `${what}와 부딪혔어요` : '쾅! 부딪혔어요';
  if (state.playing) toast(state.rec ? `${hit}. 이 근처 기록은 나쁜 데이터예요. X로 지울 수 있어요` : hit, 'warn');
}
let bumpT = 0;
function bump(speed) { if (state.time - bumpT > 0.6) { bumpT = state.time; thud(Math.min(0.6, speed / 900)); if (state.playing) toast('턱에 걸렸어요. 비스듬히 넘거나 돌아가 보세요', 'warn'); } }
function recordStep(dt) {
  if (!state.rec || state.drive !== 'user') { state.recAcc = 0; return; }
  state.recAcc += dt;
  while (state.recAcc >= 0.05) {
    state.recAcc -= 0.05;
    const bad = state.time - state.lastCrash < 1.0 || (state.mode === 'collect' && state.offTrack);
    state.bad.push(bad ? 1 : 0);
    state.records++;
  }
}
function deleteRecent() {
  const n = Math.min(100, state.records);
  if (!n) { toast('지울 기록이 없어요'); return; }
  state.bad.length = state.records - n;
  state.records -= n;
  state.deleted += n;
  toast(`최근 기록 ${n}장 삭제 (약 ${(n / 20).toFixed(0)}초)`, 'good');
  beep([520, 390], 0.09);
}
function checkGate(prevX, prevZ) {
  if (state.mode !== 'collect') return;
  const g = gates[state.cp % CP_N];
  const a0 = (prevX - g.p.x) * g.t.x + (prevZ - g.p.z) * g.t.z, a1 = (car.x - g.p.x) * g.t.x + (car.z - g.p.z) * g.t.z;
  const b = (car.x - g.p.x) * g.n.x + (car.z - g.p.z) * g.n.z;
  if (a0 < 0 && a1 >= 0 && Math.abs(b) < 450) {
    if (state.cp % CP_N === 0) {
      const lt = state.time - state.lapStart;
      state.lap++;
      state.laps.push(lt);
      state.best = state.best == null ? lt : Math.min(state.best, lt);
      state.lapStart = state.time;
      toast(`${state.lap}바퀴 완료 ${fmt(lt)}${state.best === lt && state.lap > 1 ? ' (최고 기록)' : ''}`, 'good');
      beep([660, 880, 1320], 0.1);
    } else {
      beep([990], 0.06, 'sine', 0.07);
    }
    state.cp = (state.cp + 1) % CP_N;
    if (state.cp === 0) state.cp = 0;
    placeGate(state.cp % CP_N);
  }
}
function lastGateIndex() { return (state.cp - 1 + CP_N) % CP_N; }
function resetCar() {
  // 기록 주행: 마지막으로 지난 체크포인트로. 자유 주행: 가장 가까운 테이프 경로 위로
  let p, t;
  if (state.mode === 'collect') {
    const g = gates[lastGateIndex()];
    p = g.p.clone().addScaledVector(g.t, 60); t = g.t;
  } else {
    let bi = 0, bd = Infinity;
    RP.forEach((q, i) => { const d = (q.x - car.x) ** 2 + (q.z - car.z) ** 2; if (d < bd) { bd = d; bi = i; } });
    p = RP[bi].clone(); t = RP[(bi + 1) % ROUTE_N].clone().sub(RP[bi]).setY(0).normalize();
  }
  placeCar(p.x, p.z, Math.atan2(-t.z, t.x));
  state.routeIdx = 0;
  nearestRoute(car.x, car.z);
  toast('차를 경로 위로 되돌렸어요');
}
const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

/* ================= 소리 ================= */
let ac = null;
const au = {};
function audioInit() {
  if (ac) return;
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    au.master = ac.createGain();
    au.master.gain.value = opt.sound ? 0.5 : 0;
    au.master.connect(ac.destination);
    au.motor = ac.createOscillator(); au.motor.type = 'sawtooth';
    au.mf = ac.createBiquadFilter(); au.mf.type = 'lowpass'; au.mf.frequency.value = 900;
    au.mg = ac.createGain(); au.mg.gain.value = 0;
    au.motor.connect(au.mf).connect(au.mg).connect(au.master); au.motor.start();
    au.whine = ac.createOscillator(); au.whine.type = 'triangle';
    au.wg = ac.createGain(); au.wg.gain.value = 0;
    au.whine.connect(au.wg).connect(au.master); au.whine.start();
    au.servo = ac.createOscillator(); au.servo.type = 'square'; au.servo.frequency.value = 1250;
    const sf = ac.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 1500; sf.Q.value = 5;
    au.sg = ac.createGain(); au.sg.gain.value = 0;
    au.servo.connect(sf).connect(au.sg).connect(au.master); au.servo.start();
    const buf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
    au.noise = buf;
  } catch (e) { ac = null; }
}
function audioUpdate() {
  if (!ac) return;
  const t = ac.currentTime, sp = Math.abs(car.v), moving = sp > 8;
  au.motor.frequency.setTargetAtTime(48 + (sp / 1600) * 380 + (state.stutter ? 18 * Math.sin(state.time * 50) : 0), t, 0.04);
  au.mg.gain.setTargetAtTime(moving ? 0.05 + Math.min(0.11, (sp / 1200) * 0.11) : 0, t, 0.06);
  au.whine.frequency.setTargetAtTime(300 + (sp / 1600) * 2200, t, 0.05);
  au.wg.gain.setTargetAtTime(moving ? Math.min(0.025, (sp / 1600) * 0.03) : 0, t, 0.06);
  au.sg.gain.setTargetAtTime(Math.min(0.03, Math.abs(car.steerRate || 0) / deg(330) * 0.03), t, 0.02);
}
function beep(freqs, dur = 0.08, type = 'sine', vol = 0.12) {
  if (!ac || !opt.sound) return;
  freqs.forEach((f, i) => {
    const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + i * (dur + 0.03);
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(au.master); o.start(t0); o.stop(t0 + dur + 0.02);
  });
}
function thud(k) {
  if (!ac || !opt.sound) return;
  const s = ac.createBufferSource(); s.buffer = au.noise;
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500 + k * 900;
  const g = ac.createGain(); g.gain.value = 0.25 + k * 0.45;
  s.connect(f).connect(g).connect(au.master); s.start();
}
function meow() {
  if (!ac || !opt.sound) return;
  const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), t0 = ac.currentTime;
  o.type = 'sawtooth'; f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 2.5;
  o.frequency.setValueAtTime(520, t0); o.frequency.linearRampToValueAtTime(860, t0 + 0.13); o.frequency.linearRampToValueAtTime(470, t0 + 0.45);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.16, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
  o.connect(f).connect(g).connect(au.master); o.start(t0); o.stop(t0 + 0.55);
}

/* ================= 화면 (UI) ================= */
const ui = {
  hud: $('#hud'), recState: $('#recState'), recCount: $('#recCount'), goodPct: $('#goodPct'), goodBar: $('#goodBar'), crashes: $('#crashes'), modeChip: $('#modeChip'),
  lapLabel: $('#lapLabel'), lapTime: $('#lapTime'), cpText: $('#cpText'), bestLap: $('#bestLap'), mini: $('#mini'),
  angV: $('#angV'), angBar: $('#angBar'), thrV: $('#thrV'), thrBar: $('#thrBar'), thrCap: $('#thrCap'), spd: $('#spd'), pwm: $('#pwm'), maxThr: $('#maxThr'), dead: $('#dead'),
  pip: $('#pipFrame'), kRec: $('#kRec'), kConst: $('#kConst'), camLabel: $('#camLabel'), toasts: $('#toasts'), start: $('#start'), pause: $('#pause'), summary: $('#summary'), touch: $('#touch'), padState: $('#padState'),
};
function toast(text, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = text;
  ui.toasts.prepend(el);
  while (ui.toasts.children.length > 3) ui.toasts.lastChild.remove();
  setTimeout(() => el.remove(), 2600);
}
const MODE_TXT = { user: 'user (수동 주행)', local_angle: 'local_angle (AI 조향 데모)', local: 'local (AI 전부 데모)' };
function updateHud() {
  const good = state.records - state.bad.reduce((a, b) => a + b, 0);
  ui.recState.classList.toggle('on', state.rec);
  ui.recState.querySelector('b').textContent = state.rec ? (state.drive === 'user' ? 'REC 녹화 중' : 'REC 대기 (AI 모드)') : isTouch ? '녹화 꺼짐' : '녹화 꺼짐 (R / B)';
  ui.recCount.textContent = `${state.records.toLocaleString('ko-KR')}장`;
  ui.goodPct.textContent = state.records ? `${Math.round((good / state.records) * 100)}%` : '-';
  ui.goodBar.style.width = state.records ? `${(good / state.records) * 100}%` : '0%';
  ui.goodBar.style.background = !state.records || good / state.records > 0.85 ? 'var(--ok)' : 'var(--warn)';
  ui.crashes.textContent = state.crashes;
  ui.modeChip.textContent = MODE_TXT[state.drive] + (state.constant ? ' + 일정 속도' : '');
  ui.modeChip.classList.toggle('ai', state.drive !== 'user' || state.constant);
  const collect = state.mode === 'collect';
  ui.lapLabel.textContent = collect ? `바퀴 ${state.lap}` : '자유 주행';
  ui.lapTime.textContent = fmt(collect ? state.time - state.lapStart : state.time);
  ui.cpText.textContent = collect ? `${state.cp === 0 ? CP_N : state.cp} / ${CP_N}${state.offTrack ? '  (경로 밖)' : ''}` : '-';
  ui.bestLap.textContent = state.best == null ? '-' : fmt(state.best);
  const ang = -car.delta / DMAX, thr = car.u || 0;
  ui.angV.textContent = ang.toFixed(2);
  ui.angBar.style.left = `${50 + Math.min(0, ang) * 50}%`;
  ui.angBar.style.width = `${Math.abs(ang) * 50}%`;
  ui.thrV.textContent = thr.toFixed(2);
  ui.thrBar.style.left = thr < 0 ? `${50 + thr * 50}%` : '50%';
  ui.thrBar.style.width = `${Math.abs(thr) * 50}%`;
  ui.thrBar.style.background = thr < 0 ? '#ff8a5b' : 'var(--accent)';
  ui.thrCap.style.left = `${50 + state.maxThr * 50}%`;
  ui.spd.textContent = `${(car.v / 1000).toFixed(2)} m/s`;
  const spwm = Math.round(395 + (car.delta / DMAX) * 60);
  const epwm = Math.round(thr >= 0 ? 380 - thr * 50 : 380 - thr * 55);
  ui.pwm.textContent = `${spwm} / ${epwm}`;
  ui.maxThr.textContent = state.maxThr.toFixed(2);
  ui.kRec.classList.toggle('rec', state.rec);
  ui.kConst.classList.toggle('hold', state.constant);
  ui.dead.textContent = state.deadZone ? `ESC 정지 구간 (PWM ${epwm}): 바퀴가 안 돌아요` : state.stutter ? '정지 구간 근처: 덜덜거리며 가요' : state.constant ? '일정 속도 주행 중 (O / Options로 끄기)' : '';
}

/* 미니맵 */
const MB = { x0: -250, z0: -1550, w: 7700, h: 6600 };
const MINI = { w: 516, h: 400, s: 0 };
MINI.s = Math.min(MINI.w / MB.w, MINI.h / MB.h);
const miniBase = document.createElement('canvas');
miniBase.width = MINI.w; miniBase.height = MINI.h;
const mx = x => (x - MB.x0) * MINI.s + (MINI.w - MB.w * MINI.s) / 2, mz = z => (z - MB.z0) * MINI.s;
{
  const c = miniBase.getContext('2d');
  c.fillStyle = 'rgba(236,231,223,0.12)';
  c.fillRect(mx(0), mz(-1300), 3800 * MINI.s, 1150 * MINI.s);
  c.fillRect(mx(0), mz(0), 7200 * MINI.s, 4800 * MINI.s);
  c.fillStyle = 'rgba(160,170,185,0.28)';
  c.fillRect(mx(6400), mz(3720), 800 * MINI.s, 1080 * MINI.s);
  for (const col of colliders) {
    c.fillStyle = col.wall ? 'rgba(235,238,242,0.85)' : 'rgba(150,160,175,0.7)';
    if (col.t === 'c') { c.beginPath(); c.arc(mx(col.x), mz(col.z), Math.max(1.5, col.r * MINI.s), 0, Math.PI * 2); c.fill(); }
    else {
      c.save(); c.translate(mx(col.x), mz(col.z)); c.rotate(-Math.atan2(col.s, col.c));
      c.fillRect(-col.hx * MINI.s, -col.hz * MINI.s, Math.max(1.5, col.hx * 2 * MINI.s), Math.max(1.5, col.hz * 2 * MINI.s));
      c.restore();
    }
  }
  c.strokeStyle = 'rgba(91,130,255,0.75)'; c.lineWidth = 3;
  c.beginPath();
  RP.forEach((p, i) => (i ? c.lineTo(mx(p.x), mz(p.z)) : c.moveTo(mx(p.x), mz(p.z))));
  c.closePath(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.75)'; c.font = '600 22px "IBM Plex Sans KR", sans-serif';
  for (const [t, x, z] of [['거실', 1650, 2500], ['주방', 4500, 330], ['식탁', 4700, 3150], ['복도', 4700, 4500], ['베란다', 1000, -760], ['현관', 6560, 4420]]) c.fillText(t, mx(x) - 20, mz(z));
}
function drawMini() {
  const c = ui.mini.getContext('2d');
  c.clearRect(0, 0, MINI.w, MINI.h);
  c.drawImage(miniBase, 0, 0);
  if (state.mode === 'collect') {
    const g = gates[state.cp % CP_N];
    c.strokeStyle = '#ffffff'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(mx(g.p.x - g.n.x * 320), mz(g.p.z - g.n.z * 320)); c.lineTo(mx(g.p.x + g.n.x * 320), mz(g.p.z + g.n.z * 320)); c.stroke();
  }
  c.fillStyle = '#ffd23f';
  for (const p of props) { c.beginPath(); c.arc(mx(p.x), mz(p.z), 3.5, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#9aa0a8';
  c.beginPath(); c.arc(mx(vac.x), mz(vac.z), vac.r * MINI.s, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f0a050';
  c.beginPath(); c.arc(mx(cat.x), mz(cat.z), 6, 0, Math.PI * 2); c.fill();
  c.save(); c.translate(mx(car.x), mz(car.z)); c.rotate(-car.yaw);
  c.fillStyle = state.rec ? '#ff453a' : '#5b82ff';
  c.beginPath(); c.moveTo(16, 0); c.lineTo(-10, -9); c.lineTo(-6, 0); c.lineTo(-10, 9); c.closePath(); c.fill();
  c.restore();
}

/* ================= 카메라 ================= */
const camera = new T.PerspectiveCamera(55, 1, 20, 40000);
const fpvCam = new T.PerspectiveCamera(70, 1, 12, 30000);
const orbit = new X.OrbitControls(camera, canvas);
orbit.enabled = false;
orbit.enableDamping = true;
orbit.maxPolarAngle = deg(86);
orbit.minDistance = 250;
orbit.maxDistance = 9000;
const chase = { pos: V(), tgt: V(), init: false };
const orthoCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const rtHi = new T.WebGLRenderTarget(320, 240, { samples: 4, type: T.HalfFloatType });
const rtLo = new T.WebGLRenderTarget(160, 120, { type: T.HalfFloatType, magFilter: T.NearestFilter, minFilter: T.LinearFilter });
const quadLo = new T.Scene(), quadOut = new T.Scene();
quadLo.add(new T.Mesh(new T.PlaneGeometry(2, 2), new T.MeshBasicMaterial({ map: rtHi.texture, toneMapped: false, depthTest: false, depthWrite: false })));
quadOut.add(new T.Mesh(new T.PlaneGeometry(2, 2), new T.MeshBasicMaterial({ map: rtLo.texture, depthTest: false, depthWrite: false })));

function carPos() { return V(car.x, car.y, car.z); }
function headingVec() { return V(Math.cos(car.yaw), 0, -Math.sin(car.yaw)); }
let debugView = null;
function updateCamera(dt, menu) {
  if (debugView) { camera.position.set(...debugView[0]); camera.lookAt(...debugView[1]); return camera; }
  const mode = CAMS[state.camMode][0], cp = carPos(), h = headingVec();
  if (menu) {
    const a = Math.PI / 2 + Math.sin(performance.now() / 7000) * 1.2;
    camera.position.set(cp.x + Math.cos(a) * 820, cp.y + 360, cp.z + Math.sin(a) * 820);
    camera.lookAt(cp.x, cp.y + 90, cp.z);
    chase.init = false;
    return camera;
  }
  if (mode === 'orbit') {
    if (!orbit.enabled) { orbit.enabled = true; orbit.target.set(cp.x, cp.y + 80, cp.z); camera.position.set(cp.x - h.x * 1300, cp.y + 900, cp.z - h.z * 1300); }
    const d = cp.clone().setY(cp.y + 80).sub(orbit.target);
    orbit.target.add(d); camera.position.add(d);
    orbit.update();
    return camera;
  }
  orbit.enabled = false;
  if (mode === 'chase') {
    const back = 760, up = 380;
    let want = cp.clone().addScaledVector(h, -back).add(V(0, up, 0));
    const f = rayWall(cp.x, cp.z, want.x, want.z);
    if (f < 1) { want = cp.clone().addScaledVector(h, -back * Math.max(0.25, f * 0.9)).add(V(0, up + (1 - f) * 260, 0)); }
    const tgt = cp.clone().addScaledVector(h, 380).add(V(0, 90, 0));
    if (!chase.init) { chase.pos.copy(want); chase.tgt.copy(tgt); chase.init = true; }
    chase.pos.lerp(want, 1 - Math.exp(-dt * 4.2));
    chase.tgt.lerp(tgt, 1 - Math.exp(-dt * 9));
    camera.position.copy(chase.pos);
    camera.lookAt(chase.tgt);
    return camera;
  }
  if (mode === 'top') {
    const want = cp.clone().add(V(0, 1700, 0)).addScaledVector(h, -650);
    if (!chase.init) { chase.pos.copy(want); chase.init = true; }
    chase.pos.lerp(want, 1 - Math.exp(-dt * 3));
    camera.position.copy(chase.pos);
    camera.lookAt(cp.x + h.x * 150, cp.y, cp.z + h.z * 150);
    return camera;
  }
  carRoot.updateMatrixWorld(true);
  pipCam.getWorldPosition(fpvCam.position);
  pipCam.getWorldQuaternion(fpvCam.quaternion);
  return fpvCam;
}

/* ================= 입력 ================= */
const keys = new Set();
const keyAct = {
  KeyR: () => toggleRec(), Space: () => estop(), KeyX: () => deleteRecent(), KeyQ: () => cycleMode(), KeyO: () => toggleConstant(),
  BracketRight: () => bumpMax(0.01), BracketLeft: () => bumpMax(-0.01), KeyC: () => cycleCam(1), KeyF: () => resetCar(), Escape: () => togglePause(), KeyP: () => togglePause(),
  KeyH: () => toggleKeys(),
  KeyM: () => { opt.sound = !opt.sound; if (au.master) au.master.gain.value = opt.sound ? 0.5 : 0; $('#optSound').setAttribute('aria-pressed', String(opt.sound)); toast(opt.sound ? '소리 켬' : '소리 끔'); },
};
const KEY_ALIAS = { ArrowUp: 'KeyW', ArrowDown: 'KeyS', ArrowLeft: 'KeyA', ArrowRight: 'KeyD', KeyP: 'Escape' };
function keyLight(code, on) {
  const k = document.querySelector(`#keys kbd[data-k="${KEY_ALIAS[code] || code}"]`);
  if (k) k.classList.toggle('on', on);
}
function toggleKeys() {
  opt.keys = !opt.keys;
  $('#keys').classList.toggle('min', !opt.keys);
  $('#keyHideLabel').textContent = opt.keys ? '단축키 숨기기' : '단축키 보기';
}
addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  keyLight(e.code, true);
  if (!state.playing) { if (e.code === 'Enter' && !ui.start.hidden) startGame(state.mode); return; }
  if (state.paused && e.code !== 'Escape' && e.code !== 'KeyP') return;
  const f = keyAct[e.code];
  if (f && (!e.repeat || e.code.startsWith('Bracket'))) f();
});
addEventListener('keyup', e => { keys.delete(e.code); keyLight(e.code, false); });
addEventListener('blur', () => { keys.clear(); document.querySelectorAll('#keys kbd.on').forEach(k => k.classList.remove('on')); if (state.playing && !state.paused) togglePause(); });
let kSteer = 0;
const touchIn = { steer: 0, gas: false, rev: false };
const padPrev = [];
let padName = '', padBlocked = false;
function readInput(dt) {
  const left = keys.has('KeyA') || keys.has('ArrowLeft'), right = keys.has('KeyD') || keys.has('ArrowRight');
  const want = (left ? 1 : 0) - (right ? 1 : 0);
  const rate = want === 0 ? 7 : 4.5;
  kSteer += clamp(want - kSteer, -rate * dt, rate * dt);
  let steer = kSteer, thr = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  if (Math.abs(touchIn.steer) > 0.02) steer = touchIn.steer;
  if (touchIn.gas) thr = 1;
  if (touchIn.rev) thr = -1;
  let gp = null;
  if (!padBlocked) {
    try { gp = navigator.getGamepads ? [...navigator.getGamepads()].find(g => g && g.connected) : null; }
    catch (e) { padBlocked = true; ui.padState.textContent = '게임패드: 이 미리보기 화면에서는 브라우저가 막아 둬요. 페이지를 새 탭이나 내려받은 파일로 열면 쓸 수 있어요.'; }
  }
  if (gp) {
    if (padName !== gp.id) { padName = gp.id; ui.padState.innerHTML = `게임패드: <b>연결됨</b> (${gp.id.slice(0, 40)})`; if (state.playing) toast('게임패드 연결됨', 'good'); }
    const dz = v => (Math.abs(v) < 0.12 ? 0 : (v - Math.sign(v) * 0.12) / 0.88);
    const lx = dz(gp.axes[0] || 0), ry = dz(gp.axes[3] || 0);
    const rt = gp.buttons[7] ? gp.buttons[7].value : 0, lt = gp.buttons[6] ? gp.buttons[6].value : 0;
    if (Math.abs(lx) > 0) steer = -lx;
    const trig = rt - lt;
    if (Math.abs(trig) > 0.03) thr = trig; else if (Math.abs(ry) > 0) thr = -ry;
    const pressed = i => gp.buttons[i] && gp.buttons[i].pressed;
    const edge = i => pressed(i) && !padPrev[i];
    if (state.playing && !state.paused) {
      if (edge(1)) toggleRec();
      if (edge(3)) estop();
      if (edge(2)) deleteRecent();
      if (edge(0)) cycleMode();
      if (edge(9)) toggleConstant();
      if (edge(5)) bumpMax(0.01);
      if (edge(4)) bumpMax(-0.01);
      if (edge(8)) toast('AI 출발 가속: AI_LAUNCH_THROTTLE이 0이라 효과 없음');
      if (edge(15)) cycleCam(1);
      if (edge(14)) cycleCam(-1);
      if (edge(12)) resetCar();
    }
    if (edge(13)) togglePause();
    if (!state.playing && (edge(0) || edge(9)) && !ui.start.hidden) startGame(state.mode);
    for (let i = 0; i < gp.buttons.length; i++) padPrev[i] = pressed(i);
  }
  input.steer = clamp(steer, -1, 1);
  input.thr = clamp(thr, -1, 1);
}
{
  const pad = $('#steerPad'), knob = pad.querySelector('i');
  let pid = null;
  const move = e => { const r = pad.getBoundingClientRect(); const v = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1); touchIn.steer = -v; knob.style.left = `${50 + v * 40}%`; };
  pad.addEventListener('pointerdown', e => { pid = e.pointerId; pad.setPointerCapture(pid); move(e); });
  pad.addEventListener('pointermove', e => { if (e.pointerId === pid) move(e); });
  const up = () => { pid = null; touchIn.steer = 0; knob.style.left = '50%'; };
  pad.addEventListener('pointerup', up);
  pad.addEventListener('pointercancel', up);
  for (const [id, k] of [['#gas', 'gas'], ['#rev', 'rev']]) {
    const b = $(id);
    b.addEventListener('pointerdown', e => { touchIn[k] = true; b.setPointerCapture(e.pointerId); });
    b.addEventListener('pointerup', () => { touchIn[k] = false; });
    b.addEventListener('pointercancel', () => { touchIn[k] = false; });
  }
  $('#tRec').addEventListener('click', () => toggleRec());
  $('#tCam').addEventListener('click', () => cycleCam(1));
  $('#tStop').addEventListener('click', () => estop());
  $('#tMenu').addEventListener('click', () => togglePause());
}

/* ================= 동작 ================= */
function toggleRec() {
  state.rec = !state.rec;
  state.recAcc = 0;
  toast(state.rec ? '녹화 시작: 1초에 20장씩 저장해요' : '녹화 멈춤', state.rec ? 'rec' : '');
  beep(state.rec ? [880, 1320] : [660, 440], 0.09);
}
function estop() {
  state.drive = 'user'; state.rec = false; state.constant = false; car.v *= 0.2;
  toast('비상 정지: 수동 모드, 녹화와 일정 속도 꺼짐', 'warn');
  beep([300, 300], 0.07, 'square', 0.08);
}
function cycleMode() {
  const order = ['user', 'local_angle', 'local'];
  state.drive = order[(order.indexOf(state.drive) + 1) % 3];
  toast(state.drive === 'user' ? '모드: user (수동)' : `모드: ${state.drive}. 경로를 따라가는 데모라 실제 학습 모델은 아니에요. 이 모드에서는 기록하지 않아요`, state.drive === 'user' ? '' : 'warn');
  beep([740], 0.06);
}
function toggleConstant() {
  state.constant = !state.constant;
  toast(state.constant ? '일정 속도 주행 켬: 차가 혼자 앞으로 가요!' : '일정 속도 주행 끔', state.constant ? 'warn' : '');
}
function bumpMax(d) {
  state.maxThr = Math.round(clamp(state.maxThr + d, 0.3, 1) * 100) / 100;
  toast(`throttle_scale: ${state.maxThr.toFixed(2)}${opt.dead && state.maxThr < 0.43 ? ' (정지 구간이라 안 움직여요)' : ''}`);
}
function cycleCam(d) {
  state.camMode = (state.camMode + d + CAMS.length) % CAMS.length;
  chase.init = false;
  ui.camLabel.textContent = isTouch ? CAMS[state.camMode][1] : `${CAMS[state.camMode][1]} (C)`;
  ui.pip.hidden = CAMS[state.camMode][0] === 'model';
  measurePip();
}
function togglePause() {
  if (!state.playing) return;
  state.paused = !state.paused;
  ui.pause.hidden = !state.paused;
  ui.summary.hidden = true;
  if (ac) { if (state.paused) ac.suspend(); else ac.resume(); }
}
function resetGame() {
  Object.assign(state, { rec: false, constant: false, drive: 'user', maxThr: opt.speed, records: 0, bad: [], recAcc: 0, lastCrash: -99, crashes: 0, deleted: 0, time: 0, cp: 1, lap: 0, lapStart: 0, laps: [], best: null, routeIdx: 0 });
  placeCar(START.x, START.z, START.yaw);
  for (const p of props) { p.x = p.x0; p.z = p.z0; p.vx = p.vz = p.spin = 0; }
  for (const m of movers) { m.x = m.x0; m.z = m.z0; m.a = m.a0; m.v = m === vac ? 210 : 0; m.turn = 0; m.mode = 'idle'; m.t = 1.5; }
  placeGate(1);
}
function startGame(mode) {
  state.mode = mode;
  audioInit();
  if (ac && ac.state === 'suspended') ac.resume();
  resetGame();
  state.playing = true;
  state.paused = false;
  ui.start.hidden = true;
  ui.hud.hidden = false;
  document.body.classList.add('playing');
  ui.touch.hidden = !isTouch;
  measurePip();
  gateMesh.visible = mode === 'collect';
  state.camMode = 0;
  cycleCam(0);
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  toast(mode === 'collect' ? 'R(B 버튼)로 녹화를 켜고 파란 테이프를 따라 1번 체크포인트로!' : '자유 주행: 집 안 어디든 가 보세요', 'good');
}
function showSummary() {
  const good = state.records - state.bad.reduce((a, b) => a + b, 0);
  const cells = [[`${state.records.toLocaleString('ko-KR')}장`, '모은 기록'], [state.records ? `${Math.round((good / state.records) * 100)}%` : '-', '좋은 기록 비율'], [state.lap, '완주한 바퀴'], [state.best == null ? '-' : fmt(state.best), '최고 랩'], [state.crashes, '충돌'], [`${state.deleted}장`, '지운 기록']];
  $('#sumGrid').innerHTML = cells.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('');
  const tips = [];
  if (!state.records) tips.push('녹화(R / B)를 켜야 기록이 쌓여요.');
  if (state.records && good / state.records < 0.85) tips.push('충돌하거나 경로를 벗어난 기록이 많아요. 그 직후 X로 최근 100장을 지우면 학습 데이터가 깨끗해져요.');
  if (state.lap >= 1) tips.push(`DonkeyCar 학습에는 보통 기록 5,000~20,000장을 권해요. 지금 속도면 한 바퀴에 약 ${Math.round((state.laps[state.laps.length - 1] || 40) * 20)}장이에요.`);
  tips.push('실제 차에서도 같은 경로를 같은 방향으로, 일정한 속도로 여러 바퀴 도는 게 좋아요.');
  $('#sumTips').innerHTML = tips.map(t => `<p class="tip">${t}</p>`).join('');
  ui.pause.hidden = true;
  ui.summary.hidden = false;
}
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => startGame(b.dataset.mode)));
document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
  const a = b.dataset.act;
  b.blur();
  if (a === 'resume') { state.paused = false; ui.pause.hidden = true; ui.summary.hidden = true; if (ac) ac.resume(); }
  else if (a === 'summary') showSummary();
  else if (a === 'restart') { resetGame(); state.paused = false; ui.pause.hidden = true; ui.summary.hidden = true; if (ac) ac.resume(); }
  else if (a === 'title') { document.body.classList.remove('playing'); state.playing = false; state.paused = false; ui.pause.hidden = true; ui.hud.hidden = true; ui.touch.hidden = true; ui.start.hidden = false; resetGame(); }
}));
for (const [id, k] of [['#optDead', 'dead'], ['#optTape', 'tape'], ['#optSound', 'sound']]) {
  $(id).addEventListener('click', e => {
    opt[k] = !opt[k];
    e.currentTarget.setAttribute('aria-pressed', String(opt[k]));
    if (k === 'tape') tapeGroup.visible = opt.tape;
    if (k === 'sound' && au.master) au.master.gain.value = opt.sound ? 0.5 : 0;
  });
}
const qSel = $('#optQ');
qSel.value = opt.quality;
function applyQuality() {
  const q = QUALITY[opt.quality];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pr));
  sun.shadow.mapSize.set(q.shadow, q.shadow);
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  resize();
}
qSel.addEventListener('change', () => { opt.quality = qSel.value; applyQuality(); });
const spSel = $('#optSpeed');
spSel.value = String(opt.speed);
spSel.addEventListener('change', () => { opt.speed = parseFloat(spSel.value); state.maxThr = opt.speed; });

/* ================= 크기, 그리기 ================= */
let W = 1, H = 1, pipRect = null;
function resize() {
  W = innerWidth; H = innerHeight;
  renderer.setSize(W, H, false);
  camera.aspect = W / H; camera.updateProjectionMatrix();
  fpvCam.aspect = W / H; fpvCam.updateProjectionMatrix();
  measurePip();
}
function measurePip() {
  const r = ui.pip.getBoundingClientRect();
  pipRect = r.width ? { x: r.left, y: H - r.bottom, w: r.width, h: r.height } : null;
}
addEventListener('resize', resize);
applyQuality();

function syncVisuals(dt) {
  carRoot.position.set(car.x, 0, car.z);
  carRoot.rotation.y = car.yaw;
  const [fl, fr, rl, rr] = car.wh;
  const ty = (fl + fr + rl + rr) / 4, tp = Math.atan2((fl + fr) / 2 - (rl + rr) / 2, 190), tr = Math.atan2((fl + rl) / 2 - (fr + rr) / 2, 88);
  const k = 1 - Math.exp(-dt * 16);
  car.y = lerp(car.y, ty, k); car.pitch = lerp(car.pitch, tp, k); car.roll = lerp(car.roll, tr, k);
  const shake = Math.abs(car.v) > 20 ? Math.sin(state.time * 70) * 0.25 : 0;
  carBody.position.y = car.y + shake;
  carBody.rotation.set(car.roll, 0, car.pitch);
  applySteer(car.delta);
  for (const w of rig.wheels) w.rotation.z = -car.spin;
  rig.fan.rotation.y += dt * 40;
  carShadow.position.set(car.x, groundH(car.x, car.z) + 0.8, car.z);
  carShadow.rotation.z = car.yaw;
  for (const p of props) {
    p.mesh.position.set(p.x, groundH(p.x, p.z) + p.yoff, p.z);
    if (p.kind === 'ball') {
      const sp = Math.hypot(p.vx, p.vz);
      if (sp > 1) p.mesh.rotateOnWorldAxis(V(p.vz / sp, 0, -p.vx / sp), (sp * dt) / p.r);
    } else p.mesh.rotation.y = p.ry;
  }
  vac.mesh.position.set(vac.x, groundH(vac.x, vac.z), vac.z);
  vac.mesh.rotation.y = vac.a;
  vac.led.material.emissiveIntensity = 1 + Math.sin(state.time * 6);
  const dA = ((cat.a - cat.vis + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  cat.vis += dA * (1 - Math.exp(-dt * 8));
  cat.mesh.position.set(cat.x, groundH(cat.x, cat.z), cat.z);
  cat.mesh.rotation.y = cat.vis;
  const walking = cat.v > 20, sw = walking ? Math.sin(cat.phase) * Math.min(0.6, cat.v / 900 + 0.3) : 0;
  cat.legs.forEach((l, i) => { l.rotation.z = i === 0 || i === 3 ? sw : -sw; });
  cat.body.position.y = 185 + (walking ? Math.abs(Math.sin(cat.phase)) * 6 : 0);
  cat.tail.rotation.y = Math.sin(performance.now() / (walking ? 160 : 520)) * 0.35;
  cat.head.rotation.y = walking ? 0 : Math.sin(performance.now() / 1900) * 0.45;
}

let last = performance.now(), acc = 0, uiT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  readInput(dt);
  const live = state.playing && !state.paused;
  if (live || !state.playing) {
    acc += dt;
    const STEP = 1 / 120;
    while (acc >= STEP) {
      acc -= STEP;
      if (live) {
        const px = car.x, pz = car.z;
        state.time += STEP;
        physicsStep(STEP);
        checkGate(px, pz);
        recordStep(STEP);
      }
      vacStep(STEP);
      catStep(STEP);
      propsStep(STEP);
    }
    if (live) {
      const off = nearestRoute(car.x, car.z);
      state.offTrack = state.mode === 'collect' && off > OFF_TRACK;
      if (car.y < -90 && baseLevel(car.x, car.z) === -120 && !state.pitWarn) { state.pitWarn = true; toast('현관에 빠졌어요. F (십자키 ↑)로 되돌려요', 'warn'); }
      if (baseLevel(car.x, car.z) === 0) state.pitWarn = false;
    }
  }
  syncVisuals(dt);
  audioUpdate();
  const cam = updateCamera(dt, !state.playing);
  const mode = CAMS[state.camMode][0];
  renderer.shadowMap.needsUpdate = true;
  const wantPip = state.playing && mode !== 'model' && pipRect && !ui.pip.hidden;
  if (wantPip || (state.playing && mode === 'model')) {
    carRoot.updateMatrixWorld(true);
    gateMesh.visible = false;
    renderer.setRenderTarget(rtHi);
    renderer.render(scene, pipCam);
    renderer.setRenderTarget(rtLo);
    renderer.render(quadLo, orthoCam);
    gateMesh.visible = state.playing && state.mode === 'collect';
  }
  renderer.setRenderTarget(null);
  renderer.setViewport(0, 0, W, H);
  if (state.playing && mode === 'model') {
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    const s = Math.min(W / 4, H / 3), w = s * 4, h = s * 3;
    renderer.setViewport((W - w) / 2, (H - h) / 2, w, h);
    renderer.render(quadOut, orthoCam);
    renderer.setViewport(0, 0, W, H);
  } else {
    renderer.render(scene, cam);
    if (wantPip) {
      renderer.autoClear = false;
      renderer.setViewport(pipRect.x, pipRect.y, pipRect.w, pipRect.h);
      renderer.render(quadOut, orthoCam);
      renderer.setViewport(0, 0, W, H);
      renderer.autoClear = true;
    }
  }
  uiT += dt;
  if (state.playing && uiT > 0.1) { uiT = 0; updateHud(); drawMini(); }
}
placeGate(1);
resize();
requestAnimationFrame(frame);
function sim(sec, steer = 0, thr = 0) {
  const STEP = 1 / 120;
  for (let i = 0, n = Math.round(sec / STEP); i < n; i++) {
    input.steer = steer; input.thr = thr;
    const px = car.x, pz = car.z;
    state.time += STEP;
    physicsStep(STEP); checkGate(px, pz); recordStep(STEP); vacStep(STEP); catStep(STEP); propsStep(STEP);
    const off = nearestRoute(car.x, car.z);
    state.offTrack = state.mode === 'collect' && off > OFF_TRACK;
  }
  return { x: Math.round(car.x), z: Math.round(car.z), y: +car.y.toFixed(1), v: Math.round(car.v), lap: state.lap, cp: state.cp, crashes: state.crashes, off: state.offTrack };
}
window.__game = { state, car, props, vac, start: startGame, groundH, colliders, placeCar, sim, setView: v => { debugView = v; }, info: () => renderer.info.render, route: RP, START, scene, car3d, statics, cat };
})();
