/*
 * Shot 23 'burger-drop' : "The burger falls"  (global T 100.0 - 104.0, 4 s)
 *
 * 0.0 - 2.0  Slow motion / time-freeze. The half-eaten burger tumbles down in close-up past Hayk,
 *            sesame seeds and lettuce bits float, blue-white focus lines, film-strip frame lines,
 *            a slow heartbeat pulse (T 100, 101). Hayk in the background turns determined, eyes glint.
 * 2.0        (T 102.0) the burger hits the table: impact frame (3 frames), shake, crumbs, "THUD!".
 * 2.0 - 4.0  Hayk stands up (pose "fist", face "determined"), fire aura, hoodie/hair whipped by
 *            wind streaks, red-orange sunburst.
 * 2.5        (T 102.5) shout bubble "I'M COMING HOME, GOOFY!".
 *
 * Layers: background (frozen blue restaurant | hot sunburst) -> focus lines -> aura -> Hayk ->
 *   table -> burger + particles -> film strip overlay -> impact frame -> bubble / SFX.
 */
(function () {
  'use strict';
  const ID = 'burger-drop';
  const FILM = window.FILM;
  const L = FILM.lib;
  const F = FILM.fx;
  const C = F.pal;
  const TAU = Math.PI * 2;
  const clamp = F.clamp, lerp = F.lerp, h01 = F.h01;
  const { rrect, fo, ellipse } = F;
  const FR = 1 / 24;

  const B_BEAT2 = 1.0; //  T 101.0 second heartbeat
  const B_GLINT = 1.5; //  T 101.5 Hayk's eyes glint (determined)
  const B_HIT = 2.0; //    T 102.0 burger hits the table
  const B_SHOUT = 2.5; //  T 102.5 "I'M COMING HOME, GOOFY!"

  const TABLE_Y = 1480;
  const LAND_X = 320;
  const BURGER_S = 1.75;
  const HX = 600;
  const BURGER_REST_Y = TABLE_Y + 24 - 76 * BURGER_S;

  // ---------------------------------------------------------------------------
  // cached backgrounds
  // ---------------------------------------------------------------------------
  function frozenBg() {
    return L.cached(ID + '-frozen', () => {
      const c = FILM.makeCanvas(1080, 1920);
      const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, 1920);
      gr.addColorStop(0, '#20306e'); gr.addColorStop(0.55, '#4a6fc0'); gr.addColorStop(1, '#8fb4ea');
      g.fillStyle = gr; g.fillRect(0, 0, 1080, 1920);
      // restaurant shapes in duotone
      g.fillStyle = 'rgba(200,225,255,0.18)';
      // arched window
      g.beginPath(); g.moveTo(640, 1150); g.lineTo(640, 620); g.arc(820, 620, 180, Math.PI, 0); g.lineTo(1000, 1150); g.closePath(); g.fill();
      g.fillStyle = 'rgba(20,30,80,0.35)';
      g.fillRect(812, 440, 16, 710); g.fillRect(640, 860, 360, 14);
      // menu board
      g.fillStyle = 'rgba(20,30,80,0.35)'; g.fillRect(60, 560, 300, 260);
      // bunting silhouettes
      g.fillStyle = 'rgba(210,230,255,0.25)';
      for (let i = 0; i < 16; i++) {
        const x = 20 + i * 68, y = 330 + Math.sin((x / 1080) * Math.PI) * 30;
        g.beginPath(); g.moveTo(x - 26, y); g.lineTo(x + 26, y); g.lineTo(x + 26, y + 44); g.lineTo(x, y + 58); g.lineTo(x - 26, y + 44); g.closePath(); g.fill();
      }
      // pendant lamps
      [200, 540, 900].forEach((x) => {
        g.strokeStyle = 'rgba(210,230,255,0.3)'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 400); g.stroke();
        g.fillStyle = 'rgba(210,230,255,0.3)';
        g.beginPath(); g.moveTo(x - 60, 460); g.quadraticCurveTo(x, 390, x + 60, 460); g.closePath(); g.fill();
      });
      // tiled wainscot
      for (let r = 0; r < 4; r++) for (let k = 0; k < 19; k++) {
        g.fillStyle = (r + k) % 2 ? 'rgba(20,40,110,0.35)' : 'rgba(40,70,150,0.3)';
        g.fillRect(k * 60 + 4, 1180 + r * 60 + 4, 52, 52);
      }
      return c;
    });
  }

  // film strip overlay (left and right edge), sliding slowly
  function filmStrip(ctx, t, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    const off = (t * 40) % 120;
    [[0, 70], [1010, 70]].forEach(([x, w]) => {
      ctx.fillStyle = '#0b0a14'; ctx.fillRect(x, 0, w, 1920);
      ctx.fillStyle = '#e8f2ff';
      for (let i = -1; i < 18; i++) { rrect(ctx, x + 18, i * 120 + off + 20, 34, 56, 8); ctx.fill(); }
    });
    // frame lines (horizontal), a tall "film frame" boundary drifting
    ctx.fillStyle = 'rgba(11,10,20,0.85)';
    const fo2 = (t * 40) % 960;
    for (let k = -1; k < 3; k++) ctx.fillRect(70, k * 960 + fo2 - 8, 940, 16);
    // scratches
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    const b = L.boil(L.T);
    for (let i = 0; i < 3; i++) {
      const sx = 90 + h01(ID, 'scr', i, b) * 900;
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx + 6, 1920); ctx.stroke();
    }
    ctx.restore();
  }

  // floating slow-motion debris around the falling burger
  function debris(ctx, t, cx, cy, spread, life) {
    const cols = [C.sesame, C.lettuce, C.tomato, C.cheese, C.bun];
    for (let i = 0; i < 26; i++) {
      const a = h01(ID, 'da', i) * TAU;
      const r = 120 + h01(ID, 'dr', i) * spread;
      const drift = t * (20 + h01(ID, 'dv', i) * 30);
      const x = cx + Math.cos(a) * (r + drift);
      const y = cy + Math.sin(a) * (r + drift) * 0.9 - t * 30;
      ctx.save();
      ctx.globalAlpha = life;
      ctx.translate(x, y);
      ctx.rotate(t * (h01(ID, 'dw', i) - 0.5) * 2 + i);
      const kind = i % 5;
      if (kind === 0 || kind === 3) { ellipse(ctx, 0, 0, 11, 6); fo(ctx, C.sesame, 3); }
      else if (kind === 1) { ctx.beginPath(); ctx.moveTo(-16, 0); ctx.quadraticCurveTo(0, -18, 16, 0); ctx.quadraticCurveTo(0, 8, -16, 0); fo(ctx, C.lettuce, 3); }
      else if (kind === 2) { ellipse(ctx, 0, 0, 9, 9); fo(ctx, C.tomato, 3); }
      else { rrect(ctx, -8, -6, 16, 12, 3); fo(ctx, cols[i % cols.length], 3); }
      ctx.restore();
    }
  }

  function table(ctx, hot) {
    ctx.fillStyle = hot ? '#9b5a32' : '#5d6fa8';
    ctx.fillRect(-60, TABLE_Y, 1200, 36);
    ctx.fillStyle = hot ? '#7a4424' : '#46558a';
    ctx.fillRect(-60, TABLE_Y + 36, 1200, 600);
    ctx.strokeStyle = C.line; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-60, TABLE_Y); ctx.lineTo(1140, TABLE_Y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(-60, TABLE_Y + 6, 1200, 8);
    // wood grain
    ctx.strokeStyle = hot ? 'rgba(60,25,10,0.35)' : 'rgba(20,30,70,0.35)'; ctx.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      const y = TABLE_Y + 80 + i * 70;
      ctx.beginPath(); ctx.moveTo(-60, y); ctx.bezierCurveTo(300, y - 20, 700, y + 20, 1140, y - 6); ctx.stroke();
    }
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const hot = t >= B_HIT - 1e-6;
      const hitAge = t - B_HIT;
      const impactFrames = hot && hitAge < 3 * FR - 1e-6;

      // heartbeat pulse (T 100, T 101)
      const hb = !hot ? Math.max(Math.exp(-Math.max(0, t) / 0.15) * (t >= 0 ? 1 : 0), t >= B_BEAT2 ? Math.exp(-(t - B_BEAT2) / 0.15) : 0) : 0;
      // camera
      const sh = F.shakeMany(t, [[B_HIT, 0.5, 34], [B_SHOUT, 0.4, 16]], 5);
      let z = 1 + hb * 0.025;
      if (hot) z = 1.04 + 0.04 * L.ease.outCubic(clamp(hitAge / 2));
      ctx.save();
      ctx.translate(sh[0], sh[1]);
      ctx.translate(540, 1100); ctx.scale(z, z); ctx.translate(-540, -1100);

      // ---- 1. background
      if (!hot) {
        ctx.drawImage(frozenBg(), 0, 0);
      } else {
        F.sunburst(ctx, HX, 900, { rays: 28, colorA: '#3a0a1c', colorB: '#6e1426', rot: t * 0.25 });
        const g = ctx.createRadialGradient(540, 900, 100, 540, 900, 1300);
        g.addColorStop(0, 'rgba(255,150,60,0.55)'); g.addColorStop(0.5, 'rgba(255,80,40,0)'); g.addColorStop(1, 'rgba(20,0,10,0.7)');
        ctx.fillStyle = g; ctx.fillRect(-100, -100, 1300, 2200);
      }

      // ---- 2. burger fall position
      const u = clamp(t / B_HIT);
      const fallY = (uu) => lerp(250, BURGER_REST_Y, Math.pow(uu, 1.35));
      const fallX = (uu) => lerp(760, LAND_X, uu) + Math.sin(uu * Math.PI) * 60;
      const by = hot ? BURGER_REST_Y : fallY(u);
      const bx = hot ? LAND_X : fallX(u);
      const brot = hot ? 0.08 : -0.6 + u * 3.6 + Math.sin(u * 7) * 0.1;

      // ---- 3. focus lines
      if (!hot) {
        F.focusLines(ctx, bx, by, { inner: 300, count: 100, color: '#eaf4ff', alpha: 0.75, width: 16, seed: 23, frozen: true });
      } else {
        F.focusLines(ctx, HX, 900, { inner: 420, count: 90, color: '#ffb13a', alpha: 0.5, width: 18, seed: 29 });
      }

      // ---- 4. Hayk
      const rise = hot ? L.ease.outBack(clamp(hitAge / 0.35)) : 0;
      const hs = lerp(1.9, 2.0, rise);
      const hy = lerp(1990, 1850, rise) + (hot ? Math.sin(tw * Math.PI * 4) * 4 : 0);
      if (hot) {
        const ag = clamp(hitAge / 0.3);
        F.aura(ctx, HX, hy - 40, 900 * ag, 1300 * ag, t, { alpha: 0.95 });
      }
      // hoodie billow: wind streaks behind him
      if (hot) {
        ctx.save(); ctx.globalAlpha = 0.8;
        F.speedLines(ctx, { angle: Math.PI, count: 26, color: '#fff3c0', t, speed: 2600, len: 380, width: 10, seed: 41, y: 500, h: 1000 });
        ctx.restore();
      }
      const face = t >= B_GLINT - 1e-6 ? 'determined' : 'sad';
      const tilt = hot ? Math.sin(tw * Math.PI * 3) * 0.015 : 0;
      const a = FILM.cast.hayk(ctx, {
        x: HX, y: hy, s: hs, t: tw, pose: hot ? 'fist' : 'stand', face, belly: 0.8, crown: true, tilt,
        look: [0, hot ? 0 : 0.5], alpha: 1,
      });
      // eye glints
      if (t >= B_GLINT - 1e-6) {
        const ga = t - B_GLINT;
        const k = hot ? 1 : F.pop(t, B_GLINT, 0.2);
        const r = (hot ? 22 + Math.sin(t * 12) * 4 : 30) * k;
        F.sparkle(ctx, a.eyeL[0] + 12, a.eyeL[1] - 14, r, { color: '#ffffff', rot: ga * 2 });
        F.sparkle(ctx, a.eyeR[0] + 12, a.eyeR[1] - 14, r * 0.8, { color: '#ffffff', rot: -ga * 2 });
      }
      // ---- 5. table + props
      table(ctx, hot);
      const hop = hot ? Math.max(0, Math.sin(clamp(hitAge / 0.32) * Math.PI)) * 70 : 0;
      rrect(ctx, LAND_X - 240, TABLE_Y + 10, 480, 50, 14); fo(ctx, '#e8413c', 5);
      F.fries(ctx, 820, TABLE_Y + 130 - hop, 1.15, {});
      ctx.save(); ctx.translate(1010, TABLE_Y + 170 - hop * 0.7); ctx.rotate(hot ? clamp(hitAge / 0.3) * 0.25 : 0);
      F.drink(ctx, 0, 0, 1.3, {});
      ctx.restore();
      [[120, TABLE_Y + 160, 36], [640, TABLE_Y + 120, 30], [560, TABLE_Y + 190, 26], [300, TABLE_Y + 240, 32]].forEach(([x, y, r], i) => {
        ctx.save(); ctx.translate(x, y - hop * 0.5 * (i % 2)); ctx.rotate(i * 1.3 + (hot ? hitAge * 2 * (i % 2) : 0));
        ctx.beginPath();
        for (let k = 0; k < 9; k++) { const an = (k / 9) * TAU, rr = r * (0.75 + h01(ID, 'wr', i, k) * 0.4); ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
        ctx.closePath(); fo(ctx, i % 2 ? '#ffe7a8' : '#fff4d6', 4);
        ctx.restore();
      });
      // frozen tint over everything except the falling burger (colour stays on the subject)
      if (!hot) {
        ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = '#3558b0';
        ctx.fillRect(-100, -100, 1300, 2200); ctx.restore();
      }

      // ---- 6. burger + particles
      if (!hot) {
        // motion ghost trail (slow motion afterimages)
        for (let k = 3; k >= 1; k--) {
          const uu = clamp(u - k * 0.035);
          ctx.save(); ctx.globalAlpha = 0.16;
          F.burger(ctx, fallX(uu), fallY(uu), BURGER_S, { bite: 0.38, rot: -0.6 + uu * 3.6 });
          ctx.restore();
        }
        F.burger(ctx, bx, by, BURGER_S, { bite: 0.38, rot: brot });
        debris(ctx, t, bx, by, 360, 1);
        // shine
        F.sparkle(ctx, bx - 110, by - 120, 30 + Math.sin(t * 8) * 6, { color: '#ffffff' });
      } else {
        // squash on landing for 2 frames, then settle
        const sq = hitAge < 2 * FR ? 1 : hitAge < 4 * FR ? 0.4 : 0;
        ctx.save();
        ctx.translate(LAND_X, TABLE_Y);
        ctx.scale(1 + sq * 0.14, 1 - sq * 0.2);
        ctx.translate(-LAND_X, -TABLE_Y);
        F.burger(ctx, LAND_X, BURGER_REST_Y, BURGER_S, { bite: 0.38, rot: 0.04 });
        ctx.restore();
        F.shockRing(ctx, LAND_X, TABLE_Y + 4, hitAge, { r: 520, color: '#fff6c0', life: 0.45, width: 26, squash: 0.25 });
        F.dust(ctx, LAND_X, TABLE_Y, hitAge, { n: 9, size: 60, spread: 420, color: '#fff0d0', seed: 9, life: 0.9 });
        F.crumbs(ctx, LAND_X, BURGER_REST_Y - 40, hitAge, { n: 22, spread: 700, seed: 13, life: 1.2 });
        // plate rattle bits
      }
      ctx.restore(); // camera

      // ---- 7. film strip (only during the time freeze, fades with the hit)
      if (!hot) filmStrip(ctx, t, 0.92);

      // heartbeat vignette + katakana
      if (!hot) {
        F.vignette(ctx, 0.35 + hb * 0.4, '10,20,60');
        ctx.save(); ctx.globalAlpha = 0.25 + hb * 0.6;
        F.text(ctx, 'ドクン', 880, 640, { size: 90, fill: '#eaf4ff', stroke: '#1b2a6a', lw: 8, rot: 0.2, font: 'jp' });
        ctx.restore();
      }

      // ---- 8. impact frame (3 frames on 102.0)
      if (impactFrames) {
        F.impact(ctx, { cx: LAND_X, cy: TABLE_Y - 60, seed: 17 });
        FILM.cast.hayk(ctx, { x: HX, y: 1990, s: 1.9, t: tw, pose: 'fist', face: 'determined', belly: 0.8, crown: false, silhouette: '#0a0a10' });
        ctx.fillStyle = '#0a0a10'; ctx.fillRect(0, TABLE_Y, 1080, 440);
        F.burger(ctx, LAND_X, BURGER_REST_Y, BURGER_S * 1.1, { bite: 0.38, rot: 0.04 });
      }

      // ---- 9. text
      if (hot) {
        F.sfx(ctx, 'THUD!', 300, 1130, t, B_HIT, { size: 150, fill: C.sfxYellow, rot: -0.2, life: 1.2 });
        F.menace(ctx, 930, 1300, t, { size: 70, color: '#ffcc33', n: 3, seed: 7 });
      }
      if (t >= B_SHOUT - 1e-6) {
        const sk = F.shake(t, B_SHOUT, 0.5, 10, 3);
        F.bubble(ctx, "I'M COMING HOME, GOOFY!", 500 + sk[0], 410 + sk[1], {
          size: 70, maxW: 600, shout: true, t, t0: B_SHOUT, tail: [a.head[0] - 250, a.head[1] - 40], fill: '#ffffff', shake: 6,
        });
      }
    },
  });
})();
