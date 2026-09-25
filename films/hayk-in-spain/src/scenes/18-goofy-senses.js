/*
 * 18 'goofy-senses' : Goofy senses a stranger. Global T 75.0 - 79.0 (4 s).
 *
 * Same Yerevan park as 17-grant-walk (the park helpers below are a copy of that file's layout,
 * held at the camera position where 17 ends). Static camera with a slow push-in.
 * Layers, back to front:
 *   1. park background: sky, Ararat, city, Cascade, tree line, lawn + benches, path
 *   2. demon mode (from 1.0 s): dark purple wash, red backlight behind Goofy, purple aura
 *   3. the stranger: a flat silhouette jogger with a small white poodle, entering from the right
 *   4. Grant (stand; calm -> nervous at 1.0 s, sweat, tremble) behind, leash, Goofy (stand;
 *      neutral -> angry at 1.0 s: glowing eyes, bristling fur), "!" mark on the stop
 *   5. menace glyphs ゴゴゴゴ rising around Goofy, foreground bushes
 *   6. 1.0 s impact frame (2 frames), bubble "UH-OH." from Grant at 2.5 s
 *   7. 3.0 s cut: extreme close-up letterbox strip on Goofy's glowing eyes (the bubble holds)
 */
(function () {
  'use strict';
  const ID = 'goofy-senses';
  const TAU = Math.PI * 2;
  const FR = 1 / 24;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const H01 = (...k) => FILM.fx.h01(ID, ...k);

  const T_STOP = 0.0; // T 75.0 Goofy stops dead
  const T_ANGRY = 1.0; // T 76.0 demon mode
  const T_UHOH = 2.5; // T 77.5 Grant's bubble
  const T_EYES = 3.0; // T 78.0 extreme close-up
  const CAM_X = 680; // where 17-grant-walk's camera ends (4 s * 170 px/s)
  const GROUND = 1700;

  // ---------------------------------------------------------------------------
  // Park background (shared layout with 18-goofy-senses; camX = path scroll in px)
  // ---------------------------------------------------------------------------
  const PINK = '#e8b8a0', PINK_HI = '#f6d6c6', PINK_SH = '#c9917b', PINK_DK = '#a8705e';

  function wrapX(x, period) { return ((x % period) + period) % period; }

  function skyLayer(ctx, F, t, camX) {
    F.sky(ctx, '#8fcfff', '#ffe4dc', { h: 1300, mid: '#cdeeff', midAt: 0.55 });
    // morning sun glow top-left
    const g = ctx.createRadialGradient(170, 330, 20, 170, 330, 620);
    g.addColorStop(0, 'rgba(255,250,215,0.95)');
    g.addColorStop(0.25, 'rgba(255,236,190,0.55)');
    g.addColorStop(1, 'rgba(255,236,190,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1080, 1300);
    ctx.fillStyle = '#fffbe6';
    ctx.beginPath(); ctx.arc(170, 330, 62, 0, TAU); ctx.fill();
    ctx.save();
    ctx.translate(-camX * 0.03, 0);
    F.clouds(ctx, { n: 5, seed: 1701, t, y: 180, h: 420, speed: 10, scale: 0.8, shade: 'rgba(255,200,210,0.45)' });
    ctx.restore();
  }

  function araratLayer(ctx, F, camX) {
    const x = -170 - camX * 0.05;
    F.ararat(ctx, x, 1060, 940, 360, { color: '#b3b8e6', shade: '#a2a8da', snow: '#ffffff' });
    // haze band at its foot
    const g = ctx.createLinearGradient(0, 940, 0, 1070);
    g.addColorStop(0, 'rgba(255,228,220,0)');
    g.addColorStop(1, 'rgba(255,228,220,0.8)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 940, 1080, 130);
  }

  function cascadeLayer(ctx, F, t, camX) {
    const cx = 660 - camX * 0.14;
    ctx.save();
    ctx.lineJoin = 'round';
    // green hillside the stairs climb
    ctx.beginPath();
    ctx.moveTo(cx - 760, 1180);
    ctx.bezierCurveTo(cx - 420, 960, cx - 220, 830, cx, 815);
    ctx.bezierCurveTo(cx + 240, 830, cx + 440, 960, cx + 780, 1180);
    ctx.closePath();
    ctx.fillStyle = '#86bf78';
    ctx.fill();
    ctx.strokeStyle = 'rgba(27,20,36,0.45)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#76b06a';
    for (let k = 0; k < 11; k++) {
      const u = k / 10;
      const bx = cx - 640 + u * 1280, by = 1150 - Math.sin(u * Math.PI) * 270;
      ctx.beginPath(); ctx.arc(bx, by, 30 + (k % 3) * 10, 0, TAU); ctx.fill();
    }
    // obelisk monument at the top
    ctx.beginPath();
    ctx.moveTo(cx - 20, 880); ctx.lineTo(cx - 7, 700); ctx.lineTo(cx, 682); ctx.lineTo(cx + 7, 700); ctx.lineTo(cx + 20, 880); ctx.closePath();
    ctx.fillStyle = PINK_HI; ctx.fill();
    ctx.strokeStyle = 'rgba(27,20,36,0.6)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = PINK_SH;
    ctx.beginPath(); ctx.moveTo(cx, 684); ctx.lineTo(cx + 7, 700); ctx.lineTo(cx + 20, 880); ctx.lineTo(cx + 3, 880); ctx.closePath(); ctx.fill();
    // stepped terraces, top to bottom
    const tiers = 6;
    for (let i = 0; i < tiers; i++) {
      const u = i / (tiers - 1);
      const w = lerp(260, 820, u), h = lerp(42, 62, u);
      const yb = lerp(910, 1180, u);
      const x0 = cx - w / 2;
      ctx.beginPath(); ctx.rect(x0, yb - h, w, h);
      ctx.fillStyle = PINK; ctx.fill();
      ctx.strokeStyle = 'rgba(27,20,36,0.55)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = PINK_HI; ctx.fillRect(x0 + 2, yb - h + 2, w - 4, 9);
      // arched niches
      const n = Math.max(3, Math.floor(w / 62));
      ctx.fillStyle = PINK_SH;
      for (let k = 0; k < n; k++) {
        const ax = x0 + (k + 0.5) * (w / n);
        if (Math.abs(ax - cx) < 50) continue;
        const aw = 11, ah = h * 0.42;
        ctx.beginPath();
        ctx.moveTo(ax - aw, yb - 6); ctx.lineTo(ax - aw, yb - ah); ctx.arc(ax, yb - ah, aw, Math.PI, 0); ctx.lineTo(ax + aw, yb - 6); ctx.closePath();
        ctx.fill();
      }
      // flower bed dots on the ledge
      ctx.fillStyle = i % 2 ? '#ff8fb3' : '#ffd45c';
      for (let k = 0; k < 8; k++) {
        const fx = x0 + 14 + k * ((w - 28) / 7);
        if (Math.abs(fx - cx) < 50) continue;
        ctx.beginPath(); ctx.arc(fx, yb - h + 1, 5, 0, TAU); ctx.fill();
      }
      // central stair run
      ctx.fillStyle = '#fbe4d7';
      ctx.fillRect(cx - 34, yb - h, 68, h);
      ctx.strokeStyle = PINK_SH; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let s = 1; s < 5; s++) { const sy = yb - h + (h / 5) * s; ctx.moveTo(cx - 34, sy); ctx.lineTo(cx + 34, sy); }
      ctx.stroke();
      // tiny fountain spray on each ledge, bobbing
      const ph = ((t * 1.6 + i * 0.37) % 1 + 1) % 1;
      ctx.fillStyle = 'rgba(200,240,255,0.9)';
      ctx.beginPath();
      ctx.ellipse(cx - 58, yb - h - 4 - ph * 8, 7, 5 + ph * 5, 0, 0, TAU);
      ctx.ellipse(cx + 58, yb - h - 4 - ((ph + 0.5) % 1) * 8, 7, 5 + ((ph + 0.5) % 1) * 5, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function cityLayer(ctx, F, camX) {
    const off = -camX * 0.2;
    const blocks = [
      [-620, 250, 170], [-420, 200, 230], [-230, 150, 190], [700, 220, 210], [900, 180, 250], [1100, 240, 190], [1330, 200, 220], [1560, 220, 180],
    ];
    ctx.save();
    blocks.forEach(([bx, bw, bh], i) => {
      const x = bx + off;
      if (x > 1120 || x + bw < -40) return;
      const y = 1190 - bh;
      ctx.fillStyle = i % 2 ? '#eec3ad' : '#e2ac96';
      ctx.fillRect(x, y, bw, bh);
      ctx.strokeStyle = 'rgba(27,20,36,0.4)'; ctx.lineWidth = 3; ctx.strokeRect(x, y, bw, bh);
      // cornice + windows with balconies
      ctx.fillStyle = PINK_HI; ctx.fillRect(x - 6, y - 8, bw + 12, 12);
      ctx.fillStyle = '#9fb6d8';
      for (let r = 0; r < Math.floor((bh - 30) / 44); r++) {
        for (let c = 0; c < Math.floor(bw / 44); c++) {
          const wx = x + 14 + c * 44, wy = y + 22 + r * 44;
          ctx.fillRect(wx, wy, 20, 26);
        }
      }
      ctx.fillStyle = PINK_DK;
      for (let r = 0; r < Math.floor((bh - 30) / 44); r++) ctx.fillRect(x + 8, y + 48 + r * 44, bw - 16, 4);
    });
    ctx.restore();
  }

  function roundTree(ctx, F, x, y, r, seed) {
    const P = F.pal;
    // trunk
    ctx.beginPath();
    ctx.moveTo(x - 10, y); ctx.lineTo(x - 7, y - r * 0.9); ctx.lineTo(x + 7, y - r * 0.9); ctx.lineTo(x + 10, y); ctx.closePath();
    F.fo(ctx, P.trunk, 4);
    // canopy: a few overlapping balls
    const cy = y - r * 1.25;
    ctx.beginPath();
    ctx.arc(x - r * 0.45, cy + r * 0.15, r * 0.62, 0, TAU);
    ctx.arc(x + r * 0.45, cy + r * 0.12, r * 0.66, 0, TAU);
    ctx.arc(x, cy - r * 0.3, r * 0.72, 0, TAU);
    ctx.fillStyle = P.tree; ctx.fill();
    // outline via a single silhouette stroke underneath trick: stroke each arc lightly
    ctx.strokeStyle = 'rgba(27,20,36,0.75)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x - r * 0.45, cy + r * 0.15, r * 0.62, Math.PI * 0.45, Math.PI * 1.35); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + r * 0.45, cy + r * 0.12, r * 0.66, -Math.PI * 0.4, Math.PI * 0.55); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, cy - r * 0.3, r * 0.72, Math.PI * 1.1, Math.PI * 1.95); ctx.stroke();
    // shade + highlight
    ctx.fillStyle = P.treeShade;
    ctx.beginPath(); ctx.ellipse(x + r * 0.3, cy + r * 0.38, r * 0.55, r * 0.3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#7cc56a';
    ctx.beginPath(); ctx.ellipse(x - r * 0.25, cy - r * 0.55, r * 0.28, r * 0.16, -0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.25;
    ctx.beginPath(); ctx.ellipse(x - r * 0.35, cy - r * 0.62, r * 0.12, r * 0.07, -0.4, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function treeLayer(ctx, F, t, camX) {
    const P = F.pal;
    const off = camX * 0.45;
    const period = 1500;
    // back hedge band
    ctx.fillStyle = '#6aa860';
    ctx.fillRect(-20, 1170, 1120, 50);
    const trees = [[20, 100], [330, 84], [590, 76], [860, 104], [1110, 88], [1340, 96]];
    trees.forEach(([tx, r], i) => {
      const x = wrapX(tx - off + 200, period) - 200;
      if (x < -250 || x > 1330) return;
      roundTree(ctx, F, x, 1225, r, i);
    });
    // lamp posts between trees
    const lamps = [170, 680, 1190];
    lamps.forEach((lx) => {
      const x = wrapX(lx - off + 200, period) - 200;
      if (x < -60 || x > 1140) return;
      ctx.fillStyle = '#3b3550';
      ctx.fillRect(x - 5, 1010, 10, 220);
      ctx.beginPath(); ctx.moveTo(x - 20, 1010); ctx.lineTo(x + 20, 1010); ctx.lineTo(x + 12, 972); ctx.lineTo(x - 12, 972); ctx.closePath();
      F.fo(ctx, '#fff3c4', 3);
      ctx.fillStyle = '#3b3550';
      ctx.fillRect(x - 16, 964, 32, 9);
    });
  }

  function lawnLayer(ctx, F, t, camX) {
    const P = F.pal;
    // lawn
    ctx.fillStyle = P.grass;
    ctx.fillRect(-20, 1220, 1120, 260);
    // mowing stripes
    const off = camX * 0.75;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    for (let i = -2; i < 14; i++) {
      const x = i * 160 - wrapX(off, 320);
      ctx.moveTo(x, 1220); ctx.lineTo(x + 80, 1220); ctx.lineTo(x + 20, 1480); ctx.lineTo(x - 60, 1480); ctx.closePath();
    }
    ctx.fill();
    // flower beds
    const period = 1400;
    [[120, '#ff8fb3'], [760, '#ffd45c'], [1100, '#b99cff']].forEach(([fx, c], i) => {
      const x = wrapX(fx - off + 200, period) - 200;
      if (x < -200 || x > 1280) return;
      ctx.beginPath(); ctx.ellipse(x, 1262, 110, 22, 0, 0, TAU); F.fo(ctx, '#5a9e40', 3);
      ctx.fillStyle = c;
      for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(x - 88 + k * 22, 1256 + (k % 2) * 8, 7, 0, TAU); ctx.fill(); }
    });
    // benches
    [[420], [1120]].forEach(([bx], i) => {
      const x = wrapX(bx - off + 300, period) - 300;
      if (x < -260 || x > 1340) return;
      bench(ctx, F, x, 1420);
    });
    // path edge curb (top)
    ctx.fillStyle = '#d7b3a0';
    ctx.fillRect(-20, 1466, 1120, 16);
    ctx.strokeStyle = 'rgba(27,20,36,0.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-20, 1466); ctx.lineTo(1100, 1466); ctx.stroke();
  }

  function bench(ctx, F, x, y) {
    const wood = '#c9824a', woodSh = '#9c5e30', iron = '#3b3550';
    ctx.save();
    ctx.lineJoin = 'round';
    // legs
    ctx.fillStyle = iron;
    ctx.fillRect(x - 100, y - 50, 10, 50); ctx.fillRect(x + 90, y - 50, 10, 50);
    // back slats
    for (let k = 0; k < 3; k++) {
      ctx.beginPath(); ctx.rect(x - 110, y - 128 + k * 22, 220, 14); F.fo(ctx, k ? wood : woodSh, 3);
    }
    ctx.fillStyle = iron;
    ctx.fillRect(x - 104, y - 132, 8, 90); ctx.fillRect(x + 96, y - 132, 8, 90);
    // seat
    ctx.beginPath(); ctx.rect(x - 116, y - 58, 232, 16); F.fo(ctx, wood, 3);
    ctx.restore();
  }

  function pathLayer(ctx, F, camX) {
    // paved path in warm pink stone, tile joints scroll at factor 1
    const y0 = 1482, y1 = 1760;
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#f0d2c0'); g.addColorStop(1, '#e4b9a3');
    ctx.fillStyle = g;
    ctx.fillRect(-20, y0, 1120, y1 - y0);
    ctx.strokeStyle = 'rgba(160,100,80,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const rows = [1482, 1540, 1606, 1680, 1760];
    for (let r = 0; r < rows.length - 1; r++) {
      ctx.moveTo(-20, rows[r]); ctx.lineTo(1100, rows[r]);
      const tw = 90 + r * 22;
      const shift = r % 2 ? tw / 2 : 0;
      for (let x = -wrapX(camX * (0.9 + r * 0.08) + shift, tw); x < 1100; x += tw) {
        ctx.moveTo(x, rows[r]); ctx.lineTo(x - (r - 1.5) * 6, rows[r + 1]);
      }
    }
    ctx.stroke();
    // bottom curb + grass verge
    ctx.fillStyle = '#d7b3a0';
    ctx.fillRect(-20, y1, 1120, 18);
    ctx.fillStyle = F.pal.grassShade;
    ctx.fillRect(-20, y1 + 18, 1120, 200);
    ctx.strokeStyle = 'rgba(27,20,36,0.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-20, y1); ctx.lineTo(1100, y1); ctx.stroke();
  }

  function foregroundLayer(ctx, F, t, camX) {
    const off = camX * 1.35;
    const period = 1300;
    const items = [[80, 120], [520, 90], [900, 130]];
    items.forEach(([bx, r], i) => {
      const x = wrapX(bx - off + 200, period) - 200;
      if (x < -200 || x > 1280) return;
      const y = 1920 + 20;
      ctx.beginPath();
      ctx.arc(x - r * 0.6, y - r * 0.5, r * 0.7, 0, TAU);
      ctx.arc(x + r * 0.5, y - r * 0.55, r * 0.75, 0, TAU);
      ctx.arc(x, y - r * 0.95, r * 0.7, 0, TAU);
      ctx.fillStyle = '#3f8a3e'; ctx.fill();
      ctx.fillStyle = '#ff7fa8';
      for (let k = 0; k < 5; k++) {
        const fx = x - r * 0.8 + k * r * 0.4, fy = y - r * (0.7 + 0.5 * H01('ff', i, k));
        ctx.beginPath(); ctx.arc(fx, fy, 10, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(fx, fy, 4, 0, TAU); ctx.fill(); ctx.fillStyle = k % 2 ? '#ff7fa8' : '#ffffff';
      }
    });
  }

  function butterflies(ctx, F, t) {
    for (let i = 0; i < 3; i++) {
      const u = t * 0.4 + i * 0.33;
      const x = 120 + ((i * 310 + t * 60) % 900);
      const y = 1060 + i * 90 + Math.sin(u * 7) * 40;
      const f = Math.abs(Math.sin(t * 18 + i));
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = i % 2 ? '#fff3a0' : '#ffc4dc';
      ctx.strokeStyle = 'rgba(27,20,36,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(-8 * f, -4, 9 * f + 1, 7, -0.4, 0, TAU); ctx.ellipse(8 * f, -4, 9 * f + 1, 7, 0.4, 0, TAU);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  function birds(ctx, t) {
    ctx.save();
    ctx.strokeStyle = 'rgba(60,50,90,0.75)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 4; i++) {
      const x = 380 + i * 90 + t * (70 + i * 8);
      const y = 560 + (i % 2) * 50 - t * 18 + Math.sin(t * 3 + i) * 8;
      const f = Math.floor(t * 8 + i) % 2 ? 10 : -4;
      const w = 16 - i * 1.5;
      ctx.beginPath();
      ctx.moveTo(x - w, y - f); ctx.quadraticCurveTo(x - w * 0.4, y - f * 0.2, x, y + 3); ctx.quadraticCurveTo(x + w * 0.4, y - f * 0.2, x + w, y - f);
      ctx.stroke();
    }
    ctx.restore();
  }


  // ---------------------------------------------------------------------------
  // The stranger: flat silhouette jogger (not a cast member) + small white poodle
  // ---------------------------------------------------------------------------
  function jogger(ctx, x, y, s, t, rim, scared) {
    const ph = t * TAU * 2.4;
    const sw = scared ? 0.5 : Math.sin(ph);
    const bob = scared ? 0 : -Math.abs(Math.cos(ph)) * 14;
    const col = rim ? '#ffb3c4' : '#4b3a66';
    const ex = rim ? 12 : 0;
    const shiver = scared ? (H01('js', Math.floor(t * 24)) - 0.5) * 8 : 0;
    ctx.save();
    ctx.translate(x + shiver, y);
    ctx.scale(-s, s); // local +x = forward = screen left (towards Goofy)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    const limb = (pts, w) => {
      ctx.lineWidth = w + ex;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    };
    const dir = (p, a, l) => [p[0] + Math.sin(a) * l, p[1] + Math.cos(a) * l];
    const hip = [0, -250 + bob];
    const leg = (p) => {
      const th = scared ? p * 0.5 : 0.6 * p;
      const kb = scared ? 0.15 : 0.25 + 1.1 * Math.max(0, -p);
      const knee = dir(hip, th, 125);
      const foot = dir(knee, th - kb, 125);
      limb([hip, knee, foot], 34);
      ctx.beginPath(); ctx.ellipse(foot[0] + 16, foot[1] + 2, 26 + ex / 2, 12 + ex / 2, 0, 0, TAU); ctx.fill();
    };
    const lean = scared ? -46 : 26;
    const sh = [lean, -430 + bob];
    const arm = (p) => {
      const ua = scared ? 2.5 + p * 0.3 : -0.8 * p;
      const el = dir(sh, ua, 88);
      const hd = dir(el, scared ? ua + 0.5 : ua + 1.7, 76);
      limb([sh, el, hd], 26);
      ctx.beginPath(); ctx.arc(hd[0], hd[1], 16 + ex / 2, 0, TAU); ctx.fill();
    };
    leg(-sw);
    arm(sw);
    // torso
    ctx.beginPath();
    ctx.moveTo(hip[0] - 36, hip[1] + 10); ctx.lineTo(hip[0] + 36, hip[1] + 10);
    ctx.lineTo(sh[0] + 40, sh[1] + 6); ctx.lineTo(sh[0] - 40, sh[1] - 4); ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 12 + ex; ctx.stroke();
    leg(sw);
    arm(-sw);
    // head + cap
    const hd = [sh[0] + (scared ? -10 : 16), sh[1] - 62];
    ctx.beginPath(); ctx.arc(hd[0], hd[1], 46 + ex / 2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hd[0] - 40, hd[1] - 22); ctx.lineTo(hd[0] + 74, hd[1] - 20); ctx.lineTo(hd[0] + 50, hd[1] - 6); ctx.lineTo(hd[0] - 40, hd[1] - 4); ctx.closePath(); ctx.fill();
    if (!rim) {
      // white eye glint so the silhouette reads as a face
      ctx.fillStyle = '#ffffff';
      if (scared) { ctx.beginPath(); ctx.arc(hd[0] + 20, hd[1] + 6, 10, 0, TAU); ctx.fill(); }
      else { ctx.beginPath(); ctx.ellipse(hd[0] + 26, hd[1] + 4, 7, 5, 0, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }

  function poodle(ctx, x, y, s, t, scared) {
    const ph = t * TAU * 5;
    const hop = scared ? -Math.abs(Math.sin(t * TAU * 6)) * 10 : -Math.abs(Math.sin(ph / 2)) * 8;
    ctx.save();
    ctx.translate(x, y + hop * s);
    ctx.scale(-s, s); // faces left
    const P = FILM.fx.pal;
    const puff = (px, py, r) => { ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); FILM.fx.fo(ctx, '#ffffff', 4); };
    // legs with pompoms
    ctx.strokeStyle = P.line; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-26, -40); ctx.lineTo(-30 + Math.sin(ph) * 6, -8); ctx.moveTo(26, -40); ctx.lineTo(30 - Math.sin(ph) * 6, -8); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-26, -40); ctx.lineTo(-30 + Math.sin(ph) * 6, -8); ctx.moveTo(26, -40); ctx.lineTo(30 - Math.sin(ph) * 6, -8); ctx.stroke();
    puff(-30 + Math.sin(ph) * 6, -6, 9);
    puff(30 - Math.sin(ph) * 6, -6, 9);
    // body + tail pompom
    ctx.beginPath(); ctx.ellipse(0, -50, 36, 20, 0, 0, TAU); FILM.fx.fo(ctx, '#ffffff', 4);
    puff(-44, -76 + Math.sin(ph) * 3, 12);
    puff(-14, -62, 20);
    // head: fluffy top knot, long snout
    puff(36, -78, 18);
    puff(40, -104, 16);
    ctx.beginPath(); ctx.ellipse(58, -76, 16, 9, 0.1, 0, TAU); FILM.fx.fo(ctx, '#ffffff', 4);
    ctx.fillStyle = P.line;
    ctx.beginPath(); ctx.arc(72, -77, 4.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(40, -82, 3.5, 0, TAU); ctx.fill();
    // pink bow
    ctx.beginPath(); ctx.moveTo(40, -118); ctx.lineTo(28, -128); ctx.lineTo(28, -110); ctx.closePath(); ctx.moveTo(40, -118); ctx.lineTo(52, -128); ctx.lineTo(52, -110); ctx.closePath();
    FILM.fx.fo(ctx, '#ff8fb3', 3);
    ctx.restore();
  }

  // "!" surprise mark
  function bang(ctx, F, x, y, t, t0, s = 1) {
    const k = F.popIn(t, t0);
    if (k <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k * s, k * s);
    ctx.rotate(0.12);
    ctx.beginPath();
    ctx.moveTo(-18, -80); ctx.lineTo(18, -80); ctx.lineTo(8, 10); ctx.lineTo(-8, 10); ctx.closePath();
    F.fo(ctx, '#ff3b3b', 6);
    ctx.beginPath(); ctx.arc(0, 36, 13, 0, TAU); F.fo(ctx, '#ff3b3b', 6);
    // side ticks
    ctx.strokeStyle = F.pal.line; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-40, -60); ctx.lineTo(-58, -76); ctx.moveTo(40, -60); ctx.lineTo(58, -76); ctx.moveTo(-46, -22); ctx.lineTo(-66, -22); ctx.moveTo(46, -22); ctx.lineTo(66, -22); ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Wide shot (0 - 3 s)
  // ---------------------------------------------------------------------------
  function wide(ctx, t, F, C) {
    const L = FILM.lib;
    const tw = L.onTwos(t);
    const angry = t >= T_ANGRY;
    const dark = angry ? clamp((t - T_ANGRY) / (3 * FR) + 1 / 3) : 0;
    const impactFrame = t >= T_ANGRY - 1e-6 && t < T_ANGRY + 2 * FR;

    // camera: slow push-in toward Goofy, harder after the turn, shake on the impact
    const push = 1 + 0.03 * clamp(t / T_ANGRY) + 0.06 * L.ease.outCubic(clamp((t - T_ANGRY) / 1.6));
    const [sx, sy] = F.shakeMany(t, [[T_ANGRY, 0.5, 26], [T_STOP, 0.15, 8]], 1801);
    ctx.save();
    ctx.translate(540 + sx, 1400 + sy);
    ctx.scale(push, push);
    ctx.translate(-540, -1400);

    if (impactFrame) {
      F.impact(ctx, { cx: 600, cy: 1330, invert: Math.floor((t - T_ANGRY) * 24 + 1e-6) === 1, seed: 1802 });
    } else {
      // 1. park
      skyLayer(ctx, F, t, CAM_X);
      araratLayer(ctx, F, CAM_X);
      cityLayer(ctx, F, CAM_X);
      cascadeLayer(ctx, F, t, CAM_X);
      treeLayer(ctx, F, t, CAM_X);
      lawnLayer(ctx, F, t, CAM_X);
      pathLayer(ctx, F, CAM_X);
      if (!angry) {
        butterflies(ctx, F, t);
        birds(ctx, t);
      }
      // 2. demon mode wash + red backlight + aura
      if (dark > 0) {
        ctx.save();
        ctx.globalAlpha = 0.72 * dark;
        ctx.fillStyle = '#1a0b24';
        ctx.fillRect(-100, -100, 1280, 2120);
        ctx.restore();
        const pulse = 0.85 + 0.15 * F.beatPulse(t, 0.5, 0.2);
        const g = ctx.createRadialGradient(560, 1420, 40, 560, 1420, 760);
        g.addColorStop(0, `rgba(255,35,64,${0.8 * dark * pulse})`);
        g.addColorStop(0.45, `rgba(255,70,40,${0.35 * dark * pulse})`);
        g.addColorStop(1, 'rgba(120,0,40,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-100, 400, 1280, 1700);
        F.focusLines(ctx, 600, 1360, { inner: 520, count: 70, color: 'rgba(255,60,80,0.35)', seed: 1803, width: 14 });
        F.aura(ctx, 540, GROUND + 10, 580, 480, t, { color: '#3b1d6e', core: '#7a3cff', alpha: 0.9 * dark, seed: 1804 });
      }
    }

    // 3. stranger + poodle (entering from the right, slowing as they notice)
    const enter = L.ease.outCubic(clamp(t / 0.9));
    const jx = lerp(1240, 905, enter) - Math.max(0, Math.min(t, T_ANGRY + 0.2) - 0.9) * 12;
    const jy = 1530;
    const silAlpha = impactFrame ? 0 : 1;
    if (silAlpha > 0) {
      const scared = t >= T_ANGRY + 0.2;
      if (angry) jogger(ctx, jx, jy, 0.76, t, true, scared);
      jogger(ctx, jx, jy, 0.76, t, false, scared);
      poodle(ctx, jx - 120, jy + 8, 1.25, t, angry);
      if (angry) { F.sweat(ctx, jx - 170, jy - 150, 0.7); bang(ctx, F, jx - 130, jy - 230, t, T_ANGRY + 0.25, 0.6); F.sweat(ctx, jx + 60, jy - 470, 0.8); }
    }

    // 4. Grant behind, frozen; leash; Goofy in front
    const lurch = t < 0.4 ? Math.sin(clamp(t / 0.4) * Math.PI) * 0.1 : 0;
    const tremble = angry ? (H01('tr', Math.floor(t * 24)) - 0.5) * 6 : 0;
    const grantFace = t >= T_ANGRY + 2 * FR ? 'nervous' : 'calm';
    const sil = impactFrame ? (Math.floor((t - T_ANGRY) * 24 + 1e-6) === 1 ? '#ffffff' : '#0a0a10') : null;
    const ga = C.grant(ctx, { x: 200 + tremble, y: GROUND - 60, s: 1.18, pose: 'stand', face: grantFace, t: tw, tilt: lurch, look: [0.8, 0], silhouette: sil });
    const goofyFace = angry ? 'angry' : 'neutral';
    const gx = 430, gy = GROUND + 20;
    const squash = t >= T_ANGRY && t < T_ANGRY + 2 * FR ? 1 : 0;
    // "stops dead": a tiny skid backwards in the first frames
    const skid = t < 0.25 ? (1 - t / 0.25) * 30 : 0;
    ctx.save();
    if (squash) { ctx.translate(gx, gy); ctx.scale(1.06, 0.92); ctx.translate(-gx, -gy); }
    const da = C.goofy(ctx, { x: gx - skid, y: gy, s: 1.65, pose: 'stand', face: goofyFace, t: angry ? tw : 0, look: [1, 0], silhouette: sil });
    ctx.restore();
    F.leash(ctx, da.collar, ga.handR, { sag: angry ? 0 : 50, taut: angry });
    if (!impactFrame) {
      // skid dust at the stop
      F.dust(ctx, gx - 120, gy, t, { n: 6, seed: 1805, size: 40, spread: 160, life: 0.6 });
      F.dust(ctx, gx + 140, gy, t - 0.04, { n: 5, seed: 1806, size: 36, spread: 120, life: 0.6 });
      if (!angry) bang(ctx, F, da.top[0] + 40, da.top[1] - 70, t, 0.08, 1.1);
      // Grant sweat
      if (angry) {
        const drip = ((t - T_ANGRY) * 0.9) % 1;
        F.sweat(ctx, ga.head[0] + 92, ga.head[1] - 40 + drip * 40, 1.3);
        F.sweat(ctx, ga.head[0] - 96, ga.head[1] - 10, 0.9, { flip: true });
        // shiver lines around Grant
        ctx.save();
        ctx.strokeStyle = 'rgba(200,220,255,0.8)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        const b = L.boil(L.T);
        for (let i = 0; i < 3; i++) {
          const yy = ga.chest[1] - 60 + i * 50 + (H01('sv', i, b) - 0.5) * 6;
          ctx.beginPath(); ctx.moveTo(ga.chest[0] - 170, yy); ctx.lineTo(ga.chest[0] - 140, yy - 10); ctx.stroke();
        }
        ctx.restore();
      }
      // 5. menace glyphs + fur bristle sparks
      if (angry) {
        F.menace(ctx, 990, 880, t, { n: 4, size: 96, color: '#b04cff', seed: 1807 });
        F.menace(ctx, 560, 1180, t + 0.3, { n: 3, size: 88, color: '#ff3b5c', seed: 1808 });
      }
    }
    if (!impactFrame) foregroundLayer(ctx, F, t, CAM_X);
    ctx.restore(); // camera

    // screen-fixed vignette in demon mode
    if (dark > 0) F.vignette(ctx, 0.55 * dark, '26,11,36');
    return ga;
  }

  // ---------------------------------------------------------------------------
  // Extreme close-up (3 - 4 s): letterbox strip on the glowing eyes
  // ---------------------------------------------------------------------------
  function closeUp(ctx, t, F, C) {
    const L = FILM.lib;
    const u = t - T_EYES;
    const bandTop = 620, bandBot = 1300;
    // bars: near-black purple with red focus streaks
    ctx.fillStyle = '#1a0b24';
    ctx.fillRect(-20, -20, 1120, 1960);
    F.focusLines(ctx, 540, 960, { inner: 420, count: 80, color: 'rgba(255,35,64,0.55)', seed: 1810, width: 18 });
    // eye strip
    ctx.save();
    ctx.beginPath();
    ctx.rect(-20, bandTop, 1120, bandBot - bandTop);
    ctx.clip();
    const g = ctx.createLinearGradient(0, bandTop, 0, bandBot);
    g.addColorStop(0, '#5a0d22'); g.addColorStop(0.5, '#b3122b'); g.addColorStop(1, '#3b0718');
    ctx.fillStyle = g;
    ctx.fillRect(-20, bandTop, 1120, bandBot - bandTop);
    // slow push-in + tremble
    const s = 10 + u * 3;
    const [jx, jy] = F.shake(t, T_EYES, 1.2, 8, 1811);
    // centre between the eyes: head local (2,-13), head at (92,-175) in the stand pose
    const ex = 540 + jx, ey = 965 + jy;
    const x0 = ex - 94 * s, y0 = ey + 188 * s;
    C.goofy(ctx, { x: x0, y: y0, s, pose: 'stand', face: 'angry', t: 0, look: [0, 0] });
    // extra eye glow + horizontal lens glints
    const eyes = [[ex + (-22 - 2) * s, ey + (-12 + 13) * s], [ex + (26 - 2) * s, ey + (-14 + 13) * s]];
    const fl = 0.75 + 0.25 * Math.sin(Math.floor(t * 12) * 1.9);
    eyes.forEach(([px, py]) => {
      const gg = ctx.createRadialGradient(px, py, 10, px, py, 330);
      gg.addColorStop(0, `rgba(255,240,200,${0.9 * fl})`);
      gg.addColorStop(0.2, `rgba(255,50,60,${0.7 * fl})`);
      gg.addColorStop(1, 'rgba(255,0,40,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(px - 340, py - 340, 680, 680);
      ctx.fillStyle = `rgba(255,230,220,${0.85 * fl})`;
      ctx.beginPath();
      ctx.moveTo(px - 420, py); ctx.lineTo(px, py - 7); ctx.lineTo(px + 420, py); ctx.lineTo(px, py + 7); ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
    // strip borders
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-20, bandTop - 10, 1120, 10);
    ctx.fillRect(-20, bandBot, 1120, 10);
    // menace in the bars
    F.menace(ctx, 950, 560, u, { n: 4, size: 100, color: '#b04cff', seed: 1812 });
    F.menace(ctx, 170, 1470, u + 0.4, { n: 2, size: 96, color: '#ff3b5c', seed: 1813 });
    F.text(ctx, 'ギン', 850, 1420, { size: 110, fill: '#ffe14a', stroke: F.pal.line, lw: 16, rot: -0.2, font: 'jp', scale: F.popIn(t, T_EYES) });
  }

  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const F = FILM.fx, C = FILM.cast;
      let ga = null;
      if (t < T_EYES - 1e-6) ga = wide(ctx, t, F, C);
      else closeUp(ctx, t, F, C);

      // flash on the cut to the eyes
      if (t >= T_EYES - 1e-6 && t < T_EYES + 2 * FR) F.flash(ctx, 0.8 - (t - T_EYES) * 12, '#ff5a6a');

      // bubble "UH-OH." (held through the close-up so it stays readable)
      if (t >= T_UHOH) {
        const inWide = t < T_EYES;
        const tail = inWide && ga ? [ga.head[0] + 30, ga.top[1] - 20] : [140, 640];
        F.bubble(ctx, 'UH-OH.', 330, inWide ? 760 : 420, { size: 72, t, t0: T_UHOH, tail, shake: 5 });
      }
    },
  });
})();
