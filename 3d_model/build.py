"""RC카 3D 분해도 페이지 빌드.

사용법 (저장소 맨 위 폴더에서):  python 3d_model/build.py
- 처음 한 번은 Node.js가 필요해요 (npm으로 three.js와 esbuild를 설치).
- 결과: 저장소 맨 위의 RC카_3D모델.html (한 파일, 인터넷 없이도 열림)
        3d_model/dist/index.html + three-bundle.js (claude.ai 아티팩트 게시용)
- 모델·부품 정보 수정은 src/app.js (DEFS = 부품 설명, B = 부품별 3D 모양), 화면 꾸밈은 src/template.html
"""
import pathlib, subprocess

here = pathlib.Path(__file__).resolve().parent
dist = here / 'dist'
dist.mkdir(exist_ok=True)
if not (here / 'node_modules' / 'three').exists():
    subprocess.run('npm install --silent', shell=True, cwd=here, check=True)
subprocess.run('npx esbuild src/lib.js --bundle --minify --format=iife --legal-comments=eof '
               '--alias:three/addons=./node_modules/three/examples/jsm --outfile=dist/three-bundle.js',
               shell=True, cwd=here, check=True)

tpl = (here / 'src/template.html').read_text(encoding='utf-8')
app = (here / 'src/app.js').read_text(encoding='utf-8')
lib = (dist / 'three-bundle.js').read_text(encoding='utf-8')
page = tpl.replace('/*APP*/', app)
(dist / 'index.html').write_text(page.replace('<!--THREE-->', '<script src="three-bundle.js"></script>'), encoding='utf-8')
single = page.replace('<!--THREE-->', '<script>\n' + lib.replace('</script', '<\\/script') + '\n</script>')
(here.parent / 'RC카_3D모델.html').write_text(single, encoding='utf-8')
print('완료:', here.parent / 'RC카_3D모델.html')
