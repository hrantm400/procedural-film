/*
 * props.js : FILM.fx, the shared anime effects, text and props for "Hayk: The Burger Quest".
 * Loaded after lib.js and before cast.js, the timeline and the scenes.
 *
 * Everything is a pure function of its arguments (no state between frames). Randomness only from
 * FILM.lib.hash / FILM.lib.rng with explicit seeds. Anything that should flicker like hand-drawn
 * animation derives its variation from `L.boil(L.T)` (12 fps) so it changes on twos.
 *
 * Coordinates are logical pixels on the 1080 x 1920 frame (or the current transform).
 *
 *   palette      FILM.fx.pal (read-only colours shared by cast and scenes)
 *   motion       shake, pop, popIn, bounce, wiggle, beatPulse
 *   backgrounds  sky, sunburst, focusLines, speedLines, impact, halftone, gloom, vignette, flash,
 *                bokeh, stars, ararat, clouds, ground
 *   effects      burst, sparkle, sparkles, sweat, vein, heart, hearts, aura, menace, aroma, steam,
 *                dust, crumbs, shockRing, notes, tearStream, puddle, motionSmear
 *   text         font, text, sfx, bubble, caption, tag, introCard, stamp
 *   props        burger, fries, bucket, drumstick, drink, crown, phone, plane, suitcase, lsLogo,
 *                candles, monitor, mug, leash, flag, sunglasses (worn by cast)
 *
 * Style: clean cel animation. Flat fill, one shadow tone, bold dark outline (fx.pal.line).
 */
(function () {
  'use strict';

  const FILM = window.FILM;
  const L = FILM.lib;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const h01 = (...k) => (L.hash(...k) >>> 0) / 4294967296;

  // ---------------------------------------------------------------------------
  // Palette
  // ---------------------------------------------------------------------------
  const pal = {
    line: '#1b1424', // outline ink for everything
    white: '#ffffff',
    cream: '#fff6e3',
    // skin
    skin: '#f5c9a3', skinShade: '#dd9f7a', blush: '#ff8a8a',
    // Hayk
    haykHair: '#211c2b', haykHairHi: '#4a5a9a', hoodie: '#27335c', hoodieShade: '#1a2242', hoodieHi: '#3b4c85',
    jeans: '#36557f', jeansShade: '#26405f', shoe: '#f4f4f4', shoeAccent: '#e8413c', headphones: '#e8413c',
    lsBlue: '#27c4f5', lsGreen: '#35e08a',
    // Grant
    grantHair: '#6b4228', grantHairHi: '#94613c', jacket: '#557f3c', jacketShade: '#3d5e2a', jacketHi: '#72a052',
    pants: '#cdb88c', pantsShade: '#a8936a', grantShoe: '#4a3526', glasses: '#2a2233',
    // Goofy
    dog: '#e38a3a', dogShade: '#b8652a', dogCream: '#fbe7c6', dogCreamShade: '#e8c99e', dogNose: '#2a1d1a',
    collar: '#e5323a', leash: '#e5323a',
    // eyes
    eyeWhite: '#ffffff', irisBrown: '#6b3b1f', irisHayk: '#3b2418', irisGrant: '#3e6b3a', irisDog: '#3a2414',
    demonRed: '#ff2340', demonGlow: '#ff6a2a',
    tear: '#8fd8ff', tearHi: '#e6f7ff',
    // food
    bun: '#e7a24c', bunShade: '#c47d2e', bunTop: '#f0b25c', sesame: '#fff3d0', patty: '#6b3a22', pattyShade: '#4d2716',
    cheese: '#ffc930', lettuce: '#6ccf4a', tomato: '#e8413c', fries: '#ffd34a', friesShade: '#e6a92a',
    chicken: '#d98a3a', chickenShade: '#a9601f', drink: '#e8413c',
    kfgRed: '#d7282f', kongBlue: '#1f5fbf', kongOrange: '#f2862b', mcRed: '#da291c', mcGold: '#ffc72c',
    // world
    gold: '#ffcc33', goldShade: '#e0961a', fire: '#ff7a1a', fireCore: '#ffe066',
    nightTop: '#141633', nightBottom: '#3a2f6b', sunsetTop: '#ff8a5c', sunsetBottom: '#ffd08a',
    daySky: '#6fc3ff', daySkyLow: '#c9ecff', spainSky: '#4fb3ff', sand: '#f1d3a0', sandShade: '#d8b27a',
    ararat: '#6f7fb3', araratSnow: '#f4f7ff', araratShade: '#56639a',
    grass: '#7cc45a', grassShade: '#5a9e40', tree: '#4f9a4a', treeShade: '#3a7a38', trunk: '#7a5236',
    termBg: '#0b1020', termGrid: '#1c2745', up: '#2fe08a', down: '#ff4d5e',
    shout: '#fff05a', sfxRed: '#ff3b3b', sfxYellow: '#ffe14a',
  };
  Object.freeze(pal);

  // ---------------------------------------------------------------------------
  // Motion helpers
  // ---------------------------------------------------------------------------

  /** shake(t, t0, dur, amp, seed): [dx, dy] screen shake decaying over dur, changing on twos. */
  function shake(t, t0, dur, amp = 18, seed = 1) {
    if (t < t0 || t > t0 + dur) return [0, 0];
    const k = 1 - (t - t0) / dur;
    const f = Math.floor(t * 12 + 1e-6);
    return [(h01('shx', seed, f) - 0.5) * 2 * amp * k, (h01('shy', seed, f) - 0.5) * 2 * amp * k];
  }
  /** shakeMany(t, list of [t0, dur, amp], seed): sums several shakes. */
  function shakeMany(t, list, seed = 1) {
    let x = 0, y = 0;
    list.forEach((s, i) => {
      const d = shake(t, s[0], s[1], s[2], seed + i * 7);
      x += d[0]; y += d[1];
    });
    return [x, y];
  }
  /** pop(t, t0, dur=0.25): overshoot scale 0 -> 1.15 -> 1. Returns 0 before t0. */
  function pop(t, t0, dur = 0.25) {
    if (t < t0) return 0;
    const u = clamp((t - t0) / dur);
    return L.ease.outBack(u);
  }
  /** popIn(t, t0): three drawings on twos, 0.7 -> 1.12 -> 1 (anime snap). Returns 0 before t0. */
  function popIn(t, t0) {
    if (t < t0 - 1e-6) return 0;
    const k = Math.floor((t - t0) * 12 + 1e-6);
    return [0.7, 1.12, 1][Math.min(2, k)];
  }
  /** bounce(t, speed, amp): repeating vertical hop. */
  const bounce = (t, speed = 2, amp = 10) => -Math.abs(Math.sin(t * Math.PI * speed)) * amp;
  /** wiggle(t, seed, amp): smooth-ish noise wobble on twos. */
  const wiggle = (t, seed = 1, amp = 1) => (L.noise1 ? 0 : 0) + Math.sin(Math.floor(t * 12) * 1.7 + seed) * amp;
  /** beatPulse(t, beat=0.5, decay=0.18): 1 on each beat decaying to 0. */
  function beatPulse(t, beat = 0.5, decay = 0.18, offset = 0) {
    const u = ((t - offset) % beat + beat) % beat;
    return Math.exp(-u / decay);
  }

  // ---------------------------------------------------------------------------
  // Backgrounds
  // ---------------------------------------------------------------------------

  /** sky(ctx, top, bottom, o{ x, y, w, h, mid, midAt }): vertical gradient fill. */
  function sky(ctx, top, bottom, o = {}) {
    const x = o.x || 0, y = o.y || 0, w = o.w || FILM.W, h = o.h || FILM.H;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, top);
    if (o.mid) g.addColorStop(o.midAt || 0.5, o.mid);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }

  /** sunburst(ctx, cx, cy, o{ rays, colorA, colorB, rot, r }): alternating wedge rays (anime backdrop). */
  function sunburst(ctx, cx, cy, o = {}) {
    const n = o.rays || 24, r = o.r || 2600, rot = o.rot || 0;
    ctx.save();
    ctx.fillStyle = o.colorA || '#ffd35a';
    ctx.fillRect(-50, -50, FILM.W + 100, FILM.H + 100);
    ctx.fillStyle = o.colorB || '#ffb13a';
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
   * focusLines(ctx, cx, cy, o{ inner, count, color, alpha, seed, width, rx, ry }):
   * manga concentration lines converging on (cx, cy). They re-draw every 1/12 s (boil).
   * inner: radius of the clear centre (default 260). rx/ry stretch the clear centre into an ellipse.
   */
  function focusLines(ctx, cx, cy, o = {}) {
    const n = o.count || 110, seed = o.seed || 7, inner = o.inner || 260;
    const rx = o.rx || inner, ry = o.ry || inner;
    const b = o.frozen ? 0 : L.boil(L.T);
    const R = 2400;
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.fillStyle = o.color || pal.line;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (h01('fl', seed, i, b) - 0.5) * (TAU / n) * 1.6;
      const w = (o.width || 16) * (0.3 + h01('flw', seed, i, b) * 1.1);
      const k = 1 + h01('flr', seed, i, b) * 0.9;
      const x0 = cx + Math.cos(a) * rx * k, y0 = cy + Math.sin(a) * ry * k;
      const px = -Math.sin(a) * w * 0.5, py = Math.cos(a) * w * 0.5;
      ctx.moveTo(x0, y0);
      ctx.lineTo(cx + Math.cos(a) * R + px, cy + Math.sin(a) * R + py);
      ctx.lineTo(cx + Math.cos(a) * R - px, cy + Math.sin(a) * R - py);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }

  /**
   * speedLines(ctx, o{ angle, count, color, alpha, seed, x, y, w, h, len, width, t, speed }):
   * parallel streaks across a box, moving along `angle` (radians, 0 = moving right).
   */
  function speedLines(ctx, o = {}) {
    const n = o.count || 40, seed = o.seed || 3;
    const x = o.x || 0, y = o.y || 0, w = o.w || FILM.W, h = o.h || FILM.H;
    const ang = o.angle || 0, t = o.t || 0, speed = o.speed == null ? 3000 : o.speed;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const diag = Math.hypot(w, h);
    const cx = x + w / 2, cy = y + h / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.globalAlpha = o.alpha == null ? 0.85 : o.alpha;
    ctx.fillStyle = o.color || '#ffffff';
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const off = (h01('sl', seed, i) - 0.5) * diag;
      const len = (o.len || 420) * (0.4 + h01('sll', seed, i) * 1.2);
      const wid = (o.width || 6) * (0.4 + h01('slw', seed, i));
      const period = diag + len;
      const along = (((h01('slp', seed, i) * period + t * speed * (0.7 + h01('sls', seed, i) * 0.6)) % period) + period) % period - period / 2;
      const px = cx + ca * along - sa * off, py = cy + sa * along + ca * off;
      const nx = -sa * wid * 0.5, ny = ca * wid * 0.5;
      ctx.moveTo(px + nx, py + ny);
      ctx.lineTo(px - ca * len, py - sa * len);
      ctx.lineTo(px - nx, py - ny);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }

  /**
   * impact(ctx, o{ cx, cy, invert, seed }): a full-frame black-and-white impact background
   * (white field, black focus lines and a jagged burst). Draw characters over it in silhouette or
   * normally. invert=true gives black field with white lines.
   */
  function impact(ctx, o = {}) {
    const cx = o.cx == null ? FILM.W / 2 : o.cx, cy = o.cy == null ? FILM.H / 2 : o.cy;
    const inv = !!o.invert;
    ctx.save();
    ctx.fillStyle = inv ? '#0a0a10' : '#ffffff';
    ctx.fillRect(-50, -50, FILM.W + 100, FILM.H + 100);
    focusLines(ctx, cx, cy, { inner: o.inner || 180, count: 140, color: inv ? '#ffffff' : '#0a0a10', seed: o.seed || 11, width: 22 });
    ctx.restore();
  }

  /** halftone(ctx, o{ x, y, w, h, color, step, rMax, dir }): dot screentone fading along dir ('down'|'up'|'radial'). */
  function halftone(ctx, o = {}) {
    const x0 = o.x || 0, y0 = o.y || 0, w = o.w || FILM.W, h = o.h || FILM.H;
    const st = o.step || 26, rMax = o.rMax || st * 0.45;
    ctx.save();
    ctx.fillStyle = o.color || 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    for (let j = 0; j * st < h; j++) {
      for (let i = 0; i * st < w; i++) {
        const px = x0 + i * st + (j % 2 ? st / 2 : 0), py = y0 + j * st;
        let k;
        if (o.dir === 'up') k = 1 - j * st / h;
        else if (o.dir === 'radial') k = Math.hypot(px - (x0 + w / 2), py - (y0 + h / 2)) / (Math.hypot(w, h) / 2);
        else k = (j * st) / h;
        const r = rMax * clamp(k);
        if (r > 0.6) { ctx.moveTo(px + r, py); ctx.arc(px, py, r, 0, TAU); }
      }
    }
    ctx.fill();
    ctx.restore();
  }

  /** gloom(ctx, x, y, w, h, o{ color, count, seed }): anime depression lines (vertical wavy lines hanging). */
  function gloom(ctx, x, y, w, h, o = {}) {
    const n = o.count || 9, seed = o.seed || 5;
    ctx.save();
    ctx.strokeStyle = o.color || 'rgba(70,90,160,0.7)';
    ctx.lineWidth = o.width || 5;
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const px = x + (i + 0.5) * (w / n);
      const len = h * (0.55 + h01('gl', seed, i) * 0.45);
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px, y + len);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** vignette(ctx, strength=0.5, color='#000'): darken edges. */
  function vignette(ctx, strength = 0.5, color = '0,0,0') {
    const g = ctx.createRadialGradient(FILM.W / 2, FILM.H / 2, FILM.H * 0.25, FILM.W / 2, FILM.H / 2, FILM.H * 0.75);
    g.addColorStop(0, `rgba(${color},0)`);
    g.addColorStop(1, `rgba(${color},${strength})`);
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FILM.W, FILM.H);
    ctx.restore();
  }

  /** flash(ctx, a, color='#fff'): full-frame colour overlay at alpha a. */
  function flash(ctx, a, color = '#ffffff') {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(a);
    ctx.fillStyle = color;
    ctx.fillRect(-50, -50, FILM.W + 100, FILM.H + 100);
    ctx.restore();
  }

  /** bokeh(ctx, o{ n, colors, seed, t, x, y, w, h, rMin, rMax, alpha }): soft circles drifting up. */
  function bokeh(ctx, o = {}) {
    const n = o.n || 30, seed = o.seed || 21, t = o.t || 0;
    const x0 = o.x || 0, y0 = o.y || 0, w = o.w || FILM.W, h = o.h || FILM.H;
    const cols = o.colors || ['#ffd1e8', '#fff1b8', '#ffe0f0'];
    ctx.save();
    for (let i = 0; i < n; i++) {
      const r = lerp(o.rMin || 12, o.rMax || 60, h01('bk', seed, i));
      const px = x0 + h01('bkx', seed, i) * w + Math.sin(t * 0.8 + i) * 12;
      const py = y0 + ((h01('bky', seed, i) * h - t * (20 + 40 * h01('bks', seed, i))) % h + h) % h;
      ctx.globalAlpha = (o.alpha || 0.45) * (0.5 + 0.5 * h01('bka', seed, i));
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath();
      ctx.arc(px, py, r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  /** stars(ctx, o{ n, seed, x, y, w, h, color, twinkle(T) }): small twinkling stars. */
  function stars(ctx, o = {}) {
    const n = o.n || 80, seed = o.seed || 33;
    const x0 = o.x || 0, y0 = o.y || 0, w = o.w || FILM.W, h = o.h || FILM.H * 0.6;
    const b = L.boil(L.T, 6);
    ctx.save();
    ctx.fillStyle = o.color || '#ffffff';
    for (let i = 0; i < n; i++) {
      const px = x0 + h01('st', seed, i) * w, py = y0 + h01('sty', seed, i) * h;
      const r = 1 + h01('str', seed, i) * 2.6;
      ctx.globalAlpha = 0.35 + 0.65 * h01('stt', seed, i, b);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * ararat(ctx, x, baseY, w, h, o{ color, snow, shade, small }): Mount Ararat, Greater (left, taller)
   * and Lesser (right) peaks, snow caps. x is the left edge, w the width of the pair.
   */
  function ararat(ctx, x, baseY, w, h, o = {}) {
    const c = o.color || pal.ararat, snow = o.snow || pal.araratSnow, sh = o.shade || pal.araratShade;
    const big = [[x, baseY], [x + w * 0.12, baseY - h * 0.28], [x + w * 0.28, baseY - h * 0.72], [x + w * 0.36, baseY - h * 0.98],
      [x + w * 0.4, baseY - h], [x + w * 0.46, baseY - h * 0.94], [x + w * 0.56, baseY - h * 0.66], [x + w * 0.64, baseY - h * 0.5],
      [x + w * 0.7, baseY - h * 0.52], [x + w * 0.78, baseY - h * 0.62], [x + w * 0.82, baseY - h * 0.6], [x + w * 0.9, baseY - h * 0.36],
      [x + w, baseY]];
    ctx.save();
    ctx.fillStyle = c;
    poly(ctx, big); ctx.fill();
    // shade on the right faces
    ctx.fillStyle = sh;
    poly(ctx, [[x + w * 0.4, baseY - h], [x + w * 0.46, baseY - h * 0.94], [x + w * 0.56, baseY - h * 0.66], [x + w * 0.64, baseY - h * 0.5], [x + w * 0.5, baseY]]); ctx.fill();
    poly(ctx, [[x + w * 0.82, baseY - h * 0.6], [x + w * 0.9, baseY - h * 0.36], [x + w, baseY], [x + w * 0.86, baseY]]); ctx.fill();
    // snow caps
    ctx.fillStyle = snow;
    poly(ctx, [[x + w * 0.28, baseY - h * 0.72], [x + w * 0.36, baseY - h * 0.98], [x + w * 0.4, baseY - h], [x + w * 0.46, baseY - h * 0.94],
      [x + w * 0.53, baseY - h * 0.74], [x + w * 0.48, baseY - h * 0.78], [x + w * 0.44, baseY - h * 0.7], [x + w * 0.39, baseY - h * 0.79], [x + w * 0.34, baseY - h * 0.7]]); ctx.fill();
    poly(ctx, [[x + w * 0.76, baseY - h * 0.59], [x + w * 0.78, baseY - h * 0.62], [x + w * 0.82, baseY - h * 0.6], [x + w * 0.845, baseY - h * 0.53], [x + w * 0.81, baseY - h * 0.55], [x + w * 0.79, baseY - h * 0.52]]); ctx.fill();
    ctx.restore();
  }

  /** clouds(ctx, o{ n, seed, t, y, h, color, speed, scale }): puffy anime clouds drifting right. */
  function clouds(ctx, o = {}) {
    const n = o.n || 5, seed = o.seed || 13, t = o.t || 0;
    const y0 = o.y == null ? 150 : o.y, h = o.h || 500, sc = o.scale || 1;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const w = (220 + h01('cw', seed, i) * 260) * sc;
      const span = FILM.W + w * 2;
      const px = (((h01('cx', seed, i) * span + t * (o.speed || 12) * (0.6 + h01('cs', seed, i))) % span) + span) % span - w;
      const py = y0 + h01('cy', seed, i) * h;
      cloud(ctx, px, py, w, o.color || '#ffffff', o.shade || 'rgba(160,190,230,0.55)');
    }
    ctx.restore();
  }
  function cloud(ctx, x, y, w, color = '#ffffff', shade = 'rgba(160,190,230,0.55)') {
    const r = w / 4;
    ctx.save();
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + r * 0.35, w * 0.52, r * 0.7, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + r, y, r, 0, TAU);
    ctx.arc(x + w * 0.45, y - r * 0.6, r * 1.3, 0, TAU);
    ctx.arc(x + w * 0.75, y - r * 0.2, r * 1.05, 0, TAU);
    ctx.ellipse(x + w * 0.5, y + r * 0.2, w * 0.5, r * 0.6, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Path helpers
  // ---------------------------------------------------------------------------
  function poly(ctx, pts, closed = true) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (closed) ctx.closePath();
  }
  /** smooth closed/open curve through points (quadratic midpoints). */
  function curve(ctx, pts, closed = true) {
    const n = pts.length;
    ctx.beginPath();
    if (n < 3) { poly(ctx, pts, closed); return; }
    if (closed) {
      const m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
      ctx.moveTo(m0[0], m0[1]);
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
  /** fill + outline the current path. */
  function fo(ctx, fill, lw = 5, line = pal.line) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw > 0) { ctx.lineWidth = lw; ctx.strokeStyle = line; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  }
  function ellipse(ctx, x, y, rx, ry, rot = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
  }
  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function star(ctx, cx, cy, rOut, rIn, n, rot = -Math.PI / 2) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? rIn : rOut;
      const a = rot + (i / (n * 2)) * TAU;
      const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  /** burst(ctx, cx, cy, rOut, rIn, spikes, fill, o{ seed, line, lw, jitter }): jagged starburst (behind SFX, impacts). */
  function burst(ctx, cx, cy, rOut, rIn, spikes, fill, o = {}) {
    const seed = o.seed || 9, j = o.jitter == null ? 0.25 : o.jitter;
    const b = o.frozen ? 0 : L.boil(L.T);
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const out = i % 2 === 0;
      const r = (out ? rOut : rIn) * (1 + (h01('bu', seed, i, b) - 0.5) * j);
      const a = (i / (spikes * 2)) * TAU + (o.rot || 0);
      const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r * (o.squash || 1);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    fo(ctx, fill, o.lw == null ? 6 : o.lw, o.line || pal.line);
    ctx.restore();
  }

  /** sparkle(ctx, x, y, r, o{ color, rot, glow }): 4-point twinkle star. */
  function sparkle(ctx, x, y, r, o = {}) {
    if (r <= 0.5) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(o.rot || 0);
    if (o.glow !== false) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.9);
      g.addColorStop(0, 'rgba(255,255,255,0.8)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = o.color || '#ffffff';
    ctx.beginPath();
    const k = 0.16;
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * k, -r * k, r, 0);
    ctx.quadraticCurveTo(r * k, r * k, 0, r);
    ctx.quadraticCurveTo(-r * k, r * k, -r, 0);
    ctx.quadraticCurveTo(-r * k, -r * k, 0, -r);
    ctx.fill();
    ctx.restore();
  }

  /** sparkles(ctx, o{ x, y, w, h, n, seed, t, color, size }): field of twinkles appearing and fading (period ~1 s). */
  function sparkles(ctx, o = {}) {
    const n = o.n || 14, seed = o.seed || 17, t = o.t || 0;
    const x0 = o.x || 0, y0 = o.y || 0, w = o.w || FILM.W, h = o.h || FILM.H;
    for (let i = 0; i < n; i++) {
      const per = 0.7 + h01('spp', seed, i) * 0.8;
      const ph = ((t / per + h01('spo', seed, i)) % 1 + 1) % 1;
      const cyc = Math.floor(t / per + h01('spo', seed, i));
      const px = x0 + h01('spx', seed, i, cyc) * w, py = y0 + h01('spy', seed, i, cyc) * h;
      const r = (o.size || 26) * (0.5 + h01('spr', seed, i)) * Math.sin(ph * Math.PI);
      sparkle(ctx, px, py, r, { color: o.color || (i % 3 ? '#ffffff' : '#fff3a0'), rot: ph * 0.6 });
    }
  }

  /** sweat(ctx, x, y, s, o{ flip }): big anime sweat drop, tip up. */
  function sweat(ctx, x, y, s = 1, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(o.flip ? -s : s, s);
    ctx.beginPath();
    ctx.moveTo(0, -38);
    ctx.bezierCurveTo(8, -20, 20, -4, 20, 8);
    ctx.arc(0, 8, 20, 0, Math.PI);
    ctx.bezierCurveTo(-20, -4, -8, -20, 0, -38);
    ctx.closePath();
    fo(ctx, '#bfe9ff', 4);
    ctx.fillStyle = '#ffffff';
    ellipse(ctx, 7, 6, 4, 7, -0.3); ctx.fill();
    ctx.restore();
  }

  /** vein(ctx, x, y, s, o{ color }): anger mark (four curved ticks forming a cross). */
  function vein(ctx, x, y, s = 1, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = o.color || '#ff2a3a';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate(i * Math.PI / 2 + Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(6, -14);
      ctx.quadraticCurveTo(6, -6, 16, -6);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  /** heart(ctx, x, y, s, color) */
  function heart(ctx, x, y, s = 1, color = '#ff4f86', lw = 4) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.bezierCurveTo(-30, -8, -18, -34, 0, -18);
    ctx.bezierCurveTo(18, -34, 30, -8, 0, 14);
    ctx.closePath();
    fo(ctx, color, lw);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ellipse(ctx, -11, -14, 5, 3.5, -0.6); ctx.fill();
    ctx.restore();
  }
  /** hearts(ctx, cx, cy, t, o{ n, seed, spread, rise }): hearts floating up from a point. */
  function hearts(ctx, cx, cy, t, o = {}) {
    const n = o.n || 8, seed = o.seed || 41;
    for (let i = 0; i < n; i++) {
      const per = 1.4;
      const u = ((t / per + i / n) % 1 + 1) % 1;
      const px = cx + (h01('hx', seed, i) - 0.5) * (o.spread || 300) + Math.sin(u * 6 + i) * 20;
      const py = cy - u * (o.rise || 380);
      const s = (0.7 + h01('hs', seed, i) * 0.9) * Math.sin(Math.min(1, u * 3) * Math.PI / 2) * (1 - u * 0.4) * (o.scale || 1);
      ctx.save();
      ctx.globalAlpha = 1 - Math.max(0, u - 0.7) / 0.3;
      heart(ctx, px, py, s);
      ctx.restore();
    }
  }

  /**
   * aura(ctx, cx, baseY, w, h, t, o{ color, core, seed, alpha }): flickering flame aura rising
   * behind a character (battle-anime power-up). Draw it BEFORE the character.
   */
  function aura(ctx, cx, baseY, w, h, t, o = {}) {
    const seed = o.seed || 23, b = L.boil(L.T);
    const n = 22;
    const layer = (scale, color, alpha) => {
      ctx.save();
      ctx.globalAlpha = (o.alpha == null ? 1 : o.alpha) * alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.5 * scale, baseY);
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const ang = Math.PI + u * Math.PI; // left -> top -> right
        const flick = 0.75 + h01('au', seed, i, b) * 0.5;
        const spike = i % 2 === 0 ? 1.18 : 0.92;
        const rx = w * 0.5 * scale * (i % 2 ? 0.95 : 1.05);
        const ry = h * scale * flick * spike * (0.55 + 0.45 * Math.sin(u * Math.PI));
        ctx.lineTo(cx + Math.cos(ang) * rx, baseY + Math.sin(ang) * ry);
      }
      ctx.lineTo(cx + w * 0.5 * scale, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    layer(1, o.color || pal.fire, 0.55);
    layer(0.82, o.color || pal.fire, 0.7);
    layer(0.62, o.core || pal.fireCore, 0.75);
  }

  /** menace(ctx, x, y, t, o{ size, color, n, seed }): floating "ゴゴゴゴ" (JoJo-style menace) glyphs. */
  function menace(ctx, x, y, t, o = {}) {
    const n = o.n || 4, size = o.size || 80, seed = o.seed || 3;
    const b = L.boil(L.T);
    for (let i = 0; i < n; i++) {
      const px = x + (h01('mx', seed, i) - 0.5) * size * 1.2 + (h01('mj', seed, i, b) - 0.5) * 6;
      const py = y - i * size * 0.95 + (h01('mk', seed, i, b) - 0.5) * 6 - (t * 30) % (size * 0.3);
      text(ctx, 'ゴ', px, py, { size: size * (0.8 + 0.3 * h01('ms', seed, i)), fill: o.color || '#7a3cff', stroke: pal.line, lw: 7, rot: -0.15 + h01('mr', seed, i) * 0.3, font: 'jp' });
    }
  }

  /** aroma(ctx, pts, t, o{ color, width, alpha }): wavy scent ribbon along a polyline, revealed by o.reveal 0..1. */
  function aroma(ctx, pts, t, o = {}) {
    const rev = o.reveal == null ? 1 : clamp(o.reveal);
    if (rev <= 0) return;
    const samples = [];
    const segs = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      segs.push(d); total += d;
    }
    const N = 90;
    for (let k = 0; k <= N * rev; k++) {
      let dist = (k / N) * total, i = 0;
      while (i < segs.length - 1 && dist > segs[i]) { dist -= segs[i]; i++; }
      const u = segs[i] ? dist / segs[i] : 0;
      const a = pts[i], bb = pts[i + 1];
      const dx = bb[0] - a[0], dy = bb[1] - a[1], dl = Math.hypot(dx, dy) || 1;
      const wav = Math.sin(k * 0.35 - t * 8) * (o.amp || 22);
      samples.push([a[0] + dx * u - (dy / dl) * wav, a[1] + dy * u + (dx / dl) * wav]);
    }
    if (samples.length < 2) return;
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 0.9 : o.alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    curve(ctx, samples, false);
    ctx.strokeStyle = o.edge || 'rgba(255,170,40,0.55)';
    ctx.lineWidth = (o.width || 26) + 14;
    ctx.stroke();
    curve(ctx, samples, false);
    ctx.strokeStyle = o.color || '#ffe07a';
    ctx.lineWidth = o.width || 26;
    ctx.stroke();
    ctx.restore();
  }

  /** steam(ctx, x, y, t, o{ n, h, seed, color, width }): rising curly steam wisps. */
  function steam(ctx, x, y, t, o = {}) {
    const n = o.n || 3, H = o.h || 90, seed = o.seed || 4;
    ctx.save();
    ctx.strokeStyle = o.color || 'rgba(255,255,255,0.8)';
    ctx.lineWidth = o.width || 6;
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 18;
      ctx.beginPath();
      for (let k = 0; k <= 16; k++) {
        const u = k / 16;
        const px = x + off + Math.sin(u * 6 + t * 4 + i * 2 + seed) * 10 * u;
        const py = y - u * H;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.globalAlpha = 0.8;
      ctx.stroke();
    }
    ctx.restore();
  }

  /** dust(ctx, x, y, t, o{ n, seed, size, color, spread, dir }): puffs expanding and fading (age t in s). */
  function dust(ctx, x, y, t, o = {}) {
    if (t < 0) return;
    const n = o.n || 6, seed = o.seed || 5, sz = o.size || 50, sp = o.spread || 140;
    const u = clamp(t / (o.life || 0.8));
    if (u >= 1) return;
    ctx.save();
    ctx.globalAlpha = (1 - u) * 0.95;
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (i / (n - 1)) * Math.PI + (h01('du', seed, i) - 0.5) * 0.4;
      const dir = o.dir || 0;
      const px = x + Math.cos(a + dir) * sp * L.ease.outCubic(u) * (0.6 + h01('dd', seed, i) * 0.6);
      const py = y + Math.sin(a + dir) * sp * 0.4 * L.ease.outCubic(u);
      const r = sz * (0.5 + 0.8 * u) * (0.7 + h01('dr', seed, i) * 0.6);
      ellipse(ctx, px, py, r, r * 0.8);
      fo(ctx, o.color || '#f3e6cc', 4, o.line || 'rgba(27,20,36,0.6)');
    }
    ctx.restore();
  }

  /** crumbs(ctx, x, y, age, o{ n, seed, color, spread, gravity }): particles flying from a bite. */
  function crumbs(ctx, x, y, age, o = {}) {
    if (age < 0 || age > (o.life || 0.9)) return;
    const n = o.n || 14, seed = o.seed || 8, sp = o.spread || 380, g = o.gravity == null ? 1400 : o.gravity;
    const cols = o.colors || [pal.bun, pal.bunShade, pal.sesame, pal.lettuce];
    ctx.save();
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (h01('cr', seed, i) - 0.5) * Math.PI * 1.6;
      const v = sp * (0.5 + h01('crv', seed, i));
      const px = x + Math.cos(a) * v * age, py = y + Math.sin(a) * v * age + 0.5 * g * age * age;
      const r = 6 + h01('crs', seed, i) * 9;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(age * 10 * (h01('crr', seed, i) - 0.5));
      ctx.fillStyle = cols[i % cols.length];
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.rect(-r / 2, -r / 2, r, r * 0.8);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  /** shockRing(ctx, x, y, age, o{ r, color, life, width, squash }): expanding ring (bark, impact). */
  function shockRing(ctx, x, y, age, o = {}) {
    const life = o.life || 0.4;
    if (age < 0 || age > life) return;
    const u = age / life;
    const r = (o.r || 300) * L.ease.outCubic(u);
    ctx.save();
    ctx.globalAlpha = 1 - u;
    ctx.strokeStyle = o.color || '#ffffff';
    ctx.lineWidth = (o.width || 22) * (1 - u * 0.7);
    ellipse(ctx, x, y, r, r * (o.squash || 1));
    ctx.stroke();
    ctx.restore();
  }

  /** notes(ctx, x, y, t, o{ n, seed, color, rise }): music notes floating up-right from a point. */
  function notes(ctx, x, y, t, o = {}) {
    const n = o.n || 3, seed = o.seed || 12;
    for (let i = 0; i < n; i++) {
      const u = ((t * 0.8 + i / n) % 1 + 1) % 1;
      const px = x + u * 160 + Math.sin(u * 8 + i) * 18;
      const py = y - u * (o.rise || 220);
      ctx.save();
      ctx.globalAlpha = Math.min(1, u * 5) * (1 - Math.max(0, u - 0.75) / 0.25);
      const glyph = i % 2 ? '♫' : '♪';
      text(ctx, glyph, px, py, { size: (o.size || 64) * (0.8 + h01('ns', seed, i) * 0.4), fill: o.color || '#ffffff', stroke: pal.line, lw: 6, font: 'sym' });
      ctx.restore();
    }
  }

  /**
   * tearStream(ctx, x, y, t, o{ dir(+1 right / -1 left), len, width, seed }): waterfall anime tears:
   * a thick arcing stream out of the eye and splash droplets. Age-independent: loops with t.
   */
  function tearStream(ctx, x, y, t, o = {}) {
    const dir = o.dir || 1, len = o.len || 260, wid = o.width || 26, seed = o.seed || 7;
    const pts = [];
    for (let k = 0; k <= 20; k++) {
      const u = k / 20;
      pts.push([x + dir * u * len * 0.55, y + u * u * len * 0.9 - Math.sin(u * Math.PI) * len * 0.2]);
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    curve(ctx, pts, false);
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = wid + 8;
    ctx.stroke();
    curve(ctx, pts, false);
    ctx.strokeStyle = pal.tear;
    ctx.lineWidth = wid;
    ctx.stroke();
    // flowing highlight dashes
    ctx.setLineDash([18, 26]);
    ctx.lineDashOffset = -t * 260;
    curve(ctx, pts, false);
    ctx.strokeStyle = pal.tearHi;
    ctx.lineWidth = wid * 0.3;
    ctx.stroke();
    ctx.setLineDash([]);
    // droplets at the end
    const end = pts[pts.length - 1];
    for (let i = 0; i < 6; i++) {
      const u = ((t * 2.2 + i / 6) % 1 + 1) % 1;
      const a = -Math.PI / 2 + (h01('td', seed, i) - 0.5) * 2.2;
      const px = end[0] + Math.cos(a) * 90 * u, py = end[1] + Math.sin(a) * 60 * u + 200 * u * u;
      ellipse(ctx, px, py, 8 * (1 - u * 0.5), 11 * (1 - u * 0.5));
      fo(ctx, pal.tear, 3);
    }
    ctx.restore();
  }

  /** puddle(ctx, x, y, w, o{ t }): blue tear puddle with ripples. */
  function puddle(ctx, x, y, w, o = {}) {
    ctx.save();
    ellipse(ctx, x, y, w / 2, w / 9);
    fo(ctx, pal.tear, 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 3;
    const t = o.t || 0;
    for (let i = 0; i < 2; i++) {
      const u = ((t * 1.5 + i * 0.5) % 1 + 1) % 1;
      ellipse(ctx, x, y, (w / 2) * u * 0.8, (w / 9) * u * 0.8);
      ctx.globalAlpha = 1 - u;
      ctx.stroke();
    }
    ctx.restore();
  }

  /** motionSmear(ctx, x, y, w, h, o{ color, n, angle }): smear streaks behind a fast object. */
  function motionSmear(ctx, x, y, w, h, o = {}) {
    speedLines(ctx, { x, y, w, h, count: o.n || 14, color: o.color || 'rgba(255,255,255,0.8)', angle: o.angle || 0, len: w * 0.7, width: h / 10, speed: 0, seed: o.seed || 2, alpha: o.alpha || 0.8 });
  }

  // ---------------------------------------------------------------------------
  // Text
  // ---------------------------------------------------------------------------
  const FONTS = {
    bold: '"Arial Black", "Liberation Sans", "DejaVu Sans", Arial, sans-serif',
    jp: '"IPAGothic", "IPAPGothic", "Noto Sans CJK JP", "WenQuanYi Zen Hei", sans-serif',
    sym: '"DejaVu Sans", "Noto Sans Symbols", sans-serif',
  };
  /** font(size, family='bold', weight=900) -> CSS font string */
  function font(size, family = 'bold', weight = 900) {
    return `${family === 'jp' || family === 'sym' ? 700 : weight} ${Math.round(size)}px ${FONTS[family] || family}`;
  }

  /**
   * text(ctx, str, x, y, o{ size, fill, stroke, lw, align, baseline, rot, scale, shadow, shadowColor,
   *   font, italic, letter, alpha, skew }): outlined display text, centred by default.
   * Multi-line with '\n'. Returns { w, h } of the block at scale 1.
   */
  function text(ctx, str, x, y, o = {}) {
    const size = o.size || 60;
    const lines = String(str).split('\n');
    const lh = size * (o.lineHeight || 1.08);
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    const sc = o.scale == null ? 1 : o.scale;
    if (sc !== 1) ctx.scale(sc, sc);
    if (o.skew) ctx.transform(1, 0, o.skew, 1, 0, 0);
    if (o.alpha != null) ctx.globalAlpha *= clamp(o.alpha);
    ctx.font = (o.italic ? 'italic ' : '') + font(size, o.font || 'bold', o.weight || 900);
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.baseline || 'middle';
    if ('letterSpacing' in ctx && o.letter) ctx.letterSpacing = o.letter + 'px';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    let maxW = 0;
    lines.forEach((ln, i) => {
      const ly = (i - (lines.length - 1) / 2) * lh;
      maxW = Math.max(maxW, ctx.measureText(ln).width);
      if (o.shadow) {
        const off = typeof o.shadow === 'number' ? o.shadow : size * 0.08;
        ctx.fillStyle = o.shadowColor || pal.line;
        if (o.lw !== 0) { ctx.strokeStyle = o.shadowColor || pal.line; ctx.lineWidth = o.lw == null ? size * 0.16 : o.lw; ctx.strokeText(ln, off, ly + off); }
        ctx.fillText(ln, off, ly + off);
      }
      if (o.lw !== 0) {
        ctx.strokeStyle = o.stroke || pal.line;
        ctx.lineWidth = o.lw == null ? size * 0.16 : o.lw;
        ctx.strokeText(ln, 0, ly);
      }
      ctx.fillStyle = o.fill || '#ffffff';
      ctx.fillText(ln, 0, ly);
    });
    ctx.restore();
    return { w: maxW, h: lh * lines.length };
  }

  /** measure(ctx, str, size, family) -> width of the widest line */
  function measure(ctx, str, size, family = 'bold') {
    ctx.save();
    ctx.font = font(size, family);
    let w = 0;
    String(str).split('\n').forEach((ln) => { w = Math.max(w, ctx.measureText(ln).width); });
    ctx.restore();
    return w;
  }

  /** wrap(ctx, str, size, maxW) -> string with '\n' inserted so each line fits maxW. */
  function wrap(ctx, str, size, maxW, family = 'bold') {
    ctx.save();
    ctx.font = font(size, family);
    const out = [];
    String(str).split('\n').forEach((para) => {
      let line = '';
      para.split(' ').forEach((wd) => {
        const tryL = line ? line + ' ' + wd : wd;
        if (ctx.measureText(tryL).width > maxW && line) { out.push(line); line = wd; } else line = tryL;
      });
      out.push(line);
    });
    ctx.restore();
    return out.join('\n');
  }

  /**
   * sfx(ctx, str, x, y, t, t0, o{ size, fill, stroke, rot, life, shadowColor, shake }): manga
   * onomatopoeia ("CRUNCH!", "WOOF!"). Pops in at t0 in three drawings, jitters on twos, and fades
   * after life seconds (default: stays). Draws nothing before t0.
   */
  function sfx(ctx, str, x, y, t, t0, o = {}) {
    if (t < t0 - 1e-6) return;
    const age = t - t0;
    const life = o.life;
    if (life != null && age > life) return;
    const sc = popIn(t, t0) * (o.scale || 1);
    const b = L.boil(L.T);
    const j = o.shake == null ? 5 : o.shake;
    const jx = (h01('sfj', str, b) - 0.5) * j, jy = (h01('sfk', str, b) - 0.5) * j;
    const a = life != null && age > life - 0.2 ? (life - age) / 0.2 : 1;
    text(ctx, str, x + jx, y + jy, {
      size: o.size || 130, fill: o.fill || pal.sfxYellow, stroke: o.stroke || pal.line, lw: (o.size || 130) * 0.2,
      rot: o.rot == null ? -0.12 : o.rot, scale: sc, shadow: (o.size || 130) * 0.09, shadowColor: o.shadowColor || '#b3122b', alpha: a,
      skew: o.skew == null ? -0.12 : o.skew, font: o.font,
    });
  }

  /**
   * bubble(ctx, str, x, y, o{ size, maxW, tail:[tx,ty], shout, think, fill, color, t, t0, align, pad, font }):
   * speech bubble centred at (x, y), text wrapped to maxW (default 700). shout=true: spiky burst.
   * think=true: cloud with dots. Pops in at o.t0 when o.t is given. Returns the bubble box.
   * KEEP inside the safe area: x 60..1020, y 220..1540 (vertical frame); keep bubble centres within x 200..880.
   */
  function bubble(ctx, str, x, y, o = {}) {
    let sc = 1;
    if (o.t != null && o.t0 != null) {
      sc = pop(o.t, o.t0, 0.22);
      if (sc <= 0) return null;
    }
    const size = o.size || 48;
    const maxW = o.maxW || 700;
    const s = wrap(ctx, str, size, maxW, o.font || 'bold');
    const lines = s.split('\n');
    const tw = measure(ctx, s, size, o.font || 'bold');
    const th = lines.length * size * 1.12;
    const pad = o.pad || size * 0.7;
    const w = tw + pad * 2, h = th + pad * 1.4;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    const fill = o.fill || '#ffffff';
    const tail = o.tail ? [o.tail[0] - x, o.tail[1] - y] : null;
    const b = L.boil(L.T);
    if (o.shout) {
      // jagged burst bubble
      const n = 22;
      const rx = w * 0.62, ry = h * 0.78;
      ctx.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * TAU;
        const k = i % 2 ? 1 : 1.18 + (h01('shb', str, i, b) - 0.5) * 0.12;
        const px = Math.cos(a) * rx * k, py = Math.sin(a) * ry * k;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      fo(ctx, fill, 7);
      if (tail) {
        const ang = Math.atan2(tail[1], tail[0]);
        const bx = Math.cos(ang) * rx * 0.95, by = Math.sin(ang) * ry * 0.95;
        const px = -Math.sin(ang) * 30, py = Math.cos(ang) * 30;
        ctx.beginPath();
        ctx.moveTo(bx + px, by + py);
        ctx.lineTo(tail[0], tail[1]);
        ctx.lineTo(bx - px, by - py);
        fo(ctx, fill, 7);
        ctx.fillStyle = fill;
        ellipse(ctx, bx * 0.9, by * 0.9, 34, 30); ctx.fill();
      }
    } else if (o.think) {
      ctx.fillStyle = fill;
      const bumps = 12;
      ctx.beginPath();
      for (let i = 0; i < bumps; i++) {
        const a = (i / bumps) * TAU;
        const px = Math.cos(a) * w * 0.52, py = Math.sin(a) * h * 0.56;
        ctx.moveTo(px + h * 0.3, py);
        ctx.arc(px, py, h * 0.3, 0, TAU);
      }
      fo(ctx, fill, 6);
      ctx.fillStyle = fill;
      ellipse(ctx, 0, 0, w * 0.55, h * 0.6); ctx.fill();
      if (tail) {
        for (let i = 1; i <= 3; i++) {
          const u = 0.45 + i * 0.17;
          ellipse(ctx, tail[0] * u, tail[1] * u, 18 - i * 4, 15 - i * 3.5);
          fo(ctx, fill, 5);
        }
      }
    } else {
      rrect(ctx, -w / 2, -h / 2, w, h, Math.min(h / 2, 60));
      fo(ctx, fill, 7);
      if (tail) {
        const ang = Math.atan2(tail[1], tail[0]);
        const ex = clamp(Math.cos(ang) * w, -w / 2 + 50, w / 2 - 50), ey = clamp(Math.sin(ang) * h, -h / 2 + 8, h / 2 - 8);
        const side = Math.abs(tail[1]) > Math.abs(tail[0]) * (h / w) ? 'v' : 'h';
        const px = side === 'v' ? 26 : 0, py = side === 'v' ? 0 : 26;
        ctx.beginPath();
        ctx.moveTo(ex - px, ey - py);
        ctx.lineTo(tail[0], tail[1]);
        ctx.lineTo(ex + px, ey + py);
        fo(ctx, fill, 7);
        ctx.beginPath();
        ctx.moveTo(ex - px * 1.1, ey - py * 1.1);
        ctx.lineTo(ex + px * 1.1, ey + py * 1.1);
        ctx.lineTo(ex * 0.85, ey * 0.85);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
      }
    }
    const jit = o.shake ? [(h01('bj', str, b) - 0.5) * o.shake, (h01('bk', str, b) - 0.5) * o.shake] : [0, 0];
    text(ctx, s, jit[0], jit[1], { size, fill: o.color || pal.line, lw: 0, font: o.font });
    ctx.restore();
    return { x: x - w / 2, y: y - h / 2, w, h };
  }

  /**
   * caption(ctx, str, x, y, o{ size, bg, color, align, pad, skew, t, t0, from }): anime subtitle bar —
   * a slanted solid box with bold text. from: 'left'|'right'|'top' slides in over 0.25 s after t0.
   */
  function caption(ctx, str, x, y, o = {}) {
    let dx = 0, a = 1;
    if (o.t != null && o.t0 != null) {
      if (o.t < o.t0) return null;
      const u = L.ease.outCubic(clamp((o.t - o.t0) / 0.25));
      const from = o.from || 'left';
      dx = from === 'left' ? -(1 - u) * 900 : from === 'right' ? (1 - u) * 900 : 0;
      if (from === 'fade') a = u;
    }
    const size = o.size || 52;
    const tw = measure(ctx, str, size);
    const pad = o.pad || size * 0.5;
    const lines = String(str).split('\n').length;
    const w = tw + pad * 2, h = size * 1.15 * lines + pad * 0.9;
    const align = o.align || 'left';
    const x0 = align === 'left' ? x : align === 'center' ? x - w / 2 : x - w;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(dx, 0);
    const sk = o.skew == null ? 0.2 : o.skew;
    ctx.beginPath();
    ctx.moveTo(x0 + h * sk, y - h / 2);
    ctx.lineTo(x0 + w + h * sk, y - h / 2);
    ctx.lineTo(x0 + w - h * sk, y + h / 2);
    ctx.lineTo(x0 - h * sk, y + h / 2);
    ctx.closePath();
    fo(ctx, o.bg || pal.line, o.border == null ? 0 : o.border, o.borderColor || '#ffffff');
    if (o.accent !== false) {
      ctx.fillStyle = o.accent || pal.gold;
      ctx.beginPath();
      ctx.moveTo(x0 - h * sk - 4, y + h / 2);
      ctx.lineTo(x0 + h * sk - 4 + 16, y - h / 2);
      ctx.lineTo(x0 + h * sk - 4 + 30, y - h / 2);
      ctx.lineTo(x0 - h * sk - 4 + 14, y + h / 2);
      ctx.closePath();
      ctx.fill();
    }
    text(ctx, str, x0 + w / 2, y + 2, { size, fill: o.color || '#ffffff', lw: 0 });
    ctx.restore();
    return { x: x0, y: y - h / 2, w, h };
  }

  /** tag(ctx, str, x, y, o{ size, bg, color }): small rounded label, centred. */
  function tag(ctx, str, x, y, o = {}) {
    const size = o.size || 34;
    const w = measure(ctx, str, size) + size * 1.2, h = size * 1.6;
    ctx.save();
    rrect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
    fo(ctx, o.bg || pal.line, o.lw == null ? 0 : o.lw, o.line || '#fff');
    text(ctx, str, x, y + 1, { size, fill: o.color || '#ffffff', lw: 0 });
    ctx.restore();
    return { w, h };
  }

  /**
   * introCard(ctx, name, sub, t, t0, o{ y, color, bg }): classic anime character-intro card: a
   * slanted black bar slides in from the left with a big name and a subtitle line.
   */
  function introCard(ctx, name, sub, t, t0, o = {}) {
    if (t < t0) return;
    const u = L.ease.outExpo(clamp((t - t0) / 0.35));
    const y = o.y || 1180;
    const dx = -(1 - u) * 1100;
    ctx.save();
    ctx.translate(dx, 0);
    // bar
    ctx.beginPath();
    ctx.moveTo(-20, y - 120);
    ctx.lineTo(900, y - 150);
    ctx.lineTo(860, y + 90);
    ctx.lineTo(-20, y + 110);
    ctx.closePath();
    fo(ctx, o.bg || pal.line, 0);
    ctx.fillStyle = o.color || pal.gold;
    ctx.beginPath();
    ctx.moveTo(-20, y + 110);
    ctx.lineTo(860, y + 90);
    ctx.lineTo(855, y + 110);
    ctx.lineTo(-20, y + 132);
    ctx.closePath();
    ctx.fill();
    text(ctx, name, 90, y - 40, { size: o.size || 120, fill: o.color || pal.gold, lw: 0, align: 'left', skew: -0.15, rot: -0.03 });
    text(ctx, sub, 96, y + 55, { size: o.subSize || 38, fill: '#ffffff', lw: 0, align: 'left', rot: -0.03 });
    ctx.restore();
  }

  /** stamp(ctx, str, x, y, t, t0, o{ size, color, rot }): rubber stamp slamming in (big -> 1) with a box. */
  function stamp(ctx, str, x, y, t, t0, o = {}) {
    if (t < t0 - 1e-6) return;
    const u = clamp((t - t0) / 0.12);
    const sc = lerp(2.4, 1, L.ease.outQuad(u));
    const size = o.size || 110;
    const col = o.color || '#e3243b';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(o.rot == null ? -0.18 : o.rot);
    ctx.scale(sc, sc);
    ctx.globalAlpha *= lerp(0.3, 0.92, u);
    const w = measure(ctx, str, size) + size * 0.6, h = size * 1.4;
    rrect(ctx, -w / 2, -h / 2, w, h, 14);
    ctx.lineWidth = size * 0.1;
    ctx.strokeStyle = col;
    ctx.stroke();
    text(ctx, str, 0, 4, { size, fill: col, lw: 0 });
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Props (origin conventions noted per prop; s = scale)
  // ---------------------------------------------------------------------------

  /**
   * burger(ctx, x, y, s, o{ bite (0..1 eaten from the right), rot, glow }): classic stacked
   * burger, 220 px wide at s = 1, centred at (x, y). bite removes the right side in round bites.
   */
  function burger(ctx, x, y, s = 1, o = {}) {
    const bite = clamp(o.bite || 0);
    if (bite >= 0.999) return;
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(s, s);
    if (o.glow) {
      const g = ctx.createRadialGradient(0, 0, 40, 0, 0, 220);
      g.addColorStop(0, 'rgba(255,230,120,0.7)');
      g.addColorStop(1, 'rgba(255,230,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 220, 0, TAU); ctx.fill();
    }
    if (bite > 0) {
      // clip away a scalloped bite from the right
      const edge = 110 - bite * 220;
      ctx.beginPath();
      ctx.moveTo(-200, -200);
      ctx.lineTo(edge, -200);
      for (let i = 0; i <= 6; i++) {
        const yy = -130 + i * 45;
        ctx.arc(edge + 8, yy, 28, -Math.PI / 2, Math.PI / 2, true);
      }
      ctx.lineTo(edge, 200);
      ctx.lineTo(-200, 200);
      ctx.closePath();
      ctx.clip();
    }
    const lw = 5;
    // bottom bun
    rrect(ctx, -100, 34, 200, 42, 20); fo(ctx, pal.bunShade, lw);
    // patty
    rrect(ctx, -108, 6, 216, 38, 18); fo(ctx, pal.patty, lw);
    ctx.fillStyle = pal.pattyShade;
    for (let i = 0; i < 5; i++) { ellipse(ctx, -70 + i * 35, 26, 7, 4); ctx.fill(); }
    // cheese
    ctx.beginPath();
    ctx.moveTo(-104, 0); ctx.lineTo(104, 0); ctx.lineTo(96, 12); ctx.lineTo(60, 12); ctx.lineTo(48, 30); ctx.lineTo(36, 12);
    ctx.lineTo(-30, 12); ctx.lineTo(-44, 34); ctx.lineTo(-58, 12); ctx.lineTo(-100, 12); ctx.closePath();
    fo(ctx, pal.cheese, 4);
    // tomato + lettuce
    rrect(ctx, -98, -14, 196, 16, 8); fo(ctx, pal.tomato, 4);
    ctx.beginPath();
    ctx.moveTo(-112, -14);
    for (let i = 0; i <= 12; i++) ctx.lineTo(-112 + i * 18.7, -14 + (i % 2 ? 12 : -4));
    ctx.lineTo(112, -22); ctx.lineTo(-112, -22); ctx.closePath();
    fo(ctx, pal.lettuce, 4);
    // top bun
    ctx.beginPath();
    ctx.moveTo(-106, -20);
    ctx.bezierCurveTo(-106, -110, 106, -110, 106, -20);
    ctx.closePath();
    fo(ctx, pal.bun, lw);
    ctx.fillStyle = pal.bunTop;
    ctx.beginPath(); ctx.ellipse(-30, -64, 46, 18, -0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = pal.sesame;
    [[-60, -50], [-30, -74], [0, -80], [30, -70], [60, -52], [-10, -54], [44, -40], [-78, -34]].forEach(([sx, sy], i) => {
      ellipse(ctx, sx, sy, 6, 3.5, (i % 3) * 0.5 - 0.5); ctx.fill();
    });
    ctx.restore();
  }

  /** fries(ctx, x, y, s, o{ box, color, label }): fries carton, origin at the carton's bottom centre, 150 px wide at s=1. box=false draws a single fry stick at (x,y) rotated o.rot. */
  function fries(ctx, x, y, s = 1, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(s, s);
    if (o.box === false) {
      rrect(ctx, -8, -55, 16, 110, 4); fo(ctx, pal.fries, 3.5);
      ctx.restore();
      return;
    }
    for (let i = 0; i < 9; i++) {
      const fx = -56 + i * 14, fh = 150 + (i * 37 % 40), rot = (i - 4) * 0.05;
      ctx.save();
      ctx.translate(fx, -120);
      ctx.rotate(rot);
      rrect(ctx, -8, -fh + 60, 16, fh, 4); fo(ctx, i % 2 ? pal.fries : pal.friesShade, 3.5);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(-75, -150); ctx.quadraticCurveTo(0, -110, 75, -150); ctx.lineTo(58, 0); ctx.lineTo(-58, 0); ctx.closePath();
    fo(ctx, o.color || pal.mcRed, 5);
    if (o.label !== false) {
      ctx.fillStyle = pal.mcGold;
      ctx.beginPath(); ctx.arc(0, -70, 24, 0, TAU); ctx.fill();
      ctx.fillStyle = o.color || pal.mcRed;
      ctx.beginPath(); ctx.arc(0, -70, 10, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /** bucket(ctx, x, y, s, o{ label }): fried-chicken bucket, bottom centre origin, 220 px wide at s=1. */
  function bucket(ctx, x, y, s = 1, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    // chicken pieces on top
    [[-60, -250, 0.3], [0, -275, -0.2], [60, -250, 0.5], [-25, -240, 0.9], [30, -238, -0.8]].forEach(([cx, cy, r]) => {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(r);
      curve(ctx, [[-44, 0], [-30, -30], [0, -38], [34, -26], [46, 4], [24, 30], [-20, 30]]); fo(ctx, pal.chicken, 4.5);
      ctx.fillStyle = pal.chickenShade;
      ellipse(ctx, -8, 6, 10, 5); ctx.fill(); ellipse(ctx, 16, -10, 7, 4); ctx.fill();
      ctx.restore();
    });
    ctx.beginPath();
    ctx.moveTo(-115, -220); ctx.lineTo(115, -220); ctx.lineTo(90, 0); ctx.lineTo(-90, 0); ctx.closePath();
    fo(ctx, '#ffffff', 5);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = pal.kfgRed;
    for (let i = -4; i <= 4; i += 2) {
      ctx.beginPath();
      ctx.moveTo(i * 26 - 13, -220); ctx.lineTo(i * 26 + 13, -220); ctx.lineTo(i * 20 + 10, 0); ctx.lineTo(i * 20 - 10, 0); ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(-115, -220); ctx.lineTo(115, -220); ctx.lineTo(90, 0); ctx.lineTo(-90, 0); ctx.closePath();
    fo(ctx, null, 5);
    rrect(ctx, -120, -232, 240, 22, 8); fo(ctx, pal.kfgRed, 5);
    if (o.label !== false) {
      ellipse(ctx, 0, -110, 62, 44); fo(ctx, '#ffffff', 4);
      text(ctx, o.label || 'KFG', 0, -108, { size: 44, fill: pal.kfgRed, lw: 0 });
    }
    ctx.restore();
  }

  /** drumstick(ctx, x, y, s, o{ rot, bite }): fried drumstick, origin at the bone end, 200 px long along +x at s=1. */
  function drumstick(ctx, x, y, s = 1, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(o.rot || 0);
    ctx.scale(s, s);
    // bone
    rrect(ctx, -10, -9, 70, 18, 9); fo(ctx, '#fff3dc', 4.5);
    ctx.beginPath(); ctx.arc(-10, -10, 13, 0, TAU); ctx.arc(-10, 10, 13, 0, TAU); fo(ctx, '#fff3dc', 4.5);
    // meat
    const bite = clamp(o.bite || 0);
    ctx.beginPath();
    ctx.moveTo(50, -18);
    ctx.bezierCurveTo(90, -60, 200, -62, 205, 0);
    ctx.bezierCurveTo(200, 62, 90, 60, 50, 18);
    ctx.closePath();
    fo(ctx, pal.chicken, 5);
    ctx.fillStyle = pal.chickenShade;
    [[110, -20], [150, 12], [175, -25], [95, 18], [135, -38]].forEach(([cx, cy]) => { ellipse(ctx, cx, cy, 11, 6, 0.3); ctx.fill(); });
    if (bite > 0) {
      ctx.fillStyle = '#fff1d6';
      ctx.beginPath();
      ctx.arc(205 - bite * 60, -8, 34 * bite + 6, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = pal.line; ctx.lineWidth = 4; ctx.stroke();
    }
    ctx.restore();
  }

  /** drink(ctx, x, y, s, o{ color, label }): soda cup with straw, bottom centre origin, 110 px wide at s=1. */
  function drink(ctx, x, y, s = 1, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(18, -200); ctx.lineTo(38, -270); ctx.lineTo(50, -266); ctx.lineTo(30, -196); ctx.closePath(); fo(ctx, '#ffffff', 4);
    ctx.beginPath(); ctx.moveTo(-55, -190); ctx.lineTo(55, -190); ctx.lineTo(42, 0); ctx.lineTo(-42, 0); ctx.closePath(); fo(ctx, o.color || pal.drink, 5);
    rrect(ctx, -62, -205, 124, 20, 8); fo(ctx, '#ffffff', 5);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, -100, 26, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /** crown(ctx, x, y, s, o{ color, rot }): paper crown, bottom centre origin, 200 px wide at s=1. */
  function crown(ctx, x, y, s = 1, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(-100, 0); ctx.lineTo(-100, -60); ctx.lineTo(-62, -95); ctx.lineTo(-36, -52); ctx.lineTo(0, -110);
    ctx.lineTo(36, -52); ctx.lineTo(62, -95); ctx.lineTo(100, -60); ctx.lineTo(100, 0); ctx.closePath();
    fo(ctx, o.color || pal.gold, 5);
    ctx.fillStyle = pal.goldShade;
    ctx.fillRect(-98, -24, 196, 20);
    ctx.fillStyle = '#e8413c'; ctx.beginPath(); ctx.arc(0, -60, 12, 0, TAU); ctx.fill();
    ctx.fillStyle = '#35b4ff'; ctx.beginPath(); ctx.arc(-58, -54, 9, 0, TAU); ctx.arc(58, -54, 9, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /**
   * phone(ctx, x, y, s, o{ rot, screen(ctx, w, h), buzz(t) , color }): smartphone, centred at (x,y),
   * 240 x 480 at s=1. screen draws in local coords with origin at the screen's top-left.
   */
  function phone(ctx, x, y, s = 1, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(s, s);
    rrect(ctx, -120, -240, 240, 480, 38); fo(ctx, o.color || '#20202a', 6);
    rrect(ctx, -106, -222, 212, 444, 26); fo(ctx, o.screenBg || '#101826', 0);
    if (o.screen) {
      ctx.save();
      rrect(ctx, -106, -222, 212, 444, 26); ctx.clip();
      ctx.translate(-106, -222);
      o.screen(ctx, 212, 444);
      ctx.restore();
    }
    rrect(ctx, -30, -214, 60, 14, 7); fo(ctx, '#000', 0);
    ctx.restore();
  }

  /** plane(ctx, x, y, s, o{ rot, windows, face(ctx) }): white airliner, side view facing right, centred, 560 px long at s=1. */
  function plane(ctx, x, y, s = 1, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(o.flip ? -s : s, s);
    // far wing
    ctx.beginPath(); ctx.moveTo(-20, -20); ctx.lineTo(-110, -120); ctx.lineTo(-60, -120); ctx.lineTo(60, -20); ctx.closePath(); fo(ctx, '#c9d3e6', 5);
    // tail fin
    ctx.beginPath(); ctx.moveTo(-230, -20); ctx.lineTo(-280, -150); ctx.lineTo(-230, -150); ctx.lineTo(-160, -24); ctx.closePath(); fo(ctx, o.tail || '#e8413c', 5);
    // fuselage
    ctx.beginPath();
    ctx.moveTo(-285, -30);
    ctx.lineTo(200, -44);
    ctx.bezierCurveTo(270, -44, 290, -10, 280, 10);
    ctx.bezierCurveTo(270, 30, 240, 36, 200, 36);
    ctx.lineTo(-250, 30);
    ctx.quadraticCurveTo(-285, 20, -285, -30);
    ctx.closePath();
    fo(ctx, '#ffffff', 5);
    ctx.fillStyle = '#dde5f2';
    ctx.fillRect(-250, 14, 460, 14);
    // stripe
    ctx.fillStyle = o.stripe || '#27335c';
    ctx.fillRect(-270, -6, 520, 9);
    // cockpit
    ctx.beginPath(); ctx.moveTo(228, -30); ctx.lineTo(262, -24); ctx.lineTo(268, -10); ctx.lineTo(232, -12); ctx.closePath(); fo(ctx, '#27335c', 3);
    // windows
    ctx.fillStyle = '#6fb6ff';
    for (let i = 0; i < 14; i++) { rrect(ctx, -200 + i * 28, -30, 14, 16, 6); fo(ctx, '#6fb6ff', 2.5); }
    if (o.face) { ctx.save(); ctx.translate(-200 + 10 * 28 + 7, -22); o.face(ctx); ctx.restore(); }
    // near wing + engine
    ctx.beginPath(); ctx.moveTo(-30, 10); ctx.lineTo(-130, 120); ctx.lineTo(-70, 124); ctx.lineTo(70, 16); ctx.closePath(); fo(ctx, '#e6ecf6', 5);
    rrect(ctx, -60, 44, 90, 34, 16); fo(ctx, '#b9c4d8', 5);
    ctx.restore();
  }

  /** suitcase(ctx, x, y, s, o{ color, tag }): rolling suitcase, bottom centre origin, 220 x 300 at s=1. */
  function suitcase(ctx, x, y, s = 1, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    // handle
    ctx.strokeStyle = pal.line; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(-50, -300); ctx.lineTo(-50, -390); ctx.lineTo(50, -390); ctx.lineTo(50, -300); ctx.stroke();
    ctx.strokeStyle = '#9aa3b8'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-50, -300); ctx.lineTo(-50, -390); ctx.lineTo(50, -390); ctx.lineTo(50, -300); ctx.stroke();
    rrect(ctx, -110, -310, 220, 290, 26); fo(ctx, o.color || '#e8413c', 6);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let i = -1; i <= 1; i++) ctx.fillRect(i * 60 - 6, -300, 12, 272);
    // wheels
    ellipse(ctx, -70, -10, 16, 16); fo(ctx, '#333', 4);
    ellipse(ctx, 70, -10, 16, 16); fo(ctx, '#333', 4);
    // stickers
    // flag stickers (Spain, Armenia) as colour bands: no text, so nothing trips the safe-area check
    rrect(ctx, -76, -252, 72, 46, 6); fo(ctx, '#c60b1e', 3);
    ctx.fillStyle = '#ffc400'; ctx.fillRect(-74, -240, 68, 22);
    rrect(ctx, 20, -150, 72, 46, 6); fo(ctx, '#d90012', 3);
    ctx.fillStyle = '#0033a0'; ctx.fillRect(22, -135, 68, 15);
    ctx.fillStyle = '#f2a800'; ctx.fillRect(22, -120, 68, 14);
    if (o.tag !== false) {
      ctx.strokeStyle = pal.line; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(40, -300); ctx.lineTo(70, -250); ctx.stroke();
      ctx.save(); ctx.translate(76, -236); ctx.rotate(0.3); rrect(ctx, -24, -14, 48, 28, 5); fo(ctx, '#fff6d0', 3);
      plane(ctx, 0, 0, 0.06); ctx.restore();
    }
    ctx.restore();
  }

  /** lsLogo(ctx, x, y, s, o{ word, wordSize }): LiquidityScan mark (a droplet with a rising chart line), centred, 120 px at s=1. word=true adds "LIQUIDITYSCAN" under it. */
  function lsLogo(ctx, x, y, s = 1, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const g = ctx.createLinearGradient(0, -60, 0, 60);
    g.addColorStop(0, pal.lsBlue);
    g.addColorStop(1, pal.lsGreen);
    ctx.beginPath();
    ctx.moveTo(0, -62);
    ctx.bezierCurveTo(28, -24, 48, 0, 48, 22);
    ctx.arc(0, 22, 48, 0, Math.PI);
    ctx.bezierCurveTo(-48, 0, -28, -24, 0, -62);
    ctx.closePath();
    fo(ctx, g, o.lw == null ? 5 : o.lw);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-30, 40); ctx.lineTo(-10, 16); ctx.lineTo(6, 28); ctx.lineTo(30, -6);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(16, -8); ctx.lineTo(32, -8); ctx.lineTo(32, 8); ctx.stroke();
    if (o.word) text(ctx, 'LIQUIDITYSCAN', 0, 110, { size: o.wordSize || 40, fill: '#ffffff', lw: o.wordLw == null ? 0 : o.wordLw, letter: 2 });
    ctx.restore();
  }

  /**
   * candles(ctx, x, y, w, h, o{ n, seed, trend, burger, t, grow, colorUp, colorDown }): candlestick
   * chart in a box. trend: -1..1 overall slope. grow 0..1 reveals candles left to right. burger=true
   * draws each candle body as a tiny burger stack.
   */
  function candles(ctx, x, y, w, h, o = {}) {
    const n = o.n || 24, seed = o.seed || 77, trend = o.trend == null ? 0.4 : o.trend;
    const grow = o.grow == null ? 1 : clamp(o.grow);
    const cw = w / n;
    let v = 0.5 - trend * 0.35;
    const vals = [];
    for (let i = 0; i < n; i++) {
      const open = v;
      v = clamp(v + trend * (0.7 / n) + (h01('cd', seed, i) - 0.5) * 0.12, 0.05, 0.95);
      const close = v;
      const hi = Math.max(open, close) + h01('ch', seed, i) * 0.05;
      const lo = Math.min(open, close) - h01('cl', seed, i) * 0.05;
      vals.push([open, close, hi, lo]);
    }
    ctx.save();
    const shown = Math.floor(n * grow + 1e-6);
    for (let i = 0; i < shown; i++) {
      const [op, cl, hi, lo] = vals[i];
      const cx = x + (i + 0.5) * cw;
      const up = cl >= op;
      const col = up ? (o.colorUp || pal.up) : (o.colorDown || pal.down);
      const Y = (v2) => y + h - v2 * h;
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(2, cw * 0.1);
      ctx.beginPath(); ctx.moveTo(cx, Y(hi)); ctx.lineTo(cx, Y(lo)); ctx.stroke();
      const top = Y(Math.max(op, cl)), bot = Y(Math.min(op, cl));
      const bh = Math.max(4, bot - top);
      if (o.burger) {
        burger(ctx, cx, top + bh / 2, Math.max(0.12, cw / 260));
      } else {
        ctx.fillStyle = col;
        ctx.fillRect(cx - cw * 0.32, top, cw * 0.64, bh);
      }
    }
    ctx.restore();
    return vals;
  }

  /** monitor(ctx, x, y, w, h, o{ screen(ctx, w, h), glow, stand }): desktop monitor, top-left at (x, y). */
  function monitor(ctx, x, y, w, h, o = {}) {
    ctx.save();
    if (o.stand !== false) {
      ctx.fillStyle = '#2a2a36';
      ctx.fillRect(x + w / 2 - 14, y + h, 28, 50);
      rrect(ctx, x + w / 2 - 70, y + h + 44, 140, 16, 6); fo(ctx, '#2a2a36', 4);
    }
    if (o.glow) {
      ctx.save();
      ctx.shadowColor = o.glow;
      ctx.shadowBlur = 60;
      rrect(ctx, x, y, w, h, 12);
      ctx.fillStyle = o.glow;
      ctx.fill();
      ctx.restore();
    }
    rrect(ctx, x, y, w, h, 12); fo(ctx, '#15151f', 6);
    ctx.save();
    rrect(ctx, x + 12, y + 12, w - 24, h - 24, 6);
    ctx.clip();
    ctx.fillStyle = pal.termBg;
    ctx.fillRect(x + 12, y + 12, w - 24, h - 24);
    if (o.screen) { ctx.translate(x + 12, y + 12); o.screen(ctx, w - 24, h - 24); }
    ctx.restore();
    ctx.restore();
  }

  /** mug(ctx, x, y, s, o{ t, color }): coffee mug with steam, bottom centre origin, 80 px wide at s=1. */
  function mug(ctx, x, y, s = 1, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = pal.line; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.arc(42, -50, 22, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.strokeStyle = o.color || '#ffffff'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(42, -50, 22, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    rrect(ctx, -40, -100, 80, 100, 12); fo(ctx, o.color || '#ffffff', 5);
    lsLogo(ctx, 0, -50, 0.3, { lw: 2 });
    ctx.restore();
    if (o.t != null) steam(ctx, x, y - 110 * s, o.t, { h: 80 * s });
  }

  /**
   * leash(ctx, a:[x,y], b:[x,y], o{ sag, taut, color, width }): leash curve from collar a to hand b.
   * sag in px (default 60), taut=true draws it straight and vibrating.
   */
  function leash(ctx, a, b, o = {}) {
    const sag = o.taut ? 0 : (o.sag == null ? 60 : o.sag);
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 + sag;
    const jit = o.taut ? (h01('lj', L.boil(L.T)) - 0.5) * 10 : 0;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(mx, my + jit, b[0], b[1]);
    ctx.strokeStyle = pal.line; ctx.lineWidth = (o.width || 7) + 5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(mx, my + jit, b[0], b[1]);
    ctx.strokeStyle = o.color || pal.leash; ctx.lineWidth = o.width || 7; ctx.stroke();
    ctx.restore();
  }

  /** flag(ctx, x, y, s, country 'AM'|'ES', o{ t }): small waving flag on a pole, pole base at (x, y). */
  function flag(ctx, x, y, s = 1, country = 'AM', o = {}) {
    const cols = country === 'ES' ? ['#c60b1e', '#ffc400', '#ffc400', '#c60b1e'] : ['#d90012', '#0033a0', '#f2a800'];
    const bands = country === 'ES' ? [0.25, 0.5, 0.25] : [1 / 3, 1 / 3, 1 / 3];
    const bc = country === 'ES' ? ['#c60b1e', '#ffc400', '#c60b1e'] : cols;
    const t = o.t || 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = pal.line; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -160); ctx.stroke();
    const fw = 110, fh = 70;
    let yy = -160;
    bands.forEach((bh, i) => {
      const hh = bh * fh;
      ctx.beginPath();
      for (let k = 0; k <= 10; k++) { const u = k / 10; ctx.lineTo(u * fw, yy + Math.sin(u * 5 - t * 6) * 6 * u); }
      for (let k = 10; k >= 0; k--) { const u = k / 10; ctx.lineTo(u * fw, yy + hh + Math.sin(u * 5 - t * 6) * 6 * u); }
      ctx.closePath();
      ctx.fillStyle = bc[i];
      ctx.fill();
      yy += hh;
    });
    ctx.beginPath();
    for (let k = 0; k <= 10; k++) { const u = k / 10; ctx.lineTo(u * fw, -160 + Math.sin(u * 5 - t * 6) * 6 * u); }
    for (let k = 10; k >= 0; k--) { const u = k / 10; ctx.lineTo(u * fw, -160 + fh + Math.sin(u * 5 - t * 6) * 6 * u); }
    ctx.closePath();
    ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
  }

  FILM.fx = Object.freeze({
    pal, TAU, clamp, lerp, h01,
    shake, shakeMany, pop, popIn, bounce, wiggle, beatPulse,
    sky, sunburst, focusLines, speedLines, impact, halftone, gloom, vignette, flash, bokeh, stars, ararat, clouds, cloud,
    poly, curve, fo, ellipse, rrect, star,
    burst, sparkle, sparkles, sweat, vein, heart, hearts, aura, menace, aroma, steam, dust, crumbs, shockRing, notes,
    tearStream, puddle, motionSmear,
    font, text, measure, wrap, sfx, bubble, caption, tag, introCard, stamp,
    burger, fries, bucket, drumstick, drink, crown, phone, plane, suitcase, lsLogo, candles, monitor, mug, leash, flag,
  });
})();
