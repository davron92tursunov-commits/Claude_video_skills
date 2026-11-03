---
name: law-flat-video
description: Make a voiced 16:9 "famous case" law explainer (International law channel) in the user's approved flat 2D vector style (retro cream/teal/brick/mustard, faceless silhouettes, gazette-print cards, self-drawn art only). Use whenever the user asks for a new law/case video in this style, wants to swap the voiceover of the Lefkowitz video, or asks to rebuild/re-render it.
---

# Law explainer videos, flat vector style (approved 2026-10-27)

The user writes in Uzbek; reply in Uzbek. Videos are English, 1920x1080, ~4 min, voiced (Gemini TTS voice **Gero**), subtitles burned in.
Reference project (copy it for a new case): **D:\Youtube_Projects\International law\Lefkowitz** (`hf_main` = the video, 36 scenes).
Output of the first video: `Lefkowitz_full_master.mp4` + `Lefkowitz_full_upload.mp4` (3 Mbps).

## What the style is (do not change without asking)
- **Everything is self-drawn in canvas 2D** (HyperFrames composition, one `<canvas>`, GSAP only drives time). No internet photos/stock, no 3D, no AI images, no noir/dark grading, no Roblox look (the user rejected all of these).
- Palette: CREAM #efe4c8, TEAL #2f7f7a / #2f6b66, BRICK #b5452f, MUSTARD #d9a441, INK #2a1d12, navy silhouettes. Halftone dot texture + vignette + film grain.
- Fonts: Cooper (COOPBL.TTF) for big numbers/signs, Georgia Bold for newspaper text, Barlow Condensed 600/700 for HUD, labels, captions.
- **People are faceless flat silhouettes** (`sil()`: fedora/pill hat, dress, cross arms, arm pointing). Never draw eyes/mouth. Lefkowitz = grey #4d535c + fedora; shopkeeper = black vest, white shirt strip.
- Recurring props: gazette-print `PAPER` cards with yellow marker highlights, price tag that flips, huge "$1" card, red WOMEN ONLY stamp, storefront with live clock/door, counter scene with bill, flat capitol, gavel, scales, magnifier/target/door icons, laptop shop, follow pill + cursor.
- Every scene shows a new number in the top-right HUD (label / value / sub) via `hudFor()`; caption pill at y~1003 from `timeline.js` chunks; small top-left chip "CONTRACT LAW · <CASE>" after 28 s.
- Hits (screen shake + white flash) on slams, stamps, gavel. SFX are tonal/low/object sounds only: **never** whoosh/riser/noise "shhh".
- Scenes are cut 0.2 s before the sentence they illustrate; every on-screen word/number is timed to the spoken word via `wt(line,'keyword')` in `cues.js`.

## Swap or change only the voiceover (the picture is untouched)
1. New voice file -> `Lefkowitz\Voiceover.wav` (24 kHz mono is what `make_voice.py` writes). To regenerate with Gemini TTS: edit voice/style in `TTS_Prompt_AI_Studio.txt` (`Voice:` line), then `python make_voice.py` (or `python make_voice.py 2` for one part; the model sometimes reads a part far too slow/fast, rerun that part). It uses `D:\Earth_Mechanics_bot\config.py` (.env key, never print it). Gemini API can 503/504: retry.
2. `python rebuild.py` (in the Lefkowitz folder): ffmpeg 16 kHz -> faster-whisper word times (`words.json`) -> `build_timeline.py` (`hf_main/timeline.js` with line times + caption chunks) -> `node hf_main/dump_cues.mjs` (`cues.json`) -> `make_sfx.py` -> ducked mix `hf_main/audio/mix.wav` (loudnorm -14) and patches `data-duration` in index.html. Deterministic: same voice = same mix.
3. `python rebuild.py --render` also renders (long; run in background): HF_SEGMENTED_CAPTURE + `--resume` retry loop, then the 3 Mbps upload copy. ffmpeg: C:\Users\User\OneDrive\Desktop\Youtube_Projects\Earth_mechanics_6\tools\bin.
4. Snapshot QC: `npx hyperframes@0.8.162 snapshot . -o ..\qc --at t1,t2,... --no-end --describe false` inside `hf_main`, read the contact sheets. Check captions, HUD and that nothing overlaps.
Constraint: the spoken sentences must stay the same 41 lines as `TTS_Prompt_AI_Studio.txt` (script in `Lefkowitz_script.txt`). A different script means new scenes/cues (see below).

## New case in the same style
1. Hook options first (4-5, scored like the Earth skill: stakes for "you", surprise, one concrete number, open loop, motion in frame 1), wait for the pick.
2. Script ~500 words, short lively sentences, numbers spelled out for TTS, hook -> story -> court -> the legal question (two-column infographic) -> ruling -> why it matters -> outro question + "follow for more cases that changed the law". Fact-check every number against a source; mark uncertain dates "TO VERIFY" and keep them off screen.
3. Write `TTS_Prompt_AI_Studio.txt` in the existing format (`Voice: Gero`, `=== STYLE INSTRUCTIONS ===`, `=== TEXT ===`, `## PART n — TITLE`), generate the voice, then copy the `Lefkowitz` folder, adapt `cues.js` (E events + SCENES list) and the scene functions in `hf_main/index.html`, run `rebuild.py`, QC, render.
4. Upload text file: TITLE with emoji, DESCRIPTION (facts + "Visuals are simplified and illustrative. Characters are fictional illustrations, not likenesses of real people. Educational purposes only, not legal advice."), 4 hashtags, pinned comment ending with 👇.

## Pitfalls already hit
- PowerShell here: `R` is an alias (use another function name); `"\n"` inside a PowerShell string is not a newline when writing Python; WriteAllText needs absolute paths; `powershell -ExecutionPolicy Bypass -File` is blocked by the auto-mode classifier (run commands directly).
- Python subprocess does not find ffmpeg via a custom `env` PATH on Windows: use the full ffmpeg.exe path.
- Gemini transcription check (`check_voice.py`) times out often; compare whisper words with the script instead (diff of normalized tokens, ~95% is normal: numbers become digits).
- Put the top-left chip and captions away from big paper cards (paper cy ~575 so the title clears the chip).
