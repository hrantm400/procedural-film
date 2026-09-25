/*
 * Shot 13 'day-counter' : "Days pass" (T 54.0 - 59.0, 5 s).
 * A tear-off calendar montage in Hayk's Spanish hotel room. Pages fly off on each bar
 * (local 0.0, 2.0, 4.0) revealing DAY 3 / DAY 12 / DAY 24; the chalk tally board rolls
 * BURGERS EATEN 17 -> 58 -> 121 while INVESTORS MET stays 0. Hayk (stand, happy chewing,
 * burger in hand) swells belly 0.4 -> 0.6 -> 0.8. A red "0" stamp slams on the INVESTORS line
 * at local 4.5 with a THUD.
 *
 * Layers, back to front:
 *   1. wall (cached): striped wallpaper, wainscot, terracotta floor
 *   2. arched window: sky cycling day/night fast (sun + moon arcs), rooftops, bell tower, palm
 *   3. calendar: backing board, rings, current page, next page peeking, flying torn page
 *   4. chalk tally board with rolling counters and tally marks
 *   5. growing pile of burger boxes, wrappers, cups on the floor
 *   6. Hayk
 *   7. effects: whoosh speed lines, FWIP sfx, POMF sfx, stamp, THUD, shock ring, sparkles
 */
(function () {
  'use strict';

  const ID = 'day-counter';
  const FR = 1 / 24;
  const TAU = Math.PI * 2;

  // beats (local seconds; global T in comments)
  const FLIPS = [0, 2, 4]; // T 54.0, 56.0, 58.0: page whoosh
  const T_STAMP = 4.5; // T 58.5: stamp THUD

  const DAYS_OLD = [1, 3, 12]; // the page that flies away at each flip
  const DAYS = [3, 12, 24];
  const BURGERS = [17, 58, 121];
  const BURGERS_FROM = [5, 17, 58];
  const BELLY = [0.4, 0.6, 0.8];
  const BELLY_FROM = [0.36, 0.4, 0.6];
  const PILE_N = [7, 15, 26];

  // calendar geometry
  const CAL = { x: 86, y: 262, w: 470, h: 690 };
  // tally board geometry
  const BRD = { x: 60, y: 996, w: 600, h: 372 };
  // window geometry
  const WIN = { x: 648, y: 236, w: 360, h: 520 };

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;

  function pageIndex(t) {
    return t < FLIPS[1] - 1e-6 ? 0 : t < FLIPS[2] - 1e-6 ? 1 : 2;
  }

  // ---------------------------------------------------------------------------
  // 1. static room (cached)
  // ---------------------------------------------------------------------------
  function room(F) {
    return FILM.lib.cached(ID + '-room', () => {
      const c = FILM.makeCanvas(1080, 1920);
      const g = c.getContext('2d');
      const P = F.pal;
      // wallpaper
      g.fillStyle = '#fbe5c4';
      g.fillRect(0, 0, 1080, 1520);
      g.fillStyle = '#f4d6ae';
      for (let x = 0; x < 1080; x += 72) g.fillRect(x, 0, 30, 1520);
      // tiny damask dots between stripes
      g.fillStyle = 'rgba(214,150,92,0.35)';
      for (let y = 30; y < 1360; y += 64) {
        for (let x = 51; x < 1080; x += 72) {
          g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 6, y); g.lineTo(x, y + 9); g.lineTo(x - 6, y); g.closePath(); g.fill();
        }
      }
      // ceiling shadow
      const sh = g.createLinearGradient(0, 0, 0, 260);
      sh.addColorStop(0, 'rgba(120,60,30,0.28)');
      sh.addColorStop(1, 'rgba(120,60,30,0)');
      g.fillStyle = sh; g.fillRect(0, 0, 1080, 260);
      // wainscot
      g.fillStyle = '#c9814a';
      g.fillRect(0, 1380, 1080, 140);
      g.fillStyle = '#b06b38';
      g.fillRect(0, 1380, 1080, 14);
      g.fillStyle = '#9a5a2e';
      g.fillRect(0, 1500, 1080, 20);
      g.strokeStyle = 'rgba(90,45,20,0.55)'; g.lineWidth = 4;
      for (let x = 30; x < 1080; x += 180) { g.strokeRect(x, 1408, 150, 80); }
      // floor: terracotta tiles in simple perspective
      const fy = 1520;
      const fg = g.createLinearGradient(0, fy, 0, 1920);
      fg.addColorStop(0, '#c96b42'); fg.addColorStop(1, '#e08756');
      g.fillStyle = fg; g.fillRect(0, fy, 1080, 400);
      g.strokeStyle = 'rgba(110,45,20,0.45)'; g.lineWidth = 4;
      const rows = [1520, 1560, 1612, 1680, 1766, 1872, 2000];
      rows.forEach((y) => { g.beginPath(); g.moveTo(0, y); g.lineTo(1080, y); g.stroke(); });
      for (let i = -8; i <= 8; i++) {
        const x0 = 540 + i * 110, x1 = 540 + i * 260;
        g.beginPath(); g.moveTo(x0, fy); g.lineTo(x1, 1920); g.stroke();
      }
      // floor sheen
      g.fillStyle = 'rgba(255,220,180,0.18)';
      g.beginPath(); g.ellipse(700, 1720, 420, 90, 0, 0, TAU); g.fill();
      // window recess (deep sandstone reveal) and sill
      const w = WIN;
      g.fillStyle = '#e2b98c';
      archPath(g, w.x - 26, w.y - 26, w.w + 52, w.h + 40);
      g.fill();
      g.strokeStyle = P.line; g.lineWidth = 5;
      archPath(g, w.x - 26, w.y - 26, w.w + 52, w.h + 40);
      g.stroke();
      // sill
      g.fillStyle = '#f3e3cc';
      g.fillRect(w.x - 44, w.y + w.h + 10, w.w + 88, 30);
      g.strokeRect(w.x - 44, w.y + w.h + 10, w.w + 88, 30);
      g.fillStyle = 'rgba(120,70,40,0.3)';
      g.fillRect(w.x - 40, w.y + w.h + 40, w.w + 80, 14);
      // wall lamp between calendar and window
      g.fillStyle = '#b8862f';
      g.fillRect(596, 560, 10, 70);
      g.beginPath(); g.moveTo(572, 560); g.lineTo(630, 560); g.lineTo(614, 520); g.lineTo(588, 520); g.closePath();
      g.fillStyle = '#ffe9b0'; g.fill(); g.strokeStyle = P.line; g.lineWidth = 4; g.stroke();
      // picture frame: a framed burger "photo" (a joke) under the lamp
      g.fillStyle = '#7a4a26';
      g.fillRect(566, 660, 70, 86);
      g.fillStyle = '#fff4e0'; g.fillRect(574, 668, 54, 70);
      g.strokeStyle = P.line; g.lineWidth = 3; g.strokeRect(566, 660, 70, 86);
      g.save(); g.translate(601, 708); g.scale(0.2, 0.2); g.translate(-601, -708);
      F.burger(g, 601, 708, 1);
      g.restore();
      return c;
    });
  }

  function archPath(g, x, y, w, h) {
    const r = w / 2;
    g.beginPath();
    g.moveTo(x, y + h);
    g.lineTo(x, y + r);
    g.arc(x + r, y + r, r, Math.PI, 0);
    g.lineTo(x + w, y + h);
    g.closePath();
  }

  // ---------------------------------------------------------------------------
  // 2. window with the fast day/night cycle
  // ---------------------------------------------------------------------------
  const SKY_KEYS = [
    // [phase, top, bottom]
    [0.0, '#2a2458', '#ff9a6a'],
    [0.18, '#4fb3ff', '#ffe0a8'],
    [0.5, '#3aa6ff', '#bfe6ff'],
    [0.72, '#ff7a5c', '#ffcf7a'],
    [0.84, '#1b1a4a', '#5a3a7a'],
    [1.0, '#2a2458', '#ff9a6a'],
  ];
  function hexMix(a, b, u) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, u));
    const gg = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, u));
    const bl = Math.round(lerp(pa & 255, pb & 255, u));
    return `rgb(${r},${gg},${bl})`;
  }
  function skyAt(ph) {
    for (let i = 0; i < SKY_KEYS.length - 1; i++) {
      const a = SKY_KEYS[i], b = SKY_KEYS[i + 1];
      if (ph >= a[0] && ph <= b[0]) {
        const u = (ph - a[0]) / (b[0] - a[0]);
        return [hexMix(a[1], b[1], u), hexMix(a[2], b[2], u)];
      }
    }
    return [SKY_KEYS[0][1], SKY_KEYS[0][2]];
  }

  function drawWindow(ctx, F, t) {
    const w = WIN, P = F.pal;
    const tw = FILM.lib.onTwos(t);
    const ph = ((tw * 0.9 + 0.1) % 1 + 1) % 1; // a day every ~1.1 s
    const [top, bot] = skyAt(ph);
    ctx.save();
    archPath(ctx, w.x, w.y, w.w, w.h);
    ctx.clip();
    F.sky(ctx, top, bot, { x: w.x, y: w.y, w: w.w, h: w.h });
    const night = ph > 0.8 || ph < 0.06 ? 1 : 0;
    if (night) F.stars(ctx, { n: 26, seed: 413, x: w.x, y: w.y, w: w.w, h: w.h * 0.6 });
    // sun arc during the day, moon arc during the night
    const cx = w.x + w.w / 2, cy = w.y + w.h * 0.78;
    if (ph > 0.04 && ph < 0.8) {
      const u = (ph - 0.04) / 0.76;
      const a = Math.PI + u * Math.PI;
      const sx = cx + Math.cos(a) * w.w * 0.46, sy = cy + Math.sin(a) * w.h * 0.62;
      const gl = ctx.createRadialGradient(sx, sy, 10, sx, sy, 90);
      gl.addColorStop(0, 'rgba(255,240,170,0.9)'); gl.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(sx, sy, 90, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(sx, sy, 34, 0, TAU); ctx.fill();
    } else {
      const u = ph > 0.8 ? (ph - 0.8) / 0.24 : (ph + 0.2) / 0.24;
      const a = Math.PI + u * Math.PI;
      const mx = cx + Math.cos(a) * w.w * 0.4, my = cy + Math.sin(a) * w.h * 0.55;
      ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(mx, my, 28, 0, TAU); ctx.fill();
      ctx.fillStyle = top; ctx.beginPath(); ctx.arc(mx + 12, my - 6, 24, 0, TAU); ctx.fill();
    }
    // clouds zipping by (time-lapse)
    ctx.fillStyle = night ? 'rgba(120,110,170,0.6)' : 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 3; i++) {
      const span = w.w + 260;
      const x = w.x - 130 + (((tw * (380 + i * 90) + i * 211) % span) + span) % span;
      const y = w.y + 120 + i * 70;
      ctx.beginPath();
      ctx.ellipse(x, y, 60, 20, 0, 0, TAU); ctx.ellipse(x + 34, y - 12, 36, 20, 0, 0, TAU); ctx.ellipse(x - 30, y - 6, 30, 16, 0, 0, TAU);
      ctx.fill();
    }
    // far rooftops and a bell tower
    const dark = night ? 0.55 : 0;
    const roofY = w.y + w.h - 150;
    ctx.fillStyle = '#e9c9a0';
    ctx.fillRect(w.x + 190, roofY - 150, 56, 170);
    ctx.beginPath(); ctx.moveTo(w.x + 180, roofY - 150); ctx.lineTo(w.x + 218, roofY - 210); ctx.lineTo(w.x + 256, roofY - 150); ctx.closePath();
    ctx.fillStyle = '#d9653b'; ctx.fill();
    ctx.fillStyle = '#6b4a3a'; ctx.beginPath(); ctx.arc(w.x + 218, roofY - 110, 12, Math.PI, 0); ctx.fillRect(w.x + 206, roofY - 110, 24, 18); ctx.fill();
    const blocks = [[0, 90, 110], [96, 70, 80], [150, 130, 60], [260, 60, 96], [300, 120, 70]];
    blocks.forEach(([bx, bw, bh], i) => {
      const x = w.x + bx, y = w.y + w.h - bh - 40;
      ctx.fillStyle = i % 2 ? '#fff0da' : '#f6dcb6';
      ctx.fillRect(x, y, bw, bh + 40);
      ctx.fillStyle = '#d9653b';
      ctx.beginPath(); ctx.moveTo(x - 8, y + 4); ctx.lineTo(x + bw / 2, y - 22); ctx.lineTo(x + bw + 8, y + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = night ? '#ffd86a' : '#7aa7c7';
      for (let k = 0; k < Math.floor(bw / 30); k++) ctx.fillRect(x + 10 + k * 30, y + 24, 14, 20);
    });
    // palm
    ctx.strokeStyle = '#7a5236'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(w.x + w.w - 60, w.y + w.h); ctx.quadraticCurveTo(w.x + w.w - 40, w.y + w.h - 150, w.x + w.w - 80, w.y + w.h - 260); ctx.stroke();
    ctx.fillStyle = '#4f9a4a';
    const px = w.x + w.w - 80, py = w.y + w.h - 262;
    const sway = Math.sin(tw * 6) * 0.08;
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k - 2.5) * 0.55 + sway;
      ctx.save(); ctx.translate(px, py); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(62, 0, 66, 15, 0.25, 0, TAU); ctx.fill();
      ctx.restore();
    }
    if (dark) { ctx.fillStyle = `rgba(20,16,60,${dark * 0.5})`; ctx.fillRect(w.x, w.y, w.w, w.h); }
    // glass glare
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath(); ctx.moveTo(w.x + 30, w.y + w.h); ctx.lineTo(w.x + 120, w.y + 60); ctx.lineTo(w.x + 170, w.y + 60); ctx.lineTo(w.x + 80, w.y + w.h); ctx.closePath(); ctx.fill();
    ctx.restore();
    // mullions
    ctx.save();
    ctx.strokeStyle = '#fff4e0'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(w.x + w.w / 2, w.y); ctx.lineTo(w.x + w.w / 2, w.y + w.h); ctx.moveTo(w.x, w.y + w.h * 0.55); ctx.lineTo(w.x + w.w, w.y + w.h * 0.55); ctx.stroke();
    ctx.strokeStyle = P.line; ctx.lineWidth = 5;
    archPath(ctx, w.x, w.y, w.w, w.h); ctx.stroke();
    // curtains
    const cw = Math.sin(tw * 3) * 6;
    [[w.x - 40, 1], [w.x + w.w + 40, -1]].forEach(([x0, dir]) => {
      ctx.beginPath();
      ctx.moveTo(x0 - dir * 20, w.y - 60);
      ctx.lineTo(x0 + dir * 90, w.y - 60);
      ctx.quadraticCurveTo(x0 + dir * (40 + cw), w.y + 260, x0 + dir * 70, w.y + w.h + 40);
      ctx.lineTo(x0 - dir * 24, w.y + w.h + 40);
      ctx.closePath();
      F.fo(ctx, '#d94a3a', 4);
      ctx.strokeStyle = 'rgba(120,20,20,0.45)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x0 + dir * 20, w.y - 40); ctx.quadraticCurveTo(x0 + dir * (14 + cw), w.y + 260, x0 + dir * 22, w.y + w.h + 30); ctx.stroke();
    });
    // curtain rod
    ctx.fillStyle = '#b8862f';
    F.rrect(ctx, w.x - 90, w.y - 74, w.w + 180, 16, 8); F.fo(ctx, '#c9973a', 4);
    ctx.restore();
    // cactus on the sill
    ctx.save();
    const sx = w.x + 60, sy = w.y + w.h + 10;
    F.rrect(ctx, sx - 26, sy - 40, 52, 42, 6); F.fo(ctx, '#d9653b', 4);
    F.rrect(ctx, sx - 14, sy - 110, 28, 76, 14); F.fo(ctx, '#4f9a4a', 4);
    F.rrect(ctx, sx + 6, sy - 90, 26, 16, 8); F.fo(ctx, '#4f9a4a', 4);
    ctx.fillStyle = '#ff7ab0'; ctx.beginPath(); ctx.arc(sx, sy - 112, 9, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // 3. calendar
  // ---------------------------------------------------------------------------
  function pageFace(ctx, F, x, y, w, h, day) {
    // paper
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(x, y, w, h);
    // red header band
    ctx.fillStyle = '#e8413c';
    ctx.fillRect(x, y, w, 118);
    F.text(ctx, 'MY MONTH IN SPAIN', x + w / 2, y + 62, { size: 34, fill: '#ffffff', lw: 0 });
    // body text
    F.text(ctx, 'DAY', x + w / 2, y + 210, { size: 92, fill: '#1b1424', lw: 0 });
    F.text(ctx, String(day), x + w / 2, y + 430, { size: 290, fill: '#e8413c', lw: 12, stroke: '#1b1424', letter: -8 });
    // little week strip at the bottom
    ctx.fillStyle = '#f1dcc0';
    ctx.fillRect(x + 30, y + h - 96, w - 60, 56);
    for (let i = 0; i < 7; i++) {
      const cx = x + 30 + (i + 0.5) * ((w - 60) / 7);
      ctx.fillStyle = i === (day % 7) ? '#e8413c' : '#c9a57a';
      ctx.beginPath(); ctx.arc(cx, y + h - 68, 12, 0, TAU); ctx.fill();
    }
    // outline
    ctx.strokeStyle = '#1b1424'; ctx.lineWidth = 5;
    ctx.strokeRect(x, y, w, h);
  }

  function drawCalendar(ctx, F, t) {
    const c = CAL, P = F.pal;
    const k = pageIndex(t);
    ctx.save();
    // shadow + backing board
    ctx.fillStyle = 'rgba(90,40,20,0.25)';
    ctx.fillRect(c.x + 18, c.y + 22, c.w, c.h + 12);
    F.rrect(ctx, c.x - 16, c.y - 40, c.w + 32, c.h + 56, 14); F.fo(ctx, '#7a3a26', 5);
    // stacked page edges below (thickness shrinks as days pass)
    const stack = [6, 4, 2][k];
    for (let i = stack; i > 0; i--) {
      ctx.fillStyle = i % 2 ? '#efe2cc' : '#fffaf0';
      ctx.fillRect(c.x + 3, c.y + c.h - 4 + i * 3, c.w - 6, 4);
    }
    // current page
    pageFace(ctx, F, c.x, c.y, c.w, c.h, DAYS[k]);
    // torn stubs under the rings
    ctx.fillStyle = '#fffaf0';
    for (let i = 0; i < 9; i++) {
      const x = c.x + 12 + i * ((c.w - 24) / 9);
      ctx.beginPath(); ctx.moveTo(x, c.y - 4); ctx.lineTo(x + 40, c.y - 4); ctx.lineTo(x + 30, c.y + 6); ctx.lineTo(x + 16, c.y + 2); ctx.lineTo(x + 6, c.y + 8); ctx.closePath(); ctx.fill();
    }
    // binder rings
    for (let i = 0; i < 7; i++) {
      const rx = c.x + 50 + i * ((c.w - 100) / 6);
      ctx.strokeStyle = '#1b1424'; ctx.lineWidth = 13;
      ctx.beginPath(); ctx.arc(rx, c.y - 6, 17, Math.PI * 0.9, Math.PI * 2.1); ctx.stroke();
      ctx.strokeStyle = '#c9ccd8'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(rx, c.y - 6, 17, Math.PI * 0.9, Math.PI * 2.1); ctx.stroke();
    }
    // nail + string
    ctx.strokeStyle = '#6b4228'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(c.x + 30, c.y - 40); ctx.lineTo(c.x + c.w / 2, c.y - 92); ctx.lineTo(c.x + c.w - 30, c.y - 40); ctx.stroke();
    ctx.fillStyle = '#8a8fa8'; ctx.beginPath(); ctx.arc(c.x + c.w / 2, c.y - 92, 9, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /** the torn page flying away after flip i (age in s) */
  function drawFlyingPage(ctx, F, i, age) {
    const dur = 0.75;
    if (age < 0 || age > dur) return;
    const c = CAL;
    const u = age / dur;
    const e = u * u * 0.6 + u * 0.4;
    const px = c.x, py = c.y; // pivot top-left
    const dx = -e * 900 - u * 60, dy = -e * 520 + Math.sin(u * Math.PI) * -80;
    const rot = -0.12 - e * 2.3;
    // motion trail ghosts
    ctx.save();
    for (let g = 2; g >= 1; g--) {
      const ug = Math.max(0, u - g * 0.06), eg = ug * ug * 0.6 + ug * 0.4;
      ctx.save();
      ctx.globalAlpha = 0.18 / g;
      ctx.translate(px - eg * 900 - ug * 60, py - eg * 520 + Math.sin(ug * Math.PI) * -80);
      ctx.rotate(-0.12 - eg * 2.3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.w, c.h);
      ctx.restore();
    }
    ctx.translate(px + dx, py + dy);
    ctx.rotate(rot);
    // page curls: squash in x as it turns
    ctx.scale(1 - 0.35 * Math.sin(u * Math.PI), 1);
    ctx.fillStyle = 'rgba(60,20,10,0.25)';
    ctx.fillRect(14, 18, c.w, c.h);
    pageFace(ctx, F, 0, 0, c.w, c.h, DAYS_OLD[i]);
    // ragged torn top edge
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath();
    for (let k = 0; k <= 12; k++) ctx.lineTo(k * (c.w / 12), (k % 2 ? -12 : -2));
    ctx.lineTo(c.w, 4); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // 4. tally board
  // ---------------------------------------------------------------------------
  function rollNumber(ctx, F, v, x, y, size, color, boxW, boxH) {
    const n = Math.floor(v + 1e-6), fr = v - n;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - boxW, y - boxH / 2, boxW, boxH); ctx.clip();
    const lh = boxH * 0.95;
    F.text(ctx, String(n), x - 10, y - fr * lh, { size, fill: color, lw: 0, align: 'right' });
    if (fr > 0.02) F.text(ctx, String(n + 1), x - 10, y + (1 - fr) * lh, { size, fill: color, lw: 0, align: 'right' });
    ctx.restore();
  }

  function drawBoard(ctx, F, t) {
    const b = BRD;
    const k = pageIndex(t);
    ctx.save();
    // frame + chalkboard
    ctx.fillStyle = 'rgba(90,40,20,0.25)';
    ctx.fillRect(b.x + 16, b.y + 18, b.w, b.h);
    F.rrect(ctx, b.x, b.y, b.w, b.h, 16); F.fo(ctx, '#9a6436', 5);
    F.rrect(ctx, b.x + 20, b.y + 20, b.w - 40, b.h - 40, 8); F.fo(ctx, '#23493b', 4);
    // chalk smudges
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.ellipse(b.x + 200, b.y + 120, 150, 40, -0.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(b.x + 420, b.y + 270, 130, 36, 0.15, 0, TAU); ctx.fill();
    // chalk ledge
    ctx.fillStyle = '#7a4a26'; ctx.fillRect(b.x + 30, b.y + b.h - 18, b.w - 60, 16);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(b.x + 90, b.y + b.h - 26, 40, 10);
    ctx.fillStyle = '#ffd3e0'; ctx.fillRect(b.x + 150, b.y + b.h - 26, 30, 10);
    // row 1: investors
    F.text(ctx, 'INVESTORS MET:', b.x + 50, b.y + 78, { size: 42, fill: '#f4f4ec', lw: 0, align: 'left' });
    F.text(ctx, '0', b.x + b.w - 70, b.y + 78, { size: 62, fill: '#ff8a8a', lw: 0, align: 'center' });
    // divider chalk line
    ctx.strokeStyle = 'rgba(244,244,236,0.55)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(b.x + 46, b.y + 128); ctx.lineTo(b.x + b.w - 46, b.y + 124); ctx.stroke();
    // row 2: burgers
    F.text(ctx, 'BURGERS EATEN:', b.x + 50, b.y + 176, { size: 42, fill: '#f4f4ec', lw: 0, align: 'left' });
    const tf = FLIPS[k];
    const u = L_outCubic(clamp((t - tf + FR) / 0.8));
    const v = lerp(BURGERS_FROM[k], BURGERS[k], u);
    rollNumber(ctx, F, v, b.x + b.w - 34, b.y + 272, 118, '#ffe14a', 290, 128);
    // tally marks on the left (one group of five per ~8 burgers shown)
    const groups = Math.min(7, Math.floor(v / 10) + 1);
    ctx.strokeStyle = 'rgba(244,244,236,0.85)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (let gI = 0; gI < groups; gI++) {
      const gx = b.x + 48 + (gI % 4) * 62, gy = b.y + 228 + Math.floor(gI / 4) * 70;
      ctx.beginPath();
      for (let m = 0; m < 4; m++) { ctx.moveTo(gx + m * 11, gy); ctx.lineTo(gx + m * 11 + 2, gy + 48); }
      ctx.moveTo(gx - 6, gy + 34); ctx.lineTo(gx + 44, gy + 12);
      ctx.stroke();
    }
    ctx.restore();
  }
  const L_outCubic = (p) => 1 - Math.pow(1 - p, 3);

  // ---------------------------------------------------------------------------
  // 5. pile of fast-food trash on the floor
  // ---------------------------------------------------------------------------
  function drawPile(ctx, F, t) {
    const k = pageIndex(t);
    if (t - FLIPS[k] > 0.45) {
      const c = FILM.lib.cached(ID + '-pile-' + k, () => {
        const cv = FILM.makeCanvas(1080, 1920);
        drawPileLive(cv.getContext('2d'), F, FLIPS[k] + 1);
        return cv;
      });
      ctx.drawImage(c, 0, 0);
      return;
    }
    drawPileLive(ctx, F, t);
  }
  function drawPileLive(ctx, F, t) {
    const k = pageIndex(t);
    const P = F.pal;
    const h01 = F.h01;
    const n = PILE_N[k];
    const items = [];
    for (let i = 0; i < n; i++) {
      const batch = i < PILE_N[0] ? 0 : i < PILE_N[1] ? 1 : 2;
      const x = 90 + h01(ID, 'px', i) * 540;
      const y = 1640 + h01(ID, 'py', i) * 200 - batch * 26;
      items.push({ i, x, y, kind: Math.floor(h01(ID, 'pk', i) * 4), rot: (h01(ID, 'pr', i) - 0.5) * 1.2, batch });
    }
    items.sort((a, b) => a.y - b.y);
    items.forEach((it) => {
      const born = FLIPS[it.batch];
      const sc = it.batch === k ? F.popIn(t + FR, born + 0.08 + (it.i % 5) * 0.04) : 1;
      if (sc <= 0) return;
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.rot * 0.5);
      ctx.scale(sc, sc);
      if (it.kind === 0) {
        // crumpled wrapper ball
        ctx.beginPath(); ctx.arc(0, -22, 26, 0, TAU);
        F.fo(ctx, it.i % 2 ? '#fff3d6' : '#ffd9a0', 4);
        ctx.strokeStyle = 'rgba(120,80,40,0.6)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-14, -30); ctx.lineTo(0, -20); ctx.lineTo(12, -34); ctx.moveTo(-6, -10); ctx.lineTo(8, -16); ctx.stroke();
      } else if (it.kind === 1) {
        F.fries(ctx, 0, 0, 0.42, {});
      } else if (it.kind === 2) {
        ctx.rotate(-it.rot * 0.5 + (it.rot > 0 ? 1.4 : -1.4));
        F.drink(ctx, 0, 0, 0.36, {});
      } else {
        // open clamshell burger box
        F.rrect(ctx, -58, -30, 116, 30, 8); F.fo(ctx, '#f4f0e6', 4);
        ctx.beginPath(); ctx.moveTo(-58, -30); ctx.lineTo(-48, -78); ctx.lineTo(52, -78); ctx.lineTo(58, -30); ctx.closePath();
        F.fo(ctx, '#ffffff', 4);
        ctx.fillStyle = P.kongOrange; ctx.fillRect(-30, -60, 60, 12);
      }
      ctx.restore();
    });
  }

  // ---------------------------------------------------------------------------
  // draw
  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const F = FILM.fx, C = FILM.cast, P = F.pal, L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const k = pageIndex(t);
      const tf = FLIPS[k];
      const since = t - tf;

      // camera: small punch on each flip, big shake on the stamp
      const sh = F.shakeMany(t, [[FLIPS[0], 0.25, 8], [FLIPS[1], 0.25, 8], [FLIPS[2], 0.25, 8], [T_STAMP, 0.4, 26]], 1301);
      const punch = 1 + 0.025 * Math.exp(-Math.max(0, since) / 0.18) + (t >= T_STAMP ? 0.03 * Math.exp(-(t - T_STAMP) / 0.2) : 0);
      ctx.save();
      ctx.translate(540 + sh[0], 960 + sh[1]);
      ctx.scale(punch, punch);
      ctx.translate(-540, -960);

      // 1-2. room + window
      ctx.drawImage(room(F), 0, 0);
      drawWindow(ctx, F, t);
      // warm lamp glow
      const lg = ctx.createRadialGradient(601, 540, 10, 601, 540, 220);
      lg.addColorStop(0, 'rgba(255,230,160,0.45)'); lg.addColorStop(1, 'rgba(255,230,160,0)');
      ctx.fillStyle = lg; ctx.fillRect(380, 320, 440, 440);

      // 3. calendar + 4. board
      drawCalendar(ctx, F, t);
      drawBoard(ctx, F, t);

      // 5. trash pile
      drawPile(ctx, F, t);

      // 6. Hayk: hops on beats, swells on each page with a squash
      const bu = clamp((since + FR) / 0.3);
      const belly = lerp(BELLY_FROM[k], BELLY[k], L.ease.outBack(bu));
      const hop = F.bounce(tw, 2, 16);
      const squash = since < 3 * FR ? 1 : 0;
      const hx = 834, hy = 1760 + hop;
      ctx.save();
      ctx.translate(hx, 1760);
      ctx.scale(squash ? 1.07 : 1, squash ? 0.92 : 1);
      ctx.translate(-hx, -1760);
      // soft floor shadow separate from the hop
      ctx.fillStyle = 'rgba(80,30,10,0.22)';
      F.ellipse(ctx, hx, 1766, 150 + belly * 50, 26); ctx.fill();
      const biteU = clamp((t - tf) / 1.9);
      const a = C.hayk(ctx, {
        x: hx, y: hy, s: 1.56, t, pose: 'stand', face: 'happy', chewing: true, belly,
        hold: 'burger', bite: 0.15 + Math.floor(biteU * 4) * 0.14,
        holdL: k === 0 ? null : k === 1 ? 'drink' : 'fries',
      });
      ctx.restore();
      // crumbs from chewing every beat
      for (let b = 0; b < 10; b++) {
        const bt = b * 0.5 + 0.25;
        F.crumbs(ctx, a.mouth[0] + 30, a.mouth[1] + 10, t - bt, { n: 6, seed: 1300 + b, spread: 240, life: 0.45 });
      }
      // happy sparkles around him
      F.sparkles(ctx, { x: 680, y: 900, w: 360, h: 420, n: 7, seed: 1307, t, size: 30 });
      // belly POMF on each growth
      if (since < 0.9) {
        F.sfx(ctx, 'POMF!', 950, 1210, t, tf, { size: 72, fill: '#ffffff', shadowColor: P.kongOrange, rot: 0.15, life: 0.9 });
        F.shockRing(ctx, a.hip[0], a.hip[1] - 70, since + FR, { r: 340, color: '#ffffff', life: 0.25, width: 10, squash: 0.7 });
      }

      // 7. flying pages + whoosh
      for (let i = 0; i < FLIPS.length; i++) {
        const age = t - FLIPS[i] + FR * 3;
        if (age >= 0 && age < 0.55) {
          F.speedLines(ctx, { angle: Math.PI + 0.5, count: 18, color: '#ffffff', alpha: 0.8 * (1 - age / 0.55), seed: 1310 + i, t, speed: 3200, len: 520, width: 10, x: 0, y: 120, w: 640, h: 900 });
        }
        drawFlyingPage(ctx, F, i, age);
      }
      // FWIP sfx at each flip
      FLIPS.forEach((f, i) => F.sfx(ctx, 'FWIP!', 250, 880 + i * 6, t, f, { size: 84, fill: '#ffffff', shadowColor: '#3a8dde', rot: -0.2, life: 0.6 }));

      // stamp + THUD on the INVESTORS line
      if (t >= T_STAMP - 1e-6) {
        const age = t - T_STAMP;
        F.shockRing(ctx, BRD.x + BRD.w - 70, BRD.y + 78, age + FR, { r: 260, color: '#ff4d5e', life: 0.4, width: 18 });
        F.dust(ctx, BRD.x + BRD.w - 150, BRD.y + 130, age + FR, { n: 6, seed: 1320, size: 26, color: 'rgba(255,255,255,0.7)', spread: 120 });
        F.stamp(ctx, '0', BRD.x + BRD.w - 72, BRD.y + 80, t + FR, T_STAMP, { size: 118, color: '#ff2f45', rot: -0.22 });
      }
      ctx.restore(); // camera

      // screen-fixed: THUD over the shake
      if (t >= T_STAMP - 1e-6) {
        F.sfx(ctx, 'THUD!', 400, 1446, t, T_STAMP, { size: 124, fill: '#ff3b3b', shadowColor: '#5a0a14', rot: -0.08 });
      }
      // stamp impact flash (one frame)
      if (t >= T_STAMP - 1e-6 && t < T_STAMP + FR * 1.5) F.flash(ctx, 0.35, '#ffffff');
    },
  });
})();
