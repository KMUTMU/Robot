# -*- coding: utf-8 -*-
"""중간 점검 발표 자료(중간점검_자율주행RC카.pptx) 생성 스크립트.

사용법 (Robot 폴더에서):
    pip install python-pptx==1.0.2
    python build_deck.py

- 사진은 이 스크립트와 같은 폴더의 KakaoTalk_*.jpg, 단자대.jpg 를 사용합니다.
- 내용을 고치려면 아래 슬라이드별 블록(# ---- N. ...)의 텍스트·숫자를 수정한 뒤 다시 실행하세요.
- 같은 이름의 pptx가 PowerPoint에서 열려 있으면 저장에 실패하므로 먼저 닫아 주세요.
"""
import os
import tempfile
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn
from lxml import etree
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "중간점검_자율주행RC카.pptx")
TMP = os.path.join(tempfile.gettempdir(), "deck_big")
os.makedirs(TMP, exist_ok=True)

NAVY = RGBColor(0x0B, 0x1F, 0x3A)
TEAL = RGBColor(0x00, 0x8C, 0x8C)
ORANGE = RGBColor(0xF2, 0x8C, 0x28)
RED = RGBColor(0xC0, 0x39, 0x2B)
GRAY = RGBColor(0x5F, 0x6B, 0x7A)
LIGHT = RGBColor(0xEE, 0xF2, 0xF7)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
BG = RGBColor(0xF7, 0xF9, 0xFC)
FONT = "맑은 고딕"

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]
state = {"n": 0}


# ------------------------------------------------------------------ helpers
def style_run(run, size, bold=False, color=NAVY):
    f = run.font
    f.size = Pt(size)
    f.bold = bold
    f.color.rgb = color
    f.name = FONT
    rPr = run._r.get_or_add_rPr()
    for tag in ("a:ea", "a:cs"):
        el = rPr.find(qn(tag))
        if el is None:
            el = etree.SubElement(rPr, qn(tag))
        el.set("typeface", FONT)


def add_text(slide, text, l, t, w, h, size=16, bold=False, color=NAVY,
             align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, line_spacing=1.1):
    tb = slide.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(0.05)
    tf.margin_top = tf.margin_bottom = Inches(0.03)
    lines = text if isinstance(text, list) else [text]
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        if i > 0:
            p.space_before = Pt(5)
        r = p.add_run()
        r.text = line
        style_run(r, size, bold, color)
    return tb


def add_box(slide, l, t, w, h, fill=LIGHT, line=None, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.08):
    s = slide.shapes.add_shape(shape, Inches(l), Inches(t), Inches(w), Inches(h))
    s.fill.solid()
    s.fill.fore_color.rgb = fill
    if line is None:
        s.line.fill.background()
    else:
        s.line.color.rgb = line
        s.line.width = Pt(1.5)
    s.shadow.inherit = False
    if shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        s.adjustments[0] = radius
    return s


def box_text(shape, lines, size=14, bold=False, color=NAVY, align=PP_ALIGN.CENTER):
    tf = shape.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = tf.margin_right = Inches(0.06)
    tf.margin_top = tf.margin_bottom = Inches(0.03)
    lines = lines if isinstance(lines, list) else [lines]
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        r = p.add_run()
        r.text = line
        b = bold if i == 0 else False
        sz = size if i == 0 else max(size - 3, 10)
        style_run(r, sz, b, color)


def arrow(slide, x1, y1, x2, y2, color=GRAY, width=2.25, label=None, lx=0, ly=0, lw=1.6, both=False):
    c = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(x1), Inches(y1), Inches(x2), Inches(y2))
    c.line.color.rgb = color
    c.line.width = Pt(width)
    ln = c.line._get_or_add_ln()
    t = etree.SubElement(ln, qn("a:tailEnd"))
    t.set("type", "triangle")
    if both:
        h = etree.SubElement(ln, qn("a:headEnd"))
        h.set("type", "triangle")
        ln.remove(h)
        ln.insert(list(ln).index(t), h)
    if label:
        add_text(slide, label, (x1 + x2) / 2 - lw / 2 + lx, (y1 + y2) / 2 - 0.32 + ly, lw, 0.3,
                 size=11, color=color, align=PP_ALIGN.CENTER)


def fit_image(path, maxw=1700):
    im = Image.open(path)
    im = ImageOps.exif_transpose(im).convert("RGB")
    im.thumbnail((maxw, maxw))
    out = os.path.join(TMP, "t_" + str(abs(hash(path))) + ".jpg")
    im.save(out, quality=85)
    return out, im.size


def add_image(slide, name, l, t, w, h, caption=None, cap_size=12):
    cap_h = 0.42 if caption else 0
    bw, bh = w, h - cap_h
    src = os.path.join(ROOT, name)
    if not os.path.exists(src):
        # 사진이 폴더에 없으면 자리 표시 상자로 대체하고 계속 진행
        print("사진 없음 (자리 표시로 대체):", name)
        ph = add_box(slide, l, t, bw, bh, fill=LIGHT, line=RGBColor(0xC9, 0xD1, 0xDB), shape=MSO_SHAPE.RECTANGLE)
        box_text(ph, ["사진 파일 없음", name], size=12, color=GRAY)
        if caption:
            add_text(slide, caption, l, t + bh + 0.04, w, cap_h, size=cap_size, color=GRAY, align=PP_ALIGN.CENTER)
        return l, t, bw, bh
    path, (iw, ih) = fit_image(src)
    scale = min(bw / iw, bh / ih)
    dw, dh = iw * scale, ih * scale
    dl = l + (bw - dw) / 2
    dt = t + (bh - dh) / 2
    add_box(slide, dl - 0.04, dt - 0.04, dw + 0.08, dh + 0.08, fill=WHITE, line=RGBColor(0xC9, 0xD1, 0xDB),
            shape=MSO_SHAPE.RECTANGLE)
    slide.shapes.add_picture(path, Inches(dl), Inches(dt), Inches(dw), Inches(dh))
    if caption:
        add_text(slide, caption, l, t + bh + 0.04, w, cap_h, size=cap_size, color=GRAY, align=PP_ALIGN.CENTER)
    return dl, dt, dw, dh


def marker(slide, rect, fx, fy, num, color=ORANGE):
    dl, dt, dw, dh = rect
    d = 0.34
    s = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(dl + dw * fx - d / 2), Inches(dt + dh * fy - d / 2),
                               Inches(d), Inches(d))
    s.fill.solid()
    s.fill.fore_color.rgb = color
    s.line.color.rgb = WHITE
    s.line.width = Pt(1.5)
    s.shadow.inherit = False
    box_text(s, str(num), size=12, bold=True, color=WHITE)


def add_table(slide, data, l, t, w, col_w, row_h=0.4, size=12, header_fill=NAVY, first_col_bold=False,
              align_cols=None):
    rows, cols = len(data), len(data[0])
    gf = slide.shapes.add_table(rows, cols, Inches(l), Inches(t), Inches(w), Inches(row_h * rows))
    tbl = gf.table
    tblPr = tbl._tbl.tblPr
    tblPr.set("bandRow", "0")
    tblPr.set("firstRow", "0")
    tot = sum(col_w)
    for i, cw in enumerate(col_w):
        tbl.columns[i].width = Inches(w * cw / tot)
    for r in range(rows):
        tbl.rows[r].height = Inches(row_h)
        for c in range(cols):
            cell = tbl.cell(r, c)
            cell.margin_left = cell.margin_right = Inches(0.08)
            cell.margin_top = cell.margin_bottom = Inches(0.03)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            cell.fill.solid()
            if r == 0:
                cell.fill.fore_color.rgb = header_fill
            else:
                cell.fill.fore_color.rgb = WHITE if r % 2 else LIGHT
            tf = cell.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            if align_cols and c in align_cols:
                p.alignment = align_cols[c]
            run = p.add_run()
            run.text = str(data[r][c])
            if r == 0:
                style_run(run, size, True, WHITE)
            else:
                style_run(run, size, first_col_bold and c == 0, NAVY)
    return tbl


def new_slide(title, subtitle=None, notes=None):
    s = prs.slides.add_slide(BLANK)
    state["n"] += 1
    bg = s.background.fill
    bg.solid()
    bg.fore_color.rgb = BG
    bar = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.22), Inches(7.5))
    bar.fill.solid()
    bar.fill.fore_color.rgb = TEAL
    bar.line.fill.background()
    add_text(s, title, 0.6, 0.35, 12.0, 0.7, size=30, bold=True, color=NAVY)
    if subtitle:
        add_text(s, subtitle, 0.62, 1.0, 12.0, 0.4, size=16, color=GRAY)
    ln = s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(0.6), Inches(7.0), Inches(12.75), Inches(7.0))
    ln.line.color.rgb = RGBColor(0xD5, 0xDB, 0xE3)
    ln.line.width = Pt(1)
    add_text(s, "지도학습 기반 자율주행 RC카  |  중간 점검", 0.6, 7.05, 8, 0.3, size=11, color=GRAY)
    add_text(s, str(state["n"]), 12.0, 7.05, 0.75, 0.3, size=11, color=GRAY, align=PP_ALIGN.RIGHT)
    if notes:
        s.notes_slide.notes_text_frame.text = notes
    return s


def pill(slide, text, l, t, w, h, fill, size=12):
    p = add_box(slide, l, t, w, h, fill=fill, radius=0.5)
    box_text(p, text, size=size, bold=True, color=WHITE)
    return p


# ------------------------------------------------------------------ 1. Title
s = prs.slides.add_slide(BLANK)
state["n"] += 1
bg = s.background.fill
bg.solid()
bg.fore_color.rgb = NAVY
left = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.35), Inches(7.5))
left.fill.solid()
left.fill.fore_color.rgb = TEAL
left.line.fill.background()
add_text(s, "지도학습 기반 자율주행 RC카", 0.9, 1.7, 7.3, 1.0, size=32, bold=True, color=WHITE)
add_text(s, "DonkeyCar · Raspberry Pi 5 · WPL C24-1", 0.9, 2.95, 7.2, 0.6, size=22, color=RGBColor(0x9F, 0xE0, 0xE0))
add_text(s, "중간 점검 발표", 0.9, 3.75, 7.2, 0.5, size=20, color=WHITE)
add_text(s, ["카메라 영상으로 조향을 학습하는 실물 RC카를 직접 만들고 있습니다.",
             "부품 선정부터 분해, 배선, 보정까지의 진행 과정과 실험 환경을 공유합니다."],
         0.9, 4.7, 6.8, 1.2, size=15, color=RGBColor(0xC8, 0xD3, 0xE0))
if os.path.exists(os.path.join(ROOT, "KakaoTalk_20261109_150928423_02.jpg")):
    tp, _ = fit_image(os.path.join(ROOT, "KakaoTalk_20261109_150928423_02.jpg"))
    s.shapes.add_picture(tp, Inches(8.25), Inches(1.5), width=Inches(4.7))
s.notes_slide.notes_text_frame.text = (
    "오늘은 변신 로봇으로 시작했다가 지도학습 기반 자율주행 RC카로 방향을 정한 뒤, "
    "현재까지 만든 하드웨어와 실험 환경, 검증 결과를 순서대로 설명하겠습니다.")

# ------------------------------------------------------------------ 2. Goal
s = new_slide("프로젝트 목표와 접근 방식", "사람이 운전한 데이터를 모방하는 행동 복제(Behavioral Cloning)",
              "시뮬레이터 대신 실제 차량 사양에 맞춰 학습하기로 했습니다. 차량마다 조향 범위와 카메라 시야가 달라서, "
              "실차 데이터로 학습해야 그대로 쓸 수 있기 때문입니다.")
steps = [
    ("1  데이터 수집", "사람이 게임패드로 주행하며\n카메라 영상 + 조향·스로틀 값을 저장", "Raspberry Pi 5 + 게임패드"),
    ("2  모델 학습", "수집한 데이터를 PC로 옮겨\nCNN을 학습", "RTX 5060 Laptop PC"),
    ("3  자율주행", "학습한 모델을 Pi에 올려\n영상만 보고 조향을 예측", "Pi 5 + TFLite/TF"),
]
for i, (h, d, who) in enumerate(steps):
    x = 0.7 + i * 4.15
    add_box(s, x, 1.75, 3.7, 2.55, fill=WHITE, line=RGBColor(0xC9, 0xD1, 0xDB))
    add_text(s, h, x + 0.2, 1.9, 3.3, 0.5, size=21, bold=True, color=TEAL)
    add_text(s, d.split("\n"), x + 0.2, 2.55, 3.3, 1.2, size=15)
    pill(s, who, x + 0.2, 3.65, 2.6, 0.4, NAVY, 12)
    if i < 2:
        arrow(s, x + 3.72, 3.0, x + 4.13, 3.0, color=ORANGE, width=3)
add_text(s, "제약 조건", 0.7, 4.65, 3, 0.4, size=18, bold=True)
cons = [("예산", "20만원 이내"), ("환경", "실내 주행, 저속"), ("카메라 입력", "160×120 해상도로 축소"),
        ("차체", "시판 RC카 개조 (조향 비례 제어)")]
for i, (k, v) in enumerate(cons):
    x = 0.7 + i * 3.1
    add_box(s, x, 5.15, 2.9, 1.2, fill=LIGHT)
    add_text(s, k, x + 0.15, 5.22, 2.6, 0.35, size=13, color=GRAY)
    add_text(s, v, x + 0.15, 5.6, 2.6, 0.7, size=16, bold=True)

# ------------------------------------------------------------------ 3. Timeline
s = new_slide("진행 순서", "10단계 중 9단계 완료, 다음은 ESC 배선과 스로틀 보정",
              "각 단계는 실제 명령 출력이나 사진으로 확인한 결과입니다. 개조용 ESC와 단자대가 도착했고, 순정 보드로 다시 주행해 "
              "차가 정상인 것도 확인했습니다. 다음은 ESC 배선과 스로틀 보정입니다.")
items = [
    ("주제 전환", "변신 로봇에서\n자율주행 RC카로", "done"),
    ("플랫폼·부품 선정", "예산 내 후보를\n비교해 확정", "done"),
    ("Pi OS · SSH", "64-bit OS, WiFi 접속", "done"),
    ("DonkeyCar 설치", "v5.4.0, mycar 생성", "done"),
    ("I2C · PCA9685", "0x40 응답 확인", "done"),
    ("카메라 인식", "IMX219 overlay 적용", "done"),
    ("차량 분해·분석", "수신/구동 보드가\n일체형임을 확인", "done"),
    ("서보 보정", "340 / 400 / 460", "done"),
    ("ESC·전원 부품", "ESC·단자대 도착,\n순정 주행 재확인", "done"),
    ("ESC 배선 · 보정", "단자대로 전원 분배,\n스로틀 보정", "now"),
]
colors = {"done": TEAL, "now": ORANGE, "todo": RGBColor(0x9A, 0xA5, 0xB1)}
labels = {"done": "완료", "now": "다음", "todo": "예정"}
for i, (h, d, st) in enumerate(items):
    r, c = divmod(i, 5)
    x = 0.65 + c * 2.45
    y = 1.65 + r * 2.65
    add_box(s, x, y, 2.3, 2.35, fill=WHITE, line=colors[st])
    circ = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x + 0.15), Inches(y + 0.15), Inches(0.5), Inches(0.5))
    circ.fill.solid()
    circ.fill.fore_color.rgb = colors[st]
    circ.line.fill.background()
    circ.shadow.inherit = False
    box_text(circ, str(i + 1), size=15 if i < 9 else 12, bold=True, color=WHITE)
    pill(s, labels[st], x + 1.3, y + 0.2, 0.85, 0.34, colors[st], 11)
    add_text(s, h, x + 0.12, y + 0.8, 2.1, 0.5, size=16, bold=True)
    add_text(s, d.split("\n"), x + 0.12, y + 1.3, 2.1, 0.95, size=13, color=GRAY)

# ------------------------------------------------------------------ 4. System diagram
s = new_slide("시스템 구성도 (신호 계통)", "카메라 입력, Pi 5 판단, PCA9685가 서보와 ESC에 PWM 출력",
              "Pi는 PWM을 직접 정밀하게 내지 못해서 PCA9685를 I2C로 붙입니다. 채널 0은 조향 서보, 채널 1은 ESC입니다. "
              "PC는 같은 WiFi에서 SSH로 접속해 데이터를 옮기고 모델을 받습니다.")


def node(l, t, w, h, title, sub, fill=WHITE, line=NAVY, tcolor=NAVY):
    b = add_box(s, l, t, w, h, fill=fill, line=line)
    box_text(b, [title, sub] if sub else [title], size=15, bold=True, color=tcolor)
    return b


node(0.5, 1.6, 2.9, 1.2, "PC", "Windows 11 · RTX 5060 · 모델 학습")
node(4.0, 1.6, 2.7, 0.95, "카메라 IMX219", "8MP · 160° · CSI")
node(4.0, 3.2, 2.7, 1.4, "Raspberry Pi 5", "DonkeyCar 5.4.0\nPython 3.13", fill=NAVY, line=NAVY, tcolor=WHITE)
node(7.9, 3.2, 2.4, 1.4, "PCA9685", "16ch PWM (I2C 0x40)", fill=WHITE, line=TEAL)
node(10.9, 1.75, 2.1, 0.95, "조향 서보", "ch0 (보정 완료)", fill=WHITE, line=TEAL)
node(10.9, 3.35, 2.1, 0.95, "ESC", "ch1 (도착, 설치 전)", fill=WHITE, line=ORANGE)
node(10.9, 4.7, 2.1, 0.9, "구동 모터", "브러시드 DC", fill=WHITE, line=ORANGE)
arrow(s, 5.35, 2.55, 5.35, 3.2, color=GRAY, label="MIPI CSI", lx=0.75, ly=0.12, lw=1.2)
arrow(s, 6.7, 3.9, 7.9, 3.9, color=TEAL, label="I2C (SDA/SCL)", ly=0.0, lw=1.5)
arrow(s, 10.3, 3.55, 10.9, 2.35, color=TEAL, label="ch0", lx=-0.12, ly=-0.12, lw=0.6)
arrow(s, 10.3, 3.9, 10.9, 3.85, color=ORANGE, label="ch1", lx=-0.05, ly=-0.30, lw=0.6)
arrow(s, 11.95, 4.3, 11.95, 4.7, color=ORANGE)
arrow(s, 3.0, 2.8, 4.1, 3.4, color=GRAY, both=True, label="WiFi · SSH", lx=-0.7, ly=0.45, lw=1.3)
for i, (c, t) in enumerate([(TEAL, "확인 완료"), (ORANGE, "설치 예정")]):
    sq = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.7), Inches(5.0 + i * 0.4), Inches(0.25), Inches(0.25))
    sq.fill.solid()
    sq.fill.fore_color.rgb = c
    sq.line.fill.background()
    sq.shadow.inherit = False
    add_text(s, t, 1.05, 4.95 + i * 0.4, 2, 0.3, size=13, color=GRAY)
add_box(s, 0.6, 5.95, 9.9, 0.9, fill=LIGHT)
add_text(s, ["Pi 5는 PWM을 직접 정밀 출력하기 어렵기 때문에 PCA9685를 I2C로 연결해 서보와 ESC를 구동합니다.",
             "전원 계통은 별도 슬라이드에서 설명합니다."], 0.8, 6.0, 9.6, 0.85, size=13)

# ------------------------------------------------------------------ 5. Platform
s = new_slide("플랫폼 선정: WPL C24-1", "개조하기 쉽고, 조향이 비례 제어이며, 속도가 낮은 차를 기준으로 선정",
              "자율주행용으로는 조향이 서보로 부드럽게 제어되어야 합니다. 그래서 차동 조향 스마트카 섀시는 제외했고, "
              "실내에서 쓰기에 너무 빠른 후보도 제외했습니다.")
add_image(s, "KakaoTalk_20261109_150928423.jpg", 0.6, 1.5, 6.1, 4.4, "현재 상태 (측면): 배터리는 짐칸에 임시 보관")
data = [["항목", "내용"],
        ["모델", "WPL C24-1 (RTR)"],
        ["구동 구조", "중앙 기어박스 + 앞뒤 구동축 (사진 확인)"],
        ["조향", "서보 비례 제어 (직접 확인)"],
        ["배터리", "7.4V 2S, 1200mAh × 2"],
        ["가격", "28,450원"]]
add_table(s, data, 7.0, 1.55, 5.8, [1.1, 2.9], row_h=0.5, size=13, first_col_bold=True)
add_text(s, "제외한 후보", 7.0, 4.75, 5, 0.4, size=17, bold=True)
add_text(s, ["• WLtoys 144001: 최고 속도가 높아 실내용으로 부적합",
             "• 스마트카 섀시: 차동 조향이라 조향 각도 학습에 부적합",
             "• A959 계열: 구동 보드가 일체형이라 개조 난도 높음"], 7.0, 5.15, 5.8, 1.7, size=13, color=GRAY)
add_text(s, "※ 제원은 판매 페이지와 직접 촬영한 사진 기준입니다.", 0.6, 6.45, 6.0, 0.4, size=11, color=GRAY)

# ------------------------------------------------------------------ 6. Compute
s = new_slide("컴퓨팅 보드: Raspberry Pi 5 (1GB)", "160×120 입력의 작은 CNN 추론에는 충분합니다",
              "Zero 2 W는 품절이거나 가격이 너무 높았습니다. 1GB 모델은 이미지를 작게 줄여 쓰는 이번 용도에 맞고, "
              "더 큰 모델은 나중에 양자화하거나 별도 보드를 쓰는 것으로 정리했습니다.")
data = [["항목", "사양"],
        ["SoC", "BCM2712, 4코어 Cortex-A76 2.4GHz"],
        ["메모리", "1GB LPDDR4X"],
        ["카메라", "22핀 MIPI CSI 포트"],
        ["OS", "Raspberry Pi OS 64-bit (Debian Trixie)"],
        ["냉각", "듀얼 쿨러 케이스 + 방열판, 유휴 42.2°C 측정"]]
add_table(s, data, 0.65, 1.6, 6.3, [1.0, 3.6], row_h=0.55, size=13, first_col_bold=True)
add_text(s, "비교한 후보", 7.3, 1.55, 5, 0.4, size=18, bold=True)
data2 = [["후보", "판단"],
         ["Pi Zero 2 W", "품절·고가 (10만원 이상)"],
         ["Pi 3B+", "성능 여유 부족"],
         ["Pi 4", "Pi 5 대비 이점 적음"],
         ["Pi 5 2GB", "가격 부담"],
         ["Pi 5 1GB", "채택 (76,600원)"]]
add_table(s, data2, 7.3, 2.05, 5.5, [1.5, 2.8], row_h=0.5, size=13, first_col_bold=True)
add_box(s, 0.65, 5.2, 12.15, 1.45, fill=LIGHT)
add_text(s, ["메모리가 작은 대신 입력을 160×120으로 줄여 부담을 낮춥니다.",
             "더 큰 모델(RNN·Transformer 등)은 양자화한 TFLite로 올리거나, PC로 영상을 보내 처리하는 방식을 나중에 검토합니다."],
         0.85, 5.3, 11.7, 1.3, size=14)

# ------------------------------------------------------------------ 7. BOM 1
s = new_slide("사용 부품 ① 1차 구매", "총 173,040원 (카메라 배송비 3,000원, 센서·공구 번들 포함)",
              "가격은 실제 결제 금액 기준입니다. 센서와 공구는 아직 사용 전이고, 주행이 안정되면 추가할 계획입니다.")
bom = [["부품", "사양 / 용도", "가격(원)"],
       ["WPL C24-1 RTR", "1/16급 RC 트럭, 7.4V 2S 배터리 × 2, 서보 포함", "28,450"],
       ["Raspberry Pi 5 1GB", "메인 컴퓨터 (국내 정식 유통품)", "76,600"],
       ["듀얼 쿨러 케이스 + 방열판", "팬 + 방열, 짐칸에 장착", "14,600"],
       ["카메라 IMX219 8MP 160°", "Pi 5용 22핀 케이블, 광각 (배송비 3,000 별도)", "15,800"],
       ["microSD 32GB (A1)", "SanDisk, OS 및 데이터 저장", "5,000"],
       ["PCA9685 16채널", "I2C PWM 드라이버 (서보·ESC 구동)", "3,500"],
       ["UBEC 5V 5A", "배터리 전압을 5V로 변환해 Pi에 공급", "7,200"],
       ["듀퐁 케이블 F-F 20cm", "배선용", "2,500"],
       ["microSD 리더", "OS 이미지 기록용", "1,750"],
       ["센서·공구 번들", "초음파 HC-SR04P×3, MPU6050×1, SW-420×2, 정밀 드라이버, 니퍼 (배송비 포함)", "14,640"]]
add_table(s, bom, 0.6, 1.5, 12.15, [3.0, 7.0, 1.5], row_h=0.46, size=12, first_col_bold=True,
          align_cols={2: PP_ALIGN.RIGHT})
add_text(s, "※ 센서류는 자율주행이 안정된 뒤 확장용으로 씁니다. 수동 주행용 게임패드(MOGA XP5-X Plus, 블루투스)는 집에 있던 것을 씁니다 (비용 없음).",
         0.6, 6.65, 12, 0.3, size=11, color=GRAY)

# ------------------------------------------------------------------ 8. BOM 2 + budget
s = new_slide("사용 부품 ② 개조용 추가 구매와 예산", "분해 후 필요해진 부품, 모두 도착 (설치 전)",
              "분해해 보니 기존 보드가 수신기와 모터 드라이버 일체형이라 별도 ESC가 필요했습니다. 그래서 ESC와 전원 분배 부품을 "
              "추가로 샀고, 모두 도착했습니다. ESC 외 부품은 가격을 기입하지 않아 예산 막대에서 빠져 있습니다.")
pend = [["부품", "사양 / 용도", "가격(원)", "상태"],
        ["브러시드 ESC 30A", "전진 30A·후진 20A, 4.8~8.4V, 브레이크", "11,850", "도착"],
        ["PCT-213 레버 단자대 3구 × 10", "32A, 250V, 전원 분배·모터·스위치 연결", "미기입", "도착"],
        ["Y 분배 케이블", "배터리 2개 병렬용 (플러그 호환 확인 전)", "미기입", "도착"],
        ["20AWG 실리콘 선", "배선 연장용 (빨강/검정)", "미기입", "도착"],
        ["서보 연장선 30cm", "서보 ↔ PCA9685 거리 보정", "미기입", "도착"]]
add_table(s, pend, 0.6, 1.5, 12.15, [3.0, 5.6, 1.5, 1.5], row_h=0.44, size=13, first_col_bold=True,
          align_cols={2: PP_ALIGN.RIGHT})
add_text(s, "예산 현황 (20만원 기준)", 0.6, 4.3, 6, 0.4, size=18, bold=True)
total = 200000
done_amt = 173040
esc = 11850
bar_l, bar_w = 0.7, 11.8
add_box(s, bar_l, 4.95, bar_w, 0.6, fill=LIGHT, shape=MSO_SHAPE.RECTANGLE)
w1 = bar_w * done_amt / total
w2 = bar_w * esc / total
r1 = add_box(s, bar_l, 4.95, w1, 0.6, fill=TEAL, shape=MSO_SHAPE.RECTANGLE)
box_text(r1, "1차 구매 173,040원 (86.5%)", size=14, bold=True, color=WHITE)
add_box(s, bar_l + w1, 4.95, w2, 0.6, fill=ORANGE, shape=MSO_SHAPE.RECTANGLE)
add_text(s, "ESC", bar_l + w1 - 0.1, 5.6, 1.3, 0.3, size=12, color=ORANGE, bold=True)
add_text(s, "11,850", bar_l + w1 - 0.1, 5.85, 1.3, 0.3, size=12, color=ORANGE)
add_text(s, "ESC 포함 184,890원 (92.4%)", 6.6, 5.7, 3.2, 0.4, size=14, bold=True, color=NAVY)
add_text(s, "남은 예산 15,110원 이하 (ESC 외 추가 부품 가격 미기입)", 0.7, 6.35, 12, 0.4, size=14, color=GRAY)

# ------------------------------------------------------------------ 9. Software env
s = new_slide("실험 환경 (소프트웨어)", "재현할 수 있도록 버전과 설정을 기록",
              "실험이 재현되도록 모든 버전을 기록해 두었습니다. 텐서플로는 추론 단계에서 설치할 예정이라 아직 없습니다.")
data = [["구분", "항목", "값"],
        ["Pi", "OS", "Raspberry Pi OS 64-bit (Debian Trixie)"],
        ["Pi", "Python / 패키지 관리", "Python 3.13.5 / uv 0.13.6 (venv: ~/env)"],
        ["Pi", "DonkeyCar", "5.4.0 (donkeycar[pi]), 프로젝트: ~/mycar"],
        ["Pi", "카메라 설정", "dtoverlay=imx219,cam0 (config.txt)"],
        ["Pi", "I2C", "bus 1 활성화, PCA9685 = 0x40"],
        ["Pi", "접속", "SSH, 5GHz WiFi, IP 192.168.0.155 (자동 할당)"],
        ["PC", "학습용", "Windows 11 Pro, RTX 5060 Laptop GPU"],
        ["미설치", "TensorFlow / TFLite", "추론 직전에 설치 예정"]]
add_table(s, data, 0.6, 1.5, 12.15, [1.1, 3.0, 8.0], row_h=0.52, size=13, first_col_bold=True)
add_text(s, "※ IP 주소는 공유기에 따라 바뀔 수 있습니다.", 0.6, 6.4, 8, 0.3, size=11, color=GRAY)

# ------------------------------------------------------------------ 10. Assembly top view
s = new_slide("현재 조립 상태 (직접 촬영)", "분해한 섀시에 컴퓨터와 서보 제어부를 올린 모습",
              "사진은 서보 보정 때 모습입니다. Pi 5와 카메라, PCA9685를 짐칸 쪽에 올리고 서보를 PCA9685 채널 0에 연결했습니다. "
              "보정 후에는 순정 주행을 다시 확인하려고 서보를 기존 보드에 꽂아 두었고, ESC를 달 때 채널 0으로 다시 옮깁니다.")
rect = add_image(s, "KakaoTalk_20261109_150928423_02.jpg", 0.6, 1.45, 8.3, 5.4)
for fx, fy, n in [(0.72, 0.62, 1), (0.9, 0.5, 2), (0.47, 0.66, 3), (0.28, 0.42, 4), (0.22, 0.6, 5), (0.38, 0.58, 6)]:
    marker(s, rect, fx, fy, n)
names = [("1", "Raspberry Pi 5 (쿨러 케이스)"), ("2", "카메라 IMX219"),
         ("3", "PCA9685 PWM 보드"), ("4", "기존 WPL 제어 보드"),
         ("5", "조향 서보 (붉은색 케이스)"), ("6", "구동 모터")]
for i, (n, t) in enumerate(names):
    y = 1.65 + i * 0.62
    c = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(9.2), Inches(y), Inches(0.38), Inches(0.38))
    c.fill.solid()
    c.fill.fore_color.rgb = ORANGE
    c.line.fill.background()
    c.shadow.inherit = False
    box_text(c, n, size=12, bold=True, color=WHITE)
    add_text(s, t, 9.7, y - 0.02, 3.2, 0.45, size=15)
add_box(s, 9.2, 5.5, 3.6, 1.3, fill=LIGHT)
add_text(s, ["사진: 서보 보정 때 모습", "(서보 → PCA9685 ch0)", "지금은 순정 주행 확인을 위해", "기존 보드에 임시 연결"],
         9.35, 5.55, 3.4, 1.25, size=12)

# ------------------------------------------------------------------ 11. Side + bench
s = new_slide("조립 상태 ②  측면과 작업대", "배터리는 분리해 둔 상태에서 배선을 점검")
add_image(s, "KakaoTalk_20261109_150928423.jpg", 0.6, 1.5, 6.1, 4.6, "측면: 짐칸에 Pi 5, 카메라, PCA9685 / 앞쪽에 서보와 기존 보드")
add_image(s, "KakaoTalk_20261109_150928423_01.jpg", 6.9, 1.5, 6.1, 4.6, "작업대: 차 밖의 Pi 5(USB-C 전원)를 PCA9685와 I2C로 연결")
add_box(s, 0.6, 6.15, 12.4, 0.7, fill=LIGHT)
add_text(s, "카메라는 CSI 리본 케이블로 Pi에 연결하고, 점검할 때는 USB-C 전원으로 Pi를 구동했습니다 (배터리 전원 연결은 ESC 설치 후).",
         0.75, 6.22, 12.1, 0.6, size=13)

# ------------------------------------------------------------------ 12. Teardown
s = new_slide("차량 분해와 구조 확인", "섀시 하부와 기존 보드를 열어 구조를 파악",
              "하부 사진을 보면 중앙 기어박스에서 앞뒤로 구동축이 나가는 구조입니다. 가운데와 오른쪽 사진은 같은 1039R-WPL 보드의 양면입니다. "
              "파란 면에는 칩과 5V 레귤레이터가, 베이지 면에는 커넥터가 있습니다.")
add_image(s, "KakaoTalk_20261109_110719315_02.jpg", 0.6, 1.45, 4.0, 5.3, "하부: 기어박스와 앞뒤 구동축")
add_image(s, "KakaoTalk_20261109_115553906.jpg", 4.75, 1.45, 4.0, 5.3, "1039R-WPL 보드 칩 면 (78M05 5V 레귤레이터)")
add_image(s, "KakaoTalk_20261109_120237818.jpg", 8.9, 1.45, 4.0, 5.3, "같은 보드의 커넥터 면 (서보 3핀 연결부)")

# ------------------------------------------------------------------ 13. Board analysis
s = new_slide("제어 보드 분석: 왜 ESC가 필요한가", "수신기와 모터 드라이버가 한 보드에 합쳐져 있습니다",
              "기존 보드에는 PWM 입력이 없습니다. 그래서 PCA9685로 모터를 바로 제어할 수 없고, 별도의 ESC를 달아 모터 구동을 맡겨야 합니다. "
              "또 보드에 스위치(开关) 커넥터가 따로 있어서, 보드를 빼면 전원 스위치가 회로에서 빠질 수 있습니다. 배선 전에 확인합니다.")
add_image(s, "KakaoTalk_20261109_122251969.jpg", 0.6, 1.45, 6.2, 5.3, "1039R-WPL 보드의 커넥터부 (2026/6/30 표기)")
data = [["표기", "역할", "커넥터"],
        ["S", "조향 서보", "3핀 (검정·빨강·흰색)"],
        ["电机 M1", "구동 모터", "2핀"],
        ["电源 BAT", "배터리 입력", "2핀"],
        ["开关", "전원 스위치", "2핀"],
        ["LED", "전조등", "2핀"]]
add_table(s, data, 7.1, 1.55, 5.7, [1.3, 1.6, 2.4], row_h=0.5, size=13, first_col_bold=True)
add_box(s, 7.1, 4.8, 5.7, 1.9, fill=WHITE, line=ORANGE)
add_text(s, "결론", 7.3, 4.88, 3, 0.4, size=16, bold=True, color=ORANGE)
add_text(s, ["• 서보: PCA9685 채널 0에서 동작·보정 확인 (완료)",
             "• 모터: 브러시드 ESC를 거쳐 채널 1로 제어 (ESC 도착)",
             "• 기존 보드는 빼고, 스위치 연결은 배선 전에 확인"], 7.3, 5.28, 5.4, 1.4, size=13)

# ------------------------------------------------------------------ 14. Verification
s = new_slide("검증 결과: 연결된 장치 확인", "명령어 출력으로 확인한 항목",
              "I2C 스캔에서 0x40이 PCA9685 본체이고, 0x70은 PCA9685의 올콜 주소로 정상입니다. 카메라는 설정을 추가한 뒤 인식되었습니다.")
CODE_BG = RGBColor(0x14, 0x1B, 0x26)
CODE_FG = RGBColor(0xC8, 0xF7, 0xC5)


def code_box(top, height, lines):
    box = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.6), Inches(top), Inches(6.0), Inches(height))
    box.fill.solid()
    box.fill.fore_color.rgb = CODE_BG
    box.line.fill.background()
    box.shadow.inherit = False
    box.adjustments[0] = 0.04
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.2)
    tf.margin_top = Inches(0.15)
    tf.vertical_anchor = MSO_ANCHOR.TOP
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        r = p.add_run()
        r.text = line
        style_run(r, 13, False, CODE_FG)
        r.font.name = "Consolas"


code_box(1.55, 1.55, ["$ sudo i2cdetect -y 1", "     0 1 2 3 4 5 6 7 8 9 a b c d e f",
                      "40: 40 -- -- -- -- -- -- -- -- ...", "70: 70 -- -- -- -- -- -- --"])
code_box(3.3, 1.0, ["$ rpicam-hello --list-cameras", "0 : imx219 [3280x2464]"])
data = [["항목", "결과"],
        ["PCA9685", "0x40 응답 (0x70은 올콜 주소)"],
        ["카메라", "imx219 3280×2464 인식"],
        ["서보 동작", "채널 0에서 좌우 구동, 보정 완료"],
        ["순정 주행", "분해·보정 후 기존 보드로 조향·구동 정상"],
        ["Pi 온도", "유휴 42.2°C"]]
add_table(s, data, 6.95, 1.55, 5.85, [1.5, 3.8], row_h=0.48, size=13, first_col_bold=True)
add_box(s, 6.95, 4.55, 5.85, 1.4, fill=WHITE, line=ORANGE)
add_text(s, "남은 점검", 7.15, 4.62, 3, 0.4, size=15, bold=True, color=ORANGE)
add_text(s, ["• 카메라 초점: 첫 촬영 사진이 흐려 렌즈를 돌려 맞춰야 함", "• 정지 사진만 확인했고 주행 중 영상은 아직 미검증",
             "• 배터리 완충 전압(ESC 상한 8.4V)과 전원 스위치 경로"],
         7.15, 5.0, 5.5, 0.95, size=12)
add_text(s, "※ 위 출력은 작업 중 터미널 결과를 정리한 것이며, 실행 시점에 따라 표시가 조금 다를 수 있습니다.", 0.6, 6.4, 12, 0.3,
         size=11, color=GRAY)

# ------------------------------------------------------------------ 15. Servo calibration
s = new_slide("조향 서보 보정", "donkey calibrate --channel 0 --bus=1 로 측정",
              "왼쪽은 480부터 축이 들려서 470을 끝값으로 봤고, 오른쪽 끝값은 330입니다. 끝값에서 10씩 안쪽인 460과 340을 써서 "
              "서보가 기계적 끝을 밀지 않게 했습니다. 중앙 400을 기준으로 좌우가 대칭입니다.")
x0, x1 = 1.2, 12.1
y = 3.3
add_box(s, x0, y, x1 - x0, 0.28, fill=RGBColor(0xD5, 0xDB, 0xE3), shape=MSO_SHAPE.RECTANGLE)


def vx(v):  # 470(좌) .. 330(우)
    return x0 + (470 - v) / 140 * (x1 - x0)


add_box(s, vx(460), y, vx(340) - vx(460), 0.28, fill=TEAL, shape=MSO_SHAPE.RECTANGLE)
pts = [(470, "끝값 (좌)", RED, "480부터 축 들림"), (460, "사용 (좌)", TEAL, "STEERING_LEFT_PWM"), (400, "중앙", NAVY, "PWM 400"),
       (340, "사용 (우)", TEAL, "STEERING_RIGHT_PWM"), (330, "끝값 (우)", RED, "축이 들리는 한계")]
for v, name, col, sub in pts:
    px = vx(v)
    mk = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(px - 0.16), Inches(y - 0.02), Inches(0.32), Inches(0.32))
    mk.fill.solid()
    mk.fill.fore_color.rgb = col
    mk.line.color.rgb = WHITE
    mk.line.width = Pt(1.5)
    mk.shadow.inherit = False
    up = v in (460, 340)
    ty = y - 1.15 if up else y + 0.6
    add_text(s, str(v), px - 0.7, ty, 1.4, 0.45, size=22, bold=True, color=col, align=PP_ALIGN.CENTER)
    add_text(s, [name, sub], px - 1.1, ty + 0.45, 2.2, 0.8, size=12, color=GRAY, align=PP_ALIGN.CENTER)
add_text(s, "좌", 0.65, y - 0.1, 0.5, 0.4, size=16, bold=True, color=GRAY)
add_text(s, "우", 12.2, y - 0.1, 0.5, 0.4, size=16, bold=True, color=GRAY)
data = [["설정 항목", "값"], ["STEERING_LEFT_PWM", "460"], ["중앙", "400"], ["STEERING_RIGHT_PWM", "340"]]
add_table(s, data, 3.6, 4.95, 6.1, [3.6, 1.6], row_h=0.38, size=12, first_col_bold=True, align_cols={1: PP_ALIGN.CENTER})
add_text(s, "※ myconfig.py 반영은 ESC 연결 후 함께 진행 예정", 3.6, 6.55, 7, 0.3, size=11, color=GRAY)

# ------------------------------------------------------------------ 16. Power diagram
s = new_slide("전원 설계", "배터리 하나를 단자대에서 나눠 ESC와 UBEC에 공급 (부품 도착, 배선 전)",
              "배터리 전원은 단자대에서 ESC와 UBEC로 나뉩니다. UBEC가 Pi와 PCA9685에 5V를 줍니다. "
              "ESC에 있는 5.7V 출력은 쓰지 않고, 두 전원이 합쳐지지 않게 서보 플러그의 빨간 선을 절연합니다. "
              "기존 보드에 스위치 커넥터가 따로 있어서, 보드를 빼면 스위치가 빠질 수 있으니 배선 전에 확인합니다.")


def n2(l, t, w, h, title, sub=None, line=NAVY, fill=WHITE, tcolor=NAVY):
    b = add_box(s, l, t, w, h, fill=fill, line=line)
    box_text(b, [title, sub] if sub else [title], size=14, bold=True, color=tcolor)


n2(0.6, 3.2, 2.1, 1.0, "배터리", "7.4V 2S")
n2(3.2, 3.2, 1.7, 1.0, "전원 스위치", "연결 방식 확인 필요")
n2(5.4, 3.2, 2.0, 1.0, "단자대 × 2", "PCT-213 (+ / −)", line=ORANGE)
n2(8.5, 1.85, 2.1, 1.0, "ESC 30A", "입력 4.8~8.4V", line=ORANGE)
n2(11.1, 1.85, 1.7, 1.0, "모터", "")
n2(8.5, 4.55, 2.1, 1.0, "UBEC 5V 5A", "", line=TEAL)
n2(11.1, 3.85, 1.7, 0.9, "Pi 5", "5V 입력", fill=NAVY, line=NAVY, tcolor=WHITE)
n2(11.1, 5.05, 1.7, 0.9, "PCA9685", "V+ 5V", line=TEAL)
arrow(s, 2.7, 3.7, 3.2, 3.7, color=RED, width=3)
arrow(s, 4.9, 3.7, 5.4, 3.7, color=RED, width=3)
arrow(s, 7.4, 3.45, 8.5, 2.35, color=RED, width=3, label="7.4V", lx=-0.45, ly=0.15, lw=0.8)
arrow(s, 7.4, 3.95, 8.5, 5.05, color=RED, width=3, label="7.4V", lx=-0.45, ly=0.55, lw=0.8)
arrow(s, 10.6, 2.35, 11.1, 2.35, color=ORANGE, width=3)
arrow(s, 10.6, 4.85, 11.1, 4.3, color=TEAL, width=3, label="5V", lx=0.0, ly=-0.12, lw=0.6)
arrow(s, 10.6, 5.25, 11.1, 5.5, color=TEAL, width=3)
add_box(s, 0.6, 6.0, 12.2, 0.85, fill=LIGHT)
add_text(s, ["핵심 규칙: ① ESC 3핀의 빨간 선(5.7V)은 PCA9685에 연결하지 않음  ② UBEC 출력 5V를 확인한 뒤 Pi 연결",
             "③ 배터리 2개 병렬은 완충 후 전압이 같을 때만  ④ 보드를 빼면 스위치가 빠질 수 있음 → 배선 전에 경로 확인"],
         0.8, 6.05, 11.8, 0.8, size=13)

# ------------------------------------------------------------------ 17. ESC and parts
s = new_slide("ESC와 전원 분배 부품 상세", "판매 페이지 수치 기준 (도착품으로 다시 확인)",
              "ESC의 입력 범위는 4.8~8.4V라서 2S 리튬 완충 전압 8.4V가 상한에 해당합니다. 그래서 완충 후 전압을 멀티미터로 한 번 확인합니다.")
data = [["ESC 항목", "사양"],
        ["종류", "브러시드, 전진·후진·브레이크"],
        ["전류", "전진 30A, 후진 20A, 브레이크 40A, 순간 40A"],
        ["입력 전압", "4.8 ~ 8.4V (2S 리튬 직결 가능)"],
        ["BEC", "5.7V 1A (사용하지 않음, 빨간 선 절연)"],
        ["배선", "짧은 선 = 배터리, 긴 선 = 모터, 3핀 = 신호"],
        ["신호", "서보 3핀 PWM → PCA9685 ch1"],
        ["크기", "2.3 × 3.0cm"]]
add_table(s, data, 0.6, 1.45, 7.2, [1.4, 3.8], row_h=0.4, size=13, first_col_bold=True)
data = [["PCT-213 단자대", "사양"],
        ["정격", "32A / 250V"],
        ["선 굵기", "0.2 ~ 4.0mm² (판매자 표기)"],
        ["피복 벗김", "10mm"],
        ["크기", "17.6 × 21 × 14.5mm"]]
add_table(s, data, 0.6, 4.75, 7.2, [1.4, 3.8], row_h=0.38, size=12, first_col_bold=True)
add_image(s, "단자대.jpg", 8.1, 1.45, 4.8, 3.9, "PCT-213 상품 사양 (10개 구매)", cap_size=11)
add_box(s, 8.1, 5.5, 4.8, 1.35, fill=LIGHT)
add_text(s, ["배터리 커넥터: 4핀 SM 계열로 추정", "(선은 빨강/검정 두 가닥)", "단자대 10개 = 전원 분배 2 + 연결용·여분 8"],
         8.25, 5.58, 4.6, 1.2, size=12)

# ------------------------------------------------------------------ 18. Risks
s = new_slide("위험 요소와 대응", "주행 전에 확인할 항목",
              "가장 중요한 건 전원입니다. 배터리 전압과 ESC 허용 전압, 두 전원이 합쳐지지 않는지를 먼저 확인합니다.")
data = [["위험", "원인", "대응"],
        ["ESC 과전압", "2S 완충 전압 8.4V가 ESC 상한과 같음", "완충 직후 멀티미터로 전압 확인"],
        ["전원 충돌", "ESC의 5.7V 출력과 UBEC 5V가 합쳐짐", "서보 플러그 빨간 선 핀을 빼고 절연"],
        ["스위치 우회", "기존 보드를 빼면 전원 스위치가 회로에서 빠질 수 있음", "배선 전 경로 확인, 필요하면 스위치를 + 선에 직렬 연결"],
        ["모터 커넥터", "ESC 출력 플러그와 모터 2핀 플러그가 다를 수 있음", "레버 단자대로 연결"],
        ["배터리 병렬", "충전 상태가 다른 배터리를 연결", "둘 다 완충 후 전압을 맞춘 뒤 연결"],
        ["서보 한계 초과", "좌우 끝에서 기계 한계 도달", "한계에서 10 정도 물러난 값 사용 (340/460)"],
        ["접촉 불량", "얇은 선이 단자대에서 헐거워짐", "선 끝을 접어 두껍게, 당겨서 확인"],
        ["카메라 화질", "초점이 맞지 않으면 학습 품질 저하", "렌즈를 돌려 초점 조정 후 영상 확인"],
        ["메모리 한계", "Pi 5 1GB", "입력 160×120, 양자화 모델 사용"]]
add_table(s, data, 0.6, 1.5, 12.15, [1.8, 4.2, 4.6], row_h=0.5, size=12, first_col_bold=True)

# ------------------------------------------------------------------ 19. Next
s = new_slide("남은 일정", "부품 도착 이후의 작업 순서",
              "먼저 도착한 부품을 점검하고, ESC와 전원을 배선한 뒤 바퀴를 띄운 상태에서 스로틀을 보정합니다. "
              "그다음 집에 있던 MOGA XP5-X Plus 게임패드를 블루투스로 연결해 수동 주행하며 데이터를 모으고 PC에서 학습합니다.")
steps = [("1", "부품 점검", "ESC 선·커넥터, 완충 전압 8.4V 이하,\n전원 스위치 경로"),
         ("2", "ESC·전원 배선", "단자대로 ESC·UBEC 분배, 신호선 ch1"),
         ("3", "스로틀 보정", "바퀴를 띄우고\ndonkey calibrate --channel 1"),
         ("4", "myconfig 반영", "조향 340/460 + 스로틀 값, 카메라 초점"),
         ("5", "주행 데이터 수집", "MOGA XP5-X Plus(블루투스)로\n수동 주행 기록"),
         ("6", "학습 · 자율주행", "PC(RTX 5060) 학습 → Pi 추론")]
for i, (n, h, d) in enumerate(steps):
    r, c = divmod(i, 3)
    x = 0.65 + c * 4.1
    y = 1.65 + r * 2.05
    add_box(s, x, y, 3.85, 1.8, fill=WHITE, line=RGBColor(0xC9, 0xD1, 0xDB))
    circ = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x + 0.2), Inches(y + 0.2), Inches(0.5), Inches(0.5))
    circ.fill.solid()
    circ.fill.fore_color.rgb = TEAL if i < 3 else RGBColor(0x9A, 0xA5, 0xB1)
    circ.line.fill.background()
    circ.shadow.inherit = False
    box_text(circ, n, size=15, bold=True, color=WHITE)
    add_text(s, h, x + 0.85, y + 0.22, 2.9, 0.5, size=17, bold=True)
    add_text(s, d.split("\n"), x + 0.25, y + 0.95, 3.4, 0.8, size=13, color=GRAY)
add_box(s, 0.65, 5.85, 12.1, 0.95, fill=LIGHT)
add_text(s, "확장 계획: 초음파·IMU 센서 추가, 더 큰 모델(RNN 등) 실험, 필요 시 PC에서 영상을 처리하는 구조 검토",
         0.85, 6.0, 11.7, 0.7, size=14)

# ------------------------------------------------------------------ 20. Closing
s = prs.slides.add_slide(BLANK)
state["n"] += 1
bg = s.background.fill
bg.solid()
bg.fore_color.rgb = NAVY
left = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.35), Inches(7.5))
left.fill.solid()
left.fill.fore_color.rgb = TEAL
left.line.fill.background()
add_text(s, "정리", 0.9, 0.9, 6, 0.8, size=36, bold=True, color=WHITE)
add_text(s, ["• 실차 데이터로 학습하는 방향으로 목표를 확정했습니다.",
             "• Pi 5, 카메라, PCA9685의 동작을 확인했고 서보 보정까지 마쳤습니다.",
             "• 기존 보드가 일체형이라 ESC를 추가했고, 부품이 모두 도착했습니다.",
             "• 다음 단계는 ESC 배선, 스로틀 보정, 데이터 수집입니다."],
         0.9, 2.0, 7.2, 3.2, size=19, color=RGBColor(0xE6, 0xEC, 0xF3), line_spacing=1.2)
if os.path.exists(os.path.join(ROOT, "KakaoTalk_20261109_150928423.jpg")):
    tp, _ = fit_image(os.path.join(ROOT, "KakaoTalk_20261109_150928423.jpg"))
    s.shapes.add_picture(tp, Inches(8.3), Inches(1.6), width=Inches(4.6))
add_text(s, "질문 있으신가요?", 0.9, 5.7, 7, 0.8, size=28, bold=True, color=RGBColor(0x9F, 0xE0, 0xE0))

prs.save(OUT)
print("saved", OUT, "slides", len(prs.slides))
