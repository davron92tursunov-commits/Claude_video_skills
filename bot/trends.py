"""YouTube'dan shu oy eng ko'p ko'rilgan videolarni yt-dlp orqali yig'ish (API kalit kerak emas)."""
import asyncio
import json
import sys
import urllib.parse

from config import TREND_QUERIES

# CAM = ko'rishlar bo'yicha saralash, SBAgEEAE = shu oy, faqat video.
_SP = "CAMSBAgEEAE%3D"


async def _search(query: str, limit: int) -> list[dict]:
    url = f"https://www.youtube.com/results?search_query={urllib.parse.quote_plus(query)}&sp={_SP}"
    proc = await asyncio.create_subprocess_exec(
        sys.executable, "-m", "yt_dlp", "--no-update", "--flat-playlist", "--dump-json",
        "--playlist-end", str(limit), url,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
    )
    out, _ = await proc.communicate()
    items = []
    for line in out.decode("utf-8", "replace").splitlines():
        try:
            d = json.loads(line)
        except json.JSONDecodeError:
            continue
        items.append({
            "title": d.get("title"),
            "views": d.get("view_count"),
            "duration_s": d.get("duration"),
            "channel": d.get("channel"),
            "url": d.get("url"),
            "query": query,
        })
    return items


async def fetch_trending(limit_per_query: int = 12) -> list[dict]:
    results = await asyncio.gather(*(_search(q, limit_per_query) for q in TREND_QUERIES))
    seen, merged = set(), []
    for item in (i for r in results for i in r):
        if item["url"] in seen or not item["title"]:
            continue
        seen.add(item["url"])
        merged.append(item)
    merged.sort(key=lambda x: x["views"] or 0, reverse=True)
    return merged
