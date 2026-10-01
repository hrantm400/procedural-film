// 05 notif-storm: "Round 4: notification storm" (global T 6.667 - 8.333, 1 bar, 100 frames)
// ENTRY: match cut on Time centred (540, 960) s 2.5, dizzy; camera zooms out (outCubic, 0.35 s) to a
// phone lock screen (03:47, purple-night wallpaper). биржа (sitting on the phone's top edge) spams
// notifications on every 8th note, they stack down from the top and shove Time's own notifications
// off the bottom. Beat 3 (t = 1.25): Time uppercuts the stack, BAM!, everything flies apart.
// EXIT: the frame brightens toward white (the next shot opens on a flash).
// Layers, back to front:
//   1 background stripes + floaties (world, rides the camera)
//   2 биржа peeking behind the phone top
//   3 phone + lock screen (wallpaper, stars, clock, stacked notifications, bottom buttons)
//   4 Time (on the screen's bottom), gloves, effects
//   5 flying notifications after the uppercut, BAM!, shock ring
//   6 screen-fixed: ROUND 4 label, exit brightening
(function () {
  'use strict';
  const ID = 'notif-storm';
  const FILM = window.FILM;
  const F = FILM.fx;
  const CAST = FILM.cast;
  const C = F.pal;
  const E = F.E;
  const TAU = Math.PI * 2;
  const clamp = F.clamp, lerp = F.lerp, seg = F.seg;
  const BEAT = F.BEAT, EIGHTH = BEAT / 2;

  // ---- layout (world coords = final framing) ----
  const PH = { cx: 540, cy: 1000, w: 820, h: 1640 };
  const TIME = { x: 540, y: 1460, s: 0.8 }; // R = 96
  const ZOOM0 = 2.5 / TIME.s; // the match cut: s 2.5 on screen at (540, 960)
  const ZOOM_DUR = 0.35;
  const N_X = 190, N_W = 700, N_H = 160, N_STEP = 172, N_TOP = 500;
  const HIT = 3 * BEAT; // 1.25 uppercut
  const L0 = HIT - 0.05; // Time launches 3 frames early so the glove connects on the beat

  const BZ = [
    { title: 'BTC -5% in 10 min', time: 'now' },
    { title: 'Liquidation alert!', time: 'now' },
    { title: 'New listing: PEPE2', time: 'now' },
    { title: 'Funding rate spiked', time: 'now' },
    { title: 'Whale moved 900 BTC', time: 'now' },
  ];
  const ARR = BZ.map((_, k) => (k + 1) * EIGHTH); // 0.208 .. 1.042
  const MINE = [
    { title: 'Gym at 7', app: 'Calendar' },
    { title: 'Dinner with family', app: 'Calendar' },
    { title: 'Sleep', app: 'Reminders' },
  ];

  // eased arrival progress (with overshoot) of notification k
  const arrive = (t, k) => (t < ARR[k] - 1e-6 ? 0 : E.outBack(clamp((t - ARR[k] + 1 / 60) / 0.2)));
  const pushCount = (t, from) => { let s = 0; for (let j = from; j < ARR.length; j++) s += arrive(t, j); return s; };

  // ---- icons ----
  const bzIcon = (t) => (ctx, size) => { CAST.birzha(ctx, { x: 0, y: 0, s: size / 240, t, face: 'laugh', greedy: true }); };
  const timeIcon = (t) => (ctx, size) => { CAST.time(ctx, { x: 0, y: 0, s: size / 240, t, face: 'calm', ring: 1 }); };

  /** a notification card via FILM.fx.notif with a bigger, bolder title on top */
  function notification(ctx, x, y, o) {
    F.notif(ctx, x, y, N_W, { h: N_H, icon: o.icon, app: o.app, time: o.time, alpha: o.alpha });
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    F.text(ctx, o.title, x + N_H * 0.18 + N_H * 0.5 + N_H * 0.16, y + N_H * 0.62, { size: 38, fill: o.color || C.ink, align: 'left', rounded: false });
    ctx.restore();
  }

  // ---- flying notification after the uppercut ----
  function flyState(k, i0x, i0y, age) {
    const cx = i0x + N_W / 2, cy = i0y + N_H / 2;
    const dx = cx - 540 + (F.h01(ID, 'fx', k) - 0.5) * 500;
    const dir = Math.sign(dx || (k % 2 ? 1 : -1));
    const vx = dir * (900 + F.h01(ID, 'vx', k) * 900);
    const vy = -(900 + F.h01(ID, 'vy', k) * 900) - (5 - k) * 120;
    const spin = dir * (5 + F.h01(ID, 'sp', k) * 6);
    return { x: cx + vx * age, y: cy + vy * age + 0.5 * 2600 * age * age, rot: spin * age };
  }

  function draw(ctx, tIn, info) {
    const t = Math.min(Math.max(tIn, 0), info.dur);
    const W = FILM.W, H = FILM.H;

    // camera: zoom out from Time's face
    const ez = E.outCubic(clamp(t / ZOOM_DUR));
    const z = lerp(ZOOM0, 1, ez);
    const ax = lerp(540, TIME.x, ez), ay = lerp(960, TIME.y, ez);
    const sk = F.shakeMany(t, [[HIT, 0.4, 26], ...ARR.map((a) => [a, 0.12, 4])], 51);

    ctx.save();
    ctx.translate(sk[0], sk[1]);
    ctx.translate(ax, ay);
    ctx.scale(z, z);
    ctx.translate(-TIME.x, -TIME.y);

    // 1 background
    F.stripes(ctx, { colorA: '#ffd6e4', colorB: '#ffc6da', width: 70, angle: -0.6, offset: t * 60 });
    F.floaties(ctx, { n: 14, seed: 505, t, alpha: 0.75, size: 30 });

    // 2 биржа on the phone's top edge, slamming a glove down on every 8th
    const bzX = 790, bzBase = 190;
    const tapIdx = Math.floor((t + 0.0001) / EIGHTH);
    const tapAge = t - tapIdx * EIGHTH;
    const hop = t < HIT ? -Math.sin(clamp(tapAge / EIGHTH) * Math.PI) * 26 : 0;
    const knock = t >= HIT ? seg(t, HIT, HIT + 0.35, 'outCubic') : 0;
    const bzY = bzBase - 60 + hop - knock * 70;
    const [bsx, bsy] = t < HIT ? F.squash(t, tapIdx * EIGHTH, 0.18, 0.2) : F.squash(t, HIT, -0.3, 0.4);
    const gAng = tapAge / EIGHTH;
    CAST.birzha(ctx, {
      x: bzX, y: bzY, s: 0.62, t, sx: bsx, sy: bsy, rot: knock * 0.5,
      face: t < HIT ? 'laugh' : 'shocked', greedy: t < HIT, jaw: t < HIT ? 0.35 + 0.35 * Math.sin(t * 22) * 0.5 + 0.15 : 0.6,
      gloves: t < HIT ? { l: [bzX - 110, bzBase + 20 - Math.abs(Math.sin(gAng * Math.PI)) * 50], r: [bzX + 95, bzBase - 30] } : { l: [bzX - 120, bzY - 90], r: [bzX + 110, bzY - 100] },
    });

    // 3 phone + lock screen
    const vib = t < HIT ? F.beatPulse(t, EIGHTH, 0.05) * 0.008 * Math.sin(t * 120) : 0;
    const phoneRot = vib + (t >= HIT ? F.squash(t, HIT, 0.05, 0.5)[0] - 1 : 0) * 0.3;
    F.phone(ctx, PH.cx, PH.cy, PH.w, PH.h, {
      rot: phoneRot,
      screenBg: '#2a1f5c',
      screen: (c, sw, sh) => lockScreen(c, sw, sh, t),
    });
    // re-draw биржа's front glove over the phone edge so it reads as tapping on it
    if (t < HIT) CAST.glove(ctx, bzX - 110, bzBase + 20 - Math.abs(Math.sin(gAng * Math.PI)) * 50, 0.62 * 0.95, Math.PI * 0.62, C.bzGlove, C.bzGlove2);

    // tap pings
    ARR.forEach((a, k) => { F.shockRing(ctx, bzX - 110, bzBase + 30, t - a, { r: 90, width: 8, color: '#ffffff', life: 0.3 }); });

    // 4 Time
    drawTime(ctx, t);

    // 5 flying notifications + BAM
    if (t >= HIT) {
      const age = t - HIT;
      for (let k = BZ.length - 1; k >= 0; k--) {
        const slot = pushCount(HIT, k + 1);
        const y0 = N_TOP + slot * N_STEP + PH.cy - 1000;
        const s = flyState(k, N_X, y0, age + 0.035);
        if (s.y > 1300) continue; // never let text land in the bottom strip
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        const sc = 1 - age * 0.35;
        ctx.scale(sc, sc);
        notification(ctx, -N_W / 2, -N_H / 2, { icon: bzIcon(t), app: 'биржа', time: 'now', title: BZ[k].title, color: C.bzDeep });
        ctx.restore();
      }
      F.focusLines(ctx, 540, 1180, { inner: 260, count: 48, color: '#ffffff', alpha: 0.7 * (1 - seg(t, HIT, HIT + 0.3)), t });
      F.shockRing(ctx, 560, 1180, age, { r: 420, width: 26, color: '#ffffff', life: 0.45 });
      F.impactStar(ctx, 560, 1150, t, HIT, { word: 'BAM!', size: 200, life: 0.42, color: C.yellow, rot: -0.15 });
      F.confettiBurst(ctx, 560, 1150, age, { n: 34, seed: 55, power: 1500, life: 1.0 });
    }
    ctx.restore();

    // 6 screen-fixed overlay
    const lp = F.popIn(t, 0.3, 0.5);
    if (lp > 0.001) {
      ctx.save();
      ctx.translate(108, 262);
      ctx.rotate(-0.06);
      ctx.scale(lp, lp);
      F.dropShadow(ctx, (c) => F.label(c, 'ROUND 4', 0, 0, { size: 44, bg: C.ink, color: C.yellow, align: 'left' }), { dy: 8, blur: 14 });
      ctx.restore();
    }
    // exit: brighten toward the flash of the next shot
    const wh = seg(t, info.dur - 0.12, info.dur, 'inQuad');
    if (wh > 0) { ctx.save(); ctx.globalAlpha = wh * 0.7; ctx.fillStyle = '#ffffff'; ctx.fillRect(-200, -200, W + 400, H + 400); ctx.restore(); }
  }

  // ---- lock screen (screen-local coords, origin = screen top-left) ----
  function lockScreen(ctx, sw, sh, t) {
    const ox = PH.cx - PH.w / 2 + PH.w * 0.04, oy = PH.cy - PH.h / 2 + PH.w * 0.04; // screen origin in world
    ctx.fillStyle = F.linGrad(ctx, 0, 0, 0, sh, [[0, '#1d1650'], [0.45, '#4a2f9a'], [0.8, '#8a4fc4'], [1, '#e07ab8']]);
    ctx.fillRect(0, 0, sw, sh);
    // moon glow + stars
    ctx.fillStyle = F.radGrad(ctx, sw * 0.78, sh * 0.2, 10, 360, [[0, 'rgba(255,240,200,0.35)'], [1, 'rgba(255,240,200,0)']]);
    ctx.fillRect(0, 0, sw, sh);
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath(); ctx.arc(sw * 0.78, sh * 0.2, 54, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4a3a9a';
    ctx.beginPath(); ctx.arc(sw * 0.78 + 26, sh * 0.2 - 14, 50, 0, TAU); ctx.fill();
    for (let i = 0; i < 26; i++) {
      const x = F.h01(ID, 'stx', i) * sw, y = F.h01(ID, 'sty', i) * sh * 0.75;
      const tw = 0.5 + 0.5 * Math.sin(t * 6 + i * 2.1);
      F.sparkle(ctx, x, y, (4 + F.h01(ID, 'str', i) * 8) * (0.5 + tw * 0.6), { color: 'rgba(255,255,255,0.8)' });
    }
    // rolling hills at the bottom of the wallpaper
    ctx.fillStyle = '#3a2470';
    ctx.beginPath(); ctx.moveTo(0, sh); ctx.lineTo(0, sh * 0.86);
    ctx.quadraticCurveTo(sw * 0.3, sh * 0.8, sw * 0.6, sh * 0.87); ctx.quadraticCurveTo(sw * 0.85, sh * 0.92, sw, sh * 0.85); ctx.lineTo(sw, sh); ctx.fill();

    F.statusBar(ctx, sw, { time: '', color: '#ffffff', battery: 0.12 });
    // lock + date + clock (world y: 270, 320, 400)
    const wy = (y) => y - oy, wx = (x) => x - ox;
    ctx.save();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(wx(540), wy(268), 13, Math.PI, 0); ctx.stroke();
    F.rrect(ctx, wx(540) - 19, wy(268), 38, 28, 6); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.restore();
    F.text(ctx, 'Wednesday, 3 AM', wx(540), wy(340), { size: 34, fill: 'rgba(255,255,255,0.85)', rounded: false, font: 'sans' });
    const cp = F.beatPulse(t, 0, 0.1) * 0.03;
    F.text(ctx, '03:47', wx(540), wy(430), { size: 150, fill: '#ffffff', font: 'sans', weight: 700, rounded: false, scale: 1 + cp });

    // stacked notifications (newest on top). Time's own get shoved off the bottom.
    const push = pushCount(t, 0);
    MINE.forEach((m, i) => {
      const slot = i + push;
      let y = N_TOP + slot * N_STEP, x = N_X, rot = 0, a = 1;
      const fallAt = 4.4; // once shoved past this slot it tumbles away
      if (slot > fallAt) {
        // time since it crossed fallAt (find from arrivals: approximate with slot overshoot)
        const u = clamp((slot - fallAt) / 0.6);
        const dir = i % 2 ? 1 : -1;
        x += dir * u * 380;
        y += u * u * 160;
        rot = dir * u * 0.7;
        a = 1 - u;
      }
      if (a <= 0.01 || y > 1260) return;
      ctx.save();
      ctx.translate(wx(x + N_W / 2), wy(y + N_H / 2));
      ctx.rotate(rot);
      notification(ctx, -N_W / 2, -N_H / 2, { icon: timeIcon(t), app: m.app, time: '1h', title: m.title, alpha: a, color: C.timeDeep });
      ctx.restore();
    });
    if (t < HIT) {
      for (let k = BZ.length - 1; k >= 0; k--) {
        const ap = arrive(t, k);
        if (ap <= 0) continue;
        const slot = pushCount(t, k + 1);
        const y = N_TOP + slot * N_STEP - (1 - ap) * 200;
        ctx.save();
        ctx.translate(wx(N_X + N_W / 2), wy(y + N_H / 2));
        const sc = 0.85 + 0.15 * ap;
        ctx.scale(sc, sc);
        notification(ctx, -N_W / 2, -N_H / 2, { icon: bzIcon(t), app: 'биржа', time: 'now', title: BZ[k].title, alpha: clamp(ap * 2.5), color: C.bzDeep });
        ctx.restore();
        // red count badge on the newest one
      }
      const nArr = ARR.filter((a) => t >= a - 1e-6).length;
      if (nArr > 0) {
        const bp = F.pop(t, ARR[nArr - 1], 0.25);
        ctx.save();
        ctx.translate(wx(N_X + N_W - 6), wy(N_TOP + 6));
        ctx.scale(bp, bp);
        F.badge(ctx, 0, 0, String(nArr * 19 + 4), { size: 30 });
        ctx.restore();
      }
    }
    // bottom: flashlight + camera buttons + home indicator
    [[wx(250), wy(1690)], [wx(830), wy(1690)]].forEach(([x, y]) => {
      ctx.fillStyle = 'rgba(20,14,48,0.45)';
      ctx.beginPath(); ctx.arc(x, y, 46, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      F.rrect(ctx, x - 12, y - 18, 24, 36, 6); ctx.fill();
    });
    F.rrect(ctx, wx(540) - 130, wy(1758), 260, 10, 5); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
  }

  // ---- Time ----
  function drawTime(ctx, t) {
    const R = 120 * TIME.s;
    let x = TIME.x, y = TIME.y, sx = 1, sy = 1, rot = 0, face = 'dizzy', look = [0, 0], spin = 0;
    // dizzy spin decays out of the match cut
    spin = t * 25 * (1 - seg(t, 0.0, 0.55, 'outQuad')) + 0;
    if (t > 0.42) { face = 'shocked'; look = [0, -1]; }
    // startle hops on each ping
    ARR.forEach((a) => { if (t < HIT - 0.22) { const [a1, b1] = F.squash(t, a, 0.12, 0.2); sx *= a1; sy *= b1; } });
    const crouch = seg(t, HIT - 0.24, HIT - 0.02, 'outCubic');
    if (t >= HIT - 0.24) { face = 'angry'; look = [0, -1]; }
    // anticipation: crouch down and wide
    sx *= 1 + crouch * 0.16; sy *= 1 - crouch * 0.2;
    y += crouch * R * 0.2;
    let gl, gr;
    const gIn = seg(t, 0.38, 0.6, 'outBack');
    if (t < L0) {
      // guard -> pulled down low for the uppercut
      gl = [x - R * 1.15, y - R * 0.25 + crouch * R * 0.4];
      gr = [x + R * 1.2 + crouch * R * 0.2, y - R * 0.1 + crouch * R * 0.9];
      // fade gloves in from the shoulders after the zoom
      const sh = [x - R * 0.9, y], shr = [x + R * 0.9, y];
      gl = [lerp(sh[0], gl[0], gIn), lerp(sh[1], gl[1], gIn)];
      gr = [lerp(shr[0], gr[0], gIn), lerp(shr[1], gr[1], gIn)];
    }
    let jumpY = 0;
    if (t >= L0) {
      const age = t - L0;
      const up = E.outCubic(clamp(age / 0.12));
      const fall = Math.max(0, age - 0.2);
      jumpY = -up * 230 + fall * fall * 900;
      const [a1, b1] = F.squash(t, L0, -0.28, 0.45);
      sx = a1; sy = b1;
      rot = -0.12 * (1 - seg(t, HIT + 0.1, HIT + 0.4));
      face = 'angry';
      look = [0.2, -1];
    }
    y += jumpY;
    if (t >= L0) {
      gl = [x - R * 1.15, y + R * 0.1];
      const reach = E.outBack(clamp((t - L0 + 1 / 60) / 0.08));
      gr = [x + R * 0.55, y - R * lerp(0.4, 2.0, reach)];
      // motion trail behind the launch
      const age = t - L0;
      if (age < 0.3) {
        const pts = [0.12, 0.08, 0.04].map((d) => {
          const a = Math.max(0, age - d), u2 = E.outCubic(clamp(a / 0.12));
          return [x, TIME.y - u2 * 230];
        });
        F.motionTrail(ctx, (c, px, py) => CAST.time(c, { x: px, y: py, s: TIME.s, silhouette: 'rgba(120,210,255,0.8)', ring: 0.3 }), pts, { alpha: 0.6 * (1 - age / 0.3) });
      }
    }
    // contact shadow
    ctx.fillStyle = 'rgba(10,6,30,0.35)';
    F.ellipse(ctx, TIME.x, TIME.y + R + 6, R * 0.8 * (1 - clamp(-jumpY / 400)), R * 0.14); ctx.fill();
    CAST.time(ctx, {
      x, y, s: TIME.s, sx, sy, rot, t, face, look, spin, ring: 0.3,
      gloves: gIn > 0.001 || t >= L0 ? { l: gl, r: gr } : undefined,
    });
    if (gIn > 0 && gIn < 1) F.puffs(ctx, x, y, t - 0.38, { n: 6, size: 26, spread: 150, life: 0.35, seed: 7 });
    if (t < 0.5) F.dizzyStars(ctx, x, y - R * 1.1, t, { r: R * 0.9, n: 3, color: C.yellow });
    if (t >= HIT - 0.24) F.anger(ctx, x + R * 0.75, y - R * 0.85, 1.1 + 0.15 * Math.sin(t * 30));
    else if (t > 0.45) F.sweat(ctx, x - R * 0.85, y - R * 0.7 + ((t * 120) % 30), 0.9);
  }

  FILM.scene({ id: ID, draw });
})();
