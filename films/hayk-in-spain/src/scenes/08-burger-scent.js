// Shot 08 'burger-scent' : "The scent"  (global T 30.0 - 34.0, 4 s)
//
// Same Spanish street as shot 07. Hayk mid-walk; at 0.5 s a golden aroma ribbon curls in from the
// right and reaches his nose. He freezes mid-stride (face "shocked"), his sunglasses slide down his
// nose. 1.5 s: black-and-white impact frame, eyes wide. 2.0 s: extreme close-up on his eyes with a
// burger sign reflected in his pupils and focus lines. 2.5 s "WAIT...", 3.0 s shaky shout
// "IS THAT... A BURGER?!". Menace "ゴゴゴ" floats beside him.
//
// Layers (back to front):
//   A street (0 - 1.5 s): sky + sun, clouds, far church, facades, street (scrolling while he walks),
//     aroma ribbon, suitcase, Hayk, sliding sunglasses, sniff / "!" marks, foreground palms
//   B impact frame (1.5 - 1.67 s): white field + black focus lines, Hayk silhouette with white eyes
//   C shock hold (1.67 - 2.0 s): street pushed in, shocked Hayk, glasses falling, menace, shake
//   D extreme close-up (2.0 - 4.0 s): face fills the frame, eye overlays with the burger-sign
//     reflection, aroma wisps, focus lines, menace, text
(function () {
  'use strict';
  const ID = 'burger-scent';
  const REF = 'hola-espana'; // background seeds shared with shot 07 so the street matches
  const L = FILM.lib;
  const F = FILM.fx;
  const P = F.pal;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const h01 = (...k) => F.h01(REF, ...k);
  const hs = (...k) => F.h01(ID, ...k);
  const { ellipse, fo, rrect, curve, poly } = F;

  const GROUND = 1690;
  const WALL_BASE = 1450;
  const BLINE = '#6a4636';
  const T_AROMA = 0.5; // T 30.5
  const T_FREEZE = 1.1; // T 31.1
  const T_IMPACT = 1.5; // T 31.5
  const T_IMPACT_END = 1.5 + 4 / 24;
  const T_XCU = 2.0; // T 32.0
  const T_WAIT = 2.5; // T 32.5
  const T_SHOUT = 3.0; // T 33.0

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
  // Shot pieces
  // ---------------------------------------------------------------------------
  /** Hayk's sunglasses (same shape as cast.js) at head-local offset dy, scale k = s * 1.15. */
  function shades(ctx, head, k, dy, rot, dx = 0) {
    ctx.save();
    ctx.translate(head[0] + dx, head[1]);
    ctx.scale(k, k);
    ctx.rotate(rot);
    ctx.translate(0, dy);
    ctx.fillStyle = '#15121c';
    ctx.strokeStyle = P.line; ctx.lineWidth = 5; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-60, -14); ctx.lineTo(60, -14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-54, -16); ctx.lineTo(-6, -16); ctx.lineTo(-10, 12); ctx.quadraticCurveTo(-30, 22, -50, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(54, -16); ctx.lineTo(6, -16); ctx.lineTo(10, 12); ctx.quadraticCurveTo(30, 22, 50, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-44, -8); ctx.lineTo(-34, 4); ctx.moveTo(16, -8); ctx.lineTo(26, 4); ctx.stroke();
    ctx.restore();
  }

  /** a tiny glowing burger-joint sign, centred, ~200 x 130 at s = 1 (drawn in the pupils) */
  function burgerSign(ctx, x, y, s, glow) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 170);
    g.addColorStop(0, `rgba(255,220,90,${0.75 * glow})`);
    g.addColorStop(1, 'rgba(255,220,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 170, 0, TAU); ctx.fill();
    rrect(ctx, -104, -70, 208, 150, 22); fo(ctx, '#e8413c', 7);
    rrect(ctx, -92, -58, 184, 126, 16); fo(ctx, null, 4, P.gold);
    F.burger(ctx, 0, -12, 0.46);
    F.text(ctx, 'BURGER', 0, 46, { size: 34, fill: P.gold, lw: 7, stroke: P.line });
    ctx.restore();
  }

  /** eye overlay for the extreme close-up: big dark iris with the burger sign reflected in it */
  function eyeReflect(ctx, e, k, t, side) {
    const w = 24 * k, h = 30 * k;
    const b = L.boil(L.T);
    const jx = (hs('ej', side, b) - 0.5) * 0.9 * k, jy = (hs('ek', side, b) - 0.5) * 0.9 * k;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(e[0], e[1], w, h, 0, 0, TAU); ctx.clip();
    const cx = e[0] + jx, cy = e[1] + 3 * k + jy;
    const r = 17.5 * k;
    // iris with a gradient ring
    const g = ctx.createRadialGradient(cx, cy - r * 0.2, r * 0.1, cx, cy, r);
    g.addColorStop(0, '#6a2a10');
    g.addColorStop(0.7, '#3b2418');
    g.addColorStop(1, '#170d12');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = P.line; ctx.lineWidth = 0.8 * k;
    ctx.stroke();
    // warm reflected glow from below
    ctx.fillStyle = 'rgba(255,170,40,0.35)';
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.55, r * 0.85, r * 0.45, 0, 0, TAU); ctx.fill();
    // the sign (mirrored drawings are unreadable, keep it readable), pulsing glow
    const glow = 0.7 + 0.3 * Math.sin(t * 10);
    burgerSign(ctx, cx, cy + r * 0.12, (r * 1.25) / 208, glow);
    // highlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.5, cy - r * 0.55, r * 0.3, r * 0.22, -0.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.55, cy + r * 0.55, r * 0.1, 0, TAU); ctx.fill();
    // wobbling tear film at the bottom of the eye (overwhelmed)
    ctx.fillStyle = 'rgba(143,216,255,0.35)';
    ctx.beginPath(); ctx.ellipse(e[0], e[1] + h * 0.85, w, h * 0.3 + Math.sin(t * 12) * 2, 0, 0, TAU); ctx.fill();
    ctx.restore();
    // outline the eye again so the overlay sits inside the lids
    ctx.save();
    ctx.strokeStyle = P.line; ctx.lineWidth = 7 * k * 0.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(e[0], e[1], w + 1, h + 1, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.restore();
  }

  /** aroma ribbon with little floating burger ghosts along it */
  function aromaRibbon(ctx, pts, t, reveal, o = {}) {
    F.aroma(ctx, pts, t, { reveal, width: o.width || 34, amp: o.amp || 24, alpha: 0.95, color: '#ffd23a', edge: 'rgba(255,140,20,0.6)' });
    if (reveal <= 0) return;
    // second thinner strand
    F.aroma(ctx, pts.map((p, i) => [p[0] + (i % 2 ? 26 : -18), p[1] + (i % 2 ? -22 : 16)]), t + 0.4, { reveal: reveal * 0.95, width: (o.width || 30) * 0.45, amp: 18, alpha: 0.7, color: '#fff3b0' });
    // ghost burgers riding the ribbon
    for (let i = 0; i < 3; i++) {
      const u = ((t * 0.35 + i / 3) % 1) * reveal;
      const seg = u * (pts.length - 1);
      const k = Math.min(pts.length - 2, Math.floor(seg));
      const f = seg - k;
      const x = lerp(pts[k][0], pts[k + 1][0], f), y = lerp(pts[k][1], pts[k + 1][1], f) + Math.sin(t * 6 + i) * 12;
      ctx.save();
      ctx.globalAlpha = 0.55;
      F.burger(ctx, x, y, (o.ghost || 0.22) * (0.8 + 0.2 * Math.sin(t * 5 + i)), { rot: Math.sin(t * 3 + i) * 0.3 });
      ctx.restore();
      F.sparkle(ctx, x + 30, y - 30, 14 + 8 * Math.sin(t * 9 + i * 2), { color: '#fff7c2', glow: false });
    }
  }

  function streetBackground(ctx, t, camX) {
    const W = 1080;
    F.sky(ctx, '#2f9cf0', '#bfe6ff', { x: -300, y: -300, w: W + 600, h: 1600, mid: P.spainSky, midAt: 0.35 });
    sun(ctx, 890 - camX * 0.1, 240, t + 4);
    ctx.save();
    ctx.translate(-camX * 0.15, 0);
    F.cloud(ctx, 190 + t * 18, 470, 260);
    F.cloud(ctx, 668 + t * 12, 780, 200);
    F.cloud(ctx, 28 + t * 22, 880, 170);
    ctx.restore();
    pigeons(ctx, t + 4);
    ctx.save();
    ctx.translate(-camX * 0.25, 0);
    farLayer(ctx);
    ctx.restore();
    ctx.save();
    ctx.translate(-camX * 0.6, 0);
    midLayer(ctx);
    ctx.restore();
    ctx.save();
    street(ctx, camX);
    ctx.translate(-camX, 0);
    lampPost(ctx, 120);
    lampPost(ctx, 1260);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Phases
  // ---------------------------------------------------------------------------
  const HX = 540;
  const S = 1.4;
  const K = S * 1.15; // head scale
  const HEAD_Y = GROUND - 462 * S;

  function zoomAt(t) {
    // snap push-in on the freeze, harder after the impact frame
    let z = 1;
    if (t >= T_FREEZE) z += 0.2 * L.ease.outCubic(clamp((t - T_FREEZE) / 0.2));
    if (t >= T_IMPACT_END) z += 0.35 * L.ease.outExpo(clamp((t - T_IMPACT_END) / 0.12));
    return z;
  }

  function drawStreet(ctx, t, tw) {
    const tWalk = Math.min(tw, T_FREEZE);
    const camX = 70 + tWalk * 110; // continues the pan from shot 07
    const z = zoomAt(t);
    const shA = F.shake(t, T_FREEZE, 0.3, 10, 4);
    const shC = F.shake(t, T_IMPACT_END, 0.4, 22, 5);
    const zc = [HX, HEAD_Y + 40];

    ctx.save();
    ctx.translate(zc[0] + shA[0] + shC[0], zc[1] + shA[1] + shC[1]);
    ctx.scale(z, z);
    ctx.translate(-zc[0], -zc[1]);

    streetBackground(ctx, t, camX);

    // darkening wash + menace once he is shocked
    if (t >= T_IMPACT_END) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#3b1d6e';
      ctx.fillRect(-200, -200, 1500, 2400);
      ctx.restore();
      F.focusLines(ctx, HX, HEAD_Y + 20, { rx: 330, ry: 420, count: 90, color: '#1b1424', alpha: 0.75, seed: 21 });
    }

    // aroma ribbon from off-screen right to the nose
    const nose = [HX + 4 * K, HEAD_Y + 38 * K];
    const rev = L.ease.inOutSine(clamp((t - T_AROMA) / 0.6));
    const pts = [[1400, 1150], [1180, 1060], [1040, 1200], [900, 1260], [760, 1170], [nose[0] + 40, nose[1]]];

    // suitcase trailing
    const ss = 0.78;
    const bob = Math.abs(Math.sin(tWalk * 12.566)) * -4;
    const caseX = HX - 330, caseRot = 0.42 + Math.sin(tWalk * 12.566) * 0.03;
    ctx.save();
    ctx.translate(caseX, GROUND - 8 + bob);
    ctx.rotate(caseRot);
    F.suitcase(ctx, 0, 0, ss, { color: '#e8413c' });
    ctx.restore();

    // Hayk, frozen mid-stride after T_FREEZE (with a tiny jolt)
    const frozen = t >= T_FREEZE;
    let jy = 0, sx = 1, sy = 1;
    if (frozen && t < T_FREEZE + 2 / 12) { sx = 0.94; sy = 1.08; jy = -16; }
    ctx.save();
    ctx.translate(HX, GROUND);
    ctx.scale(sx, sy);
    ctx.translate(-HX, -GROUND);
    const a = FILM.cast.hayk(ctx, {
      x: HX, y: GROUND + jy, s: S, t: frozen ? T_FREEZE : tw, pose: 'walk', face: frozen ? 'shocked' : 'smile',
      shades: !frozen, look: [0.6, 0.2],
    });
    ctx.restore();
    const htop = [caseX + Math.sin(caseRot) * 390 * ss, GROUND - 8 + bob - Math.cos(caseRot) * 390 * ss];
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = P.line; ctx.lineWidth = 16;
    ctx.beginPath(); ctx.moveTo(htop[0], htop[1]); ctx.lineTo(a.handL[0], a.handL[1] + 6); ctx.stroke();
    ctx.strokeStyle = '#9aa3b8'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(htop[0], htop[1]); ctx.lineTo(a.handL[0], a.handL[1] + 6); ctx.stroke();
    ctx.restore();

    if (frozen) {
      if (t < T_IMPACT_END) {
        // glasses slide down the nose
        const u = L.ease.inOutSine(clamp((t - T_FREEZE - 0.08) / 0.3));
        shades(ctx, a.head, K, lerp(0, 24, u), lerp(0, 0.1, u));
      } else {
        // after the impact they drop off his face, tumbling
        const age = t - T_IMPACT_END;
        const fy = 24 + 900 * age * age + 120 * age;
        shades(ctx, a.head, K, fy, 0.1 + age * 5, age * 60);
      }
      // "!" pop and shock ticks
      const pop = F.popIn(t, T_FREEZE);
      F.text(ctx, '!', a.top[0] + 120, a.top[1] - 40, { size: 150, fill: '#ff3b3b', lw: 14, scale: pop, rot: 0.15 });
      ctx.save();
      ctx.strokeStyle = P.line; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const an = -2.4 + i * 0.35;
        const r0 = 170 + (L.boil(L.T) % 2) * 8;
        ctx.moveTo(a.head[0] + Math.cos(an) * r0, a.head[1] + Math.sin(an) * r0);
        ctx.lineTo(a.head[0] + Math.cos(an) * (r0 + 60), a.head[1] + Math.sin(an) * (r0 + 60));
      }
      ctx.stroke();
      ctx.restore();
      F.sweat(ctx, a.head[0] + 105, a.head[1] - 50, 1.1);
    } else {
      // walking: dust puffs on steps
      for (let k = 0; k < 3; k++) F.dust(ctx, HX - 40 + k * 10, GROUND, t - k * 0.5, { n: 4, size: 22, spread: 70, seed: 30 + k, life: 0.45 });
    }
    // sniff
    F.sfx(ctx, 'SNIFF', nose[0] + 230, nose[1] - 170, t, 0.9, { size: 56, life: 0.5, rot: 0.1, fill: '#fff3b0', shadowColor: '#e0961a' });

    // foreground palms (scroll faster)
    palm(ctx, 1010 - (camX - 70) * 1.25 - 88, 1900, 1180, t + 4, 5, 1.0);
    palm(ctx, -40 - (camX - 70) * 1.25 - 88, 1960, 900, t + 4, 9, 0.9);
    aromaRibbon(ctx, pts, t, rev, { amp: 18 });
    ctx.restore();

    // screen-fixed menace once shocked
    if (t >= T_IMPACT_END) {
      F.menace(ctx, 150, 1350, t, { size: 110, n: 4, seed: 3 });
      F.menace(ctx, 940, 1300, t, { size: 90, n: 3, seed: 8 });
    }
    return a;
  }

  function drawImpact(ctx, t) {
    const z = 1.32;
    const zc = [HX, HEAD_Y + 40];
    ctx.save();
    const sh = F.shake(t, T_IMPACT, 0.17, 26, 6);
    ctx.translate(sh[0], sh[1]);
    F.impact(ctx, { cx: HX, cy: HEAD_Y, inner: 380, seed: 12 });
    ctx.translate(zc[0], zc[1]);
    ctx.scale(z, z);
    ctx.translate(-zc[0], -zc[1]);
    const a = FILM.cast.hayk(ctx, { x: HX, y: GROUND, s: S, t: T_FREEZE, pose: 'walk', face: 'shocked', silhouette: '#0a0a10' });
    // wide white eyes on the silhouette
    [a.eyeL, a.eyeR].forEach((e) => {
      ellipse(ctx, e[0], e[1], 30 * K, 36 * K); fo(ctx, '#ffffff', 0);
      ellipse(ctx, e[0], e[1] + 4, 5 * K, 6 * K); fo(ctx, '#0a0a10', 0);
    });
    ctx.restore();
    F.text(ctx, 'ドン', 830, 420, { size: 170, fill: '#0a0a10', stroke: '#ffffff', lw: 18, rot: 0.2, font: 'jp' });
  }

  function drawXCU(ctx, t, tw) {
    const u = t - T_XCU;
    const S2 = 10.5;
    const K2 = S2 * 1.15;
    const HC = [540, 870]; // head centre on screen
    const push = 1 + 0.07 * L.ease.inOutSine(clamp(u / 2));
    const sh = F.shakeMany(t, [[T_XCU, 0.3, 24], [T_SHOUT, 0.5, 20]], 9);
    const tremble = [(hs('tr', L.boil(L.T)) - 0.5) * 6, (hs('tr2', L.boil(L.T)) - 0.5) * 6];

    ctx.save();
    ctx.translate(HC[0] + sh[0] + tremble[0], HC[1] + sh[1] + tremble[1]);
    ctx.scale(push, push);
    ctx.translate(-HC[0], -HC[1]);
    // backdrop (only shows at the edges)
    F.sky(ctx, '#3b1d6e', '#e0961a', { x: -300, y: -300, w: 1700, h: 2500 });
    const a = FILM.cast.hayk(ctx, { x: HC[0], y: HC[1] + 462 * S2, s: S2, t: tw, pose: 'stand', face: 'shocked' });
    eyeReflect(ctx, a.eyeL, K2, t, 0);
    eyeReflect(ctx, a.eyeR, K2, t, 1);
    // sweat and blush of desire
    F.sweat(ctx, HC[0] + 440, HC[1] - 390, 3);
    // aroma wisps drifting into the nose
    const nose = [HC[0] + 4 * K2, HC[1] + 24 * K2];
    aromaRibbon(ctx, [[1300, 1640], [1120, 1520], [980, 1560], [860, 1380], [nose[0] + 60, nose[1] + 30]], t, 1, { width: 50, amp: 24, ghost: 0.35 });
    ctx.restore();

    // manga focus lines leaving the eye band clear (screen-fixed)
    F.focusLines(ctx, 540, 930, { rx: 660, ry: 470, count: 130, color: '#1b1424', alpha: 0.9, seed: 33, width: 20 });
    // cut-in flash
    if (u < 2 / 24) F.flash(ctx, 0.8, '#ffffff');

    // menace beside him
    F.menace(ctx, 78, 1470, t, { size: 88, n: 3, seed: 5 });
    F.menace(ctx, 1002, 1450, t, { size: 80, n: 3, seed: 11 });

    // text
    if (t >= T_WAIT) {
      const pop = F.popIn(t, T_WAIT);
      const b = L.boil(L.T);
      F.text(ctx, 'WAIT...', 540 + (hs('wj', b) - 0.5) * 6, 330, { size: 120, fill: '#ffffff', lw: 20, scale: pop, shadow: 10, shadowColor: '#7a3cff', rot: -0.04 });
    }
    F.bubble(ctx, 'IS THAT...\nA BURGER?!', 540, 1320, { size: 70, shout: true, shake: 12, t, t0: T_SHOUT, fill: '#fff05a' });
  }

  // ---------------------------------------------------------------------------
  // Draw
  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      if (t >= T_XCU) drawXCU(ctx, t, tw);
      else if (t >= T_IMPACT && t < T_IMPACT_END) drawImpact(ctx, t);
      else drawStreet(ctx, t, tw);
    },
  });
})();
