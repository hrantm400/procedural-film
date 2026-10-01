/*
 * 01 'vs-intro' : the fighting-game VS screen. Global T 0.000 - 1.667 (one bar, 100 frames).
 *
 * Beats (local t): 0 hop-in starts | 0.4167 both land + VS slam + flash + shake |
 *   0.8333 caption "FIGHT FOR THE TOP SPOT" | 1.25 "FIGHT!" + confetti + shake |
 *   1.4667 exit anticipation squash | 1.55 - 1.65 both leap UP out of the top of frame.
 *
 * Layers (back to front):
 *   1 split background: blue (Time) / orange (биржа) halves on a diagonal seam, scrolling stripes, floaties
 *   2 VS burst behind the centre, seam lightning
 *   3 health bars (top) + round timer
 *   4 wordmarks "Time" / "биржа"
 *   5 fighters (motion trails, gloves in guard)
 *   6 VS text, FIGHT! text, caption, confetti
 *   7 white flash
 */
(function () {
  'use strict';
  const ID = 'vs-intro';
  const FILM = window.FILM;

  const BT = 0.41667;
  const T_LAND = BT; // beat 1: land + VS
  const T_CAP = BT * 2; // beat 2: caption
  const T_FIGHT = BT * 3; // beat 3: FIGHT!
  const T_CROUCH = 1.4667; // exit anticipation
  const T_LEAP = 1.55; // leap up
  const LEAP_DUR = 0.1; // fully out of frame by t = 1.65 (last frame)

  const TIME_HOME = [300, 860];
  const BZ_HOME = [780, 1060];
  const S = 1.3;
  const R = 120 * S;

  // seam: x on the diagonal for a given y (steep diagonal through the centre)
  const seamX = (y) => 540 + (960 - y) * 0.32;

  /** fighter pose at time t: { x, y, sx, sy, rot } (y is the centre) */
  function pose(F, t, home, dir, seed) {
    const E = F.E;
    let x = home[0], y = home[1], sx = 1, sy = 1, rot = 0;
    if (t < T_LAND) {
      // hop in from the side: fast travel with an arc, stretched along the motion
      const u = t / T_LAND;
      const k = 1 - Math.pow(1 - u, 1.7);
      x = home[0] - dir * 300 * (1 - k);
      y = home[1] - Math.sin(Math.PI * u) * 150;
      const st = 0.16 * (1 - u * 0.7);
      sx = 1 + st; sy = 1 - st * 0.8;
      rot = dir * 0.18 * (1 - u) - dir * 0.08 * Math.sin(Math.PI * u);
    } else {
      // landing: squash anchored at the feet, slide-settle overshoot
      const age = t - T_LAND;
      const sq = F.squash(t, T_LAND, 0.32, 0.5);
      sx = sq[0]; sy = sq[1];
      x = home[0] + dir * 34 * Math.exp(-age * 9) * Math.sin(age * 22);
      rot = dir * 0.1 * Math.exp(-age * 8) * Math.sin(age * 20);
      // idle bob on the beat (boxer bounce)
      const bob = Math.abs(Math.sin(((t - T_LAND) / BT) * Math.PI)) * 10 * F.clamp(age * 4);
      y = home[1] - bob;
      // small squash on the FIGHT! hit
      const sq2 = F.squash(t, T_FIGHT, 0.14, 0.35);
      sx *= sq2[0]; sy *= sq2[1];
      if (t >= T_CROUCH && t < T_LEAP) {
        const c = F.E.outCubic((t - T_CROUCH) / (T_LEAP - T_CROUCH));
        sx = F.lerp(sx, 1.24, c); sy = F.lerp(sy, 0.72, c);
        rot *= 1 - c;
        y = home[1];
      } else if (t >= T_LEAP) {
        const u = F.clamp((t - T_LEAP) / LEAP_DUR);
        y = home[1] - (home[1] + R * 1.8 + 80) * Math.pow(u, 1.15);
        sx = F.lerp(0.78, 0.7, u); sy = F.lerp(1.35, 1.45, u);
        rot = 0;
      }
      // anchor the squash at the feet
      y += R * (1 - sy);
    }
    return { x, y, sx, sy, rot };
  }

  function drawFighter(F, ctx, who, t, p, o) {
    const dir = who === 'time' ? 1 : -1; // facing direction
    const bounce = Math.sin(t * 15 + (who === 'time' ? 0 : 1.7)) * 6;
    const g1 = [p.x + dir * R * 0.78, p.y + R * 0.38 + bounce];
    const g2 = [p.x + dir * R * 1.18, p.y - R * 0.08 - bounce];
    const gl = dir > 0 ? { l: g1, r: g2 } : { l: g2, r: g1 };
    const common = { x: p.x, y: p.y, s: S, sx: p.sx, sy: p.sy, rot: p.rot, t, gloves: o.noGloves ? null : gl, look: [dir * 0.6, 0.1] };
    if (o.silhouette) common.silhouette = o.silhouette;
    if (o.shadowY != null) common.shadow = o.shadowY;
    if (who === 'time') FILM.cast.time(ctx, Object.assign(common, { face: 'determined', ring: 1 }));
    else FILM.cast.birzha(ctx, Object.assign(common, { face: 'smug' }));
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const F = FILM.fx, P = F.pal, E = F.E, TAU = F.TAU;
      const t = Math.min(Math.max(tIn, 0), info.dur);
      const W = FILM.W, H = FILM.H;

      // camera shake
      const sh = F.shakeMany(t, [[T_LAND, 0.35, 26], [T_FIGHT, 0.4, 30]], 7);
      ctx.save();
      ctx.translate(sh[0], sh[1]);

      // 1 background halves -------------------------------------------------
      const seamTop = seamX(-200), seamBot = seamX(H + 200);
      ctx.save();
      F.poly(ctx, [[-300, -300], [seamTop, -200], [seamBot, H + 200], [-300, H + 300]]);
      ctx.clip();
      F.stripes(ctx, { colorA: '#3b6cff', colorB: '#4a7aff', width: 70, angle: -0.6, offset: -t * 260 });
      ctx.fillStyle = F.radGrad(ctx, 300, 860, 60, 900, [[0, 'rgba(120,220,255,0.55)'], [1, 'rgba(36,72,201,0)']]);
      ctx.fillRect(-200, -200, W + 400, H + 400);
      F.floaties(ctx, { n: 12, seed: 11, t: t + 2, colors: ['#9fd8ff', '#ffffff', '#36c6ff'], alpha: 0.5, speed: 120 });
      ctx.restore();
      ctx.save();
      F.poly(ctx, [[seamTop, -200], [W + 300, -300], [W + 300, H + 300], [seamBot, H + 200]]);
      ctx.clip();
      F.stripes(ctx, { colorA: '#ff6b2c', colorB: '#ff7a3d', width: 70, angle: -0.6, offset: t * 260 });
      ctx.fillStyle = F.radGrad(ctx, 780, 1060, 60, 900, [[0, 'rgba(255,214,90,0.6)'], [1, 'rgba(255,107,44,0)']]);
      ctx.fillRect(-200, -200, W + 400, H + 400);
      F.floaties(ctx, { n: 12, seed: 23, t: t + 5, colors: ['#ffd23f', '#ffffff', '#ff3b5c'], alpha: 0.5, speed: -120 });
      ctx.restore();

      // seam: a bright zigzag band
      const seamGlow = 0.6 + 0.4 * F.beatPulse(t, 0, 0.15);
      ctx.save();
      ctx.fillStyle = `rgba(255,255,255,${0.85 * seamGlow})`;
      const zig = [];
      for (let i = 0; i <= 24; i++) {
        const y = -200 + (i / 24) * (H + 400);
        const off = (i % 2 ? 1 : -1) * 16 * (t >= T_LAND ? 1 : 0.4);
        zig.push([seamX(y) + off, y]);
      }
      ctx.beginPath();
      zig.forEach((p, i) => (i ? ctx.lineTo(p[0] - 14, p[1]) : ctx.moveTo(p[0] - 14, p[1])));
      for (let i = zig.length - 1; i >= 0; i--) ctx.lineTo(zig[i][0] + 14, zig[i][1]);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 2 VS burst behind centre (after the slam) -----------------------------
      const vsK = F.pop(t, T_LAND, 0.22);
      const fightAge = t - T_FIGHT;
      if (vsK > 0) {
        ctx.save();
        ctx.translate(540, 960);
        ctx.rotate(t * 0.6);
        const bs = vsK * (1 + 0.04 * F.beatPulse(t, 0, 0.12));
        ctx.scale(bs, bs);
        F.burst(ctx, 0, 0, 215, 140, 14, P.yellow, { seed: 4 });
        F.burst(ctx, 0, 0, 165, 115, 14, '#ffffff', { seed: 5 });
        ctx.restore();
      }
      F.shockRing(ctx, 540, 960, t - T_LAND, { r: 520, color: '#ffffff', life: 0.45, width: 26 });
      F.shockRing(ctx, 540, 590, t - T_FIGHT, { r: 640, color: P.yellow, life: 0.5, width: 30 });

      // 3 health bars + round timer ------------------------------------------
      const hbDrop = E.outBack(F.clamp((t + 0.05) / 0.3));
      const hbY = 280 - (1 - hbDrop) * 260;
      const fl = F.beatPulse(t, T_LAND, 0.1) * (t >= T_LAND ? 1 : 0);
      F.healthBar(ctx, 96, hbY, 370, 44, 1, { color: P.timeBlue, color2: '#bfe9ff', label: 'TIME', labelColor: '#ffffff' });
      F.healthBar(ctx, 614, hbY, 370, 44, 1, { color: P.bzOrange, color2: '#ffe08a', flip: true, label: 'CHARTS', labelColor: '#ffffff' });
      // round timer badge
      ctx.save();
      ctx.translate(540, hbY + 22);
      const tb = 1 + fl * 0.12;
      ctx.scale(tb, tb);
      F.dropShadow(ctx, (c) => { F.ellipse(c, 0, 0, 58, 58); c.fillStyle = P.ink; c.fill(); }, { dy: 8, blur: 14 });
      F.ellipse(ctx, 0, 0, 48, 48); ctx.fillStyle = P.yellow; ctx.fill();
      F.text(ctx, '99', 0, 3, { size: 46, fill: P.ink, font: 'mono' });
      ctx.restore();

      // 4 wordmarks (slide in with the fighters, stay as name plates) ----------
      const wmK = E.outBack(F.clamp((t - 0.12) / 0.32));
      if (wmK > 0) {
        ctx.save();
        F.text(ctx, 'Time', 300 - (1 - wmK) * 500, 1098 + 6, { size: 92, fill: 'rgba(20,30,90,0.35)', letter: -2 });
        FILM.cast.wordmark(ctx, 'time', 300 - (1 - wmK) * 500, 1098, 92, { color: '#ffffff' });
        F.text(ctx, 'Charts', 770 + (1 - wmK) * 500, 1300 + 6, { size: 92, fill: 'rgba(120,30,10,0.35)', letter: -2 });
        FILM.cast.wordmark(ctx, 'birzha', 770 + (1 - wmK) * 500, 1300, 92, { color: '#ffffff' });
        ctx.restore();
      }

      // 5 fighters ----------------------------------------------------------
      const pt = pose(F, t, TIME_HOME, 1, 1);
      const pb = pose(F, t, BZ_HOME, -1, 2);
      const trailing = t < T_LAND || t >= T_LEAP;
      if (trailing) {
        [['time', TIME_HOME, 1, '#bfe2ff'], ['birzha', BZ_HOME, -1, '#ffe0a0']].forEach(([who, home, dir, c]) => {
          const pos = [];
          for (let k = 4; k >= 1; k--) {
            const tt = t - k * 0.022;
            if (tt < 0 || (t >= T_LEAP && tt < T_LEAP)) continue;
            pos.push(pose(F, tt, home, dir, 0));
          }
          pos.forEach((q, i) => {
            ctx.save();
            ctx.globalAlpha *= ((i + 1) / (pos.length + 1)) * 0.55;
            drawFighter(F, ctx, who, t, q, { silhouette: c, noGloves: true });
            ctx.restore();
          });
        });
      }
      const shadowOn = t < T_LEAP;
      drawFighter(F, ctx, 'birzha', t, pb, { shadowY: shadowOn ? BZ_HOME[1] + R * 1.02 : null });
      drawFighter(F, ctx, 'time', t, pt, { shadowY: shadowOn ? TIME_HOME[1] + R * 1.02 : null });
      // landing puffs
      F.puffs(ctx, TIME_HOME[0], TIME_HOME[1] + R, t - T_LAND, { n: 6, seed: 3, size: 46, spread: 170, color: '#dff1ff' });
      F.puffs(ctx, BZ_HOME[0], BZ_HOME[1] + R, t - T_LAND, { n: 6, seed: 4, size: 46, spread: 170, color: '#fff0d0' });
      // crouch / leap puffs
      F.puffs(ctx, TIME_HOME[0], TIME_HOME[1] + R, t - T_LEAP, { n: 7, seed: 8, size: 54, spread: 200, color: '#ffffff' });
      F.puffs(ctx, BZ_HOME[0], BZ_HOME[1] + R, t - T_LEAP, { n: 7, seed: 9, size: 54, spread: 200, color: '#ffffff' });
      if (t >= T_LEAP) {
        F.speedLines(ctx, { angle: -Math.PI / 2, count: 18, color: '#ffffff', alpha: 0.75, seed: 31, x: 120, y: -100, w: 360, h: 1200, len: 420, width: 8, t, speed: 5000 });
        F.speedLines(ctx, { angle: -Math.PI / 2, count: 18, color: '#ffffff', alpha: 0.75, seed: 32, x: 600, y: -100, w: 360, h: 1400, len: 420, width: 8, t, speed: 5000 });
      }

      // 6 VS / FIGHT! / caption ------------------------------------------------
      if (t >= T_LAND - 1e-6) {
        // VS slams in from huge, then gets punched away by FIGHT!
        const age = t - T_LAND;
        let sc = age < 0.1 ? F.lerp(3.2, 0.86, E.inQuad(age / 0.1)) : 0.86 + 0.14 * F.spring(age - 0.1, 2.4, 6);
        let a = 1, rot = -0.08;
        if (fightAge >= 0) {
          // FIGHT! hits: VS gets a punchy re-slam
          const sq = F.squash(t, T_FIGHT, 0.22, 0.4);
          sc *= sq[0];
        }
        if (a > 0.01) {
          sc *= 1 + 0.05 * F.beatPulse(t, 0, 0.1);
          F.text(ctx, 'VS', 540 + 8, 960 + 14, { size: 220, fill: 'rgba(27,21,48,0.35)', scale: sc, rot, alpha: a, letter: -10 });
          F.text(ctx, 'VS', 540, 960, { size: 220, fill: P.yellow, stroke: P.bzRed, lw: 14, scale: sc, rot, alpha: a, letter: -10 });
        }
      }
      if (fightAge >= -1e-6) {
        F.confettiBurst(ctx, 540, 600, fightAge, { n: 60, seed: 77, power: 1500, spread: Math.PI * 0.95, size: 22, life: 1.2 });
        const k = F.popIn(t, T_FIGHT, 0.4);
        const wob = Math.sin(fightAge * 18) * 0.03 * Math.exp(-fightAge * 4);
        const sc = (0.3 + 0.7 * k) * (1 + 0.04 * F.beatPulse(t, 0, 0.1));
        if (k > 0.001) {
          F.text(ctx, 'FIGHT!', 540 + 10, 590 + 16, { size: 170, fill: 'rgba(27,21,48,0.4)', scale: sc, rot: -0.06 + wob, letter: -4 });
          F.text(ctx, 'FIGHT!', 540, 590, { size: 170, fill: '#ffffff', stroke: P.bzRed, lw: 12, scale: sc, rot: -0.06 + wob, letter: -4 });
        }
      }
      if (t >= T_CAP - 1e-6) {
        // caption on a dark ribbon
        const rk = E.outBack(F.clamp((t - T_CAP + 1 / 60) / 0.2));
        const cap = 'FIGHT FOR THE TOP SPOT';
        let size = 64;
        const mw = F.measure(ctx, cap, size) + cap.length * 1;
        if (mw > 820) size = Math.floor(size * 820 / mw);
        ctx.save();
        ctx.translate(540, 1420);
        ctx.rotate(-0.03);
        ctx.scale(rk, 1);
        F.dropShadow(ctx, (c) => { F.rrect(c, -450, -62, 900, 124, 62); c.fillStyle = P.ink; c.fill(); }, { dy: 12, blur: 20 });
        ctx.restore();
        ctx.save();
        ctx.translate(540, 1420);
        ctx.rotate(-0.03);
        F.popLetters(ctx, cap, 0, 2, t, T_CAP + 0.03, { size, stagger: 0.012, dur: 0.35, colors: ['#ffffff', '#ffffff', P.yellow], letter: 1 });
        ctx.restore();
      }

      ctx.restore(); // shake

      // 7 white flash on the VS slam (and a lighter one on FIGHT!)
      const fA = t >= T_LAND ? Math.max(0, 1 - (t - T_LAND) / 0.14) * 0.9 : 0;
      const fB = fightAge >= 0 ? Math.max(0, 1 - fightAge / 0.1) * 0.5 : 0;
      const fa = Math.max(fA, fB);
      if (fa > 0.003) {
        ctx.save();
        ctx.globalAlpha = fa;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-200, -200, W + 400, H + 400);
        ctx.restore();
      }
      // first frame flash (downbeat whoosh)
      if (t < 0.08) {
        ctx.save();
        ctx.globalAlpha = (1 - t / 0.08) * 0.3;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-200, -200, W + 400, H + 400);
        ctx.restore();
      }
      void TAU;
    },
  });
})();
