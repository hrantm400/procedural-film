/*
 * cast.js : the recurring characters of "Hayk: The Burger Quest". Loaded after src/props.js.
 *
 * NEVER redraw a character inside a scene file. Call these, pick a pose and a face from the lists
 * below, and hang props off the returned anchors.
 *
 *   FILM.cast.hayk(ctx, o)   trader, founder of LiquidityScan. ~560 px tall at s = 1.
 *   FILM.cast.grant(ctx, o)  Hayk's friend who dog-sits. ~610 px tall at s = 1.
 *   FILM.cast.goofy(ctx, o)  Hayk's small ginger dog. ~230 px tall, ~300 px long at s = 1.
 *
 * Common options:
 *   x, y     world position of the feet on the ground (origin), y is the ground line
 *   s        scale (1 = full size above)
 *   flip     mirror horizontally (humans face the camera; flip mirrors which hand does what;
 *            Goofy faces RIGHT by default, flip: true faces left)
 *   tilt     rotate the whole figure around its feet (radians)
 *   t        local time in seconds (drives walk/run cycles, blinking, hair/ear sway). Pass shot t.
 *   pose     see each character
 *   face     see each character
 *   alpha    overall opacity
 *   look     [-1..1, -1..1] pupil direction for faces with open eyes
 *   blink    true forces closed eyes (auto-blink happens from t otherwise)
 *   silhouette  a colour: draw the whole figure flat in that colour (impact frames, backlight)
 *
 * Human-only:
 *   belly    0..1 how many burgers have been eaten (0 = slim, 1 = very round). Hayk grows from
 *            ~0 (start) to 0.8 (end of Spain).
 *   shades   true: sunglasses (Hayk)
 *   crown    true: Burger Kong paper crown
 *   hold     'burger' | 'drumstick' | 'phone' | 'fries' | 'leash' | null : draws the item in the
 *            right hand (screen-right hand, or screen-left when flipped)
 *   holdL    same for the other hand
 *   bite     0..1 bite state for a held burger/drumstick
 *
 * Returned anchors (world coordinates): { head, top, mouth, eyeL, eyeR, handL, handR, chest, hip,
 *   collar (goofy), nose (goofy), tail (goofy) } — each [x, y].
 *
 * Human poses: stand, walk, run, sit, fist, point, give, thumbsUp, peace, eat, eatBig, cheer, float,
 *   kneel, pulled, hug, collapse, phone, shrug, armsCrossed
 * Human faces: neutral, smile, happy, ecstatic, determined, focused, shocked, sad, cry, panic, smug,
 *   chewing, nervous, calm, exhausted, confident, angry
 * Goofy poses: sit, stand, walk, run, bark, howl, jump, lie
 * Goofy faces: neutral, happy, sad, angry, cry, shocked
 */
(function () {
  'use strict';

  const FILM = window.FILM;
  const L = FILM.lib;
  const F = FILM.fx;
  const C = F.pal;
  const TAU = Math.PI * 2;
  const clamp = F.clamp, lerp = F.lerp;
  const { ellipse, fo, curve, poly, rrect } = F;
  const LW = 6; // outline width at s = 1

  // Silhouette mode: every fill becomes one colour and outlines match it.
  let SIL = null;
  const col = (c) => (SIL ? SIL : c);
  function fill(ctx, c, lw = LW) {
    fo(ctx, col(c), lw, SIL ? SIL : C.line);
  }

  /** draws a two-segment limb as an outlined tube; returns the end point */
  function tube(ctx, pts, w, color) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = SIL || C.line;
    ctx.lineWidth = w + LW * 2;
    ctx.stroke();
    ctx.strokeStyle = col(color);
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.restore();
  }
  const dirPt = (p, a, len) => [p[0] + Math.sin(a) * len, p[1] + Math.cos(a) * len];

  // auto blink: closed for 2 frames every ~3.3 s, phase from seed
  const blinking = (t, seed) => {
    if (t == null) return false;
    const per = 3.3 + (seed % 7) * 0.13;
    const u = ((t + (seed % 11) * 0.37) % per + per) % per;
    return u < 0.09;
  };

  // ---------------------------------------------------------------------------
  // Hands
  // ---------------------------------------------------------------------------
  /** hand at p, pointing along angle a (0 = down). kind: open | fist | point | thumb | peace | hold */
  function hand(ctx, p, a, kind, skin, r = 19) {
    ctx.save();
    ctx.translate(p[0], p[1]);
    ctx.rotate(-a);
    // palm
    ellipse(ctx, 0, 4, r, r * 1.05);
    fill(ctx, skin, LW * 0.8);
    ctx.lineWidth = LW * 0.6;
    ctx.strokeStyle = SIL || C.line;
    ctx.lineCap = 'round';
    if (kind === 'point') {
      ctx.save();
      ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, 44);
      ctx.strokeStyle = SIL || C.line; ctx.lineWidth = 14 + LW; ctx.stroke();
      ctx.strokeStyle = col(skin); ctx.lineWidth = 14; ctx.stroke();
      ctx.restore();
    } else if (kind === 'thumb') {
      ctx.save();
      ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-6, -34);
      ctx.strokeStyle = SIL || C.line; ctx.lineWidth = 14 + LW; ctx.stroke();
      ctx.strokeStyle = col(skin); ctx.lineWidth = 14; ctx.stroke();
      ctx.restore();
    } else if (kind === 'peace') {
      ctx.save();
      [[-7, -0.25], [7, 0.25]].forEach(([ox, ang]) => {
        ctx.beginPath(); ctx.moveTo(ox, 10); ctx.lineTo(ox + Math.sin(ang) * 40, 10 + Math.cos(ang) * 40);
        ctx.strokeStyle = SIL || C.line; ctx.lineWidth = 12 + LW; ctx.stroke();
        ctx.strokeStyle = col(skin); ctx.lineWidth = 12; ctx.stroke();
      });
      ctx.restore();
    } else if (kind === 'open') {
      ctx.beginPath(); ctx.moveTo(-8, 16); ctx.lineTo(-8, 22); ctx.moveTo(0, 18); ctx.lineTo(0, 24); ctx.moveTo(8, 16); ctx.lineTo(8, 22); ctx.stroke();
    } else {
      // fist / hold: knuckle line
      ctx.beginPath(); ctx.arc(0, 8, r * 0.6, 0.3, Math.PI - 0.3); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Human poses: angles measured from straight down, positive swings the end to screen right.
  //   arms: [upper, lowerRelative], legs: [thigh, shinRelative]
  //   lean: torso rotation, hipY: extra hip offset (+ = down), hands: [left kind, right kind]
  // ---------------------------------------------------------------------------
  function humanPose(pose, t) {
    const P = {
      aL: [0.18, -0.12], aR: [-0.18, 0.12], lL: [0.04, 0], lR: [-0.04, 0], lean: 0, hipY: 0,
      hands: ['open', 'open'], head: 0, mouthOpen: 0, sit: false, kneel: false,
    };
    const ph = (t || 0) * Math.PI * 2;
    switch (pose) {
      case 'walk': {
        const s = Math.sin(ph * 1.0);
        P.aL = [0.2 + s * 0.35, -0.25]; P.aR = [-0.2 + s * 0.35, 0.25];
        P.lL = [0.06 - s * 0.3, Math.max(0, s) * 0.5]; P.lR = [-0.06 + s * 0.3, Math.max(0, -s) * 0.5];
        P.hipY = -Math.abs(Math.cos(ph)) * 10 + 5;
        P.hands = ['fist', 'fist'];
        break;
      }
      case 'run': {
        const s = Math.sin(ph * 1.4);
        P.aL = [0.5 + s * 0.8, -1.5]; P.aR = [-0.5 + s * 0.8, 1.5];
        P.lL = [0.1 - s * 0.6, 0.2 + Math.max(0, s) * 1.1]; P.lR = [-0.1 + s * 0.6, 0.2 + Math.max(0, -s) * 1.1];
        P.hipY = -Math.abs(Math.cos(ph * 1.4)) * 26 + 8;
        P.lean = 0.12;
        P.hands = ['fist', 'fist'];
        break;
      }
      case 'sit':
        P.sit = true; P.hipY = 105; P.aL = [0.35, -0.9]; P.aR = [-0.35, 0.9]; P.hands = ['open', 'open'];
        break;
      case 'fist':
        P.aL = [0.5, -0.3]; P.aR = [-2.55, -0.9]; P.lL = [0.22, -0.05]; P.lR = [-0.22, 0.05]; P.hands = ['fist', 'fist']; P.head = -0.05;
        break;
      case 'point':
        P.aL = [0.18, -0.12]; P.aR = [-1.62, 0.1]; P.lL = [0.12, 0]; P.lR = [-0.12, 0]; P.hands = ['fist', 'point']; P.lean = -0.04;
        break;
      case 'give':
        P.aL = [0.2, -0.1]; P.aR = [-1.2, -0.25]; P.hands = ['open', 'fist']; P.lean = -0.05;
        break;
      case 'thumbsUp':
        P.aL = [0.18, -0.12]; P.aR = [-0.35, -2.1]; P.hands = ['open', 'thumb'];
        break;
      case 'peace':
        P.aL = [0.3, -0.1]; P.aR = [-0.7, -2.5]; P.lL = [0.14, 0]; P.lR = [-0.14, 0]; P.hands = ['fist', 'peace']; P.head = 0.08;
        break;
      case 'eat':
        P.aL = [0.55, 2.2]; P.aR = [-0.55, -2.2]; P.hands = ['hold', 'hold'];
        break;
      case 'eatBig':
        P.aL = [0.75, 1.95]; P.aR = [-0.75, -1.95]; P.hands = ['hold', 'hold']; P.lL = [0.12, 0]; P.lR = [-0.12, 0];
        break;
      case 'cheer':
        P.aL = [2.5, 0.2]; P.aR = [-2.5, -0.2]; P.lL = [0.16, 0]; P.lR = [-0.16, 0]; P.hands = ['open', 'open']; P.head = -0.06;
        break;
      case 'float': {
        const s = Math.sin(ph * 0.5);
        P.aL = [1.2 + s * 0.12, 0.4]; P.aR = [-1.2 - s * 0.12, -0.4]; P.lL = [0.25, -0.5]; P.lR = [-0.1, 0.7]; P.hands = ['open', 'open']; P.head = -0.1;
        break;
      }
      case 'kneel':
        P.kneel = true; P.hipY = 95; P.aL = [0.35, -0.3]; P.aR = [-0.9, -0.5]; P.hands = ['open', 'open'];
        break;
      case 'pulled': {
        const s = Math.sin(ph * 3);
        P.aL = [-2.9, 0.1]; P.aR = [-2.7, -0.1]; P.lL = [0.3 + s * 0.4, 0.3]; P.lR = [-0.3 - s * 0.4, 0.5]; P.hands = ['fist', 'fist'];
        break;
      }
      case 'hug':
        P.aL = [0.5, -2.1]; P.aR = [-0.5, 2.1]; P.hands = ['open', 'open']; P.lL = [0.1, 0]; P.lR = [-0.1, 0];
        break;
      case 'collapse':
        P.aL = [2.2, 0.3]; P.aR = [-2.2, -0.3]; P.lL = [0.25, 0]; P.lR = [-0.25, 0]; P.hands = ['open', 'open'];
        break;
      case 'phone':
        P.aL = [0.18, -0.12]; P.aR = [-0.45, -2.0]; P.hands = ['open', 'hold'];
        break;
      case 'shrug':
        P.aL = [1.1, -1.9]; P.aR = [-1.1, 1.9]; P.hands = ['open', 'open']; P.head = 0.1;
        break;
      case 'armsCrossed':
        P.aL = [0.5, 1.9]; P.aR = [-0.5, -1.9]; P.hands = ['fist', 'fist'];
        break;
      default:
        break;
    }
    return P;
  }

  // ---------------------------------------------------------------------------
  // Faces (shared by Hayk and Grant). Drawn in head-local coords: head centre (0,0), rx ~ 64.
  // ---------------------------------------------------------------------------
  function eyeOpen(ctx, ex, ey, o) {
    const w = o.w || 25, h = o.h || 30;
    const iris = o.iris;
    // white
    ctx.beginPath();
    ctx.ellipse(ex, ey, w, h, 0, 0, TAU);
    fill(ctx, C.eyeWhite, 0);
    if (!SIL) {
      // iris + pupil
      const lx = (o.look ? o.look[0] : 0) * w * 0.35, ly = (o.look ? o.look[1] : 0) * h * 0.3;
      const ir = o.small ? w * 0.28 : w * 0.72;
      ctx.save();
      ctx.beginPath(); ctx.ellipse(ex, ey, w, h, 0, 0, TAU); ctx.clip();
      ctx.fillStyle = iris;
      ctx.beginPath(); ctx.ellipse(ex + lx, ey + ly + 2, ir, ir * 1.18, 0, 0, TAU); ctx.fill();
      if (!o.small) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath(); ctx.ellipse(ex + lx, ey + ly + ir * 0.55, ir * 0.8, ir * 0.45, 0, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#120d18';
      ctx.beginPath(); ctx.ellipse(ex + lx, ey + ly + 2, ir * 0.45, ir * 0.55, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(ex + lx - ir * 0.35, ey + ly - ir * 0.4, ir * 0.32, ir * 0.38, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + lx + ir * 0.35, ey + ly + ir * 0.45, ir * 0.14, 0, TAU); ctx.fill();
      if (o.watery) {
        ctx.fillStyle = 'rgba(143,216,255,0.55)';
        ctx.beginPath(); ctx.ellipse(ex, ey + h * 0.55, w, h * 0.5, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(ex - w * 0.4, ey + h * 0.35, 3.5, 0, TAU); ctx.arc(ex + w * 0.2, ey + h * 0.5, 2.5, 0, TAU); ctx.fill();
      }
      if (o.glow) {
        ctx.fillStyle = o.glow;
        ctx.beginPath(); ctx.ellipse(ex, ey, w, h, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff2c0';
        ctx.beginPath(); ctx.ellipse(ex, ey, w * 0.25, h * 0.5, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    // lids
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = SIL || C.line;
    ctx.lineWidth = 7;
    const lid = o.lid || 0; // 0 open .. 1 half closed (heavy lid)
    ctx.beginPath();
    ctx.ellipse(ex, ey, w + 1, h + 1, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    if (lid > 0) {
      ctx.fillStyle = col(o.skin);
      ctx.beginPath();
      ctx.rect(ex - w - 3, ey - h - 4, w * 2 + 6, h * 2 * lid * 0.55 + 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(ex - w - 2, ey - h + h * 2 * lid * 0.55);
      ctx.lineTo(ex + w + 2, ey - h + h * 2 * lid * 0.55 + (o.lidTilt || 0));
      ctx.stroke();
    }
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(ex, ey, w, h, 0, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.restore();
  }
  function eyeClosed(ctx, ex, ey, kind, w = 22) {
    ctx.save();
    ctx.strokeStyle = SIL || C.line;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (kind === 'happy') { ctx.moveTo(ex - w, ey + 6); ctx.quadraticCurveTo(ex, ey - 22, ex + w, ey + 6); }
    else if (kind === 'tight') { ctx.moveTo(ex - w, ey - 10); ctx.lineTo(ex + w * 0.2, ey); ctx.lineTo(ex - w, ey + 10); }
    else if (kind === 'tightR') { ctx.moveTo(ex + w, ey - 10); ctx.lineTo(ex - w * 0.2, ey); ctx.lineTo(ex + w, ey + 10); }
    else if (kind === 'x') { ctx.moveTo(ex - 14, ey - 14); ctx.lineTo(ex + 14, ey + 14); ctx.moveTo(ex + 14, ey - 14); ctx.lineTo(ex - 14, ey + 14); }
    else if (kind === 'spiral') {
      for (let k = 0; k <= 40; k++) { const a = k * 0.45, r = 1 + k * 0.5; const px = ex + Math.cos(a) * r, py = ey + Math.sin(a) * r; if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    } else { ctx.moveTo(ex - w, ey); ctx.quadraticCurveTo(ex, ey + 12, ex + w, ey); }
    ctx.stroke();
    ctx.restore();
  }
  function brow(ctx, x, y, ang, len = 30, th = 8, color = C.line) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.strokeStyle = SIL || color;
    ctx.lineWidth = th;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-len / 2, 0); ctx.quadraticCurveTo(0, -5, len / 2, 0); ctx.stroke();
    ctx.restore();
  }
  function mouth(ctx, kind, my, o = {}) {
    ctx.save();
    ctx.strokeStyle = SIL || C.line;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const k = o.chew ? Math.abs(Math.sin((o.t || 0) * 14)) : 0;
    switch (kind) {
      case 'smile':
        ctx.beginPath(); ctx.moveTo(-16, my - 3); ctx.quadraticCurveTo(0, my + 10, 16, my - 3); ctx.stroke(); break;
      case 'grin':
        ctx.beginPath(); ctx.moveTo(-24, my - 6); ctx.quadraticCurveTo(0, my + 26, 24, my - 6); ctx.closePath(); fill(ctx, '#ffffff', 5);
        ctx.beginPath(); ctx.moveTo(-22, my); ctx.lineTo(22, my); ctx.lineWidth = 3; ctx.stroke(); break;
      case 'open':
        ctx.beginPath(); ctx.ellipse(0, my + 4, 12, 16, 0, 0, TAU); fill(ctx, '#7a1f2b', 5); break;
      case 'shout':
        ctx.beginPath(); ctx.moveTo(-30, my - 10); ctx.lineTo(30, my - 10); ctx.quadraticCurveTo(28, my + 40, 0, my + 42); ctx.quadraticCurveTo(-28, my + 40, -30, my - 10); ctx.closePath();
        fill(ctx, '#7a1f2b', 5);
        if (!SIL) { ctx.fillStyle = '#ff7a8a'; ctx.beginPath(); ctx.ellipse(0, my + 30, 16, 9, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-26, my - 8, 52, 9); }
        break;
      case 'wavy':
        ctx.beginPath(); for (let i = 0; i <= 8; i++) ctx.lineTo(-20 + i * 5, my + (i % 2 ? 4 : -3)); ctx.stroke(); break;
      case 'smirk':
        ctx.beginPath(); ctx.moveTo(-14, my + 2); ctx.quadraticCurveTo(6, my + 6, 18, my - 8); ctx.stroke(); break;
      case 'frown':
        ctx.beginPath(); ctx.moveTo(-14, my + 6); ctx.quadraticCurveTo(0, my - 6, 14, my + 6); ctx.stroke(); break;
      case 'cat':
        ctx.beginPath(); ctx.moveTo(-16, my - 2); ctx.quadraticCurveTo(-8, my + 8, 0, my); ctx.quadraticCurveTo(8, my + 8, 16, my - 2); ctx.stroke(); break;
      case 'chew':
        ctx.beginPath(); ctx.ellipse(0, my + 2, 14, 4 + k * 6, 0, 0, TAU); fill(ctx, '#7a1f2b', 5); break;
      case 'flat':
        ctx.beginPath(); ctx.moveTo(-12, my); ctx.lineTo(12, my); ctx.stroke(); break;
      case 'drool':
        ctx.beginPath(); ctx.moveTo(-22, my - 4); ctx.quadraticCurveTo(0, my + 24, 22, my - 4); ctx.closePath(); fill(ctx, '#7a1f2b', 5);
        if (!SIL) { ctx.fillStyle = '#bfe9ff'; ctx.beginPath(); ctx.ellipse(14, my + 22, 5, 12, 0, 0, TAU); ctx.fill(); }
        break;
      default:
        ctx.beginPath(); ctx.moveTo(-10, my); ctx.quadraticCurveTo(0, my + 4, 10, my); ctx.stroke();
    }
    ctx.restore();
  }

  /** draws the face; spec per character: { iris, skin, eyeY, eyeDX, mouthY, browColor } */
  function face(ctx, name, spec, o, t) {
    const ey = spec.eyeY, dx = spec.eyeDX, my = spec.mouthY;
    const blink = o.blink || blinking(t, spec.seed);
    const look = o.look;
    const E = (open) => {
      if (blink && open && name !== 'shocked') { eyeClosed(ctx, -dx, ey, 'line'); eyeClosed(ctx, dx, ey, 'line'); return; }
      eyeOpen(ctx, -dx, ey, Object.assign({ iris: spec.iris, look, skin: spec.skin }, open));
      eyeOpen(ctx, dx, ey, Object.assign({ iris: spec.iris, look, skin: spec.skin }, open, { lidTilt: open.lidTilt ? -open.lidTilt : 0 }));
    };
    const blush = (a = 0.55) => {
      if (SIL) return;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = C.blush;
      ctx.beginPath(); ctx.ellipse(-dx - 8, ey + 34, 18, 8, 0, 0, TAU); ctx.ellipse(dx + 8, ey + 34, 18, 8, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(214,80,80,0.8)'; ctx.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-dx - 18 + i * 9, ey + 38); ctx.lineTo(-dx - 13 + i * 9, ey + 30); ctx.moveTo(dx - 2 + i * 9, ey + 38); ctx.lineTo(dx + 3 + i * 9, ey + 30); ctx.stroke(); }
      ctx.restore();
    };
    const bc = spec.browColor;
    const by = ey - 36;
    switch (name) {
      case 'smile':
        brow(ctx, -dx, by, 0.05, 30, 8, bc); brow(ctx, dx, by, -0.05, 30, 8, bc);
        E({}); mouth(ctx, 'smile', my); break;
      case 'happy':
        brow(ctx, -dx, by - 4, 0.1, 30, 8, bc); brow(ctx, dx, by - 4, -0.1, 30, 8, bc);
        eyeClosed(ctx, -dx, ey, 'happy'); eyeClosed(ctx, dx, ey, 'happy'); blush(0.5);
        mouth(ctx, o.chewing ? 'chew' : 'grin', my, { chew: true, t }); break;
      case 'ecstatic':
        brow(ctx, -dx, by - 8, 0.2, 30, 8, bc); brow(ctx, dx, by - 8, -0.2, 30, 8, bc);
        eyeClosed(ctx, -dx, ey, 'happy'); eyeClosed(ctx, dx, ey, 'happy'); blush(0.85);
        mouth(ctx, 'drool', my);
        if (!SIL) { F.sparkle(ctx, -dx - 30, ey - 30, 16); F.sparkle(ctx, dx + 34, ey - 20, 12); }
        break;
      case 'determined':
        brow(ctx, -dx, by + 6, 0.35, 34, 10, bc); brow(ctx, dx, by + 6, -0.35, 34, 10, bc);
        E({ lid: 0.3, lidTilt: 8, h: 22 }); mouth(ctx, o.mouth || 'flat', my); break;
      case 'focused':
        brow(ctx, -dx, by + 4, 0.15, 30, 8, bc); brow(ctx, dx, by + 4, -0.15, 30, 8, bc);
        E({ lid: 0.45, h: 22 }); mouth(ctx, 'flat', my); break;
      case 'shocked':
        brow(ctx, -dx, by - 14, -0.15, 30, 8, bc); brow(ctx, dx, by - 14, 0.15, 30, 8, bc);
        E({ small: true, w: 24, h: 30 }); mouth(ctx, 'open', my + 2);
        if (!SIL) { ctx.save(); ctx.strokeStyle = 'rgba(80,90,170,0.7)'; ctx.lineWidth = 4; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-40 + i * 20, -62); ctx.lineTo(-40 + i * 20, -30); ctx.stroke(); } ctx.restore(); }
        break;
      case 'sad':
        brow(ctx, -dx, by, -0.35, 30, 8, bc); brow(ctx, dx, by, 0.35, 30, 8, bc);
        E({ watery: true }); mouth(ctx, 'frown', my); break;
      case 'cry':
        brow(ctx, -dx, by, -0.4, 30, 8, bc); brow(ctx, dx, by, 0.4, 30, 8, bc);
        eyeClosed(ctx, -dx, ey, 'tight'); eyeClosed(ctx, dx, ey, 'tightR');
        mouth(ctx, o.mouth || 'shout', my - 4); break;
      case 'panic':
        brow(ctx, -dx, by - 10, -0.3, 30, 8, bc); brow(ctx, dx, by - 10, 0.3, 30, 8, bc);
        eyeClosed(ctx, -dx, ey, 'spiral'); eyeClosed(ctx, dx, ey, 'spiral'); mouth(ctx, 'shout', my - 4); break;
      case 'smug':
        brow(ctx, -dx, by - 2, 0.1, 30, 8, bc); brow(ctx, dx, by - 8, -0.25, 30, 8, bc);
        E({ lid: 0.55, h: 22 }); mouth(ctx, 'smirk', my); break;
      case 'chewing':
        brow(ctx, -dx, by - 4, 0.1, 30, 8, bc); brow(ctx, dx, by - 4, -0.1, 30, 8, bc);
        eyeClosed(ctx, -dx, ey, 'happy'); eyeClosed(ctx, dx, ey, 'happy'); blush(0.6);
        mouth(ctx, 'chew', my, { chew: true, t }); break;
      case 'nervous':
        brow(ctx, -dx, by - 6, -0.3, 30, 8, bc); brow(ctx, dx, by - 6, 0.3, 30, 8, bc);
        E({ small: true, w: 22, h: 26 }); mouth(ctx, 'wavy', my); break;
      case 'calm':
        brow(ctx, -dx, by - 2, 0.05, 30, 8, bc); brow(ctx, dx, by - 2, -0.05, 30, 8, bc);
        eyeClosed(ctx, -dx, ey + 4, 'happy'); eyeClosed(ctx, dx, ey + 4, 'happy'); mouth(ctx, 'smile', my); break;
      case 'exhausted':
        brow(ctx, -dx, by + 2, -0.2, 30, 8, bc); brow(ctx, dx, by + 2, 0.2, 30, 8, bc);
        E({ lid: 0.7, h: 22, small: true });
        if (!SIL) { ctx.save(); ctx.strokeStyle = 'rgba(110,80,150,0.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-dx, ey + 18, 16, 0.2, Math.PI - 0.2); ctx.arc(dx, ey + 18, 16, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.restore(); }
        mouth(ctx, 'wavy', my); break;
      case 'confident':
        brow(ctx, -dx, by - 2, 0.1, 30, 8, bc); brow(ctx, dx, by - 6, -0.2, 30, 8, bc);
        eyeOpen(ctx, -dx, ey, { iris: spec.iris, look, skin: spec.skin, lid: 0.25 });
        eyeClosed(ctx, dx, ey, 'happy'); mouth(ctx, 'grin', my); break;
      case 'angry':
        brow(ctx, -dx, by + 8, 0.45, 34, 11, bc); brow(ctx, dx, by + 8, -0.45, 34, 11, bc);
        E({ lid: 0.35, lidTilt: 10, small: true, h: 22 }); mouth(ctx, 'shout', my - 4);
        if (!SIL) F.vein(ctx, dx + 30, -70, 0.9);
        break;
      default:
        brow(ctx, -dx, by, 0.05, 30, 8, bc); brow(ctx, dx, by, -0.05, 30, 8, bc);
        E({}); mouth(ctx, o.mouth || 'neutral', my);
    }
  }

  // ---------------------------------------------------------------------------
  // Human body (shared by Hayk and Grant), style decides colours and hair
  // ---------------------------------------------------------------------------
  function human(ctx, o, style) {
    const t = o.t || 0;
    const pose = o.pose || 'stand';
    const P = humanPose(pose, t * (style.cycle || 1));
    const s = (o.s == null ? 1 : o.s) * style.scale;
    const belly = clamp(o.belly || 0);
    SIL = o.silhouette || null;
    const anchors = {};
    const sgn = o.flip ? -1 : 1;
    let tilt = o.tilt || 0;
    if (pose === 'pulled') tilt += -1.35 * sgn;
    if (pose === 'collapse') tilt += 1.5708 * sgn;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const W = (lx, ly) => {
      const xx = lx * sgn * s, yy = ly * s;
      return [o.x + xx * ct - yy * st, o.y + xx * st + yy * ct];
    };
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= clamp(o.alpha);
    ctx.translate(o.x, o.y);
    ctx.rotate(tilt);
    ctx.scale(sgn * s, s);
    if (pose === 'collapse') ctx.translate(0, -60);

    const hipY = -206 + P.hipY;
    const hipW = 34 + belly * 14;
    const shoulderY = -378 + P.hipY;
    const shW = style.shoulder + belly * 10;
    const armW = style.armW + belly * 5, legW = style.legW + belly * 8;
    const UA = 94, FA = 88, TH = 100, SH = 98;

    // ground shadow
    if (!SIL && pose !== 'pulled' && pose !== 'float' && pose !== 'collapse') {
      ctx.save();
      ctx.fillStyle = 'rgba(20,10,40,0.18)';
      ellipse(ctx, 0, 4, 90 + belly * 30, 16); ctx.fill();
      ctx.restore();
    }

    // --- legs
    const legs = [];
    [[-1, P.lL], [1, P.lR]].forEach(([side, ang]) => {
      const hip = [side * hipW, hipY];
      let knee, ankle;
      if (P.sit) {
        knee = [side * (hipW + 18), hipY + 26];
        ankle = [side * (hipW + 22), hipY + 26 + SH];
      } else if (P.kneel) {
        if (side < 0) { knee = [side * (hipW + 14), -16]; ankle = [side * (hipW + 30), -8]; }
        else { knee = [side * (hipW + 34), hipY + 40]; ankle = [side * (hipW + 40), 0]; }
      } else {
        knee = dirPt(hip, -ang[0], TH);
        ankle = dirPt(knee, -ang[0] + ang[1] * -side, SH);
      }
      legs.push({ side, hip, knee, ankle });
    });
    legs.forEach((lg) => {
      tube(ctx, [lg.hip, lg.knee, lg.ankle], legW, style.pants);
      // shoe
      ctx.save();
      ctx.translate(lg.ankle[0], lg.ankle[1]);
      const fx = lg.side * 10;
      ctx.beginPath();
      ctx.ellipse(fx, 6, 32, 17, 0, 0, TAU);
      fill(ctx, style.shoe, LW * 0.9);
      if (!SIL && style.shoeAccent) { ctx.fillStyle = style.shoeAccent; ctx.fillRect(fx - 26, 8, 52, 6); }
      ctx.restore();
    });

    // --- torso (lean around hips)
    ctx.save();
    ctx.translate(0, hipY);
    ctx.rotate(P.lean);
    ctx.translate(0, -hipY);
    const sy = shoulderY;
    const bw = hipW + 22 + belly * 26; // belly bulge half-width
    const torso = [
      [-shW, sy + 6], [-shW - 4, sy + 60], [-bw, hipY - 50 + belly * 10], [-bw + 6, hipY + 4], [0, hipY + 16 + belly * 18],
      [bw - 6, hipY + 4], [bw, hipY - 50 + belly * 10], [shW + 4, sy + 60], [shW, sy + 6], [0, sy - 8],
    ];
    curve(ctx, torso);
    fill(ctx, style.top);
    if (!SIL) {
      // shade on the screen-right side
      ctx.save();
      curve(ctx, torso); ctx.clip();
      ctx.fillStyle = style.topShade;
      ctx.beginPath(); ctx.ellipse(bw + 30, hipY - 60, 70, 180, 0, 0, TAU); ctx.fill();
      if (belly > 0.05) {
        ctx.fillStyle = style.topHi;
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.ellipse(-bw * 0.35, hipY - 70, 24 + belly * 20, 30 + belly * 24, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
      style.torsoDetail(ctx, { sy, hipY, shW, bw, belly });
    }
    anchors.chest = W(0, sy + 70);
    anchors.hip = W(0, hipY);

    // --- head
    const headY = sy - 84;
    const hx = 0;
    const HS = style.headScale || 1.15;
    ctx.save();
    ctx.translate(hx, headY);
    ctx.rotate(P.head + (o.headTilt || 0));
    ctx.scale(HS, HS);
    style.hairBack(ctx, t);
    // neck
    ctx.beginPath(); ctx.rect(-16, 40, 32, 40); fill(ctx, style.skin, LW);
    // ears
    ellipse(ctx, -64, 6, 13, 18); fill(ctx, style.skin, LW * 0.8);
    ellipse(ctx, 64, 6, 13, 18); fill(ctx, style.skin, LW * 0.8);
    // head shape: rounded with a soft chin
    const cheek = belly * 10;
    const headPts = [[-62 - cheek, -30], [-60, -70], [0, -86], [60, -70], [62 + cheek, -30], [60 + cheek, 22], [34, 64], [0, 76], [-34, 64], [-60 - cheek, 22]];
    curve(ctx, headPts);
    fill(ctx, style.skin);
    if (!SIL) {
      ctx.save();
      curve(ctx, headPts); ctx.clip();
      ctx.fillStyle = C.skinShade;
      ctx.beginPath(); ctx.ellipse(76, 10, 24, 90, 0, 0, TAU); ctx.fill();
      if (style.stubble) {
        ctx.fillStyle = 'rgba(60,60,110,0.12)';
        ctx.beginPath(); ctx.moveTo(-56, 30); ctx.quadraticCurveTo(-40, 58, 0, 62); ctx.quadraticCurveTo(40, 58, 56, 30); ctx.lineTo(40, 80); ctx.lineTo(-40, 80); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      if (style.beard) style.beard(ctx);
    }
    const faceName = o.face || 'neutral';
    face(ctx, faceName, style.faceSpec, o, t);
    style.hairFront(ctx, t, o);
    if (style.accessory) style.accessory(ctx, o, faceName);
    if (o.shades) {
      ctx.save();
      ctx.fillStyle = col('#15121c');
      ctx.strokeStyle = SIL || C.line; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-60, -14); ctx.lineTo(60, -14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-54, -16); ctx.lineTo(-6, -16); ctx.lineTo(-10, 12); ctx.quadraticCurveTo(-30, 22, -50, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(54, -16); ctx.lineTo(6, -16); ctx.lineTo(10, 12); ctx.quadraticCurveTo(30, 22, 50, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (!SIL) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-44, -8); ctx.lineTo(-34, 4); ctx.moveTo(16, -8); ctx.lineTo(26, 4); ctx.stroke(); }
      ctx.restore();
    }
    if (o.crown) F.crown(ctx, 0, -70, 0.62, { rot: -0.08 });
    ctx.restore();
    const hr = P.head + (o.headTilt || 0);
    const hp = (lx, ly) => { lx *= HS; ly *= HS; return W(hx + lx * Math.cos(hr) - ly * Math.sin(hr), headY + lx * Math.sin(hr) + ly * Math.cos(hr)); };
    anchors.head = hp(0, 0);
    anchors.top = hp(0, -96);
    anchors.mouth = hp(0, style.faceSpec.mouthY);
    anchors.eyeL = hp(-style.faceSpec.eyeDX * sgn, style.faceSpec.eyeY);
    anchors.eyeR = hp(style.faceSpec.eyeDX * sgn, style.faceSpec.eyeY);
    if (o.flip) { const e = anchors.eyeL; anchors.eyeL = anchors.eyeR; anchors.eyeR = e; }

    // --- arms (drawn over the torso)
    const arms = [[-1, P.aL, P.hands[0], o.holdL], [1, P.aR, P.hands[1], o.hold]];
    arms.forEach(([side, ang, hk, item]) => {
      const sh = [side * (shW + 2), sy + 22];
      const a0 = -ang[0], a1 = -ang[1];
      const el = dirPt(sh, a0, UA);
      const wr = dirPt(el, a0 + a1, FA);
      tube(ctx, [sh, el, wr], armW, style.sleeve || style.top);
      // cuff
      if (!SIL && style.cuff) { ctx.save(); ctx.strokeStyle = style.cuff; ctx.lineWidth = armW * 0.9; ctx.lineCap = 'butt'; const d = [wr[0] - el[0], wr[1] - el[1]]; const dl = Math.hypot(d[0], d[1]) || 1; ctx.beginPath(); ctx.moveTo(wr[0] - d[0] / dl * 14, wr[1] - d[1] / dl * 14); ctx.lineTo(wr[0] - d[0] / dl * 4, wr[1] - d[1] / dl * 4); ctx.stroke(); ctx.restore(); }
      const ha = a0 + a1;
      const hpnt = dirPt(wr, ha, 14);
      hand(ctx, hpnt, ha, hk, style.skin);
      const wp = W(hpnt[0], hpnt[1]);
      if (side < 0) anchors.handL = wp; else anchors.handR = wp;
      if (item) {
        ctx.save();
        ctx.translate(hpnt[0], hpnt[1]);
        if (o.flip) ctx.scale(-1, 1);
        drawHeld(ctx, item, o, side);
        ctx.restore();
      }
    });
    if (o.flip) { const h = anchors.handL; anchors.handL = anchors.handR; anchors.handR = h; }
    ctx.restore(); // torso lean
    ctx.restore();
    SIL = null;
    return anchors;
  }

  function drawHeld(ctx, item, o, side) {
    if (SIL) {
      ctx.save();
      ctx.fillStyle = SIL;
      ctx.beginPath(); ctx.arc(0, -10, 50, 0, TAU); ctx.fill();
      ctx.restore();
      return;
    }
    switch (item) {
      case 'burger': F.burger(ctx, side * -30, -30, 0.55, { bite: o.bite || 0 }); break;
      case 'bigBurger': F.burger(ctx, side * -70, -40, 1.0, { bite: o.bite || 0 }); break;
      case 'drumstick': F.drumstick(ctx, 0, 0, 0.6, { rot: -Math.PI / 2 - side * 0.5, bite: o.bite || 0 }); break;
      case 'fries': F.fries(ctx, 0, 30, 0.45, {}); break;
      case 'phone': F.phone(ctx, 0, -40, 0.3, { screen: o.phoneScreen }); break;
      case 'drink': F.drink(ctx, 0, 60, 0.5, {}); break;
      default: break;
    }
  }

  // ---------------------------------------------------------------------------
  // Hayk
  // ---------------------------------------------------------------------------
  const haykStyle = {
    scale: 1, shoulder: 66, armW: 30, legW: 34,
    skin: C.skin, top: C.hoodie, topShade: C.hoodieShade, topHi: C.hoodieHi, pants: C.jeans, shoe: C.shoe, shoeAccent: C.shoeAccent,
    cuff: C.hoodieShade,
    stubble: true,
    faceSpec: { iris: C.irisHayk, skin: C.skin, eyeY: 4, eyeDX: 30, mouthY: 48, browColor: C.haykHair, seed: 3 },
    torsoDetail(ctx, g) {
      // hood collar behind neck
      ctx.save();
      ctx.beginPath(); ctx.moveTo(-50, g.sy + 2); ctx.quadraticCurveTo(0, g.sy + 50, 50, g.sy + 2); ctx.quadraticCurveTo(0, g.sy - 22, -50, g.sy + 2);
      fill(ctx, C.hoodieHi, LW * 0.8);
      // strings
      ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-14, g.sy + 30); ctx.lineTo(-18, g.sy + 90); ctx.moveTo(14, g.sy + 30); ctx.lineTo(18, g.sy + 90); ctx.stroke();
      // pocket
      ctx.strokeStyle = C.line; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-44, g.hipY - 64); ctx.lineTo(44, g.hipY - 64); ctx.lineTo(56, g.hipY - 10); ctx.moveTo(-44, g.hipY - 64); ctx.lineTo(-56, g.hipY - 10); ctx.stroke();
      // logo on chest
      F.lsLogo(ctx, -32, g.sy + 84, 0.34, { lw: 3 });
      // headphones around neck
      ctx.strokeStyle = C.line; ctx.lineWidth = 16;
      ctx.beginPath(); ctx.arc(0, g.sy + 4, 42, 0.15, Math.PI - 0.15); ctx.stroke();
      ctx.strokeStyle = C.headphones; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(0, g.sy + 4, 42, 0.15, Math.PI - 0.15); ctx.stroke();
      [[-44, g.sy + 22], [44, g.sy + 22]].forEach(([px, py]) => { rrect(ctx, px - 13, py - 16, 26, 34, 10); fo(ctx, C.headphones, 5); });
      ctx.restore();
    },
    hairBack(ctx) {
      ctx.beginPath();
      ctx.ellipse(0, -20, 70, 72, 0, Math.PI, TAU);
      ctx.lineTo(70, 20); ctx.lineTo(-70, 20); ctx.closePath();
      fill(ctx, C.haykHair);
    },
    hairFront(ctx, t) {
      const sway = Math.sin((t || 0) * 3) * 2;
      // spiky anime hair crown
      const pts = [
        [-74, 0], [-80, -40], [-96, -58], [-70, -70], [-82, -104], [-44, -96], [-34, -132], [-6, -104], [14, -140], [30, -104],
        [62, -122], [60, -88], [92, -84], [72, -52], [86, -20], [66, -18], [60, -40],
        // fringe
        [44, -48], [34, -30], [22, -54], [6, -34 + sway], [-8, -56], [-24, -32 + sway], [-34, -56], [-50, -38], [-60, -50],
      ];
      poly(ctx, pts);
      fill(ctx, C.haykHair);
      if (!SIL) {
        ctx.save();
        ctx.fillStyle = C.haykHairHi;
        ctx.beginPath(); ctx.moveTo(-50, -80); ctx.lineTo(-20, -96); ctx.lineTo(-24, -84); ctx.lineTo(-48, -72); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(10, -104); ctx.lineTo(40, -98); ctx.lineTo(34, -88); ctx.lineTo(12, -94); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    },
  };

  function hayk(ctx, o = {}) {
    return human(ctx, o, haykStyle);
  }

  // ---------------------------------------------------------------------------
  // Grant
  // ---------------------------------------------------------------------------
  const grantStyle = {
    scale: 1.08, shoulder: 62, armW: 27, legW: 30, cycle: 0.95,
    skin: '#f0c09a', top: C.jacket, topShade: C.jacketShade, topHi: C.jacketHi, pants: C.pants, shoe: C.grantShoe, shoeAccent: null,
    sleeve: C.jacket, cuff: '#e98a2c',
    stubble: false,
    faceSpec: { iris: C.irisGrant, skin: '#f0c09a', eyeY: 6, eyeDX: 29, mouthY: 50, browColor: C.grantHair, seed: 8 },
    torsoDetail(ctx, g) {
      ctx.save();
      // white tee in the open jacket
      ctx.beginPath(); ctx.moveTo(-24, g.sy - 2); ctx.lineTo(24, g.sy - 2); ctx.lineTo(20, g.hipY + 6); ctx.lineTo(-20, g.hipY + 6); ctx.closePath();
      fill(ctx, '#f7f3ea', LW * 0.7);
      // orange collar lining
      ctx.beginPath(); ctx.moveTo(-54, g.sy + 4); ctx.lineTo(-24, g.sy - 4); ctx.lineTo(-18, g.sy + 40); ctx.closePath(); fill(ctx, '#e98a2c', LW * 0.7);
      ctx.beginPath(); ctx.moveTo(54, g.sy + 4); ctx.lineTo(24, g.sy - 4); ctx.lineTo(18, g.sy + 40); ctx.closePath(); fill(ctx, '#e98a2c', LW * 0.7);
      // jacket hem band
      ctx.fillStyle = C.jacketShade;
      ctx.fillRect(-g.bw, g.hipY - 18, g.bw * 2, 16);
      // zipper edges
      ctx.strokeStyle = C.line; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-22, g.sy + 40); ctx.lineTo(-20, g.hipY); ctx.moveTo(22, g.sy + 40); ctx.lineTo(20, g.hipY); ctx.stroke();
      // tiny paw print on the tee
      ctx.fillStyle = C.dog;
      ctx.beginPath(); ctx.arc(0, g.sy + 100, 9, 0, TAU); ctx.fill();
      [[-11, -12], [0, -16], [11, -12]].forEach(([px, py]) => { ctx.beginPath(); ctx.arc(px, g.sy + 100 + py, 4.5, 0, TAU); ctx.fill(); });
      ctx.restore();
    },
    beard(ctx) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-60, 10); ctx.quadraticCurveTo(-58, 60, -30, 72); ctx.quadraticCurveTo(0, 90, 30, 72); ctx.quadraticCurveTo(58, 60, 60, 10);
      ctx.quadraticCurveTo(50, 44, 30, 50); ctx.quadraticCurveTo(0, 40, -30, 50); ctx.quadraticCurveTo(-50, 44, -60, 10);
      ctx.closePath();
      fill(ctx, C.grantHair, LW * 0.7);
      ctx.restore();
    },
    hairBack(ctx) {
      ctx.beginPath();
      ctx.ellipse(0, -24, 76, 70, 0, Math.PI, TAU);
      ctx.lineTo(74, 0); ctx.lineTo(-74, 0); ctx.closePath();
      fill(ctx, C.grantHair);
    },
    hairFront(ctx) {
      // curly top: clusters of circles
      ctx.save();
      const blobs = [[-62, -38, 22], [-50, -66, 26], [-24, -86, 28], [8, -92, 28], [38, -82, 27], [60, -58, 24], [66, -32, 18], [-36, -52, 18], [-6, -60, 20], [26, -58, 20], [46, -40, 16]];
      ctx.beginPath();
      blobs.forEach(([bx, by, r]) => { ctx.moveTo(bx + r, by); ctx.arc(bx, by, r, 0, TAU); });
      ctx.fillStyle = col(C.grantHair);
      ctx.fill();
      ctx.strokeStyle = SIL || C.line; ctx.lineWidth = LW;
      blobs.slice(0, 7).forEach(([bx, by, r]) => { ctx.beginPath(); ctx.arc(bx, by, r, Math.PI * 0.9, Math.PI * 2.1); ctx.stroke(); });
      ctx.fillStyle = col(C.grantHair);
      blobs.forEach(([bx, by, r]) => { ctx.beginPath(); ctx.arc(bx, by, r - LW * 0.6, 0, TAU); ctx.fill(); });
      if (!SIL) {
        ctx.strokeStyle = C.grantHairHi; ctx.lineWidth = 4;
        blobs.forEach(([bx, by, r]) => { ctx.beginPath(); ctx.arc(bx - 2, by - 2, r * 0.55, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke(); });
      }
      ctx.restore();
    },
    accessory(ctx, o, faceName) {
      if (o.glasses === false || faceName === 'panic' || faceName === 'cry') return;
      ctx.save();
      ctx.strokeStyle = SIL || C.glasses;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(-27, 4, 26, 0, TAU); ctx.moveTo(53, 4); ctx.arc(27, 4, 26, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2, 0); ctx.quadraticCurveTo(0, -4, 2, 0); ctx.moveTo(-53, 0); ctx.lineTo(-64, -4); ctx.moveTo(53, 0); ctx.lineTo(64, -4); ctx.stroke();
      if (!SIL) { ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-27, 4, 18, -2.4, -1.7); ctx.arc(27, 4, 18, -2.4, -1.7); ctx.stroke(); }
      ctx.restore();
    },
  };

  function grant(ctx, o = {}) {
    return human(ctx, o, grantStyle);
  }

  // ---------------------------------------------------------------------------
  // Goofy (side view body, 3/4 head facing the viewer). Local frame faces RIGHT.
  // ---------------------------------------------------------------------------
  function goofy(ctx, o = {}) {
    const t = o.t || 0;
    const pose = o.pose || 'sit';
    const faceName = o.face || 'neutral';
    const s = o.s == null ? 1 : o.s;
    const sgn = o.flip ? -1 : 1;
    const tilt = o.tilt || 0;
    SIL = o.silhouette || null;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const Wd = (lx, ly) => {
      const xx = lx * sgn * s, yy = ly * s;
      return [o.x + xx * ct - yy * st, o.y + xx * st + yy * ct];
    };
    const anchors = {};
    const ph = t * Math.PI * 2;
    const angry = faceName === 'angry';

    // pose parameters (local, facing right)
    let body = { x: 0, y: -110, rx: 105, ry: 58, rot: 0 };
    let head = { x: 92, y: -175, rot: 0 };
    let legs; // [hipX, hipY, footX, footY] x4: back-far, front-far, back-near, front-near
    let tailA = -0.9, mouthOpen = 0, tongue = false;
    const wag = Math.sin(ph * 4) * 0.35;
    switch (pose) {
      case 'sit':
        body = { x: -10, y: -100, rx: 78, ry: 70, rot: -0.75 };
        head = { x: 40, y: -190, rot: 0 };
        legs = [[-60, -60, -40, 0], [30, -110, 40, 0], [-50, -50, -10, 0], [40, -100, 58, 0]];
        tailA = 0.4 + wag * 0.4;
        break;
      case 'walk': {
        const a = Math.sin(ph * 2), b = Math.sin(ph * 2 + Math.PI);
        body.y = -118 + Math.abs(Math.cos(ph * 2)) * -5;
        head = { x: 100, y: -180 + Math.abs(Math.cos(ph * 2)) * -5, rot: 0 };
        legs = [[-70, -100, -70 + a * 30, 0], [60, -100, 60 + b * 30, 0], [-60, -95, -60 + b * 30, 0], [70, -95, 70 + a * 30, 0]];
        tailA = -1.0 + wag;
        break;
      }
      case 'run': {
        const a = Math.sin(ph * 3);
        body = { x: 0, y: -125 + a * 10, rx: 110, ry: 52, rot: a * 0.08 };
        head = { x: 110, y: -180 + a * 10, rot: 0.1 };
        const ext = a * 60;
        legs = [[-70, -110, -120 + ext, -20 + Math.max(0, a) * -30], [60, -110, 110 - ext, -10], [-60, -105, -110 + ext, 0], [70, -105, 130 - ext, -30 + Math.max(0, -a) * -20]];
        tailA = -1.5;
        tongue = true;
        break;
      }
      case 'bark': {
        const lunge = Math.max(0, Math.sin(ph * 2)) * 16;
        body = { x: lunge * 0.5, y: -112, rx: 104, ry: 58, rot: -0.12 };
        head = { x: 118 + lunge, y: -186 - lunge * 0.3, rot: -0.12 };
        legs = [[-70, -100, -110, 0], [60, -100, 110, 0], [-60, -95, -100, 0], [70, -95, 130, 0]];
        tailA = -1.6 + wag * 0.3;
        mouthOpen = 0.6 + Math.max(0, Math.sin(ph * 2)) * 0.4;
        break;
      }
      case 'howl':
        body = { x: -10, y: -100, rx: 78, ry: 70, rot: -0.9 };
        head = { x: 34, y: -200, rot: -0.6 };
        legs = [[-60, -60, -40, 0], [30, -110, 40, 0], [-50, -50, -10, 0], [40, -100, 58, 0]];
        tailA = 0.6;
        mouthOpen = 1;
        break;
      case 'jump':
        body = { x: 0, y: -160, rx: 110, ry: 52, rot: -0.35 };
        head = { x: 106, y: -240, rot: -0.2 };
        legs = [[-70, -150, -150, -90], [60, -170, 150, -230], [-60, -145, -140, -60], [70, -165, 170, -200]];
        tailA = -2.2;
        tongue = true;
        break;
      case 'lie':
        body = { x: 0, y: -52, rx: 115, ry: 46, rot: 0 };
        head = { x: 120, y: -80, rot: 0.05 };
        legs = [[-70, -30, -120, 0], [60, -30, 150, 0], [-60, -26, -100, 0], [70, -26, 170, 0]];
        tailA = -1.4;
        break;
      default: // stand
        legs = [[-70, -100, -72, 0], [60, -100, 62, 0], [-60, -95, -58, 0], [70, -95, 74, 0]];
        tailA = -1.0 + wag;
        break;
    }
    if (faceName === 'happy' && pose !== 'howl') tongue = true;
    if (angry && pose !== 'bark') mouthOpen = Math.max(mouthOpen, 0.35);

    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= clamp(o.alpha);
    ctx.translate(o.x, o.y);
    ctx.rotate(tilt);
    ctx.scale(sgn * s, s);

    // shadow
    if (!SIL && pose !== 'jump') {
      ctx.fillStyle = 'rgba(20,10,40,0.18)';
      ellipse(ctx, 0, 4, 120, 14); ctx.fill();
    }
    // angry bristle outline behind everything
    if (angry && !SIL) {
      ctx.save();
      ctx.fillStyle = '#2a0a18';
      const b = L.boil(L.T);
      ctx.beginPath();
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * TAU;
        const r = i % 2 ? 1.0 : 1.28 + F.h01('gb', i, b) * 0.1;
        const px = body.x + Math.cos(a) * body.rx * r, py = body.y + Math.sin(a) * body.ry * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const leg = (L0, color, w) => {
      const [hx, hy, fx, fy] = L0;
      const kx = (hx + fx) / 2 + (hx < 0 ? -8 : 8), ky = (hy + fy) / 2;
      tube(ctx, [[hx, hy], [kx, ky], [fx, fy - 6]], w, color);
      ellipse(ctx, fx + 8, fy - 6, 20, 13);
      fill(ctx, C.dogCream, LW * 0.8);
    };
    // far legs (shaded)
    leg(legs[0], C.dogShade, 30);
    leg(legs[1], C.dogShade, 30);
    // tail
    ctx.save();
    ctx.translate(body.x - body.rx * 0.85 * Math.cos(body.rot), body.y - body.rx * 0.85 * Math.sin(body.rot) - 10);
    ctx.rotate(tailA);
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.quadraticCurveTo(-40, -30, -30, -80);
    ctx.quadraticCurveTo(-10, -100, 6, -80);
    ctx.quadraticCurveTo(-10, -50, 14, 4);
    ctx.closePath();
    fill(ctx, C.dog);
    ctx.beginPath(); ctx.ellipse(-12, -86, 16, 14, 0, 0, TAU); fill(ctx, C.dogCream, LW * 0.8);
    ctx.restore();
    anchors.tail = Wd(body.x - body.rx, body.y - 20);
    // body
    ctx.save();
    ctx.translate(body.x, body.y);
    ctx.rotate(body.rot);
    ellipse(ctx, 0, 0, body.rx, body.ry);
    fill(ctx, C.dog);
    if (!SIL) {
      ctx.save();
      ellipse(ctx, 0, 0, body.rx, body.ry); ctx.clip();
      ctx.fillStyle = C.dogCream;
      ctx.beginPath(); ctx.ellipse(10, body.ry * 0.85, body.rx * 0.8, body.ry * 0.55, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = C.dogShade;
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.ellipse(-body.rx * 0.2, -body.ry * 0.95, body.rx * 0.7, body.ry * 0.35, 0, 0, TAU); ctx.fill();
      ctx.restore();
      ellipse(ctx, 0, 0, body.rx, body.ry); fo(ctx, null, LW);
    }
    ctx.restore();
    // near legs
    leg(legs[2], C.dog, 32);
    leg(legs[3], C.dog, 32);

    // head
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(head.rot);
    const earSwing = Math.sin(ph * 2) * 0.08 + (faceName === 'sad' || faceName === 'cry' ? -0.25 : 0) + (angry ? 0.9 : 0);
    const ear = (side) => {
      ctx.save();
      ctx.translate(side * 46, -46);
      ctx.rotate(side * earSwing);
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.quadraticCurveTo(side * 40, -10, side * 42, 40);
      ctx.quadraticCurveTo(side * 40, 76, side * 20, 72);
      ctx.quadraticCurveTo(side * 4, 50, -side * 6, 12);
      ctx.closePath();
      fill(ctx, C.dogShade);
      ctx.restore();
    };
    ear(-1);
    ear(1);
    // head shape
    const hp = [[-66, -10], [-58, -56], [0, -72], [58, -56], [68, -10], [60, 36], [0, 58], [-60, 36]];
    curve(ctx, hp);
    fill(ctx, C.dog);
    // muzzle (towards facing direction, i.e. local +x)
    ctx.beginPath();
    ctx.ellipse(34, 22, 44, 32, 0, 0, TAU);
    fill(ctx, C.dogCream, LW * 0.9);
    // cream blaze
    if (!SIL) {
      ctx.fillStyle = C.dogCream;
      ctx.beginPath(); ctx.moveTo(4, -60); ctx.quadraticCurveTo(18, -20, 20, 0); ctx.lineTo(-6, 0); ctx.quadraticCurveTo(-6, -30, 4, -60); ctx.fill();
    }
    // eyes
    const eyes = [[-22, -12], [26, -14]];
    const blink = o.blink || (blinking(t, 5) && faceName !== 'angry' && faceName !== 'shocked');
    if (faceName === 'happy' || blink) {
      eyes.forEach(([ex, ey]) => eyeClosed(ctx, ex, ey, blink && faceName !== 'happy' ? 'line' : 'happy', 16));
    } else if (faceName === 'cry') {
      eyeClosed(ctx, eyes[0][0], eyes[0][1], 'tight', 16);
      eyeClosed(ctx, eyes[1][0], eyes[1][1], 'tightR', 16);
    } else {
      const glow = angry ? C.demonRed : null;
      eyes.forEach(([ex, ey], i) => {
        eyeOpen(ctx, ex, ey, {
          iris: C.irisDog, skin: C.dog, w: 17, h: 22, look: o.look,
          watery: faceName === 'sad', small: faceName === 'shocked', glow,
          lid: angry ? 0.3 : 0, lidTilt: angry ? (i ? -10 : 10) : 0,
        });
      });
      if (angry && !SIL) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = C.demonGlow;
        eyes.forEach(([ex, ey]) => { const g = ctx.createRadialGradient(ex, ey, 2, ex, ey, 44); g.addColorStop(0, 'rgba(255,60,40,0.9)'); g.addColorStop(1, 'rgba(255,60,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, 44, 0, TAU); ctx.fill(); });
        ctx.restore();
      }
    }
    // brows
    if (faceName === 'sad' || faceName === 'cry') { brow(ctx, -22, -42, -0.4, 22, 6); brow(ctx, 26, -44, 0.4, 22, 6); }
    if (angry) { brow(ctx, -22, -36, 0.5, 26, 8); brow(ctx, 26, -38, -0.5, 26, 8); }
    // nose
    ellipse(ctx, 62, 8, 14, 10); fill(ctx, C.dogNose, LW * 0.6);
    if (!SIL) { ctx.fillStyle = '#fff'; ellipse(ctx, 58, 4, 4, 3); ctx.fill(); }
    // mouth
    const mo = mouthOpen;
    ctx.save();
    ctx.strokeStyle = SIL || C.line; ctx.lineWidth = 5; ctx.lineCap = 'round';
    if (mo > 0.05) {
      ctx.beginPath();
      ctx.moveTo(18, 30);
      ctx.quadraticCurveTo(44, 30 + mo * 70, 72, 26);
      ctx.quadraticCurveTo(50, 34, 18, 30);
      ctx.closePath();
      fill(ctx, '#6a1422', 5);
      if (!SIL) {
        ctx.fillStyle = '#ff7a8a';
        ctx.beginPath(); ctx.ellipse(44, 34 + mo * 44, 16, 9 * mo, 0, 0, TAU); ctx.fill();
        // fangs
        ctx.fillStyle = '#fff';
        [[28, 31], [62, 28]].forEach(([fx, fy]) => { ctx.beginPath(); ctx.moveTo(fx - 5, fy); ctx.lineTo(fx + 5, fy); ctx.lineTo(fx, fy + 12 + (angry ? 6 : 0)); ctx.closePath(); ctx.fill(); ctx.stroke(); });
      }
    } else if (faceName === 'sad') {
      ctx.beginPath(); ctx.moveTo(20, 40); ctx.quadraticCurveTo(34, 30, 48, 40); ctx.stroke();
      if (!SIL) { ctx.beginPath(); ctx.moveTo(30, 42); ctx.lineTo(36, 46); ctx.stroke(); }
    } else {
      ctx.beginPath(); ctx.moveTo(62, 18); ctx.lineTo(60, 30); ctx.quadraticCurveTo(50, 40, 38, 32); ctx.moveTo(60, 30); ctx.quadraticCurveTo(68, 40, 78, 32); ctx.stroke();
    }
    if (tongue && !SIL) {
      ctx.beginPath();
      ctx.moveTo(50, 34);
      ctx.quadraticCurveTo(46, 70 + Math.sin(ph * 6) * 4, 60, 72);
      ctx.quadraticCurveTo(74, 70, 68, 34);
      ctx.closePath();
      fill(ctx, '#ff6f86', 4);
    }
    ctx.restore();
    if (faceName === 'happy' && !SIL) {
      ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = C.blush;
      ctx.beginPath(); ctx.ellipse(-36, 16, 14, 7, 0, 0, TAU); ctx.ellipse(8, 14, 12, 6, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
    ctx.restore(); // head

    // collar
    ctx.save();
    const cr = head.rot;
    const cxp = head.x + (-22 * Math.cos(cr) - 58 * Math.sin(cr)), cyp = head.y + (-22 * Math.sin(cr) + 58 * Math.cos(cr));
    ctx.translate(cxp, cyp);
    ctx.rotate(cr * 0.7 - 0.2);
    rrect(ctx, -44, -9, 84, 18, 9); fill(ctx, C.collar, LW * 0.8);
    ellipse(ctx, 2, 18, 11, 11); fill(ctx, C.gold, LW * 0.7);
    ctx.restore();
    ctx.restore(); // figure

    const hr = head.rot;
    const hpW = (lx, ly) => Wd(head.x + lx * Math.cos(hr) - ly * Math.sin(hr), head.y + lx * Math.sin(hr) + ly * Math.cos(hr));
    anchors.head = hpW(0, 0);
    anchors.top = hpW(0, -80);
    anchors.nose = hpW(64, 8);
    anchors.mouth = hpW(46, 36);
    anchors.eyeL = hpW(-22, -12);
    anchors.eyeR = hpW(26, -14);
    anchors.collar = Wd(cxp + 2, cyp + 18);
    anchors.chest = Wd(body.x + 40, body.y);

    // tears drawn in world space so they pour naturally
    if (faceName === 'cry' && !SIL) {
      const e1 = anchors.eyeL, e2 = anchors.eyeR;
      F.tearStream(ctx, e1[0], e1[1] + 6 * s, t, { dir: -1, len: 240 * s, width: 20 * s, seed: 31 });
      F.tearStream(ctx, e2[0], e2[1] + 6 * s, t, { dir: 1, len: 240 * s, width: 20 * s, seed: 37 });
    }
    SIL = null;
    return anchors;
  }

  // Human tears helper: scenes call FILM.cast.tears(ctx, anchors, t, s) after drawing a 'cry' face.
  function tears(ctx, a, t, s = 1) {
    F.tearStream(ctx, a.eyeL[0], a.eyeL[1] + 8 * s, t, { dir: -1, len: 260 * s, width: 22 * s, seed: 51 });
    F.tearStream(ctx, a.eyeR[0], a.eyeR[1] + 8 * s, t, { dir: 1, len: 260 * s, width: 22 * s, seed: 57 });
  }

  FILM.cast = Object.freeze({ hayk, grant, goofy, tears });
})();
