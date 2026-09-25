/*
 * Shot 05 'leash-handoff' : Grant takes the leash. T 17.0 - 21.0 (local 0 - 4 s).
 *
 * Beats (local t):
 *   0.0  outside Hayk's Yerevan apartment building, bright day. Hayk (left, "give", "smile") holds
 *        the red leash out; Goofy sits between them looking up at Hayk, "sad"; Grant on the right.
 *   0.5  Hayk: "GRANT, TAKE CARE OF GOOFY. ONE MONTH."
 *   1.0  Grant reaches; the leash handle changes hands at 1.25 (pop + sparkle)
 *   1.5  Grant "thumbsUp", face "confident", leash in his other hand
 *   2.0  Grant: "EASY. WHAT COULD GO WRONG?"
 *   2.5  sparkle "ting" on Grant's glasses and teeth
 *   3.0  ominous: the world dims, camera creeps onto Goofy, who turns to camera with a dark shadow
 *        over his eyes and a small "..." bubble (foreshadowing)
 *
 * Layers (back to front):
 *   1. sky + clouds, far rooftops, Ararat hint
 *   2. apartment building facade (pink tuff): windows, balconies, laundry, AC units, entrance, canopy
 *   3. tree, street lamp, parked taxi, sidewalk tiles, curb
 *   4. suitcase, Hayk, Goofy, Grant, leash
 *   5. ominous dim + Goofy shadow eyes (from 3.0)
 *   6. screen-space bubbles
 */
(function () {
  'use strict';
  const ID = 'leash-handoff';
  const FILM = window.FILM;
  const LIB = FILM.lib;
  const F = FILM.fx;
  const P = F.pal;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sstep = (a, b, v) => { const u = clamp((v - a) / (b - a)); return u * u * (3 - 2 * u); };
  const h01 = (...k) => F.h01(ID, ...k);

  const B_HAYK = 0.5; // T 17.5
  const B_REACH = 1.0; // T 18.0
  const B_SWAP = 1.25;
  const B_THUMB = 1.5; // T 18.5
  const B_GRANT = 2.0; // T 19.0
  const B_TING = 2.5; // T 19.5
  const B_OMEN = 3.0; // T 20.0

  const GROUND = 1690;
  const HAYK = { x: 255, s: 1.5 };
  const GRANT = { x: 840, s: 1.36 };
  const GOOFY = { x: 548, s: 1.55 };

  const COL = {
    tuff: '#e9b39a', tuffShade: '#d49a82', tuffDark: '#c48670', tuffLine: '#b87a66',
    win: '#9fd4f2', winShade: '#7bb6de', frame: '#fff4e6', rail: '#6f6a7e', walk: '#e6dccb', walkLine: '#cbbfa8',
    curb: '#bdb3a4', road: '#8d8a95',
  };

  // ---------- background pieces (all t-independent except clouds/laundry/leaves)
  function sky(ctx, t) {
    F.sky(ctx, '#58b6ff', P.daySkyLow, { h: 900 });
    // big soft sun glow top-right
    const g = ctx.createRadialGradient(930, 120, 20, 930, 120, 420);
    g.addColorStop(0, 'rgba(255,250,215,0.95)');
    g.addColorStop(0.25, 'rgba(255,245,200,0.45)');
    g.addColorStop(1, 'rgba(255,245,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(400, -200, 900, 800);
    F.clouds(ctx, { n: 4, seed: 505, t, y: 70, h: 180, speed: 22, scale: 0.8 });
    // Ararat far away, between buildings
    F.ararat(ctx, -120, 470, 620, 300, { color: '#a9b8e0', shade: '#94a4d2', snow: '#f7faff' });
    // far rooftops (flat, soft)
    ctx.fillStyle = '#cfb3c4';
    ctx.fillRect(-20, 390, 220, 200);
    ctx.fillRect(820, 360, 300, 240);
    ctx.fillStyle = '#bfa3b6';
    for (let i = 0; i < 4; i++) ctx.fillRect(850 + i * 60, 400, 26, 34);
    for (let i = 0; i < 3; i++) ctx.fillRect(20 + i * 60, 430, 24, 32);
  }

  function building(ctx, t) {
    const x0 = 60, x1 = 1020, top = 420, base = 1450;
    // roof parapet, antenna, dish
    ctx.strokeStyle = P.line; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(760, top - 10); ctx.lineTo(760, top - 150); ctx.moveTo(730, top - 120); ctx.lineTo(790, top - 120); ctx.moveTo(740, top - 90); ctx.lineTo(780, top - 90); ctx.stroke();
    F.ellipse(ctx, 300, top - 40, 36, 30, -0.5); F.fo(ctx, '#f2f2f2', 4);
    // facade
    F.rrect(ctx, x0, top, x1 - x0, base - top + 60, 4); F.fo(ctx, COL.tuff, 5);
    // stone block texture (tuff blocks)
    ctx.strokeStyle = 'rgba(184,122,102,0.35)'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let r = 0; r * 60 + top < base; r++) {
      const y = top + r * 60;
      ctx.moveTo(x0, y); ctx.lineTo(x1, y);
      for (let c = 0; c < 9; c++) { const x = x0 + ((c * 120 + (r % 2) * 60) % (x1 - x0)); ctx.moveTo(x, y); ctx.lineTo(x, y + 60); }
    }
    ctx.stroke();
    ctx.fillStyle = COL.tuffShade;
    ctx.fillRect(x0, top, x1 - x0, 26);
    F.rrect(ctx, x0 - 16, top - 20, x1 - x0 + 32, 30, 4); F.fo(ctx, COL.tuffDark, 4);

    // windows: two rows, with balconies on the upper row
    const cols = [150, 390, 690, 930];
    cols.forEach((cx, i) => {
      [560, 820].forEach((wy, r) => {
        if (r === 1 && (i === 1 || i === 2)) return; // entrance canopy area
        const ww = 150, wh = 180;
        F.rrect(ctx, cx - ww / 2 - 12, wy - 12, ww + 24, wh + 24, 6); F.fo(ctx, COL.frame, 4);
        F.rrect(ctx, cx - ww / 2, wy, ww, wh, 3); F.fo(ctx, COL.win, 3.5);
        // reflection band + mullion
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath(); ctx.moveTo(cx - ww / 2 + 20, wy); ctx.lineTo(cx - ww / 2 + 60, wy); ctx.lineTo(cx - ww / 2 + 10, wy + wh); ctx.lineTo(cx - ww / 2, wy + wh); ctx.lineTo(cx - ww / 2, wy + 30); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = P.line; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(cx, wy); ctx.lineTo(cx, wy + wh); ctx.moveTo(cx - ww / 2, wy + 70); ctx.lineTo(cx + ww / 2, wy + 70); ctx.stroke();
        // curtain in some windows
        if ((i + r) % 2 === 0) {
          ctx.fillStyle = i % 3 ? '#ffd6a8' : '#ffb3c6';
          ctx.beginPath(); ctx.moveTo(cx + 4, wy + 3); ctx.lineTo(cx + ww / 2 - 3, wy + 3); ctx.lineTo(cx + ww / 2 - 3, wy + wh - 3); ctx.quadraticCurveTo(cx + 40, wy + 90, cx + 4, wy + 3); ctx.fill();
        }
        if (r === 0) {
          // balcony slab + railing + flower pots
          F.rrect(ctx, cx - 110, wy + wh + 10, 220, 20, 4); F.fo(ctx, COL.tuffDark, 4);
          ctx.strokeStyle = COL.rail; ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(cx - 104, wy + wh - 70); ctx.lineTo(cx + 104, wy + wh - 70);
          for (let k = 0; k <= 10; k++) { const x = cx - 104 + k * 20.8; ctx.moveTo(x, wy + wh - 70); ctx.lineTo(x, wy + wh + 10); }
          ctx.stroke();
          ctx.strokeStyle = P.line; ctx.lineWidth = 3;
          ctx.strokeRect(cx - 106, wy + wh - 72, 212, 4);
          [[-70, '#ff5f7a'], [-10, '#ffc933'], [55, '#ff8a3d']].forEach(([dx, c], k) => {
            if ((i + k) % 2) return;
            F.rrect(ctx, cx + dx - 18, wy + wh - 104, 36, 32, 5); F.fo(ctx, '#c46a3e', 3);
            ctx.fillStyle = P.tree; ctx.beginPath(); ctx.arc(cx + dx, wy + wh - 112, 20, 0, TAU); ctx.fill();
            ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx + dx - 8, wy + wh - 120, 7, 0, TAU); ctx.arc(cx + dx + 9, wy + wh - 114, 6, 0, TAU); ctx.fill();
          });
        }
      });
    });
    // laundry line between balconies 1 and 2, swaying
    const sway = Math.sin(t * 2.4) * 6;
    ctx.strokeStyle = P.line; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(500, 690); ctx.quadraticCurveTo(540, 730, 580, 690); ctx.stroke();
    [['#ff6b6b', 515], ['#6fc3ff', 548], ['#ffe066', 570]].forEach(([c, x], k) => {
      ctx.save(); ctx.translate(x, 705 + (k === 1 ? 6 : 0)); ctx.rotate((sway + k * 3) * 0.02);
      F.rrect(ctx, -12, 0, 24, 34 + k * 4, 3); F.fo(ctx, c, 3); ctx.restore();
    });
    // AC units
    [[250, 800], [840, 790]].forEach(([x, y]) => {
      F.rrect(ctx, x - 50, y, 100, 64, 6); F.fo(ctx, '#f0f0f0', 4);
      ctx.strokeStyle = 'rgba(27,20,36,0.5)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); for (let k = 0; k < 5; k++) { ctx.moveTo(x - 40, y + 12 + k * 10); ctx.lineTo(x + 40, y + 12 + k * 10); } ctx.stroke();
    });

    // entrance: steps, metal door, canopy, number plate, lamp
    const ex = 540;
    F.rrect(ctx, ex - 180, 1050, 360, 400, 6); F.fo(ctx, COL.tuffDark, 5);
    F.rrect(ctx, ex - 130, 1100, 260, 350, 4); F.fo(ctx, '#4a5b78', 5);
    ctx.strokeStyle = P.line; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(ex, 1100); ctx.lineTo(ex, 1450); ctx.stroke();
    F.rrect(ctx, ex - 110, 1125, 90, 110, 6); F.fo(ctx, '#8fc4e8', 3.5);
    F.rrect(ctx, ex + 20, 1125, 90, 110, 6); F.fo(ctx, '#8fc4e8', 3.5);
    F.rrect(ctx, ex - 40, 1270, 18, 60, 6); F.fo(ctx, '#c9ccd6', 3);
    F.rrect(ctx, ex + 22, 1270, 18, 60, 6); F.fo(ctx, '#c9ccd6', 3);
    // intercom
    F.rrect(ctx, ex + 150, 1210, 40, 70, 6); F.fo(ctx, '#d9d9e0', 3.5);
    // canopy
    ctx.beginPath(); ctx.moveTo(ex - 230, 1050); ctx.lineTo(ex + 230, 1050); ctx.lineTo(ex + 200, 1000); ctx.lineTo(ex - 200, 1000); ctx.closePath(); F.fo(ctx, '#5d6f8f', 5);
    // number plate (decorative, no must-read text)
    F.ellipse(ctx, ex, 960, 42, 28); F.fo(ctx, '#2f5aa8', 4);
    F.ellipse(ctx, ex, 960, 30, 18); F.fo(ctx, '#ffffff', 0);
    ctx.fillStyle = '#2f5aa8'; ctx.fillRect(ex - 14, 952, 28, 6); ctx.fillRect(ex - 14, 964, 28, 6);
    // steps
    F.rrect(ctx, ex - 220, 1450, 440, 40, 4); F.fo(ctx, '#d9cdbd', 4);
    F.rrect(ctx, ex - 260, 1488, 520, 40, 4); F.fo(ctx, '#e6dccb', 4);
  }

  function street(ctx, t) {
    // sidewalk
    ctx.fillStyle = COL.walk;
    ctx.fillRect(-100, 1500, 1300, 500);
    ctx.strokeStyle = COL.walkLine; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let r = 0; r < 6; r++) { const y = 1528 + r * r * 14 + r * 30; ctx.moveTo(-100, y); ctx.lineTo(1200, y); }
    for (let i = -8; i <= 8; i++) { ctx.moveTo(540 + i * 120, 1528); ctx.lineTo(540 + i * 220, 1950); }
    ctx.stroke();
    // shading toward bottom
    const g = ctx.createLinearGradient(0, 1500, 0, 1920);
    g.addColorStop(0, 'rgba(120,90,70,0.18)'); g.addColorStop(0.3, 'rgba(120,90,70,0)'); g.addColorStop(1, 'rgba(90,60,50,0.18)');
    ctx.fillStyle = g; ctx.fillRect(-100, 1500, 1300, 500);
    // building base shadow line
    ctx.fillStyle = 'rgba(80,50,50,0.22)';
    ctx.fillRect(-100, 1500, 1300, 18);
  }

  function tree(ctx, t, x, y, s, seed) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-12, -260); ctx.lineTo(12, -260); ctx.lineTo(20, 0); ctx.closePath(); F.fo(ctx, P.trunk, 4);
    const sw = Math.sin(t * 1.6 + seed) * 4;
    const blobs = [[0, -330, 110], [-90, -290, 80], [90, -290, 85], [-50, -400, 80], [60, -400, 80], [0, -460, 70]];
    ctx.beginPath();
    blobs.forEach(([bx, by, r]) => { ctx.moveTo(bx + sw + r, by); ctx.arc(bx + sw, by, r, 0, TAU); });
    ctx.fillStyle = P.treeShade; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = P.line; ctx.stroke();
    ctx.beginPath();
    blobs.forEach(([bx, by, r]) => { ctx.moveTo(bx + sw - 10 + r * 0.8, by - 12); ctx.arc(bx + sw - 10, by - 12, r * 0.8, 0, TAU); });
    ctx.fillStyle = P.tree; ctx.fill();
    ctx.restore();
  }

  function lamp(ctx, x, y) {
    ctx.strokeStyle = P.line; ctx.lineWidth = 16;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 700); ctx.quadraticCurveTo(x, y - 760, x - 60, y - 760); ctx.stroke();
    ctx.strokeStyle = '#4a4f63'; ctx.lineWidth = 9; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 100, y - 740); ctx.lineTo(x - 30, y - 740); ctx.lineTo(x - 45, y - 710); ctx.lineTo(x - 85, y - 710); ctx.closePath(); F.fo(ctx, '#4a4f63', 4);
    F.ellipse(ctx, x - 65, y - 705, 16, 8); F.fo(ctx, '#fff3b0', 3);
  }

  // falling leaves drifting across (moving element)
  function leaves(ctx, t) {
    for (let i = 0; i < 7; i++) {
      const per = 3.2 + h01('lp', i) * 1.5;
      const u = ((t / per + h01('lo', i)) % 1 + 1) % 1;
      const x = -60 + u * 1200 + Math.sin(u * 9 + i) * 40;
      const y = 300 + h01('ly', i) * 900 + u * 260 + Math.sin(u * 12 + i) * 30;
      ctx.save(); ctx.translate(x, y); ctx.rotate(u * 9 + i);
      F.ellipse(ctx, 0, 0, 14, 7); F.fo(ctx, i % 2 ? '#8fd16a' : '#ffc94d', 2.5);
      ctx.restore();
    }
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const tw = LIB.onTwos(t);
      const omen = sstep(B_OMEN - 0.05, B_OMEN + 0.35, t);

      // camera: slow push from the whole group, then creep onto Goofy from 3.0
      const zc = lerp(1.0, 1.05, LIB.ease.inOutSine(clamp(t / 3))) + 0.95 * LIB.ease.outCubic(clamp((t - B_OMEN) / 0.5));
      const fx = lerp(540, GOOFY.x - 50, omen), fy = lerp(1150, 1430, omen);
      const [kx, ky] = F.shake(t, B_OMEN, 0.3, 8, 5);
      const toScreen = (p) => [540 + kx + (p[0] - fx) * zc, 1150 + ky + (p[1] - fy) * zc];

      ctx.save();
      ctx.translate(540 + kx, 1150 + ky);
      ctx.scale(zc, zc);
      ctx.translate(-fx, -fy);

      // parallax: sky/far layer drifts less
      ctx.save();
      ctx.translate((fx - 540) * 0.4, (fy - 1150) * 0.3);
      sky(ctx, t);
      ctx.restore();
      building(ctx, t);
      tree(ctx, t, -10, 1520, 1.25, 1);
      lamp(ctx, 1020, 1540);
      street(ctx, t);
      // parked taxi peeking at the right edge (off to the airport soon)
      ctx.save();
      ctx.translate(1010, 1560);
      F.rrect(ctx, 0, -150, 300, 120, 30); F.fo(ctx, '#ffd23f', 5);
      F.rrect(ctx, 30, -210, 190, 80, 24); F.fo(ctx, '#ffd23f', 5);
      F.rrect(ctx, 50, -196, 70, 56, 10); F.fo(ctx, '#9fd4f2', 3.5);
      F.ellipse(ctx, 70, -30, 40, 40); F.fo(ctx, '#2a2a33', 5);
      F.ellipse(ctx, 70, -30, 16, 16); F.fo(ctx, '#c9ccd6', 3);
      F.rrect(ctx, 90, -236, 70, 26, 6); F.fo(ctx, '#ffffff', 4);
      ctx.restore();

      // ---------- characters
      // suitcase behind Hayk
      F.suitcase(ctx, 90, GROUND - 6, 0.95, { color: '#e8413c' });

      // Hayk: holds the leash out (hand bobs as he speaks)
      const talk = t >= B_HAYK && t < B_HAYK + 1.6;
      const hBob = Math.sin(tw * Math.PI * 2) * 5;
      const ha = FILM.cast.hayk(ctx, {
        x: HAYK.x, y: GROUND, s: HAYK.s, pose: t < B_OMEN ? 'give' : 'stand', face: t < B_OMEN ? 'smile' : 'happy', t: tw,
        tilt: talk ? Math.sin(tw * 9) * 0.015 : 0,
      });
      void hBob;

      // Grant: reaches (flip give) until 1.5, then thumbs up (squash on the switch)
      const thumb = t >= B_THUMB;
      const gsq = thumb && t < B_THUMB + 2 / 12;
      ctx.save();
      ctx.translate(GRANT.x, GROUND);
      ctx.scale(gsq ? 1.05 : 1, gsq ? 0.93 : 1);
      ctx.translate(-GRANT.x, -GROUND);
      const reachU = LIB.ease.outBack(clamp((t - B_REACH + 0.1) / 0.25));
      const ga = FILM.cast.grant(ctx, {
        x: GRANT.x - (thumb ? 0 : 20 * reachU), y: GROUND, s: GRANT.s,
        pose: thumb ? 'thumbsUp' : t >= B_REACH - 0.1 ? 'give' : 'stand', flip: !thumb,
        face: 'confident', t: tw + 0.7,
      });
      ctx.restore();

      // Goofy between them: looks up at Hayk (sad), then turns to camera at 3.0
      const turned = t >= B_OMEN;
      const gy = GROUND + 10;
      const gsq2 = turned && t < B_OMEN + 2 / 12;
      ctx.save();
      ctx.translate(GOOFY.x, gy);
      ctx.scale(gsq2 ? 1.04 : 1, gsq2 ? 0.95 : 1);
      ctx.translate(-GOOFY.x, -gy);
      const go = FILM.cast.goofy(ctx, {
        x: GOOFY.x, y: gy, s: GOOFY.s, flip: true, pose: 'sit', t: tw,
        face: turned ? 'neutral' : 'sad', look: turned ? [-0.2, 0.1] : [0.7, -1], blink: false,
      });
      ctx.restore();

      // leash: Hayk's hand until the swap, then Grant's hand
      const holder = t < B_SWAP ? ha.handR : thumb ? ga.handL : ga.handL;
      F.leash(ctx, go.collar, holder, { sag: t < B_SWAP ? 90 : 120 });
      // leash handle loop at the hand
      F.ellipse(ctx, holder[0], holder[1] + 10, 16, 20); ctx.lineWidth = 11; ctx.strokeStyle = P.line; ctx.stroke(); ctx.lineWidth = 6; ctx.strokeStyle = P.leash; ctx.stroke();
      if (t >= B_SWAP && t < B_SWAP + 0.5) {
        const k = F.popIn(t, B_SWAP);
        F.burst(ctx, holder[0], holder[1], 70 * k, 40 * k, 10, '#fff3a0', { lw: 4, seed: 51 });
        F.sparkle(ctx, holder[0] + 30, holder[1] - 40, 40 * k, { rot: t * 2 });
      }

      // Goofy sad tear glints before the omen
      if (!turned) {
        F.sparkle(ctx, go.eyeL[0] - 6, go.eyeL[1] - 8, 12 + 5 * Math.sin(t * 9), { glow: false });
        F.sweat(ctx, go.top[0] + 70, go.top[1] + 20, 0.9);
      }

      // teeth + glasses ting at 2.5
      if (t >= B_TING - 1 / 12) {
        const age = t - B_TING;
        const r = age < 0 ? 20 : 70 * Math.max(0, 1 - Math.abs(age - 0.15) / 0.5) + 18;
        F.sparkle(ctx, ga.eyeR[0] + 18, ga.eyeR[1] - 14, r, { rot: age * 3 });
        F.sparkle(ctx, ga.mouth[0] + 16, ga.mouth[1] + 2, r * 0.75, { rot: -age * 3, color: '#fffbd0' });
      }

      // ---------- ominous beat: world dims, Goofy's eyes go dark
      if (omen > 0) {
        ctx.save();
        ctx.globalAlpha = 0.5 * omen;
        const g = ctx.createRadialGradient(go.head[0], go.head[1], 120, go.head[0], go.head[1], 900);
        g.addColorStop(0, 'rgba(40,20,70,0.1)');
        g.addColorStop(1, 'rgba(30,10,50,1)');
        ctx.fillStyle = g;
        ctx.fillRect(-400, -400, 1900, 2800);
        ctx.restore();
        // shadow band over the upper face
        ctx.save();
        const hs = GOOFY.s;
        F.ellipse(ctx, go.head[0], go.head[1] - 8 * hs, 70 * hs, 66 * hs);
        ctx.clip();
        ctx.globalAlpha = 0.85 * omen;
        const sg = ctx.createLinearGradient(0, go.head[1] - 80 * hs, 0, go.head[1] + 12 * hs);
        sg.addColorStop(0, '#1a0b24'); sg.addColorStop(0.75, '#2a1440'); sg.addColorStop(1, 'rgba(42,20,64,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(go.head[0] - 100 * hs, go.head[1] - 100 * hs, 200 * hs, 115 * hs);
        ctx.restore();
        // eye glints in the shadow
        ctx.save();
        ctx.globalAlpha = omen;
        [go.eyeL, go.eyeR].forEach((e) => {
          ctx.fillStyle = 'rgba(255,40,70,0.35)';
          ctx.beginPath(); ctx.arc(e[0], e[1], 16, 0, TAU); ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.ellipse(e[0], e[1], 7, 4, 0, 0, TAU); ctx.fill();
        });
        ctx.restore();
      }

      leaves(ctx, t);
      ctx.restore(); // camera

      // ---------- screen space: bubbles (outside the camera so they stay put)
      const hHead = toScreen(ha.head), gHead = toScreen(ga.head), dHead = toScreen(go.top);
      if (t >= B_HAYK && t < B_OMEN) {
        F.bubble(ctx, 'GRANT, TAKE CARE OF GOOFY. ONE MONTH.', 400, 300, {
          size: 54, maxW: 640, t, t0: B_HAYK, tail: [hHead[0] + 20, hHead[1] - 150],
        });
      }
      if (t >= B_GRANT) {
        F.bubble(ctx, 'EASY. WHAT COULD GO WRONG?', 690, 560, {
          size: 56, maxW: 470, t, t0: B_GRANT, tail: [Math.min(gHead[0], 900), gHead[1] - 140 * (t < B_OMEN ? 1 : 1.3)],
        });
      }
      if (t >= B_OMEN) {
        F.bubble(ctx, '...', 850, 900, { size: 90, t, t0: B_OMEN + 0.15, tail: [dHead[0] + 190, dHead[1] + 60], fill: '#ffffff', color: '#2a1440', pad: 30 });
      }
      F.vignette(ctx, 0.18 + 0.35 * omen, omen > 0.5 ? '30,10,50' : '40,30,60');
    },
  });
})();
