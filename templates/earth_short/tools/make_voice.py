"""Fola voiceover + word timings for a project folder: python make_voice.py <project_dir>
<project_dir>/TTS_Prompt_AI_Studio.txt -> <project_dir>/project/audio/Voiceover.wav (+ Voiceover_raw.wav) and project/words.json.
Needs the bot folder (BOT_DIR env var, default D:\Earth_Mechanics_bot) with a working .env (GEMINI_API_KEY)."""
import json, os, shutil, sys, time, wave
from pathlib import Path
sys.path.insert(0, os.getenv("BOT_DIR", r"D:\Earth_Mechanics_bot"))
import tts
root = Path(sys.argv[1]); pf = root / "TTS_Prompt_AI_Studio.txt"; wav = root / "project" / "audio" / "Voiceover.wav"
wav.parent.mkdir(parents=True, exist_ok=True)
for i in range(3):
    try: tts._generate(pf, wav); break
    except Exception as e: print("retry", i, type(e).__name__); time.sleep(8)
shutil.copy(wav, wav.with_name("Voiceover_raw.wav"))
print("notes:", tts.check_and_fix(pf, wav))   # if a note cut a spoken number/year, copy Voiceover_raw.wav back over Voiceover.wav
words = [[round(a, 2), round(b, 2), w] for a, b, w in tts._transcribe(wav)]
json.dump(words, open(root / "project" / "words.json", "w", encoding="utf-8"))
f = wave.open(str(wav)); print("duration", f.getnframes() / f.getframerate()); print(" ".join(f"{a}:{w}" for a, b, w in words))
