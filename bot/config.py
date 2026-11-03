"""Earth Mechanics bot sozlamalari (.env dan o'qiladi)."""
import os
from pathlib import Path

from dotenv import load_dotenv

BOT_DIR = Path(__file__).resolve().parent
load_dotenv(BOT_DIR / ".env")

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "")
# Faqat shu Telegram foydalanuvchi(lar)i botdan foydalana oladi (vergul bilan).
ALLOWED_USERS = {int(x) for x in os.getenv("ALLOWED_USERS", "").replace(" ", "").split(",") if x}

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
TTS_MODEL = os.getenv("TTS_MODEL", "gemini-3.8-flash-tts")
# Asosiy model band bo'lsa navbat bilan sinaladi (2.5-pro bepul tarifda 429 beradi).
TTS_FALLBACKS = ["gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"]
TTS_VOICE = os.getenv("TTS_VOICE", "Fola")

CLAUDE_MODEL = os.getenv("CLAUDE_MODEL") or None  # storyboard, video, render tuzatish (bo'sh = Claude Code standarti)
# Suhbat, mavzu tanlash, hook muhokamasi — arzonroq model (limitni tejaydi).
CLAUDE_MODEL_LIGHT = os.getenv("CLAUDE_MODEL_LIGHT") or "claude-sonnet-5-5"

EARTH_DIR = Path(os.getenv("EARTH_DIR", r"D:\Youtube_Projects\Earth"))
FFMPEG_DIR = Path(os.getenv("FFMPEG_DIR", r"C:\Users\User\OneDrive\Desktop\Youtube_Projects\Earth_mechanics_6\tools\bin"))
SKILL_FILE = Path(os.getenv("SKILL_FILE", r"C:\Users\User\.claude\skills\what-if-earth\SKILL.md"))

# Ikkala bot (Earth va 3D) shu faylni qulflaydi: bir vaqtda faqat bitta render (Intel UHD, 8 GB).
RENDER_LOCK = Path(os.getenv("RENDER_LOCK", r"D:\Youtube_Projects\render.lock"))

DATA_DIR = BOT_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
STATE_FILE = DATA_DIR / "state.json"
SCOUT_DIR = DATA_DIR / "scout"  # mavzu qidirish sessiyasi shu yerda ishlaydi
SCOUT_DIR.mkdir(exist_ok=True)

# Viral mavzularni qidirish uchun YouTube so'rovlari (shu oy, ko'rishlar bo'yicha).
TREND_QUERIES = [
    "what if earth shorts",
    "what if the moon shorts",
    "what if the sun shorts",
    "earth science facts shorts",
    "what if planet shorts",
    "space facts shorts",
    "ocean mystery shorts",
    "volcano asteroid shorts",
]
