---
name: feedback-tts-run-myself
description: Generate voiceover myself with the bot (tts.py), for Shorts and Long videos; check_and_fix wrongly cuts spoken years
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0696cff2-37f0-404d-b6f3-bdf259ffa6b5
  modified: 2026-11-03T12:46:02.274Z
---

On 2026-11-02 (Long_5) and again 2026-11-03 (Shorts, Sahara) the user said to generate the Fola voice myself — never ask them to make TTS in AI Studio,
and don't ask permission step by step; they only swap models in the background.
Pipeline: `sys.path.insert(0, r"D:\Earth_Mechanics_bot"); import tts; tts._generate(prompt, wav); tts.check_and_fix(prompt, wav)`
(Long videos: Long_5/project/make_voice.py). The prompt file headings must be `=== STYLE INSTRUCTIONS ===` and `=== TEXT ===`
(plain headings fail the parser). Run with PYTHONIOENCODING=utf-8 (cp1251 console crashes on the ✂️ notes print).
Keep a `Voiceover_raw.wav` copy before check_and_fix.

**Why:** the user does not intervene in these steps; the bot already wraps Gemini TTS + Whisper.

**How to apply:** after generation, read the notes: tts.check_and_fix cuts years like "nineteen seventy" because Whisper writes "1970"
and it doesn't match the script words. If a cut is a number/year, restore the _raw wav. Related: [[feedback-credit-budget]].
