// 07 'ls-scan': LiquidityScan finds the entry. Global T 11.667 .. 13.333 (1 bar, 100 frames).
// Real-app look (docs/brand): #eef3f7 background, white rounded cards, dark teal hero card with a
// radar, spaced uppercase mono labels, neon green active pills, white pill bottom nav.
// Layers (back to front):
//   1 light app background + faint grid + calm floaties
//   2 header row: Liqui|||Scan app wordmark + "LIVE" pill
//   3 teal hero card "LIVE ENGINE NETWORK" with the radar (sweep arm, blips) and the lsMark
//   4 white signal card: BTCUSDT chart, reticle locks on the entry candle (beat 1), ENTRY FOUND / 0.3s / LONG
//   5 Time + биржа, calm, Time's rim refills (beat 2), "+6h back"
//   6 "#1" pill, the mark hops onto it, crown lands, confetti (beat 3)
//   7 decorative bottom nav (icons only, below the text safe area)
//   8 continuity flash from 06's green scan beam (frame 0), light circle wipe into 08 (last 10 frames)
(function () {
  'use strict';
  const ID = 'ls-scan';
  const FILM = window.FILM;
  const F = FILM.fx;
  const C = F.pal;
  const E = F.E;
  const TAU = Math.PI * 2;
  const clamp = F.clamp, lerp = F.lerp, seg = F.seg;
  const BT = F.BEAT; // 0.41667
  const B1 = BT, B2 = BT * 2, B3 = BT * 3; // T 12.083, 12.5, 12.917
  const W = 1080, H = 1920;

  // layout
  const CARD = { x: 60, y: 330, w: 960, h: 470 }; // teal hero
  const SIG = { x: 60, y: 830, w: 960, h: 360 }; // signal card
  const RADAR = { x: 790, y: 565, r: 150 };
  const MS = 1.05, MR = 120 * MS; // mark scale and half-size
  const MARK0 = [270, 590]; // resting centre of the mark
  const PILL1 = { x: 270, y: 776, w: 180, h: 64 }; // "#1" pill (centre)
  const MARK1 = [270, PILL1.y - PILL1.h / 2 - MR]; // centre when standing on the pill
  const END = [540, 640], END_S = 1.4; // hand-off to 08 (mark centre and scale on the last frame)
  const TIMEP = [300, 1420], BZP = [790, 1420];

  const h01 = (...k) => F.h01(ID, ...k);
  const mono = (ctx, str, x, y, size, color, o = {}) =>
    F.text(ctx, str, x, y, Object.assign({ size, fill: color, font: 'mono', weight: 700, rounded: false, letter: size * 0.18 }, o));

  function pill(ctx, str, x, y, o = {}) {
    // app chip: mono spaced uppercase, centred at (x, y)
    const size = o.size || 30;
    const letter = o.letter == null ? size * 0.16 : o.letter;
    ctx.save();
    ctx.font = F.font(size, 'mono', 700);
    if ('letterSpacing' in ctx) ctx.letterSpacing = letter + 'px';
    const tw = ctx.measureText(str).width;
    ctx.restore();
    const pad = o.pad || size * 0.75;
    const dot = o.dot ? size * 0.75 : 0;
    const w = tw + pad * 2 + dot, h = size * 1.75;
    ctx.save();
    ctx.translate(x, y);
    const sc = o.scale == null ? 1 : o.scale;
    ctx.scale(sc * (o.sx || 1), sc * (o.sy || 1));
    if (o.alpha != null) ctx.globalAlpha *= clamp(o.alpha);
    const draw = (c) => { F.rrect(c, -w / 2, -h / 2, w, h, h / 2); c.fillStyle = o.bg || C.lsMint; c.fill(); };
    if (o.shadow) F.dropShadow(ctx, draw, { dy: 6, blur: 14, color: 'rgba(19,40,58,0.18)' }); else draw(ctx);
    if (o.border) { F.rrect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.strokeStyle = o.border; ctx.lineWidth = 3; ctx.stroke(); }
    if (o.dot) { ctx.fillStyle = o.dotColor || C.lsGreen; ctx.beginPath(); ctx.arc(-w / 2 + pad + size * 0.18, 0, size * 0.2, 0, TAU); ctx.fill(); }
    mono(ctx, str, dot / 2 + letter / 2, 1, size, o.color || C.lsGreenDark, { letter });
    ctx.restore();
    return { w, h };
  }

  // cheap flat soft shadow for the big cards (canvas shadowBlur on 960 px cards is the frame's main cost)
  function softShadow(ctx, x, y, w, h, r, a) {
    ctx.save();
    ctx.fillStyle = `rgba(19,40,58,${a * 0.6})`;
    F.rrect(ctx, x - 4, y + 10, w + 8, h + 12, r + 4); ctx.fill();
    ctx.fillStyle = `rgba(19,40,58,${a})`;
    F.rrect(ctx, x + 6, y + 12, w - 12, h + 4, r); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  function background(ctx, t, T) {
    F.bgFill(ctx, C.lsBg);
    ctx.save();
    ctx.strokeStyle = 'rgba(19,40,58,0.05)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const off = (T * 12) % 90;
    for (let x = -off; x < W + 90; x += 90) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = -off; y < H + 90; y += 90) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    // soft green glow behind the hero
    ctx.fillStyle = F.radGrad(ctx, 540, 640, 50, 760, [[0, 'rgba(31,227,60,0.16)'], [1, 'rgba(31,227,60,0)']]);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    F.floaties(ctx, { t: T, n: 10, seed: 707, colors: ['rgba(31,227,60,0.25)', 'rgba(33,83,95,0.14)', 'rgba(92,234,122,0.22)'] });
  }

  function header(ctx, t) {
    const k = E.outCubic(seg(t, -0.1, 0.3));
    ctx.save();
    ctx.globalAlpha *= k;
    ctx.translate(0, (1 - k) * -30);
    FILM.cast.lsWordmark(ctx, 92, 262, 56, { style: 'candles', align: 'left' });
    pill(ctx, 'LIVE', 900, 262, { size: 28, dot: true, bg: '#ffffff', border: 'rgba(31,122,58,0.25)', dotColor: F.beatPulse(t, 0, 0.2) > 0.4 ? C.lsGreen : C.lsGreenDark });
    ctx.restore();
  }

  function radar(ctx, t, ping) {
    const { x, y, r } = RADAR;
    ctx.save();
    // rings
    ctx.strokeStyle = 'rgba(31,227,60,0.28)';
    ctx.lineWidth = 3;
    [1, 0.72, 0.44].forEach((k) => { ctx.beginPath(); ctx.arc(x, y, r * k, 0, TAU); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(31,227,60,0.12)';
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
    // sweep wedge (fading slices) + arm
    const a = -Math.PI / 2 + t * TAU * 1.2;
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = `rgba(31,227,60,${0.16 * (1 - i / 14)})`;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, a - (i + 1) * 0.07, a - i * 0.07); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = C.lsGreen; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke();
    // arc tail like the app icon
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(x, y, r * 0.72, a - 1.2, a); ctx.stroke();
    // blips
    for (let i = 0; i < 5; i++) {
      const ba = h01('ba', i) * TAU, br = r * (0.3 + h01('br', i) * 0.6);
      let d = ((a - ba) % TAU + TAU) % TAU; // time since the arm passed
      const k = Math.exp(-d * 1.6);
      ctx.fillStyle = `rgba(92,234,122,${0.25 + 0.75 * k})`;
      ctx.beginPath(); ctx.arc(x + Math.cos(ba) * br, y + Math.sin(ba) * br, 7 + 5 * k, 0, TAU); ctx.fill();
    }
    // centre dot
    ctx.fillStyle = C.lsGreen; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill();
    // ping on lock (beat 1)
    if (ping >= 0 && ping < 0.6) F.shockRing(ctx, x, y, ping, { r: r * 1.3, color: C.lsGreen, life: 0.6, width: 8 });
    ctx.restore();
  }

  function heroCard(ctx, t) {
    const k = E.outBack(seg(t, -0.08, 0.3));
    const { x, y, w, h } = CARD;
    ctx.save();
    ctx.translate(540, y + h / 2);
    ctx.scale(lerp(0.9, 1, k), lerp(0.9, 1, k));
    ctx.translate(-540, -(y + h / 2));
        softShadow(ctx, x, y, w, h, 60, 0.12);
    F.rrect(ctx, x, y, w, h, 60); ctx.fillStyle = F.linGrad(ctx, x, y, x + w, y + h, [C.lsTealA, C.lsTealB]); ctx.fill();
    // faint concentric arcs like the app card
    ctx.save();
    F.rrect(ctx, x, y, w, h, 60); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 3;
    for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.arc(x + w + 40, y - 40, i * 150, 0, TAU); ctx.stroke(); }
    ctx.restore();
    // label
    ctx.fillStyle = C.lsGreen; ctx.beginPath(); ctx.arc(x + 58, y + 62, 10, 0, TAU); ctx.fill();
    mono(ctx, 'LIVE ENGINE NETWORK', x + 84, y + 63, 30, '#e8eef2', { align: 'left', letter: 5 });
    radar(ctx, t, t - B1);
    // stat under the radar
    const n = Math.round(lerp(546, 600, E.outCubic(seg(t, 0.05, 0.9))));
    mono(ctx, `${n} markets`, RADAR.x, y + h - 36, 28, 'rgba(232,238,242,0.75)', { letter: 2 });
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  const CN = 16, ENTRY_I = 9;
  // dip into the entry, then the rally (revealed after the lock)
  const CLOSES = [0.66, 0.7, 0.62, 0.66, 0.55, 0.5, 0.53, 0.4, 0.33, 0.2, 0.34, 0.42, 0.55, 0.62, 0.76, 0.86];
  function signalCard(ctx, t) {
    const { x, w, h } = SIG;
    const k = E.outBack(seg(t, -0.05, 0.36));
    const y = SIG.y + (1 - k) * 300;
    const a = clamp(seg(t, -0.05, 0.1));
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    softShadow(ctx, x, y, w, h, 48, 0.08);
    F.card(ctx, x, y, w, h, { r: 48, shadow: false });
    // header row
    mono(ctx, 'BTCUSDT', x + 44, y + 58, 40, C.lsInk, { align: 'left', letter: 1 });
    pill(ctx, '1H', x + 300, y + 58, { size: 24, bg: C.lsBg, color: C.lsSlate });
    const lock = t >= B1 - 1e-6;
    mono(ctx, lock ? '64,210.5' : '64,1' + String(80 + Math.floor(h01('px', Math.floor(t * 20)) * 19)) + '.0', x + w - 44, y + 58, 38, C.lsInk, { align: 'right', letter: 0 });
    // chart area
    const cx0 = x + 44, cy0 = y + 110, cw = 560, ch = 210;
    ctx.strokeStyle = 'rgba(19,40,58,0.06)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) { ctx.moveTo(cx0, cy0 + (ch * i) / 3); ctx.lineTo(cx0 + cw, cy0 + (ch * i) / 3); }
    ctx.stroke();
    const lockT = t >= B1 - 1e-6;
    const shown = lerp(0, ENTRY_I + 1, seg(t, 0.06, 0.4, 'outCubic')) + (lockT ? (CN - ENTRY_I - 1) * seg(t, B1 + 0.05, B1 + 0.6, 'outCubic') : 0);
    const Y = (q) => cy0 + ch - q * ch;
    const cwid = cw / CN;
    for (let i = 0; i < CN; i++) {
      const kk = clamp(shown - i);
      if (kk <= 0) break;
      const op = i ? CLOSES[i - 1] : 0.6, cl = CLOSES[i] + (i === CN - 1 ? Math.sin(t * 9) * 0.01 : 0);
      const hi = Math.max(op, cl) + 0.03 + h01('hi', i) * 0.04, lo = Math.min(op, cl) - 0.03 - h01('lo', i) * 0.04 - (i === ENTRY_I ? 0.06 : 0);
      const mid = (op + cl) / 2, sc = E.outBack(kk);
      F.candle(ctx, cx0 + (i + 0.5) * cwid, Y(lerp(mid, op, sc)), Y(lerp(mid, cl, sc)), Y(lerp(mid, hi, sc)), Y(lerp(mid, lo, sc)), cwid * 0.56);
    }
    const ex = cx0 + (ENTRY_I + 0.5) * cwid;
    const ey = Y((CLOSES[ENTRY_I - 1] + CLOSES[ENTRY_I]) / 2);
    // entry line + label after lock
    if (lock) {
      const lk = E.outCubic(seg(t, B1, B1 + 0.25));
      ctx.save();
      ctx.setLineDash([10, 9]);
      ctx.strokeStyle = C.lsGreenDark; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx0, ey); ctx.lineTo(cx0 + cw * lk, ey); ctx.stroke();
      ctx.restore();
    }
    // reticle: flies in 0.2 .. B1 and locks
    if (t > 0.18) {
      const u = seg(t, 0.18, B1, 'inOutCubic');
      const rx = lerp(cx0 + cw * 0.15, ex, u) + (1 - u) * Math.sin(t * 17) * 30;
      const ry = lerp(cy0 + 20, ey, u) + (1 - u) * Math.cos(t * 13) * 24;
      const lockK = lock ? F.spring((t - B1) * 1.4, 2.2, 5) : 0;
      const size = lerp(80, 40, lock ? clamp(lockK) : 0) * (lock ? 1 : 1 + (1 - u) * 0.3);
      const col = lock ? C.lsGreenDark : C.lsSlate;
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(lock ? (1 - clamp(lockK)) * 0.6 : t * 3);
      ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.lineCap = 'round';
      [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(sx * size, sy * size * 0.45); ctx.lineTo(sx * size, sy * size); ctx.lineTo(sx * size * 0.45, sy * size);
        ctx.stroke();
      });
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.stroke();
      ctx.restore();
      if (lock) {
        F.shockRing(ctx, ex, ey, t - B1, { r: 90, color: C.lsGreen, life: 0.4, width: 6 });
        F.sparkle(ctx, ex + 34, ey - 40, 18 * F.pop(t, B1, 0.25) * (1 - seg(t, B1 + 0.3, B1 + 0.6)), { color: C.lsGreen });
      }
    }
    // right column: ENTRY FOUND / 0.3s / LONG (beat 1)
    const colX = x + 780;
    const p1 = F.pop(t, B1, 0.32);
    if (p1 > 0) pill(ctx, 'ENTRY FOUND', colX, y + 150, { size: 30, bg: C.lsGreen, color: C.lsInk, scale: p1, shadow: true, letter: 3 });
    const p2 = F.pop(t, B1 + 0.06, 0.3);
    if (p2 > 0) {
      ctx.save(); ctx.translate(colX, y + 228); ctx.scale(p2, p2);
      const shown = (0.3 * clamp(seg(t, B1, B1 + 0.12))).toFixed(1);
      mono(ctx, shown + 's', 0, 0, 64, C.lsGreenDark, { letter: 0 });
      ctx.restore();
    }
    const p3 = F.pop(t, B1 + 0.12, 0.3);
    if (p3 > 0) pill(ctx, '▲ LONG', colX, y + 302, { size: 28, bg: C.lsMint, color: C.lsGreenDark, scale: p3, border: 'rgba(27,122,58,0.35)' });
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  function fighters(ctx, t, T) {
    // they hop up from below and land on beat 2
    const land = B2;
    const rise = seg(t, 0.32, land, 'outCubic');
    if (rise <= 0) return;
    const yOff = (1 - rise) * 560;
    const [sx, sy] = t < land ? [0.92, 1.1] : F.squash(t, land, 0.22, 0.45);
    const bob = t > land + 0.3 ? Math.sin((t - land) * 9) * 3 : 0;
    const groundY = TIMEP[1] + 96 + 6;
    // refill: 0.15 -> 1 from beat 2
    const fill = t < land ? 0.15 : lerp(0.15, 1, E.outCubic(seg(t, land, land + 0.32)));
    const blinkRed = t < land && Math.floor(t * 8) % 2 === 0;
    const tx = TIMEP[0], ty = TIMEP[1] + yOff - bob;
    // glow ring behind Time when refilling
    if (t >= land) {
      const g = 1 - seg(t, land + 0.2, land + 0.8);
      ctx.save();
      ctx.fillStyle = F.radGrad(ctx, tx, ty, 40, 210, [[0, `rgba(54,198,255,${0.45 * g})`], [1, 'rgba(54,198,255,0)']]);
      ctx.beginPath(); ctx.arc(tx, ty, 210, 0, TAU); ctx.fill();
      ctx.restore();
    }
    FILM.cast.time(ctx, {
      x: tx, y: ty, s: 0.8, sx, sy, t: T, ring: fill, crumbs: fill < 0.99,
      face: t < land ? 'shocked' : 'happy', shadow: rise > 0.9 ? groundY : undefined,
      gloves: t >= land ? { l: [tx - 140, ty - 20 - 40 * E.outBack(seg(t, land, land + 0.25))], r: [tx + 145, ty - 30 - 50 * E.outBack(seg(t, land, land + 0.25))] } : undefined,
    });
    if (blinkRed) { ctx.save(); ctx.strokeStyle = 'rgba(255,77,94,0.8)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(tx, ty, 104, 0, TAU); ctx.stroke(); ctx.restore(); }
    // sparkle burst on refill
    if (t >= land && t < land + 0.7) {
      const age = t - land;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + 0.3;
        const d = 110 + E.outCubic(clamp(age / 0.5)) * 110;
        const r = 20 * (1 - clamp(age / 0.7)) * (0.6 + h01('sp', i) * 0.6);
        F.sparkle(ctx, tx + Math.cos(a) * d, ty + Math.sin(a) * d, r, { color: i % 2 ? C.lsGreen : C.timeCyan, rot: age * 3 });
      }
      F.shockRing(ctx, tx, ty, age, { r: 200, color: C.timeCyan, life: 0.45, width: 8 });
    }
    // биржа, calm, tidy candles
    const bx = BZP[0], by = BZP[1] + yOff * 1.08 + Math.sin(t * 7 + 1) * (t > land + 0.3 ? 3 : 0);
    const [bsx, bsy] = t < land ? [0.92, 1.1] : F.squash(t, land + 0.04, 0.2, 0.45);
    FILM.cast.birzha(ctx, { x: bx, y: by, s: 0.8, sx: bsx, sy: bsy, t: T, face: 'calm', candles: [0.55, 0.7, 0.85], shadow: rise > 0.9 ? groundY : undefined });
    // "+6h back"
    const pp = F.pop(t, land, 0.35);
    if (pp > 0) {
      const ly = TIMEP[1] - 168 - E.outCubic(seg(t, land, land + 0.6)) * 10;
      pill(ctx, '+6h back', tx, ly, { size: 38, bg: C.lsGreen, color: C.lsInk, scale: pp, shadow: true, letter: 1, pad: 26 });
    }
  }

  // ---------------------------------------------------------------------------
  function markState(t) {
    // drop in from the top, land at 0.15, bob, hop onto the #1 pill on beat 3, then zoom to the 08 hand-off.
    const LAND0 = 0.15;
    let x = MARK0[0], y = MARK0[1], s = MS, sx = 1, sy = 1, rot = 0;
    if (t < LAND0) {
      const u = t / LAND0;
      y = lerp(120, MARK0[1], u * u);
      sx = 0.86; sy = 1.18;
    } else if (t < 1.02) {
      [sx, sy] = F.squash(t, LAND0, 0.3, 0.5);
      y = MARK0[1] - Math.max(0, Math.sin((t - LAND0) * 5)) * 4 * clamp((t - 0.6) * 4);
    }
    // hop: anticipation 1.02-1.10, airborne 1.10-B3, land B3
    if (t >= 1.02 && t < 1.1) {
      const u = seg(t, 1.02, 1.1, 'outQuad');
      sx = 1 + 0.16 * u; sy = 1 - 0.18 * u; y = MARK0[1] + MR * 0.18 * u;
    } else if (t >= 1.1 && t < B3) {
      const u = (t - 1.1) / (B3 - 1.1);
      y = lerp(MARK0[1], MARK1[1], u) - Math.sin(u * Math.PI) * 150;
      sx = 0.88; sy = 1.14; rot = Math.sin(u * Math.PI) * -0.12;
    } else if (t >= B3) {
      y = MARK1[1];
      [sx, sy] = F.squash(t, B3, 0.28, 0.5);
    }
    // exit 1.5 -> end: glide to the hand-off pose
    const ex = seg(t, 1.5, 5 / 3 - 1 / 60, 'inOutCubic');
    if (ex > 0) {
      x = lerp(x, END[0], ex); y = lerp(y, END[1], ex); s = lerp(s, END_S, ex);
      sx = lerp(sx, 1, ex); sy = lerp(sy, 1, ex);
    }
    return { x, y, s, sx, sy, rot };
  }

  function drawMark(ctx, t, m) {
    const pump = F.beatPulse(t, 0, 0.14);
    const cs = [0.75 + 0.2 * pump, 1 - 0.15 * pump + 0.1 * Math.sin(t * 12), 0.6 + 0.3 * pump];
    const glow = 0.6 + 0.4 * F.beatPulse(t, 0, 0.2);
    // fall trail
    if (t < 0.15) {
      const pos = [0.5, 0.35, 0.2].map((d) => [m.x, m.y - d * 260]);
      F.motionTrail(ctx, (c, px, py) => FILM.cast.lsMark(c, { x: px, y: py, s: m.s, sx: m.sx, sy: m.sy }), pos, { alpha: 0.35 });
    }
    // feet-anchored squash: scale around the bottom edge
    const R = 120 * m.s;
    ctx.save();
    ctx.translate(m.x, m.y + R);
    ctx.rotate(m.rot);
    FILM.cast.lsMark(ctx, { x: 0, y: -R * m.sy, s: m.s, sx: m.sx, sy: m.sy, glow, candles: cs });
    ctx.restore();
  }

  function crownAndPill(ctx, t, m) {
    // "#1" pill pops on the off-beat before beat 3
    const pin = 1.0;
    const pp = F.popIn(t, pin, 0.4);
    const out = seg(t, 1.5, 5 / 3, 'inCubic');
    if (pp > 0 && out < 1) {
      const [psx, psy] = F.squash(t, B3, 0.18, 0.4);
      ctx.save();
      ctx.globalAlpha *= 1 - out;
      ctx.translate(PILL1.x, PILL1.y);
      ctx.scale(pp * psx, pp * psy);
      F.dropShadow(ctx, (c) => { F.rrect(c, -PILL1.w / 2, -PILL1.h / 2, PILL1.w, PILL1.h, PILL1.h / 2); c.fillStyle = F.linGrad(c, 0, -32, 0, 32, [C.lsGreen, C.lsGreen2]); c.fill(); }, { dy: 8, blur: 18, color: 'rgba(31,227,60,0.45)' });
      F.text(ctx, '#1', 0, 3, { size: 46, fill: C.lsInk, font: 'sans', rounded: false });
      ctx.restore();
    }
    // crown: falls from the top, lands on the mark's head on beat 3
    if (t > 0.95) {
      const R = 120 * m.s;
      const headY = m.y + R - 2 * R * m.sy; // top edge of the squashed mark
      let cy, rot = 0;
      if (t < B3) {
        const u = seg(t, 0.95, B3);
        cy = lerp(-120, headY, u * u);
        rot = (1 - u) * 1.4;
      } else {
        cy = headY + 6;
        rot = Math.sin((t - B3) * 18) * 0.12 * Math.exp(-(t - B3) * 6) - 0.1;
      }
      const cs = 0.5 * (m.s / MS);
      FILM.cast && F.crown(ctx, m.x + 10, cy, cs, { rot });
    }
  }

  function bottomNav(ctx, t) {
    // decorative app nav (icons only, below the safe area), Scan tab active
    const k = E.outBack(seg(t, 0.75, 1.15));
    if (k <= 0) return;
    const y = 1600 + (1 - k) * 360;
    ctx.save();
    softShadow(ctx, 100, y, 880, 150, 75, 0.08);
    F.card(ctx, 100, y, 880, 150, { r: 75, shadow: false });
    const xs = [210, 430, 650, 870];
    const act = F.popIn(t, 1.0, 0.4);
    if (act > 0) {
      ctx.save(); ctx.translate(xs[1], y + 75); ctx.scale(act, act);
      F.rrect(ctx, -100, -58, 200, 116, 58); ctx.fillStyle = F.linGrad(ctx, 0, -58, 0, 58, [C.lsGreen, C.lsGreen2]); ctx.fill();
      ctx.restore();
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 6;
    const cy = y + 75;
    // Today: pulse line
    ctx.strokeStyle = C.lsSlate;
    ctx.beginPath(); ctx.moveTo(xs[0] - 30, cy); ctx.lineTo(xs[0] - 12, cy); ctx.lineTo(xs[0] - 4, cy - 22); ctx.lineTo(xs[0] + 8, cy + 20); ctx.lineTo(xs[0] + 16, cy); ctx.lineTo(xs[0] + 30, cy); ctx.stroke();
    // Scan: radar icon
    ctx.strokeStyle = act > 0.5 ? C.lsInk : C.lsGreenDark;
    ctx.beginPath(); ctx.arc(xs[1], cy, 28, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(xs[1], cy, 13, 0, TAU); ctx.stroke();
    const a = t * 6;
    ctx.beginPath(); ctx.moveTo(xs[1], cy); ctx.lineTo(xs[1] + Math.cos(a) * 28, cy + Math.sin(a) * 28); ctx.stroke();
    // X-Ray: brackets
    ctx.strokeStyle = C.lsSlate;
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy]) => {
      ctx.beginPath(); ctx.moveTo(xs[2] + sx * 26, cy + sy * 10); ctx.lineTo(xs[2] + sx * 26, cy + sy * 24); ctx.lineTo(xs[2] + sx * 12, cy + sy * 24); ctx.stroke();
    });
    // You: person
    ctx.beginPath(); ctx.arc(xs[3], cy - 12, 12, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(xs[3], cy + 28, 24, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const T = info.T;
      background(ctx, t, T);
      const [shx, shy] = F.shakeMany(t, [[0.15, 0.25, 10], [B3, 0.3, 14]], 7);
      ctx.save();
      ctx.translate(shx, shy);
      header(ctx, t);
      heroCard(ctx, t);
      signalCard(ctx, t);
      fighters(ctx, t, T);
      bottomNav(ctx, t);
      const m = markState(t);
      // landing puffs
      F.puffs(ctx, MARK0[0], MARK0[1] + MR, t - 0.15, { n: 7, seed: 71, size: 30, color: 'rgba(255,255,255,0.5)' });
      if (t >= B3) F.confettiBurst(ctx, PILL1.x + 40, PILL1.y - 160, t - B3, { n: 36, seed: 77, power: 1300, colors: [C.lsGreen, C.lsGreen2, C.yellow, C.lsTealB, '#ffffff', C.timeCyan] });
      // light circle wipe into the end card, centred on the mark
      const wp = seg(t, 1.5, 5 / 3 - 1 / 60, 'inCubic');
      if (wp > 0) F.circleWipe(ctx, m.x, m.y, wp, C.lsBg, { rings: [C.lsGreen2] });
      drawMark(ctx, t, m);
      crownAndPill(ctx, t, m);
      ctx.restore();
      // continuity: the green scan beam from 06 flashes out at the bottom
      if (t < 0.25) {
        const k = 1 - seg(t, 0, 0.25, 'outCubic');
        ctx.save();
        ctx.fillStyle = `rgba(31,227,60,${0.22 * k})`;
        ctx.fillRect(0, 0, W, H);
        const by = lerp(H - 20, H + 120, 1 - k);
        ctx.fillStyle = F.linGrad(ctx, 0, by - 160, 0, by + 20, [[0, 'rgba(31,227,60,0)'], [0.85, `rgba(31,227,60,${0.8 * k})`], [1, `rgba(255,255,255,${k})`]]);
        ctx.fillRect(0, by - 160, W, 180);
        ctx.restore();
      }
    },
  });
})();
