"""3D 차 모델이 11-22 사진(차사진_20261122/)의 배치와 맞는지 확인.
좌표(mm): 원점 = 짐칸 뒤끝 가운데 바닥선, x 앞, y 위, z 오른쪽."""
import math

import pytest

import gamelib


@pytest.fixture(scope='module')
def rc():
    pg = gamelib.open_model(size=(900, 700))
    yield pg
    pg.close()


BOX = '''(name) => {
  let o = null;
  for (const p of Object.values(__rc.parts)) { o = p.group.name === name ? p.group : p.group.getObjectByName(name); if (o) break; }
  if (!o) return null;
  o.updateWorldMatrix(true, true);
  const b = new THREE.Box3().setFromObject(o, true);
  b.applyMatrix4(__rc.parts.bed.group.parent.matrixWorld.clone().invert());   // 뷰어가 모델을 가운데로 옮겨 두므로 모델 좌표로 되돌림
  return { min: b.min.toArray(), max: b.max.toArray() };
}'''


def test_powerbank_body_lies_tilted_on_tailgate(rc):
    b = rc.js(BOX, 'pb-body')
    assert b, '보조배터리 본체(pb-body)가 없어요'
    assert -12 <= b['min'][0] <= 0, b          # 뒷문보다 조금 튀어나옴
    assert 44 <= b['max'][0] <= 56, b          # Pi(x 52~) 바로 뒤까지
    assert 138 <= b['max'][1] <= 152, b        # 눕혀서 뒤가 들린 높이 (세워 둔 예전 모델은 159)
    assert 78 <= b['max'][2] - b['min'][2] <= 84, b   # 가로 81mm가 좌우 방향


def test_powerbank_is_no_longer_planned(rc):
    assert rc.js('() => !!__rc.parts.powerbank.def.planned') is False
    assert rc.js('() => document.querySelector(".chip[data-t=planned]")') is None


def test_powerbank_cable_loops_up_behind(rc):
    b = rc.js(BOX, 'pb-cable')
    assert b, '보조배터리 케이블(pb-cable)이 없어요'
    assert b['max'][1] >= 160 and b['min'][0] <= -25, b


def test_drive_battery_is_green(rc):
    c = rc.js('''() => { const m = __rc.parts.battery.group.getObjectByName('batt-body').material.color; return [m.r, m.g, m.b]; }''')
    assert c[1] > c[0] and c[1] > c[2], c


def test_camera_mount_cylinders_tilt_nose_down(rc):
    ang = rc.js('''() => {
      const o = __rc.parts.cammount.group.getObjectByName('mast');
      o.updateWorldMatrix(true, false);
      const e = new THREE.Vector3(1, 0, 0).transformDirection(o.matrixWorld);
      return Math.atan2(e.y, e.x) * 180 / Math.PI;
    }''')
    assert -18 <= ang <= -12, ang


def test_camera_height_matches_photos(rc):
    y = rc.js('() => __rc.rig.camHead.getWorldPosition(new THREE.Vector3()).y')
    assert 126 <= y <= 134, y


def test_i2c_ribbon_makes_big_loop_over_pi(rc):
    b = rc.js(BOX, 'i2c')
    assert 165 <= b['max'][1] <= 180, b
    assert b['min'][0] <= 75, b                # 고리가 Pi 뒤쪽 위까지 넘어감


def test_no_console_errors(rc):
    assert rc.logs == [], rc.logs
