/*
 * Shot 04 'goofy-knows' : Goofy sees the suitcase. T 13.0 - 17.0 (local 0 - 4 s).
 *
 * Beats (local t):
 *   0.0  hallway, daylight; packed suitcase with an airplane tag by the front door; Goofy sits and
 *        stares at it (curious head tilt, "?" mark)
 *   1.0  face -> "sad": trembling tear-filled eyes, ears droop; camera starts pushing in on Goofy
 *   2.0  soft pink sparkle backdrop fades in (shoujo mode), light blue gloom lines above his head,
 *        thought bubble "...you're leaving me?"
 *   3.0  Hayk's giant legs step in at the right edge (cropped, feet visible), stomp dust, big sweat drop
 *
 * Layers (back to front):
 *   1. ceiling + wall + wainscot + door + wall props (picture of Ararat, hooks with the red leash, lamp)
 *   2. sunbeam washes, floor planks, rug, doormat, bowl
 *   3. suitcase with airplane tag
 *   4. pink sparkle backdrop (from 2.0)
 *   5. Goofy + eye overlays, gloom lines, sweat
 *   6. dust motes (camera space)
 *   7. screen-space: Hayk's legs (from 3.0), sweat drop, thought bubble, vignette
 */
(function () {
  'use strict';
  const ID = 'goofy-knows';
  const FILM = window.FILM;
  const LIB = FILM.lib;
  const F = FILM.fx;
  const P = F.pal;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sstep = (a, b, v) => { const u = clamp((v - a) / (b - a)); return u * u * (3 - 2 * u); };
  const h01 = (...k) => F.h01(ID, ...k);

  // beats (local)
  const B_SAD = 1.0; // T 14.0
  const B_PINK = 2.0; // T 15.0
  const B_STEP = 3.0; // T 16.0 footsteps

  // world layout
  const FLOOR_Y = 1240;
  const DOOR = { x: 96, y: 520, w: 350, h: FLOOR_Y - 520 };
  const SUIT = { x: 300, y: 1440, s: 1.3 };
  const GOOFY = { x: 735, y: 1520, s: 1.7 };

  // colours local to this hallway
  const COL = {
    ceil: '#f3dfc2', wall: '#fbeedb', wallShade: '#efd9ba', wains: '#e7cfa8', wainsShade: '#d7b98c', trim: '#fff7ea',
    door: '#c3773f', doorShade: '#a35e2d', doorFrame: '#8a5230', floor: '#d49a62', floorShade: '#bf844f', floorLine: '#a86f3e',
    rug: '#8cc3e6', rugStripe: '#5f9fd0', mat: '#9b6b3e', brass: '#f2c14e',
  };

  function wallLayer(ctx, t) {
    // ceiling band and crown molding
    ctx.fillStyle = COL.ceil;
    ctx.fillRect(-200, -200, 1480, 330);
    ctx.fillStyle = COL.wall;
    ctx.fillRect(-200, 130, 1480, FLOOR_Y - 130);
    // soft vertical shading on the wall
    const g = ctx.createLinearGradient(0, 130, 0, FLOOR_Y);
    g.addColorStop(0, 'rgba(230,200,160,0.35)');
    g.addColorStop(1, 'rgba(230,200,160,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-200, 130, 1480, 400);
    F.rrect(ctx, -200, 112, 1480, 30, 4); F.fo(ctx, COL.trim, 4);
    ctx.fillStyle = COL.wallShade; ctx.fillRect(-200, 142, 1480, 10);
    // wallpaper: faint vertical pinstripes with tiny diamonds
    ctx.fillStyle = 'rgba(214,176,128,0.28)';
    for (let x = -180; x < 1280; x += 64) ctx.fillRect(x, 152, 5, 820);
    ctx.fillStyle = 'rgba(214,176,128,0.35)';
    ctx.beginPath();
    for (let x = -148; x < 1280; x += 64) for (let y = 200; y < 960; y += 96) { ctx.moveTo(x, y - 8); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 6, y); ctx.closePath(); }
    ctx.fill();
    // wainscot panels below the chair rail
    ctx.fillStyle = COL.wains;
    ctx.fillRect(-200, 975, 1480, FLOOR_Y - 975);
    for (let i = 0; i < 6; i++) {
      const px = 470 + i * 200;
      F.rrect(ctx, px, 1015, 160, 170, 8); F.fo(ctx, COL.wainsShade, 3, 'rgba(27,20,36,0.35)');
      ctx.fillStyle = COL.wains; ctx.fillRect(px + 8, 1023, 144, 154);
    }
    F.rrect(ctx, -200, 962, 1480, 22, 4); F.fo(ctx, COL.trim, 4);
    // baseboard
    F.rrect(ctx, -200, FLOOR_Y - 36, 1480, 40, 2); F.fo(ctx, COL.trim, 4);

    // --- front door with frame
    const d = DOOR;
    F.rrect(ctx, d.x - 34, d.y - 34, d.w + 68, d.h + 40, 6); F.fo(ctx, COL.trim, 5);
    F.rrect(ctx, d.x - 12, d.y - 12, d.w + 24, d.h + 12, 4); F.fo(ctx, COL.doorFrame, 4);
    F.rrect(ctx, d.x, d.y, d.w, d.h, 4); F.fo(ctx, COL.door, 5);
    // panels
    [[d.x + 40, d.y + 50, 110, 250], [d.x + 200, d.y + 50, 110, 250], [d.x + 40, d.y + 360, 110, 300], [d.x + 200, d.y + 360, 110, 300]].forEach(([x, y, w, h]) => {
      F.rrect(ctx, x, y, w, h, 6); F.fo(ctx, COL.doorShade, 3.5);
      ctx.fillStyle = COL.door; ctx.fillRect(x + 10, y + 10, w - 20, h - 20);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x + 10, y + 10, 10, h - 20);
    });
    // peephole, handle, deadbolt
    F.ellipse(ctx, d.x + d.w / 2, d.y + 330, 11, 11); F.fo(ctx, COL.brass, 3.5);
    F.ellipse(ctx, d.x + d.w - 42, d.y + 380, 20, 20); F.fo(ctx, COL.brass, 4);
    F.rrect(ctx, d.x + d.w - 50, d.y + 376, 44, 12, 5); F.fo(ctx, COL.brass, 3);
    F.ellipse(ctx, d.x + d.w - 42, d.y + 450, 12, 12); F.fo(ctx, COL.brass, 3.5);
    // door number plate
    F.rrect(ctx, d.x + d.w / 2 - 40, d.y + 16, 80, 26, 6); F.fo(ctx, COL.brass, 3);

    // --- framed picture of Ararat
    const px = 560, py = 360, pw = 300, ph = 210;
    F.rrect(ctx, px - 16, py - 16, pw + 32, ph + 32, 6); F.fo(ctx, '#6b4a2e', 5);
    ctx.save();
    ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
    F.sky(ctx, '#ffb27a', '#ffe3b0', { x: px, y: py, w: pw, h: ph });
    ctx.fillStyle = '#fff1c8'; ctx.beginPath(); ctx.arc(px + 230, py + 70, 26, 0, TAU); ctx.fill();
    F.ararat(ctx, px - 10, py + ph - 20, pw + 20, 150, {});
    ctx.fillStyle = '#7fae6a'; ctx.fillRect(px, py + ph - 26, pw, 26);
    ctx.restore();
    ctx.strokeStyle = P.line; ctx.lineWidth = 4; ctx.strokeRect(px, py, pw, ph);
    // tiny photo of Hayk + Goofy (heart frame) next to it
    F.rrect(ctx, 905, 420, 120, 150, 8); F.fo(ctx, '#ff9ab8', 4);
    F.rrect(ctx, 917, 432, 96, 126, 6); F.fo(ctx, '#fff5e8', 3);
    F.heart(ctx, 965, 500, 1.2, '#ff6f96', 3);

    // --- coat hooks with the red leash and Hayk's cap
    F.rrect(ctx, 600, 720, 420, 30, 8); F.fo(ctx, '#8a5a3a', 4);
    for (let i = 0; i < 4; i++) { F.ellipse(ctx, 650 + i * 110, 735, 11, 11); F.fo(ctx, COL.brass, 3); }
    // leash loops hanging from the second hook (sways a little)
    const sw = Math.sin(t * 2.2) * 6;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(760, 740); ctx.bezierCurveTo(720 + sw, 860, 800 + sw, 900, 770 + sw, 960);
    ctx.moveTo(760, 740); ctx.bezierCurveTo(800 + sw, 830, 740 + sw, 900, 770 + sw, 960);
    ctx.strokeStyle = P.line; ctx.lineWidth = 13; ctx.stroke();
    ctx.strokeStyle = P.leash; ctx.lineWidth = 7; ctx.stroke();
    ctx.restore();
    F.ellipse(ctx, 770 + sw, 966, 12, 12); F.fo(ctx, '#c9ccd6', 3.5);
    // cap on the fourth hook
    ctx.beginPath(); ctx.moveTo(930, 745); ctx.bezierCurveTo(930, 680, 1030, 680, 1030, 745); ctx.closePath(); F.fo(ctx, P.hoodie, 4);
    F.rrect(ctx, 900, 738, 70, 16, 8); F.fo(ctx, P.hoodieShade, 3.5);
    F.ellipse(ctx, 980, 712, 12, 12); F.fo(ctx, P.lsBlue, 3);

    // --- wall lamp above the picture, glowing
    const lg = ctx.createRadialGradient(710, 270, 10, 710, 270, 190);
    lg.addColorStop(0, 'rgba(255,236,170,0.65)');
    lg.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(710, 270, 190, 0, TAU); ctx.fill();
    F.rrect(ctx, 698, 240, 24, 40, 6); F.fo(ctx, '#8a5a3a', 3.5);
    ctx.beginPath(); ctx.moveTo(660, 290); ctx.lineTo(760, 290); ctx.lineTo(735, 230); ctx.lineTo(685, 230); ctx.closePath(); F.fo(ctx, '#fff2c8', 4);

    // --- ceiling light fixture
    ctx.strokeStyle = P.line; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(330, -60); ctx.lineTo(330, 60); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(270, 60); ctx.quadraticCurveTo(330, 20, 390, 60); ctx.lineTo(370, 90); ctx.lineTo(290, 90); ctx.closePath(); F.fo(ctx, '#ffffff', 4);
  }

  function floorLayer(ctx, t) {
    ctx.fillStyle = COL.floor;
    ctx.fillRect(-200, FLOOR_Y, 1480, 1000);
    // planks converge to a vanishing point above the floor line
    const vx = 540, vy = 420;
    ctx.strokeStyle = COL.floorLine; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = -14; i <= 14; i++) {
      const xTop = vx + i * 95 * ((FLOOR_Y - vy) / (FLOOR_Y + 400 - vy));
      const k = (2300 - vy) / (FLOOR_Y - vy);
      ctx.moveTo(xTop, FLOOR_Y);
      ctx.lineTo(vx + (xTop - vx) * k, 2300);
    }
    ctx.stroke();
    // plank ends (staggered short cross lines)
    ctx.beginPath();
    for (let r = 0; r < 7; r++) {
      const y = FLOOR_Y + 30 + r * r * 16 + r * 36;
      for (let i = -12; i <= 12; i++) {
        if (h01('pl', r, i) < 0.55) continue;
        const u = (y - vy) / (FLOOR_Y - vy);
        const x0 = vx + i * 95 * ((FLOOR_Y - vy) / (FLOOR_Y + 400 - vy)) * u;
        const x1 = vx + (i + 1) * 95 * ((FLOOR_Y - vy) / (FLOOR_Y + 400 - vy)) * u;
        ctx.moveTo(x0, y); ctx.lineTo(x1, y);
      }
    }
    ctx.stroke();
    // floor shading toward the camera
    const g = ctx.createLinearGradient(0, FLOOR_Y, 0, 1920);
    g.addColorStop(0, 'rgba(120,70,30,0.25)');
    g.addColorStop(0.3, 'rgba(120,70,30,0)');
    g.addColorStop(1, 'rgba(90,50,20,0.25)');
    ctx.fillStyle = g;
    ctx.fillRect(-200, FLOOR_Y, 1480, 1000);
    // doormat in front of the door
    ctx.beginPath(); ctx.moveTo(150, 1262); ctx.lineTo(450, 1262); ctx.lineTo(480, 1330); ctx.lineTo(120, 1330); ctx.closePath(); F.fo(ctx, COL.mat, 4);
    ctx.strokeStyle = 'rgba(60,35,15,0.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); for (let i = 0; i < 12; i++) { const x = 160 + i * 26; ctx.moveTo(x, 1270); ctx.lineTo(x - 8 + i * 0.5, 1322); } ctx.stroke();
    // round rug under Goofy
    F.ellipse(ctx, GOOFY.x - 10, GOOFY.y + 10, 330, 78); F.fo(ctx, COL.rug, 4);
    ctx.save();
    F.ellipse(ctx, GOOFY.x - 10, GOOFY.y + 10, 330, 78); ctx.clip();
    ctx.strokeStyle = COL.rugStripe; ctx.lineWidth = 10;
    for (let k = 1; k <= 3; k++) { F.ellipse(ctx, GOOFY.x - 10, GOOFY.y + 10, 330 - k * 60, 78 - k * 15); ctx.stroke(); }
    ctx.restore();
    // shoes by the door (a pair of Hayk's sneakers)
    [[480, 1300, -0.08], [560, 1318, 0.1]].forEach(([x, y, r]) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(r);
      ctx.beginPath(); ctx.moveTo(-50, 10); ctx.quadraticCurveTo(-50, -26, -10, -28); ctx.quadraticCurveTo(30, -20, 55, 0); ctx.quadraticCurveTo(58, 14, 40, 16); ctx.lineTo(-44, 16); ctx.closePath(); F.fo(ctx, P.shoe, 4);
      ctx.fillStyle = P.shoeAccent; ctx.fillRect(-40, 4, 84, 8);
      ctx.restore();
    });
    // dog bowl with a bone icon
    F.ellipse(ctx, 1000, 1395, 70, 20); F.fo(ctx, '#e5323a', 4);
    ctx.beginPath(); ctx.moveTo(930, 1395); ctx.lineTo(945, 1440); ctx.quadraticCurveTo(1000, 1456, 1055, 1440); ctx.lineTo(1070, 1395); F.fo(ctx, '#e5323a', 4);
    F.ellipse(ctx, 1000, 1395, 56, 13); F.fo(ctx, '#7a3a1a', 3);
    ctx.fillStyle = '#ffffff';
    F.rrect(ctx, 982, 1418, 36, 9, 4); ctx.fill();
    [[982, 1418], [982, 1427], [1018, 1418], [1018, 1427]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill(); });
  }

  // sunbeam washes from a window off-screen top-left, plus dust motes
  function sunbeams(ctx, t, a) {
    ctx.save();
    ctx.globalAlpha = 0.22 * a;
    ctx.fillStyle = '#fff6c8';
    [[-120, 150], [120, 90], [300, 60]].forEach(([x0, w]) => {
      ctx.beginPath();
      ctx.moveTo(x0, 0); ctx.lineTo(x0 + w, 0); ctx.lineTo(x0 + w + 900, 1920); ctx.lineTo(x0 + 900, 1920); ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }
  function motes(ctx, t, a) {
    ctx.save();
    ctx.fillStyle = '#fffbe6';
    for (let i = 0; i < 26; i++) {
      const bx = h01('mx', i) * 1000 + 40, by = h01('my', i) * 1300 + 200;
      const x = bx + Math.sin(t * 0.9 + i) * 20 + t * 14, y = by - t * (10 + 16 * h01('ms', i));
      ctx.globalAlpha = a * (0.35 + 0.5 * h01('ma', i)) * (0.6 + 0.4 * Math.sin(t * 3 + i * 1.7));
      ctx.beginPath(); ctx.arc(x, y, 2.5 + 3 * h01('mr', i), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // shoujo pink sparkle backdrop (screen-covering in world coords around Goofy)
  function pinkBackdrop(ctx, t, a) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    const cx = GOOFY.x - 20, cy = GOOFY.y - 260;
    const g = ctx.createRadialGradient(cx, cy, 60, cx, cy, 1100);
    g.addColorStop(0, '#fff0f6');
    g.addColorStop(0.45, '#ffc9de');
    g.addColorStop(1, '#f39ac0');
    ctx.fillStyle = g;
    ctx.fillRect(-300, -300, 1700, 2600);
    // soft rotating rays
    ctx.globalAlpha = a * 0.25;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const rot = t * 0.15;
    for (let i = 0; i < 16; i++) {
      const a0 = rot + (i / 16) * TAU, a1 = a0 + TAU / 40;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a0) * 2000, cy + Math.sin(a0) * 2000);
      ctx.lineTo(cx + Math.cos(a1) * 2000, cy + Math.sin(a1) * 2000);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = a;
    F.bokeh(ctx, { n: 22, t, seed: 404, x: -100, y: 200, w: 1300, h: 1500, rMin: 20, rMax: 80, colors: ['#ffffff', '#ffe3ef', '#ffd6f0'], alpha: 0.55 });
    F.sparkles(ctx, { x: 0, y: 300, w: 1080, h: 1200, n: 18, seed: 405, t, size: 34, color: '#ffffff' });
    // floating petals / tiny hearts
    for (let i = 0; i < 8; i++) {
      const u = ((t * 0.25 + h01('pt', i)) % 1 + 1) % 1;
      const x = h01('px', i) * 1100 - 20 + Math.sin(u * 8 + i) * 30;
      const y = 300 + u * 1200;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(u * 6 + i);
      ctx.fillStyle = i % 2 ? '#ff8fb8' : '#ffffff';
      F.ellipse(ctx, 0, 0, 12, 6); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // big wobbling tear pools and highlights over Goofy's open sad eyes
  function tearyEyes(ctx, a, t, s, k) {
    if (k <= 0) return;
    const bi = Math.floor(t * 12 + 1e-6);
    [a.eyeL, a.eyeR].forEach((e, i) => {
      const wob = Math.sin(bi * 2.3 + i) * 1.5 * s;
      ctx.save();
      ctx.globalAlpha = k;
      // welling tear pool inside the lower half of the eye, with a wavy surface
      ctx.fillStyle = 'rgba(120,200,255,0.7)';
      ctx.beginPath();
      ctx.moveTo(e[0] - 15 * s, e[1] + 4 * s);
      ctx.quadraticCurveTo(e[0] - 7 * s, e[1] + (1 + wob * 0.4) * s, e[0], e[1] + 4 * s);
      ctx.quadraticCurveTo(e[0] + 7 * s, e[1] + (7 - wob * 0.4) * s, e[0] + 15 * s, e[1] + 4 * s);
      ctx.quadraticCurveTo(e[0] + 14 * s, e[1] + 20 * s, e[0], e[1] + 21 * s);
      ctx.quadraticCurveTo(e[0] - 14 * s, e[1] + 20 * s, e[0] - 15 * s, e[1] + 4 * s);
      ctx.fill();
      // shimmering highlights (the "huge wobbling eyes")
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(e[0] - 6 * s + wob, e[1] - 8 * s, 7 * s, 9 * s, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(e[0] + 7 * s - wob, e[1] + 4 * s, 3.5 * s, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(e[0] + 2 * s, e[1] - 12 * s + wob, 2.2 * s, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(e[0] - 4 * s, e[1] + 12 * s, 5 * s, 2.5 * s, 0, 0, TAU); ctx.fill();
      // a tear bead at the outer corner that grows
      const grow = clamp((t - B_SAD - 0.4) / 1.2) * k;
      if (grow > 0) {
        const dx = i === 0 ? 17 : -17;
        const r = (4 + 6 * grow) * s;
        ctx.beginPath();
        ctx.moveTo(e[0] + dx * s, e[1] + 10 * s);
        ctx.quadraticCurveTo(e[0] + dx * s + r, e[1] + 16 * s + r, e[0] + dx * s, e[1] + 16 * s + r * 1.8);
        ctx.quadraticCurveTo(e[0] + dx * s - r, e[1] + 16 * s + r, e[0] + dx * s, e[1] + 10 * s);
        F.fo(ctx, P.tear, 2.5);
      }
      ctx.restore();
    });
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const tw = LIB.onTwos(t);
      const W = 1080, H = 1920;
      const sad = t >= B_SAD;
      const pinkA = sstep(B_PINK - 0.05, B_PINK + 0.3, t);

      // --- camera: gentle drift, then push-in on Goofy from 1.0, jolt on the footstep
      const push = LIB.ease.inOutCubic(clamp((t - B_SAD) / 2.2));
      const z = lerp(1.14 + 0.03 * clamp(t), 1.8, push);
      const fx = lerp(560, GOOFY.x - 30, push), fy = lerp(1090, GOOFY.y - 280, push);
      const sx = lerp(540, 468, push), sy = lerp(960, 1027, push);
      const [kx, ky] = F.shake(t, B_STEP, 0.35, 16, 7);

      // ---------- world
      ctx.save();
      ctx.translate(sx + kx, sy + ky);
      ctx.scale(z, z);
      ctx.translate(-fx, -fy);

      wallLayer(ctx, t);
      floorLayer(ctx, t);
      sunbeams(ctx, t, 1 - pinkA * 0.8);

      // suitcase with a big airline tag (airplane icon) swinging on the handle
      F.suitcase(ctx, SUIT.x, SUIT.y, SUIT.s, { color: '#e8413c' });
      const sw = Math.sin(tw * 2.6) * 0.12;
      ctx.save();
      ctx.translate(SUIT.x + 58 * SUIT.s, SUIT.y - 390 * SUIT.s);
      ctx.rotate(0.25 + sw);
      ctx.strokeStyle = P.line; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 60); ctx.stroke();
      F.rrect(ctx, -46, 58, 92, 120, 10); F.fo(ctx, '#ffffff', 4);
      ctx.fillStyle = '#2f7de0'; ctx.fillRect(-44, 60, 88, 26);
      F.ellipse(ctx, 0, 70, 7, 7); F.fo(ctx, '#ffffff', 3);
      F.plane(ctx, 0, 130, 0.14, { rot: -0.4 });
      ctx.restore();
      // gleam on the suitcase that catches the light
      F.sparkle(ctx, SUIT.x - 90, SUIT.y - 350, 30 + 10 * Math.sin(t * 5), { rot: t });

      // pink sparkle backdrop covers the hallway from 2.0
      pinkBackdrop(ctx, t, pinkA * 0.94);

      // --- Goofy
      const look = t < B_SAD ? [1, 0.1] : t < B_STEP + 0.1 ? [0.6, -0.1] : [-0.9, -0.8];
      const tiltHead = t < B_SAD ? 0.04 * Math.sin(t * 3) : 0;
      // squash on the face switch and a flinch on the footstep
      const sq = (t >= B_SAD && t < B_SAD + 2 / 12) || (t >= B_STEP && t < B_STEP + 2 / 12) ? 1 : 0;
      const bob = sad ? Math.sin(tw * Math.PI * 2) * 2 : Math.sin(tw * Math.PI) * 4;
      ctx.save();
      ctx.translate(GOOFY.x, GOOFY.y);
      ctx.scale(1 + 0.06 * sq, 1 - 0.08 * sq);
      ctx.translate(-GOOFY.x, -GOOFY.y);
      const ga = FILM.cast.goofy(ctx, {
        x: GOOFY.x, y: GOOFY.y + bob, s: GOOFY.s, flip: true, pose: 'sit', t: tw,
        face: sad ? 'sad' : 'neutral', look, tilt: tiltHead - (sad ? 0.03 : 0),
        blink: t >= B_STEP && t < B_STEP + 0.08,
      });
      ctx.restore();
      tearyEyes(ctx, ga, t, GOOFY.s, sad ? clamp((t - B_SAD) * 6) : 0);

      // curious "?" before he gets it, then "!" snap at the face switch
      if (t < B_SAD) {
        const qy = ga.top[1] - 70 + Math.sin(tw * 6) * 6;
        F.text(ctx, '?', ga.top[0] + 70, qy, { size: 90, fill: '#ffffff', lw: 12, rot: 0.2 });
      } else if (t < B_SAD + 0.6) {
        const k = F.popIn(t, B_SAD);
        F.text(ctx, '!', ga.top[0] + 80, ga.top[1] - 60, { size: 110, fill: P.shout, lw: 14, rot: 0.15, scale: k });
        // shock lines around the head
        ctx.save();
        ctx.strokeStyle = P.line; ctx.lineWidth = 6; ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const a = -2.3 + i * 0.35;
          const r0 = 150, r1 = 200;
          ctx.beginPath(); ctx.moveTo(ga.head[0] + Math.cos(a) * r0, ga.head[1] + Math.sin(a) * r0); ctx.lineTo(ga.head[0] + Math.cos(a) * r1, ga.head[1] + Math.sin(a) * r1); ctx.stroke();
        }
        ctx.restore();
      }

      // gloom (anime depression) lines hanging above his head from 2.0
      if (t >= B_PINK) {
        const ga2 = sstep(B_PINK, B_PINK + 0.4, t);
        const top = ga.top[1] - 120;
        ctx.save();
        ctx.beginPath(); ctx.rect(ga.head[0] - 260, top, 520, 150 * ga2 + 10); ctx.clip();
        F.gloom(ctx, ga.head[0] - 190, top, 380, 140, { color: 'rgba(110,170,235,0.9)', count: 11, seed: 44, width: 6 });
        ctx.restore();
        // a dark blue shade dropping over the forehead
        ctx.save();
        ctx.globalAlpha = 0.35 * ga2;
        const sg = ctx.createLinearGradient(0, ga.top[1] - 10, 0, ga.eyeL[1]);
        sg.addColorStop(0, '#3b4c9a'); sg.addColorStop(1, 'rgba(59,76,154,0)');
        ctx.fillStyle = sg;
        F.ellipse(ctx, ga.head[0], ga.head[1] - 30 * GOOFY.s, 80 * GOOFY.s, 55 * GOOFY.s); ctx.fill();
        ctx.restore();
      }
      // sweat drop on Goofy's head when the legs arrive
      if (t >= B_STEP) {
        const k = F.popIn(t, B_STEP + 1 / 12);
        const slide = clamp((t - B_STEP) / 0.9) * 30;
        F.sweat(ctx, ga.top[0] - 120, ga.top[1] + 10 + slide, 1.9 * k, { flip: true });
      }

      motes(ctx, t, 1 - pinkA);
      ctx.restore(); // world camera

      // ---------- screen space: Hayk's legs step in from the right edge at 3.0
      if (t >= B_STEP - 0.2) {
        const u = LIB.ease.outCubic(clamp((t - (B_STEP - 0.2)) / 0.3));
        const hx = lerp(1650, 1230, u) + kx * 0.5;
        // a little hop: lands exactly on the footstep beat
        const hop = t < B_STEP ? -Math.sin(clamp((t - (B_STEP - 0.2)) / 0.2) * Math.PI) * 60 : 0;
        const land = t >= B_STEP && t < B_STEP + 2 / 12;
        // his shadow falls over Goofy
        ctx.save();
        ctx.globalAlpha = 0.28 * u;
        const shg = ctx.createLinearGradient(1080, 0, 250, 0);
        shg.addColorStop(0, '#2a1840'); shg.addColorStop(1, 'rgba(42,24,64,0)');
        ctx.fillStyle = shg;
        ctx.fillRect(0, 0, 1080, 1920);
        ctx.restore();
        F.dust(ctx, hx - 260, 1865, t - B_STEP, { n: 7, size: 60, spread: 260, seed: 71 });
        // legs only: he is cheering (arms up, out of frame) while Goofy sobs
        ctx.save();
        ctx.translate(hx, 1900);
        ctx.scale(land ? 1.05 : 1, land ? 0.94 : 1);
        ctx.translate(-hx, -1900);
        FILM.cast.hayk(ctx, { x: hx, y: 1870 + hop + ky * 0.5, s: 7.5, pose: 'cheer', t: tw, face: 'happy' });
        ctx.restore();
        F.sfx(ctx, 'TMP!', 850, 1330, t, B_STEP, { size: 110, rot: -0.2, fill: '#ffffff', shadowColor: '#6a86c9' });
      }

      // the thought bubble (screen fixed, stays readable during the push-in)
      if (t >= B_PINK) {
        F.bubble(ctx, "...you're leaving me?", 450, 400, {
          think: true, size: 60, maxW: 600, t, t0: B_PINK, tail: [420, 620], fill: '#ffffff', color: '#3b4c9a',
        });
      }

      // big sweat drop on screen next to the bubble when the feet land
      if (t >= B_STEP) {
        const k = F.popIn(t, B_STEP);
        F.sweat(ctx, 700, 700 + clamp((t - B_STEP) / 1) * 40, 2.4 * k);
      }

      // soft vignette, pinker in shoujo mode
      F.vignette(ctx, 0.28, pinkA > 0.5 ? '120,40,90' : '60,30,10');
    },
  });
})();
