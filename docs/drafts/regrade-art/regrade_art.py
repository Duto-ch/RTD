"""등급 재배분(2026-11-20)에 맞춰 캐릭터 그림 다시 그리기 — 등급이 바뀐 캐릭터만.
등급이 그림에 주는 것: 몸 색 수(BODY_COLORS 10·12·14·15), 강조색(D), 망토(유니크), 가슴 장식(언커먼+·레어+), 무기 재질·장식, 유니크 반짝임.
시안 출신 8명(카이라·베로나 등)은 사용자 그림·시안 그림을 그대로 두고 등급 고리 색만 바뀐다 (색 수 규칙 미적용 상태 그대로).
실행: python3 docs/drafts/regrade-art/regrade_art.py → sheets/<id>.png + compare.json → python3 build_view.py
"""
import os, sys, json, io, base64
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'roster-art'))
sys.path.insert(0, os.path.join(HERE, '..', 'char-13'))
import roster_art as R
A = R.A

syn = json.load(open(os.path.join(HERE, '..', 'synergy', 'synergy.json')))
BY = {c['id']: c for c in R.ROSTER}
os.makedirs(os.path.join(HERE, 'sheets'), exist_ok=True)


def uri(img):
    b = io.BytesIO(); img.save(b, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


def colors(sheet, n):
    f = sheet.crop((0, 0, A.W * n, A.H))
    return len({p for p in f.getdata() if p[3]})


out = []
for s in syn['chars']:
    if s['grade'] == s['old']:
        continue
    c = BY[s['id']]
    old = Image.open(os.path.join(HERE, '..', 'roster-art', 'sheets', f"{c['id']}.png"))
    if c.get('original'):
        new = old   # 시안 출신: 그림 그대로
        idle_n, atk_ms = 8, None
        meta = json.load(open(os.path.join(HERE, '..', 'roster-art', 'roster-art.json')))
        m = next(x for x in meta['chars'] if x['id'] == c['id'])
        idle_ms, atk_ms = m['idle']['ms'], m['attack']['ms']
    else:
        r = R.animate({**c, 'grade': s['grade']})
        new = R.sheet(r['idle'] + r['attack'])
        new.save(os.path.join(HERE, 'sheets', f"{c['id']}.png"))
        idle_ms, atk_ms = [m for _, m in r['idle']], [m for _, m in r['attack']]
    body_old = Image.open(os.path.join(HERE, '..', 'roster-art', 'bodies', f"{c['id']}.png")) if os.path.exists(os.path.join(HERE, '..', 'roster-art', 'bodies', f"{c['id']}.png")) else None
    out.append({'id': c['id'], 'name': c['name'], 'old': s['old'], 'grade': s['grade'], 'original': bool(c.get('original')),
                'cls': s['cls'], 'origin': s['origin'], 'idle': idle_ms, 'attack': atk_ms,
                'oldSrc': uri(old), 'newSrc': uri(new)})
json.dump({'W': A.W, 'H': A.H, 'chars': out}, open(os.path.join(HERE, 'compare.json'), 'w'), ensure_ascii=False)
print(len(out), 'changed;', sum(o['original'] for o in out), 'original (그림 그대로)')
