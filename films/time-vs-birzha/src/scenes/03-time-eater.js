// Shot 03 'time-eater' : Round 2, the chart eats your time. Global T 3.333 .. 5.000 (1 bar, 100 frames).
// Layers, back to front:
//   1. navy backdrop + faint dot grid + dim floaties
//   2. chart panel (night2 card, chartGrid, red dumping candles growing, live price line)
//   3. the green candle биржа rides up on (clipped to the panel)
//   4. Time (flight trail on entry, crash, dizzy stars, recoils on every chomp)
//   5. биржа (rises, anticipates, lunges and CHOMPS on beats 1..3)
//   6. crumbs of blue rim, CHOMP! impact stars, shock rings
//   7. HUD: "ROUND 2" pill, "TIME WASTED" counter card (screen-fixed apart from the exit pan)
//   8. exit whip-pan to the left: camera slide, self-smear, horizontal speed lines
(function () {
  'use strict';
  const ID = 'time-eater';
  const FILM = window.FILM;
  const F = FILM.fx;
  const CAST = FILM.cast;
  const P = F.pal;
  const E = FILM.lib.ease;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const h01 = (...k) => F.h01(ID, ...k);

  const BEAT = 0.4167;
  const CH = [BEAT, 2 * BEAT, 3 * BEAT]; // chomps, T 3.750 / 4.167 / 4.583
  const LAND = 0.2; // Time crashes onto the chart
  const PAN0 = 1.43; // exit whip-pan start
  const DUR = 5 / 3;
  const RINGS = [1, 0.75, 0.5, 0.3];
  const MINUTES = [12, 160, 277, 365]; // 0h12 -> 2h40 -> 4h37 -> 6h05

  // panel geometry
  const PX = 50, PY = 540, PW = 980, PH = 960;
  // characters
  const TIME_HOME = [330, 1150], TIME_S = 1.1;
  const BZ_HOME = [770, 1080], BZ_S = 1.2;

  const chompIndex = (t) => (t >= CH[2] ? 3 : t >= CH[1] ? 2 : t >= CH[0] ? 1 : 0);

  // birzha lunge toward Time (negative x) around each chomp
  function lunge(t) {
    let v = 0;
    CH.forEach((tb) => {
      const a = F.seg(t, tb - 0.1, tb, E.inCubic);
      const r = F.seg(t, tb + 0.06, tb + 0.3, E.outCubic);
      v += a * (1 - r);
    });
    return v;
  }
  // anticipation lean back before each chomp
  function windup(t) {
    let v = 0;
    CH.forEach((tb) => {
      const a = F.seg(t, tb - 0.26, tb - 0.1, E.outCubic);
      const r = F.seg(t, tb - 0.1, tb - 0.02, E.inCubic);
      v += a * (1 - r);
    });
    return v;
  }
  function jaw(t) {
    let v = 0;
    CH.forEach((tb) => {
      const o = F.seg(t, tb - 0.26, tb - 0.07, E.outBack);
      const c = F.seg(t, tb - 0.05, tb - 1 / 120, E.inCubic);
      const chew = t > tb && t < tb + 0.22 ? 0.18 * Math.sin(((t - tb) / 0.22) * Math.PI * 2) ** 2 : 0;
      v += o * (1 - c) + chew;
    });
    return clamp(v, 0, 1.05);
  }
  // Time knocked back after each chomp
  function recoil(t) {
    let v = 0;
    CH.forEach((tb, i) => {
      if (t < tb) return;
      const u = t - tb;
      v += (36 + i * 10) * Math.exp(-u * 7) * Math.sin(Math.min(u * 18, Math.PI / 2) + Math.max(0, u - 0.09) * 14);
    });
    return v;
  }

  function drawBackdrop(ctx, t, ox) {
    F.bgFill(ctx, ['#10152c', P.night, '#1a2150']);
    F.dotGrid(ctx, { step: 60, r: 2.6, color: 'rgba(255,255,255,0.05)', oy: -t * 20, ox });
    ctx.save();
    ctx.globalAlpha = 0.28;
    F.floaties(ctx, { n: 12, seed: 33, t: t + 3.3, size: 20, speed: 40, colors: [P.timeCyan, P.bzOrange, P.down, P.purple] });
    ctx.restore();
  }

  function drawPanel(ctx, t) {
    F.dropShadow(ctx, (c) => {
      F.rrect(c, PX, PY, PW, PH, 44);
      c.fillStyle = F.linGrad(c, 0, PY, 0, PY + PH, [P.night2, '#18204a']);
      c.fill();
    }, { dy: 18, blur: 40, color: 'rgba(0,0,0,0.45)' });
    F.chartGrid(ctx, PX + 30, PY + 90, PW - 60, PH - 120, { cols: 6, rows: 8, color: 'rgba(255,255,255,0.06)' });
    // panel header: pair + red change chip
    F.text(ctx, 'BTC/USDT', PX + 50, PY + 50, { size: 34, fill: 'rgba(255,255,255,0.75)', align: 'left', font: 'mono', rounded: false });
    const chg = (-2.1 - t * 3.4).toFixed(1) + '%';
    F.label(ctx, chg, PX + PW - 40, PY + 50, { size: 28, bg: 'rgba(255,77,94,0.18)', color: P.down, align: 'right', font: 'mono', rounded: false });
    // candles: a dump, growing in live
    ctx.save();
    F.rrect(ctx, PX, PY, PW, PH, 44);
    ctx.clip();
    ctx.globalAlpha = 0.7;
    const vals = F.candles(ctx, PX + 40, PY + 120, PW - 80, PH - 200, { n: 18, seed: 314, trend: -0.75, grow: lerp(0.45, 1.02, E.outQuad ? E.outQuad(t / DUR) : t / DUR), t, width: 0.58 });
    ctx.globalAlpha = 1;
    // live price line at the last shown candle close
    const shown = Math.min(vals.length - 1, Math.floor(lerp(0.45, 1.02, t / DUR) * vals.length));
    const ly = PY + 120 + (PH - 200) - vals[Math.max(0, shown)][1] * (PH - 200) + Math.sin(t * 9) * 4;
    ctx.setLineDash([14, 12]);
    ctx.lineDashOffset = -t * 60;
    ctx.strokeStyle = 'rgba(255,77,94,0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(PX + 30, ly); ctx.lineTo(PX + PW - 30, ly); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // the green candle under биржа (rises from the bottom of the panel)
  function drawRiser(ctx, bx, by, R, rise) {
    ctx.save();
    F.rrect(ctx, PX, PY, PW, PH, 44);
    ctx.clip();
    const top = by + R * 0.9;
    const bottom = PY + PH + 40;
    if (top < bottom) {
      const w = R * 1.0;
      ctx.strokeStyle = P.up; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, top - 10); ctx.lineTo(bx, bottom); ctx.stroke();
      F.rrect(ctx, bx - w / 2, top + 20, w, bottom - top, 18);
      ctx.fillStyle = F.linGrad(ctx, 0, top, 0, bottom, ['#4cf29a', P.up, '#159a5a']);
      ctx.fill();
      // shine
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      F.rrect(ctx, bx - w / 2 + 12, top + 34, 14, Math.max(0, bottom - top - 60), 7); ctx.fill();
      // rising glow
      if (rise < 1) {
        ctx.globalAlpha = 1 - rise;
        ctx.fillStyle = 'rgba(76,242,154,0.25)';
        F.rrect(ctx, bx - w, top, w * 2, bottom - top, 40); ctx.fill();
      }
    }
    ctx.restore();
  }

  function timePose(t) {
    // entry flight from the left edge at y ~900, spinning, crash at LAND
    let x, y, rot, sx = 1, sy = 1;
    if (t < LAND) {
      const u = t / LAND;
      x = lerp(-110, TIME_HOME[0], E.outQuad ? E.outQuad(u) : u);
      y = lerp(900, TIME_HOME[1], u * u) - Math.sin(u * Math.PI) * 60;
      rot = -(LAND - t) * 30;
      sx = 1.12; sy = 0.9; // stretched along the flight
    } else {
      x = TIME_HOME[0] - recoil(t);
      y = TIME_HOME[1] + Math.sin(t * 7) * 3;
      rot = Math.exp(-(t - LAND) * 6) * Math.sin((t - LAND) * 20) * 0.35 - recoil(t) * 0.004;
      const sq1 = F.squash(t, LAND, 0.42, 0.5);
      let ax = sq1[0], ay = sq1[1];
      CH.forEach((tb) => { const q = F.squash(t, tb, 0.3, 0.45); ax *= q[1]; ay *= q[0]; }); // pinched sideways by the bite
      sx = ax; sy = ay;
    }
    return { x, y, rot, sx, sy };
  }

  function drawTime(ctx, t) {
    const p = timePose(t);
    const ci = chompIndex(t);
    const ring = RINGS[ci];
    const face = t < CH[0] - 0.12 ? 'dizzy' : 'shocked';
    // flight trail
    if (t < LAND + 0.05) {
      const pos = [];
      for (let k = 6; k >= 1; k--) {
        const tt = t - k * 0.022;
        if (tt < -0.15) continue;
        const q = tt < LAND ? timePose(Math.max(tt, -0.12)) : null;
        if (!q) continue;
        const u = tt / LAND;
        pos.push([lerp(-110, TIME_HOME[0], u), q.y, q.rot]);
      }
      F.motionTrail(ctx, (c, x, y) => {
        c.fillStyle = P.timeCyan;
        c.beginPath(); c.arc(x, y, 120 * TIME_S, 0, TAU); c.fill();
      }, pos, { alpha: 0.35 });
    }
    // contact shadow on the panel floor
    CAST.time(ctx, {
      x: p.x, y: p.y, s: TIME_S, rot: p.rot, sx: p.sx, sy: p.sy, t, face, ring,
      look: ci > 0 ? [0.8, -0.3] : [0, 0], spin: t < LAND ? t * 30 : 0,
      shadow: t >= LAND ? TIME_HOME[1] + 140 : undefined,
      gloves: t >= LAND ? (ci > 0 ? { l: [p.x - 175, p.y - 30 + Math.sin(t * 30) * 6], r: [p.x + 40, p.y - 175 + Math.sin(t * 34) * 6] } : { l: [p.x - 165, p.y + 70], r: [p.x + 120, p.y + 150] }) : null,
    });
    if (t >= LAND && t < CH[0] + 0.05) {
      ctx.save();
      ctx.globalAlpha = clamp((CH[0] + 0.05 - t) / 0.08);
      F.dizzyStars(ctx, p.x, p.y - 160, t, { r: 95, n: 4 });
      ctx.restore();
    }
    if (ci > 0) {
      const sw = (t * 2.4) % 1;
      F.sweat(ctx, p.x - 120 - sw * 30, p.y - 110 + sw * 40, 1.1, { flip: true });
    }
    return p;
  }

  function drawBirzha(ctx, t) {
    // rise on the green candle from below the panel: 0.04 .. 0.36, springy
    const riseU = clamp((t - 0.04) / 0.5);
    const rise = riseU <= 0 ? 0 : F.spring(riseU * 0.9, 1.4, 5.5);
    const R = 120 * BZ_S;
    const L = lunge(t), W = windup(t);
    const x = BZ_HOME[0] - L * 175 + W * 40;
    const y = lerp(PY + PH + R + 60, BZ_HOME[1], rise) + Math.sin(t * 9) * 4 - W * 20 + L * 10;
    drawRiser(ctx, x, y, R, clamp(riseU * 1.4));
    let sx = 1, sy = 1;
    const st = F.squash(t, 0.36, -0.22, 0.45); // stretch at the top of the rise
    sx *= st[0]; sy *= st[1];
    CH.forEach((tb) => { const q = F.squash(t, tb, 0.24, 0.4); sx *= q[0]; sy *= q[1]; });
    sx *= 1 - W * 0.06; sy *= 1 + W * 0.08;
    const j = jaw(t);
    CAST.birzha(ctx, {
      x, y: y - j * R * 0.25, s: BZ_S, t, face: 'laugh', greedy: true, jaw: j,
      rot: -L * 0.12 + W * 0.1, sx, sy,
      gloves: { l: [x - 150 - L * 40, y + 60 + Math.sin(t * 16) * 10], r: [x + 190, y - 40 + Math.sin(t * 13) * 12] },
    });
    return { x, y, R };
  }

  // blue rim crumbs flying from the bite point
  function drawCrumbs(ctx, t) {
    CH.forEach((tb, i) => {
      const age = t - tb;
      if (age < 0 || age > 0.75) return;
      const bx = TIME_HOME[0] + 110 - i * 10, by = TIME_HOME[1] - 80 + i * 40;
      const fade = clamp((0.75 - age) / 0.25);
      for (let k = 0; k < 14; k++) {
        const a = -Math.PI * 0.5 + (h01('ca', i, k) - 0.5) * Math.PI * 1.4;
        const v = 500 + h01('cv', i, k) * 650;
        const px = bx + Math.cos(a) * v * age;
        const py = by + Math.sin(a) * v * age + 1900 * age * age;
        const s = 10 + h01('cs', i, k) * 16;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(age * (h01('cr', i, k) - 0.5) * 20);
        ctx.globalAlpha = fade;
        ctx.fillStyle = k % 3 === 0 ? P.timeCyan : k % 3 === 1 ? P.timeBlue : '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 1.15);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    });
  }

  function drawFx(ctx, t) {
    // crash puffs and ring on landing
    const spots = [[570, 890, -0.14, 160], [470, 860, 0.12, 175], [585, 840, -0.08, 195]];
    CH.forEach((tb, i) => {
      F.shockRing(ctx, TIME_HOME[0] + 120, TIME_HOME[1] - 60, t - tb, { r: 200, color: P.bzYellow, width: 16, life: 0.35 });
      const s = spots[i];
      F.impactStar(ctx, s[0], s[1], t, tb, { size: s[3], rot: s[2], color: P.bzYellow, color2: P.bzRed, life: 0.38, seed: 40 + i });
      if (t >= tb - 1e-6 && t <= tb + 0.38) {
        const age = t - tb;
        const sc = F.pop(t, tb, 0.18) * (1 + age * 0.15);
        F.text(ctx, 'CHOMP!', s[0], s[1] + 4, { size: s[3] * 0.3, scale: sc, rot: s[2], fill: P.ink, alpha: clamp((0.38 - age) / 0.15) });
      }
    });
  }

  function fmt(min) {
    const m = Math.round(min);
    const h = Math.floor(m / 60), mm = m % 60;
    return `${h}h ${mm < 10 ? '0' : ''}${mm}m`;
  }

  function drawHud(ctx, t) {
    F.label(ctx, 'ROUND 2', 80, 250, { size: 34, bg: P.yellow, color: P.ink, align: 'left' });
    // counter value: rolls up fast right after each beat
    let minutes = MINUTES[0];
    CH.forEach((tb, i) => { minutes += (MINUTES[i + 1] - MINUTES[i]) * F.seg(t, tb - 1 / 60, tb + 0.16, E.outCubic); });
    const pulse = CH.reduce((a, tb) => a + (t >= tb ? Math.exp(-(t - tb) * 9) : 0), 0);
    const intro = 0.75 + 0.25 * F.spring(t * 1.6 + 0.05, 2, 6);
    const cx = 540, cy = 395, w = 760, h = 180;
    ctx.save();
    ctx.translate(cx, cy);
    const sc = intro * (1 + pulse * 0.07);
    ctx.scale(sc, sc);
    ctx.rotate(Math.sin(t * 40) * pulse * 0.02);
    F.card(ctx, -w / 2, -h / 2, w, h, { r: 40, fill: '#ffffff', shadowDy: 14, blur: 30, shadowColor: 'rgba(0,0,0,0.4)' });
    // red flash band on hits
    if (pulse > 0.02) {
      ctx.save();
      ctx.globalAlpha = clamp(pulse) * 0.18;
      F.rrect(ctx, -w / 2, -h / 2, w, h, 40); ctx.fillStyle = P.down; ctx.fill();
      ctx.restore();
    }
    // hourglass-ish clock icon
    ctx.save();
    ctx.translate(-w / 2 + 92, 0);
    ctx.fillStyle = P.down;
    ctx.beginPath(); ctx.arc(0, 0, 50, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.fill();
    ctx.strokeStyle = P.ink; ctx.lineWidth = 7; ctx.lineCap = 'round';
    const ha = t * 14, ma = t * 50;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(ha) * 18, -Math.cos(ha) * 18); ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(ma) * 28, -Math.cos(ma) * 28); ctx.stroke();
    ctx.restore();
    F.text(ctx, 'TIME WASTED', -w / 2 + 170, -40, { size: 34, fill: P.lsSlate, align: 'left', font: 'mono', letter: 6, rounded: false });
    const blur = pulse > 0.3 && t < CH[2] + 0.2 ? 1 : 0;
    F.text(ctx, fmt(minutes), -w / 2 + 166, 32, { size: 96, fill: P.down, align: 'left', font: 'mono', sy: 1 + blur * 0.06 });
    ctx.restore();
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      // exit whip-pan to the left
      const pu = F.seg(t, PAN0, info.dur, E.inCubic);
      const panX = -pu * 1250;
      const [shx, shy] = F.shakeMany(t, [[LAND, 0.3, 12], [CH[0], 0.3, 20], [CH[1], 0.3, 22], [CH[2], 0.35, 28]], 7);

      // 1. backdrop (pans slower: parallax)
      drawBackdrop(ctx, t, panX * 0.6);

      ctx.save();
      ctx.translate(panX + shx, shy);
      if (pu > 0) { ctx.translate(540, 0); ctx.scale(1 + pu * 0.35, 1); ctx.translate(-540, 0); }
      // 2-3. panel
      drawPanel(ctx, t);
      // 4. Time behind биржа (crash dust behind him)
      F.shockRing(ctx, TIME_HOME[0], TIME_HOME[1] + 130, t - LAND, { r: 230, squash: 0.3, color: P.timeCyan, width: 14 });
      F.puffs(ctx, TIME_HOME[0], TIME_HOME[1] + 120, t - LAND, { n: 7, seed: 31, size: 46, spread: 210, color: 'rgba(200,215,255,0.55)' });
      drawTime(ctx, t);
      // 5. биржа
      drawBirzha(ctx, t);
      // 6. effects
      drawCrumbs(ctx, t);
      drawFx(ctx, t);
      ctx.restore();

      // 7. HUD rides the pan too (everything whips out)
      ctx.save();
      ctx.translate(panX + shx * 0.4, shy * 0.4);
      drawHud(ctx, t);
      ctx.restore();

      // 8. whip smear + speed lines
      if (pu > 0) {
        if (ctx.canvas && pu > 0.05) {
          ctx.save();
          ctx.globalAlpha = 0.45;
          ctx.drawImage(ctx.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height, 90 * pu, 0, FILM.W, FILM.H);
          ctx.restore();
        }
        F.speedLines(ctx, { angle: Math.PI, count: 34, color: '#ffffff', alpha: 0.25 + 0.55 * pu, seed: 303, t, speed: 5200, len: 520, width: 6 });
      }
    },
  });
})();
