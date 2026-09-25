// Shot 26 'the-end' : The end. Global T 114..120 (6 s).
// Final group shot in front of Ararat at sunset. Hayk (hug-hold pose, belly 0.8, happy, crown)
// holds Goofy (happy) who munches a burger; Grant (exhausted, bandaged arm) gives a thumbs up.
// 1.0 s: stats card slides in; lines on the beats 1.5 / 2.0 / 2.5 / 3.0, each with a tick.
// 3.5 s: "THE END?" slams in, big gold, with the small LIQUIDITYSCAN logo under it.
// 5.5..6.0: everything holds (poster still).
//
// Layers (back to front):
//   1 cached background: sunset sky, sun, clouds, Ararat, Yerevan skyline, park terrace
//   2 animated sky: sun glow pulse, birds, city light twinkle, rays (after 3.5)
//   3 cast: Grant (right), Hayk holding Goofy (left), burger + crumbs, bandages
//   4 foreground: bushes, petals/confetti
//   5 screen-fixed: stats card, THE END? title + logo, flash, sparkles
(function () {
  'use strict';
  const ID = 'the-end';
  const FILM = window.FILM;
  const LIB = FILM.lib;
  const F = FILM.fx;
  const C = F.pal;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const W = 1080, H = 1920;
  const h01 = (...k) => F.h01(ID, ...k);

  // beats (local t; global = 114 + t)
  const T_CARD = 1.0; //   T 115.0 stats card slides in
  const T_LINES = [1.5, 2.0, 2.5, 3.0]; // T 115.5 .. 117.0 one line per beat
  const T_END = 3.5; //    T 117.5 THE END? stinger
  const T_HOLD = 5.5; //   T 119.5 freeze
  const CHOMPS = [0.5, 1.5, 2.5, 3.5, 4.5];

  const GROUND = 1740;
  const HORIZON = 1230;
  const LINES = [
    ['INVESTORS FOUND:', '0'],
    ['BURGERS EATEN:', '147'],
    ['KILOS GAINED:', '9'],
    ['GOOFY:', 'HAPPY'],
  ];

  // ---------------------------------------------------------------------------
  // 1. static background
  // ---------------------------------------------------------------------------
  // background padded by PAD px on every side (scaled up once) so it can be drawn unscaled with an
  // integer shake offset: a scaled full-frame drawImage costs ~50 ms in the software rasteriser.
  const PAD = 24;
  function buildPaddedBg() {
    const inner = buildBg();
    const c = FILM.makeCanvas(W + PAD * 2, H + PAD * 2);
    c.getContext('2d').drawImage(inner, 0, 0, W + PAD * 2, H + PAD * 2);
    return c;
  }
  function buildBg() {
    const c = FILM.makeCanvas(W, H);
    const g = c.getContext('2d');
    F.sky(g, '#3b1d6e', '#ffc978', { h: HORIZON + 20, mid: '#ff6f7d', midAt: 0.5 });
    // warm band near the horizon
    const hb = g.createLinearGradient(0, 700, 0, HORIZON);
    hb.addColorStop(0, 'rgba(255,170,90,0)');
    hb.addColorStop(1, 'rgba(255,214,120,0.8)');
    g.fillStyle = hb; g.fillRect(0, 700, W, HORIZON - 700);
    // a few stars in the purple top
    g.fillStyle = '#ffe9f4';
    for (let k = 0; k < 40; k++) {
      g.globalAlpha = 0.35 + 0.65 * h01('sa', k);
      g.beginPath(); g.arc(h01('sx', k) * W, h01('sy', k) * 380, 1 + h01('sr', k) * 2.6, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    // sun: big disc sinking behind the Greater Ararat's right shoulder
    const sg = g.createRadialGradient(780, 700, 30, 780, 700, 600);
    sg.addColorStop(0, 'rgba(255,250,220,1)');
    sg.addColorStop(0.25, 'rgba(255,220,140,0.85)');
    sg.addColorStop(1, 'rgba(255,140,110,0)');
    g.fillStyle = sg; g.fillRect(0, 100, W, 1200);
    g.fillStyle = '#fff3c4';
    g.beginPath(); g.arc(780, 700, 140, 0, TAU); g.fill();
    // sun stripes (retro sunset cut lines)
    g.fillStyle = '#ffb36b';
    [700, 735, 765, 790].forEach((y, i) => { g.fillRect(630, y, 300, 5 + i * 3); });
    // clouds, lit from below
    g.save();
    [[-60, 470, 380, '#ff9fb0'], [640, 420, 460, '#ffa7a0'], [200, 700, 300, '#ffb49a'], [820, 640, 260, '#ffc08e']].forEach(([x, y, w, col]) => {
      F.cloud(g, x, y, w, col, 'rgba(160,60,120,0.35)');
    });
    g.restore();
    // Ararat, large, dusk colours
    F.ararat(g, -140, HORIZON + 10, 1320, 800, { color: '#7a5fa8', shade: '#5d4690', snow: '#ffd9e0' });
    // sunset rim on the snow
    g.save();
    g.globalAlpha = 0.5;
    g.fillStyle = '#ffb08a';
    g.beginPath(); g.moveTo(-140 + 1320 * 0.4, HORIZON + 10 - 800); g.lineTo(-140 + 1320 * 0.46, HORIZON + 10 - 800 * 0.94); g.lineTo(-140 + 1320 * 0.44, HORIZON + 10 - 800 * 0.86); g.closePath(); g.fill();
    g.restore();
    // haze at the base
    const hz = g.createLinearGradient(0, HORIZON - 260, 0, HORIZON + 20);
    hz.addColorStop(0, 'rgba(255,170,150,0)');
    hz.addColorStop(1, 'rgba(255,170,150,0.7)');
    g.fillStyle = hz; g.fillRect(0, HORIZON - 260, W, 280);
    // Yerevan skyline silhouette
    g.fillStyle = '#4a2f6e';
    g.beginPath(); g.moveTo(0, HORIZON + 80);
    let x = 0;
    let i = 0;
    while (x < W) {
      const bw = 40 + h01('bw', i) * 70, bh = 50 + h01('bh', i) * 130;
      g.lineTo(x, HORIZON + 60 - bh); g.lineTo(x + bw, HORIZON + 60 - bh);
      x += bw; i++;
    }
    g.lineTo(W, HORIZON + 200); g.lineTo(0, HORIZON + 200); g.closePath(); g.fill();
    // TV tower (Yerevan) + cascade steps hint
    g.strokeStyle = '#4a2f6e'; g.lineWidth = 8;
    g.beginPath(); g.moveTo(930, HORIZON - 30); g.lineTo(950, HORIZON - 300); g.lineTo(970, HORIZON - 30); g.stroke();
    g.lineWidth = 4;
    for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(935 + k * 2.5, HORIZON - 60 - k * 40); g.lineTo(965 - k * 2.5, HORIZON - 60 - k * 40); g.stroke(); }
    g.fillStyle = '#ff4060'; g.beginPath(); g.arc(950, HORIZON - 304, 6, 0, TAU); g.fill();
    // nearer row of buildings, darker
    g.fillStyle = '#3a2258';
    g.beginPath(); g.moveTo(0, HORIZON + 140);
    x = 0; i = 0;
    while (x < W) {
      const bw = 70 + h01('nw', i) * 90, bh = 30 + h01('nh', i) * 90;
      g.lineTo(x, HORIZON + 130 - bh); g.lineTo(x + bw, HORIZON + 130 - bh);
      x += bw; i++;
    }
    g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    // park terrace: stone balustrade + lawn
    g.fillStyle = '#e8b8a0';
    g.fillRect(0, HORIZON + 150, W, 60);
    g.fillStyle = '#d49a86';
    g.fillRect(0, HORIZON + 196, W, 14);
    g.strokeStyle = C.line; g.lineWidth = 4;
    g.beginPath(); g.moveTo(0, HORIZON + 150); g.lineTo(W, HORIZON + 150); g.moveTo(0, HORIZON + 210); g.lineTo(W, HORIZON + 210); g.stroke();
    for (let k = 0; k < 18; k++) {
      const bx = 20 + k * 62;
      g.fillStyle = '#f0c8b0';
      g.beginPath(); g.ellipse(bx, HORIZON + 180, 12, 24, 0, 0, TAU); g.fill();
      g.lineWidth = 3; g.stroke();
    }
    const lawn = g.createLinearGradient(0, HORIZON + 210, 0, H);
    lawn.addColorStop(0, '#7c9e4e');
    lawn.addColorStop(1, '#5a8a3c');
    g.fillStyle = lawn; g.fillRect(0, HORIZON + 210, W, H);
    // warm sunset wash on the lawn
    g.fillStyle = 'rgba(255,150,90,0.18)'; g.fillRect(0, HORIZON + 210, W, H);
    // grass tufts
    g.strokeStyle = '#46742f'; g.lineCap = 'round';
    for (let k = 0; k < 90; k++) {
      const v = h01('gy', k);
      const gy = HORIZON + 240 + v * (H - HORIZON - 240), gx = h01('gx', k) * W, hh = 10 + v * 26;
      g.lineWidth = 2 + v * 2;
      g.beginPath(); g.moveTo(gx - hh * 0.3, gy - hh); g.lineTo(gx, gy); g.lineTo(gx + hh * 0.3, gy - hh); g.stroke();
    }
    return c;
  }

  // ---------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------
  // wedge rays without a background fill (cheaper than a full-frame sunburst)
  function rays(ctx, cx, cy, n, r, rot, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a0 = rot + (i / n) * TAU, a1 = a0 + (TAU / n) * 0.5;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
      ctx.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
      ctx.closePath();
    }
    ctx.fill();
  }

  function birds(ctx, t) {
    ctx.save();
    ctx.strokeStyle = '#3b1d4e'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const x = ((h01('bx', i) * 1300 + t * (40 + i * 6)) % 1300) - 100;
      const y = 560 + h01('by', i) * 260 + Math.sin(t * 2 + i) * 8;
      const f = Math.sin(t * 10 + i * 2) * 8, r = 12 + h01('br', i) * 8;
      ctx.beginPath();
      ctx.moveTo(x - r, y - f); ctx.quadraticCurveTo(x - r * 0.4, y - r * 0.5, x, y);
      ctx.quadraticCurveTo(x + r * 0.4, y - r * 0.5, x + r, y - f);
      ctx.stroke();
    }
    ctx.restore();
  }

  function cityLights(ctx, t) {
    const b = Math.floor(t * 6);
    ctx.save();
    for (let i = 0; i < 70; i++) {
      const x = h01('lx', i) * W, y = HORIZON + 10 + h01('ly', i) * 100;
      ctx.globalAlpha = 0.45 + 0.55 * h01('lt', i, b);
      ctx.fillStyle = i % 4 ? '#ffd86a' : '#fff3c0';
      ctx.fillRect(x, y, 6, 8);
    }
    ctx.restore();
  }

  function bandage(ctx, p, ang, w, h) {
    ctx.save();
    ctx.translate(p[0], p[1]);
    ctx.rotate(ang);
    F.rrect(ctx, -w / 2, -h / 2, w, h, 4);
    F.fo(ctx, '#fbf6ea', 4);
    ctx.strokeStyle = 'rgba(180,160,130,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 1; k < 4; k++) { ctx.moveTo(-w / 2 + (w * k) / 4, -h / 2 + 3); ctx.lineTo(-w / 2 + (w * k) / 4 - 4, h / 2 - 3); }
    ctx.stroke();
    ctx.restore();
  }

  function plaster(ctx, x, y, s, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    [0.7, -0.7].forEach((a) => {
      ctx.save(); ctx.rotate(a);
      F.rrect(ctx, -22 * s, -7 * s, 44 * s, 14 * s, 6 * s);
      F.fo(ctx, '#f2c9a0', 3);
      ctx.restore();
    });
    ctx.restore();
  }

  function confetti(ctx, t, age) {
    if (age < 0) return;
    const cols = [C.gold, '#ff4f86', '#35e08a', '#27c4f5', '#ffffff', '#ff7a1a'];
    ctx.save();
    for (let i = 0; i < 46; i++) {
      const x0 = h01('cfx', i) * W;
      const v = 120 + h01('cfv', i) * 160;
      const y = -40 + (h01('cfy', i) * 300) - 300 + age * v * 1.6 + 300 * clamp(age * 3);
      if (y > H + 20) continue;
      const x = x0 + Math.sin(age * 3 + i) * 30;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(age * (2 + h01('cfr', i) * 4) + i);
      ctx.scale(1, Math.abs(Math.cos(age * 5 + i)) * 0.8 + 0.2);
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(-9, -5, 18, 10);
      ctx.restore();
    }
    ctx.restore();
  }

  // Hayk holding Goofy: Hayk (hug pose), Goofy seated in his arms in front, then Hayk's forearm band
  // redrawn over Goofy so the arms wrap the dog.
  function holdGroup(ctx, t, x, y, s, gs) {
    const hOpts = { x, y, s, t, pose: 'hug', face: 'happy', belly: 0.8, crown: true };
    const a = FILM.cast.hayk(ctx, hOpts);
    const hy = (a.handL[1] + a.handR[1]) / 2;
    const hx = (a.handL[0] + a.handR[0]) / 2;
    const g = FILM.cast.goofy(ctx, { x: hx + 95 * gs, y: hy + 55 * gs, s: gs, t, pose: 'sit', face: 'happy', tilt: -0.08 });
    ctx.save();
    ctx.beginPath();
    ctx.rect(hx - 150 * s, hy - 24 * s, 300 * s, 51 * s);
    ctx.clip();
    FILM.cast.hayk(ctx, hOpts);
    ctx.restore();
    return { a, g };
  }

  function statsCard(ctx, t) {
    if (t < T_CARD - 1e-6) return;
    const u = clamp((t - T_CARD) / 0.3 + 1 / 7.2);
    const dx = (1 - LIB.ease.outBack(u)) * 1000;
    const x0 = 100, y0 = 560, w = 880, h = 420;
    ctx.save();
    ctx.translate(dx, 0);
    ctx.translate(540, 750); ctx.rotate(-0.025); ctx.translate(-540, -750);
    // drop shadow
    ctx.fillStyle = 'rgba(20,8,30,0.35)';
    F.rrect(ctx, x0 + 14, y0 + 16, w, h, 26); ctx.fill();
    // card body
    F.rrect(ctx, x0, y0, w, h, 26);
    F.fo(ctx, 'rgba(27,20,36,0.9)', 6, C.gold);
    // header band
    ctx.save();
    F.rrect(ctx, x0, y0, w, h, 26); ctx.clip();
    ctx.fillStyle = C.gold; ctx.fillRect(x0, y0, w, 76);
    ctx.fillStyle = C.goldShade; ctx.fillRect(x0, y0 + 64, w, 12);
    // faint diagonal stripes in the body
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 18;
    ctx.beginPath();
    for (let k = -4; k < 16; k++) { ctx.moveTo(x0 + k * 70, y0 + h); ctx.lineTo(x0 + k * 70 + 300, y0 + 76); }
    ctx.stroke();
    ctx.restore();
    F.text(ctx, 'MISSION REPORT', x0 + w / 2, y0 + 38, { size: 44, fill: C.line, lw: 0, letter: 4 });
    // lines
    LINES.forEach(([label, val], i) => {
      const t0 = T_LINES[i];
      if (t < t0 - 1e-6) return;
      const ly = y0 + 130 + i * 78;
      const k = F.popIn(t, t0);
      const slide = (1 - clamp((t - t0) * 12 / 2 + 0.5)) * -60;
      ctx.save();
      ctx.translate(slide, 0);
      // tick box
      const bx = x0 + 70;
      ctx.save();
      ctx.translate(bx, ly); ctx.scale(k, k);
      F.rrect(ctx, -26, -26, 52, 52, 10);
      F.fo(ctx, '#ffffff', 5);
      ctx.strokeStyle = '#1fbf6a'; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-3, 13); ctx.lineTo(24, -26); ctx.stroke();
      ctx.restore();
      // label + value
      const tw = F.text(ctx, label, x0 + 124, ly + 2, { size: 50, fill: '#ffffff', lw: 0, align: 'left' }).w;
      const vc = i === 0 ? C.demonRed : i === 3 ? C.up : C.gold;
      F.text(ctx, val, x0 + 124 + tw + 24, ly + 2, { size: 58, fill: vc, lw: 8, stroke: C.line, align: 'left', scale: k });
      // tiny ding sparkle when the line lands
      const age = t - t0;
      if (age < 0.4) F.sparkle(ctx, bx + 30, ly - 30, 34 * Math.sin((age / 0.4) * Math.PI), { color: '#fff7b0' });
      ctx.restore();
    });
    ctx.restore();
  }

  function endTitle(ctx, t, tf) {
    if (t < T_END - 1e-6) return;
    const age = t - T_END;
    const k = F.popIn(t, T_END);
    // gold rays behind the title
    ctx.save();
    ctx.globalAlpha = 0.55 * clamp(age / 0.25 + 0.3);
    ctx.beginPath(); ctx.rect(0, 150, W, 400); ctx.clip();
    rays(ctx, 540, 350, 26, 900, tf * 0.2, 'rgba(255,240,170,0.55)');
    ctx.restore();
    F.burst(ctx, 540, 350, 470 * k, 300 * k, 18, 'rgba(255,90,60,0.9)', { seed: 5, lw: 6, squash: 0.42, jitter: 0.2 });
    // THE END? (the ? wobbles)
    const wob = Math.sin(tf * 5) * 0.12;
    ctx.save();
    ctx.translate(540, 340);
    ctx.scale(k, k);
    ctx.rotate(-0.05);
    const opt = { size: 172, fill: C.gold, stroke: C.line, lw: 26, shadow: 16, shadowColor: '#8a1322', align: 'left', skew: -0.1 };
    const wT = F.measure(ctx, 'THE END', 172) + 20;
    const wQ = F.measure(ctx, '?', 172);
    const x0 = -(wT + wQ) / 2;
    F.text(ctx, 'THE END', x0, 0, opt);
    F.text(ctx, '?', x0 + wT + wQ / 2, -6, Object.assign({}, opt, { align: 'center', rot: wob, fill: '#ffe066' }));
    ctx.restore();
    // glints on the letters
    F.sparkle(ctx, 190, 270, 46 * (0.6 + 0.4 * Math.sin(tf * 6)), { color: '#ffffff' });
    F.sparkle(ctx, 880, 420, 34 * (0.6 + 0.4 * Math.sin(tf * 6 + 2)), { color: '#fff7b0' });
    // LIQUIDITYSCAN logo, small, under the title
    const lk = F.popIn(t, T_END + 0.5);
    if (lk > 0) {
      ctx.save();
      ctx.translate(540, 482);
      ctx.scale(lk, lk);
      F.rrect(ctx, -210, -34, 420, 68, 34);
      F.fo(ctx, 'rgba(27,20,36,0.85)', 0);
      F.lsLogo(ctx, -168, 4, 0.36, { lw: 3 });
      F.text(ctx, 'LIQUIDITYSCAN', 22, 2, { size: 38, fill: '#ffffff', lw: 0, letter: 2 });
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  function draw(ctx, tIn, info) {
    const t0 = clamp(tIn, 0, info.dur);
    const t = Math.min(t0, T_HOLD); // the last 0.5 s holds
    const tw = LIB.onTwos(t);
    const bg = LIB.cached('the-end-bg', buildPaddedBg);

    const sh = F.shakeMany(t, [[T_END, 0.35, 22], [T_CARD, 0.2, 8]], 3);
    // slow push-in over the whole shot, a punch on THE END
    const zoom = 1.0 + 0.035 * LIB.ease.inOutSine(t / T_HOLD) + (t >= T_END ? 0.03 * Math.exp(-(t - T_END) * 6) : 0);
    const cx = 540, cy = 1300;

    // 1. background: screen-fixed, integer shake only (no resampling)
    ctx.drawImage(bg, Math.round(sh[0] * 0.6) - PAD, Math.round(sh[1] * 0.6) - PAD);

    ctx.save();
    ctx.translate(sh[0], sh[1]);
    ctx.translate(cx, cy); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy);

    // 1. background
    // 2. animated sky
    birds(ctx, t);
    cityLights(ctx, t);
    F.bokeh(ctx, { n: 14, seed: 77, t, y: 900, h: 700, rMin: 10, rMax: 34, colors: ['#ffe39a', '#ffb0c8'], alpha: 0.4 });

    // 3. cast
    // Grant on the right: exhausted thumbs up, bandaged arm, plaster on the cheek
    const gS = 1.05;
    const gx = 820, gy = GROUND - 10 + F.bounce(tw, 1, 4);
    const ga = FILM.cast.grant(ctx, { x: gx, y: gy, s: gS, t: tw, pose: 'thumbsUp', face: 'exhausted', tilt: -0.03 });
    // forearm of the thumbs-up arm: elbow and wrist from the pose (local units x 1.08 * s)
    const k = 1.08 * gS;
    const tilt = -0.03, ct = Math.cos(tilt), st = Math.sin(tilt);
    const Wp = (lx, ly) => [gx + (lx * k) * ct - (ly * k) * st, gy + (lx * k) * st + (ly * k) * ct];
    const el = Wp(96, -268), wr = Wp(152, -335), shd = Wp(64, -356);
    const fa = Math.atan2(wr[1] - el[1], wr[0] - el[0]);
    bandage(ctx, [lerp(el[0], wr[0], 0.35), lerp(el[1], wr[1], 0.35)], fa + Math.PI / 2, 26 * k, 44 * k);
    bandage(ctx, [lerp(el[0], wr[0], 0.72), lerp(el[1], wr[1], 0.72)], fa + Math.PI / 2 + 0.15, 22 * k, 42 * k);
    const ua = Math.atan2(el[1] - shd[1], el[0] - shd[0]);
    bandage(ctx, [lerp(shd[0], el[0], 0.6), lerp(shd[1], el[1], 0.6)], ua + Math.PI / 2, 24 * k, 44 * k);
    plaster(ctx, ga.head[0] - 44 * k, ga.head[1] - 44 * k, 1.1, -0.3);
    // exhausted sweat + a thumbs-up sparkle
    F.sweat(ctx, ga.head[0] - 90, ga.head[1] - 30, 0.9);
    F.sparkle(ctx, ga.handR[0] + 44, ga.handR[1] - 70, 28 * (0.6 + 0.4 * Math.sin(t * 8)), { color: '#ffffff' });

    // Hayk holding Goofy, a happy hop on every other beat
    const hop = F.bounce(tw, 1, 12);
    const { a, g } = holdGroup(ctx, tw, 380, GROUND + hop, 1.2, 1.25);
    // Goofy's burger: chomped on the beats
    let bite = 0, lastChomp = -9;
    CHOMPS.forEach((c) => { if (t >= c - 1e-6) { bite += 0.14; lastChomp = c; } });
    const chompAge = t - lastChomp;
    const squish = chompAge < 2 / 24 ? 0.9 : 1;
    const bx = g.mouth[0] + 78, by = g.mouth[1] + 34;
    ctx.save();
    ctx.translate(bx, by); ctx.rotate(-0.1); ctx.scale(1, squish);
    F.burger(ctx, 0, 0, 0.8, { bite: Math.min(0.55, bite * 0.8) });
    ctx.restore();
    F.crumbs(ctx, bx - 10, by - 20, chompAge, { n: 10, seed: 3 + Math.floor(lastChomp * 2), spread: 260, life: 0.6 });
    // love / happiness marks
    F.hearts(ctx, g.head[0], g.head[1] - 80, t, { n: 4, seed: 9, spread: 160, rise: 220, scale: 0.8 });
    F.sparkle(ctx, a.top[0] - 40, a.top[1] - 60, 30 * (0.6 + 0.4 * Math.sin(t * 7)), { color: '#fff7b0' });

    // 4. foreground: dark bushes at the bottom corners + drifting petals
    ctx.save();
    ctx.fillStyle = '#3d6b2e';
    [[-40, H - 60, 170], [150, H + 10, 140], [980, H - 50, 180], [1110, H - 180, 150]].forEach(([x, y, r]) => {
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    });
    ctx.fillStyle = '#4f8a3a';
    [[-10, H - 110, 110], [990, H - 110, 110]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); });
    ctx.restore();
    ctx.restore(); // camera

    // 5. screen-fixed overlays
    F.sparkles(ctx, { x: 60, y: 240, w: 960, h: 700, n: 8, seed: 31, t: tw, size: 26 });
    confetti(ctx, t, t - T_END);
    statsCard(ctx, t);
    endTitle(ctx, t, tw);
    if (t >= T_END - 1e-6) {
      const age = t - T_END;
      F.flash(ctx, age < 1 / 24 ? 0.85 : 0.6 * (1 - clamp((age - 1 / 24) / 0.25)), '#fff4d0');
    }
    F.vignette(ctx, 0.3, '40,10,50');
  }

  FILM.scene({ id: ID, draw });
})();
