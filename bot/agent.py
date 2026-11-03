"""Claude Code sessiyasi: what-if-earth skill bo'yicha ijodiy va texnik ishni bajaradi."""
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Awaitable, Callable

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ResultMessage,
    TextBlock,
    ToolUseBlock,
    query,
)

from config import BOT_DIR, CLAUDE_MODEL, CLAUDE_MODEL_LIGHT, EARTH_DIR, SKILL_FILE

BOT_RULES = f"""
You are working through a Telegram bot for the user's "Earth Mechanics" YouTube Shorts channel.
Always follow the what-if-earth skill: read {SKILL_FILE} at the start of a new session and follow it exactly
(hook first, fixed script pattern, fact-check, deliverables, visual format, realistic globe, build steps).

How to talk with the user (most important):
- You are their creative partner and consultant, not an order-taker. Talk like a thoughtful colleague in a chat:
  react to their idea honestly, say what is strong and what is weak and WHY (viewer retention, hook checklist,
  what is viral now, facts and numbers, how it would look on screen), push back when you disagree, and give
  2-3 concrete options with your recommendation. Ask a short question when something is unclear.
- Do NOT change files just because the user shared an idea or an opinion. Change things only when the user clearly
  asks for a specific change ("make it ...", "qil", "o'zgartir") or approves your proposal.
- When you suggest a concrete change that waits for their approval, end with one line
  `PROPOSAL: <one-sentence Uzbek summary of exactly what you will change>`. The bot shows approve/other buttons.
- Keep chat replies compact (about 5-15 lines); details go in files.

Sound: never use noise-based "shhh" SFX (sfx_lib whoosh(), riser(), swept-noise transitions, hissy beds) — the user
finds them unpleasant. Use tonal/low or real-object sounds, or silence on cuts.

Unstable internet on this laptop:
- A long single response can be cut off mid-stream and lose all of it. Write big files (scene files, build
  scripts) in parts of at most ~150 lines: create the file with the first part, then add the rest with
  further Edit calls, one section (e.g. one scene) per call. Never put a whole 400+ line file in one Write.

Telegram rules:
- The user writes Uzbek; reply in Uzbek, short and clear, plain text (no Markdown tables; simple "-" lists are fine).
- Nobody can approve tool prompts: never wait for interactive input, never ask for permission, just do the work.
- To send a file to the user, put a line `SEND: <absolute path>` at the end of your reply (one per file).
  jpg/png go as photos, mp3/wav as audio, mp4 as video. Only files under {EARTH_DIR}.
- All projects live in {EARTH_DIR}\\Earth_mechanics_N. Never move or delete old projects.
- Voice: the BOT generates Voiceover.wav from TTS_Prompt_AI_Studio.txt with Google AI Studio (Gemini TTS).
  You only write that file in the skill's format, keeping the header line `GOOGLE AI STUDIO TTS — Voice: <Name>`
  (default Fola; pick another prebuilt Gemini voice only if the user asks) and the sections
  `=== STYLE INSTRUCTIONS ===` and `=== TEXT ===`. Tailor the style instructions to this script.
- Final render: do NOT run the long hyperframes render yourself. When the video is ready to render, write
  `project\\render.ps1` (prepend ffmpeg to PATH, run `npx hyperframes@0.8.162 render -o ..\\<Name>_master.mp4 --quiet`
  from the right folder, then the 2-pass libx264 2900k upload copy `..\\<Name>.mp4`, exit non-zero on failure)
  and end your reply with the lines `RENDER_SCRIPT: <abs path to render.ps1>` and `FINAL: <abs path to upload mp4>`.
  The bot runs it and sends the finished video to Telegram.
"""

log = logging.getLogger("earth_bot.agent")

SEND_RE = re.compile(r"^\s*SEND:\s*(.+?)\s*$", re.M)
RENDER_RE = re.compile(r"^\s*RENDER_SCRIPT:\s*(.+?)\s*$", re.M)
FINAL_RE = re.compile(r"^\s*FINAL:\s*(.+?)\s*$", re.M)
PROPOSAL_RE = re.compile(r"^\s*PROPOSAL:\s*(.+?)\s*$", re.M)


@dataclass
class AgentReply:
    text: str
    session_id: str | None
    files: list[Path] = field(default_factory=list)
    render_script: Path | None = None
    final_video: Path | None = None
    proposal: str | None = None
    cost: float | None = None
    error: bool = False


def _tool_summary(block: ToolUseBlock) -> str:
    inp = block.input or {}
    detail = inp.get("description") or inp.get("file_path") or inp.get("command") or inp.get("query") \
        or inp.get("pattern") or inp.get("url") or inp.get("skill") or ""
    return f"{block.name}: {str(detail)[:90]}"


async def run_agent(prompt: str, session_id: str | None, cwd: Path,
                    on_progress: Callable[[str], Awaitable[None]] | None = None,
                    light: bool = False) -> AgentReply:
    """light=True: suhbat/mavzu uchun arzon model; aks holda asosiy (kuchli) model."""
    options = ClaudeAgentOptions(
        cwd=str(cwd),
        add_dirs=[str(EARTH_DIR), str(BOT_DIR)],
        resume=session_id,
        permission_mode="bypassPermissions",
        setting_sources=["user", "project"],
        system_prompt={"type": "preset", "preset": "claude_code", "append": BOT_RULES},
        model=CLAUDE_MODEL_LIGHT if light else CLAUDE_MODEL,
        stderr=lambda line: log.warning("claude stderr: %s", line.rstrip()),
        # QC kadr / storyboard rasmlari o'qilganda xabar 1 MB (standart chegara) dan oshib ketadi.
        max_buffer_size=64 * 1024 * 1024,
    )
    texts: list[str] = []
    result: ResultMessage | None = None
    async for msg in query(prompt=prompt, options=options):
        if isinstance(msg, AssistantMessage):
            for block in msg.content:
                if isinstance(block, TextBlock):
                    texts.append(block.text)
                elif isinstance(block, ToolUseBlock) and on_progress:
                    await on_progress(_tool_summary(block))
        elif isinstance(msg, ResultMessage):
            result = msg

    text = (result.result if result and result.result else "\n\n".join(texts[-1:])) or ""
    reply = AgentReply(
        text=text,
        session_id=result.session_id if result else session_id,
        cost=result.total_cost_usd if result else None,
        error=bool(result and result.is_error),
    )
    root = EARTH_DIR.resolve()
    for m in SEND_RE.findall(text):
        p = Path(m.strip("`\"'"))
        if p.exists() and root in p.resolve().parents:
            reply.files.append(p)
    if m := RENDER_RE.search(text):
        reply.render_script = Path(m.group(1).strip("`\"'"))
    if m := FINAL_RE.search(text):
        reply.final_video = Path(m.group(1).strip("`\"'"))
    if m := PROPOSAL_RE.search(text):
        reply.proposal = m.group(1).strip()
    for rx in (SEND_RE, RENDER_RE, FINAL_RE):
        text = rx.sub("", text)
    reply.text = PROPOSAL_RE.sub(lambda m: f"💡 Taklif: {m.group(1).strip()}", text).strip()
    return reply
