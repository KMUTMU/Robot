/* ================= 맵: 볼링장 ================= */
// 내 차가 볼링공. 레인 세 개(폭 1070, 파울 라인에서 핀 자리 끝까지 약 6.2m)에 진짜 크기 핀 10개씩.
// 핀은 밀리는 물건(소품)인데, 세게 맞으면 쓰러지고 옆 핀을 쳐서 줄줄이 넘어간다. 첫 핀이 쓰러지고 7초 뒤 다시 세운다.
// 좌표: x 동쪽(핀 쪽), z 남쪽. 서쪽 x 0~2600은 로비, 레인 양옆의 둥근 홈이 거터.
{
const BW = 9000, BD = 6000, FOUL = 2600, DECK = 8760, BACK = 8880, HEAD = 7908, ROW = 264, GAP = 305, LANE_HW = 535;
const ZC = [1460, 3000, 4540], Z0 = ZC[0] - 770, Z1 = ZC[2] + 770;   // 레인 가운데 z, 레인 묶음의 북쪽·남쪽 끝
const GUT = ZC.flatMap(zc => [zc - 652.5, zc + 652.5]);              // 거터(폭 235, 깊이 45) 가운데 z
const lcg = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const sstep = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const mat = (name, color, rough = 0.7, o = {}) => std('bw' + name, { color, roughness: rough, ...o });
// 바닥 높이: 거터는 둥근 홈. 파울 라인에서 300mm에 걸쳐 깊어진다
function bowlLevel(x, z) {
  if (x <= FOUL || x > BACK) return 0;
  for (const zg of GUT) { const t = (z - zg) / 117.5; if (t > -1 && t < 1) return -45 * (1 - t * t) * sstep((x - FOUL) / 300); }
  return 0;
}

/* ---------- 그림(텍스처) ---------- */
const carpetTex = () => TX('bwCarpet', () => ctex(512, 512, (c, w, h) => {
  const r = lcg(11), cols = ['#ff4fa3', '#ffb347', '#3de0e6', '#ffe45c', '#9d7bff'];
  c.fillStyle = '#143c47'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},0.05)`; c.fillRect(r() * w, r() * h, 2, 2); }
  c.lineCap = 'round';
  for (let i = 0; i < 70; i++) {      // 옛날 오락실 카펫 무늬
    const x = 24 + r() * (w - 48), y = 24 + r() * (h - 48), t = r();
    c.strokeStyle = c.fillStyle = cols[(r() * cols.length) | 0];
    c.save(); c.translate(x, y); c.rotate(r() * 6.28);
    if (t < 0.4) { c.lineWidth = 5; c.beginPath(); c.moveTo(-16, 0); c.quadraticCurveTo(-8, -12, 0, 0); c.quadraticCurveTo(8, 12, 16, 0); c.stroke(); }
    else if (t < 0.7) { c.beginPath(); c.moveTo(0, -9); c.lineTo(9, 7); c.lineTo(-9, 7); c.fill(); }
    else if (t < 0.88) { c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 8, 0, 6.28); c.stroke(); }
    else c.fillRect(-3, -12, 6, 24);
    c.restore();
  }
}, [1, 1]));
const mapleTex = () => TX('bwMaple', () => ctex(512, 512, (c, w, h) => {
  const r = lcg(5), n = 16;
  for (let i = 0; i < n; i++) {
    c.fillStyle = `hsl(${34 + r() * 5},${52 + r() * 10}%,${71 + r() * 8}%)`; c.fillRect(0, (i * h) / n, w, h / n + 1);
    c.fillStyle = 'rgba(90,60,30,0.35)'; c.fillRect(0, (i * h) / n, w, 1.2);
    c.fillStyle = 'rgba(120,80,40,0.1)';
    for (let k = 0; k < 5; k++) c.fillRect(r() * w, (i * h) / n + 3 + r() * (h / n - 6), 40 + r() * 120, 1);
  }
}, [1, 1]));
const laneTex = () => TX('bwLane', () => ctex(2048, 256, (c, w, h) => {
  const r = lcg(8), n = 39, mm = w / (DECK - FOUL), zz = h / (LANE_HW * 2);   // 길이·폭 방향 1mm가 몇 픽셀인지
  for (let i = 0; i < n; i++) {
    c.fillStyle = `hsl(${35 + r() * 4},${55 + r() * 10}%,${74 + r() * 7}%)`; c.fillRect(0, (i * h) / n, w, h / n + 1);
    c.fillStyle = 'rgba(100,66,30,0.3)'; c.fillRect(0, (i * h) / n, w, 0.8);
  }
  const deckX = (HEAD - 200 - FOUL) * mm;
  c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(deckX, 0, w - deckX, h);                 // 핀 자리는 조금 밝은 판
  c.fillStyle = '#1b1b1f'; c.fillRect(0, 0, 9, h);                                           // 파울 라인
  c.fillStyle = '#3a2a1c';
  for (const k of [-3, -2, -1, 0, 1, 2, 3]) {                                                 // 겨냥 화살표 (가운데가 가장 멀리)
    const x = (1420 - Math.abs(k) * 118) * mm, y = h / 2 + k * 137 * zz;
    c.beginPath(); c.moveTo(x + 150 * mm, y); c.lineTo(x, y - 20 * zz); c.lineTo(x, y + 20 * zz); c.fill();
  }
  for (const k of [-4.5, -3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5, 4.5]) { c.beginPath(); c.arc(620 * mm, h / 2 + k * 82 * zz, 2.6, 0, 7); c.fill(); }
  c.fillStyle = 'rgba(40,30,22,0.55)';
  for (let k = 0; k < 4; k++) for (let i = 0; i <= k; i++) { c.beginPath(); c.ellipse((HEAD + k * ROW - FOUL) * mm, h / 2 + (i - k / 2) * GAP * zz, 30 * mm, 30 * zz, 0, 0, 7); c.fill(); }
}));
const marbleTex = () => TX('bwMarble', () => ctex(256, 128, (c, w, h) => {
  const r = lcg(21);
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
  c.lineCap = 'round';
  for (let i = 0; i < 60; i++) {
    const x = r() * w, y = r() * h;
    c.strokeStyle = `rgba(0,0,0,${0.08 + r() * 0.22})`; c.lineWidth = 3 + r() * 10;
    c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + (r() - 0.5) * 120, y + (r() - 0.5) * 60, x + (r() - 0.5) * 120, y + (r() - 0.5) * 60, x + (r() - 0.5) * 160, y + (r() - 0.5) * 80); c.stroke();
  }
  c.fillStyle = '#0c0c0e';
  for (const [x, y] of [[118, 22], [138, 22], [128, 38]]) { c.beginPath(); c.ellipse(x, y, 5.5, 4.5, 0, 0, 7); c.fill(); }   // 손가락 구멍
}));
const pinTex = () => TX('bwPinT', () => ctex(8, 256, (c, w, h) => {
  c.fillStyle = '#fbfaf6'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#d3202b'; c.fillRect(0, h * 0.295, w, h * 0.034); c.fillRect(0, h * 0.365, w, h * 0.034);                  // 목의 빨간 띠 둘
}));
const shoeTex = () => TX('bwShoes', () => ctex(512, 320, (c, w, h) => {
  const r = lcg(41), cols = [['#d93a4a', '#f4f1ea'], ['#2f6fed', '#f4f1ea'], ['#1c1c20', '#ffb347'], ['#1fb26a', '#f4f1ea']];
  c.fillStyle = '#6b4a2e'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
    const x = 8 + i * 84, y = 8 + j * 78, [a, b] = cols[(r() * cols.length) | 0];
    c.fillStyle = '#2a1c12'; c.fillRect(x, y, 76, 70);
    if (r() < 0.2) continue;                                                             // 빈 칸
    for (const ox of [10, 42]) { c.fillStyle = a; c.fillRect(x + ox, y + 34, 26, 28); c.fillStyle = b; c.fillRect(x + ox, y + 34, 26, 9); c.fillRect(x + ox + 9, y + 43, 8, 19); }
  }
}));
const wetTex = () => TX('bwWet', () => ctex(256, 512, (c, w, h) => {
  c.fillStyle = '#ffd23f'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#16181c'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.beginPath(); c.moveTo(w / 2, 70); c.lineTo(w / 2 + 70, 190); c.lineTo(w / 2 - 70, 190); c.fill();
  c.fillStyle = '#ffd23f'; c.font = '800 84px sans-serif'; c.fillText('!', w / 2, 146);
  c.fillStyle = '#16181c'; c.font = '800 62px "IBM Plex Sans KR", "Malgun Gothic", sans-serif';
  c.fillText('미끄럼', w / 2, 300); c.fillText('주의', w / 2, 380);
}));
const arcadeTex = () => TX('bwArcade', () => ctex(256, 192, (c, w, h) => {
  c.fillStyle = '#07102a'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#3de0e6'; c.fillRect(20, 60, 10, 46); c.fillRect(226, 90, 10, 46); c.fillRect(120, 84, 10, 10);              // 막대 둘과 네모 공
  c.fillStyle = 'rgba(255,255,255,0.35)'; for (let y = 8; y < h; y += 18) c.fillRect(127, y, 2, 9);
  c.fillStyle = '#ffe45c'; c.font = '800 26px sans-serif'; c.textAlign = 'center'; c.fillText('3  :  2', w / 2, 34);
  c.fillStyle = '#ff4fa3'; c.font = '800 20px "IBM Plex Sans KR", "Malgun Gothic", sans-serif'; c.fillText('동전을 넣으세요', w / 2, h - 16);
}));

/* ---------- 밀리는 것: 핀, 볼링공, 미끄럼 주의 표지 ---------- */
const PIN = [[0, 0], [26, 0], [29, 6], [40, 38], [53, 76], [60.5, 114], [56, 152], [44, 190], [31, 222], [23, 254], [25, 286], [31, 318], [32.5, 343], [28, 364], [17, 377], [0, 381]];
PROPS.pin = () => {
  // 바깥 그룹은 방향(ry), 안쪽 그룹은 쓰러지는 기울기. lane·row는 놓을 때 정한다
  const outer = new T.Group(), inner = new T.Group();
  inner.add(new T.Mesh(new T.LatheGeometry(PIN.map(([r, y]) => new T.Vector2(r, y)), 20), std('bwPin', { map: pinTex(), roughness: 0.22 })));
  outer.add(inner);
  return {
    mesh: outer, inner, r: 55, m: 0.35, fr: 2.4, rest: 0.6, yoff: 0, lane: null, row: 0, down: false, swept: false, fallT: 0, dropT: 0,
    onCar(rel) { if (state.mode === 'collect' && rel > 100 && state.time - state.lastCrash > 0.6) crash(rel, '볼링핀'); },   // 기록 주행에서는 부딪힌 것으로 셈
    reset() { this.down = false; this.swept = false; this.fallT = 0; this.dropT = 0; this.fr = 2.4; this.r = 55; },
  };
};
PROPS.bowl = o => ({ mesh: new T.Mesh(new T.SphereGeometry(109, 28, 20), std('bwBall' + o.color, { map: marbleTex(), color: o.color, roughness: 0.14, metalness: 0.1 })), r: 109, m: 2.2, fr: 0.12, rest: 0.3, yoff: 109, roll: true, pitT: 0 });
PROPS.wetsign = () => {
  const g = new T.Group(), m = std('bwWetM', { map: wetTex(), roughness: 0.5 });
  for (const s of [-1, 1]) { const b = new T.Mesh(new T.BoxGeometry(270, 600, 8), m); b.position.set(0, 290, s * 85); b.rotation.x = -s * 0.28; g.add(b); }
  return { mesh: g, r: 135, m: 0.25, fr: 3, rest: 0.2, yoff: 0 };
};

/* ---------- 점수와 핀 다시 세우기 ---------- */
const lanes = [];
let total = 0, strikes = 0, board = null, clackT = -1;
function topple(p) {
  // 맞은 방향에서 조금 빗나가며 넘어진다(둥근 핀이 정통으로만 맞지는 않으니까). 누운 핀은 길어서(반지름을 키움) 구르며 옆 핀을 더 잘 친다
  const sp = Math.hypot(p.vx, p.vz), a = Math.atan2(p.vz, p.vx) + (rnd() - 0.5) * 1.1;
  p.vx = Math.cos(a) * sp; p.vz = Math.sin(a) * sp;
  p.down = true; p.fallT = 0; p.ry = -a; p.fr = 1.0; p.r = 95;
  total++;
  const L = lanes[p.lane];
  if (L) {
    if (L.t0 == null) L.t0 = state.time;
    if (!L.struck && L.pins.every(q => q.down)) {
      L.struck = true; strikes++;
      if (state.playing) { toast(`스트라이크! ${p.lane + 1}번 레인 핀 10개를 한 번에 쓰러뜨렸어요`, 'good'); beep([523, 659, 784, 1047], 0.1); }
    }
  }
  if (state.time - clackT > 0.05) { clackT = state.time; thud(0.9); }
  board.dirty = true;
}
function standUp(q, rerack) {
  q.x = q.x0; q.z = q.z0; q.vx = q.vz = q.spin = 0; q.py = null; q.vy = 0;
  q.down = false; q.swept = false; q.fallT = 0; q.fr = 2.4; q.r = 55; q.dropT = rerack ? 0.35 : 0;
}
function bowlStep(dt) {
  for (const p of props) {
    if (p.kind === 'pin') {
      if (!p.down && Math.hypot(p.vx, p.vz) > 140) topple(p);
      if (p.down) p.fallT += dt;
      if (p.down && !p.swept && p.fallT >= 0.18) {     // 넘어지는 핀(길이 381)이 닿는 자리에 서 있던 핀을 쳐서 줄줄이 넘어간다
        p.swept = true;
        const dx = Math.cos(-p.ry), dz = Math.sin(-p.ry);
        for (const q of props) {
          if (q.kind !== 'pin' || q.down) continue;
          const rx = q.x - p.x, rz = q.z - p.z, t = clamp(rx * dx + rz * dz, 0, 360), ox = rx - dx * t, oz = rz - dz * t, d = Math.hypot(ox, oz);
          if (d < 110) { q.vx += dx * 380 + (d > 1 ? (ox / d) * 220 : 0); q.vz += dz * 380 + (d > 1 ? (oz / d) * 220 : 0); }
        }
      }
    } else if (p.kind === 'bowl') {                  // 핀 뒤에서 멈춘 공은 제자리로 돌려보낸다
      p.pitT = p.x > 8450 && Math.hypot(p.vx, p.vz) < 60 ? p.pitT + dt : 0;
      if (p.pitT > 2.5) { p.x = p.x0; p.z = p.z0; p.vx = p.vz = 0; p.py = null; p.pitT = 0; }
    }
  }
  lanes.forEach((L, k) => {
    if (L.t0 == null || state.time - L.t0 < 7) return;
    if (car.x > 7450 && Math.abs(car.z - ZC[k]) < 900) return;      // 차가 핀 자리에 있으면 비킬 때까지 기다린다
    const n = L.pins.filter(q => q.down).length;
    for (const q of L.pins) standUp(q, true);
    L.t0 = null; L.struck = false; board.dirty = true;
    if (state.playing) toast(`${k + 1}번 레인: ${n}개 쓰러뜨렸어요. 핀을 다시 세웠어요`);
  });
}
// 핀 위 장식판: 레인마다 이번에 쓰러진 핀 수(전부면 X)와 서 있는 핀
function drawBoard() {
  const c = board.ctx, w = 2048, h = 400, r = lcg(3), g = c.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#2b1a66'); g.addColorStop(0.5, '#6d1f7a'); g.addColorStop(1, '#c2364f');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { const s = 1 + r() * 3; c.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.5})`; c.fillRect(r() * w, r() * h, s, s); }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  ZC.forEach((zc, k) => {
    const cx = ((zc - Z0) / (Z1 - Z0)) * w, L = lanes[k];
    c.fillStyle = 'rgba(10,10,24,0.55)'; c.fillRect(cx - 290, 40, 580, 320);
    c.fillStyle = '#ffe45c'; c.font = '800 64px "IBM Plex Sans KR", "Malgun Gothic", sans-serif'; c.fillText(`${k + 1}번 레인`, cx - 120, 110);
    c.fillStyle = '#ffffff'; c.font = '800 130px "IBM Plex Sans KR", "Malgun Gothic", sans-serif'; c.fillText(L.struck ? 'X' : String(L.pins.filter(q => q.down).length), cx - 120, 245);
    for (const q of L.pins) { c.fillStyle = q.down ? 'rgba(255,255,255,0.14)' : '#ffffff'; c.beginPath(); c.arc(cx + 150 + ((q.z0 - zc) / GAP) * 56, 300 - q.row * 62, 21, 0, 7); c.fill(); }
  });
  board.tex.needsUpdate = true; board.dirty = false;
}

/* ---------- 가구 ---------- */
function ballRack(cx, cz, len, alongX) {      // 공 받침대: 위아래 두 줄
  const hx = alongX ? len / 2 : 210, hz = alongX ? 210 : len / 2, frame = mat('Rack', 0x2a2d33, 0.4, { metalness: 0.5 }), cols = [0x2f6fed, 0xd93a4a, 0x1fb26a, 0xffb347, 0x9d7bff, 0x1c1c20, 0xff4fa3];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(frame, [cx + sx * (hx - 30) - 18, cx + sx * (hx - 30) + 18], [0, 560], [cz + sz * (hz - 30) - 18, cz + sz * (hz - 30) + 18]);
  for (const y of [150, 450]) for (const s of [-1, 1]) {
    if (alongX) box(frame, [cx - hx, cx + hx], [y - 12, y + 12], [cz + s * 70 - 12, cz + s * 70 + 12], { cast: false });
    else box(frame, [cx + s * 70 - 12, cx + s * 70 + 12], [y - 12, y + 12], [cz - hz, cz + hz], { cast: false });
  }
  const n = Math.floor((len - 120) / 235);
  for (let i = 0; i < n; i++) for (const [y, k] of [[150, 0], [450, 3]]) {
    if ((i + k) % 5 === 4) continue;           // 빈 자리
    const t = (i - (n - 1) / 2) * 235, b = new T.Mesh(new T.SphereGeometry(105, 22, 16), std('bwBall' + cols[(i + k) % cols.length], { map: marbleTex(), color: cols[(i + k) % cols.length], roughness: 0.14, metalness: 0.1 }));
    b.position.set(cx + (alongX ? t : 0), y + 96, cz + (alongX ? 0 : t)); b.rotation.set(i * 1.3, k + i, 0.4 * i);
    b.castShadow = true; b.receiveShadow = true;
    statics.add(b);
  }
  addBox(cx - hx, cx + hx, cz - hz, cz + hz);
}
function bench(z0, z1, color) {
  const seat = mat('Seat' + color, color, 0.45), leg = mat('Rack', 0x2a2d33, 0.4, { metalness: 0.5 });
  box(seat, [80, 400], [370, 430], [z0, z1], { r: 22 });
  box(seat, [80, 135], [430, 830], [z0, z1], { r: 22 });
  for (const z of [z0 + 90, z1 - 90]) box(leg, [130, 350], [0, 370], [z - 20, z + 20], { cast: false });
  addBox(60, 410, z0, z1, { tall: false });
}

/* ---------- 짓기 ---------- */
function buildBowling() {
  const carpet = std('bwCarpetM', { map: carpetTex(), roughness: 0.95 }), maple = std('bwMapleM', { map: mapleTex(), roughness: 0.2 }), lane = std('bwLaneM', { map: laneTex(), roughness: 0.12 });
  const fl = (m, x0, x1, z0, z1, k) => plane(m, x1 - x0, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, k ? { uvScale: [(x1 - x0) / k, (z1 - z0) / k] } : {});
  fl(carpet, 0, 1500, 0, BD, 1500); fl(carpet, 1500, BACK, 0, Z0, 1500); fl(carpet, 1500, BACK, Z1, BD, 1500);     // 로비와 레인 옆 통로
  fl(maple, 1500, FOUL, Z0, Z1, 900);                                                                              // 레인 앞 나무 바닥
  for (const zc of ZC) { fl(lane, FOUL, DECK, zc - LANE_HW, zc + LANE_HW); fl(mat('Pit', 0x1a1b1f, 0.8), DECK, BACK, zc - LANE_HW, zc + LANE_HW); }
  {                                                                                                                // 거터: 물리와 같은 둥근 홈
    const xs = [], pos = [], idx = [], NZ = 10;
    for (let i = 0; i <= 8; i++) xs.push(FOUL + i * 37.5);
    xs.push(BACK);
    for (const zg of GUT) {
      const base = pos.length / 3;
      for (const x of xs) for (let j = 0; j <= NZ; j++) { const z = zg - 117.5 + (j / NZ) * 235; pos.push(x, bowlLevel(x, z), z); }
      for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < NZ; j++) { const a = base + i * (NZ + 1) + j, b = a + NZ + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new T.Mesh(geo, mat('Gutter', 0x30343a, 0.3, { metalness: 0.3 }));
    m.receiveShadow = true;
    statics.add(m);
  }
  // 벽 (낮게: 안이 잘 보이도록)과 위의 색 띠
  const wallM = mat('Wall', 0x1d5964, 0.85), H = 1000, neon = (name, color) => M('bwNeon' + name, () => new T.MeshBasicMaterial({ color, toneMapped: false }));
  box(wallM, [-120, 0], [0, H], [-120, BD + 120]); addBox(-120, 0, -120, BD + 120, { wall: true });
  box(wallM, [0, BW], [0, H], [-120, 0]); addBox(0, BW, -120, 0, { wall: true });
  box(wallM, [0, BW], [0, H], [BD, BD + 120]); addBox(0, BW, BD, BD + 120, { wall: true });
  box(neon('N', 0xff4fa3), [0, BW], [H, H + 26], [-75, -45], { cast: false });
  box(neon('S', 0x3de0e6), [0, BW], [H, H + 26], [BD + 45, BD + 75], { cast: false });
  box(neon('W', 0xffb347), [-75, -45], [H, H + 26], [0, BD], { cast: false });
  for (const z of [Z0, Z1]) box(neon('S', 0x3de0e6), [FOUL, 7750], [0, 7], [z - 7, z + 7], { cast: false });         // 레인 묶음 가장자리 불빛
  // 동쪽: 핀 뒤 어두운 벽, 핀 위 장식판, 레인 사이 칸막이
  box(mat('Back', 0x15171b, 0.9), [BACK, BW], [0, 1500], [-120, BD + 120]); addBox(BACK, BW + 120, -120, BD + 120, { wall: true });
  box(mat('Mask', 0x2a1a5e, 0.6), [8560, BACK], [560, 1500], [Z0, Z1]);
  for (const z of [Z0, ZC[0] + 770, ZC[1] + 770, Z1]) { box(mat('Kick', 0xf1efe9, 0.4), [7750, BACK], [0, 420], [z - 12, z + 12]); addBox(7750, BACK, z - 12, z + 12, { tall: false }); }
  {
    const cv = document.createElement('canvas');
    cv.width = 2048; cv.height = 400;
    const tex = new T.CanvasTexture(cv), m = new T.Mesh(new T.PlaneGeometry(Z1 - Z0, 902), new T.MeshBasicMaterial({ map: tex, toneMapped: false }));
    tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = maxAniso;
    m.position.set(8557, 1030, (Z0 + Z1) / 2); m.rotation.y = -Math.PI / 2;
    dyn.add(m);
    board = { ctx: cv.getContext('2d'), tex, mat: m.material, dirty: true };
  }
  // 로비: 공 받침대 둘(경로 안쪽 섬), 서쪽 벽 의자, 북쪽 벽 신발 진열장, 남서쪽 오락기, 남쪽 벽 공 받침대
  ballRack(1375, 2230, 1300, false); ballRack(1375, 3770, 1300, false); ballRack(1650, 5790, 1200, true);
  bench(1400, 2600, 0xff8a3d); bench(3400, 4600, 0x3dbfc6);
  box(mWalnut, [950, 2250], [0, 900], [40, 330]); box(mat('Counter', 0xf1efe9, 0.35), [930, 2270], [900, 940], [30, 360], { r: 8 });
  { const s = new T.Mesh(new T.PlaneGeometry(1260, 780), std('bwShoesM', { map: shoeTex(), roughness: 0.7 })); s.position.set(1600, 460, 331.5); statics.add(s); }
  addBox(930, 2270, 30, 360);
  box(mat('Arcade', 0x3a1d6e, 0.5), [90, 600], [0, 1650], [5400, 5900], { r: 30 });
  for (const [geo, m, y] of [[new T.PlaneGeometry(380, 290), M('bwArcadeM', () => new T.MeshBasicMaterial({ map: arcadeTex(), toneMapped: false })), 1130], [new T.PlaneGeometry(420, 110), neon('N', 0xff4fa3), 1500]]) {
    const o = new T.Mesh(geo, m);
    o.position.set(601.5, y, 5650); o.rotation.y = Math.PI / 2;
    statics.add(o);
  }
  addBox(80, 610, 5390, 5910);
  const pl = new T.PointLight(0xff5fb8, 0.45, 1900, 0);
  pl.position.set(900, 1100, 5650);
  dyn.add(pl);
  glow(1000, 5650, 1100, 900, 0xff5fb8, 0.16);

  // 핀 30개, 볼링공 3개, 로비의 여분 핀과 미끄럼 주의 표지
  lanes.length = 0;
  ZC.forEach((zc, k) => {
    const L = { pins: [], t0: null, struck: false };
    for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) { const p = addProp('pin', HEAD + row * ROW, zc + (i - row / 2) * GAP, { ry: 0 }); p.lane = k; p.row = row; L.pins.push(p); }
    lanes.push(L);
    addProp('bowl', 2400, zc - 330, { ry: k * 2.1, color: [0x2f6fed, 0xd93a4a, 0x1fb26a][k] });
  });
  addProp('pin', 1330, 1200, { ry: 0 }); addProp('pin', 1420, 1300, { ry: 0 });
  addProp('wetsign', 1375, 4780, { ry: 0.5 });
  total = 0; strikes = 0; clackT = -1;
}

MAPS.push({
  id: 'bowling', name: '볼링장', tag: '차가 볼링공',
  title: '볼링장',
  lede: '내 차가 볼링공이에요. 레인을 달려 핀 10개를 한 번에 쓰러뜨리면 스트라이크! 핀은 조금 있다가 다시 서요. 놓여 있는 볼링공을 밀어서 굴려도 돼요.',
  collect: ['기록 주행 (로비 한 바퀴)', '레인 앞 로비를 왼쪽으로 도는 약 11m 코스예요. 기록 주행에서는 핀을 치면 부딪힌 것으로 세요.'],
  free: ['자유 주행', '레인 세 개에서 스트라이크에 도전해요. 최고 속도로, 맨 앞 핀의 한가운데보다 살짝 옆을 노리면 잘 쓰러져요. 레인 옆 홈(거터)으로 빠지면 핀을 못 맞혀요.'],
  toast: { collect: 'R(B 버튼)로 녹화를 켜고 로비를 한 바퀴! 핀은 건드리지 않기', free: '자유 주행: 오른쪽이 레인이에요. 달려가서 핀을 쓰러뜨려 보세요' },
  bounds: { x0: -200, z0: -200, x1: BW + 100, z1: BD + 200 },
  floors: [[0, 0, BW, BD]],
  labels: [['로비', 300, 3100], ['1번', 4800, 1500], ['2번', 4800, 3040], ['3번', 4800, 4580]],
  route: { cp: 8, tapeHalf: 220, wp: [[2000, 3000], [2000, 2000], [2000, 1250], [1850, 850], [1450, 700], [1200, 700], [900, 850], [750, 1250], [750, 2200], [750, 3000], [750, 3800], [750, 4750], [900, 5150], [1200, 5300], [1450, 5300], [1850, 5150], [2000, 4750], [2000, 3900]] },
  baseLevel: bowlLevel,
  env: { bg: 0x15171d, hemi: [0xfff1dc, 0x4a3a30, 0.85], sun: { dir: [0.22, -0.93, 0.28], color: 0xfff0d8, int: 2.3 }, fill: { color: 0xcfe0ff, int: 0.35, dir: [-0.3, 0.6, 0.5] }, exposure: 1.0, envInt: 0.55, shadowRadius: 3 },
  mini(c, mx, mz, s) {
    for (const zc of ZC) {
      c.fillStyle = 'rgba(232,201,143,0.5)'; c.fillRect(mx(FOUL), mz(zc - LANE_HW), (DECK - FOUL) * s, LANE_HW * 2 * s);
      c.fillStyle = 'rgba(0,0,0,0.4)'; for (const d of [-652.5, 652.5]) c.fillRect(mx(FOUL), mz(zc + d - 117.5), (BACK - FOUL) * s, 235 * s);
    }
  },
  build: buildBowling,
  hooks: {
    step: bowlStep,
    sync(dt) {
      for (const p of props) {
        if (p.kind !== 'pin') continue;
        const th = p.down ? (Math.PI / 2) * Math.min(1, (p.fallT / 0.3) ** 2) : 0;
        if (p.dropT > 0) p.dropT = Math.max(0, p.dropT - dt);
        p.inner.rotation.z = -th;                                                    // 바깥 그룹의 +x(맞은 방향)로 눕는다
        p.inner.position.y = 58 * Math.sin(th) + 260 * (p.dropT / 0.35) ** 2;        // 다시 세울 때는 위에서 내려옴
      }
      if (board.dirty) drawBoard();
    },
    hud: () => ['볼링', `핀 ${total}개 · 스트라이크 ${strikes}번`],
    reset() { total = 0; strikes = 0; for (const L of lanes) { L.t0 = null; L.struck = false; } board.dirty = true; },
    unload() { board.tex.dispose(); board.mat.dispose(); },
  },
});
}
