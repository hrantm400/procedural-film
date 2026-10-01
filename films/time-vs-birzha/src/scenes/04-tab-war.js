// Shot 04 'tab-war' : Round 3, tab overload. Global T 5.000 .. 6.667 (1 bar, 100 frames).
// Layers, back to front (everything below the HUD rides one camera: entry whip-pan, exit zoom):
//   1. lilac backdrop, dot grid, floaties
//   2. browser window card (chrome strip, traffic dots, toolbar, loading skeleton page)
//   3. tab row: tabs reflow and squeeze to slivers; Time wedged in the middle, squashed, sweating
//   4. search bar typing "searching for an entry..." with a spinner
//   5. биржа standing on the window top, laughing, throwing tabs like cards (one per 8th note)
//   6. tabs in flight, "+27" badge, hit effects
//   7. HUD: "ROUND 3" pill (screen-fixed apart from the pan / zoom)
//   8. entry whip-pan smear + speed lines; exit zoom focus lines
// EXIT contract: the last frame shows Time centred at (540, 960) with s = 2.5, face dizzy, hands spinning.
(function () {
  'use strict';
  const ID = 'tab-war';
  const FILM = window.FILM;
  const F = FILM.fx;
  const CAST = FILM.cast;
  const P = F.pal;
  const E = FILM.lib.ease;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const h01 = (...k) => F.h01(ID, ...k);

  const BEAT = 0.4167, EIGHTH = BEAT / 2;
  const PAN_IN = 0.22; // entry whip-pan resolves
  const Z0 = 1.42, Z1 = 1.65; // exit zoom window (last 0.25 s); the last frame is t = 1.65
  const HIT = 3 * BEAT; // "+27": beat 3

  // window geometry
  const WX = 30, WY = 640, WW = 1020, WH = 1400;
  const ROW_Y = 700, TH = 130, ROW_W = 960;
  const SB_Y = 900, SB_H = 110;
  const TIME_S = 0.9, TR = 120 * TIME_S;
  const BZ = [850, WY], BZ_S = 0.8;

  // tabs: side L/R of Time (new tabs are inserted next to Time, pushing the older ones outward)
  const ICON = { BTC: '#f7931a', ETH: '#7b5cff', SOL: '#22c977', TF: P.timeBlue, NEWS: P.bzRed, MORE: P.bzOrange };
  const TABS = [
    { label: 'BTC/USDT', at: -1, side: -1, icon: ICON.BTC },
    { label: 'ETH/USDT', at: -1, side: 1, icon: ICON.ETH },
    { label: 'SOL/USDT', at: 1 * EIGHTH, side: -1, icon: ICON.SOL },
    { label: '1H', at: 2 * EIGHTH, side: 1, icon: ICON.TF },
    { label: '4H', at: 3 * EIGHTH, side: -1, icon: ICON.TF },
    { label: '15m', at: 4 * EIGHTH, side: 1, icon: ICON.TF },
    { label: 'news', at: 5 * EIGHTH, side: -1, icon: ICON.NEWS },
    { label: '+27', at: 6 * EIGHTH, side: 1, icon: ICON.MORE, big: true },
  ];
  const SLIVER_COLS = [P.bzOrange, P.bzYellow, P.bzRed, '#ff9a5c', '#ffd27a', '#ff7a8c'];
  for (let k = 0; k < 27; k++) TABS.push({ label: '', at: HIT + 0.03 + k * 0.0045, side: k % 2 ? 1 : -1, sliver: true, color: SLIVER_COLS[k % SLIVER_COLS.length] });
  const FLIGHT = 0.2; // seconds a thrown tab is in the air (lands on its 8th note)
  const THROWN = TABS.filter((tb) => tb.at > 0 && !tb.sliver);

  const grow = (tb, t) => (tb.at < 0 ? 1 : t < tb.at ? 0 : tb.sliver ? E.outCubic(clamp((t - tb.at) / 0.1)) : E.outBack(clamp((t - tb.at) / 0.16)));

  // the tab row at time t: positions of every tab and of Time's slot
  function layout(t) {
    let n = 0;
    TABS.forEach((tb) => { n += grow(tb, t); });
    const regular = TABS.filter((tb) => !tb.sliver).reduce((a, tb) => a + grow(tb, t), 0);
    const sq = clamp((regular - 2) / 6), sq2 = clamp((n - regular) / 27);
    const wT = lerp(lerp(200, 150, E.outQuad(sq)), 104, sq2);
    const unit = Math.min(380, (ROW_W - wT) / Math.max(n, 1e-3));
    const left = [], right = [];
    // outer -> inner on the left = oldest first; inner -> outer on the right = newest first
    TABS.forEach((tb, i) => { if (tb.side < 0) left.push(i); });
    TABS.forEach((tb, i) => { if (tb.side > 0) right.unshift(i); });
    const ws = TABS.map((tb) => grow(tb, t) * unit);
    const total = ws.reduce((a, b) => a + b, 0) + wT;
    let x = 540 - total / 2;
    const pos = new Array(TABS.length);
    left.forEach((i) => { pos[i] = [x, ws[i]]; x += ws[i]; });
    const timeX = x + wT / 2;
    x += wT;
    right.forEach((i) => { pos[i] = [x, ws[i]]; x += ws[i]; });
    return { pos, wT, timeX, unit, n };
  }

  function timePose(t, lay) {
    const z = F.seg(t, Z0, Z1, E.inOutCubic);
    const sxSq = clamp(lay.wT / (2 * TR), 0.45, 1.15);
    const hitSq = F.squash(t, HIT + 0.03, 0.25, 0.4);
    let sx = sxSq * hitSq[0] * (1 + Math.sin(t * 31) * 0.025);
    let sy = Math.min(1.35, 1 + (1 - sxSq) * 0.7) * hitSq[1];
    // pops free of the squeeze during the zoom (overshoots, lands exactly on 1)
    const free = z <= 0 ? 0 : z >= 1 ? 1 : E.outBack(z);
    sx = lerp(sx, 1, free); sy = lerp(sy, 1, free);
    if (z >= 1) { sx = 1; sy = 1; }
    const bob = Math.sin(t * 17) * 3 * (1 - z);
    return { x: lay.timeX, y: ROW_Y + TH / 2 + bob, sx, sy, rot: Math.sin(t * 23) * 0.04 * (1 - z), z };
  }

  // ---------------------------------------------------------------------------
  function drawBackdrop(ctx, t) {
    F.dotGrid(ctx, { step: 56, r: 3, color: 'rgba(123,92,255,0.12)', oy: -t * 24 });
    F.floaties(ctx, { n: 14, seed: 404, t: t + 5, size: 24, speed: 36 });
  }

  function drawWindow(ctx, t, z) {
    F.card(ctx, WX, WY, WW, WH, { r: 48, fill: '#ffffff', shadow: z < 0.2, shadowDy: 22, blur: 44, shadowColor: 'rgba(60,40,140,0.25)' });
    // chrome strip (tab area)
    ctx.save();
    F.rrect(ctx, WX, WY, WW, WH, 48);
    ctx.clip();
    ctx.fillStyle = '#e7e9f6';
    ctx.fillRect(WX, WY, WW, ROW_Y + TH - WY);
    ctx.restore();
    // traffic dots
    [P.red, P.yellow, P.green].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(WX + 50 + i * 36, WY + 30, 11, 0, TAU); ctx.fill();
    });
    // page: loading skeleton
    const shim = ((t * 1.3) % 1.4) - 0.2;
    const sk = (x, y, w, h, r) => {
      F.rrect(ctx, x, y, w, h, r);
      ctx.fillStyle = '#eef0f8';
      ctx.fill();
    };
    sk(70, 1050, 940, 330, 34);
    // skeleton chart squiggle
    ctx.save();
    ctx.strokeStyle = '#dde1f0'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const x = 120 + i * 70, y = 1240 + Math.sin(i * 1.3) * 60 - i * 6;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    sk(70, 1420, 560, 44, 22);
    sk(70, 1490, 820, 44, 22);
    sk(70, 1560, 680, 44, 22);
    sk(70, 1630, 760, 44, 22);
    // shimmer sweep across the skeleton
    ctx.save();
    ctx.beginPath();
    F.rrect(ctx, 70, 1050, 940, 330, 34);
    ctx.rect(70, 1420, 820, 260);
    ctx.clip();
    const sx = lerp(-200, 1200, shim);
    ctx.fillStyle = F.linGrad(ctx, sx - 160, 0, sx + 160, 0, ['rgba(255,255,255,0)', 'rgba(255,255,255,0.85)', 'rgba(255,255,255,0)']);
    ctx.fillRect(sx - 160, 1030, 320, 700);
    ctx.restore();
  }

  function drawTab(ctx, tb, x, w, t, active) {
    if (w < 1) return;
    if (tb.sliver || w < 64) {
      F.rrect(ctx, x + 2, ROW_Y + 6, Math.max(2, w - 4), TH - 6, Math.min(12, w / 2));
      ctx.fillStyle = tb.sliver ? tb.color : '#d5d9ec';
      ctx.fill();
      if (!tb.sliver && tb.icon) {
        ctx.fillStyle = tb.icon;
        ctx.beginPath(); ctx.arc(x + w / 2, ROW_Y + TH * 0.5, Math.min(12, w * 0.25), 0, TAU); ctx.fill();
      }
      return;
    }
    F.tab(ctx, x + 4, ROW_Y, w - 8, TH, { active, close: false, bg: '#d5d9ec', activeBg: '#ffffff' });
    // own tab content (the kit's tab clips labels away too early for this squeeze gag)
    ctx.save();
    ctx.beginPath(); ctx.rect(x + 8, ROW_Y, w - 22, TH); ctx.clip();
    ctx.fillStyle = tb.icon;
    ctx.beginPath(); ctx.arc(x + 36, ROW_Y + TH / 2, 14, 0, TAU); ctx.fill();
    F.text(ctx, tb.label, x + 60, ROW_Y + TH / 2 + 1, { size: 40, fill: tb.big ? P.bzRed : P.ink, align: 'left', rounded: false, font: 'sans' });
    ctx.restore();
    if (w > 250) {
      ctx.save();
      ctx.strokeStyle = 'rgba(27,21,48,0.4)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      const cx = x + w - 36, cy = ROW_Y + TH / 2, k = 10;
      ctx.beginPath(); ctx.moveTo(cx - k, cy - k); ctx.lineTo(cx + k, cy + k); ctx.moveTo(cx + k, cy - k); ctx.lineTo(cx - k, cy + k); ctx.stroke();
      ctx.restore();
    }
  }

  function drawRow(ctx, t, lay) {
    // newest landed regular tab is the active one
    let active = -1;
    TABS.forEach((tb, i) => { if (!tb.sliver && (tb.at < 0 || t >= tb.at)) active = i; });
    TABS.forEach((tb, i) => {
      if (i === active) return;
      drawTab(ctx, tb, lay.pos[i][0], lay.pos[i][1], t, false);
    });
    if (active >= 0) drawTab(ctx, TABS[active], lay.pos[active][0], lay.pos[active][1], t, true);
    // dust puffs where a tab slams in
    THROWN.forEach((tb, k) => {
      const i = TABS.indexOf(tb);
      const p = lay.pos[i];
      F.puffs(ctx, p[0] + p[1] / 2, ROW_Y + TH, t - tb.at, { n: 5, seed: 40 + k, size: 22, spread: 70, color: 'rgba(160,150,220,0.6)', life: 0.35 });
    });
  }

  function drawSearch(ctx, t, z) {
    // the text leaves before the zoom carries it out of the safe area
    const vis = z < 0.18;
    const str = vis ? F.typeOn('searching for an entry...', t, 0.16, 34) : '';
    F.searchBar(ctx, 70, SB_Y, 940, SB_H, { text: str, caret: vis, t, spinner: true, size: 42, placeholder: vis && !str ? 'Search' : '' });
  }

  function drawCounter(ctx, t, lay) {
    const n = Math.round(lay.n);
    let pulse = 0;
    TABS.forEach((tb) => { if (tb.at > 0 && t >= tb.at && !tb.sliver) pulse = Math.max(pulse, Math.exp(-(t - tb.at) * 10)); });
    if (t >= HIT) pulse = Math.max(pulse, Math.exp(-(t - HIT) * 6) * 1.6);
    ctx.save();
    ctx.translate(290, 400);
    ctx.scale(1 + pulse * 0.06, 1 + pulse * 0.06);
    ctx.rotate(-0.03 + Math.sin(t * 40) * pulse * 0.015);
    F.card(ctx, -210, -82, 420, 164, { r: 36, fill: '#ffffff', shadowDy: 12, blur: 26, shadowColor: 'rgba(60,40,140,0.22)' });
    F.text(ctx, 'TABS OPEN', -170, -38, { size: 30, fill: P.lsSlate, align: 'left', font: 'mono', letter: 5, rounded: false });
    F.text(ctx, String(n), -172, 30, { size: 92, fill: n > 9 ? P.bzRed : P.bzOrange, align: 'left', font: 'mono' });
    // mini tab glyphs
    for (let i = 0; i < 3; i++) {
      F.rrect(ctx, 70 + i * 34, 0 - i * 14, 70, 50, 12);
      ctx.fillStyle = [P.bzYellow, P.bzOrange, P.bzRed][i];
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTime(ctx, t, lay) {
    const p = timePose(t, lay);
    const face = t >= Z0 + 0.04 ? 'dizzy' : 'shocked';
    const gx = (lay.wT / 2) * p.sx / Math.max(p.sx, 1e-3);
    const pushing = 1 - p.z;
    const gloves = pushing > 0.02 ? {
      l: [p.x - Math.max(gx, 60) - 14 + Math.sin(t * 40) * 4, p.y + 30],
      r: [p.x + Math.max(gx, 60) + 14 - Math.sin(t * 40) * 4, p.y + 30],
    } : null;
    CAST.time(ctx, { x: p.x, y: p.y, s: TIME_S, sx: p.sx, sy: p.sy, rot: p.rot, t, face, ring: 0.3, spin: t * 25, gloves: gloves && pushing > 0.5 ? gloves : null });
    // sweat flying off
    if (pushing > 0.3) {
      for (let k = 0; k < 3; k++) {
        const u = (t * 2.2 + k / 3) % 1;
        const sd = k % 2 ? 1 : -1;
        ctx.save();
        ctx.globalAlpha = (1 - u) * pushing;
        F.sweat(ctx, p.x + sd * (TR * p.sx + 10 + u * 70), p.y - TR * p.sy * 0.7 - u * 60 + u * u * 120, 0.9, { flip: sd < 0 });
        ctx.restore();
      }
    }
    return p;
  }

  // биржа's throwing arm: wind up before each release, fling forward after
  function throwArm(t) {
    let back = 0, fwd = 0, idx = -1;
    THROWN.forEach((tb, k) => {
      const r = tb.at - FLIGHT;
      back += F.seg(t, r - 0.12, r - 0.01, E.outCubic) * (1 - F.seg(t, r - 0.01, r + 0.03, E.inCubic));
      fwd += F.seg(t, r - 0.01, r + 0.03, E.outCubic) * (1 - F.seg(t, r + 0.05, r + 0.16, E.inOutCubic));
      if (t >= r - 0.12) idx = k;
    });
    return { back: clamp(back), fwd: clamp(fwd), idx };
  }

  function drawBirzha(ctx, t) {
    const R = 120 * BZ_S;
    const arm = throwArm(t);
    const laughBounce = Math.abs(Math.sin(t * TAU * 2.4)) * 0.06;
    const big = F.seg(t, HIT, HIT + 0.12, E.outBack);
    let sx = 1 + laughBounce * 0.6 - arm.back * 0.06 + arm.fwd * 0.08, sy = 1 - laughBounce - arm.fwd * 0.06 + arm.back * 0.06;
    const hs = F.squash(t, HIT, -0.25, 0.45);
    sx *= hs[0]; sy *= hs[1];
    const x = BZ[0] + arm.back * 18 - arm.fwd * 22;
    const yFeet = WY + 2;
    const y = yFeet - R * sy - big * 30 * (1 - F.seg(t, HIT + 0.15, HIT + 0.4, E.inOutCubic));
    const gR = [x + 150 - arm.fwd * 260 + arm.back * 20, y - 40 - arm.back * 90 + arm.fwd * 70];
    const gL = big > 0 ? [lerp(x - 130, x - 150, big), lerp(y + 40, y - 140, big * (1 - F.seg(t, HIT + 0.2, HIT + 0.45)))] : [x - 130, y + 40 + Math.sin(t * 15) * 8];
    if (big > 0) gR[1] = lerp(gR[1], y - 150, big * (1 - F.seg(t, HIT + 0.2, HIT + 0.45)));
    CAST.birzha(ctx, {
      x, y, s: BZ_S, t, face: 'laugh', greedy: t > HIT, jaw: 0.25 + 0.2 * Math.abs(Math.sin(t * TAU * 2.4)) + big * 0.3,
      sx, sy, rot: -arm.fwd * 0.12 + arm.back * 0.08, gloves: { l: gL, r: gR }, shadow: yFeet,
    });
    // ha ha
    const hu = (t * 2.4) % 1;
    F.text(ctx, 'HA', x + 120 + hu * 40, y - 120 - hu * 50, { size: 34, fill: P.bzRed, alpha: Math.sin(hu * Math.PI), rot: 0.2 });
    return { x, y, R, gR };
  }

  function drawFlying(ctx, t, lay, bz) {
    THROWN.forEach((tb, k) => {
      const r = tb.at - FLIGHT;
      if (t < r || t >= tb.at) return;
      const u = (t - r) / FLIGHT;
      const i = TABS.indexOf(tb);
      // land next to Time on its side
      const tx = lay.timeX + tb.side * (lay.wT / 2 + 50);
      const ty = ROW_Y + TH / 2;
      const sx0 = bz.gR[0], sy0 = bz.gR[1];
      const x = lerp(sx0, tx, E.inQuad(u));
      const y = lerp(sy0, ty, u) - Math.sin(u * Math.PI) * 170;
      const w = lerp(260, 170, u), h = lerp(100, TH, u);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((1 - u) * (tb.side < 0 ? -1 : 1) * 3.4 + (h01('fr', k) - 0.5) * 0.3);
      ctx.scale(1, Math.max(0.15, Math.abs(Math.cos(u * Math.PI * 1.5))));
      F.dropShadow(ctx, (c) => { F.rrect(c, -w / 2, -h / 2, w, h, 22); c.fillStyle = '#ffffff'; c.fill(); }, { dy: 10, blur: 16 });
      ctx.fillStyle = tb.icon;
      ctx.beginPath(); ctx.arc(-w / 2 + 28, 0, 12, 0, TAU); ctx.fill();
      F.text(ctx, tb.label, -w / 2 + 50, 2, { size: 40, fill: tb.big ? P.bzRed : P.ink, align: 'left', rounded: false, font: 'sans' });
      ctx.restore();
      // whoosh streak
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 8; ctx.lineCap = 'round';
      const u0 = Math.max(0, u - 0.25);
      ctx.beginPath();
      for (let j = 0; j <= 6; j++) {
        const uu = lerp(u0, u, j / 6);
        const px = lerp(sx0, tx, E.inQuad(uu)), py = lerp(sy0, ty, uu) - Math.sin(uu * Math.PI) * 170;
        if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
      void i;
    });
  }

  function drawHitFx(ctx, t, lay) {
    // "+27" badge pops on the tab row, sliver burst
    const k = F.pop(t, HIT, 0.25);
    if (k > 0) {
      ctx.save();
      ctx.translate(lay.timeX + 230, ROW_Y - 8);
      ctx.rotate(0.12);
      ctx.scale(k, k);
      F.label(ctx, '+27 TABS', 0, 0, { size: 40, bg: P.bzRed, color: '#ffffff' });
      ctx.restore();
    }
    F.shockRing(ctx, lay.timeX, ROW_Y + TH / 2, t - HIT, { r: 260, color: P.bzOrange, width: 16, life: 0.4 });
    F.confettiBurst(ctx, lay.timeX + 150, ROW_Y + 20, t - HIT, { n: 22, seed: 427, colors: SLIVER_COLS, power: 900, life: 0.9, size: 18 });
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const lay = layout(t);
      const tp = timePose(t, lay);
      const z = tp.z;
      // entry whip-pan from the right
      const pin = 1 - F.seg(t, 0, PAN_IN, E.outCubic);
      const panX = pin * 760;
      // exit zoom onto Time's face: Time -> (540, 960), scale 1 -> 2.5 / 0.9
      const zoom = lerp(1, 2.5 / TIME_S, z);
      const cx = lerp(tp.x, 540, z), cy = lerp(tp.y, 960, z);
      const [shx0, shy0] = F.shakeMany(t, [[HIT, 0.32, 22]].concat(THROWN.slice(0, -1).map((tb) => [tb.at, 0.14, 6])), 11);
      const shx = shx0 * (1 - z), shy = shy0 * (1 - z);

      F.bgFill(ctx, [P.lilac, '#e2dcff']);
      ctx.save();
      ctx.translate(panX + shx, shy);
      if (pin > 0) { ctx.translate(540, 0); ctx.scale(1 + pin * 0.3, 1); ctx.translate(-540, 0); }
      // camera zoom about Time
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);
      ctx.translate(-tp.x, -tp.y);

      drawBackdrop(ctx, t);
      drawWindow(ctx, t, z);
      drawSearch(ctx, t, z);
      drawRow(ctx, t, lay);
      const bz = drawBirzha(ctx, t);
      drawTime(ctx, t, lay);
      drawFlying(ctx, t, lay, bz);
      drawHitFx(ctx, t, lay);
      // HUD rides the camera (it zooms away with the world)
      drawCounter(ctx, t, lay);
      F.label(ctx, 'ROUND 3', 80, 250, { size: 34, bg: P.yellow, color: P.ink, align: 'left' });
      ctx.restore();

      // entry: whip smear + horizontal speed lines resolving
      if (pin > 0.02) {
        if (ctx.canvas && pin > 0.1) {
          ctx.save();
          ctx.globalAlpha = 0.4 * pin;
          ctx.drawImage(ctx.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height, 80 * pin, 0, FILM.W, FILM.H);
          ctx.restore();
        }
        F.speedLines(ctx, { angle: Math.PI, count: 34, color: '#ffffff', alpha: 0.85 * pin, seed: 303, t: t + 1.6667, speed: 5200, len: 520, width: 6 });
      }
      // exit: focus lines framing the face
      if (z > 0.05) {
        F.focusLines(ctx, 540, 960, { inner: lerp(700, 360, z), count: 54, color: '#ffffff', alpha: 0.6 * z, seed: 44, width: 14, t });
      }
    },
  });
})();
