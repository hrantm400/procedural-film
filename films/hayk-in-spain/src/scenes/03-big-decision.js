// Shot 03 'big-decision' : "I'M GOING TO SPAIN!". Global T 9.0 - 13.0 (4 s).
// 0.0-0.5  same room as trader-den: Hayk shoots up out of his gaming chair (stretch, speed lines), the chair
//          spins away to the right with a motion smear, landing squash.
// 0.5      impact frame (2 frames) -> low-angle hero shot on a flat dramatic gradient: red-orange focus lines,
//          burning aura, wind streaks, embers. Hayk pose "fist", face "determined". Shake on 0.5 and 2.0.
// 0.5      spiky shout bubble "I'M GOING TO SPAIN!"; 2.0 smaller bubble "...TO FIND INVESTORS!".
//          Tiny world map (Armenia -> Spain dotted route) in the lower-left corner. Eye glints.
// Layers, back to front: background (room | gradient), focus lines, aura, chair, Hayk, effects;
// screen-fixed: bubbles, map, flashes.
(function () {
  'use strict';
  const ID = 'big-decision';
  const FX = FILM.fx;
  const LIB = FILM.lib;
  const P = FX.pal;
  const TAU = Math.PI * 2;
  const FR = 1 / 24;
  const clamp = FX.clamp, lerp = FX.lerp, h01 = FX.h01;
  const W = 1080, H = 1920;

  const B_HERO = 0.5; // T 9.5 cut to hero shot, shout, shake
  const B_SECOND = 2.0; // T 11.0 second bubble, shake

  // room-phase Hayk placement (matches trader-den)
  const HX = 540, HY = 1690, HS = 1.75;
  // hero-phase placement
  const GX = 680, GY = 1885, GS = 1.85;

  // Static room, same layout as trader-den (cached under this shot's own key)
  function room() {
    return LIB.cached('big-decision-room-v1', () => {
      const c = FILM.makeCanvas(W, H);
      const g = c.getContext('2d');
      // wall
      FX.sky(g, '#17152f', '#2a2350', { x: 0, y: 0, w: W, h: 1000 });
      // subtle wall panels
      g.strokeStyle = 'rgba(255,255,255,0.04)';
      g.lineWidth = 3;
      for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(i * 180 + 20, 90); g.lineTo(i * 180 + 20, 1000); g.stroke(); }
      // ceiling strip
      g.fillStyle = '#100e22';
      g.fillRect(0, 0, W, 96);
      // window
      const wx = 170, wy = 118, ww = 740, wh = 300;
      FX.sky(g, '#0d1030', '#3a2f6b', { x: wx, y: wy, w: ww, h: wh });
      // moon + stars in window
      g.fillStyle = '#fff1c4';
      g.beginPath(); g.arc(wx + 610, wy + 90, 34, 0, TAU); g.fill();
      g.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) { const r = 1 + h01(ID, 'wsr', i) * 2; g.globalAlpha = 0.4 + h01(ID, 'wsa', i) * 0.6; g.beginPath(); g.arc(wx + h01(ID, 'wsx', i) * ww, wy + h01(ID, 'wsy', i) * wh * 0.5, r, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
      // Ararat silhouette
      g.save();
      g.beginPath(); g.rect(wx, wy, ww, wh); g.clip();
      FX.ararat(g, wx - 30, wy + wh - 30, 640, 220, { color: '#3d4380', shade: '#30356a', snow: '#aab3e8' });
      // city blocks with lights
      for (let i = 0; i < 20; i++) {
        const bw = 40 + h01(ID, 'cbw', i) * 50, bh = 24 + h01(ID, 'cbh', i) * 60;
        const bx = wx + i * 40 - 10;
        g.fillStyle = i % 2 ? '#241d44' : '#2c2350';
        g.fillRect(bx, wy + wh - bh, bw, bh);
        for (let k = 0; k < 5; k++) {
          if (h01(ID, 'cwl', i, k) > 0.45) {
            g.fillStyle = '#ffcf6e';
            g.fillRect(bx + 6 + (k % 2) * 16, wy + wh - bh + 10 + Math.floor(k / 2) * 18, 7, 9);
          }
        }
      }
      g.restore();
      // window frame + mullions
      g.strokeStyle = P.line; g.lineWidth = 10;
      g.strokeRect(wx, wy, ww, wh);
      g.strokeStyle = '#4a4380'; g.lineWidth = 6;
      g.strokeRect(wx + 6, wy + 6, ww - 12, wh - 12);
      g.fillStyle = '#2f2a58';
      g.fillRect(wx + ww / 3 - 6, wy, 12, wh);
      g.fillRect(wx + (2 * ww) / 3 - 6, wy, 12, wh);
      g.fillStyle = '#3a3466';
      g.fillRect(wx - 20, wy + wh, ww + 40, 22); // sill
      // curtains
      [[wx - 90, 1], [wx + ww - 10, -1]].forEach(([cx0, dir]) => {
        g.fillStyle = '#1f4a5e';
        g.beginPath();
        g.moveTo(cx0, 110); g.lineTo(cx0 + 100, 110);
        g.quadraticCurveTo(cx0 + 70 + dir * 10, 300, cx0 + 110, 470);
        g.lineTo(cx0 - 10, 470); g.closePath(); g.fill();
        g.strokeStyle = '#163847'; g.lineWidth = 5;
        for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(cx0 + k * 25, 120); g.quadraticCurveTo(cx0 + k * 25 + dir * 8, 300, cx0 + k * 28, 460); g.stroke(); }
      });
      g.fillStyle = '#6a6aa0';
      g.fillRect(wx - 110, 100, ww + 220, 12); // rod
      // posters on the side walls
      g.save();
      g.translate(24, 820); g.rotate(-0.03);
      FX.rrect(g, 0, 0, 150, 200, 6); FX.fo(g, '#241f47', 4);
      g.strokeStyle = P.up; g.lineWidth = 6; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(20, 160); g.lineTo(55, 120); g.lineTo(80, 140); g.lineTo(125, 50); g.stroke();
      g.fillStyle = P.up; g.beginPath(); g.moveTo(125, 38); g.lineTo(136, 64); g.lineTo(112, 58); g.closePath(); g.fill();
      FX.text(g, 'HODL', 75, 182, { size: 26, fill: '#ffffff', lw: 0 });
      g.restore();
      g.save();
      g.translate(912, 830); g.rotate(0.04);
      FX.rrect(g, 0, 0, 140, 180, 6); FX.fo(g, '#3b1d6e', 4);
      FX.text(g, 'TO THE\nMOON', 70, 60, { size: 26, fill: P.gold, lw: 0 });
      g.fillStyle = '#e8e8f8'; g.beginPath(); g.arc(70, 130, 26, 0, TAU); g.fill();
      g.restore();
      // floor
      FX.sky(g, '#231c3d', '#120f22', { x: 0, y: 1000, w: W, h: 920 });
      FX.vignette(g, 0.5, '6,4,20');
      // rug
      g.fillStyle = '#35285e';
      g.beginPath(); g.ellipse(540, 1820, 620, 120, 0, 0, TAU); g.fill();
      g.strokeStyle = '#4a3a80'; g.lineWidth = 6;
      g.beginPath(); g.ellipse(540, 1820, 560, 100, 0, 0, TAU); g.stroke();
      // desk (behind Hayk)
      g.fillStyle = '#2d2548';
      g.fillRect(0, 780, W, 330);
      g.fillStyle = '#231d3a';
      g.fillRect(0, 800, W, 30);
      FX.rrect(g, 20, 850, 200, 170, 8); FX.fo(g, '#28213f', 4);
      FX.rrect(g, 860, 850, 200, 170, 8); FX.fo(g, '#28213f', 4);
      g.fillStyle = '#6a6aa0'; g.fillRect(100, 930, 40, 8); g.fillRect(940, 930, 40, 8);
      g.fillStyle = '#1a152c'; g.fillRect(0, 1100, W, 14);
      // desk top
      g.beginPath(); g.moveTo(-20, 740); g.lineTo(W + 20, 740); g.lineTo(W + 20, 785); g.lineTo(-20, 785); g.closePath();
      FX.fo(g, '#43386b', 5);
      g.fillStyle = '#574a88'; g.fillRect(0, 743, W, 8);
      return c;
    });
  }


  // gaming chair parts (drawn around Hayk)
  function chairBack(ctx, x, y, s, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.scale(s, s);
    // backrest (y is the seat height); racing-style wings
    ctx.beginPath();
    ctx.moveTo(-150, 0); ctx.lineTo(-170, -260); ctx.quadraticCurveTo(-175, -420, -110, -470);
    ctx.lineTo(-80, -540); ctx.quadraticCurveTo(0, -575, 80, -540); ctx.lineTo(110, -470);
    ctx.quadraticCurveTo(175, -420, 170, -260); ctx.lineTo(150, 0); ctx.closePath();
    FX.fo(ctx, '#1d1a26', 6);
    // red side panels
    ctx.fillStyle = '#d7282f';
    ctx.beginPath(); ctx.moveTo(-150, -10); ctx.lineTo(-166, -260); ctx.quadraticCurveTo(-170, -400, -112, -460); ctx.lineTo(-96, -440); ctx.quadraticCurveTo(-140, -380, -132, -260); ctx.lineTo(-118, -10); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(150, -10); ctx.lineTo(166, -260); ctx.quadraticCurveTo(170, -400, 112, -460); ctx.lineTo(96, -440); ctx.quadraticCurveTo(140, -380, 132, -260); ctx.lineTo(118, -10); ctx.closePath(); ctx.fill();
    // headrest pillow + head holes
    FX.rrect(ctx, -60, -520, 120, 50, 20); FX.fo(ctx, '#d7282f', 4);
    ctx.fillStyle = '#0c0a12';
    FX.rrect(ctx, -80, -455, 40, 70, 16); ctx.fill();
    FX.rrect(ctx, 40, -455, 40, 70, 16); ctx.fill();
    // stitching
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-60, -360); ctx.lineTo(-60, -20); ctx.moveTo(60, -360); ctx.lineTo(60, -20); ctx.stroke();
    ctx.restore();
  }
  function chairSeat(ctx, x, y, s, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.scale(s, s);
    // gas lift + star base with wheels
    ctx.fillStyle = '#3a3a48';
    ctx.fillRect(-14, 20, 28, 120);
    ctx.strokeStyle = P.line; ctx.lineWidth = 4; ctx.strokeRect(-14, 20, 28, 120);
    FX.poly(ctx, [[-170, 150], [-16, 128], [16, 128], [170, 150], [150, 164], [0, 146], [-150, 164]]);
    FX.fo(ctx, '#2a2a36', 5);
    [[-160, 172], [160, 172], [-70, 180], [70, 180]].forEach(([wx, wy]) => { FX.ellipse(ctx, wx, wy, 18, 14); FX.fo(ctx, '#15151f', 4); });
    // seat cushion
    FX.ellipse(ctx, 0, 0, 175, 42); FX.fo(ctx, '#1d1a26', 6);
    ctx.fillStyle = '#d7282f';
    FX.ellipse(ctx, 0, -4, 150, 26); ctx.fill();
    ctx.restore();
  }
  function chairArms(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    [-1, 1].forEach((d) => {
      ctx.fillStyle = '#2a2a36';
      ctx.fillRect(d * 150 - 10, -90, 20, 90);
      FX.rrect(ctx, d * 150 - 34, -112, 68, 32, 12); FX.fo(ctx, '#1d1a26', 5);
    });
    ctx.restore();
  }


  // ---------------------------------------------------------------------------
  // Hero background: flat dramatic gradient, perspective floor
  // ---------------------------------------------------------------------------
  function heroBg() {
    return LIB.cached('big-decision-hero-v3', () => {
      const c = FILM.makeCanvas(W, H);
      const g = c.getContext('2d');
      FX.sky(g, '#1c0410', '#e8501c', { x: 0, y: 0, w: W, h: H, mid: '#9e1028', midAt: 0.5 });
      // floor
      g.fillStyle = '#240812';
      g.fillRect(0, 1820, W, 100);
      g.strokeStyle = 'rgba(255,120,60,0.35)';
      g.lineWidth = 4;
      g.beginPath();
      for (let i = -8; i <= 8; i++) { g.moveTo(540 + i * 40, 1820); g.lineTo(540 + i * 260, 1920); }
      g.moveTo(0, 1850); g.lineTo(W, 1850);
      g.stroke();
      g.fillStyle = '#ffb35c';
      g.fillRect(0, 1816, W, 6);
      FX.vignette(g, 0.45, '30,0,10');
      return c;
    });
  }

  // tiny world map card: Armenia -> Spain
  function worldMap(ctx, t) {
    const x = 70, y = 1318, w = 330, h = 210;
    const s = FX.popIn(t, B_HERO + 0.25);
    if (s <= 0) return;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(-0.05);
    ctx.scale(s, s);
    ctx.translate(-w / 2, -h / 2);
    FX.rrect(ctx, 0, 0, w, h, 16); FX.fo(ctx, '#15324f', 6, P.line);
    ctx.save();
    FX.rrect(ctx, 0, 0, w, h, 16); ctx.clip();
    // sea grid
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 1; i < 6; i++) { ctx.moveTo((i * w) / 6, 0); ctx.lineTo((i * w) / 6, h); }
    for (let i = 1; i < 4; i++) { ctx.moveTo(0, (i * h) / 4); ctx.lineTo(w, (i * h) / 4); }
    ctx.stroke();
    // land: Europe blob, Iberia, Italy, Balkans/Turkey, Caucasus
    ctx.fillStyle = '#5a9e40';
    const land = [
      [[0, 30], [120, 10], [230, 0], [330, 0], [330, 120], [300, 105], [250, 112], [215, 100], [190, 108], [170, 95], [150, 110], [128, 90], [110, 70], [80, 78], [55, 70], [30, 80], [0, 75]],
      [[18, 88], [70, 82], [86, 96], [80, 140], [52, 150], [20, 138], [12, 110]], // Iberia
      [[128, 92], [140, 98], [165, 140], [178, 150], [170, 156], [150, 140], [132, 112]], // Italy
      [[200, 112], [300, 110], [330, 125], [330, 165], [260, 165], [215, 150], [205, 128]], // Turkey + Caucasus
    ];
    land.forEach((pts) => { FX.poly(ctx, pts); ctx.fill(); ctx.strokeStyle = '#2e6b24'; ctx.lineWidth = 3; ctx.stroke(); });
    // Black Sea hole
    ctx.fillStyle = '#15324f';
    FX.ellipse(ctx, 250, 100, 34, 14); ctx.fill();
    ctx.restore();
    // route: dotted arc from Armenia (right) to Spain (left), drawn progressively
    const A = [300, 138], S = [50, 116], C = [175, 20];
    const prog = clamp((t - (B_HERO + 0.35)) / 1.6);
    const pt = (u) => [(1 - u) * (1 - u) * A[0] + 2 * (1 - u) * u * C[0] + u * u * S[0], (1 - u) * (1 - u) * A[1] + 2 * (1 - u) * u * C[1] + u * u * S[1]];
    ctx.fillStyle = '#ffffff';
    const nd = 22;
    for (let i = 0; i <= nd; i++) {
      const u = i / nd;
      if (u > prog) break;
      const p = pt(u);
      ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, TAU); ctx.fill();
    }
    // markers
    [[A, '#d90012'], [S, '#ffc400']].forEach(([p, c], i) => {
      const pulse = 1 + 0.25 * FX.beatPulse(t, 0.5, 0.15);
      FX.ellipse(ctx, p[0], p[1], 11 * pulse, 11 * pulse); FX.fo(ctx, c, 4);
      if (i === 1 && prog >= 1) FX.sparkle(ctx, p[0], p[1] - 4, 26 * (0.7 + 0.3 * Math.sin(t * 10)), {});
    });
    // plane at the head of the route
    const hp = pt(Math.min(prog, 1)), hp2 = pt(Math.max(0, Math.min(prog, 1) - 0.05));
    ctx.save();
    ctx.translate(hp[0], hp[1] - 2);
    const ang = Math.atan2(hp[1] - hp2[1], hp[0] - hp2[0]);
    ctx.rotate(ang);
    FX.poly(ctx, [[18, 0], [-14, -6], [-18, -18], [-22, -18], [-18, -4], [-24, -2], [-24, 2], [-18, 4], [-22, 18], [-18, 18], [-14, 6]]);
    FX.fo(ctx, '#ffffff', 3);
    ctx.restore();
    FX.text(ctx, 'ARMENIA', 272, 185, { size: 24, fill: '#ffffff', lw: 5 });
    FX.text(ctx, 'SPAIN', 58, 180, { size: 24, fill: P.gold, lw: 5 });
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = Math.min(Math.max(tIn, 0), info.dur);
      const tw = LIB.onTwos(t);
      const hero = t >= B_HERO - 1e-6;
      const impactFrame = hero && t < B_HERO + 2 * FR - 1e-6;

      if (!hero) {
        // ------------------------------------------------------------------ room phase
        const u = clamp(t / B_HERO); // 0..1
        const [sx, sy] = FX.shake(t, 0, 0.35, 12, 9);
        const z = 1.1;
        ctx.save();
        ctx.translate(540 + sx, 1000 + sy);
        ctx.scale(z, z);
        ctx.translate(-540, -1000);
        ctx.fillStyle = '#17152f';
        ctx.fillRect(-40, -40, W + 80, H + 80);
        ctx.drawImage(room(), 0, 0, W, H);
        // monitor glow flicker
        ctx.save();
        const glow = ctx.createRadialGradient(540, 600, 60, 540, 640, 620);
        glow.addColorStop(0, 'rgba(80,255,170,0.4)');
        glow.addColorStop(1, 'rgba(60,200,255,0)');
        ctx.fillStyle = glow; ctx.fillRect(0, 140, W, 1100);
        ctx.restore();
        // chair spins away to the right
        const cu = LIB.ease.outQuad(clamp((tw + FR) / 0.45));
        const seatY = HY - 101 * HS;
        const cx = lerp(HX, 1350, cu);
        const rot = cu * 5.5;
        FX.motionSmear(ctx, cx - 520, seatY - 420, 520, 560, { color: 'rgba(255,255,255,0.7)', angle: 0, n: 16, seed: 31 });
        ctx.save();
        ctx.translate(cx, seatY);
        ctx.rotate(rot);
        ctx.translate(-cx, -seatY);
        chairBack(ctx, cx, seatY + 20, 1.0, 0);
        chairSeat(ctx, cx, seatY + 30, 1.0, 0);
        chairArms(ctx, cx, seatY + 10, 1.0);
        ctx.restore();
        // vertical speed lines behind Hayk
        FX.speedLines(ctx, { x: 200, y: 400, w: 680, h: 1400, angle: -Math.PI / 2, count: 26, color: '#ffffff', alpha: 0.75 * (1 - u * 0.5), t, speed: 2600, len: 380, width: 10, seed: 17 });
        // Hayk: stretched launch -> landing squash
        const d = Math.floor(t * 12 + 1e-6); // drawings on twos
        const lift = [150, 90, 30, 0, 0, 0][Math.min(5, d)];
        const sq = [[0.9, 1.14], [0.94, 1.08], [1.0, 1.0], [1.08, 0.9], [1.04, 0.96], [1, 1]][Math.min(5, d)];
        ctx.save();
        ctx.translate(HX, HY);
        ctx.scale(sq[0], sq[1]);
        ctx.translate(-HX, -HY);
        const a = FILM.cast.hayk(ctx, { x: HX, y: HY - lift, s: HS, t, pose: 'fist', face: 'determined', belly: 0 });
        ctx.restore();
        if (d >= 3) FX.dust(ctx, HX, HY, t - 0.25, { n: 8, seed: 5, size: 60, spread: 260 });
        FX.sparkle(ctx, a.eyeR[0], a.eyeR[1] - 8, 30 + 10 * Math.sin(t * 20), {});
        ctx.restore();
        FX.sfx(ctx, 'WHOOSH!', 780, 1330, t, 0, { size: 110, fill: '#ffffff', shadowColor: '#2a6bd6', rot: -0.2 });
        return;
      }

      // ------------------------------------------------------------------ hero phase
      const ht = t - B_HERO;
      const [sx, sy] = FX.shakeMany(t, [[B_HERO, 0.45, 30], [B_SECOND, 0.45, 26]], 4);
      const z = 1.0 + 0.05 * LIB.ease.outCubic(clamp(ht / 3.5)) + (ht < 0.1 ? 0.04 : 0);
      ctx.save();
      ctx.translate(540 + sx, 1300 + sy);
      ctx.rotate(-0.035);
      ctx.scale(z, z);
      ctx.translate(-540, -1300);

      if (impactFrame) {
        FX.impact(ctx, { cx: GX, cy: 900, invert: false, seed: 21 });
        FILM.cast.hayk(ctx, { x: GX, y: GY, s: GS, t, pose: 'fist', face: 'determined', silhouette: '#0a0a10' });
        ctx.restore();
      } else {
        ctx.drawImage(heroBg(), -60, -60, W + 120, H + 120);
        // big faint katakana DON behind
        FX.text(ctx, 'ドン', 235, 830, { size: 200, fill: '#ff5a1a', stroke: '#1c0410', lw: 10, alpha: 0.28, font: 'jp', rot: -0.15 });
        // sunburst + focus lines converging above his fist
        ctx.save();
        ctx.fillStyle = 'rgba(255,90,26,0.28)';
        ctx.beginPath();
        for (let i = 0; i < 22; i++) {
          const a0 = ht * 0.3 + (i / 22) * TAU, a1 = a0 + TAU / 44;
          ctx.moveTo(GX, 900);
          ctx.lineTo(GX + Math.cos(a0) * 2400, 900 + Math.sin(a0) * 2400);
          ctx.lineTo(GX + Math.cos(a1) * 2400, 900 + Math.sin(a1) * 2400);
          ctx.closePath();
        }
        ctx.fill();
        ctx.restore();
        FX.focusLines(ctx, GX, 920, { inner: 470 + 30 * FX.beatPulse(t, 0.5, 0.15), rx: 520, ry: 640, count: 110, color: '#ff4a1a', alpha: 0.85, seed: 33, width: 22 });
        FX.focusLines(ctx, GX, 920, { inner: 560, rx: 600, ry: 720, count: 60, color: '#1c0410', alpha: 0.6, seed: 34, width: 16 });
        // aura
        FX.aura(ctx, GX, GY + 10, 860, 1450, t, { color: '#ffa51a', core: '#fff0a0', alpha: 0.9 });
        // wind streaks (right -> left)
        FX.speedLines(ctx, { x: 0, y: 300, w: W, h: 1500, angle: Math.PI, count: 22, color: '#ffe3b0', alpha: 0.45, t, speed: 2400, len: 360, width: 7, seed: 44 });
        // embers
        for (let i = 0; i < 26; i++) {
          const per = 1.2 + h01(ID, 'ep', i) * 1.2;
          const ph = ((ht / per + h01(ID, 'eo', i)) % 1 + 1) % 1;
          const ex = GX - 500 + h01(ID, 'ex', i) * 1000 - ph * 300;
          const ey = 1880 - ph * 1500 - h01(ID, 'ey', i) * 200;
          const r = (3 + h01(ID, 'er', i) * 7) * (1 - ph * 0.6);
          ctx.fillStyle = i % 3 ? '#ffd23a' : '#ffffff';
          ctx.globalAlpha = 1 - ph;
          ctx.beginPath(); ctx.arc(ex, ey, r, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // Hayk: landing squash on the cut, hop on each shake beat
        const d = Math.floor(ht * 12 + 1e-6);
        const d2 = Math.floor((t - B_SECOND) * 12 + 1e-6);
        let sq = [[1.06, 0.92], [1.06, 0.92], [1, 1]][Math.min(2, d)];
        if (t >= B_SECOND) sq = [[1.05, 0.94], [1.02, 0.98], [1, 1]][Math.min(2, d2)];
        const breathe = 1 + 0.012 * Math.sin(ht * 5);
        // power burst behind the raised fist (fist sits near (GX + 150, GY - 1010) in this pose)
        FX.burst(ctx, GX + 150, GY - 1010, 150 + 30 * FX.beatPulse(t, 0.5, 0.2), 80, 12, 'rgba(255,236,140,0.9)', { seed: 8, lw: 0 });
        ctx.save();
        ctx.translate(GX, GY);
        ctx.scale(sq[0], sq[1] * breathe);
        ctx.translate(-GX, -GY);
        const hoodieWind = Math.sin(tw * 9) * 0.015;
        // t offset keeps the auto-blink out of the hero window (it falls on 0.40-0.49, before the cut)
        const a = FILM.cast.hayk(ctx, { x: GX, y: GY, s: GS, t: t + 2.18, pose: 'fist', face: 'determined', belly: 0, tilt: hoodieWind, look: [0, -0.2] });
        ctx.restore();
        // power crackle near the fist
        const fist = a.handR;
        FX.sparkle(ctx, fist[0] + 40, fist[1] - 40, 46 * (0.7 + 0.3 * FX.beatPulse(t, 0.5, 0.2)), { rot: ht });
        // eye glints (pulse on the beats)
        const gl = 0.6 + 0.4 * FX.beatPulse(t, 0.5, 0.2);
        FX.sparkle(ctx, a.eyeL[0] - 8, a.eyeL[1] - 14, 30 * gl, { rot: ht * 2 });
        FX.sparkle(ctx, a.eyeR[0] - 8, a.eyeR[1] - 14, 40 * gl, { rot: -ht * 2, color: '#fff3a0' });
        // dust from the stomp
        FX.dust(ctx, GX, GY, ht + 0.12, { n: 10, seed: 12, size: 70, spread: 480, color: '#ffd9b0', line: 'rgba(120,20,30,0.5)' });
        if (ht < 0.6) FX.shockRing(ctx, GX, GY - 20, ht, { r: 700, color: '#ffe066', life: 0.6, width: 18, squash: 0.25 });
        if (t >= B_SECOND && t < B_SECOND + 0.6) FX.shockRing(ctx, a.head[0], a.head[1], t - B_SECOND, { r: 500, color: '#ffffff', life: 0.6, width: 14 });
        ctx.restore();
      }

      // screen-fixed: bubbles and map
      const mouth = [GX - 10, 1080];
      FX.bubble(ctx, "I'M GOING TO SPAIN!", 540, 455, { size: 74, maxW: 500, shout: true, t, t0: B_HERO - FR, tail: [mouth[0] - 40, 860], fill: '#ffffff', shake: 6 });
      FX.bubble(ctx, '...TO FIND INVESTORS!', 250, 1130, { size: 46, maxW: 330, t, t0: B_SECOND - FR, tail: [mouth[0] - 120, 1070] });
      if (!impactFrame) worldMap(ctx, t);
      if (impactFrame) FX.flash(ctx, 0.15, '#ffffff');
      if (t >= B_SECOND && t < B_SECOND + 2 * FR) FX.flash(ctx, 0.35, '#fff1c0');
    },
  });
})();
