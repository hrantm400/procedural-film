// Shot 02 'trader-den' : Hayk, trader, founder of LiquidityScan. Global T 4.0 - 9.0 (5 s).
// Night, Hayk's room in Yerevan. Hayk has swivelled his gaming chair to face us; behind him the desk with
// three glowing monitors (charts left/right, LIQUIDITYSCAN logo in the middle) rims him in cyan/green.
// Layers, back to front (inside the slow push-in camera):
//   1. wall, LED strip, window with Yerevan night + Ararat silhouette, curtains, posters, shelf
//   2. monitor glow, three monitors with live candles / logo, desk, keyboard, steaming mug, lamp
//   3. gaming chair (back, arms, seat, base)
//   4. rim-light silhouettes + Hayk (sit, focused), eye glints at 3.0
//   5. floating dust motes, green spike flash, "PING!" SFX
// Screen-fixed: intro card (slides in at 1.0), vignette.
(function () {
  'use strict';
  const ID = 'trader-den';
  const FX = FILM.fx;
  const LIB = FILM.lib;
  const P = FX.pal;
  const TAU = Math.PI * 2;
  const FR = 1 / 24;
  const clamp = FX.clamp, lerp = FX.lerp, h01 = FX.h01;
  const W = 1080, H = 1920;

  const B_CARD = 1.0; // T 5.0 intro card slides in
  const B_SPIKE = 3.0; // T 7.0 green candle spikes, eye glint, PING!

  // Hayk placement (world)
  const HX = 540, HY = 1690, HS = 1.75;

  // ---------------------------------------------------------------------------
  // Static room (cached)
  // ---------------------------------------------------------------------------
  function room() {
    return LIB.cached('trader-den-room-v2', () => {
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

  // monitor screen painters (local coords, w x h)
  function screenLeft(ctx, w, h, t, spike) {
    ctx.strokeStyle = P.termGrid; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 1; i < 6; i++) { ctx.moveTo(0, (i * h) / 6); ctx.lineTo(w, (i * h) / 6); }
    for (let i = 1; i < 8; i++) { ctx.moveTo((i * w) / 8, 0); ctx.lineTo((i * w) / 8, h); }
    ctx.stroke();
    const n = 16;
    const shift = Math.floor(t * 2); // a new candle each beat
    FX.candles(ctx, 8, 30, w - 16, h - 60, { n, seed: 300 + shift, trend: 0.8 });
    FX.text(ctx, 'BTC/USDT', 12, 16, { size: 18, fill: '#8fa3d8', lw: 0, align: 'left' });
    FX.text(ctx, spike ? '+8.2%' : '+0.4%', w - 12, 16, { size: 18, fill: P.up, lw: 0, align: 'right' });
  }
  function screenRight(ctx, w, h, t, spikeU) {
    ctx.strokeStyle = P.termGrid; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 1; i < 6; i++) { ctx.moveTo(0, (i * h) / 6); ctx.lineTo(w, (i * h) / 6); }
    ctx.stroke();
    const vals = FX.candles(ctx, 8, 40, w - 70, h - 70, { n: 14, seed: 911, trend: -0.6 });
    // live last candle: grows into a spike after 3.0
    const last = vals[vals.length - 1];
    const cw = (w - 70) / 14;
    const cx = 8 + (w - 70) + cw * 0.5;
    const base = 40 + (h - 70) - last[1] * (h - 70);
    const hgt = 18 + Math.sin(t * 7) * 6 + spikeU * (base - 30);
    ctx.fillStyle = P.up;
    ctx.fillRect(cx - cw * 0.4, base - hgt, cw * 0.8, hgt);
    ctx.strokeStyle = P.up; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, base - hgt - 10); ctx.lineTo(cx, base + 12); ctx.stroke();
    // order book bars
    for (let i = 0; i < 8; i++) {
      const bw = 10 + h01(ID, 'ob', i, Math.floor(t * 4)) * 40;
      ctx.fillStyle = i < 4 ? 'rgba(255,77,94,0.6)' : 'rgba(47,224,138,0.6)';
      ctx.fillRect(w - bw, 14 + i * 16, bw, 11);
    }
    FX.text(ctx, 'ETH/USDT', 12, 18, { size: 18, fill: '#8fa3d8', lw: 0, align: 'left' });
  }
  function screenMid(ctx, w, h, t, spikeU) {
    // logo header
    const gr = ctx.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#0f1a38');
    gr.addColorStop(1, '#0b1020');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    FX.lsLogo(ctx, w / 2, 62, 0.62 + 0.02 * Math.sin(t * 4), { lw: 3 });
    FX.text(ctx, 'LIQUIDITYSCAN', w / 2, 132, { size: 36, fill: '#ffffff', lw: 0, letter: 2 });
    // mini chart under the logo
    ctx.strokeStyle = P.termGrid; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(14, h - 20); ctx.lineTo(w - 14, h - 20); ctx.stroke();
    FX.candles(ctx, 14, 150, w - 28, h - 170, { n: 22, seed: 55, trend: 0.9 });
    // spike candle on the far right
    if (spikeU > 0) {
      const x = w - 30, top = lerp(h - 60, 150, spikeU);
      ctx.save();
      const gg = ctx.createLinearGradient(0, top, 0, h - 30);
      gg.addColorStop(0, 'rgba(47,224,138,1)');
      gg.addColorStop(1, 'rgba(47,224,138,0.5)');
      ctx.fillStyle = gg;
      ctx.fillRect(x - 11, top, 22, h - 30 - top);
      ctx.restore();
    }
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

  // local intro card (the shared one's bar is too short for the long subtitle)
  function introCard(ctx, t, t0) {
    if (t < t0 - 1e-6) return;
    const u = LIB.ease.outExpo(clamp((t - t0 + FR) / 0.35));
    const y = 1395;
    ctx.save();
    ctx.translate(-(1 - u) * 1200, 0);
    // speed streak behind the bar
    ctx.fillStyle = 'rgba(255,204,51,0.35)';
    ctx.beginPath(); ctx.moveTo(-20, y - 160); ctx.lineTo(1100, y - 196); ctx.lineTo(1100, y - 172); ctx.lineTo(-20, y - 138); ctx.closePath(); ctx.fill();
    // bar
    ctx.fillStyle = P.line;
    ctx.beginPath();
    ctx.moveTo(-20, y - 120); ctx.lineTo(1100, y - 150); ctx.lineTo(1100, y + 88); ctx.lineTo(-20, y + 112); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = P.gold;
    ctx.beginPath(); ctx.moveTo(-20, y + 112); ctx.lineTo(1100, y + 88); ctx.lineTo(1100, y + 104); ctx.lineTo(-20, y + 130); ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.lsBlue;
    ctx.beginPath(); ctx.moveTo(40, y - 118); ctx.lineTo(62, y - 118); ctx.lineTo(40, y + 110); ctx.lineTo(18, y + 110); ctx.closePath(); ctx.fill();
    const nameSlide = (1 - LIB.ease.outCubic(clamp((t - t0) / 0.5))) * 160;
    FX.text(ctx, 'HAYK', 96 + nameSlide, y - 38, { size: 110, fill: P.gold, stroke: '#6e0a1a', lw: 0, shadow: 7, shadowColor: '#b3122b', align: 'left', skew: -0.15, rot: -0.025 });
    FX.text(ctx, 'TRADER / FOUNDER OF LIQUIDITYSCAN', 100 + nameSlide * 0.5, y + 52, { size: 40, fill: '#ffffff', lw: 0, align: 'left', rot: -0.025 });
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = Math.min(Math.max(tIn, 0), info.dur);
      const tw = LIB.onTwos(t);
      const spikeU = t < B_SPIKE ? 0 : LIB.ease.outBack(clamp((t - B_SPIKE + FR) / 0.25));
      const spiked = t >= B_SPIKE - 1e-6;

      // camera: slow push-in toward his face, tiny kick on the spike
      const z = 1 + 0.1 * LIB.ease.inOutSine(t / info.dur) + (spiked && t < B_SPIKE + 0.1 ? 0.02 : 0);
      const [sx, sy] = FX.shake(t, B_SPIKE, 0.25, 7, 5);
      ctx.save();
      ctx.translate(540 + sx, 1000 + sy);
      ctx.scale(z, z);
      ctx.translate(-540, -1000);

      // 1. room
      ctx.fillStyle = '#17152f';
      ctx.fillRect(-40, -40, W + 80, H + 80);
      ctx.drawImage(room(), 0, 0, W, H);
      // window lights twinkle + slow cloud
      for (let i = 0; i < 12; i++) {
        const on = h01(ID, 'wt', i, Math.floor(tw * 2)) > 0.5;
        if (!on) continue;
        ctx.fillStyle = '#fff3b0';
        ctx.fillRect(180 + h01(ID, 'wtx', i) * 720, 470 + h01(ID, 'wty', i) * 60, 6, 8);
      }
      ctx.save();
      ctx.beginPath(); ctx.rect(176, 156, 728, 388); ctx.clip();
      FX.cloud(ctx, 200 + t * 18, 250, 220, 'rgba(90,84,160,0.55)', 'rgba(50,44,110,0.4)');
      ctx.restore();
      // LED strip: hue cycles
      const hue = (t * 40) % 360;
      ctx.save();
      const led = ctx.createLinearGradient(0, 96, 0, 200);
      led.addColorStop(0, `hsla(${hue},90%,60%,0.55)`);
      led.addColorStop(1, `hsla(${hue},90%,60%,0)`);
      ctx.fillStyle = led; ctx.fillRect(0, 96, W, 110);
      ctx.fillStyle = `hsl(${hue},95%,70%)`; ctx.fillRect(0, 90, W, 8);
      ctx.restore();

      // 2. monitor glow + monitors
      ctx.save();
      const glow = ctx.createRadialGradient(540, 600, 60, 540, 640, 620);
      glow.addColorStop(0, spiked ? 'rgba(80,255,170,0.45)' : 'rgba(60,200,255,0.4)');
      glow.addColorStop(1, 'rgba(60,200,255,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 140, W, 1100);
      ctx.restore();
      FX.monitor(ctx, 20, 470, 330, 240, { screen: (g, w, h) => screenLeft(g, w, h, t, spiked) });
      FX.monitor(ctx, 730, 470, 330, 240, { screen: (g, w, h) => screenRight(g, w, h, t, spikeU) });
      FX.monitor(ctx, 320, 430, 440, 300, { screen: (g, w, h) => screenMid(g, w, h, t, spikeU) });
      // scanline sheen on screens
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#ffffff';
      const sl = 440 + ((t * 120) % 280);
      ctx.fillRect(332, sl, 416, 6);
      ctx.restore();
      // desk items: keyboard with RGB, mouse, mug, cactus, snow globe
      ctx.save();
      FX.rrect(ctx, 370, 708, 340, 34, 8); FX.fo(ctx, '#15151f', 4);
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = `hsl(${(hue + i * 24) % 360},90%,62%)`;
        ctx.fillRect(382 + i * 23, 716, 17, 7);
        ctx.fillRect(382 + i * 23, 728, 17, 7);
      }
      FX.ellipse(ctx, 760, 728, 22, 13); FX.fo(ctx, '#15151f', 4);
      ctx.restore();
      FX.mug(ctx, 950, 745, 0.9, { t });
      // cactus in a pot (left)
      FX.rrect(ctx, 52, 690, 26, 44, 13); FX.fo(ctx, P.tree, 4);
      FX.rrect(ctx, 34, 700, 16, 26, 8); FX.fo(ctx, P.tree, 4);
      FX.poly(ctx, [[36, 725], [96, 725], [88, 752], [44, 752]]); FX.fo(ctx, '#d9653b', 4);
      // snow globe with a tiny Ararat
      FX.ellipse(ctx, 840, 712, 26, 26); FX.fo(ctx, 'rgba(200,230,255,0.5)', 4);
      FX.rrect(ctx, 816, 728, 48, 14, 4); FX.fo(ctx, '#7a5236', 4);

      // 3. chair: back + seat behind Hayk
      const breathe = Math.sin(t * 2.2) * 3;
      const seatY = HY - 101 * HS;
      chairBack(ctx, HX, seatY + 20, 1.0, Math.sin(t * 0.9) * 0.01);
      chairSeat(ctx, HX, seatY + 30, 1.0, 0);
      chairArms(ctx, HX, seatY + 10, 1.0);

      // 4. rim light silhouettes then Hayk
      const ho = { x: HX, y: HY + breathe * 0.3, s: HS, t, pose: 'sit', face: 'focused', belly: 0, look: [0, -0.1] };
      const rimA = spiked ? '#6dffb0' : '#6ff2ff';
      FILM.cast.hayk(ctx, Object.assign({}, ho, { x: HX - 8, y: ho.y - 6, silhouette: rimA }));
      FILM.cast.hayk(ctx, Object.assign({}, ho, { x: HX + 8, y: ho.y - 6, silhouette: '#5dffa8' }));
      const a = FILM.cast.hayk(ctx, ho);
      // monitor light wash over his head (additive)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const rim = ctx.createRadialGradient(a.head[0], a.head[1] - 120, 40, a.head[0], a.head[1] - 60, 260);
      rim.addColorStop(0, spiked ? 'rgba(60,255,140,0.22)' : 'rgba(40,190,255,0.18)');
      rim.addColorStop(1, 'rgba(40,190,255,0)');
      ctx.fillStyle = rim;
      ctx.fillRect(a.head[0] - 300, a.head[1] - 400, 600, 600);
      ctx.restore();

      // 5. dust motes in the monitor light
      FX.bokeh(ctx, { n: 14, seed: 202, t, x: 60, y: 420, w: 960, h: 700, rMin: 3, rMax: 9, colors: ['#9ff0ff', '#b8ffd8', '#ffffff'], alpha: 0.5 });

      // spike: eye glints, PING!, green burst of light
      if (spiked) {
        const age = t - B_SPIKE;
        const gl = age < 0.35 ? FX.popIn(t, B_SPIKE) : 0.75 + 0.25 * Math.sin(age * 12);
        FX.sparkle(ctx, a.eyeL[0] - 6, a.eyeL[1] - 10, 42 * gl, { rot: age * 2, color: '#eafff4' });
        FX.sparkle(ctx, a.eyeR[0] - 6, a.eyeR[1] - 10, 58 * gl, { rot: -age * 2, color: '#ffffff' });
        if (age < 0.5) FX.shockRing(ctx, 540, 560, age, { r: 360, color: P.up, life: 0.5, width: 14 });
        FX.speedLines(ctx, { x: 180, y: 200, w: 720, h: 600, angle: -Math.PI / 2, count: 18, color: P.up, alpha: 0.5 * clamp(1 - age / 1.2), t, speed: 1400, len: 200, width: 8, seed: 71 });
        // green arrow up over the monitors
        const ay = 420 - LIB.ease.outCubic(clamp(age / 0.4)) * 60;
        ctx.save();
        ctx.translate(900, ay);
        ctx.scale(FX.popIn(t, B_SPIKE), FX.popIn(t, B_SPIKE));
        FX.poly(ctx, [[0, -70], [50, -10], [20, -10], [20, 60], [-20, 60], [-20, -10], [-50, -10]]);
        FX.fo(ctx, P.up, 5);
        ctx.restore();
      }
      ctx.restore(); // camera

      // screen-fixed overlays
      if (spiked && t < B_SPIKE + 3 * FR) FX.flash(ctx, 0.3, '#b8ffd8');
      if (spiked) {
        FX.burst(ctx, 850, 800, 150 * FX.popIn(t, B_SPIKE), 95 * FX.popIn(t, B_SPIKE), 12, '#ffffff', { seed: 4, lw: 5, jitter: 0.2 });
        FX.sfx(ctx, 'PING!', 850, 800, t, B_SPIKE, { size: 96, fill: P.up, shadowColor: '#0b6b3a', rot: -0.15 });
      }
      introCard(ctx, t, B_CARD);
    },
  });
})();
