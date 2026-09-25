// Shot 09 'kfg' : "KFG: bucket of chicken"  (global T 34.0 - 39.0, 5 s)
//
// Parody fried-chicken joint "KFG" (red/white stripes, a cartoon CHICKEN mascot with glasses and a
// bow tie, "KENTUCKY FRIED GOODNESS"). Hayk (pose "eat", face "ecstatic", belly 0.15) at a table
// with a KFG bucket, holding a drumstick. CRUNCH! bites at 1.0, 2.0, 3.0 s (T 35, 36, 37) with
// crumbs; golden rays burst behind him at 3.0 s. Caption top-left "STOP 1: KFG".
//
// Layers (back to front):
//   1 wall: red/white stripes, wood wainscot, window onto the street, menu board
//   2 KFG sign board with the chicken mascot
//   3 pendant lamps (swinging)
//   4 golden ray burst (from 3.0 s) + glow
//   5 Hayk with drumstick, bite lean, cheek glow, sparkles
//   6 table, tray, bucket, drink, bone plate, crumbs
//   7 CRUNCH! SFX, flash, caption (screen-fixed)
(function () {
  'use strict';
  const ID = 'kfg';
  const L = FILM.lib;
  const F = FILM.fx;
  const P = F.pal;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const h01 = (...k) => F.h01(ID, ...k);
  const { ellipse, fo, rrect } = F;

  const BITES = [1.0, 2.0, 3.0]; // T 35, 36, 37
  const T_RAYS = 3.0; // T 37
  const BLINE = '#5a2a2e';
  const TABLE_Y = 1500;
  const HX = 590, HFEET = 1950, HS = 2.0;

  // ---------------------------------------------------------------------------
  // Background
  // ---------------------------------------------------------------------------
  function wall(ctx) {
    // stripes
    ctx.fillStyle = '#fff4e0';
    ctx.fillRect(-100, -100, 1300, 1400);
    ctx.fillStyle = '#e0453f';
    for (let x = -100; x < 1200; x += 120) ctx.fillRect(x, -100, 60, 1400);
    // soft shade from the top
    const g = ctx.createLinearGradient(0, 0, 0, 500);
    g.addColorStop(0, 'rgba(90,20,30,0.25)');
    g.addColorStop(1, 'rgba(90,20,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-100, -100, 1300, 600);
    // wood wainscot
    ctx.fillStyle = '#9a5a36';
    ctx.fillRect(-100, 1150, 1300, 400);
    ctx.fillStyle = '#b36c42';
    for (let x = -100; x < 1200; x += 90) ctx.fillRect(x + 6, 1190, 78, 330);
    rrect(ctx, -100, 1140, 1300, 30, 4); fo(ctx, '#7a4128', 4, BLINE);
    // window onto the Spanish street (right)
    rrect(ctx, 800, 820, 260, 300, 18); fo(ctx, '#7fcfff', 6, BLINE);
    ctx.save();
    rrect(ctx, 800, 820, 260, 300, 18); ctx.clip();
    ctx.fillStyle = '#f3c38f'; ctx.fillRect(800, 960, 260, 160);
    ctx.fillStyle = '#d9653b'; ctx.fillRect(800, 940, 260, 26);
    ctx.fillStyle = '#5f8fc4';
    for (let i = 0; i < 4; i++) ctx.fillRect(820 + i * 62, 990, 30, 50);
    ctx.fillStyle = '#57b457';
    ctx.beginPath(); ctx.ellipse(1010, 900, 70, 26, -0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.moveTo(830, 1120); ctx.lineTo(920, 820); ctx.lineTo(960, 820); ctx.lineTo(870, 1120); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = BLINE; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(930, 820); ctx.lineTo(930, 1120); ctx.moveTo(800, 970); ctx.lineTo(1060, 970); ctx.stroke();
    // menu board (left), picture-only
    rrect(ctx, 30, 820, 230, 290, 12); fo(ctx, '#2d2530', 6, BLINE);
    for (let i = 0; i < 3; i++) {
      const y = 860 + i * 84;
      rrect(ctx, 50, y, 70, 60, 8); fo(ctx, '#fff4e0', 3, '#fff4e0');
      ctx.fillStyle = i === 1 ? P.chicken : P.gold;
      ctx.beginPath(); ctx.arc(85, y + 30, 20, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff4e0';
      ctx.fillRect(135, y + 14, 100, 10);
      ctx.fillStyle = P.gold;
      ctx.fillRect(135, y + 36, 60, 10);
    }
  }

  /** the KFG mascot: a cartoon chicken with glasses, a white goatee tuft and a bow tie */
  function mascot(ctx, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.rotate(Math.sin(t * Math.PI * 2) * 0.04);
    // badge disc
    ellipse(ctx, 0, 0, 150, 150); fo(ctx, '#ffffff', 8);
    ellipse(ctx, 0, 0, 132, 132); fo(ctx, null, 5, '#e0453f');
    // comb
    ctx.beginPath();
    ctx.moveTo(-40, -70);
    ctx.arc(-34, -92, 22, Math.PI * 0.9, Math.PI * 1.9);
    ctx.arc(0, -104, 26, Math.PI * 1.05, Math.PI * 1.95);
    ctx.arc(34, -90, 22, Math.PI * 1.1, Math.PI * 2.1);
    ctx.lineTo(40, -66);
    ctx.closePath();
    fo(ctx, '#e8413c', 6);
    // head
    ellipse(ctx, 0, -6, 80, 86); fo(ctx, '#ffffff', 6);
    ctx.fillStyle = '#e9e4ee';
    ctx.beginPath(); ctx.ellipse(40, 0, 30, 70, 0, 0, TAU); ctx.fill();
    // glasses
    ctx.strokeStyle = P.line; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(-30, -26, 22, 0, TAU); ctx.moveTo(52, -26); ctx.arc(30, -26, 22, 0, TAU); ctx.moveTo(-8, -26); ctx.lineTo(8, -26); ctx.stroke();
    // eyes (happy)
    ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-40, -22); ctx.quadraticCurveTo(-30, -36, -20, -22); ctx.moveTo(20, -22); ctx.quadraticCurveTo(30, -36, 40, -22); ctx.stroke();
    // beak
    ctx.beginPath(); ctx.moveTo(-26, 4); ctx.lineTo(26, 4); ctx.lineTo(0, 34); ctx.closePath(); fo(ctx, '#ffb13a', 5);
    ctx.beginPath(); ctx.moveTo(-18, 18); ctx.lineTo(18, 18); ctx.stroke();
    // wattle
    ellipse(ctx, 8, 44, 12, 16); fo(ctx, '#e8413c', 4);
    // white goatee tuft
    ctx.beginPath(); ctx.moveTo(-18, 58); ctx.quadraticCurveTo(0, 104, 16, 62); ctx.quadraticCurveTo(0, 74, -18, 58); fo(ctx, '#ffffff', 5);
    // cheeks
    ctx.fillStyle = 'rgba(255,120,120,0.6)';
    ctx.beginPath(); ctx.ellipse(-52, 8, 14, 8, 0, 0, TAU); ctx.ellipse(52, 8, 14, 8, 0, 0, TAU); ctx.fill();
    // bow tie
    ctx.beginPath();
    ctx.moveTo(0, 96); ctx.lineTo(-52, 72); ctx.lineTo(-52, 122); ctx.closePath();
    fo(ctx, '#e8413c', 5);
    ctx.beginPath();
    ctx.moveTo(0, 96); ctx.lineTo(52, 72); ctx.lineTo(52, 122); ctx.closePath();
    fo(ctx, '#e8413c', 5);
    ellipse(ctx, 0, 97, 13, 13); fo(ctx, '#c0182a', 5);
    ctx.restore();
  }

  function sign(ctx, t) {
    const y0 = 330, y1 = 670;
    // board with bulbs
    rrect(ctx, 70, y0, 940, y1 - y0, 34); fo(ctx, P.kfgRed, 8);
    rrect(ctx, 90, y0 + 20, 900, y1 - y0 - 40, 24); fo(ctx, null, 5, '#ffffff');
    const on = Math.floor(t * 6) % 2;
    for (let i = 0; i < 18; i++) {
      const bx = 110 + i * 50;
      ctx.fillStyle = (i + on) % 2 ? '#fff6b0' : '#ffd23a';
      ctx.beginPath(); ctx.arc(bx, y0 + 12, 8, 0, TAU); ctx.arc(bx, y1 - 12, 8, 0, TAU); ctx.fill();
    }
    mascot(ctx, 270, 500, 0.98, t);
    // "KFG" letters with a stepped 3D shadow
    F.text(ctx, 'KFG', 690, 462, { size: 190, fill: '#ffffff', stroke: P.line, lw: 20, shadow: 12, shadowColor: '#7a0f16', skew: -0.08 });
    rrect(ctx, 440, 568, 500, 56, 12); fo(ctx, '#ffffff', 5);
    F.text(ctx, 'KENTUCKY FRIED GOODNESS', 690, 598, { size: 34, fill: P.kfgRed, lw: 0 });
  }

  function lamps(ctx, t) {
    [[930, 1.1]].forEach(([x, ph]) => {
      const sw = Math.sin(t * 2.4 + ph) * 0.05;
      ctx.save();
      ctx.translate(x, -20);
      ctx.rotate(sw);
      ctx.strokeStyle = P.line; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 170); ctx.stroke();
      // warm cone
      ctx.fillStyle = 'rgba(255,230,150,0.22)';
      ctx.beginPath(); ctx.moveTo(-40, 240); ctx.lineTo(40, 240); ctx.lineTo(260, 900); ctx.lineTo(-260, 900); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-22, 170); ctx.lineTo(22, 170); ctx.lineTo(60, 232); ctx.lineTo(-60, 232); ctx.closePath();
      fo(ctx, '#c0182a', 5);
      ellipse(ctx, 0, 234, 26, 10); fo(ctx, '#fff6c0', 4);
      ctx.restore();
    });
  }

  // ---------------------------------------------------------------------------
  // Foreground: table and food
  // ---------------------------------------------------------------------------
  function table(ctx) {
    // top
    ctx.beginPath();
    ctx.moveTo(-60, TABLE_Y); ctx.lineTo(1140, TABLE_Y); ctx.lineTo(1140, TABLE_Y + 70); ctx.lineTo(-60, TABLE_Y + 70); ctx.closePath();
    fo(ctx, '#f7efe2', 6);
    ctx.fillStyle = '#e4d6c0';
    ctx.fillRect(-60, TABLE_Y + 44, 1200, 24);
    // front apron in red
    ctx.beginPath(); ctx.rect(-60, TABLE_Y + 70, 1200, 600); fo(ctx, '#c0182a', 6);
    ctx.fillStyle = '#9a0f1f';
    ctx.fillRect(-60, TABLE_Y + 70, 1200, 30);
    // stripes on the apron
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let x = -40; x < 1140; x += 110) ctx.fillRect(x, TABLE_Y + 120, 40, 600);
    // tray
    ctx.save();
    ctx.translate(560, TABLE_Y + 20);
    ctx.beginPath(); ctx.moveTo(-240, -24); ctx.lineTo(240, -24); ctx.lineTo(262, 24); ctx.lineTo(-262, 24); ctx.closePath();
    fo(ctx, '#e0453f', 5);
    ctx.fillStyle = '#fff4e0';
    ctx.beginPath(); ctx.moveTo(-150, -18); ctx.lineTo(130, -18); ctx.lineTo(146, 18); ctx.lineTo(-160, 18); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function bonePlate(ctx, x, y, n) {
    ellipse(ctx, x, y, 110, 26); fo(ctx, '#ffffff', 5);
    ellipse(ctx, x, y - 2, 80, 16); fo(ctx, null, 3, 'rgba(27,20,36,0.3)');
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.translate(x - 40 + i * 36, y - 12 - (i % 2) * 8);
      ctx.rotate(-0.4 + i * 0.5);
      rrect(ctx, -34, -7, 68, 14, 7); fo(ctx, '#fff3dc', 4);
      ctx.beginPath(); ctx.arc(-34, -7, 9, 0, TAU); ctx.arc(-34, 7, 9, 0, TAU); ctx.arc(34, -7, 9, 0, TAU); ctx.arc(34, 7, 9, 0, TAU); fo(ctx, '#fff3dc', 4);
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Draw
  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);

      // bite state
      let nb = 0;
      BITES.forEach((b) => { if (t >= b - 1e-6) nb++; });
      const lastBite = nb ? BITES[nb - 1] : -9;
      const age = t - lastBite;
      // lunge toward the drumstick: wind up 0.25 s before each bite, snap on the beat
      let lunge = 0;
      BITES.forEach((b) => {
        const d = t - b;
        if (d > -0.25 && d < 0) lunge = Math.max(lunge, L.ease.inQuad((d + 0.25) / 0.25));
        else if (d >= 0 && d < 0.35) lunge = Math.max(lunge, 1 - L.ease.outCubic(d / 0.35));
      });
      const squash = nb && age < 2 / 12 + 1e-6;

      // camera
      const push = 1 + 0.07 * L.ease.inOutSine(clamp(t / info.dur));
      const sh = F.shakeMany(t, BITES.map((b, i) => [b, 0.3, i === 2 ? 26 : 16]), 4);
      ctx.save();
      ctx.translate(540 + sh[0], 1000 + sh[1]);
      ctx.scale(push, push);
      ctx.translate(-540, -1000);

      // 1-3 background
      wall(ctx);
      sign(ctx, t);
      lamps(ctx, t);

      // 4 golden rays from 3.0 s
      const headC = [HX, HFEET - 462 * HS];
      if (t >= T_RAYS - 1e-6) {
        const u = clamp((t - T_RAYS) / 0.25);
        ctx.save();
        ctx.globalAlpha = u;
        ctx.beginPath(); ctx.rect(-100, -100, 1300, TABLE_Y + 120); ctx.clip();
        F.sunburst(ctx, headC[0], headC[1], { rays: 22, colorA: '#ffd35a', colorB: '#ff9d2a', rot: t * 0.5 });
        const g = ctx.createRadialGradient(headC[0], headC[1], 40, headC[0], headC[1], 560);
        g.addColorStop(0, 'rgba(255,255,230,0.95)');
        g.addColorStop(1, 'rgba(255,255,230,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-100, -100, 1300, 2100);
        ctx.restore();
      } else {
        // warm glow behind him before the burst
        const g = ctx.createRadialGradient(headC[0], headC[1], 40, headC[0], headC[1], 460);
        g.addColorStop(0, 'rgba(255,240,180,0.55)');
        g.addColorStop(1, 'rgba(255,240,180,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-100, -100, 1300, 2100);
      }

      // 5 Hayk
      const bob = F.bounce(tw, 2, 8);
      ctx.save();
      ctx.translate(HX, HFEET);
      if (squash) ctx.scale(1.06, 0.92);
      ctx.translate(-HX, -HFEET);
      const a = FILM.cast.hayk(ctx, {
        x: HX, y: HFEET + bob + lunge * 18, s: HS, t: tw, pose: 'eat', face: 'ecstatic', belly: 0.15,
        hold: 'drumstick', bite: [0, 0.35, 0.65, 0.9][nb], headTilt: -0.22 * lunge, tilt: 0.05 * lunge,
      });
      ctx.restore();
      // glowing cheeks and bliss sparkles around the head
      ctx.save();
      const cg = 0.35 + 0.25 * Math.sin(t * 8);
      ctx.fillStyle = `rgba(255,120,150,${cg})`;
      ctx.beginPath(); ctx.ellipse(a.eyeL[0] - 18, a.eyeL[1] + 52, 34, 16, 0, 0, TAU); ctx.ellipse(a.eyeR[0] + 18, a.eyeR[1] + 52, 34, 16, 0, 0, TAU); ctx.fill();
      ctx.restore();
      F.sparkles(ctx, { x: a.head[0] - 300, y: a.head[1] - 260, w: 600, h: 420, n: t >= T_RAYS ? 14 : 8, seed: 19, t, size: 30 });
      if (t >= T_RAYS) F.hearts(ctx, a.head[0] + 170, a.head[1] - 60, t - T_RAYS, { n: 4, seed: 3 });

      // 6 table and food
      table(ctx);
      bonePlate(ctx, 860, TABLE_Y + 12, nb);
      F.drink(ctx, 985, TABLE_Y - 6, 0.8, { color: P.kfgRed });
      F.bucket(ctx, 215, TABLE_Y + 18, 1.2, { label: 'KFG' });
      F.steam(ctx, 215, TABLE_Y - 350, t, { n: 3, h: 130 });
      // crumbs from each bite at the mouth
      BITES.forEach((b, i) => {
        F.crumbs(ctx, a.mouth[0] + 150, a.mouth[1] - 20, t - b, { n: i === 2 ? 22 : 16, seed: 50 + i, spread: 520, colors: [P.chicken, P.chickenShade, '#ffd98a', '#fff3dc'], life: 0.9 });
      });
      ctx.restore();

      // 7 screen-fixed: CRUNCH! on every bite
      const pos = [[330, 770, -0.16, 135], [750, 770, 0.14, 135], [540, 560, -0.08, 180]];
      BITES.forEach((b, i) => {
        const [x, y, rot, size] = pos[i];
        if (t >= b - 1e-6 && t < b + 0.85) {
          if (t - b < 0.2) F.burst(ctx, x, y, size * 2.2, size * 1.3, 16, i === 2 ? '#fff05a' : '#ffffff', { seed: 7 + i, lw: 6, squash: 0.5 });
        }
        F.sfx(ctx, 'CRUNCH!', x, y, t, b, { size, rot, life: 0.85, fill: i === 2 ? '#ff3b3b' : P.sfxYellow, shadowColor: i === 2 ? '#7a0f16' : '#b3122b', shake: 8 });
      });
      // impact flash on the third bite + ray burst
      if (t >= T_RAYS && t < T_RAYS + 2 / 24) F.flash(ctx, 0.7, '#fff6d8');
      F.caption(ctx, 'STOP 1: KFG', 70, 262, { size: 64, t, t0: 0, from: 'left', bg: P.line, accent: P.kfgRed });
    },
  });
})();
