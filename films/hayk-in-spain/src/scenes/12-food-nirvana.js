// Shot 12 'food-nirvana' : "Burger nirvana"  (global T 49.0 - 54.0, local t 0..5)
//
// Cooking-anime food-reaction climax. Hayk (pose float, face ecstatic, belly 0.35, crown) floats in
// a purple-and-gold cosmos; burgers, fries and drumsticks orbit him on a tilted ellipse (back half
// behind him, front half in front). Golden beams rotate behind him, radial focus lines pulse on
// every beat, his body glows.
//
// Beats (local):
//   0.0   (core flash transition in) cosmos already complete
//   1.0   "SO... GOOD...!!" slams in (gold, outlined), small shake
//   2.5   a halo of melting cheese pops in above his head and starts dripping
//   4.0   white flash out: a light burst from his chest fills the frame
//
// Layers back to front:
//   1 cosmos (cached): gradient, nebula clouds, far stars
//   2 animated: spiral nebula arms, twinkling stars, golden beams, pulsing focus lines
//   3 back half of the food orbit
//   4 glow + gold aura, Hayk, wind streaks
//   5 cheese halo
//   6 front half of the food orbit, sparkles
//   7 screen-fixed title text, white flash
(function () {
  'use strict';
  const ID = 'food-nirvana';
  const FILM = window.FILM;
  const F = FILM.fx;
  const P = F.pal;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const W = 1080, H = 1920;
  const FR = 1 / 24;
  const h = (...k) => F.h01(ID, ...k);

  const T_TEXT = 1.0; // T 50.0
  const T_HALO = 2.5; // T 51.5
  const T_FLASH = 4.0; // T 53.0

  const HX = 540, HY = 1720, HS = 1.7;
  const OC = [540, 1230]; // orbit centre
  const ORX = 450, ORY = 150, OTILT = -0.14;
  const PURPLE_D = '#1a0b3a', PURPLE = '#3b1d6e', VIOLET = '#7a3cff';

  // ---------------------------------------------------------------------------
  function buildCosmos() {
    const S = FILM.S || 1;
    const c = FILM.makeCanvas(Math.round(W * S), Math.round(H * S));
    const g = c.getContext('2d');
    g.setTransform(S, 0, 0, S, 0, 0);
    F.sky(g, PURPLE_D, '#2a0f4a', { mid: PURPLE, midAt: 0.5 });
    // nebula clouds: overlapping soft radial blobs
    const blob = (x, y, r, col, a) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, col.replace('A', a));
      gr.addColorStop(1, col.replace('A', 0));
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    };
    blob(540, 1000, 900, 'rgba(122,60,255,A)', 0.55);
    blob(200, 500, 520, 'rgba(255,79,180,A)', 0.35);
    blob(880, 700, 560, 'rgba(90,120,255,A)', 0.35);
    blob(300, 1500, 600, 'rgba(255,120,200,A)', 0.25);
    blob(860, 1450, 520, 'rgba(255,204,51,A)', 0.22);
    blob(540, 1050, 520, 'rgba(255,214,90,A)', 0.55);
    // far stars (static)
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 260; i++) {
      const x = h('fs', i) * W, y = h('fsy', i) * H, r = 0.8 + h('fsr', i) * 1.8;
      g.globalAlpha = 0.3 + h('fsa', i) * 0.6;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    // a few distant cross stars
    for (let i = 0; i < 12; i++) F.sparkle(g, h('cs', i) * W, h('csy', i) * H, 10 + h('csr', i) * 16, { color: i % 3 ? '#ffffff' : '#ffe9a0' });
    return c;
  }

  function nebulaArms(ctx, t) {
    // slow rotating spiral arms around the orbit centre
    ctx.save();
    ctx.translate(OC[0], OC[1] - 150);
    ctx.rotate(t * 0.12);
    ctx.lineCap = 'round';
    for (let arm = 0; arm < 3; arm++) {
      ctx.save();
      ctx.rotate((arm / 3) * TAU);
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const u = i / 40;
          const a = u * 3.2 + k * 0.25;
          const r = 120 + u * 900;
          const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.62;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = k ? 'rgba(255,214,90,0.12)' : 'rgba(200,140,255,0.16)';
        ctx.lineWidth = k ? 40 : 90;
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function beams(ctx, x, y, t, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const n = 16, rot = t * 0.35;
    const gr = ctx.createRadialGradient(x, y, 40, x, y, 1500);
    gr.addColorStop(0, 'rgba(255,240,170,0.9)');
    gr.addColorStop(0.5, 'rgba(255,204,51,0.35)');
    gr.addColorStop(1, 'rgba(255,204,51,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a0 = rot + (i / n) * TAU, a1 = a0 + (TAU / n) * (0.28 + 0.12 * Math.sin(i * 1.7));
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a0) * 1600, y + Math.sin(a0) * 1600);
      ctx.lineTo(x + Math.cos(a1) * 1600, y + Math.sin(a1) * 1600);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }

  // --- the orbiting food
  const ITEMS = ['burger', 'fries', 'drumstick', 'burger', 'drink', 'drumstick', 'fries', 'burger'];
  function orbitPos(i, t) {
    const a = (i / ITEMS.length) * TAU + t * 0.9;
    const ex = Math.cos(a) * ORX, ey = Math.sin(a) * ORY;
    const x = OC[0] + ex * Math.cos(OTILT) - ey * Math.sin(OTILT);
    const y = OC[1] + ex * Math.sin(OTILT) + ey * Math.cos(OTILT);
    return { x, y, depth: Math.sin(a), a };
  }
  function drawItem(ctx, kind, x, y, s, rot, t, i) {
    // soft glow behind each item
    const gr = ctx.createRadialGradient(x, y, 10, x, y, 150 * s);
    gr.addColorStop(0, 'rgba(255,230,140,0.55)');
    gr.addColorStop(1, 'rgba(255,230,140,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(x - 150 * s, y - 150 * s, 300 * s, 300 * s);
    switch (kind) {
      case 'burger': F.burger(ctx, x, y, 0.62 * s, { rot }); break;
      case 'fries': F.fries(ctx, x, y + 60 * s, 0.62 * s, { color: P.mcRed }); break;
      case 'drumstick': F.drumstick(ctx, x - 60 * s, y + 10 * s, 0.7 * s, { rot: rot - 0.4 }); break;
      case 'drink': F.drink(ctx, x, y + 70 * s, 0.55 * s, {}); break;
      default: break;
    }
    // trailing sparkle
    F.sparkle(ctx, x + 70 * s, y - 60 * s, (14 + 8 * Math.sin(t * 7 + i)) * s);
  }
  function orbit(ctx, t, front) {
    const list = ITEMS.map((k, i) => Object.assign({ k, i }, orbitPos(i, t))).filter((o) => (front ? o.depth >= 0 : o.depth < 0));
    list.sort((p, q) => p.depth - q.depth);
    list.forEach((o) => {
      const s = lerp(0.7, 1.25, (o.depth + 1) / 2);
      drawItem(ctx, o.k, o.x, o.y, s, Math.sin(t * 2 + o.i) * 0.3, t, o.i);
    });
  }

  // --- the melting cheese halo
  function cheeseHalo(ctx, x, y, t) {
    const age = t - T_HALO;
    if (age < -1e-6) return;
    const sc = F.popIn(t, T_HALO);
    const rx = 190, ry = 50;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    // glow
    const gr = ctx.createRadialGradient(0, 0, 40, 0, 0, 300);
    gr.addColorStop(0, 'rgba(255,230,120,0.6)');
    gr.addColorStop(1, 'rgba(255,230,120,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(-300, -300, 600, 600);
    // ring (thick ellipse band)
    ctx.beginPath();
    ctx.ellipse(0, 0, rx + 26, ry + 16, 0, 0, TAU);
    ctx.ellipse(0, 0, rx - 26, ry - 14, 0, 0, TAU, true);
    F.fo(ctx, P.cheese, 6);
    // drips hanging off the front edge, growing with age
    const grow = clamp(age / 1.2);
    for (let i = 0; i < 7; i++) {
      const u = (i + 0.5) / 7;
      const a = Math.PI * (0.12 + u * 0.76);
      const px = Math.cos(a) * (rx + 10), py = Math.sin(a) * (ry + 12);
      const len = (30 + 70 * h('drip', i)) * grow + 10 + 8 * Math.sin(t * 5 + i);
      const w = 13 + 5 * h('dw', i);
      ctx.beginPath();
      ctx.moveTo(px - w, py - 6);
      ctx.lineTo(px - w * 0.8, py + len);
      ctx.arc(px, py + len, w * 0.8, Math.PI, 0, true);
      ctx.lineTo(px + w, py - 6);
      ctx.closePath();
      F.fo(ctx, P.cheese, 5);
      ctx.fillStyle = P.cheese;
      ctx.fillRect(px - w + 3, py - 14, w * 2 - 6, 14);
      // falling droplet loop
      const du = ((t * 0.9 + h('dd', i)) % 1 + 1) % 1;
      if (grow > 0.5 && i % 2 === 0) {
        F.ellipse(ctx, px, py + len + 20 + du * 220, 9, 12);
        ctx.globalAlpha = 1 - du;
        F.fo(ctx, P.cheese, 4);
        ctx.globalAlpha = 1;
      }
    }
    // highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(0, -4, rx, ry, 0, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const hitFrames = (a, n) => t >= a - 1e-6 && t < a + n * FR - 1e-6;
      const bp = F.beatPulse(t, 0.5, 0.16);

      const push = 1 + 0.07 * L.ease.inOutSine(clamp(t / info.dur)) + (hitFrames(T_TEXT, 2) ? 0.03 : 0);
      const roll = Math.sin(t * 1.3) * 0.015;
      const sh = F.shakeMany(t, [[T_TEXT, 0.35, 16], [T_HALO, 0.25, 8], [T_FLASH, 0.3, 20]], 5);
      ctx.save();
      ctx.translate(W / 2 + sh[0], 1100 + sh[1]);
      ctx.rotate(roll);
      ctx.scale(push, push);
      ctx.translate(-W / 2, -1100);

      // 1. cosmos
      ctx.drawImage(L.cached(ID + '-cosmos-' + (FILM.S || 1), buildCosmos), -60, -60, W + 120, H + 120);
      // 2. animated sky
      nebulaArms(ctx, t);
      F.stars(ctx, { n: 90, seed: 49, x: 0, y: 0, w: W, h: H });
      const bob = Math.sin(t * Math.PI) * 18;
      const cx = HX, cy = HY - 560 + bob; // chest-ish centre of the glow
      beams(ctx, cx, cy - 120, t, 0.8);
      F.focusLines(ctx, cx, cy - 100, { inner: 470, count: 90, color: '#fff2c0', alpha: 0.12 + 0.45 * bp, seed: 12, width: 14, rx: 470, ry: 620 });

      // 3. back of the orbit
      orbit(ctx, t, false);

      // 4. Hayk with glow and aura
      const glow = ctx.createRadialGradient(cx, cy - 80, 60, cx, cy - 80, 620);
      glow.addColorStop(0, 'rgba(255,250,210,0.95)');
      glow.addColorStop(0.45, 'rgba(255,214,90,0.45)');
      glow.addColorStop(1, 'rgba(255,214,90,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cx - 620, cy - 700, 1240, 1240);
      F.aura(ctx, HX, HY + bob - 40, 620, 1120, t, { color: '#ffcc33', core: '#fff3b0', alpha: 0.55, seed: 4 });
      const a = FILM.cast.hayk(ctx, {
        x: HX, y: HY + bob, s: HS, t, pose: 'float', face: 'ecstatic', belly: 0.35, crown: true,
        tilt: Math.sin(tw * 1.6) * 0.04, headTilt: -0.05,
      });
      // hoodie flutter: wind streaks rising past his body
      F.speedLines(ctx, { x: HX - 360, y: HY - 1000, w: 720, h: 1050, angle: -Math.PI / 2, count: 18, color: '#fff6d8', alpha: 0.5, t, speed: 900, len: 240, width: 5, seed: 7 });

      // 5. cheese halo above the crown
      cheeseHalo(ctx, a.top[0], a.top[1] - 115, t);

      // 6. front of the orbit + sparkles
      orbit(ctx, t, true);
      F.sparkles(ctx, { x: 80, y: 500, w: 920, h: 1100, n: 18, seed: 23, t, size: 34, color: '#fff3a0' });
      F.sparkle(ctx, a.eyeL[0] - 40, a.eyeL[1] - 40, 34 + 10 * bp);
      F.sparkle(ctx, a.eyeR[0] + 40, a.eyeR[1] - 30, 28 + 8 * bp);
      ctx.restore(); // camera

      // 7. screen-fixed: the title line
      if (t >= T_TEXT - 1e-6) {
        const sc = F.popIn(t, T_TEXT);
        const j = F.wiggle(t, 3, 3);
        F.text(ctx, 'SO...\nGOOD...!!', 540 + j, 395, {
          size: 138, fill: P.gold, stroke: P.line, lw: 20, scale: sc, rot: -0.06, skew: -0.1,
          shadow: 10, shadowColor: '#7a2a00', lineHeight: 1.05,
        });
        F.sparkle(ctx, 860, 330, 40 * sc * (0.7 + 0.3 * bp));
        F.sparkle(ctx, 190, 520, 30 * sc * (0.7 + 0.3 * Math.sin(t * 8)));
      }

      // white flash out: a hard white frame on the beat, then the light swallows the picture
      if (t >= T_FLASH - 1e-6) {
        const u = clamp((t - T_FLASH - 2 * FR) / (info.dur - T_FLASH - 3 * FR));
        const gx = a.chest[0], gy = a.chest[1] - 60;
        // white rays bursting out of his chest
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        const n = 20, rot = t * 0.6;
        for (let i = 0; i < n; i++) {
          const a0 = rot + (i / n) * TAU, a1 = a0 + (TAU / n) * (0.25 + 0.3 * u);
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx + Math.cos(a0) * 2400, gy + Math.sin(a0) * 2400);
          ctx.lineTo(gx + Math.cos(a1) * 2400, gy + Math.sin(a1) * 2400);
          ctx.closePath();
        }
        ctx.fill();
        ctx.restore();
        const r = 200 + L.ease.inQuad(u) * 1700;
        const gr = ctx.createRadialGradient(gx, gy, r * 0.35, gx, gy, r);
        gr.addColorStop(0, 'rgba(255,255,255,1)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, W, H);
        F.flash(ctx, hitFrames(T_FLASH, 2) ? 1 : 0.3 + 0.68 * L.ease.inQuad(u), '#fffdf4');
      }
    },
  });
})();
