"""맵 화면을 캡처해 눈으로 확인하는 도구.
사용: python game/tests/shots.py <맵 id> <저장 폴더> [위에서|차카메라 지점들...]
"""
import sys

import gamelib


def overview(pg, map_id, out, height=None):
    pg.js("(id) => { __game.loadMap(id); __game.start('free'); document.querySelector('#hud').style.visibility = 'hidden'; }", map_id)
    b = pg.js('() => __game.world().bounds')
    cx, cz = (b['x0'] + b['x1']) / 2, (b['z0'] + b['z1']) / 2
    h = height or max(b['x1'] - b['x0'], (b['z1'] - b['z0']) * 1.6) * 0.78
    pg.js('(v) => __game.setView(v)', [[cx, h, cz + 1], [cx, 0, cz]])
    pg.page.wait_for_timeout(2600)
    pg.shot(f'{out}/{map_id}_top.png')
    pg.js('(v) => __game.setView(v)', [[cx + (b['x1'] - b['x0']) * 0.42, h * 0.38, cz + (b['z1'] - b['z0']) * 0.62], [cx, 0, cz]])
    pg.page.wait_for_timeout(2600)
    pg.shot(f'{out}/{map_id}_iso.png')
    pg.js('() => __game.setView(null)')


def car_view(pg, map_id, out, name, x, z, yaw_deg, mode=2):
    """mode 0 추격, 1 차 카메라(넓게), 2 모델 입력 160×120"""
    pg.js("([id, x, z, yaw, mode]) => { const g = __game; if (g.world().id !== id) g.loadMap(id); if (!g.state.playing) g.start('free'); g.placeCar(x, z, yaw * Math.PI / 180); g.state.camMode = mode; document.querySelector('#hud').style.visibility = mode === 2 ? 'hidden' : 'visible'; }", [map_id, x, z, yaw_deg, mode])
    pg.page.wait_for_timeout(2400)
    pg.shot(f'{out}/{map_id}_{name}.png')


if __name__ == '__main__':
    map_id, out = sys.argv[1], sys.argv[2]
    pg = gamelib.open_game(size=(1100, 700))
    overview(pg, map_id, out)
    print(pg.logs)
    pg.close()
