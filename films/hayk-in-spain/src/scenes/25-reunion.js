// Shot 25 'reunion' : The reunion. Global T 108..114 (6 s).
// Anime slow-motion reunion run through a golden-hour flower field. Hayk (run, cry, belly 0.8) from
// the left, Goofy (run, happy) from the right. Close-up panels of both faces during the run.
// 2.0 s: they meet, white flash, Goofy leaps into Hayk's arms (hug), hearts burst.
// Grant lies flat in the background (collapse, exhausted); "FINALLY..." bubble at 4.0 s.
//
// Layers (back to front):
//   1 cached background: golden sky, sun glow, faint Ararat, hills, flower field
//   2 god rays + far bokeh
//   3 Grant collapsed in the mid field
//   4 hug sunburst glow (after 2.0)
//   5 Hayk + Goofy (run / leap / hug) with the arms-over trick for the hug
//   6 foreground flowers, petals, near bokeh, hearts, sparkles
//   7 screen-fixed: close-up panels (0.45..1.8), flash, bubble, slow-mo vignette
(function () {
  'use strict';
  const ID = 'reunion';
  const FILM = window.FILM;
  const LIB = FILM.lib;
  const F = FILM.fx;
  const C = F.pal;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const W = 1080, H = 1920;
  const h01 = (...k) => F.h01(ID, ...k);

  // beats (local t; global = 108 + t)
  const T_PANEL_IN = 0.45; // T 108.45
  const T_LEAP = 1.75; //     T 109.75
  const T_MEET = 2.0; //      T 110.0 flash, hug
  const T_FINALLY = 4.0; //   T 112.0 Grant's bubble

  const GROUND = 1590; // hero ground line
  const HORIZON = 1010;
  const HAYK_S = 1.3, GOOFY_S = 1.45;

  // ---------------------------------------------------------------------------
  // 1. static background (constants only)
  // ---------------------------------------------------------------------------
  function flowerHead(g, x, y, r, petal, core, n) {
    g.fillStyle = petal;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      g.moveTo(x + Math.cos(a) * r * 0.55 + r * 0.5, y + Math.sin(a) * r * 0.55);
      g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55 * 0.8, r * 0.5, r * 0.4, a, 0, TAU);
    }
    g.fill();
    g.fillStyle = core;
    g.beginPath(); g.arc(x, y, r * 0.3, 0, TAU); g.fill();
  }

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
    // sky: warm golden hour
    F.sky(g, '#ff9a7a', '#ffe3a0', { h: HORIZON + 40, mid: '#ffb98a', midAt: 0.55 });
    // high wispy pink clouds
    g.save();
    g.globalAlpha = 0.55;
    [[120, 330, 360], [640, 250, 420], [860, 520, 300], [300, 640, 260]].forEach(([x, y, w], i) => {
      F.cloud(g, x, y, w, i % 2 ? '#ffd0c4' : '#ffc8d8', 'rgba(255,140,140,0.35)');
    });
    g.restore();
    // sun glow
    const sg = g.createRadialGradient(560, 900, 20, 560, 900, 620);
    sg.addColorStop(0, 'rgba(255,255,230,1)');
    sg.addColorStop(0.18, 'rgba(255,240,170,0.95)');
    sg.addColorStop(0.5, 'rgba(255,200,120,0.35)');
    sg.addColorStop(1, 'rgba(255,170,120,0)');
    g.fillStyle = sg;
    g.fillRect(0, 200, W, HORIZON);
    g.fillStyle = '#fffbe6';
    g.beginPath(); g.arc(560, 900, 118, 0, TAU); g.fill();
    // faint Ararat far away, hazy
    F.ararat(g, -60, HORIZON - 30, 760, 330, { color: '#d99aa8', shade: '#c78898', snow: '#fff0ec' });
    // far hills
    g.fillStyle = '#e7a28e';
    g.beginPath(); g.moveTo(0, HORIZON - 20);
    for (let x = 0; x <= W; x += 30) g.lineTo(x, HORIZON - 30 - Math.sin(x * 0.006 + 1) * 34 - Math.sin(x * 0.017) * 10);
    g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    // tiny distant tree line
    g.fillStyle = '#b9837e';
    for (let i = 0; i < 26; i++) {
      const x = 560 + i * 20 + h01('tl', i) * 14, r = 12 + h01('tr', i) * 14;
      g.beginPath(); g.arc(x, HORIZON - 40 - Math.sin(x * 0.006 + 1) * 34 - r * 0.4, r, 0, TAU); g.fill();
    }
    // meadow bands, receding (lighter far, richer near)
    const bands = [
      [HORIZON + 0, '#c9b86a'], [HORIZON + 60, '#b8c066'], [HORIZON + 170, '#9fc25e'], [HORIZON + 330, '#86bb54'], [HORIZON + 520, '#6fae4a'],
    ];
    bands.forEach(([y, col], i) => {
      g.fillStyle = col;
      g.beginPath(); g.moveTo(0, y + 20);
      for (let x = 0; x <= W; x += 40) g.lineTo(x, y + Math.sin(x * 0.004 + i * 1.7) * (12 + i * 8));
      g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    });
    // golden rim on the field (backlit)
    const rim = g.createLinearGradient(0, HORIZON, 0, HORIZON + 380);
    rim.addColorStop(0, 'rgba(255,220,140,0.55)');
    rim.addColorStop(1, 'rgba(255,220,140,0)');
    g.fillStyle = rim; g.fillRect(0, HORIZON - 40, W, 420);
    // flower dots: tiny far, bigger near (perspective)
    const cols = [['#ff8fb8', '#fff0a0'], ['#ffd3e6', '#ffc93a'], ['#fff6f0', '#ffb030'], ['#ffb347', '#e0602a'], ['#f06aa0', '#fff3b0']];
    for (let i = 0; i < 520; i++) {
      const v = Math.pow(h01('fy', i), 1.5);
      const y = HORIZON + 10 + v * (H - HORIZON);
      const x = h01('fx', i) * W;
      const r = 3 + v * 22;
      const cc = cols[i % cols.length];
      flowerHead(g, x, y, r, cc[0], cc[1], 5);
    }
    // grass tufts
    g.strokeStyle = '#4f9440';
    g.lineCap = 'round';
    for (let i = 0; i < 180; i++) {
      const v = Math.pow(h01('gy', i), 1.3);
      const y = HORIZON + 40 + v * (H - HORIZON);
      const x = h01('gx', i) * W;
      const hh = 8 + v * 40;
      g.lineWidth = 1.5 + v * 3;
      g.beginPath();
      g.moveTo(x - hh * 0.3, y - hh); g.lineTo(x, y); g.lineTo(x + hh * 0.35, y - hh * 0.9);
      g.moveTo(x, y); g.lineTo(x + 2, y - hh * 1.1);
      g.stroke();
    }
    return c;
  }

  // ---------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------
  function petals(ctx, t, n, seed, near) {
    for (let i = 0; i < n; i++) {
      const sp = (near ? 90 : 45) * (0.6 + h01('ps', seed, i));
      const span = H + 400;
      const y = ((h01('py', seed, i) * span + t * sp) % span) - 200;
      const x = ((h01('px', seed, i) * (W + 300) - t * sp * 0.8 + Math.sin(t * 1.3 + i) * 40) % (W + 300) + (W + 300)) % (W + 300) - 150;
      const r = (near ? 16 : 8) * (0.7 + h01('pr', seed, i) * 0.8);
      const rot = t * (1 + h01('pw', seed, i) * 2) + i;
      const flipk = Math.cos(t * 2.2 + i * 1.3);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(1, 0.35 + 0.65 * Math.abs(flipk));
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * 0.9, -r * 0.2, 0, r);
      ctx.quadraticCurveTo(-r * 0.9, -r * 0.2, 0, -r);
      ctx.fillStyle = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#ffb3cf' : '#ff8fb8';
      ctx.fill();
      if (near) { ctx.strokeStyle = 'rgba(180,60,110,0.6)'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.restore();
    }
  }

  function fgFlowers(ctx, t) {
    // big blurry-ish foreground flowers swaying at the bottom edge
    for (let i = 0; i < 16; i++) {
      const x = (i / 15) * (W + 120) - 60 + (h01('ffx', i) - 0.5) * 60;
      const y = H - 120 + h01('ffy', i) * 160;
      const r = 34 + h01('ffr', i) * 30;
      const sway = Math.sin(t * 1.4 + i * 1.7) * 10;
      ctx.save();
      ctx.strokeStyle = '#3f7d34'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, H + 40); ctx.quadraticCurveTo(x + sway * 0.3, y + 80, x + sway, y); ctx.stroke();
      ctx.fillStyle = '#56a445';
      ctx.beginPath(); ctx.ellipse(x - 22, y + 90, 26, 10, -0.6, 0, TAU); ctx.fill();
      const cc = i % 3 === 0 ? ['#ff7fae', '#ffe27a'] : i % 3 === 1 ? ['#fff4f8', '#ffb838'] : ['#ffb0cf', '#ff8a3a'];
      ctx.lineWidth = 4; ctx.strokeStyle = C.line;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + t * 0.2;
        ctx.moveTo(x + sway + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 0.55);
        ctx.ellipse(x + sway + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.4, r * 0.5, r * 0.3, a, 0, TAU);
      }
      ctx.fillStyle = cc[0];
      ctx.fill();
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x + sway, y, r * 0.28, 0, TAU);
      F.fo(ctx, cc[1], 4);
      ctx.restore();
    }
  }

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

  function godRays(ctx, t, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(255,248,210,0.22)';
    ctx.beginPath();
    const n = 14, cx = 560, cy = 900;
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI * 1.05 + (i / n) * Math.PI * 0.9 + Math.sin(t * 0.3 + i) * 0.02;
      const a1 = a0 + 0.05 + h01('gr', i) * 0.05;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a0) * 1400, cy + Math.sin(a0) * 1400);
      ctx.lineTo(cx + Math.cos(a1) * 1400, cy + Math.sin(a1) * 1400);
      ctx.closePath();
      // rays below the horizon too, fanning over the field
      const b0 = Math.PI * 0.1 + (i / n) * Math.PI * 0.8, b1 = b0 + 0.04 + h01('gb', i) * 0.04;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(b0) * 1400, cy + Math.sin(b0) * 1400);
      ctx.lineTo(cx + Math.cos(b1) * 1400, cy + Math.sin(b1) * 1400);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }

  // Hayk hugging Goofy: Hayk, then Goofy in front, then Hayk's forearm band redrawn over Goofy
  // (clip to the band where the hug pose crosses the forearms) so the arms wrap the dog.
  function hugGroup(ctx, t, x, y, s, gs, tiltH, o = {}) {
    const hOpts = { x, y, s, t, pose: 'hug', face: o.face || 'cry', belly: 0.8, tilt: tiltH, crown: o.crown, shades: false };
    const a = FILM.cast.hayk(ctx, hOpts);
    if ((o.face || 'cry') === 'cry') FILM.cast.tears(ctx, a, o.tt == null ? t : o.tt, s * 0.8);
    // Goofy: cheek to cheek, head just right of Hayk's face, body slanting down across his chest
    const tl = -0.12 + tiltH;
    const hdx = 106 * gs, hdy = -240 * gs;
    const target = [a.head[0] + 150 * s, a.head[1] + 40 * s];
    const gx = target[0] - (hdx * Math.cos(tl) - hdy * Math.sin(tl));
    const gy = target[1] - (hdx * Math.sin(tl) + hdy * Math.cos(tl));
    const g = FILM.cast.goofy(ctx, { x: gx, y: gy, s: gs, t, pose: 'jump', face: 'happy', tilt: tl });
    // forearm band (local hug pose: forearms horizontal at y ~ -276, hands meet at the chest)
    const hy = (a.handL[1] + a.handR[1]) / 2;
    const hx = (a.handL[0] + a.handR[0]) / 2;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(tiltH);
    ctx.beginPath();
    ctx.rect(-150 * s, -24 * s, 300 * s, 51 * s);
    ctx.restore();
    ctx.save();
    ctx.clip();
    FILM.cast.hayk(ctx, hOpts);
    ctx.restore();
    return { a, g };
  }

  // ---------------------------------------------------------------------------
  function draw(ctx, tIn, info) {
    const t = clamp(tIn, 0, info.dur);
    const tw = LIB.onTwos(t);
    const bg = LIB.cached('reunion-bg', buildPaddedBg);

    // camera: slow push during the run, punch-in at the meet, gentle drift after
    let zoom = lerp(1.0, 1.05, LIB.ease.inOutSine(clamp(t / T_MEET)));
    if (t >= T_MEET) zoom = 1.05 + 0.06 * Math.exp(-(t - T_MEET) * 5) + 0.03 * LIB.ease.inOutSine(clamp((t - T_MEET) / 4));
    const camCx = 540, camCy = 1250;
    const sh = F.shakeMany(t, [[T_MEET, 0.4, 22]], 5);

    // 1. background: screen-fixed, integer shake only (no resampling)
    ctx.drawImage(bg, Math.round(sh[0] * 0.6) - PAD, Math.round(sh[1] * 0.6) - PAD);

    // 2. sun pulse + god rays (screen-fixed like the background)
    // sun pulse
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.15 * pulse;
    ctx.fillStyle = '#fffbe6';
    ctx.beginPath(); ctx.arc(560, 900, 150 + pulse * 14, 0, TAU); ctx.fill();
    ctx.restore();

    godRays(ctx, t, 1);

    ctx.save();
    ctx.translate(sh[0], sh[1]);
    ctx.translate(camCx, camCy);
    ctx.scale(zoom, zoom);
    ctx.translate(-camCx, -camCy);

    // 2b. far bokeh + petals
    F.bokeh(ctx, { n: 22, seed: 5, t: t * 0.6, y: 180, h: 1100, rMin: 14, rMax: 46, colors: ['#ffd1e8', '#fff1b8', '#ffc0d8', '#ffe6a0'], alpha: 0.5 });
    petals(ctx, t * 0.7, 26, 1, false);

    // 4. hug glow (after meet)
    if (t >= T_MEET) {
      const u = clamp((t - T_MEET) / 0.5);
      ctx.save();
      ctx.globalAlpha = 0.55 * u;
      rays(ctx, 470, 1120, 28, 1500, t * 0.12, 'rgba(255,245,200,0.55)');
      const hg = ctx.createRadialGradient(470, 1120, 40, 470, 1120, 560);
      hg.addColorStop(0, 'rgba(255,255,240,0.95)');
      hg.addColorStop(0.5, 'rgba(255,200,225,0.45)');
      hg.addColorStop(1, 'rgba(255,200,225,0)');
      ctx.fillStyle = hg;
      ctx.fillRect(470 - 560, 1120 - 560, 1120, 1120);
      ctx.restore();
    }

    // 3. Grant collapsed far behind (always there, a small dust puff when we cut wide)
    const gX = 800, gY = 1175, gS = 0.52;
    ctx.save();
    ctx.fillStyle = 'rgba(40,60,20,0.25)';
    ctx.beginPath(); ctx.ellipse(gX, gY + 6, 190, 18, 0, 0, TAU); ctx.fill();
    ctx.restore();
    const breath = Math.sin(t * 2) * 0.01;
    const ga = FILM.cast.grant(ctx, { x: gX - 150, y: gY, s: gS, t, pose: 'collapse', face: 'exhausted', tilt: breath, flip: false });
    // dizzy swirl + tiny white soul wisp over Grant
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = 0; k <= 24; k++) {
      const u = k / 24, ang = u * TAU * 1.6 + t * 4;
      const px = ga.head[0] + Math.cos(ang) * (8 + u * 24), py = ga.head[1] - 60 + Math.sin(ang) * (5 + u * 12);
      if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
    // 5. heroes
    if (t < T_MEET) {
      const u = clamp(t / T_LEAP);
      const run = LIB.ease.inOutSine(u);
      const slow = 0.1 + tw * 0.5; // slow-motion run cycle
      const hx = lerp(210, 400, run);
      const hy = GROUND + Math.sin(slow * TAU * 1.4) * 4;
      // Hayk dust behind feet
      F.dust(ctx, hx - 60, GROUND, ((t * 0.6) % 0.8), { n: 5, seed: 3, size: 30, spread: 110, color: '#fff1d0' });
      // slow-mo afterimages (two ghosts trailing behind)
      [0.16, 0.08].forEach((d, k) => {
        const hu = LIB.ease.inOutSine(clamp((t - d * 3) / T_LEAP));
        FILM.cast.hayk(ctx, { x: lerp(210, 400, hu), y: hy, s: HAYK_S, t: slow - d, pose: 'run', face: 'cry', belly: 0.8, alpha: 0.18 + k * 0.1, silhouette: '#ffd6e6' });
      });
      const a = FILM.cast.hayk(ctx, { x: hx, y: hy, s: HAYK_S, t: slow, pose: 'run', face: 'cry', belly: 0.8 });
      FILM.cast.tears(ctx, a, t, HAYK_S * 0.8);
      // Goofy: runs in from the right, leaps at 1.75
      let gx, gy, pose = 'run', tilt = 0;
      if (t < T_LEAP) {
        gx = lerp(930, 700, run);
        gy = GROUND - 10;
      } else {
        const v = clamp((t - T_LEAP) / (T_MEET - T_LEAP));
        gx = lerp(700, 520, v);
        gy = GROUND - 10 - Math.sin(v * Math.PI * 0.85) * 330 - v * 120;
        pose = 'jump';
        tilt = 0.25;
      }
      F.dust(ctx, gx + 110, GROUND - 6, ((t * 0.6 + 0.3) % 0.8), { n: 4, seed: 4, size: 26, spread: 90, color: '#fff1d0' });
      if (t < T_LEAP) {
        [0.16, 0.08].forEach((d, k) => {
          const gu = LIB.ease.inOutSine(clamp((t - d * 3) / T_LEAP));
          FILM.cast.goofy(ctx, { x: lerp(930, 700, gu), y: gy, s: GOOFY_S, t: slow - d, pose, face: 'happy', flip: true, alpha: 0.18 + k * 0.1, silhouette: '#fff0c8' });
        });
      } else {
        F.motionSmear(ctx, gx + 40, gy - 330, 360, 240, { angle: Math.PI, color: 'rgba(255,255,255,0.8)', seed: 4 });
      }
      FILM.cast.goofy(ctx, { x: gx, y: gy, s: GOOFY_S, t: slow, pose, face: 'happy', flip: true, tilt: -tilt });
    } else {
      const age = t - T_MEET;
      // spin-sway of joy, hop on beats
      const sway = Math.sin(age * 2.4) * 0.07;
      const hop = F.bounce(tw, 2, 14) * clamp(age / 0.3);
      // squash on the catch
      const sq = age < 2 / 24 ? 1 : 0;
      const x = 440, y = GROUND + hop;
      ctx.save();
      if (sq) { ctx.translate(x, y); ctx.scale(1.06, 0.92); ctx.translate(-x, -y); }
      const { a } = hugGroup(ctx, tw, x, y, HAYK_S, 1.4, sway, { tt: t });
      ctx.restore();
      // hearts burst on the meet, then keep floating up
      const burstU = clamp(age / 0.6);
      if (age < 0.8) {
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * TAU + 0.2;
          const r = 60 + LIB.ease.outCubic(burstU) * (260 + h01('hb', i) * 120);
          ctx.save();
          ctx.globalAlpha = 1 - clamp((age - 0.5) / 0.3);
          F.heart(ctx, a.chest[0] + Math.cos(ang) * r, a.chest[1] - 60 + Math.sin(ang) * r * 0.9, 1.6 + h01('hs', i) * 0.9, i % 2 ? '#ff4f86' : '#ff8fb3', 5);
          ctx.restore();
        }
      }
      F.hearts(ctx, a.head[0] + 40, a.head[1] - 60, t, { n: 9, seed: 7, spread: 520, rise: 520, scale: 1.4 });
      F.sparkles(ctx, { x: 150, y: 700, w: 700, h: 700, n: 12, seed: 23, t, size: 40 });
      F.shockRing(ctx, a.chest[0], a.chest[1], age, { r: 700, color: '#ffffff', life: 0.5, width: 30 });
      F.shockRing(ctx, a.chest[0], a.chest[1], age - 0.12, { r: 520, color: '#ffc8dd', life: 0.5, width: 20 });
    }

    // 6. foreground: near petals, near bokeh, flowers
    F.bokeh(ctx, { n: 10, seed: 11, t: t * 0.8, y: 400, h: 1500, rMin: 40, rMax: 95, colors: ['#ffc2dc', '#fff0b0'], alpha: 0.35 });
    petals(ctx, t, 22, 2, true);
    fgFlowers(ctx, tw);
    ctx.restore(); // camera

    // 7. screen-fixed overlays
    // 7a. close-up face panels during the run
    if (t >= T_PANEL_IN - 1e-6 && t < T_LEAP + 0.05) {
      drawPanels(ctx, t, tw);
    }
    // 7b. Grant's bubble
    if (t >= T_FINALLY - 1e-6) {
      const bx = 790, by = 1370;
      const gp = [gX - 150 + 0, gY];
      const scr = (p) => [camCx + (p[0] - camCx) * zoom + sh[0], camCy + (p[1] - camCy) * zoom + sh[1]];
      const gh = scr(ga.head);
      F.bubble(ctx, 'FINALLY...', bx, by, { size: 54, t, t0: T_FINALLY - 1 / 24, tail: [gh[0] - 50, gh[1] + 50], maxW: 420 });
      if (t > T_FINALLY + 0.25) F.sweat(ctx, gh[0] - 70, gh[1] - 40, 0.8);
    }
    // slow-motion soft vignette (pinkish)
    F.vignette(ctx, 0.35, '120,30,70');
    // 7c. impact frame + white flash at the meet (visible ON the beat frame)
    if (t >= T_MEET - 1e-6) {
      const age = t - T_MEET;
      if (age < 2 / 24 - 1e-6) {
        // two drawings of black-and-white impact: silhouettes of the hug on radiating lines
        F.impact(ctx, { cx: 470, cy: 1060, inner: 330, seed: 61 + LIB.boil(LIB.T) % 2 });
        ctx.save();
        ctx.translate(540, 1250); ctx.scale(1.12, 1.12); ctx.translate(-540, -1250);
        const sil = '#1b1424';
        const a = FILM.cast.hayk(ctx, { x: 440, y: GROUND, s: HAYK_S, t: 0, pose: 'hug', belly: 0.8, silhouette: sil });
        FILM.cast.goofy(ctx, { x: a.head[0] + 60, y: a.head[1] + 330, s: 1.4, t: 0, pose: 'jump', tilt: -0.12, silhouette: sil });
        ctx.restore();
        F.heart(ctx, 470, 700, 5, '#ff4f86', 10);
        F.flash(ctx, age < 1 / 24 ? 0.35 : 0, '#ffffff');
      } else {
        F.flash(ctx, 0.9 * (1 - LIB.ease.outCubic(clamp((age - 2 / 24) / 0.35))), '#fffaf0');
      }
    }
  }

  function drawPanels(ctx, t, tw) {
    const inU = LIB.ease.outExpo(clamp((t - T_PANEL_IN) / 0.3));
    const outU = LIB.ease.inCubic ? LIB.ease.inCubic(clamp((t - (T_LEAP - 0.2)) / 0.25)) : clamp((t - (T_LEAP - 0.2)) / 0.25);
    const top = 250, bot = 770, mid = 540;
    const panels = [
      { pts: [[40, top], [mid + 40, top], [mid - 20, bot], [40, bot]], dx: -(1 - inU) * 700 - outU * 700, who: 'hayk' },
      { pts: [[mid + 70, top], [1040, top], [1040, bot], [mid + 10, bot]], dx: (1 - inU) * 700 + outU * 700, who: 'goofy' },
    ];
    panels.forEach((p, i) => {
      ctx.save();
      ctx.translate(p.dx, 0);
      F.poly(ctx, p.pts);
      ctx.save();
      ctx.clip();
      // panel backdrop: pink/gold sunburst + focus lines
      const cx = i ? 800 : 290, cy = 520;
      ctx.fillStyle = i ? '#ffe7a8' : '#ffd0e0';
      ctx.fillRect(i ? 520 : 30, 240, 530, 540);
      rays(ctx, cx, cy, 20, 700, t * 0.25 * (i ? -1 : 1), i ? '#ffd27a' : '#ffb3cf');
      F.focusLines(ctx, cx, cy, { inner: 210, count: 60, color: '#ffffff', alpha: 0.75, width: 12, seed: 40 + i });
      if (p.who === 'hayk') {
        const s = 2.5;
        const a = FILM.cast.hayk(ctx, { x: 300, y: 520 + 462 * s * 1.0 - 20, s, t: tw * 0.4, pose: 'run', face: 'cry', belly: 0.8 });
        FILM.cast.tears(ctx, a, t, s * 0.8);
        F.sparkles(ctx, { x: 60, y: 260, w: 460, h: 480, n: 6, seed: 51, t, size: 30 });
      } else {
        const s = 3.0;
        // head at local (-92, -175) when flipped; centre it in the panel
        FILM.cast.goofy(ctx, { x: 780 + 100 * s, y: 560 + 175 * s, s, t: tw * 0.4, pose: 'run', face: 'happy', flip: true });
        F.sparkles(ctx, { x: 600, y: 260, w: 420, h: 480, n: 6, seed: 52, t, size: 30 });
      }
      ctx.restore();
      F.poly(ctx, p.pts);
      ctx.lineWidth = 10; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      ctx.lineWidth = 5; ctx.strokeStyle = C.line; ctx.stroke();
      ctx.restore();
    });
  }

  FILM.scene({ id: ID, draw });
})();
