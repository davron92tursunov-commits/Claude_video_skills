"""Earth va 3D botlar uchun umumiy render navbati (bitta fayl qulfi, Windows msvcrt).

Jarayon to'satdan yopilsa Windows qulfni o'zi bo'shatadi — "osilib qolgan" navbat bo'lmaydi.
D:\\Earth_Mechanics_bot\\renderlock.py bilan bir xil fayl: o'zgartirsangiz ikkalasini ham yangilang.
"""
import asyncio
import contextlib
import msvcrt
from pathlib import Path
from typing import Awaitable, Callable


@contextlib.asynccontextmanager
async def render_slot(lock_file: Path, owner: str,
                      on_wait: Callable[[str], Awaitable[None]] | None = None, poll: float = 15):
    """Render navbati bo'shaguncha kutadi. on_wait(kim) — navbatda turganda bir marta chaqiriladi."""
    lock_file.parent.mkdir(parents=True, exist_ok=True)
    f = open(lock_file, "a+b")
    waited = False
    try:
        while True:
            try:
                f.seek(0)
                msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
                break
            except OSError:
                if not waited and on_wait:
                    holder = "boshqa bot"
                    with contextlib.suppress(OSError):
                        holder = lock_file.with_suffix(".owner").read_text(encoding="utf-8")
                    await on_wait(holder)
                waited = True
                await asyncio.sleep(poll)
        lock_file.with_suffix(".owner").write_text(owner, encoding="utf-8")
        try:
            yield
        finally:
            f.seek(0)
            msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, 1)
    finally:
        f.close()
