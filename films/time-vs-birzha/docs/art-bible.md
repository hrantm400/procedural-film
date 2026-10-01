# Art bible: "Time vs биржа" (15 s ad for LiquidityScan)

Vertical 1080x1920, **60 fps**, 144 bpm (beat = 0.4167 s = 25 frames, bar = 1.6667 s = 100 frames). Every pixel is canvas JavaScript.

## Story
The trader's **Time** (a clock logo) and **биржа**, the exchange (an orange candle-chart logo), fight for the top spot through phone and trading UI. The exchange keeps eating the trader's time: the blue rim of the clock is "time left". LiquidityScan arrives, finds the entry in a second, gives Time its time back and takes #1. The brand line, from the real site: "Stop babysitting the charts." End on liquidityscan.io.

## Look: playful flat motion graphics
- Flat shapes, NO black outlines on UI or backgrounds, rounded everything, soft drop shadows (FILM.fx.card / dropShadow).
- Bright, clean palette: light backgrounds (`lsBg #eef3f7`, lilac, mint, lemon, peach), dark trading screens (`night`, the LiquidityScan teal card `lsTealA -> lsTealB`). Time = blues, биржа = orange/red/yellow, LiquidityScan = neon green `#1fe33c` + teal + ink `#13283a`.
- Motion is the point: springy easing (FILM.fx.spring / pop / popIn / E.outBack), anticipation before every big move, squash and stretch on every landing and hit (FILM.fx.squash), overshoot and settle, motion trails on fast moves, camera shake on impacts (FILM.fx.shake). Something is always moving: idle bob (2-4 px sine) on logos, floaties drifting, UI micro-animations.
- Hits land exactly on beats. Use local times t = 0.4167 * n.
- Smooth on ones (60 fps). Do not step animation on twos.
- Background depth: floaties, dot grid, stripes, sunbursts. Keep backgrounds calmer than the characters.
- Transitions are part of the gag: exits and entries as specified in the timeline briefs (exit top -> enter top, exit right -> enter left, whip pans, match cuts). Respect those handoff positions exactly.
- Reference screenshots of the real LiquidityScan app/site are in docs/brand/ (look at them before drawing any LiquidityScan UI): light #eef3f7 background, white rounded cards, dark teal gradient hero cards, neon green active pill, spaced uppercase mono labels like "LIVE ENGINE NETWORK", radar scan icon.

## Characters: ONLY through FILM.cast (src/cast.js header lists every option)
- `time`: clock badge. `ring` = time left (1 full .. 0 empty). Faces, gloves (rubber-hose arms + boxing gloves at world positions you choose), `spin` for frantic hands.
- `birzha`: orange squircle, the dark chart panel with three candles is its mouth; `jaw` opens it (chomp!), `greedy` puts $ in its eyes.
- `lsMark` (the real app mark L|||S), `lsWordmark` ("LiquidityScan" or the "Liqui|||Scan" header style), `wordmark('time'|'birzha')`.
- Sizes: fighters are s 0.6-1.4 in wide shots (R = 120*s); close-ups up to s 3.

## Text
- English, except the name биржа (Cyrillic, lowercase, as the user wrote it; in the health bar it may be uppercase БИРЖА).
- FILM.fx.text (chunky, centred), popLetters (kinetic), label (pills), typeOn. Mono font ('mono') for numbers/data like the app.
- Few words, big. Any must-read text inside x 80..1000, y 220..1540, and not in the right strip x > 920 below y 1100. The gate checks the bottom limit on rendered frames.
- A line must be readable: on screen at least ~0.8 s.

## Engineering
- Draw only from (t, info); no state between frames; randomness only through FILM.fx.h01 / FILM.lib.hash. No Math.random / Date / performance.now.
- Clamp t first: `t = Math.min(Math.max(tIn, 0), info.dur)`.
- Frame budget: < 60 ms per frame at full scale (60 fps means 900 frames). Avoid shadowBlur on big shapes and per-pixel loops; FILM.fx.dropShadow is fine on cards and characters.
- Never edit shared files (props.js, cast.js, lib.js, core.js, timeline.js, music.js, tools). Helpers you need go inside your scene file. Report broken shared helpers.
