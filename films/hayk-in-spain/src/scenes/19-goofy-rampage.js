// Shot 19 'goofy-rampage' : WOOF WOOF WOOF (global T 79.0 - 84.0, local t 0 - 5).
// Pure action in the Yerevan park. Goofy in demon mode barks on every beat (t 0.0 .. 4.5): giant
// alternating "WOOF!" SFX, shock rings from his mouth, screen shake, squash. Grant is dragged
// horizontally behind the leash like a flag in the wind (pose "pulled", face "panic"). The park
// streams past in surges (camera tracking Goofy's lunges), leaves fly, speed lines everywhere.
// The stranger and his poodle flee in the background. t 2.5 (T 81.5): black-and-white impact frame.
//
// Layers, back to front:
//   1 park: sky, clouds, Ararat, city blocks, Cascade stairs, hill (parallax 0.05 - 0.2)
//   2 park: tree row, lamps, benches (parallax 0.55), grass, path (parallax 1.0)
//   3 demon wash: red multiply tint, dark radial glow behind Goofy, focus lines on his mouth
//   4 stranger + poodle running away (far path)
//   5 speed lines (back set), dust at Goofy's feet
//   6 Grant (pulled) + leash, Goofy (bark, angry) with aura
//   7 shock rings, leaves, front speed lines
//   8 SFX: WOOF! x10, Grant's scream
//   9 impact frame (t 2.5 .. 2.5 + 4 frames) replaces 1-8
(function () {
  'use strict';
  const ID = 'goofy-rampage';
  const FILM = window.FILM;
  const F = FILM.fx, CAST = FILM.cast, P = F.pal, LIB = FILM.lib;
  const TAU = Math.PI * 2, FR = 1 / 24;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const h01 = (...k) => F.h01(ID, ...k);

  // ---- beats (local t; global T in comments)
  const BEAT = 0.5;
  const N_BARKS = 10; // t 0.0 (T 79.0) .. t 4.5 (T 83.5)
  const IMPACT = 2.5; // T 81.5
  const IMPACT_FRAMES = 4;
  const GROUND = 1575; // Goofy's feet
  const GOOFY_X = 520;
  const GOOFY_S = 1.9;

  // ---- park colours (scene literals: pastel Yerevan morning)
  const K = {
    skyTop: '#8ccfff', skyMid: '#cdeeff', skyLow: '#ffe3e6',
    stone: '#e8b8a0', stoneShade: '#d09a84', stoneLight: '#f6d6c4', stoneLine: '#a8756a',
    hill: '#9fcf86', hillShade: '#86bb70',
    blockA: '#f1d9cf', blockB: '#e6cfe0', blockC: '#f5e6c8', win: '#b9c8e6',
    grassFar: '#a6d884', grass: P.grass, grassShade: P.grassShade,
    path: '#f0dcb6', pathShade: '#dcc39a', pathLine: '#c9ab80',
    tree: P.tree, treeShade: P.treeShade, treeHi: '#7cc466', trunk: P.trunk,
    bench: '#c0713a', benchShade: '#8f4f26', lamp: '#39314a',
  };

  // Park layer. scroll = camera x travel in px (foreground speed). Everything wraps.
  function wrapX(x0, scroll, f, period, margin) {
    return ((((x0 - scroll * f) % period) + period) % period) - margin;
  }
  function cascade(ctx, cx, baseY, w, h) {
    // the Cascade: terraced pink stone stairs climbing the hill, fountains on the tiers
    const tiers = 6;
    ctx.save();
    for (let i = 0; i < tiers; i++) {
      const u0 = i / tiers, u1 = (i + 1) / tiers;
      const tw = w * (1 - u0 * 0.55), y0 = baseY - h * u0, y1 = baseY - h * u1;
      const x0 = cx - tw / 2;
      // tier block
      ctx.fillStyle = K.stone;
      ctx.fillRect(x0, y1, tw, y0 - y1);
      ctx.fillStyle = K.stoneShade;
      ctx.fillRect(x0, y0 - (y0 - y1) * 0.22, tw, (y0 - y1) * 0.22);
      ctx.fillStyle = K.stoneLight;
      ctx.fillRect(x0, y1, tw, 5);
      // arches
      const na = Math.max(3, Math.round(tw / 70));
      ctx.fillStyle = K.stoneShade;
      for (let a = 0; a < na; a++) {
        const ax = x0 + (a + 0.5) * (tw / na);
        if (Math.abs(ax - cx) < w * 0.09) continue;
        const aw = tw / na * 0.42, ah = (y0 - y1) * 0.45;
        ctx.beginPath();
        ctx.moveTo(ax - aw / 2, y0 - (y0 - y1) * 0.25);
        ctx.lineTo(ax - aw / 2, y0 - (y0 - y1) * 0.25 - ah + aw / 2);
        ctx.arc(ax, y0 - (y0 - y1) * 0.25 - ah + aw / 2, aw / 2, Math.PI, 0);
        ctx.lineTo(ax + aw / 2, y0 - (y0 - y1) * 0.25);
        ctx.closePath();
        ctx.fill();
      }
      // shrubs on the terrace edge
      ctx.fillStyle = K.hillShade;
      for (let b = 0; b < 4; b++) {
        const bx = x0 + 20 + b * (tw - 40) / 3;
        ctx.beginPath(); ctx.arc(bx, y1 + 2, 9, Math.PI, 0); ctx.fill();
      }
      ctx.strokeStyle = K.stoneLine;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x0, y1, tw, y0 - y1);
    }
    // central staircase
    const sw = w * 0.16;
    ctx.fillStyle = K.stoneLight;
    ctx.beginPath();
    ctx.moveTo(cx - sw / 2, baseY); ctx.lineTo(cx + sw / 2, baseY);
    ctx.lineTo(cx + sw * 0.3, baseY - h); ctx.lineTo(cx - sw * 0.3, baseY - h); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = K.stoneLine;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 1; k < 30; k++) {
      const u = k / 30, y = baseY - h * u, hw = lerp(sw / 2, sw * 0.3, u);
      ctx.moveTo(cx - hw, y); ctx.lineTo(cx + hw, y);
    }
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - sw / 2, baseY); ctx.lineTo(cx - sw * 0.3, baseY - h);
    ctx.moveTo(cx + sw / 2, baseY); ctx.lineTo(cx + sw * 0.3, baseY - h);
    ctx.stroke();
    // top monument (the unfinished column block)
    ctx.fillStyle = K.stoneShade;
    ctx.fillRect(cx - 16, baseY - h - 70, 32, 70);
    ctx.strokeRect(cx - 16, baseY - h - 70, 32, 70);
    ctx.restore();
  }
  function roundTree(ctx, x, y, r, seed) {
    // trunk
    ctx.fillStyle = K.trunk;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.12, y); ctx.lineTo(x - r * 0.07, y - r * 1.1); ctx.lineTo(x + r * 0.07, y - r * 1.1); ctx.lineTo(x + r * 0.12, y);
    ctx.closePath();
    F.fo(ctx, K.trunk, 4);
    // crown: a cluster of circles, outline then fill
    const cy = y - r * 1.45;
    const blobs = [[0, 0, 1], [-0.55, 0.25, 0.7], [0.55, 0.25, 0.72], [-0.3, -0.45, 0.66], [0.32, -0.42, 0.64]];
    ctx.beginPath();
    blobs.forEach(([bx, by, br]) => { ctx.moveTo(x + bx * r + br * r, cy + by * r); ctx.arc(x + bx * r, cy + by * r, br * r, 0, TAU); });
    ctx.strokeStyle = P.line; ctx.lineWidth = 8; ctx.stroke();
    ctx.fillStyle = K.tree; ctx.fill();
    ctx.fillStyle = K.treeShade;
    ctx.beginPath(); ctx.ellipse(x + r * 0.1, cy + r * 0.45, r * 0.95, r * 0.42, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = K.tree;
    ctx.beginPath(); ctx.arc(x - r * 0.12, cy - r * 0.08, r * 0.78, 0, TAU); ctx.fill();
    ctx.fillStyle = K.treeHi;
    ctx.beginPath(); ctx.ellipse(x - r * 0.35, cy - r * 0.42, r * 0.28, r * 0.17, -0.5, 0, TAU); ctx.fill();
  }
  function bench(ctx, x, y) {
    ctx.save();
    ctx.lineWidth = 4; ctx.strokeStyle = P.line;
    ctx.fillStyle = K.lamp;
    ctx.fillRect(x - 70, y - 40, 8, 40); ctx.fillRect(x + 62, y - 40, 8, 40);
    F.rrect(ctx, x - 84, y - 50, 168, 14, 4); F.fo(ctx, K.bench, 4);
    F.rrect(ctx, x - 84, y - 92, 168, 12, 4); F.fo(ctx, K.bench, 4);
    F.rrect(ctx, x - 84, y - 74, 168, 12, 4); F.fo(ctx, K.benchShade, 4);
    ctx.restore();
  }
  function lamp(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = K.lamp;
    ctx.fillRect(x - 5, y - 250, 10, 250);
    ctx.fillRect(x - 14, y - 16, 28, 16);
    F.ellipse(ctx, x, y - 262, 20, 24); F.fo(ctx, '#fff4c8', 4);
    ctx.fillStyle = K.lamp; ctx.fillRect(x - 16, y - 290, 32, 10);
    ctx.restore();
  }
  function park(ctx, t, scroll) {
    // 1 sky
    F.sky(ctx, K.skyTop, K.skyLow, { mid: K.skyMid, midAt: 0.55, x: -80, y: -80, w: 1240, h: 1060 });
    F.clouds(ctx, { n: 4, seed: 19, t: t + scroll * 0.02, y: 250, h: 320, speed: 30, scale: 0.8 });
    F.ararat(ctx, wrapX(560, scroll, 0.03, 1600, 300), 900, 620, 290, { color: '#b8c0e2', shade: '#a3acd6', snow: '#fbfcff' });
    // city blocks at the horizon
    for (let i = 0; i < 14; i++) {
      const bw = 90 + h01('bw', i) * 90, bh = 90 + h01('bh', i) * 170;
      const x = wrapX(i * 170, scroll, 0.08, 2380, 200);
      const col = [K.blockA, K.blockB, K.blockC][i % 3];
      ctx.fillStyle = col;
      ctx.fillRect(x, 905 - bh, bw, bh + 5);
      ctx.fillStyle = K.win;
      for (let r = 0; r < Math.floor(bh / 34); r++) for (let c = 0; c < Math.floor(bw / 30); c++) ctx.fillRect(x + 10 + c * 30, 905 - bh + 14 + r * 34, 12, 16);
    }
    // hill + Cascade
    const cxs = wrapX(470, scroll, 0.12, 2600, 900);
    ctx.fillStyle = K.hill;
    ctx.beginPath(); ctx.ellipse(cxs, 960, 620, 330, 0, Math.PI, TAU); ctx.fill();
    cascade(ctx, cxs, 950, 600, 380);
    // far grass band
    ctx.fillStyle = K.grassFar;
    ctx.fillRect(-80, 940, 1240, 80);
    // 2 tree row, lamps, benches (parallax 0.55)
    for (let i = 0; i < 9; i++) {
      const x = wrapX(i * 260 + h01('tx', i) * 60, scroll, 0.55, 2340, 200);
      const r = 70 + h01('tr', i) * 40;
      roundTree(ctx, x, 1060 + h01('ty', i) * 30, r, i);
      if (i % 2 === 0) lamp(ctx, x + 130, 1110);
      else bench(ctx, x + 125, 1110);
    }
    // grass
    ctx.fillStyle = K.grass;
    ctx.fillRect(-80, 1080, 1240, 1000);
    ctx.fillStyle = K.grassShade;
    for (let i = 0; i < 22; i++) {
      const x = wrapX(i * 110, scroll, 0.8, 2420, 60);
      ctx.beginPath(); ctx.moveTo(x, 1150 + (i % 3) * 18); ctx.lineTo(x + 8, 1128 + (i % 3) * 18); ctx.lineTo(x + 16, 1150 + (i % 3) * 18); ctx.fill();
    }
    // path (foreground, parallax 1)
    ctx.fillStyle = K.path;
    ctx.fillRect(-80, 1330, 1240, 460);
    ctx.fillStyle = K.pathShade;
    ctx.fillRect(-80, 1330, 1240, 22);
    ctx.strokeStyle = P.line; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-80, 1330); ctx.lineTo(1160, 1330); ctx.stroke();
    ctx.strokeStyle = K.pathLine; ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const x = wrapX(i * 200, scroll, 1.0, 2400, 100);
      ctx.moveTo(x, 1360); ctx.lineTo(x - 70, 1780);
    }
    ctx.moveTo(-80, 1520); ctx.lineTo(1160, 1520);
    ctx.stroke();
    // pebbles
    ctx.fillStyle = K.pathShade;
    for (let i = 0; i < 16; i++) {
      const x = wrapX(i * 150 + h01('pb', i) * 90, scroll, 1.0, 2400, 60);
      F.ellipse(ctx, x, 1400 + h01('pby', i) * 330, 10, 5); ctx.fill();
    }
    // front grass strip at the bottom
    ctx.fillStyle = K.grass;
    ctx.fillRect(-80, 1790, 1240, 200);
    ctx.strokeStyle = P.line; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-80, 1790); ctx.lineTo(1160, 1790); ctx.stroke();
  }

  // The stranger: a flat silhouette jogger and a white poodle (not cast members: simple shapes).
  function stranger(ctx, x, y, s, t) {
    const ph = t * TAU * 3.2;
    const sw = Math.sin(ph);
    const col = '#4b3d63';
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const limb = (pts, w) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); };
    // legs
    limb([[0, -95], [20 + sw * 30, -50], [10 + sw * 55, 0]], 18);
    limb([[0, -95], [-20 - sw * 30, -55], [-40 - sw * 40, -10]], 18);
    // torso leaning forward (running right)
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(12, -140, 26, 52, 0.35, 0, TAU); ctx.fill();
    // arms flailing up (panic)
    limb([[20, -170], [50, -210 - sw * 10], [40 + sw * 20, -250]], 13);
    limb([[5, -170], [-30, -200 + sw * 10], [-20 - sw * 20, -245]], 13);
    // head
    ctx.beginPath(); ctx.arc(34, -205, 24, 0, TAU); ctx.fill();
    // headband
    ctx.fillStyle = '#ff5e7e'; ctx.fillRect(12, -218, 44, 8);
    ctx.restore();
    // sweat drop, flying off backwards
    F.sweat(ctx, x - 30 * s, y - 250 * s, 0.7 * s, { flip: true });
    // poodle: white puffs, trotting ahead of him
    const px = x + 90 * s, py = y + Math.abs(Math.sin(ph * 1.2)) * -14 * s;
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(s, s);
    ctx.lineWidth = 3; ctx.strokeStyle = P.line;
    const puff = (bx, by, r) => { ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.stroke(); };
    ctx.strokeStyle = P.line; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-18, -24); ctx.lineTo(-24 - sw * 10, -2); ctx.moveTo(18, -24); ctx.lineTo(24 + sw * 10, -2); ctx.stroke();
    ctx.lineWidth = 3;
    puff(-26, -44, 13); // tail pompom
    puff(0, -36, 20);
    puff(26, -58, 17); // head
    puff(24, -76, 11); // topknot
    ctx.fillStyle = P.line; ctx.beginPath(); ctx.arc(34, -60, 3, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function leaf(ctx, x, y, r, rot, col) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.quadraticCurveTo(0, -r * 0.7, r, 0);
    ctx.quadraticCurveTo(0, r * 0.7, -r, 0);
    ctx.closePath();
    F.fo(ctx, col, 3);
    ctx.strokeStyle = 'rgba(27,20,36,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r * 0.8, 0); ctx.lineTo(r * 0.8, 0); ctx.stroke();
    ctx.restore();
  }
  function leaves(ctx, t, o) {
    const cols = ['#6cc04a', '#4f9a4a', '#a8d85a', '#f2c94c'];
    for (let i = 0; i < o.n; i++) {
      const sp = 900 + h01('lv', o.seed, i) * 900;
      const period = 1400 / sp * 1.3;
      const u = ((t / period + h01('lo', o.seed, i)) % 1 + 1) % 1;
      const x = 1180 - u * 1400;
      const y = o.y0 + h01('ly', o.seed, i) * o.h + Math.sin(t * 7 + i) * 40;
      leaf(ctx, x, y, o.r * (0.7 + h01('lr', o.seed, i) * 0.7), t * (6 + i % 5) + i, cols[i % cols.length]);
    }
  }

  // Scroll: the camera surges forward on every bark (Goofy lunges), eased within each beat.
  function scrollAt(t) {
    const k = Math.floor(t / BEAT + 1e-6), u = (t - k * BEAT) / BEAT;
    return 360 * (k + LIB.ease.outCubic(u)) + 180 * t;
  }

  // WOOF placement per bark (alternating left / right, tilted), size escalates.
  const WOOFS = [
    [360, 330, -0.2], [715, 450, 0.16], [355, 360, -0.14], [720, 420, 0.2], [365, 320, -0.22],
    [540, 380, -0.08], [355, 350, -0.16], [715, 460, 0.14], [360, 320, -0.2], [715, 430, 0.18],
  ];
  // Grant, the flag: feet trail off the left edge, hands up at the leash end
  const GRANT = { x: -40, y: 930, s: 0.98, tilt: -0.22 };

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const tw = LIB.onTwos(t);
      const k = Math.min(N_BARKS - 1, Math.floor(t / BEAT + 1e-6));
      const age = t - k * BEAT; // time since the latest bark
      const scroll = scrollAt(tw);
      const inImpact = t >= IMPACT - 1e-6 && t < IMPACT + IMPACT_FRAMES * FR - 1e-6;
      const impactFrame = Math.floor((t - IMPACT) * 24 + 1e-6);

      // Goofy placement: small hop between barks, squash on the bark frames
      const hop = -Math.sin(clamp(age / BEAT) * Math.PI) * 26;
      const squash = age < 2 * FR + 1e-6;
      const gx = GOOFY_X + Math.sin(tw * 9) * 6;
      const gy = GROUND + hop;
      // bark pose: its lunge peaks at local phase 0.125 of a 0.5 s cycle, so shift it onto the beat
      const gt = age + 0.125 + k * BEAT;

      // camera: slow push-in + shake on every bark
      const sh = F.shake(t, k * BEAT, 0.32, k === 5 ? 44 : 28, 190 + k);
      const zoom = 1 + 0.05 * (t / info.dur);

      ctx.save();
      ctx.translate(sh[0], sh[1]);
      ctx.translate(560, 1100);
      ctx.scale(zoom, zoom);
      ctx.translate(-560, -1100);

      if (inImpact) {
        // ---- 9 impact frame: 2 white frames, then 2 inverted
        const inv = impactFrame >= 2;
        const mouth = [gx + 250, gy - 300];
        F.impact(ctx, { cx: mouth[0], cy: mouth[1], invert: inv, seed: 1900 + impactFrame, inner: 150 });
        const sil = inv ? '#ffffff' : '#0a0a10';
        const ga = CAST.goofy(ctx, { x: gx, y: gy, s: GOOFY_S * 1.08, pose: 'bark', face: 'angry', t: gt, silhouette: sil });
        const gr = CAST.grant(ctx, { x: GRANT.x, y: GRANT.y, s: GRANT.s, pose: 'pulled', face: 'panic', flip: true, t, tilt: GRANT.tilt, silhouette: sil });
        F.leash(ctx, ga.collar, gr.handR, { taut: true, color: sil, width: 10 });
        F.shockRing(ctx, ga.mouth[0], ga.mouth[1], 0.12, { r: 420, color: inv ? '#fff' : '#000', life: 0.3, width: 30 });
        ctx.restore();
        F.sfx(ctx, 'WOOF!!', 540, 420, t, IMPACT, { size: Math.min(200, 800 / (F.measure(ctx, 'WOOF!!', 100) / 100)), fill: inv ? '#0a0a10' : '#ffffff', stroke: inv ? '#ffffff' : '#0a0a10', shadowColor: inv ? '#ffffff' : '#0a0a10', rot: -0.1, shake: 12 });
        return;
      }

      // ---- 1-2 park
      park(ctx, t, scroll);

      // ---- 3 demon wash: red multiply tint pulsing on the beat, dark glow behind Goofy
      const pulse = F.beatPulse(t, BEAT, 0.16);
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = '#ffd0c8';
      ctx.fillRect(-80, -80, 1240, 2080);
      ctx.globalAlpha = 0.12 + pulse * 0.45;
      ctx.fillStyle = '#ff5a5a';
      ctx.fillRect(-80, -80, 1240, 2080);
      ctx.restore();
      ctx.save();
      const rg = ctx.createRadialGradient(gx + 60, gy - 250, 40, gx + 60, gy - 250, 760);
      rg.addColorStop(0, 'rgba(26,11,36,0.85)');
      rg.addColorStop(0.55, 'rgba(90,10,40,0.45)');
      rg.addColorStop(1, 'rgba(90,10,40,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(-80, 600, 1240, 1400);
      ctx.restore();

      // ---- 4 the stranger and his poodle flee along the far path
      const sx = 720 + t * 95 + Math.sin(tw * 5) * 6;
      if (sx < 1200) {
        stranger(ctx, sx, 1140, 1.15, tw);
        F.dust(ctx, sx - 40, 1135, ((t * 3) % 1) * 0.7, { n: 4, size: 22, spread: 80, seed: 1911, life: 0.7 });
      }

      // mouth focus lines (dark red), behind the characters, pulsing
      F.focusLines(ctx, gx + 250, gy - 300, { inner: 330, count: 80, color: '#3a0714', alpha: 0.35 + pulse * 0.4, seed: 1904, width: 20 });

      // ---- 5 back speed lines + dust kicked up at Goofy's feet
      F.speedLines(ctx, { angle: Math.PI, count: 36, color: '#ffffff', alpha: 0.55, seed: 1905, t, speed: 2600, len: 520, width: 10, y: 200, h: 1500 });
      F.dust(ctx, gx - 150, GROUND + 4, age, { n: 6, size: 46, spread: 230, seed: 1906 + k, life: 0.45, dir: 0 });

      // ---- 6 Grant, dragged horizontally like a flag, then the leash, then Goofy
      const flap = Math.sin(tw * 22) * 0.07 + Math.sin(tw * 7) * 0.04;
      const gr = CAST.grant(ctx, {
        x: GRANT.x + Math.sin(tw * 9) * 12, y: GRANT.y + Math.sin(tw * 13) * 26 + hop * 0.6, s: GRANT.s,
        pose: 'pulled', face: 'panic', flip: true, t: t * 1.6, tilt: GRANT.tilt + flap,
      });
      // sweat flying off Grant
      F.sweat(ctx, gr.head[0] - 30, gr.head[1] - 90, 1.0, { flip: true });
      F.sweat(ctx, gr.head[0] - 120, gr.head[1] - 20 + Math.sin(tw * 9) * 10, 0.7, { flip: true });
      // wind streaks around Grant (he is the flag)
      F.speedLines(ctx, { angle: Math.PI, count: 12, color: '#ffffff', alpha: 0.8, seed: 1907, t, speed: 3200, len: 300, width: 7, x: -40, y: gr.head[1] - 220, w: 1100, h: 420 });

      // aura behind Goofy
      F.aura(ctx, gx + 10, GROUND + 10, 700, 620, t, { color: '#3b1d6e', core: P.demonRed, seed: 1908, alpha: 0.85 });
      ctx.save();
      if (squash) {
        ctx.translate(gx, GROUND);
        ctx.scale(1.07, 0.92);
        ctx.translate(-gx, -GROUND);
      }
      const ga = CAST.goofy(ctx, { x: gx, y: gy, s: GOOFY_S, pose: 'bark', face: 'angry', t: gt });
      ctx.restore();
      F.leash(ctx, ga.collar, gr.handR, { taut: true, width: 10 });
      // menace glyphs rising off his back
      F.menace(ctx, gx - 330, gy - 150, t, { size: 72, n: 3, seed: 1909, color: '#7a3cff' });

      // ---- 7 shock rings from the mouth (two per bark), leaves, front speed lines
      F.shockRing(ctx, ga.mouth[0] + 190, ga.mouth[1] - 30, age, { r: 380, color: '#ffffff', life: 0.42, width: 26, squash: 0.75 });
      F.shockRing(ctx, ga.mouth[0] + 190, ga.mouth[1] - 30, age - 0.08, { r: 280, color: P.sfxYellow, life: 0.36, width: 16, squash: 0.75 });
      // bark breath lines out of the mouth
      if (age < 0.25) {
        ctx.save();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 9; ctx.lineCap = 'round';
        ctx.globalAlpha = 1 - age / 0.25;
        for (let i = -2; i <= 2; i++) {
          const a = -0.35 + i * 0.22, r0 = 70 + age * 300, r1 = 150 + age * 600;
          ctx.beginPath();
          ctx.moveTo(ga.mouth[0] + Math.cos(a) * r0, ga.mouth[1] + Math.sin(a) * r0);
          ctx.lineTo(ga.mouth[0] + Math.cos(a) * r1, ga.mouth[1] + Math.sin(a) * r1);
          ctx.stroke();
        }
        ctx.restore();
      }
      leaves(ctx, t, { n: 22, seed: 1, y0: 250, h: 1350, r: 22 });
      F.speedLines(ctx, { angle: Math.PI, count: 10, color: '#ffffff', alpha: 0.9, seed: 1910, t, speed: 4200, len: 700, width: 14, y: 1200, h: 600 });

      ctx.restore(); // camera

      // ---- 8 SFX, screen-fixed over the shake (they carry their own jitter)
      // Grant's scream trails behind him
      F.sfx(ctx, 'AAAAAH!', 215, 640, t, 0.25, { size: 62, fill: '#bfe9ff', shadowColor: '#27335c', rot: -0.3, shake: 6 });
      for (let i = 0; i < N_BARKS; i++) {
        const t0 = i * BEAT;
        if (t < t0 - 1e-6 || t > t0 + 0.95) continue;
        const [x, y, rot] = WOOFS[i];
        const big = i === 5;
        const red = i % 2 === 0;
        // escalating size, capped so every WOOF stays inside the safe width
        const size = Math.min(big ? 200 : 150 + i * 4, (big ? 720 : 530) / (F.measure(ctx, 'WOOF!', 100) / 100));
        const fade = clamp((t0 + 0.95 - t) / 0.25);
        const older = t - t0 > BEAT - 1e-6; // an older WOOF shrinks back while the new one hits
        ctx.save();
        ctx.globalAlpha = older ? fade * 0.9 : 1;
        // jagged burst behind the fresh WOOF
        if (!older) F.burst(ctx, x, y + 6, size * 1.75, size * 1.15, 14, red ? P.sfxYellow : P.demonRed, { seed: 1920 + i, squash: 0.55, lw: 6, rot: i });
        F.sfx(ctx, 'WOOF!', x, y, t, t0, {
          size: older ? size * 0.82 : size, rot, fill: red ? P.sfxRed : P.sfxYellow, shadowColor: red ? '#5a0a1a' : '#b3122b', shake: 10,
        });
        ctx.restore();
      }
      // beat flash: one white frame on each bark
      if (age < FR - 1e-6) F.flash(ctx, 0.22, '#fff3e0');
      F.vignette(ctx, 0.45, '40,0,20');
    },
  });
})();
