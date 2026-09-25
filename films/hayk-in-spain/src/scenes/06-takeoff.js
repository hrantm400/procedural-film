/*
 * Shot 06 'takeoff' : Takeoff to Spain. T 21.0 - 26.0 (local 0 - 5 s).
 *
 * Beats (local t):
 *   0.0  Zvartnots runway at sunset, Ararat huge behind. The white plane rolls left to right,
 *        accelerating, speed lines growing. Porthole inset: Hayk in the window, sunglasses, grinning.
 *   1.0  (T 22.0) TAKEOFF: wheels leave the runway, flash, dust, "WHOOSH!" and the nose pitches up
 *   2.5  (T 23.5) whip-pan up: vertical speed-line wipe carries us to a stylised map of Europe
 *   2.75 caption "YEREVAN -> SPAIN"; 3.25 caption "1 MONTH. MISSION: INVESTORS."
 *   3.0 - 4.5 (T 24.0 - 25.5) the plane icon flies the dotted arc Armenia -> Spain; arrival pop at 4.5
 *
 * Layers (back to front), runway part:
 *   1. sunset sky, sun, pink clouds   2. Ararat   3. foothills + Zvartnots terminal, tower, hangars
 *   4. grass, runway, edge lights     5. plane (gear, tiny face in window)   6. speed lines, dust
 *   7. porthole inset with Hayk (screen space)   8. SFX
 * Map part: dark sky + stars, map panel (sea, land, seas, highlighted Spain + Armenia, grid, Ararat
 *   icon, burger icon), dotted arc, plane icon, flags, captions.
 */
(function () {
  'use strict';
  const ID = 'takeoff';
  const FILM = window.FILM;
  const LIB = FILM.lib;
  const F = FILM.fx;
  const P = F.pal;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const h01 = (...k) => F.h01(ID, ...k);

  const B_LIFT = 1.0; // T 22.0
  const B_WHIP = 2.5; // T 23.5
  const B_CAP1 = 2.75;
  const B_FLY0 = 3.0; // T 24.0
  const B_CAP2 = 3.25;
  const B_FLY1 = 4.5; // T 25.5
  const WHIP_DUR = 0.4;

  // ------------------------------------------------------------------ runway world
  const RUNWAY_Y = 1400; // plane wheels touch here (screen y before the tilt)
  // distance the camera has travelled (px) with the plane: accelerating
  const travel = (t) => 380 * t + 520 * t * t;

  function sunsetSky(ctx, t, camY) {
    ctx.fillStyle = '#ffc36b';
    ctx.fillRect(-50, -50, 1180, 2020);
    F.sky(ctx, '#4a2f7a', '#ffc36b', { h: 1450 + camY * 0.2, y: -300, mid: '#ff7a86', midAt: 0.55 });
    // sun + glow, setting between the two peaks
    const sx = 740, sy = 900 + camY * 0.2;
    const g = ctx.createRadialGradient(sx, sy, 60, sx, sy, 520);
    g.addColorStop(0, 'rgba(255,240,190,0.95)');
    g.addColorStop(0.3, 'rgba(255,200,140,0.5)');
    g.addColorStop(1, 'rgba(255,160,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, sy - 600, 1080, 1200);
    ctx.fillStyle = '#fff1c4';
    ctx.beginPath(); ctx.arc(sx, sy, 130, 0, TAU); ctx.fill();
    // stripes over the sun (retro anime sunset)
    ctx.fillStyle = 'rgba(255,150,120,0.55)';
    for (let i = 0; i < 4; i++) ctx.fillRect(sx - 140, sy + 30 + i * 26, 280, 6 + i * 3);
    // long pink cloud streaks drifting
    ctx.save();
    ctx.fillStyle = 'rgba(255,190,200,0.75)';
    for (let i = 0; i < 6; i++) {
      const w = 260 + h01('cw', i) * 320;
      const x = ((h01('cx', i) * 1500 - t * (20 + 30 * h01('cs', i)) - travel(t) * 0.03) % 1500 + 1500) % 1500 - 300;
      const y = 250 + i * 95 + camY * 0.2;
      F.rrect(ctx, x, y, w, 16 + h01('ch', i) * 16, 12); ctx.fill();
    }
    ctx.restore();
    // a few early stars at the very top
    ctx.save(); ctx.globalAlpha = 0.8;
    F.stars(ctx, { n: 26, seed: 606, h: 300, y: -40 + camY * 0.2 });
    ctx.restore();
  }

  function mountains(ctx, t, camY) {
    const off = -travel(t) * 0.04;
    F.ararat(ctx, -80 + off, 1180 + camY * 0.3, 1250, 620, { color: '#a8709a', shade: '#8a5a86', snow: '#ffe0dc' });
  }

  function airport(ctx, t, camY) {
    const off = -travel(t) * 0.18;
    const y0 = 1255 + camY * 0.5;
    // foothills
    ctx.fillStyle = '#7b4a7a';
    ctx.beginPath(); ctx.moveTo(-100, y0);
    for (let i = 0; i <= 14; i++) ctx.lineTo(-100 + i * 100, y0 - 60 - 40 * Math.sin(i * 1.3 + 0.5));
    ctx.lineTo(1300, y0 + 700); ctx.lineTo(-100, y0 + 700); ctx.closePath(); ctx.fill();
    // repeating airport skyline
    const span = 1500;
    for (let k = -1; k <= 2; k++) {
      const bx = ((off % span) + span) % span + k * span - 300;
      ctx.save();
      ctx.translate(bx, y0);
      ctx.fillStyle = '#5e3a6a';
      ctx.strokeStyle = 'rgba(27,20,36,0.6)'; ctx.lineWidth = 3;
      // Zvartnots round terminal with its central tower
      ctx.beginPath(); ctx.ellipse(300, -30, 230, 26, 0, Math.PI, TAU); ctx.lineTo(530, 0); ctx.lineTo(70, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillRect(110, -70, 380, 44); ctx.strokeRect(110, -70, 380, 44);
      ctx.fillRect(285, -190, 30, 130); ctx.strokeRect(285, -190, 30, 130);
      ctx.beginPath(); ctx.ellipse(300, -196, 46, 18, 0, 0, TAU); ctx.fill(); ctx.stroke();
      // lit windows on the terminal ring
      ctx.fillStyle = '#ffd98a';
      for (let i = 0; i < 12; i++) ctx.fillRect(126 + i * 30, -58, 16, 10);
      // control tower
      ctx.fillStyle = '#5e3a6a';
      ctx.fillRect(820, -230, 36, 230); ctx.strokeRect(820, -230, 36, 230);
      ctx.beginPath(); ctx.moveTo(790, -230); ctx.lineTo(886, -230); ctx.lineTo(874, -280); ctx.lineTo(802, -280); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9fe4ff'; ctx.fillRect(806, -272, 64, 22);
      // blinking beacon
      if (Math.floor(t * 3) % 2 === 0) { ctx.fillStyle = '#ff4d5e'; ctx.beginPath(); ctx.arc(838, -292, 8, 0, TAU); ctx.fill(); }
      // hangars
      ctx.fillStyle = '#6b4576';
      ctx.beginPath(); ctx.moveTo(1000, 0); ctx.quadraticCurveTo(1110, -150, 1220, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1230, 0); ctx.quadraticCurveTo(1330, -120, 1430, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  function runway(ctx, t, camY) {
    const off = -travel(t);
    const top = RUNWAY_Y - 110 + camY * 0.9;
    // grass verge
    ctx.fillStyle = '#6a7a4a';
    ctx.fillRect(-50, top - 30, 1180, 40);
    // tarmac
    const g = ctx.createLinearGradient(0, top, 0, top + 420);
    g.addColorStop(0, '#5a4a66'); g.addColorStop(1, '#3e3148');
    ctx.fillStyle = g;
    ctx.fillRect(-50, top, 1180, 420);
    // sunset sheen on tarmac
    ctx.fillStyle = 'rgba(255,170,130,0.18)';
    ctx.fillRect(-50, top, 1180, 60);
    // edge stripes
    ctx.fillStyle = '#f4efe6';
    ctx.fillRect(-50, top + 10, 1180, 8);
    ctx.fillRect(-50, top + 400, 1180, 10);
    // centre dashes scrolling
    const dash = 220;
    const d0 = ((off % dash) + dash) % dash;
    ctx.fillStyle = '#fff6d8';
    for (let x = d0 - dash; x < 1200; x += dash) ctx.fillRect(x, top + 230, 120, 12);
    // edge lights (near row runs fast)
    const lg = 160;
    const l0 = ((off * 1.0 % lg) + lg) % lg;
    for (let x = l0 - lg; x < 1200; x += lg) {
      ctx.fillStyle = 'rgba(255,220,120,0.45)';
      ctx.beginPath(); ctx.arc(x, top + 14, 16, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff2b0';
      ctx.beginPath(); ctx.arc(x, top + 14, 6, 0, TAU); ctx.fill();
    }
    // foreground grass + lights below the runway (fastest parallax)
    ctx.fillStyle = '#4e5e3a';
    ctx.fillRect(-50, top + 410, 1180, 700);
    const fl = 340;
    const f0 = ((off * 1.5 % fl) + fl) % fl;
    for (let x = f0 - fl; x < 1300; x += fl) {
      ctx.fillStyle = '#3a4a2c';
      ctx.fillRect(x - 6, top + 470, 12, 60);
      ctx.fillStyle = 'rgba(120,200,255,0.5)';
      ctx.beginPath(); ctx.arc(x, top + 466, 22, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c8f0ff';
      ctx.beginPath(); ctx.arc(x, top + 466, 9, 0, TAU); ctx.fill();
    }
    // grass tufts
    ctx.strokeStyle = '#6f8a4c'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    const tg = 90;
    const tg0 = ((off * 1.5 % tg) + tg) % tg;
    for (let x = tg0 - tg; x < 1200; x += tg) { ctx.moveTo(x, top + 560); ctx.lineTo(x - 10, top + 530); ctx.moveTo(x + 12, top + 560); ctx.lineTo(x + 16, top + 526); }
    ctx.stroke();
  }

  // landing gear under the plane in its local frame (s applied by caller)
  function gear(ctx, t, retract) {
    const k = 1 - retract;
    if (k <= 0.02) return;
    const spin = t * 40;
    [[-40, 1], [190, 0.85]].forEach(([gx, sc]) => {
      ctx.save();
      ctx.translate(gx, 30);
      ctx.scale(1, k);
      ctx.strokeStyle = P.line; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 44 * sc); ctx.stroke();
      ctx.strokeStyle = '#c9ccd6'; ctx.lineWidth = 4; ctx.stroke();
      F.ellipse(ctx, 0, 52 * sc, 18 * sc, 18 * sc); F.fo(ctx, '#2a2a33', 4);
      ctx.strokeStyle = '#8a8d99'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(Math.cos(spin) * 12 * sc, 52 * sc + Math.sin(spin) * 12 * sc); ctx.lineTo(-Math.cos(spin) * 12 * sc, 52 * sc - Math.sin(spin) * 12 * sc); ctx.stroke();
      ctx.restore();
    });
  }

  // tiny Hayk (skin dot + black shades) in a plane window, drawn in plane-local coords
  const tinyFace = (ctx) => {
    ctx.fillStyle = P.skin; ctx.beginPath(); ctx.arc(0, 1, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = P.haykHair; ctx.fillRect(-7, -7, 14, 4);
    ctx.fillStyle = '#111'; ctx.fillRect(-7, -1, 14, 4);
  };

  function planeState(t) {
    // screen position of the plane centre and its pitch, in the runway view
    const x = lerp(430, 600, clamp(t / B_LIFT)) + (t > B_LIFT ? (t - B_LIFT) * 260 + (t - B_LIFT) * (t - B_LIFT) * 90 : 0);
    const air = Math.max(0, t - B_LIFT);
    const climb = air * air * 260 + air * 120;
    const rot = -0.24 * clamp(air / 0.45);
    const bump = t < B_LIFT ? Math.sin(t * 60) * 1.5 : 0;
    const s = 1.35 - 0.3 * clamp(air / 1.5);
    return { x, y: RUNWAY_Y - 80 * s + bump - climb, rot, s, air };
  }

  function porthole(ctx, t, cx, cy, r, k) {
    if (k <= 0) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(k, k);
    // connector tail from the inset to the plane (manga)
    // fuselage-coloured frame around a rounded airplane window
    F.rrect(ctx, -r - 40, -r * 1.2 - 40, (r + 40) * 2, (r * 1.2 + 40) * 2, r * 0.9); F.fo(ctx, '#f4f6fb', 7);
    F.rrect(ctx, -r - 14, -r * 1.2 - 14, (r + 14) * 2, (r * 1.2 + 14) * 2, r * 0.8); F.fo(ctx, '#c9d1e2', 5);
    ctx.save();
    F.rrect(ctx, -r, -r * 1.2, r * 2, r * 2.4, r * 0.75);
    ctx.clip();
    // inside cabin: warm sunset light
    F.sky(ctx, '#ffb07a', '#ff7a86', { x: -r, y: -r * 1.2, w: r * 2, h: r * 2.4 });
    ctx.fillStyle = '#6a4d8a'; ctx.fillRect(-r, -r * 1.2, r * 2, 70);
    ctx.fillStyle = '#3b2d5c'; F.rrect(ctx, -r + 20, r * 0.2, r * 2 - 40, r, 30); ctx.fill();
    // Hayk: find his head, then place it at the window centre
    const s = 2.2;
    const probe = { x: 0, y: 0, s, pose: 'thumbsUp', face: 'happy', shades: true, t };
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 0, 0); ctx.clip();
    const pa = FILM.cast.hayk(ctx, probe);
    ctx.restore();
    const bob = Math.sin(t * 10) * 4;
    const hx = -pa.head[0] - 20, hy = -pa.head[1] + 10 + bob;
    const a = FILM.cast.hayk(ctx, Object.assign({}, probe, { x: hx, y: hy }));
    F.sparkle(ctx, a.eyeR[0] + 20, a.eyeR[1] - 20, 34 + 12 * Math.sin(t * 12), { rot: t * 3 });
    F.sparkle(ctx, a.eyeL[0] - 30, a.eyeL[1] - 10, 20 + 8 * Math.sin(t * 9 + 1), { rot: -t * 2 });
    // glass reflection
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.moveTo(-r, -r * 0.6); ctx.lineTo(-r * 0.3, -r * 1.2); ctx.lineTo(-r * 0.05, -r * 1.2); ctx.lineTo(-r, -r * 0.2); ctx.closePath(); ctx.fill();
    ctx.restore();
    F.rrect(ctx, -r, -r * 1.2, r * 2, r * 2.4, r * 0.75); F.fo(ctx, null, 6);
    ctx.restore();
  }

  function drawRunway(ctx, t) {
    const ps = planeState(t);
    // camera tilts up to follow the climb after takeoff
    const camY = Math.min(520, Math.max(0, (RUNWAY_Y - 80 - ps.y) * 0.55));
    sunsetSky(ctx, t, camY);
    mountains(ctx, t, camY);
    airport(ctx, t, camY);
    runway(ctx, t, camY);

    const speed = clamp(0.35 + t / 1.6);
    // speed lines behind (horizontal, moving left)
    F.speedLines(ctx, { angle: Math.PI, count: 26, color: '#ffe8d0', alpha: 0.35 * speed, t, speed: 2600, len: 520, width: 7, seed: 61, y: 300, h: 1300 });

    // plane (screen y with camera follow)
    const py = ps.y + camY;
    // shadow on the runway, shrinking as it climbs
    const shA = clamp(1 - ps.air / 1.0);
    if (shA > 0) {
      ctx.save(); ctx.globalAlpha = 0.35 * shA; ctx.fillStyle = '#1b1424';
      F.ellipse(ctx, ps.x - 20, RUNWAY_Y + camY * 0.9 + 12, 330 * ps.s * (0.7 + 0.3 * shA), 20); ctx.fill();
      ctx.restore();
    }
    // exhaust shimmer / motion smear behind the plane
    F.motionSmear(ctx, ps.x - 700 * ps.s * 0.6 - 380, py - 60 * ps.s, 520, 110 * ps.s, { color: 'rgba(255,255,255,0.7)', angle: Math.PI, seed: 62, alpha: 0.6 * speed });
    ctx.save();
    ctx.translate(ps.x, py);
    ctx.rotate(ps.rot);
    ctx.scale(ps.s, ps.s);
    gear(ctx, t, clamp((t - B_LIFT - 0.3) / 0.4));
    ctx.restore();
    F.plane(ctx, ps.x, py, ps.s, { rot: ps.rot, face: tinyFace, tail: '#e8413c', stripe: '#27335c' });
    // lift-off: dust from the wheels, flash, shock ring
    F.dust(ctx, ps.x - 60, RUNWAY_Y + camY * 0.9, t - B_LIFT + 0.05, { n: 8, size: 70, spread: 320, seed: 63, color: '#e8d6e0', life: 1.0 });
    F.shockRing(ctx, ps.x + 60, py + 20, t - B_LIFT, { r: 520, color: '#fff6e0', life: 0.45, width: 26, squash: 0.45 });
    // near speed lines over everything (foreground)
    F.speedLines(ctx, { angle: Math.PI, count: 14, color: '#ffffff', alpha: 0.55 * speed, t, speed: 4200, len: 700, width: 10, seed: 64, y: 1300, h: 600 });

    // SFX on the takeoff beat
    F.sfx(ctx, 'WHOOSH!', 560, 1000, t, B_LIFT, { size: 150, rot: -0.14, fill: P.sfxYellow, shadowColor: '#c23b6a', life: 0.95 });

    // porthole inset: present from frame 0, pops away after the takeoff
    const pk = t < 1.35 ? 1 : 1 - LIB.ease.inBack(clamp((t - 1.35) / 0.25));
    if (pk > 0) {
      // connector from the inset to the plane window
      const wx = ps.x + (87 * Math.cos(ps.rot) - (-22) * Math.sin(ps.rot)) * ps.s;
      const wy = py + (87 * Math.sin(ps.rot) + (-22) * Math.cos(ps.rot)) * ps.s;
      ctx.save();
      ctx.globalAlpha = pk;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.strokeStyle = P.line; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(360, 800); ctx.lineTo(wx, wy); ctx.lineTo(470, 790); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      porthole(ctx, t, 400, 560, 190, pk);
    }
    // flash on lift
    if (t >= B_LIFT && t < B_LIFT + 0.2) F.flash(ctx, 0.55 * (1 - (t - B_LIFT) / 0.2), '#fff4dc');
  }

  // ------------------------------------------------------------------ map
  const MX = (lon) => 60 + (lon + 10) * 16;
  const MY = (lat) => 1000 - (lat - 40) * 22;
  const pts = (arr) => arr.map(([lo, la]) => [MX(lo), MY(la)]);
  const EUROPE = pts([
    [-5.6, 36.0], [-7.4, 37.2], [-8.9, 37.0], [-8.8, 38.7], [-9.5, 39.4], [-8.7, 41.8], [-9.2, 43.0], [-8.0, 43.7], [-4.0, 43.4], [-1.6, 43.4],
    [-1.2, 45.8], [-2.2, 47.1], [-4.6, 48.3], [-3.0, 48.8], [-1.5, 48.7], [-1.3, 49.6], [0.2, 49.5], [1.6, 50.4], [2.5, 51.1], [4.0, 51.9],
    [4.8, 53.0], [7.0, 53.6], [8.6, 53.9], [8.6, 55.4], [8.1, 56.8], [10.5, 57.6], [10.4, 56.2], [10.9, 55.0], [10.5, 54.4], [12.5, 54.4],
    [14.2, 53.9], [18.0, 54.8], [19.8, 54.5], [21.2, 55.2], [21.0, 56.8], [21.6, 57.5], [23.0, 57.0], [24.3, 57.8], [24.2, 59.3], [28.0, 59.5],
    [30.0, 60.0], [28, 64], [25.5, 65.8], [27, 74], [58, 74], [58, 12], [43, 12], [39, 21], [34.5, 28], [34.5, 30.0], [34.3, 31.3], [34.9, 32.8], [35.9, 35.0], [35.9, 36.3],
    [34.5, 36.8], [32.5, 36.1], [30.5, 36.6], [29.0, 36.6], [27.4, 37.0], [26.3, 38.2], [26.8, 39.2], [26.2, 39.9], [26.6, 40.6], [26.0, 40.8],
    [24.0, 40.7], [23.0, 40.4], [22.6, 40.0], [23.2, 39.0], [24.0, 38.1], [22.8, 37.5], [23.1, 36.5], [22.4, 36.5], [21.7, 36.9], [21.1, 37.8],
    [21.1, 38.6], [20.2, 39.5], [19.4, 40.6], [19.5, 41.8], [18.5, 42.4], [17.0, 43.2], [15.9, 43.6], [15.2, 44.3], [14.3, 45.2], [13.6, 45.6],
    [12.3, 45.3], [12.4, 44.3], [13.6, 43.5], [14.2, 42.4], [16.1, 41.9], [15.9, 41.5], [18.5, 40.1], [17.1, 39.4], [16.5, 38.4], [15.7, 38.0],
    [15.6, 38.9], [16.0, 39.6], [14.9, 40.3], [14.0, 40.8], [12.5, 41.7], [11.1, 42.4], [10.5, 43.0], [10.2, 43.9], [8.8, 44.4], [7.5, 43.8],
    [6.5, 43.1], [4.8, 43.4], [3.2, 43.2], [3.2, 41.9], [2.1, 41.3], [0.9, 41.0], [0.0, 39.9], [-0.3, 39.4], [0.2, 38.8], [-0.7, 37.6],
    [-2.1, 36.7], [-4.4, 36.7],
  ]);
  const SPAIN = pts([
    [-5.6, 36.0], [-7.4, 37.2], [-7.0, 38.0], [-7.3, 39.5], [-6.9, 41.0], [-8.2, 42.0], [-9.2, 43.0], [-8.0, 43.7], [-4.0, 43.4], [-1.6, 43.4],
    [0.7, 42.8], [3.2, 42.4], [3.2, 41.9], [2.1, 41.3], [0.9, 41.0], [0.0, 39.9], [-0.3, 39.4], [0.2, 38.8], [-0.7, 37.6], [-2.1, 36.7], [-4.4, 36.7],
  ]);
  const ARMENIA = pts([[43.4, 41.1], [45.0, 41.3], [45.6, 40.8], [45.1, 40.0], [46.5, 39.3], [46.5, 38.9], [45.9, 39.0], [44.8, 39.7], [43.7, 40.1], [43.6, 40.7]]);
  const BLACK_SEA = pts([
    [28.0, 41.9], [27.8, 42.9], [28.6, 44.0], [29.7, 45.2], [30.8, 46.5], [31.8, 46.6], [33.5, 45.9], [33.4, 44.6], [35.4, 45.1], [36.6, 45.3],
    [38.0, 47.1], [39.3, 47.2], [38.0, 46.0], [37.5, 44.7], [39.0, 44.0], [41.6, 41.6], [40.0, 41.0], [37.0, 41.1], [35.0, 42.0], [33.0, 42.0], [31.0, 41.2], [29.2, 41.2],
  ]);
  const CASPIAN = pts([[47.5, 45.5], [47.5, 43.0], [48.5, 41.8], [49.5, 40.4], [49.0, 38.5], [50.2, 37.3], [56, 37], [56, 47], [49, 46.8]]);
  const BRITAIN = pts([[-5.5, 50.0], [1.5, 51.2], [1.7, 52.7], [0.2, 53.5], [-0.5, 54.5], [-1.8, 55.6], [-2.0, 57.0], [-3.5, 58.6], [-5.0, 58.6], [-6.2, 57.5], [-5.5, 55.5], [-3.0, 54.2], [-4.7, 52.8], [-5.3, 51.7], [-3.5, 51.4], [-5.7, 50.0]]);
  const IRELAND = pts([[-6.0, 52.2], [-6.2, 53.9], [-5.7, 55.2], [-8.3, 55.2], [-10.0, 54.0], [-9.8, 51.7], [-8.0, 51.6]]);
  const SCANDI = pts([[5.3, 59.3], [5.0, 61.5], [8, 64], [12, 67], [16, 74], [26, 74], [24, 66], [21, 64], [18.5, 60.3], [16.5, 57.0], [14.2, 55.4], [12.8, 55.6], [11.0, 58.9], [10.0, 59.0], [8.0, 58.0], [6.5, 58.1]]);
  const SICILY = pts([[12.4, 38.1], [15.6, 38.3], [15.1, 36.7], [12.5, 37.6]]);
  const SARDINIA = pts([[8.4, 41.2], [9.8, 41.1], [9.6, 39.1], [8.4, 39.0]]);
  const CORSICA = pts([[8.6, 43.0], [9.5, 42.9], [9.3, 41.4], [8.6, 41.9]]);
  const AFRICA = pts([
    [-14, 12], [-14, 29], [-9.8, 31.5], [-6.8, 34.0], [-5.9, 35.8], [-2.2, 35.1], [1.0, 36.5], [3.5, 36.8], [8.6, 36.9], [10.3, 37.3], [11.1, 36.8],
    [10.5, 35.5], [11.2, 33.2], [15.2, 32.3], [19.9, 30.8], [20.1, 32.2], [23.1, 32.6], [25.2, 31.6], [29.0, 30.9], [32.0, 31.2], [33.5, 31.1], [32.6, 29.9], [33.5, 27.5], [36, 23], [38, 18], [40, 12],
  ]);
  const YVN = [MX(44.5), MY(40.2)];
  const MAD = [MX(-3.7), MY(40.4)];
  const CTRL = [(YVN[0] + MAD[0]) / 2, 560];
  const arcPt = (u) => {
    const a = 1 - u;
    return [a * a * YVN[0] + 2 * a * u * CTRL[0] + u * u * MAD[0], a * a * YVN[1] + 2 * a * u * CTRL[1] + u * u * MAD[1]];
  };
  const arcTan = (u) => [2 * (1 - u) * (CTRL[0] - YVN[0]) + 2 * u * (MAD[0] - CTRL[0]), 2 * (1 - u) * (CTRL[1] - YVN[1]) + 2 * u * (MAD[1] - CTRL[1])];

  const PANEL = { x: 36, y: 390, w: 1008, h: 1010 };

  function mapStatic(g) {
    // sea
    F.sky(g, '#6cc4ef', '#3f9ad6', { x: PANEL.x, y: PANEL.y, w: PANEL.w, h: PANEL.h });
    // wave ticks
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath();
    for (let i = 0; i < 40; i++) {
      const x = PANEL.x + h01('wx', i) * PANEL.w, y = PANEL.y + h01('wy', i) * PANEL.h;
      g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 8, x + 20, y); g.quadraticCurveTo(x + 30, y + 8, x + 40, y);
    }
    g.stroke();
    // land
    const land = (poly, fill) => { F.poly(g, poly); F.fo(g, fill, 4); };
    [EUROPE, BRITAIN, IRELAND, SCANDI, SICILY, SARDINIA, CORSICA, AFRICA].forEach((poly) => land(poly, '#f6e3b4'));
    // inland seas on top of the land mass
    [BLACK_SEA, CASPIAN].forEach((poly) => { F.poly(g, poly); F.fo(g, '#5fb6e8', 4); });
    // grid
    g.strokeStyle = 'rgba(40,70,120,0.18)'; g.lineWidth = 2;
    g.beginPath();
    for (let lo = -10; lo <= 50; lo += 10) { g.moveTo(MX(lo), PANEL.y); g.lineTo(MX(lo), PANEL.y + PANEL.h); }
    for (let la = 30; la <= 60; la += 5) { g.moveTo(PANEL.x, MY(la)); g.lineTo(PANEL.x + PANEL.w, MY(la)); }
    g.stroke();
    // soft hills/forest dots on land
    g.fillStyle = 'rgba(140,180,90,0.35)';
    [[5, 47], [12, 50], [20, 49], [26, 47], [32, 52], [40, 55], [15, 46], [24, 43], [2, 45], [36, 39], [42, 50]].forEach(([lo, la]) => { g.beginPath(); g.arc(MX(lo), MY(la), 26, 0, TAU); g.fill(); });
    // highlighted countries
    F.poly(g, SPAIN); F.fo(g, '#ffb13a', 5);
    F.poly(g, ARMENIA); F.fo(g, '#ff6a4a', 5);
    // tiny Ararat next to Armenia
    F.ararat(g, MX(43.2), MY(39.1), 70, 34, {});
    // compass rose
    g.save(); g.translate(PANEL.x + PANEL.w - 110, PANEL.y + 110);
    F.star(g, 0, 0, 56, 14, 4); F.fo(g, '#ffffff', 4);
    F.star(g, 0, 0, 30, 10, 4, -Math.PI / 4); F.fo(g, '#ff6a4a', 3);
    g.restore();
  }

  function drawMap(ctx, t) {
    // dark evening sky behind the map panel
    F.sky(ctx, '#20164a', '#5a2d6e');
    F.stars(ctx, { n: 60, seed: 607, h: 1920 });
    F.focusLines(ctx, 540, 900, { inner: 620, count: 70, color: 'rgba(255,255,255,0.08)', seed: 65, width: 18 });
    // panel with a subtle pop as the whip pan lands
    const land = clamp((t - B_WHIP - WHIP_DUR) / 0.2);
    ctx.save();
    F.rrect(ctx, PANEL.x - 10, PANEL.y - 10, PANEL.w + 20, PANEL.h + 20, 30); F.fo(ctx, '#fff6e3', 8);
    ctx.save();
    F.rrect(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 22); ctx.clip();
    mapStatic(ctx);
    ctx.restore();
    ctx.restore();
    void land;

    // burger icon glowing over Spain (foreshadowing!)
    const pulse = 1 + 0.08 * Math.sin(t * 8);
    F.burger(ctx, MAD[0] + 100, MAD[1] - 20, 0.34 * pulse, { glow: true });
    F.sparkle(ctx, MAD[0] + 150, MAD[1] - 60, 18 + 8 * Math.sin(t * 10), { rot: t });

    // dotted arc: faint full path + solid travelled part
    const fu = LIB.ease.inOutSine(clamp((t - B_FLY0) / (B_FLY1 - B_FLY0)));
    ctx.save();
    ctx.lineCap = 'round';
    ctx.setLineDash([2, 26]);
    ctx.lineDashOffset = -t * 60;
    ctx.beginPath(); ctx.moveTo(YVN[0], YVN[1]); ctx.quadraticCurveTo(CTRL[0], CTRL[1], MAD[0], MAD[1]);
    ctx.strokeStyle = 'rgba(27,20,36,0.35)'; ctx.lineWidth = 12; ctx.stroke();
    if (fu > 0) {
      ctx.beginPath();
      for (let k = 0; k <= 40; k++) { const p = arcPt((k / 40) * fu); if (k === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); }
      ctx.strokeStyle = '#e8413c'; ctx.lineWidth = 14; ctx.stroke();
    }
    ctx.restore();

    // markers: Armenia flag (right) and Spain flag + pin (left)
    F.flag(ctx, YVN[0] + 6, YVN[1] + 4, 0.55, 'AM', { t });
    F.ellipse(ctx, YVN[0], YVN[1], 12, 12); F.fo(ctx, '#ffffff', 4);
    const arrived = t >= B_FLY1;
    const spop = arrived ? F.popIn(t, B_FLY1) : 1;
    F.flag(ctx, MAD[0] - 4, MAD[1] + 4, 0.55 * (arrived ? spop : 0.85), 'ES', { t });
    F.ellipse(ctx, MAD[0], MAD[1], 12, 12); F.fo(ctx, arrived ? '#ffe14a' : '#ffffff', 4);
    F.tag(ctx, 'YEREVAN', YVN[0] - 40, YVN[1] + 58, { size: 26, bg: '#1b1424' });
    F.tag(ctx, 'SPAIN', MAD[0] + 30, MAD[1] + 58, { size: 26, bg: '#1b1424' });

    // plane icon along the arc (faces left, towards Spain)
    const pu = t < B_FLY0 ? 0 : fu;
    const pp = arcPt(pu), tg = arcTan(Math.min(0.999, Math.max(0.001, pu)));
    const ang = Math.atan2(tg[1], tg[0]);
    // contrail puffs behind the plane
    for (let i = 1; i <= 6; i++) {
      const u2 = pu - i * 0.03;
      if (u2 <= 0) break;
      const q = arcPt(u2);
      ctx.save(); ctx.globalAlpha = 0.7 * (1 - i / 7);
      F.ellipse(ctx, q[0], q[1], 16 - i, 16 - i); F.fo(ctx, '#ffffff', 0);
      ctx.restore();
    }
    const bob = Math.sin(t * 9) * 3;
    F.plane(ctx, pp[0], pp[1] + bob, 0.44, { rot: ang + Math.PI, flip: true, tail: '#e8413c' });
    if (t >= B_FLY0 && t < B_FLY1) F.speedLines(ctx, { x: pp[0] - 60, y: pp[1] - 50, w: 260, h: 100, angle: ang + Math.PI, count: 8, color: '#ffffff', alpha: 0.7, t, speed: 1200, len: 90, width: 5, seed: 66 });
    // arrival pop over Spain
    if (arrived) {
      const k = F.popIn(t, B_FLY1);
      F.burst(ctx, MAD[0], MAD[1], 90 * k, 50 * k, 12, '#fff05a', { lw: 5, seed: 67 });
      F.shockRing(ctx, MAD[0], MAD[1], t - B_FLY1, { r: 220, color: '#ffffff', life: 0.45, width: 16 });
      F.sparkles(ctx, { x: MAD[0] - 140, y: MAD[1] - 140, w: 280, h: 280, n: 6, seed: 68, t, size: 30 });
    }

    // captions (screen fixed, inside the safe area)
    F.caption(ctx, 'YEREVAN -> SPAIN', 540, 290, { size: 74, align: 'center', t, t0: B_CAP1, from: 'left', bg: '#1b1424', accent: '#e8413c' });
    F.caption(ctx, '1 MONTH. MISSION: INVESTORS.', 540, 1470, { size: 50, align: 'center', t, t0: B_CAP2, from: 'right', bg: '#e8413c', accent: '#ffcc33' });
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const W = 1080, H = 1920;
      const [kx, ky] = F.shakeMany(t, [[B_LIFT, 0.4, 16], [B_FLY1, 0.25, 8]], 6);

      if (t < B_WHIP) {
        ctx.save();
        ctx.translate(kx, ky);
        drawRunway(ctx, t);
        ctx.restore();
        return;
      }
      // whip-pan up: the runway drops away, the map arrives from above, vertical speed-line wipe
      const u = clamp((t - B_WHIP) / WHIP_DUR);
      const e = LIB.ease.inOutCubic(u);
      if (u < 1) {
        ctx.save();
        ctx.translate(0, e * H);
        drawRunway(ctx, B_WHIP - 0.01);
        ctx.restore();
      }
      ctx.save();
      ctx.translate(kx, ky + (e - 1) * H);
      drawMap(ctx, t);
      ctx.restore();
      if (u < 1) {
        const k = Math.sin(u * Math.PI);
        F.flash(ctx, 0.35 * k, '#ffe6f0');
        F.speedLines(ctx, { angle: Math.PI / 2, count: 60, color: '#ffffff', alpha: 0.9 * k, t, speed: 6000, len: 1400, width: 16, seed: 69 });
      }
    },
  });
})();
