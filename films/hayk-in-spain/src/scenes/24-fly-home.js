/*
 * Shot 24 'fly-home' : "Flying home"  (global T 104.0 - 108.0, 4 s, wipe in from the left)
 *
 * 0.0 - 2.2  The Europe map (reprise of shot 06, reversed): the plane rockets Spain -> Armenia
 *            along the dotted arc, leaving a fire trail, speed lines everywhere. The plane rides
 *            low and heavy: a burger-shaped bag dangles from its open cargo door.
 *            Caption bar "SPAIN -> YEREVAN" (from 0.0) and stamp "MISSION: GOOFY" (slams at 0.5).
 * 2.2 - 2.5  Crash-zoom into Armenia (focus lines).
 * 2.5        (T 106.5) cut to Zvartnots runway at golden hour, Ararat behind: the plane slams down
 *            and skids, huge dust cloud, sparks, "SKRRT!".
 *
 * Layers: map (sea, land, grid, flags) -> fire trail -> dotted arc -> plane + bag -> speed lines
 *   -> captions | runway (sky, Ararat, terminal, runway) -> dust -> plane -> sparks -> SKRRT! -> captions.
 */
(function () {
  'use strict';
  const ID = 'fly-home';
  const FILM = window.FILM;
  const L = FILM.lib;
  const F = FILM.fx;
  const C = F.pal;
  const TAU = Math.PI * 2;
  const clamp = F.clamp, lerp = F.lerp, h01 = F.h01;
  const { rrect, fo, ellipse, poly } = F;
  const FR = 1 / 24;

  const B_FLY0 = 0.0; //   T 104.0 plane leaves Spain
  const B_FLY1 = 2.1; //   T 106.1 plane reaches Armenia
  const B_STAMP = 0.5; //  T 104.5 "MISSION: GOOFY" stamp
  const B_ZOOM = 2.1; //   T 106.1 crash zoom
  const B_LAND = 2.5; //   T 106.5 touchdown, SKRRT!

  // map anchors
  const SPAIN = [190, 1090];
  const ARMENIA = [990, 1004];
  const CTRL = [600, 640];

  const bez = (u) => {
    const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
    return [a * SPAIN[0] + b * CTRL[0] + c * ARMENIA[0], a * SPAIN[1] + b * CTRL[1] + c * ARMENIA[1]];
  };
  const bezTan = (u) => {
    const dx = 2 * (1 - u) * (CTRL[0] - SPAIN[0]) + 2 * u * (ARMENIA[0] - CTRL[0]);
    const dy = 2 * (1 - u) * (CTRL[1] - SPAIN[1]) + 2 * u * (ARMENIA[1] - CTRL[1]);
    return Math.atan2(dy, dx);
  };

  // ---------------------------------------------------------------------------
  // Map (static, cached)
  // ---------------------------------------------------------------------------
  const EUROPE = [
    [470, 640], [520, 600], [560, 560], [600, 520], [620, 420], [660, 280],
    [1260, 280], [1260, 880], [1050, 890], [1010, 940], [1050, 975], [1260, 990], [1260, 1140],
    [1000, 1135], [900, 1122], [820, 1112], [770, 1090], [752, 1050], [782, 1016],
    [740, 1000], [722, 1058], [700, 1086], [684, 1040], [668, 990], [640, 946], [606, 904],
    [612, 950], [632, 1000], [656, 1050], [672, 1086], [648, 1102], [624, 1076], [600, 1030], [572, 985], [545, 940], [520, 905],
    [465, 930], [405, 950], [352, 1000], [332, 1062], [302, 1130], [252, 1180], [172, 1200], [112, 1180], [72, 1120],
    [62, 1032], [112, 992], [202, 990], [290, 982], [302, 905], [245, 852], [302, 802], [362, 762], [420, 720],
  ];
  const SCANDI = [[560, 280], [520, 380], [540, 460], [600, 500], [640, 430], [680, 360], [720, 280]];
  const UK = [[270, 520], [320, 500], [345, 580], [365, 660], [332, 722], [262, 732], [284, 662], [252, 600]];
  const AFRICA = [[-40, 1400], [100, 1368], [250, 1356], [400, 1388], [520, 1378], [620, 1420], [700, 1446], [800, 1422], [900, 1404], [1000, 1384], [1120, 1372], [1260, 1380], [1260, 1980], [-40, 1980]];
  const IBERIA = [[352, 1000], [332, 1062], [302, 1130], [252, 1180], [172, 1200], [112, 1180], [72, 1120], [62, 1032], [112, 992], [202, 990], [290, 982], [330, 990]];
  const ARM = [[962, 986], [990, 978], [1016, 990], [1022, 1016], [1004, 1032], [976, 1030], [960, 1010]];

  function mapBg() {
    return L.cached(ID + '-map', () => {
      const c = FILM.makeCanvas(1240, 1920);
      const g = c.getContext('2d');
      const sg = g.createLinearGradient(0, 0, 0, 1920);
      sg.addColorStop(0, '#2f7fd0'); sg.addColorStop(0.5, '#3f9be6'); sg.addColorStop(1, '#2a6cc0');
      g.fillStyle = sg; g.fillRect(0, 0, 1240, 1920);
      // wave ticks
      g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 4; g.lineCap = 'round';
      for (let i = 0; i < 40; i++) {
        const x = h01(ID, 'wx', i) * 1240, y = h01(ID, 'wy', i) * 1920;
        g.beginPath(); g.arc(x, y, 14, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      }
      // grid
      g.strokeStyle = 'rgba(255,255,255,0.13)'; g.lineWidth = 2;
      for (let x = 0; x <= 1240; x += 135) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1920); g.stroke(); }
      for (let y = 0; y <= 1920; y += 160) { g.beginPath(); g.moveTo(0, y); g.lineTo(1240, y); g.stroke(); }
      const land = (pts, fill) => {
        // shallow-water halo
        g.save();
        g.lineJoin = 'round';
        poly(g, pts); g.lineWidth = 26; g.strokeStyle = 'rgba(160,220,255,0.45)'; g.stroke();
        poly(g, pts); g.fillStyle = fill; g.fill();
        g.lineWidth = 5; g.strokeStyle = C.line; g.stroke();
        g.restore();
      };
      land(AFRICA, '#f0cf8e');
      land(EUROPE, '#b9dc8a');
      land(SCANDI, '#b9dc8a');
      land(UK, '#b9dc8a');
      g.save(); ellipse(g, 205, 640, 38, 54); g.fillStyle = '#b9dc8a'; g.fill(); g.lineWidth = 5; g.strokeStyle = C.line; g.stroke(); g.restore();
      // seas cut out of the land
      [[850, 955, 95, 42, -0.1], [1120, 920, 70, 90, 0], [640, 520, 40, 90, 0.4]].forEach(([x, y, rx, ry, r]) => {
        g.save(); ellipse(g, x, y, rx, ry, r); g.fillStyle = '#3f9be6'; g.fill(); g.lineWidth = 5; g.strokeStyle = C.line; g.stroke(); g.restore();
      });
      // islands
      [[530, 1000, 12, 26], [600, 1135, 26, 13], [760, 1150, 26, 8], [880, 1170, 20, 9], [345, 1100, 16, 9]].forEach(([x, y, rx, ry]) => {
        g.save(); ellipse(g, x, y, rx, ry); g.fillStyle = '#b9dc8a'; g.fill(); g.lineWidth = 4; g.strokeStyle = C.line; g.stroke(); g.restore();
      });
      // country borders (soft dashed)
      g.save();
      g.setLineDash([10, 10]); g.strokeStyle = 'rgba(40,80,40,0.45)'; g.lineWidth = 3;
      [[[330, 990], [360, 900], [440, 820]], [[440, 820], [520, 780], [600, 800], [640, 880]], [[520, 700], [560, 800]], [[700, 640], [720, 800], [760, 900]], [[820, 700], [900, 860]], [[760, 1000], [800, 960]]].forEach((ln) => {
        g.beginPath(); ln.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      });
      g.restore();
      // highlight Spain and Armenia
      g.save(); poly(g, IBERIA); g.fillStyle = '#ffd35a'; g.fill(); g.lineWidth = 5; g.strokeStyle = C.line; g.stroke(); g.restore();
      g.save(); poly(g, ARM); g.fillStyle = '#ff7a4a'; g.fill(); g.lineWidth = 5; g.strokeStyle = C.line; g.stroke(); g.restore();
      // compass rose (Africa)
      g.save(); g.translate(170, 1620);
      g.fillStyle = '#fff6e3'; g.strokeStyle = C.line; g.lineWidth = 4;
      for (let i = 0; i < 4; i++) {
        g.save(); g.rotate(i * Math.PI / 2);
        g.beginPath(); g.moveTo(0, -90); g.lineTo(18, 0); g.lineTo(-18, 0); g.closePath(); g.fillStyle = i === 0 ? '#e8413c' : '#fff6e3'; g.fill(); g.stroke();
        g.restore();
      }
      g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fillStyle = '#ffcc33'; g.fill(); g.stroke();
      g.restore();
      return c;
    });
  }

  // ---------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------
  function pin(ctx, x, y, t, color) {
    const b = 1 + 0.12 * F.beatPulse(t);
    ctx.save(); ctx.translate(x, y); ctx.scale(b, b);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-30, -40, -30, -70, 0, -74); ctx.bezierCurveTo(30, -70, 30, -40, 0, 0);
    fo(ctx, color, 5);
    ctx.beginPath(); ctx.arc(0, -50, 10, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.restore();
  }

  // burger bag hanging from the cargo door; drawn in plane-local units (s = plane scale)
  function cargoBag(ctx, s, swing, t) {
    const dx = 30, dy = 34;
    const bx = dx + Math.sin(swing) * 120, by = dy + Math.cos(swing) * 120;
    ctx.save();
    ctx.strokeStyle = C.line; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(dx, dy); ctx.quadraticCurveTo((dx + bx) / 2 + 8, (dy + by) / 2 + 10, bx, by - 30); ctx.stroke();
    // the bag: a burger-shaped sack
    F.burger(ctx, bx, by + 20, 0.7, { rot: swing * 0.6 });
    // tag
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(bx + 50, by - 36, 9, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function cargoDoor(ctx) {
    // open hatch on the fuselage belly
    rrect(ctx, 0, 6, 64, 28, 5); fo(ctx, '#2a2233', 4);
    ctx.beginPath(); ctx.moveTo(0, 34); ctx.lineTo(64, 34); ctx.lineTo(74, 62); ctx.lineTo(8, 62); ctx.closePath(); fo(ctx, '#dde5f2', 4);
  }

  function fireTrail(ctx, u0, u1, t) {
    // thick flame ribbon from u0 to u1 along the arc, hottest near the plane (u1)
    const n = 36;
    const b = L.boil(L.T);
    for (let layer = 0; layer < 3; layer++) {
      const col = ['#ff4a1a', '#ff9a2a', '#fff06a'][layer];
      const wmax = [70, 44, 20][layer];
      ctx.save();
      ctx.globalAlpha = [0.85, 0.9, 1][layer];
      ctx.fillStyle = col;
      ctx.beginPath();
      const left = [], right = [];
      for (let i = 0; i <= n; i++) {
        const u = lerp(u0, u1, i / n);
        const p = bez(u);
        const a = bezTan(u);
        const k = i / n; // 0 tail .. 1 plane
        const flick = 0.75 + h01(ID, 'ft', layer, i, b) * 0.5;
        const w = wmax * Math.pow(k, 0.8) * flick;
        left.push([p[0] - Math.sin(a) * w, p[1] + Math.cos(a) * w]);
        right.push([p[0] + Math.sin(a) * w, p[1] - Math.cos(a) * w]);
      }
      left.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // embers
    for (let i = 0; i < 16; i++) {
      const u = lerp(u0, u1, h01(ID, 'em', i));
      const p = bez(u);
      const age = (t * 3 + h01(ID, 'ea', i)) % 1;
      ctx.save(); ctx.globalAlpha = 1 - age;
      ctx.fillStyle = i % 2 ? '#ffcc33' : '#ff6a2a';
      ctx.beginPath(); ctx.arc(p[0] + (h01(ID, 'ex', i) - 0.5) * 80, p[1] + (h01(ID, 'ey', i) - 0.5) * 80 - age * 40, 7 * (1 - age) + 2, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  function dottedArc(ctx, u0, u1) {
    ctx.save();
    ctx.setLineDash([22, 18]);
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.line; ctx.lineWidth = 14;
    const path = () => { ctx.beginPath(); for (let i = 0; i <= 40; i++) { const p = bez(lerp(u0, u1, i / 40)); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } };
    path(); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 8;
    path(); ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Part 1: map flight
  // ---------------------------------------------------------------------------
  function drawMap(ctx, t, tw) {
    const u = L.ease.inOutSine(clamp((t - B_FLY0) / (B_FLY1 - B_FLY0)));
    const pp = bez(u);
    const ang = bezTan(u);
    // camera: gentle follow, then crash-zoom into Armenia
    const zk = L.ease.inQuad(clamp((t - B_ZOOM) / (B_LAND - B_ZOOM)));
    const z0 = 1.3;
    const z = lerp(z0, 4.2, zk);
    const cx0 = clamp(lerp(540, pp[0], 0.7), 540 / z0, 1080 - 540 / z0);
    const cy0 = lerp(1000, pp[1], 0.25) + 20;
    const cxF = lerp(cx0, ARMENIA[0], zk);
    const cyF = lerp(cy0, ARMENIA[1] - 20, zk);
    ctx.save();
    ctx.translate(540, 1000); ctx.scale(z, z); ctx.translate(-cxF, -cyF);
    ctx.drawImage(mapBg(), 0, 0);
    // clouds drifting over the map (parallax)
    ctx.save(); ctx.globalAlpha = 0.85;
    [[150, 420, 170], [760, 330, 200], [420, 1560, 190], [900, 1650, 160]].forEach(([x, y, w], i) => {
      F.cloud(ctx, ((x - t * 60 * (1 + i * 0.3)) % 1300 + 1300) % 1300 - 110, y, w);
    });
    ctx.restore();
    // pins + flags
    F.flag(ctx, SPAIN[0] - 20, SPAIN[1] - 10, 0.55, 'ES', { t });
    F.flag(ctx, ARMENIA[0] - 110, ARMENIA[1] - 20, 0.55, 'AM', { t });
    pin(ctx, SPAIN[0], SPAIN[1], t, '#ffcc33');
    pin(ctx, ARMENIA[0], ARMENIA[1], t, '#e8413c');
    F.tag(ctx, 'SPAIN', SPAIN[0] + 10, SPAIN[1] + 50, { size: 30 });
    F.tag(ctx, 'YEREVAN', ARMENIA[0] - 60, ARMENIA[1] + 50, { size: 30, bg: '#e8413c' });
    // sail boats bobbing on the Mediterranean
    [[420, 1230, 0], [760, 1300, 1], [250, 1330, 2], [930, 1250, 3]].forEach(([x, y, i]) => {
      const bb = Math.sin(t * 5 + i) * 4;
      ctx.save(); ctx.translate(x, y + bb); ctx.rotate(Math.sin(t * 4 + i) * 0.08);
      ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(34, 0); ctx.lineTo(24, 16); ctx.lineTo(-24, 16); ctx.closePath(); fo(ctx, '#ffffff', 4);
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -60); ctx.lineTo(30, -8); ctx.closePath(); fo(ctx, i % 2 ? '#ffcc33' : '#e8413c', 4);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-60, 22); ctx.lineTo(-30, 22); ctx.moveTo(40, 24); ctx.lineTo(60, 24); ctx.stroke();
      ctx.restore();
    });
    // the plane's shadow on the map (it flies low)
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#10142a';
    ellipse(ctx, pp[0] + 40, pp[1] + 190, 150, 26, ang * 0.6); ctx.fill();
    ctx.restore();
    // arc: dotted ahead, fire behind
    dottedArc(ctx, u, 1);
    fireTrail(ctx, Math.max(0, u - 0.55), u, t);
    // the plane: low and heavy, bobbing
    const bob = Math.sin(tw * Math.PI * 6) * 6;
    const s = 0.62;
    ctx.save();
    ctx.translate(pp[0], pp[1] + bob);
    ctx.rotate(ang + 0.1);
    ctx.scale(s, s);
    cargoBag(ctx, s, -0.5 + Math.sin(t * 9) * 0.25, t);
    F.plane(ctx, 0, 0, 1, {});
    cargoDoor(ctx);
    // afterburner flame at the tail
    const fl = 0.8 + h01(ID, 'ab', L.boil(L.T)) * 0.4;
    ctx.beginPath(); ctx.moveTo(-285, -30); ctx.quadraticCurveTo(-420 * fl, -10, -500 * fl, 0); ctx.quadraticCurveTo(-420 * fl, 14, -285, 20); ctx.closePath(); fo(ctx, '#ff7a1a', 4);
    ctx.beginPath(); ctx.moveTo(-285, -18); ctx.quadraticCurveTo(-370 * fl, -6, -410 * fl, 0); ctx.quadraticCurveTo(-370 * fl, 8, -285, 10); ctx.closePath(); fo(ctx, '#ffe066', 0);
    ctx.restore();
    // sweat drop on the struggling plane
    F.sweat(ctx, pp[0] + 80, pp[1] - 100 + bob, 1.0, {});
    ctx.restore();

    // screen-fixed speed lines along the flight direction
    ctx.save();
    F.speedLines(ctx, { angle: ang, count: 34, color: '#ffffff', alpha: 0.55, t, speed: 3600, len: 520, width: 7, seed: 44 });
    ctx.restore();
    if (t >= B_ZOOM) {
      F.focusLines(ctx, 540, 1000, { inner: 300 - zk * 120, count: 110, color: '#ffffff', alpha: 0.5 + zk * 0.4, width: 16, seed: 46 });
    }
  }

  // ---------------------------------------------------------------------------
  // Part 2: the runway landing
  // ---------------------------------------------------------------------------
  function runwayBg() {
    return L.cached(ID + '-runway', () => {
      const c = FILM.makeCanvas(1080, 1920);
      const g = c.getContext('2d');
      const sg = g.createLinearGradient(0, 0, 0, 1150);
      sg.addColorStop(0, '#ff7e5f'); sg.addColorStop(0.55, '#ffb070'); sg.addColorStop(1, '#ffe1a0');
      g.fillStyle = sg; g.fillRect(0, 0, 1080, 1160);
      // sun
      const rg = g.createRadialGradient(820, 820, 30, 820, 820, 320);
      rg.addColorStop(0, 'rgba(255,250,210,1)'); rg.addColorStop(0.3, 'rgba(255,240,170,0.8)'); rg.addColorStop(1, 'rgba(255,220,150,0)');
      g.fillStyle = rg; g.fillRect(400, 400, 900, 900);
      // Ararat
      F.ararat(g, 40, 1110, 1000, 520, { color: '#8a78b8', shade: '#6f5f9f', snow: '#fff2ea' });
      // far hills
      g.fillStyle = '#9c7fa8';
      g.beginPath(); g.moveTo(0, 1110); for (let i = 0; i <= 12; i++) g.lineTo(i * 90, 1080 + Math.sin(i * 1.7) * 18); g.lineTo(1080, 1160); g.lineTo(0, 1160); g.closePath(); g.fill();
      // terminal building + tower (right)
      g.fillStyle = '#e9d9c8'; g.strokeStyle = C.line; g.lineWidth = 4;
      g.beginPath(); g.moveTo(640, 1150); g.lineTo(640, 1040); g.quadraticCurveTo(820, 980, 1080, 1030); g.lineTo(1080, 1150); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#5b86c4';
      for (let i = 0; i < 9; i++) g.fillRect(660 + i * 46, 1070, 34, 40);
      g.fillStyle = '#e9d9c8'; g.fillRect(570, 880, 40, 270); g.strokeRect(570, 880, 40, 270);
      g.beginPath(); g.moveTo(545, 880); g.lineTo(635, 880); g.lineTo(620, 830); g.lineTo(560, 830); g.closePath(); g.fillStyle = '#5b86c4'; g.fill(); g.stroke();
      g.fillStyle = '#e8413c'; g.fillRect(585, 800, 10, 30);
      // ground
      g.fillStyle = '#c9a36a'; g.fillRect(0, 1150, 1080, 770);
      g.fillStyle = '#b48d56';
      for (let i = 0; i < 30; i++) g.fillRect(h01(ID, 'gx', i) * 1080, 1160 + h01(ID, 'gy', i) * 80, 40, 5);
      // runway (perspective band)
      g.fillStyle = '#56535e';
      g.beginPath(); g.moveTo(-200, 1330); g.lineTo(1280, 1250); g.lineTo(1280, 1560); g.lineTo(-200, 1720); g.closePath(); g.fill();
      g.strokeStyle = '#f4f4f4'; g.lineWidth = 8;
      g.beginPath(); g.moveTo(-200, 1340); g.lineTo(1280, 1260); g.stroke();
      g.beginPath(); g.moveTo(-200, 1706); g.lineTo(1280, 1548); g.stroke();
      // skid marks
      g.strokeStyle = 'rgba(20,18,26,0.5)'; g.lineWidth = 10;
      g.beginPath(); g.moveTo(-100, 1520); g.lineTo(560, 1460); g.stroke();
      g.beginPath(); g.moveTo(-100, 1560); g.lineTo(560, 1500); g.stroke();
      // foreground grass tufts
      g.fillStyle = '#8fae5a';
      for (let i = 0; i < 26; i++) {
        const x = h01(ID, 'tx', i) * 1080, y = 1760 + h01(ID, 'ty', i) * 140;
        g.beginPath(); g.moveTo(x - 16, y); g.lineTo(x - 4, y - 30); g.lineTo(x + 2, y); g.lineTo(x + 10, y - 26); g.lineTo(x + 18, y); g.closePath(); g.fill();
      }
      return c;
    });
  }

  function drawRunway(ctx, t, tw) {
    const age = t - B_LAND;
    const sh = F.shakeMany(t, [[B_LAND, 0.7, 30]], 12);
    // plane skid: fast -> stop
    const k = L.ease.outCubic(clamp(age / 1.3));
    const px = lerp(260, 600, k);
    const drop = Math.max(0, 1 - age / (3 * FR)) * 60; // slam down over 3 frames
    const bounce = age < 0.5 ? -Math.abs(Math.sin(age * Math.PI * 4)) * 18 * (1 - age / 0.5) : 0;
    const py = 1290 - drop + bounce;
    const rot = age < 0.12 ? -0.06 : 0.015 * Math.sin(age * 20) * Math.max(0, 1 - age);
    const s = 1.7;
    ctx.save();
    ctx.translate(sh[0], sh[1]);
    ctx.translate(540, 960); ctx.scale(1.05, 1.05); ctx.translate(-540, -960);
    ctx.drawImage(runwayBg(), 0, 0);
    // runway centre dashes streaming left (skid speed)
    const spd = (1 - k);
    ctx.save();
    ctx.fillStyle = '#f4f4f4';
    const off = (age * 1400 * (1 - k * 0.8)) % 220;
    for (let i = -1; i < 8; i++) {
      const x = i * 220 - off;
      const y1 = 1520 - (x + 200) * (1520 - 1405) / 1480;
      ctx.save(); ctx.translate(x, y1); ctx.rotate(-0.078); ctx.fillRect(0, -7, 120, 14); ctx.restore();
    }
    ctx.restore();
    // birds scattering
    for (let i = 0; i < 5; i++) {
      const bx = 180 + i * 90 + age * 200, by = 700 - i * 30 - age * 160;
      const flap = Math.sin(t * 20 + i) * 10;
      ctx.strokeStyle = C.line; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(bx - 16, by - flap); ctx.lineTo(bx, by); ctx.lineTo(bx + 16, by - flap); ctx.stroke();
    }
    // dust cloud behind the wheels (big)
    const wheelY = py + 90 * s;
    const fade = 1 - clamp((age - 0.9) / 0.9) * 0.6;
    for (let i = 0; i < 18; i++) {
      const a = h01(ID, 'dc', i);
      const grow = L.ease.outCubic(clamp(age / 0.5));
      const dx = 60 - i * 55 * (0.4 + grow) - a * 80 - age * 40;
      const dy = -a * 190 * grow - 10 - i * 4 * grow;
      const r = (80 + a * 110) * (0.4 + grow) * (1 - i * 0.015);
      ctx.save(); ctx.globalAlpha = (0.97 - i * 0.025) * fade;
      ellipse(ctx, px - 200 + dx, wheelY + dy, r * 1.25, r); fo(ctx, i % 3 ? '#f3e2c0' : '#e2c99a', 4, 'rgba(27,20,36,0.55)');
      ctx.restore();
    }
    F.dust(ctx, px - 150, wheelY, age, { n: 10, size: 90, spread: 520, color: '#f6e6c6', seed: 21, life: 1.2 });
    F.dust(ctx, px + 250, wheelY, age - 0.05, { n: 7, size: 80, spread: 380, color: '#f6e6c6', seed: 23, life: 1.0 });
    // horizontal speed lines while skidding
    ctx.save(); ctx.globalAlpha = spd;
    F.speedLines(ctx, { angle: 0, count: 26, color: '#ffffff', alpha: 0.7, t, speed: 3000, len: 460, width: 8, seed: 27, y: 700, h: 900 });
    ctx.restore();

    // the plane
    ctx.save();
    ctx.translate(px, py); ctx.rotate(rot); ctx.scale(s, s);
    // landing gear
    ctx.strokeStyle = C.line; ctx.lineWidth = 8;
    [[-60, 32], [190, 32]].forEach(([gx, gy]) => {
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + 48); ctx.stroke();
      ctx.beginPath(); ctx.arc(gx, gy + 58, 17, 0, TAU); ctx.fillStyle = '#2a2233'; ctx.fill(); ctx.lineWidth = 4; ctx.stroke(); ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(gx, gy + 58, 6, 0, TAU); ctx.fillStyle = '#c9d3e6'; ctx.fill();
    });
    // swinging burger bag (swings forward on the brake)
    const sw = 0.9 * Math.exp(-age * 2.5) * Math.cos(age * 9) + 0.25;
    cargoBag(ctx, s, sw, t);
    F.plane(ctx, 0, 0, 1, {});
    cargoDoor(ctx);
    ctx.restore();
    // sparks from the wheels
    if (age < 1.2) {
      const b = L.boil(L.T);
      ctx.save();
      ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      [-60, 190].forEach((gx, j) => {
        const wx = px + gx * s, wy = py + 90 * s;
        for (let i = 0; i < 6; i++) {
          const a = Math.PI + 0.2 + h01(ID, 'sp', j, i, b) * 0.8;
          const len = (40 + h01(ID, 'sl', j, i, b) * 80) * (1 - age / 1.2);
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * len, wy - Math.sin(a) * len * 0.5); ctx.stroke();
        }
      });
      ctx.restore();
    }
    // crumbs flung from the bag
    F.crumbs(ctx, px + 30 * s, py + 160 * s, age, { n: 12, spread: 500, seed: 19, life: 0.9 });
    ctx.restore();
    // impact flash on touchdown
    if (age < 2 * FR) F.flash(ctx, 0.55, '#fff6e0');
    F.sfx(ctx, 'SKRRT!', 540, 760, t, B_LAND, { size: 210, fill: C.sfxYellow, rot: -0.1, shadowColor: '#b3122b' });
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      if (t < B_LAND - 1e-6) drawMap(ctx, t, tw);
      else drawRunway(ctx, t, tw);

      // captions (screen-fixed)
      F.caption(ctx, 'SPAIN -> YEREVAN', 540, 300, { size: 66, align: 'center', bg: C.line, accent: C.gold });
      if (t >= B_STAMP - 1e-6) F.stamp(ctx, 'MISSION: GOOFY', 560, 450, t, B_STAMP, { size: 84, color: '#e3243b', rot: -0.1 });
    },
  });
})();
