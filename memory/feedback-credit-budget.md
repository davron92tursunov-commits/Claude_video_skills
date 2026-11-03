---
name: feedback-credit-budget
description: User watches credit usage per video (~10% normal); before each step say which model (Opus/Sonnet/Haiku) fits so they can switch
metadata:
  node_type: memory
  type: feedback
  originSessionId: 62c89f63-6778-4cbf-bf40-cde6b027cb0a
  modified: 2026-11-01T17:47:50.911Z
---

On 2026-11-01 the user noticed one video (oceans drained: Long_4 tests + engine rewrite + Short) cost ~20% of credits vs the usual ~10%.
They asked me to **warn them before each step which model it needs**, so they switch the model themselves in the app.

**Why:** long single sessions re-send the whole history every turn; many snapshot/contact-sheet image reads and multi-round visual
debugging (white sky took 5 rounds) multiply the cost.

**How to apply:** at the start of each step of an Earth video, one line: "⚙️ Keyingi qadam: <step> → <model> tavsiya". Mapping:
- Opus: hook options, script, new scenes / shaders / engine code, visual QC and fixes, storyboard judgement.
- Sonnet: fact research, upload .txt, TTS prompt, make_sfx.py timings, small edits to existing scenes.
- Haiku: TTS generation via the bot, Whisper timings, snapshot/render/encode commands, file copying.
Also: one video per session; fewer QC rounds (only changed shots, small contact sheets); pixel probes instead of repeated snapshots.
Related: [[feedback-drone-shots-over-globe]].
