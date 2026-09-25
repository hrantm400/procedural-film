(function () {
  'use strict';
  FILM.scene({
    id: 'investor-call',
    draw(ctx, t, info) {
      const F = FILM.fx;
      F.sky(ctx, '#ccc', '#eee');
      FILM.cast.hayk(ctx, { x: 300, y: 900, s: 1.3, pose: 'thumbsUp', t, face: 'chewing', belly: 1 });
      FILM.cast.hayk(ctx, { x: 800, y: 900, s: 1.3, pose: 'give', t, face: 'happy', chewing: true, belly: 0.8, hold: 'burger' });
      FILM.cast.hayk(ctx, { x: 300, y: 1800, s: 1.3, pose: 'point', t, face: 'smug', belly: 0.8, shades: true });
      FILM.cast.hayk(ctx, { x: 800, y: 1800, s: 1.3, pose: 'stand', t, face: 'happy', chewing: true, belly: 0.4, hold: 'burger', holdL: 'drink' });
    },
  });
})();
