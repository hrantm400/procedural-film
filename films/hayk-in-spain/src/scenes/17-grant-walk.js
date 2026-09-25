/*
 * 17 'grant-walk' : Grant walks Goofy through a Yerevan park. Global T 71.0 - 75.0 (4 s).
 *
 * The camera tracks the pair left to right; every layer scrolls at its own parallax factor.
 * Layers, back to front:
 *   1. pastel morning sky, sun glow, clouds                     (factor 0.03)
 *   2. Ararat, hazy lavender in the far distance               (factor 0.05)
 *   3. the Cascade: pink-stone terraces up the hill + obelisk  (factor 0.14)
 *   4. pink tuff city blocks flanking it                        (factor 0.20)
 *   5. round tree line + lamp posts                             (factor 0.45)
 *   6. lawn with mowing stripes, flower beds, benches           (factor 0.75)
 *   7. paved path (tiles) the characters walk on                (factor 1.00)
 *   8. Grant (walk, calm, whistling) + leash + Goofy (walk) trotting ahead, pigeons
 *   9. foreground bushes and flowers                            (factor 1.35)
 *  10. screen overlays: light rays, caption "DAY 1 OF DOG SITTING" (0.5 s), bubble "SEE? PEACEFUL." (2.0 s)
 */
(function () {
  'use strict';
  const ID = 'grant-walk';
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const H01 = (...k) => FILM.fx.h01(ID, ...k);

  const T_CAPTION = 0.5; // T 71.5
  const T_BUBBLE = 2.0; // T 73.0
  const CAM_SPEED = 170; // px/s of path scroll
  const GROUND = 1690; // feet line on the path

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

  function pigeon(ctx, F, x, y, s, t, seed, flee) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const peck = flee > 0 ? 0 : (Math.floor(t * 6 + seed) % 3 === 0 ? 1 : 0);
    ctx.lineJoin = 'round';
    if (flee > 0) {
      // flapping up and away
      const f = Math.floor(t * 12) % 2;
      ctx.beginPath(); ctx.ellipse(0, -22, 26, 16, -0.3, 0, TAU); F.fo(ctx, '#b8bfd6', 4);
      ctx.beginPath(); ctx.moveTo(-6, -30); ctx.lineTo(-30, f ? -70 : -10); ctx.lineTo(10, -30); ctx.closePath(); F.fo(ctx, '#9aa3c2', 4);
      ctx.beginPath(); ctx.arc(22, -36, 11, 0, TAU); F.fo(ctx, '#8d96b8', 4);
    } else {
      ctx.beginPath(); ctx.ellipse(0, -20, 26, 17, 0, 0, TAU); F.fo(ctx, '#b8bfd6', 4);
      ctx.beginPath(); ctx.ellipse(-6, -22, 16, 9, 0.2, 0, TAU); ctx.fillStyle = '#9aa3c2'; ctx.fill();
      ctx.beginPath(); ctx.arc(20, -34 + peck * 16, 11, 0, TAU); F.fo(ctx, '#8d96b8', 4);
      ctx.fillStyle = '#e8a33a'; ctx.beginPath(); ctx.moveTo(30, -36 + peck * 16); ctx.lineTo(38, -32 + peck * 16); ctx.lineTo(30, -30 + peck * 16); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#e07a5a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(-4, 0); ctx.moveTo(6, -4); ctx.lineTo(6, 0); ctx.stroke();
    }
    ctx.restore();
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
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const F = FILM.fx, C = FILM.cast, P = F.pal;
      const L = FILM.lib;
      const camX = t * CAM_SPEED;

      // 1-7 background
      skyLayer(ctx, F, t, camX);
      araratLayer(ctx, F, camX);
      cityLayer(ctx, F, camX);
      cascadeLayer(ctx, F, t, camX);
      treeLayer(ctx, F, t, camX);
      lawnLayer(ctx, F, t, camX);
      pathLayer(ctx, F, camX);
      butterflies(ctx, F, t);
      birds(ctx, t);

      // pigeons on the path (world positions, flee when Goofy gets near)
      const goofyX = 730 + t * 12;
      [[1150, 1560, 0.9, 1], [1320, 1600, 1.0, 2], [1500, 1545, 0.85, 3]].forEach(([wx, wy, s, sd]) => {
        const sx = wx - camX;
        const dist = sx - goofyX;
        const flee = dist < 260 ? clamp((260 - dist) / 260) : 0;
        const fy = wy - flee * 520, fx = sx + flee * 260;
        if (fx < -80 || fx > 1160) return;
        pigeon(ctx, F, fx, fy, s, t, sd, flee);
      });

      // 8. characters: Grant strolls behind, Goofy trots ahead on the leash
      const tw = L.onTwos(t);
      const grantX = 250 + t * 12;
      const ga = C.grant(ctx, { x: grantX, y: GROUND, s: 1.3, pose: 'walk', face: 'calm', t: tw });
      const gy = GROUND + 18;
      const da = C.goofy(ctx, { x: goofyX, y: gy, s: 1.5, pose: 'walk', face: 'neutral', t: tw, look: [0.6, 0] });
      F.leash(ctx, da.collar, ga.handR, { sag: 70 });
      // happy trot sparkles near Goofy
      F.sparkles(ctx, { x: goofyX - 60, y: gy - 480, w: 380, h: 220, n: 4, seed: 1702, t, size: 22 });

      // whistle notes from Grant's mouth
      F.notes(ctx, ga.mouth[0] + 80, ga.mouth[1] - 30, t, { n: 4, seed: 1703, color: '#ffe14a', size: 86, rise: 300 });

      // 9. foreground
      foregroundLayer(ctx, F, t, camX);

      // 10. morning light rays + soft warm wash
      ctx.save();
      ctx.globalAlpha = 0.14 + 0.03 * Math.sin(t * 2);
      ctx.fillStyle = '#fff4c8';
      ctx.beginPath();
      [[0.1, 0.05], [0.3, 0.04], [0.55, 0.06]].forEach(([a, w]) => {
        const a0 = 0.35 + a, a1 = a0 + w;
        ctx.moveTo(170, 330);
        ctx.lineTo(170 + Math.cos(a0) * 2400, 330 + Math.sin(a0) * 2400);
        ctx.lineTo(170 + Math.cos(a1) * 2400, 330 + Math.sin(a1) * 2400);
        ctx.closePath();
      });
      ctx.fill();
      ctx.restore();

      // caption and bubble (screen fixed)
      F.caption(ctx, 'DAY 1 OF DOG SITTING', 90, 300, { size: 58, t, t0: T_CAPTION, from: 'left', accent: '#ff8fb3' });
      if (t >= T_BUBBLE) {
        const bx = 470, by = 640;
        F.bubble(ctx, 'SEE? PEACEFUL.', bx, by, { size: 58, t, t0: T_BUBBLE, tail: [ga.head[0] + 20, ga.top[1] - 10] });
      }
      F.sparkles(ctx, { x: 80, y: 420, w: 900, h: 500, n: 5, seed: 1704, t, size: 20 });
    },
  });
})();
