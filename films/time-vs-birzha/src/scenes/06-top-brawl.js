// 06 top-brawl: "Final round: the #1 spot" (global T 8.333 - 11.667, 2 bars, 200 frames)
// Opens on a white flash (transitionIn). Yellow sunburst, podium, a crown over the #1 step.
// Bar 1: Time and биржа tug-of-war on the crown; it flips to a new holder on every beat (0, 1, 2),
//   the holder's health bar flashes. Beat 3 (t = 1.25): they collide into a cartoon dust cloud brawl
//   (gloves, clock hands, candles, % signs, stars popping out), POW! / BAM! / WHAM! on each beat,
//   both health bars drop, Time's rim (0.15) blinks red.
// Bar 2 last beat (t = 2.917 .. 3.333): a green LiquidityScan scan beam sweeps DOWN; above it the frame
//   freezes and desaturates. The shot ends with the beam at the bottom.
// Layers, back to front (inside scene()):
//   1 sunburst + floaties   2 podium + floor   3 crown   4 fighters / dust cloud   5 impact FX
//   6 HUD: health bars, FINAL ROUND label      then the scan-beam freeze composite on top.
(function () {
  'use strict';
  const ID = 'top-brawl';
  const FILM = window.FILM;
  const F = FILM.fx;
  const CAST = FILM.cast;
  const C = F.pal;
  const E = F.E;
  const TAU = Math.PI * 2;
  const clamp = F.clamp, lerp = F.lerp, seg = F.seg;
  const BEAT = F.BEAT;
  const b = (n) => n * BEAT;

  const GROUND = 1520, POD_W = 280;
  const STEP1 = GROUND - 320; // top of #1
  const S = 0.9, R = 120 * S;
  const CS = 0.8; // crown scale during the tug
  const COLLIDE = b(3); // 1.25
  const BEAM0 = b(7); // 2.917
  const CLOUD = { x: 540, y: 1040, r: 280 };
  const WORDS = [['POW!', 300, 850, -0.2], ['BAM!', 790, 900, 0.16], ['WHAM!', 320, 1250, 0.12], ['POW!', 770, 1240, -0.14], ['BAM!', 540, 780, 0.05]];
  const HITS = [b(3), b(4), b(5), b(6), b(7)];

  // crown holder per beat in bar 1: -1 Time (left), +1 биржа (right)
  const HOLD = [-1, 1, -1];

  function holderSide(t) {
    // eased crown side: snaps toward the new holder on each beat with overshoot
    let side = HOLD[0];
    for (let i = 1; i < HOLD.length; i++) {
      const k = t < b(i) - 1e-6 ? 0 : E.outBack(clamp((t - b(i) + 1 / 60) / 0.16));
      side = lerp(side, HOLD[i], k);
    }
    return side;
  }
  const holderIdx = (t) => HOLD[Math.min(HOLD.length - 1, Math.max(0, Math.floor((t + 1e-6) / BEAT)))];

  // health: Time is already low, both drop on every brawl beat
  function health(t, who) {
    const start = who === 'time' ? 0.42 : 0.82;
    const per = who === 'time' ? 0.075 : 0.1;
    let v = start, g = start;
    HITS.forEach((h, i) => {
      if (i > 3) return;
      v -= per * E.outCubic(clamp((t - h) / 0.08));
      g -= per * E.inOutCubic(clamp((t - h - 0.18) / 0.3));
    });
    return { v, g };
  }

  // ---- things popping out of the brawl cloud (drawn pointing up = outward) ----
  const POPS = [
    (c) => CAST.glove(c, 0, -40, 0.75, -Math.PI / 2, C.timeGlove, C.timeGlove2),
    (c) => { F.candle(c, 0, -20, -110, -135, 5, 34, { up: true }); },
    (c) => F.text(c, '%', 0, -50, { size: 90, fill: C.bzRed }),
    (c) => CAST.glove(c, 0, -40, 0.75, -Math.PI / 2, C.bzGlove, C.bzGlove2),
    (c) => { c.strokeStyle = C.timeNavy; c.lineCap = 'round'; c.lineWidth = 14; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -110); c.stroke(); c.fillStyle = C.timeBlue; c.beginPath(); c.arc(0, 0, 12, 0, TAU); c.fill(); },
    (c) => { c.fillStyle = C.yellow; F.star(c, 0, -50, 40, 17, 5); c.fill(); },
    (c) => { F.candle(c, 0, -110, -20, -135, 5, 34, { up: false }); },
    (c) => F.text(c, '%', 0, -50, { size: 80, fill: C.timeBlue }),
  ];

  /** the red alarm blink on the empty part of Time's rim */
  function rimAlarm(ctx, x, y, s, ring, t, rot) {
    const on = Math.sin(t * TAU * 4) > 0;
    if (!on) return;
    const r = 120 * s;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.strokeStyle = 'rgba(255,59,92,0.9)';
    ctx.lineWidth = r * 0.17;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, -Math.PI / 2 + 0.05, -Math.PI / 2 + (1 - ring) * TAU - 0.05);
    ctx.stroke();
    ctx.restore();
  }

  function healthHUD(ctx, t) {
    const ht = health(t, 'time'), hb = health(t, 'bz');
    const fl = t < COLLIDE ? F.beatPulse(t, 0, 0.14) : 0;
    const who = t < COLLIDE ? holderIdx(t) : 0;
    const y = 250, h = 38, w = 380;
    // glow behind the holder's bar
    if (fl > 0.02 && who) {
      ctx.save();
      ctx.globalAlpha = fl;
      ctx.fillStyle = who < 0 ? C.timeCyan : C.bzYellow;
      F.rrect(ctx, (who < 0 ? 90 : 610) - 22, y - 22, w + 44, h + 44, 26); ctx.fill();
      ctx.restore();
    }
    const sl = who < 0 ? 1 + fl * 0.06 : 1, sr = who > 0 ? 1 + fl * 0.06 : 1;
    ctx.save(); ctx.translate(280, y + h / 2); ctx.scale(sl, sl); ctx.translate(-280, -(y + h / 2));
    F.healthBar(ctx, 90, y, w, h, ht.v, { color: C.timeBlue, color2: who < 0 && fl > 0.5 ? '#ffffff' : C.timeCyan, ghost: ht.g, label: 'TIME', labelColor: C.timeDeep });
    ctx.restore();
    ctx.save(); ctx.translate(800, y + h / 2); ctx.scale(sr, sr); ctx.translate(-800, -(y + h / 2));
    F.healthBar(ctx, 610, y, w, h, hb.v, { color: C.bzOrange, color2: who > 0 && fl > 0.5 ? '#ffffff' : C.bzYellow, ghost: hb.g, flip: true, label: 'БИРЖА', labelColor: C.bzDeep });
    ctx.restore();
    // FINAL ROUND pill
    const lp = F.popIn(t, 0, 0.5);
    ctx.save();
    ctx.translate(540, 420);
    ctx.rotate(-0.03 + Math.sin(t * 3) * 0.015);
    ctx.scale(lp, lp);
    F.dropShadow(ctx, (c) => F.label(c, 'FINAL ROUND', 0, 0, { size: 50, bg: C.ink, color: C.yellow }), { dy: 8, blur: 14 });
    ctx.restore();
  }

  function fighters(ctx, t) {
    const side = holderSide(t);
    const beatI = Math.min(2, Math.floor((t + 1e-6) / BEAT));
    const yankAge = t - b(beatI);
    // anticipation before the collision: crown slips away, they wind back, then dash
    const wind = seg(t, b(2) + 0.18, COLLIDE - 0.08, 'outCubic');
    const dash = seg(t, COLLIDE - 0.08, COLLIDE, 'inCubic');
    const crownX = 540 + side * 55;
    const crownY = STEP1 - 2 * R - 40 + Math.sin(t * 8) * 4;
    const spread = wind * 70 - dash * 200;
    const bob = (k) => Math.sin(t * 9 + k) * 3;
    // Time (left)
    const tLean = (side < 0 ? -0.16 : 0.12) * (1 - wind) - wind * 0.15 + dash * 0.35;
    const tx = 395 - spread + side * 25 * (1 - wind), ty = STEP1 - R + bob(0) + wind * 10;
    // биржа (right)
    const bLean = (side > 0 ? 0.16 : -0.12) * (1 - wind) + wind * 0.15 - dash * 0.35;
    const bx = 685 + spread + side * 25 * (1 - wind), by = STEP1 - R + bob(2) + wind * 10;
    const [tsx, tsy] = beatI >= 0 && HOLD[beatI] < 0 ? F.squash(t, b(beatI), 0.18, 0.35) : F.squash(t, b(beatI), -0.12, 0.35);
    const [bsx, bsy] = HOLD[beatI] > 0 ? F.squash(t, b(beatI), 0.18, 0.35) : F.squash(t, b(beatI), -0.12, 0.35);
    const ws = 1 + wind * 0.12, wy = 1 - wind * 0.12;
    const ds = 1 + dash * 0.3, dy = 1 - dash * 0.2;
    // gloves: on the crown during the tug, pulled back while winding
    const ex = 100 * CS + 18;
    const cg = [crownX - ex, crownY - 40 * CS], cgr = [crownX + ex, crownY - 40 * CS];
    const tG = { l: [lerp(cg[0] - 10, tx - R * 1.3, wind), lerp(cg[1] + 40, ty - R * 0.2, wind)], r: [lerp(cg[0], tx + R * 1.1, wind), lerp(cg[1] - 20, ty - R * 0.4, wind)] };
    const bG = { l: [lerp(cgr[0], bx - R * 1.1, wind), lerp(cgr[1] - 20, by - R * 0.4, wind)], r: [lerp(cgr[0] + 10, bx + R * 1.3, wind), lerp(cgr[1] + 40, by - R * 0.2, wind)] };
    // trails while dashing
    if (dash > 0) {
      F.speedLines(ctx, { angle: 0, count: 14, color: '#ffffff', alpha: 0.8 * dash, t, y: STEP1 - 260, h: 220, len: 260, width: 10 });
    }
    CAST.time(ctx, { x: tx, y: ty, s: S, t, sx: tsx * ws * ds, sy: tsy * wy * dy, rot: tLean, ring: 0.15, face: t > b(2) + 0.18 ? 'angry' : side < 0 ? 'determined' : 'angry', look: [1, -0.4], gloves: tG, shadow: STEP1 + 4 });
    rimAlarm(ctx, tx, ty, S * Math.min(tsx * ws, tsy * wy), 0.15, t, tLean);
    CAST.birzha(ctx, { x: bx, y: by, s: S, t, sx: bsx * ws * ds, sy: bsy * wy * dy, rot: bLean, face: side > 0 && wind === 0 ? 'smug' : 'angry', greedy: side > 0 && wind === 0, look: [-1, -0.4], gloves: bG, shadow: STEP1 + 4 });
    // the crown, gripped (tilts toward the holder) until it slips up and floats
    if (t <= b(2) + 0.18) {
      const tilt = side * 0.12 + Math.sin(yankAge * 30) * Math.exp(-yankAge * 8) * 0.18;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = F.radGrad(ctx, crownX, crownY - 40, 10, 170, [[0, 'rgba(255,255,255,0.95)'], [1, 'rgba(255,255,255,0)']]);
      ctx.fillRect(crownX - 180, crownY - 220, 360, 360);
      ctx.restore();
      F.crown(ctx, crownX, crownY, CS, { rot: tilt });
    }
    // yank effects
    for (let i = 1; i < 3; i++) {
      const sx = 540 + HOLD[i] * 120;
      F.puffs(ctx, sx, STEP1, t - b(i), { n: 5, size: 30, spread: 120, life: 0.4, seed: 20 + i });
      F.shockRing(ctx, crownX, crownY - 10, t - b(i), { r: 140, width: 10, life: 0.3 });
    }
    return { crownX, crownY, wind };
  }

  function floatingCrown(ctx, t, from) {
    // after the slip the crown pops up and floats over the brawl, sparkling
    const a = seg(t, b(2) + 0.18, b(2) + 0.6, 'outBack');
    const x = lerp(from[0], 540, a);
    const y = lerp(from[1], 690, a) + Math.sin(t * 4) * 10 * a;
    const rot = lerp(0, TAU, seg(t, b(2) + 0.18, b(2) + 0.6, 'outCubic')) + Math.sin(t * 3) * 0.08;
    ctx.save();
    ctx.globalAlpha = 0.6 * a;
    ctx.fillStyle = F.radGrad(ctx, x, y - 50, 10, 200, [[0, 'rgba(255,255,255,0.9)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillRect(x - 220, y - 270, 440, 440);
    ctx.restore();
    F.crown(ctx, x, y, CS + 0.1 * a, { rot });
    F.sparkles(ctx, { x: x - 160, y: y - 180, w: 320, h: 200, n: 6, t, seed: 61, size: 20 });
  }

  function brawl(ctx, t) {
    const age = t - COLLIDE;
    const g = 0.55 + 0.45 * F.popIn(t, COLLIDE, 0.3);
    // impact frame: a white starburst for the first few frames
    if (age < 0.1) F.burst(ctx, CLOUD.x, CLOUD.y, 520 * (1 - age * 3), 300 * (1 - age * 3), 14, '#ffffff', { seed: 77, rot: age * 3 });
    // the cloud throbs on every beat
    const thump = HITS.reduce((m, h) => Math.max(m, t >= h ? Math.exp(-(t - h) * 9) : 0), 0);
    const r = CLOUD.r * g * (1 + thump * 0.1);
    const cx = CLOUD.x + Math.sin(t * 7) * 16 + Math.sin(t * 17) * 6, cy = CLOUD.y - Math.abs(Math.sin(t * 9)) * 16;
    // action lines around the cloud
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const per = 0.3, u = ((t / per + F.h01(ID, 'al', i)) % 1 + 1) % 1, cyc = Math.floor(t / per + F.h01(ID, 'al', i));
      const ang = F.h01(ID, 'aa', i, cyc) * TAU;
      const d0 = r * (1.05 + u * 0.4), d1 = d0 + 60 + 50 * F.h01(ID, 'ad', i);
      ctx.globalAlpha = Math.sin(u * Math.PI) * g;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * d0, cy + Math.sin(ang) * d0 * 0.8);
      ctx.lineTo(cx + Math.cos(ang) * d1, cy + Math.sin(ang) * d1 * 0.8);
      ctx.stroke();
    }
    ctx.restore();
    // a darker rim layer so the cloud reads on the light background
    F.dustCloud(ctx, cx, cy + 8, r * 1.08, t + 0.4, { seed: 67, shade: '#e3c995', color: '#f0dcb4' });
    F.dustCloud(ctx, cx, cy, r, t, { seed: 66, pops: POPS, shade: '#f6e9cc', color: '#fffdf6' });
    // limbs punching out of the cloud on 8ths: alternating Time / биржа gloves and Time's clock hands
    for (let i = 0; i < 8; i++) {
      const t0 = COLLIDE + i * BEAT / 2 + 0.05;
      const u = (t - t0) / 0.22;
      if (u <= 0 || u >= 1) continue;
      const ang = -Math.PI * 0.95 + F.h01(ID, 'pa', i) * Math.PI * 1.6 + (i % 2 ? 0.4 : 0);
      const reach = Math.sin(u * Math.PI);
      const d0 = r * 0.6, d = r * (0.75 + reach * 0.45);
      const px = cx + Math.cos(ang) * d, py = cy + Math.sin(ang) * d * 0.85;
      const bx0 = cx + Math.cos(ang) * d0, by0 = cy + Math.sin(ang) * d0 * 0.85;
      ctx.save();
      ctx.strokeStyle = C.ink; ctx.lineCap = 'round'; ctx.lineWidth = 11;
      ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(px, py); ctx.stroke();
      ctx.restore();
      const time = i % 2 === 0;
      CAST.glove(ctx, px, py, 0.85, Math.atan2(py - by0, px - bx0), time ? C.timeGlove : C.bzGlove, time ? C.timeGlove2 : C.bzGlove2);
    }
    // heads poking out of the rim on alternating beats
    const peeks = [[b(3) + 0.12, 'time', -2.5], [b(4) + 0.12, 'bz', -0.55], [b(5) + 0.12, 'time', -2.9], [b(6) + 0.12, 'bz', -0.3]];
    peeks.forEach(([t0, who, ang]) => {
      const u = (t - t0) / 0.3;
      if (u <= 0 || u >= 1) return;
      const k = E.outBack(clamp(u * 2.4)) * (u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1);
      const d = r * (0.62 + 0.38 * k);
      const x = cx + Math.cos(ang) * d, y = cy + Math.sin(ang) * d * 0.85;
      const rot = (ang + Math.PI / 2) * 0.5;
      ctx.save();
      ctx.translate(x, y); ctx.scale(Math.max(0.01, k), Math.max(0.01, k)); ctx.translate(-x, -y);
      if (who === 'time') {
        CAST.time(ctx, { x, y, s: 0.75, t, rot, ring: 0.15, face: 'hurt', spin: t * 30 });
        rimAlarm(ctx, x, y, 0.75, 0.15, t, rot);
        F.dizzyStars(ctx, x, y - 100, t, { r: 70 });
      } else CAST.birzha(ctx, { x, y, s: 0.75, t, rot, face: 'angry', jaw: 0.6 });
      ctx.restore();
    });
    // eyes blinking inside the cloud
    const eyeOn = Math.sin(t * 11) > -0.3;
    if (eyeOn && g > 0.9) {
      [[cx - 90, cy - 20, C.timeBlue], [cx + 90, cy + 30, C.bzOrange]].forEach(([ex, ey, col]) => {
        ctx.fillStyle = '#ffffff';
        F.ellipse(ctx, ex - 18, ey, 14, 19); ctx.fill();
        F.ellipse(ctx, ex + 18, ey, 14, 19); ctx.fill();
        ctx.fillStyle = col;
        F.ellipse(ctx, ex - 16, ey + 3, 8, 12); ctx.fill();
        F.ellipse(ctx, ex + 20, ey + 3, 8, 12); ctx.fill();
      });
    }
    F.puffs(ctx, CLOUD.x, STEP1, age, { n: 8, size: 60, spread: 360, life: 0.6, seed: 9, color: '#fff7e0' });
    F.shockRing(ctx, CLOUD.x, CLOUD.y, age, { r: 520, width: 30, life: 0.5 });
    F.confettiBurst(ctx, CLOUD.x, CLOUD.y - 100, age, { n: 30, power: 1400, life: 1.2, seed: 33 });
  }

  // one complete frame of the scene at local time tt
  function scene(ctx, tt, live) {
    const W = FILM.W, H = FILM.H;
    const sk = live ? F.shakeMany(tt, HITS.slice(0, 4).map((h, i) => [h, 0.32, i === 0 ? 30 : 20]).concat([[0, 0.25, 18], [b(1), 0.15, 8], [b(2), 0.15, 8]]), 61) : [0, 0];
    ctx.save();
    ctx.translate(sk[0], sk[1]);
    // 1 background
    F.sunburst(ctx, 540, 700, { rays: 22, colorA: C.lemon, colorB: '#ffe58a', rot: tt * 0.25 });
    ctx.save();
    ctx.fillStyle = F.radGrad(ctx, 540, 760, 50, 900, [[0, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillRect(-200, -200, W + 400, H + 400);
    ctx.restore();
    F.floaties(ctx, { n: 16, seed: 606, t: tt, alpha: 0.7, size: 30 });
    // spotlight cone onto the #1 step
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.08 * Math.sin(tt * 5);
    ctx.fillStyle = F.linGrad(ctx, 0, 480, 0, STEP1, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0.85)']]);
    ctx.beginPath(); ctx.moveTo(470, 480); ctx.lineTo(610, 480); ctx.lineTo(820, STEP1 + 30); ctx.lineTo(260, STEP1 + 30); ctx.closePath(); ctx.fill();
    ctx.restore();
    // 2 floor + podium
    ctx.fillStyle = '#ffb36b';
    ctx.fillRect(-200, GROUND - 6, W + 400, H - GROUND + 260);
    ctx.fillStyle = '#ff9f55';
    ctx.fillRect(-200, GROUND - 6, W + 400, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 4; i++) ctx.fillRect(-200, GROUND + 70 + i * i * 40 + i * 50, W + 400, 6 + i * 3);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    F.ellipse(ctx, 540, GROUND + 40, 420, 34); ctx.fill();
    const bump = (k) => (tt >= COLLIDE ? F.squash(tt, HITS[k] || 99, 0.04, 0.3)[1] : 1);
    ctx.save();
    ctx.translate(540, GROUND); ctx.scale(1, bump(0) * bump(1) * bump(2) * bump(3)); ctx.translate(-540, -GROUND);
    F.podium(ctx, 540, GROUND, { w: POD_W, colors: [C.purple, C.timeBlue, C.pink] });
    ctx.restore();
    // 3/4 fighters, crown, brawl
    let from = [540, STEP1 - 200];
    if (tt < COLLIDE) {
      const f = fighters(ctx, tt);
      from = [f.crownX, f.crownY];
    } else {
      brawl(ctx, tt);
    }
    if (tt > b(2) + 0.18) floatingCrown(ctx, tt, [540 - 55, STEP1 - 2 * R - 40]);
    // 5 impact words
    HITS.forEach((h, i) => {
      const [w, x, y, rot] = WORDS[i];
      F.impactStar(ctx, x, y, tt, h, { word: w, size: 150, life: 0.4, rot, color: i % 2 ? C.timeCyan : C.yellow, seed: 3 + i });
    });
    // tug-of-war "yank" stars
    for (let i = 1; i < 3; i++) F.impactStar(ctx, 540 + HOLD[i] * 200, STEP1 - 330, tt, b(i), { size: 70, life: 0.25, color: '#ffffff', seed: 40 + i });
    // 6 HUD
    healthHUD(ctx, tt);
    ctx.restore();
  }

  function draw(ctx, tIn, info) {
    const t = Math.min(Math.max(tIn, 0), info.dur);
    const W = FILM.W, H = FILM.H;
    if (t < BEAM0) { scene(ctx, t, true); return; }
    const u = E.inOutSine(clamp((t - BEAM0) / (info.dur - BEAM0 - 1 / 60)));
    const by = lerp(-20, H + 10, u);
    // live part below the beam
    ctx.save();
    ctx.beginPath(); ctx.rect(-200, by, W + 400, H + 400); ctx.clip();
    scene(ctx, t, true);
    ctx.restore();
    // frozen, desaturated part above the beam
    if (by > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(-200, -200, W + 400, by + 200); ctx.clip();
      scene(ctx, BEAM0, false);
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = '#808080';
      ctx.fillRect(-200, -200, W + 400, by + 200);
      ctx.globalCompositeOperation = 'source-over';
      // teal tint + scan grid
      ctx.fillStyle = 'rgba(19,48,62,0.18)';
      ctx.fillRect(-200, -200, W + 400, by + 200);
      ctx.fillStyle = 'rgba(31,227,60,0.10)';
      for (let y = by - 8; y > -10; y -= 16) ctx.fillRect(0, y, W, 3);
      ctx.strokeStyle = 'rgba(31,227,60,0.14)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 60; x < W; x += 120) { ctx.moveTo(x, 0); ctx.lineTo(x, by); }
      ctx.stroke();
      ctx.restore();
    }
    // the beam
    ctx.save();
    ctx.fillStyle = F.linGrad(ctx, 0, by - 260, 0, by, [[0, 'rgba(31,227,60,0)'], [1, 'rgba(31,227,60,0.45)']]);
    ctx.fillRect(-200, by - 260, W + 400, 260);
    ctx.fillStyle = F.linGrad(ctx, 0, by, 0, by + 90, [[0, 'rgba(31,227,60,0.55)'], [1, 'rgba(31,227,60,0)']]);
    ctx.fillRect(-200, by, W + 400, 90);
    ctx.fillStyle = C.lsGreen;
    ctx.fillRect(-200, by - 12, W + 400, 24);
    ctx.fillStyle = '#eaffee';
    ctx.fillRect(-200, by - 4, W + 400, 8);
    for (let i = 0; i < 14; i++) {
      const x = ((F.h01(ID, 'bx', i) * W + t * (300 + i * 40)) % W);
      F.sparkle(ctx, x, by + (F.h01(ID, 'by', i) - 0.5) * 30, 14 + 10 * Math.sin(t * 20 + i), { color: i % 2 ? '#ffffff' : C.lsGreen2 });
    }
    // end caps / edge brackets
    ctx.fillStyle = C.lsGreen;
    [[24, 1], [W - 24, -1]].forEach(([x, d]) => { F.rrect(ctx, x - 10, by - 40, 20, 80, 10); ctx.fill(); });
    ctx.restore();
  }

  FILM.scene({ id: ID, draw });
})();
