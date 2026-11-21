"""게임 맵·물리 확인. 실행: 저장소 맨 위에서 python game/build.py 후 python -m pytest game/tests -q"""
import json

import pytest

import gamelib

BASE = json.load(open(gamelib.REPO / 'game' / 'tests' / 'baseline_house.json', encoding='utf-8'))


@pytest.fixture(scope='module')
def game():
    pg = gamelib.open_game()
    yield pg
    pg.close()


def test_house_regression(game):
    """집 맵의 주행이 개편 전과 같은지: AI 첫 바퀴 시간 ±2%, 그동안 충돌 0."""
    r = gamelib.ai_lap(game, 16, map_id='house')
    assert r['crashes'] == 0, r
    assert r['laps'], r
    assert abs(r['laps'][0] - BASE['laps'][0]) <= BASE['laps'][0] * 0.02, (r, BASE)
    assert game.logs == [], game.logs


def test_switch_no_leftovers(game):
    """같은 맵을 여러 번 불러도 이전 것이 남지 않음."""
    counts = []
    for _ in range(3):
        game.js("() => __game.loadMap('house')")
        gamelib.frames(game)
        counts.append(game.js('() => __game.counts()'))
    assert counts[0] == counts[1] == counts[2], counts
    assert counts[0]['colliders'] > 50 and counts[0]['props'] == 18 and counts[0]['movers'] == 2, counts[0]
    assert game.logs == [], game.logs


def test_every_map_reloads_without_leftovers(game):
    """맵을 이리저리 바꿔도(왕복 포함) 이전 맵의 메시·충돌체·소품이 남거나 쌓이지 않고 오류도 없음."""
    ids = game.js('() => __game.maps()')
    assert len(ids) >= 4, ids
    first = {}
    for rnd in range(2):
        for i in ids:
            game.js('(id) => __game.loadMap(id)', i)
            gamelib.frames(game)
            c = game.js('() => __game.counts()')
            assert game.js('() => __game.world().id') == i
            if rnd == 0:
                first[i] = c
            else:
                assert c == first[i], (i, first[i], c)
    assert game.logs == [], game.logs


def test_title_resets_state(game):
    """녹화·AI 모드로 달리다 시작 화면으로 나가서 다시 시작하면 처음 상태."""
    game.js("""() => { const g = __game; g.loadMap('house'); g.start('collect'); g.state.rec = true; g.sim(3, 0, 1); g.state.drive = 'local'; g.sim(2); }""")
    assert game.js('() => __game.state.records') > 0
    game.js("() => document.querySelector('[data-act=title]').click()")
    game.js("() => __game.start('free')")
    st = game.js('() => { const s = __game.state; return [s.records, s.lap, s.drive, s.rec]; }')
    assert st == [0, 0, 'user', False], st


# ---------------------------------------------------------------- 물리: 공중, 미끄러짐, 떨어짐
# 집 맵 거실 서쪽 빈 바닥: 북쪽으로 0.8초 직진(약 0.77 m/s)한 뒤 오른쪽 최대 조향 0.6초
CIRCLE = '''([aLat]) => {
  const g = __game; g.loadMap('house'); g.start('free'); g.state.maxThr = 0.7;
  if (aLat) g.PH().aLat = aLat;
  g.placeCar(1050, 2480, Math.PI / 2);
  g.sim(0.8, 0, 1);
  g.sim(0.6, -1, 1);
  return { vl: g.car.vl, v: g.car.v, crashes: g.state.crashes, x: g.car.x, z: g.car.z };
}'''
# 거실에서 베란다 문(D2, 100mm 턱)으로 북쪽을 향해 전속. 매 스텝 공중 여부를 기록
STEP_DOWN = '''([killY, resetInAir]) => {
  const g = __game; g.loadMap('house'); g.start('free'); g.state.maxThr = 1;
  if (killY != null) g.PH().killY = killY;
  g.placeCar(3200, 500, Math.PI / 2);
  let airSteps = 0, maxAirT = 0, didReset = false;
  for (let i = 0; i < 360; i++) {
    g.sim(1 / 120, 0, 1);
    if (g.car.air) { airSteps++; maxAirT = Math.max(maxAirT, g.car.airT); if (resetInAir && !didReset) { g.resetCar(); didReset = true; break; } }
  }
  return { airSteps, maxAirT, air: g.car.air, py: g.car.py, v: g.car.v, x: g.car.x, z: g.car.z, ground: g.car.wh.reduce((a, b) => a + b) / 4, fell: g.state.fell, crashes: g.state.crashes };
}'''


def test_default_no_slip(game):
    r = game.js(CIRCLE, [None])
    assert r['crashes'] == 0, r
    assert abs(r['vl']) < 1, r                    # 기본 바닥에서는 옆으로 안 미끄러짐
    assert r['v'] > 700, r


def test_low_grip_slides(game):
    r = game.js(CIRCLE, [650])
    assert r['crashes'] == 0, r
    assert abs(r['vl']) > 100, r                  # 얼음 수준(aLat 650)이면 옆 속도가 남음


def test_step_down_airborne(game):
    r = game.js(STEP_DOWN, [None, False])
    assert r['airSteps'] >= 5, r                  # 100mm 턱에서 떨어지는 동안 공중 (자유 낙하 약 0.14초)
    assert r['air'] is False and abs(r['py'] + 100) < 3, r
    assert r['z'] < -300 and r['fell'] == 0, r


def test_reset_while_airborne(game):
    r = game.js(STEP_DOWN, [None, True])
    assert r['air'] is False and r['v'] == 0, r
    assert abs(r['py'] - r['ground']) < 1, r
    assert r['z'] > 0, r                          # 경로 위(거실)로 돌아옴


def test_fall_below_kill_height_resets_car(game):
    r = game.js(STEP_DOWN, [-50, False])
    assert r['fell'] == 1 and r['crashes'] >= 1, r
    assert r['air'] is False and abs(r['py'] - r['ground']) < 1, r


def test_landing_hook_reports_air_time(game):
    r = game.js('''() => {
      const g = __game; g.loadMap('house'); g.start('free'); g.state.maxThr = 1;
      const h = g.world().hooks, old = h.onLand; let got = null;
      h.onLand = (sec, dist) => { got = [sec, dist]; };
      g.placeCar(3200, 500, Math.PI / 2); g.sim(3, 0, 1);
      h.onLand = old;
      return got;
    }''')
    assert r and 0.05 < r[0] < 0.3 and r[1] > 20, r   # 턱에서 떨어진 시간(초)과 그동안 간 거리(mm)


# ---------------------------------------------------------------- 맵: 수집한 거실
def test_living_car_matches_recorded_turn_rate(game):
    """수집 기록: 스로틀 1.0 + 최대 조향에서 초당 0.80 rad 회전. 속도는 0.8 m/s로 가정."""
    r = game.js('''() => {
      const g = __game; g.loadMap('living'); g.start('free');
      g.placeCar(2400, 6300, 0); g.sim(1.5, 0, 1);
      const y0 = g.car.yaw, v = g.car.v; g.sim(1.0, -1, 1);
      return { w: g.car.yaw - y0, v, maxThr: g.state.maxThr, crashes: g.state.crashes };
    }''')
    assert r['maxThr'] == 1 and r['crashes'] == 0, r
    assert abs(r['v'] - 800) < 15, r
    assert abs(abs(r['w']) - 0.80) <= 0.05, r


def test_living_ai_lap_takes_about_15s_like_the_record(game):
    r = gamelib.ai_lap(game, 40, map_id='living')
    assert r['crashes'] == 0 and r['fell'] == 0, r
    assert len(r['laps']) >= 2 and all(13 <= t <= 18 for t in r['laps']), r
    assert game.logs == [], game.logs


def test_living_has_furniture_and_lens_tint(game):
    r = game.js('''() => { const g = __game; g.loadMap('living'); return { c: g.counts(), tint: g.tintOn(), id: g.world().id }; }''')
    assert r['id'] == 'living' and r['tint'] is True, r
    assert r['c']['colliders'] >= 15 and r['c']['props'] >= 4, r   # 벽 4 + 가구 15개쯤, 밀리는 신발·장난감
    assert game.js("() => { __game.loadMap('house'); return __game.tintOn(); }") is False


def test_living_hud_shows_the_real_record(game):
    game.js("() => { __game.loadMap('living'); __game.start('collect'); }")
    game.page.wait_for_function("!document.querySelector('#chalRow').hidden && document.querySelector('#chalText').textContent.includes('15초')", timeout=20000)
    game.js("() => { __game.loadMap('house'); __game.start('collect'); }")
    game.page.wait_for_function("document.querySelector('#chalRow').hidden", timeout=20000)


def test_car_camera_is_wide_angle_like_the_real_lens(game):
    """실제 차는 11-21부터 광각(센서 전체, 160° 렌즈)이라 화면이 넓고 둥글게 휘어 보임."""
    r = game.js('() => __game.camInfo()')
    assert r['fisheye'] is True, r
    assert 100 <= r['hfov'] <= 135 and 125 <= r['dfov'] <= 160, r


def test_car_camera_view_shows_a_picture(game, tmp_path):
    """'모델 입력' 화면(차 카메라 160×120)이 실제로 그려지는지: 캡처가 새까맣지 않아야 함."""
    from PIL import Image, ImageStat
    game.js("() => { const g = __game; g.loadMap('house'); g.start('free'); g.state.camMode = 2; }")
    game.page.wait_for_timeout(2500)
    shot = tmp_path / 'cam.png'
    game.shot(shot)
    game.js('() => { __game.state.camMode = 0; }')
    w, h = Image.open(shot).size
    mean = ImageStat.Stat(Image.open(shot).convert('L').crop((w // 4, h // 4, 3 * w // 4, 3 * h // 4))).mean[0]
    assert mean > 20, mean


# ---------------------------------------------------------------- 맵: 거인의 책상
def test_desk_ai_lap_without_falling(game):
    r = gamelib.ai_lap(game, 60, map_id='desk')
    assert r['laps'] and r['crashes'] == 0 and r['fell'] == 0, r
    assert game.logs == [], game.logs


def test_desk_driving_off_the_edge_falls_and_returns(game):
    r = game.js('''() => {
      const g = __game; g.loadMap('desk'); g.start('free'); g.state.maxThr = 1;
      g.placeCar(4500, 4550, -Math.PI / 2);                 // 남쪽(책상 앞 끝)을 향함
      let minY = 0, sawAir = false;
      for (let i = 0; i < 480; i++) { g.sim(1 / 120, 0, 1); minY = Math.min(minY, g.car.py); sawAir = sawAir || g.car.air; if (g.state.fell) break; }
      return { fell: g.state.fell, minY, sawAir, z: g.car.z, air: g.car.air, py: g.car.py, wavg: g.car.wh.reduce((a, b) => a + b) / 4, hud: g.world().hooks.hud() };
    }''')
    assert r['fell'] == 1 and r['sawAir'] and r['minY'] < -1400, r
    assert r['air'] is False and 0 < r['z'] < 5000 and abs(r['py'] - r['wavg']) < 1, r
    assert r['hud'][1] == '1번', r


def test_prop_falls_off_desk(game):
    r = game.js('''() => {
      const g = __game; g.loadMap('desk'); g.start('free');
      const p = g.props.find(q => q.kind === 'eraser');
      p.x = 4500; p.z = 4850; p.vx = 0; p.vz = 900;
      g.sim(4, 0, 0);
      return { x: p.x, z: p.z, py: p.py, vz: p.vz, vy: p.vy, floor: g.groundH(p.x, p.z) };
    }''')
    assert all(isinstance(r[k], (int, float)) and r[k] == r[k] for k in ('x', 'z', 'py', 'vz', 'vy')), r
    assert r['z'] > 5000 and abs(r['py'] - r['floor']) < 1 and r['floor'] < -4000, r
    assert abs(r['vz']) < 5 and r['vy'] == 0, r


# ---------------------------------------------------------------- 물리: 오르막
def test_slope_slows_the_car_without_rendering(game):
    """오르막에서 느려지는 것은 물리 계산이 직접 해야 함 (그리기 쪽 값에 기대면 시험·실제 게임이 서로 달라짐)."""
    r = game.js('''() => {
      const g = __game; g.loadMap('desk'); g.start('free'); g.state.maxThr = 1;
      g.placeCar(2300, 4150, 0);                       // 자 다리(x 3700~4000, 오르막 8.5°)를 향해 동쪽으로
      let vIn = 0, vMin = 9999;
      for (let i = 0; i < 300; i++) { g.sim(1 / 120, 0, 1); const x = g.car.x; if (x < 3600) vIn = g.car.v; if (x > 3700 && x < 4150) vMin = Math.min(vMin, g.car.v); }
      return { vIn, vMin, x: g.car.x, crashes: g.state.crashes };
    }''')
    assert r['vIn'] > 1500 and r['crashes'] == 0, r
    assert r['vMin'] < 0.93 * r['vIn'], r


# ---------------------------------------------------------------- 맵: 달 기지
# 경로 위 점프대: x 6200~7700 (동쪽으로 오르막, 끝 높이 300), z 8200~8800. 도움닫기는 서쪽 x 3600부터
MOON_JUMP = '''() => {
  const g = __game; g.loadMap('moon'); g.start('free'); g.state.maxThr = 1;
  const h = g.world().hooks || {}, old = h.onLand, lands = [];
  h.onLand = (sec, dist) => { lands.push([sec, dist]); if (old) old(sec, dist); };
  g.placeCar(3600, 8500, 0);
  let vLip = 0, maxY = 0;
  for (let i = 0; i < 5 * 120; i++) { g.sim(1 / 120, 0, 1); if (g.car.x < 7600) vLip = g.car.v; maxY = Math.max(maxY, g.car.py); }
  h.onLand = old;
  return { id: g.world().id, grav: g.PH().g, lands, vLip, maxY, x: g.car.x, v: g.car.v, air: g.car.air, crashes: g.state.crashes, fell: g.state.fell, hud: h.hud ? h.hud() : null };
}'''


def test_moon_jump(game):
    """달(중력 1/6): 점프대를 전속으로 넘으면 0.5초 넘게 떠 있고, 착지한 뒤 그대로 달림."""
    r = game.js(MOON_JUMP)
    assert r['id'] == 'moon' and r['grav'] == 1620, r
    assert r['vLip'] > 1350, r                                     # 중력이 약하니 오르막에서도 거의 안 느려짐
    assert r['lands'] and r['lands'][0][0] >= 0.5 and r['lands'][0][1] >= 1000, r
    assert r['maxY'] > 300, r
    assert r['air'] is False and r['v'] > 1200 and r['x'] > 9500, r
    assert r['crashes'] == 0 and r['fell'] == 0, r
    assert r['hud'][0] == '최장 점프' and 'm' in r['hud'][1], r


def test_moon_lap(game):
    r = gamelib.ai_lap(game, 70, map_id='moon')
    assert game.js('() => __game.world().id') == 'moon'
    assert r['laps'] and r['crashes'] == 0 and r['fell'] == 0, r
    hud = game.js('() => __game.world().hooks.hud()')
    assert 'm' in hud[1], hud                                      # AI도 경로 위 점프대를 넘어 기록이 남음
    assert game.logs == [], game.logs


def test_terrain_consistency(game):
    """달 지형: 그려진 땅(메시)과 물리가 쓰는 높이가 같아야 바퀴가 땅에 묻히거나 뜨지 않음. 임의 200점 비교."""
    r = game.js('''() => {
      const g = __game; g.loadMap('moon');
      const mesh = g.statics.children.find(o => o.userData.terrain);
      if (!mesh) return { id: g.world().id, mesh: false };
      const P = mesh.geometry.attributes.position, I = mesh.geometry.index.array, b = g.world().bounds;
      const meshH = (x, z) => {
        for (let i = 0; i < I.length; i += 3) {
          const ax = P.getX(I[i]), az = P.getZ(I[i]), bx = P.getX(I[i + 1]), bz = P.getZ(I[i + 1]), cx = P.getX(I[i + 2]), cz = P.getZ(I[i + 2]);
          const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
          const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d, w = 1 - u - v;
          if (u >= -1e-9 && v >= -1e-9 && w >= -1e-9) return u * P.getY(I[i]) + v * P.getY(I[i + 1]) + w * P.getY(I[i + 2]);
        }
        return null;
      };
      const onRamp = (x, z) => (x > 6100 && x < 7800 && z > 8100 && z < 8900) || (x > 6800 && x < 8600 && z > 5800 && z < 6600);
      let s = 12345, worst = 0, miss = 0, n = 0, lo = 1e9, hi = -1e9;
      const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      while (n < 200) {
        const x = b.x0 + rnd() * (b.x1 - b.x0), z = b.z0 + rnd() * (b.z1 - b.z0);
        if (onRamp(x, z)) continue;
        n++;
        const m = meshH(x, z);
        if (m == null) { miss++; continue; }
        worst = Math.max(worst, Math.abs(m - g.groundH(x, z))); lo = Math.min(lo, m); hi = Math.max(hi, m);
      }
      return { id: g.world().id, mesh: true, worst, miss, lo, hi, tris: I.length / 3 };
    }''')
    assert r['id'] == 'moon' and r['mesh'], r
    assert r['miss'] == 0 and r['worst'] < 3, r
    assert r['hi'] - r['lo'] > 150, r                              # 크레이터와 둔덕이 있는 진짜 지형


def test_chase_camera_snaps_behind_the_car_after_a_teleport(game):
    """차를 멀리 옮기면(F 되돌리기, 떨어진 뒤 등) 추격 카메라가 맵을 가로질러 날아오지 않고 바로 차 뒤에 있어야 함."""
    d = game.js('''async () => {
      const g = __game, raf = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      g.loadMap('moon'); g.start('free'); g.state.camMode = 0;
      g.placeCar(2000, 8500, 0); await raf();
      g.placeCar(12000, 2500, 0); await raf();
      const c = g.camera.position;
      return Math.hypot(c.x - g.car.x, c.z - g.car.z);
    }''')
    assert d < 1500, d


# ---------------------------------------------------------------- 맵: 볼링장
# 레인 가운데 z = 1460 / 3000 / 4540, 파울 라인 x 2600, 맨 앞 핀 x 7908, 뒷벽 x 8880. 핀은 kind 'pin', lane 0~2
BOWL_RUN = '''() => {
  const g = __game; g.loadMap('bowling'); g.start('free'); g.state.maxThr = 1;
  const pins = g.props.filter(p => p.kind === 'pin' && p.lane === 0), down = () => pins.filter(p => p.down).length;
  g.placeCar(5200, 1460, 0);
  g.sim(3, 0, 1); const down3 = down();
  g.sim(2.5, 0, -1); const xBack = g.car.x;          // 핀 자리에서 뒤로 빠져나옴
  g.sim(6.5, 0, 0);                                  // 시작한 지 12초
  return { id: g.world().id, n: pins.length, down3, xBack, down12: down(), moved: Math.max(...pins.map(p => Math.hypot(p.x - p.x0, p.z - p.z0))),
    others: g.props.filter(p => p.kind === 'pin' && p.lane !== 0 && p.down).length, hud: g.world().hooks.hud(), fell: g.state.fell };
}'''
BOWL_TAP = '''([mode]) => {
  const g = __game; g.loadMap('bowling'); g.start(mode); g.state.maxThr = 1;
  g.placeCar(7500, 1460, 0); g.sim(0.7, 0, 1); g.sim(0.8, 0, 0);
  return { id: g.world().id, down: g.props.filter(p => p.kind === 'pin' && p.down).length, crashes: g.state.crashes, sinceCrash: g.state.time - g.state.lastCrash,
    x: g.car.x, toasts: document.querySelector('#toasts').textContent };
}'''


def test_bowling_pins(game):
    """차가 볼링공: 1번 레인 가운데로 전속 → 3초 뒤 핀 5개 이상 쓰러지고, 차가 비킨 뒤(첫 핀이 쓰러지고 7초 뒤) 10개가 다시 섬."""
    r = game.js(BOWL_RUN)
    assert r['id'] == 'bowling' and r['n'] == 10, r
    assert r['down3'] >= 5, r
    assert r['xBack'] < 7400, r
    assert r['down12'] == 0 and r['moved'] < 1, r
    assert r['others'] == 0 and r['fell'] == 0, r
    assert r['hud'][0] == '볼링' and '핀' in r['hud'][1] and '스트라이크' in r['hud'][1], r
    assert int(r['hud'][1].split('핀 ')[1].split('개')[0]) >= r['down3'], r


def test_bowling_lap(game):
    r = gamelib.ai_lap(game, 40, map_id='bowling')
    assert game.js('() => __game.world().id') == 'bowling'
    assert r['laps'] and r['crashes'] == 0 and r['fell'] == 0, r
    assert game.js("() => __game.props.filter(p => p.kind === 'pin' && p.down).length") == 0   # 로비 한 바퀴는 핀을 건드리지 않음
    assert game.logs == [], game.logs


def test_bowling_pin_hit_is_bad_data_only_in_collect_mode(game):
    """자유 주행에서는 핀을 치는 게 놀이지만, 기록 주행(데이터 모으기 연습)에서는 부딪힌 것으로 셈."""
    free = game.js(BOWL_TAP, ['free'])
    assert free['id'] == 'bowling' and free['down'] >= 1 and free['crashes'] == 0, free
    col = game.js(BOWL_TAP, ['collect'])
    assert col['down'] >= 1 and col['crashes'] >= 1 and col['sinceCrash'] < 1.6, col
    assert '볼링핀과 부딪혔어요' in col['toasts'], col      # 받침이 있으면 '과'


def test_bowling_ball_can_be_pushed_down_the_lane(game):
    r = game.js('''() => {
      const g = __game; g.loadMap('bowling'); g.start('free'); g.state.maxThr = 1;
      const b = g.props.filter(p => p.kind === 'bowl').sort((p, q) => Math.abs(p.z - 3000) - Math.abs(q.z - 3000))[0];
      g.placeCar(b.x - 520, b.z, 0); g.sim(3, 0, 1);
      return { x0: b.x0, x: b.x, vx: b.vx, carX: g.car.x, crashes: g.state.crashes };
    }''')
    assert r['x'] - r['x0'] > 2000 and r['vx'] > 400, r             # 무겁지만 밀면 레인을 따라 굴러감
    assert r['crashes'] == 0, r


def test_bowling_gutter_is_a_channel_the_car_can_cross(game):
    r = game.js('''() => {
      const g = __game; g.loadMap('bowling'); g.start('free'); g.state.maxThr = 1;
      const h = { lane: g.groundH(5000, 1460), gutter: g.groundH(5000, 1460 - 652.5), ridge: g.groundH(5000, 2230), lobby: g.groundH(1000, 3000) };
      g.placeCar(5000, 1460, Math.PI / 2); g.sim(2.2, 0, 0.6);     // 레인에서 북쪽 거터를 건너 옆 통로로
      return { h, z: g.car.z, py: g.car.py, crashes: g.state.crashes, fell: g.state.fell };
    }''')
    assert abs(r['h']['lane']) < 0.5 and abs(r['h']['ridge']) < 0.5 and abs(r['h']['lobby']) < 0.5, r
    assert -50 < r['h']['gutter'] < -38, r                          # 거터는 깊이 45mm쯤의 둥근 홈
    assert r['z'] < 640 and abs(r['py']) < 3 and r['crashes'] == 0 and r['fell'] == 0, r
