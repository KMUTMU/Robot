/* ================= 맵: 얼음 호수 ================= */
// 꽁꽁 언 호수(14 × 10 m). 얼음이라 옆으로 버티는 힘과 가감속이 약해서, 속도를 낸 채 꺾으면 옆으로 미끄러진다(드리프트).
// 펭귄 다섯 마리가 차를 피해 배로 미끄러져 달아나고, 얼음 구멍 셋에 빠지면 경로 위로 되돌아온다. 퍽을 골대에 넣으면 골.
// 좌표: x 동쪽, z 남쪽. 달릴 수 있는 곳은 x 0~14000, z 0~10000, 그 밖은 눈 둔덕과 나무.
{
const IW = 14000, ID = 10000, EDGE = 300, OUT = 1800, BANK_H = 520;
const HOLES = [[8900, 3900], [7000, 5600], [10200, 6400]], HOLE_R = 300, HOLE_Y = -600;    // 얼음 구멍
const SNOW = [[11400, 2700, 1100], [2500, 7300, 1100], [3300, 3700, 700]];                   // 눈 쌓인 곳 [x, z, 반지름]: 덜 미끄러움
const GOAL = { x: 10600, z0: 4400, z1: 5300, back: 11000 }, PUCK = [8800, 4850];
const PENS = [[4250, 4500, 0.4], [5650, 4350, 2.6], [4300, 5950, 5.2], [5450, 6150, 4.0], [3900, 5300, 1.2]];   // 펭귄 집 [x, z, 처음 방향]
const outside = (x, z) => Math.hypot(Math.max(EDGE - x, 0, x - (IW - EDGE)), Math.max(EDGE - z, 0, z - (ID - EDGE)));
// 호숫가 눈 둔덕: 시작하는 자리가 들쭉날쭉하고 바깥으로 갈수록 높아진다. 호수 안은 0
function bankH(x, z) {
  const d = outside(x, z) - 380 * vnoise(x / 900 + 5, z / 900 + 9);
  if (d <= 0) return 0;
  const s = sstep(d / 1300);
  return BANK_H * s + s * (1 - sstep((d - 1300) / 300)) * (90 * (vnoise(x / 500, z / 500) - 0.5) + 30 * (vnoise(x / 170, z / 170) - 0.5));
}
const inHole = (x, z) => HOLES.some(([hx, hz]) => (x - hx) ** 2 + (z - hz) ** 2 < HOLE_R * HOLE_R);
const mat = (name, color, rough = 0.7, o = {}) => std('ic' + name, { color, roughness: rough, ...o });

/* ---------- 그림(텍스처) ---------- */
const iceTex = () => TX('icIce', () => {
  const t = ctex(1024, 1024, (c, w, h) => {
    const r = lcg(61);
    c.fillStyle = '#3d7195'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {     // 얼음 속 얼룩
      const x = r() * w, y = r() * h, q = 60 + r() * 170, g = c.createRadialGradient(x, y, 0, x, y, q);
      g.addColorStop(0, `rgba(${r() < 0.5 ? '150,210,235' : '20,50,80'},0.16)`); g.addColorStop(1, 'rgba(0,0,0,0)');
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { c.fillStyle = g; c.setTransform(1, 0, 0, 1, ox, oy); c.beginPath(); c.arc(x, y, q, 0, 7); c.fill(); }
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.lineCap = 'round';
    for (let i = 0; i < 16; i++) {     // 금
      let x = r() * w, y = r() * h, a = r() * 6.28;
      c.strokeStyle = `rgba(225,245,255,${0.25 + r() * 0.3})`; c.lineWidth = 0.8 + r() * 1.2;
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 9; k++) { a += (r() - 0.5) * 1.1; x += Math.cos(a) * (18 + r() * 40); y += Math.sin(a) * (18 + r() * 40); c.lineTo(x, y); }
      c.stroke();
    }
    for (let i = 0; i < 90; i++) {     // 긁힌 자국
      const x = r() * w, y = r() * h, a = r() * 6.28, len = 30 + r() * 150;
      c.strokeStyle = `rgba(255,255,255,${0.06 + r() * 0.12})`; c.lineWidth = 0.6 + r() * 0.9;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + (r() - 0.5) * 30, y + Math.sin(a) * len * 0.5 + (r() - 0.5) * 30, x + Math.cos(a) * len, y + Math.sin(a) * len); c.stroke();
    }
    for (let i = 0; i < 700; i++) { c.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.4})`; c.beginPath(); c.arc(r() * w, r() * h, 0.5 + r() * 1.4, 0, 7); c.fill(); }   // 기포
  }, [1, 1]);
  t.repeat.set(1 / 3000, 1 / 3000);    // 얼음판은 좌표(mm)가 그대로 UV라서 3m마다 되풀이
  return t;
});
const snowTex = () => TX('icSnow', () => ctex(512, 512, (c, w, h) => {
  const r = lcg(71);
  c.fillStyle = '#f4f8fc'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const v = 215 + r() * 40 | 0; c.fillStyle = `rgba(${v},${v + 3},${v + 8},0.5)`; c.fillRect(r() * w, r() * h, 2, 2); }
}, [1, 1]));
const patchTex = () => TX('icPatchT', () => ctex(512, 512, (c, w, h) => {      // 눈 쌓인 곳: 가운데는 빽빽하고 가장자리는 듬성듬성
  const r = lcg(73);
  c.clearRect(0, 0, w, h);
  for (let i = 0; i < 5200; i++) {
    const a = r() * 6.283, q = 236 * Math.sqrt(r()) * (0.8 + 0.2 * r()), v = 236 + r() * 19 | 0;
    c.fillStyle = `rgba(${v},${v + 2 > 255 ? 255 : v + 2},255,${0.55 + r() * 0.4})`;
    c.beginPath(); c.arc(w / 2 + Math.cos(a) * q, h / 2 + Math.sin(a) * q, 4 + r() * 9, 0, 7); c.fill();
  }
}));
const blockTex = () => TX('icBlock', () => ctex(512, 256, (c, w, h) => {
  c.fillStyle = '#e9f3fa'; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(110,160,195,0.7)'; c.lineWidth = 3;
  for (let j = 0; j < 6; j++) { const y = (j * h) / 6; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); for (let i = 0; i < 12; i++) { const x = ((i + (j % 2) * 0.5) * w) / 12; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + h / 6); c.stroke(); } }
}));
const logTex = () => TX('icLog', () => ctex(256, 256, (c, w, h) => {
  const r = lcg(81);
  for (let j = 0; j < 8; j++) { c.fillStyle = `hsl(${24 + r() * 6},${38 + r() * 8}%,${28 + r() * 7}%)`; c.fillRect(0, j * 32, w, 32); c.fillStyle = 'rgba(20,10,4,0.55)'; c.fillRect(0, j * 32, w, 4); c.fillStyle = 'rgba(255,220,180,0.1)'; c.fillRect(0, j * 32 + 8, w, 5); }
}, [2, 1]));
const netTex = () => TX('icNet', () => ctex(256, 256, (c, w, h) => {
  c.clearRect(0, 0, w, h);
  c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2.5;
  for (let i = 0; i <= 16; i++) { c.beginPath(); c.moveTo(i * 16, 0); c.lineTo(i * 16, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 16); c.lineTo(w, i * 16); c.stroke(); }
}, [1, 1]));
const moonTex = () => TX('icMoon', () => ctex(256, 256, (c, w, h) => {
  const r = lcg(91);
  c.fillStyle = '#f6f1dc'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 16; i++) { c.fillStyle = `rgba(150,150,140,${0.18 + r() * 0.2})`; c.beginPath(); c.ellipse(r() * w, r() * h, 12 + r() * 34, 9 + r() * 24, r() * 3, 0, 7); c.fill(); }
}));

/* ---------- 밀리는 것: 퍽, 고깔 ---------- */
PROPS.puck = () => ({ mesh: new T.Mesh(new T.CylinderGeometry(72, 72, 44, 28), std('icPuck', { color: 0x15161a, roughness: 0.5 })), r: 72, m: 0.25, fr: 0.22, rest: 0.55, yoff: 22 });
PROPS.cone = () => {
  const g = new T.Group(), orange = std('icCone', { color: 0xff6a1f, roughness: 0.6 });
  const base = new T.Mesh(new T.BoxGeometry(150, 12, 150), orange), body = new T.Mesh(new T.CylinderGeometry(13, 62, 232, 20), orange), band = new T.Mesh(new T.CylinderGeometry(33, 44, 50, 20), std('icConeW', { color: 0xf5f5f0, roughness: 0.6 }));
  base.position.y = 6; body.position.y = 128; band.position.y = 150;
  g.add(base, body, band);
  return { mesh: g, r: 80, m: 0.09, fr: 1.0, rest: 0.3, yoff: 0 };
};

/* ---------- 펭귄 ---------- */
function squawk() {
  if (!ac || !opt.sound) return;
  for (const [f, t] of [[620, 0], [470, 0.11]]) {
    const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + t;
    o.type = 'square'; o.frequency.setValueAtTime(f, t0); o.frequency.linearRampToValueAtTime(f * 0.8, t0 + 0.09);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.07, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
    o.connect(g).connect(au.master); o.start(t0); o.stop(t0 + 0.12);
  }
}
// 집 근처를 뒤뚱뒤뚱 돌아다니다가 차가 달려오면 옆으로 비켜 배로 미끄러진다
function makePenguin(x, z, a) {
  const pen = { kind: 'penguin', name: '펭귄', x, z, x0: x, z0: z, a, a0: a, vis: a, v: 0, r: 85, share: 0.6, mode: 'idle', t: 1 + rnd() * 3, phase: 0, slide: 0, meowT: -9, mini: '#eef4fb', mesh: new T.Group(), cry: squawk };
  const black = new T.MeshStandardMaterial({ color: 0x17191e, roughness: 0.55 }), white = new T.MeshStandardMaterial({ color: 0xf5f6f4, roughness: 0.7 }), orange = new T.MeshStandardMaterial({ color: 0xf59a23, roughness: 0.6 });
  const body = new T.Group(), ball = (m, sx, sy, sz, px, py, pz, parent = body) => { const o = new T.Mesh(new T.SphereGeometry(1, 18, 14), m); o.scale.set(sx, sy, sz); o.position.set(px, py, pz); parent.add(o); return o; };
  ball(black, 95, 150, 92, 0, 165, 0); ball(white, 76, 126, 62, 26, 156, 0);                 // 몸통과 흰 배
  ball(black, 64, 62, 62, 10, 320, 0);                                                        // 머리
  for (const s of [-1, 1]) { ball(white, 24, 28, 20, 44, 326, s * 27); ball(black, 7, 8, 7, 62, 332, s * 26); }
  const beak = new T.Mesh(new T.ConeGeometry(17, 48, 10), orange);
  beak.rotation.z = -Math.PI / 2; beak.position.set(84, 312, 0);
  body.add(beak);
  pen.flips = [-1, 1].map(s => { const p = new T.Group(); p.position.set(0, 258, s * 86); ball(black, 26, 84, 13, 0, -70, s * 8, p); body.add(p); return p; });
  pen.feet = [-1, 1].map(s => ball(orange, 46, 11, 30, 22, 9, s * 38, pen.mesh));
  pen.body = body;
  pen.mesh.add(body);
  pen.mesh.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  pen.onHit = into => { if (into > 60) startFlee(pen, Math.atan2(-(pen.z - car.z), pen.x - car.x)); };
  pen.step = dt => {
    pen.t -= dt;
    const dx = pen.x - car.x, dz = pen.z - car.z, d = Math.hypot(dx, dz) || 1;
    const approach = (car.v * Math.cos(car.yaw) * dx - car.v * Math.sin(car.yaw) * dz) / d;
    if (d < 700 + Math.abs(car.v) * 0.7 && approach > 120) {                                  // 차가 오는 길에서 옆으로 비킴
      const hx = Math.cos(car.yaw) * Math.sign(car.v || 1), hz = -Math.sin(car.yaw) * Math.sign(car.v || 1), side = Math.sign(dx * -hz + dz * hx) || 1;
      startFlee(pen, Math.atan2(-(side * hx + (0.5 * dz) / d), side * -hz + (0.5 * dx) / d));
    }
    for (const o of movers) {                                                                 // 서로 겹치면 밀어냄
      if (o === pen) continue;
      const vx = pen.x - o.x, vz = pen.z - o.z, vd = Math.hypot(vx, vz), vpen = pen.r + o.r - vd;
      if (vpen > 0 && vd > 1e-6) { pen.x += (vx / vd) * vpen * 0.5; pen.z += (vz / vd) * vpen * 0.5; }
    }
    if (pen.t <= 0) {
      if (pen.mode === 'idle') {
        pen.mode = 'walk'; pen.t = 1.5 + rnd() * 3;
        const hd = Math.hypot(pen.x - x, pen.z - z);                                          // 집에서 멀어졌으면 집 쪽으로
        pen.a = hd > 800 ? Math.atan2(pen.z - z, x - pen.x) + (rnd() - 0.5) * 0.6 : pen.a + (rnd() - 0.5) * 2.6;
      } else { pen.mode = 'idle'; pen.t = 1.5 + rnd() * 4; }
    }
    const sp = pen.mode === 'walk' ? 140 : pen.mode === 'flee' ? 720 : 0;
    pen.v = lerp(pen.v, sp, 1 - Math.exp(-dt * (pen.mode === 'flee' ? 7 : 2.2)));              // 얼음 위라 멈출 때는 천천히 미끄러져 선다
    for (const col of nearby(pen.x, pen.z, pen.r + 10)) { const h = circleHit(col, pen.x, pen.z, pen.r); if (h) { pen.x += h[0] * h[2]; pen.z += h[1] * h[2]; } }
    if (pen.v < 5) return;
    const nx = pen.x + Math.cos(pen.a) * pen.v * dt, nz = pen.z - Math.sin(pen.a) * pen.v * dt;
    let hit = Math.abs(groundH(nx, nz) - groundH(pen.x, pen.z)) > 20;                          // 구멍과 둔덕은 피함
    for (const col of nearby(nx, nz, pen.r + 10)) if (circleHit(col, nx, nz, pen.r)) { hit = true; break; }
    if (hit) { pen.a += (rnd() < 0.5 ? 1 : -1) * (0.9 + rnd() * 1.3); return; }
    pen.x = nx; pen.z = nz;
    pen.phase += pen.v * dt * 0.06;
  };
  pen.sync = dt => {
    const dA = ((pen.a - pen.vis + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    pen.vis += dA * (1 - Math.exp(-dt * 8));
    pen.slide = lerp(pen.slide, pen.mode === 'flee' || pen.v > 300 ? 1 : 0, 1 - Math.exp(-dt * 9));
    pen.mesh.position.set(pen.x, groundH(pen.x, pen.z), pen.z);
    pen.mesh.rotation.y = pen.vis;
    const walk = pen.v > 20 && pen.slide < 0.5, sw = Math.sin(pen.phase);
    body.rotation.set(walk ? sw * 0.17 : 0, 0, -1.3 * pen.slide);                              // 걸을 때는 좌우로 뒤뚱, 달아날 때는 앞으로 엎드림
    body.position.set(60 * pen.slide, -18 * pen.slide, 0);
    pen.flips.forEach((f, i) => { f.rotation.x = (i ? 1 : -1) * (pen.slide > 0.5 ? 0.5 + 0.5 * Math.abs(Math.sin(performance.now() / 60)) : walk ? 0.12 + 0.1 * sw : 0.06); });
    pen.feet.forEach((f, i) => { f.position.x = 22 + (walk ? (i ? 1 : -1) * sw * 16 : 0) - 70 * pen.slide; f.visible = pen.slide < 0.8; });
  };
  pen.reset = () => { pen.x = x; pen.z = z; pen.a = pen.vis = a; pen.v = 0; pen.mode = 'idle'; pen.t = 1 + rnd() * 3; pen.slide = 0; };
  return addMover(pen);
}

/* ---------- 만드는 도우미 ---------- */
function rod(g, m, a, b, r, seg = 8) {       // 두 점을 잇는 막대
  const A = V(a[0], a[1], a[2]), d = V(b[0], b[1], b[2]).sub(A), o = new T.Mesh(new T.CylinderGeometry(r, r, d.length(), seg), m);
  o.position.copy(A).addScaledVector(d, 0.5);
  o.quaternion.setFromUnitVectors(UP, d.clone().normalize());
  o.castShadow = true; o.receiveShadow = true;
  g.add(o);
  return o;
}
function quad(g, m, p0, p1, p2, p3) {          // 네 점으로 된 판 (그물용). 무늬는 560mm마다 되풀이
  const geo = new T.BufferGeometry(), u = Math.hypot(p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]) / 560, v = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]) / 560;
  geo.setAttribute('position', new T.Float32BufferAttribute([...p0, ...p1, ...p2, ...p3], 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 0, v, u, 0, u, v], 2));
  geo.setIndex([0, 1, 2, 2, 1, 3]);
  geo.computeVertexNormals();
  const o = new T.Mesh(geo, m);
  o.castShadow = false;
  g.add(o);
  return o;
}
function pine(x, z, s) {
  const g = grp(x, z, 0, groundH(x, z)), green = mat('Pine', 0x1d4a39, 0.9), snow = mat('SnowCap', 0xf2f6fb, 0.95);
  part(g, new T.CylinderGeometry(34 * s, 46 * s, 320 * s, 8), mat('Trunk', 0x4a3324, 0.9), 0, 160 * s, 0);
  [[340, 560, 300], [270, 480, 620], [190, 420, 920]].forEach(([r, h, y]) => {
    part(g, new T.ConeGeometry(r * s, h * s, 10), green, 0, (y + h / 2) * s, 0);
    part(g, new T.ConeGeometry(r * 0.62 * s, h * 0.5 * s, 10), snow, 0, (y + h * 0.77) * s, 0);       // 가지 위에 얹힌 눈
  });
}
function flagPole(x, z, a) {                  // 구멍 둘레의 주황 깃발
  const g = grp(x, z, a, 0);
  part(g, new T.CylinderGeometry(5, 5, 300, 6), mSteel, 0, 150, 0);
  part(g, new T.PlaneGeometry(110, 72), M('icFlag', () => new T.MeshBasicMaterial({ color: 0xff6a1f, side: T.DoubleSide, toneMapped: false })), 58, 258, 0).castShadow = false;
}

/* ---------- 점수 ---------- */
let fx = null, anim = null, puck = null, goals = 0, goalT = 0, lostT = 0;
const drift = { cur: 0, best: 0, gap: 0, crash0: 0 };
function endDrift() {
  const clean = state.crashes + state.fell === drift.crash0;      // 부딪히거나 빠진 드리프트는 기록으로 안 침
  if (clean && drift.cur > drift.best + 1) {
    if (state.playing && drift.cur > 1500 && drift.cur > drift.best + 300) toast(`드리프트 ${(drift.cur / 1000).toFixed(1)} m! 새 기록`, 'good');
    drift.best = drift.cur;
  }
  drift.cur = 0; drift.gap = 0;
}
function iceStep(dt) {
  // 드리프트: 옆으로 미끄러지며 간 거리
  if (!car.air && Math.abs(car.vl) > 120 && Math.hypot(car.v, car.vl) > 350) {
    if (drift.cur === 0) drift.crash0 = state.crashes + state.fell;
    drift.cur += Math.hypot(car.v, car.vl) * dt; drift.gap = 0;
  } else if (drift.cur > 0 && (drift.gap += dt) > 0.35) endDrift();
  // 퍽: 골대에 들어가면 골, 구멍에 빠지면 다시 놓음
  if (goalT > 0) { if ((goalT -= dt) <= 0) { goalT = 0; homePuck(); } }
  else if (puck.x > GOAL.x + 40 && puck.x < GOAL.back - 10 && puck.z > GOAL.z0 && puck.z < GOAL.z1) {
    goals++; goalT = 1.6;
    if (state.playing) { toast('골! 퍽을 골대에 넣었어요', 'good'); beep([784, 988, 1175], 0.09); }
  } else if ((puck.py ?? 0) < -100) { if ((lostT += dt) > 1.2) { homePuck(); if (state.playing) toast('퍽이 구멍에 빠져서 다시 놓았어요'); } }
}
function homePuck() { puck.x = puck.x0; puck.z = puck.z0; puck.vx = puck.vz = puck.spin = 0; puck.py = null; puck.vy = 0; lostT = 0; }

/* ---------- 짓기 ---------- */
function buildIce() {
  // 눈 둔덕(지형)과 그 바깥 평평한 눈밭. 호수 안쪽 칸은 그리지 않고 얼음판이 덮는다
  setTerrain(bankH, -OUT, -OUT, IW + OUT, ID + OUT, 100);
  const snow = M('icSnowM', () => new T.MeshStandardMaterial({ map: snowTex(), vertexColors: true, roughness: 0.95 }));
  const g0 = hgrid, bankCol = (x, z, h) => { const v = 0.8 + 0.12 * vnoise(x / 600, z / 600) - 0.1 * (1 - sstep(h / 160)); return [v * 0.93, v * 0.97, v * 1.04]; };
  const bank = terrainMesh(snow, 900, bankCol, k => Math.max(g0.d[k], g0.d[k + 1], g0.d[k + g0.nx], g0.d[k + g0.nx + 1]) > 0.5);
  {                                             // 그림만: 높이 0인 가장자리를 얼음판 밑(-6mm)으로 내려서 호숫가 선이 칸 모양(계단)이 아니라 매끈하게
    const p = bank.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y - 6 * (1 - sstep(y / 30))); }
    bank.geometry.computeVertexNormals();
  }
  {
    const cx = IW / 2, cz = ID / 2, F = 24000, pos = [], uv = [], col = [], idx = [];
    for (const [xa, xb, za, zb] of [[cx - F, -OUT, cz - F, cz + F], [IW + OUT, cx + F, cz - F, cz + F], [-OUT, IW + OUT, cz - F, -OUT], [-OUT, IW + OUT, ID + OUT, cz + F]]) {
      const k = pos.length / 3;
      for (const [x, z] of [[xa, za], [xa, zb], [xb, za], [xb, zb]]) { pos.push(x, BANK_H, z); uv.push(x / 900, z / 900); col.push(0.78, 0.82, 0.88); }
      idx.push(k, k + 1, k + 2, k + 2, k + 1, k + 3);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    const far = new T.Mesh(geo, snow);
    far.userData.keep = true; far.frustumCulled = false; far.receiveShadow = true;
    statics.add(far);
  }
  {                                             // 얼음판: 구멍 셋을 뚫은 판 (물리 높이 0보다 1.2mm 아래에 두어 눈과 겹쳐 깜박이지 않게). 환경 맵(실내 조명 모양)이 네모나게 비치지 않게 이 재질만 끈다 (재질에 envMap을 직접 줘야 세기 0이 먹는다)
    const sh = new T.Shape();
    sh.moveTo(-250, 250); sh.lineTo(IW + 250, 250); sh.lineTo(IW + 250, -ID - 250); sh.lineTo(-250, -ID - 250); sh.closePath();
    for (const [hx, hz] of HOLES) { const p = new T.Path(); p.absarc(hx, -hz, HOLE_R, 0, Math.PI * 2, true); sh.holes.push(p); }
    const ice = new T.Mesh(new T.ShapeGeometry(sh, 40), M('icIceM', () => new T.MeshStandardMaterial({ map: iceTex(), roughness: 0.17, metalness: 0.0, envMap: scene.environment, envMapIntensity: 0, emissive: 0x2a5d80, emissiveMap: iceTex(), emissiveIntensity: 0.5 })));
    ice.rotation.x = -Math.PI / 2; ice.position.y = -1.2;
    ice.receiveShadow = true; ice.userData.keep = true;
    statics.add(ice);
  }
  for (const [hx, hz] of HOLES) {               // 구멍: 물, 얼음 벽, 둘레의 하얀 서리 띠, 주황 깃발
    const water = new T.Mesh(new T.CircleGeometry(HOLE_R + 4, 40), mat('Water', 0x06202f, 0.06, { metalness: 0.3 }));
    water.rotation.x = -Math.PI / 2; water.position.set(hx, -70, hz);
    const wallM = M('icHoleWall', () => new T.MeshStandardMaterial({ color: 0xa9d8ec, roughness: 0.4, side: T.BackSide })), wall = new T.Mesh(new T.CylinderGeometry(HOLE_R, HOLE_R, 70, 40, 1, true), wallM);
    wall.position.set(hx, -35, hz);
    const thin = new T.Mesh(new T.RingGeometry(HOLE_R, HOLE_R + 130, 40), M('icThin', () => new T.MeshBasicMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0.5, depthWrite: false })));
    thin.rotation.x = -Math.PI / 2; thin.position.set(hx, 0.6, hz); thin.renderOrder = 1;
    statics.add(water, wall, thin);
    for (let k = 0; k < 3; k++) flagPole(hx + Math.cos(k * 2.09 + 0.5) * 470, hz + Math.sin(k * 2.09 + 0.5) * 470, k * 2.09);
  }
  for (const [x, z, r] of SNOW) plane(M('icPatch', () => new T.MeshStandardMaterial({ map: patchTex(), transparent: true, roughness: 1, depthWrite: false })), r * 2.17, r * 2.17, x, 0.9, z, { order: 1, rz: x });
  addBox(-400, 0, -400, ID + 400, { wall: true }); addBox(IW, IW + 400, -400, ID + 400, { wall: true });
  addBox(0, IW, -400, 0, { wall: true }); addBox(0, IW, ID, ID + 400, { wall: true });

  // 이글루와 펭귄
  {
    const g = grp(5000, 5200, 0.7), blocks = std('icBlockM', { map: blockTex(), roughness: 0.75 });
    part(g, new T.SphereGeometry(520, 36, 14, 0, Math.PI * 2, 0, Math.PI / 2), blocks, 0, 0, 0);
    part(g, new T.CylinderGeometry(230, 230, 380, 24, 1, false, 0, Math.PI), blocks, 560, 0, 0, [0, 0, Math.PI / 2]);       // 입구 굴 (반원통을 눕힘)
    part(g, new T.CircleGeometry(180, 24, 0, Math.PI), M('icDark', () => new T.MeshBasicMaterial({ color: 0x0a1016 })), 752, 0, 0, [0, Math.PI / 2, 0]).castShadow = false;
    addCircle(5000, 5200, 540); addCircle(5000 + Math.cos(0.7) * 600, 5200 - Math.sin(0.7) * 600, 240);
  }
  for (const [x, z, a] of PENS) makePenguin(x, z, a);
  // 얼음낚시 오두막과 낚싯대 (바로 옆이 구멍)
  {
    const g = grp(8300, 3900, 0);
    part(g, rbox(500, 620, 500, 10), mat('Hut', 0xb8322a, 0.7), 0, 310, 0);
    part(g, rbox(600, 40, 600, 8), mat('SnowCap', 0xf2f6fb, 0.95), 0, 650, 0, [0, 0, 0.1]);
    part(g, new T.PlaneGeometry(170, 330), mat('HutDoor', 0x5a1a16, 0.8), 251, 185, -70, [0, Math.PI / 2, 0]).castShadow = false;
    part(g, new T.PlaneGeometry(130, 120), M('icGlow', () => new T.MeshBasicMaterial({ color: 0xffd28a, toneMapped: false })), 251, 400, 120, [0, Math.PI / 2, 0]).castShadow = false;
    rod(g, mat('Trunk', 0x4a3324, 0.9), [270, 330, 150], [560, 250, 20], 6, 6); rod(g, mSteel, [560, 250, 20], [575, -60, 10], 1.5, 4);
    part(g, new T.CylinderGeometry(70, 58, 130, 16), mat('Bucket', 0x3e7fb5, 0.5, { metalness: 0.3 }), 420, 65, 330);
    addBox(8050, 8550, 3650, 4150); addCircle(8720, 4230, 72, { tall: false });
  }
  // 하키 골대와 퍽
  {
    const red = mat('GoalRed', 0xd3202b, 0.4, { metalness: 0.3 }), net = M('icNetM', () => new T.MeshBasicMaterial({ map: netTex(), transparent: true, side: T.DoubleSide, depthWrite: false })), g = grp(0, 0), W = GOAL.z1 - GOAL.z0, zc = (GOAL.z0 + GOAL.z1) / 2, H = 480;
    for (const z of [GOAL.z0, GOAL.z1]) { part(g, new T.CylinderGeometry(22, 22, H, 12), red, GOAL.x, H / 2, z); rod(g, red, [GOAL.x, H, z], [GOAL.back, 60, z], 14); rod(g, red, [GOAL.x, 14, z], [GOAL.back, 14, z], 14); addCircle(GOAL.x, z, 26, { tall: false }); }
    rod(g, red, [GOAL.x, H, GOAL.z0], [GOAL.x, H, GOAL.z1], 22, 12); rod(g, red, [GOAL.back, 14, GOAL.z0], [GOAL.back, 14, GOAL.z1], 14); rod(g, red, [GOAL.back, 60, GOAL.z0], [GOAL.back, 60, GOAL.z1], 14);
    quad(g, net, [GOAL.x, H, GOAL.z0], [GOAL.x, H, GOAL.z1], [GOAL.back, 60, GOAL.z0], [GOAL.back, 60, GOAL.z1]);                       // 위 그물
    quad(g, net, [GOAL.back, 0, GOAL.z0], [GOAL.back, 0, GOAL.z1], [GOAL.back, 60, GOAL.z0], [GOAL.back, 60, GOAL.z1]);                  // 뒤
    for (const z of [GOAL.z0, GOAL.z1]) quad(g, net, [GOAL.x, 0, z], [GOAL.x, H, z], [GOAL.back, 0, z], [GOAL.back, 60, z]);            // 옆
    addBox(GOAL.back - 10, GOAL.back + 20, GOAL.z0 - 10, GOAL.z1 + 10, { tall: false }); addBox(GOAL.x, GOAL.back, GOAL.z0 - 20, GOAL.z0, { tall: false }); addBox(GOAL.x, GOAL.back, GOAL.z1, GOAL.z1 + 20, { tall: false });
    plane(M('icCrease', () => new T.MeshBasicMaterial({ color: 0x57b8ff, transparent: true, opacity: 0.3, depthWrite: false })), 500, W + 300, GOAL.x - 250, 0.7, zc, { recv: false, order: 1 });
  }
  puck = addProp('puck', PUCK[0], PUCK[1], { ry: 0 });
  for (let i = 0; i < 6; i++) addProp('cone', 3600 + i * 1100, 6900, { ry: i * 0.5 });
  // 눈사람, 호숫가 오두막(창에 불빛), 나무
  {
    const g = grp(1300, 1300, -0.8), sn = mat('Snowman', 0xf7fafd, 0.9), coal = mat('Coal', 0x16171a, 0.6);
    part(g, new T.SphereGeometry(200, 22, 16), sn, 0, 180, 0); part(g, new T.SphereGeometry(145, 22, 16), sn, 0, 470, 0); part(g, new T.SphereGeometry(100, 22, 16), sn, 0, 680, 0);
    part(g, new T.ConeGeometry(18, 110, 10), mat('Carrot', 0xf07a1a, 0.6), 140, 680, 0, [0, 0, -Math.PI / 2]);
    for (const s of [-1, 1]) { part(g, new T.SphereGeometry(13, 8, 8), coal, 88, 712, s * 38); rod(g, mat('Trunk', 0x4a3324, 0.9), [0, 500, s * 130], [60, 620, s * 330], 9, 6); }
    for (const y of [420, 480, 540]) part(g, new T.SphereGeometry(12, 8, 8), coal, 142 - Math.abs(y - 480) * 0.12, y, 0);
    part(g, new T.CylinderGeometry(82, 92, 110, 18), mat('Bucket', 0x3e7fb5, 0.5, { metalness: 0.3 }), -6, 800, 0, [0, 0, 0.14]);
    addCircle(1300, 1300, 215);
  }
  {
    const cx = 7000, cz = -1000, y0 = groundH(cx, cz), g = grp(cx, cz, 0, y0), logs = std('icLogM', { map: logTex(), roughness: 0.85 }), cap = mat('SnowCap', 0xf2f6fb, 0.95), glowM = M('icGlow', () => new T.MeshBasicMaterial({ color: 0xffd28a, toneMapped: false }));
    part(g, new T.BoxGeometry(1700, 800, 1100), logs, 0, 400, 0);
    for (const s of [-1, 1]) part(g, new T.BoxGeometry(1900, 60, 800), cap, 0, 1010, s * 330, [s * 0.62, 0, 0]);          // 눈 덮인 지붕
    part(g, new T.BoxGeometry(1700, 430, 40), logs, 0, 1010, 0);
    part(g, new T.BoxGeometry(200, 520, 200), mat('Chimney', 0x6b5a50, 0.9), 520, 1230, -200);
    part(g, new T.PlaneGeometry(300, 520), mat('HutDoor', 0x5a1a16, 0.8), 0, 260, 551).castShadow = false;
    for (const s of [-1, 1]) part(g, new T.PlaneGeometry(330, 280), glowM, s * 520, 470, 551).castShadow = false;
    const pl = new T.PointLight(0xffc98a, 0.8, 4200, 0);
    pl.position.set(cx, y0 + 500, cz + 1300);
    dyn.add(pl);
    glow(cx, cz + 1500, 2600, 1500, 0xffb46a, 0.14, y0 * 0.5 + 2);
  }
  const tr = lcg(17);
  for (let i = 0; i < 64; i++) {
    const side = i % 4, t = tr(), off = 520 + tr() * 1150, x = side === 0 ? -off : side === 1 ? IW + off : t * IW, z = side === 2 ? -off : side === 3 ? ID + off : t * ID;
    if (side === 2 && Math.abs(x - 7000) < 1500) continue;                 // 오두막 자리는 비움
    pine(x, z, 0.75 + tr() * 0.6);
  }

  // 밤하늘: 별, 달, 오로라
  starField(IW / 2, ID / 2);
  const moon = new T.Mesh(new T.SphereGeometry(900, 32, 20), M('icMoonM', () => new T.MeshBasicMaterial({ map: moonTex(), toneMapped: false, fog: false })));
  moon.position.set(IW / 2 + 9000, 7600, ID / 2 - 13700);
  const halo = new T.Sprite(M('icHalo', () => new T.SpriteMaterial({ map: blobTex, color: 0xcfe0ff, transparent: true, opacity: 0.35, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, fog: false })));
  halo.position.copy(moon.position); halo.scale.set(5600, 5600, 1);
  dyn.add(halo, moon);
  const aur = [];
  [[17500, 0.0, 0x33ff99, 0x8a55ff], [19200, 1.7, 0x40e0ff, 0x52ff9a]].forEach(([R, ph, c1, c2], k) => {
    const N = 90, pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, a = deg(195) + u * deg(150), rr = R + 1300 * Math.sin(a * 3 + ph), yb = 3800 + 600 * Math.sin(a * 5 + ph);
      pos.push(IW / 2 + Math.cos(a) * rr, yb, ID / 2 + Math.sin(a) * rr, IW / 2 + Math.cos(a) * rr, yb + 5600, ID / 2 + Math.sin(a) * rr); uv.push(u, 0, u, 1);
      if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 2, i * 2 + 1, i * 2 + 3);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    const m = M('icAurora' + k, () => new T.ShaderMaterial({
      uniforms: { t: { value: 0 }, c1: { value: new T.Color(c1) }, c2: { value: new T.Color(c2) }, ph: { value: ph } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float t, ph; uniform vec3 c1, c2; varying vec2 vUv;
        void main() {
          float rays = 0.5 + 0.5 * sin(vUv.x * 80.0 + ph + t * 0.6 + sin(vUv.x * 11.0 - t * 0.25) * 3.0);
          float fade = smoothstep(0.0, 0.1, vUv.y) * pow(1.0 - vUv.y, 1.5) * smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
          gl_FragColor = vec4(mix(c1, c2, smoothstep(0.2, 0.95, vUv.y)) * (0.35 + 0.65 * rays) * fade * 0.85, 1.0);
        }`,
      transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide,
    }));
    const mesh = new T.Mesh(geo, m);
    mesh.frustumCulled = false;
    dyn.add(mesh);
    aur.push(m);
  });

  // 눈가루(미끄러지거나 바퀴가 헛돌 때)와 얼음에 긁힌 자국
  fx = makeWheelFx({ bits: 0xf2f7fb, track: 0xeaf6ff, trackOp: 0.5, up: 240, sideK: -0.9, g: 4200,
    rate: sp => (Math.abs(car.vl) > 80 || Math.abs(car.wheelV - car.v) > 140 ? 120 : clamp(sp / 1600, 0, 1) * 6),
    marking: () => Math.abs(car.vl) > 90 || Math.abs(car.wheelV - car.v) > 160 });
  anim = { aur };
  goals = 0; goalT = 0; lostT = 0; drift.cur = drift.best = drift.gap = 0;
}

MAPS.push({
  id: 'ice', name: '얼음 호수', tag: '미끄러운 얼음, 펭귄',
  title: '얼음 호수',
  lede: '꽁꽁 언 호수 위예요. 얼음이라 잘 안 서고 잘 안 돌아요. 속도를 낸 채 꺾으면 옆으로 미끄러지는 드리프트가 돼요. 펭귄 다섯 마리가 살고, 얼음 구멍에 빠지면 경로 위로 돌아와요.',
  collect: ['기록 주행 (호수 한 바퀴)', '주황색 테이프를 따라 오른쪽으로 크게 도는 약 29m 코스예요. 얼음 위에서는 미리 속도를 줄이고 천천히 꺾어야 해요.'],
  free: ['자유 주행', '드리프트 기록을 세워 보세요. 고깔 사이 지그재그, 퍽을 골대에 넣기, 펭귄 구경도 있어요. 하얗게 눈 쌓인 곳은 덜 미끄러워요.'],
  toast: { collect: 'R(B 버튼)로 녹화를 켜고 출발! 얼음이라 미리 줄이고 천천히 꺾어요', free: '자유 주행: 속도를 낸 채 꺾으면 드리프트! 주황 깃발 안쪽은 얼음 구멍' },
  fellMsg: '얼음 구멍에 빠졌어요!',
  bounds: { x0: -300, z0: -300, x1: IW + 300, z1: ID + 300 },
  floors: [[0, 0, IW, ID]],
  labels: [['이글루', 4500, 5000], ['골대', 10900, 4200], ['낚시', 8000, 3400]],
  route: { cp: 12, tapeHalf: 280, color: '#ff8a2a', wp: [[4500, 2000], [7000, 1950], [9500, 2000], [11200, 2500], [12100, 3700], [12300, 5000], [12100, 6300], [11200, 7500], [9500, 8000], [7000, 8050], [4500, 8000], [2800, 7500], [1900, 6300], [1700, 5000], [1900, 3700], [2800, 2500]] },
  baseLevel: (x, z) => (inHole(x, z) ? HOLE_Y : 0),
  gripAt: (x, z) => (SNOW.some(([sx, sz, r]) => (x - sx) ** 2 + (z - sz) ** 2 < r * r) ? 2600 : PH.aLat),
  phys: { aLat: 650, aLong: 900, killY: -200 },
  maxThr: 1, aiThr: 0.6,        // AI 데모는 쓸 수 있는 속도의 60%로 (최대 1.0이면 약 0.96m/s, 0.6이면 약 0.3m/s)
  env: { bg: 0x050b18, fog: [0x0a1626, 9000, 30000], hemi: [0x9fc0ff, 0x24364a, 0.62], sun: { dir: [-0.5, -0.42, 0.76], color: 0xcfe0ff, int: 1.9 }, fill: { color: 0x7fffd0, int: 0.12, dir: [0, 0.5, -1] }, exposure: 1.1, envInt: 0.45, shadowRadius: 4 },
  mini(c, mx, mz, s) {
    c.fillStyle = 'rgba(255,255,255,0.22)'; for (const [x, z, r] of SNOW) { c.beginPath(); c.arc(mx(x), mz(z), r * s, 0, 7); c.fill(); }
    c.fillStyle = 'rgba(0,0,0,0.6)'; for (const [x, z] of HOLES) { c.beginPath(); c.arc(mx(x), mz(z), Math.max(3, HOLE_R * s), 0, 7); c.fill(); }
    c.strokeStyle = 'rgba(211,32,43,0.9)'; c.lineWidth = 3; c.strokeRect(mx(GOAL.x), mz(GOAL.z0), (GOAL.back - GOAL.x) * s, (GOAL.z1 - GOAL.z0) * s);
  },
  build: buildIce,
  hooks: {
    step: iceStep,
    sync(dt) { for (const m of anim.aur) m.uniforms.t.value += dt; fx.step(dt); },
    hud: () => ['드리프트', `최장 ${(Math.max(drift.best, drift.cur) / 1000).toFixed(1)} m · 골 ${goals}`],
    reset() { goals = 0; goalT = 0; lostT = 0; drift.cur = drift.best = drift.gap = 0; fx.clear(); },
  },
});
}
