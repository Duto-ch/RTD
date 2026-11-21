#!/usr/bin/env python3
"""Stop 훅 — 작업 루프에서 자주 빼먹는 후속 작업을 찾아 알린다 (읽기 전용).

이 브랜치가 main 에서 갈라진 뒤 바뀐 파일(커밋 + 작업 중 + 새 파일)을 보고
문서 재생성·HISTORY 한 줄·테스트·폰트 서브셋·그림 import·푸시 등을 확인한다.
같은 알림은 한 번만 띄운다(.git/rtd-missed-seen). 수동 실행: python3 .claude/hooks/missed-changes.py --print
"""
import glob, hashlib, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(ROOT)


def git(*args):
    try:
        return subprocess.run(['git', *args], capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        return ''


def changed_files():
    base = ''
    for ref in ('origin/main', 'main'):
        base = git('merge-base', 'HEAD', ref)
        if base:
            break
    files = set()
    if base:
        files |= set(git('diff', '--name-only', base, 'HEAD').splitlines())
    files |= set(git('diff', '--name-only', 'HEAD').splitlines())
    files |= set(git('ls-files', '--others', '--exclude-standard').splitlines())
    return {f for f in files if f}


def any_in(files, *prefixes):
    return any(f == p or f.startswith(p) for f in files for p in prefixes)


def missing_glyphs():
    try:
        from fontTools.ttLib import TTFont
    except ImportError:
        return ''
    font = 'public/assets/fonts/Sunflower-Medium.woff2'
    if not os.path.exists(font):
        return ''
    have = {chr(c) for c in TTFont(font).getBestCmap()}
    used = set()
    for f in glob.glob('src/**/*.js', recursive=True):
        t = re.sub(r'//[^\n]*|/\*.*?\*/', '', open(f, encoding='utf8').read(), flags=re.S)
        used |= {c for c in t if 0xAC00 <= ord(c) <= 0xD7A3}
    return ''.join(sorted(used - have))


def newest_mtime(pattern):
    ts = [os.path.getmtime(p) for p in glob.glob(pattern, recursive=True) if os.path.isfile(p)]
    return max(ts) if ts else 0


def checks(files):
    out = []
    code = {f for f in files if re.match(r'(src|tools|tests)/', f) or f in ('index.html', 'package.json')}
    src = {f for f in files if f.startswith('src/')}

    if code and 'docs/HISTORY.md' not in files:
        out.append('docs/HISTORY.md 맨 아래에 진행 기록 한 줄이 없다')

    gens = [
        ('src/data/roster.js', 'docs/ROSTER.md', 'node tools/gen-roster-doc.mjs'),
        (('src/data/skills.js', 'src/data/heroes.js'), 'docs/SKILLS.md', 'node tools/gen-skill-doc.mjs'),
        ('src/data/upgrades.js', 'docs/UPGRADES.md', 'node tools/gen-upgrade-doc.mjs'),
        (('src/art/', 'src/systems/customArt.js'), 'docs/CUSTOM_ART.md', 'node tools/gen-art-doc.mjs (새 텍스처 키가 있으면)'),
    ]
    for srcs, doc, cmd in gens:
        srcs = (srcs,) if isinstance(srcs, str) else srcs
        if any_in(files, *srcs) and doc not in files:
            out.append(f'{", ".join(srcs)} 가 바뀌었는데 {doc} 는 그대로 — `{cmd}`')

    arts = [
        ('docs/drafts/roster-art/', 'public/assets/custom/chars/', 'python3 tools/import-roster-art.py'),
        ('docs/drafts/skill-fx/sets/', 'public/assets/fx/sets/', 'python3 tools/import-fx-sets.py'),
        ('docs/drafts/skill-fx/signature/', 'public/assets/fx/sig/', 'python3 tools/import-fx-sig.py'),
    ]
    for draft, asset, cmd in arts:
        if any(f.startswith(draft) and f.endswith('.py') for f in files) and not any_in(files, asset):
            out.append(f'{draft} 그림 스크립트가 바뀌었는데 게임 그림({asset})은 그대로 — 게임에 넣을 거면 `{cmd}`')

    if 'src/config.js' in files and 'docs/GDD.md' not in files:
        out.append('src/config.js(BALANCE)가 바뀌었는데 docs/GDD.md 는 그대로 — 밸런스 영향이 있으면 `node tools/balance-sim.cjs` 결과를 GDD 밸런스 메모에')

    logic = {f for f in src if not f.startswith('src/data/fx')}
    if logic and not any_in(files, 'tests/'):
        out.append('src 코드가 바뀌었는데 tests/ 는 그대로 — 새 기능이면 tests/e2e/game.spec.js 에 조작 테스트, 규칙이 바뀌었으면 tests/unit/')

    if src:
        miss = missing_glyphs()
        if miss:
            out.append(f'글꼴 서브셋에 없는 한글 {len(miss)}자({miss[:20]}) — pyftsubset 으로 public/assets/fonts/ 다시 만들기')

    # UI 를 바꾸면 글자 정렬 점검 (2026-11-21 사용자 요청: 좌우·상하 간격을 항상 확인)
    ui = {f for f in src if re.match(r'src/(ui|scenes)/', f) or f == 'src/ui/theme.js'}
    if ui and newest_mtime('test-results/ui-audit/*.png') < max(newest_mtime(f) for f in ui):
        out.append('UI(src/ui·src/scenes)가 바뀌었는데 글자 정렬 점검을 안 했다 — `node tools/ui-audit.cjs` (문제 0 + test-results/ui-audit/ 화면 눈으로 확인)')

    if code and newest_mtime('test-results/screens/*.png') < newest_mtime('src/**/*') :
        out.append('마지막 src 수정 뒤 `npm run check` 를 돌리지 않았다(테스트 화면이 더 오래됨)')

    if git('status', '--porcelain'):
        out.append('커밋 안 된 변경이 있다')
    elif git('rev-parse', '--abbrev-ref', '@{u}') and git('rev-list', '--count', '@{u}..HEAD') not in ('', '0'):
        out.append('푸시 안 된 커밋이 있다 — `git push`')
    return out


def main():
    manual = '--print' in sys.argv
    hook = {}
    if not manual:
        try:
            hook = json.load(sys.stdin)
        except Exception:
            hook = {}
    items = checks(changed_files())
    if manual:
        print('\n'.join(f'- {i}' for i in items) or '빠진 것 없음')
        return
    if not items:
        return
    digest = hashlib.sha1('\n'.join(items).encode()).hexdigest()
    seen_path = os.path.join(git('rev-parse', '--git-dir') or '.git', 'rtd-missed-seen')
    try:
        seen = open(seen_path).read().strip()
    except OSError:
        seen = ''
    if seen == digest:
        return  # 같은 알림은 한 번만
    try:
        open(seen_path, 'w').write(digest)
    except OSError:
        pass
    body = '\n'.join(f'- {i}' for i in items)
    msg = {'systemMessage': f'⚠ 빠뜨린 후속 작업 후보 {len(items)}건\n{body}'}
    if not hook.get('stop_hook_active'):
        msg['decision'] = 'block'
        msg['reason'] = ('작업 루프(AGENTS.md)에서 빠진 것 같은 후속 작업:\n' + body +
                         '\n필요한 것은 처리하고, 일부러 안 하는 것은 사용자에게 한 줄로 이유를 말한 뒤 끝낸다.')
    print(json.dumps(msg, ensure_ascii=False))


if __name__ == '__main__':
    main()
