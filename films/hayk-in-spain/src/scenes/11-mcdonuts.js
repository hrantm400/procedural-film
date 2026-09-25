// Shot 11 'mcdonuts' : "McDonut's"  (global T 44.0 - 49.0, local t 0..5)
//
// Beats (local):
//   0.0-2.0  slow-motion golden shower of fries in front of the McDONUT'S restaurant. Hayk (pose
//            cheer, face ecstatic, belly 0.25) catches fries with his mouth: NOM on 0.5, 1.0, 1.5
//   2.0      snap: he holds a tray with burger, fries and drink (pose hug), sparkle burst
//   3.0      he sings: bubble "BA DA BA BA BAAA!" with music notes, sways on the beat
//   caption "STOP 3: McDONUT'S" top-left the whole shot
//
// Layers back to front:
//   1 sky, clouds, far town (cached)
//   2 McDONUT'S building with the golden bitten-donut logo (cached)
//   3 golden light column, far fries (behind Hayk), sparkles
//   4 Hayk
//   5 tray / hero fries flying into the mouth, near fries (in front)
//   6 SFX, notes, sparkles
//   7 screen-fixed caption and bubble
(function () {
  'use strict';
  const ID = 'mcdonuts';
  const FILM = window.FILM;
  const F = FILM.fx;
  const P = F.pal;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const W = 1080, H = 1920;
  const FR = 1 / 24;
  // offscreen canvases match the main canvas backing (CPU when the frame is read back, as in the
  // tools), otherwise every drawImage of a cached layer costs a GPU readback
  let WRF = false;
  // full-frame cached layers are drawn with nearest-neighbour sampling: under a camera push a
  // bilinear resample of 2 M pixels costs ~50 ms on a CPU-backed canvas; flat cel art hides the difference
  function drawLayer(ctx, img, x, y, w, h) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  }
  const wrfOf = (ctx) => !!(ctx.getContextAttributes && ctx.getContextAttributes().willReadFrequently);
  const h = (...k) => F.h01(ID, ...k);

  const T_NOM = [0.5, 1.0, 1.5]; // T 44.5, 45.0, 45.5
  const T_TRAY = 2.0; // T 46.0
  const T_SING = 3.0; // T 47.0

  const HX = 610, HY = 1830, HS = 1.65;
  const GROUND = 1500;

  // ---------------------------------------------------------------------------
  // Static background
  // ---------------------------------------------------------------------------
  function townBlock(g, x, y, w, hh, wall, roof, seed) {
    g.fillStyle = wall;
    g.fillRect(x, y, w, hh);
    g.fillStyle = roof;
    g.beginPath(); g.moveTo(x - 12, y); g.lineTo(x + w / 2, y - 40); g.lineTo(x + w + 12, y); g.closePath(); g.fill();
    g.fillStyle = 'rgba(80,60,90,0.28)';
    const cols = Math.max(1, Math.floor(w / 60));
    for (let r = 0; r < Math.floor(hh / 90); r++) {
      for (let c = 0; c < cols; c++) {
        const wx = x + 18 + c * (w - 36) / cols, wy = y + 30 + r * 90;
        g.fillRect(wx, wy, 26, 40);
        if (h('bal', seed, r, c) > 0.6) { g.fillRect(wx - 6, wy + 40, 38, 6); }
      }
    }
  }
  function palm(g, x, y, s, lean) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.strokeStyle = '#8a6a44'; g.lineWidth = 22; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(lean * 60, -200, lean * 90, -420); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 4;
    for (let i = 1; i < 10; i++) { const u = i / 10; const px = lean * 90 * u * u + lean * 20 * u, py = -420 * u; g.beginPath(); g.moveTo(px - 11, py); g.lineTo(px + 11, py - 6); g.stroke(); }
    const tx = lean * 90, ty = -420;
    g.fillStyle = '#4f9a4a';
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.5;
      g.save();
      g.translate(tx, ty);
      g.rotate(a);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(90, -40, 190, 30); g.quadraticCurveTo(90, 0, 0, 0); g.fill();
      g.restore();
    }
    g.restore();
  }
  function donutLogo(g, x, y, r) {
    // golden donut with a bite taken out (the McDONUT'S logo)
    g.save();
    // glow
    const gl = g.createRadialGradient(x, y, r * 0.5, x, y, r * 1.8);
    gl.addColorStop(0, 'rgba(255,230,120,0.55)');
    gl.addColorStop(1, 'rgba(255,230,120,0)');
    g.fillStyle = gl; g.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
    // pole
    g.fillStyle = '#7b7f8c'; g.fillRect(x - 14, y + r * 0.8, 28, 120);
    g.strokeStyle = P.line; g.lineWidth = 4; g.strokeRect(x - 14, y + r * 0.8, 28, 120);
    // donut ring with a bite: draw ring then cut the bite
    const bite = (gg) => {
      gg.moveTo(x + r * 0.95 + 0, y - r * 0.55);
      gg.arc(x + r * 0.78, y - r * 0.62, r * 0.36, 0, TAU);
      gg.moveTo(x + r * 1.02, y - r * 0.2);
      gg.arc(x + r * 0.98, y - r * 0.18, r * 0.24, 0, TAU);
    };
    const c = FILM.makeCanvas(Math.ceil(r * 3 * (FILM.S || 1)), Math.ceil(r * 3 * (FILM.S || 1)));
    const d = c.getContext('2d', { willReadFrequently: WRF });
    const S = FILM.S || 1;
    d.setTransform(S, 0, 0, S, (r * 1.5 - x) * S, (r * 1.5 - y) * S);
    d.beginPath(); d.arc(x, y, r, 0, TAU); d.arc(x, y, r * 0.38, 0, TAU, true);
    F.fo(d, P.mcGold, 9);
    // icing
    d.beginPath();
    for (let i = 0; i <= 40; i++) { const a = (i / 40) * TAU; const rr = r * (0.9 + 0.05 * Math.sin(a * 7)); d.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    for (let i = 40; i >= 0; i--) { const a = (i / 40) * TAU; d.lineTo(x + Math.cos(a) * r * 0.48, y + Math.sin(a) * r * 0.48); }
    d.closePath();
    F.fo(d, '#ffb347', 5);
    d.fillStyle = 'rgba(255,255,255,0.55)';
    F.ellipse(d, x - r * 0.45, y - r * 0.5, r * 0.22, r * 0.08, -0.7); d.fill();
    // sprinkles
    const cols = ['#ff4f86', '#35b4ff', '#ffffff', '#6ccf4a', '#e8413c'];
    for (let i = 0; i < 22; i++) {
      const a = h('spr', i) * TAU, rr = r * (0.55 + h('sprr', i) * 0.32);
      d.save(); d.translate(x + Math.cos(a) * rr, y + Math.sin(a) * rr); d.rotate(h('spra', i) * 3);
      d.fillStyle = cols[i % cols.length]; F.rrect(d, -9, -3, 18, 6, 3); d.fill();
      d.restore();
    }
    // bite
    d.globalCompositeOperation = 'destination-out';
    d.beginPath(); bite(d); d.fill();
    d.globalCompositeOperation = 'source-atop';
    d.strokeStyle = P.line; d.lineWidth = 9;
    d.beginPath(); bite(d); d.stroke();
    d.globalCompositeOperation = 'source-over';
    g.drawImage(c, x - r * 1.5, y - r * 1.5, r * 3, r * 3);
    g.restore();
  }
  function buildSky() {
    const S = FILM.S || 1;
    const c = FILM.makeCanvas(Math.round(W * S), Math.round(H * S));
    const g = c.getContext('2d', { willReadFrequently: WRF });
    g.setTransform(S, 0, 0, S, 0, 0);
    F.sky(g, P.spainSky, '#d4efff', { h: 1300, mid: '#8fd0ff', midAt: 0.5 });
    g.fillStyle = '#d4efff'; g.fillRect(0, 1300, W, 620);
    // sun
    g.fillStyle = 'rgba(255,248,200,0.5)'; g.beginPath(); g.arc(150, 520, 130, 0, TAU); g.fill();
    g.fillStyle = '#fff6c8'; g.beginPath(); g.arc(150, 520, 80, 0, TAU); g.fill();
    return c;
  }
  function buildBg() {
    const S = FILM.S || 1;
    const c = FILM.makeCanvas(Math.round(W * S), Math.round(H * S));
    const g = c.getContext('2d', { willReadFrequently: WRF });
    g.setTransform(S, 0, 0, S, 0, 0);
    // far town, soft (no outlines)
    townBlock(g, -20, 900, 170, 560, '#f3dcb4', '#e89a78', 1);
    townBlock(g, 960, 860, 150, 600, '#f0d3a2', '#e3895f', 2);
    townBlock(g, 100, 1010, 120, 450, '#f7e6c8', '#d9653b', 3);
    townBlock(g, 900, 980, 120, 480, '#f7e6c8', '#d9653b', 4);
    palm(g, 70, 1460, 1.05, 0.5);
    palm(g, 1010, 1460, 1.1, -0.45);
    // golden donut logo standing on the roof (pole hidden behind the parapet)
    donutLogo(g, 800, 405, 108);
    // --- the McDONUT'S building
    const x0 = 150, x1 = 930, top = 580;
    // roof parapet
    F.rrect(g, x0 - 20, top - 40, x1 - x0 + 40, 60, 10); F.fo(g, '#b51f16', 5);
    // facade
    g.beginPath(); g.rect(x0, top, x1 - x0, GROUND - top); F.fo(g, P.mcRed, 5);
    g.fillStyle = 'rgba(0,0,0,0.08)';
    for (let i = 0; i < 8; i++) g.fillRect(x0 + 20 + i * 100, top + 10, 8, GROUND - top - 20);
    // sign band with the name
    F.rrect(g, x0 + 30, top + 30, x1 - x0 - 60, 170, 20); F.fo(g, '#9e1a12', 5);
    F.rrect(g, x0 + 42, top + 42, x1 - x0 - 84, 146, 14);
    g.strokeStyle = P.mcGold; g.lineWidth = 6; g.stroke();
    F.text(g, "McDONUT'S", (x0 + x1) / 2, top + 116, { size: 116, fill: P.mcGold, stroke: P.line, lw: 14, shadow: 7, shadowColor: '#5a0d08', skew: -0.08 });
    // awning stripes
    const ay = top + 230;
    for (let i = 0; i < 13; i++) {
      g.beginPath();
      const ax = x0 + i * 60;
      g.moveTo(ax, ay); g.lineTo(ax + 60, ay); g.lineTo(ax + 64, ay + 80); g.quadraticCurveTo(ax + 32, ay + 104, ax - 4 + 4, ay + 80); g.closePath();
      g.fillStyle = i % 2 ? '#ffffff' : P.mcGold; g.fill();
    }
    g.strokeStyle = P.line; g.lineWidth = 4;
    g.beginPath(); g.moveTo(x0, ay); g.lineTo(x1, ay); g.stroke();
    // windows with a warm interior
    [[x0 + 40, 280], [x1 - 320, 280]].forEach(([wx, ww], k) => {
      const wy = ay + 130, wh = 330;
      g.beginPath(); g.rect(wx, wy, ww, wh); F.fo(g, '#ffe6a8', 6);
      g.fillStyle = '#ffd27a'; g.fillRect(wx, wy + wh * 0.62, ww, wh * 0.38);
      // menu board and people silhouettes inside
      g.fillStyle = '#5a2d1f'; g.fillRect(wx + 30, wy + 30, ww - 60, 60);
      g.fillStyle = P.mcGold;
      for (let i = 0; i < 3; i++) g.fillRect(wx + 44 + i * (ww - 90) / 3, wy + 44, (ww - 120) / 3, 30);
      g.fillStyle = 'rgba(120,50,40,0.45)';
      for (let i = 0; i < 2; i++) { const px = wx + 70 + i * 130 + k * 20; g.beginPath(); g.arc(px, wy + 170, 28, 0, TAU); g.fill(); F.rrect(g, px - 36, wy + 196, 72, 110, 30); g.fill(); }
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 10;
      g.beginPath(); g.moveTo(wx + 30, wy + wh - 30); g.lineTo(wx + 110, wy + 40); g.moveTo(wx + 70, wy + wh - 20); g.lineTo(wx + 130, wy + 120); g.stroke();
      g.strokeStyle = P.line; g.lineWidth = 6; g.strokeRect(wx, wy, ww, wh);
      g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.stroke();
    });
    // door (mostly behind Hayk)
    g.beginPath(); g.rect(480, ay + 150, 180, GROUND - ay - 150); F.fo(g, '#ffe6a8', 6);
    g.strokeStyle = P.line; g.lineWidth = 5; g.beginPath(); g.moveTo(570, ay + 150); g.lineTo(570, GROUND); g.stroke();
    // golden donut logo on the roof
    // sidewalk
    g.fillStyle = P.sand; g.fillRect(0, GROUND, W, H - GROUND);
    g.fillStyle = P.sandShade; g.fillRect(0, GROUND, W, 16);
    g.strokeStyle = 'rgba(160,120,70,0.35)'; g.lineWidth = 3;
    for (let i = -6; i < 14; i++) { g.beginPath(); g.moveTo(540 + i * 110 * 0.6, GROUND + 16); g.lineTo(540 + i * 170, H); g.stroke(); }
    for (let j = 0; j < 6; j++) { const yy = GROUND + 16 + Math.pow(j / 6, 1.5) * 480; g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke(); }
    // planters
    [[190, GROUND + 40], [900, GROUND + 40]].forEach(([px, py]) => {
      F.rrect(g, px - 60, py - 70, 120, 80, 12); F.fo(g, '#d9653b', 5);
      g.fillStyle = P.tree; g.beginPath(); g.arc(px - 25, py - 90, 34, 0, TAU); g.arc(px + 20, py - 100, 40, 0, TAU); g.arc(px, py - 130, 32, 0, TAU); g.fill();
      g.fillStyle = '#ff6f91'; [[-30, -110], [18, -130], [30, -88]].forEach(([fx, fy]) => { g.beginPath(); g.arc(px + fx, py + fy, 9, 0, TAU); g.fill(); });
    });
    return c;
  }

  // ---------------------------------------------------------------------------
  // Fries rain
  // ---------------------------------------------------------------------------
  const RAIN_N = 34;
  function fry(ctx, x, y, s, rot, trail) {
    if (trail > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#fff1a0';
      ctx.lineWidth = 14 * s;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y - 40 * s); ctx.lineTo(x, y - (40 + trail) * s); ctx.stroke();
      ctx.restore();
    }
    F.fries(ctx, x, y, s, { box: false, rot });
  }
  function rain(ctx, t, layer, speedK) {
    // layer 0: far (small, behind Hayk); layer 1: near (big, in front, few)
    const n = layer ? 6 : RAIN_N;
    const span = 2200;
    for (let i = 0; i < n; i++) {
      const s = layer ? 1.25 + h('rs1', i) * 0.4 : 0.55 + h('rs0', i) * 0.55;
      const v = (layer ? 190 : 120) * (0.7 + h('rv', layer, i) * 0.6) * speedK;
      const y = ((h('ry', layer, i) * span + t * v) % span) - 200;
      let x = h('rx', layer, i) * (W + 100) - 50;
      if (layer) x = h('rx1', i) < 0.5 ? 40 + h('rxa', i) * 220 : 840 + h('rxb', i) * 220;
      x += Math.sin(t * 1.3 + i) * 20;
      const rot = h('rr', layer, i) * TAU + t * (h('rw', layer, i) - 0.5) * 1.6;
      fry(ctx, x, y, s, rot, 60 + 60 * h('rt', i));
    }
  }

  function tray(ctx, x, y, t) {
    // tray held in front of the belly, with burger, fries and drink
    ctx.save();
    ctx.translate(x, y);
    F.drink(ctx, 130, 0, 0.72, { color: P.mcRed });
    F.fries(ctx, -130, 4, 0.78, { color: P.mcRed });
    F.burger(ctx, 0, -40, 0.85, { rot: 0.03 * Math.sin(t * 8) });
    ctx.beginPath();
    ctx.moveTo(-250, 0); ctx.lineTo(250, 0); ctx.lineTo(230, 44); ctx.lineTo(-230, 44); ctx.closePath();
    F.fo(ctx, '#e8413c', 5);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-236, 6, 472, 8);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      WRF = wrfOf(ctx);
      const tw = L.onTwos(t);
      const hitFrames = (a, n) => t >= a - 1e-6 && t < a + n * FR - 1e-6;
      const trayMode = t >= T_TRAY;

      const push = 1 + 0.04 * L.ease.inOutSine(clamp(t / info.dur)) + (hitFrames(T_TRAY, 3) ? 0.04 : 0);
      const sh = F.shakeMany(t, [[T_TRAY, 0.3, 14]], 3);
      ctx.save();
      ctx.translate(W / 2 + sh[0], 1100 + sh[1]);
      ctx.scale(push, push);
      ctx.translate(-W / 2, -1100);

      // 1-2. background
      drawLayer(ctx, L.cached(ID + '-sky-' + (FILM.S || 1) + (WRF ? 'r' : 'g'), buildSky), 0, 0, W, H);
      F.clouds(ctx, { n: 4, seed: 44, t, y: 380, h: 300, speed: 14, scale: 0.8 });
      drawLayer(ctx, L.cached(ID + '-bg-' + (FILM.S || 1) + (WRF ? 'r' : 'g'), buildBg), 0, 0, W, H);

      // 3. golden light column + god rays onto Hayk
      ctx.save();
      const beamA = trayMode ? 0.22 : 0.32;
      const gr = ctx.createLinearGradient(0, 0, 0, HY);
      gr.addColorStop(0, `rgba(255,236,140,${beamA})`);
      gr.addColorStop(1, `rgba(255,214,90,${beamA * 0.6})`);
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(HX - 170, -20); ctx.lineTo(HX + 170, -20); ctx.lineTo(HX + 360, HY); ctx.lineTo(HX - 360, HY); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#fff6d0';
      for (let i = 0; i < 5; i++) {
        const u = (i + 0.5) / 5, wv = 18 + 10 * Math.sin(t * 2 + i);
        const xt = HX - 150 + u * 300, xb = HX - 330 + u * 660;
        ctx.beginPath(); ctx.moveTo(xt - wv, -20); ctx.lineTo(xt + wv, -20); ctx.lineTo(xb + wv * 2, HY); ctx.lineTo(xb - wv * 2, HY); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      rain(ctx, t, 0, trayMode ? 0.8 : 1);
      F.sparkles(ctx, { x: 60, y: 300, w: 960, h: 1200, n: 16, seed: 12, t, size: 30, color: '#fff3a0' });

      // 4. Hayk
      let sx = 1, sy = 1;
      const hitNow = T_NOM.some((a) => hitFrames(a, 2)) || hitFrames(T_TRAY, 2);
      if (hitNow) { sx = 1.06; sy = 0.92; }
      const sway = t >= T_SING ? Math.sin((tw - T_SING) * Math.PI * 2) * 0.06 : 0;
      const hop = trayMode ? F.bounce(tw, 2, 14) : F.bounce(tw, 2, 8);
      ctx.save();
      ctx.translate(HX, HY); ctx.scale(sx, sy); ctx.translate(-HX, -HY);
      const a = FILM.cast.hayk(ctx, {
        x: HX, y: HY + hop, s: HS, t, belly: 0.25, crown: true, tilt: sway,
        pose: trayMode ? 'hug' : 'cheer',
        face: !trayMode ? 'ecstatic' : t >= T_SING ? 'neutral' : 'happy',
        mouth: t >= T_SING ? (Math.floor((t - T_SING) * 4 + 1e-6) % 2 ? 'open' : 'shout') : undefined,
        look: [0.2, -0.25],
        headTilt: trayMode ? sway * 1.5 : -0.12 + 0.05 * Math.sin(tw * 3),
      });
      ctx.restore();

      // 5. tray / hero fries
      if (trayMode) {
        const tp = F.popIn(t, T_TRAY);
        const tx = (a.handL[0] + a.handR[0]) / 2, ty = (a.handL[1] + a.handR[1]) / 2 + 30;
        ctx.save();
        ctx.translate(tx, ty); ctx.scale(tp, tp); ctx.translate(-tx, -ty);
        tray(ctx, tx, ty, t);
        ctx.restore();
        // thumbs over the tray rim
        [a.handL, a.handR].forEach((q) => { F.ellipse(ctx, q[0], ty + 4, 22, 16); F.fo(ctx, P.skin, 5); });
      } else {
        // three hero fries arc into the open mouth on the beats
        T_NOM.forEach((tn, i) => {
          const u = (t - (tn - 0.9)) / 0.9;
          if (u < 0 || u >= 1) return;
          const sxp = [360, 820, 480][i], syp = -80;
          const e = L.ease.inQuad(u);
          const x = lerp(sxp, a.mouth[0], e) + Math.sin(u * Math.PI) * (i % 2 ? -40 : 40);
          const y = lerp(syp, a.mouth[1] - 30, e);
          fry(ctx, x, y, 1.3, (1 - u) * (i % 2 ? 2 : -2) + Math.PI, 90);
        });
      }
      rain(ctx, t, 1, trayMode ? 0.8 : 1);
      ctx.restore(); // camera

      // 6. effects
      const mx = a.mouth[0], my = a.mouth[1];
      if (!trayMode) {
        T_NOM.forEach((tn, i) => {
          F.sfx(ctx, 'NOM!', i % 2 ? mx + 250 : mx - 250, my - 120 - i * 30, t, tn, { size: 100, rot: i % 2 ? 0.15 : -0.15, life: 0.45, fill: '#ffffff', shadowColor: P.mcRed });
          F.crumbs(ctx, mx, my, t - tn, { n: 8, spread: 260, seed: 20 + i, colors: [P.fries, P.friesShade, '#fff3a0'] });
        });
        F.sparkle(ctx, a.eyeL[0] - 50, a.eyeL[1] - 50, 30 + 10 * Math.sin(t * 9));
        F.sparkle(ctx, a.eyeR[0] + 50, a.eyeR[1] - 40, 24 + 8 * Math.sin(t * 11));
      } else {
        const age = t - T_TRAY;
        if (age < 0.5) {
          F.shockRing(ctx, (a.handL[0] + a.handR[0]) / 2, (a.handL[1] + a.handR[1]) / 2 - 60, age, { r: 520, life: 0.45, color: '#fff6c0' });
          for (let i = 0; i < 8; i++) {
            const an = (i / 8) * TAU + 0.3, rr = 160 + age * 700;
            F.sparkle(ctx, (a.handL[0] + a.handR[0]) / 2 + Math.cos(an) * rr, (a.handL[1] + a.handR[1]) / 2 - 80 + Math.sin(an) * rr, 44 * (1 - age * 1.6));
          }
        }
        F.sparkles(ctx, { x: HX - 320, y: a.handL[1] - 260, w: 640, h: 360, n: 6, seed: 61, t, size: 34 });
        if (t >= T_SING) {
          F.notes(ctx, mx + 170, my - 10, t - T_SING, { n: 4, seed: 8, color: P.mcGold, size: 70, rise: 300 });
          F.notes(ctx, 200, 1180, t - T_SING + 0.4, { n: 3, seed: 9, color: '#ffffff', size: 60, rise: 260 });
        }
      }

      // 7. screen-fixed text
      F.caption(ctx, "STOP 3: McDONUT'S", 70, 290, { size: 54, bg: P.mcRed, accent: P.mcGold });
      if (t >= T_SING) {
        const b = Math.floor((t - T_SING) * 4) % 2;
        F.bubble(ctx, 'BA DA BA BA BAAA!', 265, 1000 + (b ? -6 : 0), { size: 54, maxW: 330, t, t0: T_SING, tail: [mx - 70, my - 10] });
        F.text(ctx, '♪', 110 + (b ? 6 : 0), 840, { size: 80, fill: P.mcGold, stroke: P.line, lw: 7, font: 'sym', rot: -0.2 });
        F.text(ctx, '♫', 420 - (b ? 6 : 0), 830, { size: 74, fill: '#ffffff', stroke: P.line, lw: 7, font: 'sym', rot: 0.2 });
      }
    },
  });
})();
