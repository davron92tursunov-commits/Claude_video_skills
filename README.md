# Earth Mechanics Kit

"What if Earth..." Shorts yaratish uchun Claude Code skill'lari, shablon loyiha va ovoz boti.
Skills, template project and voice bot for making "What if Earth..." YouTube Shorts.

## Tarkib
| Papka | Nima |
|---|---|
| `skills/` | Claude Code skill'lari: `what-if-earth` (asosiysi), `what-if-3d`, `law-flat-video`, `zach-d-films`, `stick-figure`, `graph`, `breakdown`, `map-route`, `minimalistic-graphics` |
| `templates/earth_short/` | Tayyor dvigatel (`hf/`: Three.js globus + sahnalar + HUD, teksturalar, shriftlar, vendor), `sfx_lib.py`, `make_sfx_example.py`, `tools/` |
| `templates/hero/` | Yuzsiz sariq-hoodie qahramon (`hero.glb`, `person.js`, `hero_overlay.js`) |
| `bot/` | Telegram + Gemini TTS (Fola) + Whisper vaqtlari boti (**faqat kod**, `.env` yo'q) |
| `examples/` | 21 (Sahara), 22 (egilish yo'q), 23 (daraxtlar yo'q): skript, TTS prompt, `scenes.js`, `main.js` |
| `memory/` | Claude xotira fayllari (ixtiyoriy) |

## Boshqa kompyuterda o'rnatish (Windows)
1. Kerakli dasturlar: Git, Node.js (npx), Python 3.11+, ffmpeg (PATH'da), Claude Code / Claude desktop.
2. `git clone <repo> D:\Youtube_Projects\earth-mechanics-kit`
3. Skill'larni o'rnatish: `powershell -ExecutionPolicy Bypass -File scripts\install_skills.ps1`
4. Bot: `copy bot D:\Earth_Mechanics_bot` (yoki `BOT_DIR` o'zgaruvchisi bilan boshqa joy), `pip install -r requirements.txt`,
   `.env.example` -> `.env` va **o'z kalitlaringizni** yozing (`GEMINI_API_KEY`, `TELEGRAM_TOKEN`). `.env` hech qachon GitHub'ga yuklanmaydi.
5. Yangi video: `templates/earth_short/hf` ni `<EARTH_DIR>\Earth_mechanics_N\project\hf` ga nusxalang, so'ng Claude'ga ayting:
   "birorta shorts yasaymizmi" - skill qolganini o'zi bajaradi (skript, ovoz, sahnalar, QC, render, upload nusxasi).
6. Ixtiyoriy ma'lumotlar (yangi maskalar/modellar uchun): Natural Earth GeoJSON (public domain), Kenney Nature Kit (CC0), NASA teksturalari.

## Muhim
- API kalitlar va tokenlar hech qachon repo'ga kirmaydi (`.gitignore`, `bot/.env.example`).
- Render sekin (Intel UHD'da ~14 s / 1 s video). Bitta vaqtda bitta render.
- Skill ichidagi yo'llar (`D:\Youtube_Projects\Earth`, `D:\Earth_Mechanics_bot`) shu kompyuterniki; boshqa joyda `EARTH_DIR` / `BOT_DIR` ni moslang.
- Kreditlar: Natural Earth (public domain), Kenney (CC0), NASA, Crowther et al. 2015 va boshqalar - har video `.txt` faylida.
