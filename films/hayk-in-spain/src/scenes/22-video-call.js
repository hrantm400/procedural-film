/*
 * Shot 22 'video-call' : "Video call"  (global T 95.0 - 100.0, 5 s)
 *
 * Vertical split screen, two phone video-call windows.
 *   TOP    (Spain)   : Hayk in a sunny burger restaurant, belly 0.8, crown, chewing with a burger
 *                      in his mouth. At 2.5 s (T 97.5) he freezes: face "shocked", blue shock lines,
 *                      shout "GOOFY?!". At 3.5 s (T 98.5) the burger starts to drop from his mouth.
 *   BOTTOM (Yerevan) : Grant's wrecked living room at night. Grant (exhausted, bandaged) holds the
 *                      phone out; Goofy's crying face is pressed against the screen (glass smudge).
 *                      At 1.0 s (T 96.0) Goofy's bubble "HAYK... COME BACK...".
 *   UI               : phone-call chrome on each window: "VIDEO CALL 00:07" timer pill, signal,
 *                      battery, call buttons.
 *
 * Layers back to front: frame bg -> [panel 1: restaurant bg, shock overlay, Hayk, burger, table,
 *   effects] -> [panel 2: apartment bg, Grant, Goofy, glass, tears] -> phone UI -> bubbles.
 */
(function () {
  'use strict';
  const ID = 'video-call';
  const FILM = window.FILM;
  const L = FILM.lib;
  const F = FILM.fx;
  const C = F.pal;
  const TAU = Math.PI * 2;
  const clamp = F.clamp, lerp = F.lerp, h01 = F.h01;
  const { rrect, fo, ellipse, poly } = F;
  const FR = 1 / 24;

  // beats (local t, global T in comments)
  const B_BUBBLE = 1.0; // T 96.0  Goofy: "HAYK... COME BACK..."
  const B_SHOCK = 2.5; //  T 97.5  Hayk shocked, "GOOFY?!"
  const B_DROP = 3.5; //   T 98.5  burger drops from his mouth

  // panels (screen coords)
  const P1 = { x: 16, y: 16, w: 1048, h: 906, r: 46 };
  const P2 = { x: 16, y: 944, w: 1048, h: 960, r: 46 };

  // Hayk placement (panel 1)
  const HK = { x: 430, y: 1135, s: 1.32 };
  // Goofy / Grant placement (panel 2)
  const GF = { x: 300, y: 1830, s: 2.5 };
  const GR = { x: 850, y: 1975, s: 1.15 };

  // ---------------------------------------------------------------------------
  // small helpers
  // ---------------------------------------------------------------------------
  function panelPath(ctx, p) { rrect(ctx, p.x, p.y, p.w, p.h, p.r); }

  function tri(ctx, a, b, c, fill) {
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }

  // ---------------------------------------------------------------------------
  // Static backgrounds (constants only, cached)
  // ---------------------------------------------------------------------------
  function restaurantBg() {
    return L.cached(ID + '-spain-bg', () => {
      const c = FILM.makeCanvas(1080, 960);
      const g = c.getContext('2d');
      // warm wall
      const wg = g.createLinearGradient(0, 0, 0, 960);
      wg.addColorStop(0, '#ffe3b0'); wg.addColorStop(0.6, '#ffd08e'); wg.addColorStop(1, '#f2b872');
      g.fillStyle = wg; g.fillRect(0, 0, 1080, 960);
      // ceiling beams
      g.fillStyle = '#8a4a2a';
      g.fillRect(0, 0, 1080, 70);
      g.fillStyle = '#6e3820';
      for (let i = 0; i < 8; i++) g.fillRect(i * 150 - 20, 0, 34, 70);
      g.fillStyle = '#5a2d19'; g.fillRect(0, 66, 1080, 10);

      // arched window (right) with a sunny Spanish street
      const wx = 640, wy = 170, ww = 360, wh = 470;
      g.save();
      g.beginPath();
      g.moveTo(wx, wy + wh); g.lineTo(wx, wy + ww / 2); g.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); g.lineTo(wx + ww, wy + wh); g.closePath();
      g.clip();
      const sg = g.createLinearGradient(0, wy, 0, wy + wh);
      sg.addColorStop(0, '#3ea6ff'); sg.addColorStop(1, '#bfe6ff');
      g.fillStyle = sg; g.fillRect(wx, wy, ww, wh);
      // sun
      g.fillStyle = '#fff3a8'; g.beginPath(); g.arc(wx + 280, wy + 110, 46, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,243,168,0.35)'; g.beginPath(); g.arc(wx + 280, wy + 110, 80, 0, TAU); g.fill();
      // far buildings
      const bld = [[wx - 10, 330, 140, '#fff4e0'], [wx + 120, 290, 120, '#ffe0b8'], [wx + 230, 350, 150, '#fff4e0']];
      bld.forEach(([bx, by, bw, col], i) => {
        g.fillStyle = col; g.fillRect(bx, wy + by - 60, bw, 400);
        g.fillStyle = '#d9653b';
        g.beginPath(); g.moveTo(bx - 12, wy + by - 60); g.lineTo(bx + bw / 2, wy + by - 100); g.lineTo(bx + bw + 12, wy + by - 60); g.closePath(); g.fill();
        g.fillStyle = '#6a8fd0';
        for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) {
          const px = bx + 18 + k * (bw - 36) / 2.4, py = wy + by - 30 + r * 70;
          g.fillRect(px, py, 24, 36);
          g.fillStyle = '#2a2233'; g.fillRect(px - 4, py + 36, 32, 5); g.fillStyle = '#6a8fd0';
        }
        if (i === 1) { g.fillStyle = '#e8413c'; g.fillRect(bx + 10, wy + by + 80, bw - 20, 12); }
      });
      // palm
      g.strokeStyle = '#8a5a34'; g.lineWidth = 16; g.lineCap = 'round';
      g.beginPath(); g.moveTo(wx + 70, wy + wh); g.quadraticCurveTo(wx + 60, wy + 330, wx + 100, wy + 230); g.stroke();
      g.fillStyle = '#3f9a44';
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI + (i / 6) * Math.PI;
        g.save(); g.translate(wx + 100, wy + 230); g.rotate(a);
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(60, -30, 120, 10); g.quadraticCurveTo(60, 0, 0, 0); g.fill();
        g.restore();
      }
      // street
      g.fillStyle = '#e8c48a'; g.fillRect(wx, wy + wh - 50, ww, 50);
      g.restore();
      // window frame
      g.lineWidth = 16; g.strokeStyle = '#6e3820';
      g.beginPath();
      g.moveTo(wx, wy + wh); g.lineTo(wx, wy + ww / 2); g.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); g.lineTo(wx + ww, wy + wh); g.closePath();
      g.stroke();
      g.lineWidth = 8;
      g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + 300); g.lineTo(wx + ww, wy + 300); g.stroke();
      g.fillStyle = '#6e3820'; g.fillRect(wx - 24, wy + wh, ww + 48, 22);
      // flower pot on sill
      g.fillStyle = '#d9653b'; g.fillRect(wx + 20, wy + wh - 40, 70, 42);
      g.fillStyle = '#e8413c';
      [[35, -52], [55, -64], [75, -50], [48, -40]].forEach(([dx, dy]) => { g.beginPath(); g.arc(wx + dx, wy + wh + dy, 13, 0, TAU); g.fill(); });

      // menu board (left)
      const mx = 44, my = 330, mw = 262, mh = 250;
      g.fillStyle = '#6e3820'; g.fillRect(mx - 14, my - 14, mw + 28, mh + 28);
      g.fillStyle = '#23402e'; g.fillRect(mx, my, mw, mh);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.font = '900 46px ' + 'Arial Black, Arial, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('MENU', mx + mw / 2, my + 44);
      g.fillRect(mx + 40, my + 76, mw - 80, 4);
      g.font = '800 24px Arial, sans-serif';
      g.textAlign = 'left';
      ['BURGER .... 5', 'DOUBLE .... 7', 'MEGA ...... 9'].forEach((s, i) => g.fillText(s, mx + 24, my + 118 + i * 40));
      g.fillStyle = '#ffcc33'; g.font = '900 23px Arial, sans-serif';
      g.fillText('ALL YOU CAN EAT!', mx + 24, my + 226);

      // papel picado bunting
      const cols = ['#e8413c', '#ffcc33', '#35b0e0', '#7ac943', '#ff7ab8'];
      g.strokeStyle = '#5a2d19'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, 110); g.quadraticCurveTo(540, 170, 1080, 110); g.stroke();
      for (let i = 0; i < 16; i++) {
        const x = 20 + i * 68, y = 110 + Math.sin((x / 1080) * Math.PI) * 30;
        g.fillStyle = cols[i % cols.length];
        g.beginPath(); g.moveTo(x - 26, y); g.lineTo(x + 26, y); g.lineTo(x + 26, y + 44); g.lineTo(x, y + 58); g.lineTo(x - 26, y + 44); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(x, y + 22, 8, 0, TAU); g.fill();
      }

      // azulejo wainscot
      const ty = 640;
      g.fillStyle = '#f7f3ea'; g.fillRect(0, ty, 1080, 320);
      for (let r = 0; r < 6; r++) for (let k = 0; k < 19; k++) {
        const x = k * 60, y = ty + 12 + r * 60;
        g.fillStyle = (r + k) % 2 ? '#2c62b8' : '#3f86d6';
        g.fillRect(x + 4, y + 4, 52, 52);
        g.fillStyle = '#f7f3ea';
        g.beginPath(); g.moveTo(x + 30, y + 10); g.lineTo(x + 50, y + 30); g.lineTo(x + 30, y + 50); g.lineTo(x + 10, y + 30); g.closePath(); g.fill();
        g.fillStyle = '#ffcc33'; g.beginPath(); g.arc(x + 30, y + 30, 7, 0, TAU); g.fill();
      }
      g.fillStyle = '#6e3820'; g.fillRect(0, ty - 6, 1080, 16);
      return c;
    });
  }

  function apartmentBg() {
    return L.cached(ID + '-yvn-bg', () => {
      const c = FILM.makeCanvas(1080, 1000);
      const g = c.getContext('2d');
      const oy = 0; // canvas y 0 = screen y 940
      const wg = g.createLinearGradient(0, 0, 0, 1000);
      wg.addColorStop(0, '#3a3566'); wg.addColorStop(1, '#262248');
      g.fillStyle = wg; g.fillRect(0, 0, 1080, 1000);
      // wallpaper stripes
      g.fillStyle = 'rgba(255,255,255,0.04)';
      for (let i = 0; i < 20; i++) g.fillRect(i * 60, 0, 26, 1000);
      // window with Yerevan night + Ararat
      const wx = 70, wy = oy + 110, ww = 440, wh = 420;
      g.fillStyle = '#1b1424'; g.fillRect(wx - 16, wy - 16, ww + 32, wh + 32);
      g.save();
      g.beginPath(); g.rect(wx, wy, ww, wh); g.clip();
      const sg = g.createLinearGradient(0, wy, 0, wy + wh);
      sg.addColorStop(0, C.nightTop); sg.addColorStop(1, C.nightBottom);
      g.fillStyle = sg; g.fillRect(wx, wy, ww, wh);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = 'rgba(255,255,255,' + (0.4 + h01(ID, 'st', i) * 0.6) + ')';
        g.fillRect(wx + h01(ID, 'sx', i) * ww, wy + h01(ID, 'sy', i) * wh * 0.5, 3, 3);
      }
      g.fillStyle = '#fff7d6'; g.beginPath(); g.arc(wx + 340, wy + 80, 30, 0, TAU); g.fill();
      g.fillStyle = C.nightTop; g.beginPath(); g.arc(wx + 352, wy + 72, 26, 0, TAU); g.fill();
      F.ararat(g, wx - 20, wy + wh - 90, ww + 60, 200, { color: '#4b4f8a', shade: '#3c3f73', snow: '#c8d0f0' });
      // city
      for (let i = 0; i < 16; i++) {
        const bw = 26 + h01(ID, 'bw', i) * 30, bh = 40 + h01(ID, 'bh', i) * 90;
        const bx = wx + i * 30 - 10;
        g.fillStyle = '#1e1a3a'; g.fillRect(bx, wy + wh - bh, bw, bh);
        g.fillStyle = '#ffd36a';
        for (let k = 0; k < 4; k++) if (h01(ID, 'lw', i, k) > 0.45) g.fillRect(bx + 5 + (k % 2) * 12, wy + wh - bh + 10 + Math.floor(k / 2) * 22, 6, 9);
      }
      g.restore();
      g.fillStyle = '#1b1424'; g.fillRect(wx + ww / 2 - 6, wy, 12, wh); g.fillRect(wx, wy + wh / 2 - 6, ww, 12);
      // curtains
      g.fillStyle = '#7a3c5a';
      g.beginPath(); g.moveTo(wx - 40, wy - 40); g.lineTo(wx + 60, wy - 40); g.quadraticCurveTo(wx + 20, wy + 200, wx + 40, wy + wh + 40); g.lineTo(wx - 40, wy + wh + 40); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(wx + ww + 40, wy - 40); g.lineTo(wx + ww - 60, wy - 40); g.quadraticCurveTo(wx + ww - 20, wy + 200, wx + ww - 40, wy + wh + 40); g.lineTo(wx + ww + 40, wy + wh + 40); g.closePath(); g.fill();
      g.fillStyle = '#5a2a44';
      g.fillRect(wx - 60, wy - 50, ww + 120, 16);
      // couch (torn, stuffing)
      const cy = oy + 600;
      g.fillStyle = '#8a3b4e'; rrect(g, 520, cy, 560, 170, 30); g.fill();
      g.fillStyle = '#a24a60'; rrect(g, 540, cy + 60, 520, 110, 24); g.fill();
      g.fillStyle = '#6e2c3d'; g.fillRect(520, cy + 160, 560, 70);
      g.fillStyle = '#fff6ea';
      [[640, cy + 40, 30], [690, cy + 60, 22], [880, cy + 90, 34], [930, cy + 70, 20], [1000, cy + 30, 26]].forEach(([x, y, r]) => {
        g.beginPath(); g.arc(x, y, r, 0, TAU); g.arc(x + r * 0.8, y + 6, r * 0.7, 0, TAU); g.arc(x - r * 0.7, y + 8, r * 0.6, 0, TAU); g.fill();
      });
      // floor
      g.fillStyle = '#4a2f2a'; g.fillRect(0, oy + 800, 1080, 200);
      g.fillStyle = '#3a2420';
      for (let i = 0; i < 10; i++) g.fillRect(i * 120 + (i % 2) * 40, oy + 800, 4, 200);
      g.fillStyle = '#5a3a32'; g.fillRect(0, oy + 796, 1080, 8);
      return c;
    });
  }

  // ---------------------------------------------------------------------------
  // Phone UI chrome for one panel (screen-fixed)
  // ---------------------------------------------------------------------------
  function phoneUI(ctx, p, t, o) {
    // top status: pill with rec dot + timer
    const secs = 7 + Math.floor(t + 1e-6);
    const label = 'VIDEO CALL 00:' + (secs < 10 ? '0' + secs : String(secs));
    const py = o.pillY;
    const tw = F.measure(ctx, label, 32);
    const pw = tw + 96, ph = 62;
    const px = p.x + 40;
    ctx.save();
    rrect(ctx, px, py - ph / 2, pw, ph, ph / 2);
    ctx.fillStyle = 'rgba(15,12,28,0.72)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.stroke();
    const blink = Math.floor(t * 2 + 1e-6) % 2 === 0;
    ctx.fillStyle = blink ? '#ff3b4d' : '#8a1f2a';
    ctx.beginPath(); ctx.arc(px + 36, py, 12, 0, TAU); ctx.fill();
    F.text(ctx, label, px + 60, py + 2, { size: 32, fill: '#ffffff', lw: 0, align: 'left' });
    // location tag (right)
    const lx = p.x + p.w - 40;
    const lw2 = F.measure(ctx, o.place, 30) + 90;
    rrect(ctx, lx - lw2, py - 28, lw2, 56, 28);
    ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.fill();
    // tiny flag
    const fx = lx - lw2 + 18, fy = py - 14;
    if (o.flag === 'ES') {
      ctx.fillStyle = '#c60b1e'; ctx.fillRect(fx, fy, 42, 28);
      ctx.fillStyle = '#ffc400'; ctx.fillRect(fx, fy + 7, 42, 14);
    } else {
      ctx.fillStyle = '#d90012'; ctx.fillRect(fx, fy, 42, 9.4);
      ctx.fillStyle = '#0033a0'; ctx.fillRect(fx, fy + 9.3, 42, 9.4);
      ctx.fillStyle = '#f2a800'; ctx.fillRect(fx, fy + 18.6, 42, 9.4);
    }
    ctx.lineWidth = 2; ctx.strokeStyle = C.line; ctx.strokeRect(fx, fy, 42, 28);
    F.text(ctx, o.place, fx + 54, py + 2, { size: 30, fill: C.line, lw: 0, align: 'left' });
    // call buttons at the bottom
    const by = o.btnY, bx = p.x + p.w / 2;
    [[-170, '#4a4a5e', 'mic'], [0, '#ff3b4d', 'end'], [170, '#4a4a5e', 'cam']].forEach(([dx, col, kind]) => {
      ctx.beginPath(); ctx.arc(bx + dx, by, kind === 'end' ? 50 : 40, 0, TAU);
      ctx.fillStyle = col; ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      if (kind === 'mic') {
        rrect(ctx, bx + dx - 9, by - 22, 18, 30, 9); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + dx, by - 2, 16, 0.1, Math.PI - 0.1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx + dx, by + 14); ctx.lineTo(bx + dx, by + 22); ctx.stroke();
      } else if (kind === 'cam') {
        rrect(ctx, bx + dx - 22, by - 13, 30, 26, 6); ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx + dx + 10, by - 2); ctx.lineTo(bx + dx + 24, by - 12); ctx.lineTo(bx + dx + 24, by + 12); ctx.lineTo(bx + dx + 10, by + 2); ctx.fill();
      } else {
        ctx.save(); ctx.translate(bx + dx, by); ctx.rotate(2.36);
        rrect(ctx, -26, -8, 52, 16, 8); ctx.fill();
        rrect(ctx, -30, -8, 14, 22, 5); ctx.fill(); rrect(ctx, 16, -8, 14, 22, 5); ctx.fill();
        ctx.restore();
      }
    });
    // signal bars + battery (top right corner, decorative)
    ctx.restore();
  }

  function frameBorder(ctx, p) {
    ctx.save();
    panelPath(ctx, p);
    ctx.lineWidth = 10; ctx.strokeStyle = C.line; ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    rrect(ctx, p.x + 8, p.y + 8, p.w - 16, p.h - 16, p.r - 8); ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Panel 1: Spain
  // ---------------------------------------------------------------------------
  function drawSpain(ctx, t, tw) {
    const shocked = t >= B_SHOCK - 1e-6;
    const shockAge = t - B_SHOCK;
    // camera: slow push, snap zoom at the shock, drift toward the burger after the drop
    let z = 1 + 0.03 * (t / 5);
    let fx = 430, fy = 540;
    if (shocked) {
      const k = L.ease.outBack(clamp(shockAge / 0.25));
      z = lerp(z, 1.22, k);
      if (t > B_DROP) { const d = L.ease.inOutSine(clamp((t - B_DROP) / 1.5)); z = lerp(1.22, 1.26, d); fy = lerp(540, 580, d); }
    }
    const sh = F.shakeMany(t, [[B_SHOCK, 0.4, 20]], 3);
    ctx.save();
    panelPath(ctx, P1); ctx.clip();
    ctx.translate(sh[0], sh[1]);
    ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy);
    ctx.drawImage(restaurantBg(), 0, 0);

    // pendant lamps (sway)
    [[200, 0.0], [540, 1.3], [960, 2.1]].forEach(([x, ph], i) => {
      const sw = Math.sin(tw * 2 + ph) * 0.05;
      ctx.save(); ctx.translate(x, 70); ctx.rotate(sw);
      ctx.strokeStyle = C.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 110); ctx.stroke();
      const gl = ctx.createRadialGradient(0, 150, 10, 0, 150, 170);
      gl.addColorStop(0, 'rgba(255,236,160,0.55)'); gl.addColorStop(1, 'rgba(255,236,160,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 150, 170, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-50, 150); ctx.quadraticCurveTo(0, 90, 50, 150); ctx.closePath(); fo(ctx, i === 1 ? '#e8413c' : '#2f8a5a', 4);
      ellipse(ctx, 0, 154, 18, 10); fo(ctx, '#fff6c0', 3);
      ctx.restore();
    });

    // shock overlay: blue-white wash + focus lines behind Hayk
    if (shocked) {
      const a = clamp(shockAge / 0.12);
      ctx.save();
      ctx.globalAlpha = 0.88 * a;
      const g = ctx.createRadialGradient(430, 500, 60, 430, 500, 900);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#bfe0ff'); g.addColorStop(1, '#3d6fd6');
      ctx.fillStyle = g; ctx.fillRect(-200, -200, 1500, 1400);
      ctx.restore();
      F.focusLines(ctx, 430, 500, { inner: 330, count: 90, color: '#1d3f8f', alpha: 0.75 * a, width: 14, seed: 22 });
    } else {
      // happy food glow sparkles
      F.sparkles(ctx, { x: 120, y: 280, w: 760, h: 420, n: 10, seed: 221, t, color: '#fff6b0', size: 22 });
    }

    // Hayk
    const bob = shocked ? 0 : Math.sin(tw * Math.PI * 4) * 6; // chewing bob on beats
    const jump = shocked ? -Math.max(0, 1 - shockAge / 0.2) * 40 : 0;
    const squash = !shocked && ((tw * 2) % 1) < 0.17 ? 1 : 0;
    ctx.save();
    ctx.translate(HK.x, HK.y);
    ctx.scale(1 + squash * 0.03, 1 - squash * 0.03);
    ctx.translate(-HK.x, -HK.y);
    const a = FILM.cast.hayk(ctx, {
      x: HK.x, y: HK.y + bob + jump, s: HK.s, t: tw, pose: shocked ? 'shrug' : 'thumbsUp',
      face: shocked ? 'shocked' : 'chewing', belly: 0.8, crown: true, look: shocked ? [0, 0.2] : [0.3, -0.1],
    });
    ctx.restore();

    // the burger in his mouth / dropping
    const bm = [a.mouth[0], a.mouth[1] + 14];
    const bs = 0.62;
    if (t < B_DROP) {
      const chew = shocked ? 0 : Math.sin(tw * Math.PI * 8) * 4;
      F.burger(ctx, bm[0] + 6, bm[1] + 10 + chew, bs, { bite: 0.38, rot: 0.12 });
    } else {
      const u = t - B_DROP;
      const yy = bm[1] + 10 + 30 * u + 34 * u * u;
      const rot = 0.12 + u * 0.9;
      // little slow-motion drop ticks beside the burger
      ctx.save();
      ctx.strokeStyle = C.line; ctx.lineWidth = 5; ctx.lineCap = 'round';
      [[-95, -10], [-110, 30], [105, -5], [118, 34]].forEach(([dx, dy]) => {
        ctx.beginPath(); ctx.moveTo(bm[0] + dx, yy + dy - 40); ctx.lineTo(bm[0] + dx, yy + dy); ctx.stroke();
      });
      ctx.restore();
      F.burger(ctx, bm[0] + 6, yy, bs, { bite: 0.38, rot });
      // floating sesame seeds (slow motion begins)
      for (let i = 0; i < 6; i++) {
        const sx = bm[0] - 70 + h01(ID, 'ss', i) * 150, sy = bm[1] + 20 + h01(ID, 'sy', i) * 60 + u * 40;
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(u * 2 + i);
        ellipse(ctx, 0, 0, 7, 4); fo(ctx, C.sesame, 2);
        ctx.restore();
      }
    }

    // table + food in front
    ctx.save();
    ctx.fillStyle = '#9b5a32'; ctx.fillRect(-100, 830, 1300, 30);
    ctx.fillStyle = '#7a4424'; ctx.fillRect(-100, 860, 1300, 200);
    ctx.lineWidth = 5; ctx.strokeStyle = C.line;
    ctx.beginPath(); ctx.moveTo(-100, 830); ctx.lineTo(1200, 830); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(-100, 834, 1300, 8);
    ctx.restore();
    // tray + wrappers + fries + drink
    rrect(ctx, 60, 800, 330, 44, 10); fo(ctx, '#e8413c', 5);
    F.fries(ctx, 150, 820, 0.9, {});
    F.drink(ctx, 870, 836, 1.0, {});
    // crumpled wrappers pile (gag)
    [[640, 816, 30], [700, 822, 26], [610, 796, 24], [760, 822, 24], [990, 826, 26], [1030, 812, 20]].forEach(([x, y, r], i) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(i);
      ctx.beginPath();
      for (let k = 0; k < 9; k++) { const an = (k / 9) * TAU, rr = r * (0.75 + h01(ID, 'wr', i, k) * 0.4); ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
      ctx.closePath(); fo(ctx, i % 2 ? '#ffe7a8' : '#fff4d6', 4);
      ctx.restore();
    });
    // stack of empty boxes
    for (let i = 0; i < 4; i++) { rrect(ctx, 250 + (i % 2) * 6, 806 - i * 26, 100, 26, 6); fo(ctx, i % 2 ? '#ffc72c' : '#f2862b', 4); }

    // effects over Hayk
    if (!shocked) {
      F.notes(ctx, a.head[0] + 140, a.head[1] - 60, t, { n: 3, seed: 5, color: '#ffffff', size: 54 });
      F.crumbs(ctx, bm[0] + 40, bm[1], ((t + 10) % 0.5), { n: 6, seed: Math.floor(t * 2), spread: 220 });
    } else {
      F.sweat(ctx, a.head[0] + 150, a.head[1] - 40, 1.4, {});
      F.sweat(ctx, a.head[0] - 160, a.head[1] - 10, 1.0, { flip: true });
      // shock marks: three lines above head
      ctx.save();
      ctx.strokeStyle = C.line; ctx.lineWidth = 9; ctx.lineCap = 'round';
      const hy = a.top[1] - 70 - Math.max(0, 1 - shockAge / 0.2) * 30;
      [[-70, -0.5], [0, 0], [70, 0.5]].forEach(([dx, r]) => {
        ctx.beginPath(); ctx.moveTo(a.head[0] + dx, hy); ctx.lineTo(a.head[0] + dx * 1.5 + r * 0, hy - 70); ctx.stroke();
      });
      ctx.restore();
      if (shockAge < 2 * FR * 2) F.flash(ctx, 0.7, '#ffffff');
    }
    ctx.restore();
    return a;
  }

  // ---------------------------------------------------------------------------
  // Panel 2: Yerevan
  // ---------------------------------------------------------------------------
  function drawYerevan(ctx, t, tw) {
    const z = 1 + 0.04 * (t / 5);
    const fx = 400, fy = 1380;
    const sh = F.shakeMany(t, [[B_BUBBLE, 0.3, 12]], 9);
    ctx.save();
    panelPath(ctx, P2); ctx.clip();
    ctx.translate(sh[0], sh[1]);
    ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy);
    ctx.drawImage(apartmentBg(), 0, 940);
    // framed photo of Hayk on the wall, slightly crooked
    ctx.save();
    ctx.translate(930, 1170); ctx.rotate(0.07);
    rrect(ctx, -80, -100, 160, 190, 8); fo(ctx, '#caa46a', 5);
    rrect(ctx, -64, -84, 128, 158, 4); fo(ctx, '#bfe6ff', 3);
    ctx.save(); rrect(ctx, -64, -84, 128, 158, 4); ctx.clip();
    FILM.cast.hayk(ctx, { x: 0, y: 150, s: 0.36, t: 0, pose: 'peace', face: 'happy', blink: false });
    ctx.restore();
    F.heart(ctx, 60, -96, 0.5, '#ff4f86', 3);
    ctx.restore();
    // gloom lines above the room
    F.gloom(ctx, 560, 950, 480, 300, { color: 'rgba(143,216,255,0.55)', count: 8, seed: 31 });

    // Grant (background, exhausted, holding the phone out toward us)
    const gb = Math.sin(tw * Math.PI * 2) * 4;
    const g = FILM.cast.grant(ctx, { x: GR.x, y: GR.y + gb, s: GR.s, t: tw, pose: 'phone', hold: 'phone', face: 'exhausted', flip: true });
    // bandage on his forehead + arm
    ctx.save();
    ctx.translate(g.head[0] + 30, g.head[1] - 60); ctx.rotate(0.4);
    rrect(ctx, -34, -12, 68, 24, 8); fo(ctx, '#fff1dc', 4);
    ctx.strokeStyle = '#d8b88a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-8, 8); ctx.moveTo(8, -8); ctx.lineTo(8, 8); ctx.stroke();
    ctx.restore();
    F.sweat(ctx, g.head[0] - 90, g.head[1] - 40, 1.0, { flip: true });

    // Goofy pressed against the screen
    const push = Math.sin(tw * Math.PI * 2) * 0.03;
    const gs = GF.s * (1 + push);
    const d = FILM.cast.goofy(ctx, { x: GF.x, y: GF.y, s: gs, t: tw, pose: 'sit', face: 'cry' });
    ctx.restore();

    // glass smudge where Goofy's nose is pressed (screen-fixed on the panel)
    ctx.save();
    panelPath(ctx, P2); ctx.clip();
    const nx = d.nose[0], ny = d.nose[1];
    const fog = 0.5 + 0.3 * Math.sin(t * Math.PI * 2);
    const gg = ctx.createRadialGradient(nx, ny, 10, nx, ny, 170);
    gg.addColorStop(0, 'rgba(235,245,255,' + (0.5 * fog) + ')'); gg.addColorStop(1, 'rgba(235,245,255,0)');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(nx, ny, 170, 0, TAU); ctx.fill();
    // nose print smears
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff';
    [[-40, -30, 14], [30, 20, 10], [-10, 40, 8]].forEach(([dx, dy, r]) => { ellipse(ctx, nx + dx, ny + dy, r * 2.4, r); ctx.fill(); });
    // glass reflection streaks across the panel
    ctx.globalAlpha = 0.12;
    ctx.beginPath(); ctx.moveTo(620, 944); ctx.lineTo(760, 944); ctx.lineTo(380, 1904); ctx.lineTo(240, 1904); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(800, 944); ctx.lineTo(840, 944); ctx.lineTo(460, 1904); ctx.lineTo(420, 1904); ctx.closePath(); ctx.fill();
    ctx.restore();
    return d;
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      // frame background (between the two call windows)
      ctx.fillStyle = '#120d1e'; ctx.fillRect(0, 0, 1080, 1920);
      ctx.save();
      ctx.globalAlpha = 0.5;
      F.speedLines(ctx, { angle: 0, count: 14, color: '#3b1d6e', t, speed: 600, y: 900, h: 70, len: 300, width: 8, seed: 5 });
      ctx.restore();

      const hk = drawSpain(ctx, t, tw);
      const gf = drawYerevan(ctx, t, tw);

      frameBorder(ctx, P1);
      frameBorder(ctx, P2);
      phoneUI(ctx, P1, t, { pillY: 262, btnY: 856, place: 'SPAIN', flag: 'ES' });
      phoneUI(ctx, P2, t, { pillY: 1010, btnY: 1832, place: 'YEREVAN', flag: 'AM' });

      // bubbles (screen-fixed)
      F.bubble(ctx, 'HAYK... COME BACK...', 660, 1118, {
        size: 54, maxW: 560, t, t0: B_BUBBLE, tail: [gf.mouth ? gf.mouth[0] + 40 : 470, (gf.mouth ? gf.mouth[1] : 1400) - 60], fill: '#e6f6ff',
      });
      if (t >= B_SHOCK - 1e-6) {
        const sk = F.shake(t, B_SHOCK, 0.5, 8, 4);
        F.bubble(ctx, 'GOOFY?!', 770 + sk[0], 440 + sk[1], { size: 68, shout: true, t, t0: B_SHOCK, tail: [600, 520], fill: '#ffffff', shake: 6 });
      }
    },
  });
})();
