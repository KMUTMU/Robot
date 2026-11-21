"""RC카 주행 게임 페이지 빌드.

사용법 (저장소 맨 위 폴더에서):  python game/build.py
- 차 모양은 3D 분해도와 같은 코드를 씁니다: 3d_model/src/app.js 의
  "캔버스 텍스처" ~ "조립" 부분을 잘라 게임 코드(/*CAR*/ 자리)에 넣어요.
  그래서 3D 모델에서 부품을 고치면 다시 빌드만 하면 게임 속 차도 같이 바뀝니다.
- three.js 묶음(3d_model/dist/three-bundle.js)이 없으면 3d_model/build.py 를 먼저 실행해요 (Node.js 필요).
- 결과: 저장소 맨 위의 RC카_주행게임.html (한 파일, 인터넷 없이도 열림. 글꼴만 인터넷에서 받음)
        game/dist/index.html + three-bundle.js (claude.ai 아티팩트 게시용)
- 소스: src/core.js(렌더러·공용 도우미) → src/maps/*.js(맵 하나에 파일 하나) → src/main.js(차·물리·화면)를
  이 순서로 이어 붙여요. 맵을 고치거나 빼려면 src/maps/ 의 파일과 아래 MAP_ORDER 를 고치면 돼요.
- 화면 꾸밈은 src/template.html
"""
import pathlib, shutil, subprocess, sys

here = pathlib.Path(__file__).resolve().parent
repo = here.parent
model = repo / '3d_model'
bundle = model / 'dist' / 'three-bundle.js'
if not bundle.exists():
    subprocess.run([sys.executable, str(model / 'build.py')], check=True)

app = (model / 'src' / 'app.js').read_text(encoding='utf-8')
a = app.index('  /* --- 캔버스 텍스처 --- */')
b = app.index('  /* --- 조립 --- */')
ids = ['bed', 'frame', 'drive', 'shafts', 'faxle', 'raxle', 'links', 'shocks', 'wheels', 'servo', 'steerlink',
       'frontbox', 'plate', 'pi', 'pca', 'esc', 'ubec', 'battery', 'terminals', 'powerbank', 'camera', 'cammount',
       'fpc', 'servocables', 'powerwires', 'i2c', 'velcro']
car = ('function buildCar() {\n' + app[a:b] +
       '  const car = new T.Group();\n'
       f'  for (const id of {ids!r}) {{ const g = new T.Group(); g.name = id; B[id](g); car.add(g); }}\n'
       '  return { car, rig, RX, FX, WY };\n}\n')

MAP_ORDER = ['house', 'living', 'desk', 'moon', 'bowling', 'ice']
src = here / 'src'
parts = [src / 'core.js'] + [src / 'maps' / f'{m}.js' for m in MAP_ORDER if (src / 'maps' / f'{m}.js').exists()] + [src / 'main.js']
game = "(() => {\n'use strict';\n" + '\n'.join(p.read_text(encoding='utf-8') for p in parts) + '\n})();\n'
if '/*CAR*/' not in game:
    raise SystemExit('src/core.js 에 /*CAR*/ 자리가 없어요')
game = game.replace('/*CAR*/', car)
tpl = (here / 'src' / 'template.html').read_text(encoding='utf-8')
page = tpl.replace('/*GAME*/', game.replace('</script', '<\\/script'))

dist = here / 'dist'
dist.mkdir(exist_ok=True)
shutil.copyfile(bundle, dist / 'three-bundle.js')
(dist / 'index.html').write_text(page.replace('<!--THREE-->', '<script src="three-bundle.js"></script>'), encoding='utf-8')
lib = bundle.read_text(encoding='utf-8')
single = page.replace('<!--THREE-->', '<script>\n' + lib.replace('</script', '<\\/script') + '\n</script>')
(repo / 'RC카_주행게임.html').write_text(single, encoding='utf-8')
print('완료:', repo / 'RC카_주행게임.html', f'({len(single.encode()) / 1e6:.2f} MB)')
