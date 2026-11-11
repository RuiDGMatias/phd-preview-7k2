// The works panel: list, an animated schematic for each work, and a short description.
// All schematics in white line on black, with flat tones; no colour, no glow.
(() => {
  // Links to fill in: paste the address between the quotes. While a link is empty, its button is not shown.
  const LINKS = {
    psaArticle: '',
    psaCode: '',
  };
  const WORKS = [
    { key: 'psa', title: 'Pressure Swing Adsorption simulator',
      text: 'A modular simulator for any (V)PSA cycle, with any adsorbent and any mixture of components, which extends easily to multi-column operation. The results viewer opens the simulation files in your browser, with nothing to install, and makes the results easy to inspect.',
      links: [['Open the results viewer', 'psa/viewer/index.html', 1], ['Read the article', LINKS.psaArticle], ['Read the code on GitHub', LINKS.psaCode]].filter(l => l[1]),
      later: LINKS.psaArticle ? '' : 'Article in preparation' },
    { key: 'smb', title: 'Gas-phase Simulated Moving Bed simulator',
      text: 'A modular simulator for any SMB cycle, with any adsorbent and any mixture of components. The results viewer opens the simulation files in your browser, with nothing to install, and makes the results easy to inspect.',
      links: [['Open the results viewer', 'smb/viewer/index.html', 1]], later: 'Article and code in preparation' },
    { key: 'eco', title: 'Operating at YOUR economic optimum',
      text: 'Set the prices of electricity, biomethane and CO₂, and see where the best way to run the plant moves.',
      links: [['Explore the prices', 'escape/', 1]], later: 'Article in preparation' },
    { key: 'rlp', title: 'Reinforcement learning for PSA operation: maximising productivity',
      text: 'An agent learns to run the PSA cycle so that it produces as much biomethane as possible at the required purity.',
      links: [], later: 'Article and interactive results in preparation' },
    { key: 'rle', title: 'Reinforcement learning for PSA operation: maximising profit',
      text: 'The same agent, now rewarded by profit: it learns to adapt the plant to changing energy prices.',
      links: [], later: 'Article and interactive results in preparation' },
  ];

  const list = document.getElementById('work-list'), detail = document.getElementById('detail'), cv = document.getElementById('screen');
  let current = 0;
  WORKS.forEach((w, i) => {
    const li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.innerHTML = `<span class="n">${i + 1}</span><span>${w.title}</span>${w.links.length ? '' : '<small>In preparation</small>'}`;
    b.addEventListener('click', () => select(i)); li.append(b); list.append(li);
  });
  function select(i) {
    current = i; const w = WORKS[i];
    [...list.children].forEach((li, j) => { li.classList.toggle('active', j === i); li.querySelector('button').setAttribute('aria-pressed', String(j === i)); });
    detail.innerHTML = `<h3>${w.title}</h3><p>${w.text}</p>` +
      (w.links.length ? `<div class="actions">${w.links.map(([l, h, solid]) => `<a class="pill ${solid ? 'solid' : 'line'}" href="${h}">${l}</a>`).join('')}</div>` : '') +
      (w.later ? `<p class="later">${w.later}</p>` : '');
    cv.setAttribute('aria-label', ARIA[w.key]); t0 = clock;
  }
  const ARIA = {
    psa: 'Four connected adsorption columns taking turns; each bed fills with a lighter tone as it takes up CO2.',
    smb: 'A ring of eight columns; two bands of solute travel round the ring while the inlets and outlets jump one column at a time.',
    eco: 'Three price sliders moving; on a surface of profit drawn as a mesh, the peak moves as the prices change.',
    rlp: 'An agent and two connected columns in a loop of state and action, while the feed composition changes; productivity rises over training episodes.',
    rle: 'The same loop, with the feed and ambient temperatures, prices, feed composition and feed flow all changing; profit rises over training episodes.',
  };

  // ---------- drawing helpers (virtual space 1000 x 620)
  const VW = 1000, VH = 620; let INK = '255,255,255', BG = '#000', L = 'rgba(255,255,255,.92)', F = 'rgba(255,255,255,.38)';
  function themeColours() { const light = document.documentElement.dataset.theme === 'light'; INK = light ? '17,17,17' : '255,255,255'; BG = light ? '#ffffff' : '#000'; L = `rgba(${INK},.92)`; F = `rgba(${INK},.38)`; }
  let ctx, W, H, D;
  // the part of the virtual space each schematic uses, so it fills the screen
  const BOUNDS = { psa: [130, 80, 870, 560], smb: [250, 70, 750, 550], eco: [50, 70, 960, 560], rlp: [30, 80, 960, 570], rle: [20, 80, 970, 570] };
  function fit() { D = Math.min(devicePixelRatio || 1, 2); const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * D; cv.height = H * D; ctx = cv.getContext('2d'); }
  function place(key) {
    const [x0, y0, x1, y1] = BOUNDS[key], k = Math.min(W / (x1 - x0), H / (y1 - y0)) * .86;
    const ox = (W - (x1 - x0) * k) / 2 - x0 * k, oy = (H - (y1 - y0) * k) / 2 - y0 * k;
    ctx.setTransform(D * k, 0, 0, D * k, D * ox, D * oy);
  }
  const tone = a => `rgba(${INK},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  const ln = (x1, y1, x2, y2, w = 1.2, s = L) => { ctx.strokeStyle = s; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  const poly = (pts, w = 1.4, s = L) => { ctx.strokeStyle = s; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); };
  const pipes = ls => { ctx.lineJoin = 'round'; [[7, L], [4.8, BG]].forEach(([w, s]) => ls.forEach(p => poly(p, w, s))); };
  const chev = (x, y, a) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = BG; ctx.fillRect(-8, -8, 16, 16); ctx.strokeStyle = L; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(3, 0); ctx.lineTo(-4, 5); ctx.stroke(); ctx.restore(); };
  const valve = (x, y, open, rot = 0) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = BG; ctx.fillRect(-9, -9, 18, 18);
    ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(8, 6); ctx.lineTo(8, -6); ctx.lineTo(-8, 6); ctx.closePath(); ctx.fillStyle = open ? L : BG; ctx.fill(); ctx.strokeStyle = L; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); };
  const dot = (x, y, r = 3) => { ctx.fillStyle = L; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
  const label = (s, x, y, a = 'left', size = 15) => { ctx.fillStyle = L; ctx.font = `400 ${size}px Sora, system-ui, sans-serif`; ctx.textAlign = a; ctx.fillText(s, x, y); };
  const along = (pts, u) => { const seg = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; }
    let d = u * tot; for (let i = 0; i < seg.length; i++) { if (d <= seg[i]) { const f = d / seg[i]; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; } d -= seg[i]; } return pts[pts.length - 1]; };
  const flow = (pts, t, n, speed = .25) => { for (let i = 0; i < n; i++) { const [x, y] = along(pts, ((i / n) + t * speed) % 1); dot(x, y, 2.2); } };
  const ease = s => s * s * (3 - 2 * s), lerp = (a, b, s) => a + (b - a) * s;
  const box = (x, y, w, h) => { ctx.strokeStyle = F; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h); };

  // ---------- 1. PSA: four connected columns
  function psa(t) {
    const XS = [320, 440, 560, 680], CW = 64, TOP = 175, BOT = 445, HT = 105, HB = 515;
    const inlet = [[150, HB], [XS[0], HB]], outlet = [[XS[3], HT], [850, HT]];
    const P = [[[150, HB], [XS[3], HB]], [[XS[0], HT], [850, HT]]]; XS.forEach(x => { P.push([[x, HT], [x, TOP - 32]]); P.push([[x, HB], [x, BOT + 32]]); });
    pipes(P); chev(195, HB, 0); chev(810, HT, 0);
    flow(inlet, t, 4, .35); flow([[XS[3], HT], [850, HT]], t, 3, .35);
    XS.forEach((x, i) => {
      const ph = ((t / 12 - i / 4) % 1 + 1) % 1, s = ease(ph * 4 % 1), st = Math.floor(ph * 4);
      const [zf, load] = [[lerp(.08, .25, s), lerp(.2, 1, s)], [lerp(.25, .85, s), 1], [lerp(.85, .75, s), lerp(1, .55, s)], [lerp(.75, .08, s), lerp(.55, .2, s)]][st];
      const l = x - CW / 2, top = TOP - 32, h = BOT - TOP + 64;
      ctx.save(); ctx.beginPath(); ctx.roundRect(l, top, CW, h, CW / 2); ctx.fillStyle = BG; ctx.fill(); ctx.clip();
      const yf = top + h - zf * h; ctx.fillStyle = tone(.12 + .7 * load); ctx.fillRect(l, yf, CW, top + h - yf); ctx.restore();
      ctx.strokeStyle = L; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.roundRect(l, top, CW, h, CW / 2); ctx.stroke();
      // valves: pressurisation opens the top, adsorption and purge both ends, blowdown the bottom
      valve(x, HT + 36, st !== 2, Math.PI / 2); valve(x, HB - 36, st !== 0, Math.PI / 2);
    });
  }

  // ---------- 2. Gas-phase SMB: ring of eight columns, ports jump one column per switch
  function smb(t) {
    const cx = 500, cy = 310, R = 170, N = 8, TW = 46, Tsw = 3, gap = .07;
    const sw = t / Tsw, p = Math.floor(sw), rot = sw / N * Math.PI * 2 - Math.PI / 2;
    for (let c = 0; c < N; c++) {
      const a0 = c / N * Math.PI * 2 - Math.PI / 2 + gap, a1 = (c + 1) / N * Math.PI * 2 - Math.PI / 2 - gap;
      for (let j = 0; j < 12; j++) { // tone: the faster solute; hatching: the slower one
        const a = a0 + (a1 - a0) * (j + .5) / 12, rel = (((a - rot) / (Math.PI * 2)) % 1 + 1) % 1;
        const cA = Math.exp(-((rel - .32) ** 2) / .005), cB = Math.exp(-((rel - .66) ** 2) / .007);
        ctx.strokeStyle = tone(.06 + .75 * cA); ctx.lineWidth = TW; ctx.beginPath(); ctx.arc(cx, cy, R, a0 + (a1 - a0) * j / 12, a0 + (a1 - a0) * (j + 1) / 12 + .002); ctx.stroke();
        if (cB > .15) for (let h = 0; h < Math.round(cB * 3); h++) { const aa = a + (h - 1) * .012; ln(cx + Math.cos(aa) * (R - TW / 2 + 3), cy + Math.sin(aa) * (R - TW / 2 + 3), cx + Math.cos(aa) * (R + TW / 2 - 3), cy + Math.sin(aa) * (R + TW / 2 - 3), .8); }
      }
      ctx.strokeStyle = L; ctx.lineWidth = 1.3;
      [R - TW / 2, R + TW / 2].forEach(r => { ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke(); });
      [a0, a1].forEach(a => ln(cx + Math.cos(a) * (R - TW / 2), cy + Math.sin(a) * (R - TW / 2), cx + Math.cos(a) * (R + TW / 2), cy + Math.sin(a) * (R + TW / 2), 1.3));
      // connecting pipe to the next column
      const b0 = a1, b1 = (c + 1) / N * Math.PI * 2 - Math.PI / 2 + gap; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(cx, cy, R, b0, b1); ctx.stroke();
    }
    // ports at column junctions: in (pointing in) and out (pointing out)
    [[0, 1], [2, -1], [4, 1], [6, -1]].forEach(([o, dir]) => {
      const a = ((p + o) % N) / N * Math.PI * 2 - Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
      const r0 = R + 8, r1 = R + 78; pipes([[[cx + ca * r0, cy + sa * r0], [cx + ca * r1, cy + sa * r1]]]);
      const rm = R + 50; chev(cx + ca * rm, cy + sa * rm, a + (dir > 0 ? Math.PI : 0));
    });
  }

  // ---------- shared pieces for 3 to 5
  const ring = (x, y, r, w = 1.3) => { ctx.fillStyle = BG; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.strokeStyle = L; ctx.lineWidth = w; ctx.stroke(); };
  const arrowHead = (x, y, ang, s = 8) => { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = L; ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * .7, -s * .6); ctx.lineTo(-s * .7, s * .6); ctx.closePath(); ctx.fill(); ctx.restore(); };
  const prices = t => [0, 1, 2].map(i => .5 + .38 * Math.sin(t * (.33 + i * .11) + i * 2.1));
  const sliderSet = (kn, names, x, y, w, gap) => kn.forEach((v, i) => { const yy = y + i * gap; label(names[i], x, yy - 16, 'left', 14); ln(x, yy, x + w, yy, 1.3, F); ring(x + w * v, yy, 8, 1.4); dot(x + w * v, yy, 2.8); });
  // a small signal that keeps changing: a disturbance on the plant
  const signal = (x, y, w, h, t, seed, name) => { label(name, x, y - 6, 'left', 12, F);
    const pts = []; for (let u = 0; u <= 1.0001; u += .02) { const tt = t * .8 + u * 6 + seed * 3; pts.push([x + u * w, y + h / 2 - h * .42 * (.6 * Math.sin(tt * 1.3 + seed) + .4 * Math.sin(tt * 3.1 + seed * 2))]); }
    poly(pts, 1.2); dot(...pts[pts.length - 1], 2.6); };
  // the agent (a small network) and the plant (two connected columns), in a loop of state and action
  function loop(t, ax, ay, ex, ey) {
    const rA = 68, rE = 92;
    ring(ax, ay, rA, 1.4);
    const layers = [[-32, 3], [0, 4], [32, 2]], pts = layers.map(([dx, n]) => Array.from({ length: n }, (_, i) => [ax + dx, ay + (i - (n - 1) / 2) * 20]));
    for (let a = 0; a < 2; a++) pts[a].forEach(p => pts[a + 1].forEach(q => ln(p[0], p[1], q[0], q[1], .6, F)));
    pts.flat().forEach(([x, y]) => ring(x, y, 4.5, 1.1));
    ring(ex, ey, rE, 1.4);
    const cols = [ex - 26, ex + 26], top = ey - 52, bot = ey + 52;
    ctx.strokeStyle = L; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(cols[0], top - 10); ctx.lineTo(cols[0], top - 18); ctx.lineTo(cols[1], top - 18); ctx.lineTo(cols[1], top - 10); ctx.moveTo(cols[0], bot + 10); ctx.lineTo(cols[0], bot + 18); ctx.lineTo(cols[1], bot + 18); ctx.lineTo(cols[1], bot + 10); ctx.stroke();
    cols.forEach((x, i) => { const lv = .5 + .38 * Math.sin(t * 1.3 + i * Math.PI);
      ctx.save(); ctx.beginPath(); ctx.roundRect(x - 15, top - 10, 30, bot - top + 20, 15); ctx.fillStyle = BG; ctx.fill(); ctx.clip(); ctx.fillStyle = tone(.5); ctx.fillRect(x - 15, bot + 10 - lv * (bot - top + 20), 30, lv * (bot - top + 20)); ctx.restore();
      ctx.strokeStyle = L; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.roundRect(x - 15, top - 10, 30, bot - top + 20, 15); ctx.stroke(); });
    // state goes up on the left, the action comes down on the right
    const arc = (side, up, ph) => { const pts = []; for (let u = 0; u <= 1; u += .02) { const y = lerp(up ? ey - rE - 4 : ay + rA + 4, up ? ay + rA + 4 : ey - rE - 4, u), x = ax + side * (60 + 46 * Math.sin(Math.PI * u)); pts.push([x, y]); }
      poly(pts, 1.3); const k = Math.floor(((t * .35 + ph) % 1) * (pts.length - 1)); for (let m = 0; m < 2; m++) { const q = pts[(k + m * 25) % pts.length]; dot(q[0], q[1], 3); }
      const e = pts[pts.length - 1], b = pts[pts.length - 3]; arrowHead(e[0], e[1], Math.atan2(e[1] - b[1], e[0] - b[0])); };
    arc(-1, true, 0); arc(1, false, .5);
    label('state', ax - 120, (ay + ey) / 2 + 5, 'right', 13, F); label('action', ax + 120, (ay + ey) / 2 + 5, 'left', 13, F);
  }
  // training: faint runs behind, the current one climbing
  function learning(t, bx, by, bw, bh, name, period) {
    const e = (t / period) % 1; ln(bx, by + bh, bx + bw, by + bh, 1.2); ln(bx, by, bx, by + bh, 1.2);
    label(name, bx + 10, by + 4, 'left', 14, F); label('Training episodes', bx + bw, by + bh + 26, 'right', 13, F);
    const curve = (u, s) => (1 - Math.exp(-(3 + s * 2) * u)) * (.72 + .18 * s) + .045 * Math.sin(u * (60 + s * 40) + s * 9) * Math.exp(-1.5 * u);
    for (let k = 0; k < 8; k++) { const s = ((k * .37) % 1), g = []; for (let u = 0; u <= 1; u += .01) g.push([bx + u * bw, by + bh - (.05 + curve(u, s)) * bh]); poly(g, 1, tone(.16)); }
    const g = []; for (let u = 0; u <= e; u += .004) g.push([bx + u * bw, by + bh - (.05 + curve(u, .8)) * bh]);
    if (g.length > 1) { poly(g, 2); const [X, Y] = g[g.length - 1]; ring(X, Y, 7, 1.4); dot(X, Y, 2.8); }
  }

  // ---------- 3. Economic optimum: the prices move, and the peak of the profit surface moves with them
  function eco(t) {
    const kn = prices(t); sliderSet(kn, ['Electricity', 'Biomethane', 'CO₂'], 70, 220, 190, 100);
    const px = .5 + .32 * (kn[1] - kn[0]), py = .5 - .3 * (kn[2] - kn[0]);
    const n = 24, cx = 640, cy = 340, sx = 250, sy = 125, hz = 200, rot = .55 + .12 * Math.sin(t * .2);
    const P = (u, v) => { const a = u - .5, b = v - .5, x = a * Math.cos(rot) - b * Math.sin(rot), y = a * Math.sin(rot) + b * Math.cos(rot);
      const z = .9 * Math.exp(-(((u - px) ** 2) + ((v - py) ** 2)) / .045) + .1 * Math.sin(u * 7) * Math.cos(v * 6);
      return [cx + x * sx * 2, cy + y * sy * 2 - z * hz, z]; };
    for (let i = 0; i <= n; i++) { const a = [], b = []; for (let j = 0; j <= n; j++) { a.push(P(i / n, j / n)); b.push(P(j / n, i / n)); }
      [a, b].forEach(line => { for (let k = 1; k < line.length; k++) ln(line[k - 1][0], line[k - 1][1], line[k][0], line[k][1], 1, tone(.2 + .6 * Math.max(line[k][2], 0))); }); }
    const [X, Y] = P(px, py); ln(X, Y, X, Y - 64, 1.3); ring(X, Y - 72, 8, 1.4); dot(X, Y - 72, 3); dot(X, Y, 3.5);
    label('Profit', 860, 120, 'left', 14, F);
  }

  // ---------- 4. RL, productivity: the agent runs two columns while the feed composition changes
  function rlp(t) {
    loop(t, 250, 170, 250, 435);
    signal(40, 520, 110, 44, t, 1, 'Feed composition'); poly([[150, 542], [175, 542], [175, 470], [158, 470]], 1.2, F); arrowHead(160, 470, Math.PI, 6);
    learning(t, 540, 110, 410, 390, 'Productivity', 14);
  }

  // ---------- 5. RL, profit: the same, rewarded by profit, with more that changes around the plant
  function rle(t) {
    loop(t, 330, 170, 330, 435);
    const names = ['Feed temperature', 'Ambient temperature', 'Prices', 'Feed composition', 'Feed flow'];
    names.forEach((nm, k) => signal(30, 250 + k * 64, 120, 30, t, k + 2, nm));
    poly([[160, 265], [190, 265], [190, 520], [160, 520]], 1, F); poly([[190, 435], [230, 435]], 1.2, F); arrowHead(232, 435, 0, 6);
    learning(t, 570, 110, 390, 390, 'Profit', 16);
  }

  const DRAW = { psa, smb, eco, rlp, rle };
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  let clock = 4, t0 = 0, last = performance.now(), seen = true;
  new IntersectionObserver(es => seen = es[0].isIntersecting).observe(cv);
  function draw() { themeColours(); const key = WORKS[current].key; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); place(key); ctx.lineCap = key === 'smb' ? 'butt' : 'round'; DRAW[key](still.matches ? 6 : clock); }
  function frame(now) { const dt = Math.min(.05, (now - last) / 1000); last = now; clock += dt; if (seen) draw(); requestAnimationFrame(frame); }
  new ResizeObserver(() => { fit(); draw(); }).observe(cv);
  fit(); select(0); requestAnimationFrame(frame);
})();
