/*
 * 16 'meanwhile' : "Meanwhile in Yerevan" eyecatch card. Global T 68.0 - 71.0 (3 s).
 *
 * Layers, back to front:
 *   1. diagonal split: deep-blue night half (top-left) with halftone + twinkles,
 *      warm scrolling stripes (bottom-right), white/ink seam band
 *   2. Ararat silhouette across the bottom, the pink-stone Cascade stairs in front of it, tree tufts
 *   3. slam focus burst behind the titles (0.5 s and 1.5 s)
 *   4. "MEANWHILE..." slams in at 0.5 s, "IN YEREVAN" at 1.5 s (Armenian tricolour underline)
 *   5. Goofy head badge with an anger vein pops in the upper-right corner at 2.0 s
 *   6. katakana decoration, white flashes on each slam
 */
(function () {
  'use strict';
  const ID = 'meanwhile';
  const FR = 1 / 24;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;

  const T_MEAN = 0.5; // T 68.5
  const T_YER = 1.5; // T 69.5
  const T_GOOFY = 2.0; // T 70.0

  // diagonal seam: from (0, SEAM_L) to (1080, SEAM_R)
  const SEAM_L = 1600, SEAM_R = 150;
  const seamY = (x) => lerp(SEAM_L, SEAM_R, x / 1080);

  // slam scale: 2.6 -> 0.9 -> 1.04 -> 1 over drawings, visible ON the beat frame
  function slam(t, t0) {
    if (t < t0 - 1e-6) return 0;
    const k = Math.floor((t - t0) * 24 + 1e-6);
    return [2.4, 1.5, 0.92, 1.06, 1.02, 1][Math.min(5, k)];
  }

  function drawHalves(ctx, t, F) {
    const W = 1080, H = 1920;
    // warm stripes (full frame first)
    ctx.save();
    ctx.fillStyle = '#ffb347';
    ctx.fillRect(-60, -60, W + 120, H + 120);
    ctx.fillStyle = '#ff8a3d';
    const off = (t * 140) % 120;
    ctx.beginPath();
    for (let i = -24; i < 30; i++) {
      const x0 = i * 120 + off;
      ctx.moveTo(x0, -60);
      ctx.lineTo(x0 + 60, -60);
      ctx.lineTo(x0 + 60 - 1400, H + 60);
      ctx.lineTo(x0 - 1400, H + 60);
      ctx.closePath();
    }
    ctx.fill();
    // soft warm glow toward the corner
    const g = ctx.createRadialGradient(W, H * 0.62, 50, W, H * 0.62, 900);
    g.addColorStop(0, 'rgba(255,240,170,0.55)');
    g.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // deep blue half (top-left of the seam)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-60, -60);
    ctx.lineTo(W + 60, -60);
    ctx.lineTo(W + 60, seamY(W + 60));
    ctx.lineTo(-60, seamY(-60));
    ctx.closePath();
    ctx.clip();
    F.sky(ctx, '#0d1747', '#2a48b8', { x: -60, y: -60, w: W + 120, h: H * 0.85, mid: '#1a2c7c', midAt: 0.5 });
    F.halftone(ctx, { x: 0, y: 700, w: W, h: 900, color: 'rgba(120,160,255,0.35)', step: 30, dir: 'down' });
    F.stars(ctx, { n: 60, seed: 161, x: 20, y: 90, w: 1040, h: 900 });
    F.sparkles(ctx, { x: 60, y: 120, w: 900, h: 700, n: 8, seed: 162, t, size: 30 });
    ctx.restore();

    // seam band: ink - white - ink
    ctx.save();
    ctx.lineCap = 'butt';
    const seamLine = (w, c, dy) => {
      ctx.beginPath();
      ctx.moveTo(-60, seamY(-60) + dy);
      ctx.lineTo(W + 60, seamY(W + 60) + dy);
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.stroke();
    };
    seamLine(46, F.pal.line, 0);
    seamLine(26, '#ffffff', 0);
    seamLine(6, '#ffd84a', 0);
    ctx.restore();
  }

  function drawCascade(ctx, t, F) {
    const P = F.pal;
    const W = 1080;
    // Ararat: big pale silhouette behind everything low
    F.ararat(ctx, -120, 1560, 1320, 560, { color: '#5d6bb0', shade: '#4a5796', snow: '#eef2ff' });

    // the Cascade: stepped pink-stone terraces climbing a green hill to an obelisk
    const cx = 560;
    ctx.fillStyle = '#4f8f52';
    ctx.beginPath();
    ctx.moveTo(-60, 1500);
    ctx.bezierCurveTo(200, 1260, 380, 1150, cx, 1150);
    ctx.bezierCurveTo(760, 1150, 900, 1250, W + 60, 1440);
    ctx.lineTo(W + 60, 1700); ctx.lineTo(-60, 1700); ctx.closePath();
    F.fo(ctx, '#4f8f52', 4);
    ctx.fillStyle = '#6aa85e';
    for (let k = 0; k < 9; k++) {
      const bx2 = 40 + k * 125, by2 = 1440 - Math.sin((k / 8) * Math.PI) * 230;
      ctx.beginPath(); ctx.arc(bx2, by2, 34 + (k % 3) * 10, 0, Math.PI * 2); ctx.fill();
    }
    const tiers = [
      { y: 1560, w: 900, h: 90 },
      { y: 1470, w: 760, h: 86 },
      { y: 1384, w: 630, h: 80 },
      { y: 1304, w: 510, h: 74 },
      { y: 1230, w: 400, h: 68 },
    ];
    // obelisk / monument on top
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - 34, 1164);
    ctx.lineTo(cx - 14, 900);
    ctx.lineTo(cx, 870);
    ctx.lineTo(cx + 14, 900);
    ctx.lineTo(cx + 34, 1164);
    ctx.closePath();
    F.fo(ctx, '#f3d2c0', 5);
    ctx.fillStyle = '#d99b85';
    ctx.beginPath(); ctx.moveTo(cx, 872); ctx.lineTo(cx + 14, 900); ctx.lineTo(cx + 34, 1164); ctx.lineTo(cx + 4, 1164); ctx.closePath(); ctx.fill();
    ctx.restore();
    tiers.slice().reverse().forEach((tr, ri) => {
      const i = tiers.length - 1 - ri;
      const x0 = cx - tr.w / 2;
      // block
      ctx.beginPath();
      ctx.rect(x0, tr.y - tr.h, tr.w, tr.h);
      F.fo(ctx, '#e8b8a0', 5);
      // top ledge
      ctx.fillStyle = '#f6d4c2';
      ctx.fillRect(x0 + 3, tr.y - tr.h + 3, tr.w - 6, 12);
      // arches along the face
      const n = Math.max(3, Math.floor(tr.w / 70));
      ctx.fillStyle = '#b97763';
      for (let k = 0; k < n; k++) {
        const ax = x0 + (k + 0.5) * (tr.w / n);
        if (Math.abs(ax - cx) < 60) continue;
        const aw = 18, ah = tr.h * 0.5;
        ctx.beginPath();
        ctx.moveTo(ax - aw, tr.y - 8);
        ctx.lineTo(ax - aw, tr.y - ah);
        ctx.arc(ax, tr.y - ah, aw, Math.PI, 0);
        ctx.lineTo(ax + aw, tr.y - 8);
        ctx.closePath();
        ctx.fill();
      }
      // flower beds on the ledge
      ctx.fillStyle = i % 2 ? '#ff7fa8' : '#ffd24a';
      for (let k = 0; k < 6; k++) {
        const fx = x0 + 20 + k * ((tr.w - 40) / 5);
        if (Math.abs(fx - cx) < 60) continue;
        ctx.beginPath(); ctx.arc(fx, tr.y - tr.h + 2, 7, 0, Math.PI * 2); ctx.fill();
      }
      // central staircase + water
      ctx.beginPath();
      ctx.rect(cx - 44, tr.y - tr.h, 88, tr.h);
      F.fo(ctx, '#f7dccd', 4);
      ctx.strokeStyle = '#c98f7a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let s = 1; s < 6; s++) {
        const sy = tr.y - tr.h + (tr.h / 6) * s;
        ctx.moveTo(cx - 42, sy); ctx.lineTo(cx + 42, sy);
      }
      ctx.stroke();
      // fountain spark on each tier
      const ph = (t * 2 + i * 0.3) % 1;
      ctx.fillStyle = 'rgba(190,235,255,0.9)';
      ctx.beginPath();
      ctx.ellipse(cx - 70, tr.y - tr.h - 6 - ph * 10, 10, 6 + ph * 6, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 70, tr.y - tr.h - 6 - ((ph + 0.5) % 1) * 10, 10, 6 + ((ph + 0.5) % 1) * 6, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    // flanking round trees (flat, soft)
    const tree = (x, y, r, c, c2) => {
      ctx.fillStyle = P.trunk;
      ctx.fillRect(x - 8, y - r * 0.2, 16, r * 0.9);
      ctx.beginPath();
      ctx.arc(x, y - r * 0.6, r, 0, Math.PI * 2);
      F.fo(ctx, c, 4);
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.4, r * 0.62, 0, Math.PI * 2); ctx.fill();
    };
    tree(70, 1620, 120, P.tree, P.treeShade);
    tree(200, 1660, 90, '#63b05a', P.tree);
    tree(W - 60, 1610, 130, P.tree, P.treeShade);
    tree(W - 210, 1670, 92, '#63b05a', P.tree);
    // ground strip at the very bottom
    ctx.fillStyle = P.grass;
    ctx.fillRect(-60, 1640, W + 120, 400);
    ctx.fillStyle = P.grassShade;
    ctx.fillRect(-60, 1640, W + 120, 14);
    ctx.fillStyle = '#f1d9c6';
    ctx.beginPath();
    ctx.moveTo(cx - 60, 1640); ctx.lineTo(cx + 60, 1640); ctx.lineTo(cx + 180, 1920); ctx.lineTo(cx - 180, 1920); ctx.closePath();
    F.fo(ctx, '#f1d9c6', 4);
  }

  function goofyBadge(ctx, t, F, C) {
    const sc = F.popIn(t, T_GOOFY);
    if (sc <= 0) return;
    const bx = 790, by = 390, R = 165;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(0.12 + Math.sin(t * 9) * 0.03);
    ctx.scale(sc, sc);
    // spiky red backing
    F.burst(ctx, 0, 0, R * 1.32, R * 1.08, 16, '#ff3b3b', { lw: 6 });
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    F.fo(ctx, '#fff6e3', 7);
    // clip the dog so only the head shows inside the circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R - 4, 0, Math.PI * 2);
    ctx.clip();
    // speed lines inside
    F.focusLines(ctx, 0, 0, { inner: 90, count: 40, color: 'rgba(255,90,60,0.5)', seed: 163, width: 10 });
    // goofy sit pose: head centre sits at local (40, -190) * s
    const s = 1.55;
    C.goofy(ctx, { x: -40 * s - 10, y: 190 * s + 10, s, pose: 'sit', face: 'angry', t, look: [0.4, 0] });
    ctx.restore();
    // vein on the badge edge
    const vp = 1 + 0.18 * F.beatPulse(t, 0.25, 0.08);
    F.vein(ctx, 92, -92, 1.6 * vp);
    ctx.restore();
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const F = FILM.fx, C = FILM.cast, P = F.pal;
      const W = 1080;

      // camera shake on slams
      const [sx, sy] = F.shakeMany(t, [[T_MEAN, 0.3, 26], [T_YER, 0.3, 20], [T_GOOFY, 0.2, 10]], 1601);
      // slow push-in over the whole card
      const zoom = 1 + 0.035 * (t / info.dur);
      ctx.save();
      ctx.translate(540 + sx, 960 + sy);
      ctx.scale(zoom, zoom);
      ctx.translate(-540, -960);

      // 1. halves
      drawHalves(ctx, t, F);
      // 2. Ararat + Cascade
      drawCascade(ctx, t, F);

      // katakana decoration on the blue side (vertical)
      ctx.save();
      const kata = ['イ', 'ェ', 'レ', 'バ', 'ン'];
      kata.forEach((k, i) => {
        F.text(ctx, k, 96, 300 + i * 78, { size: 62, fill: 'rgba(255,255,255,0.85)', lw: 0, font: 'jp' });
      });
      ctx.restore();

      // 3. slam bursts behind the titles
      const burstAge = t >= T_YER ? t - T_YER : t - T_MEAN;
      if (t >= T_MEAN) {
        const fade = clamp(1 - burstAge / 0.6);
        if (fade > 0) {
          F.focusLines(ctx, 540, 820, { inner: 330, count: 90, color: '#ffffff', alpha: 0.85 * fade, seed: 164, width: 18 });
        }
        F.shockRing(ctx, 540, 760, t - T_MEAN, { r: 700, life: 0.4, width: 30 });
        F.shockRing(ctx, 540, 940, t - T_YER, { r: 600, life: 0.4, width: 26, color: '#ffe14a' });
      }
      ctx.restore(); // camera

      // 4. titles (screen fixed, shaken)
      ctx.save();
      ctx.translate(sx * 0.6, sy * 0.6);
      const s1 = slam(t, T_MEAN);
      if (s1 > 0) {
        const bob = Math.sin(Math.floor(t * 12) * 0.9) * 2;
        F.text(ctx, 'MEANWHILE...', 540, 760 + bob, {
          size: 124, fill: '#ffffff', stroke: P.line, lw: 22, rot: -0.1, scale: s1, skew: -0.14,
          shadow: 14, shadowColor: '#e5323a',
        });
        if (t - T_MEAN < 0.35) F.text(ctx, 'ドン', 330, 600, { size: 90, fill: '#ffe14a', stroke: P.line, lw: 14, rot: -0.3, font: 'jp', scale: F.popIn(t, T_MEAN) });
      }
      const s2 = slam(t, T_YER);
      if (s2 > 0) {
        ctx.save();
        ctx.translate(540, 950);
        ctx.rotate(-0.1);
        ctx.scale(s2, s2);
        // Armenian tricolour underline bar
        const bw = 640;
        [['#d90012', -22], ['#0033a0', 0], ['#f2a800', 22]].forEach(([c, dy]) => {
          ctx.fillStyle = c;
          ctx.fillRect(-bw / 2, 66 + dy, bw, 22);
        });
        ctx.strokeStyle = P.line;
        ctx.lineWidth = 6;
        ctx.strokeRect(-bw / 2, 44, bw, 66);
        F.text(ctx, 'IN YEREVAN', 0, 0, { size: 96, fill: '#ffe14a', stroke: P.line, lw: 18, skew: -0.14, shadow: 10, shadowColor: '#b3122b' });
        ctx.restore();
        if (t - T_YER < 0.35) F.text(ctx, 'ドン', 880, 1090, { size: 80, fill: '#ffffff', stroke: P.line, lw: 12, rot: 0.25, font: 'jp', scale: F.popIn(t, T_YER) });
      }
      ctx.restore();

      // 5. Goofy badge
      goofyBadge(ctx, t, F, C);
      if (t >= T_GOOFY) {
        F.sfx(ctx, 'GRRR', 640, 600, t, T_GOOFY + 0.1, { size: 70, rot: 0.15, fill: '#ff5a4a', shadowColor: '#3b1d6e' });
      }

      // 6. white flash frames on the slams
      const fl = (a) => (t >= a && t < a + 3 * FR ? 0.7 - (t - a) * 8 : 0);
      F.flash(ctx, Math.max(fl(T_MEAN), fl(T_YER) * 0.8));
      F.vignette(ctx, 0.25, '10,10,40');
    },
  });
})();
