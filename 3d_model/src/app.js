{
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const stage = $('#stage'), infoEl = $('#info'), tipEl = $('#tip');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/* ---------------- 1. 부품 정보 ---------------- */
const GROUPS = [['body', '차체와 구동계'], ['elec', '전장'], ['cam', '카메라'], ['wire', '배선과 고정']];
const DEFS = [
  { id: 'bed', g: 'body', name: '짐칸 (흰색 바디)', key: '캐빈을 떼고 짐칸만 사용', ex: [-26, 34, 0], d: 0.24,
    desc: '순정 픽업 바디에서 앞쪽 캐빈을 떼어 내고 짐칸만 남겼어요. 바닥의 벨크로 매트 위에 라즈베리파이와 PCA9685를 붙였어요.',
    specs: [['크기(추정)', '약 156 × 106 × 48 mm'], ['고정', '벨크로 스트랩 2줄']] },
  { id: 'frame', g: 'body', name: '사다리형 섀시', key: 'WPL C24-1, 1/16 4WD', ex: [0, 0, 0], d: 0,
    desc: '앞뒤 차축과 변속기를 잡아 주는 검은 프레임이에요. 위에 반투명 골판과 앞 데크 박스가 올라가요.',
    specs: [['기본 차량', 'WPL C24-1 (1/16 크롤러)'], ['휠베이스', '약 190 mm']] },
  { id: 'drive', g: 'body', name: '변속기와 모터', key: '브러시드 DC 모터', ex: [0, -12, 0], d: 0.12,
    desc: '가운데 기어박스가 모터 회전을 줄여 앞뒤 구동축으로 나눠 보내요. 모터 선은 단자대 D, E를 거쳐 ESC에 이어져요.',
    specs: [['모터', '브러시드 DC (순정)'], ['제어', 'ESC ← PCA9685 ch1']] },
  { id: 'shafts', g: 'body', name: '구동축 (앞, 뒤)', key: '4륜 구동', ex: [0, -22, 0], d: 0.1,
    desc: '변속기에서 앞뒤 차동기어로 힘을 전하는 축이에요. 양 끝의 유니버설 조인트가 서스펜션 움직임을 받아 줘요.', specs: [] },
  { id: 'faxle', g: 'body', name: '앞 차축과 조향 너클', key: '좌우 약 25° (추정)', ex: [0, -28, 0], d: 0.04,
    desc: '너클과 타이로드가 함께 움직여 앞바퀴를 좌우로 꺾어요. 아래 조향 PWM 슬라이더로 움직여 볼 수 있어요.',
    specs: [['최대 조향(추정)', '좌우 약 25°']] },
  { id: 'raxle', g: 'body', name: '뒤 차축', key: '차동기어 내장', ex: [0, -28, 0], d: 0.04,
    desc: '뒷바퀴를 굴리는 차축이에요. 가운데 둥근 하우징 안에 차동기어가 들어 있어요.', specs: [] },
  { id: 'links', g: 'body', name: '4링크 서스펜션', key: '링크 8개', ex: [0, -14, 0], d: 0.08,
    desc: '차축을 프레임에 묶는 링크예요. 크롤러라서 차축이 크게 비틀려도 네 바퀴가 바닥에 붙어 있어요.', specs: [] },
  { id: 'shocks', g: 'body', name: '쇼크 업소버 4개', key: '코일 스프링', ex: [0, 6, 0], d: 0.1,
    desc: '바닥 충격을 받아 차체 흔들림을 줄여요. 직진할 때 남은 약한 쏠림은 차체 흔들림 탓으로 보고, 부품을 고정한 뒤 다시 확인할 예정이에요.', specs: [] },
  { id: 'wheels', g: 'body', name: '바퀴 4개', key: '지름 약 70 mm', ex: [0, 0, 0], d: 0,
    desc: '크롤러용 블록 트레드 타이어와 검은 휠이에요. 아래 구동 PWM 슬라이더로 굴려 볼 수 있어요.',
    specs: [['지름, 폭(추정)', '약 70 mm, 27 mm']] },
  { id: 'servo', g: 'body', name: '조향 서보 (빨간 케이스)', key: 'ch0, 455 / 395 / 335', ex: [30, -4, 0], d: 0.14,
    desc: 'PCA9685 채널 0의 신호로 앞바퀴를 꺾어요. 값이 클수록 왼쪽이에요.',
    specs: [['채널', 'PCA9685 ch0'], ['PWM', '왼쪽 455, 가운데 395, 오른쪽 335'], ['기계적 끝', '470 / 330 (넘기지 않기)'], ['선 색', '흰 = 신호, 빨강 = V+, 검정 = GND']] },
  { id: 'steerlink', g: 'body', name: '조향 링크', key: '서보 혼 → 왼쪽 너클', ex: [14, -18, 0], d: 0.14,
    desc: '서보 혼의 회전을 왼쪽 너클에 전해요. 오른쪽 바퀴는 타이로드로 같이 움직여요.', specs: [] },
  { id: 'frontbox', g: 'body', name: '앞 데크 박스', key: '단자대, 카메라 받침', ex: [16, 42, 0], d: 0.24,
    desc: '앞쪽 검은 트레이예요. 위에 레버 단자대를 붙이고 카메라 받침을 벨크로로 묶었어요. 이쪽이 차의 앞이에요.', specs: [] },
  { id: 'plate', g: 'body', name: '반투명 골판', key: 'ESC, UBEC, 배터리 받침', ex: [0, 36, 0], d: 0.22,
    desc: '짐칸과 앞 데크 사이, 캐빈이 있던 자리를 덮은 골판이에요. ESC, UBEC, 구동 배터리가 올라가요.', specs: [] },

  { id: 'pi', g: 'elec', name: 'Raspberry Pi 5 (1GB)', key: 'DonkeyCar 5.4.0', ex: [-12, 96, 0], d: 0.42,
    desc: '카메라 영상을 받아 조향과 속도를 정하는 두뇌예요. 방열판과 팬이 달린 쿨러를 붙였어요.',
    specs: [['주소', '192.168.0.155 (웹 UI :8887)'], ['소프트웨어', 'DonkeyCar 5.4.0, Python 3.13'], ['연결', '카메라 CAM0, I2C → PCA9685'], ['전원', '지금은 USB-C 충전기, 보조배터리로 바꿀 예정']] },
  { id: 'pca', g: 'elec', name: 'PCA9685 PWM 드라이버', key: 'I2C 0x40', ex: [16, 104, 0], d: 0.44,
    desc: 'Pi가 I2C로 보낸 명령을 서보와 ESC용 PWM 신호로 바꿔요. 빨간 LED가 켜져 있으면 전원이 들어온 상태예요.',
    specs: [['I2C', '버스 1, 주소 0x40'], ['채널', 'ch0 조향 서보, ch1 ESC'], ['V+ (초록 단자)', 'UBEC 5V 출력'], ['로직 VCC', 'Pi 3.3V (1번 핀)']] },
  { id: 'esc', g: 'elec', name: 'ESC 30A (브러시드)', key: 'ch1, 330 / 380 / 435', ex: [0, 74, -24], d: 0.36,
    desc: 'PCA9685 채널 1 신호에 맞춰 모터에 가는 전력을 조절해요. 이 ESC는 숫자가 작을수록 앞으로 가요.',
    specs: [['PWM', '전진 330, 정지 380, 후진 435'], ['정지 구간', '359~402'], ['게임패드 최대', '스로틀 0.6'], ['입력', '4.8~8.4 V'], ['주의', '3핀의 빨간 선(내부 BEC)은 잘라서 절연']] },
  { id: 'ubec', g: 'elec', name: 'UBEC 5V 5A', key: '서보 전원 전용', ex: [10, 74, -34], d: 0.38,
    desc: '구동 배터리 전압을 5V로 낮춰 서보에 줘요. 서보가 움직이면 4V 중반까지 떨어져서 Pi 전원으로는 쓰지 않아요.',
    specs: [['출력', '5.0~5.1 V (서보 동작 때 4V 중반)'], ['연결', '단자대 B, C → PCA9685 초록 단자']] },
  { id: 'battery', g: 'elec', name: '구동 배터리 (2S)', key: '7.4~8.4 V', ex: [0, 72, 16], d: 0.34,
    desc: '모터와 서보를 돌리는 배터리예요. 전압이 높아서 Pi에 바로 연결하면 안 돼요.',
    specs: [['사양', '2S 7.4V 1200mAh (순정, 2개 보유)'], ['연결', '+ → 단자대 A → 스위치 → B, − → 단자대 C']] },
  { id: 'terminals', g: 'elec', name: '레버 단자대 PCT-213 5개', key: 'A~E', ex: [0, 66, 0], d: 0.36,
    desc: '납땜 없이 전원선을 나누고 잇는 3구 레버 단자대예요. 그림의 위치는 사진을 보고 대략 맞췄어요.',
    specs: [['A', '배터리 +, 스위치 선'], ['B (+)', '스위치 다른 선, UBEC +, ESC VCC'], ['C (−)', '배터리 −, UBEC −, ESC GND'], ['D, E', 'ESC M+, M−와 모터 선']] },
  { id: 'powerbank', g: 'elec', name: '보조배터리 (Pi 전원)', key: '뉴클 PD 22.5W 5000mAh', planned: true, ex: [-40, 110, 0], d: 0.46,
    desc: 'Pi 전용 전원으로 산 보조배터리예요. 그림은 짐칸 뒤쪽에 세워 벨크로로 고정하는 배치를 제안한 거예요.',
    specs: [['크기와 무게', '81 × 59 × 28.5 mm, 99 g (판매 정보)'], ['확인할 것', '뒷면 표기에 USB-C 5V⎓3A 출력이 있는지'], ['연결', '짧은 ㄱ자 USB-C 연장선 권장 (진동에서 단자 보호)']] },

  { id: 'camera', g: 'cam', name: '카메라 IMX219 160°', key: 'CAM0, 180° 돌려 장착', ex: [66, 94, 0], d: 0.46,
    desc: '차 앞을 보는 광각 카메라예요. 거꾸로 달아서 설정에서 상하좌우를 뒤집었어요.',
    specs: [['연결', 'Pi 5 CAM0 (22핀 케이블)'], ['설정', 'CAMERA_VFLIP, CAMERA_HFLIP = True'], ['높이', '바닥에서 약 10~12 cm, 아래로 기울임'], ['시야', '광각 모드(1640×1232)로 바꾸기로 함']] },
  { id: 'cammount', g: 'cam', name: '카메라 받침 (투명 케이스 2개)', key: '카메라 높이 확보', ex: [26, 80, 0], d: 0.4,
    desc: '투명 케이스 두 개를 쌓아 벨크로로 묶고, 앞쪽 금속 캡에 카메라를 붙였어요.', specs: [] },

  { id: 'fpc', g: 'wire', name: '카메라 FPC 케이블', key: '30 cm 리본', ex: [22, 152, 0], d: 0.55,
    desc: '카메라에서 Pi CAM0까지 이어지는 리본 케이블이에요. 날카롭게 접지 말고 차체를 따라 고정할 예정이에요.', specs: [] },
  { id: 'servocables', g: 'wire', name: '서보 케이블 2가닥', key: 'ch0 서보, ch1 ESC', ex: [0, 146, -12], d: 0.55,
    desc: 'PCA9685 채널 0, 1에서 조향 서보와 ESC로 가는 3선 케이블(30 cm 연장선)이에요.',
    specs: [['ch0', '조향 서보'], ['ch1', 'ESC 신호 (빨간 선 절연)']] },
  { id: 'powerwires', g: 'wire', name: '전원 배선', key: '빨강 +, 검정 −', ex: [0, 128, 0], d: 0.52,
    desc: '배터리 → 단자대 → ESC와 UBEC, UBEC → PCA9685, ESC → 모터로 이어지는 20AWG 실리콘 선이에요. 그림의 경로는 대략이에요.', specs: [] },
  { id: 'i2c', g: 'wire', name: 'I2C 점퍼선 4가닥', key: 'GPIO 1, 3, 5, 6번 핀', ex: [0, 136, 0], d: 0.55,
    desc: 'Pi GPIO와 PCA9685를 잇는 점퍼선이에요.',
    specs: [['1번 (3.3V)', 'VCC'], ['3번 (SDA)', 'SDA'], ['5번 (SCL)', 'SCL'], ['6번 (GND)', 'GND']] },
  { id: 'velcro', g: 'wire', name: '벨크로 스트랩', key: '지금은 임시 고정', ex: [0, 0, 0], d: 0.5,
    desc: '짐칸, 골판, 카메라 받침을 묶은 검은 벨크로예요. 부품을 단단히 고정하는 게 다음에 할 일이에요.', specs: [] },
];
DEFS.forEach((d, i) => { d.n = i + 1; });
const DEF = Object.fromEntries(DEFS.map(d => [d.id, d]));

/* ---------------- 2. 표와 정보 카드 (3D 없이도 동작) ---------------- */
const state = { explode: 0, labels: true, xray: false, dims: false, fov: false, selected: null, hovered: null, isolate: null, vis: {}, thr: 380 };
const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><g class="open"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></g><g class="shut"><path d="M3 3l18 18"/><path d="M10.6 5.6c.5 0 .9-.1 1.4-.1C18.4 5.5 22 12 22 12a17 17 0 0 1-3.1 3.9M6.3 6.6C3.6 8.4 2 12 2 12s3.6 6.5 10 6.5c1.6 0 3-.4 4.2-1"/></g></svg>';
const rowsOf = g => DEFS.filter(d => d.g === g).map(d => `<tr class="row" data-id="${d.id}"><td class="no"><span class="num">${d.n}</span></td><td><button type="button" class="pname">${d.name}${d.planned ? '<span class="badge">예정</span>' : ''}</button><small>${d.key}</small></td><td class="eye"><button type="button" class="eyeb" aria-pressed="true" aria-label="${d.name} 숨기기">${EYE}</button></td></tr>`).join('');
const tableOf = groups => `<table><thead><tr><th>번호</th><th>부품</th><th class="r">보기</th></tr></thead>${groups.map(([g, title]) => `<tbody><tr><th colspan="3">${title}</th></tr>${rowsOf(g)}</tbody>`).join('')}</table>`;
$('#ptable').innerHTML = tableOf(GROUPS.slice(0, 1)) + tableOf(GROUPS.slice(1));

function renderInfo() {
  const id = state.selected;
  if (!id) {
    infoEl.innerHTML = '<p class="empty"><b>부품을 눌러 보세요.</b> 이름과 역할, 설정값이 여기에 나와요.</p><ul><li>펼치기 버튼을 누르면 분해도와 번호가 보여요.</li><li>아래 부품표에서 골라도 돼요.</li></ul>';
    return;
  }
  const d = DEF[id], gname = GROUPS.find(g => g[0] === d.g)[1];
  infoEl.innerHTML = `<p class="cat"><b>${d.n}</b>${gname}${d.planned ? '<span class="badge">장착 예정</span>' : ''}</p><h3>${d.name}</h3><p>${d.desc}</p>${d.specs.length ? `<dl>${d.specs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` : ''}<div class="acts"><button type="button" class="btn" data-a="focus">가까이 보기</button><button type="button" class="btn" data-a="iso" aria-pressed="${state.isolate === id}">이것만 보기</button><button type="button" class="btn" data-a="close">닫기</button></div>`;
}
function syncTable() {
  $$('#ptable tr.row').forEach(tr => {
    const id = tr.dataset.id, vis = state.vis[id] !== false, b = $('.eyeb', tr);
    tr.classList.toggle('sel', id === state.selected);
    tr.classList.toggle('off', !vis);
    b.setAttribute('aria-pressed', String(vis));
    b.setAttribute('aria-label', `${DEF[id].name} ${vis ? '숨기기' : '보이기'}`);
  });
}
const api = {
  select(id) { state.selected = id; renderInfo(); syncTable(); },
  toggleVisible(id) { state.vis[id] = state.vis[id] === false; syncTable(); },
  focus() {}, isolate() {},
};
$('#ptable').addEventListener('click', e => {
  const tr = e.target.closest('tr.row');
  if (!tr) return;
  if (e.target.closest('.eyeb')) { api.toggleVisible(tr.dataset.id); return; }
  api.select(tr.dataset.id, true);
  stage.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
});
infoEl.addEventListener('click', e => {
  const a = e.target.closest('[data-a]')?.dataset.a;
  if (a === 'close') api.select(null);
  else if (a === 'focus') api.focus(state.selected);
  else if (a === 'iso') api.isolate(state.isolate === state.selected ? null : state.selected);
});
renderInfo();

/* ---------------- 3. 3D ---------------- */
function init3D() {
  const T = window.THREE, X = window.THREEX;
  if (!T || !X) throw new Error('three.js가 로드되지 않음');
  const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const deg = d => d * Math.PI / 180;
  const UP = V(0, 1, 0);

  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', '자율주행 RC카 3D 모델. 끌어서 돌리고 휠이나 두 손가락으로 확대해요.');
  stage.prepend(renderer.domElement);
  const labelR = new X.CSS2DRenderer();
  labelR.domElement.className = 'labels';
  renderer.domElement.after(labelR.domElement);
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new T.Scene();
  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new X.RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;
  const camera = new T.PerspectiveCamera(30, 1, 4, 9000);
  const controls = new X.OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.085, minDistance: 110, maxDistance: 3200, maxPolarAngle: deg(88), autoRotateSpeed: 1.1, zoomSpeed: 0.9 });

  const hemi = new T.HemisphereLight(0xffffff, 0x8a8478, 0.55);
  scene.add(hemi);
  const key = new T.DirectionalLight(0xffffff, 2.1);
  key.position.set(170, 540, 280);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -340, right: 340, top: 340, bottom: -340, near: 60, far: 1500 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.6;
  key.shadow.radius = 4;
  scene.add(key, key.target);
  const fill = new T.DirectionalLight(0xdfe7ff, 0.55);
  fill.position.set(-320, 220, -280);
  const rim = new T.DirectionalLight(0xffffff, 0.6);
  rim.position.set(-280, 170, 320);
  scene.add(fill, rim);

  /* --- 캔버스 텍스처 --- */
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function canvasTex(w, h, draw, o = {}) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.flipY = o.flipY !== false;
    t.anisotropy = maxAniso;
    if (o.repeat || o.wrap) { t.wrapS = t.wrapT = T.RepeatWrapping; }
    if (o.repeat) t.repeat.set(o.repeat[0], o.repeat[1]);
    return t;
  }
  const velcroTex = (rx, ry) => canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#222222'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) { c.fillStyle = y % 8 ? '#2a2a2a' : '#191919'; c.fillRect(0, y, w, 2); }
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * w, y = rnd() * h, l = 1 + rnd() * 3, g = 58 + rnd() * 44 | 0;
      c.strokeStyle = `rgba(${g},${g},${g},${0.25 + rnd() * 0.35})`;
      c.lineWidth = 0.7;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + (rnd() - 0.5) * l, y + (rnd() - 0.5) * l); c.stroke();
    }
  }, { repeat: [rx, ry] });
  const corrugatedTex = () => canvasTex(512, 768, (c, w, h) => {
    c.fillStyle = '#eef2f3'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 18) {
      const g = c.createLinearGradient(x, 0, x + 18, 0);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#c6ced3'); g.addColorStop(1, '#ffffff');
      c.fillStyle = g; c.fillRect(x, 0, 18, h);
    }
    c.fillStyle = 'rgba(70,82,92,0.3)'; c.font = '700 26px sans-serif';
    for (let y = 60, k = 0; y < h; y += 120, k++) for (let x = -40 + (k % 2) * 130; x < w; x += 300) c.fillText('PROTECTION FILM', x, y);
  });
  const piTex = () => canvasTex(448, 680, (c, w, h) => {
    const s = 8;
    c.fillStyle = '#1f6d3d'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(140,215,160,0.17)'; c.lineWidth = 1.4;
    for (let i = 0; i < 70; i++) {
      let x = rnd() * w, y = rnd() * h;
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 4; k++) { if (k % 2) x += (rnd() - 0.5) * 160; else y += (rnd() - 0.5) * 160; c.lineTo(x, y); }
      c.stroke();
    }
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.5;
    for (const [v0, u0, v1, u1] of [[44, 3, 48, 10], [40, 62, 46, 70], [8, 20, 12, 30]]) c.strokeRect(v0 * s, u0 * s, (v1 - v0) * s, (u1 - u0) * s);
    for (const [v, u] of [[3.5, 3.5], [52.5, 3.5], [3.5, 61.5], [52.5, 61.5]]) { c.fillStyle = '#d9b65c'; c.beginPath(); c.arc(v * s, u * s, 3.1 * s, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#f5f5f0'; c.font = `600 ${2.8 * s}px sans-serif`; c.fillText('Raspberry Pi 5', 14 * s, 9.6 * s);
    c.font = `${2 * s}px sans-serif`; c.fillText('1GB', 44 * s, 9.6 * s);
  }, { flipY: false });
  const CHZ = ch => -24.5 + ch * 2.54 + Math.floor(ch / 4) * 1.3;
  const pcaTex = () => canvasTex(200, 496, (c, w, h) => {
    const s = 8;
    c.fillStyle = '#1c47c0'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(170,195,255,0.2)'; c.lineWidth = 1.2;
    for (let i = 0; i < 30; i++) { const y = rnd() * h; c.beginPath(); c.moveTo(60 + rnd() * 60, y); c.lineTo(60 + rnd() * 120, y + (rnd() - 0.5) * 60); c.stroke(); }
    for (const [x, z] of [[2.5, 2.5], [22.5, 2.5], [2.5, 59.5], [22.5, 59.5]]) { c.fillStyle = '#d9b65c'; c.beginPath(); c.arc(x * s, z * s, 2.6 * s, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#ffffff';
    c.save(); c.translate(17.4 * s, 3.5 * s); c.rotate(Math.PI / 2); c.font = `600 ${2.1 * s}px sans-serif`; c.fillText('16-Channel 12-bit PWM/Servo Driver', 0, 0); c.restore();
    c.save(); c.translate(21.6 * s, 20 * s); c.rotate(Math.PI / 2); c.font = `700 ${2.6 * s}px sans-serif`; c.fillText('PCA9685', 0, 0); c.restore();
    c.font = `600 ${1.5 * s}px sans-serif`; c.textAlign = 'center';
    for (let ch = 0; ch < 16; ch++) c.fillText(String(ch), 8.6 * s, (CHZ(ch) + 31) * s + 0.55 * s);
  }, { flipY: false });
  const fpcTex = () => canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#d2902f'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(120,66,10,0.35)'; c.lineWidth = 2;
    for (let i = -w; i < w * 2; i += 16) {
      c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke();
      c.beginPath(); c.moveTo(i, h); c.lineTo(i + h, 0); c.stroke();
    }
    c.fillStyle = 'rgba(255,225,170,0.3)'; c.fillRect(0, 0, w, 9); c.fillRect(0, h - 9, w, 9);
  }, { wrap: true });
  const barcodeTex = () => canvasTex(256, 128, (c, w) => {
    c.fillStyle = '#f7f7f4'; c.fillRect(0, 0, w, 128);
    c.fillStyle = '#1a1a1a';
    for (let x = 20; x < 236;) { const bw = 1.4 + Math.floor(rnd() * 3) * 1.6; c.fillRect(x, 14, bw, 78); x += bw + 1.4 + Math.floor(rnd() * 3) * 1.6; }
    c.font = '600 19px sans-serif'; c.fillText('8 801234 567893', 34, 116);
  });
  const ubecTex = () => canvasTex(200, 240, (c, w, h) => {
    c.fillStyle = '#e9edf5'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1b2f7a'; c.textAlign = 'center';
    c.save(); c.translate(w / 2, h / 2); c.rotate(-Math.PI / 2);
    c.font = '800 62px sans-serif'; c.fillText('UBEC', 0, -6);
    c.font = '700 38px sans-serif'; c.fillText('5V 5A', 0, 42);
    c.restore();
  });
  const radialTex = () => canvasTex(256, 256, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.8)'); g.addColorStop(0.5, 'rgba(255,255,255,0.34)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  const gridTex = dark => canvasTex(1024, 1024, (c, w, h) => {
    const mm = w / 1600, col = dark ? '255,255,255' : '20,22,26';
    for (let i = -800; i <= 800; i += 10) {
      const p = (i + 800) * mm, major = i % 50 === 0;
      c.strokeStyle = `rgba(${col},${major ? (dark ? 0.13 : 0.15) : (dark ? 0.05 : 0.06)})`;
      c.lineWidth = major ? 1.3 : 0.8;
      c.beginPath(); c.moveTo(p, 0); c.lineTo(p, h); c.stroke();
      c.beginPath(); c.moveTo(0, p); c.lineTo(w, p); c.stroke();
    }
    c.globalCompositeOperation = 'destination-in';
    const g = c.createRadialGradient(w / 2, h / 2, w * 0.06, w / 2, h / 2, w * 0.5);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  const bgTex = (c1, c2) => canvasTex(512, 512, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h * 0.3, 10, w / 2, h * 0.45, w * 0.78);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });

  /* --- 재질과 도형 도우미 --- */
  const M = {
    pl: (c, r = 0.55, o = {}) => new T.MeshStandardMaterial({ color: c, roughness: r, metalness: 0, ...o }),
    gl: (c, r = 0.32, o = {}) => new T.MeshPhysicalMaterial({ color: c, roughness: r, clearcoat: 0.65, clearcoatRoughness: 0.22, ...o }),
    mt: (c, r = 0.32, o = {}) => new T.MeshStandardMaterial({ color: c, roughness: r, metalness: 1, ...o }),
    rub: () => new T.MeshStandardMaterial({ color: 0x1c1c1d, roughness: 0.92 }),
    clr: (c = 0xffffff, o = {}) => new T.MeshPhysicalMaterial({ color: c, roughness: 0.08, transmission: 1, thickness: 3, ior: 1.46, ...o }),
    em: (c, i = 2.2) => new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 }),
    tx: (map, o = {}) => new T.MeshStandardMaterial({ map, roughness: 0.6, ...o }),
  };
  function add(par, geo, mat, p = [0, 0, 0], r = null, o = {}) {
    const m = new T.Mesh(geo, mat);
    m.position.set(p[0], p[1], p[2]);
    if (r) m.rotation.set(r[0], r[1], r[2]);
    m.castShadow = o.cast !== false;
    m.receiveShadow = o.recv !== false;
    if (o.cast === false) m.userData.noCast = true;
    par.add(m);
    return m;
  }
  function bx(par, mat, [x0, x1], [y0, y1], [z0, z1], r = 0, o) {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    const rr = Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01);
    const geo = rr > 0.05 ? new X.RoundedBoxGeometry(w, h, d, 2, rr) : new T.BoxGeometry(w, h, d);
    return add(par, geo, mat, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], null, o);
  }
  function cyl(par, mat, axis, p, r, len, seg = 24, o = {}) {
    const geo = new T.CylinderGeometry(r, r, len, seg, 1, !!o.open);
    const rot = axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : null;
    return add(par, geo, mat, p, rot, o);
  }
  function placeRod(m, A, B) {
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.scale.set(1, Math.max(A.distanceTo(B), 0.01), 1);
    m.quaternion.setFromUnitVectors(UP, B.clone().sub(A).normalize());
  }
  function rod(par, mat, a, b, r, seg = 14) {
    const m = add(par, new T.CylinderGeometry(r, r, 1, seg), mat);
    placeRod(m, V(...a), V(...b));
    return m;
  }
  const curveOf = (pts, closed = false) => new T.CatmullRomCurve3(pts.map(p => (Array.isArray(p) ? V(...p) : p)), closed, 'centripetal');
  function tube(par, mat, pts, r, seg = 90, o = {}) {
    return add(par, new T.TubeGeometry(curveOf(pts), seg, r, o.radial || 8, false), mat, [0, 0, 0], null, o);
  }
  function frames(curve, n, ref) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = curve.getPointAt(t), tg = curve.getTangentAt(t);
      let s = ref.clone().addScaledVector(tg, -ref.dot(tg));
      if (s.lengthSq() < 1e-6) s = V(1, 0, 0).addScaledVector(tg, -tg.x);
      s.normalize();
      out.push({ p, tg, s, n: V().crossVectors(tg, s).normalize() });
    }
    return out;
  }
  function ribbonGeo(curve, width, n, ref) {
    const F = frames(curve, n, ref), len = curve.getLength();
    const pos = [], nor = [], uv = [], idx = [];
    F.forEach((f, i) => {
      const a = f.p.clone().addScaledVector(f.s, -width / 2), b = f.p.clone().addScaledVector(f.s, width / 2);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      nor.push(f.n.x, f.n.y, f.n.z, f.n.x, f.n.y, f.n.z);
      const u = (i / n) * len / width;
      uv.push(u, 0, u, 1);
      if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    });
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }
  function flatCable(par, pts, colors, r = 0.72, gap = 1.5, ref = V(0, 0, 1)) {
    const curve = curveOf(pts), n = 140, F = frames(curve, n, ref);
    colors.forEach((c, k) => {
      const off = (k - (colors.length - 1) / 2) * gap;
      const cc = new T.CatmullRomCurve3(F.map(f => f.p.clone().addScaledVector(f.s, off)), false, 'catmullrom', 0.5);
      add(par, new T.TubeGeometry(cc, n, r, 7, false), M.pl(c, 0.45));
    });
  }
  function rr(Cls, x0, y0, x1, y1, r) {
    const s = new Cls();
    s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r);
    s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1);
    s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r);
    s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
    return s;
  }
  const poly = (Cls, pts) => new Cls(pts.map(([a, b]) => new T.Vector2(a, b)));
  function slab(par, mat, shape, y0, h, o = {}) {
    const geo = new T.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: o.curve || 10 });
    geo.rotateX(Math.PI / 2);
    geo.translate(0, y0 + h, 0);
    return add(par, geo, mat, [0, 0, 0], null, o);
  }
  const area2 = pts => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
  function offsetPoly(pts, d, closed) {
    const n = pts.length, out = [];
    const seg = i => { const p = pts[i], q = pts[(i + 1) % n], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1; return { nx: -dy / L, ny: dx / L }; };
    for (let i = 0; i < n; i++) {
      const a = closed || i > 0 ? seg((i - 1 + n) % n) : null, b = closed || i < n - 1 ? seg(i) : null, P = pts[i];
      if (a && b) {
        let mx = a.nx + b.nx, my = a.ny + b.ny; const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;
        const k = d / Math.max(mx * b.nx + my * b.ny, 0.35);
        out.push([P[0] + mx * k, P[1] + my * k]);
      } else { const s = a || b; out.push([P[0] + s.nx * d, P[1] + s.ny * d]); }
    }
    return out;
  }
  function bandMesh(par, mat, shape, x0, x1) {
    const geo = new T.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false });
    geo.rotateY(Math.PI / 2);
    geo.translate(x0, 0, 0);
    return add(par, geo, mat);
  }
  const toS = p => new T.Vector2(-p[0], p[1]);
  function strapLoop(par, mat, pts, t, x0, x1) {
    const outer = offsetPoly(pts, area2(pts) > 0 ? -t : t, true);
    const shape = new T.Shape(outer.map(toS));
    shape.holes.push(new T.Path(pts.map(toS)));
    return bandMesh(par, mat, shape, x0, x1);
  }
  function strapOpen(par, mat, pts, t, x0, x1) {
    const a = offsetPoly(pts, t / 2, false), b = offsetPoly(pts, -t / 2, false).reverse();
    return bandMesh(par, mat, new T.Shape([...a, ...b].map(toS)), x0, x1);
  }
  class Helix extends T.Curve {
    constructor(r, h, turns) { super(); this.r = r; this.h = h; this.n = turns; }
    getPoint(t, out = new T.Vector3()) { const a = t * this.n * Math.PI * 2; return out.set(Math.cos(a) * this.r, t * this.h, Math.sin(a) * this.r); }
  }

  /* --- 치수 (mm). 원점: 짐칸 뒤끝, X 앞, Y 위, Z 오른쪽 --- */
  const RX = 87, FX = 277, WY = 35.5;
  const PX = 52, PZ = -41.5, PT = 101.6;
  const rig = { wheels: [], frontPivots: [], knuckles: [], tie: null, tieEnds: [], horn: null, drag: null, dragEnds: [], fan: null, camHead: null, planEdges: null };
  const pb = (g, mat, u0, u1, v0, v1, h0, h1, r = 0, o) => bx(g, mat, [PX + v0, PX + v1], [PT + h0, PT + h1], [PZ + u0, PZ + u1], r, o);
  const TBS = [['A', [188, 84.5, 37.2], 0], ['B', [246, 104, -35], -0.12], ['C', [246, 104, 35], 0.1], ['D', [278, 104, 35.5], 0], ['E', [278, 104, -35.5], 0]];
  const tbP = (name, slot, back = 0, dy = 0) => {
    const [, [x, y, z], yaw] = TBS.find(t => t[0] === name);
    const lx = -9.9 - back, lz = -5.87 + slot * 5.87;
    return [x + lx * Math.cos(yaw) + lz * Math.sin(yaw), y + 5.1 + dy, z - lx * Math.sin(yaw) + lz * Math.cos(yaw)];
  };

  function tireGeometry() {
    const prof = [[21.6, -12.4], [24.6, -13.3], [28.4, -13.5], [31, -12.9], [32.5, -11.5], [33, -9.4], [33.2, -5], [33.25, 0], [33.2, 5], [33, 9.4], [32.5, 11.5], [31, 12.9], [28.4, 13.5], [24.6, 13.3], [21.6, 12.4]];
    const carcass = new T.LatheGeometry(prof.map(([r, y]) => new T.Vector2(r, y)), 72);
    carcass.rotateX(Math.PI / 2);
    const list = [carcass];
    const lug = (a, r, z, h, w, d) => { const g = new X.RoundedBoxGeometry(h, w, d, 1, 0.7); g.translate(r, 0, z); g.rotateZ(a); return g; };
    const N = 22;
    for (let i = 0; i < N; i++) for (const row of [-1, 1]) {
      const a = ((i + (row > 0 ? 0.5 : 0)) / N) * Math.PI * 2;
      list.push(lug(a, 34.25, row * 5.4, 2.5, 7.2, 8.4));
      list.push(lug(a + row * 0.05, 31.8, row * 11, 4.2, 5.2, 4.4));
    }
    return X.BufferGeometryUtils.mergeGeometries(list.map(g => (g.index ? g.toNonIndexed() : g)), false);
  }
  function rimInto(w, s, RIM, DK, BOLT, NUT) {
    add(w, new T.CylinderGeometry(21.8, 21.8, 22, 40, 1, true), RIM, [0, 0, 0], [Math.PI / 2, 0, 0]);
    const prof = [[22.9, 0], [22.9, 1.7], [20.4, 1.9], [19.8, 0.6], [11, -0.9], [9.8, 1], [6, 1.4], [3, 1.4], [0.01, 1.4]];
    const face = new T.LatheGeometry(prof.map(([r, y]) => new T.Vector2(r, y)), 48);
    face.rotateX(Math.PI / 2);
    const f = add(w, face, RIM, [0, 0, s * 10.6]);
    if (s < 0) f.rotation.y = Math.PI;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; cyl(w, DK, 'z', [Math.cos(a) * 15.2, Math.sin(a) * 15.2, s * 10.7], 2.5, 1, 16); }
    add(w, new T.TorusGeometry(21.4, 1.1, 8, 48), RIM, [0, 0, s * 12.4]);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; cyl(w, BOLT, 'z', [Math.cos(a) * 21.4, Math.sin(a) * 21.4, s * 13.4], 0.75, 0.9, 8); }
    cyl(w, NUT, 'z', [0, 0, s * 12.4], 3.1, 3, 6);
  }
  function axleBody(g, x, front) {
    const K = M.pl(0x2a2b2e, 0.42), H = M.mt(0xa0a5ab, 0.3);
    cyl(g, K, 'z', [x, WY, 0], 4.6, 62);
    const pk = add(g, new T.SphereGeometry(12.5, 32, 24), K, [x, WY + 1, 3]);
    pk.scale.set(1.02, 1, 0.8);
    cyl(g, M.pl(0x343539, 0.45), 'z', [x, WY + 1, -6.5], 9.5, 2.2, 28);
    const dir = front ? -1 : 1;
    cyl(g, K, 'x', [x + dir * 10, WY + 2.5, 0], 6, 12, 20);
    for (const s of [-1, 1]) {
      bx(g, K, [x - 4, x + 4], [WY - 12.5, WY - 4.5], [s * 20 - 2.6, s * 20 + 2.6], 0.8);
      bx(g, K, [x - 3, x + 3], [WY + 2, WY + 9], [s * 31 - 3, s * 31 + 3], 0.8);
    }
    bx(g, K, [x - 3.5 + dir * 3, x + 3.5 + dir * 3], [WY + 9, WY + 15], [-10, 10], 0.8);
    return { K, H };
  }

  /* --- 부품별 모델 --- */
  const B = {
    bed(g) {
      const W = M.gl(0xf3f3f0), A = Math.asin(23 / 44);
      const side = new T.Shape();
      side.moveTo(0, 58); side.lineTo(RX - Math.cos(A) * 44, 58);
      side.absarc(RX, WY - 0.5, 44, Math.PI - A, A, true);
      side.lineTo(156, 58); side.lineTo(156, 104); side.lineTo(0, 104); side.closePath();
      for (const s of [-1, 1]) {
        const geo = new T.ExtrudeGeometry(side, { depth: 2.4, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 2, curveSegments: 32 });
        geo.translate(0, 0, s > 0 ? 50.6 : -53);
        add(g, geo, W);
        const f = add(g, new T.TorusGeometry(44.7, 2.2, 10, 44, Math.PI - 2 * A), W, [RX, WY - 0.5, s * 53.3]);
        f.rotation.z = A;
        bx(g, W, [3, 153], [88.8, 90.6], [s * 53.4 - 0.7, s * 53.4 + 0.7], 0.5);
        bx(g, M.gl(0xb3241c, 0.25), [-0.9, 0.6], [92, 101], s > 0 ? [42, 50.5] : [-50.5, -42], 0.6);
      }
      bx(g, W, [0, 2.6], [60, 104], [-52, 52], 0.8);
      bx(g, M.pl(0xe2e2de, 0.5), [-0.7, 0.2], [70, 88], [-30, 30], 0.6);
      bx(g, W, [151.4, 156], [62, 104], [-52, 52], 0.8);
      bx(g, W, [2, 152], [93.5, 97.5], [-50.6, 50.6]);
      const rim = rr(T.Shape, -1, -54.4, 157, 54.4, 3);
      rim.holes.push(rr(T.Path, 3, -50.2, 151.2, 50.2, 1.5));
      slab(g, W, rim, 104, 2.2);
      bx(g, M.tx(velcroTex(6, 4), { roughness: 1 }), [3, 151], [97.5, 99.6], [-50, 50]);
    },
    frame(g) {
      const K = M.pl(0x1d1d1f, 0.5), S = M.mt(0x8e9399, 0.35);
      const rail = poly(T.Shape, [[22, 64], [40, 56], [250, 56], [298, 60], [314, 64], [314, 78], [22, 78]]);
      for (const [a, b] of [[56, 82], [104, 132], [196, 222], [236, 258]]) rail.holes.push(rr(T.Path, a, 61, b, 71.5, 3));
      for (const s of [-1, 1]) {
        const geo = new T.ExtrudeGeometry(rail, { depth: 3.2, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 1 });
        geo.translate(0, 0, s > 0 ? 21.4 : -24.6);
        add(g, geo, K);
        for (const x of [30, 46, 94, 150, 172, 190, 232, 270, 306]) cyl(g, S, 'z', [x, 74.5, s * 25.2], 1.6, 1.1, 12);
        for (const x of [RX + 58, FX - 58]) bx(g, K, [x - 4.5, x + 4.5], [49.5, 57], [s * 20 - 3, s * 20 + 3], 0.6);
        bx(g, K, [92, 102], [64, 78], s > 0 ? [24.6, 28.6] : [-28.6, -24.6], 1);
      }
      for (const x of [30, 120, 210, 304]) bx(g, K, [x - 4, x + 4], [68, 77], [-21.6, 21.6], 0.8);
      g.userData.anchor = V(300, 82, 26);
      for (const x of [RX + 50, FX - 50]) bx(g, K, [x - 5, x + 5], [57, 64], [-19, 19], 0.8);
      bx(g, K, [316, 325], [56, 70], [-40, 40], 2.5);
      bx(g, K, [312, 318], [60, 68], [-26, 26]);
      bx(g, K, [10, 22], [58, 68], [-16, 16], 2);
      for (const [x, z] of [[238, -20], [238, 20], [300, -20], [300, 20]]) cyl(g, K, 'y', [x, 80, z], 2.6, 4.4, 12);
      for (const [x, z] of [[40, -18], [40, 18], [130, -18], [130, 18]]) cyl(g, K, 'y', [x, 86, z], 2.6, 16, 12);
    },
    drive(g) {
      const K = M.pl(0x232326, 0.42), K2 = M.pl(0x2e2f33, 0.5), D = M.mt(0x3b3e43, 0.35);
      bx(g, K, [140, 188], [36, 62], [-14, 14], 4);
      for (const s of [-1, 1]) bx(g, K2, [146, 182], [39, 59], [s * 14 - 1.6, s * 14 + 1.6], 2);
      cyl(g, D, 'x', [136, 44, 0], 4.2, 8, 16);
      cyl(g, D, 'x', [192, 44, 0], 4.2, 8, 16);
      const mot = new T.Group();
      mot.userData.ex = V(0, 22, 0);
      g.add(mot);
      cyl(mot, M.mt(0xc9cdd2, 0.3), 'x', [163, 68.5, 0], 11, 30, 36);
      cyl(mot, M.pl(0x2a2a2c, 0.5), 'x', [146.6, 68.5, 0], 10.2, 3.4, 30);
      cyl(mot, M.mt(0xb8a26a, 0.35), 'x', [179.6, 68.5, 0], 4, 3.2, 16);
      const BR = M.mt(0xc8a85a, 0.3);
      for (const z of [-4, 4]) bx(mot, BR, [143.6, 145.2], [70, 76], [z - 1.1, z + 1.1]);
      const SL = M.pl(0x5c6066, 0.5);
      for (const z of [-11.05, 11.05]) bx(mot, SL, [154, 158], [64, 73], [z - 0.15, z + 0.15]);
    },
    shafts(g) {
      const S = M.mt(0x3c3f44, 0.3), J = M.mt(0x9aa0a6, 0.28), C = M.mt(0x55595f, 0.35);
      const sh = (a, b) => {
        rod(g, S, a, b, 2.2);
        const A = V(...a), Bv = V(...b);
        rod(g, C, A.clone().lerp(Bv, 0.2).toArray(), A.clone().lerp(Bv, 0.62).toArray(), 3.2);
        for (const p of [a, b]) add(g, new T.SphereGeometry(3.6, 18, 12), J, p);
      };
      sh([131, 44, 0], [103, 38.5, 0]);
      sh([197, 44, 0], [261, 38.5, 0]);
      g.userData.anchor = V(232, 49, 0);
    },
    raxle(g) {
      const { K, H } = axleBody(g, RX, false);
      for (const s of [-1, 1]) {
        cyl(g, K, 'z', [RX, WY, s * 33], 6.5, 4, 20);
        cyl(g, H, 'z', [RX, WY, s * 36.5], 3.2, 6, 6);
      }
    },
    faxle(g) {
      const { K, H } = axleBody(g, FX, true);
      const KN = M.pl(0x2f3034, 0.4), BO = M.mt(0x9aa0a6, 0.3);
      for (const s of [-1, 1]) {
        bx(g, K, [FX - 6, FX + 6], [WY - 11, WY - 7], [s * 29 - 3, s * 29 + 3], 0.8);
        bx(g, K, [FX - 6, FX + 6], [WY + 7, WY + 11], [s * 29 - 3, s * 29 + 3], 0.8);
        const pv = new T.Group();
        pv.position.set(FX, WY, s * 35);
        g.add(pv);
        bx(pv, KN, [-5, 5], [-7, 7], [-3, 3], 1.2);
        bx(pv, KN, [-15, -3], [3, 6.5], [-2, 2], 0.8);
        if (s < 0) bx(pv, KN, [-2, 8], [8, 11], [-2, 2], 0.8);
        cyl(pv, H, 'z', [0, 0, s * 1.5], 3.2, 6, 6);
        cyl(pv, BO, 'y', [0, 7.6, 0], 1.6, 1.4, 10);
        rig.knuckles.push(pv);
      }
      rig.tie = add(g, new T.CylinderGeometry(1.5, 1.5, 1, 12), M.mt(0x8d9298, 0.3));
      rig.tieEnds = [0, 1].map(() => add(g, new T.SphereGeometry(2.4, 12, 10), H));
    },
    links(g) {
      const L = M.mt(0x2a2b2f, 0.35, { metalness: 0.6 }), E = M.mt(0x8d9298, 0.3);
      const defs = [];
      for (const s of [-1, 1]) {
        defs.push([[RX + 4, WY - 8.5, s * 20], [RX + 58, 53, s * 20]], [[RX + 7, WY + 12, s * 6], [RX + 50, 60.5, s * 16]]);
        defs.push([[FX - 4, WY - 8.5, s * 20], [FX - 58, 53, s * 20]], [[FX - 7, WY + 12, s * 6], [FX - 50, 60.5, s * 16]]);
      }
      for (const [a, b] of defs) {
        const sg = new T.Group();
        sg.userData.ex = V(0, 0, Math.sign(a[2]) * 9);
        g.add(sg);
        rod(sg, L, a, b, 1.9);
        const A = V(...a), Bv = V(...b);
        rod(sg, L, A.clone().lerp(Bv, 0.42).toArray(), A.clone().lerp(Bv, 0.58).toArray(), 2.6, 6);
        for (const p of [a, b]) add(sg, new T.SphereGeometry(2.9, 14, 10), E, p);
        if (a[0] === FX - 4 && a[2] > 0) { g.userData.anchorObj = sg; g.userData.anchorLocal = V(FX - 31, 49, 20); }
      }
    },
    shocks(g) {
      const BODY = M.mt(0x1d1e21, 0.32, { metalness: 0.7 }), SPR = M.mt(0x4a4e55, 0.3), CH = M.mt(0xdfe2e5, 0.12), CAP = M.mt(0x9aa0a6, 0.3);
      const list = [];
      for (const s of [-1, 1]) {
        list.push([[RX + 8, WY + 5, s * 31], [RX + 10, 74, s * 26.6]]);
        list.push([[FX - 9, WY + 5, s * 31], [FX - 15, 81, s * 28]]);
      }
      for (const [a, b] of list) {
        const sg = new T.Group();
        sg.userData.ex = V(0, 0, Math.sign(a[2]) * 24);
        g.add(sg);
        const A = V(...a), Bv = V(...b), L = A.distanceTo(Bv);
        const sh = new T.Group();
        sh.position.copy(A);
        sh.quaternion.setFromUnitVectors(UP, Bv.clone().sub(A).normalize());
        sg.add(sh);
        cyl(sh, BODY, 'y', [0, L * 0.68, 0], 4.2, L * 0.56, 20);
        cyl(sh, CH, 'y', [0, L * 0.25, 0], 1.3, L * 0.5, 10);
        add(sh, new T.TubeGeometry(new Helix(5.4, L * 0.72, 6.5), 120, 0.75, 6), SPR, [0, L * 0.1, 0]);
        cyl(sh, CAP, 'y', [0, L * 0.1, 0], 6.2, 1.2, 20);
        cyl(sh, CAP, 'y', [0, L * 0.84, 0], 6.2, 1.2, 20);
        for (const y of [0, L]) add(sh, new T.TorusGeometry(2.4, 0.9, 8, 16), CAP, [0, y, 0]);
        if (a[0] === FX - 9 && a[2] > 0) { g.userData.anchorObj = sg; g.userData.anchorLocal = V(FX - 15, 88, 28); }
      }
    },
    wheels(g) {
      const tireGeo = tireGeometry();
      const R = M.rub(), RIM = M.pl(0x1f2022, 0.42, { metalness: 0.25, side: T.DoubleSide }), DK = M.pl(0x0b0b0c, 0.85), BOLT = M.mt(0x6b7076, 0.3), NUT = M.mt(0xb5bac0, 0.25);
      for (const [x, s, front] of [[RX, -1, 0], [RX, 1, 0], [FX, -1, 1], [FX, 1, 1]]) {
        const pv = new T.Group();
        pv.position.set(x, WY, s * 35);
        pv.userData.ex = V(0, 0, s * 70);
        g.add(pv);
        const w = new T.Group();
        w.position.set(0, 0, s * 9);
        pv.add(w);
        add(w, tireGeo, R);
        rimInto(w, s, RIM, DK, BOLT, NUT);
        rig.wheels.push(w);
        if (front) rig.frontPivots.push(pv);
        if (front && s > 0) { g.userData.anchorObj = pv; g.userData.anchorLocal = V(0, 41, 9); }
      }
    },
    servo(g) {
      const R = M.gl(0xb8281f, 0.35), K = M.pl(0x1b1b1b, 0.45);
      bx(g, R, [292, 304], [52, 74], [-14, 9], 1.6);
      bx(g, R, [292.5, 303.5], [65, 67.4], [-18.5, 13.5], 0.6);
      const BO = M.mt(0x9aa0a6, 0.3);
      for (const z of [-16.5, 11.5]) cyl(g, BO, 'y', [298, 67.8, z], 1.3, 1, 10);
      bx(g, M.pl(0xf0f0ee, 0.5), [304, 304.4], [58, 68], [-10, 4]);
      cyl(g, M.pl(0xdedede, 0.4), 'y', [298, 50.8, -7], 3, 2.6, 18);
      const horn = new T.Group();
      horn.position.set(298, 48.8, -7);
      g.add(horn);
      bx(horn, K, [-11, 2.4], [-1.1, 1.1], [-2.1, 2.1], 0.6);
      cyl(horn, M.mt(0xb5bac0, 0.25), 'y', [0, -1.4, 0], 1.5, 1, 10);
      rig.horn = horn;
      flatCable(g, [[293, 70, -14], [289, 74, -18], [287, 77, -24], [287.6, 79.5, -27.6]], [0x1d1d1d, 0xc8231c, 0xf2f2f2], 0.65, 1.4);
    },
    steerlink(g) {
      rig.drag = add(g, new T.CylinderGeometry(1.5, 1.5, 1, 12), M.mt(0x8d9298, 0.3));
      const E = M.mt(0xb0b5bb, 0.25);
      rig.dragEnds = [0, 1].map(() => add(g, new T.SphereGeometry(2.3, 12, 10), E));
    },
    frontbox(g) {
      const K = M.pl(0x1c1c1e, 0.4), K2 = M.pl(0x252629, 0.45), S = M.mt(0x8e9399, 0.32);
      slab(g, K, poly(T.Shape, [[228, -48], [306, -48], [318, -36], [318, 36], [306, 48], [228, 48]]), 82, 22);
      const ring = poly(T.Shape, [[227, -49.2], [306.5, -49.2], [319.2, -36.5], [319.2, 36.5], [306.5, 49.2], [227, 49.2]]);
      ring.holes.push(poly(T.Path, [[231, -45], [304.6, -45], [315, -34.6], [315, 34.6], [304.6, 45], [231, 45]]));
      slab(g, K2, ring, 104, 2.2);
      bx(g, K, [302, 321], [79, 87], [-30, 30], 1.5);
      for (const z of [-22, 22]) cyl(g, S, 'x', [321.2, 83, z], 1.6, 0.8, 12);
      for (const x of [240, 262, 290]) for (const s of [-1, 1]) cyl(g, S, 'z', [x, 93, s * 48.4], 1.5, 0.8, 12);
      for (const s of [-1, 1]) bx(g, K, [258, 266], [76, 82], [s * 28 - 3, s * 28 + 3], 0.8);
    },
    plate(g) {
      const mat = new T.MeshPhysicalMaterial({ color: 0xf1f4f5, map: corrugatedTex(), roughness: 0.45, transparent: true, opacity: 0.93, clearcoat: 0.3 });
      bx(g, mat, [156.5, 230], [81, 84.5], [-55, 55], 0.6);
    },
    pi(g) {
      const tex = piTex();
      tex.repeat.set(1 / 56, 1 / 85);
      tex.offset.set(-PX / 56, -PZ / 85);
      const pcb = rr(T.Shape, PX, PZ, PX + 56, PZ + 85, 3);
      for (const [v, u] of [[3.5, 3.5], [52.5, 3.5], [3.5, 61.5], [52.5, 61.5]]) { const h = new T.Path(); h.absarc(PX + v, PZ + u, 1.35, 0, Math.PI * 2, true); pcb.holes.push(h); }
      slab(g, [M.tx(tex, { roughness: 0.5 }), M.pl(0x1d5e36, 0.6)], pcb, PT - 1.6, 1.6, { curve: 16 });
      const SV = M.mt(0xc4c8cd, 0.28), DK = M.pl(0x0f1011, 0.7), BK = M.pl(0x161616, 0.5), GD = M.mt(0xd6b25e, 0.25), BG = M.pl(0xe9dfc6, 0.5);
      pb(g, SV, 7, 16, -1.6, 6, 0, 3.2, 1.2);
      pb(g, DK, 8.3, 14.7, -1.75, -1.3, 0.8, 2.4, 0.4);
      for (const c of [25.8, 39.2]) { pb(g, SV, c - 3.6, c + 3.6, -1.2, 6.3, 0, 3.4, 0.6); pb(g, DK, c - 2.7, c + 2.7, -1.35, -0.9, 0.8, 2.6); }
      for (const [u0, u1] of [[43.6, 54.4], [55.2, 65]]) { pb(g, BG, u0, u1, 2.5, 6.5, 0, 4.4, 0.3); pb(g, BK, u0 - 0.2, u1 + 0.2, 2.2, 3.9, 3.8, 5, 0.3); }
      pb(g, SV, 65.6, 87.6, 2, 18, 0, 13.5, 0.8);
      pb(g, DK, 87.4, 87.8, 4.2, 15.8, 1.6, 11);
      pb(g, M.em(0x3ddc68, 1.4), 87.5, 87.9, 3, 4.6, 11.4, 12.4);
      pb(g, M.em(0xffb020, 1.4), 87.5, 87.9, 15.4, 17, 11.4, 12.4);
      for (const [v0, v1, tongue] of [[21.3, 34.4, 0x2b6fe3], [39.3, 52.4, 0x1a1a1a]]) {
        pb(g, SV, 70.4, 88.1, v0, v1, 0, 16, 0.8);
        const TG = M.pl(tongue, 0.45);
        for (const [h0, h1] of [[1.6, 7], [9, 14.4]]) { pb(g, DK, 87.9, 88.3, v0 + 1.2, v1 - 1.2, h0, h1); pb(g, TG, 87.95, 88.35, v0 + 2.2, v1 - 2.2, h0 + 1.8, h0 + 3.4); }
      }
      pb(g, BK, 6, 56.4, 49.6, 54.7, 0, 2.5, 0.3);
      const pins = [];
      for (let i = 0; i < 20; i++) for (const v of [50.9, 53.44]) { const b = new T.BoxGeometry(0.64, 6.4, 0.64); b.translate(PX + v, PT + 5.7, PZ + 7.1 + i * 2.54); pins.push(b); }
      add(g, X.BufferGeometryUtils.mergeGeometries(pins), GD, [0, 0, 0], null, { cast: false });
      pb(g, M.pl(0xf2f2ef, 0.5), 58.6, 63.6, 44.4, 47.4, 0, 4.4, 0.3);
      pb(g, M.pl(0x2a2b2d, 0.35), 55, 63, 26, 34, 0, 1.1, 0.4);
      pb(g, BK, 0.6, 3.6, 7.8, 11.8, 0, 1.6, 0.4);
      pb(g, BG, 0.8, 4.6, 19, 35, 0, 2.4, 0.3);
      const cool = new T.Group();
      cool.userData.ex = V(0, 26, 0);
      g.add(cool);
      const AL = M.mt(0xd2d5d9, 0.36);
      pb(cool, AL, 12, 58, 12, 44, 2.6, 4.6, 0.6);
      for (let k = 0; k < 9; k++) { const v = 13.2 + k * 3.6; pb(cool, AL, 12.6, 33.4, v, v + 1, 4.6, 12, 0.3); }
      const fr = rr(T.Shape, PX + 16, PZ + 34, PX + 40, PZ + 58, 2.2);
      const hole = new T.Path();
      hole.absarc(PX + 28, PZ + 46, 11, 0, Math.PI * 2, true);
      fr.holes.push(hole);
      slab(cool, M.pl(0x18191b, 0.5), fr, PT + 4.6, 6.8, { curve: 24 });
      const fan = new T.Group();
      fan.position.set(PX + 28, PT + 8.2, PZ + 46);
      cool.add(fan);
      rig.fan = fan;
      cyl(fan, M.pl(0x2c2d30, 0.4), 'y', [0, 0, 0], 4.4, 4.2, 24);
      const BL = M.pl(0x3a3c40, 0.45);
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        const bl = add(fan, new T.BoxGeometry(6.4, 0.6, 3.4), BL, [Math.cos(a) * 7.4, 0, Math.sin(a) * 7.4]);
        bl.rotation.order = 'YXZ';
        bl.rotation.set(deg(28), -a, 0);
      }
    },
    pca(g) {
      const tex = pcaTex();
      tex.repeat.set(1 / 25, 1 / 62);
      tex.offset.set(-118 / 25, 31 / 62);
      const sh = rr(T.Shape, 118, -31, 143, 31, 1.5);
      for (const [x, z] of [[120.5, -28.5], [140.5, -28.5], [120.5, 28.5], [140.5, 28.5]]) { const h = new T.Path(); h.absarc(x, z, 1.3, 0, Math.PI * 2, true); sh.holes.push(h); }
      slab(g, [M.tx(tex, { roughness: 0.48 }), M.pl(0x1a3fae, 0.6)], sh, PT - 1.6, 1.6, { curve: 12 });
      const rows = [[119.6, 0x1c1c1c], [122.14, 0xc8231c], [124.68, 0xe9b80d]];
      for (const [x, col] of rows) bx(g, M.pl(col, 0.45), [x - 1.25, x + 1.25], [PT, PT + 2.5], [CHZ(0) - 1.25, CHZ(15) + 1.25]);
      const pins = [];
      for (const [x] of rows) for (let c = 0; c < 16; c++) { const b = new T.BoxGeometry(0.64, 6, 0.64); b.translate(x, PT + 5.5, CHZ(c)); pins.push(b); }
      for (let k = 0; k < 6; k++) for (const z of [-29.4, 29.4]) { const b = new T.BoxGeometry(0.64, 6, 0.64); b.translate(126.3 + k * 2.54, PT + 5.5, z); pins.push(b); }
      add(g, X.BufferGeometryUtils.mergeGeometries(pins), M.mt(0xd8b462, 0.25), [0, 0, 0], null, { cast: false });
      const HK = M.pl(0x161616, 0.5);
      for (const z of [-29.4, 29.4]) bx(g, HK, [125, 140], [PT, PT + 2.5], [z - 1.25, z + 1.25]);
      const CN = M.pl(0x151515, 0.45);
      for (const c of [0, 1]) bx(g, CN, [118.3, 126], [PT + 2.5, PT + 16], [CHZ(c) - 1.24, CHZ(c) + 1.24], 0.3);
      bx(g, M.pl(0x2f8f50, 0.45), [135, 142.6], [PT, PT + 9.5], [3, 13], 0.6);
      const SC = M.mt(0xbfc3c8, 0.3), SL = M.pl(0x333333, 0.5);
      for (const z of [5.5, 10.5]) { cyl(g, SC, 'y', [138.8, PT + 9.7, z], 1.6, 0.6, 14); bx(g, SL, [138, 139.6], [PT + 10, PT + 10.15], [z - 0.25, z + 0.25]); }
      cyl(g, M.pl(0x1b2440, 0.35), 'y', [137.5, PT + 5.5, -9], 3.15, 11, 20);
      cyl(g, M.mt(0xc0c4c9, 0.3), 'y', [137.5, PT + 11.05, -9], 3, 0.15, 20);
      bx(g, M.pl(0x131313, 0.3), [129, 135], [PT, PT + 1.1], [-16, -6], 0.2);
      const RA = M.pl(0x202020, 0.4);
      for (let k = 0; k < 4; k++) bx(g, RA, [127.6, 129], [PT, PT + 0.6], [CHZ(k * 4) + 1, CHZ(k * 4) + 6]);
      bx(g, M.em(0xff2a1a, 2.6), [139.6, 141], [PT, PT + 0.8], [-22.5, -21]);
    },
    esc(g) {
      bx(g, M.pl(0xa82a20, 0.5), [161, 195], [86, 87.6], [-51, -31]);
      const MO = M.pl(0x151515, 0.35);
      for (const [x, z] of [[166, -47], [166, -41], [172, -47], [172, -41]]) bx(g, MO, [x - 2.4, x + 2.4], [87.6, 89.4], [z - 2, z + 2], 0.3);
      cyl(g, M.pl(0x1d1f3a, 0.4), 'y', [183, 91.6, -42], 3.8, 8, 18);
      bx(g, M.pl(0x151515, 0.4), [187, 193], [87.6, 90.6], [-36.5, -32.5], 0.4);
      bx(g, M.pl(0xf2f2f2, 0.4), [189, 191], [90.6, 92], [-35.2, -33.8]);
      bx(g, M.em(0xff2b1d, 1.8), [176, 177.4], [87.6, 88.4], [-34, -32.6]);
      bx(g, M.clr(0xd7ecff, { roughness: 0.22, thickness: 1.2 }), [159.5, 196.5], [85, 96], [-52.2, -29.8], 3, { cast: false });
    },
    ubec(g) {
      bx(g, M.pl(0x1f3c9e, 0.5), [201, 227], [85.8, 87.2], [-51, -35]);
      bx(g, M.pl(0x202020, 0.5), [207, 215], [87.2, 92], [-47, -39], 0.6);
      add(g, new T.PlaneGeometry(10, 12), M.tx(ubecTex(), { roughness: 0.5 }), [221, 87.3, -43], [-Math.PI / 2, 0, 0], { cast: false });
      bx(g, M.clr(0xd7ecff, { roughness: 0.22, thickness: 1.2 }), [200, 228], [85, 93.4], [-52.2, -33.8], 3, { cast: false });
    },
    battery(g) {
      cyl(g, M.gl(0x2059d4, 0.3), 'z', [165.5, 94, 8], 9.25, 72, 40);
      cyl(g, M.pl(0x163f9a, 0.45), 'z', [165.5, 94, 8], 9.4, 1.4, 40);
      const EC = M.pl(0x183f99, 0.5);
      for (const z of [-28.4, 44.4]) cyl(g, EC, 'z', [165.5, 94, z], 8.4, 0.8, 32);
      bx(g, M.pl(0xf3f3f1, 0.45), [160.5, 170.5], [89.5, 98.5], [46, 55], 1);
    },
    terminals(g) {
      TBS.forEach(([, [x, y, z], yaw], k) => {
        const t = new T.Group();
        t.position.set(x, y, z);
        t.rotation.y = yaw;
        t.userData.ex = V(0, 3 + k * 2.5, 0);
        g.add(t);
        if (k === 1) { g.userData.anchorObj = t; g.userData.anchorLocal = V(0, 20, 0); }
        bx(t, M.clr(0xf4f8ff, { roughness: 0.1, thickness: 5 }), [-10.5, 10.5], [0, 12.3], [-8.8, 8.8], 1.9, { cast: false });
        bx(t, M.mt(0xd9dcdf, 0.3), [-7.5, 7.5], [3.4, 4.4], [-7.4, 7.4]);
        const HO = M.pl(0x2a2a2a, 0.6), LV = M.pl(0xf26a1d, 0.42);
        for (let i = 0; i < 3; i++) {
          const zc = -5.87 + i * 5.87;
          bx(t, HO, [-10.6, -10], [3, 7.6], [zc - 1.6, zc + 1.6]);
          const lv = new T.Group();
          lv.position.set(8.5, 12.3, zc);
          lv.rotation.z = -deg(5);
          t.add(lv);
          bx(lv, LV, [-16.5, 0], [0, 2.2], [-2.3, 2.3], 0.8);
          bx(lv, LV, [-16.5, -14], [2.2, 3.8], [-2.3, 2.3], 0.6);
        }
      });
    },
    powerbank(g) {
      bx(g, M.pl(0xf1f1ef, 0.5, { transparent: true, opacity: 0.62, depthWrite: false }), [4, 32.5], [99.8, 158.8], [-40.5, 40.5], 6, { cast: false });
      const LED = M.em(0x46d17a, 1.2);
      for (let i = 0; i < 4; i++) bx(g, LED, [32.4, 32.8], [136 + i * 3.6, 138.2 + i * 3.6], [-2, 2]);
      bx(g, M.pl(0x111111, 0.6), [32.3, 32.9], [103.6, 106.8], [-34, -25.4], 0.9);
      const CK = M.pl(0x1a1a1b, 0.5);
      bx(g, CK, [32.5, 40.5], [101.8, 108.6], [-33.8, -25.6], 1.2);
      tube(g, CK, [[40.5, 105.2, -29.7], [43, 107.5, -29.7], [45.5, 104.6, -29.7]], 1.7, 20);
      bx(g, CK, [44.5, 50.7], [100.6, 106.8], [-33.6, -25.8], 1.2);
      const edges = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(30.5, 61, 83)), new T.LineDashedMaterial({ color: 0x2a52e0, dashSize: 3, gapSize: 2.2 }));
      edges.position.set(18.25, 129.3, 0);
      edges.computeLineDistances();
      g.add(edges);
      rig.planEdges = edges;
    },
    camera(g) {
      const cam = new T.Group();
      cam.position.set(321.6, 124, 0);
      cam.rotation.z = -deg(15);
      g.add(cam);
      rig.camHead = cam;
      bx(cam, M.pl(0x0f1012, 0.5), [-0.6, 0.6], [-12, 12], [-12.5, 12.5], 0.8);
      const GR = M.mt(0xd8b462, 0.3);
      for (const [y, z] of [[-10.5, -10.5], [-10.5, 10.5], [10.5, -10.5], [10.5, 10.5]]) add(cam, new T.TorusGeometry(1.15, 0.35, 6, 16), GR, [0.65, y, z], [0, Math.PI / 2, 0]);
      bx(cam, M.pl(0x141414, 0.6), [0.6, 7.2], [-7.2, 7.2], [-7.2, 7.2], 0.8);
      cyl(cam, M.pl(0x121212, 0.42), 'x', [11.6, 0, 0], 7.1, 9, 40);
      cyl(cam, M.pl(0x1b1b1b, 0.32), 'x', [16.6, 0, 0], 7.6, 1.8, 40);
      const glass = new T.MeshPhysicalMaterial({ color: 0x0b1222, metalness: 0.1, roughness: 0.04, clearcoat: 1, iridescence: 0.85, iridescenceIOR: 1.7, iridescenceThicknessRange: [180, 520] });
      add(cam, new T.SphereGeometry(6, 32, 16, 0, Math.PI * 2, 0, deg(68)), glass, [11.6, 0, 0], [0, 0, -Math.PI / 2]);
      bx(cam, M.pl(0xe9e0c8, 0.5), [-1.3, 1.5], [12, 14.4], [-8.5, 8.5], 0.3);
      bx(cam, M.pl(0x2a2a2a, 0.5), [-1.6, -0.6], [-6, 4], [-6, 6]);
    },
    cammount(g) {
      [104.5, 127.6].forEach((y0, k) => {
        const cg = new T.Group();
        if (k) cg.userData.ex = V(0, 18, 0);
        g.add(cg);
        bx(cg, M.clr(0xfffaf0, { roughness: 0.06, thickness: 14, attenuationColor: new T.Color(0xf6e6c6), attenuationDistance: 80 }), [236, 306], [y0, y0 + 23], [-11, 11], 4.5, { cast: false });
        const st = M.tx(barcodeTex(), { roughness: 0.55 });
        if (k) add(cg, new T.PlaneGeometry(30, 15), st, [264, y0 + 23.06, 0], [-Math.PI / 2, 0, 0], { cast: false });
        else add(cg, new T.PlaneGeometry(30, 12), st, [262, y0 + 11.5, 11.06], null, { cast: false });
        cyl(cg, M.mt(0xbcc0c4, 0.25), 'x', [307.6, y0 + 11.5, 0], 6.8, 3.2, 32);
        cyl(cg, M.mt(0xcfa34a, 0.22), 'x', [314, y0 + 11.5, 0], 8, 9.6, 48);
        const RG = M.mt(0xb88f3c, 0.3);
        for (const x of [310.4, 312.6, 314.8, 317]) cyl(cg, RG, 'x', [x, y0 + 11.5, 0], 8.15, 0.5, 48);
      });
    },
    fpc(g) {
      const pts = [[325.2, 138.1, 0], [327, 146, 0], [325, 156, -1], [313, 162.5, -2], [290, 163.6, -3], [260, 162.6, -4], [228, 158, -4], [196, 150, -2], [160, 141, 1], [126, 133, 4], [96, 126, 6.5], [70, 119.5, 7.5], [58.6, 113, 7.5], [56.5, 108.6, 7.5], [56.5, 106.2, 7.5]];
      add(g, ribbonGeo(curveOf(pts), 12.5, 240, V(0, 0, 1)), new T.MeshStandardMaterial({ color: 0xffffff, map: fpcTex(), roughness: 0.38, metalness: 0.05, side: T.DoubleSide }));
    },
    servocables(g) {
      const SCOL = [0x5a3218, 0xc8231c, 0xe8a31a];
      flatCable(g, [[122.15, 117.6, -24.5], [121.5, 128, -24.5], [115, 150, -22], [101, 168, -16], [85, 173, -10], [71, 163, -6], [75, 146, -4], [93, 138, -6], [114, 134, -12], [134, 128, -22], [150, 118, -35], [161, 107, -48], [182, 101.6, -55], [214, 102.2, -56.5], [240, 97, -53], [262, 90, -52.5], [280, 83, -44], [286.6, 79.6, -31]], SCOL);
      bx(g, M.pl(0x151515, 0.45), [284.5, 290], [76, 83], [-31.5, -24.5], 0.5);
      flatCable(g, [[122.15, 117.6, -21.96], [123, 130, -21.5], [119, 152, -27], [109, 161, -34], [97, 156, -38], [98, 141, -36], [114, 130, -39], [134, 122, -43], [149, 112, -45], [158, 106, -44], [160, 97, -41], [159.6, 93, -41]], SCOL);
      g.userData.anchor = V(86, 180, -10);
    },
    powerwires(g) {
      const W = (col, pts, r = 0.95) => tube(g, M.pl(col, 0.42), pts, r, 140);
      const RED = 0xd42a1f, BLK = 0x232325;
      W(RED, [[167, 96, 55.5], [172, 96.5, 52], tbP('A', 2, 8, 1), tbP('A', 2)]);
      W(RED, [tbP('A', 1), tbP('A', 1, 7), [178, 95, 28], [196, 98.5, 44], [214, 91, 48], [218.6, 88.4, 48]]);
      bx(g, M.pl(0x161616, 0.5), [218.5, 226], [84.5, 89.5], [45, 51], 0.8);
      bx(g, M.pl(0xf2f2f2, 0.4), [221, 223.5], [89.5, 91], [46.6, 49.4]);
      W(RED, [[226, 88.4, 48], [230.5, 98, 47], [232.6, 108.2, 38], [232.4, 109.8, 0], tbP('B', 2, 8), tbP('B', 2)]);
      W(BLK, [[164, 93.5, 55.5], [176, 99, 59], [210, 103, 55], [229, 108.5, 47], tbP('C', 2, 8), tbP('C', 2)]);
      W(RED, [tbP('B', 1), tbP('B', 1, 8), [226, 104, -47], [212, 98, -50], [200.5, 93.5, -47], [197.4, 91, -46]]);
      W(RED, [tbP('B', 0), tbP('B', 0, 8), [232, 104, -30], [230.5, 96, -37], [228.8, 90.5, -40]]);
      W(BLK, [tbP('C', 1), tbP('C', 1, 8), [230, 111, 20], [229.6, 111.2, -18], [224, 103, -32], [205, 95, -38], [197.4, 90, -38]]);
      W(BLK, [tbP('C', 0), tbP('C', 0, 8), [231, 112.3, 12], [229.8, 112.4, -20], [229.4, 99, -42], [228.8, 89.5, -45]]);
      W(RED, [[197.4, 92, -33], [204, 97, -24], [222, 103.5, -6], [228.4, 109.4, 22], [240, 108.8, 47], [262, 108.5, 47.5], tbP('D', 1, 8), tbP('D', 1)]);
      W(BLK, [[197.4, 90, -48.5], [208, 96, -54], [236, 105.4, -51.5], [262, 108.4, -49], tbP('E', 1, 8), tbP('E', 1)]);
      W(RED, [tbP('D', 0), tbP('D', 0, 8), [262, 106.6, 30], [258, 106.6, 50], [254, 98, 55], [240, 86, 55], [222, 79.6, 47], [196, 79.6, 30], [172, 79.2, 14], [151, 78.5, 6], [145.6, 75, 4]]);
      W(BLK, [tbP('E', 0), tbP('E', 0, 8), [262, 106.6, -30], [258, 106.6, -50], [254, 98, -55], [240, 86, -55], [222, 79.6, -47], [196, 79.6, -30], [172, 79.2, -14], [151, 78.5, -6], [145.6, 75, -4]]);
      W(RED, [[199.6, 89.5, -46], [190, 98.5, -50.5], [172, 105, -46], [160, 109.5, -26], [153, 109, -4], [147.5, 107, 4.5], [143.3, 105.8, 5.5]], 0.75);
      W(BLK, [[199.6, 89.5, -42], [190, 98.5, -46.5], [172, 105.5, -42], [160, 110.5, -22], [153, 109.8, 2], [147.5, 107.5, 9.5], [143.3, 105.8, 10.5]], 0.75);
      g.userData.anchor = V(232, 118, 0);
    },
    i2c(g) {
      const pin = [[102.9, -34.4], [102.9, -31.86], [102.9, -29.32], [105.44, -29.32]];
      const pca = [136.46, 133.92, 131.38, 126.3];
      const cols = [0xd94a3a, 0x3d6fe0, 0xf0c02a, 0x2a2a2c];
      const HK = M.pl(0x141414, 0.45);
      const top = PT + 16.6;
      pin.forEach(([x, z], i) => {
        bx(g, HK, [x - 1.2, x + 1.2], [PT + 2.6, top], [z - 1.2, z + 1.2], 0.2);
        const cx = pca[i];
        bx(g, HK, [cx - 1.2, cx + 1.2], [PT + 2.6, top], [-30.6, -28.2], 0.2);
        tube(g, M.pl(cols[i], 0.45), [[x, top - 1, z], [x + 0.5, top + 5, z - 0.5 - i * 0.4], [x + 6, top + 12 + i * 1.6, z - 3 - i], [(x + cx) / 2, top + 15 + i * 1.8, -33 - i * 0.8], [cx - 5, top + 10 + i, -31.5], [cx, top + 4, -29.4], [cx, top - 1, -29.4]], 0.6, 60);
      });
    },
    velcro(g) {
      const mk = rep => M.tx(velcroTex(rep, 1), { roughness: 1, color: 0xd8d8d8 });
      const host = (follow, ex) => { const h = new T.Group(); h.userData.follow = follow; h.userData.ex = V(...ex); g.add(h); return h; };
      const s1 = host('bed', [-26, 54, 0]), s2 = host('bed', [-26, 54, 0]), s3 = host('plate', [0, 50, 0]);
      strapOpen(s1, mk(4), [[-55.2, 64], [-55.2, 106.8], [-49, 118.6], [49, 118.6], [55.2, 106.8], [55.2, 64]], 1.5, 82, 95);
      strapOpen(s2, mk(4), [[-55.2, 64], [-55.2, 106.8], [-46, 119.6], [46, 119.6], [55.2, 106.8], [55.2, 64]], 1.5, 141, 154);
      strapLoop(s3, mk(4), [[-56.5, 86], [-50, 100.6], [50, 100.6], [56.5, 86], [26, 53.4], [-26, 53.4]], 1.5, 199, 212);
      const VC = mk(4);
      for (const [x0, x1] of [[241, 253], [268, 280], [293, 305]]) strapLoop(host('cammount', [26, 100, 0]), VC, [[-12.9, 152.5], [12.9, 152.5], [47, 121], [50.3, 104.2], [50.3, 80.3], [-50.3, 80.3], [-50.3, 104.2], [-47, 121]], 1.5, x0, x1);
      g.userData.anchorObj = s1;
      g.userData.anchorLocal = V(88.5, 125, 0);
    },
  };

  /* --- 조립 --- */
  const model = new T.Group();
  scene.add(model);
  const parts = {};
  const pickables = [];
  for (const d of DEFS) {
    const g = new T.Group();
    g.name = d.id;
    model.add(g);
    B[d.id](g);
    const p = { id: d.id, def: d, group: g, ex: V(...d.ex), delay: d.d, mats: [], subs: [], label: null, el: null };
    g.traverse(o => {
      if (o.isMesh) {
        o.userData.part = d.id;
        pickables.push(o);
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if (m.userData.orig) continue;
          m.userData.orig = { transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite, transmission: m.transmission || 0, emissive: m.emissive ? m.emissive.getHex() : 0, ei: m.emissiveIntensity || 0 };
          p.mats.push(m);
        }
      }
      if (o.userData.ex) { o.userData.base = o.position.clone(); p.subs.push(o); }
    });
    parts[d.id] = p;
  }

  /* --- 조향 --- */
  let steerCur = 0, steerTarget = 0;
  function applySteer() {
    const a = steerCur;
    for (const pv of rig.frontPivots) pv.rotation.y = a;
    for (const k of rig.knuckles) k.rotation.y = a;
    const ends = rig.knuckles.map(k => V(-14, 4.8, 0).applyAxisAngle(UP, a).add(k.position));
    placeRod(rig.tie, ends[0], ends[1]);
    rig.tieEnds.forEach((m, i) => m.position.copy(ends[i]));
    rig.horn.rotation.y = a * 1.25;
    if (state.explode < 0.005) {
      const h = V(-10, 0, 0).applyAxisAngle(UP, rig.horn.rotation.y).add(rig.horn.position);
      const k = V(6, 9.5, 0).applyAxisAngle(UP, a).add(rig.knuckles[0].position);
      placeRod(rig.drag, h, k);
      rig.dragEnds[0].position.copy(h);
      rig.dragEnds[1].position.copy(k);
    }
  }
  applySteer();

  /* --- 번호표 --- */
  model.updateMatrixWorld(true);
  const tmpBox = new T.Box3();
  for (const p of Object.values(parts)) {
    const ud = p.group.userData;
    let host = p.group, pos;
    if (ud.anchorObj) { host = ud.anchorObj; pos = ud.anchorLocal.clone(); }
    else if (ud.anchor) pos = ud.anchor.clone();
    else { tmpBox.setFromObject(p.group); pos = V((tmpBox.min.x + tmpBox.max.x) / 2, tmpBox.max.y + 5, (tmpBox.min.z + tmpBox.max.z) / 2); }
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'callout';
    el.innerHTML = `<b>${p.def.n}</b><span>${p.def.name}</span>`;
    el.setAttribute('aria-label', `${p.def.n}번 ${p.def.name}`);
    el.addEventListener('click', e => { e.stopPropagation(); select(p.id, false); });
    el.addEventListener('pointerenter', () => setHover(p.id));
    el.addEventListener('pointerleave', () => setHover(null));
    const lab = new X.CSS2DObject(el);
    lab.position.copy(pos);
    host.add(lab);
    p.label = lab;
    p.el = el;
  }

  /* --- 치수, 카메라 시야 --- */
  const bodyBox = new T.Box3();
  for (const id of ['bed', 'frame', 'frontbox', 'cammount', 'camera', 'wheels', 'plate']) bodyBox.union(tmpBox.setFromObject(parts[id].group));
  const r5 = v => Math.round(v / 5) * 5;
  const dimMat = new T.LineBasicMaterial({ color: 0x2a2c30, transparent: true, opacity: 0.85, depthTest: false });
  const dims = new T.Group();
  dims.visible = false;
  model.add(dims);
  function dimLine(a, b, tick, text) {
    const t1 = tick.clone().multiplyScalar(5);
    const geo = new T.BufferGeometry().setFromPoints([a, b, a.clone().sub(t1), a.clone().add(t1), b.clone().sub(t1), b.clone().add(t1)]);
    const ls = new T.LineSegments(geo, dimMat);
    ls.renderOrder = 6;
    dims.add(ls);
    const el = document.createElement('div');
    el.className = 'dim';
    el.textContent = text;
    const lab = new X.CSS2DObject(el);
    lab.position.copy(a).add(b).multiplyScalar(0.5);
    dims.add(lab);
  }
  const bb = bodyBox;
  dimLine(V(bb.min.x, 0.6, bb.max.z + 24), V(bb.max.x, 0.6, bb.max.z + 24), V(0, 0, 1), `길이 약 ${r5(bb.max.x - bb.min.x)} mm`);
  dimLine(V(bb.max.x + 24, 0.6, bb.min.z), V(bb.max.x + 24, 0.6, bb.max.z), V(1, 0, 0), `폭 약 ${r5(bb.max.z - bb.min.z)} mm`);
  dimLine(V(bb.min.x - 22, 0, bb.max.z), V(bb.min.x - 22, bb.max.y, bb.max.z), V(1, 0, 0), `높이 약 ${r5(bb.max.y)} mm`);
  dimLine(V(RX, 0.6, bb.min.z - 24), V(FX, 0.6, bb.min.z - 24), V(0, 0, 1), '휠베이스 약 190 mm');

  const fov = new T.Group();
  fov.visible = false;
  model.add(fov);
  const fovMat = new T.MeshBasicMaterial({ color: 0x2a52e0, transparent: true, opacity: 0.16, depthWrite: false, side: T.DoubleSide });
  const fovLine = new T.LineBasicMaterial({ color: 0x2a52e0, transparent: true, opacity: 0.85 });
  const fovDash = new T.LineDashedMaterial({ color: 0x2a52e0, transparent: true, opacity: 0.85, dashSize: 10, gapSize: 7 });
  const fovInfo = {};
  {
    rig.camHead.updateWorldMatrix(true, false);
    const apex = rig.camHead.localToWorld(V(17.6, 0, 0));
    const q = rig.camHead.getWorldQuaternion(new T.Quaternion());
    const GY = 0.8, R = 1000, th = Math.tan(deg(64)), tv = Math.tan(deg(48));
    const foot = V(apex.x, GY, apex.z);
    const hit = (sx, sy) => {
      const d = V(1, tv * sy, th * sx).normalize().applyQuaternion(q);
      if (d.y < -1e-4) {
        const P = apex.clone().addScaledVector(d, (apex.y - GY) / -d.y);
        if (Math.hypot(P.x - foot.x, P.z - foot.z) <= R) return P;
      }
      return foot.clone().addScaledVector(V(d.x, 0, d.z).normalize(), R);
    };
    const N = 28, ring = [];
    for (let i = 0; i <= N; i++) ring.push(hit(-1 + (2 * i) / N, -1));
    for (let i = 1; i <= N; i++) ring.push(hit(1, -1 + (2 * i) / N));
    for (let i = 1; i <= N; i++) ring.push(hit(1 - (2 * i) / N, 1));
    for (let i = 1; i < N; i++) ring.push(hit(-1, 1 - (2 * i) / N));
    const sg = new T.ShapeGeometry(new T.Shape(ring.map(p => new T.Vector2(p.x, p.z))));
    sg.rotateX(Math.PI / 2);
    sg.translate(0, GY, 0);
    fov.add(new T.Mesh(sg, fovMat));
    fov.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(ring), fovLine));
    const rays = [];
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) rays.push(apex, hit(sx, sy));
    fov.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(rays), fovLine));
    const angs = ring.map(p => Math.atan2(p.z - foot.z, p.x - foot.x));
    const a0 = Math.min(...angs), a1 = Math.max(...angs);
    const tag = (text, pos) => { const el = document.createElement('div'); el.className = 'dim'; el.textContent = text; const o = new X.CSS2DObject(el); o.position.copy(pos); fov.add(o); };
    for (const r of [500, 1000]) {
      const arc = [];
      for (let i = 0; i <= 48; i++) { const a = a0 + ((a1 - a0) * i) / 48; arc.push(foot.clone().add(V(Math.cos(a) * r, 0.4, Math.sin(a) * r))); }
      const ln = new T.Line(new T.BufferGeometry().setFromPoints(arc), fovDash);
      ln.computeLineDistances();
      fov.add(ln);
      tag(r === 500 ? '50 cm' : '1 m', foot.clone().add(V(r, 0, 0)));
    }
    const near = hit(0, -1);
    fovInfo.near = Math.round(near.distanceTo(foot) / 10);
    tag(`앞 약 ${fovInfo.near} cm부터 보여요`, near.clone().add(V(0, 0, 0)));
    tag('카메라가 보는 바닥 (광각 모드, 대략)', foot.clone().add(V(560, 0, -330)));
    fovInfo.target = foot.clone().add(V(300, 0, 0));
  }

  const CX = (bb.min.x + bb.max.x) / 2;
  model.position.x = -CX;

  /* --- 바닥 --- */
  const shadowMat = new T.ShadowMaterial({ opacity: 0.2 });
  const shadowPlane = new T.Mesh(new T.PlaneGeometry(2600, 2600), shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.receiveShadow = true;
  const gridMat = new T.MeshBasicMaterial({ transparent: true, depthWrite: false });
  const grid = new T.Mesh(new T.PlaneGeometry(1600, 1600), gridMat);
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = -0.3;
  grid.renderOrder = -1;
  const blobMat = new T.MeshBasicMaterial({ color: 0x000000, map: radialTex(), transparent: true, depthWrite: false, opacity: 0.6 });
  const blob = new T.Mesh(new T.PlaneGeometry(470, 230), blobMat);
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.2;
  scene.add(shadowPlane, grid, blob);

  /* --- 선택 표시 --- */
  const ACCENT = new T.Color(0x2a52e0);
  const selBox = new T.Box3();
  const selHelper = new T.Box3Helper(selBox, ACCENT);
  Object.assign(selHelper.material, { depthTest: false, transparent: true, opacity: 0.7 });
  selHelper.renderOrder = 9;
  selHelper.visible = false;
  scene.add(selHelper);

  /* --- 상태 반영 --- */
  let needs = true;
  const invalidate = () => { needs = true; };
  function partShown(p) { return state.vis[p.id] !== false && (!state.isolate || state.isolate === p.id); }
  function applyVisibility() {
    for (const p of Object.values(parts)) p.group.visible = partShown(p);
    updateLabels();
    updateSelBox();
    syncTable();
    invalidate();
  }
  function updateLabels() {
    const all = state.labels && state.explode > 0.3;
    for (const p of Object.values(parts)) {
      const sel = p.id === state.selected, on = sel || (all && p.id === state.hovered);
      p.label.visible = all || sel;
      p.el.classList.toggle('on', on);
      p.el.classList.toggle('dim', all && !!state.selected && !on);
    }
  }
  function updateSelBox() {
    const p = parts[state.selected];
    if (!p || !p.group.visible) { selHelper.visible = false; return; }
    selBox.setFromObject(p.group).expandByScalar(2.5);
    selHelper.visible = true;
  }
  function paint() {
    for (const p of Object.values(parts)) {
      const level = p.id === state.selected ? 0.45 : p.id === state.hovered ? 0.22 : 0;
      for (const m of p.mats) {
        if (!m.emissive || m.userData.orig.ei > 0.8) continue;
        if (level) { m.emissive.copy(ACCENT); m.emissiveIntensity = level; }
        else { m.emissive.setHex(m.userData.orig.emissive); m.emissiveIntensity = m.userData.orig.ei; }
      }
    }
  }
  function refreshXray() {
    for (const p of Object.values(parts)) {
      const ghost = state.xray && p.id !== state.selected && p.id !== state.hovered;
      for (const m of p.mats) {
        const o = m.userData.orig;
        const tr = ghost ? true : o.transparent, tm = ghost ? 0 : o.transmission;
        if (m.transparent !== tr || (m.transmission || 0) !== tm) { m.transparent = tr; if ('transmission' in m) m.transmission = tm; m.needsUpdate = true; }
        m.opacity = ghost ? 0.12 : o.opacity;
        m.depthWrite = ghost ? false : o.depthWrite;
      }
      p.group.traverse(o => { if (o.isMesh) o.castShadow = !ghost && !o.userData.noCast; });
    }
  }
  function applyExplode() {
    const f = state.explode;
    model.position.y = 46 * ease(f);
    const tOf = p => ease(clamp((f - p.delay) / 0.45, 0, 1));
    for (const p of Object.values(parts)) {
      const t = tOf(p);
      p.group.position.copy(p.ex).multiplyScalar(t);
      for (const s of p.subs) s.position.copy(s.userData.base).addScaledVector(s.userData.ex, s.userData.follow ? tOf(parts[s.userData.follow]) : t);
    }
    dims.visible = state.dims && f < 0.01;
    fov.visible = state.fov && f < 0.01;
    const lift = 100 * ease(f), scale = 1 + 0.62 * ease(f);
    if (lift !== applied.lift || scale !== applied.scale) {
      const off = camera.position.clone().sub(controls.target).multiplyScalar(scale / applied.scale);
      controls.target.y += lift - applied.lift;
      camera.position.copy(controls.target).add(off);
      if (fly) { fly.t1.y += lift - applied.lift; fly.p1.y += lift - applied.lift; }
      applied.lift = lift;
      applied.scale = scale;
    }
    updateLabels();
    if (state.selected) updateSelBox();
    invalidate();
  }
  const applied = { lift: 0, scale: 1 };

  /* --- 카메라 이동 --- */
  let fly = null;
  function flyTo(pos, tgt, dur = 750) {
    fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: tgt.clone(), s: performance.now(), dur: reduceMotion ? 1 : dur };
    invalidate();
  }
  const infoOverlay = () => getComputedStyle(infoEl).position === 'absolute';
  function fitDist() {
    const W = stage.clientWidth, H = stage.clientHeight || 1;
    const usable = Math.max(W - (infoOverlay() ? infoEl.offsetWidth + 24 : 0), 200);
    const vt = Math.tan(deg(camera.fov / 2)), ht = vt * (usable / H);
    return clamp(Math.max(130 / vt, 192 / ht), 380, 2300);
  }
  const PRESETS = { iso: [42, 24, 1], front: [0, 9, 0.74], side: [90, 6, 1], top: [90, 89, 1.02], rear: [180, 14, 0.74] };
  function presetPose(name, lift = applied.lift, scale = applied.scale) {
    const [az, el, k] = PRESETS[name];
    const tgt = V(0, 72 + lift, 0);
    const d = fitDist() * scale * k;
    const pos = V(Math.cos(deg(el)) * Math.cos(deg(az)), Math.sin(deg(el)), Math.cos(deg(el)) * Math.sin(deg(az))).multiplyScalar(d).add(tgt);
    return [pos, tgt];
  }
  function flyToPart(id) {
    const p = parts[id];
    if (!p || !p.group.visible) return;
    const b = new T.Box3().setFromObject(p.group);
    if (b.isEmpty()) return;
    const c = b.getCenter(V()), size = b.getSize(V()).length();
    const dir = camera.position.clone().sub(controls.target).normalize();
    const dist = clamp(size * 2.5, 240, 1200) * clamp(fitDist() / 560, 1, 2);
    flyTo(c.clone().addScaledVector(dir, dist), c);
  }
  function setViewPressed(name) { $$('.views button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === name))); }

  /* --- 선택과 강조 --- */
  function select(id, doFly = false) {
    state.selected = id || null;
    paint();
    if (state.xray) refreshXray();
    updateSelBox();
    updateLabels();
    renderInfo();
    syncTable();
    if (doFly && id) flyToPart(id);
    resize();
  }
  function setHover(id) {
    if (state.hovered === id) return;
    state.hovered = id;
    paint();
    if (state.xray) refreshXray();
    updateLabels();
    renderer.domElement.style.cursor = id ? 'pointer' : '';
    if (!id) tipEl.hidden = true;
    invalidate();
  }

  /* --- 테마 --- */
  const probe = document.createElement('i');
  probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;color:var(--accent);background-color:var(--ink);border-style:solid;border-width:0;border-top-color:var(--stage1);border-bottom-color:var(--stage2);border-left-color:var(--bg)';
  stage.append(probe);
  function applyTheme() {
    const cs = getComputedStyle(probe);
    ACCENT.setStyle(cs.color);
    const ink = new T.Color().setStyle(cs.backgroundColor), hsl = {};
    ink.getHSL(hsl);
    const dark = hsl.l > 0.5;
    if (scene.background) scene.background.dispose();
    scene.background = bgTex(cs.borderTopColor, cs.borderBottomColor);
    if (gridMat.map) gridMat.map.dispose();
    gridMat.map = gridTex(dark);
    gridMat.needsUpdate = true;
    shadowMat.opacity = dark ? 0.45 : 0.2;
    blobMat.opacity = dark ? 0.85 : 0.55;
    hemi.intensity = dark ? 0.42 : 0.55;
    renderer.toneMappingExposure = dark ? 1.06 : 1;
    selHelper.material.color.copy(ACCENT);
    fovMat.color.copy(ACCENT);
    fovLine.color.copy(ACCENT);
    rig.planEdges.material.color.copy(ACCENT);
    fovDash.color.copy(ACCENT);
    dimMat.color.set(dark ? 0xdfe1e4 : 0x2a2c30);
    paint();
    invalidate();
  }
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  applyTheme();

  /* --- 크기 --- */
  function resize() {
    const W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    renderer.setSize(W, H, false);
    labelR.setSize(W, H);
    camera.aspect = W / H;
    if (infoOverlay()) camera.setViewOffset(W, H, -(infoEl.offsetWidth + 24) / 2, 0, W, H);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    invalidate();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  /* --- 포인터 --- */
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  let downAt = null, lastMove = null, hoverDirty = false;
  function shown(o) { for (let n = o; n && n !== scene; n = n.parent) if (!n.visible) return false; return true; }
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    for (const h of ray.intersectObjects(pickables, false)) if (shown(h.object)) return h.object.userData.part;
    return null;
  }
  const cvs = renderer.domElement;
  cvs.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; fly = null; });
  cvs.addEventListener('pointerup', e => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
    downAt = null;
    if (moved < 6) select(pick(e));
  });
  cvs.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; lastMove = e; hoverDirty = true; invalidate(); });
  cvs.addEventListener('pointerleave', () => { lastMove = null; setHover(null); });
  controls.addEventListener('start', () => { setViewPressed(null); fly = null; });
  controls.addEventListener('change', invalidate);

  /* --- 조작 UI --- */
  const goBtn = $('#go'), exIn = $('#ex'), exOut = $('#exv');
  let exTween = null;
  function syncExplodeUI() {
    const v = Math.round(state.explode * 100);
    exIn.value = v;
    exOut.textContent = `${v}%`;
    goBtn.textContent = state.explode > 0.5 ? '접기' : '펼치기';
  }
  function tweenExplode(to, dur = 1500) { exTween = { a: state.explode, b: to, s: performance.now(), dur: reduceMotion ? 1 : dur }; invalidate(); }
  goBtn.addEventListener('click', () => tweenExplode(state.explode > 0.5 ? 0 : 1));
  exIn.addEventListener('input', () => { exTween = null; state.explode = exIn.value / 100; applyExplode(); syncExplodeUI(); });
  $$('.views button').forEach(b => b.addEventListener('click', () => { setViewPressed(b.dataset.view); const [p, t] = presetPose(b.dataset.view); flyTo(p, t); }));

  const toggles = {
    labels(on) { state.labels = on; updateLabels(); },
    xray(on) { state.xray = on; refreshXray(); },
    dims(on) { state.dims = on; if (on && state.explode > 0.01) tweenExplode(0, 700); dims.visible = on && state.explode < 0.01; },
    fov(on) {
      state.fov = on;
      if (on && state.explode > 0.01) tweenExplode(0, 700);
      fov.visible = on && state.explode < 0.01;
      if (on) {
        const tgt = fovInfo.target.clone().add(model.position).setY(0), d = Math.max(2300, fitDist() * 3.6);
        setViewPressed(null);
        flyTo(V(Math.cos(deg(50)) * Math.cos(deg(200)), Math.sin(deg(50)), Math.cos(deg(50)) * Math.sin(deg(200))).multiplyScalar(d).add(tgt), tgt, 1000);
      }
    },
    spin(on) { controls.autoRotate = on; },
    planned(on) { for (const d of DEFS) if (d.planned) state.vis[d.id] = on; applyVisibility(); },
  };
  $$('.chip').forEach(b => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    toggles[b.dataset.t](on);
    invalidate();
  }));
  const steerIn = $('#steer'), steerOut = $('#steerv'), thrIn = $('#thr'), thrOut = $('#thrv');
  function onSteer() {
    const v = +steerIn.value;
    steerTarget = deg(25) * (v - 395) / 60;
    steerOut.textContent = `${v} (${v >= 399 ? '왼쪽' : v <= 391 ? '오른쪽' : '가운데'})`;
    invalidate();
  }
  function onThr() {
    const v = +thrIn.value;
    state.thr = v;
    thrOut.textContent = `${v} (${v === 380 ? '정지' : v < 359 ? '전진' : v > 402 ? '후진' : '정지 구간'})`;
    invalidate();
  }
  steerIn.addEventListener('input', onSteer);
  thrIn.addEventListener('input', onThr);
  const wheelRate = () => (state.thr < 359 ? (11 * (359 - state.thr)) / 29 : state.thr > 402 ? (-11 * (state.thr - 402)) / 33 : 0);

  $('#reset').addEventListener('click', () => {
    tweenExplode(0, 700);
    for (const b of $$('.chip')) {
      const want = b.dataset.t === 'labels' || b.dataset.t === 'planned';
      if ((b.getAttribute('aria-pressed') === 'true') !== want) { b.setAttribute('aria-pressed', String(want)); toggles[b.dataset.t](want); }
    }
    steerIn.value = 395; onSteer();
    thrIn.value = 380; onThr();
    state.vis = {};
    state.isolate = null;
    applyVisibility();
    select(null);
    setViewPressed('iso');
    const [p, t] = presetPose('iso', 0, 1);
    flyTo(p, t);
  });

  Object.assign(api, {
    select: (id, doFly) => select(id, doFly),
    toggleVisible(id) { state.vis[id] = state.vis[id] === false; if (DEF[id].planned) $('.chip[data-t=planned]').setAttribute('aria-pressed', String(state.vis[id] !== false)); applyVisibility(); },
    focus: id => flyToPart(id),
    isolate(id) { state.isolate = id; applyVisibility(); renderInfo(); if (id) flyToPart(id); },
  });
  document.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,textarea,select')) return;
    if (e.key === 'e' || e.key === 'E' || e.key === 'ㄷ') tweenExplode(state.explode > 0.5 ? 0 : 1);
    else if (e.key === 'Escape') select(null);
  });

  /* --- 처음 화면 --- */
  {
    const [p, t] = presetPose('iso');
    controls.target.copy(t);
    if (reduceMotion) camera.position.copy(p);
    else {
      camera.position.copy(p.clone().sub(t).applyAxisAngle(UP, deg(-38)).multiplyScalar(1.4).add(t));
      flyTo(p, t, 1700);
    }
  }
  applyVisibility();
  applyExplode();
  syncExplodeUI();

  /* --- 그리기 --- */
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    let active = false;
    if (exTween) {
      const k = clamp((now - exTween.s) / exTween.dur, 0, 1);
      state.explode = exTween.a + (exTween.b - exTween.a) * ease(k);
      applyExplode();
      syncExplodeUI();
      if (k >= 1) exTween = null;
      active = true;
    }
    if (fly) {
      const k = clamp((now - fly.s) / fly.dur, 0, 1), e = ease(k);
      camera.position.lerpVectors(fly.p0, fly.p1, e);
      controls.target.lerpVectors(fly.t0, fly.t1, e);
      if (k >= 1) fly = null;
      active = true;
    }
    if (Math.abs(steerTarget - steerCur) > 1e-4) {
      steerCur += (steerTarget - steerCur) * (1 - Math.exp(-dt * 12));
      if (Math.abs(steerTarget - steerCur) < 1e-4) steerCur = steerTarget;
      applySteer();
      active = true;
    }
    const ws = wheelRate();
    if (ws) {
      for (const w of rig.wheels) w.rotation.z -= ws * dt;
      rig.fan.rotation.y += 24 * dt;
      active = true;
    }
    if (controls.autoRotate) active = true;
    const changed = controls.update();
    if (hoverDirty && lastMove && !downAt) {
      hoverDirty = false;
      const id = pick(lastMove);
      setHover(id);
      if (id) {
        const r = stage.getBoundingClientRect();
        tipEl.textContent = `${DEF[id].n}  ${DEF[id].name}`;
        tipEl.style.left = `${lastMove.clientX - r.left}px`;
        tipEl.style.top = `${lastMove.clientY - r.top}px`;
        tipEl.hidden = false;
      }
    }
    if (active || changed || needs) {
      if (state.selected && active) updateSelBox();
      renderer.render(scene, camera);
      labelR.render(scene, camera);
      needs = false;
    }
  }
  requestAnimationFrame(frame);
  window.__rc = { parts, rig, camera, controls, state };
}

try { init3D(); }
catch (err) {
  console.error(err);
  stage.insertAdjacentHTML('beforeend', '<div class="fail"><p>이 브라우저에서는 3D 화면을 그릴 수 없어요. 최신 Chrome, Edge, Safari에서 열어 주세요. 아래 부품표는 그대로 볼 수 있어요.</p></div>');
}
}
