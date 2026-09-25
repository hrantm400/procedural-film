// Shot 01 'cold-open' : Title card "HAYK: THE BURGER QUEST". Global T 0.0 - 4.0 (4 s).
// Layers, back to front:
//   1. indigo night sky gradient, stars, crescent moon, drifting night clouds
//   2. Mount Ararat (two peaks, snow) on the horizon with a moonlit glow behind it
//   3. Yerevan skyline: far flat blocks, the TV tower with a blinking light, near buildings with warm windows
//   4. radial focus lines (faint from frame 0, explode on 0.5 with an impact flash) + gold sunburst after 1.0
//   5. katakana accent "バーガー" faint behind the title
//   6. title "HAYK" / "THE BURGER QUEST" slamming in on 1.0 (three drawings, overshoot)
//   7. spinning burger with sparkles popping in at 2.0
//   8. "EPISODE 1" black tag at 3.0, flashes, gold bokeh embers
(function () {
  'use strict';
  const ID = 'cold-open';
  const FX = FILM.fx;
  const LIB = FILM.lib;
  const P = FX.pal;
  const TAU = Math.PI * 2;
  const FR = 1 / 24;
  const clamp = FX.clamp, lerp = FX.lerp, h01 = FX.h01;

  // beats (local = global here, shot starts at 0)
  const B_FOCUS = 0.5; // T 0.5 focus lines explode + impact flash
  const B_TITLE = 1.0; // T 1.0 title slams in
  const B_BURGER = 2.0; // T 2.0 burger pops in
  const B_EP = 3.0; // T 3.0 EPISODE 1 tag

  const W = 1080, H = 1920;
  const TITLE_Y = 820;

  // ---------------------------------------------------------------------------
  // Static skyline (cached: hundreds of windows)
  // ---------------------------------------------------------------------------
  function skyline() {
    return LIB.cached('cold-open-bg-v4', () => {
      const c = FILM.makeCanvas(W, H);
      const g = c.getContext('2d');
      // sky, moon, Ararat with a moonlit halo, TV tower (all static)
      FX.sky(g, P.nightTop, P.nightBottom, { x: 0, y: 0, w: W, h: H, mid: '#241f52', midAt: 0.45 });
      moon(g, 860, 250, 58);
      const halo = g.createRadialGradient(470, 1150, 40, 470, 1150, 700);
      halo.addColorStop(0, 'rgba(160,150,255,0.4)');
      halo.addColorStop(1, 'rgba(160,150,255,0)');
      g.fillStyle = halo;
      g.fillRect(0, 400, W, 1100);
      FX.ararat(g, -170, 1480, 1420, 720, { color: '#4d5294', shade: '#3a3f7a', snow: '#e4e8ff' });
      tvTower(g, 880, 1500);
      // far blocks: flat, cool, no outline
      g.fillStyle = '#2b2657';
      for (let i = 0; i < 26; i++) {
        const bw = 50 + h01(ID, 'fw', i) * 70;
        const bx = i * 44 - 30 + h01(ID, 'fx', i) * 20;
        const bh = 60 + h01(ID, 'fh', i) * 120;
        g.fillRect(bx, 1470 - bh, bw, bh + 40);
      }
      g.fillStyle = 'rgba(255,214,120,0.55)';
      for (let i = 0; i < 90; i++) {
        const x = h01(ID, 'fwx', i) * W, y = 1380 + h01(ID, 'fwy', i) * 90;
        g.fillRect(x, y, 5, 6);
      }
      // mid layer: tuff-stone blocks with rows of windows
      const mids = [];
      let x = -40;
      let i = 0;
      while (x < W + 40) {
        const bw = 110 + h01(ID, 'mw', i) * 120;
        const bh = 90 + h01(ID, 'mh', i) * 170;
        mids.push([x, bw, bh, i]);
        x += bw + 6;
        i++;
      }
      mids.forEach(([bx, bw, bh, k]) => {
        const top = 1600 - bh;
        g.fillStyle = k % 2 ? '#3a2d5e' : '#43336a';
        g.fillRect(bx, top, bw, H - top);
        g.fillStyle = '#2e2450';
        g.fillRect(bx + bw - 18, top, 18, H - top);
        // roof detail
        g.fillStyle = '#2a2148';
        g.fillRect(bx - 4, top - 10, bw + 8, 12);
        if (h01(ID, 'ant', k) > 0.6) { g.fillRect(bx + bw * 0.3, top - 50, 4, 42); g.fillRect(bx + bw * 0.3 - 12, top - 40, 28, 3); }
        // windows
        for (let r = 0; top + 26 + r * 44 < H; r++) {
          for (let cI = 0; 16 + cI * 34 < bw - 26; cI++) {
            const lit = h01(ID, 'win', k, r, cI) > 0.55;
            g.fillStyle = lit ? (h01(ID, 'wc', k, r, cI) > 0.3 ? '#ffd27a' : '#ffb35c') : '#271f45';
            g.fillRect(bx + 16 + cI * 34, top + 26 + r * 44, 18, 24);
          }
        }
      });
      // near layer: a dark row of rooftops at the very bottom with balconies
      for (let k = 0; k < 7; k++) {
        const bx = -60 + k * 180;
        const top = 1720 + h01(ID, 'nh', k) * 70;
        g.fillStyle = '#1d1636';
        g.fillRect(bx, top, 176, H - top);
        g.fillStyle = '#15102a';
        g.beginPath(); g.moveTo(bx - 10, top); g.lineTo(bx + 88, top - 46); g.lineTo(bx + 186, top); g.closePath(); g.fill();
        for (let r = 0; r < 4; r++) {
          for (let cI = 0; cI < 3; cI++) {
            const lit = h01(ID, 'nwin', k, r, cI) > 0.5;
            g.fillStyle = lit ? '#ffcf6e' : '#241c40';
            g.fillRect(bx + 24 + cI * 50, top + 30 + r * 64, 26, 34);
            g.fillStyle = '#15102a';
            g.fillRect(bx + 18 + cI * 50, top + 64 + r * 64, 38, 6);
          }
        }
      }
      const haze = g.createLinearGradient(0, 1300, 0, 1700);
      haze.addColorStop(0, 'rgba(255,170,90,0)');
      haze.addColorStop(1, 'rgba(255,170,90,0.16)');
      g.fillStyle = haze;
      g.fillRect(0, 1300, W, 620);
      FX.vignette(g, 0.45, '8,4,30');
      return c;
    });
  }

  // Yerevan TV tower (lattice mast) silhouette with a blinking red light
  function tvLight(ctx, x, y, t) {
    const on = Math.floor(t * 2) % 2 === 0;
    if (on) {
      const gr = ctx.createRadialGradient(x, y, 0, x, y, 30);
      gr.addColorStop(0, 'rgba(255,60,60,0.9)');
      gr.addColorStop(1, 'rgba(255,60,60,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(x, y, 30, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = on ? '#ff5050' : '#7a2a3a';
    ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill();
  }
  function tvTower(ctx, x, base) {
    ctx.save();
    ctx.fillStyle = '#231c44';
    ctx.beginPath();
    ctx.moveTo(x - 46, base); ctx.lineTo(x - 8, base - 330); ctx.lineTo(x + 8, base - 330); ctx.lineTo(x + 46, base); ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 5, base - 470, 10, 150);
    ctx.fillRect(x - 22, base - 250, 44, 18);
    ctx.fillRect(x - 16, base - 330, 32, 14);
    ctx.strokeStyle = '#3a2f6b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const y0 = base - k * 55, y1 = base - (k + 1) * 55;
      const w0 = 46 - k * 6.3, w1 = 46 - (k + 1) * 6.3;
      ctx.moveTo(x - w0, y0); ctx.lineTo(x + w1, y1);
      ctx.moveTo(x + w0, y0); ctx.lineTo(x - w1, y1);
    }
    ctx.stroke();
    ctx.restore();
  }

  function moon(ctx, x, y, r) {
    ctx.save();
    const gr = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 3.2);
    gr.addColorStop(0, 'rgba(255,244,200,0.35)');
    gr.addColorStop(1, 'rgba(255,244,200,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff4cc';
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8d9a8';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y + r * 0.2, r * 0.18, 0, TAU); ctx.arc(x + r * 0.35, y - r * 0.25, r * 0.12, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Title
  // ---------------------------------------------------------------------------
  function title(ctx, t) {
    if (t < B_TITLE - 1e-6) return;
    const d = Math.floor((t - B_TITLE) * 12 + 1e-6); // drawings on twos since the slam
    // three drawings: huge smear -> overshoot -> settle
    const sc = [1.55, 0.9, 1.08, 1][Math.min(3, d)];
    const settle = t - B_TITLE;
    const float = d >= 3 ? Math.sin(settle * 2.4) * 6 : 0;
    ctx.save();
    ctx.translate(540, TITLE_Y + float);
    ctx.rotate(-0.06);
    ctx.scale(sc, sc);
    // backing burst: jagged dark red plate behind HAYK
    FX.burst(ctx, 0, 0, 390, 300, 18, '#b3122b', { seed: 5, lw: 8, squash: 0.45, jitter: 0.18 });
    FX.burst(ctx, 0, 0, 340, 270, 18, '#e8413c', { seed: 6, lw: 0, squash: 0.4, jitter: 0.1 });
    // HAYK: gold fill, thick black outline, dark red drop shadow
    FX.text(ctx, 'HAYK', 0, 0, {
      size: 190, fill: P.gold, stroke: P.line, lw: 30, shadow: 16, shadowColor: '#6e0a1a', skew: -0.1, letter: 6,
    });
    // subtitle bar
    ctx.save();
    ctx.translate(0, 150);
    ctx.fillStyle = P.line;
    ctx.beginPath();
    ctx.moveTo(-400, -48); ctx.lineTo(410, -58); ctx.lineTo(395, 48); ctx.lineTo(-410, 56); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = P.gold;
    ctx.beginPath(); ctx.moveTo(-410, 56); ctx.lineTo(395, 48); ctx.lineTo(393, 60); ctx.lineTo(-412, 68); ctx.closePath(); ctx.fill();
    FX.text(ctx, 'THE BURGER QUEST', 0, 0, { size: 70, fill: '#ffffff', stroke: P.line, lw: 0, skew: -0.1 });
    ctx.restore();
    ctx.restore();
    // shine sweep over HAYK (after it settles)
    if (d >= 3) {
      const u = ((settle - 0.35) % 1.6) / 0.5;
      if (u >= 0 && u <= 1) {
        const sx = lerp(260, 820, u);
        FX.sparkle(ctx, sx, TITLE_Y - 70 + (sx - 540) * -0.06, 46, { rot: u });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Spinning burger (fake Y-axis spin: horizontal squash with a cos)
  // ---------------------------------------------------------------------------
  function spinningBurger(ctx, t) {
    if (t < B_BURGER - 1e-6) return;
    const pop = FX.popIn(t, B_BURGER);
    const age = t - B_BURGER;
    const tw = LIB.onTwos(t);
    const spin = Math.cos((tw - B_BURGER) * TAU * 0.9);
    const sx = (0.45 + 0.55 * Math.abs(spin)) * pop;
    const bob = Math.sin(age * 3.2) * 10;
    const x = 540, y = 470 + bob;
    ctx.save();
    // glow + rays behind
    const gr = ctx.createRadialGradient(x, y, 20, x, y, 260);
    gr.addColorStop(0, 'rgba(255,230,120,0.85)');
    gr.addColorStop(1, 'rgba(255,230,120,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(x, y, 260 * pop, 0, TAU); ctx.fill();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(age * 0.6);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#fff3a0';
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * TAU, a1 = a0 + TAU / 36;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a0) * 300 * pop, Math.sin(a0) * 300 * pop);
      ctx.lineTo(Math.cos(a1) * 300 * pop, Math.sin(a1) * 300 * pop);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
    ctx.translate(x, y);
    ctx.scale(sx, pop);
    FX.burger(ctx, 0, 0, 1.45, {});
    ctx.restore();
    // sparkles orbiting
    for (let i = 0; i < 6; i++) {
      const a = age * 2.2 + (i / 6) * TAU;
      const r = 36 * (0.6 + 0.4 * Math.abs(Math.sin(age * 5 + i * 1.3))) * pop;
      FX.sparkle(ctx, x + Math.cos(a) * 230, y + Math.sin(a) * 110, r, { color: i % 2 ? '#fff3a0' : '#ffffff', rot: a });
    }
    FX.sparkles(ctx, { x: x - 260, y: y - 170, w: 520, h: 300, n: 8, seed: 71, t, size: 30 });
  }

  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = Math.min(Math.max(tIn, 0), info.dur);
      const tw = LIB.onTwos(t);

      // camera: slow push, shake on the explosion and the slam
      const [shx, shy] = FX.shakeMany(t, [[B_FOCUS, 0.3, 14], [B_TITLE, 0.4, 26], [B_BURGER, 0.2, 8]], 3);
      const zoom = 1 + 0.035 * (t / info.dur) + (t >= B_TITLE && t < B_TITLE + 0.1 ? 0.03 : 0);
      ctx.save();
      ctx.translate(540 + shx, 960 + shy);
      ctx.scale(zoom, zoom);
      ctx.translate(-540, -960);

      // 1-3. cached sky / moon / Ararat / skyline, then live stars, clouds, lights
      ctx.fillStyle = P.nightTop;
      ctx.fillRect(-60, -60, W + 120, 120);
      ctx.drawImage(skyline(), 0, 0, W, H);
      FX.stars(ctx, { n: 90, seed: 31, x: 0, y: 0, w: W, h: 700 });
      FX.clouds(ctx, { n: 3, seed: 19, t, y: 120, h: 380, color: 'rgba(80,72,150,0.45)', shade: 'rgba(40,34,90,0.35)', speed: 22, scale: 0.8 });
      tvLight(ctx, 880, 1028, t);
      for (let i = 0; i < 10; i++) {
        const on = h01(ID, 'flk', i, Math.floor(tw * 3)) > 0.4;
        ctx.fillStyle = on ? '#fff0a8' : '#271f45';
        const x = 30 + h01(ID, 'flx', i) * 1000, y = 1560 + h01(ID, 'fly', i) * 300;
        ctx.fillRect(x, y, 18, 24);
      }

      // 4. focus lines / sunburst
      const exploded = t >= B_FOCUS - 1e-6;
      if (t >= B_TITLE - 1e-6) {
        ctx.save();
        ctx.globalAlpha = 0.4 + 0.2 * FX.beatPulse(t, 0.5, 0.15);
        ctx.translate(540, TITLE_Y);
        ctx.rotate((t - B_TITLE) * 0.25);
        const rg = ctx.createRadialGradient(0, 0, 100, 0, 0, 900);
        rg.addColorStop(0, 'rgba(255,211,90,0.9)');
        rg.addColorStop(1, 'rgba(255,211,90,0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        for (let i = 0; i < 20; i++) {
          const a0 = (i / 20) * TAU, a1 = a0 + TAU / 40;
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a0) * 1500, Math.sin(a0) * 1500);
          ctx.lineTo(Math.cos(a1) * 1500, Math.sin(a1) * 1500);
          ctx.closePath();
        }
        ctx.fill();
        ctx.restore();
      }
      if (!exploded) {
        // faint lines already converging, a spark gathering at the centre
        const u = t / B_FOCUS;
        FX.focusLines(ctx, 540, TITLE_Y, { inner: lerp(430, 300, u), count: 90, color: '#dfe3ff', alpha: 0.55 + 0.3 * u, seed: 12, width: 14 });
        FX.sparkle(ctx, 540, TITLE_Y, 40 + 90 * u, { rot: u * 1.5 });
      } else {
        const age = t - B_FOCUS;
        const inner = age < 0.5 ? lerp(120, 380, FX.clamp(age / 0.3)) : 380 + 20 * FX.beatPulse(t, 0.5, 0.15);
        FX.focusLines(ctx, 540, TITLE_Y, { inner, rx: inner * 1.15, ry: inner, count: 120, color: '#ffffff', alpha: age < 0.4 ? 0.95 : lerp(0.95, 0.4, clamp((age - 0.4) / 0.4)), seed: 13, width: 20 });
        if (age < 0.6) FX.shockRing(ctx, 540, TITLE_Y, age, { r: 700, color: '#ffffff', life: 0.6, width: 22 });
      }

      // 5. katakana accent behind the title
      if (t >= B_FOCUS) {
        const a = clamp((t - B_FOCUS) / 0.5) * 0.4;
        FX.text(ctx, 'バーガー', 540 + Math.sin(t * 1.3) * 10, 1235, { size: 210, fill: '#ffcc33', stroke: '#ffffff', lw: 8, alpha: a, font: 'jp', rot: -0.06, letter: 10 });
      }

      // gold embers drifting up
      FX.bokeh(ctx, { n: 16, seed: 44, t, x: 0, y: 300, w: W, h: 1200, rMin: 4, rMax: 14, colors: ['#ffcc33', '#ffe066', '#ff9a4a'], alpha: t >= B_TITLE ? 0.7 : 0.3 });

      // 6. title, 7. burger
      spinningBurger(ctx, t);
      title(ctx, t);
      if (t >= B_TITLE) FX.sparkles(ctx, { x: 150, y: TITLE_Y - 180, w: 780, h: 380, n: 7, seed: 83, t, size: 34 });

      // 8. EPISODE 1 tag
      if (t >= B_EP - 1e-6) {
        const s = FX.popIn(t, B_EP);
        ctx.save();
        ctx.translate(540, 1080);
        ctx.rotate(-0.04);
        ctx.scale(s, s);
        FX.tag(ctx, 'EPISODE 1', 0, 0, { size: 46, bg: P.line, color: '#ffffff', lw: 5, line: P.gold });
        ctx.restore();
        FX.sparkle(ctx, 540 + 170, 1050, 26 * s * (0.6 + 0.4 * Math.sin(t * 9)), {});
      }
      ctx.restore();

      // screen-fixed: impact flashes
      if (exploded && t < B_FOCUS + 3 * FR) FX.flash(ctx, 0.85 - (t - B_FOCUS) * 8, '#ffffff');
      if (t >= B_TITLE && t < B_TITLE + 2 * FR) FX.flash(ctx, 0.55, '#fff4c0');
    },
  });
})();
