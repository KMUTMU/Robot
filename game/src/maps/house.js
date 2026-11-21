/* ================= 맵: 우리 집 (처음 만든 맵) ================= */
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


MAPS.push({
  id: 'house', name: '우리 집', tag: '좁은 집, 청소기와 고양이',
  title: '우리 집 주행 연습장',
  lede: '내 RC카를 좁은 집 안에서 직접 몰아 보세요. 녹화를 켜고 바닥 테이프 경로를 따라 돌면, DonkeyCar처럼 1초에 20장씩 학습 데이터가 쌓여요.',
  collect: ['기록 주행 (데이터 수집)', '폭 45cm 테이프 경로(약 15m)를 체크포인트 12개 순서대로 한 바퀴. 가구 사이가 좁아요. 부딪히면 그 기록은 나쁜 데이터예요.'],
  free: ['자유 주행', '베란다 경사로, 문턱, 전선, 쿠션, 책 다리, 복도 짐더미, 로봇청소기, 고양이까지 마음대로 탐험해요.'],
  toast: { collect: 'R(B 버튼)로 녹화를 켜고 파란 테이프를 따라 1번 체크포인트로!', free: '자유 주행: 집 안 어디든 가 보세요' },
  bounds: { x0: -250, z0: -1550, x1: 7450, z1: 5050 },
  floors: [[0, -1300, 3800, -150], [0, 0, 7200, 4800], [6400, 3720, 7200, 4800, 'low']],
  labels: [['거실', 1650, 2500], ['주방', 4500, 330], ['식탁', 4700, 3150], ['복도', 4700, 4500], ['베란다', 1000, -760], ['현관', 6560, 4420]],
  route: { cp: 12, tapeHalf: 225, wp: [[1700, 450], [2400, 450], [3000, 450], [3550, 570], [4150, 860], [5200, 950], [6050, 1120], [6350, 1700], [6350, 2500], [6150, 3020], [5650, 3230], [5150, 3330], [4950, 3680], [4650, 4130], [4000, 4200], [3000, 4170], [2100, 4140], [1550, 3950], [1300, 3550], [1150, 3000], [1000, 2100], [1020, 1300], [1200, 750], [1400, 520]] },
  baseLevel(x, z) {
    if (z < -150 && z > -1300 && x > 0 && x < 3800) return -100;   // 베란다
    if (x > 6400 && x < 7200 && z > 3720 && z < 4800) return -120;  // 현관
    return 0;
  },
  build() {
    buildHouse();
    addProp('ball', 1950, 3380);
    addProp('ball', 4250, 3330);
    [0xef4f4f, 0x4f8fef, 0xffd23f, 0x3ccf7a, 0xb56fe8, 0xff9f43, 0x4f8fef, 0xef4f4f].forEach((c, i) => addProp('block', 1500 + (i % 4) * 66 + (i > 3 ? 30 : 0), 3390 + Math.floor(i / 4) * 70, { color: c }));
    [0xef4f4f, 0xffd23f, 0x3ccf7a].forEach((c, i) => addProp('block', 3920 + i * 70, 4480 + (i % 2) * 40, { color: c }));
    addProp('bottle', 6480, 1380);
    addProp('bottle', 6545, 1450);
    addProp('bottle', 6610, 1385);
    addProp('box', 5950, 4300);
    addProp('box', 1350, -900);
    makeVac(4300, 2950, 0.6);
    makeCat(2350, 3250, 2.6);
  },
  hooks: {
    frame() {
      if (car.y < -90 && baseLevel(car.x, car.z) === -120 && !state.pitWarn) { state.pitWarn = true; toast('현관에 빠졌어요. F (십자키 ↑)로 되돌려요', 'warn'); }
      if (baseLevel(car.x, car.z) === 0) state.pitWarn = false;
    },
  },
});
