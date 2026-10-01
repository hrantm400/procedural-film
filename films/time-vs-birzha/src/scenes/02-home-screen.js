/*
 * 02 'home-screen' : Round 1, the fight for the top-left home-screen slot. Global T 1.667 - 3.333.
 *
 * Beats (local t):
 *   0      Time and биржа drop in from the top (continuing their leap out of shot 01)
 *   0.4167 both land next to the empty glowing slot, squash + puffs
 *   0.66   биржа crouches (anticipation)  0.75 dashes
 *   0.8333 биржа body-checks Time aside (Time knocked down, dizzy), hops into the slot by 0.92, "99+"
 *   1.05   Time winds up  1.25 glove punch: биржа knocked up-left spinning, Time hops into the slot
 *   1.40   биржа dives back  1.4583 kicks Time out: Time flies to the RIGHT spinning (trail, puffs),
 *          out of frame at y ~900 by the end; биржа lands back in the slot laughing.
 *
 * Layers (back to front):
 *   1 lilac background, dot grid, floaties
 *   2 phone: wallpaper, status bar, "#1" pill, glowing empty slot, 4x5 jiggling app icons, dock
 *   3 "ROUND 1" corner sticker
 *   4 fighters (+ trails, puffs, impact bursts, badges)
 */
(function () {
  'use strict';
  const ID = 'home-screen';
  const FILM = window.FILM;

  const BT = 0.41667;
  const T_LAND = BT;
  const T_CROUCH = 0.66;
  const T_DASH = 0.75;
  const T_CHECK = BT * 2; // 0.8333
  const T_INSLOT = 0.92;
  const T_WIND = 1.04;
  const T_JAB = 1.19;
  const T_PUNCH = BT * 3; // 1.25
  const T_TIMESLOT = 1.36;
  const T_APEX = 1.39;
  const T_KICK = BT * 3.5; // 1.4583 (8th note)
  const T_BZBACK = 1.56;

  // phone + grid geometry (world coords)
  const PH = { cx: 540, cy: 1000, w: 900, h: 1500 };
  const BEZ = PH.w * 0.04;
  const SX = PH.cx - PH.w / 2 + BEZ, SY = PH.cy - PH.h / 2 + BEZ; // screen top-left (126, 286)
  const SW = PH.w - BEZ * 2;
  const COLW = SW / 4;
  const ROW0 = 262, ROWH = 208, ICON = 148;
  const cellLocal = (c, r) => [COLW * (c + 0.5), ROW0 + r * ROWH];
  const SLOT = [SX + COLW * 0.5, SY + ROW0]; // (229.5, 548)

  const S0 = 0.62;
  const R0 = 120 * S0;
  const TIME_LAND = [442, SLOT[1]];
  const BZ_LAND = [652, SLOT[1]];
  const TIME_KO = [404, 786];
  const BZ_APEX = [150, 318];
  const BZ_KICK = [118, 432];
  const EXIT = [1250, 975]; // with the camera zoom Time crosses the right frame edge at screen y ~900
  const CAM = [300, 640];

  // generic app icons (no real brands): colour pair, glyph id, label
  const APPS = [
    null,
    ['#5ac8fa', '#2f80ed', 'mail', 'Mail'],
    ['#ffd23f', '#ff9f1c', 'sun', 'Weather'],
    ['#7b5cff', '#5136d6', 'note', 'Music'],
    ['#22c977', '#119c5a', 'chat', 'Chat'],
    ['#ff6fb5', '#e0408f', 'heart', 'Health'],
    ['#8e9aaf', '#5d6880', 'gear', 'Settings'],
    ['#ff8a3d', '#ef5d1a', 'cam', 'Camera'],
    ['#36c6ff', '#1f9fe0', 'pin', 'Maps'],
    ['#ff4d5e', '#d62839', 'play', 'Video'],
    ['#ffffff', '#e8e8f0', 'cal', 'Calendar'],
    ['#4cd3a5', '#1fa77a', 'phone', 'Phone'],
    ['#ffc53d', '#f39a1c', 'star', 'Stars'],
    ['#b48cff', '#7b5cff', 'cloud', 'Cloud'],
    ['#2a3366', '#141a33', 'bell', 'Alerts'],
    ['#ff9f43', '#ff6b2c', 'cart', 'Shop'],
    ['#4a7aff', '#2448c9', 'folder', 'Files'],
    ['#fff3c4', '#ffd23f', 'pencil', 'Notes'],
    ['#5cea7a', '#22c977', 'game', 'Games'],
    ['#ff6fb5', '#7b5cff', 'photo', 'Photos'],
  ];
  const DOCK = [['#22c977', '#119c5a', 'phone'], ['#5ac8fa', '#2f80ed', 'chat'], ['#ff8a3d', '#ef5d1a', 'cam'], ['#7b5cff', '#5136d6', 'note']];

  function glyph(F, ctx, kind, s) {
    const P = F.pal;
    const k = s / 148;
    ctx.save();
    ctx.scale(k, k);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 9;
    switch (kind) {
      case 'mail': F.rrect(ctx, -40, -28, 80, 56, 10); ctx.fill(); ctx.strokeStyle = '#2f80ed'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-34, -20); ctx.lineTo(0, 6); ctx.lineTo(34, -20); ctx.stroke(); break;
      case 'sun': ctx.beginPath(); ctx.arc(0, 0, 22, 0, F.TAU); ctx.fill(); for (let i = 0; i < 8; i++) { const a = (i / 8) * F.TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 32, Math.sin(a) * 32); ctx.lineTo(Math.cos(a) * 44, Math.sin(a) * 44); ctx.stroke(); } break;
      case 'note': ctx.beginPath(); ctx.arc(-16, 24, 14, 0, F.TAU); ctx.fill(); ctx.beginPath(); ctx.arc(24, 14, 14, 0, F.TAU); ctx.fill(); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-4, 24); ctx.lineTo(-4, -32); ctx.lineTo(36, -42); ctx.lineTo(36, 14); ctx.stroke(); break;
      case 'chat': F.ellipse(ctx, 0, -4, 42, 32); ctx.fill(); F.poly(ctx, [[-22, 18], [-30, 40], [-2, 24]]); ctx.fill(); break;
      case 'heart': ctx.beginPath(); ctx.moveTo(0, 36); ctx.bezierCurveTo(-60, -4, -26, -50, 0, -18); ctx.bezierCurveTo(26, -50, 60, -4, 0, 36); ctx.fill(); break;
      case 'gear': ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * F.TAU; const r = i % 2 ? 30 : 42; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.fillStyle = '#5d6880'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, F.TAU); ctx.fill(); break;
      case 'cam': F.rrect(ctx, -42, -24, 84, 56, 12); ctx.fill(); F.rrect(ctx, -16, -36, 32, 16, 5); ctx.fill(); ctx.fillStyle = '#ef5d1a'; ctx.beginPath(); ctx.arc(0, 4, 17, 0, F.TAU); ctx.fill(); break;
      case 'pin': ctx.beginPath(); ctx.arc(0, -10, 28, Math.PI * 0.85, Math.PI * 2.15); ctx.lineTo(0, 40); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#1f9fe0'; ctx.beginPath(); ctx.arc(0, -10, 11, 0, F.TAU); ctx.fill(); break;
      case 'play': F.poly(ctx, [[-18, -30], [32, 0], [-18, 30]]); ctx.fill(); break;
      case 'cal': ctx.fillStyle = '#ff4d5e'; F.rrect(ctx, -40, -40, 80, 26, 8); ctx.fill(); ctx.fillStyle = '#1b1530'; F.text(ctx, '17', 0, 14, { size: 46, fill: '#1b1530' }); break;
      case 'phone': ctx.rotate(-0.6); F.rrect(ctx, -12, -36, 24, 72, 12); ctx.fill(); F.rrect(ctx, -22, -40, 34, 20, 8); ctx.fill(); F.rrect(ctx, -22, 20, 34, 20, 8); ctx.fill(); break;
      case 'star': F.star(ctx, 0, 2, 42, 18, 5); ctx.fill(); break;
      case 'cloud': ctx.beginPath(); ctx.arc(-18, 6, 20, 0, F.TAU); ctx.arc(8, -6, 26, 0, F.TAU); ctx.arc(28, 10, 16, 0, F.TAU); ctx.fill(); F.rrect(ctx, -38, 6, 82, 22, 11); ctx.fill(); break;
      case 'bell': ctx.fillStyle = P.yellow; ctx.beginPath(); ctx.moveTo(-32, 22); ctx.quadraticCurveTo(-24, 14, -24, -6); ctx.arc(0, -6, 24, Math.PI, 0); ctx.quadraticCurveTo(24, 14, 32, 22); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(0, 30, 9, 0, F.TAU); ctx.fill(); break;
      case 'cart': ctx.beginPath(); ctx.moveTo(-42, -28); ctx.lineTo(-28, -28); ctx.lineTo(-18, 14); ctx.lineTo(30, 14); ctx.lineTo(38, -16); ctx.lineTo(-24, -16); ctx.stroke(); ctx.beginPath(); ctx.arc(-12, 30, 8, 0, F.TAU); ctx.arc(24, 30, 8, 0, F.TAU); ctx.fill(); break;
      case 'folder': F.rrect(ctx, -42, -30, 36, 20, 6); ctx.fill(); F.rrect(ctx, -42, -20, 84, 54, 10); ctx.fill(); break;
      case 'pencil': ctx.rotate(0.7); ctx.fillStyle = '#ff8a3d'; F.rrect(ctx, -10, -40, 20, 60, 4); ctx.fill(); ctx.fillStyle = '#1b1530'; F.poly(ctx, [[-10, 20], [10, 20], [0, 40]]); ctx.fill(); break;
      case 'game': F.rrect(ctx, -44, -20, 88, 44, 22); ctx.fill(); ctx.fillStyle = '#22c977'; ctx.fillRect(-30, -2, 22, 7); ctx.fillRect(-22.5, -10, 7, 22); ctx.beginPath(); ctx.arc(20, -4, 6, 0, F.TAU); ctx.arc(30, 8, 6, 0, F.TAU); ctx.fill(); break;
      case 'photo': for (let i = 0; i < 6; i++) { ctx.save(); ctx.rotate((i / 6) * F.TAU); ctx.globalAlpha = 0.85; ctx.fillStyle = ['#ffd23f', '#ff8a3d', '#ff4d5e', '#7b5cff', '#36c6ff', '#22c977'][i]; F.ellipse(ctx, 0, -20, 14, 24); ctx.fill(); ctx.restore(); } break;
      default: break;
    }
    ctx.restore();
  }

  // flat app icon with a cheap flat contact shadow (no canvas blur: 23 icons per frame)
  function drawIcon(F, c, app, size, minus) {
    F.squircle(c, 0, 7, size / 2, 0.46);
    c.fillStyle = 'rgba(60,30,120,0.18)';
    c.fill();
    F.appIcon(c, 0, 0, size, { bg: app[0], bg2: app[1], glyph: (cc, s) => glyph(F, cc, app[2], s) });
    if (minus) {
      c.fillStyle = 'rgba(80,80,100,0.85)';
      c.beginPath(); c.arc(-size / 2 + 6, -size / 2 + 6, 17, 0, F.TAU); c.fill();
      c.fillStyle = '#ffffff'; c.fillRect(-size / 2 - 3, -size / 2 + 4, 18, 4);
    }
  }

  // ------------------------------------------------------------------ poses
  function timePose(F, t) {
    const E = F.E;
    let x = TIME_LAND[0], y = TIME_LAND[1], sx = 1, sy = 1, rot = 0, s = S0, face = 'determined', look = [-0.6, 0];
    let glove = null; // override for the right-hand punch
    let spin = 0;
    if (t < T_LAND) {
      const u = t / T_LAND;
      y = F.lerp(-40, TIME_LAND[1], E.inQuad(u));
      sx = 1 - 0.16 * u; sy = 1 + 0.24 * u;
      face = 'shocked'; look = [0, 1];
      rot = 0.1 * Math.sin(u * 6);
    } else if (t < T_CHECK) {
      const sq = F.squash(t, T_LAND, 0.34, 0.45);
      sx = sq[0]; sy = sq[1];
      y = TIME_LAND[1] + R0 * (1 - sy);
      look = t > 0.7 ? [0.8, 0] : [-0.8, -0.3];
      face = t > 0.72 ? 'shocked' : 'determined';
    } else if (t < T_WIND) {
      // knocked down and aside
      const u = F.clamp((t - T_CHECK) / 0.14);
      const k = E.outCubic(u);
      x = F.lerp(TIME_LAND[0], TIME_KO[0], k);
      y = F.lerp(TIME_LAND[1], TIME_KO[1], k) - Math.sin(Math.PI * u) * 40;
      rot = -1.2 * (1 - u) * u * 4 * 0.5 + (u >= 1 ? -0.25 * Math.exp(-(t - T_CHECK - 0.14) * 10) * Math.cos((t - T_CHECK) * 30) : 0);
      const sq = F.squash(t, T_CHECK + 0.14, 0.3, 0.4);
      sx = u < 1 ? 0.8 : sq[0]; sy = u < 1 ? 1.2 : sq[1];
      if (u >= 1) y += R0 * (1 - sy);
      face = 'hurt'; look = [-0.5, -0.5];
    } else if (t < T_PUNCH) {
      // wind up then jab
      face = 'angry'; look = [-0.8, -0.6];
      if (t < T_JAB) {
        const u = E.outCubic((t - T_WIND) / (T_JAB - T_WIND));
        x = TIME_KO[0] + 22 * u; y = TIME_KO[1] + 6 * u;
        rot = 0.22 * u; sx = 1 + 0.12 * u; sy = 1 - 0.1 * u;
        y += R0 * (1 - sy);
        glove = [x + R0 * 1.0, y + R0 * 0.2];
      } else {
        const u = E.inQuad((t - T_JAB) / (T_PUNCH - T_JAB));
        x = F.lerp(TIME_KO[0] + 22, TIME_KO[0] - 30, u); y = F.lerp(TIME_KO[1] + 6, TIME_KO[1] - 30, u);
        rot = F.lerp(0.22, -0.3, u); sx = F.lerp(1.12, 0.86, u); sy = F.lerp(0.9, 1.14, u);
        glove = [F.lerp(x + R0, SLOT[0] + R0 * 0.7, u), F.lerp(y + R0 * 0.2, SLOT[1] + R0 * 0.75, u)];
      }
    } else if (t < T_TIMESLOT) {
      // glove connects, then Time hops into the slot
      const u = (t - T_PUNCH) / (T_TIMESLOT - T_PUNCH);
      const k = E.inOutCubic(u);
      const x0 = TIME_KO[0] - 30, y0 = TIME_KO[1] - 30;
      x = F.lerp(x0, SLOT[0], k); y = F.lerp(y0, SLOT[1], k) - Math.sin(Math.PI * u) * 110;
      rot = F.lerp(-0.3, 0, k); sx = 0.88; sy = 1.14;
      face = 'angry'; look = [-0.6, -0.6];
      glove = u < 0.35 ? [SLOT[0] + R0 * 0.7, SLOT[1] + R0 * 0.75] : null;
    } else if (t < T_KICK) {
      const sq = F.squash(t, T_TIMESLOT, 0.3, 0.3);
      x = SLOT[0]; sx = sq[0]; sy = sq[1];
      y = SLOT[1] + R0 * (1 - sy);
      face = 'happy'; look = [0.4, 0];
      if (t > T_KICK - 0.05) { face = 'shocked'; look = [-0.9, -0.9]; }
    } else {
      // kicked out to the right edge, spinning
      const u = (t - T_KICK) / (EXIT[0] - SLOT[0]) * 1000 / 1.0;
      const v = F.clamp((t - T_KICK) / 0.205);
      const k = 1 - Math.pow(1 - v, 1.6);
      x = F.lerp(SLOT[0], EXIT[0], k);
      y = F.lerp(SLOT[1], EXIT[1], k) - Math.sin(Math.PI * k) * 30;
      rot = (t - T_KICK) * 26;
      s = F.lerp(S0, 0.9, k);
      const st = 0.22 * (1 - v * 0.5);
      sx = 1 + st; sy = 1 - st;
      face = 'shocked'; spin = (t - T_KICK) * 30;
      void u;
    }
    return { x, y, sx, sy, rot, s, face, look, glove, spin };
  }

  function bzPose(F, t) {
    const E = F.E;
    let x = BZ_LAND[0], y = BZ_LAND[1], sx = 1, sy = 1, rot = 0, face = 'smug', look = [-0.6, 0], greedy = false, jaw = 0;
    let kick = null;
    if (t < T_LAND) {
      const u = t / T_LAND;
      y = F.lerp(-70, BZ_LAND[1], E.inQuad(u));
      sx = 1 - 0.18 * u; sy = 1 + 0.26 * u;
      face = 'laugh'; jaw = 0.3; rot = -0.1 * Math.sin(u * 5);
    } else if (t < T_CROUCH) {
      const sq = F.squash(t, T_LAND, 0.36, 0.45);
      sx = sq[0]; sy = sq[1];
      y = BZ_LAND[1] + R0 * (1 - sy);
      look = [-1, 0];
    } else if (t < T_DASH) {
      const u = E.outCubic((t - T_CROUCH) / (T_DASH - T_CROUCH));
      sx = 1 + 0.22 * u; sy = 1 - 0.2 * u;
      x = BZ_LAND[0] + 26 * u; rot = 0.16 * u;
      y = BZ_LAND[1] + R0 * (1 - sy);
      face = 'angry'; look = [-1, 0];
    } else if (t < T_CHECK) {
      const u = E.inQuad((t - T_DASH) / (T_CHECK - T_DASH));
      x = F.lerp(BZ_LAND[0] + 26, TIME_LAND[0] + R0 * 1.55, u);
      sx = 1.3; sy = 0.82; rot = F.lerp(0.16, -0.18, u);
      y = BZ_LAND[1] + R0 * (1 - sy);
      face = 'angry'; look = [-1, 0];
    } else if (t < T_INSLOT) {
      // continue through, hop into the slot
      const u = (t - T_CHECK) / (T_INSLOT - T_CHECK);
      const k = E.outQuad(u);
      x = F.lerp(TIME_LAND[0] + R0 * 1.55, SLOT[0], k);
      y = SLOT[1] - Math.sin(Math.PI * u) * 70;
      sx = F.lerp(1.2, 0.9, u); sy = F.lerp(0.86, 1.12, u); rot = F.lerp(-0.18, 0, u);
      face = 'laugh'; jaw = 0.5;
    } else if (t < T_PUNCH) {
      const sq = F.squash(t, T_INSLOT, 0.32, 0.35);
      x = SLOT[0]; sx = sq[0]; sy = sq[1];
      y = SLOT[1] + R0 * (1 - sy);
      face = 'laugh'; greedy = true; jaw = 0.35 + 0.25 * Math.abs(Math.sin((t - T_INSLOT) * 14));
      look = [0.6, 0.6];
      if (t > T_JAB) { face = 'shocked'; greedy = false; jaw = 0.6; }
    } else if (t < T_APEX) {
      // punched up-left, spinning
      const u = (t - T_PUNCH) / (T_APEX - T_PUNCH);
      const k = E.outQuad(u);
      x = F.lerp(SLOT[0], BZ_APEX[0], k); y = F.lerp(SLOT[1], BZ_APEX[1], k);
      rot = -k * Math.PI * 2.2;
      sx = 1.1; sy = 0.9;
      face = 'dizzy';
    } else if (t < T_KICK) {
      // dive at Time, glove out like a kick
      const u = E.inQuad((t - T_APEX) / (T_KICK - T_APEX));
      x = F.lerp(BZ_APEX[0], BZ_KICK[0], u); y = F.lerp(BZ_APEX[1], BZ_KICK[1], u);
      rot = F.lerp(-Math.PI * 2.2, -Math.PI * 2 + 0.35, u);
      sx = 0.86; sy = 1.16;
      face = 'angry'; look = [1, 1];
      kick = [F.lerp(x + R0 * 0.9, SLOT[0] - R0 * 0.55, u), F.lerp(y + R0 * 0.9, SLOT[1] - R0 * 0.35, u)];
    } else if (t < T_BZBACK) {
      const u = (t - T_KICK) / (T_BZBACK - T_KICK);
      const k = E.inOutQuad(u);
      x = F.lerp(BZ_KICK[0], SLOT[0], k); y = F.lerp(BZ_KICK[1], SLOT[1], k) - Math.sin(Math.PI * u) * 40;
      rot = 0.35 * (1 - k);
      face = 'laugh'; jaw = 0.5; look = [1, 0.4];
      kick = u < 0.4 ? [x + R0 * 1.3, y + R0 * 0.6] : null;
    } else {
      const sq = F.squash(t, T_BZBACK, 0.34, 0.35);
      x = SLOT[0]; sx = sq[0]; sy = sq[1];
      y = SLOT[1] + R0 * (1 - sy);
      face = 'laugh'; greedy = true; jaw = 0.35 + 0.3 * Math.abs(Math.sin((t - T_BZBACK) * 16)); look = [1, 0.3];
    }
    return { x, y, sx, sy, rot, face, look, greedy, jaw, kick };
  }

  function guard(p, dir, R, t, seed) {
    const b = Math.sin(t * 14 + seed) * 4;
    const a = [p.x + dir * R * 0.8, p.y + R * 0.42 + b];
    const c = [p.x + dir * R * 1.18, p.y - R * 0.05 - b];
    return dir > 0 ? { l: a, r: c } : { l: c, r: a };
  }

  function drawTime(F, ctx, p, t, o = {}) {
    const R = 120 * p.s;
    let gloves = guard(p, -1, R, t, 0);
    if (p.glove) gloves = { l: p.glove, r: [p.x + R * 0.9, p.y + R * 0.2] };
    if (p.spin) gloves = { l: [p.x - R * 1.1, p.y + R * 0.5], r: [p.x + R * 1.1, p.y - R * 0.4] };
    FILM.cast.time(ctx, {
      x: p.x, y: p.y, s: p.s, sx: p.sx, sy: p.sy, rot: p.rot, t, face: p.face, look: p.look, ring: 1,
      gloves: o.silhouette ? null : gloves, spin: p.spin, silhouette: o.silhouette, shadow: o.shadow,
    });
  }
  function drawBz(F, ctx, p, t, o = {}) {
    let gloves = guard(p, 1, R0, t, 2);
    if (p.kick) gloves = { r: p.kick, l: [p.x - R0 * 0.9, p.y - R0 * 0.2] };
    if (p.face === 'dizzy') gloves = { l: [p.x - R0 * 1.2, p.y - R0 * 0.5], r: [p.x + R0 * 1.2, p.y + R0 * 0.4] };
    if (p.greedy) gloves = { l: [p.x - R0 * 1.05, p.y - R0 * 0.7], r: [p.x + R0 * 1.05, p.y - R0 * 0.7] }; // victory arms
    return FILM.cast.birzha(ctx, {
      x: p.x, y: p.y, s: S0, sx: p.sx, sy: p.sy, rot: p.rot, t, face: p.face, look: p.look, greedy: p.greedy, jaw: p.jaw,
      gloves: o.silhouette ? null : gloves, silhouette: o.silhouette, shadow: o.shadow,
    });
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const F = FILM.fx, P = F.pal, E = F.E, TAU = F.TAU;
      const t = Math.min(Math.max(tIn, 0), info.dur);
      const W = FILM.W, H = FILM.H;

      const sh = F.shakeMany(t, [[T_LAND, 0.2, 10], [T_CHECK, 0.25, 18], [T_PUNCH, 0.28, 22], [T_KICK, 0.3, 24]], 21);

      // 1 background ---------------------------------------------------------
      F.bgFill(ctx, ['#efe9ff', '#e2d9ff']);
      F.dotGrid(ctx, { step: 58, r: 4, color: 'rgba(123,92,255,0.12)', oy: t * 30 });
      F.floaties(ctx, { n: 16, seed: 202, t: t + 3, colors: [P.purple, P.pink, P.yellow, P.timeCyan, P.bzOrange], size: 30, speed: 50, alpha: 0.7 });

      ctx.save();
      ctx.translate(sh[0], sh[1]);
      // camera: slow push-in on the fight corner plus zoom kicks on the hits
      const kick = (t0, a) => (t >= t0 ? a * Math.exp(-(t - t0) * 10) : 0);
      const z = 1 + 0.1 * E.inOutSine(t / info.dur) + kick(T_CHECK, 0.025) + kick(T_PUNCH, 0.03) + kick(T_KICK, 0.035);
      ctx.translate(CAM[0], CAM[1]);
      ctx.scale(z, z);
      ctx.translate(-CAM[0], -CAM[1]);

      // 2 phone ------------------------------------------------------------
      // the phone itself bumps a little on the hits
      const bump = (F.squash(t, T_CHECK, 0.012, 0.35)[1] - 1) + (F.squash(t, T_PUNCH, 0.014, 0.35)[1] - 1) + (F.squash(t, T_KICK, 0.016, 0.4)[1] - 1);
      const tilt = F.wobble(t, 0.5, 0.008, 3) + bump * 0.6;
      // soft phone shadow, faked with stacked translucent shapes (a blurred full-size shadow is too slow)
      ctx.save();
      ctx.translate(PH.cx, PH.cy); ctx.rotate(tilt); ctx.translate(-PH.cx, -PH.cy);
      ctx.fillStyle = 'rgba(70,40,150,0.06)';
      for (let k = 0; k < 4; k++) {
        const g = 10 + k * 12;
        F.rrect(ctx, PH.cx - PH.w / 2 - g + 6, PH.cy - PH.h / 2 - g + 34, PH.w + g * 2 - 12, PH.h + g * 2, PH.w * 0.15 + g);
        ctx.fill();
      }
      ctx.restore();
      F.phone(ctx, PH.cx, PH.cy, PH.w, PH.h, {
        rot: tilt, shadow: false,
        screenBg: '#b9a6ff',
        screen: (c, sw, sh2) => {
          // wallpaper
          c.fillStyle = F.linGrad(c, 0, 0, sw, sh2, ['#9f8bff', '#c7a6ff', '#ffb4cf']);
          c.fillRect(0, 0, sw, sh2);
          c.fillStyle = 'rgba(255,255,255,0.16)';
          F.ellipse(c, sw * 0.85, sh2 * 0.2 + Math.sin(t * 1.3) * 10, 260, 260); c.fill();
          F.ellipse(c, sw * 0.1, sh2 * 0.78, 300, 300); c.fill();
          c.fillStyle = 'rgba(255,214,90,0.25)';
          F.ellipse(c, sw * 0.6, sh2 * 0.62 + Math.cos(t * 1.1) * 12, 180, 180); c.fill();
          F.statusBar(c, sw, { time: '9:41', color: '#ffffff' });

          // slot glow + "#1" pill
          const [lx, ly] = cellLocal(0, 0);
          const pulse = 0.5 + 0.5 * Math.sin(t * 9);
          c.fillStyle = F.radGrad(c, lx, ly, 20, 150, [[0, `rgba(255,236,140,${0.75 + 0.2 * pulse})`], [1, 'rgba(255,236,140,0)']]);
          c.fillRect(lx - 160, ly - 160, 320, 320);
          const occupied = (t >= T_INSLOT - 0.03 && t < T_PUNCH + 0.04) || (t >= T_TIMESLOT - 0.03 && t < T_KICK + 0.04) || t >= T_BZBACK - 0.03;
          if (!occupied) {
            c.save();
            F.squircle(c, lx, ly, ICON / 2 + 2 * pulse, 0.46);
            c.fillStyle = 'rgba(255,255,255,0.22)'; c.fill();
            c.setLineDash([16, 12]); c.lineDashOffset = -t * 60;
            c.lineWidth = 6; c.strokeStyle = '#ffffff'; c.stroke();
            c.restore();
            F.text(c, '+', lx, ly + 2, { size: 70, fill: 'rgba(255,255,255,0.9)' });
          }
          const pk = F.pop(t, 0.05, 0.3) * (1 + 0.08 * F.beatPulse(t, 0, 0.12));
          c.save();
          c.translate(lx, ly - ICON / 2 - 44);
          c.scale(pk, pk);
          c.rotate(-0.06 + Math.sin(t * 5) * 0.04);
          F.dropShadow(c, (cc) => { F.label(cc, '#1', 0, 0, { size: 36, bg: P.yellow, color: P.ink }); }, { dy: 6, blur: 10 });
          c.restore();

          // icons (jiggle / edit mode)
          for (let r = 0; r < 5; r++) {
            for (let col = 0; col < 4; col++) {
              const i = r * 4 + col;
              const app = APPS[i];
              if (!app) continue;
              const [ix, iy] = cellLocal(col, r);
              // a shove ripple: icons near the hits hop
              let hop = 0;
              [[T_LAND, 442, 548], [T_CHECK + 0.14, TIME_KO[0], TIME_KO[1]], [T_PUNCH, SLOT[0], SLOT[1]], [T_KICK, SLOT[0], SLOT[1]]].forEach(([th, hx, hy]) => {
                const d = Math.hypot(SX + ix - hx, SY + iy - hy);
                const age = t - th - d / 2600;
                if (age > 0 && age < 0.3) hop += Math.sin((age / 0.3) * Math.PI) * 26 * Math.max(0, 1 - d / 700);
              });
              const jig = Math.sin(t * TAU * 4.2 + F.h01('jg', i) * TAU) * 0.045;
              c.save();
              c.translate(ix, iy - hop);
              c.rotate(jig);
              drawIcon(F, c, app, ICON, true);
              c.restore();
            }
          }
          // dock
          const dy = cellLocal(0, 4)[1] + 200;
          c.fillStyle = 'rgba(255,255,255,0.3)';
          F.rrect(c, 24, dy - 92, sw - 48, 184, 56); c.fill();
          DOCK.forEach((d, k) => {
            const [ix] = cellLocal(k, 0);
            const jig = Math.sin(t * TAU * 4.2 + F.h01('jd', k) * TAU) * 0.045;
            c.save(); c.translate(ix, dy); c.rotate(jig);
            drawIcon(F, c, d, ICON * 0.92, false);
            c.restore();
          });
        },
      });

      // 4 fighters -----------------------------------------------------------
      const tp = timePose(F, t);
      const bp = bzPose(F, t);

      // drop trails (entry) and kick trail (exit)
      const ghost = (fn, poseFn, from, color, dt) => {
        for (let k = 4; k >= 1; k--) {
          const tt = t - k * dt;
          if (tt < from) continue;
          ctx.save();
          ctx.globalAlpha *= (1 - k / 5) * 0.55;
          fn(F, ctx, poseFn(F, tt), t, { silhouette: color });
          ctx.restore();
        }
      };
      if (t < T_LAND) {
        ghost(drawTime, timePose, 0, '#ffffff', 0.025);
        ghost(drawBz, bzPose, 0, '#ffffff', 0.025);
      }
      if (t > T_DASH && t < T_INSLOT) ghost(drawBz, bzPose, T_DASH, '#ffd27a', 0.02);
      if (t > T_APEX && t < T_BZBACK) ghost(drawBz, bzPose, T_APEX, '#ffd27a', 0.018);

      // landing shadows
      const shadowY = (p, R) => (Math.abs(p.y - SLOT[1]) < 30 ? SLOT[1] + R * 1.0 : null);

      // shove / kick effects behind characters
      F.puffs(ctx, TIME_LAND[0], TIME_LAND[1] + R0, t - T_LAND, { n: 6, seed: 3, size: 34, spread: 120 });
      F.puffs(ctx, BZ_LAND[0], BZ_LAND[1] + R0, t - T_LAND, { n: 6, seed: 4, size: 34, spread: 120 });
      F.puffs(ctx, TIME_KO[0], TIME_KO[1] + R0, t - T_CHECK - 0.14, { n: 6, seed: 5, size: 30, spread: 110 });
      F.puffs(ctx, SLOT[0], SLOT[1] + R0, t - T_INSLOT, { n: 5, seed: 6, size: 28, spread: 100 });
      F.puffs(ctx, SLOT[0], SLOT[1] + R0, t - T_TIMESLOT, { n: 5, seed: 7, size: 28, spread: 100 });
      F.puffs(ctx, SLOT[0], SLOT[1] + R0, t - T_BZBACK, { n: 5, seed: 8, size: 28, spread: 100 });

      // Time's flight trail
      if (t > T_KICK) {
        for (let k = 6; k >= 1; k--) {
          const tt = t - k * 0.016;
          if (tt < T_KICK) continue;
          ctx.save();
          ctx.globalAlpha *= (1 - k / 7) * 0.5;
          drawTime(F, ctx, timePose(F, tt), t, { silhouette: '#bfe2ff' });
          ctx.restore();
        }
        // puff trail along the path
        for (let k = 0; k < 5; k++) {
          const tt = T_KICK + 0.02 + k * 0.035;
          if (t < tt) continue;
          const q = timePose(F, tt);
          F.puffs(ctx, q.x, q.y, t - tt, { n: 4, seed: 40 + k, size: 26, spread: 60, life: 0.35 });
        }
      }

      // impact stars behind the fighters so faces stay readable
      F.impactStar(ctx, TIME_LAND[0] + R0 * 0.6, TIME_LAND[1] - R0 * 0.7, t, T_CHECK, { size: 95, life: 0.24, seed: 5, rot: 0.2 });
      F.impactStar(ctx, SLOT[0] + R0 * 0.1, SLOT[1] - R0 * 0.3, t, T_KICK, { size: 115, life: 0.2, seed: 11, color: P.bzYellow });
      const bzFront = t >= T_CHECK && t < T_INSLOT; // body check passes in front of Time
      const drawB = () => {
        const a = drawBz(F, ctx, bp, t, { shadow: shadowY(bp, R0) });
        // 99+ badge while it owns the slot
        const bk1 = t >= T_INSLOT && t < T_PUNCH ? F.pop(t, T_INSLOT + 0.02, 0.22) : 0;
        const bk2 = t >= T_BZBACK ? F.pop(t, T_BZBACK + 0.02, 0.22) : 0;
        const bk = Math.max(bk1, bk2);
        if (bk > 0) {
          ctx.save();
          ctx.translate(bp.x + R0 * 0.82 * bp.sx, bp.y - R0 * 0.85 * bp.sy);
          ctx.scale(bk, bk);
          ctx.rotate(0.12 + Math.sin(t * 12) * 0.05);
          F.badge(ctx, 0, 0, '99+', { size: 34, bg: '#ff2d3d' });
          ctx.restore();
        }
        return a;
      };
      const drawT = () => drawTime(F, ctx, tp, t, { shadow: shadowY(tp, 120 * tp.s) });
      if (bzFront) { drawT(); drawB(); } else { drawB(); drawT(); }

      // dizzy stars over knocked Time
      if (t > T_CHECK + 0.1 && t < T_WIND + 0.02) F.dizzyStars(ctx, tp.x, tp.y - R0 * 1.05, t, { r: 60, n: 3 });
      if (t > T_WIND && t < T_PUNCH) F.anger(ctx, tp.x + R0 * 0.75, tp.y - R0 * 0.85, 0.8, {});
      // sweat on the dash
      if (t > T_LAND + 0.1 && t < T_CHECK) F.sweat(ctx, tp.x + R0 * 0.8, tp.y - R0 * 0.7, 0.7 * F.clamp((t - 0.7) * 8), {});
      if (bp.face === 'dizzy') F.dizzyStars(ctx, bp.x, bp.y - R0 * 1.0, t, { r: 55, n: 3, color: '#ffffff' });

      // impacts
      F.shockRing(ctx, TIME_LAND[0] + R0 * 0.8, TIME_LAND[1], t - T_CHECK, { r: 170, life: 0.3, width: 14 });
      F.impactStar(ctx, SLOT[0] + R0 * 0.75, SLOT[1] + R0 * 0.75, t, T_PUNCH, { size: 95, life: 0.25, seed: 8 });
      F.shockRing(ctx, SLOT[0] + R0 * 0.75, SLOT[1] + R0 * 0.75, t - T_PUNCH, { r: 190, life: 0.3, width: 14, color: P.yellow });
      F.shockRing(ctx, SLOT[0] - R0 * 0.4, SLOT[1] - R0 * 0.3, t - T_KICK, { r: 220, life: 0.32, width: 16 });
      if (t > T_KICK) {
        F.speedLines(ctx, { angle: Math.atan2(EXIT[1] - SLOT[1], EXIT[0] - SLOT[0]), count: 14, color: '#ffffff', alpha: 0.8 * F.clamp((t - T_KICK) * 12), seed: 61, x: 200, y: 420, w: 900, h: 560, len: 300, width: 7, t, speed: 4200 });
      }

      ctx.restore(); // shake

      // 3 ROUND 1 sticker (screen-fixed, over everything)
      const rk = F.popIn(t, 0.02, 0.4);
      if (rk > 0.001) {
        ctx.save();
        ctx.translate(92, 250);
        ctx.rotate(-0.08);
        ctx.scale(rk, rk);
        F.dropShadow(ctx, (c) => { F.label(c, 'ROUND 1', 0, 0, { size: 40, bg: P.ink, color: '#ffffff', align: 'left' }); }, { dy: 8, blur: 14 });
        ctx.restore();
      }
      void E; void W; void H;
    },
  });
})();
