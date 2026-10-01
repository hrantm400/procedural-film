// FILM.TIMELINE: "Time vs биржа", a 15 s playful motion-graphics ad for LiquidityScan.
// 60 fps, 144 bpm: a beat is 25 frames (0.4167 s), a bar is 100 frames (1.6667 s), 9 bars = 15 s.
// Story: the trader's TIME (a clock logo) and the EXCHANGE "биржа" (a candle-chart logo) fight for the
// top spot through phone and trading UI. The exchange keeps eating the trader's time. LiquidityScan
// arrives, finds the entry in a second, gives the time back and takes #1. End: liquidityscan.io.
// Visual rules: docs/art-bible.md. Logos: src/cast.js. Kit: src/props.js.
(function () {
  'use strict';
  const FILM = window.FILM;
  const BAR = 5 / 3;
  const B = (n) => n * BAR; // bar n starts at B(n) seconds
  const S = (id, file, b0, b1, title, brief, extra) =>
    Object.assign({ id, file, start: B(b0), end: B(b1), mode: 'illustrated', post: false, title, transitionIn: { kind: 'cut', dur: 0 }, brief }, extra || {});

  FILM.TIMELINE = {
    title: 'Time vs биржа',
    bpm: 144,
    duration: 15,
    fps: 60,
    width: 1080,
    height: 1920,
    shots: [
      S('vs-intro', '01-vs-intro.js', 0, 1, 'VS screen',
        'Fighting-game VS screen. Background split on a diagonal: left half blue (Time side), right half orange (биржа side), with moving diagonal stripes and floaties. Frame 0 already shows both halves and both logos sliding in. Time logo (FILM.cast.time, s 1.3, face determined, gloves up in guard) slides in from the left to (300, 860); биржа (FILM.cast.birzha, s 1.3, face smug, gloves up) slides in from the right to (780, 1060); both land with squash on the beat t=0.4167. Name wordmarks under them: "Time" and "биржа" (FILM.cast.wordmark, size ~90). A big "VS" slams in at the centre at t=0.4167 (beat 2) with a white flash and a shake. Fighting-game health bars across the top (y ~300): left "TIME" full blue, right "БИРЖА" full orange (FILM.fx.healthBar). At t=0.8333 (beat 3) a caption "FIGHT FOR THE TOP SPOT" pops in (kinetic letters, FILM.fx.popLetters, size ~64) at y ~1380. At t=1.25 (beat 4) "FIGHT!" pops huge (size ~170) with confetti and shake. EXIT (last 0.2 s): both logos squash down then leap UP out of the top of frame (they arrive from the top in the next shot).'),
      S('home-screen', '02-home-screen.js', 1, 2, 'Round 1: the home screen',
        'A big phone (FILM.fx.phone, ~900x1500, centred) on a light lilac background with floaties. Its home screen: a 4x5 grid of generic app icons (flat colours, simple glyphs, NO real brand logos) in jiggle/edit mode (each icon wobbles slightly). The top-left slot is EMPTY and glows ("#1" pill above it). Corner label top-left of frame: "ROUND 1" pill. ENTRY: at t=0 Time and биржа (as small logos, s ~0.62) drop in from the top of the screen and land on beat 1 (t=0.4167) next to the empty slot, squashing. Then both shove each other for the top-left slot: on beat 2 (t=0.8333) биржа body-checks Time aside and pops into the slot with a red "99+" badge; on beat 3 (t=1.25) Time punches back with a glove and takes the slot, биржа spins. EXIT (last beat): биржа kicks Time out of the slot so Time flies off to the RIGHT edge spinning (motion trail, puffs), exits frame right at about y 900 by the end of the shot.'),
      S('time-eater', '03-time-eater.js', 2, 3, 'Round 2: the chart eats your time',
        'Dark trading screen (navy, FILM.fx.chartGrid) with a candlestick chart growing (FILM.fx.candles). ENTRY: Time enters from the LEFT edge at y ~900 spinning (continuing its flight from the previous shot) and crashes onto the chart, s ~1.1, face dizzy then shocked. биржа (s ~1.2, greedy $ eyes, face laugh) rises from the bottom of the chart on a green candle and CHOMPS Time with its candle jaw (jaw opens and snaps shut) on beats 1, 2 and 3 (t=0.4167, 0.8333, 1.25): each chomp removes a chunk of Time\'s blue rim (ring 1 -> 0.75 -> 0.5 -> 0.3), with crumbs, a "CHOMP!" impact star and shake. A counter card at the top (y ~330) reads "TIME WASTED" and a timer that spins up fast: 0h 12m -> 2h 40m -> 4h 37m -> 6h 05m on the beats. Corner label "ROUND 2". EXIT: on the last beat everything whip-pans to the left (horizontal speed lines, motion smear) into the next shot.'),
      S('tab-war', '04-tab-war.js', 3, 4, 'Round 3: tab overload',
        'ENTRY: the frame starts mid whip-pan from the right (horizontal speed lines resolving in the first 0.2 s). A browser window card fills the frame (light UI). Its tab bar: биржа keeps spawning tabs on every 8th note: "BTC/USDT", "ETH/USDT", "SOL/USDT", "1H", "4H", "15m", "news", "+27" until the tabs squeeze to slivers (FILM.fx.tab). A search bar reads "searching for an entry..." typed out (FILM.fx.typeOn) with a spinner. Time (s ~0.9) is squeezed between the tabs (sx/sy squash), sweating, its hands spinning frantically (spin = t*25) as the loading spinner; биржа (s ~0.8) stands on the tab bar laughing, throwing tabs like cards. Corner label "ROUND 3". EXIT (last 0.25 s): a fast zoom into Time\'s face so the last frame shows Time centred at (540, 960) with R = 300 (s = 2.5), face dizzy, hands spinning.'),
      S('notif-storm', '05-notif-storm.js', 4, 5, 'Round 4: notification storm',
        'ENTRY match cut: first frame shows Time centred at (540, 960) at s = 2.5, face dizzy, then the camera zooms out (s 2.5 -> 0.8 over 0.35 s, outCubic) revealing a phone lock screen (big clock "03:47" at the top of the screen, purple-night gradient wallpaper). Time stands at the bottom of the screen. биржа spams notifications that stack down from the top, one per 8th note (FILM.fx.notif with биржа as the icon): "BTC -5% in 10 min", "Liquidation alert!", "New listing: PEPE2", "Funding rate spiked", "Whale moved 900 BTC". Time\'s own notifications ("Gym at 7", "Dinner with family", "Sleep") get shoved off the bottom. On beat 3 (t=1.25) Time (face angry) uppercuts the stack: notifications fly apart and spin away, "BAM!" impact star, shake. Corner label "ROUND 4". EXIT: white flash on the cut (the next shot has a flash transition).'),
      S('top-brawl', '06-top-brawl.js', 5, 7, 'Final round: the #1 spot',
        'The climax, 2 bars. A bright ranking podium (FILM.fx.podium) on a yellow sunburst background with a crown floating above the #1 step. "FINAL ROUND" label. Bar 1 (0-1.667): Time and биржа (s ~0.85) tug-of-war on the crown on the #1 step, the crown flips between them on each beat, each holder flashes its health bar. At t=1.25 they collide into a classic cartoon DUST CLOUD brawl (FILM.fx.dustCloud) with gloves, clock hands, candles, "%" signs and stars popping out, "POW!" / "BAM!" / "WHAM!" impact stars on beats. Mini health bars at the top drop for both. Time\'s rim (ring) is almost empty (0.15) and blinks red. Bar 2 last beat (t=2.917-3.333): a bright green horizontal scan beam (LiquidityScan green #1fe33c, glow) sweeps DOWN across the frame from the top; where it passes, the cloud freezes and desaturates. The shot ends with the beam at the bottom.', { transitionIn: { kind: 'flash', dur: 0.2, color: '#ffffff' } }),
      S('ls-scan', '07-ls-scan.js', 7, 8, 'LiquidityScan finds the entry',
        'The solution, in the real LiquidityScan app style: light background #eef3f7, a big dark teal gradient card (#13303e -> #21535f, radius 60) with a radar (concentric green rings and a sweeping arm, like the app\'s scan icon) and the label "LIVE ENGINE NETWORK" in spaced uppercase. The LiquidityScan app mark (FILM.cast.lsMark, s ~1.2) drops in from the top on beat 0 with a springy bounce and green glow, its candles pump. On beat 1 (t=0.4167) a chart card shows a target reticle locking onto a candle: green pill "ENTRY FOUND" and "0.3s" (mono font), a green "LONG" pill. On beat 2 (t=0.8333): Time (s ~0.8) and биржа (s ~0.8), now calm, stand below: Time\'s rim refills from 0.15 to 1 with a sparkle burst and the counter "+6h back" in green; Time face happy; биржа face calm with tidy candles. On beat 3 (t=1.25) the LiquidityScan mark hops onto a "#1" pill with the crown landing on it, confetti. App-style bottom nav bar (white pill, green active "Scan" tab) slides up at the bottom (keep it above y 1540 or decorative only).'),
      S('end-card', '08-end-card.js', 8, 9, 'liquidityscan.io',
        'End card in the LiquidityScan website style: light grid background (#eef3f7 with faint grid lines), soft green glow. The app mark (FILM.cast.lsMark, s ~1.6) centred at y ~700 scales up from the previous shot with a settle bounce; next to/under it the wordmark "LiquidityScan" (FILM.cast.lsWordmark, size ~110) wipes in on beat 1. Tagline on beat 2: "Stop babysitting the charts." (bold, ink #13283a, size ~64, two lines if needed). On beat 3: a dark rounded button "START FREE ->" (ink bg, white spaced uppercase) and the URL "liquidityscan.io" big (size ~80) in green #1b7a3a with a little pop. Small Time and биржа logos (s ~0.45) peek in from the bottom corners and give a thumbs-up/wink on beat 3 (playful outro). Hold the final 0.4 s still.'),
    ],
    cues: [
      { t: 0, kind: 'hit', note: 'Downbeat: whoosh in, fighting-game drum hit' },
      { t: B(0) + 0.4167, kind: 'hit', note: 'VS slam' },
      { t: B(0) + 1.25, kind: 'hit', note: 'FIGHT! gong / crowd cheer synth' },
      { t: B(1), kind: 'cut', note: 'Main groove starts: bouncy bass, claps' },
      { t: B(1) + 0.4167, kind: 'sfx', note: 'Landing boing' },
      { t: B(1) + 0.8333, kind: 'hit', note: 'Shove thump' },
      { t: B(1) + 1.25, kind: 'hit', note: 'Punch' },
      { t: B(2), kind: 'sfx', note: 'Crash into chart, slide whistle out' },
      { t: B(2) + 0.4167, kind: 'hit', note: 'CHOMP 1' },
      { t: B(2) + 0.8333, kind: 'hit', note: 'CHOMP 2' },
      { t: B(2) + 1.25, kind: 'hit', note: 'CHOMP 3' },
      { t: B(3), kind: 'sfx', note: 'Whip-pan swish' },
      { t: B(4), kind: 'cut', note: 'Notification pings on 8ths' },
      { t: B(4) + 1.25, kind: 'hit', note: 'Uppercut BAM' },
      { t: B(5), kind: 'hit', note: 'Final round: big drums, brass stab' },
      { t: B(5) + 1.25, kind: 'hit', note: 'Dust cloud brawl starts' },
      { t: B(7) - 0.4167, kind: 'sfx', note: 'Scan beam sweep (rising shimmer); music cuts' },
      { t: B(7), kind: 'hit', note: 'LiquidityScan arrives: bright chord, sparkle' },
      { t: B(7) + 0.4167, kind: 'sfx', note: 'Lock-on beep: ENTRY FOUND' },
      { t: B(7) + 0.8333, kind: 'sfx', note: 'Time refill: rising chime' },
      { t: B(7) + 1.25, kind: 'hit', note: 'Crown lands: confetti pop' },
      { t: B(8), kind: 'cut', note: 'End card: logo sting' },
      { t: B(8) + 1.25, kind: 'hit', note: 'URL pop, final chord ringing out' },
    ],
  };
})();
