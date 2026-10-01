/*
 * cast.js : the logo characters of "Time vs биржа". Loaded after src/props.js.
 * NEVER redraw a logo inside a scene file: call these and hang effects off the returned anchors.
 *
 *   FILM.cast.time(ctx, o)     the trader's TIME: a clock badge (blue rim = time left, 10:10 hands)
 *   FILM.cast.birzha(ctx, o)   the EXCHANGE "биржа": an orange squircle whose mouth is a candle chart
 *   FILM.cast.lsMark(ctx, o)   the real LiquidityScan app mark: a light tile with L ||| S (green candles)
 *   FILM.cast.lsWordmark(ctx, x, y, size, o)   "LiquidityScan" (two-tone) or o.style 'candles': Liqui|||Scan
 *   FILM.cast.wordmark(ctx, who, x, y, size, o) "Time" / "биржа" name logos
 *   FILM.cast.glove(ctx, x, y, s, angle, color, color2)   a boxing glove (for props or flying gloves)
 *
 * Common options for time / birzha:
 *   x, y     CENTRE of the logo. Base size: 240 px across at s = 1 (R = 120 * s).
 *   s        scale.  rot: rotation (radians).  sx, sy: squash/stretch multipliers (use FILM.fx.squash).
 *   t        local time (blinks, idle wobble, candle wiggle).  alpha.
 *   face     neutral | happy | angry | smug | shocked | dizzy | hurt | sad | laugh | determined | calm
 *   look     [-1..1, -1..1] pupil direction.  blink: true closes the eyes.
 *   gloves   { l: [x, y], r: [x, y] } WORLD positions of the boxing gloves; rubber-hose arms are drawn
 *            from the logo's sides to them (omit a side for no arm). gloveOpen: true = open palm.
 *   shadow   ground y for a soft contact shadow (omit for none).  silhouette: a colour (flat figure).
 *
 * time() only:  ring 0..1 (how much of the blue rim is left: time remaining; the gap starts at 12 and
 *               opens clockwise), hands { h, m } angles in radians from 12 (default 10:10), spin (extra
 *               radians added to both hands; pass t * 20 for a frantic spin), crumbs (bitten rim edge).
 * birzha() only: jaw 0..1 (mouth open, the candle chart becomes teeth), candles: [h1, h2, h3] heights
 *               0..1 of the three candles (default animated from t), greedy: true ($ in the eyes).
 *
 * Returns anchors in world coords: { c, top, bottom, left, right, eyeL, eyeR, mouth, gloveL, gloveR, R }.
 */
(function () {
  'use strict';

  const FILM = window.FILM;
  const F = FILM.fx;
  const C = F.pal;
  const TAU = Math.PI * 2;
  const clamp = F.clamp;

  let SIL = null;
  const col = (c) => (SIL ? SIL : c);

  /** local (logo space) -> world, given the logo transform */
  function mapper(o, R) {
    const s = 1, rot = o.rot || 0, sx = o.sx || 1, sy = o.sy || 1;
    const c = Math.cos(rot), sn = Math.sin(rot);
    return (lx, ly) => {
      const x = lx * sx * s, y = ly * sy * s;
      return [o.x + x * c - y * sn, o.y + x * sn + y * c];
    };
  }

  // auto-blink every ~3 s, 6 frames
  const blinking = (t, seed) => {
    if (t == null) return false;
    const per = 2.9 + seed * 0.37;
    const u = (((t + seed * 0.91) % per) + per) % per;
    return u < 0.1;
  };

  // ---------------------------------------------------------------------------
  // Boxing gloves and rubber-hose arms
  // ---------------------------------------------------------------------------
  /** glove(ctx, x, y, s, angle, color, color2, open): boxing glove centred at (x, y), punching along angle. */
  function glove(ctx, x, y, s, angle, color, color2, open) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(s, s);
    // cuff (behind, toward the arm)
    F.rrect(ctx, -46, -24, 26, 48, 10);
    ctx.fillStyle = col('#ffffff');
    ctx.fill();
    // mitt
    ctx.beginPath();
    ctx.moveTo(-26, -30);
    ctx.bezierCurveTo(-10, -44, 30, -46, 40, -18);
    ctx.bezierCurveTo(48, 6, 34, 34, 8, 34);
    ctx.bezierCurveTo(-12, 34, -26, 26, -28, 12);
    ctx.closePath();
    ctx.fillStyle = col(color);
    ctx.fill();
    if (!SIL) {
      // thumb
      ctx.beginPath();
      ctx.ellipse(-4, open ? 30 : 18, 16, 11, -0.3, 0, TAU);
      ctx.fillStyle = color2;
      ctx.fill();
      // highlight
      ctx.beginPath();
      ctx.ellipse(14, -24, 14, 6, -0.25, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fill();
    }
    ctx.restore();
  }
  function arm(ctx, from, to, width, side) {
    const mx = (from[0] + to[0]) / 2, my = (from[1] + to[1]) / 2;
    const dx = to[0] - from[0], dy = to[1] - from[1];
    const len = Math.hypot(dx, dy) || 1;
    const bend = Math.min(60, len * 0.25) * side;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = col(C.ink);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.quadraticCurveTo(mx - (dy / len) * bend, my + (dx / len) * bend, to[0], to[1]);
    ctx.stroke();
    ctx.restore();
  }
  function drawGloves(ctx, o, R, W, anchors, colors) {
    if (!o.gloves) return;
    const sides = [['l', -1], ['r', 1]];
    sides.forEach(([k, sd]) => {
      const g = o.gloves[k];
      if (!g) return;
      const sh = W(sd * R * 0.92, R * 0.15);
      const ang = Math.atan2(g[1] - sh[1], g[0] - sh[0]);
      arm(ctx, sh, g, R * 0.1, sd);
      glove(ctx, g[0], g[1], R / 120 * 0.95, ang, colors[0], colors[1], o.gloveOpen);
      anchors[k === 'l' ? 'gloveL' : 'gloveR'] = g;
    });
  }

  // ---------------------------------------------------------------------------
  // Faces (shared): eyes in logo-local coordinates, R = logo radius
  // ---------------------------------------------------------------------------
  function eyes(ctx, R, o, spec) {
    const face = o.face || 'neutral';
    const t = o.t || 0;
    const ex = spec.ex * R, ey = spec.ey * R, rx = spec.rx * R, ry = spec.ry * R;
    const look = o.look || [0, 0];
    const blink = o.blink || (blinking(t, spec.seed) && !['dizzy', 'shocked', 'laugh', 'happy'].includes(face));
    const ink = col(C.ink);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const lw = R * 0.075;
    [-1, 1].forEach((sd) => {
      const x = sd * ex;
      if (face === 'happy' || face === 'laugh' || face === 'calm') {
        ctx.strokeStyle = ink; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.arc(x, ey + ry * 0.35, rx * 0.95, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
        return;
      }
      if (face === 'dizzy') {
        ctx.strokeStyle = ink; ctx.lineWidth = Math.max(2.5, R * 0.024);
        ctx.beginPath();
        for (let k = 0; k <= 30; k++) { const a = k * 0.55 + t * 9 * sd, r = (k / 30) * rx * 1.05; ctx.lineTo(x + Math.cos(a) * r, ey + Math.sin(a) * r); }
        ctx.stroke();
        return;
      }
      if (face === 'hurt') {
        ctx.strokeStyle = ink; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(x - rx * 0.8 * sd, ey - ry * 0.6); ctx.lineTo(x + rx * 0.6 * sd, ey); ctx.lineTo(x - rx * 0.8 * sd, ey + ry * 0.6); ctx.stroke();
        return;
      }
      if (blink) {
        ctx.strokeStyle = ink; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(x - rx, ey + ry * 0.2); ctx.quadraticCurveTo(x, ey + ry * 0.55, x + rx, ey + ry * 0.2); ctx.stroke();
        return;
      }
      const small = face === 'shocked';
      if (spec.sclera) {
        F.ellipse(ctx, x, ey, rx * (small ? 1.15 : 1), ry * (small ? 1.15 : 1));
        ctx.fillStyle = col('#ffffff');
        ctx.fill();
      }
      // pupil
      const pr = spec.sclera ? (small ? rx * 0.32 : rx * 0.6) : rx;
      const pry = spec.sclera ? (small ? rx * 0.32 : ry * 0.62) : ry;
      const px = x + look[0] * (spec.sclera ? rx * 0.35 : rx * 0.15), py = ey + look[1] * (spec.sclera ? ry * 0.3 : ry * 0.12) + (spec.sclera && !small ? ry * 0.12 : 0);
      F.ellipse(ctx, px, py, pr, pry);
      ctx.fillStyle = ink;
      ctx.fill();
      if (!SIL) {
        ctx.fillStyle = '#ffffff';
        F.ellipse(ctx, px - pr * 0.3, py - pry * 0.35, pr * 0.32, pry * 0.3); ctx.fill();
        if (o.greedy) {
          F.text(ctx, '$', px, py + 2, { size: pry * 1.5, fill: C.up, rounded: false });
        }
      }
      // lids for moods
      const skin = col(spec.skin);
      if (face === 'angry' || face === 'determined' || face === 'smug' || face === 'sad') {
        ctx.save();
        F.ellipse(ctx, x, ey, rx * 1.12, ry * 1.12);
        ctx.clip();
        ctx.fillStyle = skin;
        ctx.beginPath();
        if (face === 'angry' || face === 'determined') {
          // inner corner low
          ctx.moveTo(x - rx * 1.3, ey - ry * 1.3);
          ctx.lineTo(x + rx * 1.3, ey - ry * 1.3);
          ctx.lineTo(x + rx * 1.3 * -sd * -1, ey + (sd > 0 ? -ry * 0.75 : -ry * 0.05) * (face === 'angry' ? 1 : 0.8));
          ctx.lineTo(x - rx * 1.3 * -sd * -1, ey + (sd > 0 ? -ry * 0.05 : -ry * 0.75) * (face === 'angry' ? 1 : 0.8));
        } else if (face === 'smug') {
          ctx.rect(x - rx * 1.3, ey - ry * 1.3, rx * 2.6, ry * 1.25);
        } else {
          // sad: outer corner low
          ctx.moveTo(x - rx * 1.3, ey - ry * 1.3);
          ctx.lineTo(x + rx * 1.3, ey - ry * 1.3);
          ctx.lineTo(x + rx * 1.3, ey + (sd > 0 ? -ry * 0.1 : -ry * 0.7));
          ctx.lineTo(x - rx * 1.3, ey + (sd > 0 ? -ry * 0.7 : -ry * 0.1));
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    });
    // brows
    if (spec.brows) {
      ctx.strokeStyle = ink; ctx.lineWidth = lw * 1.1;
      const by = ey - ry * 1.45;
      [-1, 1].forEach((sd) => {
        let a = 0, dy = 0;
        if (face === 'angry' || face === 'determined') { a = 0.45 * -sd * -1; dy = ry * 0.25; }
        else if (face === 'sad' || face === 'shocked') { a = -0.35 * -sd * -1; dy = face === 'shocked' ? -ry * 0.35 : 0; }
        else if (face === 'smug') { a = sd > 0 ? -0.25 : 0.1; }
        ctx.save();
        ctx.translate(sd * ex, by + dy);
        ctx.rotate(sd > 0 ? a : -a);
        ctx.beginPath(); ctx.moveTo(-rx * 0.85, 0); ctx.quadraticCurveTo(0, -ry * 0.2, rx * 0.85, 0); ctx.stroke();
        ctx.restore();
      });
    }
    ctx.restore();
  }
  function mouth(ctx, R, o, spec) {
    const face = o.face || 'neutral';
    const my = spec.my * R, w = spec.mw * R;
    const t = o.t || 0;
    ctx.save();
    ctx.strokeStyle = col(C.ink);
    ctx.fillStyle = col(spec.mouthFill || C.ink);
    ctx.lineWidth = R * 0.07;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    switch (face) {
      case 'happy': case 'laugh': {
        const open = face === 'laugh' ? 1 + Math.abs(Math.sin(t * 22)) * 0.4 : 1;
        ctx.moveTo(-w, my - w * 0.15);
        ctx.quadraticCurveTo(0, my + w * 1.1 * open, w, my - w * 0.15);
        ctx.closePath();
        ctx.fill();
        if (!SIL) { ctx.fillStyle = '#ff7f96'; F.ellipse(ctx, 0, my + w * 0.45 * open, w * 0.45, w * 0.18 * open); ctx.fill(); }
        break;
      }
      case 'angry': case 'determined':
        ctx.moveTo(-w * 0.8, my + w * 0.2); ctx.quadraticCurveTo(0, my - w * 0.15, w * 0.8, my + w * 0.2); ctx.stroke();
        break;
      case 'shocked':
        F.ellipse(ctx, 0, my + w * 0.2, w * 0.38, w * 0.5); ctx.fill();
        break;
      case 'smug':
        ctx.moveTo(-w * 0.7, my + w * 0.05); ctx.quadraticCurveTo(w * 0.1, my + w * 0.35, w * 0.8, my - w * 0.25); ctx.stroke();
        break;
      case 'sad': case 'hurt':
        ctx.moveTo(-w * 0.6, my + w * 0.3); ctx.quadraticCurveTo(0, my - w * 0.2, w * 0.6, my + w * 0.3); ctx.stroke();
        break;
      case 'dizzy':
        for (let i = 0; i <= 8; i++) ctx.lineTo(-w * 0.7 + i * w * 0.175, my + (i % 2 ? w * 0.12 : -w * 0.12));
        ctx.stroke();
        break;
      case 'calm':
        ctx.moveTo(-w * 0.5, my); ctx.quadraticCurveTo(0, my + w * 0.45, w * 0.5, my); ctx.stroke();
        break;
      default:
        ctx.moveTo(-w * 0.55, my); ctx.quadraticCurveTo(0, my + w * 0.4, w * 0.55, my); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // TIME: clock badge
  // ---------------------------------------------------------------------------
  const timeSpec = { ex: 0.3, ey: 0.12, rx: 0.1, ry: 0.14, my: 0.48, mw: 0.16, sclera: false, brows: false, skin: C.timeFace, seed: 1 };
  function time(ctx, o = {}) {
    const R = 120 * (o.s == null ? 1 : o.s);
    SIL = o.silhouette || null;
    const W = mapper(o, R);
    const anchors = { R, c: [o.x, o.y], top: W(0, -R), bottom: W(0, R), left: W(-R, 0), right: W(R, 0) };
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= clamp(o.alpha);
    if (o.shadow != null && !SIL) {
      ctx.fillStyle = C.shadow;
      F.ellipse(ctx, o.x, o.shadow, R * 0.85 * (o.sx || 1), R * 0.16); ctx.fill();
    }
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot || 0);
    ctx.scale(o.sx || 1, o.sy || 1);
    // drop shadow disc
    if (!SIL) { ctx.fillStyle = 'rgba(27,21,48,0.16)'; F.ellipse(ctx, 0, R * 0.08, R * 1.0, R * 1.0); ctx.fill(); }
    // rim track + remaining-time arc
    const ring = o.ring == null ? 1 : clamp(o.ring);
    F.ellipse(ctx, 0, 0, R, R);
    ctx.fillStyle = col(C.timeTrack);
    ctx.fill();
    if (ring > 0.001) {
      ctx.beginPath();
      const a0 = -Math.PI / 2 + (1 - ring) * TAU, a1 = -Math.PI / 2 + TAU;
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a1);
      ctx.closePath();
      ctx.fillStyle = SIL || F.linGrad(ctx, 0, -R, 0, R, [C.timeCyan, C.timeBlue]);
      ctx.fill();
      if (!SIL && ring < 0.999 && o.crumbs !== false) {
        // bitten edge: little scallops at the start of the arc
        ctx.fillStyle = C.timeTrack;
        for (let k = 0; k < 3; k++) {
          const a = a0 + 0.06 + k * 0.05;
          ctx.beginPath(); ctx.arc(Math.cos(a) * R * (0.9 + k * 0.02), Math.sin(a) * R * (0.9 + k * 0.02), R * 0.09, 0, TAU); ctx.fill();
        }
      }
    }
    // face
    F.ellipse(ctx, 0, 0, R * 0.8, R * 0.8);
    ctx.fillStyle = col(C.timeFace);
    ctx.fill();
    if (!SIL) {
      // ticks
      ctx.strokeStyle = C.timeTick;
      ctx.lineCap = 'round';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        const big = i % 3 === 0;
        ctx.lineWidth = R * (big ? 0.05 : 0.03);
        ctx.beginPath();
        ctx.moveTo(Math.sin(a) * R * (big ? 0.6 : 0.65), -Math.cos(a) * R * (big ? 0.6 : 0.65));
        ctx.lineTo(Math.sin(a) * R * 0.71, -Math.cos(a) * R * 0.71);
        ctx.stroke();
      }
      // hands (10:10 by default) behind the eyes
      const spin = o.spin || 0;
      const ha = (o.hands && o.hands.h != null ? o.hands.h : -Math.PI / 3) + spin * 0.083;
      const ma = (o.hands && o.hands.m != null ? o.hands.m : Math.PI / 3) + spin;
      ctx.strokeStyle = C.timeNavy;
      ctx.lineWidth = R * 0.085;
      ctx.beginPath(); ctx.moveTo(0, -R * 0.05); ctx.lineTo(Math.sin(ha) * R * 0.4, -R * 0.05 - Math.cos(ha) * R * 0.4); ctx.stroke();
      ctx.lineWidth = R * 0.06;
      ctx.beginPath(); ctx.moveTo(0, -R * 0.05); ctx.lineTo(Math.sin(ma) * R * 0.56, -R * 0.05 - Math.cos(ma) * R * 0.56); ctx.stroke();
      ctx.fillStyle = C.timeBlue;
      ctx.beginPath(); ctx.arc(0, -R * 0.05, R * 0.075, 0, TAU); ctx.fill();
      // face
      eyes(ctx, R, o, timeSpec);
      mouth(ctx, R, o, timeSpec);
      if (o.face === 'happy' || o.face === 'laugh' || o.face === 'calm') {
        ctx.fillStyle = 'rgba(255,111,181,0.35)';
        F.ellipse(ctx, -R * 0.46, R * 0.34, R * 0.11, R * 0.065); ctx.fill();
        F.ellipse(ctx, R * 0.46, R * 0.34, R * 0.11, R * 0.065); ctx.fill();
      }
      // gloss
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.ellipse(-R * 0.55, -R * 0.62, R * 0.18, R * 0.08, -0.7, 0, TAU); ctx.fill();
    }
    ctx.restore();
    anchors.eyeL = W(-timeSpec.ex * R, timeSpec.ey * R);
    anchors.eyeR = W(timeSpec.ex * R, timeSpec.ey * R);
    anchors.mouth = W(0, timeSpec.my * R);
    drawGloves(ctx, o, R, W, anchors, [C.timeGlove, C.timeGlove2]);
    ctx.restore();
    SIL = null;
    return anchors;
  }

  // ---------------------------------------------------------------------------
  // БИРЖА: orange squircle with a candle-chart mouth
  // ---------------------------------------------------------------------------
  const bzSpec = { ex: 0.38, ey: -0.3, rx: 0.2, ry: 0.22, my: 0.3, mw: 0.2, sclera: true, brows: true, skin: C.bzOrange, seed: 2 };
  function birzha(ctx, o = {}) {
    const R = 120 * (o.s == null ? 1 : o.s);
    SIL = o.silhouette || null;
    const W = mapper(o, R);
    const t = o.t || 0;
    const jaw = clamp(o.jaw || 0);
    const drop = jaw * R * 0.55;
    const anchors = { R, c: [o.x, o.y], top: W(0, -R), bottom: W(0, R + drop), left: W(-R, 0), right: W(R, 0) };
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= clamp(o.alpha);
    if (o.shadow != null && !SIL) {
      ctx.fillStyle = C.shadow;
      F.ellipse(ctx, o.x, o.shadow, R * 0.9 * (o.sx || 1), R * 0.16); ctx.fill();
    }
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot || 0);
    ctx.scale(o.sx || 1, o.sy || 1);
    const k = 0.42;
    if (!SIL) { ctx.fillStyle = 'rgba(27,21,48,0.16)'; F.rrect(ctx, -R, -R + R * 0.08, R * 2, R * 2 + drop, R * k); ctx.fill(); }
    const grad = SIL || F.linGrad(ctx, 0, -R, 0, R, [C.bzYellow, C.bzOrange, C.bzRed]);
    const splitY = R * 0.02;
    // mouth interior (visible when the jaw drops)
    if (jaw > 0.01) {
      F.rrect(ctx, -R * 0.97, splitY - R * 0.1, R * 1.94, drop + R * 0.4, R * 0.1);
      ctx.fillStyle = col(C.bzMouth);
      ctx.fill();
    }
    // upper part
    ctx.save();
    ctx.beginPath(); ctx.rect(-R * 1.2, -R * 1.2, R * 2.4, R * 1.2 + splitY); ctx.clip();
    F.rrect(ctx, -R, -R, R * 2, R * 2, R * k);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
    // lower jaw
    ctx.save();
    ctx.translate(0, drop);
    ctx.beginPath(); ctx.rect(-R * 1.2, splitY, R * 2.4, R * 1.3); ctx.clip();
    F.rrect(ctx, -R, -R, R * 2, R * 2, R * k);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
    if (!SIL) {
      // the candle chart: closed = the logo's chart; open = teeth standing on the lower jaw
      const hs = o.candles || [0.55 + 0.12 * Math.sin(t * 5), 0.35 + 0.1 * Math.sin(t * 6 + 1), 0.75 + 0.12 * Math.sin(t * 4.3 + 2)];
      const cols = ['#33e08a', '#ff5a6e', '#33e08a'];
      const baseY = R * 0.74 + drop;
      const cw = R * 0.22;
      F.rrect(ctx, -R * 0.74, R * 0.1 + drop, R * 1.48, R * 0.72, R * 0.18);
      ctx.fillStyle = C.bzMouth;
      ctx.fill();
      [-1, 0, 1].forEach((i, n) => {
        const cx = i * R * 0.42;
        const h = R * (0.14 + hs[n] * 0.36);
        const top = baseY - h;
        ctx.strokeStyle = cols[n];
        ctx.lineWidth = R * 0.045;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx, top - R * 0.07); ctx.lineTo(cx, baseY + R * 0.04); ctx.stroke();
        F.rrect(ctx, cx - cw / 2, top, cw, h, R * 0.045);
        ctx.fillStyle = cols[n];
        ctx.fill();
      });
      eyes(ctx, R, o, bzSpec);
      if (o.face === 'happy' || o.face === 'laugh' || o.face === 'smug') {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        F.ellipse(ctx, -R * 0.62, -R * 0.02, R * 0.12, R * 0.07); ctx.fill();
        F.ellipse(ctx, R * 0.62, -R * 0.02, R * 0.12, R * 0.07); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.ellipse(-R * 0.6, -R * 0.8, R * 0.2, R * 0.07, -0.35, 0, TAU); ctx.fill();
    }
    ctx.restore();
    anchors.eyeL = W(-bzSpec.ex * R, bzSpec.ey * R);
    anchors.eyeR = W(bzSpec.ex * R, bzSpec.ey * R);
    anchors.mouth = W(0, splitY + drop * 0.5);
    drawGloves(ctx, o, R, W, anchors, [C.bzGlove, C.bzGlove2]);
    ctx.restore();
    SIL = null;
    return anchors;
  }

  // ---------------------------------------------------------------------------
  // LiquidityScan
  // ---------------------------------------------------------------------------
  /**
   * lsMark(ctx, o{ x, y, s, rot, alpha, glow (0..1), candles: [h1,h2,h3] 0..1, dark (dark tile) }):
   * the app mark: rounded light tile, green "L", three green candlesticks, slate "S". 240 px at s=1.
   */
  function lsMark(ctx, o = {}) {
    const R = 120 * (o.s == null ? 1 : o.s);
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= clamp(o.alpha);
    ctx.translate(o.x, o.y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(o.sx || 1, o.sy || 1);
    if (o.glow) {
      ctx.fillStyle = F.radGrad(ctx, 0, 0, R * 0.6, R * 2.2, [[0, `rgba(31,227,60,${0.45 * o.glow})`], [1, 'rgba(31,227,60,0)']]);
      ctx.beginPath(); ctx.arc(0, 0, R * 2.2, 0, TAU); ctx.fill();
    }
    F.dropShadow(ctx, (c) => {
      F.rrect(c, -R, -R, R * 2, R * 2, R * 0.42);
      c.fillStyle = o.dark ? F.linGrad(c, 0, -R, 0, R, [C.lsTealB, C.lsTealA]) : F.linGrad(c, -R, -R, R, R, ['#ffffff', '#e3eaee']);
      c.fill();
    }, { dy: R * 0.08, blur: R * 0.25, color: 'rgba(19,40,58,0.25)' });
    if (!o.dark) { F.rrect(ctx, -R, -R, R * 2, R * 2, R * 0.42); ctx.strokeStyle = 'rgba(19,40,58,0.08)'; ctx.lineWidth = R * 0.02; ctx.stroke(); }
    const sz = R * 0.95;
    // L
    F.text(ctx, 'L', -R * 0.5, R * 0.04, { size: sz, fill: C.lsGreenDark, font: 'sans', weight: 700, rounded: false });
    // S
    F.text(ctx, 'S', R * 0.52, R * 0.04, { size: sz, fill: o.dark ? '#e8eef2' : C.lsSlate, font: 'sans', weight: 700, rounded: false });
    // three candles between
    const hs = o.candles || [0.75, 1, 0.6];
    [-1, 0, 1].forEach((i, n) => {
      const cx = i * R * 0.13;
      const h = R * 0.62 * hs[n];
      const cy = R * 0.04;
      ctx.strokeStyle = C.lsGreenDark;
      ctx.lineWidth = R * 0.03;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, cy - h * 0.7); ctx.lineTo(cx, cy + h * 0.7); ctx.stroke();
      F.rrect(ctx, cx - R * 0.045, cy - h * 0.45, R * 0.09, h * 0.9, R * 0.03);
      ctx.fillStyle = n === 1 ? C.lsGreen : '#2fbf4f';
      ctx.fill();
    });
    ctx.restore();
    return { R, c: [o.x, o.y] };
  }

  /**
   * lsWordmark(ctx, x, y, size, o{ align, style: 'two-tone' | 'candles', dark, alpha, scale }):
   * "LiquidityScan" (Liquidity in ink, Scan in slate) or the app header "Liqui|||Scan" with the
   * green candle glyph. Centred by default. Returns the width.
   */
  function lsWordmark(ctx, x, y, size, o = {}) {
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= clamp(o.alpha);
    const dark = !!o.dark;
    if (o.style === 'candles') {
      const a = 'Liqui', b = 'Scan';
      const wa = F.measure(ctx, a, size, 'sans'), wb = F.measure(ctx, b, size, 'sans');
      const gw = size * 0.55;
      const total = wa + gw + wb;
      let cx = o.align === 'left' ? x : x - total / 2;
      F.text(ctx, a, cx + wa / 2, y, { size, fill: C.lsGreenDark, font: 'sans', rounded: false });
      cx += wa;
      [0.7, 1, 0.55].forEach((h, n) => {
        const px = cx + gw * (0.2 + n * 0.3);
        ctx.strokeStyle = C.lsGreenDark; ctx.lineWidth = size * 0.05; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(px, y - size * 0.5 * h); ctx.lineTo(px, y + size * 0.42 * h); ctx.stroke();
        F.rrect(ctx, px - size * 0.07, y - size * 0.32 * h, size * 0.14, size * 0.6 * h, size * 0.04);
        ctx.fillStyle = n === 1 ? C.lsGreen : '#2fbf4f'; ctx.fill();
      });
      cx += gw;
      F.text(ctx, b, cx + wb / 2, y, { size, fill: dark ? '#ffffff' : C.lsInk, font: 'sans', rounded: false });
      ctx.restore();
      return total;
    }
    const a = 'Liquidity', b = 'Scan';
    const wa = F.measure(ctx, a, size, 'sans') - size * 0.07, wb = F.measure(ctx, b, size, 'sans') - size * 0.07;
    const total = wa + wb;
    const x0 = o.align === 'left' ? x : x - total / 2;
    F.text(ctx, a, x0, y, { size, fill: dark ? '#ffffff' : C.lsInk, font: 'sans', rounded: false, align: 'left' });
    F.text(ctx, b, x0 + wa, y, { size, fill: dark ? C.lsGreen : C.lsSlate, font: 'sans', rounded: false, align: 'left' });
    ctx.restore();
    return total;
  }

  /** wordmark(ctx, who 'time'|'birzha', x, y, size, o{ align, alpha, scale, color }): the two name logos. */
  function wordmark(ctx, who, x, y, size, o = {}) {
    if (who === 'time') {
      return F.text(ctx, 'Time', x, y, { size, fill: o.color || C.timeBlue, align: o.align, alpha: o.alpha, scale: o.scale, letter: -size * 0.02 });
    }
    return F.text(ctx, 'биржа', x, y, { size, fill: o.color || C.bzOrange, align: o.align, alpha: o.alpha, scale: o.scale, letter: -size * 0.02 });
  }

  FILM.cast = Object.freeze({ time, birzha, lsMark, lsWordmark, wordmark, glove });
})();
