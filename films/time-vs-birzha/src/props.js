/*
 * props.js : FILM.fx, the motion-graphics kit for "Time vs биржа" (15 s, 1080x1920, 60 fps, 144 bpm).
 * Loaded after lib.js and before cast.js, the timeline and the scenes.
 *
 * Style: playful flat motion graphics. Flat fills, NO black outlines on UI, chunky rounded shapes,
 * soft drop shadows, bright brand colours, springy easing, squash and stretch.
 *
 * Everything is a pure function of its arguments. Randomness only through FILM.fx.h01(...keys)
 * (a stable hash in 0..1). Everything animates smoothly from t (this film runs on ones at 60 fps).
 *
 *   palette   FILM.fx.pal
 *   numbers   clamp, lerp, seg(t, a, b, ease), ease (= lib.ease), h01, spring, pop, popIn, squash,
 *             shake, wobble, beatPulse, beat(n) (seconds of n beats), BEAT, BAR
 *   paths     rrect, ellipse, poly, curve, star, squircle
 *   drawing   fill(ctx, color, shadow?), dropShadow(ctx, drawFn, o), linGrad, radGrad
 *   bg        bgFill, dotGrid, floaties (drifting confetti shapes), stripes, sunburst, circleWipe
 *   effects   speedLines, focusLines, burst, sparkle, sparkles, confettiBurst, puffs, dustCloud,
 *             shockRing, impactStar, dizzyStars, sweat, anger, motionTrail
 *   text      font, text, measure, popLetters, typeOn, label
 *   UI        card, phone, statusBar, appIcon, badge, notif, tab, searchBar, cursor, spinner,
 *             progress, toggle, healthBar, chartGrid, candle, candles, crown, podium, button
 *
 * Safe area for must-read text: x 80..1000, y 220..1540 (the bottom 380 px belong to the Shorts/Reels
 * UI; keep text out of the right-hand strip x > 920 below y 1100 as well).
 */
(function () {
  'use strict';

  const FILM = window.FILM;
  const L = FILM.lib;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const h01 = (...k) => (L.hash(...k) >>> 0) / 4294967296;
  const E = L.ease;

  // ---------------------------------------------------------------------------
  // Palette
  // ---------------------------------------------------------------------------
  const pal = {
    ink: '#1b1530', ink2: '#3a3358', white: '#ffffff', paper: '#fffaf2', cream: '#fff3e2',
    lilac: '#ece6ff', mint: '#dcf7ec', sky: '#e2f0ff', peach: '#ffe5d9', lemon: '#fff3c4', blush: '#ffd6e4',
    night: '#141a33', night2: '#1e2547', night3: '#2a3366', grid: '#2b3466', gridLight: '#e4e7f5',
    // Time (the trader's time): blues
    timeBlue: '#3b6cff', timeCyan: '#36c6ff', timeDeep: '#2448c9', timeNavy: '#1d2b6b', timeTrack: '#d7e0ff',
    timeFace: '#ffffff', timeTick: '#b9c8ff', timeGlove: '#36c6ff', timeGlove2: '#1f9fe0',
    // биржа (the exchange): oranges
    bzOrange: '#ff6b2c', bzRed: '#ff3b5c', bzDeep: '#c7361d', bzYellow: '#ffc53d', bzGlove: '#ffc53d', bzGlove2: '#f39a1c',
    bzMouth: '#3a0f1f',
    // market
    up: '#22c977', down: '#ff4d5e',
    // LiquidityScan brand (from the app and liquidityscan.io)
    lsGreen: '#1fe33c', lsGreen2: '#5cea7a', lsGreenDark: '#1b7a3a', lsTealA: '#13303e', lsTealB: '#21535f',
    lsInk: '#13283a', lsSlate: '#4a5a68', lsBg: '#eef3f7', lsCard: '#ffffff', lsMint: '#dfeee5',
    // accents
    yellow: '#ffd23f', pink: '#ff6fb5', purple: '#7b5cff', green: '#22c977', red: '#ff4d5e', orange: '#ff8a3d',
    shadow: 'rgba(27,21,48,0.20)', shadowSoft: 'rgba(27,21,48,0.10)',
  };
  Object.freeze(pal);

  // ---------------------------------------------------------------------------
  // Numbers and motion
  // ---------------------------------------------------------------------------
  const BPM = 144;
  const BEAT = 60 / BPM; // 0.41667 s = 25 frames at 60 fps
  const BAR = BEAT * 4; // 1.6667 s = 100 frames
  const beat = (n) => n * BEAT;
  const seg = (t, a, b, e) => {
    const u = clamp((t - a) / (b - a || 1e-9));
    return e ? (typeof e === 'function' ? e(u) : E[e](u)) : u;
  };
  /** spring(u, freq=3, decay=6): 0 -> 1 with a damped overshoot (u in seconds-ish, any >= 0) */
  function spring(u, freq = 3, decay = 6) {
    if (u <= 0) return 0;
    return 1 - Math.exp(-decay * u) * Math.cos(freq * TAU * u);
  }
  /** pop(t, t0, dur=0.3): 0 before t0, then outBack 0 -> 1. Visible on the t0 frame. */
  function pop(t, t0, dur = 0.3) {
    if (t < t0 - 1e-6) return 0;
    return E.outBack(clamp((t - t0 + 1 / 60) / dur));
  }
  /** popIn(t, t0, dur=0.45): elastic scale 0 -> 1 (springier than pop). */
  function popIn(t, t0, dur = 0.45) {
    if (t < t0 - 1e-6) return 0;
    const u = (t - t0 + 1 / 60) / dur;
    return u >= 1 ? 1 : spring(u * 0.9, 1.6, 5.5) * Math.min(1, u * 6);
  }
  /**
   * squash(t, t0, amount=0.25, dur=0.5): [sx, sy] impact squash that springs back.
   * amount > 0 squashes (wide and short), < 0 stretches (tall and thin). [1,1] outside the window.
   */
  function squash(t, t0, amount = 0.25, dur = 0.5) {
    if (t < t0 || t > t0 + dur) return [1, 1];
    const u = (t - t0) / dur;
    const k = Math.exp(-5 * u) * Math.cos(u * TAU * 1.6) * (1 - u);
    return [1 + amount * k, 1 - amount * k];
  }
  /** shake(t, t0, dur, amp=16, seed=1): smooth decaying camera shake [dx, dy]. */
  function shake(t, t0, dur, amp = 16, seed = 1) {
    if (t < t0 || t > t0 + dur) return [0, 0];
    const k = Math.pow(1 - (t - t0) / dur, 2);
    const p1 = h01('sk', seed, 1) * TAU, p2 = h01('sk', seed, 2) * TAU;
    const x = Math.sin(t * 61 + p1) * 0.6 + Math.sin(t * 97 + p2) * 0.4;
    const y = Math.cos(t * 53 + p2) * 0.6 + Math.sin(t * 83 + p1) * 0.4;
    return [x * amp * k, y * amp * k];
  }
  /** shakeMany(t, [[t0, dur, amp], ...], seed) */
  function shakeMany(t, list, seed = 1) {
    let x = 0, y = 0;
    list.forEach((s, i) => { const d = shake(t, s[0], s[1], s[2], seed + i * 13); x += d[0]; y += d[1]; });
    return [x, y];
  }
  /** wobble(t, freq, amp, seed): smooth sine wobble. */
  const wobble = (t, freq = 1, amp = 1, seed = 0) => Math.sin(t * freq * TAU + h01('wb', seed) * TAU) * amp;
  /** beatPulse(t, offset=0, decay=0.12): 1 on every beat (relative to offset) decaying to 0. */
  function beatPulse(t, offset = 0, decay = 0.12) {
    const u = (((t - offset) % BEAT) + BEAT) % BEAT;
    return Math.exp(-u / decay);
  }

  // ---------------------------------------------------------------------------
  // Paths and fills
  // ---------------------------------------------------------------------------
  function rrect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function ellipse(ctx, x, y, rx, ry, rot = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
  }
  function poly(ctx, pts, closed = true) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (closed) ctx.closePath();
  }
  /** smooth curve through points (quadratic midpoints) */
  function curve(ctx, pts, closed = true) {
    const n = pts.length;
    ctx.beginPath();
    if (n < 3) { poly(ctx, pts, closed); return; }
    if (closed) {
      ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
      for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[(i + 1) % n];
        ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
      }
      ctx.closePath();
    } else {
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < n - 1; i++) {
        const p = pts[i], q = pts[i + 1];
        ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
      }
      ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
    }
  }
  function star(ctx, cx, cy, rOut, rIn, n, rot = -Math.PI / 2) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? rIn : rOut;
      const a = rot + (i / (n * 2)) * TAU;
      if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
  }
  /** squircle (superellipse-ish rounded square) centred at (cx, cy), half-size r, roundness k (0.5..0.9) */
  function squircle(ctx, cx, cy, r, k = 0.62) {
    rrect(ctx, cx - r, cy - r, r * 2, r * 2, r * k);
  }
  /** fill the current path; o.shadow draws an offset soft copy first ({ dx, dy, color, blur }) */
  function fill(ctx, color) {
    ctx.fillStyle = color;
    ctx.fill();
  }
  /**
   * dropShadow(ctx, draw, o{ dx=0, dy=14, blur=24, color }): runs draw(ctx) once with a canvas shadow.
   * Cheap enough for cards and characters; avoid on full-frame shapes.
   */
  function dropShadow(ctx, draw, o = {}) {
    ctx.save();
    ctx.shadowColor = o.color || pal.shadow;
    ctx.shadowBlur = (o.blur == null ? 24 : o.blur) * (FILM.S || 1);
    ctx.shadowOffsetX = (o.dx || 0) * (FILM.S || 1);
    ctx.shadowOffsetY = (o.dy == null ? 14 : o.dy) * (FILM.S || 1);
    draw(ctx);
    ctx.restore();
  }
  function linGrad(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((c, i) => g.addColorStop(Array.isArray(c) ? c[0] : i / (stops.length - 1), Array.isArray(c) ? c[1] : c));
    return g;
  }
  function radGrad(ctx, x, y, r0, r1, stops) {
    const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach((c, i) => g.addColorStop(Array.isArray(c) ? c[0] : i / (stops.length - 1), Array.isArray(c) ? c[1] : c));
    return g;
  }

  // ---------------------------------------------------------------------------
  // Backgrounds
  // ---------------------------------------------------------------------------
  /** bgFill(ctx, color | [top, bottom]): fills the whole frame (with margin for camera shake). */
  function bgFill(ctx, c) {
    ctx.save();
    ctx.fillStyle = Array.isArray(c) ? linGrad(ctx, 0, 0, 0, FILM.H, c) : c;
    ctx.fillRect(-200, -200, FILM.W + 400, FILM.H + 400);
    ctx.restore();
  }
  /** dotGrid(ctx, o{ step, r, color, ox, oy }): subtle dot pattern over the frame. */
  function dotGrid(ctx, o = {}) {
    const st = o.step || 54, r = o.r || 3.2;
    const ox = (((o.ox || 0) % st) + st) % st, oy = (((o.oy || 0) % st) + st) % st;
    ctx.save();
    ctx.fillStyle = o.color || 'rgba(27,21,48,0.07)';
    ctx.beginPath();
    for (let y = -st + oy; y < FILM.H + st; y += st) {
      for (let x = -st + ox; x < FILM.W + st; x += st) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
    }
    ctx.fill();
    ctx.restore();
  }
  /**
   * floaties(ctx, o{ n, seed, t, colors, x, y, w, h, size, speed, alpha }): classic motion-graphics
   * confetti drifting slowly: circles, rings, plus signs, squiggles, triangles, half-moons.
   */
  function floaties(ctx, o = {}) {
    const n = o.n || 18, seed = o.seed || 5, t = o.t || 0;
    const x0 = o.x || 0, y0 = o.y || 0, w = o.w || FILM.W, h = o.h || FILM.H;
    const cols = o.colors || [pal.yellow, pal.pink, pal.purple, pal.timeCyan, pal.bzOrange, pal.green];
    const sz = o.size || 26, sp = o.speed == null ? 30 : o.speed;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < n; i++) {
      const kind = Math.floor(h01('fk', seed, i) * 6);
      const s = sz * (0.6 + h01('fs', seed, i) * 0.9);
      const px = x0 + ((h01('fx', seed, i) * w + Math.sin(t * 0.7 + i) * 18) % w + w) % w;
      const py = y0 + (((h01('fy', seed, i) * h - t * sp * (0.5 + h01('fv', seed, i))) % h) + h) % h;
      const rot = h01('fr', seed, i) * TAU + t * (h01('fw', seed, i) - 0.5) * 2.4;
      const c = cols[i % cols.length];
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
      ctx.fillStyle = c;
      ctx.strokeStyle = c;
      ctx.lineWidth = s * 0.28;
      if (kind === 0) { ctx.beginPath(); ctx.arc(0, 0, s * 0.45, 0, TAU); ctx.fill(); }
      else if (kind === 1) { ctx.beginPath(); ctx.arc(0, 0, s * 0.42, 0, TAU); ctx.stroke(); }
      else if (kind === 2) { ctx.beginPath(); ctx.moveTo(-s * 0.45, 0); ctx.lineTo(s * 0.45, 0); ctx.moveTo(0, -s * 0.45); ctx.lineTo(0, s * 0.45); ctx.stroke(); }
      else if (kind === 3) { ctx.beginPath(); for (let k = 0; k <= 12; k++) { const u = k / 12; ctx.lineTo(-s * 0.7 + u * s * 1.4, Math.sin(u * TAU * 1.5) * s * 0.22); } ctx.stroke(); }
      else if (kind === 4) { poly(ctx, [[0, -s * 0.5], [s * 0.45, s * 0.35], [-s * 0.45, s * 0.35]]); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(0, 0, s * 0.45, 0, Math.PI); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
  }
  /** stripes(ctx, o{ colorA, colorB, width, angle, offset }): diagonal stripes over the frame. */
  function stripes(ctx, o = {}) {
    const w = o.width || 80, ang = o.angle == null ? -0.5 : o.angle, off = o.offset || 0;
    ctx.save();
    ctx.fillStyle = o.colorA || pal.lemon;
    ctx.fillRect(-200, -200, FILM.W + 400, FILM.H + 400);
    ctx.translate(FILM.W / 2, FILM.H / 2);
    ctx.rotate(ang);
    ctx.fillStyle = o.colorB || pal.cream;
    const D = 2400;
    const o2 = ((off % (w * 2)) + w * 2) % (w * 2);
    ctx.beginPath();
    for (let x = -D - w * 2 + o2; x < D; x += w * 2) ctx.rect(x, -D, w, D * 2);
    ctx.fill();
    ctx.restore();
  }
  /** sunburst(ctx, cx, cy, o{ rays, colorA (null = no base fill), colorB, rot, r }) */
  function sunburst(ctx, cx, cy, o = {}) {
    const n = o.rays || 20, r = o.r || 2600, rot = o.rot || 0;
    ctx.save();
    if (o.colorA !== null) { ctx.fillStyle = o.colorA || pal.lemon; ctx.fillRect(-200, -200, FILM.W + 400, FILM.H + 400); }
    ctx.fillStyle = o.colorB || pal.yellow;
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a0 = rot + (i / n) * TAU, a1 = a0 + (TAU / n) * 0.5;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
      ctx.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }
  /**
   * circleWipe(ctx, cx, cy, p, color, o{ rings }): a growing filled circle (p 0..1 covers the frame).
   * o.rings: list of extra colours drawn as leading rings (playful layered wipe).
   */
  function circleWipe(ctx, cx, cy, p, color, o = {}) {
    if (p <= 0) return;
    const R = Math.hypot(Math.max(cx, FILM.W - cx), Math.max(cy, FILM.H - cy)) + 40;
    const rings = o.rings || [];
    ctx.save();
    rings.forEach((c, i) => {
      const pp = clamp(p * (1 + (rings.length - i) * 0.12));
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(cx, cy, E.inOutCubic(pp) * R, 0, TAU); ctx.fill();
    });
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, E.inOutCubic(clamp(p)) * R, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  /** speedLines(ctx, o{ angle, count, color, alpha, seed, x, y, w, h, len, width, t, speed }) */
  function speedLines(ctx, o = {}) {
    const n = o.count || 30, seed = o.seed || 3;
    const x = o.x == null ? -100 : o.x, y = o.y == null ? -100 : o.y, w = o.w || FILM.W + 200, h = o.h || FILM.H + 200;
    const ang = o.angle || 0, t = o.t || 0, speed = o.speed == null ? 2600 : o.speed;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const diag = Math.hypot(w, h), cx = x + w / 2, cy = y + h / 2;
    ctx.save();
    ctx.globalAlpha *= o.alpha == null ? 0.8 : o.alpha;
    ctx.strokeStyle = o.color || '#ffffff';
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const off = (h01('sl', seed, i) - 0.5) * diag;
      const len = (o.len || 360) * (0.4 + h01('sll', seed, i) * 1.2);
      const period = diag + len;
      const along = (((h01('slp', seed, i) * period + t * speed * (0.7 + h01('sls', seed, i) * 0.6)) % period) + period) % period - period / 2;
      const px = cx + ca * along - sa * off, py = cy + sa * along + ca * off;
      ctx.lineWidth = (o.width || 6) * (0.5 + h01('slw', seed, i));
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - ca * len, py - sa * len); ctx.stroke();
    }
    ctx.restore();
  }
  /** focusLines(ctx, cx, cy, o{ inner, count, color, alpha, seed, width, t }): thin radial lines around a clear centre. */
  function focusLines(ctx, cx, cy, o = {}) {
    const n = o.count || 60, seed = o.seed || 7, inner = o.inner || 300, R = 2400;
    const t = o.t || 0;
    ctx.save();
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    ctx.fillStyle = o.color || pal.ink;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + h01('fl', seed, i) * 0.08;
      const k = 1 + (0.5 + 0.5 * Math.sin(t * 9 + i * 1.7)) * 0.35 + h01('fr', seed, i) * 0.4;
      const w = (o.width || 12) * (0.4 + h01('fw', seed, i));
      const x0 = cx + Math.cos(a) * inner * k, y0 = cy + Math.sin(a) * inner * k;
      const px = -Math.sin(a) * w * 0.5, py = Math.cos(a) * w * 0.5;
      ctx.moveTo(x0, y0);
      ctx.lineTo(cx + Math.cos(a) * R + px, cy + Math.sin(a) * R + py);
      ctx.lineTo(cx + Math.cos(a) * R - px, cy + Math.sin(a) * R - py);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }
  /** burst(ctx, cx, cy, rOut, rIn, spikes, color, o{ rot, seed, jitter, t }): jagged impact star (flat, no outline). */
  function burst(ctx, cx, cy, rOut, rIn, spikes, color, o = {}) {
    const seed = o.seed || 9, j = o.jitter == null ? 0.18 : o.jitter;
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const out = i % 2 === 0;
      const r = (out ? rOut : rIn) * (1 + (h01('bu', seed, i) - 0.5) * j);
      const a = (i / (spikes * 2)) * TAU + (o.rot || 0);
      if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }
  /** sparkle(ctx, x, y, r, o{ color, rot }): 4-point twinkle. */
  function sparkle(ctx, x, y, r, o = {}) {
    if (r <= 0.5) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(o.rot || 0);
    ctx.fillStyle = o.color || '#ffffff';
    ctx.beginPath();
    const k = 0.18;
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * k, -r * k, r, 0);
    ctx.quadraticCurveTo(r * k, r * k, 0, r);
    ctx.quadraticCurveTo(-r * k, r * k, -r, 0);
    ctx.quadraticCurveTo(-r * k, -r * k, 0, -r);
    ctx.fill();
    ctx.restore();
  }
  /** sparkles(ctx, o{ x, y, w, h, n, seed, t, colors, size, period }): twinkles appearing and fading. */
  function sparkles(ctx, o = {}) {
    const n = o.n || 10, seed = o.seed || 17, t = o.t || 0;
    const x0 = o.x || 0, y0 = o.y || 0, w = o.w || FILM.W, h = o.h || FILM.H;
    const cols = o.colors || ['#ffffff', pal.yellow];
    for (let i = 0; i < n; i++) {
      const per = (o.period || 0.9) * (0.7 + h01('spp', seed, i) * 0.6);
      const ph = ((t / per + h01('spo', seed, i)) % 1 + 1) % 1;
      const cyc = Math.floor(t / per + h01('spo', seed, i));
      const px = x0 + h01('spx', seed, i, cyc) * w, py = y0 + h01('spy', seed, i, cyc) * h;
      const r = (o.size || 22) * (0.5 + h01('spr', seed, i)) * Math.sin(ph * Math.PI);
      sparkle(ctx, px, py, r, { color: cols[i % cols.length], rot: ph * 0.8 });
    }
  }
  /**
   * confettiBurst(ctx, x, y, age, o{ n, seed, colors, spread, power, gravity, life, size, up }):
   * paper confetti flying out from a point (age = seconds since the burst).
   */
  function confettiBurst(ctx, x, y, age, o = {}) {
    const life = o.life || 1.6;
    if (age < 0 || age > life) return;
    const n = o.n || 40, seed = o.seed || 11, g = o.gravity == null ? 1500 : o.gravity;
    const cols = o.colors || [pal.yellow, pal.pink, pal.purple, pal.timeCyan, pal.bzOrange, pal.green];
    const fade = clamp((life - age) / 0.35);
    ctx.save();
    for (let i = 0; i < n; i++) {
      const spread = o.spread == null ? Math.PI * 0.9 : o.spread;
      const a = (o.up === false ? 0 : -Math.PI / 2) + (h01('cf', seed, i) - 0.5) * spread * 2;
      const v = (o.power || 1100) * (0.45 + h01('cv', seed, i) * 0.75);
      const drag = Math.exp(-age * 1.6);
      const dist = (v * (1 - drag)) / 1.6;
      const px = x + Math.cos(a) * dist + Math.sin(age * 6 + i) * 10;
      const py = y + Math.sin(a) * dist + 0.5 * g * age * age * 0.45;
      const s = (o.size || 16) * (0.7 + h01('cs', seed, i) * 0.6);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(age * 8 * (h01('cr', seed, i) - 0.5) + i);
      ctx.scale(1, Math.cos(age * 9 + i * 1.3));
      ctx.globalAlpha *= fade;
      ctx.fillStyle = cols[i % cols.length];
      if (i % 3 === 0) { ctx.beginPath(); ctx.arc(0, 0, s * 0.45, 0, TAU); ctx.fill(); }
      else ctx.fillRect(-s * 0.5, -s * 0.3, s, s * 0.6);
      ctx.restore();
    }
    ctx.restore();
  }
  /** puffs(ctx, x, y, age, o{ n, seed, size, color, spread, life, dir }): round dust puffs (landing, skids). */
  function puffs(ctx, x, y, age, o = {}) {
    const life = o.life || 0.6;
    if (age < 0 || age > life) return;
    const u = age / life;
    const n = o.n || 6, seed = o.seed || 5, sz = o.size || 40, sp = o.spread || 140;
    ctx.save();
    ctx.fillStyle = o.color || '#ffffff';
    ctx.globalAlpha *= 1 - u;
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (i / Math.max(1, n - 1)) * Math.PI + (h01('pf', seed, i) - 0.5) * 0.3 + (o.dir || 0);
      const d = sp * E.outCubic(u) * (0.6 + h01('pd', seed, i) * 0.6);
      const r = sz * (0.4 + 0.8 * E.outCubic(u)) * (0.7 + h01('pr', seed, i) * 0.6) * (1 - u * 0.4);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.45 - u * 20, r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  /**
   * dustCloud(ctx, x, y, r, t, o{ seed, color, shade, pops }): the cartoon brawl cloud: churning
   * overlapping circles with random bits popping out of it (pops: list of draw fns (ctx, k) called
   * at the rim, cycling). Draw the fighters' limbs/props through o.pops for the classic gag.
   */
  function dustCloud(ctx, x, y, r, t, o = {}) {
    const seed = o.seed || 21, n = 14;
    ctx.save();
    // shadow
    ctx.fillStyle = pal.shadowSoft;
    ellipse(ctx, x, y + r * 0.95, r * 1.1, r * 0.2); ctx.fill();
    // pops behind the cloud
    const pops = o.pops || [];
    if (pops.length) {
      for (let i = 0; i < 5; i++) {
        const per = 0.42;
        const u = ((t / per + i / 5) % 1 + 1) % 1;
        const cyc = Math.floor(t / per + i / 5);
        const a = h01('dp', seed, i, cyc) * TAU;
        const d = r * (0.75 + Math.sin(u * Math.PI) * 0.45);
        ctx.save();
        ctx.translate(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85);
        ctx.rotate(a + Math.PI / 2);
        ctx.globalAlpha *= Math.sin(u * Math.PI);
        pops[(i + cyc) % pops.length](ctx, u);
        ctx.restore();
      }
    }
    // cloud body
    const layer = (scale, color, ph) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + Math.sin(t * 3 + i) * 0.15 + ph;
        const d = r * scale * (0.62 + 0.12 * Math.sin(t * 11 + i * 2.1));
        const cr = r * scale * (0.42 + 0.1 * Math.sin(t * 13 + i * 1.3 + ph));
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.8;
        ctx.moveTo(px + cr, py);
        ctx.arc(px, py, cr, 0, TAU);
      }
      ctx.moveTo(x + r * scale * 0.7, y);
      ctx.arc(x, y, r * scale * 0.7, 0, TAU);
      ctx.fill();
    };
    layer(1, o.shade || '#e9e2f5', 0.3);
    layer(0.9, o.color || '#ffffff', 0);
    ctx.restore();
  }
  /** shockRing(ctx, x, y, age, o{ r, color, life, width, squash }): expanding ring. */
  function shockRing(ctx, x, y, age, o = {}) {
    const life = o.life || 0.45;
    if (age < 0 || age > life) return;
    const u = age / life;
    const r = (o.r || 260) * E.outCubic(u);
    ctx.save();
    ctx.globalAlpha *= 1 - u;
    ctx.strokeStyle = o.color || '#ffffff';
    ctx.lineWidth = (o.width || 18) * (1 - u * 0.7);
    ellipse(ctx, x, y, r, r * (o.squash || 1));
    ctx.stroke();
    ctx.restore();
  }
  /**
   * impactStar(ctx, x, y, t, t0, o{ word, size, color, color2, textColor, rot, life }): comic "POW!"
   * star that pops at t0 and fades after life (default 0.5 s).
   */
  function impactStar(ctx, x, y, t, t0, o = {}) {
    const life = o.life || 0.5;
    if (t < t0 - 1e-6 || t > t0 + life) return;
    const age = t - t0;
    const sc = pop(t, t0, 0.18) * (1 + age * 0.15);
    const a = clamp((life - age) / 0.15);
    const size = o.size || 150;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(o.rot == null ? -0.12 : o.rot);
    ctx.scale(sc, sc);
    ctx.globalAlpha *= a;
    burst(ctx, 0, 0, size, size * 0.62, 11, o.color2 || pal.ink, { seed: o.seed || 3 });
    burst(ctx, 0, 0, size * 0.86, size * 0.52, 11, o.color || pal.yellow, { seed: (o.seed || 3) + 1 });
    if (o.word) text(ctx, o.word, 0, 4, { size: size * 0.42, fill: o.textColor || pal.ink, rot: 0 });
    ctx.restore();
  }
  /** dizzyStars(ctx, x, y, t, o{ r, n, color }): little stars orbiting a head. */
  function dizzyStars(ctx, x, y, t, o = {}) {
    const n = o.n || 3, r = o.r || 90;
    for (let i = 0; i < n; i++) {
      const a = t * 5 + (i / n) * TAU;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.32;
      ctx.save();
      ctx.fillStyle = o.color || pal.yellow;
      star(ctx, px, py, 16, 7, 5, a);
      ctx.fill();
      ctx.restore();
    }
  }
  /** sweat(ctx, x, y, s, o{ flip }): sweat drop, tip up. */
  function sweat(ctx, x, y, s = 1, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(o.flip ? -s : s, s);
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.bezierCurveTo(8, -18, 18, -4, 18, 8);
    ctx.arc(0, 8, 18, 0, Math.PI);
    ctx.bezierCurveTo(-18, -4, -8, -18, 0, -34);
    ctx.closePath();
    ctx.fillStyle = '#9fdcff';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ellipse(ctx, 6, 6, 4, 7, -0.3); ctx.fill();
    ctx.restore();
  }
  /** anger(ctx, x, y, s, o{ color }): anger mark (four curved ticks). */
  function anger(ctx, x, y, s = 1, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = o.color || pal.red;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate(i * Math.PI / 2 + Math.PI / 4);
      ctx.beginPath(); ctx.moveTo(6, -14); ctx.quadraticCurveTo(6, -6, 16, -6); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  /**
   * motionTrail(ctx, draw, positions, o{ alpha }): calls draw(ctx, x, y, k) for ghost copies along
   * positions (oldest first), fading in. Use for smears behind fast moves.
   */
  function motionTrail(ctx, draw, positions, o = {}) {
    const n = positions.length;
    positions.forEach((p, i) => {
      ctx.save();
      ctx.globalAlpha *= ((i + 1) / (n + 1)) * (o.alpha == null ? 0.5 : o.alpha);
      draw(ctx, p[0], p[1], i / n);
      ctx.restore();
    });
  }

  // ---------------------------------------------------------------------------
  // Text
  // ---------------------------------------------------------------------------
  const FONTS = {
    bold: '"DejaVu Sans", "Liberation Sans", Arial, sans-serif',
    sans: '"Liberation Sans", "DejaVu Sans", Arial, sans-serif',
    mono: '"DejaVu Sans Mono", "Liberation Mono", monospace',
    emoji: '"Noto Color Emoji", "DejaVu Sans", sans-serif',
  };
  /** font(size, family='bold', weight=700) */
  function font(size, family = 'bold', weight = 700) {
    return `${weight} ${Math.round(size)}px ${FONTS[family] || family}`;
  }
  /**
   * text(ctx, str, x, y, o{ size, fill, stroke, lw, align, baseline, rot, scale, sx, sy, alpha,
   *   font, weight, letter, shadow (px offset), shadowColor, rounded (default true), lineHeight }):
   * bold display text, centred by default. rounded=true fattens the letters with a round-joined
   * stroke in the fill colour (the chunky playful look). stroke/lw add an outline in another colour.
   * Multi-line with '\n'. Returns { w, h }.
   */
  function text(ctx, str, x, y, o = {}) {
    const size = o.size || 60;
    const lines = String(str).split('\n');
    const lh = size * (o.lineHeight || 1.1);
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    const sc = o.scale == null ? 1 : o.scale;
    ctx.scale(sc * (o.sx || 1), sc * (o.sy || 1));
    if (o.alpha != null) ctx.globalAlpha *= clamp(o.alpha);
    ctx.font = font(size, o.font || 'bold', o.weight || 700);
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.baseline || 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (o.letter || 0) + 'px';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    let maxW = 0;
    const fat = o.rounded === false ? 0 : size * (o.fat == null ? 0.035 : o.fat);
    lines.forEach((ln, i) => {
      const ly = (i - (lines.length - 1) / 2) * lh;
      maxW = Math.max(maxW, ctx.measureText(ln).width);
      if (o.shadow) {
        const off = typeof o.shadow === 'number' ? o.shadow : size * 0.08;
        ctx.fillStyle = ctx.strokeStyle = o.shadowColor || pal.shadow;
        ctx.lineWidth = fat * 2 + (o.lw || 0) * 2;
        if (ctx.lineWidth > 0) ctx.strokeText(ln, off * 0.3, ly + off);
        ctx.fillText(ln, off * 0.3, ly + off);
      }
      if (o.stroke && o.lw) {
        ctx.strokeStyle = o.stroke;
        ctx.lineWidth = fat * 2 + o.lw * 2;
        ctx.strokeText(ln, 0, ly);
      }
      ctx.fillStyle = o.fill || pal.ink;
      if (fat > 0) {
        ctx.strokeStyle = o.fill || pal.ink;
        ctx.lineWidth = fat * 2;
        ctx.strokeText(ln, 0, ly);
      }
      ctx.fillText(ln, 0, ly);
    });
    ctx.restore();
    return { w: maxW + fat * 2, h: lh * lines.length };
  }
  /** measure(ctx, str, size, family, weight) -> width (widest line, including the rounded fattening) */
  function measure(ctx, str, size, family = 'bold', weight = 700) {
    ctx.save();
    ctx.font = font(size, family, weight);
    let w = 0;
    String(str).split('\n').forEach((ln) => { w = Math.max(w, ctx.measureText(ln).width); });
    ctx.restore();
    return w + size * 0.07;
  }
  /**
   * popLetters(ctx, str, x, y, t, t0, o{ size, fill, stagger (s per letter, default 0.035), dur,
   *   align, colors (array cycles per letter), wave (amp px), font, rot, shadow }): kinetic type, each
   * letter pops in with an elastic overshoot, staggered. Single line. Returns total width.
   */
  function popLetters(ctx, str, x, y, t, t0, o = {}) {
    const size = o.size || 90;
    const chars = Array.from(String(str));
    ctx.save();
    ctx.font = font(size, o.font || 'bold', o.weight || 700);
    const widths = chars.map((c) => ctx.measureText(c).width);
    ctx.restore();
    const total = widths.reduce((a, b) => a + b, 0) + (o.letter || 0) * (chars.length - 1);
    let cx = (o.align === 'left' ? x : o.align === 'right' ? x - total : x - total / 2);
    const st = o.stagger == null ? 0.035 : o.stagger;
    chars.forEach((c, i) => {
      const w = widths[i];
      const k = popIn(t, t0 + i * st, o.dur || 0.45);
      if (k > 0.001 && c !== ' ') {
        const wave = o.wave ? Math.sin(t * 6 - i * 0.6) * o.wave : 0;
        text(ctx, c, cx + w / 2, y + wave + (1 - Math.min(1, k)) * size * 0.25, {
          size, fill: o.colors ? o.colors[i % o.colors.length] : o.fill || pal.ink, scale: k, font: o.font,
          rot: (o.rot || 0) + (1 - Math.min(1, k)) * (i % 2 ? 0.3 : -0.3), shadow: o.shadow, shadowColor: o.shadowColor,
          stroke: o.stroke, lw: o.lw,
        });
      }
      cx += w + (o.letter || 0);
    });
    return total;
  }
  /** typeOn(str, t, t0, cps=24): the visible prefix of str when typing at cps chars per second. */
  function typeOn(str, t, t0, cps = 24) {
    if (t < t0) return '';
    const n = Math.floor((t - t0) * cps + 1e-6);
    return Array.from(String(str)).slice(0, n).join('');
  }
  /** label(ctx, str, x, y, o{ size, bg, color, pad, r, align, alpha }): pill label (UI chip). Returns box. */
  function label(ctx, str, x, y, o = {}) {
    const size = o.size || 34;
    const pad = o.pad == null ? size * 0.6 : o.pad;
    const w = measure(ctx, str, size, o.font || 'bold') + pad * 2, h = size * 1.6;
    const x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    rrect(ctx, x0, y - h / 2, w, h, o.r == null ? h / 2 : o.r);
    ctx.fillStyle = o.bg || pal.ink;
    ctx.fill();
    text(ctx, str, x0 + w / 2, y + 1, { size, fill: o.color || '#ffffff', font: o.font, rounded: o.rounded });
    ctx.restore();
    return { x: x0, y: y - h / 2, w, h };
  }

  // ---------------------------------------------------------------------------
  // UI kit (flat, rounded, soft shadows)
  // ---------------------------------------------------------------------------
  /** card(ctx, x, y, w, h, o{ r, fill, shadow (true), shadowDy, border }) : top-left at (x, y) */
  function card(ctx, x, y, w, h, o = {}) {
    const r = o.r == null ? 36 : o.r;
    const draw = (c) => { rrect(c, x, y, w, h, r); c.fillStyle = o.fill || '#ffffff'; c.fill(); };
    if (o.shadow === false) draw(ctx);
    else dropShadow(ctx, draw, { dy: o.shadowDy == null ? 16 : o.shadowDy, blur: o.blur == null ? 30 : o.blur, color: o.shadowColor });
    if (o.border) { rrect(ctx, x, y, w, h, r); ctx.strokeStyle = o.border; ctx.lineWidth = o.borderW || 3; ctx.stroke(); }
  }
  /**
   * phone(ctx, cx, cy, w, h, o{ body, screenBg, screen(ctx, sw, sh), island, shadow, rot }): modern
   * phone centred at (cx, cy). The screen callback draws in screen-local coordinates (0,0 top-left,
   * sw x sh) clipped to the rounded screen. Returns { sx, sy, sw, sh } of the screen in world coords.
   */
  function phone(ctx, cx, cy, w, h, o = {}) {
    const x = cx - w / 2, y = cy - h / 2;
    const r = w * 0.15, bez = w * 0.04;
    ctx.save();
    if (o.rot) { ctx.translate(cx, cy); ctx.rotate(o.rot); ctx.translate(-cx, -cy); }
    // side buttons
    ctx.fillStyle = o.buttons || '#2a2440';
    rrect(ctx, x - 7, y + h * 0.2, 10, h * 0.08, 4); ctx.fill();
    rrect(ctx, x - 7, y + h * 0.31, 10, h * 0.08, 4); ctx.fill();
    rrect(ctx, x + w - 3, y + h * 0.25, 10, h * 0.12, 4); ctx.fill();
    const body = (c) => { rrect(c, x, y, w, h, r); c.fillStyle = o.body || '#2a2440'; c.fill(); };
    if (o.shadow === false) body(ctx); else dropShadow(ctx, body, { dy: 30, blur: 60 });
    const sx = x + bez, sy = y + bez, sw = w - bez * 2, sh = h - bez * 2;
    ctx.save();
    rrect(ctx, sx, sy, sw, sh, r - bez * 0.8);
    ctx.clip();
    ctx.fillStyle = o.screenBg || pal.sky;
    ctx.fillRect(sx, sy, sw, sh);
    if (o.screen) { ctx.translate(sx, sy); o.screen(ctx, sw, sh); }
    ctx.restore();
    if (o.island !== false) { rrect(ctx, cx - w * 0.15, sy + sw * 0.035, w * 0.3, sw * 0.08, sw * 0.04); ctx.fillStyle = '#0d0b16'; ctx.fill(); }
    ctx.restore();
    return { sx, sy, sw, sh };
  }
  /** statusBar(ctx, sw, o{ time='9:41', color, size }): status bar in screen-local coords. */
  function statusBar(ctx, sw, o = {}) {
    const sz = o.size || sw * 0.045, col = o.color || pal.ink;
    const y = sw * 0.075;
    text(ctx, o.time || '9:41', sw * 0.16, y, { size: sz, fill: col, rounded: false, font: 'sans' });
    ctx.save();
    ctx.fillStyle = col;
    // signal bars
    for (let i = 0; i < 4; i++) { rrect(ctx, sw * 0.7 + i * sz * 0.32, y + sz * 0.3 - i * sz * 0.16 - sz * 0.2, sz * 0.2, sz * 0.25 + i * sz * 0.16, 2); ctx.fill(); }
    // battery
    rrect(ctx, sw * 0.82, y - sz * 0.32, sz * 1.15, sz * 0.62, sz * 0.15); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
    rrect(ctx, sw * 0.82 + 4, y - sz * 0.32 + 4, (sz * 1.15 - 8) * (o.battery == null ? 0.8 : o.battery), sz * 0.62 - 8, sz * 0.1); ctx.fill();
    ctx.restore();
  }
  /**
   * appIcon(ctx, cx, cy, size, o{ bg, bg2, glyph(ctx, size), label, labelColor, labelSize, badge,
   *   shadow }): squircle app icon centred at (cx, cy) with optional label under it and a red badge.
   */
  function appIcon(ctx, cx, cy, size, o = {}) {
    const r = size / 2;
    const draw = (c) => { squircle(c, cx, cy, r, 0.46); c.fillStyle = o.bg2 ? linGrad(c, cx, cy - r, cx, cy + r, [o.bg || pal.purple, o.bg2]) : o.bg || pal.purple; c.fill(); };
    if (o.shadow) dropShadow(ctx, draw, { dy: 8, blur: 16 }); else draw(ctx);
    if (o.glyph) { ctx.save(); ctx.translate(cx, cy); o.glyph(ctx, size); ctx.restore(); }
    if (o.label) text(ctx, o.label, cx, cy + r + (o.labelSize || size * 0.2) * 0.95, { size: o.labelSize || size * 0.2, fill: o.labelColor || pal.ink, rounded: false, font: 'sans', weight: 400 });
    if (o.badge) badge(ctx, cx + r * 0.82, cy - r * 0.82, o.badge, { size: size * 0.2 });
  }
  /** badge(ctx, x, y, str, o{ size, bg, color }): red notification badge. */
  function badge(ctx, x, y, str, o = {}) {
    const size = o.size || 30;
    const w = Math.max(size * 1.5, measure(ctx, String(str), size) + size * 0.5), h = size * 1.5;
    rrect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fillStyle = o.bg || '#ff3b30';
    ctx.fill();
    text(ctx, String(str), x, y + 1, { size, fill: o.color || '#ffffff', rounded: false });
  }
  /**
   * notif(ctx, x, y, w, o{ icon(ctx, size), app, title, body, time, dark, h, alpha }): notification
   * banner, top-left at (x, y). Returns its height.
   */
  function notif(ctx, x, y, w, o = {}) {
    const h = o.h || w * 0.24;
    const dark = !!o.dark;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    card(ctx, x, y, w, h, { r: h * 0.28, fill: dark ? 'rgba(40,36,64,0.94)' : 'rgba(255,255,255,0.97)', shadowDy: 10, blur: 24 });
    const isz = h * 0.5;
    const ix = x + h * 0.18 + isz / 2, iy = y + h / 2;
    if (o.icon) { ctx.save(); ctx.translate(ix, iy); o.icon(ctx, isz); ctx.restore(); }
    const tx = x + h * 0.18 + isz + h * 0.16;
    const fg = dark ? '#ffffff' : pal.ink, fg2 = dark ? 'rgba(255,255,255,0.7)' : 'rgba(27,21,48,0.62)';
    const ts = h * 0.19;
    if (o.app) text(ctx, o.app.toUpperCase(), tx, y + h * 0.25, { size: ts * 0.75, fill: fg2, align: 'left', rounded: false, font: 'sans' });
    if (o.time) text(ctx, o.time, x + w - h * 0.2, y + h * 0.25, { size: ts * 0.75, fill: fg2, align: 'right', rounded: false, font: 'sans', weight: 400 });
    if (o.title) text(ctx, o.title, tx, y + h * 0.5, { size: ts, fill: fg, align: 'left', rounded: false });
    if (o.body) text(ctx, o.body, tx, y + h * 0.75, { size: ts * 0.86, fill: fg2, align: 'left', rounded: false, font: 'sans', weight: 400 });
    ctx.restore();
    return h;
  }
  /** tab(ctx, x, y, w, h, o{ label, active, icon(ctx, s), close, bg, activeBg, color }): browser tab, top-left (x, y). */
  function tab(ctx, x, y, w, h, o = {}) {
    const r = h * 0.3;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w + r, y + h);
    ctx.closePath();
    ctx.fillStyle = o.active ? o.activeBg || '#ffffff' : o.bg || '#dfe3f0';
    ctx.fill();
    let tx = x + h * 0.3;
    if (o.icon) { ctx.save(); ctx.translate(tx + h * 0.2, y + h / 2); o.icon(ctx, h * 0.4); ctx.restore(); tx += h * 0.5; }
    if (o.label) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w - h * 0.6, h); ctx.clip();
      text(ctx, o.label, tx, y + h / 2 + 1, { size: h * 0.36, fill: o.color || pal.ink, align: 'left', rounded: false, font: 'sans' });
      ctx.restore();
    }
    if (o.close !== false) {
      ctx.strokeStyle = 'rgba(27,21,48,0.45)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      const cx = x + w - h * 0.35, cy = y + h / 2, k = h * 0.1;
      ctx.beginPath(); ctx.moveTo(cx - k, cy - k); ctx.lineTo(cx + k, cy + k); ctx.moveTo(cx + k, cy - k); ctx.lineTo(cx - k, cy + k); ctx.stroke();
    }
    ctx.restore();
  }
  /** searchBar(ctx, x, y, w, h, o{ text, placeholder, caret (bool), t, spinner, bg, color }): top-left (x, y). */
  function searchBar(ctx, x, y, w, h, o = {}) {
    card(ctx, x, y, w, h, { r: h / 2, fill: o.bg || '#ffffff', shadowDy: 8, blur: 20 });
    // magnifier
    const mx = x + h * 0.5, my = y + h / 2, mr = h * 0.16;
    ctx.save();
    ctx.strokeStyle = o.iconColor || 'rgba(27,21,48,0.55)'; ctx.lineWidth = h * 0.06; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(mx - mr * 0.2, my - mr * 0.2, mr, 0, TAU); ctx.moveTo(mx + mr * 0.55, my + mr * 0.55); ctx.lineTo(mx + mr * 1.3, my + mr * 1.3); ctx.stroke();
    ctx.restore();
    const tx = x + h * 0.95;
    const s = o.text || '';
    const size = o.size || h * 0.34;
    if (s) {
      text(ctx, s, tx, y + h / 2 + 1, { size, fill: o.color || pal.ink, align: 'left', rounded: false, font: 'sans' });
    } else if (o.placeholder) {
      text(ctx, o.placeholder, tx, y + h / 2 + 1, { size, fill: 'rgba(27,21,48,0.4)', align: 'left', rounded: false, font: 'sans', weight: 400 });
    }
    if (o.caret && Math.floor((o.t || 0) * 2.4) % 2 === 0) {
      const cw = s ? measure(ctx, s, size, 'sans') - size * 0.14 : 0;
      ctx.fillStyle = pal.timeBlue;
      ctx.fillRect(tx + cw + 4, y + h * 0.28, 4, h * 0.44);
    }
    if (o.spinner) spinner(ctx, x + w - h * 0.5, y + h / 2, h * 0.2, o.t || 0, { color: o.spinnerColor });
  }
  /** cursor(ctx, x, y, s, o{ click (0..1 ring), color, hand }): mouse arrow with its tip at (x, y). */
  function cursor(ctx, x, y, s = 1, o = {}) {
    ctx.save();
    if (o.click > 0) {
      ctx.strokeStyle = o.ringColor || pal.timeBlue;
      ctx.globalAlpha *= 1 - o.click;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(x, y, 10 + o.click * 50 * s, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.translate(x, y);
    ctx.scale(s, s);
    poly(ctx, [[0, 0], [0, 60], [15, 46], [26, 70], [37, 65], [26, 42], [46, 42]]);
    ctx.fillStyle = o.color || pal.ink;
    ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();
  }
  /** spinner(ctx, x, y, r, t, o{ color, width }) */
  function spinner(ctx, x, y, r, t, o = {}) {
    ctx.save();
    ctx.strokeStyle = o.color || pal.timeBlue;
    ctx.lineWidth = o.width || r * 0.32;
    ctx.lineCap = 'round';
    const a = t * 7;
    const len = 1.2 + Math.sin(t * 4) * 0.8;
    ctx.beginPath(); ctx.arc(x, y, r, a, a + len + 0.6); ctx.stroke();
    ctx.restore();
  }
  /** progress(ctx, x, y, w, h, p, o{ fill, bg, r }) */
  function progress(ctx, x, y, w, h, p, o = {}) {
    rrect(ctx, x, y, w, h, o.r == null ? h / 2 : o.r); ctx.fillStyle = o.bg || 'rgba(27,21,48,0.12)'; ctx.fill();
    if (p > 0) { rrect(ctx, x, y, Math.max(h, w * clamp(p)), h, o.r == null ? h / 2 : o.r); ctx.fillStyle = o.fill || pal.green; ctx.fill(); }
  }
  /** toggle(ctx, x, y, on (0..1), o{ w, h, color }) top-left */
  function toggle(ctx, x, y, on, o = {}) {
    const w = o.w || 110, h = o.h || 64;
    rrect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = on > 0.5 ? o.color || pal.green : 'rgba(27,21,48,0.18)';
    ctx.fill();
    const kx = lerp(x + h / 2, x + w - h / 2, E.inOutCubic(clamp(on)));
    dropShadow(ctx, (c) => { c.beginPath(); c.arc(kx, y + h / 2, h * 0.42, 0, TAU); c.fillStyle = '#ffffff'; c.fill(); }, { dy: 3, blur: 6 });
  }
  /** button(ctx, x, y, w, h, str, o{ bg, color, size, press (0..1) }) top-left */
  function button(ctx, x, y, w, h, str, o = {}) {
    const pr = clamp(o.press || 0);
    const dy = pr * 8;
    rrect(ctx, x, y + 10, w, h, h / 2); ctx.fillStyle = o.under || 'rgba(0,0,0,0.25)'; ctx.fill();
    rrect(ctx, x, y + dy, w, h, h / 2); ctx.fillStyle = o.bg || pal.green; ctx.fill();
    text(ctx, str, x + w / 2, y + dy + h / 2 + 1, { size: o.size || h * 0.4, fill: o.color || '#ffffff' });
  }
  /**
   * healthBar(ctx, x, y, w, h, value, o{ color, color2, flip, label, labelColor, ghost }): fighting
   * game health bar, top-left (x, y). value 0..1. flip drains toward the left edge. ghost = the red
   * "recent damage" value (>= value).
   */
  function healthBar(ctx, x, y, w, h, value, o = {}) {
    const v = clamp(value), g = clamp(o.ghost == null ? v : o.ghost);
    ctx.save();
    ctx.transform(1, 0, o.flip ? 0.25 : -0.25, 1, 0, 0);
    const sk = (o.flip ? -0.25 : 0.25) * (y + h / 2);
    ctx.translate(-sk * 0 + (o.flip ? (y + h / 2) * 0.25 * -1 : (y + h / 2) * 0.25), 0);
    rrect(ctx, x - 8, y - 8, w + 16, h + 16, 12); ctx.fillStyle = pal.ink; ctx.fill();
    rrect(ctx, x, y, w, h, 6); ctx.fillStyle = '#3a3358'; ctx.fill();
    const fillW = (val) => (o.flip ? [x + w * (1 - val), w * val] : [x, w * val]);
    if (g > v) { const [gx, gw] = fillW(g); rrect(ctx, gx, y, gw, h, 6); ctx.fillStyle = '#ff9f43'; ctx.fill(); }
    if (v > 0) {
      const [fx, fw] = fillW(v);
      rrect(ctx, fx, y, fw, h, 6);
      ctx.fillStyle = linGrad(ctx, 0, y, 0, y + h, [o.color2 || '#ffffff', o.color || pal.green]);
      ctx.fill();
    }
    ctx.restore();
    if (o.label) text(ctx, o.label, o.flip ? x + w : x, y + h + 46, { size: 40, fill: o.labelColor || pal.ink, align: o.flip ? 'right' : 'left' });
  }
  /** chartGrid(ctx, x, y, w, h, o{ cols, rows, color, bg, r }) */
  function chartGrid(ctx, x, y, w, h, o = {}) {
    if (o.bg) { rrect(ctx, x, y, w, h, o.r == null ? 30 : o.r); ctx.fillStyle = o.bg; ctx.fill(); }
    ctx.save();
    ctx.strokeStyle = o.color || 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    const cols = o.cols || 6, rows = o.rows || 8;
    ctx.beginPath();
    for (let i = 1; i < cols; i++) { ctx.moveTo(x + (w * i) / cols, y); ctx.lineTo(x + (w * i) / cols, y + h); }
    for (let j = 1; j < rows; j++) { ctx.moveTo(x, y + (h * j) / rows); ctx.lineTo(x + w, y + (h * j) / rows); }
    ctx.stroke();
    ctx.restore();
  }
  /** candle(ctx, cx, yOpen, yClose, yHigh, yLow, w, o{ up, color, wick }): one candlestick (y down). */
  function candle(ctx, cx, yOpen, yClose, yHigh, yLow, w, o = {}) {
    const up = o.up == null ? yClose < yOpen : o.up;
    const col = o.color || (up ? pal.up : pal.down);
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = o.wick || Math.max(3, w * 0.14);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, yHigh); ctx.lineTo(cx, yLow); ctx.stroke();
    const top = Math.min(yOpen, yClose), hh = Math.max(6, Math.abs(yClose - yOpen));
    rrect(ctx, cx - w / 2, top, w, hh, Math.min(w * 0.22, hh / 2));
    ctx.fillStyle = col;
    ctx.fill();
    ctx.restore();
  }
  /**
   * candles(ctx, x, y, w, h, o{ n, seed, trend, grow (0..1 reveals left to right), t (live wiggle of the
   * last candle), width }): a candlestick chart in a box (no background). Returns the value series.
   */
  function candles(ctx, x, y, w, h, o = {}) {
    const n = o.n || 18, seed = o.seed || 77, trend = o.trend == null ? 0.4 : o.trend;
    const grow = o.grow == null ? 1 : clamp(o.grow);
    const cw = w / n;
    let v = 0.5 - trend * 0.35;
    const vals = [];
    for (let i = 0; i < n; i++) {
      const open = v;
      v = clamp(v + trend * (0.7 / n) + (h01('cd', seed, i) - 0.5) * 0.14, 0.05, 0.95);
      const hi = Math.max(open, v) + h01('ch', seed, i) * 0.05, lo = Math.min(open, v) - h01('cl', seed, i) * 0.05;
      vals.push([open, v, hi, lo]);
    }
    const shown = grow * n;
    for (let i = 0; i < n; i++) {
      if (i >= shown) break;
      const k = clamp(shown - i);
      let [op, cl, hi, lo] = vals[i];
      if (i === n - 1 && o.t != null) cl += Math.sin(o.t * 9) * 0.02;
      const Y = (q) => y + h - q * h;
      const mid = (op + cl) / 2;
      const sc = E.outBack(k);
      candle(ctx, x + (i + 0.5) * cw, Y(lerp(mid, op, sc)), Y(lerp(mid, cl, sc)), Y(lerp(mid, hi, sc)), Y(lerp(mid, lo, sc)), cw * (o.width || 0.62));
    }
    return vals;
  }
  /** crown(ctx, x, y, s, o{ color, rot, jewels }): crown with its base centred at (x, y), 200 px wide at s=1. */
  function crown(ctx, x, y, s = 1, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(s, s);
    poly(ctx, [[-100, 0], [-100, -70], [-62, -40], [-36, -100], [0, -50], [36, -100], [62, -40], [100, -70], [100, 0]]);
    ctx.fillStyle = o.color || pal.yellow;
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(-100, -22, 200, 22);
    if (o.jewels !== false) {
      ctx.fillStyle = pal.red; ctx.beginPath(); ctx.arc(0, -11, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = pal.timeCyan; ctx.beginPath(); ctx.arc(-56, -11, 7, 0, TAU); ctx.arc(56, -11, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff';
      [[-36, -100], [36, -100], [-100, -70], [100, -70]].forEach(([px, py]) => { ctx.beginPath(); ctx.arc(px, py, 9, 0, TAU); ctx.fill(); });
    }
    ctx.restore();
  }
  /**
   * podium(ctx, cx, groundY, o{ w, colors, labels }): three-step podium (2, 1, 3) centred on cx with
   * its base on groundY. Returns the top-centre point of each step { first, second, third }.
   */
  function podium(ctx, cx, groundY, o = {}) {
    const w = o.w || 260;
    const hs = [220, 320, 160];
    const xs = [cx - w, cx, cx + w];
    const cols = o.colors || [pal.purple, pal.yellow, pal.pink];
    const names = ['2', '1', '3'];
    const tops = {};
    [0, 2, 1].forEach((i) => {
      const x = xs[i] - w / 2, h = hs[i];
      card(ctx, x + 6, groundY - h, w - 12, h, { r: 22, fill: cols[i], shadowDy: 12, blur: 26 });
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      rrect(ctx, x + 6, groundY - h, w - 12, 26, 13); ctx.fill();
      text(ctx, names[i], xs[i], groundY - h + 90, { size: 110, fill: 'rgba(255,255,255,0.92)' });
      const key = i === 1 ? 'first' : i === 0 ? 'second' : 'third';
      tops[key] = [xs[i], groundY - h];
    });
    return tops;
  }

  FILM.fx = Object.freeze({
    pal, TAU, BPM, BEAT, BAR, beat, clamp, lerp, h01, E, seg, spring, pop, popIn, squash, shake, shakeMany, wobble, beatPulse,
    rrect, ellipse, poly, curve, star, squircle, fill, dropShadow, linGrad, radGrad,
    bgFill, dotGrid, floaties, stripes, sunburst, circleWipe,
    speedLines, focusLines, burst, sparkle, sparkles, confettiBurst, puffs, dustCloud, shockRing, impactStar, dizzyStars, sweat, anger, motionTrail,
    font, text, measure, popLetters, typeOn, label,
    card, phone, statusBar, appIcon, badge, notif, tab, searchBar, cursor, spinner, progress, toggle, button, healthBar,
    chartGrid, candle, candles, crown, podium,
  });
})();
