"""게임·3D 모델 확인용 도우미 (Playwright + Chrome).

준비:  pip install playwright pytest   (Chrome이 없으면 `playwright install chromium`)
실행:  저장소 맨 위에서  python game/build.py  후  python -m pytest game/tests -q
Chrome 위치가 다르면 환경변수 CHROME 에 실행 파일 경로를 넣어요.
GPU가 없는 환경에서도 돌도록 소프트웨어 렌더링(swiftshader)을 써요. 화면은 느려도 __game.sim()은 빨라요.
"""
import os
import pathlib

from playwright.sync_api import sync_playwright

REPO = pathlib.Path(__file__).resolve().parents[2]
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
GAME_URL = (REPO / 'game' / 'dist' / 'index.html').as_uri()
MODEL_URL = (REPO / '3d_model' / 'dist' / 'index.html').as_uri()


class Page:
    def __init__(self, url, ready, size=(640, 360), touch=False):
        self.pw = sync_playwright().start()
        kw = {'args': ARGS}
        if os.path.exists(CHROME):
            kw['executable_path'] = CHROME
        self.browser = self.pw.chromium.launch(**kw)
        self.ctx = self.browser.new_context(viewport={'width': size[0], 'height': size[1]}, has_touch=touch, is_mobile=touch)
        self.page = self.ctx.new_page()
        self.logs = []
        self.page.on('console', lambda m: self.logs.append(f'[{m.type}] {m.text}') if m.type == 'error' and 'GL Driver' not in m.text and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
        self.page.on('pageerror', lambda e: self.logs.append(f'[pageerror] {e}'))
        self.page.goto(url)
        self.page.wait_for_function(ready, timeout=90000)

    def js(self, code, arg=None):
        return self.page.evaluate(code, arg)

    def shot(self, path):
        self.page.screenshot(path=str(path))

    def close(self):
        self.browser.close()
        self.pw.stop()


def open_game(url=None, **kw):
    return Page(url or GAME_URL, 'window.__game !== undefined', **kw)


def open_model(url=None, **kw):
    return Page(url or MODEL_URL, 'window.__rc !== undefined', **kw)


AI_LAP = '''([secs, thr]) => {
  const g = __game; g.start('collect'); g.state.drive = 'local';
  if (thr) g.state.maxThr = thr;
  for (let t = 0; t < secs; t += 0.25) g.sim(0.25);
  const r = g.sim(0);
  return { laps: g.state.laps.map(x => +x.toFixed(2)), crashes: g.state.crashes, fell: g.state.fell || 0, x: r.x, z: r.z, records: g.state.records };
}'''


def ai_lap(pg, secs=40, thr=None):
    """기록 주행을 시작해 AI(local) 모드로 secs초 달린 결과."""
    return pg.js(AI_LAP, [secs, thr])
