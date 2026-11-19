# 🐴 2단계: DonkeyCar 설치 (라즈베리파이 5)

> 공식 최신 방식(DonkeyCar 5.4, Pi OS Trixie 기준). SSH로 접속한 Pi 터미널에서 실행.
> 모든 명령은 `pi@donkeycar:~ $` 프롬프트에 입력.

---

## STEP 1. raspi-config — I2C 켜기 + 파일시스템 확장

PCA9685(서보 제어)가 I2C를 쓰므로 **I2C를 켜야** 함.

```bash
sudo raspi-config
```

메뉴에서 (방향키·엔터로 이동):
1. **Interface Options** → **I2C** → **Yes** (켜기)
2. **Advanced Options** → **Expand Filesystem** (SD카드 전체 용량 쓰기)
3. **Finish** → 재부팅 물어보면 **Yes**

재부팅되면 SSH 끊김 → 1~2분 후 다시 접속:
```powershell
ssh pi@donkeycar.local
```
(우리 집 5GHz WiFi에서는 `.local`이 안 돼서 **`ssh pi@192.168.0.155`** 로 접속)

> 카메라는 Trixie에서 기본 활성화라 따로 안 켜도 됨 (legacy 카메라는 건드리지 말 것).

---

## STEP 2. 카메라 시스템 패키지 설치

```bash
sudo apt install -y python3-libcamera python3-picamera2
```

---

## STEP 3. uv 설치 (파이썬 패키지 관리 도구)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

설치 후 터미널에 적용:
```bash
source ~/.bashrc
```
확인:
```bash
uv --version
```
(버전 나오면 OK. "command not found"면 → `source $HOME/.local/bin/env` 후 재시도)

---

## STEP 4. 가상환경 생성 (한 번만)

시스템 파이썬 + 시스템 패키지 접근 가능한 venv 생성:
```bash
uv venv ~/env --python 3.13 --system-site-packages
```

로그인할 때마다 자동 활성화 설정:
```bash
echo 'source ~/env/bin/activate' >> ~/.bashrc
source ~/env/bin/activate
```

→ 이제 프롬프트 앞에 `(env)` 가 붙음: `(env) pi@donkeycar:~ $`

> 💡 `--python 3.13`은 OS에 깔린 파이썬 버전에 맞춤. 에러 나면 설치된 버전 확인:
> `python3 --version` → 그 버전 번호로 바꿔서 재시도 (예: 3.11, 3.12)

---

## STEP 5. DonkeyCar 설치

```bash
uv pip install donkeycar[pi]
```
(몇 분~십몇 분 걸림. 라이브러리 많이 받음)

---

## STEP 6. 설치 확인

**DonkeyCar 버전:**
```bash
donkey --help
```
(도움말 뜨면 OK)

**TensorFlow 확인 (학습/추론 엔진):**
```bash
python -c "import tensorflow; print(tensorflow.__version__)"
```
→ 버전 번호가 에러 없이 나오면 성공. **그 버전 번호 적어둘 것** (나중에 문제 생기면 중요)

---

## STEP 7. DonkeyCar 앱(프로젝트) 생성

내 차 프로젝트 폴더 생성:
```bash
donkey createcar --path ~/mycar
```

→ `~/mycar` 폴더에 설정파일(`myconfig.py`)·스크립트 생성됨.
이게 앞으로 **데이터 수집·학습·주행의 작업 폴더**야.

---

## ✅ 이 단계 목표
- [x] raspi-config: I2C 켜기 + 파일시스템 확장
- [ ] 카메라 패키지 설치 → 설치 여부 기록 없음. `python -c "import picamera2"` 가 에러 없이 끝나면 완료
- [x] uv 설치 (0.13.6)
- [x] 가상환경(env) 생성 + 자동활성화 (Python 3.13.5)
- [x] donkeycar 설치 (5.4.0, `donkey --help` 작동)
- [ ] tensorflow import 확인 → ⏸ 자율주행 단계로 연기 (아래 TODO)
- [x] `~/mycar` 앱 생성

여기까지 되면 → **다음: RC카 개조 + 캘리브레이션** ([03_RC카개조_체크리스트.md](03_RC카개조_체크리스트.md), 배선도는 [하드웨어_설계.md](하드웨어_설계.md))

---

## 🆘 막히면
- **버전 에러**(python 3.13 없음) → `python3 --version`으로 실제 버전 확인 후 그 번호로
- **uv not found** → `source $HOME/.local/bin/env` 실행 후 재시도
- **설치 중 빨간 에러** → 메시지 **그대로 복사**해서 물어보기 (버전 충돌이 흔함)
- DonkeyCar 공식: https://docs.donkeycar.com/guide/robot_sbc/setup_raspberry_pi/

---

## ⚠️ 알려진 이슈 / TODO (2026-11 진행 기록)

### ✅ 완료
- OS(Trixie) · I2C · uv · 가상환경(env, Python 3.13.5) · donkeycar[pi] 본체 · `~/mycar` 앱 생성

### 🔲 TODO: 추론 엔진(TensorFlow/TFLite) — 자율주행 단계에서 해결
- **증상:** `donkeycar[pi]` 설치됐지만 **tensorflow 미설치** (`import tensorflow` 실패)
- **원인 추정:** Python 3.13 + aarch64 조합에서 TF 자동설치 스킵 (TF의 3.13 지원 지연)
- **영향:** RC카 개조·캘리브레이션·**데이터 수집까지는 문제없음**.
  학습은 **PC(RTX 5060)**에서 하므로 Pi엔 불필요. **자율주행(모델 추론) 직전에만** 필요.
- **해결 시점:** 자율주행 단계에서 아래 중 하나로:
  1. **TFLite 런타임만** 설치 (경량, Pi 추론용으로 충분) — `uv pip install tflite-runtime` 계열
  2. aarch64용 TensorFlow wheel 설치
  3. Python 3.11/3.12 환경으로 별도 venv (TF 호환 잘 되는 버전)
- → 지금은 넘어가고, 자율주행 직전에 결정

---

## 📷 카메라 인식 기록 (2026-11)

- **증상:** `rpicam-jpeg`에서 `no cameras available` (자동 감지 실패, dmesg에 imx219 없음)
- **해결:** `/boot/firmware/config.txt`의 `[all]` 아래에 **`dtoverlay=imx219,cam0`** 추가 후 재부팅
  → `rpicam-hello --list-cameras`에 `imx219 [3280x2464]` 인식됨
- **교훈:** 이 클론 IMX219 모듈은 `camera_auto_detect=1`로는 안 잡히고 **오버레이 강제 지정이 필요**.
  이 줄은 **지우지 말 것**. (포트를 바꾸면 `cam0` ↔ `cam1` 변경)
- 지원 모드: 640x480@200fps, 1640x1232@81fps, 1920x1080@47fps, 3280x2464@21fps
  (DonkeyCar 기본 160x120은 이 중 640x480을 줄여 사용)

### ✅ 주행 프로그램에서 카메라 오류 (2026-11-17 발생 → 11-18 정상)
- 11-17: `python manage.py drive` 실행 시 `Failed to queue buffer ... Remote I/O error`가 반복되며 프로그램이 멈춤
- 11-18: `rpicam-hello --list-cameras`(imx219 인식), `rpicam-hello -t 5000 -n`(5초 연속 영상) 정상 → `drive`도 `PiCamera ready.` → `Starting vehicle at 20 Hz`까지 정상. 케이블 재장착은 하지 않아서 **원인은 미확인**
- 재발하면: ① 리본 케이블 ② 전원 불안정(`vcgencmd get_throttled`가 0x0인지) ③ 다른 프로세스가 카메라를 잡고 있음(`ps aux | grep -E "rpicam|libcamera|python"`) 순으로 확인
- `drive` 로그의 `pigpio was not imported`, `/dev/input/js0 is missing`(게임패드 미연결)은 무시해도 됨

### ⚠️ 웹 UI에 디자인·영상이 안 나옴 — `static` 폴더 누락 (2026-11-18 해결)
- 증상: `http://192.168.0.155:8887`이 글자만 보이고 영상 칸이 깨진 그림. `/video`를 열면 `img_placeholder.jpg` `FileNotFoundError`
- 원인: **DonkeyCar 5.4.0 pip 설치본에 `donkeycar/parts/web_controller/templates/static` 폴더가 빠져 있음** (같은 버전 wheel을 열어서 확인)
- 해결 (Pi 터미널):
  ```bash
  git clone --depth 1 --branch 5.4.0 https://github.com/autorope/donkeycar.git ~/donkeycar-src
  cp -r ~/donkeycar-src/donkeycar/parts/web_controller/templates/static ~/env/lib/python3.13/site-packages/donkeycar/parts/web_controller/templates/
  ```
- DonkeyCar를 다시 설치·업데이트하면 다시 해야 함

### ⚠️ 웹 UI 조종이 안 먹힘 — 게임패드 기본 설정 (2026-11-18)
- 템플릿 기본값 `USE_JOYSTICK_AS_DEFAULT = True` → 게임패드 부품이 웹 UI 조종 값을 0으로 덮어씀 (로그에 `Adding part XboxOneJoystickController`)
- 웹 UI로 조종하려면 `myconfig.py`에 `USE_JOYSTICK_AS_DEFAULT = False`. 지금은 게임패드를 쓰므로 `True`

### 🎮 게임패드(MOGA XP5-X Plus) 연결 (2026-11-18~19)
- 페어링: `bluetoothctl` → `power on` → `agent on` → `default-agent` → `scan on` → 패드 페어링 버튼 3초 → **새로 뜬 주소로** `pair` / `trust` / `connect` → `scan off` → `exit`
  - 패드의 블루투스 주소가 페어링할 때마다 바뀔 수 있음. 예전 주소로 하면 `ConnectionAttemptFailed`나 `le-connection-abort-by-local`(붙었다 끊김 반복)이 남
  - 이 과정에서 `/etc/bluetooth/main.conf`에 `ControllerMode = dual`, `JustWorksRepairing = confirm`을 넣도록 안내함 (적용 여부 미확인)
- 확인: `ls /dev/input/js0`, `sudo apt install -y joystick`, `jstest /dev/input/js0`
- `CONTROLLER_TYPE = 'xbox'`(기본값) 그대로 맞음. 트리거 방향 버그 수정은 [AGENTS.md](AGENTS.md) 6번

### 🔍 초점 맞추기 (⬜ 미완료)
- 웹 UI 영상은 160x120을 확대해서 보여 줘서 원래 조금 뭉개져 보임 → 차를 바닥에 두고 앞쪽 바닥이 보이는지로 판단 예정
- 첫 테스트 사진이 **많이 흐렸음** → 렌즈 초점이 안 맞은 상태
- 렌즈 통을 손으로 돌려 **50cm~1m 거리**에 맞추기. 실시간 영상을 보면서 조정:
  ```bash
  # Pi에서 (Ctrl+C로 종료)
  rpicam-vid -t 0 --codec mjpeg --width 640 --height 480 --inline --listen -o tcp://0.0.0.0:8888
  ```
  PC의 VLC → 미디어 → 네트워크 스트림 열기 → `tcp/mjpeg://192.168.0.155:8888`
- 사진을 PC로 가져오기: Pi에서 `rpicam-jpeg -o ~/test.jpg` → PC에서 `scp pi@192.168.0.155:~/test.jpg .`
- 사진에 **자홍색 기운**도 있었음. 초점과는 별개 문제일 수 있음 (적외선 차단 필터가 없는 렌즈이거나 색 보정 문제).
  초점을 맞춘 뒤에도 남으면 따로 확인. 학습에는 색이 일정하기만 하면 큰 지장은 없음
