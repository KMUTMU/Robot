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
