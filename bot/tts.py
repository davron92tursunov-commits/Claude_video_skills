"""TTS_Prompt_AI_Studio.txt -> Voiceover.wav (Google AI Studio / Gemini TTS)."""
import asyncio
import re
import subprocess
import time
import wave
from pathlib import Path

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from config import FFMPEG_DIR, GEMINI_API_KEY, TTS_FALLBACKS, TTS_MODEL, TTS_VOICE


def parse_prompt(path: Path) -> tuple[str, str, str]:
    """(voice, style, text) ni TTS_Prompt_AI_Studio.txt dan ajratadi."""
    raw = path.read_text(encoding="utf-8-sig")
    m = re.search(r"Voice:\s*([A-Za-z]+)", raw)
    voice = m.group(1) if m else TTS_VOICE
    style = re.search(r"=== STYLE INSTRUCTIONS ===\s*(.*?)\s*=== TEXT ===", raw, re.S)
    text = re.search(r"=== TEXT ===\s*(.*)$", raw, re.S)
    if not style or not text:
        raise ValueError(f"{path.name}: '=== STYLE INSTRUCTIONS ===' / '=== TEXT ===' bo'limlari topilmadi")
    return voice, style.group(1).strip(), text.group(1).strip()


def _generate(prompt_file: Path, out_wav: Path) -> str:
    voice, style, text = parse_prompt(prompt_file)
    client = genai.Client(api_key=GEMINI_API_KEY)
    contents = f"### DIRECTOR'S NOTES\n{style}\n\n### TRANSCRIPT\n{text}"
    config = types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice))
        ),
    )
    last_err = None
    # Band (503) yoki limit (429) bo'lsa: biroz kutib qayta urinadi, keyin zaxira modelga o'tadi.
    for model in dict.fromkeys([TTS_MODEL, *TTS_FALLBACKS]):
        for attempt in range(3):
            try:
                resp = client.models.generate_content(model=model, contents=contents, config=config)
                data = resp.candidates[0].content.parts[0].inline_data.data
                break
            except genai_errors.APIError as e:
                last_err = e
                if e.code not in (429, 500, 503):
                    raise
                time.sleep(10 * (attempt + 1))
        else:
            continue
        break
    else:
        raise RuntimeError(f"TTS ishlamadi: {last_err}")
    if data[:4] == b"RIFF":  # yangi modellar tayyor WAV qaytaradi
        out_wav.write_bytes(data)
    else:  # eski modellar: 24 kHz, 16-bit, mono PCM
        with wave.open(str(out_wav), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(24000)
            w.writeframes(data)
    return voice


# ---------- matn tekshiruvi: TTS ba'zan o'zidan gap qo'shadi yoki takrorlaydi (EM15, EM16) ----------
_ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
_TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()
_WHISPER = None


def _say(n: int) -> list[str]:
    """Butun sonni inglizcha so'zlarga (TTS matnida raqamlar so'z bilan yoziladi, whisper esa raqam qaytaradi)."""
    if n < 20:
        return [_ONES[n]]
    if n < 100:
        return [_TENS[n // 10]] + ([_ONES[n % 10]] if n % 10 else [])
    for size, name in ((10**9, "billion"), (10**6, "million"), (1000, "thousand"), (100, "hundred")):
        if n >= size:
            return _say(n // size) + [name] + (_say(n % size) if n % size else [])
    return []


def _words(text: str) -> list[str]:
    text = text.lower().replace("%", " percent ").replace("km", " kilometers ").replace("’", "'")
    text = re.sub(r"(\d),(\d{3})", r"\1\2", text)
    out = []
    for tok in re.findall(r"[a-z']+|\d+(?:\.\d+)?", text):
        if tok[0].isdigit():
            whole, _, frac = tok.partition(".")
            out += _say(int(whole)) + (["point"] + [_ONES[int(c)] for c in frac] if frac else [])
        else:
            out.append(tok.strip("'"))
    return [w for w in out if w and w != "and"]  # "and" ni whisper ko'p tushirib qoldiradi


def _transcribe(wav: Path) -> list[tuple[float, float, str]]:
    """(start, end, so'z) — faster-whisper; fayl yo'li o'rniga numpy massiv (av.open bu o'rnatishda yo'l bilan buziladi)."""
    global _WHISPER
    import numpy as np
    from faster_whisper import WhisperModel
    exe = FFMPEG_DIR / "ffmpeg.exe"
    pcm = subprocess.run([str(exe) if exe.exists() else "ffmpeg", "-loglevel", "error", "-i", str(wav), "-f", "s16le",
                          "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
    audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
    if _WHISPER is None:
        _WHISPER = WhisperModel("small.en", device="cpu", compute_type="int8")
    segs, _ = _WHISPER.transcribe(audio, word_timestamps=True, language="en")
    return [(w.start, w.end, w.word) for s in segs for w in s.words]


def _extras(script: str, said: list[tuple[float, float, str]]) -> list[tuple[float, float, str]]:
    """Matnda yo'q, lekin aytilgan 2+ so'zli bo'laklar: (kesish boshi, kesish oxiri, gap)."""
    import difflib
    want = _words(script)
    flat = []  # har bir normallashgan so'z -> uni bergan whisper so'zining indeksi
    for i, (_, _, w) in enumerate(said):
        flat += [(x, i) for x in _words(w)]
    sm = difflib.SequenceMatcher(None, want, [x for x, _ in flat], autojunk=False)
    found = []
    for op, a0, a1, b0, b1 in sm.get_opcodes():
        if op in ("insert", "replace") and (b1 - b0) - (a1 - a0) >= 2:
            i0, i1 = flat[b0][1], flat[b1 - 1][1]
            prev_end = said[i0 - 1][1] if i0 else 0.0
            next_start = said[i1 + 1][0] if i1 + 1 < len(said) else said[i1][1]
            found.append(((prev_end + said[i0][0]) / 2, (said[i1][1] + next_start) / 2,
                          "".join(w for _, _, w in said[i0:i1 + 1]).strip()))
    return found


def _cut(src: Path, dst: Path, cuts: list[tuple[float, float, str]]) -> None:
    """cuts oraliqlarini olib tashlab, qolgan bo'laklarni 50 ms fade bilan ulaydi."""
    keep, t = [], 0.0
    for a, b, _ in sorted(cuts):
        keep.append((t, a)); t = b
    keep.append((t, None))
    parts = []
    for i, (a, b) in enumerate(keep):
        trim = f"atrim=start={a:.3f}" + (f":end={b:.3f}" if b is not None else "")
        fades = (f",afade=t=in:d=0.05" if i else "") + (f",afade=t=out:st={b - a - .05:.3f}:d=0.05" if b is not None else "")
        parts.append(f"[0:a]{trim},asetpts=N/SR/TB{fades}[p{i}]")
    graph = ";".join(parts) + ";" + "".join(f"[p{i}]" for i in range(len(keep))) + f"concat=n={len(keep)}:v=0:a=1"
    exe = FFMPEG_DIR / "ffmpeg.exe"
    subprocess.run([str(exe) if exe.exists() else "ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
                    "-filter_complex", graph, str(dst)], check=True)


def check_and_fix(prompt_file: Path, wav: Path) -> list[str]:
    """Ovozni matn bilan solishtiradi; ortiqcha bo'laklarni kesadi (asli Voiceover_raw.wav). Hisobot qatorlarini qaytaradi."""
    _, _, script = parse_prompt(prompt_file)
    extras = _extras(script, _transcribe(wav))
    if not extras:
        return []
    raw = wav.with_name(wav.stem + "_raw.wav")
    wav.replace(raw)
    _cut(raw, wav, extras)
    notes = [f"✂️ {a:.1f}–{b:.1f} s: \"{s}\" — matnda yo'q, kesildi" for a, b, s in extras]
    left = _extras(script, _transcribe(wav))
    notes += [f"⚠️ hali ham ortiqcha: \"{s}\" ({a:.1f} s)" for a, b, s in left]
    return notes


def _to_mp3(wav: Path) -> Path:
    mp3 = wav.with_suffix(".mp3")
    exe = FFMPEG_DIR / "ffmpeg.exe"
    subprocess.run([str(exe) if exe.exists() else "ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
                    "-b:a", "192k", str(mp3)], check=True)
    return mp3


async def generate_voice(project_dir: Path) -> tuple[Path, Path, str, list[str]]:
    """Voiceover.wav yaratadi (eskisi Voiceover_old_N.wav bo'lib qoladi), matn bilan tekshiradi.
    (wav, mp3, voice, tekshiruv izohlari) qaytaradi."""
    prompt_file = project_dir / "TTS_Prompt_AI_Studio.txt"
    out_wav = project_dir / "Voiceover.wav"
    if out_wav.exists():
        n = 1
        while (project_dir / f"Voiceover_old_{n}.wav").exists():
            n += 1
        out_wav.rename(project_dir / f"Voiceover_old_{n}.wav")
    voice = await asyncio.to_thread(_generate, prompt_file, out_wav)
    try:
        notes = await asyncio.to_thread(check_and_fix, prompt_file, out_wav)
    except Exception as e:  # tekshiruv yiqilsa ham ovoz yo'qolmasin
        notes = [f"⚠️ matn tekshiruvi ishlamadi: {e}"]
    mp3 = await asyncio.to_thread(_to_mp3, out_wav)
    return out_wav, mp3, voice, notes
