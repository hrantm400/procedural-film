// Shot 10 'burger-kong' : "Burger Kong"  (global T 39.0 - 44.0, local t 0..5)
//
// Beats (local):
//   0.0  Hayk (crown, pose eatBig) behind a table, holding a HUGE triple-stack burger, drooling
//   0.6  wind-up: leans back, jaw opens (determined + shout mouth)
//   1.0  CHOMP: 4-frame black/white impact frame with an unhinged monster jaw, shake, crumbs
//   1.0-2.5  chewing, burger 1/3 gone (still 1/3 at 2.0)
//   2.5  second chomp -> 2/3 gone
//   3.0  GULP: burger gone, he thrusts a second burger up (pose fist), golden rays
//   3.5  bubble "ONE MORE. FOR RESEARCH."
//   caption "STOP 2: BURGER KONG" top-left the whole shot
//
// Layers back to front:
//   1 restaurant interior (cached): wall, pendant lamps, BURGER KONG sign with gorilla, menu boards,
//     back counter, checker floor
//   2 animated background: lamp glow, sign glints, focus lines / golden rays
//   3 Hayk (FILM.cast.hayk)
//   4 mega burger (offscreen composite with bite mask) + fingers over the bun
//   5 table, tray, fries, drink (foreground)
//   6 effects: crumbs, SFX, sparkles
//   7 screen-fixed: caption, bubble
(function () {
  'use strict';
  const ID = 'burger-kong';
  const FILM = window.FILM;
  const F = FILM.fx;
  const P = F.pal;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const W = 1080, H = 1920;
  const FR = 1 / 24;

  // beat constants (local t)
  const T_WIND = 0.6; // T 39.6
  const T_CHOMP = 1.0; // T 40.0
  const T_BITE2 = 2.5; // T 41.5
  const T_GULP = 3.0; // T 42.0
  const T_LINE = 3.5; // T 42.5

  // Hayk placement
  const HX = 540, HY = 1900, HS = 2.0;
  const TABLE_Y = 1560;

  // ---------------------------------------------------------------------------
  // Static background (cached)
  // ---------------------------------------------------------------------------
  function gorilla(g, x, y, s) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    const line = P.line;
    const fur = '#4a3b4f', furShade = '#372b3c', face = '#c9a88a';
    // ears
    F.ellipse(g, -78, -6, 22, 26); F.fo(g, fur, 5, line);
    F.ellipse(g, 78, -6, 22, 26); F.fo(g, fur, 5, line);
    F.ellipse(g, -78, -6, 10, 13); g.fillStyle = face; g.fill();
    F.ellipse(g, 78, -6, 10, 13); g.fillStyle = face; g.fill();
    // head
    F.curve(g, [[-70, -40], [-50, -86], [0, -100], [50, -86], [70, -40], [72, 20], [40, 70], [0, 80], [-40, 70], [-72, 20]]);
    F.fo(g, fur, 6, line);
    g.fillStyle = furShade;
    F.ellipse(g, 40, 30, 26, 44, 0.3); g.fill();
    // face mask (heart-ish)
    F.curve(g, [[-50, -30], [-20, -50], [0, -30], [20, -50], [50, -30], [54, 10], [40, 56], [0, 66], [-40, 56], [-54, 10]]);
    F.fo(g, face, 5, line);
    // brow ridge
    g.beginPath(); g.moveTo(-50, -26); g.quadraticCurveTo(0, -46, 50, -26); g.lineWidth = 8; g.strokeStyle = line; g.lineCap = 'round'; g.stroke();
    // eyes (friendly)
    g.fillStyle = '#ffffff';
    F.ellipse(g, -22, -10, 11, 13); g.fill(); g.lineWidth = 3.5; g.stroke();
    F.ellipse(g, 22, -10, 11, 13); g.fill(); g.stroke();
    g.fillStyle = line;
    F.ellipse(g, -20, -8, 6, 8); g.fill();
    F.ellipse(g, 24, -8, 6, 8); g.fill();
    // nostrils
    F.ellipse(g, -9, 18, 5, 4); g.fill();
    F.ellipse(g, 9, 18, 5, 4); g.fill();
    // big grin
    g.beginPath(); g.moveTo(-30, 34); g.quadraticCurveTo(0, 62, 30, 34); g.closePath();
    F.fo(g, '#ffffff', 4, line);
    // crown
    F.crown(g, 0, -80, 0.62, { rot: 0.12 });
    g.restore();
  }

  function kongSign(g, cx, cy) {
    // burger-bun shaped sign: top bun, blue swoosh band with the name, bottom bun
    const w = 700;
    g.save();
    // glow behind
    const gl = g.createRadialGradient(cx, cy, 80, cx, cy, 460);
    gl.addColorStop(0, 'rgba(255,236,170,0.55)');
    gl.addColorStop(1, 'rgba(255,236,170,0)');
    g.fillStyle = gl;
    g.fillRect(cx - 480, cy - 400, 960, 800);
    // top bun
    g.beginPath();
    g.moveTo(cx - w / 2, cy - 24);
    g.bezierCurveTo(cx - w / 2, cy - 250, cx + w / 2, cy - 250, cx + w / 2, cy - 24);
    g.closePath();
    F.fo(g, P.bun, 6);
    g.fillStyle = P.bunTop;
    F.ellipse(g, cx - 120, cy - 150, 150, 40, -0.12); g.fill();
    g.fillStyle = P.sesame;
    [[-230, -80], [-150, -150], [-60, -175], [40, -178], [140, -160], [230, -110], [-20, -120], [100, -110], [-110, -100], [190, -70]].forEach(([sx, sy], i) => {
      F.ellipse(g, cx + sx, cy + sy, 11, 6, (i % 3) * 0.5 - 0.5); g.fill();
    });
    // bottom bun
    F.rrect(g, cx - w / 2 + 20, cy + 70, w - 40, 90, 44);
    F.fo(g, P.bunShade, 6);
    // blue swoosh band (the name)
    g.beginPath();
    g.moveTo(cx - w / 2 - 50, cy - 10);
    g.quadraticCurveTo(cx, cy - 70, cx + w / 2 + 50, cy - 30);
    g.lineTo(cx + w / 2 + 30, cy + 70);
    g.quadraticCurveTo(cx, cy + 30, cx - w / 2 - 40, cy + 100);
    g.closePath();
    F.fo(g, P.kongBlue, 6);
    // swoosh highlight
    g.beginPath();
    g.moveTo(cx - w / 2 - 30, cy + 6);
    g.quadraticCurveTo(cx, cy - 50, cx + w / 2 + 34, cy - 18);
    g.lineWidth = 7; g.strokeStyle = '#6fa6ff'; g.stroke();
    F.text(g, 'BURGER KONG', cx + 30, cy + 26, { size: 92, fill: '#ffffff', stroke: P.line, lw: 14, rot: -0.03, skew: -0.1, shadow: 7, shadowColor: '#b3122b' });
    g.restore();
    gorilla(g, cx + w / 2 - 40, cy - 190, 0.95);
  }

  function menuBoard(g, x, y, w, h, seed) {
    F.rrect(g, x, y, w, h, 14);
    F.fo(g, '#2b2238', 5);
    F.rrect(g, x + 10, y + 10, w - 20, h - 20, 8);
    g.fillStyle = '#3a2f4c'; g.fill();
    // three items with price strips
    for (let i = 0; i < 3; i++) {
      const iy = y + 40 + i * (h - 60) / 3;
      F.burger(g, x + 60, iy + 20, 0.3);
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.fillRect(x + 110, iy + 6, w - 190, 10);
      g.fillRect(x + 110, iy + 26, (w - 190) * (0.5 + F.h01(ID, 'mb', seed, i) * 0.4), 8);
      g.fillStyle = P.gold;
      F.rrect(g, x + w - 70, iy + 2, 52, 30, 8); g.fill();
    }
  }

  function lamp(g, x, len) {
    g.strokeStyle = P.line; g.lineWidth = 4;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, len); g.stroke();
    g.beginPath();
    g.moveTo(x - 60, len + 60); g.quadraticCurveTo(x - 50, len, x, len); g.quadraticCurveTo(x + 50, len, x + 60, len + 60); g.closePath();
    F.fo(g, P.kongOrange, 5);
    g.fillStyle = '#fff3c4';
    F.ellipse(g, x, len + 60, 50, 10); g.fill();
  }

  function buildBg() {
    const S = FILM.S || 1;
    const c = FILM.makeCanvas(Math.round(W * S), Math.round(H * S));
    const g = c.getContext('2d');
    g.setTransform(S, 0, 0, S, 0, 0);
    // wall
    F.sky(g, '#ffe2b8', '#f6b872', { mid: '#ffd49a', midAt: 0.45 });
    // big vertical wall panels (soft stripes)
    g.fillStyle = 'rgba(242,134,43,0.14)';
    for (let i = 0; i < 6; i++) g.fillRect(i * 190 - 20, 0, 90, 1300);
    // ceiling band
    g.fillStyle = '#d9653b';
    g.fillRect(0, 0, W, 60);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(0, 60, W, 10);
    // menu boards left and right (behind Hayk's shoulders)
    menuBoard(g, 30, 720, 250, 300, 1);
    menuBoard(g, 800, 720, 250, 300, 2);
    // flag bunting
    for (let i = 0; i < 14; i++) {
      const x0 = i * 80, yy = 120 + Math.sin(i * 0.9) * 6;
      g.beginPath(); g.moveTo(x0, yy); g.lineTo(x0 + 70, yy); g.lineTo(x0 + 35, yy + 50); g.closePath();
      g.fillStyle = i % 3 === 0 ? P.kongBlue : i % 3 === 1 ? P.kongOrange : '#fff4e0';
      g.fill();
    }
    g.strokeStyle = 'rgba(27,20,36,0.5)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 120); for (let i = 0; i <= 14; i++) g.lineTo(i * 80, 120 + Math.sin(i * 0.9) * 6); g.stroke();
    // sign
    kongSign(g, 560, 470);
    // wainscot (blue) + chair rail
    g.fillStyle = '#5b8fd8';
    g.fillRect(0, 1140, W, 400);
    g.fillStyle = '#4677bf';
    for (let i = 0; i < 12; i++) g.fillRect(i * 96, 1170, 48, 370);
    g.fillStyle = '#fff4e0';
    g.fillRect(0, 1120, W, 26);
    g.strokeStyle = P.line; g.lineWidth = 4;
    g.beginPath(); g.moveTo(0, 1120); g.lineTo(W, 1120); g.moveTo(0, 1146); g.lineTo(W, 1146); g.stroke();
    // back counter with registers and a soda machine
    F.rrect(g, -20, 1230, 420, 190, 10); F.fo(g, '#e8413c', 5);
    F.rrect(g, 680, 1230, 440, 190, 10); F.fo(g, '#e8413c', 5);
    g.fillStyle = '#fff4e0'; g.fillRect(-20, 1230, 420, 24); g.fillRect(680, 1230, 440, 24);
    // register
    F.rrect(g, 90, 1150, 130, 84, 10); F.fo(g, '#3a3450', 5);
    F.rrect(g, 104, 1162, 102, 40, 6); g.fillStyle = '#7fe0ff'; g.fill();
    // soda machine
    F.rrect(g, 820, 1080, 170, 154, 12); F.fo(g, '#dfe6f2', 5);
    for (let i = 0; i < 3; i++) { F.rrect(g, 840 + i * 50, 1100, 36, 50, 6); F.fo(g, ['#e8413c', '#ffcc33', '#35b4ff'][i], 3); }
    // floor (checker) at the very bottom, mostly hidden by the table
    g.fillStyle = '#fff4e0'; g.fillRect(0, 1420, W, 500);
    g.fillStyle = '#e8b27a';
    for (let j = 0; j < 7; j++) for (let i = 0; i < 12; i++) if ((i + j) % 2 === 0) g.fillRect(i * 96, 1420 + j * 72, 96, 72);
    return c;
  }

  // ---------------------------------------------------------------------------
  // Mega burger: a wide triple stack built from FILM.fx.burger sections, drawn into an offscreen
  // canvas so bites can be cut out (destination-out) with an outlined scalloped edge.
  // ---------------------------------------------------------------------------
  const KX = 3.0, KY = 1.45;
  const MB_W = 820, MB_H = 500, MB_OX = 410, MB_OY = 370; // origin = FILM.fx.burger centre of the bottom layer
  const MB_TOP = -230 * KY; // top of the top bun
  function stack(g) {
    // sections of FILM.fx.burger (local y): top bun -106..-20, lettuce/tomato -22..2, cheese/patty 0..44, bottom bun 34..76
    const sec = (y0, y1, off) => {
      g.save();
      g.scale(KX, KY);
      g.beginPath(); g.rect(-130, y0 + off, 260, y1 - y0); g.clip();
      F.burger(g, 0, off, 1);
      g.restore();
    };
    sec(-24, 90, 0);
    sec(-24, 46, -62);
    sec(-130, 46, -124);
  }
  // bites: ellipses in offscreen px relative to the origin, with teeth scallops on the lower arc
  function bitePath(g, level) {
    const add = (cx, cy, rx, ry, teeth) => {
      g.moveTo(cx + rx, cy); g.ellipse(cx, cy, rx, ry, 0, 0, TAU);
      for (let i = 0; i < teeth; i++) {
        const a = Math.PI * 0.12 + (i / (teeth - 1)) * Math.PI * 0.76;
        const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry, r = 24;
        g.moveTo(px + r, py); g.arc(px, py, r, 0, TAU);
      }
    };
    if (level >= 1) add(10, MB_TOP - 10, 250, 150, 9);
    if (level >= 2) add(-20, MB_TOP + 120, 330, 170, 11);
  }
  function megaBurger(ctx, x, y, level, info, glow, sil) {
    if (level >= 3) return;
    const S = info.S || FILM.S || 1;
    const c = FILM.lib.cached(ID + '-mb-' + S, () => FILM.makeCanvas(Math.round(MB_W * S), Math.round(MB_H * S)));
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.clearRect(0, 0, c.width, c.height);
    g.setTransform(S, 0, 0, S, MB_OX * S, MB_OY * S);
    stack(g);
    if (level >= 1) {
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = '#000';
      g.beginPath(); bitePath(g, level); g.fill();
      g.globalCompositeOperation = 'source-atop';
      g.strokeStyle = P.line; g.lineWidth = 10;
      g.beginPath(); bitePath(g, level); g.stroke();
    }
    if (sil) {
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = sil;
      g.fillRect(-MB_OX, -MB_OY, MB_W, MB_H);
    }
    g.globalCompositeOperation = 'source-over';
    g.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save();
    ctx.translate(x, y);
    if (glow > 0) {
      const gr = ctx.createRadialGradient(0, -110, 60, 0, -110, 480);
      gr.addColorStop(0, `rgba(255,236,140,${0.7 * glow})`);
      gr.addColorStop(1, 'rgba(255,236,140,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(0, -110, 480, 0, TAU); ctx.fill();
    }
    ctx.drawImage(c, -MB_OX, -MB_OY, MB_W, MB_H);
    ctx.restore();
  }

  function fingers(ctx, x, y, s, dir) {
    // finger tips wrapping over the top edge of a held burger (prop-level detail)
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * dir, s);
    for (let i = 0; i < 4; i++) {
      F.ellipse(ctx, i * 22, -Math.abs(i - 1.5) * 5, 13, 20, 0.15);
      F.fo(ctx, P.skin, 5);
    }
    ctx.restore();
  }

  // monster jaw for the impact frame: white mouth cavity with outlined teeth rows
  const jawTopY = (m, open) => -20 - (1 - (m / 220) * (m / 220)) * (35 + 20 * open);
  const jawBotY = (m, open) => lerp(130 + 150 * open, 20, (m / 220) * (m / 220));
  function jawCavity(ctx, x, y, s, open) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) { const m = -220 + i * 22; ctx.lineTo(m, jawTopY(m, open)); }
    for (let i = 20; i >= 0; i--) { const m = -220 + i * 22; ctx.lineTo(m, jawBotY(m, open)); }
    ctx.closePath();
    F.fo(ctx, '#ffffff', 9, '#0a0a10');
    ctx.restore();
  }
  function jawTeeth(ctx, x, y, s, open, upper) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath();
    const n = upper ? 9 : 8, span = upper ? 400 : 340, tw = span / n;
    for (let i = 0; i < n; i++) {
      const u0 = -span / 2 + i * tw, m = u0 + tw / 2;
      if (upper) {
        const yy = jawTopY(m, open) - 2;
        ctx.moveTo(u0, yy); ctx.lineTo(u0 + tw, yy); ctx.lineTo(m, yy + 56); ctx.closePath();
      } else {
        const yy = jawBotY(m, open) + 2;
        ctx.moveTo(u0, yy); ctx.lineTo(u0 + tw, yy); ctx.lineTo(m, yy - 52); ctx.closePath();
      }
    }
    F.fo(ctx, '#ffffff', 6, '#0a0a10');
    ctx.restore();
  }
  function silEyes(ctx, a) {
    [[a.eyeL, 1], [a.eyeR, -1]].forEach(([e, d]) => {
      ctx.save();
      ctx.translate(e[0], e[1] - 40);
      ctx.rotate(0.35 * d);
      ctx.fillStyle = '#ffffff';
      F.ellipse(ctx, 0, 0, 34, 14); ctx.fill();
      ctx.restore();
    });
  }

  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const hitFrames = (a, n) => t >= a - 1e-6 && t < a + n * FR - 1e-6;

      // --- state
      const impactNow = hitFrames(T_CHOMP, 4);
      const level = t < T_CHOMP ? 0 : t < T_BITE2 ? 1 : t < T_GULP ? 2 : 3;
      const second = t >= T_GULP;
      const windUp = clamp((tw - T_WIND) / (T_CHOMP - T_WIND));

      // camera: slow push, punch on hits
      const push = 1 + 0.05 * L.ease.inOutSine(clamp(t / info.dur));
      const punch = (hitFrames(T_CHOMP, 3) ? 0.07 : 0) + (hitFrames(T_BITE2, 2) ? 0.03 : 0) + (hitFrames(T_GULP, 2) ? 0.04 : 0);
      const sh = F.shakeMany(t, [[T_CHOMP, 0.5, 34], [T_BITE2, 0.3, 16], [T_GULP, 0.35, 20]], 7);
      const CY = 1000;

      ctx.save();
      ctx.translate(W / 2 + sh[0], CY + sh[1]);
      ctx.scale(push + punch, push + punch);
      ctx.translate(-W / 2, -CY);

      if (!impactNow) {
        // 1. background
        const bg = L.cached(ID + '-bg-' + (FILM.S || 1), buildBg);
        ctx.drawImage(bg, 0, 0, W, H);
        // 2. animated background: lamp glows + sign twinkles
        [150, 930].forEach((lx, i) => {
          const gg = ctx.createRadialGradient(lx, 260, 10, lx, 260, 170);
          const al = 0.35 + 0.1 * Math.sin(t * 6 + i);
          gg.addColorStop(0, `rgba(255,240,190,${al})`);
          gg.addColorStop(1, 'rgba(255,240,190,0)');
          ctx.fillStyle = gg;
          ctx.fillRect(lx - 170, 90, 340, 340);
        });
        [150, 930].forEach((lx) => lamp(ctx, lx, 180));
        F.sparkles(ctx, { x: 220, y: 300, w: 680, h: 300, n: 7, seed: 31, t, size: 30 });

        if (t < T_CHOMP) {
          // anticipation: dark focus lines tighten
          F.focusLines(ctx, HX, 1010, { inner: 460 - 80 * windUp, count: 90, color: P.line, alpha: 0.12 + 0.3 * windUp, seed: 5, width: 12 });
        } else if (!second) {
          const bp = F.beatPulse(t, 0.5, 0.2);
          F.focusLines(ctx, HX, 1010, { inner: 440, count: 90, color: '#e0701f', alpha: 0.18 + 0.3 * bp, seed: 6, width: 16 });
        } else {
          // golden rays behind the raised second burger
          const age = t - T_GULP;
          const rx = 790, ry = 520;
          ctx.save();
          ctx.globalAlpha = clamp(age / 0.12) * 0.7;
          ctx.fillStyle = '#ffe27a';
          ctx.beginPath();
          const n = 18, rot = age * 0.5;
          for (let i = 0; i < n; i++) {
            const a0 = rot + (i / n) * TAU, a1 = a0 + TAU / n * 0.45;
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx + Math.cos(a0) * 1800, ry + Math.sin(a0) * 1800);
            ctx.lineTo(rx + Math.cos(a1) * 1800, ry + Math.sin(a1) * 1800);
            ctx.closePath();
          }
          ctx.fill();
          ctx.restore();
          const gl = ctx.createRadialGradient(rx, ry, 20, rx, ry, 460);
          gl.addColorStop(0, 'rgba(255,255,230,0.95)');
          gl.addColorStop(1, 'rgba(255,230,140,0)');
          ctx.fillStyle = gl;
          ctx.fillRect(rx - 460, ry - 460, 920, 920);
        }
      } else {
        F.impact(ctx, { cx: HX, cy: 1000, seed: 19 });
      }

      // 3. Hayk
      let sx = 1, sy = 1;
      if (hitFrames(T_CHOMP, 2) || hitFrames(T_BITE2, 2) || hitFrames(T_GULP, 2)) { sx = 1.06; sy = 0.92; }
      const lean = t < T_CHOMP ? -0.06 * L.ease.outCubic(windUp) : 0;
      const bob = second ? F.bounce(tw, 2, 12) : Math.sin(tw * Math.PI * 4) * 5;
      let face, pose, mouth;
      if (t < T_WIND) { face = 'ecstatic'; pose = 'eatBig'; }
      else if (t < T_CHOMP) { face = 'determined'; mouth = 'shout'; pose = 'eatBig'; }
      else if (!second) { face = 'chewing'; pose = 'eatBig'; }
      else { face = t < T_LINE ? 'smug' : 'confident'; pose = 'fist'; }
      ctx.save();
      ctx.translate(HX, HY);
      ctx.scale(sx, sy);
      ctx.translate(-HX, -HY);
      const a = FILM.cast.hayk(ctx, {
        x: HX, y: HY + bob, s: HS, t, pose, face, mouth, belly: 0.2, crown: true, tilt: lean,
        silhouette: impactNow ? '#0a0a10' : null,
      });
      ctx.restore();

      // 4. mega burger in both hands (top edge gripped by the hands)
      const gripY = (a.handL[1] + a.handR[1]) / 2;
      const bx = (a.handL[0] + a.handR[0]) / 2;
      let lift = 0;
      if (t < T_WIND) lift = Math.sin(tw * Math.PI * 2) * 6;
      else if (t < T_CHOMP) lift = -60 * L.ease.outCubic(windUp);
      else if (t < T_CHOMP + 0.25) lift = -60 * (1 - L.ease.outCubic((t - T_CHOMP) / 0.25));
      else lift = Math.sin(tw * Math.PI * 4) * 4;
      const by = gripY - MB_TOP - 50 + lift;
      if (!second) {
        if (impactNow) {
          const op = L.ease.outCubic(clamp((t - T_CHOMP + FR) / (3 * FR)));
          const jx = a.mouth[0], jy = a.mouth[1] + 40;
          jawCavity(ctx, jx, jy, 1.6, op);
          jawTeeth(ctx, jx, jy, 1.6, op, true);
          megaBurger(ctx, bx, by + 150, 0, info, 0, '#0a0a10');
          jawTeeth(ctx, jx, jy, 1.6, op, false);
          silEyes(ctx, a);
        } else {
          megaBurger(ctx, bx, by, level, info, t < T_CHOMP ? 0.6 + 0.4 * Math.sin(t * 8) : 0);
          fingers(ctx, a.handL[0] - 10, gripY + 10 + lift, 1.1, 1);
          fingers(ctx, a.handR[0] + 10, gripY + 10 + lift, 1.1, -1);
        }
      } else {
        // the second burger, raised like a trophy
        const hr = a.handR;
        const pop = F.popIn(t, T_GULP);
        F.burger(ctx, hr[0] + 30, hr[1] - 95, 1.25 * pop, { glow: true, rot: 0.08 * Math.sin(tw * 6) });
      }

      if (!impactNow) {
        if (t < T_CHOMP) {
          F.sparkle(ctx, a.eyeL[0] - 20, a.eyeL[1] - 30, 26 + 8 * Math.sin(t * 10));
          F.sparkle(ctx, a.eyeR[0] + 20, a.eyeR[1] - 20, 20 + 6 * Math.sin(t * 9 + 1));
        }
        // 5. table + tray (foreground)
        drawTable(ctx, t, second);
      } else {
        ctx.fillStyle = '#0a0a10';
        ctx.fillRect(-60, TABLE_Y, W + 120, H - TABLE_Y + 60);
      }
      ctx.restore(); // camera

      // 6. effects (follow the shake)
      ctx.save();
      ctx.translate(sh[0] * 0.6, sh[1] * 0.6);
      const mx = a.mouth[0], my = a.mouth[1];
      F.crumbs(ctx, mx, my + 60, t - T_CHOMP, { n: 24, spread: 680, seed: 3 });
      F.crumbs(ctx, mx + 30, my + 90, t - T_BITE2, { n: 16, spread: 520, seed: 4 });
      F.shockRing(ctx, mx, my + 40, t - T_CHOMP, { r: 560, life: 0.45, color: impactNow ? '#0a0a10' : '#ffffff' });
      if (t >= T_WIND && t < T_CHOMP) {
        F.menace(ctx, 900, 1080, t, { size: 84, n: 3, seed: 9 });
      }
      F.sfx(ctx, 'CHOMP!', 540, 560, t, T_CHOMP, { size: 220, rot: -0.14, life: 1.3, fill: impactNow ? '#ffffff' : P.sfxYellow, shadowColor: impactNow ? '#0a0a10' : '#b3122b' });
      if (t >= T_CHOMP + 0.5 && t < T_BITE2) {
        const k = Math.floor((t - T_CHOMP - 0.5) / 0.25) % 2;
        F.text(ctx, 'MUNCH', k ? 850 : 230, k ? 900 : 940, { size: 72, fill: '#ffffff', stroke: P.line, lw: 12, rot: k ? 0.15 : -0.15 });
      }
      F.sfx(ctx, 'CHOMP!', 800, 760, t, T_BITE2, { size: 130, rot: 0.12, life: 0.5 });
      if (t >= T_GULP && t < T_GULP + 0.5) {
        F.dust(ctx, bx, by - 160, t - T_GULP, { n: 7, size: 80, spread: 260, color: '#fff4e0', life: 0.5 });
      }
      F.sfx(ctx, 'GULP!', 270, 1180, t, T_GULP, { size: 140, rot: -0.1, life: 1.0, fill: '#ffffff' });
      if (second) {
        F.sparkles(ctx, { x: 560, y: 380, w: 420, h: 380, n: 9, seed: 71, t, size: 40, color: '#fff3a0' });
      }
      ctx.restore();

      // 7. screen-fixed text
      F.caption(ctx, 'STOP 2: BURGER KONG', 70, 290, { size: 54, bg: P.kongBlue, accent: P.gold });
      if (t >= T_LINE) {
        F.bubble(ctx, 'ONE MORE. FOR RESEARCH.', 240, 1260, { size: 48, maxW: 300, t, t0: T_LINE, tail: [a.mouth[0] - 50, a.mouth[1] + 20] });
      }
    },
  });

  function drawTable(ctx, t, second) {
    // table top (wood) and front
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-40, TABLE_Y); ctx.lineTo(W + 40, TABLE_Y); ctx.lineTo(W + 40, H + 40); ctx.lineTo(-40, H + 40); ctx.closePath();
    F.fo(ctx, '#c9773f', 5);
    ctx.fillStyle = '#e39a5c';
    ctx.fillRect(-40, TABLE_Y + 4, W + 80, 26);
    ctx.fillStyle = 'rgba(120,60,20,0.25)';
    for (let i = 0; i < 6; i++) ctx.fillRect(-40, TABLE_Y + 60 + i * 70, W + 80, 6);
    // tray
    ctx.beginPath();
    ctx.moveTo(120, TABLE_Y + 50); ctx.lineTo(960, TABLE_Y + 50); ctx.lineTo(1010, TABLE_Y + 260); ctx.lineTo(70, TABLE_Y + 260); ctx.closePath();
    F.fo(ctx, P.kongOrange, 5);
    ctx.beginPath();
    ctx.moveTo(150, TABLE_Y + 70); ctx.lineTo(930, TABLE_Y + 70); ctx.lineTo(970, TABLE_Y + 240); ctx.lineTo(110, TABLE_Y + 240); ctx.closePath();
    ctx.fillStyle = '#fff4e0'; ctx.fill();
    // wrapper paper pattern
    ctx.fillStyle = 'rgba(31,95,191,0.25)';
    for (let i = 0; i < 9; i++) { F.ellipse(ctx, 180 + i * 90, TABLE_Y + 150 + (i % 2) * 40, 20, 12); ctx.fill(); }
    ctx.restore();
    // fries + drink on the tray
    F.fries(ctx, 230, TABLE_Y + 210, 0.95, { color: P.kongBlue, label: false });
    F.drink(ctx, 880, TABLE_Y + 215, 0.95, { color: P.kongBlue });
    // wrappers of eaten burgers pile (grows after gulp)
    const n = second ? 3 : 2;
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.translate(520 + i * 70 - n * 30, TABLE_Y + 180 - i * 14);
      ctx.rotate(-0.3 + i * 0.35);
      F.curve(ctx, [[-60, -20], [-20, -46], [30, -38], [64, -6], [40, 30], [-10, 36], [-58, 20]]);
      F.fo(ctx, i % 2 ? '#ffe6c0' : '#fff8ea', 4);
      ctx.strokeStyle = 'rgba(27,20,36,0.35)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-30, -20); ctx.lineTo(10, 10); ctx.moveTo(20, -24); ctx.lineTo(-6, 20); ctx.stroke();
      ctx.restore();
    }
  }
})();
