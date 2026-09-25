/*
 * Shot 14 'burger-chart' : "Bullish on burgers" (T 59.0 - 64.0, 5 s).
 * Trading-terminal parody. A dark terminal with a grid; a candlestick chart whose candles are
 * tiny burger stacks rockets up. Header "BURGER/USD". Hayk (point, smug, belly 0.8, shades)
 * stands in front like a teacher with a telescopic pointer. Bubble at 1.5: "BULLISH ON BURGERS."
 * At 2.0 the last candle rockets through the top: "ALL-TIME HIGH" flashes, green arrow up with
 * sparkles. At 3.5 a tiny red candle labelled "INVESTORS" sits on a flat line at the bottom.
 *
 * Layers, back to front:
 *   1. terminal background (cached): grid, panels, axis ticks, scanlines
 *   2. ticker tape, header (BURGER/USD, price), beat-pulsing grid glow
 *   3. volume bars, big green arrow, price line, burger candles, rocket flame, ATH line + label
 *   4. INVESTORS flat line + tiny red candle
 *   5. Hayk + pointer, bubble
 *   6. flashes, sparkles
 */
(function () {
  'use strict';

  const ID = 'burger-chart';
  const FR = 1 / 24;
  const TAU = Math.PI * 2;

  const T_BUBBLE = 1.5; // T 60.5
  const T_ATH = 2.0; // T 61.0
  const T_INV = 3.5; // T 62.5

  // chart box
  const CH = { x: 60, y: 420, w: 960, h: 850 };
  const Y0 = 1225, Y1 = 540; // value 0 and value 1 in px
  const N = 10;
  const CX0 = 424, CDX = 58, CW = 50;

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const vy = (v) => lerp(Y0, Y1, v);

  // candle data: [open, close, hi, lo]
  const CANDLES = (() => {
    const out = [];
    let prev = 0.02;
    for (let i = 0; i < N; i++) {
      let close = 0.03 + 0.8 * Math.pow(i / (N - 2), 2.5);
      if (i === 3 || i === 7) close = prev - 0.035; // two dips
      if (i === N - 1) close = 1.08; // the rocket candle
      const open = prev;
      const hi = Math.max(open, close) + 0.025 + (i % 3) * 0.008;
      const lo = Math.min(open, close) - 0.02 - (i % 2) * 0.01;
      out.push([open, close, hi, lo]);
      prev = close;
    }
    return out;
  })();
  // time each candle appears (the last one on T_ATH)
  const tCandle = (i) => (i <= 3 ? -1 : T_ATH - (N - 1 - i) * 0.3);

  function burgerSprite(F, red) {
    return FILM.lib.cached(ID + '-burger-' + (red ? 'r' : 'g'), () => {
      const c = FILM.makeCanvas(240, 200);
      const g = c.getContext('2d');
      F.burger(g, 120, 112, 1);
      if (red) {
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = 'rgba(255,40,70,0.55)';
        g.fillRect(0, 0, 240, 200);
      }
      return c;
    });
  }

  function background(F) {
    return FILM.lib.cached(ID + '-bg', () => {
      const c = FILM.makeCanvas(1080, 1920);
      const g = c.getContext('2d');
      const P = F.pal;
      g.fillStyle = P.termBg;
      g.fillRect(0, 0, 1080, 1920);
      // soft blue glow in the middle
      const rg = g.createRadialGradient(540, 820, 60, 540, 820, 900);
      rg.addColorStop(0, 'rgba(40,80,160,0.35)'); rg.addColorStop(1, 'rgba(40,80,160,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 1080, 1920);
      // fine grid everywhere
      g.strokeStyle = P.termGrid; g.lineWidth = 2;
      g.beginPath();
      for (let x = 0; x <= 1080; x += 60) { g.moveTo(x, 0); g.lineTo(x, 1920); }
      for (let y = 0; y <= 1920; y += 60) { g.moveTo(0, y); g.lineTo(1080, y); }
      g.stroke();
      // ticker strip
      g.fillStyle = '#060912'; g.fillRect(0, 118, 1080, 64);
      g.fillStyle = '#1f2c55'; g.fillRect(0, 118, 1080, 3); g.fillRect(0, 179, 1080, 3);
      // header panel
      F.rrect(g, 40, 212, 1000, 172, 18); F.fo(g, '#111a33', 4, '#2b3b6e');
      // chart panel
      F.rrect(g, CH.x, CH.y, CH.w, CH.h, 18); F.fo(g, 'rgba(8,13,28,0.85)', 4, '#2b3b6e');
      // chart horizontal levels + right axis ticks
      g.strokeStyle = 'rgba(80,110,190,0.28)'; g.lineWidth = 2; g.setLineDash([10, 10]);
      g.beginPath();
      for (let k = 0; k <= 6; k++) { const y = lerp(Y0, Y1, k / 6); g.moveTo(CH.x + 20, y); g.lineTo(CH.x + CH.w - 90, y); }
      g.stroke();
      g.setLineDash([]);
      for (let k = 0; k <= 6; k++) {
        const y = lerp(Y0, Y1, k / 6);
        F.text(g, (k * 250).toString(), CH.x + CH.w - 50, y, { size: 24, fill: '#6f86c6', lw: 0 });
      }
      // volume panel
      F.rrect(g, 60, 1296, 960, 250, 18); F.fo(g, 'rgba(8,13,28,0.85)', 4, '#2b3b6e');
      // corner brackets (terminal HUD)
      g.strokeStyle = '#35e08a'; g.lineWidth = 5;
      [[CH.x + 8, CH.y + 8, 1, 1], [CH.x + CH.w - 8, CH.y + 8, -1, 1], [CH.x + 8, CH.y + CH.h - 8, 1, -1], [CH.x + CH.w - 8, CH.y + CH.h - 8, -1, -1]].forEach(([x, y, sx, sy]) => {
        g.beginPath(); g.moveTo(x, y + sy * 36); g.lineTo(x, y); g.lineTo(x + sx * 36, y); g.stroke();
      });
      // scanlines
      g.fillStyle = 'rgba(0,0,0,0.16)';
      for (let y = 0; y < 1920; y += 6) g.fillRect(0, y, 1080, 2);
      return c;
    });
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const F = FILM.fx, C = FILM.cast, P = F.pal, L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const ath = t >= T_ATH - 1e-6;
      const athAge = t - T_ATH;

      // camera: slow push, shake on ATH and on INVESTORS
      const push = 1 + 0.035 * L.ease.inOutCubic(t / info.dur);
      const sh = F.shakeMany(t, [[T_ATH, 0.45, 26], [T_INV, 0.25, 8]], 1401);
      ctx.save();
      ctx.translate(540 + sh[0], 900 + sh[1]);
      ctx.scale(push, push);
      ctx.translate(-540, -900);

      // 1. background
      ctx.drawImage(background(F), 0, 0);
      // beat pulse on the grid
      const bp = F.beatPulse(t, 0.5, 0.14);
      if (bp > 0.02) {
        ctx.save();
        ctx.globalAlpha = bp * 0.18;
        ctx.fillStyle = P.up;
        ctx.fillRect(CH.x, CH.y, CH.w, CH.h);
        ctx.restore();
      }

      // chart watermark
      F.text(ctx, 'BRGR', 540, 850, { size: 250, fill: '#ffffff', lw: 0, alpha: 0.05 });
      F.text(ctx, 'BURGER / USD  1D', 540, 990, { size: 50, fill: '#ffffff', lw: 0, alpha: 0.05 });

      // 2. ticker tape (decor, scrolls)
      const tape = 'BRGR/USD +4200%   FRIES/USD +69%   NUGGETS +12%   SALAD/USD -99%   KALE -80%   DONUT/USD +7%   ';
      const tapeW = 2400;
      const off = -((tw * 260) % tapeW);
      for (let k = 0; k < 2; k++) {
        F.text(ctx, tape, off + k * tapeW, 151, { size: 30, fill: '#35e08a', lw: 0, align: 'left' });
      }
      // header
      F.burger(ctx, 118, 300, 0.36, { rot: Math.sin(tw * 4) * 0.08 });
      F.text(ctx, 'BURGER/USD', 184, 282, { size: 74, fill: '#ffffff', lw: 0, align: 'left' });
      F.text(ctx, 'BURGER KONG EXCHANGE  |  1D  |  LIVE', 188, 346, { size: 24, fill: '#6f86c6', lw: 0, align: 'left' });
      // live dot
      ctx.fillStyle = Math.floor(t * 4) % 2 ? '#ff4d5e' : '#ff9aa4';
      ctx.beginPath(); ctx.arc(700, 346, 8, 0, TAU); ctx.fill();
      // price rolls up
      const pv = 12 + 1488 * Math.pow(clamp((t + 0.2) / (T_ATH + 0.2)), 2.4) + (ath ? Math.sin(t * 9) * 6 : 0);
      const price = '$' + Math.floor(pv).toLocaleString('en-US') + '.' + String(Math.floor((pv * 100) % 100)).padStart(2, '0');
      F.text(ctx, price, 1010, 270, { size: 50, fill: P.up, lw: 0, align: 'right' });
      const pct = '+' + Math.floor(pv * 2.8) + '%';
      ctx.save();
      const pw = F.measure(ctx, pct, 30) + 60;
      F.rrect(ctx, 1010 - pw, 312, pw, 50, 12); F.fo(ctx, 'rgba(47,224,138,0.18)', 3, P.up);
      ctx.fillStyle = P.up;
      ctx.beginPath(); ctx.moveTo(1010 - pw + 16, 348); ctx.lineTo(1010 - pw + 30, 326); ctx.lineTo(1010 - pw + 44, 348); ctx.closePath(); ctx.fill();
      F.text(ctx, pct, 1010 - pw / 2 + 22, 338, { size: 30, fill: P.up, lw: 0 });
      ctx.restore();

      // 3a. volume bars
      ctx.save();
      for (let i = 0; i < 24; i++) {
        const x = 90 + i * 38;
        const shown = i < 8 || t > (i - 8) * 0.13;
        if (!shown) continue;
        const h = 20 + Math.pow(i / 23, 2) * 170 + F.h01(ID, 'vol', i) * 30;
        ctx.fillStyle = i % 7 === 4 ? 'rgba(255,77,94,0.75)' : 'rgba(47,224,138,0.7)';
        ctx.fillRect(x, 1520 - h, 26, h);
      }
      ctx.restore();

      // 3b. big green arrow (grows with the chart)
      const arrU = L.ease.outCubic(clamp((t + 0.3) / (T_ATH + 0.3)));
      drawArrow(ctx, F, 440, 1180, lerp(440, 900, arrU), lerp(1180, 600, arrU), 1);

      // 3c. candles
      const vis = [];
      for (let i = 0; i < N; i++) {
        const ti = tCandle(i);
        if (t < ti - 1e-6) break;
        const age = t - ti;
        const grow = i === N - 1 ? L.ease.outBack(clamp((age + FR) / 0.28)) : clamp((age + FR) / 0.12);
        vis.push({ i, grow, age });
      }
      // price line through closes
      ctx.save();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      [[18, 'rgba(47,224,138,0.18)'], [6, P.up]].forEach(([lw, col]) => {
        ctx.strokeStyle = col; ctx.lineWidth = lw;
        ctx.beginPath();
        vis.forEach((c, k) => {
          const [o, cl] = CANDLES[c.i];
          const x = CX0 + c.i * CDX, y = vy(lerp(o, cl, c.grow));
          if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
      });
      ctx.restore();
      vis.forEach((c) => drawCandle(ctx, F, c.i, c.grow, t));
      // rocket flame under the last candle
      const last = vis[vis.length - 1];
      let tip = [CX0 + last.i * CDX, vy(lerp(CANDLES[last.i][0], CANDLES[last.i][1], last.grow))];
      if (ath) {
        const x = CX0 + (N - 1) * CDX;
        const yb = vy(CANDLES[N - 1][0]) + 16;
        drawFlame(ctx, x, yb, t);
        F.speedLines(ctx, { angle: -Math.PI / 2, count: 10, color: '#aaffd0', alpha: 0.5, seed: 1402, t, speed: 2200, len: 220, width: 6, x: x - 60, y: 440, w: 120, h: 700 });
      }

      // ATH dashed line + flashing label
      if (ath) {
        const yA = vy(1.08) - 26;
        ctx.save();
        ctx.strokeStyle = P.gold; ctx.lineWidth = 4; ctx.setLineDash([16, 10]);
        ctx.beginPath(); ctx.moveTo(CH.x + 20, yA); ctx.lineTo(CH.x + CH.w - 20, yA); ctx.stroke();
        ctx.restore();
        const on = Math.floor(athAge * 8) % 2 === 0;
        const sc = F.popIn(t, T_ATH);
        ctx.save();
        ctx.translate(420, 560);
        ctx.rotate(-0.06);
        ctx.scale(sc, sc);
        F.burst(ctx, 0, 0, 330, 250, 18, on ? P.gold : '#ff4d5e', { seed: 1403, lw: 6, squash: 0.42 });
        F.text(ctx, 'ALL-TIME HIGH', 0, 4, { size: 70, fill: on ? '#ff3b3b' : '#ffffff', stroke: P.line, lw: 12, shadow: 6 });
        ctx.restore();
        // sparkles at the arrow tip + around the rocket
        F.sparkles(ctx, { x: 760, y: 420, w: 280, h: 260, n: 8, seed: 1404, t, size: 44, color: '#eaffef' });
        const sa = Math.sin(t * 10);
        F.sparkle(ctx, 905, 590, 46 + sa * 12, { color: '#ffffff', rot: t * 2 });
      } else {
        F.sparkle(ctx, lerp(440, 900, arrU) + 6, lerp(1180, 600, arrU) - 6, 26 + Math.sin(t * 12) * 8, { color: '#ffffff' });
      }

      // 4. INVESTORS: flat line + tiny red candle at the bottom
      if (t >= T_INV - 1e-6) {
        const age = t - T_INV;
        const u = clamp((age + FR) / 0.3);
        const yI = 1236;
        ctx.save();
        ctx.strokeStyle = P.down; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(470, yI); ctx.lineTo(lerp(470, 938, u), yI); ctx.stroke();
        ctx.restore();
        if (u >= 1) {
          // tiny red candle
          ctx.save();
          ctx.strokeStyle = P.down; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(950, yI - 16); ctx.lineTo(950, yI + 12); ctx.stroke();
          ctx.fillStyle = P.down; ctx.fillRect(943, yI - 6, 14, 12);
          ctx.restore();
          const blink = Math.floor(age * 6) % 2 === 0;
          ctx.save();
          ctx.globalAlpha = blink ? 0.9 : 0.4;
          ctx.fillStyle = P.down;
          ctx.beginPath(); ctx.arc(950, yI, 14, 0, TAU); ctx.fill();
          ctx.restore();
        }
      }

      // 5. Hayk + telescopic pointer
      const bob = Math.sin(tw * Math.PI * 2) * 5;
      const hx = 262, hy = 2140 + bob;
      // blue rim glow behind him
      const rg = ctx.createRadialGradient(hx, 1420, 60, hx, 1420, 520);
      rg.addColorStop(0, 'rgba(47,224,138,0.28)'); rg.addColorStop(1, 'rgba(47,224,138,0)');
      ctx.fillStyle = rg; ctx.fillRect(hx - 520, 900, 1040, 1020);
      const a = C.hayk(ctx, { x: hx, y: hy, s: 1.64, t, pose: 'point', face: 'smug', belly: 0.8, shades: true, headTilt: -0.06 });
      // pointer: from the fingertip to the newest candle top
      const hand = a.handR;
      const ptU = L.ease.outCubic(clamp(t / 0.3));
      const target = [tip[0] - 20, tip[1] + 30];
      const tp = [lerp(hand[0] + 200, target[0], ptU), lerp(hand[1] - 60, target[1], ptU)];
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = P.line; ctx.lineWidth = 16;
      ctx.beginPath(); ctx.moveTo(hand[0] + 30, hand[1]); ctx.lineTo(tp[0], tp[1]); ctx.stroke();
      ctx.strokeStyle = '#c9ccd8'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(hand[0] + 30, hand[1]); ctx.lineTo(tp[0], tp[1]); ctx.stroke();
      ctx.fillStyle = '#ff4d5e';
      ctx.beginPath(); ctx.arc(tp[0], tp[1], 13, 0, TAU); F.fo(ctx, '#ff4d5e', 4);
      ctx.restore();
      // shades glint
      const gl = (t % 1.25) / 1.25;
      if (gl < 0.3) F.sparkle(ctx, a.eyeL[0] - 10, a.eyeL[1] - 16, 30 * Math.sin((gl / 0.3) * Math.PI), { color: '#ffffff' });

      // INVESTORS label (over the pointer so it stays readable) + a tiny sweat drop
      if (t >= T_INV - 1e-6) {
        const ls = F.popIn(t, T_INV);
        ctx.save();
        ctx.translate(770, 1180);
        ctx.scale(ls, ls);
        F.rrect(ctx, -130, -30, 260, 60, 12); F.fo(ctx, '#2a0c14', 4, P.down);
        F.text(ctx, 'INVESTORS', 0, 2, { size: 38, fill: P.down, lw: 0 });
        ctx.restore();
        if (t > T_INV + 0.4) F.sweat(ctx, a.head[0] + 120, a.head[1] - 90 + Math.min(40, (t - T_INV - 0.4) * 30), 1.3);
      }

      // bubble
      F.bubble(ctx, 'BULLISH ON BURGERS.', 302, 900, {
        size: 54, maxW: 420, t, t0: T_BUBBLE, tail: [a.top[0] + 10, a.top[1] + 20],
      });
      ctx.restore(); // camera

      // 6. ATH flash (screen-fixed)
      if (ath && athAge < 3 * FR) F.flash(ctx, athAge < FR ? 0.8 : 0.35, '#eaffef');
    },
  });

  function drawArrow(ctx, F, x0, y0, x1, y1, a) {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
    if (len < 20) return;
    const ang = Math.atan2(dy, dx);
    const hw = 34, head = 110, hh = 84;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x0, y0);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, -hw); ctx.lineTo(len - head, -hw); ctx.lineTo(len - head, -hh); ctx.lineTo(len, 0);
    ctx.lineTo(len - head, hh); ctx.lineTo(len - head, hw); ctx.lineTo(0, hw); ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, 'rgba(47,224,138,0.15)'); g.addColorStop(0.5, 'rgba(47,224,138,0.55)'); g.addColorStop(1, 'rgba(90,255,170,0.95)');
    F.fo(ctx, g, 5, '#0f5e3a');
    ctx.restore();
  }

  function drawCandle(ctx, F, i, grow, t) {
    const [o, cl, hi, lo] = CANDLES[i];
    const up = cl >= o;
    const x = CX0 + i * CDX;
    const P = F.pal;
    const c = lerp(o, cl, grow);
    const top = vy(Math.max(o, c)), bot = vy(Math.min(o, c));
    // wick
    ctx.save();
    ctx.strokeStyle = up ? P.up : P.down; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x, vy(lerp(o, hi, grow))); ctx.lineTo(x, vy(lerp(o, lo, grow))); ctx.stroke();
    ctx.restore();
    // body: stack of tiny burgers
    const spr = burgerSprite(F, !up);
    const bw = CW, bh = CW * (200 / 240);
    const step = bh * 0.62;
    const h = Math.max(0, bot - top);
    const n = Math.max(1, Math.round(h / step));
    const jig = i === N - 1 ? Math.sin(t * 30) * 2 : 0;
    for (let k = 0; k < n; k++) {
      const yy = bot - bh * 0.62 - k * (n > 1 ? (h - bh * 0.3) / (n - 0.6) : 0);
      const wob = ((i * 7 + k * 3) % 5 - 2) * 1.2;
      ctx.drawImage(spr, x - bw / 2 + wob + jig, yy - bh / 2 + 8, bw, bh);
    }
  }

  function drawFlame(ctx, x, y, t) {
    const f = Math.floor(t * 12);
    const fl = 1 + ((f * 7) % 5) * 0.06;
    ctx.save();
    ctx.translate(x, y);
    [[46, 150, '#ff7a1a'], [32, 110, '#ffcc33'], [16, 70, '#fff6d8']].forEach(([w, h, col]) => {
      ctx.beginPath();
      ctx.moveTo(-w, 0);
      ctx.quadraticCurveTo(-w * 0.8, h * 0.6 * fl, 0, h * fl);
      ctx.quadraticCurveTo(w * 0.8, h * 0.6 * fl, w, 0);
      ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
    });
    ctx.restore();
  }
})();
