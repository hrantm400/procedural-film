/*
 * Shot 15 'investor-call' : "An investor calls" (T 64.0 - 68.0, 4 s).
 * Close-up in a Spanish burger joint. Hayk's big face (chewing, cheeks stuffed like a hamster)
 * fills the upper frame; in the foreground his hand holds a buzzing phone (FILM.fx.phone) with
 * shake lines: "INVESTOR CALLING..." and a green and a red button. At 1.5 his thumb swipes the
 * red button: "DECLINED" stamp. At 2.0 a muffled bubble: "MMF... LATER. BURGER FIRST."
 * At 3.0 he takes another bite from the burger in his other hand: CHOMP, crumbs.
 *
 * Foreground hands are FILM.cast.hayk arms at a larger scale, clipped to the forearm and hand
 * (a close-up cheat: the main figure is drawn without its arms).
 *
 * Layers, back to front:
 *   1. restaurant wall (cached): menu board, neon sign, window, pendant lamps
 *   2. bokeh, buzz focus lines
 *   3. Hayk (head + torso only), hamster cheek puffs, sweat/sparkles
 *   4. table (cached) with tray, fries, drink
 *   5. phone + swiping hand, burger hand
 *   6. stamp, bubble, SFX, flashes
 */
(function () {
  'use strict';

  const ID = 'investor-call';
  const FR = 1 / 24;
  const TAU = Math.PI * 2;

  const T_SWIPE = 1.5; // T 65.5 decline swipe
  const T_BUBBLE = 2.0; // T 66.0
  const T_BITE = 3.0; // T 67.0

  // main figure
  const HX = 380, HS = 2.6, HY = 612 + 462 * HS; // head centre at (380, 612)
  // phone
  const PH = { x: 684, y: 1196, s: 1.58, rot: 0.1 };
  // helper arms
  const ARM_S = 3.0;

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const lerp2 = (p, q, u) => [lerp(p[0], q[0], u), lerp(p[1], q[1], u)];

  // phone-local point -> world
  function phoneW(lx, ly, jig) {
    const r = PH.rot + (jig ? jig[2] : 0);
    const x = lx * PH.s, y = ly * PH.s;
    return [PH.x + (jig ? jig[0] : 0) + x * Math.cos(r) - y * Math.sin(r), PH.y + (jig ? jig[1] : 0) + x * Math.sin(r) + y * Math.cos(r)];
  }
  // button centres in phone-local coords (origin = phone centre)
  const RED = [-50, 150], GREEN = [50, 150];

  // ---------------------------------------------------------------------------
  // cached backgrounds
  // ---------------------------------------------------------------------------
  function wall(F) {
    return FILM.lib.cached(ID + '-wall', () => {
      const c = FILM.makeCanvas(1080, 1920);
      const g = c.getContext('2d');
      const P = F.pal;
      F.sky(g, '#ffd9b0', '#ffb98a');
      // tiled lower wall (azulejo pattern)
      g.fillStyle = '#f7efe0'; g.fillRect(0, 980, 1080, 440);
      for (let y = 990; y < 1420; y += 70) {
        for (let x = 0; x < 1080; x += 70) {
          g.fillStyle = ((x + y) / 70) % 2 ? '#dfe9f5' : '#f7efe0';
          g.fillRect(x + 2, y + 2, 66, 66);
          g.fillStyle = 'rgba(40,90,170,0.35)';
          g.beginPath(); g.moveTo(x + 35, y + 12); g.lineTo(x + 58, y + 35); g.lineTo(x + 35, y + 58); g.lineTo(x + 12, y + 35); g.closePath(); g.fill();
        }
      }
      g.fillStyle = '#d9653b'; g.fillRect(0, 966, 1080, 22);
      // window on the right with a soft street
      F.rrect(g, 700, 250, 420, 640, 30); F.fo(g, '#8fd0ff', 5, 'rgba(27,20,36,0.5)');
      const sg = g.createLinearGradient(0, 250, 0, 890);
      sg.addColorStop(0, '#6fc0ff'); sg.addColorStop(1, '#d6f0ff');
      g.fillStyle = sg; F.rrect(g, 712, 262, 396, 616, 24); g.fill();
      [[730, 520, 120, 360, '#fff0da'], [860, 460, 140, 420, '#f6dcb6'], [1000, 560, 120, 320, '#ffe7c7']].forEach(([x, y, w, h, col]) => {
        g.fillStyle = col; g.fillRect(x, y, w, h);
        g.fillStyle = '#d9653b'; g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + w / 2, y - 40); g.lineTo(x + w + 10, y); g.closePath(); g.fill();
        g.fillStyle = 'rgba(80,130,190,0.5)';
        for (let yy = y + 40; yy < y + h - 40; yy += 80) for (let xx = x + 18; xx < x + w - 30; xx += 44) g.fillRect(xx, yy, 24, 40);
      });
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath(); g.moveTo(740, 870); g.lineTo(860, 270); g.lineTo(920, 270); g.lineTo(800, 870); g.closePath(); g.fill();
      g.strokeStyle = '#fff6e3'; g.lineWidth = 16;
      g.beginPath(); g.moveTo(910, 256); g.lineTo(910, 884); g.stroke();
      // menu board on the left (soft, low contrast)
      F.rrect(g, -40, 200, 380, 520, 24); F.fo(g, '#3a2a3e', 5, 'rgba(27,20,36,0.6)');
      for (let i = 0; i < 4; i++) {
        const y = 290 + i * 110;
        g.save(); g.globalAlpha = 0.85;
        F.burger(g, 60, y, 0.34);
        g.restore();
        g.fillStyle = 'rgba(255,230,180,0.5)';
        g.fillRect(130, y - 16, 150, 12);
        g.fillStyle = 'rgba(255,210,90,0.6)';
        g.fillRect(130, y + 8, 70, 12);
      }
      // pendant lamps
      [[200, 0], [560, 0]].forEach(([x]) => {
        g.strokeStyle = '#3a2a3e'; g.lineWidth = 5;
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 120); g.stroke();
        const lg = g.createRadialGradient(x, 170, 10, x, 170, 260);
        lg.addColorStop(0, 'rgba(255,240,190,0.75)'); lg.addColorStop(1, 'rgba(255,240,190,0)');
        g.fillStyle = lg; g.beginPath(); g.arc(x, 170, 260, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(x - 70, 170); g.quadraticCurveTo(x, 70, x + 70, 170); g.closePath();
        F.fo(g, '#e8413c', 5);
      });
      return c;
    });
  }

  function table(F) {
    return FILM.lib.cached(ID + '-table', () => {
      const c = FILM.makeCanvas(1080, 1920);
      const g = c.getContext('2d');
      const P = F.pal;
      // table top (perspective)
      g.beginPath(); g.moveTo(-40, 1420); g.lineTo(1120, 1420); g.lineTo(1120, 1920); g.lineTo(-40, 1920); g.closePath();
      F.fo(g, '#c98a54', 5);
      g.fillStyle = '#b07440';
      for (let i = 0; i < 6; i++) { g.fillRect(-40, 1460 + i * 80, 1160, 6); }
      g.fillStyle = 'rgba(255,230,190,0.25)';
      g.beginPath(); g.ellipse(560, 1520, 460, 60, 0, 0, TAU); g.fill();
      // red tray at left with fries + drink
      g.save();
      g.translate(150, 1600);
      g.rotate(-0.08);
      F.rrect(g, -200, -40, 380, 250, 20); F.fo(g, '#e5323a', 5);
      F.rrect(g, -180, -24, 340, 218, 14); g.fillStyle = '#fff2d6'; g.fill();
      g.strokeStyle = 'rgba(229,50,58,0.5)'; g.lineWidth = 6;
      for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-170 + i * 70, -20); g.lineTo(-130 + i * 70, 190); g.stroke(); }
      g.restore();
      F.fries(g, 70, 1640, 0.75, {});
      F.drink(g, 250, 1700, 0.62, {});
      // crumpled wrapper
      g.beginPath(); g.arc(-10, 1720, 40, 0, TAU); F.fo(g, '#ffe4b0', 4);
      return c;
    });
  }

  // ---------------------------------------------------------------------------
  // helper: a Hayk forearm + hand from the cast, clipped to a capsule
  // ---------------------------------------------------------------------------
  const ARM_POSES = {
    // [a0, a1] of the posed arm (right arm, unflipped), from cast.js humanPose
    give: [1.2, 0.25],
    point: [1.62, -0.1],
  };
  function armVecAngle(pose) {
    const [a0, a1] = ARM_POSES[pose];
    const x = 94 * Math.sin(a0) + 102 * Math.sin(a0 + a1), y = 94 * Math.cos(a0) + 102 * Math.cos(a0 + a1);
    return Math.atan2(y, x);
  }
  /**
   * castArm(ctx, o{ hand:[x,y], dir:[dx,dy] unit vector hand -> shoulder, pose, flip, s, t, front, width })
   * draws Hayk (cast) posed so the chosen arm runs along `dir` and its hand lands on `hand`, clipped
   * to a capsule around that forearm. `front` extends the capsule past the hand (for a finger).
   */
  function castArm(ctx, C, o) {
    const s = o.s;
    const want = Math.atan2(-o.dir[1], -o.dir[0]); // shoulder -> hand
    let base = armVecAngle(o.pose);
    if (o.flip) base = Math.PI - base;
    const tilt = want - base;
    const key = o.flip ? 'handL' : 'handR';
    const spec = { x: 0, y: 0, s, pose: o.pose, flip: !!o.flip, tilt, t: o.t, belly: 0.8, face: 'neutral' };
    const probe = C.hayk(ctx, Object.assign({}, spec, { alpha: 0 }));
    const hp = probe[key];
    spec.x = o.hand[0] - hp[0];
    spec.y = o.hand[1] - hp[1];
    const w = o.width || 86 * s / 3;
    const [dx, dy] = o.dir;
    const nx = -dy, ny = dx;
    const hx = o.hand[0] - dx * (o.front || 0), hy = o.hand[1] - dy * (o.front || 0);
    const L = 1400;
    ctx.save();
    ctx.beginPath();
    const ang = Math.atan2(ny, nx);
    ctx.moveTo(hx + nx * w, hy + ny * w);
    ctx.arc(hx, hy, w, ang, ang + Math.PI, false);
    ctx.lineTo(hx - nx * w + dx * L, hy - ny * w + dy * L);
    ctx.lineTo(hx + nx * w + dx * L, hy + ny * w + dy * L);
    ctx.closePath();
    ctx.clip();
    const a = C.hayk(ctx, spec);
    ctx.restore();
    return a[key];
  }

  // ---------------------------------------------------------------------------
  // phone screen
  // ---------------------------------------------------------------------------
  function screen(F, t) {
    return (g, w, h) => {
      const declined = t >= T_SWIPE - 1e-6;
      const P = F.pal;
      if (!declined) {
        const sg = g.createLinearGradient(0, 0, 0, h);
        sg.addColorStop(0, '#1d3a6e'); sg.addColorStop(1, '#0d1630');
        g.fillStyle = sg; g.fillRect(0, 0, w, h);
      } else {
        const sg = g.createLinearGradient(0, 0, 0, h);
        sg.addColorStop(0, '#6e1020'); sg.addColorStop(1, '#2a0610');
        g.fillStyle = sg; g.fillRect(0, 0, w, h);
      }
      // status bar
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.fillRect(16, 30, 30, 8); g.fillRect(w - 50, 30, 34, 10);
      // caller avatar: a suit with a money-bag head
      const ax = w / 2, ay = 118;
      if (!declined) {
        const pr = 60 + (t * 2 % 1) * 40;
        g.strokeStyle = `rgba(143,216,255,${1 - (t * 2 % 1)})`; g.lineWidth = 4;
        g.beginPath(); g.arc(ax, ay, pr, 0, TAU); g.stroke();
      }
      g.beginPath(); g.arc(ax, ay, 52, 0, TAU); F.fo(g, '#e9eef8', 4);
      g.save();
      g.beginPath(); g.arc(ax, ay, 50, 0, TAU); g.clip();
      g.fillStyle = '#2a2f45'; g.beginPath(); g.moveTo(ax - 44, ay + 60); g.lineTo(ax - 30, ay + 22); g.lineTo(ax + 30, ay + 22); g.lineTo(ax + 44, ay + 60); g.closePath(); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(ax - 10, ay + 22); g.lineTo(ax, ay + 44); g.lineTo(ax + 10, ay + 22); g.closePath(); g.fill();
      g.fillStyle = '#c9a15a'; g.beginPath(); g.arc(ax, ay - 6, 22, 0, TAU); g.fill();
      g.fillStyle = '#2a2f45'; g.fillRect(ax - 7, ay - 34, 14, 10);
      F.text(g, '$', ax, ay - 4, { size: 26, fill: '#2a2f45', lw: 0 });
      g.restore();
      if (!declined) {
        F.text(g, 'INVESTOR', w / 2, 212, { size: 32, fill: '#ffffff', lw: 0 });
        F.text(g, 'CALLING...', w / 2, 250, { size: 30, fill: '#8fd8ff', lw: 0 });
        // buttons; the red one slides with the thumb
        const slide = clamp((t - (T_SWIPE - 0.1)) / 0.1);
        const bp = 1 + 0.08 * Math.sin(t * 16);
        const gx = GREEN[0] + 106, gy = GREEN[1] + 222;
        g.beginPath(); g.arc(gx, gy, 32 * bp, 0, TAU); F.fo(g, P.up, 4);
        phoneIcon(g, gx, gy, 0, '#ffffff');
        const rx = RED[0] + 106 - slide * 40, ry = RED[1] + 222;
        g.beginPath(); g.arc(rx, ry, 32, 0, TAU); F.fo(g, P.down, 4);
        phoneIcon(g, rx, ry, 2.36, '#ffffff');
        F.text(g, 'DECLINE', RED[0] + 106, ry + 52, { size: 14, fill: '#ffb3bb', lw: 0 });
        F.text(g, 'ACCEPT', gx, gy + 52, { size: 14, fill: '#b3ffd6', lw: 0 });
      } else {
        F.text(g, 'CALL', w / 2, 262, { size: 30, fill: '#ffd0d6', lw: 0 });
        F.text(g, 'ENDED', w / 2, 298, { size: 30, fill: '#ffd0d6', lw: 0 });
        g.beginPath(); g.arc(w / 2, RED[1] + 222, 32, 0, TAU); F.fo(g, '#5a1420', 4);
        phoneIcon(g, w / 2, RED[1] + 222, 2.36, '#ff8a96');
      }
    };
  }
  function phoneIcon(g, x, y, rot, col) {
    g.save();
    g.translate(x, y); g.rotate(rot);
    g.strokeStyle = col; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 0, 13, Math.PI * 0.7, Math.PI * 1.3); g.stroke();
    g.restore();
  }

  // ---------------------------------------------------------------------------
  // hamster cheeks (a gag overlay on the cast head: puffed cheeks bulge past the jaw)
  // ---------------------------------------------------------------------------
  function cheeks(ctx, F, a, t, puff) {
    const P = F.pal;
    const k = 1.15 * HS; // head scale
    const chew = Math.abs(Math.sin(t * 14));
    const r = (1 + 0.06 * chew) * puff;
    ctx.save();
    ctx.translate(a.head[0], a.head[1]);
    ctx.scale(k, k);
    [-1, 1].forEach((sd) => {
      const cx = sd * 58, cy = 34;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 27 * r, 23 * r, sd * 0.3, 0, TAU);
      ctx.fillStyle = sd > 0 ? '#f0bb93' : P.skin;
      ctx.fill();
      ctx.strokeStyle = P.line; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 27 * r, 23 * r, sd * 0.3, sd > 0 ? -1.3 : Math.PI - 1.5, sd > 0 ? 1.5 : Math.PI + 1.3);
      ctx.stroke();
      // blush + shine
      ctx.fillStyle = 'rgba(255,120,120,0.55)';
      ctx.beginPath(); ctx.ellipse(cx - sd * 4, cy + 6, 16, 8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.ellipse(cx + sd * 8, cy - 10, 6, 4, 0, 0, TAU); ctx.fill();
    });
    ctx.restore();
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
      const declined = t >= T_SWIPE - 1e-6;
      const buzzing = !declined;
      const fi = Math.floor(t * 24 + 1e-6);

      // camera: slow push towards the phone, shake on the swipe and the bite
      const push = 1 + 0.03 * L.ease.inOutCubic(t / info.dur);
      const sh = F.shakeMany(t, [[T_SWIPE, 0.35, 22], [T_BITE, 0.3, 14]], 1501);
      ctx.save();
      ctx.translate(560 + sh[0], 1000 + sh[1]);
      ctx.scale(push, push);
      ctx.translate(-560, -1000);

      // 1. wall
      ctx.drawImage(wall(F), 0, 0);
      // 2. bokeh + buzz focus lines
      F.bokeh(ctx, { n: 16, seed: 1502, t, colors: ['#fff1b8', '#ffd1a8', '#ffffff'], alpha: 0.35, rMin: 20, rMax: 70, y: 0, h: 1000 });
      if (buzzing) {
        F.focusLines(ctx, PH.x, PH.y, { inner: 420, count: 70, color: '#8a3a2a', alpha: 0.22, seed: 1503, width: 12 });
      } else if (t < T_SWIPE + 0.5) {
        F.focusLines(ctx, PH.x, PH.y, { inner: 360, count: 90, color: '#ff3b3b', alpha: 0.45 * (1 - (t - T_SWIPE) / 0.5), seed: 1504, width: 18 });
      }

      // 3. Hayk: head + torso only (arms are clipped away: close-up cheat)
      const bob = Math.sin(tw * Math.PI * 4) * 4;
      const biteLean = t >= T_BITE - 0.2 && t < T_BITE + 0.4 ? Math.sin(clamp((t - T_BITE + 0.2) / 0.6) * Math.PI) * 18 : 0;
      const hy = HY + bob + biteLean;
      const s = HS;
      const shW = 66 + 8;
      const shoulderY = hy - 378 * s;
      const hipY = hy - 206 * s;
      ctx.save();
      ctx.beginPath();
      ctx.rect(HX - 140 * s, 0, 280 * s, shoulderY - 4 * s);
      ctx.rect(HX - (shW + 8) * s, shoulderY - 5 * s, (shW + 8) * 2 * s, hipY - shoulderY + 60 * s);
      ctx.clip();
      const a = C.hayk(ctx, { x: HX, y: hy, s, t, pose: 'float', face: 'chewing', belly: 1, headTilt: 0.1 + Math.sin(tw * 3) * 0.03 });
      ctx.restore();
      const puff = t >= T_BITE ? 1.12 : 1;
      cheeks(ctx, F, a, t, puff);
      // chewing lines at the jaw
      if (Math.floor(t * 6) % 2 === 0) {
        ctx.save();
        ctx.strokeStyle = P.line; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(a.head[0] - 270, a.head[1] + 40); ctx.lineTo(a.head[0] - 300, a.head[1] + 30);
        ctx.moveTo(a.head[0] - 262, a.head[1] + 80); ctx.lineTo(a.head[0] - 296, a.head[1] + 86);
        ctx.stroke();
        ctx.restore();
      }
      // a sweat drop appears while the phone buzzes
      if (buzzing && t > 0.5) F.sweat(ctx, a.head[0] + 190, a.head[1] - 150 + Math.min(30, (t - 0.5) * 40), 1.6);
      // content sparkles once the call is gone
      if (t > T_SWIPE + 0.3) F.sparkles(ctx, { x: 120, y: 280, w: 560, h: 500, n: 6, seed: 1505, t, size: 30 });

      // 4. table
      ctx.drawImage(table(F), 0, 0);

      // 5a. burger hand (screen-left, from the bottom-left), bite at T_BITE
      const restB = [214, 1400];
      const mouthB = [a.mouth[0] - 150, a.mouth[1] + 130];
      let bu = 0;
      if (t >= 2.35 && t < T_BITE) bu = L.ease.inOutCubic((t - 2.35) / (T_BITE - 2.35));
      else if (t >= T_BITE && t < T_BITE + 0.25) bu = 1;
      else if (t >= T_BITE + 0.25) bu = 1 - 0.55 * L.ease.outCubic((t - T_BITE - 0.25) / 0.5);
      const bHand = lerp2(restB, mouthB, bu);
      bHand[1] += Math.sin(tw * Math.PI * 2) * 4;
      const bDir = [-0.6, 0.8];
      castArm(ctx, C, { hand: bHand, dir: bDir, pose: 'give', flip: false, s: ARM_S, t, front: 30 });
      const bite = t >= T_BITE - 1e-6 ? 0.42 : 0.2;
      F.burger(ctx, bHand[0] + 34, bHand[1] - 120, 1.35, { bite, rot: -0.12 + bu * 0.05 });

      // 5b. phone (buzzing) + swiping thumb hand from the bottom-right
      const jig = buzzing ? [(F.h01(ID, 'jx', fi) - 0.5) * 16, (F.h01(ID, 'jy', fi) - 0.5) * 10, (F.h01(ID, 'jr', fi) - 0.5) * 0.05] : [0, 0, 0];
      // shake lines around the phone
      if (buzzing) {
        ctx.save();
        ctx.strokeStyle = P.line; ctx.lineWidth = 8; ctx.lineCap = 'round';
        const on = fi % 4 < 2;
        [[1, 0]].forEach(([sd]) => {
          for (let k = 0; k < 3; k++) {
            const r = 60 + k * 34 + (on ? 8 : 0);
            const cx = PH.x + sd * 120 * PH.s, cy = PH.y - 150 * PH.s;
            ctx.beginPath();
            ctx.arc(cx, cy, r, sd > 0 ? -0.6 : Math.PI - 0.6, sd > 0 ? 0.6 : Math.PI + 0.6);
            ctx.stroke();
          }
        });
        ctx.restore();
      }
      F.phone(ctx, PH.x + jig[0], PH.y + jig[1], PH.s, { rot: PH.rot + jig[2], screen: screen(F, t), color: '#26212e' });

      // thumb path (fingertip), in world coords
      const rb = phoneW(RED[0], RED[1], jig);
      const d = [0.552, 0.834]; // hand -> shoulder
      const reach = 44 * ARM_S; // palm centre -> fingertip
      let tip;
      if (t < 1.15) tip = [rb[0] + 40 + Math.sin(tw * 5) * 6, rb[1] + 150];
      else if (t < T_SWIPE - 0.1) tip = lerp2([rb[0] + 40, rb[1] + 150], [rb[0] + 6, rb[1] + 2], L.ease.inOutCubic((t - 1.15) / (T_SWIPE - 0.1 - 1.15)));
      else if (t < T_SWIPE + 0.12) tip = lerp2([rb[0] + 6, rb[1] + 2], [rb[0] - 170, rb[1] - 26], L.ease.outCubic((t - (T_SWIPE - 0.1)) / 0.22));
      else tip = lerp2([rb[0] - 170, rb[1] - 26], [rb[0] + 60, rb[1] + 150], L.ease.inOutCubic(clamp((t - 2.3) / 0.6)));
      const palm = [tip[0] + d[0] * reach, tip[1] + d[1] * reach];
      // swipe smear
      if (t >= T_SWIPE - 0.1 && t < T_SWIPE + 0.3) {
        const u = 1 - (t - (T_SWIPE - 0.1)) / 0.4;
        F.speedLines(ctx, { angle: Math.PI + 0.12, count: 12, color: '#ffffff', alpha: 0.9 * u, seed: 1506, t, speed: 2600, len: 260, width: 12, x: rb[0] - 260, y: rb[1] - 110, w: 420, h: 200 });
      }
      castArm(ctx, C, { hand: palm, dir: d, pose: 'point', flip: true, s: ARM_S, t, front: 170 });

      // 6. DECLINED stamp on the phone
      if (declined) {
        F.stamp(ctx, 'DECLINED', PH.x - 10, PH.y - 40, t + FR, T_SWIPE, { size: 88, color: '#ff2f45', rot: -0.28 });
        F.shockRing(ctx, rb[0], rb[1], t - T_SWIPE + FR, { r: 320, color: '#ff4d5e', life: 0.4, width: 20 });
      }
      ctx.restore(); // camera

      // screen-fixed text
      if (buzzing) {
        for (let b = 0; b < 3; b++) F.sfx(ctx, 'BZZT!', 870, 700 + (b % 2) * 30, t, b * 0.5, { size: 78, fill: '#ffffff', shadowColor: '#3a8dde', rot: 0.2 + (b % 2) * -0.3, life: 0.42 });
      }
      if (t >= T_SWIPE - 1e-6) F.sfx(ctx, 'SWIPE!', 290, 990, t, T_SWIPE, { size: 96, fill: '#ff3b3b', shadowColor: '#5a0a14', rot: -0.18, life: 0.75 });
      F.bubble(ctx, 'MMF... LATER. BURGER FIRST.', 776, 330, {
        size: 50, maxW: 420, t, t0: T_BUBBLE, tail: [a.mouth[0] + 205, a.mouth[1] - 70], shake: 6,
      });
      if (t >= T_BITE - 1e-6) {
        F.crumbs(ctx, a.mouth[0] - 40, a.mouth[1] + 20, t - T_BITE + FR, { n: 16, seed: 1507, spread: 460, life: 0.9 });
        F.sfx(ctx, 'CHOMP!', 250, 470, t, T_BITE, { size: 110, fill: P.sfxYellow, rot: -0.2, life: 0.9 });
      }
      // impact flash on the swipe (2 frames)
      if (t >= T_SWIPE - 1e-6 && t < T_SWIPE + FR * 1.5) F.flash(ctx, 0.5, '#ffffff');
    },
  });
})();
