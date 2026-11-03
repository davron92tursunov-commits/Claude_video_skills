---
name: what-if-3d
description: Make a "What if YOU ..." YouTube Short in the user's 3D blocky style (Three.js low-poly world, Roblox-like unbranded people, no voiceover, SFX + live counter + captions, twist ending, MORE WHAT IFs sign + FOLLOW tap). Use whenever the user asks for a 3D / Roblox / blokli / simulyatsiya video, a "What if you stood / fell / ..." video, or a storyboard for one. Covers scenario, storyboard, full video, SFX, render and the upload .txt.
---

# What-if 3D Shorts (the user's "3D uslubi")

The user writes in Uzbek; reply in Uzbek. Videos are English, 1080x1920, ~60-70 s.
Say in one line that you are using the 3D style before starting.

Reference videos (all on C:\Users\User\OneDrive\Desktop\Youtube_Projects unless noted):
Venus_test, Wind_test, Fire_test, Alien_test, and D:\Youtube_Projects\Roblox\Tsunami_test (story/HUD/ending/SFX template).
**Look template (standard since 2026-10-19): D:\Youtube_Projects\Roblox\Realistic_3D_test** ("premium blocky": realistic
world, blocky faceless people). Every new 3D video uses this render setup; see "Realism layer" below.
New projects go to **D:\Youtube_Projects\Roblox\<Topic>_test** (never move the old C: projects).

## Fixed format (do not change between videos)
1. **Title** 0.2-3.8 s: three left-aligned lines, Barlow Condensed 700, 104 px, x=80, y=250+j*104 ("What if a tsunami / hit your / beach?").
2. **World**: Three.js r170 via importmap (hf/vendor/three/three.module.js + vendor/three/addons/), the **Realism layer** below,
   flatShading MeshStandardMaterial for props and people, soft shadows, blocky people from `person()` / `pose()` (box limbs, optional cap). The **hero** always wears a **red cap**
   and white shirt. Add a dog when it fits. Crowd of ~12 with varied skin tones.
   **Faceless — always.** No eyes, mouth or any face detail on people, aliens, robots or any other being
   (the user's religious caution, decided 2026-10-18). The head is one plain skin cube:
   `mesh(box(.46,.46,.46),M(skin),0,.24,0,head);` and nothing else is attached to its front. Emotion is shown with
   body language (pose, arms up, running, shaking, crouching), never with a face. An astronaut visor or a helmet is fine.
   Animals (a dog) are also kept without eyes. Before rendering, grep the source for `0x222222` / `eye` to be sure.
3. **No voiceover.** SFX only (ambience, impacts, heartbeat, screams/sirens kept short), loudnorm I=-15 LUFS.
   **No hiss sounds (the user finds them unpleasant, said twice: TowerClimb 2026-10-20, again 2026-10-23):** no
   noise-based "shhh" whooshes on cuts/captions, no `whoosh()`/`riser()`/`swept_noise` transitions, no hissy wind or
   steam beds. Use tonal or low sounds instead (soft pops, ticks, low thuds, hums, real-object sounds like hooves, bells,
   engines); a transition can simply be silent.
4. **One live counter**, top-right: label (24 px, tracking 3) at y=378, value (96 px, tabular digits) at x=910 y=440,
   sub-label (24 px) at y=502, vertical colour bar at x+22. Hot moments turn orange (#ffb07a), calm = white, twist = gold (#ffe08a).
5. **Captions** low and centred at y≈1330 (Shorts safe zone), 54 px Barlow Condensed 600, max 2 short lines, one idea each.
   Include real **safety advice** when the topic is a hazard.
6. **Shot list with cuts** (`SHOTS=[t0,t1,camFrom,camTo,lookFrom,lookTo]`), every shot 4-6 s, slow camera drift inside a shot.
7. **Twist** in the last ~10 s: a real, surprising fact or true story (white flash on the cut, counter switches to a date/place in gold).
8. **Ending (always)**: the hero drops in from above with a bounce, raises the **"MORE / WHAT IFs →" sign** over his head
   (canvas texture, cream board, brown frame), a **FOLLOW** pill pops at y=1330, a cursor taps it (scale 0.97) → "FOLLOWING".
   Under the pill: one-line takeaway (30 px) + "Simplified simulation · <what is illustrative>" (22 px). Last 0.6 s fades to black.
   Draw the sign texture only after the fonts load (redraw on the fonts promise), or it renders in a fallback font.
9. **Text outline (standard since 2026-10-25, the user chose it):** every HUD/caption/title text gets a thin dark outline
   drawn before the fill - `lineJoin='round'; lineWidth = size>=50 ? 4 : 3; strokeStyle='rgba(0,0,0,.55)'; strokeText(...)`,
   then the fill without shadow. Not on the FOLLOW pill text. White text on bright grass/sky looked washed out without it.
10. Motion: HUD/captions enter with ease-out cubic-bezier(.23,1,.32,1) ~220 ms from opacity 0 + 10 px offset, exits faster.

## Realism layer (approved 2026-10-19, the user picked it over the flat look)
Copy `hf/vendor`, `hf/tex` and the setup code from Realistic_3D_test/hf/index.html. People stay sharp-edged blocky and faceless;
only the world gets realistic. All assets are free/CC0 and render locally (no credits). Ingredients:
- **HDRI sky** (Poly Haven CC0, `tex/sky_4k.hdr`, RGBELoader FloatType) as `scene.background` + `scene.environment`
  (backgroundIntensity ~.85, environmentIntensity ~.6). The sun direction is read from the HDRI's brightest pixel; rotate
  `backgroundRotation`/`environmentRotation` (and the sun vector) so the main shot is front-lit. No low-poly clouds or gradient dome.
- **Sun** DirectionalLight ~2.6 with 4096 PCFSoft shadows + a **fill light** ~1.25 from the opposite side (keeps a backlit hero readable).
- **PBR ground**: Poly Haven texture set (diff/nor_gl/rough, 2k, repeat ~170) multiplied by per-zone vertex colours
  (set with `THREE.SRGBColorSpace`!). Wet sand via onBeforeCompile: darker (x.58) and shinier below the old waterline.
  Pick a texture that fits the place (sand, grass, rock, snow, asphalt).
- **Water**: three.js `Water` (planar reflection, waternormals.jpg) with the shoreline patch: depth from the seabed profile →
  turquoise shallows, see-through edge, lapping foam band. Hazards that are not water still use the HDRI + PBR ground.
- **MSAA 4x (standard since 2026-10-22)**: `antialias:true` on the renderer is ignored once the frame goes through the
  EffectComposer, so edges come out jagged and YouTube smears them. Always create the composer with its own multisampled target:
  `new EffectComposer(renderer,new THREE.WebGLRenderTarget(W,H,{type:THREE.HalfFloatType,samples:4}))`.
  Tested on TowerClimb: stair edges, cap and arms clearly smoother. (A 12 Mbps upload instead of 3 Mbps made no visible
  difference after YouTube-like recompression, so the upload settings stay as they are.)
- **Post chain**: RenderPass → GTAOPass (radius .7) → BokehPass DOF (focus = distance to the subject; aperture ~.00003 wide
  shots, ~.00009 close shots, maxblur .006) → UnrealBloom (.25, threshold 1.05) → OutputPass (ACES, exposure .9) →
  grade ShaderPass (saturation 1.2, contrast 1.06).
- **Handheld camera**: tiny layered-sine rotation after lookAt (~.003 rad), deterministic.
- Pitfalls: colours written as plain numbers into shaders/vertex colours must be converted sRGB→linear or the frame turns
  milky; don't show a physical `Sky` directly (too bright, washes the frame); keep `fog` far (260-1600) so the HDRI horizon matches.
- Cost on this laptop (Intel UHD, 8 GB): ~25 s of render per 1 s of video (65 s video ≈ 28 min). Blender/Cycles is out of reach here.

## Hook first (the user's top priority since 2026-10-18)
Before the storyboard, propose **4-5 hook options** for the first 3 seconds (title text + first shot + first SFX), each
with a one-line reason, mark your pick and wait for the user's choice. Checklist: stakes for "you"; surprise; one concrete
number or image; an open loop; motion and the title in frame 1 (no slow fade). The first shot should already show the
threat or the oddity (e.g. the sea pulling back), not a calm establishing shot.

## Story beats (adapt to the topic)
hook/normal life (0-4) → first sign (4-9) → people ignore it (9-13) → escalation 1-3 with a new number each (13-40) →
peak/impact (40-46) → aftermath (46-55) → twist (55-63) → ending sign + FOLLOW (63-67).

## Workflow
1. **Scenario** → `Scenario.txt` (scene list with times, counter values, captions) + **fact-check every number** (say which changed).
2. **Storyboard**: copy hf/ (fonts, configs, vendor/three, tex) from Realistic_3D_test, build the scene, render 15 key panels
   (`npx hyperframes@0.8.162 snapshot . -o ..\board --at 0.5,1.5,... --no-end --describe false`), compose with `make_board.py`
   (5x3 sheet + Uzbek notes), send the JPG, wait for approval/changes.
3. **Full video**: keep `storyboard_index.html`; replace the panel switcher with a continuous `render(t)` (keyframed water/
   positions, `gait()` walking/running cycles, shot list, HUD). Run `npx hyperframes@0.8.162 check .` (fix any page_error),
   then QC snapshots at ~15 times across the video and look at them.
4. **SFX**: `make_sfx.py` using `sfx_lib.py` (exec with DUR replaced) → hf/audio/mix.wav → ffmpeg loudnorm I=-15.
5. **Render** in the background: `npx hyperframes@0.8.162 render -o ..\<name>_master.mp4 --quiet`, then upload copy
   `-c:v libx264 -preset slow -b:v 3000k -maxrate 4500k -bufsize 6000k -c:a aac -b:a 160k -movflags +faststart` (~20-30 MB).
   ffmpeg lives in C:\Users\User\OneDrive\Desktop\Youtube_Projects\Earth_mechanics_6\tools\bin (prepend to PATH).
6. **Upload .txt** (`<name>.txt`): TITLE with emoji, DESCRIPTION (story + real facts + safety if relevant + "Simplified simulation..."),
   4 hashtags ending #Shorts, PINNED COMMENT question with 👇, FILES block. Keep the master.

## Ready-made assets
- **Shared open data** in `D:\Youtube_Projects\_assets` (README.txt there has usage + CREDIT lines): real elevation
  (AWS Terrain Tiles, height = R*256+G+B/256-32768; example Chimgan_relief_test) instead of invented ground; real city
  buildings/streets via osmnx (OpenStreetMap, credit required); Kenney CC0 glTF packs (cars, city, roads, nature) instead
  of hand-built props when realism matters; pmndrs/postprocessing; HYG stars; pedalboard (Python) for reverb/room on the SFX.
  The same Earth-side data is available here too (the user asked 2026-10-25 that 3D videos use everything the Earth skill
  got): Natural Earth GeoJSON + world-atlas/d3-geo for real map/globe shots inside a 3D film (e.g. "fires everywhere" on
  real continents), NASA Black Marble night lights, Our World in Data CSVs (CC BY) as number sources, and faster-whisper
  word timing if a video ever gets a voice. Prefer these over hand-made approximations; put every required credit line
  in the upload .txt.
- **White Chevrolet Cobalt** (the Uzbek everyday car, built from the user's reference photos 2026-10-23):
  `D:\Youtube_Projects\Roblox\Cobalt_model\hf\cobalt.js` → `makeCobalt(THREE,{color})`, faces +x, 1 unit = 1 m,
  `car.userData.spin(distance)` turns the wheels. No brand badge. Copy the file into the new project's hf/.

## Pitfalls already hit
- **Long renders crash Chrome** (NewYork150, 5 min 16:9, 2026-10-23: "Target closed" after 30-120 min, heavy wide city shots).
  For anything over ~90 s render with `$env:HF_SEGMENTED_CAPTURE='true'` and `--resume --protocol-timeout 900000`
  in a retry loop (finished 100 s segments are kept), and keep shadow map 2048 / Water texture 512 for big scenes.
  Real speed there: ~21 s of render per 1 s of 1080p video.
- **Silent render** (Avalanche): the `<audio id="mix" src="audio/mix.wav" ...>` tag was missing from index.html. Before rendering,
  grep for `<audio`; after rendering, `ffprobe -show_entries stream=codec_type` must list an audio stream and ebur128 ≈ -15 LUFS.
  If a finished video is silent, mux instead of re-rendering: `ffmpeg -i video.mp4 -i hf/audio/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest`.
- Camera inside a building / wall: check every shot's camera position against props; QC frames catch it.
- Three.js `visible=undefined` renders the object: always wrap in `!!(...)`.
- Distant objects fogging out: raise fog far or set `fog:false` on hero props.
- Avoid `Math.random()` in the composition (non-deterministic); use the seeded `rng()` or a hash.
- PowerShell: write files with UTF-8 (no BOM) via `[IO.File]::WriteAllText(...,(New-Object Text.UTF8Encoding $false))`;
  a BOM in sfx_lib.py needs `encoding='utf-8-sig'`.
- Don't show deaths: keep people safe on roofs/high ground; the hazard hits empty props.
