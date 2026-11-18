# 캐릭터 도감 열람 페이지 (설계 검토용)

`src/data/roster.js` 를 고친 뒤 페이지를 다시 만드는 방법:

```bash
node docs/drafts/roster/data.mjs /tmp/roster-data.json
python3 -c "d=open('/tmp/roster-data.json').read().replace('</','<\\\\/'); b=open('docs/drafts/roster/body.html').read().replace('__DATA__',d); open('/tmp/roster-viewer.html','w').write(open('docs/drafts/roster/head.html').read()+b)"
```

(`data.mjs` 안의 import 경로는 저장소 위치에 맞춘다.) 문서판은 `node tools/gen-roster-doc.mjs` → `docs/ROSTER.md`, `docs/ROSTER_PROMPTS.md`.
