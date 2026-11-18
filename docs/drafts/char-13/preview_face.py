"""(2026-11-17 적용 완료 — 이제 draw.py 의 기본 틀이 이 규칙을 쓴다. 기록용으로 남김)
미리보기 (적용 전): 세로눈 1x2 + 발밑 검은 줄 제거 — 시안 틀을 고치지 않고 실행 중에만 바꿔서 전/후를 비교한다
실행: python3 docs/drafts/char-13/preview_face.py → preview-face.png
"""
import os, sys, copy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw, ImageFont
import draw as D
import anim as A

OUT = os.path.dirname(os.path.abspath(__file__))


def shade(h, k=0.7):
    h = h.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return '#%02x%02x%02x' % (int(r * k), int(g * k), int(b * k))


def apply_new_rules():
    B = list(D.BASE)
    B[15] = ".....OHhSESSSEShHO......"   # 세로눈 1x2: 윗칸 진한 눈동자
    B[16] = ".....OHsSISSSISsHO......"   #            아랫칸 눈 색 (캐릭터마다 I)
    B[23] = "........ObbObbO........."   # 발밑: 검은 줄 대신 신발 그늘색, 바깥 외곽선만 남김
    D.BASE[:] = B
    robe = {22: "........OCCCCCO.........", 23: "........OcccccO........."}  # 로브 밑단도 검은 줄 대신 옷 그늘색
    for ch in D.CHARS:
        ch['pal'] = {**ch['pal'], 'b': shade(ch['pal'].get('B', '#4a3020'))}
        o = ch['over']
        if o.get(23, '').strip('.').startswith('OOOOOOO'):
            o[22] = o[22][:8] + robe[22][8:15] + o[22][15:]
            o[23] = o[23][:8] + robe[23][8:15] + o[23][15:]
    for spec in A.NEW_BODIES.values():
        spec['pal']['b'] = shade(spec['pal'].get('B', '#4a3020'))


def frames():
    A.ARMLESS = True
    return [a['idle'][0][0] for a in A.build_all()]


if __name__ == '__main__':
    names = ['카이라', '베로나', '엘린', '아델', '브란', '토른', '세레나', '닉스']
    before = frames()
    D_BASE, D_CHARS = list(D.BASE), copy.deepcopy(D.CHARS)
    apply_new_rules()
    after = frames()
    z, cw = 7, 30
    font = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 22)
    img = Image.new('RGB', (cw * z * 8, (26 * z) * 2 + 90), '#f6f1e4')
    d = ImageDraw.Draw(img)
    for row, (label, fr) in enumerate((('지금', before), ('바꾼 뒤 (세로눈 · 발밑 색)', after))):
        y0 = 40 + row * (26 * z + 45)
        d.text((10, y0 - 34), label, font=font, fill='#3a2a1a')
        for i, f in enumerate(fr):
            c = f.crop((A.OX - 3, A.OY - 2, A.OX + 27, A.OY + 24)).resize((cw * z, 26 * z), Image.NEAREST)
            img.paste(c, (i * cw * z, y0), c)
            if row == 0:
                d.text((i * cw * z + 80, img.height - 34), names[i], font=font, fill='#3a2a1a')
    img.save(os.path.join(OUT, 'preview-face.png'))
    print('ok')
