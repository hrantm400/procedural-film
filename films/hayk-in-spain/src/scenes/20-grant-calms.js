// Shot 20 'grant-calms' : Easy, Goofy... (global T 84.0 - 89.0, local t 0 - 5).
// After the storm: a soft pale-mint calming space (the park dissolved into pastel shapes), soap
// bubbles drifting up, gentle sparkles. Grant (kneel, calm, sweating) kneels beside Goofy (stand)
// and pats him on every beat from t 1.0. Goofy's demon mode deflates: angry until 1.5, a puff of
// dark smoke, red eyes fading back to normal (1.5 - 2.5), then "sad": trembling lip and big tears
// welling up in his eyes, full by t 4.0.
//   t 0.5 (T 84.5)  bubble "EASY, GOOFY... BREATHE..."
//   t 2.0 (T 86.0)  bubble "GOOD BOY. WHAT'S WRONG?"
//
// Layers, back to front:
//   1 mint gradient sky, soft glow, pastel park shapes (Cascade tiers, round trees, lamp posts)
//   2 bokeh + rising soap bubbles (back set), soft ground
//   3 Goofy (stand; angry -> neutral -> sad) with leftover demon smoke, eye glow, welling tears
//   4 Grant (kneel, calm) patting, sweat drops
//   5 front bubbles, sparkles, "pat" marks
//   6 speech bubbles (screen-fixed)
(function () {
  'use strict';
  const ID = 'grant-calms';
  const FILM = window.FILM;
  const F = FILM.fx, CAST = FILM.cast, P = F.pal, LIB = FILM.lib;
  const TAU = Math.PI * 2, FR = 1 / 24;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const h01 = (...k) => F.h01(ID, ...k);
  const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };

  // ---- beats (local t; global T in comments)
  const B_LINE1 = 0.5; // T 84.5  "EASY, GOOFY... BREATHE..."
  const B_PAT0 = 1.0; // T 85.0  first pat, then every beat
  const B_POOF = 1.5; // T 85.5  demon mode deflates (smoke puff)
  const B_LINE2 = 2.0; // T 86.0  "GOOD BOY. WHAT'S WRONG?"
  const B_SAD = 2.5; // T 86.5  face "sad"
  const B_TEARS = 4.0; // T 88.0  tears full
  const GROUND = 1560;
  const GRANT_X = 215, GRANT_Y = 1480, GRANT_S = 1.8; // behind
  const GOOFY_X = 900, GOOFY_Y = 1650, GOOFY_S = 2.25; // in front, head under Grant's hand

  const K = {
    skyTop: '#dff9ee', skyLow: '#c3eedb', glow: 'rgba(255,255,255,0.75)',
    far: '#cdeedf', far2: '#bfe6d3', far3: '#b2dec9', floor: '#a9dcc2', floorShade: '#94cfb2',
    bubble: 'rgba(255,255,255,0.28)', bubbleEdge: 'rgba(90,170,160,0.55)',
  };

  // pastel, outline-free park shapes: the same place, calmed down
  function softPark(ctx) {
    F.sky(ctx, K.skyTop, K.skyLow, { x: -80, y: -80, w: 1240, h: 2080 });
    // far Cascade tiers
    ctx.fillStyle = K.far;
    for (let i = 0; i < 6; i++) {
      const w = 760 * (1 - i * 0.1), y = 1010 - i * 62;
      ctx.fillRect(540 - w / 2, y - 62, w, 64);
    }
    ctx.fillStyle = K.far2;
    ctx.beginPath(); ctx.moveTo(490, 1010); ctx.lineTo(590, 1010); ctx.lineTo(570, 638); ctx.lineTo(510, 638); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 6; i++) {
      const w = 760 * (1 - i * 0.1), y = 1010 - i * 62;
      for (let a = 0; a < 7; a++) {
        const ax = 540 - w / 2 + (a + 0.5) * (w / 7);
        if (Math.abs(ax - 540) < 70) continue;
        F.rrect(ctx, ax - 12, y - 44, 24, 30, 12); ctx.fill();
      }
    }
    // round trees
    const trees = [[80, 1120, 120], [250, 1150, 95], [860, 1130, 115], [1020, 1160, 100], [620, 1170, 80]];
    trees.forEach(([x, y, r], i) => {
      ctx.fillStyle = K.far3;
      ctx.fillRect(x - 10, y - r * 0.6, 20, r * 1.2);
      ctx.fillStyle = i % 2 ? K.far2 : K.far3;
      ctx.beginPath();
      ctx.arc(x, y - r * 1.1, r, 0, TAU);
      ctx.arc(x - r * 0.6, y - r * 0.8, r * 0.7, 0, TAU);
      ctx.arc(x + r * 0.6, y - r * 0.8, r * 0.7, 0, TAU);
      ctx.fill();
    });
    // floor
    ctx.fillStyle = K.floor;
    ctx.fillRect(-80, 1200, 1240, 900);
    ctx.fillStyle = K.floorShade;
    ctx.fillRect(-80, 1200, 1240, 18);
    F.ellipse(ctx, 540, GROUND + 10, 520, 70); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
  }

  // soap bubbles drifting up, wobbling; o.front draws bigger nearer ones
  function bubbles(ctx, t, o) {
    for (let i = 0; i < o.n; i++) {
      const sp = 60 + h01('bs', o.seed, i) * 80;
      const span = 2200;
      const y = 1900 - ((h01('by', o.seed, i) * span + t * sp) % span);
      const x = h01('bx', o.seed, i) * 1080 + Math.sin(t * 1.3 + i * 2.1) * 30;
      const r = o.r0 + h01('br', o.seed, i) * o.r1;
      const wob = 1 + Math.sin(t * 5 + i) * 0.05;
      ctx.save();
      ctx.beginPath(); ctx.ellipse(x, y, r * wob, r / wob, 0, 0, TAU);
      ctx.fillStyle = K.bubble; ctx.fill();
      ctx.strokeStyle = K.bubbleEdge; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = Math.max(3, r * 0.12); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y, r * 0.7, -2.6, -1.8); ctx.stroke();
      ctx.fillStyle = 'rgba(255,190,230,0.35)';
      ctx.beginPath(); ctx.arc(x + r * 0.35, y + r * 0.35, r * 0.25, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  // demon smoke puffs deflating off Goofy (age from B_POOF)
  function smoke(ctx, x, y, age) {
    if (age < 0 || age > 1.1) return;
    const u = age / 1.1;
    ctx.save();
    ctx.globalAlpha = (1 - u) * 0.9;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (h01('sm', i) - 0.5) * 2.6;
      const d = 60 + LIB.ease.outCubic(u) * (160 + h01('smd', i) * 140);
      const r = (40 + h01('smr', i) * 40) * (0.6 + u * 0.8);
      F.ellipse(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d - u * 120, r, r * 0.85);
      F.fo(ctx, i % 2 ? '#4a3a5e' : '#6a5a80', 4, 'rgba(27,20,36,0.5)');
    }
    ctx.restore();
  }

  // a welling tear bead on the lower lid (grows 0..1, wobbles)
  function tearBead(ctx, x, y, s, g, t, seed) {
    if (g <= 0.01) return;
    const wob = 1 + Math.sin(t * 14 + seed) * 0.06 * g;
    const rx = 17 * s * g * wob, ry = 11 * s * g / wob;
    ctx.save();
    F.ellipse(ctx, x, y + ry * 0.3, rx, ry);
    F.fo(ctx, 'rgba(143,216,255,0.9)', 3.5);
    ctx.fillStyle = '#ffffff';
    F.ellipse(ctx, x - rx * 0.35, y - ry * 0.1, rx * 0.28, ry * 0.3); ctx.fill();
    F.ellipse(ctx, x + rx * 0.3, y + ry * 0.5, rx * 0.12, ry * 0.14); ctx.fill();
    ctx.restore();
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const tw = LIB.onTwos(t);

      // camera: slow calm push-in
      const zoom = 1 + 0.05 * LIB.ease.inOutSine(t / info.dur) + 0.07 * LIB.ease.inOutSine(clamp((t - 2.5) / 2.5));
      ctx.save();
      ctx.translate(640, 1250);
      ctx.scale(zoom, zoom);
      ctx.translate(-640, -1250);

      // ---- 1 background
      softPark(ctx);
      // soft light rays fanning down from the top, slowly turning
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const a0 = Math.PI * 0.18 + i * (Math.PI * 0.64 / 9) + Math.sin(t * 0.6) * 0.03, a1 = a0 + 0.07;
        ctx.moveTo(540, -200);
        ctx.lineTo(540 + Math.cos(a0) * 2400, -200 + Math.sin(a0) * 2400);
        ctx.lineTo(540 + Math.cos(a1) * 2400, -200 + Math.sin(a1) * 2400);
        ctx.closePath();
      }
      ctx.fill();
      ctx.restore();
      // calm halo rings behind the pair, breathing slowly (in... out...)
      const breath = 1 + Math.sin(t * Math.PI) * 0.04;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 4; i++) {
        ctx.lineWidth = 10 - i * 2;
        ctx.globalAlpha = 0.8 - i * 0.17;
        ctx.beginPath(); ctx.arc(600, 1000, (260 + i * 110) * breath, 0, TAU); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(600, 1000, 250 * breath, 0, TAU); ctx.fill();
      ctx.restore();
      const glow = ctx.createRadialGradient(560, 1150, 60, 560, 1150, 760);
      glow.addColorStop(0, K.glow);
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-80, 300, 1240, 1700);
      // ---- 2 bokeh + back bubbles
      F.bokeh(ctx, { n: 18, seed: 2001, t, colors: ['#ffffff', '#d8fff0', '#fff0f6'], rMin: 14, rMax: 50, alpha: 0.5 });
      bubbles(ctx, t, { n: 14, seed: 1, r0: 14, r1: 26 });

      // pat timing: a pat lands on every beat from B_PAT0 to 3.5
      let patAge = 99;
      for (let b = B_PAT0; b <= 3.5 + 1e-6; b += 0.5) if (t >= b - 1e-6) patAge = t - b;
      const patDown = patAge < 3 * FR + 1e-6 ? 1 : patAge < 0.25 ? 1 - (patAge - 3 * FR) / (0.25 - 3 * FR) : 0;

      // ---- 3 Grant (behind, kneeling, calm but sweating), leaning into each pat
      const lean = patDown * 0.04 + Math.sin(tw * 2.4) * 0.01;
      const grantO = { x: GRANT_X, y: GRANT_Y, s: GRANT_S, pose: 'kneel', face: 'calm', t, tilt: lean };
      const gr = CAST.grant(ctx, grantO);
      const drip = ((t * 0.7) % 1);
      F.sweat(ctx, gr.head[0] - 120, gr.head[1] - 50 + drip * 70, 1.3, { flip: true });
      F.sweat(ctx, gr.head[0] + 115, gr.head[1] - 90, 0.9);
      if (t < 2.0) F.sweat(ctx, gr.head[0] + 135, gr.head[1] + 10 + ((t * 1.3) % 1) * 60, 0.7);

      // ---- 4 Goofy (in front): angry -> neutral (smoke puff, red glow fading) -> sad
      const faceName = t < B_POOF - 1e-6 ? 'angry' : t < B_SAD - 1e-6 ? 'neutral' : 'sad';
      const shiver = faceName === 'sad' ? (h01('sv', LIB.boil(info.T)) - 0.5) * 4 : 0;
      const gx = GOOFY_X + shiver, gs = GOOFY_S;
      ctx.save();
      const sq = patDown * 0.045; // squish under the pat
      ctx.translate(gx, GOOFY_Y);
      ctx.scale(1 + sq * 0.6, 1 - sq);
      ctx.translate(-gx, -GOOFY_Y);
      const ga = CAST.goofy(ctx, { x: gx, y: GOOFY_Y, s: gs, pose: 'stand', face: faceName, flip: true, t, look: faceName === 'sad' ? [-0.5, -0.5] : [-0.4, 0] });
      ctx.restore();
      // leftover red eye glow fading 1.5 -> 2.5
      const red = faceName === 'neutral' ? 1 - sstep(B_POOF, B_SAD, t) : 0;
      if (red > 0.01) {
        ctx.save();
        ctx.globalAlpha = red * 0.85;
        [ga.eyeL, ga.eyeR].forEach((e) => {
          const g = ctx.createRadialGradient(e[0], e[1], 2, e[0], e[1], 60);
          g.addColorStop(0, 'rgba(255,35,64,0.95)');
          g.addColorStop(0.45, 'rgba(255,35,64,0.5)');
          g.addColorStop(1, 'rgba(255,35,64,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(e[0], e[1], 60, 0, TAU); ctx.fill();
        });
        ctx.restore();
      }
      smoke(ctx, ga.head[0] + 120, ga.head[1] - 60, t - B_POOF);
      // trembling lip + welling tears
      if (faceName === 'sad') {
        const g = sstep(B_SAD, B_TEARS, t);
        const b = LIB.boil(info.T);
        ctx.save();
        ctx.strokeStyle = P.line; ctx.lineWidth = 5; ctx.lineCap = 'round';
        const m = ga.mouth;
        // tremble marks either side of the frown (frown centre = mouth anchor + (12, 4) * s, flipped)
        const fx = m[0] + 12 * gs, fy = m[1] + 4 * gs;
        [-1, 1].forEach((side) => {
          for (let i = 0; i < 2; i++) {
            const jx = (h01('lp', side, i, b) - 0.5) * 6;
            const x = fx + side * (52 + i * 14) + jx;
            ctx.beginPath();
            ctx.moveTo(x, fy - 12);
            ctx.lineTo(x + side * 5, fy - 4);
            ctx.lineTo(x - side * 3, fy + 4);
            ctx.lineTo(x + side * 3, fy + 12);
            ctx.stroke();
          }
        });
        ctx.restore();
        tearBead(ctx, ga.eyeL[0], ga.eyeL[1] + 17 * gs, gs, g, t, 1);
        tearBead(ctx, ga.eyeR[0], ga.eyeR[1] + 17 * gs, gs, g, t, 2);
        if (g > 0.3) {
          F.sparkle(ctx, ga.eyeL[0] - 8, ga.eyeL[1] - 16, 18 * g, { glow: false });
          F.sparkle(ctx, ga.eyeR[0] - 8, ga.eyeR[1] - 16, 18 * g, { glow: false });
        }
        if (t > 3.2) F.gloom(ctx, ga.head[0] + 150, ga.head[1] - 160, 160, 120, { count: 5, color: 'rgba(90,120,190,0.55)', seed: 2004 });
      }
      if (faceName === 'angry') F.vein(ctx, ga.head[0] + 120, ga.top[1] + 40, 1.2);

      // Grant's patting hand redrawn over Goofy's head (clipped to the hand)
      ctx.save();
      ctx.beginPath(); ctx.arc(gr.handR[0], gr.handR[1], 34 * GRANT_S, 0, TAU); ctx.clip();
      CAST.grant(ctx, grantO);
      ctx.restore();
      // "pat" marks next to the hand
      if (patAge < 0.35) {
        const u = patAge / 0.35;
        ctx.save();
        ctx.globalAlpha = 1 - u;
        F.text(ctx, 'pat', gr.handR[0] + 70, gr.handR[1] - 90 - u * 30, { size: 46, fill: '#ffffff', stroke: '#3a8f7a', lw: 8, rot: -0.2 });
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 7; ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          const a = -Math.PI / 2 + i * 0.5;
          ctx.beginPath();
          ctx.moveTo(gr.handR[0] + Math.cos(a) * 60, gr.handR[1] + Math.sin(a) * 60);
          ctx.lineTo(gr.handR[0] + Math.cos(a) * (95 + u * 20), gr.handR[1] + Math.sin(a) * (95 + u * 20));
          ctx.stroke();
        }
        ctx.restore();
      }
      // demon mode deflating: a limp little "pshhh..."
      if (t >= B_POOF - 1e-6 && t < B_POOF + 1.2) {
        ctx.save();
        ctx.globalAlpha = 1 - clamp((t - B_POOF - 0.9) / 0.3);
        F.text(ctx, 'pshhh...', ga.head[0] + 170, ga.head[1] - 250 - (t - B_POOF) * 40, { size: 50, fill: '#b9a8d8', stroke: '#4a3a5e', lw: 8, rot: 0.12, scale: F.popIn(t, B_POOF) });
        ctx.restore();
      }

      // ---- 5 front bubbles + sparkles
      bubbles(ctx, t, { n: 6, seed: 2, r0: 26, r1: 34 });
      F.sparkles(ctx, { n: 12, seed: 2005, t, x: 60, y: 300, w: 960, h: 1200, size: 26, color: '#ffffff' });

      ctx.restore(); // camera

      // ---- 6 speech bubbles (screen-fixed)
      const b1a = t < 3.5 ? 1 : 1 - clamp((t - 3.5) / 0.25);
      if (b1a > 0) {
        ctx.save();
        ctx.globalAlpha = b1a;
        F.bubble(ctx, 'EASY, GOOFY... BREATHE...', 420, 320, { size: 56, maxW: 560, tail: [330, 560], t, t0: B_LINE1 });
        ctx.restore();
      }
      F.bubble(ctx, "GOOD BOY. WHAT'S WRONG?", 730, 560, { size: 54, maxW: 520, tail: [520, 780], t, t0: B_LINE2 });
    },
  });
})();
