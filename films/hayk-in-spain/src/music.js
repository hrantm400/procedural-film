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
    trim: 0.7,
    ceiling: 0.66, // soft limiter output ceiling (about -3.6 dBFS)
    knee: 0.5,
    bus: { drums: 0.6, perc: 0.8, bass: 0.3, pad: 0.26, keys: 0.6, bells: 0.45, lead: 0.5, sfx: 0.62, amb: 0.5 },
    // Master tilt EQ in dB: a low shelf under the subs, presence and air for phone speakers.
    eq: { low: -4, presence: 5, air: 3 },
    comp: { threshold: -18, knee: 10, ratio: 2, attack: 0.006, release: 0.2 },
    // Section fader rides in dB at global times, pre-compressor: quiet egg, hushed pupa, full drop,
    // hushed winter, and an ending level that meets the opening level at the loop seam.
    // Per film: section fader rides in dB at global times, pre-compressor (see reference/music.md).
    // Section rides: lift the light acts (comedy bounce, Spain, park, harp) toward the loud ones,
    // and fade the last chord's tail out before the loop seam.
    ride: [
      [0, 0], [16.98, 0], [17, 4], [19.98, 4], [20, 0], [25.98, 0], [26, 2.5], [31.48, 2.5], [31.5, 0],
      [53.98, 0], [54, 4], [58.48, 4], [58.5, 0], [70.98, 0], [71, 2.5], [74.98, 2.5], [75, 0],
      [83.98, 0], [84, 2.5], [88.98, 2.5], [89, 0], [118.6, 0], [119.9, -12],
    ],
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

  // Plucked string (Karplus-Strong): a comb-shaped noise burst circulating through an averaging
  // loop filter with a fractional-delay allpass for tuning. Normalised to a 0.9 peak.
  function ksBuffer(ctx, f, secs, bright, t60, pos) {
    const sr = ctx.sampleRate;
    const n = Math.max(1, Math.floor(secs * sr));
    const buf = ctx.createBuffer(1, n, sr);
    const y = buf.getChannelData(0);
    const Pd = sr / f - 0.5;
    const N = Math.max(2, Math.floor(Pd));
    const fr = Pd - N;
    const C = (1 - fr) / (1 + fr);
    const rho = Math.pow(10, -3 / (f * t60));
    const r = lib.rng(lib.hash('film-ks', Math.round(f * 100)));
    const exc = new Float32Array(N);
    let lp = 0;
    let mean = 0;
    for (let i = 0; i < N; i++) {
      lp += bright * (r() * 2 - 1 - lp);
      exc[i] = lp;
      mean += lp;
    }
    mean /= N;
    const M = Math.max(1, Math.floor(N * pos));
    let ax = 0;
    let ay = 0;
    let peak = 1e-9;
    for (let i = 0; i < n; i++) {
      const a = i >= N ? y[i - N] : 0;
      const b = i > N ? y[i - N - 1] : 0;
      const v = rho * 0.5 * (a + b);
      const ap = C * v + ax - C * ay;
      ax = v;
      ay = ap;
      const e = i < N ? exc[i] - mean - (i >= M ? exc[i - M] - mean : 0) : 0;
      y[i] = e + ap;
      const av = Math.abs(y[i]);
      if (av > peak) peak = av;
    }
    const k = 0.9 / peak;
    const fade = Math.min(n, 480);
    for (let i = 0; i < n; i++) y[i] *= k * (i >= n - fade ? (n - i) / fade : 1);
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
        // keep each note's points inside its own span so fast phrases stay time-ordered
        const gap = Math.max(0.02, (i + 1 < phrase.length ? phrase[i + 1][0] : tEnd) - t);
        if (i === 0) pp.push([0, f * 0.97]);
        else pp.push([dt, f * 0.97, 'set']);
        pp.push([dt + Math.min(0.07, gap * 0.5), f, 'exp']);
        cut.push([dt, 300, i === 0 ? 'lin' : 'set']);
        cut.push([dt + Math.min(0.16, gap * 0.4), 2400, 'exp']);
        cut.push([dt + Math.min(0.45, gap * 0.9), 1500, 'exp']);
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

    // ================================================================ film instruments
    // Continuous pitch automation for a legato line: [[t, note, glide]] from t0.
    const glidePts = (phrase, t0, glide) => {
      const pp = [[0, hz(phrase[0][1])]];
      for (let i = 1; i < phrase.length; i++) {
        const dt = phrase[i][0] - t0;
        pp.push([dt, hz(phrase[i - 1][1]), 'set']);
        pp.push([dt + (phrase[i][2] || glide), hz(phrase[i][1]), 'exp']);
      }
      return pp;
    };

    // Plucked string from a cached Karplus-Strong buffer: nylon guitar, harp, pizzicato.
    // o: len, bright, t60, pos, lp, stop (damp after this many seconds), bus, sends
    const ksCache = {};
    I.ks = (t, note, vel, o) => {
      o = o || {};
      const f = hz(note);
      const secs = o.len || 1.6;
      const V = E.voice(t, secs + 0.01, false);
      if (!V) return;
      const bright = o.bright === undefined ? 0.5 : o.bright;
      const t60 = o.t60 || 2;
      const pos = o.pos || 0.13;
      const key = [f.toFixed(2), secs, bright, t60, pos].join('|');
      const buf = ksCache[key] || (ksCache[key] = ksBuffer(ctx, f, secs, bright, t60, pos));
      const s = ctx.createBufferSource();
      s.buffer = buf;
      const lp = E.filt('lowpass', o.lp || 5200, 0.6);
      const g = E.gain(vel);
      if (o.stop) V.env(g.gain, [[0, vel], [o.stop, vel, 'set'], [o.stop + 0.05, FLOOR, 'exp']]);
      s.connect(lp);
      lp.connect(g);
      E.out(g, o.bus || 'keys', o);
      V.buf(s, 0);
    };

    // Additive piano: five stretched partials that die faster as they rise, a detuned unison
    // string and a hammer knock.
    I.piano = (t, note, vel, o) => {
      o = o || {};
      const f = hz(note);
      const dec = o.dec || Math.min(4.5, 0.8 + 2.4 * Math.sqrt(262 / f));
      const V = E.voice(t, dec + 0.05, false);
      if (!V) return;
      const lp = E.filt('lowpass', Math.min(9000, 900 + f * 7), 0.5);
      const out = E.gain(1);
      lp.connect(out);
      E.out(out, o.bus || 'keys', Object.assign({ room: 0.2, hall: 0.2 }, o));
      const amps = [1, 0.45, 0.25, 0.14, 0.08];
      for (let k = 1; k <= 5; k++) {
        const fk = f * k * Math.sqrt(1 + 0.0003 * k * k);
        if (fk > 16000) break;
        const d = dec / (1 + 0.7 * (k - 1));
        const s = E.osc('sine', fk);
        const g = E.gain(0);
        V.env(g.gain, [[0, 0], [0.003, vel * amps[k - 1]], [0.1, vel * amps[k - 1] * 0.55, 'exp'], [d, FLOOR, 'exp']]);
        s.connect(g);
        g.connect(lp);
        V.osc(s, d + 0.02);
      }
      const u = E.osc('sine', f);
      u.detune.value = 3.5;
      const ug = E.gain(0);
      V.env(ug.gain, perc(vel * 0.35, 0.003, dec * 0.8));
      u.connect(ug);
      ug.connect(lp);
      V.osc(u);
      const n = E.noise(V, ['pno', t, f]);
      const nf = E.filt('bandpass', Math.min(5000, f * 5), 1.2);
      const ng = E.gain(0);
      V.env(ng.gain, perc(vel * 0.2, 0.0008, 0.02));
      n.connect(nf);
      nf.connect(ng);
      ng.connect(out);
    };

    // Electric piano: 1:1 FM with a decaying index and a faint tine.
    I.ep = (t, note, vel, o) => {
      o = o || {};
      const f = hz(note);
      const dec = o.dec || 1.6;
      const V = E.voice(t, dec + 0.05, false);
      if (!V) return;
      const c = E.osc('sine', f);
      const m = E.osc('sine', f);
      const mg = E.gain(0);
      V.env(mg.gain, [[0, f * 1.5], [0.3, f * 0.35, 'exp'], [dec, f * 0.12, 'exp']]);
      m.connect(mg);
      mg.connect(c.frequency);
      const lp = E.filt('lowpass', o.lp || 2600, 0.6);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.003, vel], [0.2, vel * 0.55, 'exp'], [dec, FLOOR, 'exp']]);
      c.connect(lp);
      lp.connect(g);
      E.out(g, o.bus || 'keys', Object.assign({ room: 0.15 }, o));
      V.osc(c);
      V.osc(m);
      const tn = E.osc('sine', f * 7.1);
      const tg = E.gain(0);
      V.env(tg.gain, perc(vel * 0.05, 0.001, 0.08));
      tn.connect(tg);
      E.out(tg, o.bus || 'keys', o);
      V.osc(tn, 0.12);
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

    // Cartoon dog bark: a saw+square "woof" gliding down through two moving vowel formants, a
    // growl chopper, a body low-pass and a breathy noise burst. big: lower, longer, with a chest thump.
    I.bark = (t, vel, o) => {
      o = o || {};
      vel *= 2.6; // the formant filters eat most of the saw: this makes vel 1 a full-level bark
      const big = !!o.big;
      const len = big ? 0.26 : 0.14;
      const f0 = (o.f || 500) * (big ? 0.78 : 1);
      const V = E.voice(t, len + 0.06, false);
      if (!V) return;
      const fe = [[0, f0 * 0.72], [0.018, f0, 'exp'], [len, f0 * 0.5, 'exp']];
      const mix = E.gain(1);
      for (const [type, a, det] of [['sawtooth', 0.55, -8], ['square', 0.3, 8]]) {
        const s = E.osc(type, f0);
        s.detune.value = det;
        V.env(s.frequency, fe);
        const sg = E.gain(a);
        s.connect(sg);
        sg.connect(mix);
        V.osc(s);
      }
      const am = E.gain(0.7);
      const lfo = E.osc('square', big ? 48 : 62);
      const lg = E.gain(0.3);
      lfo.connect(lg);
      lg.connect(am.gain);
      V.osc(lfo);
      mix.connect(am);
      const fa = E.filt('bandpass', 1400, 1.6);
      V.env(fa.frequency, [[0, 1500], [len, 700, 'exp']]);
      const fb = E.filt('bandpass', 2600, 3);
      V.env(fb.frequency, [[0, 2600], [len, 1700, 'exp']]);
      const fbg = E.gain(0.6);
      const body = E.filt('lowpass', 900, 0.8);
      const bg = E.gain(0.5);
      am.connect(fa);
      am.connect(fb);
      fb.connect(fbg);
      am.connect(body);
      body.connect(bg);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.004, vel], [len * 0.4, vel * 0.75, 'lin'], [len, FLOOR, 'exp']]);
      fa.connect(g);
      fbg.connect(g);
      bg.connect(g);
      E.out(g, 'sfx', { room: 0.25, hall: big ? 0.25 : 0.08, pan: o.pan || 0 });
      I.nz(t, len * 0.8, { type: 'bandpass', q: 1.1, f: [[0, 2200], [len * 0.8, 900, 'exp']], amp: [[0, 0], [0.002, vel * 0.7], [0.03, vel * 0.25, 'exp'], [len * 0.8, FLOOR, 'exp']], pan: o.pan || 0, room: 0.2, key: 'bark' });
      if (big) {
        const c = E.osc('sine', 170);
        V.env(c.frequency, [[0, 170], [0.2, 80, 'exp']]);
        const cg = E.gain(0);
        V.env(cg.gain, perc(vel * 0.8, 0.003, 0.22));
        c.connect(cg);
        E.out(cg, 'sfx', { room: 0.2 });
        V.osc(c);
      }
    };

    // Dog howl: pitch contour pts [[dt, hz, shape]], saw + sine through a sliding "oo-aa-oo"
    // formant and a fixed one, with vibrato that grows into the note.
    I.howl = (t, len, pts, vel, o) => {
      o = o || {};
      const V = E.voice(t, len + 0.05, true);
      if (!V) return;
      const pitch = ctx.createConstantSource();
      V.env(pitch.offset, pts);
      const lfo = E.osc('sine', o.vibHz || 5.6);
      const vg = E.gain(0);
      V.env(vg.gain, [[0, 0], [Math.min(0.4, len * 0.3), 0], [len * 0.6, pts[0][1] * 0.05, 'lin'], [len, pts[0][1] * 0.03, 'lin']]);
      lfo.connect(vg);
      const saw = E.osc('sawtooth', 0);
      const sn = E.osc('sine', 0);
      for (const s of [saw, sn]) {
        pitch.connect(s.frequency);
        vg.connect(s.frequency);
      }
      const f1 = E.filt('bandpass', 500, 2.2);
      V.env(f1.frequency, [[0, 450], [len * 0.35, 950, 'exp'], [len, 450, 'exp']]);
      const f2 = E.filt('bandpass', o.f2 || 1350, 4);
      const mix = E.gain(1);
      const sg = E.gain(0.5);
      saw.connect(sg);
      sg.connect(f1);
      sg.connect(f2);
      const f2g = E.gain(0.5);
      f2.connect(f2g);
      f2g.connect(mix);
      f1.connect(mix);
      const sng = E.gain(0.3);
      sn.connect(sng);
      sng.connect(mix);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [o.att || 0.12, vel, 'lin'], [len * 0.7, vel * 0.85, 'lin'], [len, FLOOR, 'exp']]);
      mix.connect(g);
      E.out(g, 'sfx', Object.assign({ hall: 0.3, cave: 0.15 }, o));
      V.osc(pitch);
      V.osc(lfo);
      V.osc(saw);
      V.osc(sn);
    };

    // Small dog whine: a band-passed triangle bending up and down with a fast vibrato.
    I.whine = (t, len, f0, f1, f2, vel) => {
      const V = E.voice(t, len + 0.05, false);
      if (!V) return;
      const s = E.osc('triangle', f0);
      V.env(s.frequency, [[0, f0], [len * 0.35, f1, 'exp'], [len, f2, 'exp']]);
      const lfo = E.osc('sine', 7.5);
      const lg = E.gain(f1 * 0.025);
      lfo.connect(lg);
      lg.connect(s.frequency);
      const bp = E.filt('bandpass', f1, 0.9);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.06, vel], [len * 0.75, vel * 0.8, 'lin'], [len, FLOOR, 'exp']]);
      s.connect(bp);
      bp.connect(g);
      E.out(g, 'sfx', { room: 0.2, hall: 0.15 });
      V.osc(s);
      V.osc(lfo);
    };

    // "Aah" choir: three detuned warm saws per note with a shared vibrato, through three vowel formants.
    I.choir = (t0, t1, notes, vel, o) => {
      o = o || {};
      const hold = t1 - t0;
      const att = Math.min(o.att === undefined ? 0.6 : o.att, hold);
      const rel = o.rel === undefined ? 1 : o.rel;
      const len = hold + rel;
      const V = E.voice(t0, len, true);
      if (!V) return;
      const sum = E.gain(1 / Math.sqrt(notes.length * 3));
      const lfo = E.osc('sine', 5.1);
      const lg = E.gain(11);
      lfo.connect(lg);
      notes.forEach((nm, i) => {
        const f = hz(nm);
        [-12, 0, 12].forEach((d, j) => {
          const s = E.osc(E.warmSaw, f);
          s.detune.value = d + (i % 2 ? 3 : -3);
          lg.connect(s.detune);
          const p = E.panner((j - 1) * 0.5);
          s.connect(p);
          p.connect(sum);
          V.osc(s);
        });
      });
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [att, vel, o.attShape || 'lin'], [hold, vel * (o.sus || 1), 'lin'], [len, 0, 'lin']]);
      for (const [f, q, a] of [[700, 3.5, 1], [1150, 5, 0.6], [2700, 7, 0.3]]) {
        const bp = E.filt('bandpass', f, q);
        const bg = E.gain(a * 2.2);
        sum.connect(bp);
        bp.connect(bg);
        bg.connect(g);
      }
      E.out(g, 'pad', Object.assign({ hall: 0.5, cave: 0.2 }, o));
      V.osc(lfo);
    };

    // Bowed string line: legato phrase [[t, note, glide]] on three detuned warm saws with vibrato.
    I.bowed = (phrase, tEnd, vel, o) => {
      o = o || {};
      const t0 = phrase[0][0];
      const rel = o.rel || 0.6;
      const len = tEnd - t0 + rel;
      const V = E.voice(t0, len, true);
      if (!V) return;
      const pitch = ctx.createConstantSource();
      V.env(pitch.offset, glidePts(phrase, t0, o.glide || 0.07));
      const f0 = hz(phrase[0][1]);
      const lfo = E.osc('sine', 5.2);
      const vg = E.gain(0);
      V.env(vg.gain, [[0, 0], [0.35, 0], [0.9, f0 * (o.vib || 0.007), 'lin']]);
      lfo.connect(vg);
      const lp = E.filt('lowpass', o.cut || 2800, 0.7);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [o.att || 0.18, vel], [tEnd - t0, vel * (o.sus || 0.95), 'lin'], [len, 0, 'lin']]);
      for (const d of [-9, 0, 9]) {
        const s = E.osc(E.warmSaw, 0);
        s.detune.value = d;
        pitch.connect(s.frequency);
        vg.connect(s.frequency);
        const sg = E.gain(0.4);
        s.connect(sg);
        sg.connect(lp);
        V.osc(s);
      }
      lp.connect(g);
      E.out(g, o.bus || 'lead', Object.assign({ hall: 0.3 }, o));
      V.osc(pitch);
      V.osc(lfo);
    };

    // Whistled tune: [[t, note, dur]], a sine with articulated notes, vibrato and breath.
    I.whistleLine = (phrase, tEnd, vel, o) => {
      o = o || {};
      const t0 = phrase[0][0];
      const len = tEnd - t0 + 0.15;
      const V = E.voice(t0, len, true);
      if (!V) return;
      const pitch = ctx.createConstantSource();
      V.env(pitch.offset, glidePts(phrase.map(([t, n]) => [t, n, 0.035]), t0, 0.035));
      const amp = [[0, 0]];
      for (const [t, , d] of phrase) {
        const a = t - t0;
        amp.push([a + 0.025, vel, 'lin']);
        amp.push([a + Math.max(0.05, d - 0.05), vel * 0.8, 'lin']);
        amp.push([a + d, vel * 0.1, 'lin']);
      }
      amp.push([len, 0, 'lin']);
      const s = E.osc('sine', 0);
      pitch.connect(s.frequency);
      const lfo = E.osc('sine', 6);
      const lg = E.gain(hz(phrase[0][1]) * 0.012);
      lfo.connect(lg);
      lg.connect(s.frequency);
      const g = E.gain(0);
      V.env(g.gain, amp);
      s.connect(g);
      const n = E.noise(V, ['wbreath', t0]);
      const nf = E.filt('bandpass', hz(phrase[0][1]), 2);
      const ng = E.gain(0.06);
      n.connect(nf);
      nf.connect(ng);
      ng.connect(g);
      E.out(g, o.bus || 'lead', Object.assign({ room: 0.2, hall: 0.2 }, o));
      V.osc(pitch);
      V.osc(s);
      V.osc(lfo);
    };

    // Record scratch: a resonant noise band yanked up and down.
    I.scratch = (t, vel) =>
      I.nz(t, 0.34, {
        type: 'bandpass',
        q: 4,
        f: [[0, 900], [0.05, 3200, 'exp'], [0.1, 600, 'exp'], [0.19, 2600, 'exp'], [0.34, 350, 'exp']],
        amp: [[0, 0], [0.003, vel], [0.09, vel * 0.8, 'lin'], [0.11, vel * 0.25, 'lin'], [0.14, vel, 'lin'], [0.34, FLOOR, 'exp']],
        key: 'scratch',
        room: 0.1,
      });

    // Tire screech: a narrow wobbling noise band plus a squealing saw.
    I.skrrt = (t, len, vel) => {
      const f = [[0, 3300]];
      for (let k = 1; k * 0.03 < len; k++) f.push([k * 0.03, (k % 2 ? 3000 : 2500) - 900 * ((k * 0.03) / len), 'lin']);
      I.nz(t, len, { type: 'bandpass', q: 7, f, amp: [[0, 0], [0.004, vel], [len * 0.7, vel * 0.8, 'lin'], [len, FLOOR, 'exp']], stereo: true, room: 0.2, key: 'skrrt' });
      const V = E.voice(t, len + 0.02, false);
      if (!V) return;
      const s = E.osc('sawtooth', 1500);
      V.env(s.frequency, [[0, 1600], [len, 1100, 'exp']]);
      const lfo = E.osc('sine', 23);
      const lg = E.gain(90);
      lfo.connect(lg);
      lg.connect(s.frequency);
      const bp = E.filt('bandpass', 3000, 3);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.01, vel * 0.3], [len * 0.7, vel * 0.25, 'lin'], [len, FLOOR, 'exp']]);
      s.connect(bp);
      bp.connect(g);
      E.out(g, 'sfx', { room: 0.2 });
      V.osc(s);
      V.osc(lfo);
    };

    // Phone on vibrate: a low square rattled by a 32 Hz chopper.
    I.phoneBuzz = (t, len, vel) => {
      const V = E.voice(t, len + 0.02, false);
      if (!V) return;
      const s = E.osc('square', 150);
      const am = E.gain(0.6);
      const lfo = E.osc('square', 32);
      const lg = E.gain(0.4);
      lfo.connect(lg);
      lg.connect(am.gain);
      const lp = E.filt('lowpass', 2400, 0.8);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.003, vel], [len - 0.02, vel, 'lin'], [len, 0, 'lin']]);
      s.connect(am);
      am.connect(lp);
      lp.connect(g);
      E.out(g, 'sfx', { room: 0.15 });
      V.osc(s);
      V.osc(lfo);
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
  // "Hayk: The Burger Quest". 120 bpm: a beat is 0.5 s, an 8th 0.25 s, a bar 2 s. Home key A minor.
  // Hayk's theme (MOTIF, in scale degrees): A C E . D C D . E . . G A, a rising triad, a stepwise turn
  // and the leap home. It slams the title, drives the big decision, goes flamenco (harmonic minor) in
  // Spain, turns synth on the trading floor, sighs on strings for Goofy, flies home in C major and
  // ends the film in D major. Every cue in FILM.TIMELINE.cues is implemented by hand at its time.
  const CH = {
    Am: ['A3', 'C4', 'E4'],
    AmHi: ['A3', 'C4', 'E4', 'A4'],
    Dm: ['D4', 'F4', 'A4'],
    E: ['E3', 'G#3', 'B3', 'E4'],
    Am9: ['G3', 'B3', 'C4', 'E4'],
    Dm9: ['F3', 'A3', 'C4', 'E4'],
    Fmaj9: ['E3', 'G3', 'A3', 'C4'],
    // nylon-guitar voicings
    gAm: ['A2', 'E3', 'A3', 'C4', 'E4'],
    gG: ['G2', 'B2', 'D3', 'G3', 'B3', 'G4'],
    gF: ['F2', 'C3', 'F3', 'A3', 'C4'],
    gE: ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'],
    gBb: ['Bb2', 'F3', 'Bb3', 'D4', 'F4'],
    gD: ['D3', 'A3', 'D4', 'F#4'],
    gGmaj: ['G2', 'B2', 'D3', 'G3', 'B3', 'G4'],
    gA: ['A2', 'E3', 'A3', 'C#4', 'E4'],
  };
  const MOTIF = [[0, 0, 1], [1, 2, 1], [2, 4, 2], [4, 3, 1], [5, 2, 1], [6, 3, 2], [8, 4, 3], [11, 6, 1], [12, 7, 4]];
  const MODES = { min: [0, 2, 3, 5, 7, 8, 10], maj: [0, 2, 4, 5, 7, 9, 11], harm: [0, 2, 3, 5, 7, 8, 11] };
  const deg = (root, mode, d) => {
    const sc = MODES[mode];
    const i = ((d % 7) + 7) % 7;
    return hz(root) * Math.pow(2, (sc[i] + 12 * Math.floor(d / 7)) / 12);
  };
  // The theme from t0 in a key: [[t, hz, dur]], step = one 8th.
  const motif = (t0, root, mode, step) => MOTIF.map(([o, d, l]) => [t0 + o * step, deg(root, mode, d), l * step]);

  function score(E, I) {
    const { kick, hat, crash, tock, marimba, glock, glass, fmBell, gong, ting, pad, sub, subDrop, pluck, boop, stab, lead, horn, nz, play, glide, whistle, revSwell, wind, flutter, shaker, plip } = I;
    const { ks, piano, ep, taiko, snare, clap, cajon, brass, bass, bark, howl, whine, choir, bowed, whistleLine, scratch, skrrt, phoneBuzz, crunch } = I;
    const on = (a, b) => E.w1 > a - 1.5 && E.w0 < b + 0.5;
    const R = (...k) => E.rng(...k)();

    // ---- shared gestures
    const whoosh = (t, len, vel, o) => {
      o = o || {};
      nz(t, len, {
        type: 'bandpass',
        q: o.q || 1.1,
        f: [[0, o.f0 || 700], [len * 0.35, o.fp || 3000, 'exp'], [len, o.f1 || 500, 'exp']],
        amp: [[0, 0], [0.004, vel * 0.75], [len * 0.3, vel, 'lin'], [len, FLOOR, 'exp']],
        panEnv: o.pan ? [[0, o.pan[0]], [len, o.pan[1], 'lin']] : null,
        stereo: true,
        room: 0.15,
        hall: o.hall || 0.1,
        key: 'wh',
      });
    };
    const impact = (t, v, o) => {
      o = o || {};
      taiko(t, v, o.f || 50, { dec: 1.3, hall: 0.3 });
      kick(t, v, 'full');
      crash(t, 0.45 * v, { dec: o.dec || 1.8 });
      subDrop(t, 110, 36, 1.0, 0.7 * v);
      E.duck(t, 0.7);
    };
    const gtr = { bright: 0.42, t60: 1.5, len: 1.4, lp: 3600, room: 0.2, hall: 0.06 };
    const strum = (t, notes, vel, o) => {
      o = Object.assign({}, gtr, o || {});
      const ns = o.up ? notes.slice().reverse() : notes;
      ns.forEach((n, i) => ks(t + i * (o.spread || 0.012), n, vel * (1 - i * 0.04), o));
    };
    const golpe = (t, v) => {
      tock(t, 0.25 * v, 260);
      nz(t, 0.05, { type: 'bandpass', q: 1, f: [[0, 2400]], amp: perc(0.2 * v, 0.001, 0.03), key: 'golpe' });
    };
    const harp = { bright: 0.75, t60: 2.8, len: 2.2, lp: 6500, room: 0.2, hall: 0.35 };
    const gliss = (t, notes, step, vel) => notes.forEach((n, i) => ks(t + i * step, n, vel, harp));
    const sparkle = (t, v) => {
      ting(t, hz('E7'), 0.5 * v, { dec: 0.8 });
      glock(t, hz('B6'), 0.25 * v);
      glock(t + 0.06, hz('E7'), 0.2 * v);
      glass(t + 0.12, hz('B7'), 0.08 * v);
    };
    const roll = (a, b, v0, v1, f) => {
      const n = Math.round((b - a) / 0.125);
      for (let k = 0; k < n; k++) (f || snare)(a + k * 0.125, v0 + ((v1 - v0) * k) / Math.max(1, n - 1));
    };
    // Epic battle kit on 16ths from a to b.
    const battleDrums = (a, b, v, o) => {
      o = o || {};
      const pat = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1];
      const sn = o.snare || [4, 12];
      for (let k = 0; a + k * 0.125 < b - 1e-6; k++) {
        const t = a + k * 0.125;
        const s = k % 16;
        if (s % 4 === 0) {
          kick(t, 0.8 * v, 'full');
          E.duck(t, 0.45);
        }
        if (sn.includes(s)) snare(t, 0.5 * v);
        if (pat[s]) taiko(t, (0.2 + (s % 4 === 0 ? 0.12 : 0)) * v, s % 2 ? 105 : 82, { dec: 0.35 });
        if (s % 2 === 0) hat(t, 0.06 * v);
      }
    };
    // Comedy theme: C major oom-pah, pizzicato bass and tune, marimba chords and a woodblock.
    const comedy = (t0, t1, o) => {
      o = o || {};
      const bars = [['C3', 'G2', ['E4', 'G4', 'C5']], ['G2', 'D3', ['F4', 'G4', 'B4']]];
      const tune = [
        [[0, 'E5'], [0.25, 'G5'], [0.5, 'E5'], [0.75, 'C5'], [1, 'D5'], [1.25, 'E5'], [1.5, 'G4']],
        [[0, 'F5'], [0.25, 'D5'], [0.5, 'B4'], [0.75, 'G4'], [1, 'A4'], [1.25, 'B4'], [1.5, 'D5'], [1.75, 'F5']],
      ];
      const pz = { bright: 0.55, t60: 0.4, len: 0.45, lp: 4500, room: 0.2 };
      for (let bi = 0; t0 + bi * 2 < t1 - 1e-6; bi++) {
        const b = t0 + bi * 2;
        const [r1, r2, chord] = bars[bi % 2];
        for (const [dt, r] of [[0, r1], [1, r2]]) if (b + dt < t1 - 1e-6) ks(b + dt, r, 0.9, { bright: 0.3, t60: 0.5, len: 0.5, lp: 1800 });
        for (const dt of [0.5, 1.5])
          if (b + dt < t1 - 1e-6) {
            chord.forEach((n) => marimba(b + dt, hz(n), 0.17, { dec: 0.35 }));
            tock(b + dt, 0.25, 950);
          }
        for (const [dt, n] of tune[bi % 2])
          if (b + dt < t1 - 1e-6) {
            ks(b + dt, n, 0.6, pz);
            marimba(b + dt, hz(n), 0.18, { pan: 0.2 });
          }
        if (o.kick) {
          kick(b, 0.7, 'felt');
          if (b + 1 < t1) kick(b + 1, 0.6, 'felt');
          for (const dt of [0.5, 1.5]) if (b + dt < t1) snare(b + dt, 0.18, { dec: 0.1 });
        }
      }
    };

    // ============================================================ 0-4 COLD OPEN (A minor)
    if (on(0, 4)) {
      taiko(0, 1.0, 52, { dec: 1.6, hall: 0.35 });
      kick(0, 0.9, 'full');
      subDrop(0, 95, 36, 1.3, 0.8);
      pad(0, 3.6, ['A1', 'E2', 'A2', 'E3'], 0.3, { att: 0.3, rel: 0.3, cut0: 500, cut1: 1400 });
      revSwell(0.03, 0.935, 0.55, { hi: true }); // reverse cymbal into the slam
      // 0.5 focus lines
      whoosh(0.5, 0.45, 0.55, { f0: 900, fp: 3600, f1: 500, pan: [-0.6, 0.6] });
      taiko(0.5, 0.8, 78);
      snare(0.5, 0.45);
      taiko(0.75, 0.45, 95);
      // 1.0 title slam, and the theme on horns
      impact(1, 1.05, { dec: 2.2 });
      brass(1, CH.AmHi, 0.4, 0.55);
      const ph = [[1, 'A4'], [1.25, 'C5'], [1.5, 'E5'], [2, 'D5'], [2.25, 'C5'], [2.5, 'D5'], [3, 'E5'], [3.25, 'G5'], [3.5, 'A5']];
      horn(ph, 3.7, 0.34, { hall: 0.25 });
      horn(ph.map(([t, n]) => [t, hz(n) / 2]), 3.7, 0.26, { hall: 0.2, pan: -0.2 });
      brass(2, ['F3', 'A3', 'D4'], 0.3, 0.38);
      brass(3, ['C4', 'E4', 'G4'], 0.3, 0.38);
      brass(3.5, CH.AmHi, 0.22, 0.5);
      for (const [t, v, f] of [[1.5, 0.6, 70], [1.75, 0.4, 90], [2, 0.75, 60], [2.5, 0.6, 70], [2.75, 0.45, 90], [3, 0.75, 60], [3.25, 0.5, 80]]) taiko(t, v, f);
      taiko(3.5, 0.95, 50, { dec: 0.45, hall: 0.05 });
      kick(2, 0.7, 'full');
      kick(3, 0.7, 'full');
      kick(3.5, 0.9, 'full');
      crash(3.5, 0.4, { dec: 0.45 });
      roll(3, 3.5, 0.15, 0.45);
      sub(1, 2, 'A1', 0.45);
      sub(2, 3, 'D2', 0.45);
      sub(3, 3.5, 'C2', 0.45);
      sub(3.5, 3.8, 'A1', 0.5);
      for (let k = 0; k < 10; k++) {
        const t = 1 + k * 0.25;
        const root = t < 2 ? 'A2' : t < 3 ? 'D2' : 'C3';
        pluck(t, root, 0.26, { dec: 0.2, bright: 6 });
        pluck(t + 0.125, hz(root) * 2, 0.12, { dec: 0.12, bright: 6 });
      }
      // 2.0 burger sparkle chime
      ting(2, hz('A6'), 0.5);
      [['E6', 0], ['A6', 0.06], ['C7', 0.12], ['E7', 0.18]].forEach(([n, d]) => glock(2 + d, hz(n), 0.3));
      glass(2.02, hz('E7'), 0.12);
      // 3.0 EPISODE 1 tag
      tock(3, 0.2, 1400);
    }

    // ============================================================ 4-9 TRADER DEN: lo-fi beat
    if (on(4, 9)) {
      play(4, 4.6, () => grainBuffer(E.ctx, 'vinyl', 4.6, clickGrains(E.rng('vinyl'), 0, 4.6, 150, { amp: 0.22, f0: 1800, f1: 5000, dec: 0.001 })), 0.3, { bus: 'amb' });
      nz(4, 4.6, { type: 'bandpass', q: 0.5, f: [[0, 2500]], amp: [[0, 0], [0.3, 0.012], [4.4, 0.012], [4.6, 0]], stereo: true, sustain: true, bus: 'amb', key: 'hiss' });
      for (const [t, root, notes] of [[4, 'A1', CH.Am9], [6, 'D2', CH.Dm9], [8, 'F1', CH.Fmaj9]]) {
        const end = Math.min(t + 2, 8.5);
        sub(t, end - 0.1, root, 0.42, { att: 0.02, rel: 0.2 });
        notes.forEach((n, i) => ep(t + i * 0.014, n, 0.3, { dec: 1.6 }));
        if (t < 8) {
          notes.forEach((n, i) => ep(t + 0.75 + i * 0.012, n, 0.19, { dec: 1.0 }));
          notes.slice(1).forEach((n, i) => ep(t + 1.56 + i * 0.012, n, 0.14, { dec: 0.7 }));
        }
      }
      tock(4, 0.3, 2400);
      hat(4, 0.12);
      for (const b of [4, 6, 8]) {
        kick(b, 0.75, 'felt');
        E.duck(b, 0.3);
        if (b < 8) {
          kick(b + 0.75, 0.5, 'felt');
          kick(b + 1.31, 0.4, 'felt');
          snare(b + 1, 0.4, { dec: 0.14 }); // the rim lands on 5 and 7
        }
      }
      for (let t = 4; t < 8.5; t += 0.5) {
        hat(t, 0.07 + 0.03 * R('lh', t));
        hat(t + 0.31, 0.045);
      }
      // the EP quotes the theme head, swung and lazy
      [[6, 'A4'], [6.31, 'C5'], [6.5, 'E5'], [7, 'D5'], [7.31, 'C5'], [7.5, 'D5']].forEach(([t, n]) => ep(t, n, 0.26, { dec: 0.9, delay: 0.12 }));
      whoosh(5, 0.5, 0.55, { f0: 500, fp: 3200, f1: 700, pan: [-0.9, 0.4] });
      // 7.0 PING
      ting(7, hz('B6'), 0.6, { dec: 0.9 });
      glass(7, hz('E7'), 0.25);
      glock(7.06, hz('B6'), 0.2);
      revSwell(8, 0.965, 0.5);
      roll(8.5, 9, 0.18, 0.45);
    }

    // ============================================================ 9-13 BIG DECISION: battle drums
    if (on(9, 13)) {
      whoosh(9, 0.55, 0.6, { f0: 400, fp: 2600, f1: 300, pan: [0.8, -0.8] });
      impact(9, 1.0);
      impact(9.5, 0.9);
      impact(11, 1.0);
      // the theme in harmonic minor: its accents land on the 9, 9.5 and 11 impacts
      const ph = motif(9, 'A4', 'harm', 0.25).map(([t, f]) => [t, f]);
      horn(ph, 12.7, 0.36, { hall: 0.25 });
      horn(ph.map(([t, f]) => [t, f / 2]), 12.7, 0.28, { hall: 0.2 });
      for (const [t, root, notes] of [[9, 'A2', CH.Am], [10, 'D2', CH.Dm], [11, 'E2', CH.E], [12, 'A2', CH.AmHi]]) {
        pad(t, t + (t === 12 ? 0.7 : 1), notes, 0.2, { att: 0.05, rel: 0.2, cut0: 1500, cut1: 2500 });
        sub(t, t + (t === 12 ? 0.7 : 1), root, 0.5);
        for (let k = 0; k < (t === 12 ? 5 : 8); k++) pluck(t + k * 0.125, k % 4 === 2 ? hz(root) * 2 : root, 0.28, { dec: 0.13, bright: 7 });
      }
      for (const [t, notes, v] of [[9, CH.Am, 0.5], [9.5, CH.AmHi, 0.6], [10.25, CH.Dm, 0.35], [10.75, CH.Dm, 0.4], [11, CH.E, 0.6], [11.5, ['E4', 'G#4', 'B4'], 0.4], [12, CH.AmHi, 0.55], [12.5, CH.AmHi, 0.6]]) brass(t, notes, t === 12.5 ? 0.2 : 0.18, v);
      battleDrums(9, 12.5, 1);
      kick(12.5, 0.9, 'full');
      taiko(12.5, 0.9, 55);
      crash(12.5, 0.4, { dec: 1.0 });
    }

    // ============================================================ 13-17 GOOFY KNOWS: sad piano
    if (on(13, 17)) {
      [[13, 'A2'], [13.5, 'E3'], [14, 'F2'], [14.5, 'C3'], [15, 'D2'], [15.5, 'A2'], [16, 'E2'], [16.5, 'B2']].forEach(([t, n]) => piano(t, n, 0.26));
      [[13, ['C4', 'E4']], [14, ['A3', 'C4']], [15, ['F3', 'A3']], [16, ['G#3', 'D4']]].forEach(([t, ns]) => ns.forEach((n) => piano(t + 0.02, n, 0.12)));
      // the theme, slowed to quarters and bent sad at the end
      [[13, 'A4'], [13.5, 'C5'], [14, 'E5'], [15, 'D5'], [15.5, 'C5'], [16, 'B4']].forEach(([t, n]) => {
        piano(t, n, 0.36);
        glock(t, hz(n) * 2, 0.06, { dec: 1.2 });
      });
      pad(13, 16.9, ['A2', 'E3', 'C4'], 0.1, { sine: true, att: 0.8, rel: 0.5 });
      whine(14.05, 0.75, 700, 1150, 850, 0.14);
      whine(14.95, 0.6, 800, 1050, 650, 0.1);
      [16, 16.5].forEach((t, i) => {
        tock(t, 0.25, 130, { bus: 'sfx', dec: 0.08 });
        nz(t, 0.08, { type: 'lowpass', f: [[0, 1800]], amp: perc(0.22, 0.001, 0.04), key: 'step' + i });
      });
    }

    // ============================================================ 17-21 LEASH HANDOFF: comedy bounce
    if (on(17, 21)) {
      comedy(17, 20);
      hat(17, 0.05);
      // 19.5 teeth sparkle
      sparkle(19.5, 1);
      // 20 ominous low note: a tritone in the low piano, taiko and low brass
      piano(20, 'A1', 0.45, { dec: 2.5 });
      piano(20, 'Eb2', 0.35, { dec: 2.5 });
      piano(20, 'A2', 0.2, { dec: 2 });
      taiko(20, 0.7, 45, { dec: 1.5, hall: 0.3 });
      horn([[20, 'A2']], 20.85, 0.3);
      horn([[20, 'Eb3']], 20.85, 0.22);
      sub(20, 20.85, 'A1', 0.5, { att: 0.01, rel: 0.3 });
    }

    // ============================================================ 21-26 TAKEOFF
    if (on(21, 26)) {
      // jet engine: rising roar, turbine whine
      nz(21, 2.6, {
        type: 'lowpass',
        q: 0.9,
        f: [[0, 250], [1.0, 2600, 'exp'], [1.2, 3500, 'exp'], [2.6, 700, 'exp']],
        amp: [[0, 0], [0.03, 0.12], [1.0, 0.45, 'exp'], [1.3, 0.5, 'lin'], [2.6, FLOOR, 'exp']],
        stereo: true,
        sustain: true,
        panEnv: [[0, -0.5], [1.2, 0], [2.6, 0.7, 'lin']],
        key: 'jet',
        room: 0.1,
      });
      glide(21, 600, 2600, 1.1, 0.06, { hall: 0.1 });
      taiko(21, 0.6, 60);
      kick(21, 0.6, 'full');
      tock(21, 0.3, 700, { bus: 'sfx' });
      pad(21, 22, ['C3', 'G3', 'C4', 'E4'], 0.22, { att: 0.9, rel: 0.05, cut0: 600, cut1: 3000 });
      roll(21.5, 22, 0.12, 0.4);
      // 22 takeoff
      whoosh(22, 0.9, 0.7, { f0: 300, fp: 2800, f1: 400, pan: [-0.7, 0.8], hall: 0.2 });
      impact(22, 0.9);
      brass(22, ['C4', 'E4', 'G4', 'C5'], 0.35, 0.45);
      // adventure groove C | G/B | F | E7 into Spain
      for (const [t, root, notes] of [[22, 'C2', ['C4', 'E4', 'G4']], [23, 'B1', ['B3', 'D4', 'G4']], [24, 'F2', ['A3', 'C4', 'F4']], [25, 'E2', ['G#3', 'B3', 'D4', 'E4']]]) {
        pad(t, t + 1, notes, 0.16, { att: 0.08, rel: 0.1, cut0: 1600, cut1: 2400 });
        for (let k = 0; k < 4; k++) bass(t + k * 0.25, k % 2 ? hz(root) * 2 : root, 0.2, 0.4);
        for (let k = 0; k < 8; k++) pluck(t + k * 0.125, notes[k % notes.length], 0.13, { dec: 0.16, bright: 9, delay: 0.08, pan: k % 2 ? 0.3 : -0.3 });
      }
      for (let t = 22.5; t < 25; t += 0.5) {
        kick(t, 0.65, 'full');
        E.duck(t, 0.4);
      }
      for (const t of [22.5, 23.5, 24.5]) clap(t, 0.35);
      for (let t = 23.5; t < 26; t += 0.125) shaker(t, 0.05 + (Math.round(t * 8) % 2 ? 0 : 0.03));
      // 23.5 whip-pan swish
      nz(23.5, 0.28, { type: 'bandpass', q: 0.9, f: [[0, 1500], [0.2, 7000, 'exp'], [0.28, 3000, 'exp']], amp: [[0, 0], [0.003, 0.6], [0.08, 0.5, 'lin'], [0.28, FLOOR, 'exp']], panEnv: [[0, 0.9], [0.25, -0.9, 'lin']], stereo: true, key: 'swish' });
      crash(23.5, 0.3, { dec: 1 });
      // map flight: a glockenspiel travel figure
      [[24, 'C6'], [24.25, 'G5'], [24.5, 'A5'], [24.75, 'C6'], [25, 'B5'], [25.25, 'G#5'], [25.5, 'E5']].forEach(([t, n]) => glock(t, hz(n), 0.14, { dec: 1 }));
      // a first flamenco flourish on E
      strum(25, CH.gE, 0.3);
      strum(25.5, CH.gE, 0.25, { spread: 0.008 });
      strum(25.625, CH.gE, 0.25, { spread: 0.008 });
      strum(25.75, CH.gE, 0.3, { spread: 0.008 });
      revSwell(25, 0.965, 0.45);
      roll(25, 26, 0.1, 0.4);
    }

    // ============================================================ 26-34 SPAIN: flamenco groove
    if (on(26, 34)) {
      const segs = [[26, 27, 'A2', CH.gAm], [27, 28, 'G2', CH.gG], [28, 29, 'E2', CH.gE], [29, 30, 'A2', CH.gAm], [30, 30.5, 'A2', CH.gAm], [30.5, 31, 'G2', CH.gG], [31, 31.5, 'F2', CH.gF]];
      for (const [a, b, root, notes] of segs) {
        ks(a, root, 0.5, { bright: 0.3, t60: 0.9, len: 0.9, lp: 1200 });
        sub(a, b - 0.05, root, 0.3);
        for (let t = a; t < b - 1e-6; t += 0.25) {
          const k = Math.round((t - 26) / 0.25) % 4;
          if (k === 0) strum(t, notes, 0.46);
          else if (k === 2) {
            golpe(t, 1);
            strum(t, notes.slice(-3), 0.16, { stop: 0.07, lp: 2200 });
          } else strum(t, notes.slice(-3), 0.22, { up: true, len: 0.5 });
          // cajon: bass on 1, slap on the backbeat; palmas on the backbeat and the last 8th
          if (k === 0) cajon(t, 0.55, false);
          if (k === 2) {
            cajon(t, 0.45, true);
            clap(t, 0.26, { pan: -0.3 });
          }
          if (k === 3) clap(t, 0.2, { pan: 0.35 });
          if (k === 1 && Math.round(t * 4) % 8 === 5) cajon(t, 0.3, false);
        }
      }
      // the theme on nylon guitar, harmonic minor, doubled softly by the FM lead
      const m = motif(26, 'A4', 'harm', 0.25);
      m.forEach(([t, f]) => ks(t, f, 0.8, { bright: 0.62, t60: 1.2, len: 1.2, lp: 5000, pan: 0.1, room: 0.2, delay: 0.08 }));
      lead(m.map(([t, f]) => [t, f, 0.03]), 29.9, 0.08, { delay: 0.1 });
      // the answer: a descending flamenco run into the E sting
      [[30, 'A5'], [30.25, 'G5'], [30.5, 'F5'], [30.75, 'E5'], [31, 'D5'], [31.25, 'C5']].forEach(([t, n]) => ks(t, n, 0.75, { bright: 0.62, t60: 1, len: 0.9, lp: 5000, pan: 0.1, delay: 0.08 }));
      // 27.5 pose sparkle; 30.5 the aroma ribbon
      sparkle(27.5, 0.9);
      ['A5', 'C6', 'E6', 'A6'].forEach((n, i) => glass(30.5 + i * 0.09, hz(n), 0.06, { dec: 1.2 }));
      // 31.5 impact frame: E sting with the flamenco b9
      impact(31.5, 0.95);
      brass(31.5, ['E3', 'B3', 'F4', 'G#4'], 0.4, 0.55);
      strum(31.5, CH.gE, 0.6, { spread: 0.008 });
      sub(31.5, 32.9, 'E1', 0.4, { att: 0.2 });
      // tremolo on E, growing to the shout
      for (let t = 31.875; t < 33 - 1e-6; t += 0.125) strum(t, CH.gE.slice(-4), 0.06 + ((t - 31.875) / 1.125) * 0.14, { spread: 0.006, len: 0.4, up: Math.round(t * 8) % 2 === 1 });
      roll(32.25, 33, 0.08, 0.35, (t, v) => taiko(t, v, 90, { dec: 0.3 }));
      pad(31.8, 33, ['E2', 'B2', 'E3'], 0.14, { att: 1.0, rel: 0.05, cut0: 400, cut1: 1600 });
      // 33 shout sting on Bb, the Phrygian flat two
      impact(33, 1.05);
      brass(33, ['Bb3', 'D4', 'F4', 'Bb4'], 0.35, 0.6);
      strum(33, CH.gBb, 0.6, { spread: 0.008 });
      glass(33, hz('F7'), 0.1);
      // fill into the montage
      for (const [t, s] of [[33.5, false], [33.625, true], [33.75, false], [33.875, true]]) cajon(t, 0.5, s);
      clap(33.75, 0.35);
      clap(33.875, 0.4);
    }

    // ============================================================ 34-49 EATING MONTAGE: heavy funk
    if (on(34, 49)) {
      const bassA = [[0, 'A1', 2], [3, 'A2', 1], [4, 'A1', 1], [6, 'G2', 1], [7, 'A2', 1], [10, 'E2', 1], [11, 'G2', 1], [12, 'A2', 2], [14, 'C3', 1], [15, 'C#3', 1]];
      const bassD = [[0, 'D2', 2], [3, 'D3', 1], [4, 'D2', 1], [6, 'C3', 1], [7, 'D3', 1], [10, 'A2', 1], [11, 'C3', 1], [12, 'D3', 2], [14, 'F#2', 1], [15, 'G#2', 1]];
      for (let bar = 34; bar < 48.5; bar += 2) {
        const isA = ((bar - 34) / 2) % 2 === 0;
        const stop = bar === 48 ? 4 : 16;
        for (const [s, n, l] of isA ? bassA : bassD) if (s < stop) bass(bar + s * 0.125, n, l * 0.11, 0.55);
        const chop = isA ? ['G3', 'C4', 'E4'] : ['F#3', 'C4', 'E4'];
        for (let s = 0; s < stop; s++) {
          const t = bar + s * 0.125;
          if ([0, 3, 7, 10].includes(s)) {
            kick(t, s ? 0.72 : 0.92, 'full');
            E.duck(t, 0.35);
          }
          if (s === 4 || s === 12) snare(t, 0.6);
          else if ([6, 9, 14].includes(s)) snare(t, 0.09, { dec: 0.07 });
          hat(t, (s % 2 ? 0.035 : 0.075) + (s % 4 === 2 ? 0.03 : 0), s === 14 && !isA);
          if ([2, 5, 10, 13].includes(s)) stab(t, chop, 0.22, { len: 0.07, f: 1900, pan: 0.2 });
        }
        // Burger Kong and McDonut's: the horn section joins
        if (bar >= 40 && bar < 48) for (const s of [6, 14]) brass(bar + s * 0.125, isA ? ['C4', 'E4', 'G4'] : ['C4', 'D4', 'F#4'], 0.1, 0.3, { hall: 0.1 });
        if (bar >= 44 && bar < 48) pad(bar, bar + 2, isA ? ['E4', 'G4', 'C5'] : ['F#4', 'A4', 'C5'], 0.12, { att: 0.3, rel: 0.2, cut0: 2500, cut1: 3500, hall: 0.2 });
      }
      // 34 cut
      crash(34, 0.5);
      taiko(34, 0.7, 60);
      // CRUNCH x3
      crunch(35, 0.95, 'k1');
      crunch(36, 0.95, 'k2');
      crunch(37, 1.0, 'k3');
      // 39 Burger Kong: gorilla toms
      crash(39, 0.35);
      for (const [t, f] of [[39, 70], [39.25, 60], [39.5, 50]]) taiko(t, 0.6, f);
      // 40 CHOMP
      impact(40, 1.05);
      crunch(40, 1.0, 'chomp');
      nz(40, 0.18, { type: 'lowpass', q: 1.2, f: [[0, 1800], [0.18, 300, 'exp']], amp: perc(0.7, 0.002, 0.1), key: 'chomp' });
      glide(40.12, 380, 90, 0.2, 0.3, { bus: 'sfx' });
      // 44 McDonut's
      crash(44, 0.45);
      taiko(44, 0.6, 60);
      for (let k = 0; k < 20; k++) {
        const t = 44.125 + k * 0.125;
        const ns = ['E7', 'C7', 'A6', 'G6', 'E6', 'D6', 'C6'];
        glock(t, hz(ns[(k * 3) % ns.length]), 0.05 + 0.03 * R('fries', k), { dec: 0.6, pan: (R('fp', k) - 0.5) * 1.2 });
      }
      // 47 "BA DA BA BA BAAA": the theme head, sung by the horns
      [[47, 'A4', 0.2], [47.25, 'C5', 0.2], [47.5, 'E5', 0.2], [47.75, 'D5', 0.2], [48, 'C5', 0.45]].forEach(([t, n, l]) => {
        brass(t, [n, hz(n) / 2], l, 0.42, { hall: 0.2 });
        glock(t, hz(n) * 2, 0.12);
      });
      lead([[47, 'A4'], [47.25, 'C5'], [47.5, 'E5'], [47.75, 'D5'], [48, 'C5']], 48.45, 0.12, { delay: 0.12 });
      revSwell(48, 0.965, 0.45, { hi: true });
      roll(48.5, 49, 0.2, 0.5);
      ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'].forEach((n, i) => glass(48.5 + i * 0.07, hz(n), 0.05, { dec: 0.8 }));
    }

    // ============================================================ 49-54 FOOD NIRVANA: choir and bells
    if (on(49, 54)) {
      const chs = [[49, 51, 'F2', ['F3', 'A3', 'C4', 'E4', 'G4']], [51, 52, 'E2', ['E3', 'G3', 'C4', 'E4', 'G4']], [52, 53, 'D2', ['D3', 'F3', 'A3', 'C4', 'E4']], [53, 53.9, 'G2', ['D3', 'G3', 'B3', 'D4', 'F4']]];
      for (const [a, b, r, ns] of chs) {
        choir(a, b, ns, a === 49 ? 0.36 : 0.3, { att: a === 49 ? 0.05 : 0.35, rel: 0.8 });
        pad(a, b, ns.map((n) => hz(n) * 2), 0.08, { sine: true, att: 0.4, rel: 0.8, hall: 0.4 });
        sub(a, b, r, 0.3, { att: 0.3, rel: 0.4 });
      }
      gong(49, hz('F2'), 0.4);
      crash(49, 0.4, { dec: 2.5, hall: 0.4 });
      fmBell(49, hz('C6'), 0.3, { ratio: 3.5, index: 2, dec: 2.5 });
      fmBell(49, hz('F5'), 0.28, { ratio: 3.5, index: 2, dec: 2.5 });
      glock(49, hz('A6'), 0.3);
      taiko(49, 0.6, 55, { hall: 0.4 });
      gliss(49, ['F3', 'A3', 'C4', 'E4', 'F4', 'A4', 'C5', 'E5', 'F5', 'A5', 'C6', 'E6'], 0.06, 0.22);
      // the theme on celestial bells, C major
      [[50, 'C6'], [50.5, 'E6'], [51, 'G6'], [52, 'F6'], [52.5, 'E6'], [53, 'F6']].forEach(([t, n]) => {
        glock(t, hz(n), 0.22, { dec: 2 });
        fmBell(t, hz(n), 0.1, { ratio: 1, index: 1.5, dec: 1.5, delay: 0.15 });
      });
      for (let t = 49.5; t < 54; t += 0.5) kick(t, 0.22, 'felt');
      for (let k = 0; k < 18; k++) {
        const ns = ['C6', 'E6', 'G6', 'A6', 'C7'];
        glock(49.375 + k * 0.25, hz(ns[Math.floor(R('tw', k) * ns.length)]), 0.05, { dec: 1.2, pan: (R('twp', k) - 0.5), delay: 0.2 });
      }
      revSwell(53.3, 0.67, 0.4, { hi: true });
    }

    // ============================================================ 54-59 DAY COUNTER
    if (on(54, 59)) {
      comedy(54, 58.5, { kick: true });
      for (const t of [54, 56, 58]) {
        nz(t, 0.35, { type: 'bandpass', q: 1.3, f: [[0, 3500], [0.3, 900, 'exp']], amp: [[0, 0], [0.003, 0.55], [0.06, 0.3, 'exp'], [0.35, FLOOR, 'exp']], panEnv: [[0, -0.6], [0.35, 0.7, 'lin']], stereo: true, key: 'page' });
        flutter(t + 0.02, 0.3, [0, 0.06, 0.12, 0.18], { vel: 0.25, f0: 2500, f1: 1200, pan: 0.5 });
      }
      // the tallies roll up
      for (const [t, len, n] of [[54.3, 0.6, 12], [56.3, 0.7, 16]]) {
        play(t, len, () => grainBuffer(E.ctx, ['ratchet', t], len, Array.from({ length: n }, (_, i) => ({ t: (i * len) / n, dur: 0.012, amp: 0.3, pan: 0.3, f: 1800 + i * 90, q: 4, att: 0.0005, dec: 0.003 }))), 0.6, { bus: 'sfx', sustain: false });
      }
      // 58.5 stamp THUD
      kick(58.5, 1.0, 'thud');
      taiko(58.5, 0.9, 60, { dec: 0.5 });
      nz(58.5, 0.09, { type: 'bandpass', q: 0.7, f: [[0, 1500]], amp: perc(0.6, 0.001, 0.05), key: 'stamp' });
      tock(58.5, 0.4, 180, { bus: 'sfx' });
      E.duck(58.5, 0.6);
    }

    // ============================================================ 59-68 BURGER CHART / INVESTOR CALL: synth trader beat
    if (on(59, 68)) {
      const call = (t) => t >= 64 - 1e-6 && t < 65.5 - 1e-6;
      for (const [a, r, ns] of [[59, 'A1', ['A3', 'C4', 'E4']], [61, 'F1', ['F3', 'A3', 'C4']], [63, 'C2', ['G3', 'C4', 'E4']], [65, 'G1', ['G3', 'B3', 'D4']], [67, 'A1', ['A3', 'C4', 'E4']]]) {
        const b = Math.min(a + 2, 68);
        pad(a, b, ns, 0.18, { att: 0.02, rel: 0.1, cut0: 900, cut1: 2200, hall: 0.1 });
        for (let k = 0; a + k * 0.25 < b - 1e-6; k++) if (!call(a + k * 0.25)) bass(a + k * 0.25, k % 2 ? hz(r) * 2 : r, 0.18, 0.42);
        const arp = [ns[0], ns[1], ns[2], hz(ns[0]) * 2, ns[2], ns[1]];
        for (let k = 0; a + k * 0.125 < b - 1e-6; k++) if (!call(a + k * 0.125)) pluck(a + k * 0.125, arp[k % arp.length], 0.12, { dec: 0.18, bright: 10, delay: 0.1, pan: k % 2 ? 0.3 : -0.3 });
      }
      for (let t = 59; t < 68 - 1e-6; t += 0.5) {
        const c = call(t);
        const back = Math.round((t - 59) / 0.5) % 2 === 1;
        if (!c) {
          kick(t, 0.8, 'full');
          E.duck(t, 0.5);
          if (back) clap(t, 0.42);
          hat(t + 0.25, 0.08, true);
        }
        hat(t, 0.04);
        hat(t + 0.125, 0.025);
        hat(t + 0.375, 0.03);
      }
      crash(59, 0.45);
      // the theme on the synth lead, cut off by the phone
      lead(motif(61, 'A4', 'min', 0.25).map(([t, f]) => [t, f, 0.02]), 64.3, 0.2, { delay: 0.2 });
      // 61 ALL-TIME HIGH bling
      ting(61, hz('A6'), 0.3);
      glass(61.03, hz('E7'), 0.12);
      // 64 phone buzz, 65.5 decline swipe
      phoneBuzz(64, 0.4, 0.45);
      phoneBuzz(64.6, 0.4, 0.45);
      phoneBuzz(65.2, 0.25, 0.45);
      nz(65.5, 0.22, { type: 'bandpass', q: 1.2, f: [[0, 4500], [0.2, 900, 'exp']], amp: [[0, 0], [0.002, 0.6], [0.22, FLOOR, 'exp']], panEnv: [[0, 0.6], [0.2, -0.6, 'lin']], stereo: true, key: 'swipe' });
      glide(65.5, 520, 130, 0.3, 0.25, { bus: 'sfx' });
      stab(65.5, ['E3', 'Bb3'], 0.3, { len: 0.3, f: 900 });
      kick(65.5, 0.7, 'thud');
      // 67 another bite
      crunch(67, 0.45, 'bite');
      revSwell(67.3, 0.665, 0.4);
    }

    // ============================================================ 68-71 MEANWHILE: eyecatch
    if (on(68, 71)) {
      impact(68, 0.9);
      whoosh(68, 0.5, 0.5, { pan: [-0.9, 0.9] });
      [[68, 'D5'], [68.125, 'F5'], [68.25, 'A5']].forEach(([t, n]) => brass(t, [n, hz(n) / 2], 0.1, 0.4));
      [['D6', 0], ['F6', 0.06], ['A6', 0.12], ['D7', 0.18]].forEach(([n, d]) => glock(68 + d, hz(n), 0.22));
      // MEANWHILE... and IN YEREVAN slam in
      taiko(68.5, 0.9, 55);
      brass(68.5, ['Bb3', 'D4', 'F4', 'Bb4'], 0.35, 0.5);
      crash(68.5, 0.3);
      taiko(69.5, 0.8, 60);
      brass(69.5, ['C4', 'E4', 'G4', 'C5'], 0.45, 0.5);
      [['C6', 0], ['E6', 0.08], ['G6', 0.16]].forEach(([n, d]) => glock(69.5 + d, hz(n), 0.18));
      sub(68.5, 69.4, 'Bb1', 0.4);
      sub(69.5, 70.8, 'C2', 0.4);
      // Goofy's angry vein pops, with a tiny growl
      boop(70, 'G5', 0.35);
      bark(70.06, 0.1, { f: 720 });
      for (let t = 70.25; t < 71; t += 0.25) tock(t, 0.1, Math.round(t * 4) % 2 ? 1000 : 1400);
    }

    // ============================================================ 71-75 GRANT WALK: whistle in the park (G major)
    if (on(71, 75)) {
      const g = { bright: 0.4, t60: 2.2, len: 2, lp: 3200, room: 0.2, hall: 0.15 };
      for (const [t, ns] of [[71, ['G2', 'D3', 'B3', 'D3']], [72, ['E2', 'B2', 'G3', 'B2']], [73, ['C3', 'G3', 'E4', 'G3']], [74, ['D3', 'A3', 'F#4', 'A3']]]) ns.forEach((n, i) => ks(t + i * 0.25, n, i ? 0.3 : 0.42, g));
      pad(71, 74.95, ['G3', 'B3', 'D4'], 0.07, { sine: true, att: 0.5, rel: 0.1 });
      wind(71, 75, [[0, 0], [0.5, 0.04], [3.8, 0.04], [4, 0]]);
      for (const t of [71.6, 71.68, 72.9, 73.7, 73.78, 74.4]) glide(t, 3200 + R('bird', t) * 900, 4300, 0.05, 0.04, { bus: 'amb', hall: 0.2, pan: 0.5 });
      for (let t = 71; t < 75; t += 0.25) shaker(t, t % 0.5 ? 0.03 : 0.05, 0.3);
      whistleLine([[71.25, 'B5', 0.5], [71.75, 'D6', 0.25], [72, 'G6', 0.75], [72.75, 'E6', 0.25], [73, 'C6', 0.5], [73.5, 'E6', 0.5], [74, 'D6', 0.25], [74.25, 'C6', 0.25], [74.5, 'A5', 0.45]], 74.95, 0.19);
    }

    // ============================================================ 75-79 GOOFY SENSES: the music stops
    if (on(75, 79)) {
      scratch(75, 0.55);
      pad(75.1, 79, ['A1', 'Bb1', 'E2'], 0.25, { att: 1.0, rel: 0.05, cut0: 300, cut1: 900 });
      sub(75.1, 78.95, 'A1', 0.3, { att: 1.0, rel: 0.05 });
      bowed([[75.5, 'E6']], 78.95, 0.05, { att: 1.5, cut: 5000, rel: 0.05 });
      bowed([[75.5, 'F6']], 78.95, 0.04, { att: 1.5, cut: 5000, rel: 0.05 });
      wind(75, 79, [[0, 0], [1, 0.05], [3.9, 0.07], [4, 0]]);
      // 76 menace rumble
      taiko(76, 1.0, 42, { dec: 1.8, hall: 0.4 });
      gong(76, hz('A1'), 0.5);
      brass(76, ['A2', 'Bb2', 'E3'], 0.6, 0.45);
      horn([[76, 'E2']], 78.9, 0.22);
      horn([[76, 'Bb2']], 78.9, 0.16);
      nz(76, 3, { type: 'lowpass', q: 0.7, f: [[0, 140], [3, 260, 'exp']], amp: [[0, 0], [0.05, 0.5], [3, 0.7, 'lin']], sustain: true, stereo: true, key: 'rumble' });
      for (const [t, v] of [[77, 0.4], [77.75, 0.45], [78.25, 0.5], [78.5, 0.55], [78.625, 0.5], [78.75, 0.6], [78.875, 0.65]]) taiko(t, v, 65, { dec: 0.5 });
      // 78 glowing eyes, 78.5 UH-OH
      glass(78, hz('E7'), 0.18, { dec: 1 });
      ting(78, hz('F7'), 0.2);
      plip(78.5, 600, 300, 0.2);
      revSwell(78.2, 0.765, 0.55);
    }

    // ============================================================ 79-84 RAMPAGE: WOOF on every beat
    if (on(79, 84)) {
      for (let k = 0; k < 10; k++) {
        const t = 79 + k * 0.5;
        const big = k === 5;
        bark(t, big ? 1.0 : 0.85, { big, pan: k % 2 ? 0.25 : -0.25, f: 470 + (k % 3) * 40 });
        E.duck(t, 0.6);
      }
      impact(79, 0.85);
      impact(81.5, 0.9);
      battleDrums(79, 83.75, 0.7, { snare: [2, 6, 10, 14] });
      for (let k = 0; k < 9; k++) {
        const t = 79.25 + k * 0.5;
        const ch = t < 80 ? ['E3', 'B3', 'E4'] : t < 81 ? ['F3', 'C4', 'F4'] : t < 82 ? ['E3', 'B3', 'E4'] : t < 83 ? ['G3', 'D4', 'G4'] : ['F3', 'C4', 'F4'];
        brass(t, ch, 0.15, 0.3);
      }
      for (let k = 0; k < 38; k++) {
        const t = 79 + k * 0.125;
        const r = t < 80 ? 'E2' : t < 81 ? 'F2' : t < 82 ? 'E2' : t < 83 ? 'G2' : 'F2';
        pluck(t, k % 4 === 2 ? hz(r) * 2 : r, 0.16, { dec: 0.12, bright: 7 });
        if (k % 8 === 0) sub(t, Math.min(t + 1, 83.75), r.replace('2', '1'), 0.45);
      }
    }

    // ============================================================ 84-89 GRANT CALMS: harp and pads (F major)
    if (on(84, 89)) {
      gliss(84, ['F3', 'A3', 'C4', 'F4', 'A4', 'C5', 'F5', 'A5', 'C6'], 0.07, 0.3);
      const chs = [[84, 86, 'F2', ['F3', 'A3', 'C4', 'E4'], ['F3', 'C4', 'F4', 'A4', 'C5', 'A4', 'F4', 'C4']], [86, 87, 'C2', ['E3', 'G3', 'C4', 'E4'], ['C3', 'G3', 'C4', 'E4']], [87, 88, 'Bb1', ['D3', 'F3', 'Bb3', 'D4'], ['Bb2', 'F3', 'Bb3', 'D4']], [88, 89, 'A1', ['C#3', 'E3', 'G3', 'A3'], ['A2', 'E3', 'G3', 'C#4']]];
      for (const [a, b, r, ns, arp] of chs) {
        pad(a, b, ns, 0.24, { att: 0.6, rel: 0.6, cut0: 1000, cut1: 1500, hall: 0.3 });
        sub(a, b, r, 0.3, { att: 0.3, rel: 0.3 });
        const s0 = a === 84 ? 84.75 : a;
        for (let k = 0; s0 + k * 0.25 < b - 1e-6; k++) ks(s0 + k * 0.25, arp[k % arp.length], 0.32, harp);
      }
      for (const t of [84.7, 85.3, 86.1, 87.4]) plip(t, 500 + R('bub', t) * 400, 1100, 0.07);
      whine(87.6, 0.7, 650, 900, 600, 0.08);
    }

    // ============================================================ 89-95 I MISS HAYK: sad epic strings + howl (D minor)
    if (on(89, 95)) {
      for (const [a, b, r, ns] of [[89, 91, 'D2', ['D3', 'A3', 'D4', 'F4']], [91, 92, 'Bb1', ['Bb2', 'F3', 'Bb3', 'D4']], [92, 93, 'G1', ['G2', 'D3', 'G3', 'Bb3']], [93, 94, 'F1', ['F2', 'C3', 'F3', 'A3']], [94, 95, 'D2', ['D3', 'A3', 'D4', 'F4']]]) {
        pad(a, b, ns, 0.2, { att: 0.25, rel: 0.4, cut0: 1200, cut1: 2600, detune: 12, hall: 0.4 });
        sub(a, b, r, 0.35, { att: 0.1, rel: 0.3 });
      }
      // the theme on strings, slowed to quarters, the celli an octave down
      const ph = [[89, 'D4'], [89.5, 'F4'], [90, 'A4'], [91, 'G4'], [91.5, 'F4'], [92, 'G4'], [93, 'A4'], [93.75, 'C5'], [94, 'D5']];
      bowed(ph, 94.85, 0.28, { att: 0.08 });
      bowed(ph.map(([t, n]) => [t, hz(n) / 2]), 94.85, 0.18, { att: 0.08 });
      taiko(89, 0.8, 50, { hall: 0.4 });
      ks(89, 'D4', 0.35, harp);
      howl(89, 0.9, [[0, 380], [0.5, 620, 'exp'], [0.9, 560, 'exp']], 0.4);
      // 90 the big howl, with a bark attack
      bark(90, 0.5, { big: true, f: 520 });
      howl(90, 3.0, [[0, 360], [0.6, 880, 'exp'], [1.8, 860, 'exp'], [2.4, 600, 'exp'], [3, 340, 'exp']], 0.72, { cave: 0.3 });
      impact(90, 0.85, { dec: 2.5 });
      taiko(91, 0.45, 55, { hall: 0.3 });
      taiko(92, 0.5, 55, { hall: 0.3 });
      // 93 zoom-out whoosh, the howl echoes away
      whoosh(93, 1.6, 0.5, { f0: 3000, fp: 1800, f1: 250, pan: [0.3, -0.3], hall: 0.4 });
      crash(93, 0.25, { dec: 2 });
      howl(93.35, 1.2, [[0, 700], [0.6, 820, 'exp'], [1.2, 500, 'exp']], 0.14, { cave: 0.5, hall: 0.4 });
      howl(94.2, 0.7, [[0, 650], [0.35, 760, 'exp'], [0.7, 480, 'exp']], 0.06, { cave: 0.6, hall: 0.5 });
    }

    // ============================================================ 95-100 VIDEO CALL
    if (on(95, 100)) {
      for (const r of [95, 95.5])
        [['E6', 0], ['G#6', 0.083], ['B6', 0.166], ['E7', 0.25]].forEach(([n, d]) => {
          fmBell(r + d, hz(n), 0.25, { ratio: 2, index: 1.2, dec: 0.3 });
          marimba(r + d, hz(n) / 2, 0.15);
        });
      // "HAYK... COME BACK...": Goofy's sad music box
      [[96, 'A5'], [96.5, 'C6'], [97, 'E6']].forEach(([t, n]) => {
        glock(t, hz(n), 0.14, { dec: 1.6 });
        piano(t, hz(n) / 2, 0.16);
      });
      piano(96, 'A2', 0.2);
      pad(96, 97.4, ['A3', 'C4', 'E4'], 0.08, { sine: true, att: 0.4, rel: 0.1 });
      // 97.5 shock sting
      impact(97.5, 0.9);
      brass(97.5, ['A3', 'C4', 'Eb4', 'F#4'], 0.5, 0.55);
      glass(97.5, hz('C7'), 0.15);
      bowed([[97.6, 'Eb5']], 99.7, 0.07, { att: 0.3, rel: 0.1, vib: 0.02 });
      bowed([[97.6, 'D5']], 99.7, 0.06, { att: 0.3, rel: 0.1, vib: 0.02 });
      // 98.5 the burger starts to fall: slide whistle
      whistle(98.5, 1.2, 1500, 350, 0.18);
    }

    // ============================================================ 100-104 BURGER DROP: slow-motion heartbeat
    if (on(100, 104)) {
      const hb = (t, v) => {
        kick(t, v, 'heart');
        tock(t, v * 0.3, 420, { bus: 'drums', dec: 0.05 });
        kick(t + 0.26, v * 0.7, 'heart');
        E.duck(t, 0.5);
      };
      hb(100, 0.95);
      hb(101, 0.85);
      pad(100, 102, ['A2', 'E3', 'A3'], 0.14, { att: 0.8, rel: 0.2, cut0: 600, cut1: 900, hall: 0.4 });
      sub(100, 101.95, 'A1', 0.3, { att: 0.4 });
      glass(100, hz('A6'), 0.08, { dec: 3 });
      revSwell(101, 0.97, 0.35, { fTop: 1500 });
      // 102 burger impact
      impact(102, 1.1);
      piano(102, 'A1', 0.5);
      piano(102, 'E2', 0.4);
      nz(102, 0.25, { type: 'lowpass', f: [[0, 2500], [0.25, 400, 'exp']], amp: perc(0.6, 0.001, 0.12), key: 'splat' });
      // resolve: I'M COMING HOME, GOOFY!
      for (const [a, b, r, ns] of [[102.5, 103, 'F1', ['F3', 'A3', 'C4']], [103, 103.95, 'G1', ['G3', 'B3', 'D4']]]) {
        pad(a, b, ns, 0.2, { att: 0.15, rel: 0.05, cut0: 1200, cut1: 2800 });
        sub(a, b, r, 0.4);
      }
      bowed([[102.5, 'C5'], [103, 'D5'], [103.5, 'E5']], 103.95, 0.2, { att: 0.2, rel: 0.05 });
      for (const t of [102.5, 103, 103.5]) taiko(t, 0.5, 60);
      roll(103, 104, 0.1, 0.5);
      revSwell(103, 0.965, 0.5);
    }

    // ============================================================ 104-108 FLY HOME: heroic brass (C major)
    if (on(104, 108)) {
      impact(104, 1.0);
      const ph = motif(104, 'C5', 'maj', 0.25).map(([t, f]) => [t, f]);
      horn(ph, 107.9, 0.36, { hall: 0.3 });
      horn(ph.map(([t, f]) => [t, f / 2]), 107.9, 0.3, { hall: 0.25 });
      bowed(ph.map(([t, f]) => [t, f, 0.04]), 107.9, 0.12, { att: 0.05 });
      for (const [t, root, ns] of [[104, 'C2', ['C3', 'G3', 'C4', 'E4']], [105, 'F2', ['F3', 'A3', 'C4', 'F4']], [106, 'G2', ['G3', 'B3', 'D4', 'G4']], [107, 'C2', ['C3', 'G3', 'C4', 'E4']]]) {
        pad(t, t + (t === 107 ? 0.9 : 1), ns, 0.2, { att: 0.05, rel: 0.2, cut0: 1800, cut1: 2600 });
        sub(t, t + (t === 107 ? 0.9 : 1), root, 0.5);
        for (let k = 0; k < 8; k++) pluck(t + k * 0.125, k % 4 === 2 ? hz(root) * 2 : root, 0.24, { dec: 0.13, bright: 7 });
      }
      for (const [t, ns] of [[104.75, ['E4', 'G4', 'C5']], [105.75, ['F4', 'A4', 'C5']]]) brass(t, ns, 0.15, 0.35);
      battleDrums(104, 107.5, 0.9);
      crash(107, 0.4);
      // 106.5 the plane lands: SKRRT and a dust thud
      skrrt(106.5, 0.75, 0.9);
      taiko(106.5, 0.8, 55);
      nz(106.5, 0.8, { type: 'lowpass', q: 0.6, f: [[0, 1800], [0.8, 300, 'exp']], amp: [[0, 0], [0.01, 0.3], [0.8, FLOOR, 'exp']], stereo: true, key: 'dust' });
    }

    // ============================================================ 108-114 REUNION (D major)
    if (on(108, 114)) {
      gliss(108, ['D3', 'F#3', 'A3', 'D4', 'F#4', 'A4', 'D5', 'F#5', 'A5', 'D6'], 0.06, 0.3);
      glock(108, hz('F#6'), 0.15);
      const chs = [[108, 109, 'B1', ['B2', 'F#3', 'A3', 'D4']], [109, 109.5, 'G1', ['G2', 'D3', 'F#3', 'B3']], [109.5, 110, 'A1', ['A2', 'E3', 'G3', 'C#4']], [110, 111, 'D2', ['D3', 'A3', 'D4', 'F#4']], [111, 112, 'G1', ['G2', 'D3', 'G3', 'B3']], [112, 113, 'A1', ['A2', 'E3', 'A3', 'C#4']], [113, 114, 'D2', ['D3', 'A3', 'D4', 'F#4']]];
      for (const [a, b, r, ns] of chs) {
        pad(a, b, ns, 0.2, { att: a < 110 ? 0.3 : 0.05, rel: 0.3, cut0: 1500, cut1: 2600, detune: 11, hall: 0.35 });
        sub(a, b, r, 0.4, { att: 0.05 });
        if (a >= 110) choir(a, b, ns.slice(1), 0.24, { att: 0.2, rel: 0.4 });
      }
      // lead-in, then the theme broad on strings with bells
      const m = motif(110, 'D5', 'maj', 0.25);
      const ph = [[108, 'F#5'], [109, 'G5'], [109.5, 'E5'], [109.75, 'C#5'], ...m.map(([t, f]) => [t, f])];
      bowed(ph, 113.9, 0.3, { att: 0.2 });
      bowed(ph.map(([t, f]) => [t, hz(f) / 2]), 113.9, 0.2, { att: 0.2 });
      m.forEach(([t, f]) => glock(t, f * 2, 0.14, { dec: 1.4 }));
      // 110 the hug
      impact(110, 1.0, { dec: 2.5 });
      [['D6', 0], ['F#6', 0.03], ['A6', 0.06]].forEach(([n, d]) => fmBell(110 + d, hz(n), 0.22, { ratio: 3.5, index: 1.8, dec: 2 }));
      sparkle(110.02, 0.8);
      for (let i = 0; i < 4; i++) plip(110.15 + i * 0.12, 900 + i * 150, 1500 + i * 150, 0.12);
      for (let t = 110.5; t < 114; t += 0.5) kick(t, Math.round(t * 2) % 2 ? 0.3 : 0.5, 'felt');
      for (const t of [111, 112, 113]) crash(t, 0.12, { dec: 1.5 });
      roll(113.5, 114, 0.15, 0.45);
    }

    // ============================================================ 114-120 THE END: happy ending (D major)
    if (on(114, 120)) {
      crash(114, 0.5);
      for (const [t, root, ns, g] of [[114, 'D2', ['D4', 'F#4', 'A4'], CH.gD], [115, 'G2', ['G3', 'B3', 'D4'], CH.gGmaj], [116, 'A2', ['A3', 'C#4', 'E4'], CH.gA], [117, 'D2', ['D4', 'F#4', 'A4'], CH.gD]]) {
        const b = t === 117 ? 117.5 : t + 1;
        pad(t, b, ns, 0.18, { att: 0.03, rel: 0.1, cut0: 1800, cut1: 2600 });
        for (let k = 0; t + k * 0.25 < b - 1e-6; k++) bass(t + k * 0.25, k % 2 ? hz(root) * 2 : root, 0.2, 0.45);
        for (let k = 0; t + k * 0.25 < b - 1e-6; k++) strum(t + k * 0.25, k % 2 ? g.slice(-3) : g, k % 2 ? 0.14 : 0.26, { up: k % 2 === 1, len: 0.6 });
      }
      for (let t = 114; t < 117.5 - 1e-6; t += 0.5) {
        const back = Math.round((t - 114) / 0.5) % 2 === 1;
        kick(t, 0.8, 'full');
        E.duck(t, 0.4);
        if (back) {
          snare(t, 0.5);
          clap(t, 0.3);
        }
        hat(t + 0.25, 0.07);
        hat(t, 0.05);
      }
      // the theme, triumphant, on horns, lead and glock
      const m = motif(114, 'D5', 'maj', 0.25);
      const ph = m.map(([t, f]) => [t, f]);
      horn(ph, 117.45, 0.32, { hall: 0.25 });
      lead(m.map(([t, f]) => [t, f, 0.02]), 117.45, 0.1, { delay: 0.1 });
      m.forEach(([t, f]) => glock(t, f * 2, 0.1));
      // the stats card ticks, one line a beat
      for (const t of [115, 115.5, 116, 116.5]) {
        glock(t, hz('A6'), 0.16, { dec: 0.6 });
        tock(t, 0.14, 2200);
      }
      // 117.5 THE END?
      impact(117.5, 1.0, { dec: 2 });
      brass(117.5, ['D4', 'F#4', 'A4', 'B4', 'D5'], 0.9, 0.55, { rel: 0.5 });
      strum(117.5, CH.gD, 0.5, { spread: 0.01, len: 2, t60: 2 });
      fmBell(117.5, hz('D6'), 0.25, { ratio: 3.5, index: 1.8, dec: 1.8 });
      glock(117.5, hz('D7'), 0.2);
      sub(117.5, 118.9, 'D1', 0.5, { att: 0.01, rel: 0.6 });
      pad(117.5, 118.7, ['D3', 'A3', 'D4', 'F#4', 'B4'], 0.16, { att: 0.02, rel: 0.8, cut0: 2500, cut1: 900, hall: 0.3 });
      // "?": a questioning boop and one small happy woof
      plip(118.1, 520, 900, 0.3);
      bark(118.6, 0.22, { f: 720, pan: 0.2 });
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
