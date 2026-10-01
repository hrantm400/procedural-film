// music.js : the score and sound design of the film.
// Owner: music. Contract: docs/CONTRACT.md, section Audio.
//
// FILM.audio.render(ctx, { start = 0, dest = ctx.destination }) schedules the whole piece,
// music and effects, from global time `start` into any BaseAudioContext.
// Every sound is synthesised here: oscillators, periodic waves, seeded noise, filters, envelopes,
// a ping-pong delay, convolver reverbs on generated impulse responses, a glue compressor and a
// soft limiter. Randomness comes only from FILM.lib.rng, seeded per event, so any start time
// schedules the same notes at the same global times.
//
// The engine, instruments, effects and master chain below are film-agnostic. Per film the music
// agent replaces three things: the CH chord table, the MIX.ride section automation, and the whole
// score() function — composing against FILM.TIMELINE.bpm and FILM.TIMELINE.cues so hits land on
// the cuts. What ships here is a demo score that gives the stub pass a pulse; see the skill's
// reference/music.md before composing.
(function () {
  'use strict';
  const FILM = window.FILM;
  const lib = FILM.lib;
  const TAU = Math.PI * 2;
  const FLOOR = 1e-5;

  // DynamicsCompressorNode delays its output by a fixed 6 ms look-ahead (measured: 288 samples at
  // 48 kHz). Every event before the compressor is scheduled that much early, so it leaves the master
  // exactly on its cue. Only an event inside the first 6 ms of a render window can land late.
  const LAT = 0.006;

  // Mix constants, tuned by measurement (tools/audio): loudness, peaks, per-bar profile.
  const MIX = {
    trim: 0.68,
    ceiling: 0.66, // soft limiter output ceiling (about -3.6 dBFS)
    knee: 0.5,
    bus: { drums: 0.6, perc: 0.8, bass: 0.3, pad: 0.26, keys: 0.6, bells: 0.45, lead: 0.5, sfx: 0.62, amb: 0.5 },
    // Master tilt EQ in dB: a low shelf under the subs, presence and air for phone speakers.
    eq: { low: -4, presence: 5, air: 3 },
    comp: { threshold: -18, knee: 10, ratio: 2, attack: 0.006, release: 0.2 },
    // Section fader rides in dB at global times, pre-compressor: full level throughout (an ad), and
    // the end-card chord's tail faded out so it rings out cleanly by 15.0 s.
    ride: [[0, 0], [14.76, 0], [14.99, -36]],
  };

  // ---------------------------------------------------------------- pitch
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function hz(n) {
    if (typeof n === 'number') return n;
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
    const midi = 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // ---------------------------------------------------------------- envelopes
  // pts: [[dt, value, shape]] with dt from the note start; shape is the ramp INTO that point:
  // 'lin' (default), 'exp' or 'set'. The first point must sit at dt 0.
  // When the voice started before the render window (skip > 0) the value at `skip` is computed
  // and automation resumes from there, so a seek hears the same envelope.
  function setEnv(param, pts, c0, skip) {
    let i;
    let prev;
    if (skip > 0) {
      let v = pts[0][1];
      for (i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        if (skip < b[0]) {
          const f = (skip - a[0]) / Math.max(1e-9, b[0] - a[0]);
          const sh = b[2] || 'lin';
          if (sh === 'set') v = a[1];
          else if (sh === 'exp' && a[1] > 0) v = a[1] * Math.pow(Math.max(b[1], FLOOR) / a[1], f);
          else v = a[1] + (b[1] - a[1]) * f;
          break;
        }
        v = b[1];
      }
      param.setValueAtTime(v, c0 + skip);
      prev = v;
    } else {
      param.setValueAtTime(pts[0][1], c0);
      prev = pts[0][1];
      i = 1;
    }
    for (; i < pts.length; i++) {
      const v = pts[i][1];
      const sh = pts[i][2] || 'lin';
      const w = c0 + pts[i][0];
      if (sh === 'set') {
        param.setValueAtTime(v, w);
        prev = v;
      } else if (sh === 'exp' && prev > 0) {
        param.exponentialRampToValueAtTime(Math.max(v, FLOOR), w);
        prev = Math.max(v, FLOOR);
      } else {
        param.linearRampToValueAtTime(v, w);
        prev = v;
      }
    }
  }

  // Percussive amplitude envelope: attack then exponential decay to silence.
  const perc = (vel, att, dec) => [[0, 0], [att, vel], [att + dec, FLOOR, 'exp']];

  // ---------------------------------------------------------------- generated buffers
  function noiseBuffer(ctx, secs, channels, seed) {
    const n = Math.floor(secs * ctx.sampleRate);
    const buf = ctx.createBuffer(channels, n, ctx.sampleRate);
    for (let ch = 0; ch < channels; ch++) {
      const r = lib.rng(lib.hash('film-noise', seed, ch));
      const d = buf.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
    }
    return buf;
  }

  // Impulse response: seeded stereo noise, exponential decay to -60 dB at `secs`, a two-pole
  // lowpass that darkens over the tail, a pre-delay and a few early reflections.
  function impulse(ctx, secs, seed, o) {
    const sr = ctx.sampleRate;
    const n = Math.floor(secs * sr);
    const buf = ctx.createBuffer(2, n, sr);
    const pre = Math.floor(o.pre * sr);
    const tail = secs - o.pre;
    for (let ch = 0; ch < 2; ch++) {
      const r = lib.rng(lib.hash('film-ir', seed, ch));
      const d = buf.getChannelData(ch);
      let l1 = 0;
      let l2 = 0;
      for (let i = pre; i < n; i++) {
        const t = (i - pre) / sr;
        const u = t / tail;
        const env = Math.exp(-6.9 * u) * (t < 0.005 ? t / 0.005 : 1);
        const a = o.bright + (o.dark - o.bright) * Math.sqrt(u);
        l1 += a * (r() * 2 - 1 - l1);
        l2 += a * (l1 - l2);
        d[i] = l2 * env;
      }
      for (let k = 0; k < o.early; k++) {
        const i = pre + Math.floor((0.003 + r() * o.spread) * sr);
        if (i < n) d[i] += (r() * 2 - 1) * 0.35 * (1 - k / o.early);
      }
    }
    return buf;
  }

  // Grains rendered straight into a stereo buffer: band-passed noise flaps and clicks, or short sines.
  // g: { t, dur, amp, pan (-1..1), f, q, att, dec, sine }
  function grainBuffer(ctx, key, secs, grains) {
    const sr = ctx.sampleRate;
    const n = Math.max(1, Math.ceil(secs * sr));
    const buf = ctx.createBuffer(2, n, sr);
    const L = buf.getChannelData(0);
    const R = buf.getChannelData(1);
    const r = lib.rng(lib.hash('film-grain', key));
    for (const g of grains) {
      const i0 = Math.floor(g.t * sr);
      const m = Math.floor(g.dur * sr);
      const gl = Math.cos(((g.pan + 1) * Math.PI) / 4);
      const gr = Math.sin(((g.pan + 1) * Math.PI) / 4);
      const att = g.att || 0.002;
      const dec = g.dec || g.dur * 0.3;
      const w = (TAU * g.f) / sr;
      const al = Math.sin(w) / (2 * (g.q || 1));
      const cw = Math.cos(w);
      const a0 = 1 + al;
      let x1 = 0;
      let x2 = 0;
      let y1 = 0;
      let y2 = 0;
      const ph = r() * TAU;
      for (let k = 0; k < m; k++) {
        const j = i0 + k;
        if (j >= n) break;
        const tt = k / sr;
        let s;
        if (g.sine) s = Math.sin(ph + w * k);
        else {
          const x = r() * 2 - 1;
          s = (al * x - al * x2 + 2 * cw * y1 - (1 - al) * y2) / a0;
          x2 = x1;
          x1 = x;
          y2 = y1;
          y1 = s;
        }
        const env = tt < att ? tt / att : Math.exp(-(tt - att) / dec);
        const tailFade = k > m - 64 ? (m - k) / 64 : 1;
        const v = s * env * tailFade * g.amp;
        if (j >= 0) {
          L[j] += v * gl;
          R[j] += v * gr;
        }
      }
    }
    return buf;
  }

  // Stick-slip creak: irregular pulses, each ringing three damped wooden resonances.
  function creakBuffer(ctx, key, secs, rate0, rate1, formants) {
    const sr = ctx.sampleRate;
    const n = Math.ceil(secs * sr);
    const buf = ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    const r = lib.rng(lib.hash('film-creak', key));
    let t = 0.004;
    while (t < secs - 0.01) {
      const u = t / secs;
      const swell = Math.sin(Math.PI * Math.min(1, u * 1.15)) * (0.55 + 0.45 * r());
      const i0 = Math.floor(t * sr);
      for (const [f, tau, a] of formants) {
        const m = Math.min(n - i0, Math.floor(tau * 5 * sr));
        const fj = f * (0.94 + 0.12 * r());
        for (let k = 0; k < m; k++) d[i0 + k] += swell * a * Math.exp(-k / sr / tau) * Math.sin((TAU * fj * k) / sr);
      }
      const rate = rate0 + (rate1 - rate0) * u;
      t += (1 / rate) * (0.7 + 0.6 * r());
    }
    for (let k = 0; k < 96 && k < n; k++) d[n - 1 - k] *= k / 96;
    return buf;
  }

  // Soft limiter transfer curve. The shaper is fed at half level, so the curve covers inputs up to
  // +6 dBFS: linear to the knee, then a tanh shoulder that never passes the ceiling.
  function limiterCurve(ceiling, knee) {
    const n = 16385;
    const c = new Float32Array(n);
    const room = ceiling - knee;
    for (let i = 0; i < n; i++) {
      const x = ((i / (n - 1)) * 2 - 1) * 2;
      const a = Math.abs(x);
      const y = a <= knee ? a : knee + room * Math.tanh((a - knee) / room);
      c[i] = x < 0 ? -y : y;
    }
    return c;
  }

  function periodic(ctx, n, amp) {
    const real = new Float32Array(n + 1);
    const imag = new Float32Array(n + 1);
    for (let k = 1; k <= n; k++) imag[k] = amp(k);
    return ctx.createPeriodicWave(real, imag);
  }

  // ---------------------------------------------------------------- engine
  function makeEngine(ctx, start, dest, DUR, MIX) {
    const base = ctx.currentTime;
    const E = { ctx, sr: ctx.sampleRate, start, base, DUR, duckTargets: [] };

    // A voice is a note or effect that starts at global time t0 and lasts len seconds (release included).
    // A sustained voice whose compensated start falls before the window resumes mid-envelope on time.
    // A short voice that starts inside the first 6 ms plays whole, up to 6 ms late; one that began
    // earlier is skipped.
    E.w0 = -Infinity;
    E.w1 = Infinity;
    E.voice = function (t0, len, sustain) {
      if (t0 < E.w0 || t0 >= E.w1) return null; // belongs to another scheduling window
      if (t0 >= DUR || t0 + len <= start) return null;
      const c = base + (t0 - start) - LAT;
      let c0 = c;
      let skip = 0;
      if (c < base) {
        if (sustain) skip = base - c;
        else if (t0 >= start) c0 = base;
        else return null;
      }
      return {
        c0,
        skip,
        len,
        env: (param, pts) => setEnv(param, pts, c0, skip),
        osc(node, stopDt) {
          node.start(c0 + skip);
          node.stop(c0 + Math.max(stopDt === undefined ? len : stopDt, skip + 0.002));
          return node;
        },
        buf(node, offset, stopDt) {
          const d = node.buffer.duration;
          let off = (offset || 0) + skip;
          if (node.loop) off %= d;
          else if (off >= d) return node;
          node.start(c0 + skip, off);
          node.stop(c0 + Math.max(stopDt === undefined ? len : stopDt, skip + 0.002));
          return node;
        },
      };
    };

    E.gain = (v) => {
      const g = ctx.createGain();
      g.gain.value = v === undefined ? 1 : v;
      return g;
    };
    E.osc = (type, f) => {
      const o = ctx.createOscillator();
      if (typeof type === 'string') o.type = type;
      else o.setPeriodicWave(type);
      o.frequency.value = f;
      return o;
    };
    E.filt = (type, f, q) => {
      const b = ctx.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q === undefined ? 0.707 : q;
      return b;
    };
    E.panner = (p) => {
      const s = ctx.createStereoPanner();
      s.pan.value = p;
      return s;
    };
    E.rng = (...k) => lib.rng(lib.hash('film-score', ...k));

    // ---- master: highpass, glue compressor, trim, soft limiter, output fades
    const master = E.gain(1);
    const hp = E.filt('highpass', 26, 0.6);
    const lowShelf = E.filt('lowshelf', 140, 0.7);
    lowShelf.gain.value = MIX.eq.low;
    const presence = E.filt('peaking', 3000, 0.7);
    presence.gain.value = MIX.eq.presence;
    const air = E.filt('highshelf', 8000, 0.7);
    air.gain.value = MIX.eq.air;
    const comp = ctx.createDynamicsCompressor();
    for (const k in MIX.comp) comp[k].value = MIX.comp[k];
    const trim = E.gain(MIX.trim * 0.5);
    const lim = ctx.createWaveShaper();
    lim.curve = limiterCurve(MIX.ceiling, MIX.knee);
    lim.oversample = 'none';
    const out = E.gain(1);
    master.connect(hp);
    hp.connect(lowShelf);
    lowShelf.connect(presence);
    presence.connect(air);
    air.connect(comp);
    comp.connect(trim);
    trim.connect(lim);
    lim.connect(out);
    out.connect(dest);
    E.master = master;
    // Output fades sit after the compressor, so they use uncompensated times. The compressor's
    // first 6 ms are silent; the output then opens over 3 ms, and the last 10 ms taper to zero, so the
    // loop seam and every seek start without a click.
    out.gain.setValueAtTime(0, base);
    out.gain.setValueAtTime(0, base + LAT);
    out.gain.linearRampToValueAtTime(1, base + LAT + 0.003);
    const cEnd = base + (DUR - start);
    if (DUR - start > 0.05) {
      out.gain.setValueAtTime(1, cEnd - 0.01);
      out.gain.linearRampToValueAtTime(0, cEnd);
    }
    // Section rides on the master input, compensated like every other pre-compressor event.
    setEnv(master.gain, MIX.ride.map(([t, d], i) => [t, Math.pow(10, d / 20), i ? 'lin' : undefined]), base - start - LAT, start + LAT);

    // ---- shared buffers
    E.white = noiseBuffer(ctx, 2.5, 1, 'white');
    E.wide = noiseBuffer(ctx, 5, 2, 'wide');
    E.warmSaw = periodic(ctx, 48, (k) => Math.pow(k, -1.35) * (k > 24 ? Math.exp(-(k - 24) / 10) : 1));
    E.softSquare = periodic(ctx, 31, (k) => (k % 2 ? Math.pow(k, -1.5) : 0.04 / k));
    E.brassSaw = periodic(ctx, 40, (k) => Math.pow(k, -1.05));

    // ---- effects returns
    E.fx = {};
    const verb = (name, secs, o, ret) => {
      const c = ctx.createConvolver();
      c.buffer = impulse(ctx, secs, name, o);
      const g = E.gain(ret);
      c.connect(g);
      g.connect(master);
      E.fx[name] = c;
    };
    verb('room', 0.9, { pre: 0.006, bright: 0.55, dark: 0.18, early: 10, spread: 0.035 }, 0.9);
    verb('hall', 2.8, { pre: 0.018, bright: 0.45, dark: 0.09, early: 14, spread: 0.07 }, 0.9);
    verb('cave', 6.0, { pre: 0.03, bright: 0.35, dark: 0.05, early: 18, spread: 0.12 }, 0.85);

    // Ping-pong delay, a dotted 8th (0.375 s) each side.
    const dIn = E.gain(1);
    dIn.channelCount = 1;
    dIn.channelCountMode = 'explicit';
    const dL = ctx.createDelay(1);
    const dR = ctx.createDelay(1);
    dL.delayTime.value = 0.375;
    dR.delayTime.value = 0.375;
    const fL = E.filt('lowpass', 4200, 0.5);
    const fR = E.filt('lowpass', 3400, 0.5);
    const gL = E.gain(0.4);
    const gR = E.gain(0.4);
    dIn.connect(dL);
    dL.connect(fL);
    fL.connect(gL);
    gL.connect(dR);
    dR.connect(fR);
    fR.connect(gR);
    gR.connect(dL);
    const mrg = ctx.createChannelMerger(2);
    fL.connect(mrg, 0, 0);
    fR.connect(mrg, 0, 1);
    const dRet = E.gain(0.75);
    mrg.connect(dRet);
    dRet.connect(master);
    const dVerb = E.gain(0.25);
    dRet.connect(dVerb);
    dVerb.connect(E.fx.hall);
    E.fx.delay = dIn;

    // ---- buses
    E.bus = {};
    // Per-voice sends pass through a tap scaled by the bus gain, so a bus fader moves its reverb too.
    E.tap = {};
    const taps = (name) => {
      E.tap[name] = {};
      for (const k of ['room', 'hall', 'cave', 'delay']) {
        const g = E.gain(MIX.bus[name]);
        g.connect(E.fx[k]);
        E.tap[name][k] = g;
      }
    };
    const bus = (name, sends, duck, hpf) => {
      taps(name);
      const b = E.gain(MIX.bus[name]);
      let tail = b;
      if (hpf) {
        const h = E.filt('highpass', hpf, 0.6);
        tail.connect(h);
        tail = h;
      }
      if (duck) {
        const d = E.gain(1);
        b.connect(d);
        tail = d;
        E.duckTargets.push(d.gain);
      }
      tail.connect(master);
      for (const k in sends) {
        const s = E.gain(sends[k]);
        tail.connect(s);
        s.connect(E.fx[k]);
      }
      E.bus[name] = b;
    };
    // Drum bus: a gentle saturator adds harmonics so the kick reads on phone speakers.
    {
      const b = E.gain(MIX.bus.drums);
      const drive = E.gain(1.6);
      const sat = ctx.createWaveShaper();
      const curve = new Float32Array(2049);
      for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        curve[i] = Math.tanh(x * 1.4) / Math.tanh(1.4);
      }
      sat.curve = curve;
      const back = E.gain(0.72);
      b.connect(drive);
      drive.connect(sat);
      sat.connect(back);
      back.connect(master);
      const rs = E.gain(0.1);
      back.connect(rs);
      rs.connect(E.fx.room);
      E.bus.drums = b;
      taps('drums');
    }
    bus('perc', { room: 0.1 });
    bus('bass', {}, true);
    bus('pad', { hall: 0.22 }, true, 180);
    bus('keys', { room: 0.12, hall: 0.14, delay: 0.06 });
    bus('bells', { hall: 0.3, cave: 0.06, delay: 0.14 });
    bus('lead', { hall: 0.22, delay: 0.18 });
    bus('sfx', { room: 0.14 });
    bus('amb', { hall: 0.12 });

    // Route a voice's last node to a bus, with an optional pan and extra sends.
    E.out = (node, busName, o) => {
      o = o || {};
      let n = node;
      if (o.pan) {
        const p = E.panner(o.pan);
        n.connect(p);
        n = p;
      }
      n.connect(E.bus[busName]);
      for (const k of ['room', 'hall', 'cave', 'delay']) {
        if (o[k]) {
          const s = E.gain(o[k]);
          n.connect(s);
          s.connect(E.tap[busName][k]);
        }
      }
      return n;
    };

    // Looping noise source with a per-event deterministic read offset.
    E.noise = (V, key, stereo) => {
      const s = ctx.createBufferSource();
      s.buffer = stereo ? E.wide : E.white;
      s.loop = true;
      const off = ((lib.hash('film-nz', key) % 100003) / 100003) * s.buffer.duration;
      return V.buf(s, off);
    };

    // Sidechain-style pump: a decaying negative curve added to the pad and bass bus gains on a kick.
    const duckLen = 0.32;
    E.duckBuf = ctx.createBuffer(1, Math.floor(duckLen * E.sr), E.sr);
    {
      const d = E.duckBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i / E.sr;
        d[i] = -(t < 0.006 ? t / 0.006 : Math.exp(-(t - 0.006) / 0.085)) * (i > d.length - 48 ? (d.length - i) / 48 : 1);
      }
    }
    E.duck = (t, depth) => {
      const V = E.voice(t, duckLen, false);
      if (!V) return;
      const s = ctx.createBufferSource();
      s.buffer = E.duckBuf;
      for (const p of E.duckTargets) {
        const g = E.gain(depth);
        s.connect(g);
        g.connect(p);
      }
      V.buf(s, 0);
    };
    return E;
  }

  // ---------------------------------------------------------------- instruments
  function instruments(E) {
    const ctx = E.ctx;
    const I = {};

    // Felt, full, heartbeat or thud kick: a pitch-dropping sine with a short filtered click.
    I.kick = (t, vel, kind) => {
      const P = {
        felt: { f0: 125, f1: 50, fd: 0.055, dec: 0.36, click: 0.18, cf: 1600 },
        full: { f0: 165, f1: 47, fd: 0.065, dec: 0.5, click: 0.3, cf: 4200 },
        heart: { f0: 96, f1: 46, fd: 0.05, dec: 0.3, click: 0.16, cf: 1500 },
        thud: { f0: 95, f1: 52, fd: 0.04, dec: 0.2, click: 0.12, cf: 1200 },
      }[kind || 'felt'];
      const V = E.voice(t, P.dec + 0.03, false);
      if (!V) return;
      const o = E.osc('sine', P.f0);
      V.env(o.frequency, [[0, P.f0], [P.fd, P.f1, 'exp'], [P.dec, P.f1 * 0.92, 'exp']]);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.002, vel], [0.06, vel * 0.75, 'exp'], [P.dec, FLOOR, 'exp']]);
      o.connect(g);
      E.out(g, 'drums');
      V.osc(o);
      const n = E.noise(V, ['kick', t]);
      const f = E.filt('lowpass', P.cf, 0.7);
      const cg = E.gain(0);
      V.env(cg.gain, perc(vel * P.click, 0.0008, 0.012));
      n.connect(f);
      f.connect(cg);
      E.out(cg, 'drums');
    };

    I.brush = (t, vel, pan) => {
      const V = E.voice(t, 0.26, false);
      if (!V) return;
      const n = E.noise(V, ['brush', t]);
      const f = E.filt('bandpass', 3000, 0.55);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.004, vel], [0.05, vel * 0.45, 'exp'], [0.24, FLOOR, 'exp']]);
      n.connect(f);
      f.connect(g);
      E.out(g, 'perc', { pan: pan || 0.12 });
      const o = E.osc('sine', 185);
      const og = E.gain(0);
      V.env(og.gain, perc(vel * 0.35, 0.002, 0.06));
      o.connect(og);
      E.out(og, 'drums');
      V.osc(o, 0.1);
    };

    I.hat = (t, vel, open) => {
      const len = open ? 0.22 : 0.055;
      const V = E.voice(t, len + 0.01, false);
      if (!V) return;
      const n = E.noise(V, ['hat', t]);
      const f = E.filt('highpass', 7200, 0.8);
      const f2 = E.filt('peaking', 10500, 1.2);
      f2.gain.value = 5;
      const g = E.gain(0);
      V.env(g.gain, perc(vel, 0.001, len));
      n.connect(f);
      f.connect(f2);
      f2.connect(g);
      E.out(g, 'perc', { pan: -0.25 });
    };

    I.shaker = (t, vel, pan) => {
      const V = E.voice(t, 0.09, false);
      if (!V) return;
      const n = E.noise(V, ['shaker', t]);
      const f = E.filt('bandpass', 6500, 1.1);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.01, vel], [0.075, FLOOR, 'exp']]);
      n.connect(f);
      f.connect(g);
      E.out(g, 'perc', { pan: pan || 0.3 });
    };

    I.crash = (t, vel, o) => {
      o = o || {};
      const dec = o.dec || 1.55;
      const V = E.voice(t, dec + 0.05, false);
      if (!V) return;
      const n = E.noise(V, ['crash', t], true);
      const f = E.filt('highpass', 4800, 0.6);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.003, vel], [0.12, vel * 0.45, 'exp'], [dec, FLOOR, 'exp']]);
      n.connect(f);
      f.connect(g);
      E.out(g, 'perc', o);
    };

    // Woodblock tock or small wooden click.
    I.tock = (t, vel, f, o) => {
      o = o || {};
      const V = E.voice(t, 0.1, false);
      if (!V) return;
      const s = E.osc('sine', f * 1.5);
      V.env(s.frequency, [[0, f * 1.5], [0.006, f, 'exp']]);
      const g = E.gain(0);
      V.env(g.gain, perc(vel, 0.001, o.dec || 0.06));
      s.connect(g);
      E.out(g, o.bus || 'perc', o);
      V.osc(s);
      const tri = E.osc('triangle', f * 2.71);
      const tg = E.gain(0);
      V.env(tg.gain, perc(vel * 0.25, 0.001, 0.025));
      tri.connect(tg);
      E.out(tg, o.bus || 'perc', o);
      V.osc(tri, 0.05);
      const n = E.noise(V, ['tock', t, f]);
      const nf = E.filt('bandpass', Math.min(9000, f * 2.4), 2.5);
      const ng = E.gain(0);
      V.env(ng.gain, perc(vel * 0.5, 0.0005, 0.01));
      n.connect(nf);
      nf.connect(ng);
      E.out(ng, o.bus || 'perc', o);
    };

    // FM marimba: soft-mallet FM attack on the fundamental, the tuned 4th partial, a mallet thump.
    I.marimba = (t, f, vel, o) => {
      o = o || {};
      const dec = o.dec || Math.min(2.2, Math.max(0.35, 1.5 * Math.sqrt(220 / f)));
      const V = E.voice(t, dec + 0.05, false);
      if (!V) return;
      const c = E.osc('sine', f);
      const m = E.osc('sine', f);
      const mg = E.gain(0);
      V.env(mg.gain, [[0, f * 1.4], [0.04, f * 0.04, 'exp'], [dec, FLOOR, 'exp']]);
      m.connect(mg);
      mg.connect(c.frequency);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.003, vel], [dec, FLOOR, 'exp']]);
      c.connect(g);
      E.out(g, o.bus || 'keys', o);
      V.osc(c);
      V.osc(m);
      if (f * 4 < 16000) {
        const p = E.osc('sine', f * 4);
        const pg = E.gain(0);
        V.env(pg.gain, perc(vel * 0.22, 0.002, 0.12));
        p.connect(pg);
        E.out(pg, o.bus || 'keys', o);
        V.osc(p, 0.2);
      }
      const n = E.noise(V, ['mar', t, f]);
      const nf = E.filt('lowpass', 1400, 0.7);
      const ng = E.gain(0);
      V.env(ng.gain, perc(vel * 0.12, 0.001, 0.012));
      n.connect(nf);
      nf.connect(ng);
      E.out(ng, o.bus || 'keys', o);
    };

    // Kalimba: sine tine with a small pitch settle, an inharmonic overtone and a thumb click.
    I.kalimba = (t, f, vel, o) => {
      o = o || {};
      const dec = o.dec || 1.5;
      const V = E.voice(t, dec + 0.05, false);
      if (!V) return;
      const s = E.osc('sine', f);
      V.env(s.frequency, [[0, f * 1.007], [0.03, f, 'exp']]);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.002, vel], [0.09, vel * 0.55, 'exp'], [dec, FLOOR, 'exp']]);
      s.connect(g);
      E.out(g, o.bus || 'keys', o);
      V.osc(s);
      if (f * 5.93 < 17000) {
        const p = E.osc('sine', f * 5.93);
        const pg = E.gain(0);
        V.env(pg.gain, perc(vel * 0.28, 0.001, 0.07));
        p.connect(pg);
        E.out(pg, o.bus || 'keys', o);
        V.osc(p, 0.12);
      }
      const h = E.osc('sine', f * 2);
      const hg = E.gain(0);
      V.env(hg.gain, perc(vel * 0.1, 0.002, 0.35));
      h.connect(hg);
      E.out(hg, o.bus || 'keys', o);
      V.osc(h, 0.5);
      const n = E.noise(V, ['kal', t, f]);
      const nf = E.filt('bandpass', 3300, 1.8);
      const ng = E.gain(0);
      V.env(ng.gain, perc(vel * 0.3, 0.0005, 0.008));
      n.connect(nf);
      nf.connect(ng);
      E.out(ng, o.bus || 'keys', o);
    };

    // Glockenspiel: free-bar partial ratios, higher partials die first.
    I.glock = (t, f, vel, o) => {
      o = o || {};
      const dec = o.dec || 1.8;
      const V = E.voice(t, dec + 0.05, false);
      if (!V) return;
      const parts = [
        [1, 1, 1],
        [2.756, 0.3, 0.35],
        [5.404, 0.11, 0.14],
        [8.933, 0.05, 0.06],
      ];
      for (const [ratio, a, d] of parts) {
        if (f * ratio > 18000) continue;
        const s = E.osc('sine', f * ratio);
        const g = E.gain(0);
        V.env(g.gain, perc(vel * a, 0.001, dec * d));
        s.connect(g);
        E.out(g, o.bus || 'bells', o);
        V.osc(s, dec * d + 0.02);
      }
    };

    // Glassy sine ping.
    I.glass = (t, f, vel, o) => {
      o = o || {};
      const dec = o.dec || 1.6;
      const V = E.voice(t, dec + 0.05, false);
      if (!V) return;
      const parts = [
        [1, 1, 1],
        [2, 0.12, 0.35],
        [3.01, 0.05, 0.18],
      ];
      for (const [ratio, a, d] of parts) {
        const s = E.osc('sine', f * ratio);
        const g = E.gain(0);
        V.env(g.gain, perc(vel * a, o.att || 0.003, dec * d));
        s.connect(g);
        E.out(g, o.bus || 'bells', o);
        V.osc(s, dec * d + 0.02);
      }
    };

    // FM bell: modulator at an inharmonic or harmonic ratio, index decaying with the note.
    I.fmBell = (t, f, vel, o) => {
      o = o || {};
      const dec = o.dec || 1.6;
      const ratio = o.ratio || 1.4;
      const idx = o.index || 3;
      const V = E.voice(t, dec + 0.05, false);
      if (!V) return;
      const c = E.osc('sine', f);
      const m = E.osc('sine', f * ratio);
      const mg = E.gain(0);
      V.env(mg.gain, [[0, f * idx], [dec * 0.5, f * idx * 0.08, 'exp']]);
      m.connect(mg);
      mg.connect(c.frequency);
      const g = E.gain(0);
      V.env(g.gain, perc(vel, o.att || 0.002, dec));
      c.connect(g);
      E.out(g, o.bus || 'bells', o);
      V.osc(c);
      V.osc(m);
    };

    // Soft FM gong.
    I.gong = (t, f, vel, o) => {
      o = o || {};
      const dec = o.dec || 2.2;
      const V = E.voice(t, dec + 0.05, false);
      if (!V) return;
      const c = E.osc('sine', f);
      const m = E.osc('sine', f * 1.41);
      const mg = E.gain(0);
      V.env(mg.gain, [[0, f * 0.3], [0.09, f * 2.2], [dec, f * 0.15, 'exp']]);
      m.connect(mg);
      mg.connect(c.frequency);
      const lp = E.filt('lowpass', 1900, 0.5);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.012, vel], [dec, FLOOR, 'exp']]);
      c.connect(lp);
      lp.connect(g);
      E.out(g, o.bus || 'bells', o);
      V.osc(c);
      V.osc(m);
    };

    // Metallic FM ting for the gold dots.
    I.ting = (t, f, vel, o) => I.fmBell(t, f, vel, Object.assign({ ratio: 3.51, index: 1.6, dec: 0.45 }, o || {}));

    // Warm detuned pad: two warm-saw voices per note, spread left and right, one shared lowpass.
    // o: att, rel, cut0, cut1 (cutoff at the start and at t1), q, sine (hushed sine pad), bus, sends
    I.pad = (t0, t1, notes, vel, o) => {
      o = o || {};
      const att = Math.min(o.att === undefined ? 0.25 : o.att, t1 - t0);
      const rel = o.rel === undefined ? 0.35 : o.rel;
      const hold = t1 - t0;
      const len = hold + rel;
      const V = E.voice(t0, len, true);
      if (!V) return;
      const lp = E.filt('lowpass', o.cut0 || 1200, o.q || 0.6);
      V.env(lp.frequency, [[0, o.cut0 || 1200], [hold, o.cut1 || o.cut0 || 1200, 'exp'], [len, (o.cut1 || o.cut0 || 1200) * 0.7, 'exp']]);
      const g = E.gain(0);
      const pts = [[0, 0], [att, vel, o.attShape || 'lin']];
      if (hold > att) pts.push([hold, vel * (o.sus === undefined ? 1 : o.sus), 'lin']);
      pts.push([len, 0, 'lin']);
      V.env(g.gain, pts);
      lp.connect(g);
      E.out(g, o.bus || 'pad', o);
      const per = 1 / Math.sqrt(notes.length * 2);
      notes.forEach((nm, i) => {
        const f = hz(nm);
        const sides = o.sine ? [0] : [-1, 1];
        for (const side of sides) {
          const s = E.osc(o.sine ? 'sine' : E.warmSaw, f);
          s.detune.value = side * (o.detune || 8) + (i % 2 ? 1.5 : -1.5);
          const sg = E.gain(per * (o.sine ? 1.4 : 1));
          const p = E.panner(side * (o.width === undefined ? 0.55 : o.width) * (i % 2 ? 0.8 : 1));
          s.connect(sg);
          sg.connect(p);
          p.connect(lp);
          V.osc(s);
        }
      });
    };

    // Sub bass: sine with a little 2nd and 3rd harmonic so it survives small speakers.
    I.sub = (t0, t1, note, vel, o) => {
      o = o || {};
      const att = Math.min(o.att === undefined ? 0.008 : o.att, t1 - t0);
      const rel = o.rel === undefined ? 0.06 : o.rel;
      const hold = t1 - t0;
      const len = hold + rel;
      const V = E.voice(t0, len, true);
      if (!V) return;
      const f = hz(note);
      const g = E.gain(0);
      const pts = [[0, 0], [att, vel, o.attShape || 'lin']];
      if (hold > att) pts.push([hold, vel * (o.sus === undefined ? 0.85 : o.sus), 'lin']);
      pts.push([len, 0, 'lin']);
      V.env(g.gain, pts);
      const lp = E.filt('lowpass', 420, 0.5);
      for (const [k, a] of [
        [1, 1],
        [2, 0.3],
        [3, 0.1],
      ]) {
        const s = E.osc('sine', f * k);
        const sg = E.gain(a);
        s.connect(sg);
        sg.connect(lp);
        V.osc(s);
      }
      lp.connect(g);
      E.out(g, 'bass');
    };

    // Sub drop: a sine sweeping down under a hit.
    I.subDrop = (t, f0, f1, len, vel) => {
      const V = E.voice(t, len + 0.02, false);
      if (!V) return;
      const s = E.osc('sine', f0);
      V.env(s.frequency, [[0, f0], [len, f1, 'exp']]);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.004, vel], [len * 0.5, vel * 0.7, 'lin'], [len, FLOOR, 'exp']]);
      s.connect(g);
      E.out(g, 'bass');
      V.osc(s);
    };

    // Warm pluck: warm saw plus soft square an octave up, a fast lowpass sweep.
    I.pluck = (t, note, vel, o) => {
      o = o || {};
      const f = hz(note);
      const dec = o.dec || 0.8;
      const V = E.voice(t, dec + 0.05, false);
      if (!V) return;
      const lp = E.filt('lowpass', 2000, o.q || 1.2);
      const top = Math.min(11000, f * (o.bright || 9));
      V.env(lp.frequency, [[0, top], [0.16, Math.max(180, f * 1.8), 'exp'], [dec, Math.max(150, f * 1.2), 'exp']]);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.003, vel], [0.14, vel * 0.45, 'exp'], [dec, FLOOR, 'exp']]);
      const a = E.osc(E.warmSaw, f);
      a.detune.value = -5;
      const b = E.osc(E.softSquare, f * 2);
      b.detune.value = 6;
      const bg = E.gain(0.35);
      a.connect(lp);
      b.connect(bg);
      bg.connect(lp);
      lp.connect(g);
      E.out(g, o.bus || 'keys', o);
      V.osc(a);
      V.osc(b);
    };

    // FM boop with an upward bend (the molts).
    I.boop = (t, note, vel, o) => {
      o = o || {};
      const f = hz(note);
      const V = E.voice(t, 0.32, false);
      if (!V) return;
      const c = E.osc('sine', f * 0.8);
      V.env(c.frequency, [[0, f * 0.8], [0.06, f, 'exp']]);
      const m = E.osc('sine', f * 1.6);
      V.env(m.frequency, [[0, f * 1.6], [0.06, f * 2, 'exp']]);
      const mg = E.gain(0);
      V.env(mg.gain, [[0, f * 2.2], [0.14, f * 0.2, 'exp']]);
      m.connect(mg);
      mg.connect(c.frequency);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.004, vel], [0.08, vel * 0.6, 'exp'], [0.3, FLOOR, 'exp']]);
      c.connect(g);
      E.out(g, 'keys', Object.assign({ room: 0.2 }, o));
      V.osc(c);
      V.osc(m);
    };

    // Detuned, band-passed saw stab.
    I.stab = (t, notes, vel, o) => {
      o = o || {};
      const len = o.len || 0.22;
      const V = E.voice(t, len + 0.02, false);
      if (!V) return;
      const bp = E.filt('bandpass', o.f || 1500, 1.4);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.003, vel], [len, FLOOR, 'exp']]);
      bp.connect(g);
      E.out(g, 'keys', o);
      for (const nm of notes) {
        for (const d of [-14, 14]) {
          const s = E.osc('sawtooth', hz(nm));
          s.detune.value = d;
          const sg = E.gain(0.5 / notes.length);
          s.connect(sg);
          sg.connect(bp);
          V.osc(s);
        }
      }
    };

    // Continuous FM lead with glides and delayed vibrato. phrase: [[t, note, glide]]
    I.lead = (phrase, tEnd, vel, o) => {
      o = o || {};
      const t0 = phrase[0][0];
      const rel = o.rel || 0.3;
      const len = tEnd - t0 + rel;
      const V = E.voice(t0, len, true);
      if (!V) return;
      const pitch = ctx.createConstantSource();
      const pp = [[0, hz(phrase[0][1])]];
      const vib = [[0, 0]];
      for (let i = 1; i < phrase.length; i++) {
        const dt = phrase[i][0] - t0;
        const gl = Math.max(0.005, phrase[i][2] || 0);
        pp.push([dt, hz(phrase[i - 1][1]), 'set']);
        pp.push([dt + gl, hz(phrase[i][1]), 'exp']);
      }
      for (let i = 0; i < phrase.length; i++) {
        const a = phrase[i][0] - t0;
        const b = (i + 1 < phrase.length ? phrase[i + 1][0] : tEnd + rel) - t0;
        const f = hz(phrase[i][1]);
        vib.push([a, 0, 'set']);
        if (b - a > 0.35) {
          vib.push([a + 0.18, 0, 'set']);
          vib.push([Math.min(b, a + 0.45), f * 0.008, 'lin']);
          vib.push([b, f * 0.008, 'lin']);
        }
      }
      V.env(pitch.offset, pp);
      const c = E.osc('sine', 0);
      const m = E.osc('sine', 0);
      const sub = E.osc('triangle', 0);
      pitch.connect(c.frequency);
      const mr = E.gain(1);
      pitch.connect(mr);
      mr.connect(m.frequency);
      const sr = E.gain(0.5);
      pitch.connect(sr);
      sr.connect(sub.frequency);
      const mg = E.gain(hz(phrase[0][1]) * 0.9);
      m.connect(mg);
      mg.connect(c.frequency);
      const lfo = E.osc('sine', 5.3);
      const vg = E.gain(0);
      V.env(vg.gain, vib);
      lfo.connect(vg);
      vg.connect(c.frequency);
      const lp = E.filt('lowpass', 3200, 0.8);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.012, vel], [tEnd - t0, vel * 0.9, 'lin'], [len, 0, 'lin']]);
      const sg = E.gain(0.35);
      c.connect(lp);
      sub.connect(sg);
      sg.connect(lp);
      lp.connect(g);
      E.out(g, 'lead', o);
      V.osc(pitch);
      V.osc(c);
      V.osc(m);
      V.osc(sub);
      V.osc(lfo);
    };

    // Synth horn: two brass saws with a filter swell per note and a scoop into pitch.
    I.horn = (phrase, tEnd, vel, o) => {
      o = o || {};
      const t0 = phrase[0][0];
      const rel = 0.25;
      const len = tEnd - t0 + rel;
      const V = E.voice(t0, len, true);
      if (!V) return;
      const pitch = ctx.createConstantSource();
      const pp = [];
      const cut = [];
      phrase.forEach(([t, nm], i) => {
        const dt = t - t0;
        const f = hz(nm);
        if (i === 0) pp.push([0, f * 0.97]);
        else pp.push([dt, f * 0.97, 'set']);
        pp.push([dt + 0.07, f, 'exp']);
        cut.push([dt, 300, i === 0 ? 'lin' : 'set']);
        cut.push([dt + 0.16, 2400, 'exp']);
        cut.push([dt + 0.45, 1500, 'exp']);
      });
      cut[0] = [0, 300];
      V.env(pitch.offset, pp);
      const lp = E.filt('lowpass', 300, 1.1);
      V.env(lp.frequency, cut);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.06, vel], [tEnd - t0, vel, 'lin'], [len, 0, 'lin']]);
      for (const d of [-7, 7]) {
        const s = E.osc(E.brassSaw, 0);
        s.detune.value = d;
        pitch.connect(s.frequency);
        const sg = E.gain(0.5);
        s.connect(sg);
        sg.connect(lp);
        V.osc(s);
      }
      lp.connect(g);
      E.out(g, 'lead', o);
      V.osc(pitch);
    };

    // Generic filtered noise: whooshes, sweeps, cracks, risers.
    // o: { type, f: env pts, q, amp: env pts, pan, panEnv, bus, sustain, stereo, sends }
    I.nz = (t, len, o) => {
      const V = E.voice(t, len, !!o.sustain);
      if (!V) return;
      const n = E.noise(V, ['nz', t, len, o.key || ''], !!o.stereo);
      const f = E.filt(o.type || 'bandpass', o.f[0][1], o.q || 0.8);
      V.env(f.frequency, o.f);
      const g = E.gain(0);
      V.env(g.gain, o.amp);
      n.connect(f);
      let last = f;
      if (o.type2) {
        const f2 = E.filt(o.type2, o.f2, o.q2 || 0.7);
        f.connect(f2);
        last = f2;
      }
      last.connect(g);
      let node = g;
      if (o.panEnv) {
        const p = E.panner(0);
        V.env(p.pan, o.panEnv);
        g.connect(p);
        node = p;
      }
      E.out(node, o.bus || 'sfx', o);
    };

    // A generated buffer played through an optional filter. make() builds the buffer only when the
    // voice is actually scheduled; secs must match its length.
    I.play = (t, secs, make, vel, o) => {
      o = o || {};
      const V = E.voice(t, secs + 0.01, o.sustain !== false);
      if (!V) return;
      const s = ctx.createBufferSource();
      s.buffer = make();
      let last = s;
      if (o.filt) {
        const f = E.filt(o.filt[0], o.filt[1], o.filt[2]);
        s.connect(f);
        last = f;
      }
      const g = E.gain(vel);
      last.connect(g);
      E.out(g, o.bus || 'sfx', o);
      V.buf(s, 0);
    };

    // Wing flutter: band-passed noise sweeping f0 to f1 with a flap on each listed offset.
    I.flutter = (t, len, flaps, o) => {
      const amp = [[0, 0]];
      const fl = o.floor || 0.08;
      flaps.forEach((dt, i) => {
        const pk = o.vel * (o.grow ? 0.6 + (0.4 * i) / Math.max(1, flaps.length - 1) : 1);
        amp.push([dt, amp.length > 1 ? o.vel * fl : 0, 'lin']);
        amp.push([dt + 0.008, pk, 'lin']);
        amp.push([dt + 0.06, o.vel * fl, 'exp']);
      });
      amp.push([len, FLOOR, 'exp']);
      I.nz(t, len, {
        type: 'bandpass',
        q: 1.1,
        f: [[0, o.f0], [len, o.f1, 'exp']],
        amp,
        panEnv: o.pan ? [[0, -o.pan], [len, o.pan, 'lin']] : null,
        bus: 'sfx',
        room: 0.25,
        key: 'flutter',
      });
    };

    I.chew = (t, vel, pan) =>
      I.nz(t, 0.02, { type: 'highpass', q: 0.7, f: [[0, 4200]], amp: perc(vel, 0.0008, 0.012), pan, key: 'chew' });

    I.plip = (t, f0, f1, vel, o) => {
      o = o || {};
      const V = E.voice(t, 0.14, false);
      if (!V) return;
      for (const [k, a] of [
        [1, 1],
        [2, 0.25],
      ]) {
        const s = E.osc('sine', f0 * k);
        V.env(s.frequency, [[0, f0 * k], [0.05, f1 * k, 'exp']]);
        const g = E.gain(0);
        V.env(g.gain, [[0, 0], [0.002, vel * a], [0.02, vel * a * 0.6, 'exp'], [0.12, FLOOR, 'exp']]);
        s.connect(g);
        E.out(g, 'sfx', Object.assign({ room: 0.2 }, o));
        V.osc(s);
      }
    };

    I.glide = (t, f0, f1, len, vel, o) => {
      o = o || {};
      const V = E.voice(t, len + 0.3, false);
      if (!V) return;
      const s = E.osc('sine', f0);
      V.env(s.frequency, [[0, f0], [len, f1, 'exp']]);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.003, vel], [len, vel * 0.5, 'exp'], [len + 0.28, FLOOR, 'exp']]);
      s.connect(g);
      E.out(g, o.bus || 'sfx', o);
      V.osc(s);
    };

    // Low whump for the wing pumps: a rising sine body plus a soft rising noise sweep.
    I.whump = (t, vel) => {
      const V = E.voice(t, 0.42, false);
      if (!V) return;
      const s = E.osc('sine', 55);
      V.env(s.frequency, [[0, 55], [0.14, 88, 'exp'], [0.4, 80, 'lin']]);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.006, vel], [0.12, vel * 0.7, 'exp'], [0.4, FLOOR, 'exp']]);
      s.connect(g);
      E.out(g, 'bass');
      V.osc(s);
      const h = E.osc('triangle', 110);
      V.env(h.frequency, [[0, 110], [0.14, 176, 'exp']]);
      const hg = E.gain(0);
      V.env(hg.gain, perc(vel * 0.25, 0.005, 0.18));
      h.connect(hg);
      E.out(hg, 'sfx');
      V.osc(h, 0.25);
      I.nz(t, 0.3, {
        type: 'bandpass',
        q: 1.5,
        f: [[0, 220], [0.26, 1500, 'exp']],
        amp: [[0, 0], [0.02, vel * 0.08], [0.2, vel * 0.18, 'lin'], [0.3, FLOOR, 'exp']],
        key: 'whump',
      });
    };

    I.whistle = (t, len, f0, f1, vel) => {
      const V = E.voice(t, len + 0.05, false);
      if (!V) return;
      const s = E.osc('sine', f0);
      V.env(s.frequency, [[0, f0], [len, f1, 'exp']]);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.015, vel], [len, FLOOR, 'exp']]);
      s.connect(g);
      E.out(g, 'sfx', { hall: 0.15 });
      V.osc(s);
    };

    I.bleep = (t, f, vel) => {
      const V = E.voice(t, 0.07, false);
      if (!V) return;
      const s = E.osc('sine', f);
      const lp = E.filt('lowpass', 6500, 0.7);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.002, vel], [0.062, FLOOR, 'exp']]);
      s.connect(lp);
      lp.connect(g);
      E.out(g, 'sfx', { room: 0.15 });
      V.osc(s);
    };

    // Striated buzz: a rising saw, chopped at 30 Hz, through a feedback comb.
    I.buzz = (t, len, vel) => {
      const V = E.voice(t, len + 0.05, false);
      if (!V) return;
      const s = E.osc('sawtooth', 98);
      V.env(s.frequency, [[0, 98], [len, 196, 'exp']]);
      const chop = E.gain(0.5);
      const lfo = E.osc('square', 30);
      const lg = E.gain(0.45);
      lfo.connect(lg);
      lg.connect(chop.gain);
      const d = ctx.createDelay(0.05);
      d.delayTime.value = 0.0034;
      const fb = E.gain(0.55);
      const bp = E.filt('bandpass', 1300, 0.8);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.04, vel * 0.5], [len * 0.85, vel, 'lin'], [len, FLOOR, 'exp']]);
      s.connect(chop);
      chop.connect(bp);
      chop.connect(d);
      d.connect(fb);
      fb.connect(d);
      d.connect(bp);
      bp.connect(g);
      E.out(g, 'sfx', { hall: 0.25 });
      V.osc(s);
      V.osc(lfo);
    };

    // Reverse swell: noise rising exponentially into a hard stop at t + len.
    I.revSwell = (t, len, vel, o) => {
      o = o || {};
      const hi = o.hi || false;
      I.nz(t, len, {
        type: hi ? 'highpass' : 'lowpass',
        q: 0.7,
        f: hi ? [[0, 9000], [len, 3500, 'exp']] : [[0, 400], [len, o.fTop || 3500, 'exp']],
        type2: hi ? 'peaking' : null,
        f2: 9500,
        amp: [[0, vel * 0.004], [len - 0.012, vel, 'exp'], [len, FLOOR, 'lin']],
        stereo: true,
        sustain: true,
        bus: o.bus || 'sfx',
        hall: o.hall || 0.2,
        key: 'rev',
      });
    };

    // Stereo wind bed: wide noise through a slowly wandering band-pass. amp: env pts.
    I.wind = (t0, t1, amp, o) => {
      o = o || {};
      const len = t1 - t0;
      const f = [[0, 700]];
      for (let k = 1; k * 0.25 < len; k++) f.push([k * 0.25, 650 + 380 * lib.noise1(k * 0.23 + t0, 'film-wind'), 'lin']);
      I.nz(t0, len, { type: 'bandpass', q: 0.45, f, type2: 'lowpass', f2: o.lp || 2600, amp, stereo: true, sustain: true, bus: 'amb', key: 'wind' });
    };


    // Taiko / timpani-ish drum: a pitch-dropping body, an inharmonic overtone, skin and stick.
    I.taiko = (t, vel, f, o) => {
      o = o || {};
      f = f || 70;
      const dec = o.dec || 0.8;
      const V = E.voice(t, dec + 0.05, false);
      if (!V) return;
      const s = E.osc('sine', f * 1.8);
      V.env(s.frequency, [[0, f * 1.8], [0.03, f, 'exp'], [dec, f * 0.85, 'exp']]);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.002, vel], [0.12, vel * 0.6, 'exp'], [dec, FLOOR, 'exp']]);
      s.connect(g);
      E.out(g, 'drums', { room: 0.3, hall: o.hall || 0.12 });
      V.osc(s);
      const s2 = E.osc('sine', f * 2.6);
      V.env(s2.frequency, [[0, f * 3.2], [0.03, f * 2.6, 'exp']]);
      const g2 = E.gain(0);
      V.env(g2.gain, perc(vel * 0.35, 0.002, dec * 0.3));
      s2.connect(g2);
      E.out(g2, 'drums', { room: 0.3 });
      V.osc(s2, dec * 0.3 + 0.02);
      const n = E.noise(V, ['taiko', t, f]);
      const nf = E.filt('bandpass', o.skin || 1800, 0.8);
      const ng = E.gain(0);
      V.env(ng.gain, perc(vel * 0.45, 0.001, 0.03));
      n.connect(nf);
      nf.connect(ng);
      E.out(ng, 'drums', { room: 0.4, hall: o.hall || 0.12 });
    };

    I.snare = (t, vel, o) => {
      o = o || {};
      vel *= 0.75;
      const dec = o.dec || 0.17;
      const V = E.voice(t, dec + 0.03, false);
      if (!V) return;
      const tri = E.osc('triangle', 210);
      V.env(tri.frequency, [[0, 240], [0.03, 180, 'exp']]);
      const tg = E.gain(0);
      V.env(tg.gain, perc(vel * 0.55, 0.001, 0.07));
      tri.connect(tg);
      E.out(tg, 'drums', { room: 0.2 });
      V.osc(tri, 0.1);
      const n = E.noise(V, ['snare', t]);
      const hp = E.filt('highpass', o.hp || 1300, 0.7);
      const pk = E.filt('peaking', 4200, 1);
      pk.gain.value = 4;
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.001, vel], [0.03, vel * 0.5, 'exp'], [dec, FLOOR, 'exp']]);
      n.connect(hp);
      hp.connect(pk);
      pk.connect(g);
      E.out(g, 'drums', { room: o.room || 0.22, pan: 0.05 });
    };

    // Hand clap: three fast band-passed noise spikes and a short tail.
    I.clap = (t, vel, o) => {
      o = o || {};
      const V = E.voice(t, 0.2, false);
      if (!V) return;
      const n = E.noise(V, ['clap', t]);
      const bp = E.filt('bandpass', o.f || 1250, 1.3);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.001, vel], [0.009, vel * 0.25, 'exp'], [0.0105, vel * 0.9, 'lin'], [0.019, vel * 0.25, 'exp'], [0.0205, vel, 'lin'], [0.18, FLOOR, 'exp']]);
      n.connect(bp);
      bp.connect(g);
      E.out(g, 'perc', { room: 0.3, pan: o.pan || 0 });
    };

    // Cajon: bass tone or slap.
    I.cajon = (t, vel, slap) => {
      const V = E.voice(t, 0.26, false);
      if (!V) return;
      if (!slap) {
        const s = E.osc('sine', 130);
        V.env(s.frequency, [[0, 130], [0.03, 72, 'exp']]);
        const g = E.gain(0);
        V.env(g.gain, perc(vel, 0.002, 0.2));
        s.connect(g);
        E.out(g, 'drums', { room: 0.25 });
        V.osc(s);
        const n = E.noise(V, ['caj', t]);
        const f = E.filt('lowpass', 900, 0.7);
        const ng = E.gain(0);
        V.env(ng.gain, perc(vel * 0.4, 0.001, 0.025));
        n.connect(f);
        f.connect(ng);
        E.out(ng, 'drums');
      } else {
        const n = E.noise(V, ['cajs', t]);
        const f = E.filt('bandpass', 2600, 0.7);
        const ng = E.gain(0);
        V.env(ng.gain, [[0, 0], [0.001, vel], [0.02, vel * 0.4, 'exp'], [0.16, FLOOR, 'exp']]);
        n.connect(f);
        f.connect(ng);
        E.out(ng, 'perc', { room: 0.25 });
        const s = E.osc('sine', 260);
        const g = E.gain(0);
        V.env(g.gain, perc(vel * 0.45, 0.001, 0.05));
        s.connect(g);
        E.out(g, 'drums');
        V.osc(s, 0.1);
      }
    };

    // Brass section stab: brass saws per note with a pitch scoop and a fast filter bloom.
    I.brass = (t, notes, len, vel, o) => {
      o = o || {};
      const rel = o.rel || 0.14;
      const V = E.voice(t, len + rel + 0.02, false);
      if (!V) return;
      const top = o.bright || 4200;
      const lp = E.filt('lowpass', 600, 1.1);
      V.env(lp.frequency, [[0, 600], [0.03, top, 'exp'], [len, top * 0.4, 'exp'], [len + rel, 500, 'exp']]);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.006, vel], [0.09, vel * 0.62, 'exp'], [len, vel * 0.5, 'lin'], [len + rel, 0, 'lin']]);
      lp.connect(g);
      E.out(g, o.bus || 'lead', Object.assign({ hall: 0.18, room: 0.1 }, o));
      const per = 0.6 / Math.sqrt(notes.length);
      for (const nm of notes) {
        const f = hz(nm);
        for (const d of [-8, 8]) {
          const s = E.osc(E.brassSaw, f);
          s.detune.value = d;
          V.env(s.frequency, [[0, f * 0.96], [0.04, f, 'exp']]);
          const sg = E.gain(per);
          s.connect(sg);
          sg.connect(lp);
          V.osc(s);
        }
      }
    };

    // Funk / synth bass: warm saw through a resonant plucked filter, plus a sine body.
    I.bass = (t, note, len, vel, o) => {
      o = o || {};
      const f = hz(note);
      const V = E.voice(t, len + 0.06, false);
      if (!V) return;
      const lp = E.filt('lowpass', 300, o.q || 2.5);
      const top = Math.min(4000, f * (o.bright || 12));
      V.env(lp.frequency, [[0, top], [0.09, Math.max(160, f * 3), 'exp'], [len + 0.05, Math.max(120, f * 2), 'exp']]);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.004, vel], [0.08, vel * 0.7, 'exp'], [len, vel * 0.55, 'lin'], [len + 0.05, 0, 'lin']]);
      const a = E.osc(E.warmSaw, f);
      const s = E.osc('sine', f);
      const sg = E.gain(0.7);
      a.connect(lp);
      lp.connect(g);
      s.connect(sg);
      sg.connect(g);
      E.out(g, 'bass', o);
      V.osc(a);
      V.osc(s);
    };

    // Crunch: a dense front-loaded crackle of clicks, a torn noise band and a woody knock.
    I.crunch = (t, vel, key) => {
      I.play(
        t,
        0.32,
        () => grainBuffer(ctx, ['crunch', key], 0.32, clickGrains(lib.rng(lib.hash('film-crunch', key)), 0, 0.28, 170, { amp: 0.5, f0: 1200, f1: 6500, shape: 1.7, q: 1.4, dec: 0.0025 })),
        vel,
        { bus: 'sfx', room: 0.15, sustain: false }
      );
      I.nz(t, 0.24, {
        type: 'bandpass',
        q: 0.8,
        f: [[0, 3200], [0.22, 1000, 'exp']],
        amp: [[0, 0], [0.002, vel * 0.8], [0.035, vel * 0.35, 'exp'], [0.07, vel * 0.5, 'lin'], [0.11, vel * 0.2, 'exp'], [0.14, vel * 0.4, 'lin'], [0.24, FLOOR, 'exp']],
        key: 'crunch' + key,
        room: 0.15,
      });
      I.tock(t, vel * 0.6, 210, { bus: 'sfx' });
    };


    // Cartoon spring boing: a triangle whose pitch wobbles fast and settles, bending up.
    I.boing = (t, vel, o) => {
      o = o || {};
      const f = o.f || 190;
      const len = o.len || 0.42;
      const V = E.voice(t, len + 0.03, false);
      if (!V) return;
      const s = E.osc('triangle', f);
      V.env(s.frequency, [[0, f * 0.7], [0.03, f, 'exp'], [len, f * (o.bend || 1.5), 'exp']]);
      const lfo = E.osc('sine', o.rate || 17);
      const lg = E.gain(0);
      V.env(lg.gain, [[0, f * 0.45], [len, f * 0.02, 'exp']]);
      lfo.connect(lg);
      lg.connect(s.frequency);
      const lp = E.filt('lowpass', 2600, 1.2);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.004, vel], [0.08, vel * 0.7, 'exp'], [len, FLOOR, 'exp']]);
      s.connect(lp);
      lp.connect(g);
      E.out(g, 'sfx', { room: 0.15, pan: o.pan || 0 });
      V.osc(s);
      V.osc(lfo);
    };

    // Cartoon punch: a short low body thump, a cracking noise snap and a high slap.
    I.punch = (t, vel, o) => {
      o = o || {};
      const V = E.voice(t, 0.3, false);
      if (!V) return;
      const f = o.f || 140;
      const s = E.osc('sine', f);
      V.env(s.frequency, [[0, f * 1.6], [0.04, f * 0.55, 'exp'], [0.25, f * 0.45, 'exp']]);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.002, vel], [0.05, vel * 0.5, 'exp'], [0.26, FLOOR, 'exp']]);
      s.connect(g);
      E.out(g, 'sfx', { pan: o.pan || 0 });
      V.osc(s);
      I.nz(t, 0.16, { type: 'bandpass', q: 0.9, f: [[0, o.snap || 2400], [0.14, 900, 'exp']], amp: [[0, 0], [0.001, vel * 0.9], [0.02, vel * 0.35, 'exp'], [0.16, FLOOR, 'exp']], pan: o.pan || 0, room: 0.25, key: 'punch' });
      I.nz(t, 0.04, { type: 'highpass', q: 0.7, f: [[0, 5000]], amp: perc(vel * 0.5, 0.0005, 0.012), pan: o.pan || 0, key: 'slap' });
    };

    // CHOMP: teeth clack, a gnashing low saw "gnam", and a crunch of crumbs.
    I.chomp = (t, vel, key, o) => {
      o = o || {};
      I.tock(t, vel * 0.9, 1100, { bus: 'sfx', dec: 0.04 });
      I.tock(t + 0.012, vel * 0.6, 760, { bus: 'sfx', dec: 0.05 });
      I.crunch(t, vel * 0.55, key);
      const V = E.voice(t, 0.26, false);
      if (!V) return;
      const f0 = o.f || 150;
      const s = E.osc('sawtooth', f0);
      V.env(s.frequency, [[0, f0 * 1.4], [0.05, f0, 'exp'], [0.22, f0 * 0.6, 'exp']]);
      const bp = E.filt('bandpass', 900, 1.4);
      V.env(bp.frequency, [[0, 1300], [0.22, 500, 'exp']]);
      const lp = E.filt('lowpass', 420, 0.7);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.003, vel * 1.4], [0.05, vel * 0.8, 'exp'], [0.22, FLOOR, 'exp']]);
      s.connect(bp);
      s.connect(lp);
      bp.connect(g);
      lp.connect(g);
      E.out(g, 'sfx', { room: 0.2, pan: o.pan || 0 });
      V.osc(s);
    };

    // Slide whistle: a breathy sine with vibrato sliding along a pitch contour pts [[dt, hz, shape]].
    I.slide = (t, len, pts, vel, o) => {
      o = o || {};
      const V = E.voice(t, len + 0.04, false);
      if (!V) return;
      const s = E.osc('sine', pts[0][1]);
      V.env(s.frequency, pts);
      const lfo = E.osc('sine', 6.5);
      const lg = E.gain(pts[0][1] * 0.02);
      lfo.connect(lg);
      lg.connect(s.frequency);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.02, vel], [len * 0.8, vel * 0.8, 'lin'], [len, FLOOR, 'exp']]);
      s.connect(g);
      E.out(g, 'sfx', { room: 0.2, hall: 0.1, pan: o.pan || 0 });
      V.osc(s);
      V.osc(lfo);
      I.nz(t, len, { type: 'bandpass', q: 3, f: pts.map(([d, f, sh]) => [d, f * 2, sh]), amp: [[0, 0], [0.02, vel * 0.25], [len, FLOOR, 'exp']], pan: o.pan || 0, key: 'slide' });
    };

    // Swoosh: band-passed stereo noise with a fast attack, a filter sweep and a pan sweep.
    I.swoosh = (t, len, vel, o) => {
      o = o || {};
      I.nz(t, len, {
        type: 'bandpass',
        q: o.q || 1.0,
        f: [[0, o.f0 || 900], [len * (o.pk || 0.25), o.fp || 3800, 'exp'], [len, o.f1 || 500, 'exp']],
        amp: [[0, 0], [o.att || 0.004, vel * 0.85], [len * (o.pk || 0.25), vel, 'lin'], [len, FLOOR, 'exp']],
        panEnv: o.pan ? [[0, o.pan[0]], [len, o.pan[1], 'lin']] : null,
        stereo: true,
        room: 0.12,
        hall: o.hall || 0.06,
        key: o.key || 'swoosh',
      });
    };

    // Notification ping: a soft two-partial FM ding with a tiny attack click.
    I.ping = (t, f, vel, o) => {
      o = o || {};
      I.fmBell(t, f, vel, { ratio: 2, index: 0.7, dec: o.dec || 0.45, bus: 'sfx', room: 0.15, delay: 0.05, pan: o.pan || 0 });
      I.glass(t, f * 2, vel * 0.25, { dec: 0.25, bus: 'sfx', pan: o.pan || 0 });
    };

    // Pop: a cork-like rising blip and a sharp noise crack.
    I.pop = (t, vel, o) => {
      o = o || {};
      I.plip(t, o.f0 || 380, o.f1 || 1500, vel, { pan: o.pan || 0 });
      I.nz(t, 0.05, { type: 'highpass', q: 0.7, f: [[0, 2800]], amp: perc(vel * 0.8, 0.0006, 0.018), pan: o.pan || 0, room: 0.2, key: 'pop' });
    };

    // Crowd-cheer synth: wide noise through two vowel formants swelling "ye-aah", with a flutter.
    I.cheer = (t, len, vel) => {
      for (const [fa, fb, q, a, k] of [[700, 1100, 1.6, 1, 'c1'], [1700, 2500, 2.2, 0.6, 'c2'], [3000, 3600, 2.5, 0.3, 'c3']]) {
        I.nz(t, len, {
          type: 'bandpass',
          q,
          f: [[0, fa], [len * 0.3, fb, 'exp'], [len, fa * 0.9, 'exp']],
          amp: [[0, 0], [0.01, vel * a * 0.7], [0.15, vel * a, 'lin'], [len, FLOOR, 'exp']],
          stereo: true,
          hall: 0.25,
          key: k,
        });
      }
    };

    // Sparkle: a seeded flurry of short high tings over len seconds, drawn from notes.
    I.sparkle = (t, len, notes, n, vel, key) => {
      const r = E.rng('sparkle', key);
      for (let i = 0; i < n; i++) {
        const dt = (i / n) * len + r() * (len / n) * 0.6;
        const nm = notes[Math.floor(r() * notes.length)];
        I.glock(t + dt, hz(nm), vel * (1 - (0.5 * i) / n), { dec: 0.6, pan: r() * 1.4 - 0.7, hall: 0.2, delay: 0.08 });
      }
    };
    return I;
  }

  // ---------------------------------------------------------------- grain textures
  function flapGrains(r, t0, len, rate, o) {
    const out = [];
    const n = Math.floor(len * rate);
    for (let i = 0; i < n; i++) {
      const t = t0 + r() * len;
      out.push({
        t,
        dur: 0.05 + r() * 0.05,
        amp: (o.amp || 0.3) * (0.4 + 0.6 * r()),
        pan: (r() * 2 - 1) * (o.width || 0.9),
        f: (o.f0 || 380) + r() * (o.f1 || 1200),
        q: 0.9,
        att: 0.008 + r() * 0.008,
        dec: 0.02 + r() * 0.02,
      });
    }
    return out;
  }
  function clickGrains(r, t0, len, count, o) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const u = o.shape ? Math.pow(r(), o.shape) : r();
      out.push({
        t: t0 + u * len,
        dur: 0.008,
        amp: (o.amp || 0.3) * (0.3 + 0.7 * r()),
        pan: (r() * 2 - 1) * (o.width || 0.9),
        f: (o.f0 || 3000) + r() * (o.f1 || 5000),
        q: o.q || 1.2,
        att: 0.0004,
        dec: o.dec || 0.0015,
      });
    }
    return out;
  }

  // ---------------------------------------------------------------- the score
  // "Time vs биржа". 144 bpm, 4/4: a beat is 0.4167 s, a 16th 0.1042 s, a bar 1.6667 s, 9 bars.
  // The fight sits in A minor (Am | F | G | E, a fighting-game loop); LiquidityScan lifts it to
  // F major and the end card lands home in C major.
  //   bar 1  VS intro: whoosh + fight drum, VS slam, caption pops, FIGHT! gong + cheer, leap-up whistle
  //   bar 2  Round 1 (Am): groove in (bouncy bass, claps, marimba hook); boing, shove, punch, fly-off
  //   bar 3  Round 2 (F): crash + slide whistle down, three CHOMPs, the timer ratchets
  //   bar 4  Round 3 (G): whip swish, a tab pop on every 8th, frantic clock ticks
  //   bar 5  Round 4 (E): notification pings on 8ths, uppercut BAM, a riser into the flash
  //   bar 6-7 Final round (Am, F-E): taiko drums, brass stabs, crown flips; the brawl as a rolling
  //          tom fill with POW/BAM/WHAM; the last beat cuts to a rising scan shimmer
  //   bar 8  LiquidityScan (Fmaj9): bright chord + sparkle, lock-on beep, refill chime, confetti pop
  //   bar 9  End card (C): logo sting, URL pop, rings out by 15.0 s
  const CH = {
    Am: ['A3', 'C4', 'E4', 'A4'],
    F: ['F3', 'A3', 'C4', 'F4'],
    G: ['G3', 'B3', 'D4', 'G4'],
    E: ['E3', 'G#3', 'B3', 'E4'],
    Fmaj9: ['F3', 'C4', 'E4', 'G4', 'A4'],
    C: ['C4', 'E4', 'G4', 'C5'],
    C69: ['C4', 'E4', 'G4', 'A4', 'D5'],
  };
  // marimba hook per chord, [16th, note]
  const HOOK = {
    Am: [[0, 'A4'], [2, 'C5'], [3, 'E5'], [6, 'A5'], [8, 'G5'], [10, 'E5'], [11, 'D5'], [14, 'E5']],
    F: [[0, 'A4'], [2, 'C5'], [3, 'F5'], [6, 'A5'], [8, 'G5'], [10, 'F5'], [11, 'E5'], [14, 'C5']],
    G: [[0, 'B4'], [2, 'D5'], [3, 'G5'], [6, 'B5'], [8, 'A5'], [10, 'G5'], [11, 'D5'], [14, 'B4']],
    E: [[0, 'G#4'], [2, 'B4'], [3, 'E5'], [6, 'G#5'], [8, 'B5'], [10, 'A5'], [11, 'G#5'], [14, 'E5']],
    Fmaj: [[0, 'C5'], [2, 'F5'], [3, 'A5'], [6, 'C6'], [8, 'A5'], [10, 'G5'], [11, 'F5'], [14, 'G5']],
  };
  const ROOT = { Am: ['A1', 'A2', 'E2'], F: ['F1', 'F2', 'C2'], G: ['G1', 'G2', 'D2'], E: ['E1', 'E2', 'B1'], Fmaj9: ['F1', 'F2', 'C2'], C: ['C2', 'C3', 'G2'] };

  function score(E, I) {
    const { kick, hat, crash, tock, marimba, glock, glass, gong, ting, pad, subDrop, pluck, nz, revSwell, shaker } = I;
    const { taiko, snare, clap, brass, bass, boing, punch, chomp, slide, swoosh, ping, pop, cheer, sparkle, bleep } = I;
    const BT = 60 / 144;
    const BR = 4 * BT;
    const S = BT / 4;
    const B = (n) => n * BR;
    const at = (bar, beat, s16) => B(bar) + (beat || 0) * BT + (s16 || 0) * S;

    // ---- shared gestures
    const bigHit = (t, v, o) => {
      o = o || {};
      kick(t, v, 'full');
      taiko(t, v * 0.8, o.f || 55, { dec: 0.9, hall: 0.2 });
      crash(t, 0.4 * v, { dec: o.dec || 1.3 });
      if (o.drop !== false) subDrop(t, 120, 40, 0.6, 0.6 * v);
      E.duck(t, 0.7);
    };
    // groove: four on the floor, claps on 2 and 4, offbeat hats, 16th shaker, bouncy octave bass
    const groove = (bar, chord, o) => {
      o = o || {};
      const v = o.v || 1;
      for (let b = 0; b < 4; b++) {
        if (o.skipBeat && o.skipBeat.includes(b)) continue;
        const t = at(bar, b);
        kick(t, (b === 0 ? 0.85 : 0.72) * v, 'full');
        E.duck(t, 0.55);
        if (b % 2) {
          clap(t, 0.5 * v, { pan: 0.05 });
          snare(t, 0.35 * v, { room: 0.18 });
        }
        hat(t + BT / 2, 0.16 * v, b === 3 && o.openHat);
        for (const s of [1, 3]) shaker(t + s * S, 0.07 * v, s === 1 ? 0.35 : -0.3);
      }
      if (o.bass !== false) {
        const [lo, hi, fifth] = ROOT[chord];
        const pat = [[0, lo, 0.16], [3, hi, 0.09], [4, lo, 0.09], [6, hi, 0.09], [8, lo, 0.16], [10, fifth, 0.09], [11, hi, 0.09], [14, hi, 0.09]];
        for (const [s, n, len] of pat) {
          if (o.skipBeat && o.skipBeat.includes(Math.floor(s / 4))) continue;
          bass(at(bar, 0, s), n, len, (s % 4 ? 0.8 : 1) * v, { bright: 10 });
        }
      }
      if (o.hook !== false && HOOK[o.hookKey || chord]) {
        for (const [s, n] of HOOK[o.hookKey || chord]) {
          if (o.skipBeat && o.skipBeat.includes(Math.floor(s / 4))) continue;
          marimba(at(bar, 0, s), hz(n), (o.hookV || 0.32) * (s % 4 ? 0.85 : 1), { pan: s % 8 < 4 ? -0.18 : 0.18, room: 0.15, delay: 0.06 });
        }
      }
      if (o.pad !== false && CH[chord]) pad(B(bar), B(bar + 1) - 0.02, CH[chord], 0.12 * v, { att: 0.02, rel: 0.06, cut0: 1600, cut1: 900, hall: 0.1 });
    };

    // ================= bar 0: VS intro (0 - 1.667)
    {
      // downbeat: whoosh in from both sides + fighting-game drum hit
      bigHit(0, 0.95, { f: 60, drop: false });
      swoosh(0, 0.42, 0.45, { f0: 1500, fp: 4200, f1: 600, pan: [-0.8, -0.2], pk: 0.15, key: 'in-l' });
      swoosh(0, 0.42, 0.45, { f0: 1300, fp: 3600, f1: 500, pan: [0.8, 0.2], pk: 0.15, key: 'in-r' });
      brass(0, CH.Am, 0.18, 0.4);
      // 16th taiko pickup into the VS slam
      taiko(at(0, 0, 2), 0.35, 90, { dec: 0.3 });
      taiko(at(0, 0, 3), 0.45, 80, { dec: 0.3 });
      // VS slam (beat 2): the biggest hit of the intro
      const vs = at(0, 1);
      bigHit(vs, 1.0, { f: 48 });
      punch(vs, 0.55, { f: 110 });
      brass(vs, ['A2', 'E3', 'A3', 'C4', 'E4'], 0.3, 0.55, { bright: 5200 });
      nz(vs, 0.3, { type: 'highpass', q: 0.7, f: [[0, 3000], [0.3, 6000, 'exp']], amp: [[0, 0], [0.001, 0.35], [0.3, FLOOR, 'exp']], stereo: true, room: 0.3, key: 'flash' });
      hat(at(0, 1, 2), 0.14);
      hat(at(0, 2, 2), 0.14);
      // caption pops on beat 3: kinetic letters as quick marimba blips
      const cap = at(0, 2);
      kick(cap, 0.6, 'thud');
      ['A5', 'C6', 'E6', 'A6'].forEach((n, i) => marimba(cap + i * (S / 2), hz(n), 0.22, { dec: 0.3, pan: -0.3 + i * 0.2 }));
      clap(cap, 0.35);
      // snare roll into FIGHT!
      for (let i = 0; i < 4; i++) snare(at(0, 2, 2) + i * (S / 2), 0.18 + i * 0.06);
      // FIGHT! (beat 4): gong, crash, brass, crowd-cheer synth, confetti pops
      const fight = at(0, 3);
      bigHit(fight, 1.0, { f: 52, dec: 1.6 });
      gong(fight, hz('A2'), 0.45, { dec: 1.8, hall: 0.25 });
      brass(fight, ['A3', 'C4', 'E4', 'A4'], 0.16, 0.5, { bright: 5600 });
      cheer(fight, 1.0, 0.22);
      pop(fight + S, 0.2, { pan: -0.5 });
      pop(fight + S * 1.5, 0.18, { pan: 0.5, f0: 500, f1: 1900 });
      // exit: both logos squash and leap up out of the top
      slide(B(1) - 0.2, 0.22, [[0, 500], [0.2, 1700, 'exp']], 0.22, {});
      swoosh(B(1) - 0.16, 0.2, 0.3, { f0: 600, fp: 3000, f1: 2000, pk: 0.8, key: 'leap' });
    }

    // ================= bar 1: Round 1, the home screen (Am)
    {
      groove(1, 'Am');
      crash(B(1), 0.35, { dec: 1.2 });
      // landing boing (beat 2)
      boing(at(1, 1), 0.38, { f: 180, pan: -0.15 });
      boing(at(1, 1) + 0.03, 0.22, { f: 260, pan: 0.2 });
      // shove thump (beat 3): body check, "99+" badge blip
      const shove = at(1, 2);
      punch(shove, 0.55, { f: 95, snap: 900 });
      subDrop(shove, 90, 45, 0.3, 0.45);
      ping(shove + S * 1.5, hz('E6'), 0.14, { pan: 0.4 });
      // punch (beat 4): glove jab, биржа spins
      const p = at(1, 3);
      punch(p, 0.8, { f: 150, snap: 3000, pan: -0.2 });
      // exit kick: Time flies off right, spinning
      punch(at(1, 3, 2), 0.45, { f: 120, pan: 0.3 });
      swoosh(at(1, 3, 2) + 0.01, 0.2, 0.42, { f0: 700, fp: 3200, f1: 1200, pan: [0, 0.95], pk: 0.4, key: 'flyoff' });
      for (let i = 0; i < 3; i++) tock(at(1, 3, 2) + 0.03 + i * 0.05, 0.08, 1800 + i * 300, { pan: 0.5 + i * 0.15 });
    }

    // ================= bar 2: Round 2, the chart eats your time (F)
    {
      groove(2, 'F', { hookV: 0.24 });
      // crash into the chart, slide whistle falling out
      const c = B(2);
      crash(c, 0.35, { dec: 1.0 });
      punch(c, 0.6, { f: 100, snap: 1600, pan: -0.4 });
      I.crunch(c, 0.3, 'crash-in');
      slide(c + 0.02, 0.36, [[0, 1500], [0.34, 420, 'exp']], 0.2, { pan: -0.2 });
      // three CHOMPs on beats 2, 3, 4, each a little lower and bigger; the timer ratchets in between
      for (let k = 0; k < 3; k++) {
        const t = at(2, k + 1);
        chomp(t, 0.6 + k * 0.12, 'chomp' + k, { f: 170 - k * 25, pan: 0.15 });
        E.duck(t, 0.5);
        for (let i = 1; i < 4; i++) tock(t + i * (S * 0.75), 0.06 + 0.01 * k, 2600 - i * 200, { pan: 0.35 });
      }
      // last beat: building into the whip pan
      swoosh(at(2, 3, 2), 0.2, 0.18, { f0: 500, fp: 1800, f1: 2600, pk: 0.95, pan: [0.6, 0.9], key: 'prewhip' });
    }

    // ================= bar 3: Round 3, tab overload (G)
    {
      groove(3, 'G', { hookV: 0.26 });
      // whip-pan swish on the cut
      swoosh(B(3), 0.32, 0.65, { f0: 2400, fp: 5200, f1: 500, pan: [0.9, -0.9], pk: 0.08, att: 0.002, key: 'whip' });
      // a tab pops on every 8th, climbing
      const tabs = ['B5', 'D6', 'E6', 'G6', 'A6', 'B6', 'D7', 'E7'];
      tabs.forEach((n, i) => {
        const t = at(3, 0, i * 2);
        I.plip(t, hz(n) * 0.5, hz(n), 0.12 + i * 0.01, { pan: -0.5 + (i % 4) * 0.33 });
        tock(t, 0.06, 2400, { pan: 0.3 });
      });
      // the spinner / Time's hands: fast clock ticks, tick-tock pitch pairs
      for (let i = 0; i < 24; i++) tock(at(3, 0, 0) + i * (S * 0.667) + S * 0.33, 0.035, i % 2 ? 3400 : 2700, { pan: i % 2 ? 0.4 : -0.4 });
      // exit: the fast zoom into Time's face
      swoosh(B(4) - 0.25, 0.25, 0.3, { f0: 400, fp: 900, f1: 3500, pk: 0.9, key: 'zoom' });
    }

    // ================= bar 4: Round 4, notification storm (E)
    {
      groove(4, 'E', { hook: false, openHat: true });
      // pings on 8ths until the uppercut, each a new notification sliding in
      const pings = ['E6', 'G#6', 'B6', 'E6', 'G#6', 'B6'];
      pings.forEach((n, i) => ping(at(4, 0, i * 2), hz(n), 0.24, { pan: i % 2 ? 0.25 : -0.25 }));
      // Time's own notifications shoved off the bottom
      I.glide(at(4, 1, 1), 900, 300, 0.2, 0.06, { pan: -0.3 });
      I.glide(at(4, 2, 1), 800, 260, 0.2, 0.06, { pan: 0.3 });
      // uppercut BAM (beat 4)
      const bam = at(4, 3);
      I.slide(bam - 0.12, 0.12, [[0, 300], [0.12, 1100, 'exp']], 0.12, {});
      bigHit(bam, 1.0, { f: 50 });
      punch(bam, 0.9, { f: 130, snap: 2600 });
      brass(bam, ['E3', 'B3', 'E4', 'G#4'], 0.2, 0.5, { bright: 5200 });
      // notifications flying apart
      for (let i = 0; i < 5; i++) ping(bam + 0.06 + i * 0.045, hz(['B6', 'E7', 'G#6', 'D7', 'B6'][i]), 0.06, { pan: -0.8 + i * 0.4, dec: 0.2 });
      // into the white flash
      revSwell(B(5) - 0.3, 0.3, 0.3, { hi: true });
    }

    // ================= bars 5-6: the final round, the #1 spot (Am, then F - E)
    {
      // big drums, brass stab
      const fr = B(5);
      bigHit(fr, 1.0, { f: 48, dec: 1.6 });
      brass(fr, ['A2', 'E3', 'A3', 'C4', 'E4'], 0.38, 0.6, { bright: 5600 });
      groove(5, 'Am', { hook: false, v: 0.95, skipBeat: [3] });
      // brass riff answering
      brass(at(5, 1, 2), ['C4', 'E4', 'A4'], 0.1, 0.38);
      brass(at(5, 2), ['B3', 'D4', 'G4'], 0.14, 0.4);
      // crown flips on beats 2 and 3: a coin ting and a whip
      for (const b of [1, 2]) {
        ting(at(5, b), hz(b === 1 ? 'E6' : 'A6'), 0.2, { pan: b === 1 ? 0.4 : -0.4 });
        taiko(at(5, b), 0.55, 70, { dec: 0.5 });
      }
      // marimba hook in half-time over the tug of war
      for (const [s, n] of HOOK.Am.slice(0, 6)) marimba(at(5, 0, s), hz(n), 0.24, { pan: 0.15, room: 0.15 });

      // the brawl: a rolling 16th tom fill from beat 4 of bar 5 to beat 4 of bar 6, impacts on beats
      const b0 = at(5, 3);
      const b1 = B(7) - BT;
      const toms = [150, 120, 95, 75];
      const r = E.rng('brawl');
      const rr = [];
      for (let i = 0; i * S < b1 - b0 - 1e-6; i++) rr.push([r(), r(), r()]);
      for (let i = 0; i * S < b1 - b0 - 1e-6; i++) {
        const t = b0 + i * S;
        const onBeat = i % 4 === 0;
        taiko(t, onBeat ? 0.85 : 0.38 + 0.18 * rr[i][0], toms[i % 4] * (onBeat ? 0.6 : 1), { dec: onBeat ? 0.7 : 0.3, hall: 0.1 });
        if (i % 2 === 1) snare(t, 0.16 + 0.1 * rr[i][1]);
        // random comic debris: boings, bonks, little pops between the beats
        if (!onBeat && rr[i][2] < 0.28) {
          const k = Math.floor(rr[i][1] * 3);
          if (k === 0) boing(t, 0.15, { f: 220 + 160 * rr[i][0], len: 0.25, pan: rr[i][0] * 1.4 - 0.7 });
          else if (k === 1) tock(t, 0.18, 600 + 900 * rr[i][0], { pan: rr[i][0] * 1.4 - 0.7 });
          else pop(t, 0.12, { pan: rr[i][0] * 1.4 - 0.7 });
        }
      }
      // POW / BAM / WHAM on the beats
      const hits = [b0, at(6, 0), at(6, 1), at(6, 2)];
      hits.forEach((t, i) => {
        kick(t, 0.9, 'full');
        punch(t, 0.7, { f: 150 - i * 12, snap: 2200 + i * 300, pan: [0, -0.4, 0.4, 0][i] });
        E.duck(t, 0.6);
      });
      crash(b0, 0.45, { dec: 1.4 });
      crash(at(6, 0), 0.35, { dec: 1.2 });
      cheer(b0, 0.9, 0.12);
      // bar 6 harmony: F, then E on beat 3 with brass stabs, under the brawl
      const [flo, fhi] = ROOT.F;
      const [elo, ehi] = ROOT.E;
      [[0, flo], [3, fhi], [4, flo], [6, fhi]].forEach(([s, n]) => bass(at(6, 0, s), n, 0.09, s % 4 ? 0.8 : 1));
      [[8, elo], [10, ehi], [11, elo]].forEach(([s, n]) => bass(at(6, 0, s), n, 0.09, s % 4 ? 0.8 : 1));
      brass(at(6, 0), CH.F, 0.16, 0.42);
      brass(at(6, 2), CH.E, 0.16, 0.45);
      brass(at(6, 2, 3), ['G#3', 'B3', 'E4'], 0.08, 0.36);
      pad(B(6), at(6, 2), CH.F, 0.1, { att: 0.02, rel: 0.05, cut0: 1500 });
      pad(at(6, 2), at(6, 3) - 0.01, CH.E, 0.1, { att: 0.02, rel: 0.03, cut0: 1500 });
      // music cuts: the scan beam sweeps down with a rising shimmer
      const scan = at(6, 3);
      glass(scan, hz('E6'), 0.32, { dec: 0.7, hall: 0.3 });
      nz(scan, BT, {
        type: 'highpass',
        q: 0.7,
        f: [[0, 2500], [BT, 9000, 'exp']],
        amp: [[0, 0], [0.004, 0.08], [BT - 0.02, 0.3, 'exp'], [BT, FLOOR, 'lin']],
        stereo: true,
        hall: 0.2,
        key: 'scan',
      });
      ['A5', 'C6', 'E6', 'G6', 'A6', 'C7', 'E7', 'G7'].forEach((n, i) => glass(scan + 0.02 + i * (BT / 8), hz(n), 0.08 + i * 0.015, { dec: 0.35, pan: -0.6 + i * 0.17, delay: 0.1 }));
      I.glide(scan + 0.01, 400, 1600, BT - 0.04, 0.05, { bus: 'sfx', hall: 0.2 });
    }

    // ================= bar 7: LiquidityScan finds the entry (Fmaj9)
    {
      const ls = B(7);
      // bright clean solution chord + sparkle
      kick(ls, 0.85, 'full');
      crash(ls, 0.3, { dec: 1.4 });
      pad(ls, B(8) - 0.02, CH.Fmaj9, 0.2, { att: 0.01, rel: 0.05, cut0: 3200, cut1: 1600, hall: 0.25 });
      pluck(ls, 'F4', 0.3, { dec: 0.6 });
      ['C5', 'E5', 'G5', 'A5'].forEach((n, i) => pluck(ls + i * 0.012, n, 0.22, { dec: 0.7, hall: 0.2 }));
      sparkle(ls, 0.5, ['C7', 'E7', 'G7', 'A7', 'F7'], 9, 0.13, 'ls');
      glock(ls, hz('A6'), 0.3, { dec: 1.0 });
      groove(7, 'Fmaj9', { hookKey: 'Fmaj', pad: false, v: 0.9, hookV: 0.26, skipBeat: [] });
      // lock-on beep (beat 2): ENTRY FOUND
      const lock = at(7, 1);
      bleep(lock, hz('A6'), 0.35);
      bleep(lock + S * 0.75, hz('A6'), 0.28);
      bleep(lock + S * 1.5, hz('E7'), 0.3);
      // time refill (beat 3): a rising chime
      const refill = at(7, 2);
      ['F5', 'A5', 'C6', 'E6', 'G6', 'A6', 'C7'].forEach((n, i) => glock(refill + i * (S / 2), hz(n), 0.2 + i * 0.02, { dec: 0.8, pan: -0.5 + i * 0.16 }));
      I.glide(refill, 500, 2000, BT * 0.9, 0.05, { bus: 'sfx', hall: 0.15 });
      // crown lands (beat 4): confetti pop
      const crown = at(7, 3);
      pop(crown, 0.45, { f0: 300, f1: 1400 });
      ting(crown, hz('C7'), 0.22);
      I.play(crown, 0.5, () => grainBuffer(E.ctx, 'confetti', 0.5, clickGrains(lib.rng(lib.hash('film-confetti')), 0.01, 0.45, 70, { amp: 0.25, f0: 3500, f1: 6000, shape: 1.6 })), 0.6, { bus: 'sfx', hall: 0.1, sustain: false });
      // pickup into the end card
      snare(at(7, 3, 2), 0.25);
      snare(at(7, 3, 3), 0.35);
    }

    // ================= bar 8: end card, liquidityscan.io (C)
    {
      const end = B(8);
      // the logo sting: big confident C, brass, bells
      bigHit(end, 0.95, { f: 52, dec: 1.3 });
      brass(end, ['C3', 'G3', 'C4', 'E4', 'G4'], 0.5, 0.55, { bright: 5200 });
      ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => glock(end + i * 0.03, hz(n), 0.24, { dec: 1.2 }));
      pad(end, B(8) + 1.2, CH.C, 0.18, { att: 0.01, rel: 0.25, cut0: 2800, cut1: 1200, hall: 0.25 });
      bass(end, 'C2', 0.3, 1.0);
      // light groove under the wordmark and tagline
      for (const b of [1, 2]) {
        kick(at(8, b), 0.6, 'full');
        E.duck(at(8, b), 0.4);
        hat(at(8, b) - BT / 2, 0.12);
      }
      clap(at(8, 1), 0.4);
      bass(at(8, 1), 'C3', 0.09, 0.7);
      bass(at(8, 1, 2), 'G2', 0.09, 0.7);
      bass(at(8, 2), 'E2', 0.09, 0.8);
      bass(at(8, 2, 2), 'G2', 0.09, 0.8);
      marimba(at(8, 1), hz('E5'), 0.26, { pan: -0.2 });
      marimba(at(8, 1, 2), hz('G5'), 0.24, { pan: 0.2 });
      marimba(at(8, 2), hz('A5'), 0.26, { pan: -0.2 });
      marimba(at(8, 2, 2), hz('B5'), 0.24, { pan: 0.2 });
      // URL pop (beat 4): the final chord, short and bright so it rings out by 15 s
      const url = at(8, 3);
      kick(url, 0.75, 'full');
      clap(url, 0.4);
      pop(url, 0.35, { f0: 450, f1: 1800 });
      CH.C69.forEach((n, i) => pluck(url + i * 0.008, n, 0.2, { dec: 0.4 }));
      marimba(url, hz('C6'), 0.32, { dec: 0.4 });
      glock(url, hz('C7'), 0.2, { dec: 0.4 });
      bass(url, 'C2', 0.2, 0.9);
    }
  }

  FILM.audio = {
    render(ctx, opts) {
      const o = opts || {};
      const start = Math.max(0, Number(o.start) || 0);
      const dest = o.dest || ctx.destination;
      const DUR = (FILM.TIMELINE && FILM.TIMELINE.duration) || FILM.DURATION || 32;
      // opts.mix overrides the mix constants (bus gains, trim); the analysis tools use it for solo renders.
      const om = o.mix || {};
      const mix = Object.assign({}, MIX, om, {
        bus: Object.assign({}, MIX.bus, om.bus || {}),
        eq: Object.assign({}, MIX.eq, om.eq || {}),
        comp: Object.assign({}, MIX.comp, om.comp || {}),
      });
      const E = makeEngine(ctx, start, dest, DUR, mix);
      const I = instruments(E);
      // The score is scheduled one bar at a time, so the audio graph only ever holds the voices of
      // the next few seconds. Each voice belongs to exactly one bar by its start time, so the output
      // is the same as scheduling everything at once. The first bar also takes every earlier voice
      // still sounding at `start`.
      const BAR = 240 / ((FILM.TIMELINE && FILM.TIMELINE.bpm) || 120);
      const first = Math.floor(start / BAR);
      const last = Math.ceil(DUR / BAR) - 1;
      const run = (k) => {
        E.w0 = k === first ? -Infinity : k * BAR;
        E.w1 = k === last ? Infinity : (k + 1) * BAR;
        score(E, I);
      };
      const due = (k) => E.base + (k * BAR - start) - LAT; // context time of bar k's first event
      run(first);
      let k = first + 1;
      const isOffline = typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext;
      if (isOffline && typeof ctx.suspend !== 'function') {
        // An offline context that cannot pause mid-render gets every bar up front.
        for (; k <= last; k++) run(k);
      } else if (isOffline) {
        // Offline: pause the render 0.25 s before each bar, schedule it, resume.
        const q = 128 / ctx.sampleRate;
        const end = ctx.length / ctx.sampleRate;
        for (; k <= last; k++) {
          const j = k;
          const when = Math.floor((due(j) - 0.25) / q) * q;
          if (when >= end - q) break; // this bar starts after the render window ends
          let paused = null;
          if (when > ctx.currentTime + q) {
            try {
              paused = ctx.suspend(when);
            } catch (e) {
              paused = null;
            }
          }
          if (!paused) run(j);
          else
            paused.then(
              () => {
                run(j);
                ctx.resume();
              },
              () => run(j)
            );
        }
      } else {
        // Live: a look-ahead timer schedules each bar 1.5 s before it sounds.
        const AHEAD = 1.5;
        const pump = () => {
          while (k <= last && due(k) - ctx.currentTime < AHEAD) run(k++);
          return k <= last;
        };
        if (pump()) {
          const timer = setInterval(() => {
            if (ctx.state === 'closed' || !pump()) clearInterval(timer);
          }, 100);
        }
      }
    },
  };
})();
