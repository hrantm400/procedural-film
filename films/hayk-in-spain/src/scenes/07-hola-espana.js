// Shot 07 'hola-espana' : "Hola, Espana"  (global T 26.0 - 30.0, 4 s)
//
// Bright Spanish street. Hayk (shades, smile) walks in pulling his suitcase, strikes a peace pose at
// 1.5 s with a sparkle burst. "DAY 1" caption at 0.5 s, bubble "HOLA, ESPANA!" at 1.0 s, to-do note
// "TODO: 1. FIND INVESTORS" with a checkbox pops in at 2.5 s.
//
// Layers (back to front):
//   1 sky gradient + big sun with turning rays
//   2 clouds, pigeons
//   3 far: skyline + Sagrada-Familia-like spiky church (parallax 0.2)
//   4 mid: sandstone buildings with balconies, flower pots, awnings (parallax 0.6)
//   5 street: sidewalk tiles, lamp post, curb, road (parallax 1)
//   6 pose rays (after 1.5 s), suitcase, Hayk, sparkle burst
//   7 foreground palm (parallax 1.25)
//   8 screen-fixed text: DAY 1 caption, bubble, to-do card
(function () {
  'use strict';
  const ID = 'hola-espana';
  const L = FILM.lib;
  const F = FILM.fx;
  const P = F.pal;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const h01 = (...k) => F.h01(ID, ...k);
  const { ellipse, fo, rrect, curve, poly } = F;

  const GROUND = 1690; // Hayk's feet
  const WALL_BASE = 1450; // where the facades meet the sidewalk
  const BLINE = '#6a4636'; // soft outline for architecture
  const T_POSE = 1.5; // T 27.5
  const T_DAY = 0.5; // T 26.5
  const T_HOLA = 1.0; // T 27.0
  const T_TODO = 2.5; // T 28.5

  // ---------------------------------------------------------------------------
  // Far layer: skyline and spiky church
  // ---------------------------------------------------------------------------
  function church(ctx, cx, base, s) {
    ctx.save();
    ctx.translate(cx, base);
    ctx.scale(s, s);
    const body = '#a9b9e6', shade = '#8fa1d6', light = '#c3cff0';
    // nave block
    ctx.fillStyle = shade;
    ctx.fillRect(-230, -210, 460, 210);
    ctx.fillStyle = body;
    ctx.fillRect(-230, -210, 250, 210);
    // spires: [x, height, width]
    const sp = [[-190, 380, 54], [-120, 470, 62], [-50, 560, 70], [30, 600, 74], [110, 520, 64], [180, 420, 56], [-5, 700, 80], [240, 330, 46]];
    sp.sort((a, b) => a[1] - b[1]);
    sp.forEach(([x, h, w], i) => {
      ctx.beginPath();
      ctx.moveTo(x - w / 2, 0);
      ctx.bezierCurveTo(x - w / 2, -h * 0.55, x - w * 0.18, -h * 0.85, x, -h);
      ctx.bezierCurveTo(x + w * 0.18, -h * 0.85, x + w / 2, -h * 0.55, x + w / 2, 0);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? body : light;
      ctx.fill();
      // shaded right half
      ctx.save();
      ctx.clip();
      ctx.fillStyle = shade;
      ctx.fillRect(x + w * 0.08, -h, w, h);
      // bands and window slits
      ctx.fillStyle = 'rgba(80,95,160,0.35)';
      for (let k = 1; k < 7; k++) ctx.fillRect(x - w / 2, -h * k * 0.12, w, 5);
      for (let k = 1; k < 6; k++) { rrect(ctx, x - 5, -h * (0.1 + k * 0.12), 10, 22, 5); ctx.fill(); }
      ctx.restore();
      // bulb finial
      ctx.fillStyle = i % 3 === 0 ? '#e8b8a0' : light;
      ctx.beginPath(); ctx.arc(x, -h - 10, 12, 0, TAU); ctx.fill();
      ctx.fillStyle = shade;
      ctx.fillRect(x - 2, -h - 36, 4, 20);
    });
    // rose window + portal
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.arc(-40, -130, 40, 0, TAU); ctx.fill();
    ctx.fillStyle = shade;
    ctx.beginPath(); ctx.arc(-40, -130, 22, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-80, 0); ctx.lineTo(-80, -60); ctx.quadraticCurveTo(-40, -110, 0, -60); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function farLayer(ctx) {
    // hazy skyline blocks
    ctx.fillStyle = '#c4dcf5';
    for (let i = 0; i < 16; i++) {
      const x = -100 + i * 90, h = 120 + h01('sky', i) * 170, w = 70 + h01('skw', i) * 60;
      ctx.fillRect(x, 1180 - h, w, h + 40);
    }
    ctx.fillStyle = '#b3cdec';
    for (let i = 0; i < 12; i++) {
      const x = -60 + i * 120, h = 60 + h01('sk2', i) * 110;
      ctx.fillRect(x, 1200 - h, 100, h + 40);
    }
    church(ctx, 400, 1170, 1.05);
    // hills of Montjuic-ish green far away
    ctx.fillStyle = '#9fcf9a';
    ctx.beginPath();
    ctx.moveTo(-100, 1210);
    ctx.quadraticCurveTo(150, 1110, 400, 1190);
    ctx.lineTo(400, 1260); ctx.lineTo(-100, 1260); ctx.closePath();
    ctx.fill();
  }

  // ---------------------------------------------------------------------------
  // Mid layer: facades
  // ---------------------------------------------------------------------------
  function flowerPot(ctx, x, y, seed) {
    rrect(ctx, x - 20, y - 26, 40, 26, 5); fo(ctx, '#d9653b', 3, BLINE);
    ctx.fillStyle = '#4f9a4a';
    ctx.beginPath(); ctx.ellipse(x, y - 34, 30, 16, 0, 0, TAU); ctx.fill();
    const cols = ['#ff4f6e', '#ff7ab0', '#ffffff', '#ff5a3c'];
    for (let k = 0; k < 5; k++) {
      const fx = x - 22 + k * 11, fy = y - 38 - h01('fp', seed, k) * 14;
      ctx.fillStyle = cols[(seed + k) % cols.length];
      ctx.beginPath(); ctx.arc(fx, fy, 7, 0, TAU); ctx.fill();
    }
    // trailing leaves
    ctx.strokeStyle = '#3f8a3e'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 16, y - 6); ctx.quadraticCurveTo(x - 24, y + 20, x - 14, y + 40); ctx.stroke();
  }

  function windowUnit(ctx, x, y, w, h, o) {
    // arched window with shutters, balcony and pot
    const sh = o.shutter;
    // shutters
    rrect(ctx, x - w * 0.5 - w * 0.34, y, w * 0.34, h, 3); fo(ctx, sh, 3, BLINE);
    rrect(ctx, x + w * 0.5, y, w * 0.34, h, 3); fo(ctx, sh, 3, BLINE);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 1; k < 7; k++) {
      ctx.moveTo(x - w * 0.82, y + (h * k) / 7); ctx.lineTo(x - w * 0.52, y + (h * k) / 7);
      ctx.moveTo(x + w * 0.52, y + (h * k) / 7); ctx.lineTo(x + w * 0.82, y + (h * k) / 7);
    }
    ctx.stroke();
    // glass with arch
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + h);
    ctx.lineTo(x - w / 2, y + w / 2);
    ctx.arc(x, y + w / 2, w / 2, Math.PI, 0);
    ctx.lineTo(x + w / 2, y + h);
    ctx.closePath();
    fo(ctx, '#5f8fc4', 4, BLINE);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.moveTo(x - w * 0.35, y + h * 0.9); ctx.lineTo(x - w * 0.1, y + w * 0.3); ctx.lineTo(x + w * 0.05, y + w * 0.3); ctx.lineTo(x - w * 0.2, y + h * 0.9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = BLINE; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.stroke();
    if (o.balcony) {
      const by = y + h;
      rrect(ctx, x - w * 0.9, by - 6, w * 1.8, 14, 3); fo(ctx, '#e9d2b0', 3, BLINE);
      // iron railing
      ctx.strokeStyle = '#2d2530'; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.85, by - 60); ctx.lineTo(x + w * 0.85, by - 60);
      for (let k = 0; k <= 10; k++) { const rx = x - w * 0.85 + (k * w * 1.7) / 10; ctx.moveTo(rx, by - 60); ctx.lineTo(rx, by - 6); }
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let k = 0; k < 5; k++) { const rx = x - w * 0.68 + (k * w * 1.36) / 4; ctx.moveTo(rx + 12, by - 30); ctx.arc(rx, by - 30, 12, 0, TAU); }
      ctx.stroke();
      if (o.pot) { flowerPot(ctx, x - w * 0.55, by - 8, o.seed); flowerPot(ctx, x + w * 0.55, by - 8, o.seed + 1); }
    } else if (o.pot) {
      rrect(ctx, x - w * 0.6, y + h - 4, w * 1.2, 12, 3); fo(ctx, '#e9d2b0', 3, BLINE);
      flowerPot(ctx, x, y + h - 2, o.seed);
    }
  }

  function awning(ctx, x, y, w, c1, c2) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w + 20, y + 80); ctx.lineTo(x - 20, y + 80); ctx.closePath();
    ctx.fillStyle = c1; ctx.fill();
    ctx.clip();
    ctx.fillStyle = c2;
    for (let k = 0; k < 14; k++) {
      const sx = x - 20 + k * ((w + 40) / 14) * 2;
      ctx.beginPath(); ctx.moveTo(sx + (x - sx) * 0.1, y); ctx.lineTo(sx + ((w + 40) / 14), y); ctx.lineTo(sx + ((w + 40) / 14), y + 90); ctx.lineTo(sx, y + 90); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w + 20, y + 80); ctx.lineTo(x - 20, y + 80); ctx.closePath();
    fo(ctx, null, 4, BLINE);
    // scalloped valance
    ctx.beginPath();
    const n = Math.round((w + 40) / 40);
    ctx.moveTo(x - 20, y + 80);
    for (let k = 0; k < n; k++) { const sx = x - 20 + (k * (w + 40)) / n; ctx.quadraticCurveTo(sx + (w + 40) / n / 2, y + 112, sx + (w + 40) / n, y + 80); }
    ctx.closePath();
    fo(ctx, c1, 4, BLINE);
  }

  function building(ctx, b) {
    const { x, w, top, wall, shade, roof, shutter, seed } = b;
    const bot = WALL_BASE;
    // roof: terracotta tiles, slight overhang
    ctx.beginPath();
    ctx.moveTo(x - 24, top + 20); ctx.lineTo(x + 30, top - 50); ctx.lineTo(x + w - 30, top - 50); ctx.lineTo(x + w + 24, top + 20); ctx.closePath();
    fo(ctx, roof, 4, BLINE);
    ctx.strokeStyle = 'rgba(120,40,20,0.45)'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) { const yy = top - 34 + k * 18; ctx.moveTo(x + 10 - k * 12, yy); ctx.lineTo(x + w - 10 + k * 12, yy); }
    for (let k = 0; k < w / 28; k++) { const xx = x + 10 + k * 28; ctx.moveTo(xx, top - 48); ctx.lineTo(xx - 4, top + 16); }
    ctx.stroke();
    // wall
    ctx.beginPath(); ctx.rect(x, top + 16, w, bot - top - 16);
    fo(ctx, wall, 4, BLINE);
    ctx.fillStyle = shade;
    ctx.fillRect(x + w - 40, top + 18, 38, bot - top - 20);
    // cornice
    rrect(ctx, x - 12, top + 10, w + 24, 26, 4); fo(ctx, '#fff4e0', 4, BLINE);
    // floor bands
    ctx.fillStyle = 'rgba(160,110,60,0.25)';
    const floors = b.floors;
    const fh = (bot - 200 - (top + 40)) / floors;
    for (let f = 1; f <= floors; f++) ctx.fillRect(x, top + 40 + f * fh - 6, w, 8);
    // windows
    const cols = b.cols;
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        const wx = x + (w / cols) * (c + 0.5);
        const wy = top + 40 + f * fh + fh * 0.18;
        windowUnit(ctx, wx, wy, Math.min(56, (w / cols) * 0.42), fh * 0.62, {
          shutter, balcony: (f + c + seed) % 2 === 0, pot: (f * 3 + c + seed) % 3 !== 1, seed: seed + f * 5 + c,
        });
      }
    }
    // ground floor shop
    const gy = bot - 200;
    ctx.fillStyle = 'rgba(120,70,40,0.18)';
    ctx.fillRect(x, gy, w, 200);
    if (b.shop) {
      rrect(ctx, x + 30, gy + 70, w - 60, 130, 6); fo(ctx, '#3b2a3a', 4, BLINE);
      ctx.fillStyle = '#ffd98a';
      ctx.fillRect(x + 44, gy + 84, (w - 88) * 0.55, 102);
      ctx.fillStyle = '#8a5a3a';
      ctx.fillRect(x + 44 + (w - 88) * 0.62, gy + 84, (w - 88) * 0.38, 116);
      awning(ctx, x + 30, gy - 10, w - 60, b.shop[0], b.shop[1]);
    } else {
      // big wooden door
      ctx.beginPath();
      ctx.moveTo(x + w / 2 - 60, bot); ctx.lineTo(x + w / 2 - 60, gy + 60); ctx.arc(x + w / 2, gy + 60, 60, Math.PI, 0); ctx.lineTo(x + w / 2 + 60, bot); ctx.closePath();
      fo(ctx, '#7a4a2e', 4, BLINE);
      ctx.strokeStyle = BLINE; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x + w / 2, gy + 2); ctx.lineTo(x + w / 2, bot); ctx.stroke();
    }
  }

  const BUILDINGS = [
    { x: -120, w: 400, top: 800, wall: '#f4d6a4', shade: '#e0b97f', roof: '#d9653b', shutter: '#3f8f7a', floors: 3, cols: 2, seed: 1, shop: ['#e8413c', '#ffffff'] },
    { x: 280, w: 380, top: 1000, wall: '#fff4e0', shade: '#ead7b8', roof: '#c9542f', shutter: '#3a6fb0', floors: 1, cols: 3, seed: 2, shop: null },
    { x: 660, w: 460, top: 600, wall: '#f3c38f', shade: '#dea56c', roof: '#d9653b', shutter: '#2f7f6e', floors: 4, cols: 3, seed: 3, shop: ['#2f9e5a', '#fff4e0'] },
    { x: 1120, w: 380, top: 700, wall: '#f6dcae', shade: '#e2bf86', roof: '#c9542f', shutter: '#3a6fb0', floors: 3, cols: 2, seed: 4, shop: ['#ffb000', '#ffffff'] },
  ];

  function midLayer(ctx) {
    BUILDINGS.forEach((b) => building(ctx, b));
  }

  // ---------------------------------------------------------------------------
  // Street
  // ---------------------------------------------------------------------------
  function street(ctx, ox) {
    // sidewalk
    ctx.fillStyle = '#ecd6b2';
    ctx.fillRect(-200, WALL_BASE, 1600, 400);
    ctx.fillStyle = 'rgba(160,110,60,0.18)';
    ctx.fillRect(-200, WALL_BASE, 1600, 26);
    ctx.strokeStyle = 'rgba(150,105,70,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const rows = [1476, 1530, 1596, 1676, 1770];
    rows.forEach((y) => { ctx.moveTo(-200, y); ctx.lineTo(1500, y); });
    for (let r = 0; r < rows.length - 1; r++) {
      const tw = 90 + r * 30;
      const off = (r % 2) * tw * 0.5 - (ox % tw);
      for (let x = -200 + off; x < 1500; x += tw) { ctx.moveTo(x, rows[r]); ctx.lineTo(x - (x - 540) * 0.08, rows[r + 1]); }
    }
    ctx.stroke();
    // curb and road
    ctx.fillStyle = '#d7c3a2';
    ctx.fillRect(-200, 1810, 1600, 30);
    ctx.strokeStyle = BLINE; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-200, 1810); ctx.lineTo(1500, 1810); ctx.stroke();
    ctx.fillStyle = '#7d7a86';
    ctx.fillRect(-200, 1840, 1600, 100);
    ctx.fillStyle = '#fff4e0';
    for (let x = -200 - (ox % 240); x < 1500; x += 240) ctx.fillRect(x, 1880, 120, 12);
  }

  function lampPost(ctx, x) {
    ctx.save();
    ctx.fillStyle = '#2d2530';
    ctx.strokeStyle = P.line; ctx.lineWidth = 4;
    rrect(ctx, x - 22, 1560, 44, 30, 6); fo(ctx, '#2d2530', 4);
    rrect(ctx, x - 9, 1080, 18, 490, 6); fo(ctx, '#2d2530', 4);
    // arm and lantern
    ctx.lineWidth = 8; ctx.strokeStyle = '#2d2530';
    ctx.beginPath(); ctx.moveTo(x, 1100); ctx.quadraticCurveTo(x + 40, 1040, x + 90, 1060); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 70, 1070); ctx.lineTo(x + 110, 1070); ctx.lineTo(x + 102, 1140); ctx.lineTo(x + 78, 1140); ctx.closePath();
    fo(ctx, '#ffe9a8', 4);
    ctx.beginPath(); ctx.moveTo(x + 62, 1072); ctx.lineTo(x + 90, 1044); ctx.lineTo(x + 118, 1072); ctx.closePath(); fo(ctx, '#2d2530', 4);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Palm tree
  // ---------------------------------------------------------------------------
  function palm(ctx, x, base, h, t, seed, s = 1) {
    ctx.save();
    ctx.translate(x, base);
    ctx.scale(s, s);
    const lean = 0.12 + Math.sin(t * 1.3 + seed) * 0.015;
    // trunk as stacked rings
    const segs = 16;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      pts.push([Math.sin(u * 1.6) * h * lean * 1.4, -u * h]);
    }
    for (let i = 0; i < segs; i++) {
      const a = pts[i], b = pts[i + 1];
      const wA = 34 - i * 1.1, wB = 34 - (i + 1) * 1.1;
      ctx.beginPath();
      ctx.moveTo(a[0] - wA, a[1]); ctx.lineTo(b[0] - wB - 6, b[1]); ctx.lineTo(b[0] + wB + 6, b[1]); ctx.lineTo(a[0] + wA, a[1]); ctx.closePath();
      fo(ctx, i % 2 ? '#a27449' : '#8c6038', 4);
    }
    const top = pts[segs];
    // coconuts
    ellipse(ctx, top[0] - 14, top[1] + 18, 16, 16); fo(ctx, '#6b4a2a', 4);
    ellipse(ctx, top[0] + 14, top[1] + 22, 16, 16); fo(ctx, '#7d5632', 4);
    // fronds
    const fr = [-2.9, -2.45, -2.0, -1.55, -1.1, -0.65, -0.2, 0.3, 2.6];
    fr.forEach((a0, i) => {
      const sway = Math.sin(t * 2.2 + i * 0.9 + seed) * 0.07;
      const a = a0 + sway;
      const len = 250 + h01('frl', seed, i) * 70;
      const droop = 0.6;
      const tipX = top[0] + Math.cos(a) * len, tipY = top[1] + Math.sin(a) * len * 0.55 + len * droop * 0.35;
      const midX = top[0] + Math.cos(a) * len * 0.5, midY = top[1] + Math.sin(a) * len * 0.5 - 30;
      const nx = -Math.sin(a), ny = Math.cos(a);
      ctx.beginPath();
      ctx.moveTo(top[0], top[1]);
      ctx.quadraticCurveTo(midX + nx * 34, midY + ny * 34, tipX, tipY);
      // serrated lower edge
      for (let k = 8; k >= 1; k--) {
        const u = k / 8;
        const px = lerp(top[0], tipX, u) + (1 - u) * 0, py = lerp(top[1], tipY, u) - Math.sin(u * Math.PI) * 30;
        ctx.lineTo(px - nx * (12 + 26 * Math.sin(u * Math.PI)) + (k % 2 ? 8 : -8), py - ny * (12 + 26 * Math.sin(u * Math.PI)) + 14);
      }
      ctx.closePath();
      fo(ctx, i % 2 ? '#3f9a4a' : '#57b457', 4);
      ctx.strokeStyle = 'rgba(30,80,40,0.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.quadraticCurveTo(midX, midY, tipX, tipY); ctx.stroke();
    });
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Sky bits
  // ---------------------------------------------------------------------------
  function sun(ctx, x, y, t) {
    ctx.save();
    const rot = t * 0.25;
    const g = ctx.createRadialGradient(x, y, 60, x, y, 420);
    g.addColorStop(0, 'rgba(255,245,190,0.9)');
    g.addColorStop(1, 'rgba(255,245,190,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, 420, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,170,0.45)';
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a0 = rot + (i / 16) * TAU, a1 = a0 + 0.12;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a0) * 900, y + Math.sin(a0) * 900);
      ctx.lineTo(x + Math.cos(a1) * 900, y + Math.sin(a1) * 900);
      ctx.closePath();
    }
    ctx.fill();
    // sun disc with a cel shade
    ellipse(ctx, x, y, 118, 118); fo(ctx, '#ffe066', 5, '#f0a020');
    ctx.fillStyle = '#fff6b8';
    ctx.beginPath(); ctx.arc(x - 30, y - 30, 58, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function pigeons(ctx, t) {
    ctx.save();
    ctx.strokeStyle = '#3d4a6a'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 4; i++) {
      const x = -120 + ((t * (160 + i * 25) + i * 320) % 1400);
      const y = 560 + i * 60 + Math.sin(t * 3 + i) * 20;
      const flap = Math.sin(L.onTwos(t) * 22 + i * 2) * 16;
      const s = 1 - i * 0.12;
      ctx.beginPath();
      ctx.moveTo(x - 26 * s, y - flap * s); ctx.quadraticCurveTo(x - 12 * s, y - 14 * s, x, y);
      ctx.quadraticCurveTo(x + 12 * s, y - 14 * s, x + 26 * s, y - flap * s);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Text pieces
  // ---------------------------------------------------------------------------
  function todoCard(ctx, t) {
    const sc = F.popIn(t, T_TODO);
    if (sc <= 0) return;
    const x = 770, y = 470;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.06 + Math.sin(t * 3) * 0.01);
    ctx.scale(sc, sc);
    // shadow
    ctx.fillStyle = 'rgba(27,20,36,0.3)';
    rrect(ctx, -236, -96, 490, 216, 10); ctx.fill();
    // sticky note
    rrect(ctx, -250, -110, 490, 216, 10); fo(ctx, '#fff27a', 6);
    ctx.fillStyle = '#ffe24a';
    ctx.fillRect(-244, 70, 478, 30);
    // tape
    ctx.save(); ctx.rotate(0.05); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-60, -130, 120, 40); ctx.restore();
    F.text(ctx, 'TODO:', -218, -52, { size: 58, fill: P.line, lw: 0, align: 'left' });
    // checkbox
    rrect(ctx, -222, 6, 50, 50, 8); fo(ctx, '#ffffff', 6);
    F.text(ctx, '1. FIND INVESTORS', -156, 32, { size: 40, fill: '#c0182a', lw: 0, align: 'left' });
    ctx.restore();
  }


  // ---------------------------------------------------------------------------
  // Draw
  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const W = 1080, H = 1920;

      // Hayk's path: walk in from the left, stop at the pose
      const walkU = clamp(t / 1.42);
      const hx = lerp(250, 560, L.ease.outSine(walkU));
      const posed = t >= T_POSE - 1e-6;
      // camera follows a little (world shifts left)
      const camX = lerp(0, 70, L.ease.inOutSine(clamp(t / 2.2)));
      const push = 1 + 0.035 * L.ease.inOutSine(clamp((t - T_POSE) / 2.5));
      const sh = F.shake(t, T_POSE, 0.25, 12, 3);

      ctx.save();
      // push-in around Hayk's chest
      ctx.translate(540, 1300);
      ctx.scale(push, push);
      ctx.translate(-540 + sh[0], -1300 + sh[1]);

      // 1 sky
      F.sky(ctx, '#2f9cf0', '#bfe6ff', { x: -100, y: -100, w: W + 200, h: 1400, mid: P.spainSky, midAt: 0.35 });
      sun(ctx, 890 - camX * 0.1, 240, t);
      // 2 clouds and birds
      ctx.save();
      ctx.translate(-camX * 0.15, 0);
      F.cloud(ctx, 120 + t * 18, 470, 260);
      F.cloud(ctx, 620 + t * 12, 780, 200);
      F.cloud(ctx, -60 + t * 22, 880, 170);
      ctx.restore();
      pigeons(ctx, t);
      // 3 far
      ctx.save();
      ctx.translate(-camX * 0.25, 0);
      farLayer(ctx);
      ctx.restore();
      // 4 mid
      ctx.save();
      ctx.translate(-camX * 0.6, 0);
      midLayer(ctx);
      ctx.restore();
      // 5 street
      ctx.save();
      ctx.translate(-camX, 0);
      street(ctx, 0);
      lampPost(ctx, 120);
      ctx.restore();

      // 6 pose rays behind Hayk
      const hxs = hx - camX;
      if (posed) {
        const u = clamp((t - T_POSE) / 0.3);
        ctx.save();
        ctx.globalAlpha = 0.28 * u;
        ctx.fillStyle = '#fff6c0';
        ctx.beginPath();
        const rot = t * 0.4;
        for (let i = 0; i < 20; i++) {
          const a0 = rot + (i / 20) * TAU, a1 = a0 + 0.14;
          ctx.moveTo(hxs, 1180);
          ctx.lineTo(hxs + Math.cos(a0) * 1400, 1180 + Math.sin(a0) * 1400);
          ctx.lineTo(hxs + Math.cos(a1) * 1400, 1180 + Math.sin(a1) * 1400);
          ctx.closePath();
        }
        ctx.fill();
        ctx.restore();
      }

      // Hayk (with hop on beats after the pose and a squash on the pose hit)
      const S = 1.4;
      let hop = 0, sx = 1, sy = 1;
      if (posed) {
        const pf = Math.floor((t - T_POSE) * 12 + 1e-6);
        if (pf < 2) { sx = 1.06; sy = 0.92; }
        if (t > 2.0) hop = F.bounce(tw - 2.0, 2, 14);
      }
      // suitcase: tilted and trailing while walking, standing after the pose
      const ss = 0.78;
      ctx.save();
      ctx.translate(hxs, GROUND);
      ctx.scale(sx, sy);
      ctx.translate(-hxs, -GROUND);
      // draw Hayk into place first to get anchors? anchors need a draw; draw suitcase from a predicted hand spot
      const handGuess = posed ? [hxs - 150, GROUND - 330] : [hxs - 125, GROUND - 300];
      let caseX, caseRot;
      if (!posed) { caseX = hxs - 330; caseRot = 0.42 + Math.sin(tw * 12.566) * 0.03; }
      else { const u = L.ease.outBack(clamp((t - T_POSE) / 0.3)); caseX = lerp(hxs - 330, hxs - 300, u); caseRot = lerp(0.42, 0, u); }
      ctx.save();
      ctx.translate(caseX, GROUND - 8 + (posed ? 0 : Math.abs(Math.sin(tw * 12.566)) * -4));
      ctx.rotate(caseRot);
      F.suitcase(ctx, 0, 0, ss, { color: '#e8413c' });
      ctx.restore();
      // telescopic handle extension from the case handle to the hand
      const htop = [caseX + Math.sin(caseRot) * 390 * ss, GROUND - 8 - Math.cos(caseRot) * 390 * ss];
      const a = FILM.cast.hayk(ctx, {
        x: hxs, y: GROUND + hop, s: S, t: tw, pose: posed ? 'peace' : 'walk', face: 'smile', shades: true,
      });
      const hand = a.handL || handGuess;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = P.line; ctx.lineWidth = 16;
      ctx.beginPath(); ctx.moveTo(htop[0], htop[1]); ctx.lineTo(hand[0], hand[1] + 6); ctx.stroke();
      ctx.strokeStyle = '#9aa3b8'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(htop[0], htop[1]); ctx.lineTo(hand[0], hand[1] + 6); ctx.stroke();
      ctx.restore();
      ctx.restore();

      // walking dust puffs on steps
      if (!posed) {
        for (let k = 0; k < 3; k++) {
          const st = k * 0.5;
          F.dust(ctx, hxs - 40 + k * 10, GROUND, t - st, { n: 4, size: 22, spread: 70, seed: 30 + k, life: 0.45 });
        }
      } else {
        F.dust(ctx, hxs, GROUND, t - T_POSE, { n: 6, size: 40, spread: 200, seed: 41, life: 0.6 });
      }

      // sparkle burst at the pose
      if (posed) {
        const age = t - T_POSE;
        const hr = a.handR;
        const big = age < 0.5 ? L.ease.outBack(clamp(age / 0.15)) * 110 * (1 - age) : 55 + Math.sin(t * 9) * 12;
        F.sparkle(ctx, hr[0] + 45, hr[1] - 115, big, { color: '#fff7c2' });
        for (let i = 0; i < 10; i++) {
          const ang = (i / 10) * TAU + 0.3;
          const d = 60 + L.ease.outCubic(clamp(age / 0.6)) * 260;
          const r = (1 - clamp((age - 0.3) / 0.8)) * (22 + (i % 3) * 10);
          F.sparkle(ctx, hr[0] + Math.cos(ang) * d, hr[1] - 50 + Math.sin(ang) * d, r, { color: i % 2 ? '#ffffff' : '#ffe066', glow: false });
        }
        // shades glint
        const gl = ((t - T_POSE) % 1.0);
        if (gl < 0.35) F.sparkle(ctx, a.eyeR[0] + 26, a.eyeR[1] - 8, 40 * Math.sin((gl / 0.35) * Math.PI), { color: '#ffffff' });
        F.sparkles(ctx, { x: hxs - 380, y: 900, w: 760, h: 700, n: 10, seed: 77, t, size: 26 });
      }

      // 7 foreground palm
      palm(ctx, 1010 - camX * 1.25, 1900, 1180, t, 5, 1.0);
      palm(ctx, -40 - camX * 1.25, 1960, 900, t, 9, 0.9);

      ctx.restore();

      // 8 screen-fixed text
      F.caption(ctx, 'DAY 1', 400, 290, { size: 104, align: 'center', t, t0: T_DAY, from: 'left', bg: '#c0182a', accent: P.gold, border: 6, borderColor: P.line });
      if (t >= T_HOLA) {
        F.bubble(ctx, 'HOLA, ESPANA!', 690, 730, { size: 60, t, t0: T_HOLA, tail: [a.head[0] + 70, a.head[1] - 150], shout: true, maxW: 700 });
      }
      todoCard(ctx, t);
    },
  });
})();
