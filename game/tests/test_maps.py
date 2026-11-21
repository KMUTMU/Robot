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
