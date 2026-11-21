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
