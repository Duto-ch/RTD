---
name: acestep
description: Generate game music (BGM loops, jingles, stingers) with a locally running ACE-Step 1.5 server and save the audio into the project. Use when the user asks for background music, a theme, a jingle or a song made with ACE-Step / 에이스스텝 / 음악 생성 / 배경음 만들기.
---

# ACE-Step 1.5 (local music generation)

Runs on the user's own computer (needs its GPU): https://github.com/ace-step/ACE-Step-1.5 (Apache-2.0).
This skill only works in a Claude Code session **on that same computer**; a cloud session cannot reach its `localhost`.

## 0. Server running?

```bash
curl -s http://localhost:8001/health
```

Expect `"status": "ok"`. If not, ask the user to start it in the ACE-Step folder with `uv run acestep-api`
(default port 8001; first start downloads the model). If they set `ACESTEP_API_KEY`, send it as
`-H "Authorization: Bearer <key>"` — never write the key into a file in this repo.

## 1. Submit

```bash
curl -s -X POST http://localhost:8001/release_task -H 'Content-Type: application/json' -d '{
  "prompt": "8-bit chiptune, retro game battle theme, fast tempo, square wave lead, no vocals",
  "lyrics": "[instrumental]",
  "audio_duration": 60,
  "batch_size": 2,
  "inference_steps": 8,
  "audio_format": "mp3"
}'
```

Returns `data.task_id`. `audio_duration` is 10-600 s. `batch_size` 2 gives two takes to choose from.

## 2. Poll until done

```bash
curl -s -X POST http://localhost:8001/query_result -H 'Content-Type: application/json' \
  -d '{"task_id_list": ["<task_id>"]}'
```

`status` 0 = running, 1 = done, 2 = failed. `result` is a JSON **string**: parse it; each item's `file` is a
`/v1/audio?path=...` URL. Poll every ~10 s; don't loop faster.

## 3. Download

```bash
curl -s -o out.mp3 "http://localhost:8001<file>"
```

## For RTD (용병단 디펜스)

- The game's music is currently synthesised in code (`src/systems/audio.js`, 16-bit style). Ask for
  **chiptune / 8-bit / retro game** styles so new tracks fit, and say which slot it replaces
  (title, battle, boss, final).
- Save drafts under `docs/drafts/music/` first and let the user listen; only move a chosen track into
  `public/assets/` and wire it in after they pick one.
- Keep files small for mobile: trim to a loopable section and encode ~96-128 kbps mp3/ogg (ffmpeg).
- Record the prompt, seed (`seed_value`) and model used next to the file so a track can be regenerated.
