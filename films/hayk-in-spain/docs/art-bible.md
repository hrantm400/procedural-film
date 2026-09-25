# Art bible: "Hayk: The Burger Quest"

A 120-second vertical (1080x1920, 24 fps, 120 bpm) comedy anime short, drawn entirely in canvas JavaScript.
Story: Hayk, a trader who built LiquidityScan, flies from Yerevan to Spain for a month "to find investors" and instead eats his way through fast food. Back home his dog Goofy, left with his friend Grant, turns into a barking demon and finally howls "I MISS HAYK!". Hayk flies home. Reunion.

The tone is **loud, fast, funny anime**: exaggerated faces, speed lines, impact frames, huge onomatopoeia, sparkles, screen shake, parody of food-anime and battle-anime tropes. It must never feel static or empty.

## 1. The look: clean cel animation

- Flat colour fills, one shadow tone, bold dark outlines (`FILM.fx.pal.line` = `#1b1424`).
- Outline widths at the character's scale: characters 6 px (cast.js does this), props 4-6 px, background architecture 4-5 px, far background 0-3 px (or none, flat shapes).
- Backgrounds are **simpler and softer than the characters** (less saturated, fewer outlines, or flat shapes) so the characters pop. Background still needs real detail: buildings with windows, balconies, signs, trees, furniture, clouds, city lights. Several depth layers with parallax when the camera moves.
- Lighting moods via full-frame gradients (`FILM.fx.sky`) and a few overlay washes (`ctx.globalAlpha` + fill). Rim light or glow with radial gradients, used sparingly.
- No paper grain: every shot has `post: false`.
- Anime extras, used generously: `focusLines` (concentration lines), `speedLines`, `impact` (black/white impact frame, 2-4 frames long), `sunburst` rays, `sparkles`, `sweat`, `vein`, `aura`, `menace` (ゴゴゴ), `gloom`, `halftone`, `bokeh`, `hearts`, `shockRing`, `dust`, `crumbs`, `tearStream`, `flash`.

## 2. Palette

Everything shared lives in `FILM.fx.pal` (src/props.js). Use those names. Scene-specific background colours may be literals in the scene file (the gate only warns).
Key moods:
- Yerevan night: `nightTop` -> `nightBottom`, Ararat `ararat`/`araratSnow`, city lights warm yellow.
- Spain day: `spainSky`, sandstone `sand`/`sandShade`, terracotta roofs `#d9653b`, white walls `#fff4e0`, palm greens.
- Food heaven: golds `gold`, `goldShade`, `fireCore`, purples `#3b1d6e`, `#7a3cff`.
- Yerevan park day: pastel greens `grass`, `tree`, sky `daySky` -> `daySkyLow`, pink stone of the Cascade `#e8b8a0`.
- Goofy demon mode: near-black purple `#1a0b24`, red `demonRed`, orange `demonGlow`.

## 3. Characters: ONLY through `FILM.cast`

Read the header comment of `src/cast.js`. Never draw Hayk, Grant or Goofy yourself.
- Sizes: a full-body hero in a wide shot is 500-900 px tall (`s` 0.9-1.6 for humans; Goofy `s` 1.0-2.2). Close-ups go bigger (s 2.5-4, cropped by the frame) — that is fine and encouraged.
- Hayk's `belly`: 0 until the KFG shot, 0.15 at KFG, 0.25 at McDonut's, 0.35 in nirvana, 0.4 -> 0.8 during day-counter, 0.8 afterwards.
- Hayk wears `shades: true` on arrival in Spain and whenever he is being cool. `crown: true` at Burger Kong and after.
- Animate: pass `t` so walk/run cycles and blinks run. Characters must move: bob, lean, squash on hits (scale y 0.92 / x 1.06 for 2 frames), hop on beats.
- Anchors: `const a = FILM.cast.hayk(ctx, {...})` returns `{ head, top, mouth, eyeL, eyeR, handL, handR, chest, hip }` (Goofy also `collar`, `nose`, `tail`). Hang bubbles, leashes, sweat drops, sparkles off them.
- Held items: `hold: 'burger' | 'bigBurger' | 'drumstick' | 'fries' | 'phone' | 'drink'` (+ `bite` 0..1). Or draw props from `FILM.fx` at the hand anchor.
- The leash: `FILM.fx.leash(ctx, goofyAnchors.collar, grantAnchors.handR, { sag, taut })`.
- Silhouette mode (`silhouette: '#000'`) for impact frames and dramatic backlight.
- For human tears use `FILM.cast.tears(ctx, anchors, t, s)` after drawing a `cry` face.

## 4. Text

- **All text is English.** Katakana only as decoration (ゴゴゴ, ドン, バーガー).
- Use `FILM.fx.bubble` (speech/shout/think), `FILM.fx.caption` (slanted subtitle bar), `FILM.fx.sfx` (onomatopoeia), `FILM.fx.introCard`, `FILM.fx.stamp`, `FILM.fx.tag`, `FILM.fx.text` for titles.
- Dialogue lines are the exact strings from the shot brief.
- Size: speech 44-60 px, shouts 60-90 px, SFX 110-220 px, titles up to 200 px.
- A line must stay on screen long enough to read: at least 1.5 s for a short line, 2 s for long ones (unless the shot ends).
- **Safe area** (enforced by the gate on rendered frames): all must-read text inside x 60..1020 and y 220..1540. Keep bubbles centred between x 200 and 880 so their edges stay inside. Nothing important below y 1540 (phone UI covers it). The bottom 380 px can hold ground, feet, background.

## 5. Composition and motion

- Frame 0 of every shot is a complete, attractive picture (no empty frames waiting for things to pop in). The last frame holds.
- At least three things move at any moment (character, background element, effect).
- Camera: use `ctx.translate/scale` for push-ins, pans and `FILM.fx.shake` on every impact. Keep the camera transform balanced with save/restore; screen-fixed overlays (captions, bubbles over shake) come last.
- Every beat is 0.5 s (12 frames). Put hits (impacts, bites, barks, pops) exactly on the times the brief gives. Use `FILM.fx.popIn(t, t0)` so a pop is visible ON the beat frame.
- Animate on twos (`L.onTwos(t)`) for character motion if it looks better; effects may run on ones.
- Comedy timing: a held reaction face for 0.5-1 s after a gag reads better than constant motion.

## 6. Engineering rules (the gate enforces most of these)

- Draw only from `(t, info)`. No state between frames. Randomness only from `FILM.lib.hash / rng` or `FILM.fx.h01(...)` with fixed seeds.
- No `Math.random`, `Date`, `performance.now`.
- Clamp `t = Math.min(Math.max(tIn, 0), info.dur)` first.
- Frame cost: keep every frame under ~120 ms at full scale. Avoid per-pixel loops, `shadowBlur` over large areas, and thousands of path operations per frame. Pre-render expensive static backgrounds once: `const bg = FILM.lib.cached('shotid-bg', () => { const c = FILM.makeCanvas(1080, 1920); const g = c.getContext('2d'); /* draw */ return c; });` then `ctx.drawImage(bg, 0, 0)`. The key must be unique to your shot, and the result must depend on nothing but constants. Only do this if the frame is actually slow.
- Balanced `ctx.save()/restore()`.
- Do not edit any shared file (props.js, cast.js, lib.js, core.js, timeline.js, music.js). If you need a helper, define it inside your own scene file. If a shared helper is broken, work around it locally and report it.
