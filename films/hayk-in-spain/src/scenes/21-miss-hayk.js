// Shot 21 'miss-hayk' : I MISS HAYK (global T 89.0 - 95.0, local t 0 - 6).
// The emotional peak, played for comedy. In the Yerevan park Goofy (howl, cry) throws his head to
// the sky, waterfall tears gushing in two arcs into growing puddles, pale-blue drama rays behind him.
//   t 1.0 (T 90.0)  "I MISS HAAAAYK!!": the biggest text in the film, in a huge jagged double shout
//                   bubble, every letter shaking; impact flash, big shake, then a steady tremble.
//   t 2.0 (T 91.0)  Grant (face "shocked") falls over backwards, legs in the air, THUD.
//   t 3.0 (T 92.0)  small bubble from Grant: "HE CAN TALK?!"
//   t 4.0 (T 93.0)  the camera pulls back fast: the park shrinks into Yerevan (Cascade, TV tower,
//                   Ararat), Yerevan shrinks into a globe showing Armenia and Spain; the howl text
//                   echoes smaller and smaller. Globe holds from t 5.6.
//
// Zoom model: three nested levels, each 6x the previous, all anchored on screen point A.
//   L0 park (native 1080x1920), L1 Yerevan (L0 sits at 1/6 around F1), L2 globe (L1 sits at 1/6
//   around F2 = Armenia). Scales: S0 = Z, S1 = 6 Z, S2 = 36 Z with Z = 36^-e(u).
//   L0 and L1 are rendered into scratch buffers and feathered with an oval mask so each level
//   dissolves into the next instead of showing a hard frame edge.
//
// Layers (L0), back to front:
//   1 park: sky, clouds, Ararat, city, Cascade, trees, lamps, benches, grass, path
//   2 drama rays + sparkles behind Goofy, tear puddles
//   3 Grant (kneel -> falls over, legs up), dust
//   4 Goofy (howl, cry) with his tear streams, howl rings
//   5 shout bubble "I MISS HAAAAYK!!", "HE CAN TALK?!", THUD
(function () {
  'use strict';
  const ID = 'miss-hayk';
  const FILM = window.FILM;
  const F = FILM.fx, CAST = FILM.cast, P = F.pal, LIB = FILM.lib;
  const TAU = Math.PI * 2, FR = 1 / 24, DEG = Math.PI / 180;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const h01 = (...k) => F.h01(ID, ...k);

  // ---- beats (local t; global T in comments)
  const B_SHOUT = 1.0; // T 90.0
  const B_FALL = 2.0; // T 91.0
  const B_TALK = 3.0; // T 92.0
  const B_ZOOM = 4.0; // T 93.0
  const ZOOM_DUR = 1.6; // globe settles at t 5.6 and holds
  const ECHOES = [[4.3, 88, 560], [4.85, 62, 500], [5.4, 44, 420]]; // [t0, size, y]

  // ---- L0 geometry
  const GROUND = 1540;
  const GOOFY = { x: 690, y: 1545, s: 2.45 };
  const GRANT = { x: 250, y: 1470, s: 1.12 };
  const A = [720, 1000]; // screen anchor of the zoom (near Goofy's head)
  const F1 = [560, 1150]; // where the park sits inside the Yerevan view
  const F2 = A; // Armenia on the globe at the end (L2 is at scale 1 when the zoom ends)
  const RATIO = 6;

  // ---- park colours (same Yerevan park as shots 17-20)
  const K = {
    skyTop: '#8ccfff', skyMid: '#cdeeff', skyLow: '#ffe3e6',
    stone: '#e8b8a0', stoneShade: '#d09a84', stoneLight: '#f6d6c4', stoneLine: '#a8756a',
    hill: '#9fcf86', hillShade: '#86bb70',
    blockA: '#f1d9cf', blockB: '#e6cfe0', blockC: '#f5e6c8', win: '#b9c8e6',
    grassFar: '#a6d884', grass: P.grass, grassShade: P.grassShade,
    path: '#f0dcb6', pathShade: '#dcc39a', pathLine: '#c9ab80',
    tree: P.tree, treeShade: P.treeShade, treeHi: '#7cc466', trunk: P.trunk,
    bench: '#c0713a', benchShade: '#8f4f26', lamp: '#39314a',
    space: '#0d0f2e', space2: '#1f1a4a', ocean: '#3f8fe0', oceanDeep: '#2b6cc0', land: '#8fd06a', landLine: '#2f6a3a', desert: '#e6d08e',
  };

  // ===========================================================================
  // L0: the park
  // ===========================================================================
  function cascade(ctx, cx, baseY, w, h, lw = 2.5) {
    const tiers = 6;
    for (let i = 0; i < tiers; i++) {
      const u0 = i / tiers, u1 = (i + 1) / tiers;
      const tw = w * (1 - u0 * 0.55), y0 = baseY - h * u0, y1 = baseY - h * u1;
      const x0 = cx - tw / 2, th = y0 - y1;
      ctx.fillStyle = K.stone; ctx.fillRect(x0, y1, tw, th);
      ctx.fillStyle = K.stoneShade; ctx.fillRect(x0, y0 - th * 0.22, tw, th * 0.22);
      ctx.fillStyle = K.stoneLight; ctx.fillRect(x0, y1, tw, Math.max(2, th * 0.08));
      const na = Math.max(3, Math.round(tw / 70));
      ctx.fillStyle = K.stoneShade;
      for (let a = 0; a < na; a++) {
        const ax = x0 + (a + 0.5) * (tw / na);
        if (Math.abs(ax - cx) < w * 0.09) continue;
        const aw = (tw / na) * 0.42, ah = th * 0.45, by = y0 - th * 0.25;
        ctx.beginPath();
        ctx.moveTo(ax - aw / 2, by); ctx.lineTo(ax - aw / 2, by - ah + aw / 2);
        ctx.arc(ax, by - ah + aw / 2, aw / 2, Math.PI, 0);
        ctx.lineTo(ax + aw / 2, by); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = K.hillShade;
      for (let b = 0; b < 4; b++) { const bx = x0 + 20 + (b * (tw - 40)) / 3; ctx.beginPath(); ctx.arc(bx, y1 + 2, th * 0.14, Math.PI, 0); ctx.fill(); }
      ctx.strokeStyle = K.stoneLine; ctx.lineWidth = lw; ctx.strokeRect(x0, y1, tw, th);
    }
    const sw = w * 0.16;
    ctx.fillStyle = K.stoneLight;
    ctx.beginPath(); ctx.moveTo(cx - sw / 2, baseY); ctx.lineTo(cx + sw / 2, baseY); ctx.lineTo(cx + sw * 0.3, baseY - h); ctx.lineTo(cx - sw * 0.3, baseY - h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = K.stoneLine; ctx.lineWidth = lw * 0.6;
    ctx.beginPath();
    for (let k = 1; k < 30; k++) { const u = k / 30, y = baseY - h * u, hw = lerp(sw / 2, sw * 0.3, u); ctx.moveTo(cx - hw, y); ctx.lineTo(cx + hw, y); }
    ctx.stroke();
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(cx - sw / 2, baseY); ctx.lineTo(cx - sw * 0.3, baseY - h); ctx.moveTo(cx + sw / 2, baseY); ctx.lineTo(cx + sw * 0.3, baseY - h); ctx.stroke();
    ctx.fillStyle = K.stoneShade;
    ctx.fillRect(cx - w * 0.027, baseY - h - h * 0.18, w * 0.054, h * 0.18);
    ctx.strokeRect(cx - w * 0.027, baseY - h - h * 0.18, w * 0.054, h * 0.18);
  }
  function roundTree(ctx, x, y, r, lw = 8) {
    ctx.beginPath();
    ctx.moveTo(x - r * 0.12, y); ctx.lineTo(x - r * 0.07, y - r * 1.1); ctx.lineTo(x + r * 0.07, y - r * 1.1); ctx.lineTo(x + r * 0.12, y); ctx.closePath();
    F.fo(ctx, K.trunk, lw * 0.5);
    const cy = y - r * 1.45;
    const blobs = [[0, 0, 1], [-0.55, 0.25, 0.7], [0.55, 0.25, 0.72], [-0.3, -0.45, 0.66], [0.32, -0.42, 0.64]];
    ctx.beginPath();
    blobs.forEach(([bx, by, br]) => { ctx.moveTo(x + bx * r + br * r, cy + by * r); ctx.arc(x + bx * r, cy + by * r, br * r, 0, TAU); });
    if (lw > 0) { ctx.strokeStyle = P.line; ctx.lineWidth = lw; ctx.stroke(); }
    ctx.fillStyle = K.tree; ctx.fill();
    ctx.fillStyle = K.treeShade;
    ctx.beginPath(); ctx.ellipse(x + r * 0.1, cy + r * 0.45, r * 0.95, r * 0.42, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = K.tree;
    ctx.beginPath(); ctx.arc(x - r * 0.12, cy - r * 0.08, r * 0.78, 0, TAU); ctx.fill();
    ctx.fillStyle = K.treeHi;
    ctx.beginPath(); ctx.ellipse(x - r * 0.35, cy - r * 0.42, r * 0.28, r * 0.17, -0.5, 0, TAU); ctx.fill();
  }
  function bench(ctx, x, y) {
    ctx.fillStyle = K.lamp;
    ctx.fillRect(x - 70, y - 40, 8, 40); ctx.fillRect(x + 62, y - 40, 8, 40);
    F.rrect(ctx, x - 84, y - 50, 168, 14, 4); F.fo(ctx, K.bench, 4);
    F.rrect(ctx, x - 84, y - 92, 168, 12, 4); F.fo(ctx, K.bench, 4);
    F.rrect(ctx, x - 84, y - 74, 168, 12, 4); F.fo(ctx, K.benchShade, 4);
  }
  function lamp(ctx, x, y) {
    ctx.fillStyle = K.lamp;
    ctx.fillRect(x - 5, y - 250, 10, 250);
    ctx.fillRect(x - 14, y - 16, 28, 16);
    F.ellipse(ctx, x, y - 262, 20, 24); F.fo(ctx, '#fff4c8', 4);
    ctx.fillStyle = K.lamp; ctx.fillRect(x - 16, y - 290, 32, 10);
  }
  function park(ctx, t) {
    F.sky(ctx, K.skyTop, K.skyLow, { mid: K.skyMid, midAt: 0.55, x: -80, y: -80, w: 1240, h: 1060 });
    F.clouds(ctx, { n: 4, seed: 21, t, y: 250, h: 320, speed: 14, scale: 0.8 });
    F.ararat(ctx, 520, 900, 620, 290, { color: '#b8c0e2', shade: '#a3acd6', snow: '#fbfcff' });
    for (let i = 0; i < 9; i++) {
      const bw = 90 + h01('bw', i) * 90, bh = 90 + h01('bh', i) * 170;
      const x = -60 + i * 150;
      ctx.fillStyle = [K.blockA, K.blockB, K.blockC][i % 3];
      ctx.fillRect(x, 905 - bh, bw, bh + 5);
      ctx.fillStyle = K.win;
      for (let r = 0; r < Math.floor(bh / 34); r++) for (let c = 0; c < Math.floor(bw / 30); c++) ctx.fillRect(x + 10 + c * 30, 905 - bh + 14 + r * 34, 12, 16);
    }
    ctx.fillStyle = K.hill;
    ctx.beginPath(); ctx.ellipse(430, 960, 620, 330, 0, Math.PI, TAU); ctx.fill();
    cascade(ctx, 430, 950, 600, 380);
    ctx.fillStyle = K.grassFar; ctx.fillRect(-80, 940, 1240, 80);
    for (let i = 0; i < 5; i++) {
      const x = -40 + i * 260 + h01('tx', i) * 60;
      roundTree(ctx, x, 1060 + h01('ty', i) * 30, 70 + h01('tr', i) * 40);
      if (i % 2 === 0) lamp(ctx, x + 130, 1110); else bench(ctx, x + 125, 1110);
    }
    ctx.fillStyle = K.grass; ctx.fillRect(-80, 1080, 1240, 1000);
    ctx.fillStyle = K.grassShade;
    for (let i = 0; i < 11; i++) { const x = i * 110 - 30, y = 1150 + (i % 3) * 18; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8, y - 22); ctx.lineTo(x + 16, y); ctx.fill(); }
    ctx.fillStyle = K.path; ctx.fillRect(-80, 1330, 1240, 460);
    ctx.fillStyle = K.pathShade; ctx.fillRect(-80, 1330, 1240, 22);
    ctx.strokeStyle = P.line; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-80, 1330); ctx.lineTo(1160, 1330); ctx.stroke();
    ctx.strokeStyle = K.pathLine; ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) { const x = i * 200 - 20; ctx.moveTo(x, 1360); ctx.lineTo(x - 70, 1780); }
    ctx.moveTo(-80, 1520); ctx.lineTo(1160, 1520);
    ctx.stroke();
    ctx.fillStyle = K.grass; ctx.fillRect(-80, 1790, 1240, 200);
    ctx.strokeStyle = P.line; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-80, 1790); ctx.lineTo(1160, 1790); ctx.stroke();
  }

  // translucent drama rays fanning out from a point
  function rays(ctx, cx, cy, rot, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#e8f6ff';
    ctx.beginPath();
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a0 = rot + (i / n) * TAU, a1 = a0 + (TAU / n) * 0.45;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a0) * 2600, cy + Math.sin(a0) * 2600);
      ctx.lineTo(cx + Math.cos(a1) * 2600, cy + Math.sin(a1) * 2600);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }

  // Grant's fall: kneeling until B_FALL, then topples over backwards (legs up) around his hip.
  function grantFall(ctx, t, o = {}) {
    const face = t < B_SHOUT - 1e-6 ? 'nervous' : 'shocked';
    const u = clamp((t - B_FALL) / 0.3);
    const x = GRANT.x, y = GRANT.y, s = GRANT.s;
    if (t < B_FALL - 1e-6) {
      const jump = t >= B_SHOUT - 1e-6 && t < B_SHOUT + 0.25 ? -Math.sin(((t - B_SHOUT) / 0.25) * Math.PI) * 40 : 0;
      return CAST.grant(ctx, { x, y: y + jump, s, pose: 'kneel', face, t, silhouette: o.sil });
    }
    // rotate around the hip; the hip also drops to the ground
    const ang = -2.05 * LIB.ease.outBack(u);
    const pivot = [x, y - 250 * s];
    const drop = LIB.ease.outBounce(u) * 150 * s;
    ctx.save();
    ctx.translate(pivot[0] + LIB.ease.outCubic(u) * 110, pivot[1] + drop);
    ctx.rotate(ang);
    ctx.translate(-pivot[0], -pivot[1]);
    const a = CAST.grant(ctx, { x, y, s, pose: 'cheer', face, t, silhouette: o.sil });
    ctx.restore();
    // anchors come back in the unrotated frame: map the ones we use
    const c = Math.cos(ang), sn = Math.sin(ang);
    const map = (p) => {
      const dx = p[0] - pivot[0], dy = p[1] - pivot[1];
      return [pivot[0] + LIB.ease.outCubic(u) * 110 + dx * c - dy * sn, pivot[1] + drop + dx * sn + dy * c];
    };
    return { head: map(a.head), mouth: map(a.mouth), top: map(a.top), hip: map(a.hip) };
  }

  // the biggest text in the film: double jagged shout bubble, every letter shaking
  function howlBubble(ctx, t, mouth) {
    const sc = F.popIn(t, B_SHOUT);
    if (sc <= 0) return;
    const b = LIB.boil(LIB.T);
    const cx = 540, cy = 485;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    ctx.translate(-cx, -cy);
    const spikes = (rx, ry, n, amp, seed, fill, lw, line) => {
      ctx.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * TAU;
        const k = i % 2 ? 1 : 1 + amp * (0.7 + h01('hb', seed, i, b) * 0.6);
        const px = cx + Math.cos(a) * rx * k, py = cy + Math.sin(a) * ry * k;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      F.fo(ctx, fill, lw, line);
    };
    // tail: a jagged wedge down to Goofy's mouth
    const tx = mouth[0], ty = mouth[1] - 30;
    ctx.beginPath();
    ctx.moveTo(cx + 120, cy + 180); ctx.lineTo(tx, ty); ctx.lineTo(cx + 280, cy + 150); ctx.closePath();
    F.fo(ctx, P.sfxRed, 9);
    spikes(470, 250, 26, 0.2, 1, P.sfxRed, 9);
    ctx.beginPath();
    ctx.moveTo(cx + 150, cy + 150); ctx.lineTo(tx - 12, ty - 30); ctx.lineTo(cx + 250, cy + 130); ctx.closePath();
    F.fo(ctx, '#ffffff', 0);
    spikes(430, 222, 24, 0.14, 2, '#ffffff', 7);
    // text
    const l1 = 'I MISS', l2 = 'HAAAAYK!!';
    const size1 = 118;
    const w2at100 = F.measure(ctx, l2, 100);
    const size2 = Math.min(190, (800 / w2at100) * 100);
    const jig = (i, amp) => [(h01('lx', i, b) - 0.5) * amp, (h01('ly', i, b) - 0.5) * amp];
    const j1 = jig(99, 8);
    F.text(ctx, l1, cx + j1[0], cy - 105 + j1[1], { size: size1, fill: P.line, lw: 0, shadow: 7, shadowColor: P.sfxRed, rot: -0.03 });
    // line 2 letter by letter
    const total = F.measure(ctx, l2, size2);
    let x = cx - total / 2;
    for (let i = 0; i < l2.length; i++) {
      const ch = l2[i];
      const w = F.measure(ctx, ch, size2);
      const isA = ch === 'A';
      const j = jig(i, 14);
      const wave = isA ? Math.sin(t * 14 - i * 0.9) * 12 : 0;
      const grow = isA ? 1 + 0.08 * Math.sin(t * 9 - i) : 1;
      F.text(ctx, ch, x + w / 2 + j[0], cy + 75 + j[1] + wave, { size: size2 * grow, fill: '#ffe14a', stroke: P.line, lw: size2 * 0.16, shadow: 9, shadowColor: '#b3122b', rot: (h01('lr', i, b) - 0.5) * 0.18 });
      x += w;
    }
    ctx.restore();
  }

  // Level 0: the whole park moment (also what shrinks during the pull-back)
  function drawL0(ctx, t, info) {
    const tw = LIB.onTwos(t);
    park(ctx, t);
    // drama rays + sparkles behind Goofy, stronger once he talks
    const howl = clamp((t - B_SHOUT) / 0.15);
    rays(ctx, 800, 900, t * 0.15, 0.22 + 0.25 * howl);
    F.sparkles(ctx, { n: 10, seed: 2101, t, x: 420, y: 700, w: 640, h: 500, size: 30, color: '#e6f7ff' });
    // tear puddles grow on both sides
    const pw = 120 + 260 * clamp(t / 3.5);
    F.puddle(ctx, GOOFY.x - 290, 1575, pw, { t });
    F.puddle(ctx, GOOFY.x + 480, 1590, pw * 1.1, { t: t + 0.3 });

    // ---- Grant
    const gr = grantFall(ctx, t);
    if (t >= B_FALL) {
      F.dust(ctx, GRANT.x + 40, GROUND - 40, t - B_FALL - 0.12, { n: 7, size: 60, spread: 260, seed: 2102, life: 0.8 });
    }
    if (t >= B_SHOUT && t < B_FALL) F.sweat(ctx, gr.head[0] + 105, gr.head[1] - 80, 1.1);

    // ---- Goofy howling, tears gushing
    const gs = GOOFY.s * (1 + 0.015 * Math.sin(tw * 30) * howl);
    const ga = CAST.goofy(ctx, { x: GOOFY.x, y: GOOFY.y, s: gs, pose: 'howl', face: 'cry', t });
    // howl sound rings from the mouth
    for (let i = 0; i < 3; i++) {
      const age = ((t - B_SHOUT + i * 0.2) % 0.6 + 0.6) % 0.6;
      if (t >= B_SHOUT) F.shockRing(ctx, ga.mouth[0] + 40, ga.mouth[1] - 60, age, { r: 320, life: 0.6, color: '#ffffff', width: 14, squash: 0.7 });
    }
    // extra splash drops at the puddles
    for (let i = 0; i < 8; i++) {
      const u = ((t * 1.8 + i / 8) % 1 + 1) % 1;
      const side = i % 2 ? 1 : -1;
      const bx = side > 0 ? GOOFY.x + 480 : GOOFY.x - 290;
      const px = bx + (h01('sp', i) - 0.5) * 200 * u, py = 1570 - Math.sin(u * Math.PI) * 90;
      F.ellipse(ctx, px, py, 9 * (1 - u * 0.5), 12 * (1 - u * 0.5));
      F.fo(ctx, P.tear, 3);
    }

    // ---- text
    if (t >= B_FALL && t < B_FALL + 0.9) {
      F.sfx(ctx, 'THUD!', 220, 1280, t, B_FALL + 0.12, { size: 92, fill: '#ffffff', shadowColor: '#27335c', rot: -0.15, life: 0.75 });
    }
    howlBubble(ctx, t, ga.mouth);
    if (t >= B_TALK) {
      F.bubble(ctx, 'HE CAN TALK?!', 330, 1060, { size: 50, tail: [gr.head[0] + 40, gr.head[1] - 60], t, t0: B_TALK, shake: 5 });
      F.sweat(ctx, gr.head[0] + 70, gr.head[1] - 120, 0.9);
    }
    return ga;
  }

  // ===========================================================================
  // L1: Yerevan from high above (Ararat, the Cascade, the TV tower, pink tuff blocks)
  // ===========================================================================
  const TUFF = ['#e8b8a0', '#f1c9b0', '#d9a28c', '#f5dcc8', '#e9c4c8'];
  function tvTower(ctx, x, base, h) {
    ctx.save();
    ctx.lineWidth = 3; ctx.strokeStyle = '#8a3040';
    const segs = 8;
    for (let i = 0; i < segs; i++) {
      const y0 = base - (h * i) / segs, y1 = base - (h * (i + 1)) / segs;
      const w0 = lerp(46, 8, i / segs), w1 = lerp(46, 8, (i + 1) / segs);
      ctx.fillStyle = i % 2 ? '#ffffff' : '#e8413c';
      ctx.beginPath(); ctx.moveTo(x - w0 / 2, y0); ctx.lineTo(x + w0 / 2, y0); ctx.lineTo(x + w1 / 2, y1); ctx.lineTo(x - w1 / 2, y1); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#e8413c'; ctx.fillRect(x - 16, base - h * 0.62, 32, 16);
    ctx.beginPath(); ctx.moveTo(x, base - h); ctx.lineTo(x, base - h - 40); ctx.stroke();
    ctx.restore();
  }
  function block(ctx, x, y, w, h, d, col, seed) {
    // simple oblique box: front face, top face, windows
    ctx.fillStyle = col; ctx.fillRect(x, y - h, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + d * 0.6, y - h - d); ctx.lineTo(x + w + d * 0.6, y - h - d); ctx.lineTo(x + w, y - h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(120,70,70,0.25)';
    ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y - h); ctx.lineTo(x + w + d * 0.6, y - h - d); ctx.lineTo(x + w + d * 0.6, y - d); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(80,90,150,0.45)';
    const cw = Math.max(6, w / 6), rh = Math.max(6, h / 5);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) if (h01('w', seed, r, c) > 0.25) ctx.fillRect(x + cw * 0.6 + c * cw, y - h + rh * 0.6 + r * rh, cw * 0.5, rh * 0.45);
    ctx.strokeStyle = 'rgba(90,50,60,0.6)'; ctx.lineWidth = 2;
    ctx.strokeRect(x, y - h, w, h);
  }
  function drawL1(ctx, t, zoomInfo) {
    F.sky(ctx, '#7cc6ff', '#ffe6ea', { mid: '#cdeeff', midAt: 0.6, x: -400, y: -400, w: 1880, h: 1060 });
    F.clouds(ctx, { n: 3, seed: 2111, t, y: 120, h: 260, speed: 10, scale: 0.9 });
    F.ararat(ctx, 30, 700, 1000, 480, {});
    // haze band + plain
    ctx.fillStyle = '#e9d9d0'; ctx.fillRect(-400, 640, 1880, 90);
    ctx.fillStyle = '#d9e8c8'; ctx.fillRect(-400, 700, 1880, 1600);
    tvTower(ctx, 930, 760, 300);
    // rows of pink tuff blocks, growing toward the viewer
    const park = [415, 950, 670, 1340]; // x0, y0, x1, y1 kept clear for the park + Cascade
    for (let r = 0; r < 16; r++) {
      const y = 740 + r * r * 4.2 + r * 40;
      if (y > 2300) break;
      const sc = 0.5 + r * 0.14;
      ctx.fillStyle = '#c9c2c8'; ctx.fillRect(-400, y + 2, 1880, 10 * sc);
      let x = -380 + h01('rx', r) * 60;
      let i = 0;
      while (x < 1460) {
        const w = (50 + h01('bw', r, i) * 70) * sc, h = (40 + h01('bh', r, i) * 90) * sc, d = 16 * sc;
        const inPark = x + w > park[0] && x < park[2] && y > park[1] - 20 && y - h < park[3];
        if (!inPark) {
          if (h01('tr', r, i) < 0.2) {
            ctx.fillStyle = K.tree; ctx.beginPath(); ctx.arc(x + w / 2, y - 14 * sc, 16 * sc, 0, TAU); ctx.fill();
          } else block(ctx, x, y, w, h, d, TUFF[(r + i) % TUFF.length], r * 50 + i);
        }
        x += w + (8 + h01('gap', r, i) * 16) * sc;
        i++;
      }
    }
    // the Cascade and the park at the focus
    ctx.fillStyle = K.hill;
    ctx.beginPath(); ctx.ellipse(540, 1000, 200, 110, 0, Math.PI, TAU); ctx.fill();
    cascade(ctx, 540, 990, 200, 150, 1.5);
    ctx.fillStyle = K.grass;
    F.rrect(ctx, 420, 985, 250, 345, 40); ctx.fill();
    ctx.strokeStyle = '#4f8a3a'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = K.path; F.rrect(ctx, 425, 1205, 240, 60, 20); ctx.fill();
    [[440, 1010, 20], [480, 1020, 16], [650, 1015, 22], [610, 1005, 15], [445, 1300, 18], [650, 1300, 20], [520, 1310, 14]].forEach(([x, y, r]) => roundTree(ctx, x, y + r * 1.4, r, 0));
    // tiny Goofy + Grant where they are in the park (L0 mapped at 1/6)
    const m = (p) => [F1[0] + (p[0] - A[0]) / RATIO, F1[1] + (p[1] - A[1]) / RATIO];
    const gp = m([GOOFY.x, GOOFY.y]);
    ctx.save();
    ctx.translate(0, 0);
    CAST.goofy(ctx, { x: gp[0], y: gp[1], s: GOOFY.s / RATIO, pose: 'howl', face: 'cry', t });
    ctx.restore();
    // howl rings spreading over the city
    for (let i = 0; i < 3; i++) {
      const age = ((t * 0.9 + i / 3) % 1 + 1) % 1;
      F.shockRing(ctx, gp[0] + 15, gp[1] - 70, age, { r: 260, life: 1, color: '#ffffff', width: 6, squash: 0.6 });
    }
  }

  // ===========================================================================
  // L2: the globe (orthographic projection of coarse lon/lat outlines)
  // ===========================================================================
  const LON0 = 20, LAT0 = 42, R = 480;
  const ARM = [44.5, 40.2], ESP = [-3.7, 40.4];
  const LAND = {
    eurasia: [[-9.5, 43.5], [-8, 43.7], [-1.5, 43.4], [-1.2, 46], [-4.6, 48], [-1.6, 48.7], [1.5, 50.8], [4, 51.5], [7, 53.5], [8.5, 54], [8.3, 55.5], [10.5, 57.5],
      [10.5, 55], [12.5, 54.3], [14, 54], [19, 54.5], [21, 55.5], [21.5, 57.5], [24, 57.5], [23.5, 59.3], [30, 60], [34, 64], [40, 66], [44, 68], [60, 70], [80, 73], [110, 76], [140, 72],
      [140, 20], [110, 20], [105, 10], [100, 14], [94, 17], [91, 22.5], [87, 21.5], [80.2, 13.5], [77.5, 8], [72.8, 19], [68.5, 23.5], [66.6, 25.4], [61.5, 25.2], [57, 25.9],
      [59.8, 22.5], [57.8, 19], [52, 16], [45, 12.8], [43.3, 12.7], [42.7, 15.7], [39, 21.5], [35, 28], [34.6, 29.5], [34.3, 31.2], [35, 33], [35.9, 35.1], [36, 36.3],
      [32.5, 36.1], [29.7, 36.2], [27.3, 37], [26.3, 38.5], [26.2, 40], [26, 40.8], [22.8, 40.5], [23.9, 38], [22.3, 36.5], [21.1, 37.8], [20, 39.6], [19.4, 41.8], [15.4, 44.3],
      [13.7, 45.6], [12.3, 45.3], [13.6, 43.6], [16, 41.9], [18.5, 40.2], [17, 40.4], [16.6, 38.4], [15.7, 38], [15.6, 40], [12.3, 41.8], [10.5, 43], [9, 44.4], [7.5, 43.8],
      [4.5, 43.4], [3.2, 42], [0.3, 39.5], [-0.5, 38.3], [-2, 36.7], [-6, 36.2], [-8.9, 37], [-9, 38.7]],
    africa: [[-17, 21], [-17, 14.7], [-16.5, 12], [-13, 8], [-7.5, 4.4], [-2, 4.7], [5, 4.2], [8.7, 4.4], [9.8, 2.5], [9.2, -1], [13.2, -9], [12, -17], [15, -27], [18.4, -34.2],
      [20, -34.8], [25.6, -34], [32.5, -28.6], [35.5, -24], [35, -20], [40.5, -15], [39.3, -7], [40.2, -2.5], [43.5, 2], [51, 11.8], [43.4, 11.6], [39.5, 15.5], [37.2, 21],
      [35.7, 23.9], [32.6, 29.9], [32.3, 31.2], [30, 31.4], [25, 31.8], [20, 30.8], [19.8, 32.2], [15.2, 32.3], [11, 33.2], [10.2, 36.8], [8.6, 36.9], [3, 36.8], [-1.5, 35.2],
      [-5.9, 35.8], [-9.8, 31], [-13, 27.5]],
    scandi: [[5, 58], [5, 62], [10, 64], [14, 67.5], [19, 70], [26, 71], [30, 70], [28, 68], [23, 65.8], [21.5, 63.5], [17.5, 61], [18.8, 59.5], [16.5, 57], [12.7, 55.5], [10.5, 58.8], [8, 58]],
    uk: [[-5.7, 50], [1.5, 51.1], [1.8, 52.7], [0, 53.5], [-1.5, 55], [-2, 57.6], [-4, 58.6], [-5.2, 58.6], [-6.2, 56.5], [-5, 55], [-3, 54.3], [-4.8, 53.3], [-4.3, 52.8], [-5.3, 51.8], [-3.2, 51.4]],
    ireland: [[-6, 52.2], [-6.2, 54], [-7.5, 55.3], [-10, 54.2], [-10, 51.6], [-8, 51.6]],
    madagascar: [[44, -25], [47, -25], [50.5, -15.5], [49.3, -12], [44, -17]],
  };
  const SEAS = {
    black: [[28, 41.5], [28.5, 43.5], [30, 45.3], [33, 44.5], [35.5, 45.3], [38, 47], [39.5, 47], [38, 45], [41.7, 41.5], [36, 41.7], [31, 41.2]],
    caspian: [[47, 44.5], [50.3, 46.5], [53.2, 46.7], [53, 42], [54, 40], [53.9, 37.4], [51, 36.7], [49, 38], [49.5, 40.5], [47.5, 42.9]],
  };
  const DESERTS = [[[-12, 20], [5, 31], [30, 30], [33, 22], [20, 15], [0, 16]], [[37, 27], [50, 28], [56, 20], [48, 16], [42, 18]]];
  // centre of the globe on L2 so that Armenia lands exactly on F2
  function proj0(lon, lat) {
    const l = (lon - LON0) * DEG, p = lat * DEG, p0 = LAT0 * DEG;
    const x = R * Math.cos(p) * Math.sin(l);
    const y = -R * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l));
    const vis = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
    if (vis < 0) { const d = Math.hypot(x, y) || 1; return [(x / d) * R, (y / d) * R]; }
    return [x, y];
  }
  const ARM0 = proj0(ARM[0], ARM[1]);
  const GC = [F2[0] - ARM0[0], F2[1] - ARM0[1]];
  const proj = (lon, lat) => { const q = proj0(lon, lat); return [GC[0] + q[0], GC[1] + q[1]]; };
  function lonlatPath(ctx, pts) {
    ctx.beginPath();
    pts.forEach(([lon, lat], i) => { const q = proj(lon, lat); if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); });
    ctx.closePath();
  }
  function pin(ctx, x, y, col, s = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-8, -14, -22, -26, -22, -42);
    ctx.arc(0, -42, 22, Math.PI, 0);
    ctx.bezierCurveTo(22, -26, 8, -14, 0, 0);
    ctx.closePath();
    F.fo(ctx, col, 4);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -42, 8, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawL2(ctx, t, lod) {
    const [cx, cy] = GC;
    // atmosphere glow
    const ag = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.18);
    ag.addColorStop(0, 'rgba(140,210,255,0.7)');
    ag.addColorStop(1, 'rgba(140,210,255,0)');
    ctx.fillStyle = ag;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.18, 0, TAU); ctx.fill();
    // ocean
    const og = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    og.addColorStop(0, '#6fb8ff');
    og.addColorStop(1, K.oceanDeep);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
    ctx.fillStyle = og; ctx.fill();
    ctx.clip();
    // graticule
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2 / lod;
    for (let lat = -60; lat <= 75; lat += 15) {
      ctx.beginPath();
      for (let lon = -80; lon <= 120; lon += 5) { const q = proj(lon, lat); if (lon === -80) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); }
      ctx.stroke();
    }
    for (let lon = -75; lon <= 115; lon += 15) {
      ctx.beginPath();
      for (let lat = -80; lat <= 85; lat += 5) { const q = proj(lon, lat); if (lat === -80) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); }
      ctx.stroke();
    }
    // land
    ctx.lineJoin = 'round';
    Object.keys(LAND).forEach((k) => {
      lonlatPath(ctx, LAND[k]);
      F.fo(ctx, K.land, 3.5 / lod, K.landLine);
    });
    ctx.save();
    lonlatPath(ctx, LAND.africa); ctx.clip();
    ctx.fillStyle = K.desert; lonlatPath(ctx, DESERTS[0]); ctx.fill();
    ctx.restore();
    ctx.save();
    lonlatPath(ctx, LAND.eurasia); ctx.clip();
    ctx.fillStyle = K.desert; lonlatPath(ctx, DESERTS[1]); ctx.fill();
    ctx.restore();
    Object.keys(SEAS).forEach((k) => { lonlatPath(ctx, SEAS[k]); F.fo(ctx, K.ocean, 3 / lod, K.landLine); });
    // clouds drifting
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 6; i++) {
      const lon = -60 + h01('cl', i) * 160 + t * 6, lat = -40 + h01('cla', i) * 100;
      const q = proj(lon, lat);
      F.ellipse(ctx, q[0], q[1], 60 + h01('clw', i) * 60, 16, -0.2); ctx.fill();
    }
    // night-side shading
    const sg = ctx.createRadialGradient(cx - R * 0.5, cy - R * 0.5, R * 0.6, cx - R * 0.2, cy - R * 0.2, R * 1.5);
    sg.addColorStop(0, 'rgba(10,10,40,0)');
    sg.addColorStop(1, 'rgba(10,10,40,0.55)');
    ctx.fillStyle = sg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
    ctx.strokeStyle = P.line; ctx.lineWidth = 5 / lod; ctx.stroke();
  }
  // globe markers: drawn on top in L2 coordinates, sizes kept constant on screen via lod
  function drawL2Marks(ctx, t, S2) {
    const a = proj(ARM[0], ARM[1]), e = proj(ESP[0], ESP[1]);
    const k = 1 / S2;
    // dotted route Spain <-> Armenia
    ctx.save();
    ctx.setLineDash([14 * k, 12 * k]);
    ctx.lineDashOffset = -t * 60 * k;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6 * k; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.quadraticCurveTo((a[0] + e[0]) / 2, a[1] - 220 * k, a[0], a[1]); ctx.stroke();
    ctx.restore();
    // Armenia: howl rings + pin + flag + label
    for (let i = 0; i < 3; i++) {
      const age = ((t * 1.1 + i / 3) % 1 + 1) % 1;
      F.shockRing(ctx, a[0], a[1], age, { r: 170 * k, life: 1, color: '#ffffff', width: 8 * k, squash: 0.8 });
    }
    pin(ctx, a[0], a[1], '#e8413c', k);
    F.flag(ctx, a[0] + 26 * k, a[1] - 60 * k, 0.55 * k, 'AM', { t });
    ctx.save(); ctx.translate(a[0], a[1]); ctx.scale(k, k);
    F.tag(ctx, 'ARMENIA', 60, 50, { size: 34, bg: P.line });
    ctx.restore();
    // Spain: pin + burger + label
    pin(ctx, e[0], e[1], P.gold, k);
    F.burger(ctx, e[0] - 70 * k, e[1] - 70 * k, 0.28 * k, {});
    ctx.save(); ctx.translate(e[0], e[1]); ctx.scale(k, k);
    F.tag(ctx, 'SPAIN', -10, 50, { size: 34, bg: P.line });
    ctx.restore();
  }

  // ===========================================================================
  // scratch buffers for the feathered levels
  // ===========================================================================
  function scratch(ctx, key) {
    const c = ctx.canvas;
    return LIB.cached(`${ID}-scratch-${key}-${c.width}x${c.height}`, () => FILM.makeCanvas(c.width, c.height));
  }
  // draw a level into a buffer with transform screen = A + (q - F) * s, feather it with an oval
  // mask (strength 0..1), then composite it at alpha
  function level(ctx, key, fx, fy, s, strength, alpha, draw) {
    if (alpha <= 0.002) return;
    const buf = scratch(ctx, key);
    const b = buf.getContext('2d');
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.globalAlpha = 1;
    b.globalCompositeOperation = 'source-over';
    b.clearRect(0, 0, buf.width, buf.height);
    FILM.baseTransform(b);
    b.save();
    b.translate(A[0], A[1]);
    b.scale(s, s);
    b.translate(-fx, -fy);
    draw(b);
    if (strength > 0.001) {
      b.globalCompositeOperation = 'destination-in';
      b.translate(540, 960);
      b.scale(1, 960 / 540);
      const g = b.createRadialGradient(0, 0, 0, 0, 0, 560);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.55, 'rgba(0,0,0,1)');
      g.addColorStop(1, `rgba(0,0,0,${1 - strength})`);
      b.fillStyle = g;
      b.fillRect(-60000, -60000, 120000, 120000);
    }
    b.restore();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.drawImage(buf, 0, 0);
    ctx.restore();
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);

      if (t < B_ZOOM - 1e-6) {
        // ---- the park moment, with camera shake
        const sh = F.shakeMany(t, [[0, 0.3, 10], [B_SHOUT, 0.7, 42], [B_FALL + 0.12, 0.35, 22]], 2120);
        const trem = t > B_SHOUT + 0.7 ? [(h01('tr', LIB.boil(info.T)) - 0.5) * 8, (h01('tq', LIB.boil(info.T)) - 0.5) * 8] : [0, 0];
        const push = 1 + 0.04 * LIB.ease.outCubic(clamp((t - B_SHOUT) / 0.4)) + 0.02 * (t / 4);
        ctx.save();
        ctx.translate(sh[0] + trem[0], sh[1] + trem[1]);
        ctx.translate(A[0], A[1]);
        ctx.scale(push, push);
        ctx.translate(-A[0], -A[1]);
        drawL0(ctx, t, info);
        ctx.restore();
        // impact flash on the shout (2 frames) and on the landing
        if (t >= B_SHOUT - 1e-6 && t < B_SHOUT + 2 * FR - 1e-6) F.flash(ctx, 0.55, '#ffffff');
        F.vignette(ctx, 0.25, '20,30,80');
        return;
      }

      // ---- the pull-back
      const u = clamp((t - B_ZOOM) / ZOOM_DUR);
      const e = LIB.ease.inOutCubic(u);
      const Z = Math.pow(RATIO * RATIO, -e);
      const S1 = RATIO * Z, S2 = RATIO * RATIO * Z;
      // L2 space + globe (bottom level, drawn straight onto the frame)
      F.sky(ctx, K.space, K.space2, {});
      F.stars(ctx, { n: 120, seed: 2130, h: 1920 });
      ctx.save();
      ctx.translate(A[0], A[1]);
      ctx.scale(S2, S2);
      ctx.translate(-F2[0], -F2[1]);
      drawL2(ctx, t, S2);
      drawL2Marks(ctx, t, Math.max(1, S2 * 0.35 + 0.65));
      ctx.restore();
      // L1 Yerevan, feathered, fading when small
      const s1Strength = clamp((1.15 - S1) / 0.35);
      const s1Alpha = clamp((S1 - 0.2) / 0.3);
      level(ctx, 'l1', F1[0], F1[1], S1, s1Strength, s1Alpha, (b) => drawL1(b, t));
      // L0 park, feathered, fading when small
      const s0Strength = clamp((1 - Z) / 0.25);
      const s0Alpha = clamp((Z - 0.2) / 0.3);
      level(ctx, 'l0', A[0], A[1], Z, s0Strength, s0Alpha, (b) => drawL0(b, t, info));
      // zoom lines while pulling back
      const whoosh = Math.sin(clamp(u / 0.9) * Math.PI);
      if (whoosh > 0.02) F.focusLines(ctx, A[0], A[1], { inner: 380, count: 70, color: '#ffffff', alpha: 0.45 * whoosh, seed: 2131, width: 10 });
      // the howl echoes, smaller each time (screen-fixed)
      ECHOES.forEach(([t0, size, y], i) => {
        if (t < t0 - 1e-6) return;
        const last = i === ECHOES.length - 1;
        const age = t - t0;
        const a = last ? clamp(age / 0.15) : clamp(age / 0.12) * (1 - clamp((age - 0.45) / 0.3));
        if (a <= 0) return;
        F.text(ctx, 'I MISS HAAAAYK!!', 540 + (h01('ex', i, LIB.boil(info.T)) - 0.5) * 6, y - age * 30 * (last ? 0 : 1), {
          size, fill: '#ffe14a', stroke: P.line, lw: size * 0.18, alpha: a * (last ? 1 : 0.9), scale: F.popIn(t, t0), shadow: size * 0.07, shadowColor: '#b3122b',
        });
      });
    },
  });
})();
