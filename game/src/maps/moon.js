/* ================= 맵: 달 기지 ================= */
// 내 차가 달 탐사차가 됐다. 중력이 지구의 1/6이라 점프대에서 오래 뜨고 착지하면 튄다. 흙먼지 땅이라 급히 돌면 미끄러진다.
// 좌표: x 동쪽, z 남쪽(보는 사람 쪽). 달릴 수 있는 곳은 x 0~14000, z 0~10000이고 그 밖은 빙 둘러싼 둔덕(못 넘음).
{
const MW = 14000, MD = 10000, EDGE = 250, RIM_H = 700, GRID_OUT = 1800;
// 크레이터 [x, z, 반지름, 깊이, 테두리 높이]. 물리와 그림이 같은 높이 함수(moonH)를 쓴다
const CRATERS = [[3400, 5500, 1250, 300, 45], [9050, 6200, 400, 110, 28], [9300, 3700, 800, 110, 12], [5300, 1650, 550, 130, 30], [12900, 9100, 450, 100, 26]];
// 점프대 [x0, x1, z0, z1, 끝 높이]: 동쪽으로 오르막. 첫째는 경로 위, 둘째는 바로 뒤 크레이터를 건너뛰는 큰 것
const RAMPS = [[6200, 7700, 8200, 8800, 300], [6900, 8500, 5900, 6500, 440]];
// 평평하게 고른 자리 [x, z, 반지름]: 건물 밑, 점프대 밑, 착지하는 곳
const PADS = [[7000, 2100, 900], [11700, 1800, 1500], [3150, 1700, 1500], [6950, 8500, 1300], [8900, 8500, 1400], [7700, 6200, 1200], [6300, 4950, 500]];

// 평지 끝에서 바깥으로 나간 거리 (안쪽이면 0)
const outside = (x, z) => Math.hypot(Math.max(EDGE - x, 0, x - (MW - EDGE)), Math.max(EDGE - z, 0, z - (MD - EDGE)));
function moonH(x, z) {
  const d = outside(x, z), s = sstep(d / 1350);
  let w = 1 - s;
  for (const [px, pz, pr] of PADS) w *= sstep((Math.hypot(x - px, z - pz) - pr) / 600);
  let h = w * (11 * Math.sin(x / 1900 + 0.7) * Math.cos(z / 1500 + 1.9) + 7 * Math.sin((x + z) / 900 + 2.2));   // 넓고 완만한 굴곡
  for (const [cx, cz, R, D, rim] of CRATERS) {
    const r = Math.hypot(x - cx, z - cz), rw = Math.max(110, R * 0.22);
    if (r > R + rw * 3.5) continue;
    if (r < R) h -= D * Math.cos((Math.PI * r) / (2 * R)) ** 2;       // 그릇
    h += rim * Math.exp(-(((r - R) / rw) ** 2));                     // 테두리 둔덕
  }
  if (d > 0) h += RIM_H * s + s * (1 - sstep((d - 1350) / 400)) * (150 * (vnoise(x / 650, z / 650) - 0.5) + 60 * (vnoise(x / 230, z / 230) - 0.5));
  return h;
}
function moonColor(x, z) {
  let v = 0.5 + 0.1 * (vnoise(x / 1700 + 3, z / 1700 + 7) - 0.5) + 0.06 * (vnoise(x / 420, z / 420) - 0.5);
  for (const [cx, cz, R] of CRATERS) {
    const r = Math.hypot(x - cx, z - cz);
    if (r < R * 2) v += 0.1 * Math.exp(-(((r - R) / (R * 0.35)) ** 2)) - (r < R ? 0.07 * Math.cos((Math.PI * r) / (2 * R)) ** 2 : 0);   // 테두리는 밝게, 바닥은 어둡게
  }
  v -= 0.05 * sstep(outside(x, z) / 900);
  return [v, v * 0.985, v * 0.955];
}

/* ---------- 그림(텍스처) ---------- */
const regoTex = () => TX('mnRego', () => ctex(1024, 1024, (c, w, h) => {
  const r = lcg(31);
  c.fillStyle = '#e3e1dd'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 30000; i++) { const v = 150 + r() * 105 | 0, s = 1 + r() * 2.2; c.fillStyle = `rgba(${v},${v},${v - 4},${0.22 + r() * 0.3})`; c.fillRect(r() * w, r() * h, s, s); }
  for (let i = 0; i < 46; i++) {      // 작은 크레이터 자국
    const q = 5 + r() * 15, x = q + r() * (w - 2 * q), y = q + r() * (h - 2 * q), g = c.createRadialGradient(x, y, q * 0.2, x, y, q);
    g.addColorStop(0, 'rgba(70,70,74,0.42)'); g.addColorStop(0.72, 'rgba(92,92,96,0.2)'); g.addColorStop(0.9, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, q, 0, 7); c.fill();
  }
  for (let i = 0; i < 560; i++) {     // 잔돌과 그림자 (해가 남서쪽이라 그림자는 북동쪽)
    const q = 1.2 + r() * 3.2, x = 6 + r() * (w - 12), y = 6 + r() * (h - 12), v = 196 + r() * 44 | 0;
    c.fillStyle = 'rgba(36,36,40,0.55)'; c.beginPath(); c.ellipse(x + q * 0.7, y - q * 0.6, q, q * 0.8, 0, 0, 7); c.fill();
    c.fillStyle = `rgb(${v},${v},${v - 6})`; c.beginPath(); c.ellipse(x, y, q, q * 0.8, 0, 0, 7); c.fill();
  }
}, [1, 1]));
const cellTex = () => TX('mnCell', () => ctex(512, 288, (c, w, h) => {
  c.fillStyle = '#c9ced6'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) {
    const x = 4 + i * 63.5, y = 4 + j * 70.5, g = c.createLinearGradient(x, y, x + 60, y + 67);
    g.addColorStop(0, '#1b3a86'); g.addColorStop(1, '#0d1d4a');
    c.fillStyle = g; c.fillRect(x, y, 60, 67);
    c.fillStyle = 'rgba(190,205,235,0.5)'; c.fillRect(x + 29, y, 1.5, 67); c.fillRect(x, y + 22, 60, 1); c.fillRect(x, y + 45, 60, 1);
  }
}));
const panelTex = () => TX('mnPanel', () => ctex(512, 256, (c, w, h) => {
  c.fillStyle = '#f3f4f6'; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(112,120,132,0.55)';
  for (let x = 0; x < w; x += 64) c.fillRect(x, 0, 2, h);
  for (let y = 40; y < h; y += 54) c.fillRect(0, y, w, 2);
  c.fillStyle = 'rgba(112,120,132,0.35)';
  for (let x = 32; x < w; x += 64) for (let y = 67; y < h; y += 54) c.fillRect(x - 2, y - 2, 4, 4);
}));
const deckTex = () => TX('mnDeck', () => ctex(512, 256, (c, w, h) => {
  c.fillStyle = '#7d848e'; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(30,34,40,0.5)';
  for (let x = 6; x < w; x += 12) for (let y = 6; y < h; y += 12) c.fillRect(x, y, 5, 5);
  c.strokeStyle = '#ffd23f'; c.lineWidth = 16; c.lineJoin = 'miter';
  for (const x of [120, 230, 340]) { c.beginPath(); c.moveTo(x - 34, 52); c.lineTo(x + 34, h / 2); c.lineTo(x - 34, h - 52); c.stroke(); }   // 올라가는 방향 표시
  c.save(); c.beginPath(); c.rect(448, 0, 64, h); c.clip();                                                                              // 끝의 주의 띠
  c.fillStyle = '#ffd23f'; c.fillRect(448, 0, 64, h);
  c.fillStyle = '#16181c';
  for (let y = -80; y < h + 80; y += 44) { c.beginPath(); c.moveTo(448, y); c.lineTo(512, y + 44); c.lineTo(512, y + 66); c.lineTo(448, y + 22); c.fill(); }
  c.restore();
}));
const stripeTex = () => TX('mnStripe', () => ctex(256, 64, (c, w, h) => {
  c.fillStyle = '#ffd23f'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#16181c';
  for (let x = -64; x < w + 64; x += 44) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 40, 0); c.lineTo(x + 62, 0); c.lineTo(x + 22, h); c.fill(); }
}));
// 태극기: 가운데 태극(위 빨강, 아래 파랑)과 네 모서리의 건·곤·감·리 (깃대는 왼쪽)
const taegukTex = () => TX('mnTaeguk', () => ctex(480, 320, (c, w, h) => {
  const R = h / 4;
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
  c.save(); c.translate(w / 2, h / 2); c.rotate(Math.atan2(2, 3));
  c.fillStyle = '#cd2e3a'; c.beginPath(); c.arc(0, 0, R, Math.PI, Math.PI * 2); c.fill();
  c.fillStyle = '#0047a0'; c.beginPath(); c.arc(0, 0, R, 0, Math.PI); c.fill();
  c.fillStyle = '#cd2e3a'; c.beginPath(); c.arc(-R / 2, 0, R / 2, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#0047a0'; c.beginPath(); c.arc(R / 2, 0, R / 2, 0, Math.PI * 2); c.fill();
  c.restore();
  const tri = (ang, bars) => {
    c.save(); c.translate(w / 2, h / 2); c.rotate(ang); c.fillStyle = '#000000';
    bars.forEach((solid, i) => {
      const x0 = R * 1.5 + i * (R / 6 + R / 12);
      if (solid) c.fillRect(x0, -R / 2, R / 6, R);
      else { c.fillRect(x0, -R / 2, R / 6, R / 2 - R / 24); c.fillRect(x0, R / 24, R / 6, R / 2 - R / 24); }
    });
    c.restore();
  };
  tri(Math.atan2(-2, -3), [1, 1, 1]);   // 건: 왼쪽 위
  tri(Math.atan2(2, 3), [0, 0, 0]);     // 곤: 오른쪽 아래
  tri(Math.atan2(-2, 3), [0, 1, 0]);    // 감: 오른쪽 위
  tri(Math.atan2(2, -3), [1, 0, 1]);    // 리: 왼쪽 아래
}));
const earthTex = () => TX('mnEarth', () => ctex(1024, 512, (c, w, h) => {
  const r = lcg(99), g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#16407f'); g.addColorStop(0.5, '#2060ba'); g.addColorStop(1, '#16407f');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  for (let k = 0; k < 9; k++) {       // 땅 덩어리 (진짜 대륙 모양은 아님)
    const cx = r() * w, cy = h * (0.22 + r() * 0.56), n = 14 + (r() * 18 | 0);
    for (let i = 0; i < n; i++) {
      const x = cx + (r() - 0.5) * 190, y = cy + (r() - 0.5) * 110, rx = 14 + r() * 46, ry = 10 + r() * 30, rot = r() * 3, t = r();
      c.fillStyle = t < 0.55 ? '#3f7d3a' : t < 0.8 ? '#8a7a45' : '#2f6a33';
      for (const ox of [-w, 0, w]) { c.beginPath(); c.ellipse(x + ox, y, rx, ry, rot, 0, 7); c.fill(); }
    }
  }
  c.fillStyle = 'rgba(246,249,252,0.96)'; c.fillRect(0, 0, w, 24); c.fillRect(0, h - 30, w, 30);
  c.lineCap = 'round';
  for (let i = 0; i < 150; i++) {     // 구름
    const x = r() * w, y = h * (0.08 + r() * 0.84), len = 30 + r() * 120, bend = (r() - 0.5) * 40, dy = (r() - 0.5) * 30;
    c.strokeStyle = `rgba(255,255,255,${0.25 + r() * 0.45})`; c.lineWidth = 5 + r() * 14;
    for (const ox of [-w, 0, w]) { c.beginPath(); c.moveTo(x + ox, y); c.quadraticCurveTo(x + ox + len / 2, y + bend, x + ox + len, y + dy); c.stroke(); }
  }
}));

/* ---------- 만드는 도우미 ---------- */
function strut(g, m, a, b, r, seg = 8) {       // 두 점을 잇는 막대
  const A = V(a[0], a[1], a[2]), d = V(b[0], b[1], b[2]).sub(A), o = new T.Mesh(new T.CylinderGeometry(r, r, d.length(), seg), m);
  o.position.copy(A).addScaledVector(d, 0.5);
  o.quaternion.setFromUnitVectors(UP, d.clone().normalize());
  o.castShadow = true; o.receiveShadow = true;
  g.add(o);
  return o;
}
function rockGeo(r, seed) {                    // 울퉁불퉁한 돌 (면이 각져 보임)
  const g = new T.IcosahedronGeometry(r, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 0.72 + 0.5 * hash2(Math.round(x * 3.1) + seed * 17, Math.round(y * 5.3 + z * 7.7));
    p.setXYZ(i, x * k, y * k * 0.62, z * k);
  }
  g.computeVertexNormals();
  return g;
}
const rockMat = () => std('mnRock', { color: 0x8b8a88, roughness: 1 });
function boulder(x, z, r, seed, collide = true) {
  const m = new T.Mesh(rockGeo(r, seed), rockMat());
  m.position.set(x, groundH(x, z) + r * 0.22, z);
  m.rotation.y = seed * 1.7;
  m.castShadow = true; m.receiveShadow = true;
  statics.add(m);
  if (collide) addCircle(x, z, r * 0.8, { tall: false });
}
PROPS.rock = o => ({ mesh: new T.Mesh(rockGeo(o.r, o.seed), rockMat()), r: o.r * 0.82, m: 0.3, fr: 1.3, rest: 0.25, yoff: o.r * 0.26 });
PROPS.golf = () => ({ mesh: new T.Mesh(new T.SphereGeometry(30, 16, 12), std('mnGolf', { color: 0xfafafa, roughness: 0.4 })), r: 30, m: 0.05, fr: 0.3, rest: 0.6, yoff: 30, roll: true });

function lander(x, z, ang) {
  const g = grp(x, z, ang, groundH(x, z)), ca = Math.cos(ang), sa = Math.sin(ang);
  const foil = std('mnFoil', { color: 0xd9a531, roughness: 0.45, metalness: 0.75, emissive: 0x2a1c05 }), silver = std('mnSilver', { color: 0xb4b9c0, roughness: 0.42, metalness: 0.6 }), dark = std('mnDarkM', { color: 0x1d1f23, roughness: 0.55, metalness: 0.4 });
  part(g, new T.CylinderGeometry(330, 330, 240, 8), foil, 0, 380, 0, [0, Math.PI / 8, 0]);                       // 아래 몸통 (금박)
  part(g, new T.CylinderGeometry(300, 332, 26, 8), dark, 0, 513, 0, [0, Math.PI / 8, 0]);
  part(g, new T.CylinderGeometry(72, 138, 130, 20, 1, true), M('mnBell', () => new T.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.5, metalness: 0.6, side: T.DoubleSide })), 0, 195, 0);   // 엔진
  for (let k = 0; k < 4; k++) {                                                                                   // 다리 넷
    const a = Math.PI / 4 + (k * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a);
    strut(g, silver, [c * 300, 440, s * 300], [c * 640, 34, s * 640], 15);
    for (const sg of [-1, 1]) strut(g, silver, [Math.cos(a + sg * 0.42) * 325, 285, Math.sin(a + sg * 0.42) * 325], [c * 520, 180, s * 520], 9);
    part(g, new T.CylinderGeometry(72, 58, 18, 18), foil, c * 640, 9, s * 640);
    addCircle(x + c * 560 * ca + s * 560 * sa, z - c * 560 * sa + s * 560 * ca, 112);
  }
  part(g, rbox(360, 250, 420, 40), silver, 15, 655, 0);                                                           // 위 조종실
  for (const sz of [-1, 1]) {
    part(g, new T.SphereGeometry(92, 18, 12), foil, -45, 640, sz * 245);
    part(g, new T.CircleGeometry(50, 3), M('mnWin', () => new T.MeshBasicMaterial({ color: 0x0c0f14 })), 196.5, 705, sz * 92, [0, Math.PI / 2, 0]).castShadow = false;
  }
  part(g, new T.PlaneGeometry(112, 112), std('mnHatch', { color: 0x33363c, roughness: 0.6, metalness: 0.5 }), 196.5, 588, 0, [0, Math.PI / 2, 0]).castShadow = false;
  part(g, new T.CylinderGeometry(70, 70, 46, 20), dark, 0, 803, 0);
  for (const [qx, qz] of [[150, 190], [150, -190], [-130, 190], [-130, -190]]) part(g, rbox(46, 46, 46, 8), dark, qx, 792, qz);
  strut(g, silver, [-110, 780, -110], [-150, 940, -150], 5, 6);
  part(g, new T.SphereGeometry(86, 20, 8, 0, Math.PI * 2, 0, 0.9), M('mnDish', () => new T.MeshStandardMaterial({ color: 0xe6e8ea, roughness: 0.5, metalness: 0.3, side: T.DoubleSide })), -150, 1010, -150, [Math.PI - 0.5, 0, 0.3]);
  {                                                                                                               // 사다리 (앞다리)
    const a = Math.PI / 4, c = Math.cos(a), s = Math.sin(a), P = f => [c * lerp(330, 600, f), lerp(470, 80, f), s * lerp(330, 600, f)];
    for (const sg of [-1, 1]) strut(g, silver, [P(0)[0] - s * 28 * sg, P(0)[1], P(0)[2] + c * 28 * sg], [P(1)[0] - s * 28 * sg, P(1)[1], P(1)[2] + c * 28 * sg], 5, 6);
    for (let i = 1; i < 7; i++) { const p = P(i / 7); strut(g, silver, [p[0] + s * 28, p[1], p[2] - c * 28], [p[0] - s * 28, p[1], p[2] + c * 28], 4, 6); }
  }
  addCircle(x, z, 400);
}
function habitat(x, z) {
  const y0 = groundH(x, z), g = grp(x, z, 0, y0);
  const white = std('mnHab', { map: panelTex(), color: 0xf2f3f5, roughness: 0.6 }), grey = std('mnGrey', { color: 0x9aa0a8, roughness: 0.6, metalness: 0.3 });
  const glowM = M('mnGlowWin', () => new T.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false }));
  part(g, new T.SphereGeometry(800, 44, 16, 0, Math.PI * 2, 0, Math.PI / 2), white, 0, 0, 0);                    // 큰 돔
  part(g, new T.CylinderGeometry(812, 830, 70, 48), grey, 0, 35, 0);
  part(g, new T.SphereGeometry(470, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), white, 1080, 0, -330);              // 작은 돔
  part(g, new T.CylinderGeometry(480, 494, 56, 36), grey, 1080, 28, -330);
  strut(g, white, [560, 170, -170], [820, 170, -250], 150, 20);                                                  // 두 돔을 잇는 통로
  part(g, new T.CylinderGeometry(250, 250, 560, 28), white, 0, 250, 960, [Math.PI / 2, 0, 0]);                   // 남쪽 출입구(에어록)
  part(g, rbox(440, 26, 520, 8), grey, 0, 13, 960);
  part(g, new T.TorusGeometry(250, 22, 10, 32), grey, 0, 250, 1240);
  part(g, new T.CircleGeometry(230, 32), std('mnDoor', { color: 0x3b3f46, roughness: 0.5, metalness: 0.5 }), 0, 250, 1241).castShadow = false;
  part(g, new T.CircleGeometry(72, 24), glowM, 0, 305, 1242.5).castShadow = false;
  for (const [az, el] of [[0.62, 0.42], [-0.62, 0.42], [1.55, 0.5], [-1.55, 0.5], [2.5, 0.45]]) {                 // 둥근 창 (남쪽이 az 0)
    const n = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    for (const [geo, m, k] of [[new T.CircleGeometry(78, 24), glowM, 803], [new T.TorusGeometry(80, 11, 8, 24), grey, 800]]) {
      const o = part(g, geo, m, n.x * k, n.y * k, n.z * k);
      o.lookAt(x + n.x * 3000, y0 + n.y * 3000, z + n.z * 3000);
      o.castShadow = false;
    }
  }
  addCircle(x, z, 835); addCircle(x + 1080, z - 330, 500); addBox(x - 255, x + 255, z + 680, z + 1255);
  const pl = new T.PointLight(0xffc98a, 0.85, 2800, 0);                                                          // 출입구에서 새는 불빛
  pl.position.set(x, y0 + 380, z + 1750);
  dyn.add(pl);
  glow(x, z + 1850, 1700, 1400, 0xffb46a, 0.2, y0 + 2);
  // 안테나 탑: 지구 쪽 접시, 깜박이는 빨간 등
  const mx = x - 1180, mz = z - 380, root = grp(mx, mz, 0, groundH(mx, mz));
  part(root, new T.CylinderGeometry(13, 18, 1500, 10), grey, 0, 750, 0);
  for (let k = 0; k < 3; k++) strut(root, grey, [0, 1050, 0], [Math.cos(k * 2.1 + 0.4) * 460, 0, Math.sin(k * 2.1 + 0.4) * 460], 3, 5);
  part(root, new T.SphereGeometry(150, 24, 8, 0, Math.PI * 2, 0, 0.95), M('mnDish', () => new T.MeshStandardMaterial({ color: 0xe6e8ea, roughness: 0.5, metalness: 0.3, side: T.DoubleSide })), 20, 1330, -150, [Math.PI + 0.95, 0, 0]);
  addCircle(mx, mz, 26, { tall: false });
  const beacon = new T.Mesh(new T.SphereGeometry(24, 12, 10), M('mnBeacon', () => new T.MeshBasicMaterial({ color: 0xff3b30, toneMapped: false })));
  beacon.position.set(mx, groundH(mx, mz) + 1520, mz);
  dyn.add(beacon);
  return beacon;
}
function solar(x, z) {
  const g = grp(x, z, 0, groundH(x, z)), tilt = new T.Group();
  part(g, rbox(260, 22, 260, 6), std('mnGrey', { color: 0x9aa0a8, roughness: 0.6, metalness: 0.3 }), 0, 11, 0);
  part(g, new T.CylinderGeometry(22, 26, 400, 12), mSteel, 0, 210, 0);
  tilt.position.set(0, 420, 0); tilt.rotation.x = deg(34);                                                       // 해가 있는 남쪽으로 숙임
  g.add(tilt);
  part(tilt, rbox(920, 18, 540, 4), mSteel, 0, 0, 0);
  part(tilt, new T.PlaneGeometry(884, 504), std('mnCellM', { map: cellTex(), roughness: 0.22, metalness: 0.5, emissive: 0x06102a }), 0, 10, 0, [-Math.PI / 2, 0, 0]).castShadow = false;
  addCircle(x, z, 60);
}
function flag(x, z) {
  const g = grp(x, z, 0, groundH(x, z)), geo = new T.PlaneGeometry(320, 213, 10, 1), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = (p.getX(i) + 160) / 320; p.setZ(i, 8 * u * Math.sin(u * 8.5)); }  // 접힌 채 굳은 주름 (바람이 없으니 가로대로 펴 둠)
  geo.computeVertexNormals();
  part(g, new T.CylinderGeometry(7, 9, 640, 10), mSteel, 0, 320, 0);
  strut(g, mSteel, [0, 630, 0], [338, 630, 0], 4, 6);
  part(g, geo, M('mnFlag', () => new T.MeshStandardMaterial({ map: taegukTex(), roughness: 0.85, side: T.DoubleSide })), 168, 520, 0);
  addCircle(x, z, 18, { tall: false });
}
function astronaut(x, z, ang) {                 // 얼굴 없는 단순한 모형. 제자리에서 천천히 뛰며 손을 흔든다 (합치지 않고 dyn에 둠)
  const g = grp(x, z, ang, groundH(x, z), dyn), suit = std('mnSuit', { color: 0xf1f1ee, roughness: 0.85 }), grey = std('mnSuitG', { color: 0x8d9299, roughness: 0.8 }), arm = new T.Group();
  for (const s of [-1, 1]) { part(g, new T.CapsuleGeometry(27, 78, 4, 10), suit, 0, 82, s * 34); part(g, rbox(84, 30, 50, 10), grey, 12, 15, s * 34); }
  part(g, rbox(112, 138, 150, 34), suit, 0, 205, 0);
  part(g, rbox(62, 156, 124, 14), std('mnPack', { color: 0xdcdedf, roughness: 0.7 }), -78, 222, 0);
  part(g, new T.SphereGeometry(63, 22, 16), suit, 4, 316, 0);
  part(g, new T.SphereGeometry(50, 22, 16), std('mnVisor', { color: 0xd9a531, roughness: 0.16, metalness: 0.95, emissive: 0x2a1c05 }), 26, 318, 0);
  part(g, new T.CapsuleGeometry(22, 86, 4, 10), suit, 6, 196, 96, [0.22, 0, 0]);
  arm.position.set(4, 258, -80);
  g.add(arm);
  part(arm, new T.CapsuleGeometry(22, 86, 4, 10), suit, 0, 62, 0);
  part(arm, new T.SphereGeometry(27, 12, 10), grey, 0, 126, 0);
  addCircle(x, z, 95, { tall: false });
  return { g, arm, y0: g.position.y };
}
function ramp([x0, x1, z0, z1, H]) {
  const L = x1 - x0, W = z1 - z0, len = Math.hypot(L, H), ang = Math.atan2(H, L), cx = (x0 + x1) / 2, yc = H / 2 - 8 / Math.cos(ang);
  box(std('mnDeckM', { map: deckTex(), roughness: 0.55, metalness: 0.45 }), [cx - len / 2, cx + len / 2], [yc - 8, yc + 8], [z0, z1], { rz: ang });   // 윗면이 물리의 경사면과 같은 높이
  const h = H - 18, P = [[0, 0, 12], [L - 6, 0, 12], [L - 6, h, 12], [0, 0, W - 12], [L - 6, 0, W - 12], [L - 6, h, W - 12]], pos = [];
  for (const f of [[0, 2, 1], [3, 4, 5], [1, 2, 5], [1, 5, 4]]) for (const i of f) pos.push(P[i][0], P[i][1], P[i][2]);                               // 옆 두 면과 뒷면을 막은 몸통
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const body = new T.Mesh(geo, std('mnRampSide', { color: 0x464c58, roughness: 0.5, metalness: 0.5 }));
  body.position.set(x0, 0, z0);
  body.castShadow = true; body.receiveShadow = true;
  statics.add(body);
  const band = new T.Mesh(new T.PlaneGeometry(W - 24, 96), std('mnStripeM', { map: stripeTex(), roughness: 0.6 }));
  band.position.set(x1 - 4.5, h - 60, (z0 + z1) / 2); band.rotation.y = Math.PI / 2;
  statics.add(band);
  features.ramps.push({ x0, x1, z0, z1, axis: 'x', h0: 0, h1: H });
}
function sign(x, z, ang, lines) {
  const key = lines.join(''), g = grp(x, z, ang, groundH(x, z));
  const tex = textTex('mnSign' + key, 384, 224, '#ffd23f', (c, w, h) => {
    c.strokeStyle = '#16181c'; c.lineWidth = 10; c.strokeRect(9, 9, w - 18, h - 18);
    c.fillStyle = '#16181c'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '800 50px "IBM Plex Sans KR", "Malgun Gothic", sans-serif';
    lines.forEach((t, i) => c.fillText(t, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 64));
  });
  part(g, new T.CylinderGeometry(9, 9, 260, 8), mSteel, 0, 130, 0);
  part(g, rbox(14, 190, 320, 6), std('mnDarkM', { color: 0x1d1f23, roughness: 0.55, metalness: 0.4 }), 0, 330, 0);
  part(g, new T.PlaneGeometry(304, 176), std('mnSignM' + key, { map: tex, roughness: 0.7 }), 8, 330, 0, [0, Math.PI / 2, 0]).castShadow = false;
  addCircle(x, z, 16, { tall: false });
}

/* ---------- 하늘과 먼 산 ---------- */
function sky() {
  starField(MW / 2, MD / 2);
  const earth = new T.Mesh(new T.SphereGeometry(1500, 48, 32), M('mnEarthM', () => new T.MeshStandardMaterial({ map: earthTex(), roughness: 0.9, emissive: 0x0a1a3a, emissiveIntensity: 0.6, envMap: scene.environment, envMapIntensity: 0 })));
  earth.position.set(8800, 3300, -12500); earth.rotation.set(0.35, 1.2, 0.2);
  const halo = new T.Mesh(new T.SphereGeometry(1590, 40, 24), M('mnHalo', () => new T.MeshBasicMaterial({ color: 0x5fa8ff, transparent: true, opacity: 0.16, side: T.BackSide, depthWrite: false, toneMapped: false })));
  halo.position.copy(earth.position);
  dyn.add(halo, earth);
  return earth;
}
function farGround(mat) {
  const cx = MW / 2, cz = MD / 2, F = 24000, x0 = -GRID_OUT, x1 = MW + GRID_OUT, z0 = -GRID_OUT, z1 = MD + GRID_OUT, pos = [], uv = [], col = [], idx = [];
  const quad = (xa, xb, za, zb) => {            // 지형 격자 바깥을 둔덕 높이로 평평하게 잇는 땅
    const k = pos.length / 3;
    for (const [x, z] of [[xa, za], [xa, zb], [xb, za], [xb, zb]]) { pos.push(x, RIM_H, z); uv.push(x / 1200, z / 1200); col.push(0.45, 0.443, 0.43); }
    idx.push(k, k + 1, k + 2, k + 2, k + 1, k + 3);
  };
  quad(cx - F, x0, cz - F, cz + F); quad(x1, cx + F, cz - F, cz + F); quad(x0, x1, cz - F, z0); quad(x0, x1, z1, cz + F);
  // 먼 산: 중심에서 13~16m 떨어진 고리. 안쪽·아래 줄에서 바깥·위 줄로 올라간다
  const N = 144, rows = [[13000, 0], [14300, 0.55], [15700, 1]], base = pos.length / 3;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2, k = i % N, peak = 800 + 2300 * (0.5 + 0.5 * Math.sin(a * 3 + 1.1) * Math.sin(a * 7 + 0.4)) ** 1.4 + 700 * hash2(k, 5);
    rows.forEach(([rad, f], j) => {
      const rr = rad + 500 * (hash2(k, 9 + j) - 0.5), y = RIM_H - 80 + f * peak * (j === 1 ? 0.75 + 0.5 * hash2(k, 20) : 1), v = 0.4 + 0.1 * hash2(k, 30 + j);
      pos.push(cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr); uv.push((i / N) * 40, f * 3); col.push(v, v * 0.985, v * 0.955);
    });
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < 2; j++) { const a = base + i * 3 + j, b = a + 3; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new T.Mesh(geo, mat);
  m.userData.keep = true; m.frustumCulled = false;
  statics.add(m);
}

/* ---------- 짓기 ---------- */
let anim = null, best = null, fx = null, clock = 0;
function buildMoon() {
  setTerrain(moonH, -GRID_OUT, -GRID_OUT, MW + GRID_OUT, MD + GRID_OUT, 100);
  const rego = M('mnRegoM', () => new T.MeshStandardMaterial({ map: regoTex(), vertexColors: true, roughness: 1, metalness: 0 }));
  terrainMesh(rego, 1200, moonColor);
  farGround(rego);
  // 둘러싼 둔덕은 못 넘는다
  addBox(-400, 0, -400, MD + 400, { wall: true }); addBox(MW, MW + 400, -400, MD + 400, { wall: true });
  addBox(0, MW, -400, 0, { wall: true }); addBox(0, MW, MD, MD + 400, { wall: true });

  lander(7000, 2100, 0.35);
  const beacon = habitat(11500, 1900);
  for (const x of [2100, 3150, 4200]) solar(x, 1700);
  flag(6200, 4900);
  const astro = astronaut(6560, 5080, -0.9);
  for (const r of RAMPS) ramp(r);
  sign(5750, 8060, Math.PI, ['점프대', '속도를 내요!']);
  sign(6450, 5720, Math.PI, ['크레이터', '건너뛰기']);

  // 큰 돌(부딪힘)과 밀리는 돌, 골프공
  for (const [x, z, r] of [[1500, 1250, 260], [5050, 4350, 200], [8350, 1400, 230], [9900, 1250, 170], [13150, 3600, 240], [10900, 6900, 210], [4700, 7450, 190], [2250, 9050, 250], [11400, 9350, 180], [800, 2600, 170], [13300, 6600, 150], [8650, 5150, 140]]) boulder(x, z, r, x + z);
  for (const [x, z, r] of [[4300, 7900, 62], [5450, 9150, 74], [10350, 7750, 58], [11250, 5050, 70], [8250, 4650, 64], [5250, 2950, 56], [2600, 4050, 68], [2900, 7300, 60], [9950, 9250, 66], [12050, 6050, 54]]) addProp('rock', x, z, { r, seed: x + z, ry: (x % 7) * 0.9 });
  for (const [x, z] of [[5900, 5350], [6010, 5440], [5830, 5500]]) addProp('golf', x, z, { ry: 0 });
  // 둔덕 위의 돌 (구경만)
  const br = lcg(7);
  for (let i = 0; i < 70; i++) {
    const side = i % 4, t = br(), off = 280 + br() * 1200, x = side === 0 ? -off : side === 1 ? MW + off : t * MW, z = side === 2 ? -off : side === 3 ? MD + off : t * MD;
    boulder(x, z, 70 + br() * 230, i + 3, false);
  }

  const earth = sky();
  // 흙먼지(빠를수록, 미끄러질수록 많이. 중력이 약해 높이 오래 난다)와 바퀴 자국(떠 있는 동안은 끊긴다)
  fx = makeWheelFx({ bits: 0xc4c2bd, track: 0x0c0c0e, trackOp: 0.32, up: 160, sideK: -0.5, rate: sp => clamp(sp / 1600, 0, 1) * 70 + (Math.abs(car.vl) > 60 ? 90 : 0), marking: () => true });
  anim = { beacon, astro, earth };
  best = null;
}

MAPS.push({
  id: 'moon', name: '달 기지', tag: '중력 1/6, 점프대',
  title: '달 기지',
  lede: '내 차가 달 탐사차가 됐어요. 중력이 지구의 1/6이라 점프대에서 오래 날고, 착지하면 통통 튀어요. 땅이 흙먼지라 급하게 돌면 미끄러져요.',
  collect: ['기록 주행 (기지 한 바퀴)', '점프대를 넘고, 기지와 착륙선 앞을 지나 왼쪽으로 도는 약 34m 코스예요. 얕은 크레이터도 하나 지나가요.'],
  free: ['자유 주행', '가운데 큰 점프대로 크레이터를 건너뛰어 보세요. 최고 속도가 아니면 크레이터에 빠져요. 큰 크레이터 안을 빙빙 돌아도 재미있어요.'],
  toast: { collect: 'R(B 버튼)로 녹화를 켜고 출발! 조금 가면 점프대예요', free: '자유 주행: 가운데 큰 점프대는 최고 속도로 넘어야 크레이터를 건너요' },
  bounds: { x0: -300, z0: -300, x1: MW + 300, z1: MD + 300 },
  floors: [[0, 0, MW, MD]],
  labels: [['착륙선', 6800, 1500], ['기지', 11300, 1300], ['큰 크레이터', 2700, 5600], ['점프대', 6500, 9350]],
  route: { cp: 14, tapeHalf: 260, wp: [[3400, 8500], [4800, 8500], [6200, 8500], [7700, 8500], [9300, 8500], [10700, 8480], [11800, 8150], [12500, 7350], [12750, 6200], [12700, 5100], [12300, 4350], [11400, 4000], [10300, 3850], [9300, 3780], [8200, 3850], [7000, 3950], [5700, 3700], [4500, 3250], [3300, 3050], [2100, 3400], [1400, 4300], [1200, 5500], [1350, 6800], [1900, 7850], [2700, 8400]] },
  phys: { g: 1620, aLat: 3200, bounce: 0.25 },
  maxThr: 1,
  env: { bg: 0x000000, hemi: [0xbfd0ff, 0x30302c, 0.16], sun: { dir: [0.55, -0.47, -0.69], color: 0xfff6e8, int: 4.2 }, fill: { color: 0x7f9dff, int: 0.1, dir: [0.1, 0.4, -0.9] }, exposure: 1.0, envInt: 0.25, shadowRadius: 1.2 },
  mini(c, mx, mz, s) {
    for (const [x, z, R] of CRATERS) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.arc(mx(x), mz(z), R * s, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = 1.5; c.stroke(); }
    c.fillStyle = 'rgba(255,210,63,0.85)';
    for (const [x0, x1, z0, z1] of RAMPS) c.fillRect(mx(x0), mz(z0), (x1 - x0) * s, (z1 - z0) * s);
  },
  build: buildMoon,
  hooks: {
    sync(dt) {
      clock += dt;
      const ph = clock % 1.9, u = ph / 0.6;
      anim.astro.g.position.y = anim.astro.y0 + (u < 1 ? 85 * 4 * u * (1 - u) : 0);       // 느린 제자리 뛰기
      anim.astro.arm.rotation.x = -0.55 + 0.35 * Math.sin(clock * 5);
      anim.beacon.material.color.setHex(clock % 1.4 < 0.25 ? 0xff3b30 : 0x3a0c0a);       // 깜박이는 등 (꺼졌을 때도 어둡게 보임)
      anim.earth.rotation.y += dt * 0.01;
      fx.step(dt);
    },
    onLand(sec, dist) {
      if (sec > 0.25) for (let i = 0; i < 34; i++) { const a = Math.random() * 6.283, v = 160 + Math.random() * 380; fx.puff(car.x + Math.cos(a) * 90, car.py + 8, car.z + Math.sin(a) * 90, Math.cos(a) * v, 120 + Math.random() * 330, Math.sin(a) * v, 8 + Math.random() * 10); }
      if (sec < 0.3 || (best && dist <= best.d)) return;
      best = { d: dist, t: sec };
      if (state.playing) toast(`점프 ${(dist / 1000).toFixed(2)} m, ${sec.toFixed(1)}초 동안 떠 있었어요! 새 기록`, 'good');
    },
    hud: () => ['최장 점프', best ? `${(best.d / 1000).toFixed(2)} m · ${best.t.toFixed(1)}초` : '아직 없음'],
    reset() { best = null; fx.clear(); },
  },
});
}
