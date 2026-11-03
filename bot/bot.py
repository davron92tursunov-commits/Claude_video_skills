"""Earth Mechanics Telegram bot.

Oqim: /mavzular -> mavzu tanlash -> hook va fikr almashish -> storyboard (tahrir) ->
Gemini TTS ovoz (Fola) -> tasdiq -> video render -> tayyor mp4 shu botga.
"""
import asyncio
import contextlib
import ctypes
import json
import logging
import re
import socket
import sys
import time
from pathlib import Path

from telegram import (
    BotCommand,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    Update,
)
from telegram.constants import ChatAction
from telegram.ext import (
    Application,
    ApplicationBuilder,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

import config
from agent import AgentReply, run_agent
from renderlock import render_slot
from trends import fetch_trending
from tts import generate_voice

_handlers: list[logging.Handler] = [logging.FileHandler(config.DATA_DIR / "bot.log", encoding="utf-8")]
if sys.stderr:  # pythonw (oynasiz avtostart) da konsol yo'q
    _handlers.append(logging.StreamHandler())
logging.basicConfig(format="%(asctime)s %(levelname)s %(name)s: %(message)s", level=logging.INFO,
                    handlers=_handlers)
logging.getLogger("httpx").setLevel(logging.WARNING)
log = logging.getLogger("earth_bot")

STAGES = {
    "hook": "💬 Hook va g'oya muhokamasi",
    "storyboard": "🎬 Storyboard",
    "voice": "🎙 Ovoz",
    "video": "🛠 Video yig'ilmoqda",
    "render": "⏳ Render",
    "done": "✅ Tayyor",
}

# ---------------------------------------------------------------- holat (state)


def load_state() -> dict:
    if config.STATE_FILE.exists():
        return json.loads(config.STATE_FILE.read_text(encoding="utf-8"))
    return {"active": None, "projects": {}, "topics": [], "scout_session": None}


def save_state() -> None:
    config.STATE_FILE.write_text(json.dumps(STATE, ensure_ascii=False, indent=2), encoding="utf-8")


STATE = load_state()
BUSY = asyncio.Lock()


def active_project() -> tuple[Path, dict] | tuple[None, None]:
    key = STATE.get("active")
    if key and key in STATE["projects"]:
        return Path(key), STATE["projects"][key]
    return None, None


def next_project_dir() -> Path:
    nums = [int(m.group(1)) for p in config.EARTH_DIR.iterdir()
            if p.is_dir() and (m := re.fullmatch(r"earth_mechanics_(\d+)", p.name, re.I))]
    return config.EARTH_DIR / f"Earth_mechanics_{max(nums, default=0) + 1}"


def done_topics() -> list[str]:
    names = []
    for p in sorted(config.EARTH_DIR.iterdir()):
        if p.is_dir():
            names += [f"{p.name}/{f.name}" for f in p.glob("*.txt") if not f.name.startswith("TTS")]
    return names

# ---------------------------------------------------------------- yordamchilar


def allowed(update: Update) -> bool:
    user = update.effective_user
    return bool(user and user.id in config.ALLOWED_USERS)


async def send_long(chat, text: str, markup=None) -> None:
    text = text.strip() or "(bo'sh javob)"
    chunks = [text[i:i + 4000] for i in range(0, len(text), 4000)]
    for i, chunk in enumerate(chunks):
        await chat.send_message(chunk, reply_markup=markup if i == len(chunks) - 1 else None,
                                disable_web_page_preview=True)


async def send_file(chat, path: Path, caption: str | None = None) -> None:
    size_mb = path.stat().st_size / 1e6
    if size_mb > 49:
        await chat.send_message(f"⚠️ {path.name} {size_mb:.0f} MB — Telegram bot limiti 50 MB. Fayl: {path}")
        return
    ext = path.suffix.lower()
    with path.open("rb") as f:
        if ext in (".jpg", ".jpeg", ".png") and size_mb < 10:
            await chat.send_photo(f, caption=caption or path.name)
        elif ext in (".mp3", ".m4a", ".ogg"):
            await chat.send_audio(f, caption=caption or path.name, filename=path.name)
        elif ext == ".mp4":
            await chat.send_video(f, caption=caption or path.name, supports_streaming=True,
                                  width=1080, height=1920)
        else:
            await chat.send_document(f, caption=caption or path.name, filename=path.name)


def stage_buttons(stage: str) -> InlineKeyboardMarkup | None:
    rows = {
        "hook": [[InlineKeyboardButton("📋 Storyboard tayyorla", callback_data="storyboard")]],
        "storyboard": [[InlineKeyboardButton("✅ Storyboard tasdiq → Ovoz", callback_data="voice")]],
        "voice": [[InlineKeyboardButton("🔁 Qayta ovoz", callback_data="revoice"),
                   InlineKeyboardButton("✅ Ovoz tasdiq → Video", callback_data="video")]],
        "render_failed": [[InlineKeyboardButton("🛠 Tuzatib qayta render", callback_data="fixrender")]],
    }.get(stage)
    return InlineKeyboardMarkup(rows) if rows else None


class Progress:
    """Agent ishlayotganda bitta xabarni yangilab boradi."""

    def __init__(self, chat, title: str):
        self.chat, self.title, self.msg = chat, title, None
        self.start = self.last_edit = time.monotonic()
        self.lines: list[str] = []

    async def begin(self):
        self.msg = await self.chat.send_message(f"⏳ {self.title}…")

    async def update(self, line: str):
        self.lines = (self.lines + [line])[-4:]
        now = time.monotonic()
        if now - self.last_edit < 4:
            return
        self.last_edit = now
        mins = int(now - self.start) // 60
        body = "\n".join(f"• {x}" for x in self.lines)
        try:
            await self.msg.edit_text(f"⏳ {self.title}… ({mins} daq)\n{body}")
        except Exception:  # bir xil matn / tarmoq xatosi — muhim emas
            pass

    async def finish(self, ok: bool = True):
        mins = int(time.monotonic() - self.start) // 60
        try:
            await self.msg.edit_text(f"{'✅' if ok else '❌'} {self.title} ({mins} daq)")
        except Exception:
            pass


async def ask_agent(chat, prompt: str, title: str, project: Path | None = None,
                    light: bool = False) -> AgentReply | None:
    """Agentni ishga tushiradi. light=True: suhbat/mavzu — arzon model (config.CLAUDE_MODEL_LIGHT)."""
    if project:
        info = STATE["projects"][str(project)]
        session, cwd = info.get("session_id"), project
    else:
        session, cwd = STATE.get("scout_session"), config.SCOUT_DIR
    prog = Progress(chat, title)
    await prog.begin()
    try:
        reply = await run_agent(prompt, session, cwd, prog.update, light=light)
    except Exception as e:
        log.exception("agent xatosi")
        await prog.finish(False)
        await chat.send_message(f"❌ Agent xatosi: {e}")
        return None
    await prog.finish(not reply.error)
    if project:
        STATE["projects"][str(project)]["session_id"] = reply.session_id
    else:
        STATE["scout_session"] = reply.session_id
    save_state()
    return reply


PROPOSAL_BUTTONS = InlineKeyboardMarkup([[
    InlineKeyboardButton("✅ Shunday qil", callback_data="apply"),
    InlineKeyboardButton("✏️ Boshqacha", callback_data="other"),
]])


async def deliver(chat, reply: AgentReply, markup=None) -> None:
    if reply.proposal:  # agent o'zgarish taklif qildi: avval roziligingizni so'raydi
        pdir, info = active_project()
        if info is not None:
            info["proposal"] = reply.proposal
            save_state()
        markup = PROPOSAL_BUTTONS
    if reply.text:
        await send_long(chat, reply.text, markup if not reply.files else None)
    for f in reply.files:
        await send_file(chat, f)
    if reply.files and markup:
        await chat.send_message("Keyingi qadam:", reply_markup=markup)
    if reply.cost:
        log.info("agent narxi: $%.2f", reply.cost)


async def deny(update: Update) -> bool:
    """Ruxsatsiz foydalanuvchiga ID'sini aytadi va True qaytaradi."""
    msg = update.effective_message
    if msg and msg.date and not update.callback_query:  # xabar botga qancha kechikib yetgani (internet uzilishlari)
        lag = time.time() - msg.date.timestamp()
        log.info("xabar keldi (kechikish %.0f s, band=%s): %s", lag, BUSY.locked(), (msg.text or "")[:60])
    if allowed(update):
        return False
    if update.effective_message:
        uid = update.effective_user.id if update.effective_user else "?"
        await update.effective_message.reply_text(f"⛔ Ruxsat yo'q. Sizning ID: {uid}")
    return True


def auth_only(func):
    """Band bo'lsa ham ishlaydigan buyruqlar (holat, yordam)."""
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        if await deny(update):
            return
        await func(update, context)
    return wrapper


def busy_guard(func):
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        if await deny(update):
            return
        if update.callback_query:
            await update.callback_query.answer()
        if BUSY.locked():
            await update.effective_chat.send_message("⏳ Hali oldingi ish tugamadi, biroz kuting.")
            return
        async with working():
            await update.effective_chat.send_action(ChatAction.TYPING)
            await func(update, context)
            await drain_pending(update.effective_chat, context)
    return wrapper


BUSY_FLAG = config.DATA_DIR / "busy.flag"  # restart_when_idle.ps1 shu fayl bor paytda botni to'xtatmaydi


# Ish ketayotganda noutbuk uxlamasin (aks holda agent/render tun bo'yi to'xtab qoladi).
# Barcha ish shu asyncio oqimida, shuning uchun SetThreadExecutionState shu oqimga yetarli.
ES_CONTINUOUS, ES_SYSTEM_REQUIRED = 0x80000000, 0x00000001


@contextlib.asynccontextmanager
async def working():
    async with BUSY:
        BUSY_FLAG.write_text(time.strftime("%Y-%m-%d %H:%M:%S"), encoding="utf-8")
        ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)
        try:
            yield
        finally:
            ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS)
            BUSY_FLAG.unlink(missing_ok=True)


# Bot band paytida yozilgan xabarlar: yo'qolmaydi, joriy ish tugagach birga ko'rib chiqiladi.
PENDING: list[str] = []


async def drain_pending(chat, context) -> None:
    while PENDING:
        text = "\n\n".join(PENDING)
        PENDING.clear()
        await chat.send_message("📝 Kutib turgan xabaringizni ko'rib chiqyapman…")
        await handle_text(chat, context, text)

# ---------------------------------------------------------------- buyruqlar

BTN_TOPICS = "🔥 Viral mavzular"
BTN_OWN = "✍️ O'z mavzuim"
BTN_STATUS = "📊 Holat"
BTN_PROJECTS = "📁 Loyihalar"
BTN_VOICE = "🎙 Ovozni qayta"
BTN_RENDER = "🎞 Qayta render"
BTN_HELP = "❓ Yordam"

MENU = ReplyKeyboardMarkup(
    [[KeyboardButton(BTN_TOPICS), KeyboardButton(BTN_OWN)],
     [KeyboardButton(BTN_STATUS), KeyboardButton(BTN_PROJECTS)],
     [KeyboardButton(BTN_VOICE), KeyboardButton(BTN_RENDER), KeyboardButton(BTN_HELP)]],
    resize_keyboard=True, is_persistent=True, input_field_placeholder="Xabar yoki tugma…",
)

HELP = (
    "🌍 Earth Mechanics bot — pastdagi tugmalar:\n\n"
    f"{BTN_TOPICS} — YouTube'da hozir viral bo'layotgan mavzular asosida g'oyalar\n"
    f"{BTN_OWN} — o'z mavzuingiz bilan yangi loyiha\n"
    f"{BTN_STATUS} — joriy loyiha va bosqich (keyingi qadam tugmasi bilan)\n"
    f"{BTN_PROJECTS} — loyihalar ro'yxati / almashtirish\n"
    f"{BTN_VOICE} — ovozni qayta yaratish\n"
    f"{BTN_RENDER} — oxirgi renderni qayta ishga tushirish\n\n"
    "Oddiy xabar yozsangiz — joriy loyiha bo'yicha Claude bilan maslahatlashasiz "
    "(hook, storyboard o'zgarishlari, ovoz uslubi)."
)


@auth_only
async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.effective_chat.send_message(HELP, reply_markup=MENU)


@auth_only
async def btn_own(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["await_topic"] = True
    await update.effective_chat.send_message(
        "✍️ Mavzuni yozing (inglizcha yoki o'zbekcha), masalan:\nWhat if Earth stopped spinning for 1 second?")


@busy_guard
async def cmd_topics(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat = update.effective_chat
    await chat.send_message("🔎 YouTube'dan shu oyning eng ko'p ko'rilgan videolarini yig'yapman…")
    trending = await fetch_trending()
    (config.SCOUT_DIR / "trending.json").write_text(json.dumps(trending, ensure_ascii=False, indent=1),
                                                     encoding="utf-8")
    top = trending[:70]
    prompt = (
        "Here is what is viral on YouTube THIS MONTH in our niche (sorted by views):\n"
        f"{json.dumps(top, ensure_ascii=False)}\n\n"
        f"Our topic list: {config.EARTH_DIR / 'Mavzular_Earth_Mechanics.txt'}. Already made (do not repeat): "
        f"{json.dumps(done_topics(), ensure_ascii=False)}\n\n"
        "Recommend 6 topics for Earth Mechanics that ride what is viral right now, each answering "
        "'what would this do to Earth / to us?'. You may use WebSearch for fresh news hooks. For each: an English "
        "'What if ...' title, why it should go viral now (cite 1-2 example videos with their views AND their YouTube "
        "link copied exactly from the 'url' field above — never invent a link; for a news hook add the article "
        "link), a draft hook (skill checklist) and one line in Uzbek. Reply in Uzbek as a short numbered list, "
        "then end with a "
        "```json block: [{\"title\": \"...\", \"why\": \"...\", \"hook\": \"...\"}]."
    )
    reply = await ask_agent(chat, prompt, "Viral mavzularni tahlil qilyapman", light=True)
    if not reply:
        return
    topics = []
    if m := re.search(r"```json\s*(\[.*?\])\s*```", reply.text, re.S):
        try:
            topics = json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
        reply.text = reply.text.replace(m.group(0), "").strip()
    STATE["topics"] = topics
    save_state()
    buttons = [[InlineKeyboardButton(f"{i + 1}. {t['title'][:55]}", callback_data=f"pick:{i}")]
               for i, t in enumerate(topics)]
    buttons.append([InlineKeyboardButton("🔄 Boshqa mavzular", callback_data="more")])
    await deliver(chat, reply, InlineKeyboardMarkup(buttons))


async def start_project(chat, title: str, why: str = "", hook: str = "") -> None:
    pdir = next_project_dir()
    pdir.mkdir(parents=True)
    STATE["projects"][str(pdir)] = {"topic": title, "stage": "hook", "session_id": None,
                                    "created": time.strftime("%Y-%m-%d %H:%M")}
    STATE["active"] = str(pdir)
    save_state()
    await chat.send_message(f"📁 Yangi loyiha: {pdir}\nMavzu: {title}")
    prompt = (
        f"New Earth Mechanics project. Folder (created, empty): {pdir}\nTopic: {title}\n"
        f"Why now: {why}\nDraft hook: {hook}\n\n"
        "Read the skill first. Do skill step 0: give 4-5 hook options (spoken line + on-screen text + first "
        "visual, score /5, mark your pick). Then in 3-5 lines give your view of the angle: the escalation "
        "stages with their numbers, the myth-bust and the ending fact. Ask what I think. Do NOT write the full "
        "script or any files yet."
    )
    reply = await ask_agent(chat, prompt, "Hook variantlarini tayyorlayapman", pdir)
    if reply:
        await deliver(chat, reply, stage_buttons("hook"))


@busy_guard
async def cb_pick(update: Update, context: ContextTypes.DEFAULT_TYPE):
    data = update.callback_query.data
    chat = update.effective_chat
    if data == "more":
        reply = await ask_agent(chat, "Give 6 different topics (not the ones above), same format (with the "
                                      "example video links) and the ```json block at the end.", "Yangi mavzular izlayapman", light=True)
        if reply and (m := re.search(r"```json\s*(\[.*?\])\s*```", reply.text, re.S)):
            STATE["topics"] = json.loads(m.group(1))
            save_state()
            reply.text = reply.text.replace(m.group(0), "").strip()
            buttons = [[InlineKeyboardButton(f"{i + 1}. {t['title'][:55]}", callback_data=f"pick:{i}")]
                       for i, t in enumerate(STATE["topics"])]
            buttons.append([InlineKeyboardButton("🔄 Boshqa mavzular", callback_data="more")])
            await deliver(chat, reply, InlineKeyboardMarkup(buttons))
        elif reply:
            await deliver(chat, reply)
        return
    i = int(data.split(":")[1])
    if i >= len(STATE["topics"]):
        await chat.send_message(f"Bu ro'yxat eskirgan, {BTN_TOPICS} tugmasini qayta bosing.")
        return
    t = STATE["topics"][i]
    await start_project(chat, t["title"], t.get("why", ""), t.get("hook", ""))


@busy_guard
async def cmd_new(update: Update, context: ContextTypes.DEFAULT_TYPE):
    title = " ".join(context.args).strip()
    if not title:
        await update.effective_chat.send_message("Masalan: /yangi What if Earth stopped spinning for 1 second?")
        return
    await start_project(update.effective_chat, title)


@auth_only
async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    pdir, info = active_project()
    if not pdir:
        await update.effective_chat.send_message(f"Faol loyiha yo'q. {BTN_TOPICS} yoki {BTN_OWN} bilan boshlang.")
        return
    stage = info["stage"]
    busy = "\n⏳ Hozir ish ketyapti." if BUSY.locked() else ""
    await update.effective_chat.send_message(
        f"📁 {pdir.name}\nMavzu: {info['topic']}\nBosqich: {STAGES.get(stage, stage)}{busy}",
        reply_markup=None if BUSY.locked() else stage_buttons(stage))


@auth_only
async def cmd_projects(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not STATE["projects"]:
        await update.effective_chat.send_message("Bot orqali qilingan loyiha hali yo'q.")
        return
    buttons = [[InlineKeyboardButton(f"{'▶️ ' if k == STATE['active'] else ''}{Path(k).name} — {v['topic'][:35]}",
                                     callback_data=f"switch:{Path(k).name}")]
               for k, v in STATE["projects"].items()]
    await update.effective_chat.send_message("Loyihalar:", reply_markup=InlineKeyboardMarkup(buttons))


@busy_guard
async def cb_switch(update: Update, context: ContextTypes.DEFAULT_TYPE):
    name = update.callback_query.data.split(":", 1)[1]
    key = str(config.EARTH_DIR / name)
    if key in STATE["projects"]:
        STATE["active"] = key
        save_state()
        info = STATE["projects"][key]
        await update.effective_chat.send_message(
            f"▶️ Faol loyiha: {name}\n{info['topic']}\nBosqich: {STAGES.get(info['stage'], info['stage'])}",
            reply_markup=stage_buttons(info["stage"]))

# ---------------------------------------------------------------- bosqichlar


def set_stage(stage: str) -> None:
    pdir, info = active_project()
    info["stage"] = stage
    save_state()


@busy_guard
async def cb_storyboard(update: Update, context: ContextTypes.DEFAULT_TYPE):
    pdir, info = active_project()
    if not pdir:
        return
    set_stage("storyboard")
    prompt = (
        "We agreed on the hook and angle. Now build the storyboard per the skill: final fact-checked script "
        "(tell me which numbers changed and why), <Topic>.txt, TTS_Prompt_AI_Studio.txt (voice Fola, style "
        "instructions tailored to this script), copy the template project from the newest Earth project, build "
        "the scenes with the realistic globe, then `build.py --sb` + snapshots + make_board.py. In your reply give "
        "a DETAILED storyboard in Uzbek: for every scene — time range, the English VO line, what is on screen "
        "(globe view/camera move, headline text, the new number, HUD, labels) and the SFX. SEND the storyboard jpg."
    )
    reply = await ask_agent(update.effective_chat, prompt, "Storyboard qurayapman (bir necha daqiqa)", pdir)
    if reply:
        await deliver(update.effective_chat, reply, stage_buttons("storyboard"))
        await update.effective_chat.send_message(
            "💬 Fikringizni yozing — muhokama qilamiz. O'zgartirishni taklif qilsam, "
            "\"✅ Shunday qil\" tugmasi bilan tasdiqlaysiz.")


async def make_voice(chat) -> None:
    pdir, info = active_project()
    if not (pdir / "TTS_Prompt_AI_Studio.txt").exists():
        await chat.send_message("❌ TTS_Prompt_AI_Studio.txt topilmadi. Avval storyboard bosqichini tugating.")
        return
    if not config.GEMINI_API_KEY:
        await chat.send_message("❌ .env da GEMINI_API_KEY yo'q.")
        return
    set_stage("voice")
    msg = await chat.send_message(f"🎙 Google AI Studio ({config.TTS_MODEL}) orqali ovoz yaratilmoqda…")
    await chat.send_action(ChatAction.RECORD_VOICE)
    try:
        wav, mp3, voice, notes = await generate_voice(pdir)
    except Exception as e:
        log.exception("TTS xatosi")
        await msg.edit_text(f"❌ TTS xatosi: {e}")
        return
    check = "\n".join(notes) if notes else "🔎 Matn tekshirildi: ortiqcha gap yo'q."
    await msg.edit_text(f"✅ Ovoz tayyor — voice: {voice}\n{check}")
    await send_file(chat, mp3, caption=f"Voiceover — {info['topic']} ({voice})")
    await chat.send_message("Tinglang. Uslubni o'zgartirish kerak bo'lsa yozing (masalan: \"sekinroq, "
                            "'Right now' pastroq\").", reply_markup=stage_buttons("voice"))


@busy_guard
async def cb_voice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if active_project()[0]:
        await make_voice(update.effective_chat)


async def run_render(chat, reply: AgentReply) -> None:
    pdir, info = active_project()
    script, final = reply.render_script, reply.final_video
    if not script or not script.exists():
        await chat.send_message("⚠️ Agent render.ps1 ni bermadi. \"render.ps1 ni yoz\" deb yozing.")
        return
    info["render_script"], info["final_video"] = str(script), str(final) if final else None
    set_stage("render")

    async def on_wait(holder: str):
        await chat.send_message(f"🕒 Hozir boshqa render ketyapti ({holder}). Navbatdaman — bo'shashi bilan "
                                "o'zim boshlayman.")

    async with render_slot(config.RENDER_LOCK, f"Earth bot: {pdir.name}", on_wait):
        await chat.send_message("🎞 Render boshlandi (~15-25 daqiqa). Tugagach videoni shu yerga yuboraman.")
        log_file = pdir / "render.log"
        start = time.monotonic()
        with log_file.open("wb") as lf:
            proc = await asyncio.create_subprocess_exec(
                "powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(script),
                cwd=str(script.parent), stdout=lf, stderr=asyncio.subprocess.STDOUT)
            code = await proc.wait()
    mins = (time.monotonic() - start) / 60
    if code != 0 or not final or not final.exists():
        tail = log_file.read_text(encoding="utf-8", errors="replace")[-1500:]
        await chat.send_message(f"❌ Render xato bilan tugadi (kod {code}, {mins:.0f} daq).\n\n{tail}",
                                reply_markup=stage_buttons("render_failed"))
        return
    set_stage("done")
    await chat.send_message(f"✅ Render tugadi ({mins:.0f} daq). Yuklayapman…")
    await send_file(chat, final, caption=f"🌍 {info['topic']}")
    txts = [f for f in pdir.glob("*.txt") if not f.name.startswith("TTS")]
    for t in txts[:1]:
        await send_file(chat, t, caption="Title / description / pinned comment")
    await chat.send_message(f"📁 Hammasi saqlandi: {pdir}")


@busy_guard
async def cb_video(update: Update, context: ContextTypes.DEFAULT_TYPE):
    pdir, info = active_project()
    if not pdir:
        return
    chat = update.effective_chat
    set_stage("video")
    prompt = (
        f"The voiceover is approved: {pdir / 'Voiceover.wav'}. Build the video per skill section 4: normalize the "
        "wav, sentence timing, scene boundaries, every on-screen word/number timed to speech, SFX + sidechain mix, "
        "build.py, ~15 QC snapshots — look at them and fix problems. SEND 3 representative QC frames. Then write "
        "project\\render.ps1 and end with RENDER_SCRIPT and FINAL lines."
    )
    reply = await ask_agent(chat, prompt, "Videoni yig'yapman (timing, SFX, QC)", pdir)
    if not reply:
        return
    await deliver(chat, reply)
    await run_render(chat, reply)


@busy_guard
async def cb_fixrender(update: Update, context: ContextTypes.DEFAULT_TYPE):
    pdir, info = active_project()
    chat = update.effective_chat
    tail = (pdir / "render.log").read_text(encoding="utf-8", errors="replace")[-4000:]
    reply = await ask_agent(chat, f"render.ps1 failed. Log tail:\n{tail}\nFix the cause, then end with "
                                  "RENDER_SCRIPT and FINAL lines again.", "Render xatosini tuzatyapman", pdir)
    if reply:
        await deliver(chat, reply)
        await run_render(chat, reply)


@busy_guard
async def cmd_voice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if active_project()[0]:
        await make_voice(update.effective_chat)


@busy_guard
async def cmd_render(update: Update, context: ContextTypes.DEFAULT_TYPE):
    pdir, info = active_project()
    script = Path(info["render_script"]) if pdir and info.get("render_script") else None
    final = Path(info["final_video"]) if pdir and info.get("final_video") else None
    if pdir and not script and (pdir / "project" / "render.ps1").exists():
        # holatda yozuv yo'q (masalan, agent javobi tugmasiz kelgan) — skriptni o'zimiz topamiz
        script = pdir / "project" / "render.ps1"
        if m := re.search(r"\$name\s*=\s*'([^']+)'", script.read_text(encoding="utf-8-sig")):
            final = pdir / f"{m.group(1)}.mp4"
    if not script:
        await update.effective_chat.send_message("Bu loyihada hali render.ps1 yo'q.")
        return
    await run_render(update.effective_chat, AgentReply(text="", session_id=None, render_script=script,
                                                       final_video=final))

# ---------------------------------------------------------------- erkin matn


async def on_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if await deny(update):
        return
    chat = update.effective_chat
    text = update.message.text
    if BUSY.locked():
        PENDING.append(text)
        await chat.send_message("📝 Qabul qildim. Hozirgi ish tugashi bilan shu xabaringizni ko'rib chiqaman.")
        return
    async with working():
        await chat.send_action(ChatAction.TYPING)
        await handle_text(chat, context, text)
        await drain_pending(chat, context)


async def handle_text(chat, context: ContextTypes.DEFAULT_TYPE, text: str) -> None:
    if context.user_data.pop("await_topic", False):
        await start_project(chat, text.strip())
        return
    pdir, info = active_project()
    if not pdir:
        reply = await ask_agent(chat, text, "O'ylayapman", light=True)
        if reply:
            await deliver(chat, reply)
        return
    stage = info["stage"]
    info.pop("proposal", None)  # yangi xabar eski taklifni bekor qiladi
    where = {
        "hook": "We are discussing the hook and the angle (no script yet).",
        "storyboard": "We are at the storyboard stage. If you do apply an edit, rebuild the storyboard jpg, "
                      "list exactly what changed and SEND the new jpg.",
        "voice": "We are at the voice stage. If you do apply a change, edit TTS_Prompt_AI_Studio.txt (keep the "
                 "scenes in sync if the text changes); the bot then regenerates the voice automatically.",
        "done": "The video is finished; this is feedback or an idea about it.",
    }.get(stage, "")
    prompt = (f"Message from the user: {text}\n\n{where}\nAnswer as their creative partner: discuss first. "
              "Apply changes only if this is a clear, specific request; otherwise give your view, options and "
              "a recommendation, ending with PROPOSAL if you suggest a change.")
    tts_file = pdir / "TTS_Prompt_AI_Studio.txt"
    tts_before = tts_file.stat().st_mtime if tts_file.exists() else None
    # video/render bosqichida xabar odatda yig'ish ishini davom ettiradi — kuchli model kerak.
    reply = await ask_agent(chat, prompt, "O'ylayapman", pdir, light=stage not in ("video", "render"))
    if not reply:
        return
    await deliver(chat, reply, stage_buttons(stage))
    await after_reply(chat, reply, stage, tts_file, tts_before)


async def after_reply(chat, reply: AgentReply, stage: str, tts_file: Path, tts_before) -> None:
    """Agent javobidan keyingi avtomatik qadamlar (qaysi tugma yoki xabardan kelgani muhim emas)."""
    if reply.render_script:
        await run_render(chat, reply)
    elif stage == "voice" and tts_file.exists() and tts_file.stat().st_mtime != tts_before:
        await make_voice(chat)


@busy_guard
async def cb_proposal(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat = update.effective_chat
    pdir, info = active_project()
    if not pdir:
        return
    proposal = info.pop("proposal", None)
    save_state()
    await update.callback_query.edit_message_reply_markup(None)
    if update.callback_query.data == "other":
        await chat.send_message("✏️ Qanday bo'lsin? Fikringizni yozing.")
        return
    if not proposal:
        await chat.send_message("Bu taklif eskirgan. Nima qilishimni yozing.")
        return
    stage = info["stage"]
    tts_file = pdir / "TTS_Prompt_AI_Studio.txt"
    tts_before = tts_file.stat().st_mtime if tts_file.exists() else None
    reply = await ask_agent(chat, f"The user approved your proposal: {proposal}\nApply it now. If we are at the "
                                  "storyboard stage, rebuild the storyboard jpg and SEND it. Say briefly what "
                                  "changed.", "Taklifni bajaryapman", pdir)
    if not reply:
        return
    await deliver(chat, reply, stage_buttons(stage))
    await after_reply(chat, reply, stage, tts_file, tts_before)

# ---------------------------------------------------------------- ishga tushirish


async def on_error(update: object, context: ContextTypes.DEFAULT_TYPE):
    log.exception("Telegram xatosi", exc_info=context.error)


async def post_init(app: Application) -> None:
    await app.bot.set_my_commands([
        BotCommand("start", "Menyu tugmalarini ko'rsatish"),
        BotCommand("mavzular", "Viral mavzular"),
        BotCommand("holat", "Joriy loyiha holati"),
        BotCommand("loyihalar", "Loyihalar ro'yxati"),
    ])
    for uid in config.ALLOWED_USERS:  # kompyuter yoqilganda: bot tayyorligini va menyuni yuboradi
        try:
            await app.bot.send_message(uid, "🟢 Earth Mechanics bot ishga tushdi.", reply_markup=MENU)
        except Exception as e:
            log.warning("Salom xabari yuborilmadi (%s): %s", uid, e)


_INSTANCE_LOCK: socket.socket | None = None


def single_instance() -> bool:
    """Bir vaqtda faqat bitta bot ishlasin (ikkitasi Telegram'da 'Conflict' beradi)."""
    global _INSTANCE_LOCK
    _INSTANCE_LOCK = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        _INSTANCE_LOCK.bind(("127.0.0.1", 47821))
        return True
    except OSError:
        return False


def main() -> None:
    if not single_instance():
        log.info("Bot allaqachon ishlayapti — ikkinchi nusxa ishga tushmaydi.")
        return
    BUSY_FLAG.unlink(missing_ok=True)  # oldingi to'satdan to'xtashdan qolgan belgi
    if not config.TELEGRAM_TOKEN:
        raise SystemExit("D:\\Earth_Mechanics_bot\\.env da TELEGRAM_TOKEN yo'q (.env.example ga qarang).")
    if not config.ALLOWED_USERS:
        log.warning("ALLOWED_USERS bo'sh — bot hech kimga javob bermaydi. Botga yozing, u ID'ingizni aytadi.")
    app: Application = (ApplicationBuilder().token(config.TELEGRAM_TOKEN)
                        .concurrent_updates(True)
                        .read_timeout(120).write_timeout(600).media_write_timeout(600)
                        .post_init(post_init)
                        .build())
    app.add_handler(CommandHandler(["start", "help"], cmd_start))
    app.add_handler(CommandHandler("mavzular", cmd_topics))
    app.add_handler(CommandHandler("yangi", cmd_new))
    app.add_handler(CommandHandler("holat", cmd_status))
    app.add_handler(CommandHandler("loyihalar", cmd_projects))
    app.add_handler(CommandHandler("ovoz", cmd_voice))
    app.add_handler(CommandHandler("render", cmd_render))
    app.add_handler(CallbackQueryHandler(cb_pick, pattern=r"^(pick:\d+|more)$"))
    app.add_handler(CallbackQueryHandler(cb_switch, pattern=r"^switch:"))
    app.add_handler(CallbackQueryHandler(cb_storyboard, pattern=r"^storyboard$"))
    app.add_handler(CallbackQueryHandler(cb_voice, pattern=r"^(voice|revoice)$"))
    app.add_handler(CallbackQueryHandler(cb_video, pattern=r"^video$"))
    app.add_handler(CallbackQueryHandler(cb_fixrender, pattern=r"^fixrender$"))
    app.add_handler(CallbackQueryHandler(cb_proposal, pattern=r"^(apply|other)$"))
    menu = {BTN_TOPICS: cmd_topics, BTN_OWN: btn_own, BTN_STATUS: cmd_status, BTN_PROJECTS: cmd_projects,
            BTN_VOICE: cmd_voice, BTN_RENDER: cmd_render, BTN_HELP: cmd_start}
    for label, handler in menu.items():
        app.add_handler(MessageHandler(filters.Text([label]), handler))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))
    app.add_error_handler(on_error)
    log.info("Earth Mechanics bot ishga tushdi. Loyihalar: %s", config.EARTH_DIR)
    # bootstrap_retries=-1: kompyuter yoqilganda internet ulanguncha kutadi.
    app.run_polling(allowed_updates=Update.ALL_TYPES, bootstrap_retries=-1)


if __name__ == "__main__":
    main()
