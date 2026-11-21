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
    r = gamelib.ai_lap(game, 16)
    assert r['crashes'] == 0, r
    assert r['laps'], r
    assert abs(r['laps'][0] - BASE['laps'][0]) <= BASE['laps'][0] * 0.02, (r, BASE)
    assert game.logs == [], game.logs
