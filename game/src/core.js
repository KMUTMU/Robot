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
const opt = { dead: true, tape: true, sound: true, tint: true, keys: true, speed: 0.8, quality: isTouch ? 'low' : 'mid' };

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
// 맵마다 다른 빛과 배경. 맵 정의의 env가 이 기본값(집)을 덮어쓴다
const ENV_DEFAULT = { bg: 0x20242b, fog: null, hemi: [0xfff4e8, 0x8a6e52, 1.05], sun: { dir: [0.3, -0.58, 0.76], color: 0xffe6c4, int: 3.0 }, fill: { color: 0xdbe5ff, int: 0.4, dir: [0.16, 0.5, 0.625] }, exposure: 1.0, envInt: 0.35, shadowRadius: 2.5 };
function applyEnv(e0, b) {
  const e = Object.assign({}, ENV_DEFAULT, e0);
  scene.background = new T.Color(e.bg);
  scene.fog = e.fog ? new T.Fog(e.fog[0], e.fog[1], e.fog[2]) : null;
  hemi.color.set(e.hemi[0]); hemi.groundColor.set(e.hemi[1]); hemi.intensity = e.hemi[2];
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, R = Math.hypot(b.x1 - b.x0, b.z1 - b.z0) / 2 + 600;
  SUN_DIR.set(e.sun.dir[0], e.sun.dir[1], e.sun.dir[2]).normalize();
  sun.color.set(e.sun.color); sun.intensity = e.sun.int;
  sun.target.position.set(cx, 0, cz);
  sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, -(R + 5400));
  Object.assign(sun.shadow.camera, { left: -R, right: R, top: R, bottom: -R, near: 500, far: R * 2 + 12000 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.radius = e.shadowRadius;
  fillL.color.set(e.fill.color); fillL.intensity = e.fill.int;
  fillL.target.position.set(cx, 0, cz);
  fillL.position.set(cx + e.fill.dir[0] * 10000, e.fill.dir[1] * 10000, cz + e.fill.dir[2] * 10000);
  renderer.toneMappingExposure = e.exposure;
  scene.environmentIntensity = e.envInt;
}

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
// 맵을 처음 열 때만 만드는 텍스처 (이름으로 한 번만 만들어 다시 씀)
const TXC = new Map();
const TX = (name, make) => { if (!TXC.has(name)) TXC.set(name, make()); return TXC.get(name); };
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
const statics = new T.Group();   // 움직이지 않는 것: 맵을 다 지은 뒤 재질별로 합친다
const dyn = new T.Group();       // 맵에 딸린 것 중 합치면 안 되는 것 (하늘, 조명, 움직이는 장식)
scene.add(statics, dyn);
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
// 여러 메시로 된 물건용: 그룹(위치·방향)과 그 안에 넣는 메시 (그룹 좌표 기준, +x가 앞), 둥근 상자
function grp(x, z, ang = 0, y = 0, parent = statics) {
  const g = new T.Group();
  g.position.set(x, y, z);
  g.rotation.y = ang;
  parent.add(g);
  return g;
}
function part(g, geo, m, x, y, z, rot) {
  const o = new T.Mesh(geo, m);
  o.position.set(x, y, z);
  if (rot) o.rotation.set(rot[0], rot[1], rot[2]);
  o.castShadow = true; o.receiveShadow = true;
  g.add(o);
  return o;
}
const rbox = (w, h, d, r) => new X.RoundedBoxGeometry(w, h, d, 3, Math.max(0.5, Math.min(r, w / 2 - 1, h / 2 - 1, d / 2 - 1)));
// 캔버스에 글자를 써서 만든 그림 (쪽지, 화면 등)
function textTex(name, w, h, bg, draw) {
  return TX(name, () => ctex(w, h, (c2, cw, chh) => { c2.fillStyle = bg; c2.fillRect(0, 0, cw, chh); draw(c2, cw, chh); }));
}
// 바닥에 비친 불빛 (더하기 혼합)
function glow(x, z, w, d, color = 0xffffff, op = 0.35, y = 1.2) {
  const m = plane(M('glow' + color + op, () => new T.MeshBasicMaterial({ color, map: blobTex, transparent: true, opacity: op, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false })), w, d, x, y, z, { recv: false, order: 3 });
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

let baseLevel = () => 0;   // 바닥 높이가 다른 구역(베란다, 현관 ...). 맵이 정함
// 지형: 높이 격자. 물리와 그림이 같은 삼각형을 쓰므로 바퀴가 땅에 묻히거나 뜨지 않는다
let hgrid = null;
function setTerrain(fn, x0, z0, x1, z1, cell) {
  const nx = Math.ceil((x1 - x0) / cell) + 1, nz = Math.ceil((z1 - z0) / cell) + 1, d = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) d[j * nx + i] = fn(x0 + i * cell, z0 + j * cell);
  hgrid = { x0, z0, cell, nx, nz, d };
}
function terrainH(x, z) {
  const g = hgrid, fx = clamp((x - g.x0) / g.cell, 0, g.nx - 1.0001), fz = clamp((z - g.z0) / g.cell, 0, g.nz - 1.0001);
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = j * g.nx + i;
  const h00 = g.d[k], h10 = g.d[k + 1], h01 = g.d[k + g.nx], h11 = g.d[k + g.nx + 1];
  return u + v <= 1 ? h00 + (h10 - h00) * u + (h01 - h00) * v : h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);
}
function terrainMesh(mat, uvMm = 1000, colorFn = null) {
  const g = hgrid, pos = new Float32Array(g.nx * g.nz * 3), uv = new Float32Array(g.nx * g.nz * 2), idx = [];
  const col = colorFn ? new Float32Array(g.nx * g.nz * 3) : null;
  for (let j = 0; j < g.nz; j++) for (let i = 0; i < g.nx; i++) {
    const k = j * g.nx + i, x = g.x0 + i * g.cell, z = g.z0 + j * g.cell;
    pos[k * 3] = x; pos[k * 3 + 1] = g.d[k]; pos[k * 3 + 2] = z;
    uv[k * 2] = x / uvMm; uv[k * 2 + 1] = z / uvMm;
    if (col) { const c3 = colorFn(x, z, g.d[k]); col[k * 3] = c3[0]; col[k * 3 + 1] = c3[1]; col[k * 3 + 2] = c3[2]; }
    if (i < g.nx - 1 && j < g.nz - 1) idx.push(k, k + g.nx, k + 1, k + 1, k + g.nx, k + g.nx + 1);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
  if (col) geo.setAttribute('color', new T.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new T.Mesh(geo, mat);
  m.receiveShadow = true;
  m.userData.keep = true;
  statics.add(m);
  return m;
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
  if (hgrid) h += terrainH(x, z);
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


/* ================= 맵 등록 ================= */
// 맵 하나 = maps/ 폴더의 파일 하나. 각 파일이 MAPS.push({ id, name, ..., build() })로 자기를 등록한다
const MAPS = [];
const PROPS = {};          // 밀 수 있는 물건 종류: 이름 → 만드는 함수
const RS0 = rs;            // 맵을 열 때마다 난수를 이 값으로 되돌려 배치가 매번 같게 한다
