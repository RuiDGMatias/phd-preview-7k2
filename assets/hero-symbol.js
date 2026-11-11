// Cover symbol in white line, slowly turning in 3D. Two variants, chosen by data-symbol on the canvas:
//   "cycle": trajectories from different starting points settle onto one closed orbit (a cyclic steady state).
//   "landscape": a profit surface drawn as a mesh, with paths climbing towards its optimum.
(() => {
  const cv = document.getElementById('hero-flow'); if (!cv) return;
  const MODE = cv.dataset.symbol || 'cycle';
  let ctx, W, H, cx, cy, S;
  const INK = () => document.documentElement.dataset.theme === 'light' ? '17,17,17' : '255,255,255';
  function fit() {
    const d = Math.min(devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
    W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx = cv.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0);
    cx = W * (innerWidth > 760 ? .56 : .5); cy = H * .5; S = Math.min(W, H) * (MODE === 'cycle' ? .34 : .36); if (MODE !== 'cycle') cy = H * .45;
  }
  // camera: turn about the vertical axis, fixed tilt. Returns screen x, y and depth (-1 far .. 1 near)
  let yaw = 0; const TILT = .5;
  function P([x, y, z]) {
    const c = Math.cos(yaw), s = Math.sin(yaw), x1 = x * c - y * s, y1 = x * s + y * c;
    const ct = Math.cos(TILT), st = Math.sin(TILT), yd = y1 * ct - z * st, zd = y1 * st + z * ct;
    const f = 1 / (1 + yd * .18);
    return [cx + x1 * S * f, cy - zd * S * f, -yd];
  }
  const alphaAt = d => (.32 + .68 * Math.max(0, Math.min(1, (d + 1.3) / 2.6)));
  function polyline(pts, w, a0 = 1) {
    for (let i = 1; i < pts.length; i++) {
      const p = P(pts[i - 1]), q = P(pts[i]);
      ctx.strokeStyle = `rgba(${INK()},${(a0 * alphaAt((p[2] + q[2]) / 2)).toFixed(3)})`; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    }
  }
  const dot = (pt, r) => { const p = P(pt); ctx.fillStyle = `rgb(${INK()})`; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.fill(); };

  // ---------- 1. Limit cycle (Hopf normal form with a twisted orbit)
  const zOrbit = th => .38 * Math.sin(2 * th);
  function traj(r0, th0, z0, t) { // analytic solution: r -> 1, z -> orbit
    const r = 1 / Math.sqrt(1 + (1 / (r0 * r0) - 1) * Math.exp(-2 * t)), th = th0 + 1.6 * t;
    return [r * Math.cos(th), r * Math.sin(th), zOrbit(th) + (z0 - zOrbit(th0)) * Math.exp(-1.2 * t)];
  }
  const STARTS = [[.08, 0, .8], [1.35, 1.2, -.6], [.3, 2.4, -.6], [1.3, 3.6, .55], [.15, 4.6, .2], [1.3, 5.5, .7]];
  const ORBIT = Array.from({ length: 241 }, (_, i) => { const th = i / 240 * Math.PI * 2; return [Math.cos(th), Math.sin(th), zOrbit(th)]; });
  function drawCycle(clock) {
    // the orbit: a narrow band, two edges and rungs, so it reads as a surface in space
    const band = d => ORBIT.map(([x, y, z]) => [x * (1 + d), y * (1 + d), z]);
    polyline(band(.035), 1.4); polyline(band(-.035), 1.4);
    for (let i = 0; i < 240; i += 4) { const [x, y, z] = ORBIT[i]; polyline([[x * 1.035, y * 1.035, z], [x * .965, y * .965, z]], .8, .8); }
    const T = 11;
    STARTS.forEach(([r0, th0, z0], j) => {
      const tau = ((clock + j * T / STARTS.length) % T), tmax = Math.min(tau, 8) * .9, fade = tau > 9.5 ? 1 - (tau - 9.5) / 1.5 : 1;
      const pts = []; for (let t = 0; t <= tmax; t += .03) pts.push(traj(r0, th0, z0, t));
      if (pts.length > 1) { polyline(pts, 1, .75 * fade); dot(pts[pts.length - 1], 2.6 * fade + .01); }
      dot([r0 * Math.cos(th0), r0 * Math.sin(th0), z0], 1.6 * fade + .01);
    });
  }

  // ---------- 2. Optimisation landscape
  const f = (x, y) => .85 * Math.exp(-((x - .35) ** 2 + (y + .25) ** 2) * 3.4) + .45 * Math.exp(-((x + .5) ** 2 + (y - .45) ** 2) * 5) - .12 * (x * x + y * y) - .25;
  const grad = (x, y, h = 1e-3) => [(f(x + h, y) - f(x - h, y)) / (2 * h), (f(x, y + h) - f(x, y - h)) / (2 * h)];
  const N = 30, GRID = [];
  for (let d = 0; d < 2; d++) for (let i = 0; i <= N; i++) { const line = []; for (let j = 0; j <= N; j++) { const a = -1 + 2 * i / N, b = -1 + 2 * j / N, [x, y] = d ? [a, b] : [b, a]; line.push([x, y, f(x, y)]); } GRID.push(line); }
  const PATHS = [[-.9, -.85], [.9, -.9], [-.2, .95], [.95, .6]].map(([x, y], k) => {
    const pts = [[x, y, f(x, y)]];
    for (let i = 0; i < 260; i++) { const [gx, gy] = grad(x, y), n = .022 * Math.exp(-i / 70), w = Math.sin(i * .7 + k * 2);
      x += .05 * gx + n * w; y += .05 * gy + n * Math.cos(i * .5 + k); pts.push([x, y, f(x, y) + .005]); }
    return pts;
  });
  function drawLandscape(clock) {
    GRID.forEach(l => polyline(l, .7, .55));
    const T = 10;
    PATHS.forEach((path, j) => {
      const tau = (clock + j * T / PATHS.length) % T, n = Math.floor(Math.min(1, tau / 7) * (path.length - 1)), fade = tau > 8.5 ? 1 - (tau - 8.5) / 1.5 : 1;
      const pts = path.slice(0, n + 1);
      if (pts.length > 1) { polyline(pts, 1.6, fade); dot(pts[pts.length - 1], 3 * fade + .01); }
    });
    // the optimum
    const o = [.35, -.25, f(.35, -.25)]; polyline([o, [o[0], o[1], o[2] + .32]], 1.1); dot([o[0], o[1], o[2] + .32], 2.2);
  }

  const still = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = still.matches, clock = 6, last = performance.now(), seen = true;
  window.heroGL = { setPaused: p => paused = p };
  new IntersectionObserver(es => seen = es[0].isIntersecting).observe(cv);
  function draw() { ctx.clearRect(0, 0, W, H); yaw = clock * .06 + .5; ctx.lineCap = 'round'; (MODE === 'cycle' ? drawCycle : drawLandscape)(clock); }
  function frame(now) { const dt = (now - last) / 1000; last = now; if (!paused) clock += dt; if (seen) draw(); requestAnimationFrame(frame); }
  new ResizeObserver(() => { fit(); draw(); }).observe(cv);
  fit(); requestAnimationFrame(frame);
})();
