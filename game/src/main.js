/* ================= 경로, 체크포인트, 테이프 ================= */
// 경로는 맵마다 다르다: loadMap → setRoute가 아래 값들을 다시 만든다
const ROUTE_N = 800;
let route = null, RP = [], ROUTE_LEN = 1, CP_N = 12, TAPE_HALF = 225, OFF_TRACK = 270, gates = [], START = { x: 0, z: 0, yaw: 0 };
const tapeGroup = new T.Group();
scene.add(tapeGroup);
const mTape = new T.MeshStandardMaterial({ map: tapeTex, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 });
function setRoute(r) {
  route = new T.CatmullRomCurve3(r.wp.map(([x, z]) => V(x, 0, z)), true, 'centripetal');
  RP = route.getSpacedPoints(ROUTE_N);
  ROUTE_LEN = route.getLength();
  CP_N = r.cp || 12;
  TAPE_HALF = r.tapeHalf || 225;
  OFF_TRACK = TAPE_HALF + 45;
  gates = [];
  for (let i = 0; i < CP_N; i++) {
    const u = i / CP_N, p = route.getPointAt(u), t = route.getTangentAt(u).setY(0).normalize();
    gates.push({ p, t, n: V(-t.z, 0, t.x) });
  }
  {
    const u = 110 / ROUTE_LEN, p = route.getPointAt(u), t = route.getTangentAt(u);
    START = { x: p.x, z: p.z, yaw: Math.atan2(-t.z, t.x) };
  }
  for (const o of tapeGroup.children) o.geometry.dispose();
  tapeGroup.clear();
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
    const tm = new T.Mesh(g, mTape);
    tm.receiveShadow = true;
    tapeGroup.add(tm);
  }
  gateBar.scale.y = (TAPE_HALF * 2 + 70) / 520;
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
car3d.traverse(o => {
  if (!o.isMesh) return;
  for (const m of [].concat(o.material)) {
    if (m.transmission > 0) { m.transmission = 0; m.transparent = true; m.opacity = 0.3; m.depthWrite = false; m.roughness = 0.08; }
  }
});
for (const id of ['fpc', 'servocables', 'powerwires', 'i2c']) car3d.getObjectByName(id).traverse(o => { if (o.isMesh) o.castShadow = false; });
const carDyn = new Set([...rig.frontPivots, ...rig.wheels, ...rig.knuckles, rig.tie, ...rig.tieEnds, rig.horn, rig.drag, ...rig.dragEnds, rig.fan]);
mergeInto(car3d, o => carDyn.has(o), true);
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

/* ================= 밀 수 있는 물건 ================= */
// 종류는 PROPS 표에 등록한다 (맵 파일도 자기 종류를 추가할 수 있음). 값: 메시, 반지름 r, 질량 m, 마찰 fr, 반발 rest, 중심 높이 yoff
const props = [];
PROPS.ball = () => ({
  mesh: new T.Mesh(new T.SphereGeometry(65, 28, 20), std('propBall', { map: TX('ballTex', () => ctex(256, 128, (c, w, h) => { c.fillStyle = '#ffd23f'; c.fillRect(0, 0, w, h); c.fillStyle = '#ef4f4f'; for (let i = 0; i < 4; i++) c.fillRect(i * 64, 0, 32, h); })), roughness: 0.45 })),
  r: 65, m: 0.12, fr: 0.55, rest: 0.6, yoff: 65, roll: true,
});
PROPS.block = o => ({ mesh: new T.Mesh(new X.RoundedBoxGeometry(52, 52, 52, 2, 6), std('propBlock' + o.color, { color: o.color, roughness: 0.5 })), r: 31, m: 0.05, fr: 4.5, rest: 0.3, yoff: 26 });
PROPS.bottle = () => ({ mesh: new T.Mesh(new T.CylinderGeometry(28, 36, 220, 20), std('propBottle', { color: 0xbfe3ff, roughness: 0.08, transparent: true, opacity: 0.55 })), r: 37, m: 0.04, fr: 3, rest: 0.35, yoff: 110 });
PROPS.box = () => ({ mesh: new T.Mesh(new X.RoundedBoxGeometry(280, 220, 260, 2, 8), std('propBox', { color: 0xc89a62, roughness: 0.9 })), r: 150, m: 0.6, fr: 6, rest: 0.15, yoff: 110, crash: '상자' });
function addProp(kind, x, z, o = {}) {
  const p = Object.assign({ kind, x, z, x0: x, z0: z, vx: 0, vz: 0, ry: 0, spin: 0 }, PROPS[kind](o));
  p.ry = p.ry0 = o.ry ?? rnd() * 6;
  p.mesh.traverse(q => { if (q.isMesh) { q.castShadow = true; q.receiveShadow = true; } });
  p.mesh.rotation.y = p.ry;
  scene.add(p.mesh);
  props.push(p);
  return p;
}
function clearProps() {
  for (const p of props) { scene.remove(p.mesh); p.mesh.traverse(q => { if (q.geometry) q.geometry.dispose(); }); }
  props.length = 0;
}

/* ================= 움직이는 것 (로봇청소기, 고양이 ...) ================= */
// 공통 약속: { name, x, z, r, share(부딪힐 때 밀리는 비율), mini(미니맵 색), mesh, step(dt), sync(dt), reset(), onHit(세기), onProp?() }
const movers = [];
function addMover(mv) { movers.push(mv); scene.add(mv.mesh); return mv; }
function clearMovers() {
  for (const mv of movers) {
    scene.remove(mv.mesh);
    mv.mesh.traverse(q => { if (q.geometry) q.geometry.dispose(); if (q.material) q.material.dispose(); });
  }
  movers.length = 0;
}
function startFlee(m, a) {
  if (m.mode === 'flee') return;
  m.mode = 'flee'; m.t = 0.7 + rnd() * 0.4; m.a = a + (rnd() - 0.5) * 0.8;
  if (state.time - m.meowT > 2.5) { m.meowT = state.time; m.cry(); }
}
function makeVac(x, z, a) {
  const vac = { kind: 'vac', name: '로봇청소기', x, z, x0: x, z0: z, a, a0: a, v: 210, r: 170, share: 0.3, turn: 0, mini: '#9aa0a8', mesh: new T.Group(), led: null };
  vac.onHit = () => { vac.turn = 1.2; };
  vac.onProp = () => { vac.turn = 0.8; };
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
  vac.step = dt => {
    for (const col of nearby(vac.x, vac.z, vac.r + 10)) { const h = circleHit(col, vac.x, vac.z, vac.r); if (h) { vac.x += h[0] * h[2]; vac.z += h[1] * h[2]; } }
    if (vac.turn > 0) { vac.turn -= dt; vac.a += 2.4 * dt; return; }
    if (rnd() < 0.15 * dt) vac.turn = 0.4 + rnd() * 0.9;
    const nx = vac.x + Math.cos(vac.a) * vac.v * dt, nz = vac.z - Math.sin(vac.a) * vac.v * dt;
    let hit = false;
    for (const col of nearby(nx, nz, vac.r + 10)) if (circleHit(col, nx, nz, vac.r)) { hit = true; break; }
    if (Math.abs(groundH(nx, nz) - groundH(vac.x, vac.z)) > 12) hit = true;
    if (hit) { vac.turn = 0.6 + rnd() * 1.1; return; }
    vac.x = nx; vac.z = nz;
  };
  vac.sync = () => {
    vac.mesh.position.set(vac.x, groundH(vac.x, vac.z), vac.z);
    vac.mesh.rotation.y = vac.a;
    vac.led.material.emissiveIntensity = 1 + Math.sin(state.time * 6);
  };
  vac.reset = () => { vac.x = x; vac.z = z; vac.a = a; vac.v = 210; vac.turn = 0; };
  return addMover(vac);
}
/* 고양이: 어슬렁거리다가 차가 빠르게 다가오면 옆으로 피한다 */
function makeCat(x, z, a) {
  const cat = { kind: 'cat', name: '고양이', x, z, x0: x, z0: z, a, a0: a, vis: a, v: 0, r: 125, share: 0.5, mode: 'idle', t: 1.5, phase: 0, meowT: -9, mini: '#f0a050', mesh: new T.Group(), legs: [], tail: null, head: null, body: null, cry: meow };
    const furTex = TX('catFur', () => ctex(256, 64, (c, w, h) => {
      c.fillStyle = '#d88a3c'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(150,80,30,0.55)';
      for (let x = 10; x < w; x += 34) { c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + 8, h / 2, x, h); c.lineTo(x + 9, h); c.quadraticCurveTo(x + 17, h / 2, x + 9, 0); c.fill(); }
    }));
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
  cat.onHit = into => {
    if (into > 60) startFlee(cat, Math.atan2(-(cat.z - car.z), cat.x - car.x));
  };
  cat.step = dt => {
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
    // 다른 움직이는 것(청소기 등)과 겹치면 비켜서 도망
    for (const o of movers) {
      if (o === cat) continue;
      const vx = cat.x - o.x, vz = cat.z - o.z, vd = Math.hypot(vx, vz), vpen = cat.r + o.r - vd;
      if (vpen > 0 && vd > 1e-6) { cat.x += (vx / vd) * vpen; cat.z += (vz / vd) * vpen; startFlee(cat, Math.atan2(-vz, vx)); }
    }
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
  };
  cat.sync = dt => {
    const dA = ((cat.a - cat.vis + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    cat.vis += dA * (1 - Math.exp(-dt * 8));
    cat.mesh.position.set(cat.x, groundH(cat.x, cat.z), cat.z);
    cat.mesh.rotation.y = cat.vis;
    const walking = cat.v > 20, sw = walking ? Math.sin(cat.phase) * Math.min(0.6, cat.v / 900 + 0.3) : 0;
    cat.legs.forEach((l, i) => { l.rotation.z = i === 0 || i === 3 ? sw : -sw; });
    cat.body.position.y = 185 + (walking ? Math.abs(Math.sin(cat.phase)) * 6 : 0);
    cat.tail.rotation.y = Math.sin(performance.now() / (walking ? 160 : 520)) * 0.35;
    cat.head.rotation.y = walking ? 0 : Math.sin(performance.now() / 1900) * 0.45;
  };
  cat.reset = () => { cat.x = x; cat.z = z; cat.a = a; cat.v = 0; cat.turn = 0; cat.mode = 'idle'; cat.t = 1.5; };
  return addMover(cat);
}

/* ================= 충돌 격자 ================= */
const CELL = 1000;
const grid = new Map();
function cellsOf(x, z, r) {
  const out = [];
  for (let ix = Math.floor((x - r) / CELL); ix <= Math.floor((x + r) / CELL); ix++) for (let iz = Math.floor((z - r) / CELL); iz <= Math.floor((z + r) / CELL); iz++) out.push(ix + ',' + iz);
  return out;
}
function buildGrid() {
  grid.clear();
  colliders.forEach((c, i) => {
    const r = c.t === 'c' ? c.r : Math.hypot(c.hx, c.hz);
    for (const k of cellsOf(c.x, c.z, r)) { if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); }
  });
}
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
const L_WB = 190, TRACK = 88, R_TIRE = 35.5;
// 맵마다 바뀌는 물리값 (맵 정의의 phys가 덮어씀). 기본값이면 개편 전과 같은 주행
const PH_DEFAULT = { vmax: 1600, vrev: 1100, dmax: deg(25) };
const PH = Object.assign({}, PH_DEFAULT);
let world = null;   // 지금 열려 있는 맵 정의
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
  if (!opt.dead) return u * PH.vmax * 0.8125;
  if (u > 0.42) { if (u < 0.52) state.stutter = true; return ((u - 0.42) / 0.58) * PH.vmax; }
  if (u < -0.4) return ((u + 0.4) / 0.6) * PH.vrev;
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
  return clamp(Math.atan(L_WB * kappa) / PH.dmax, -1, 1);
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
  const dTarget = steerCmd * PH.dmax, rate = deg(330) * dt;
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
        if (p.crash && cn - pn > 220 && t - lastImpact > 0.5) { lastImpact = t; crash(cn - pn, p.crash); }
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
      if (pen > 0 && d > 1e-6) { p.x += (dx / d) * pen; p.z += (dz / d) * pen; p.vx += (dx / d) * 120; p.vz += (dz / d) * 120; if (m.onProp) m.onProp(); }
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
  if (a0 < 0 && a1 >= 0 && Math.abs(b) < TAPE_HALF * 2) {
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
  title: $('#title'), lede: $('#lede'), maps: $('#maps'), chalRow: $('#chalRow'), chalLabel: $('#chalLabel'), chalText: $('#chalText'),
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
  const ang = -car.delta / PH.dmax, thr = car.u || 0;
  ui.angV.textContent = ang.toFixed(2);
  ui.angBar.style.left = `${50 + Math.min(0, ang) * 50}%`;
  ui.angBar.style.width = `${Math.abs(ang) * 50}%`;
  ui.thrV.textContent = thr.toFixed(2);
  ui.thrBar.style.left = thr < 0 ? `${50 + thr * 50}%` : '50%';
  ui.thrBar.style.width = `${Math.abs(thr) * 50}%`;
  ui.thrBar.style.background = thr < 0 ? '#ff8a5b' : 'var(--accent)';
  ui.thrCap.style.left = `${50 + state.maxThr * 50}%`;
  ui.spd.textContent = `${(car.v / 1000).toFixed(2)} m/s`;
  const spwm = Math.round(395 + (car.delta / PH.dmax) * 60);
  const epwm = Math.round(thr >= 0 ? 380 - thr * 50 : 380 - thr * 55);
  ui.pwm.textContent = `${spwm} / ${epwm}`;
  ui.maxThr.textContent = state.maxThr.toFixed(2);
  ui.kRec.classList.toggle('rec', state.rec);
  ui.kConst.classList.toggle('hold', state.constant);
  ui.dead.textContent = state.deadZone ? `ESC 정지 구간 (PWM ${epwm}): 바퀴가 안 돌아요` : state.stutter ? '정지 구간 근처: 덜덜거리며 가요' : state.constant ? '일정 속도 주행 중 (O / Options로 끄기)' : '';
}

/* 미니맵: 맵 범위에 맞춰 축척을 정하고, 바탕(바닥·충돌체·경로·이름)은 맵을 열 때 한 번 그려 둔다 */
const MINI = { w: 516, h: 400, s: 1, ox: 0, oz: 0 };
let MB = { x0: 0, z0: 0 };
const miniBase = document.createElement('canvas');
miniBase.width = MINI.w; miniBase.height = MINI.h;
const mx = x => (x - MB.x0) * MINI.s + MINI.ox, mz = z => (z - MB.z0) * MINI.s + MINI.oz;
function buildMini() {
  const b = world.bounds, bw = b.x1 - b.x0, bh = b.z1 - b.z0;
  MB = { x0: b.x0, z0: b.z0 };
  MINI.s = Math.min(MINI.w / bw, MINI.h / bh);
  MINI.ox = (MINI.w - bw * MINI.s) / 2;
  MINI.oz = (MINI.h - bh * MINI.s) / 2;
  const c = miniBase.getContext('2d');
  c.clearRect(0, 0, MINI.w, MINI.h);
  for (const [x0, z0, x1, z1, kind] of world.floors || [[b.x0, b.z0, b.x1, b.z1]]) {
    c.fillStyle = kind === 'low' ? 'rgba(160,170,185,0.28)' : 'rgba(236,231,223,0.12)';
    c.fillRect(mx(x0), mz(z0), (x1 - x0) * MINI.s, (z1 - z0) * MINI.s);
  }
  if (world.mini) world.mini(c, mx, mz, MINI.s);
  for (const col of colliders) {
    if (col.hide) continue;
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
  for (const [t, x, z] of world.labels || []) c.fillText(t, mx(x) - 20, mz(z));
}
function drawMini() {
  const c = ui.mini.getContext('2d');
  c.clearRect(0, 0, MINI.w, MINI.h);
  c.drawImage(miniBase, 0, 0);
  if (state.mode === 'collect') {
    const g = gates[state.cp % CP_N], hw = TAPE_HALF * 1.4;
    c.strokeStyle = '#ffffff'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(mx(g.p.x - g.n.x * hw), mz(g.p.z - g.n.z * hw)); c.lineTo(mx(g.p.x + g.n.x * hw), mz(g.p.z + g.n.z * hw)); c.stroke();
  }
  c.fillStyle = '#ffd23f';
  for (const p of props) { c.beginPath(); c.arc(mx(p.x), mz(p.z), 3.5, 0, Math.PI * 2); c.fill(); }
  for (const mv of movers) { c.fillStyle = mv.mini; c.beginPath(); c.arc(mx(mv.x), mz(mv.z), Math.max(5, mv.r * MINI.s), 0, Math.PI * 2); c.fill(); }
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
  if (!state.playing) {
    if (e.code === 'Enter' && !ui.start.hidden) startGame(state.mode);
    const d = /^Digit([1-9])$/.exec(e.code);
    if (d && MAPS[d[1] - 1] && !ui.start.hidden && e.target.tagName !== 'SELECT') loadMap(MAPS[d[1] - 1].id);
    return;
  }
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
    if (!state.playing && !ui.start.hidden) {
      if (edge(0) || edge(9)) startGame(state.mode);
      else if (edge(5) || edge(4)) loadMap(MAPS[(MAPS.indexOf(world) + (edge(5) ? 1 : MAPS.length - 1)) % MAPS.length].id);
    }
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
  Object.assign(state, { rec: false, constant: false, drive: 'user', maxThr: parseFloat(spSel.value), records: 0, bad: [], recAcc: 0, lastCrash: -99, crashes: 0, deleted: 0, time: 0, cp: 1, lap: 0, lapStart: 0, laps: [], best: null, routeIdx: 0, offTrack: false, fell: 0 });
  placeCar(START.x, START.z, START.yaw);
  for (const p of props) { p.x = p.x0; p.z = p.z0; p.vx = p.vz = p.spin = 0; }
  for (const mv of movers) mv.reset();
  if (world.hooks && world.hooks.reset) world.hooks.reset();
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
  toast(world.toast[mode], 'good');
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
spSel.addEventListener('change', () => { if (!world.maxThr) opt.speed = parseFloat(spSel.value); state.maxThr = parseFloat(spSel.value); });

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
  for (const mv of movers) mv.sync(dt);
  if (world.hooks && world.hooks.sync) world.hooks.sync(dt);
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
      for (const mv of movers) mv.step(STEP);
      propsStep(STEP);
      if (live && world.hooks && world.hooks.step) world.hooks.step(STEP);
    }
    if (live) {
      const off = nearestRoute(car.x, car.z);
      state.offTrack = state.mode === 'collect' && off > OFF_TRACK;
      if (world.hooks && world.hooks.frame) world.hooks.frame();
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
/* ================= 맵 열기 ================= */
function disposeGroup(g) {
  g.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  g.clear();
}
function loadMap(id) {
  const def = MAPS.find(d => d.id === id) || MAPS[0];
  if (world && world.hooks && world.hooks.unload) world.hooks.unload();
  disposeGroup(statics);
  disposeGroup(dyn);
  clearProps();
  clearMovers();
  colliders.length = 0;
  features.plates.length = 0; features.ramps.length = 0; features.adds.length = 0;
  hgrid = null;
  world = def;
  baseLevel = def.baseLevel || (() => 0);
  Object.assign(PH, PH_DEFAULT, def.phys || {});
  applyEnv(def.env || {}, def.bounds);
  rs = RS0;
  def.build();
  mergeInto(statics);
  buildGrid();
  setRoute(def.route);
  buildMini();
  renderStart();
  resetGame();
  chase.init = false;
}
function buildMapPicker() {
  ui.maps.innerHTML = MAPS.map((d, i) => `<button type="button" class="mapbtn" role="radio" data-map="${d.id}" aria-checked="false"><b>${d.name}</b><small>${d.tag}</small></button>`).join('');
  ui.maps.addEventListener('click', e => {
    const b = e.target.closest('[data-map]');
    if (b && b.dataset.map !== world.id) loadMap(b.dataset.map);
    if (b) b.blur();
  });
}
function renderStart() {
  for (const b of ui.maps.children) b.setAttribute('aria-checked', String(b.dataset.map === world.id));
  ui.title.textContent = world.title;
  ui.lede.textContent = world.lede;
  for (const k of ['collect', 'free']) {
    const b = document.querySelector(`#start [data-mode=${k}]`);
    b.querySelector('b').textContent = world[k][0];
    b.querySelector('small').textContent = world[k][1];
  }
  spSel.value = String(world.maxThr || opt.speed);
}
buildMapPicker();
loadMap(MAPS.some(d => d.id === 'living') ? 'living' : MAPS[0].id);
resize();
requestAnimationFrame(frame);
function sim(sec, steer = 0, thr = 0) {
  const STEP = 1 / 120;
  for (let i = 0, n = Math.round(sec / STEP); i < n; i++) {
    input.steer = steer; input.thr = thr;
    const px = car.x, pz = car.z;
    state.time += STEP;
    physicsStep(STEP); checkGate(px, pz); recordStep(STEP);
    for (const mv of movers) mv.step(STEP);
    propsStep(STEP);
    if (world.hooks && world.hooks.step) world.hooks.step(STEP);
    const off = nearestRoute(car.x, car.z);
    state.offTrack = state.mode === 'collect' && off > OFF_TRACK;
  }
  return { x: Math.round(car.x), z: Math.round(car.z), y: +car.y.toFixed(1), v: Math.round(car.v), lap: state.lap, cp: state.cp, crashes: state.crashes, off: state.offTrack };
}
// 브라우저 콘솔과 game/tests 에서 쓰는 시험용 손잡이
window.__game = {
  state, car, props, movers, opt, start: startGame, groundH, colliders, placeCar, resetCar, sim, setView: v => { debugView = v; }, info: () => renderer.info.render, scene, car3d, statics, dyn,
  loadMap, maps: () => MAPS.map(d => d.id), world: () => world, PH: () => PH,
  counts: () => ({ colliders: colliders.length, props: props.length, movers: movers.length, statics: statics.children.length, dyn: dyn.children.length, scene: scene.children.length, geometries: renderer.info.memory.geometries }),
  get route() { return RP; }, get START() { return START; },
  get vac() { return movers.find(mv => mv.kind === 'vac'); }, get cat() { return movers.find(mv => mv.kind === 'cat'); },
};
