/* ================= 맵: 거인의 책상 ================= */
// 차는 그대로인데 책상 위 물건이 전부 6배. 책상(9 × 5 m)에는 난간이 없어서 가장자리를 넘으면 떨어진다.
// 좌표: x 오른쪽, z 앞(사람 쪽). 뒤(z=0)는 벽, 나머지 세 변은 낭떠러지.
{
const DW = 9000, DD = 5000, FLOOR = -4400;
const mat = (name, color, rough = 0.7, o = {}) => std('dk' + name, { color, roughness: rough, ...o });

function stickyNote(x, z, ang, color, lines) {
  const tex = textTex('dkNote' + lines.join(''), 256, 256, color, (c, w) => {
    c.fillStyle = 'rgba(0,0,0,0.06)'; c.fillRect(0, 0, w, 26);
    c.fillStyle = '#2b2a33'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 40px "IBM Plex Sans KR", "Malgun Gothic", sans-serif';
    lines.forEach((t, i) => c.fillText(t, w / 2, 128 + (i - (lines.length - 1) / 2) * 54));
  });
  const m = plane(std('dkNoteM' + lines.join(''), { map: tex, roughness: 0.9 }), 456, 456, x, 1.4, z, { rz: ang });
  m.castShadow = false;
}
function pencil(x, z, ang, color = 0xf2c230) {
  const g = grp(x, z, ang), L = 1140;
  part(g, new T.CylinderGeometry(22, 22, L - 190, 6), mat('Pencil' + color, color, 0.5), -20, 22, 0, [0, 0, Math.PI / 2]);
  part(g, new T.CylinderGeometry(23, 23, 70, 12), mSteel, -L / 2 + 110, 22, 0, [0, 0, Math.PI / 2]);
  part(g, new T.CylinderGeometry(21, 21, 80, 12), mat('Rubber', 0xe79aa0, 0.9), -L / 2 + 40, 22, 0, [0, 0, Math.PI / 2]);
  part(g, new T.ConeGeometry(22, 120, 6), mat('PencilWood', 0xe2c08f, 0.8), L / 2 - 115, 22, 0, [0, 0, -Math.PI / 2]);
  part(g, new T.ConeGeometry(8, 44, 6), mat('Lead', 0x2a2a2e, 0.4), L / 2 - 40, 22, 0, [0, 0, -Math.PI / 2]);
  addBox(x - L / 2, x + L / 2, z - 23, z + 23, { ang, tall: false });
}
PROPS.eraser = () => {
  const g = new T.Group();
  const body = new T.Mesh(rbox(330, 130, 170, 18), std('dkEraser', { color: 0xf3f1ea, roughness: 0.85 }));
  body.position.y = 65;
  const sleeve = new T.Mesh(rbox(190, 136, 176, 10), std('dkSleeve', { color: 0x2f6fb5, roughness: 0.6 }));
  sleeve.position.set(-40, 66, 0);
  g.add(body, sleeve);
  return { mesh: g, r: 150, m: 0.45, fr: 6, rest: 0.15, yoff: 0 };
};
PROPS.dice = o => {
  const tex = TX('dkDice', () => ctex(128, 128, (c, w, h) => {
    c.fillStyle = '#f7f5ef'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#c2332d';
    for (const [x, y] of [[32, 32], [96, 96], [64, 64], [32, 96], [96, 32]]) { c.beginPath(); c.arc(x, y, 11, 0, Math.PI * 2); c.fill(); }
  }));
  const mesh = new T.Mesh(rbox(100, 100, 100, 16), std('dkDiceM' + (o.color || 0), { map: tex, color: o.color || 0xffffff, roughness: 0.35 }));
  return { mesh, r: 62, m: 0.07, fr: 3.2, rest: 0.45, yoff: 50 };
};

function buildDesk() {
  /* 책상, 벽, 저 아래 바닥 */
  const wood = TX('dkWood', () => ctex(1024, 512, (c, w, h) => {
    c.fillStyle = '#c9a274'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const y = rnd() * h;
      c.strokeStyle = `rgba(${90 + rnd() * 50},${55 + rnd() * 30},25,${0.05 + rnd() * 0.12})`; c.lineWidth = 1 + rnd() * 2.5;
      c.beginPath(); c.moveTo(0, y);
      for (let x = 0; x <= w; x += 64) c.lineTo(x, y + Math.sin(x / 120 + i) * 5);
      c.stroke();
    }
  }, [2, 1.2]));
  box(std('dkTop', { map: wood, roughness: 0.42 }), [0, DW], [-220, 0], [0, DD], { r: 16 });
  for (const x of [120, DW - 320]) box(mat('Leg', 0x26282c, 0.6), [x, x + 200], [FLOOR, -220], [300, DD - 300]);
  plane(mat('Carpet', 0x343a46, 1), 46000, 46000, DW / 2, FLOOR, DD / 2);
  box(mat('Wall', 0xcfd5dc, 0.95), [-12000, DW + 12000], [FLOOR, 7000], [-330, -200], { cast: false });
  addBox(-400, DW + 400, -500, 0, { wall: true });
  aoStrip(0, DW, 0, 260, 'n');

  /* 모니터 받침대 (아래로 지나가는 터널)와 모니터 */
  {
    const x0 = 2600, x1 = 6400, z0 = 250, z1 = 1350, H = 520, oak = mat('Riser', 0xb98a55, 0.5);
    box(oak, [x0, x1], [H, H + 60], [z0, z1], { r: 12 });
    for (const x of [x0, x1 - 140]) for (const z of [z0, z1 - 140]) { box(oak, [x, x + 140], [0, H], [z, z + 140]); addBox(x, x + 140, z, z + 140); }
    plane(aoMat(0.5), 4200, 1500, (x0 + x1) / 2, 0.7, (z0 + z1) / 2, { recv: false, order: 1 });
    box(mBlack, [4000, 5000], [H + 60, H + 92], [520, 1120], { r: 20 });
    box(mBlack, [4410, 4590], [H + 92, H + 760], [640, 760], { r: 20 });
    box(mGloss, [2680, 6320], [H + 580, H + 2740], [690, 790], { r: 30 });
    const scr = textTex('dkScreen', 1024, 600, '#0c1220', (c, w, h) => {
      c.font = '600 30px ui-monospace, Menlo, Consolas, monospace'; c.textBaseline = 'top';
      const L = [['#7ee787', '(env) pi@donkeycar:~/mycar $ python manage.py drive'], ['#c9d1d9', 'Starting vehicle at 20 Hz'], ['#c9d1d9', 'MOGA XP5-X Plus  ... connected'], ['#ff7b72', 'recording: ON'], ['#c9d1d9', 'records: 8285   mode: user'], ['#79c0ff', 'user/angle +1.00   user/throttle +1.00'], ['#7ee787', '(env) pi@donkeycar:~/mycar $ _']];
      L.forEach(([col, t], i) => { c.fillStyle = col; c.fillText(t, 36, 44 + i * 54); });
      c.fillStyle = 'rgba(255,255,255,0.05)'; for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 1);
    });
    const sm = new T.Mesh(new T.PlaneGeometry(3480, 1980), M('dkScreenM', () => new T.MeshBasicMaterial({ map: scr, toneMapped: false })));
    sm.position.set(4500, H + 1660, 792);
    statics.add(sm);
    const pl = new T.PointLight(0x86a8ff, 0.6, 5600, 0);
    pl.position.set(4500, H + 1500, 1700);
    dyn.add(pl);
    glow(4500, 1900, 3600, 1500, 0x6f98ff, 0.1);
  }

  /* 키보드 */
  {
    const x0 = 3100, z0 = 2350, base = mat('KbBase', 0x2c2f35, 0.5);
    box(base, [x0, x0 + 2640], [0, 110], [z0, z0 + 780], { r: 30 });
    addBox(x0, x0 + 2640, z0, z0 + 780);
    ao(x0 + 1320, z0 + 390, 2900, 1000, 0.5);
    const light = mat('KeyL', 0xdcdde1, 0.55), dark = mat('KeyD', 0x5c6068, 0.55), red = mat('KeyR', 0xd9483b, 0.5);
    const rows = [15, 15, 14, 13, 9];
    rows.forEach((n, r) => {
      const z = z0 + 50 + r * 142, total = 2540;
      let x = x0 + 50;
      for (let i = 0; i < n; i++) {
        const w = r === 4 ? (i === 4 ? total - 8 * 190 : 190) : total / n;   // 맨 아랫줄 가운데는 스페이스 바
        const m = r === 0 && i === 0 ? red : i === 0 || i === n - 1 || (r === 4 && i !== 4) ? dark : light;
        box(m, [x + 8, x + w - 8], [110, 172 - r * 5], [z + 6, z + 130], { r: 14, cast: false });
        x += w;
      }
    });
    // 키보드 선: 받침대 아래 터널을 가로지르는 낮은 턱
    const pts = [[4400, z0], [4380, 1900], [4300, 1350], [4380, 800], [4350, 250], [4300, 20]];
    const curve = new T.CatmullRomCurve3(pts.map(([x, z]) => V(x, 9, z)));
    const cm = new T.Mesh(new T.TubeGeometry(curve, 80, 9, 8), mat('KbCable', 0x1c1d20, 0.6));
    statics.add(cm);
    const ps = curve.getPoints(40);
    for (let i = 0; i < ps.length - 1; i += 4) { const p = ps[i], q = ps[Math.min(ps.length - 1, i + 4)]; features.adds.push({ type: 'cable', ax: p.x, az: p.z, bx: q.x, bz: q.z, r: 9 }); }
  }

  /* 마우스와 패드 */
  floorPlate(mat('Pad', 0x202328, 0.95), 6200, 7700, 2100, 3400, 18, 40);
  {
    const body = new T.Mesh(new T.SphereGeometry(1, 28, 20), mat('Mouse', 0xe9eaec, 0.4));
    body.scale.set(195, 120, 335); body.position.set(6950, 18 + 96, 2760);
    body.castShadow = true; body.receiveShadow = true;
    statics.add(body);
    box(mat('Wheel', 0x4b4f57, 0.5), [6935, 6965], [200, 245], [2560, 2640], { r: 12 });
    addCircle(6950, 2640, 185); addCircle(6950, 2880, 185);
    ao(6950, 2760, 620, 880, 0.5, 18.6);
  }

  /* 머그컵, 선인장, 스탠드, 휴대폰, 라즈베리파이 보드 */
  cyl(mat('Coaster', 0x8a6a4a, 0.8), 1250, 0, 1300, 340, 12, { seg: 40 });
  cyl(mat('Mug', 0xf2efe8, 0.35), 1250, 12, 1300, 250, 560, { seg: 40 });
  cyl(mat('Coffee', 0x3a2416, 0.25), 1250, 572, 1300, 226, 4, { seg: 40, cast: false });
  cyl(mat('MugBand', 0x2f5d8a, 0.4), 1250, 250, 1300, 253, 120, { seg: 40, cast: false });
  {
    const h = new T.Mesh(new T.TorusGeometry(150, 34, 12, 28, Math.PI), mat('Mug', 0xf2efe8, 0.35));
    h.position.set(1250 - 245, 300, 1300); h.rotation.set(0, 0, Math.PI / 2);
    h.castShadow = true;
    statics.add(h);
  }
  addCircle(1250, 1300, 262); addCircle(960, 1300, 60);
  ao(1250, 1300, 900, 900, 0.5);
  cyl(mTerra, 480, 0, 520, 150, 260, { rt: 185 });
  {
    const c = new T.Mesh(new T.SphereGeometry(1, 16, 14), mat('Cactus', 0x4f8a4a, 0.8));
    c.scale.set(120, 230, 120); c.position.set(480, 430, 520); c.castShadow = true;
    statics.add(c);
  }
  addCircle(480, 520, 190);
  {
    const K = mat('Lamp', 0x2a2c31, 0.4, { metalness: 0.5 });
    cyl(K, 8350, 0, 650, 400, 50, { seg: 40 });
    box(K, [8310, 8390], [50, 2300], [610, 690], { r: 20, rz: 0.12 });
    box(K, [6900, 8400], [2380, 2460], [610, 690], { r: 20, rz: 0.2 });
    const shade = new T.Mesh(new T.ConeGeometry(520, 520, 40, 1, true), M('dkShade', () => new T.MeshStandardMaterial({ color: 0x2a2c31, roughness: 0.4, metalness: 0.5, side: T.DoubleSide })));
    shade.position.set(6700, 2300, 650); shade.rotation.z = -0.35;
    const bulb = new T.Mesh(new T.SphereGeometry(150, 16, 12), M('dkBulb', () => new T.MeshBasicMaterial({ color: 0xfff0cf, toneMapped: false })));
    bulb.position.set(6650, 2180, 650);
    statics.add(shade, bulb);
    addCircle(8350, 650, 405);
  }
  box(mat('Phone', 0x101114, 0.25), [2350, 2780], [0, 50], [2400, 3300], { r: 24 });
  {
    const scr = new T.Mesh(new T.PlaneGeometry(380, 840), M('dkPhoneScr', () => new T.MeshBasicMaterial({ color: 0x2c4a7a, toneMapped: false })));
    scr.rotation.x = -Math.PI / 2; scr.position.set(2565, 50.6, 2850);
    statics.add(scr);
  }
  addBox(2350, 2780, 2400, 3300, { tall: false });
  box(mat('PiPcb', 0x1d6b3a, 0.6), [7300, 7810], [0, 10], [450, 786], { r: 4 });
  for (const [a, b, c, d, h] of [[7680, 7810, 470, 560, 100], [7680, 7810, 580, 670, 100], [7700, 7810, 690, 780, 85], [7330, 7420, 440, 500, 22], [7480, 7600, 560, 680, 30]]) box(mSteel, [a, b], [10, 10 + h], [c, d], { r: 4, cast: false });
  addBox(7300, 7810, 450, 786, { tall: false });

  /* 경로 위의 자 다리 (앞쪽): 오르막 → 평평 → 내리막 */
  {
    const H = 45, z0 = 3900, z1 = 4400, ruler = M('dkRuler', () => new T.MeshStandardMaterial({ map: TX('dkRulerT', () => ctex(1024, 128, (c, w, h) => {
      c.fillStyle = '#f0d96a'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#5b4a12';
      for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 2, x % 80 === 0 ? 48 : 24);
      c.font = '700 26px sans-serif'; for (let i = 0; i < 13; i++) c.fillText(String(i * 5), i * 80 + 6, 86);
    })), roughness: 0.3, transparent: true, opacity: 0.92 }));
    const len = Math.hypot(300, H), ang = Math.atan2(H, 300);
    box(ruler, [5050 - len / 2, 5050 + len / 2], [H / 2 - 5, H / 2 + 5], [z0, z1], { rz: -ang });
    box(ruler, [3850 - len / 2, 3850 + len / 2], [H / 2 - 5, H / 2 + 5], [z0, z1], { rz: ang });
    box(ruler, [4000, 4900], [H - 10, H], [z0, z1]);
    for (const x of [4030, 4660]) box(mat('BookS' + x, x < 4500 ? 0x4d8b6a : 0xc8553d, 0.7), [x, x + 200], [0, H - 10], [z0 + 30, z1 - 30], { cast: false });
    features.ramps.push({ x0: 4900, x1: 5200, z0, z1, axis: 'x', h0: H, h1: 0 });
    features.ramps.push({ x0: 4000, x1: 4900, z0, z1, axis: 'x', h0: H, h1: H });
    features.ramps.push({ x0: 3700, x1: 4000, z0, z1, axis: 'x', h0: 0, h1: H });
  }

  /* 도전: 공책 두 권 사이 틈 (폭 110). 전속력이 아니면 빠진다 */
  {
    const H = 60;
    for (const [z0, z1, col] of [[3350, 4250, 0x2f5d8a], [2440, 3240, 0xc8553d]]) {
      floorPlate(mat('Note' + col, col, 0.7), 500, 1400, z0, z1, H, 6);
      box(mat('Pages', 0xf3f0e6, 0.9), [512, 1404], [8, H - 8], [z0 + 6, z1 - 6], { cast: false });
    }
    const len = Math.hypot(400, H), ang = Math.atan2(H, 400), board = mat('Clip', 0x8a6a4a, 0.6);
    box(board, [520, 1380], [H / 2 - 6, H / 2 + 6], [4450 - len / 2, 4450 + len / 2], { rx: ang });
    box(board, [520, 1380], [H / 2 - 6, H / 2 + 6], [2240 - len / 2, 2240 + len / 2], { rx: -ang });
    features.ramps.push({ x0: 500, x1: 1400, z0: 4250, z1: 4650, axis: 'z', h0: H, h1: 0 });
    features.ramps.push({ x0: 500, x1: 1400, z0: 2040, z1: 2440, axis: 'z', h0: 0, h1: H });
    stickyNote(1760, 4560, 0.12, '#ffe66b', ['전속력으로', '틈 넘기!']);
  }

  /* 연필, 쪽지, 동전, 밀리는 것 */
  pencil(3350, 1850, 0.22);
  pencil(7250, 4680, -0.12, 0x3f8fd0);
  stickyNote(2300, 4640, -0.1, '#ffd0e0', ['그 코너', '다시 모으기']);
  stickyNote(5950, 3720, 0.08, '#c9f0c0', ['B 녹화', 'X 삭제', 'Y 정지']);
  for (const [x, z] of [[5650, 3560], [5780, 3640]]) cyl(mat('Coin', 0xc9a24a, 0.3, { metalness: 0.8 }), x, 0, z, 80, 11, { seg: 28, cast: false });
  addProp('dice', 4250, 3560, { ry: 0.3 });
  addProp('dice', 4420, 3650, { ry: 1.1, color: 0xdfeaff });
  addProp('dice', 4330, 3790, { ry: 2.0 });
  addProp('eraser', 2950, 3700, { ry: 0.4 });
  addProp('eraser', 6000, 1800, { ry: -0.6 });
}

MAPS.push({
  id: 'desk', name: '거인의 책상', tag: '난간 없는 책상 위',
  title: '거인의 책상',
  lede: '내 차는 그대로인데 책상 위 물건이 전부 6배예요. 키보드와 머그컵 사이를 달리고, 모니터 받침대 밑 터널을 지나요. 책상에는 난간이 없어서 가장자리를 넘으면 떨어져요.',
  collect: ['기록 주행 (책상 한 바퀴)', '자 다리를 건너 머그컵 옆으로, 모니터 받침대 밑 터널을 지나 마우스 패드 옆으로 도는 약 20m 코스예요. 앞쪽과 오른쪽은 낭떠러지예요.'],
  free: ['자유 주행', '공책 두 권 사이 틈을 전속력으로 넘어 보세요. 지우개와 주사위는 밀려서 책상 밖으로 떨어져요.'],
  toast: { collect: 'R(B 버튼)로 녹화를 켜고 자 다리부터! 가장자리 조심', free: '자유 주행: 왼쪽 공책 사이 틈은 최고 속도(] 키)로만 넘을 수 있어요' },
  fellMsg: '책상에서 떨어졌어요!',
  bounds: { x0: -350, z0: -450, x1: DW + 350, z1: DD + 350 },
  floors: [[0, 0, DW, DD]],
  labels: [['모니터', 4250, 1000], ['키보드', 4100, 2800], ['머그컵', 1000, 1900], ['마우스', 6650, 3650]],
  route: { cp: 12, tapeHalf: 240, wp: [[6300, 4200], [5300, 4150], [4450, 4150], [3600, 4150], [2700, 4100], [2050, 3850], [1800, 3200], [1780, 2400], [1880, 1700], [2180, 1100], [2750, 810], [3400, 800], [4500, 800], [5600, 800], [6500, 810], [7000, 1050], [7450, 1500], [7900, 2100], [8050, 2800], [7950, 3500], [7600, 3950], [7000, 4180]] },
  baseLevel: (x, z) => (x < 0 || x > DW || z > DD ? FLOOR : 0),
  phys: { killY: -1500 },
  env: { bg: 0x0b0d12, hemi: [0x9fb2d0, 0x2a2018, 0.4], sun: { dir: [-0.42, -0.8, 0.36], color: 0xffd9a6, int: 2.5 }, fill: { color: 0x8fa8ff, int: 0.12, dir: [0, 0.5, 0.9] }, exposure: 1.0, envInt: 0.22, shadowRadius: 3 },
  build: buildDesk,
  hooks: { hud: () => ['떨어진 횟수', `${state.fell}번`] },
});
}
