// 08 'end-card': liquidityscan.io. Global T 13.333 .. 15.0 (1 bar, 100 frames).
// Website-hero style (docs/brand): light grid background, soft green glow, app mark, wordmark,
// "Stop babysitting the charts.", dark START FREE button, the URL in green.
// Hand-off from 07: frame 0 shows the mark at (540, 640) s 1.4 wearing the crown, on a plain lsBg.
// Layers (back to front):
//   1 lsBg + faint grid + green glow + calm floaties
//   2 mark (settles to (540, 590) s 1.6), crown hops off and pops into sparkles
//   3 wordmark wipe (beat 1), tagline (8th after beat 1), button + URL (beat 2)
//   4 Time and биржа peek from the bottom corners, fist-pump landing on beat 3
//   Everything is frozen from HOLD (final 0.4 s is a still poster).
(function () {
  'use strict';
  const ID = 'end-card';
  const FILM = window.FILM;
  const F = FILM.fx;
  const C = F.pal;
  const E = F.E;
  const TAU = Math.PI * 2;
  const clamp = F.clamp, lerp = F.lerp, seg = F.seg;
  const BT = F.BEAT;
  const B1 = BT, B2 = BT * 2, B3 = BT * 3; // T 13.75, 14.167, 14.583
  const W = 1080, H = 1920;
  const DUR = 5 / 3;
  const HOLD = DUR - 0.4; // T 14.6: still from here

  const START = [540, 640], START_S = 1.4; // 07's last frame
  const MARK = [540, 585], MARK_S = 1.55;
  const WM_Y = 880, TAG_Y = [1032, 1112], BTN = { x: 290, y: 1188, w: 500, h: 100 }, URL_Y = 1400;
  const h01 = (...k) => F.h01(ID, ...k);

  function background(ctx, tt, T) {
    F.bgFill(ctx, C.lsBg);
    ctx.save();
    ctx.strokeStyle = 'rgba(19,40,58,0.05)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const off = (T * 12) % 90;
    for (let x = -off; x < W + 90; x += 90) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = -off; y < H + 90; y += 90) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    const g = 0.16 + 0.08 * E.outCubic(seg(tt, 0, 0.5));
    ctx.fillStyle = F.radGrad(ctx, 540, 640, 40, 820, [[0, `rgba(31,227,60,${g})`], [0.6, 'rgba(31,227,60,0.04)'], [1, 'rgba(31,227,60,0)']]);
    ctx.fillRect(0, 0, W, H);
    // a faint lilac wash at the bottom like the site hero
    ctx.fillStyle = F.linGrad(ctx, 0, 1100, 0, H, ['rgba(123,92,255,0)', 'rgba(123,92,255,0.06)']);
    ctx.fillRect(0, 1100, W, H - 1100);
    ctx.restore();
    F.floaties(ctx, { t: T, n: 9, seed: 808, colors: ['rgba(31,227,60,0.22)', 'rgba(33,83,95,0.12)', 'rgba(92,234,122,0.2)'] });
  }

  function mark(ctx, tt) {
    const u = clamp(tt / 0.42);
    const sp = F.spring(u * 0.9, 1.4, 5.5);
    const x = lerp(START[0], MARK[0], sp), y = lerp(START[1], MARK[1], sp);
    const s = lerp(START_S, MARK_S, sp);
    const [sx, sy] = F.squash(tt, 0.08, 0.14, 0.5);
    const pump = tt < HOLD ? F.beatPulse(tt, 0, 0.14) * (1 - seg(tt, 1.1, HOLD)) : 0;
    const cs = [0.75 + 0.2 * pump, 1 - 0.12 * pump, 0.6 + 0.3 * pump];
    const glow = 0.55 + 0.35 * pump;
    FILM.cast.lsMark(ctx, { x, y, s, sx, sy, glow, candles: cs });
    return { x, y, s, sy };
  }

  function crown(ctx, tt, m) {
    // sits on the head at frame 0 (07 hand-off), hops off at 0.1 and bursts into sparkles at 0.42
    const R = 120 * m.s;
    const head = m.y - R * m.sy + 6;
    const cs0 = 0.5 * (START_S / 1.05);
    if (tt < 0.42) {
      const u = seg(tt, 0.1, 0.42);
      const cx = m.x + 10 + u * 160;
      const cy = head - Math.sin(u * Math.PI * 0.9) * 200 - (u > 0 ? 0 : 0);
      const sc = cs0 * (1 - E.inBack(u) * 0.9);
      F.crown(ctx, cx, cy, Math.max(0.01, sc), { rot: -0.1 + u * 2.4 });
    }
    const age = tt - 0.42;
    if (age >= 0 && age < 0.5) {
      const bx = m.x + 170, by = head - 170;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const d = 30 + E.outCubic(clamp(age / 0.4)) * 90;
        F.sparkle(ctx, bx + Math.cos(a) * d, by + Math.sin(a) * d, 18 * (1 - age / 0.5), { color: i % 2 ? C.yellow : C.lsGreen, rot: age * 4 });
      }
    }
  }

  function wordmark(ctx, tt) {
    const p = seg(tt, B1 - 1 / 60, B1 + 0.28, 'outCubic');
    if (p <= 0) return;
    const ww = 820;
    const x0 = 540 - ww / 2 - 20;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, WM_Y - 90, (ww + 40) * p, 180);
    ctx.clip();
    const rise = (1 - p) * 18;
    FILM.cast.lsWordmark(ctx, 540, WM_Y + rise, 108);
    ctx.restore();
    // the green wipe edge
    if (p < 1) {
      const ex = x0 + (ww + 40) * p;
      F.rrect(ctx, ex - 6, WM_Y - 70, 12, 140, 6);
      ctx.fillStyle = C.lsGreen; ctx.fill();
    }
  }

  // kinetic letters (like FX.popLetters but with crisp, less fattened glyphs for the heavy site headline)
  function letters(ctx, str, x, y, tt, t0, size) {
    const chars = Array.from(str);
    ctx.save();
    ctx.font = F.font(size, 'sans', 700);
    const ws = chars.map((c) => ctx.measureText(c).width);
    ctx.restore();
    const total = ws.reduce((a, b) => a + b, 0);
    let cx = x - total / 2;
    chars.forEach((c, i) => {
      const k = F.popIn(tt, t0 + i * 0.014, 0.38);
      if (k > 0.001 && c !== ' ') {
        F.text(ctx, c, cx + ws[i] / 2, y + (1 - Math.min(1, k)) * size * 0.3, {
          size, fill: C.lsInk, font: 'sans', weight: 700, fat: 0.012, scale: k, rot: (1 - Math.min(1, k)) * (i % 2 ? 0.3 : -0.3),
        });
      }
      cx += ws[i];
    });
  }

  function tagline(ctx, tt) {
    const t0 = B1 + BT / 2; // the 8th after beat 1
    if (tt < t0 - 1e-6) return;
    letters(ctx, 'Stop babysitting', 540, TAG_Y[0], tt, t0, 74);
    letters(ctx, 'the charts.', 540, TAG_Y[1], tt, t0 + 0.12, 74);
  }

  function button(ctx, tt) {
    const k = F.popIn(tt, B2, 0.42);
    if (k <= 0) return;
    const { x, y, w, h } = BTN;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(k, k);
    F.dropShadow(ctx, (c) => { F.rrect(c, -w / 2, -h / 2, w, h, h / 2); c.fillStyle = C.lsInk; c.fill(); }, { dy: 12, blur: 22, color: 'rgba(19,40,58,0.3)' });
    F.text(ctx, 'START FREE', -26, 2, { size: 40, fill: '#ffffff', font: 'sans', weight: 700, rounded: false, letter: 9 });
    // arrow
    const ax = w / 2 - 92;
    const nudge = tt < HOLD ? Math.max(0, Math.sin((tt - B2) * TAU * 2.4)) * 6 * (1 - seg(tt, 1.1, HOLD)) : 0;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(ax + nudge, 2); ctx.lineTo(ax + 40 + nudge, 2); ctx.moveTo(ax + 24 + nudge, -14); ctx.lineTo(ax + 40 + nudge, 2); ctx.lineTo(ax + 24 + nudge, 18); ctx.stroke();
    ctx.restore();
  }

  function siteUrl(ctx, tt) {
    const k = F.popIn(tt, B2 + 0.08, 0.45);
    if (k <= 0) return;
    // a little anticipation dip into beat 3, landing (and freezing) on it
    const dip = Math.sin(seg(tt, B3 - 0.2, B3) * Math.PI) * 0.06;
    const sx = 1 + dip, sy = 1 - dip;
    F.text(ctx, 'liquidityscan.io', 540, URL_Y, { size: 82, fill: C.lsGreenDark, font: 'sans', weight: 700, scale: k, sx, sy, fat: 0.02 });
    // underline sweep
    const p = seg(tt, B2 + 0.25, B2 + 0.6, 'outCubic');
    if (p > 0) {
      F.rrect(ctx, 540 - 300, URL_Y + 58, 600 * p, 8, 4);
      ctx.fillStyle = C.lsGreen; ctx.fill();
    }
  }

  function peekers(ctx, tt, T) {
    // Time (left) and биржа (right) peek from the bottom corners, fist-pump landing on beat 3
    const raw = seg(tt, B2 + 0.1, B2 + 0.42);
    if (raw <= 0) return;
    const up = E.outBack(raw);
    const pump = seg(tt, B3 - 0.16, B3, 'outBack');
    const sx = 1, sy = 1;
    const tx = 175, ty = lerp(2010, 1660, up);
    FILM.cast.time(ctx, {
      x: tx, y: ty, s: 0.6, rot: 0.12, sx, sy, t: T, face: 'happy',
      gloves: { r: [tx + 88 + pump * 6, ty - 20 - pump * 62] },
    });
    const bx = 905, by = lerp(2010, 1660, up);
    FILM.cast.birzha(ctx, {
      x: bx, y: by, s: 0.6, rot: -0.12, sx, sy, t: T, face: 'happy', candles: [0.6, 0.75, 0.9],
      gloves: { l: [bx - 88 - pump * 6, by - 20 - pump * 62] },
    });
    if (tt >= B3) {
      const age = tt - B3;
      F.sparkle(ctx, tx + 118, ty - 120, 22 * Math.min(1, age * 30), { color: C.lsGreen });
      F.sparkle(ctx, bx - 118, by - 120, 22 * Math.min(1, age * 30), { color: C.yellow });
    }
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const tt = Math.min(t, HOLD); // freeze: the final 0.4 s is a still poster
      const T = info.shot.start + tt;
      background(ctx, tt, T);
      F.shockRing(ctx, 540, 600, tt - 0.06, { r: 420, color: C.lsGreen2, life: 0.5, width: 10 });
      const m = mark(ctx, tt);
      crown(ctx, tt, m);
      wordmark(ctx, tt);
      tagline(ctx, tt);
      button(ctx, tt);
      siteUrl(ctx, tt);
      peekers(ctx, tt, T);
    },
  });
})();
