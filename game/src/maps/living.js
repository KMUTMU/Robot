/* ================= 맵: 수집한 거실 (11-21 데이터 수집 공간 재현) ================= */
// 수집 사진(160×120 광각) 8,285장과 조향 기록으로 추정한 배치예요. 치수는 눈대중이라 실제와 다를 수 있어요.
// 좌표: x 동쪽, z 남쪽. 북쪽 벽(z=0)에 TV장, 서쪽 벽(x=0)에 낮은 갈색 장, 코스 안쪽에 낮은 탁자와 좌식 의자.
// 코스는 오른쪽으로만 도는 둥근 네모(약 12m). 차 속도·회전은 그날 기록에 맞춤 (phys 참고).
{
const RW = 6400, RD = 7400, CH = 2400;
const mat = (name, color, rough = 0.7, o = {}) => std('lv' + name, { color, roughness: rough, ...o });
// 그룹 안에 메시 하나 넣기 (그룹 좌표 기준, +x가 앞)
function part(g, geo, m, x, y, z, rot) {
  const o = new T.Mesh(geo, m);
  o.position.set(x, y, z);
  if (rot) o.rotation.set(rot[0], rot[1], rot[2]);
  o.castShadow = true; o.receiveShadow = true;
  g.add(o);
  return o;
}
function group(x, z, ang) {
  const g = new T.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ang;
  statics.add(g);
  return g;
}
const rbox = (w, h, d, r) => new X.RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 1, h / 2 - 1, d / 2 - 1));

function panelWall(x0, x1, z0, z1) {
  const tex = TX('lvPanel', () => ctex(256, 512, (c, w, h) => {
    c.fillStyle = '#d6bf9d'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { c.strokeStyle = `rgba(120,90,55,${0.04 + rnd() * 0.08})`; c.lineWidth = 1 + rnd() * 2; const x = rnd() * w; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + (rnd() - 0.5) * 14, h); c.stroke(); }
    c.fillStyle = 'rgba(88,62,36,0.55)'; c.fillRect(0, 0, 3, h);
  }, [1, 1]));
  const m = box(std('lvPanelM', { map: tex, roughness: 0.62 }), [x0, x1], [0, CH], [z0, z1]);
  const uv = m.geometry.attributes.uv, n = Math.max(x1 - x0, z1 - z0) / 620;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * n);
  addBox(x0, x1, z0, z1, { wall: true });
}
function slot(x, z0, z1) {   // 벽의 가로로 긴 어두운 홈 (사진에 보이는 것)
  box(mDark, x < 100 ? [0, 5] : [RW - 5, RW], [1235, 1290], [z0, z1], { cast: false });
}
function tallPlant(x, z) {
  cyl(mPot, x, 0, z, 150, 400, { rt: 185 });
  cyl(mat('Soil', 0x3a2d22, 0.95), x, 396, z, 172, 8, { cast: false });
  const stem = mat('Stem', 0x5c7a3e, 0.7);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + rnd() * 0.5, lean = 0.18 + rnd() * 0.42, len = 760 + rnd() * 520;
    const g = new T.Group();
    g.position.set(x + Math.cos(a) * 40, 400, z + Math.sin(a) * 40);
    g.rotation.set(0, -a, 0);
    statics.add(g);
    const st = part(g, new T.CylinderGeometry(5, 9, len, 6), stem, Math.sin(lean) * len / 2, Math.cos(lean) * len / 2, 0, [0, 0, -lean]);
    st.castShadow = false;
    for (let k = 0; k < 7; k++) {
      const u = 0.45 + k * 0.085, side = k % 2 ? 1 : -1;
      const leaf = part(g, new T.SphereGeometry(1, 8, 6), mLeaf, Math.sin(lean) * len * u, Math.cos(lean) * len * u, side * 70, [side * 0.5, side * 0.35, -lean - 0.5]);
      leaf.scale.set(150, 5, 36);
    }
  }
  addCircle(x, z, 190);
}
// 좌식 의자 (남색). ang: 앉는 사람이 보는 방향
function floorChair(x, z, ang, withPerson) {
  const g = group(x, z, ang), navy = mat('Navy', 0x1d2c52, 0.92);
  part(g, rbox(520, 90, 500, 36), navy, 20, 45, 0);
  part(g, rbox(100, 640, 500, 40), navy, -235, 340, 0, [0, 0, 0.3]);
  if (withPerson) {
    const tee = mat('Tee', 0xf2f1ec, 0.85), skin = mat('Skin', 0xe0b18c, 0.75), shorts = mat('Shorts', 0x2b2f38, 0.9), hair = mat('Hair', 0x15120f, 0.8);
    part(g, rbox(300, 150, 300, 60), shorts, -40, 165, 0);
    part(g, new T.CapsuleGeometry(118, 260, 6, 16), tee, -95, 430, 0, [0, 0, -0.16]);
    part(g, new T.SphereGeometry(96, 20, 16), skin, -60, 720, 0);
    part(g, new T.SphereGeometry(102, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, -70, 730, 0, [0, 0, 0.35]);
    for (const s of [-1, 1]) {
      part(g, new T.CapsuleGeometry(58, 330, 4, 12), shorts, 150, 175, s * 95, [0, 0, Math.PI / 2 - 0.12]);
      part(g, new T.CapsuleGeometry(48, 360, 4, 12), skin, 500, 120, s * 100, [0, 0, Math.PI / 2 + 0.18]);
      part(g, rbox(170, 70, 90, 30), skin, 720, 60, s * 100);
      part(g, new T.CapsuleGeometry(44, 150, 4, 10), tee, -40, 520, s * 150, [0, 0, -0.5]);
      part(g, new T.CapsuleGeometry(36, 300, 4, 10), skin, 150, 440, s * 135, [0, 0, -1.25]);
    }
  }
  const c = Math.cos(ang), s = Math.sin(ang);
  addCircle(x + c * 10, z - s * 10, withPerson ? 320 : 290);
  ao(x, z, 760, 760, 0.4);
}
function spinBike(x, z, ang, dark) {
  const g = group(x, z, ang), K = mat('BikeK', 0x17181b, 0.45, { metalness: 0.3 }), W = mat('BikeW', dark ? 0x2a2c30 : 0xe9e9e6, 0.4), S = mat('BikeS', 0x9da2a8, 0.3, { metalness: 0.8 });
  for (const xx of [-480, 480]) part(g, rbox(90, 60, 520, 20), K, xx, 30, 0);
  part(g, rbox(1000, 70, 80, 20), K, 0, 80, 0);
  part(g, new T.CylinderGeometry(235, 235, 46, 40), K, 300, 290, 0, [Math.PI / 2, 0, 0]);
  part(g, new T.CylinderGeometry(150, 150, 50, 32), S, 300, 290, 0, [Math.PI / 2, 0, 0]);
  part(g, rbox(70, 700, 70, 16), K, -180, 420, 0, [0, 0, 0.3]);          // 안장 기둥
  part(g, rbox(260, 60, 180, 28), K, -290, 790, 0);                        // 안장
  part(g, rbox(70, 820, 70, 16), K, 250, 620, 0, [0, 0, -0.28]);          // 핸들 기둥
  part(g, rbox(80, 50, 480, 22), K, 380, 1040, 0);                         // 핸들
  part(g, rbox(40, 190, 250, 14), W, 400, 1150, 0, [0, 0, -0.35]);        // 화면
  part(g, rbox(560, 60, 60, 16), K, 30, 330, 0, [0, 0, -0.75]);
  part(g, new T.CylinderGeometry(70, 70, 40, 20), S, -20, 300, 0, [Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) part(g, rbox(120, 26, 70, 10), K, -20 + s * 130, 300 - s * 90, s * 130);
  const c = Math.cos(ang), s = Math.sin(ang);
  addBox(x - 560, x + 560, z - 270, z + 270, { ang });
  ao(x, z, 1350, 760, 0.45);
  return [c, s];
}
function standFan(x, z, ang) {
  const g = group(x, z, ang), F = mat('Fan', 0xf2f2ef, 0.4);
  part(g, new T.CylinderGeometry(175, 185, 30, 32), F, 0, 15, 0);
  part(g, new T.CylinderGeometry(15, 15, 950, 10), F, 0, 500, 0);
  part(g, new T.CylinderGeometry(75, 85, 150, 20), F, -20, 1040, 0, [0, 0, Math.PI / 2]);
  part(g, new T.TorusGeometry(195, 9, 8, 40), F, 80, 1040, 0, [0, Math.PI / 2, 0]);
  part(g, new T.TorusGeometry(195, 6, 6, 40), F, 30, 1040, 0, [0, Math.PI / 2, 0]);
  for (let i = 0; i < 3; i++) part(g, new T.BoxGeometry(6, 150, 62), mat('FanBlade', 0xc9d6e2, 0.3, { transparent: true, opacity: 0.8 }), 68, 1040 + Math.cos((i * 2 * Math.PI) / 3) * 88, Math.sin((i * 2 * Math.PI) / 3) * 88, [(i * 2 * Math.PI) / 3, 0, 0]);
  addCircle(x, z, 180);
}
function cableOnFloor(pts) {
  const curve = new T.CatmullRomCurve3(pts.map(([x, z]) => V(x, 4, z))), ps = curve.getPoints(60);
  const m = new T.Mesh(new T.TubeGeometry(curve, 90, 4, 6), mat('Cable', 0xf0f0ee, 0.5));
  m.castShadow = false;
  statics.add(m);
  for (let i = 0; i < ps.length - 1; i += 5) { const p = ps[i], q = ps[Math.min(ps.length - 1, i + 5)]; features.adds.push({ type: 'cable', ax: p.x, az: p.z, bx: q.x, bz: q.z, r: 4 }); }
}
PROPS.shoe = o => {
  const g = new T.Group(), m = std('lvShoe' + o.color, { color: o.color, roughness: 0.75 }), L = o.len || 270;
  const sole = new T.Mesh(rbox(L, 34, 100, 16), std('lvSole', { color: 0xf4f4f1, roughness: 0.7 }));
  sole.position.y = 17;
  const upper = new T.Mesh(rbox(L * 0.9, 62, 92, 30), m);
  upper.position.set(-L * 0.03, 58, 0);
  const toe = new T.Mesh(rbox(L * 0.4, 44, 92, 22), m);
  toe.position.set(L * 0.27, 44, 0);
  g.add(sole, upper, toe);
  return { mesh: g, r: 92, m: 0.22, fr: 7, rest: 0.1, yoff: 0 };
};
PROPS.toy = () => {
  const g = new T.Group(), Y = std('lvToyY', { color: 0xc8d832, roughness: 0.45 }), K = std('lvToyK', { color: 0x1c1c1e, roughness: 0.8 });
  const body = new T.Mesh(rbox(150, 46, 76, 12), Y); body.position.y = 46;
  const cab = new T.Mesh(rbox(64, 40, 70, 12), Y); cab.position.set(18, 86, 0);
  const bed = new T.Mesh(rbox(62, 30, 70, 6), K); bed.position.set(-44, 80, 0);
  g.add(body, cab, bed);
  for (const [x, z] of [[-48, -40], [-48, 40], [48, -40], [48, 40]]) { const w = new T.Mesh(new T.CylinderGeometry(24, 24, 20, 16), K); w.rotation.x = Math.PI / 2; w.position.set(x, 24, z); g.add(w); }
  return { mesh: g, r: 78, m: 0.12, fr: 2.2, rest: 0.3, yoff: 0 };
};

function buildLiving() {
  /* 바닥, 벽, 천장 */
  const fg = new T.ShapeGeometry(new T.Shape([[0, 0], [RW, 0], [RW, -RD], [0, -RD]].map(([a, b]) => new T.Vector2(a, b))));
  fg.rotateX(-Math.PI / 2);
  const floor = new T.Mesh(fg, std('lvFloor', { map: woodTex, roughness: 0.28 }));
  floor.receiveShadow = true;
  statics.add(floor);
  panelWall(-150, 0, -150, RD + 150);
  panelWall(RW, RW + 150, -150, RD + 150);
  panelWall(0, RW, -150, 0);
  panelWall(0, RW, RD, RD + 150);
  for (const [x0, x1, z0, z1] of [[0, RW, 0, 12], [0, RW, RD - 12, RD], [0, 12, 0, RD], [RW - 12, RW, 0, RD]]) box(mat('Base', 0x6f5238, 0.6), [x0, x1], [0, 80], [z0, z1], { cast: false });
  aoStrip(0, RW, 0, 170, 'n'); aoStrip(0, RW, RD - 170, RD, 's'); aoStrip(0, 170, 0, RD, 'w'); aoStrip(RW - 170, RW, 0, RD, 'e');
  for (const [z0, z1] of [[1650, 2450], [2750, 3550], [4950, 5750], [5950, 6750]]) slot(0, z0, z1);
  for (const [z0, z1] of [[850, 1650], [1850, 2650], [5700, 6500]]) slot(RW, z0, z1);
  {
    const ceil = new T.Mesh(new T.PlaneGeometry(RW + 300, RD + 300), M('lvCeil', () => new T.MeshBasicMaterial({ color: 0x4f3b29 })));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(RW / 2, CH, RD / 2);
    statics.add(ceil);
    const on = M('lvLampOn', () => new T.MeshBasicMaterial({ color: 0xfff1d8, toneMapped: false })), off = M('lvLampOff', () => new T.MeshBasicMaterial({ color: 0x33291f }));
    const lamp = (x, z, lit) => { const d = new T.Mesh(new T.CircleGeometry(95, 28), lit ? on : off); d.rotation.x = Math.PI / 2; d.position.set(x, CH - 2, z); statics.add(d); };
    // 남쪽 절반만 불이 켜져 있음 (수집 사진: TV 쪽은 어둡고 자전거 쪽은 밝음)
    for (const [x, z] of [[1700, 5500], [3300, 5300], [4900, 5500], [3200, 4050], [1700, 6750], [4900, 6750]]) {
      lamp(x, z, true);
      glow(x, z, 520, 1300, 0xbcd0ff, 0.2);
      glow(x, z, 900, 900, 0xfff0d8, 0.1);
    }
    for (const [x, z] of [[1700, 1500], [3300, 1500], [4900, 1500], [1700, 2900], [4900, 2900]]) lamp(x, z, false);
    const bar = new T.Mesh(new T.PlaneGeometry(1300, 130), on);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(3300, CH - 2, 6200);
    statics.add(bar);
    for (const [x, z, k] of [[1800, 5600, 1.05], [4700, 5600, 1.05], [3250, 4300, 0.6], [3300, 6700, 0.8]]) {
      const pl = new T.PointLight(0xffe6c6, k, 4700, 0);
      pl.position.set(x, 2150, z);
      dyn.add(pl);
    }
  }

  /* 북쪽: 흰 기둥, 화분, TV장과 TV */
  box(mWhite, [260, 640], [0, CH], [0, 190]);
  addBox(260, 640, 0, 190, { wall: true });
  tallPlant(900, 470);
  {
    const x0 = 1260, x1 = 3460;
    box(mWhite, [x0, x1], [140, 470], [40, 450], { r: 8 });
    box(mWhite, [x0 - 12, x1 + 12], [470, 494], [30, 462], { r: 6 });
    for (const x of [x0 + 733, x0 + 1467]) box(mDark, [x - 2, x + 2], [160, 450], [449, 452], { cast: false });
    for (const x of [x0 + 60, x0 + 1100, x1 - 60]) for (const z of [90, 400]) cyl(mOak, x, 0, z, 14, 140, { rt: 22, seg: 10 });
    addBox(x0, x1, 40, 450);
    ao((x0 + x1) / 2, 250, 2500, 700, 0.5);
    box(mGloss, [1390, 2850], [540, 1370], [80, 128], { r: 8 });
    box(mBlack, [1880, 2360], [494, 540], [70, 150], { r: 6 });
    const led = new T.Mesh(new T.SphereGeometry(9, 10, 8), M('lvLed', () => new T.MeshBasicMaterial({ color: 0x6fb2ff, toneMapped: false })));
    led.position.set(1425, 560, 131);
    statics.add(led);
    glow(1500, 620, 260, 420, 0x5f9cff, 0.16);
    box(mat('SetTop', 0x1d1f22, 0.4), [2960, 3260], [494, 540], [120, 380], { r: 6 });
  }

  /* 서쪽: 낮은 갈색 장. 동쪽: 같은 장 */
  for (const [x0, x1, z0, z1, dir] of [[30, 480, 1500, 3900, 1], [RW - 480, RW - 30, 700, 2700, -1]]) {
    box(mWalnut, [x0, x1], [40, 640], [z0, z1], { r: 6 });
    box(mat('CabTop', 0x4a3323, 0.45), [x0 - 8, x1 + 8], [640, 664], [z0 - 8, z1 + 8], { r: 5 });
    box(mat('CabKick', 0x241a13, 0.7), [x0 + 20, x1 - 20], [0, 40], [z0 + 20, z1 - 20], { cast: false });
    const fx = dir > 0 ? x1 : x0;
    for (let z = z0 + 600; z < z1 - 100; z += 600) box(mDark, [fx - 2, fx + 2], [60, 620], [z - 2, z + 2], { cast: false });
    addBox(x0, x1, z0, z1);
    ao((x0 + x1) / 2, (z0 + z1) / 2, 760, z1 - z0 + 300, 0.45);
  }

  /* 코스 안쪽: 낮은 탁자, 노트북·모니터, 좌식 의자 4개 (서쪽 의자에 사람) */
  {
    const tw = mat('Table', 0x4b3222, 0.5);
    box(tw, [2200, 3700], [318, 362], [2400, 3150], { r: 8 });
    for (const [x, z] of [[2270, 2470], [3630, 2470], [2270, 3080], [3630, 3080]]) box(tw, [x - 35, x + 35], [0, 318], [z - 35, z + 35]);
    box(tw, [2300, 3600], [120, 140], [2480, 3070], { cast: false });
    addBox(2200, 3700, 2400, 3150);
    ao(2950, 2775, 1800, 1050, 0.5);
    const scr = M('lvScreen', () => new T.MeshBasicMaterial({ color: 0xa9c8ff, toneMapped: false })), alu = mat('Alu', 0xb9bdc3, 0.35, { metalness: 0.7 });
    box(alu, [2360, 2620], [362, 376], [2650, 2890], { r: 4 });                       // 노트북
    const lap = new T.Group();                                                        // 화면은 서쪽(사람 쪽)을 봄
    lap.position.set(2626, 374, 2770); lap.rotation.z = -0.22;
    statics.add(lap);
    part(lap, rbox(12, 220, 240, 3), alu, 0, 110, 0);
    part(lap, new T.PlaneGeometry(220, 190), scr, -7, 112, 0, [0, -Math.PI / 2, 0]).castShadow = false;
    box(mBlack, [3060, 3120], [362, 372], [2500, 2700], { r: 3 });                    // 모니터
    cyl(mBlack, 3090, 372, 2600, 14, 130, { seg: 8 });
    box(mBlack, [3080, 3100], [470, 800], [2330, 2870], { r: 4 });
    const ms = new T.Mesh(new T.PlaneGeometry(510, 300), scr);
    ms.position.set(3078, 635, 2600); ms.rotation.y = -Math.PI / 2;
    statics.add(ms);
    glow(2550, 2770, 900, 700, 0x7fa8ff, 0.08, 364);
    cyl(mat('Mug', 0xe8e4dc, 0.4), 2850, 362, 2980, 42, 95);
    box(mat('Phone', 0x101113, 0.2), [2420, 2500], [362, 371], [3000, 3160 - 20], { r: 4, ry: 0.3 });
  }
  floorChair(1840, 2780, 0, true);
  floorChair(4040, 2520, Math.PI, false);
  floorChair(4040, 3080, Math.PI - 0.25, false);
  floorChair(2950, 3560, Math.PI / 2, false);

  /* 남서쪽: 실내 자전거 2대, 매트, 옷걸이 */
  floorPlate(mat('GymMat', 0xdddcd6, 0.9), 480, 1900, 4830, 5530, 6, 22);
  spinBike(1180, 5180, 0.22, false);
  spinBike(1800, 6380, -0.35, true);
  {
    const K = mat('RackK', 0x1b1c1f, 0.5), C = mat('Coat', 0x24272c, 0.95);
    cyl(K, 2620, 0, 6550, 230, 30);
    cyl(K, 2620, 30, 6550, 18, 1720, { seg: 10 });
    for (const a of [0, 1.6, 3.2, 4.7]) box(K, [2620 - 110, 2620 + 110], [1640, 1660], [6550 - 8, 6550 + 8], { ry: a });
    box(C, [2470, 2770], [700, 1640], [6610, 6760], { r: 60 });
    box(mat('Coat2', 0x2f3a4d, 0.95), [2530, 2720], [820, 1620], [6400, 6520], { r: 55 });
    addCircle(2620, 6560, 250);
    ao(2620, 6560, 700, 700, 0.4);
  }

  /* 남쪽 벽: 원목 문짝, 불 켜진 문 */
  {
    const oak = mat('Oak', 0xd2a868, 0.5);
    for (let x = 500; x < 4000; x += 700) {
      box(oak, [x + 8, x + 692], [0, 2250], [RD - 30, RD], { r: 4, cast: false });
      box(mSteel, [x + 620, x + 640], [950, 1150], [RD - 46, RD - 30], { cast: false });
    }
    const glowDoor = new T.Mesh(new T.PlaneGeometry(950, 2100), M('lvDoorGlow', () => new T.MeshBasicMaterial({ color: 0xffdca8, toneMapped: false })));
    glowDoor.position.set(4750, 1050, RD - 6); glowDoor.rotation.y = Math.PI;
    statics.add(glowDoor);
    box(oak, [4200, 4270], [0, 2170], [RD - 40, RD], { cast: false });
    box(oak, [5230, 5300], [0, 2170], [RD - 40, RD], { cast: false });
    box(oak, [4200, 5300], [2100, 2170], [RD - 40, RD], { cast: false });
    glow(4750, RD - 700, 1300, 1500, 0xffd9a0, 0.16);
  }

  /* 남동쪽: 침대, 선풍기, 바닥 전선 */
  {
    box(mat('BedFrame', 0x2a2420, 0.6), [5180, 6360], [0, 300], [3300, 5450], { r: 10 });
    box(mat('Mattress', 0xe9e5dd, 0.9), [5210, 6340], [300, 470], [3330, 5420], { r: 40 });
    const duvet = mat('Duvet', 0x5a6c84, 0.95);
    box(duvet, [5190, 6350], [430, 560], [3900, 5440], { r: 60 });
    for (const [x, z, sx, sy, sz] of [[5500, 4300, 330, 90, 420], [6000, 4800, 300, 110, 380], [5650, 5150, 380, 80, 300], [6100, 4150, 240, 70, 300]]) {
      const b = new T.Mesh(new T.SphereGeometry(1, 16, 12), duvet);
      b.scale.set(sx, sy, sz); b.position.set(x, 540, z); b.castShadow = true; b.receiveShadow = true;
      statics.add(b);
    }
    box(mat('Pillow', 0xf3f1ec, 0.95), [5330, 6220], [470, 600], [3400, 3780], { r: 60 });
    addBox(5180, 6360, 3300, 5450);
    ao(5770, 4375, 1500, 2450, 0.5);
  }
  standFan(4980, 4620, 2.5);
  cableOnFloor([[4990, 4790], [4860, 5300], [4500, 6100], [4380, 6900], [4420, 7380]]);

  /* 바닥에 놓인 것: 운동화, 슬리퍼, 장난감 (밀림) */
  addProp('shoe', 760, 4300, { color: 0xf1f1ee, ry: 0.5 });
  addProp('shoe', 880, 4600, { color: 0x8fd0e8, len: 230, ry: -0.3 });
  addProp('shoe', 1080, 4740, { color: 0x8fd0e8, len: 230, ry: 0.2 });
  addProp('shoe', 1660, 4940, { color: 0xd8363a, ry: 0.9 });
  addProp('shoe', 1830, 5090, { color: 0xd8363a, ry: 0.6 });
  addProp('toy', 3720, 580, { ry: 0.4 });
}

MAPS.push({
  id: 'living', name: '수집한 거실', tag: '실제로 데이터를 모은 곳',
  title: '수집한 거실',
  lede: '11월 21일에 실제로 데이터를 모은 그 거실이에요. 수집 사진 8,285장에 보이는 가구를 눈대중으로 놓았고, 차의 속도와 회전은 그날 기록(한 바퀴 약 15초, 끝까지 꺾으면 1초에 약 46° 회전)에 맞췄어요.',
  collect: ['기록 주행 (그날 그 코스)', 'TV장 앞 → 남색 의자 옆 → 침대와 선풍기 앞 → 자전거 옆으로, 오른쪽으로만 도는 약 12m 코스예요. 코너는 실제처럼 끝까지 꺾어야 돌아요.'],
  free: ['자유 주행', '불 꺼진 TV 쪽과 밝은 남쪽 바닥, 자전거와 침대 주변을 돌아다녀요. 바닥의 운동화와 장난감은 밀려요.'],
  toast: { collect: 'R(B 버튼)로 녹화를 켜고 오른쪽으로 한 바퀴! 실제 기록은 한 바퀴에 약 15초였어요', free: '자유 주행: 그날의 거실이에요. 회전 반경이 실제 차처럼 커요' },
  bounds: { x0: -250, z0: -250, x1: RW + 250, z1: RD + 250 },
  floors: [[0, 0, RW, RD]],
  labels: [['TV', 2150, 330], ['탁자', 2750, 2850], ['침대', 5480, 4500], ['자전거', 760, 5980], ['장', 80, 2800]],
  // 조향 기록을 적분해 얻은 둥근 네모를 0.8 m/s 기준으로 옮긴 것
  route: { cp: 8, tapeHalf: 260, wp: [[1100, 2010], [1180, 1560], [1420, 1240], [1800, 1060], [2300, 1010], [2900, 1020], [3500, 1060], [3950, 1160], [4350, 1420], [4620, 1810], [4740, 2310], [4760, 2860], [4700, 3360], [4500, 3840], [4150, 4160], [3700, 4380], [3150, 4510], [2600, 4480], [2100, 4340], [1650, 4090], [1320, 3710], [1150, 3210], [1100, 2610]] },
  // 측정: 스로틀 1.0 + 최대 조향에서 초당 0.80 rad 회전. 추정: 속도 0.8 m/s → 최소 회전 반지름 1.0 m
  phys: { vmax: 800, vrev: 600, dmax: Math.atan(190 / 1000) },
  maxThr: 1,
  lensTint: true,
  env: { bg: 0x120e0a, hemi: [0xffe6c8, 0x3a2e24, 0.2], sun: { dir: [0.05, -1, -0.22], color: 0xffe0bd, int: 0.26 }, fill: { color: 0xbfd0ff, int: 0.04, dir: [0, 0.6, 0.8] }, exposure: 1.05, envInt: 0.1, shadowRadius: 5 },
  build: buildLiving,
  hooks: { hud: () => ['실제 기록', '한 바퀴 약 15초'] },
});
}
