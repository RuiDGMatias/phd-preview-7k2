// The works panel: list, an animated schematic for each work, and a short description.
// All schematics in white line on black, with flat tones; no colour, no glow.
(() => {
  // Links to fill in: paste the address between the quotes. While a link is empty, its button is not shown.
  const LINKS = {
    psaArticle: '',
    psaCode: '',
  };
  const WORKS = [
    { key: 'psa', title: '(Vacuum) pressure swing adsorption simulator',
      text: 'A modular simulator for any (V)PSA cycle, with any adsorbent and any mixture of components, which extends easily to multi-column operation. The results viewer opens the simulation files in your browser, with nothing to install, and makes the results easy to inspect.',
      links: [['Open the results viewer', 'psa/viewer/index.html', 1], ['Read the article', LINKS.psaArticle], ['Read the code on GitHub', LINKS.psaCode]].filter(l => l[1]),
      later: LINKS.psaArticle ? '' : 'Article in preparation' },
    { key: 'smb', title: 'Gas-phase simulated moving bed',
      text: 'A ring of adsorption columns for gas separations, whose inlets and outlets move one column at a time to imitate a counter-current flow of adsorbent.',
      links: [], later: 'Article, code and interface in preparation' },
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
    eco: 'Three price sliders moving; on a map of profit, the optimum moves as the prices change.',
    rlp: 'An agent reads the state of a column and opens its feed valve; its productivity rises over training episodes.',
    rle: 'The electricity price rises and falls; the agent learns to lower the plant load when energy is dear.',
  };

  // ---------- drawing helpers (virtual space 1000 x 620)
  const VW = 1000, VH = 620, L = 'rgba(255,255,255,.92)', F = 'rgba(255,255,255,.38)';
  let ctx, W, H, D;
  // the part of the virtual space each schematic uses, so it fills the screen
  const BOUNDS = { psa: [130, 80, 870, 560], smb: [250, 70, 750, 550], eco: [100, 85, 900, 520], rlp: [140, 70, 910, 550], rle: [100, 90, 990, 490] };
  function fit() { D = Math.min(devicePixelRatio || 1, 2); const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * D; cv.height = H * D; ctx = cv.getContext('2d'); }
  function place(key) {
    const [x0, y0, x1, y1] = BOUNDS[key], k = Math.min(W / (x1 - x0), H / (y1 - y0)) * .86;
    const ox = (W - (x1 - x0) * k) / 2 - x0 * k, oy = (H - (y1 - y0) * k) / 2 - y0 * k;
    ctx.setTransform(D * k, 0, 0, D * k, D * ox, D * oy);
  }
  const tone = a => `rgba(255,255,255,${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  const ln = (x1, y1, x2, y2, w = 1.2, s = L) => { ctx.strokeStyle = s; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  const poly = (pts, w = 1.4, s = L) => { ctx.strokeStyle = s; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); };
  const pipes = ls => { ctx.lineJoin = 'round'; [[7, L], [4.8, '#000']].forEach(([w, s]) => ls.forEach(p => poly(p, w, s))); };
  const chev = (x, y, a) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#000'; ctx.fillRect(-8, -8, 16, 16); ctx.strokeStyle = L; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(3, 0); ctx.lineTo(-4, 5); ctx.stroke(); ctx.restore(); };
  const valve = (x, y, open, rot = 0) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = '#000'; ctx.fillRect(-9, -9, 18, 18);
    ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(8, 6); ctx.lineTo(8, -6); ctx.lineTo(-8, 6); ctx.closePath(); ctx.fillStyle = open ? L : '#000'; ctx.fill(); ctx.strokeStyle = L; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); };
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
      ctx.save(); ctx.beginPath(); ctx.roundRect(l, top, CW, h, CW / 2); ctx.fillStyle = '#000'; ctx.fill(); ctx.clip();
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

  // ---------- 3. Economic optimum: prices move, the optimum follows
  let trail = [];
  function eco(t) {
    const names = ['Electricity', 'Biomethane', 'CO₂'], kn = [0, 1, 2].map(i => .5 + .38 * Math.sin(t * (.33 + i * .11) + i * 2.1));
    kn.forEach((v, i) => { const y = 225 + i * 95; label(names[i], 120, y - 20); ln(120, y, 360, y, 1.4); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(120 + 240 * v, y, 9, 0, 7); ctx.fill(); ctx.strokeStyle = L; ctx.lineWidth = 1.4; ctx.stroke(); dot(120 + 240 * v, y, 3); });
    const bx = 470, by = 110, bw = 420, bh = 400; box(bx, by, bw, bh);
    const ou = .5 + .32 * (kn[1] - kn[0]) + .1 * (kn[2] - .5), ov = .5 - .3 * (kn[2] - kn[0]) + .08 * (kn[1] - .5);
    const X = bx + ou * bw, Y = by + ov * bh;
    ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
    for (let r = 1; r <= 9; r++) { ctx.strokeStyle = r % 3 ? F : L; ctx.lineWidth = r % 3 ? .9 : 1.2; ctx.beginPath(); ctx.ellipse(X, Y, r * 34, r * 22, -.45 + .3 * (kn[0] - .5), 0, 7); ctx.stroke(); }
    trail.push([X, Y]); if (trail.length > 140) trail.shift();
    if (trail.length > 1) poly(trail, 1, F);
    ctx.restore();
    ln(X - 14, Y, X + 14, Y, 1.4); ln(X, Y - 14, X, Y + 14, 1.4); dot(X, Y, 3.5);
  }

  // ---------- 4. RL, productivity: agent and column in a loop, learning curve rising
  const agent = (x, y) => { const layers = [[-40, 3], [0, 4], [40, 2]], pts = layers.map(([dx, n]) => Array.from({ length: n }, (_, i) => [x + dx, y + (i - (n - 1) / 2) * 26]));
    for (let a = 0; a < 2; a++) pts[a].forEach(p => pts[a + 1].forEach(q => ln(p[0], p[1], q[0], q[1], .6, F)));
    pts.flat().forEach(([px, py]) => { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(px, py, 6, 0, 7); ctx.fill(); ctx.strokeStyle = L; ctx.lineWidth = 1.2; ctx.stroke(); }); };
  function rlp(t) {
    const e = (t / 14) % 1, act = .5 + .45 * Math.sin(t * 2.2) * (1 - e) + .3 * e;
    // column with feed valve
    const cx = 200, top = 170, bot = 450; ctx.strokeStyle = L; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.roundRect(cx - 32, top, 64, bot - top, 32); ctx.stroke();
    const lvl = .5 + .4 * Math.sin(t * 1.6); ctx.save(); ctx.beginPath(); ctx.roundRect(cx - 32, top, 64, bot - top, 32); ctx.clip(); ctx.fillStyle = tone(.55); ctx.fillRect(cx - 32, bot - lvl * (bot - top), 64, lvl * (bot - top)); ctx.restore();
    pipes([[[cx, bot], [cx, 540]], [[cx, top], [cx, 90]]]); valve(cx, 500, act > .5, Math.PI / 2); chev(cx, 525, -Math.PI / 2);
    agent(480, 310);
    const sPath = [[cx + 40, 230], [440, 230], [440, 270]], aPath = [[520, 350], [520, 500], [cx + 14, 500]];
    poly(sPath, 1.2); poly(aPath, 1.2); chev(440, 262, Math.PI / 2); chev(cx + 26, 500, Math.PI);
    flow(sPath, t, 3, .4); flow(aPath, t + .5, 3, .4);
    const bx = 640, by = 150, bw = 260, bh = 300; ln(bx, by, bx, by + bh, 1.2); ln(bx, by + bh, bx + bw, by + bh, 1.2); label('Productivity', bx, by - 14, 'left', 14);
    const pts = []; for (let u = 0; u <= e; u += .005) { const r = (1 - Math.exp(-4 * u)) * .85 + .05 * Math.sin(u * 90) * Math.exp(-3 * u); pts.push([bx + u * bw, by + bh - (.05 + r) * bh]); }
    if (pts.length > 1) { poly(pts, 1.6); dot(...pts[pts.length - 1], 3.5); }
  }

  // ---------- 5. RL, profit: price signal and plant load, the agent learns to follow it
  function rle(t) {
    const e = (t / 16) % 1, price = x => .5 + .28 * Math.sin(x * 2.3) + .14 * Math.sin(x * 5.1 + 1);
    const bx = 120, bw = 760, s1 = 120, s2 = 330, sh = 150, span = 6;
    label('Electricity price', bx, s1 - 16, 'left', 14); label('Plant load', bx, s2 - 16, 'left', 14);
    ln(bx, s1 + sh, bx + bw, s1 + sh, 1, F); ln(bx, s2 + sh, bx + bw, s2 + sh, 1, F);
    const P = [], Ld = [];
    for (let x = 0; x <= bw; x += 4) { const tt = t * .6 - span + span * x / bw, pr = price(tt);
      const learned = Math.min(1, e * 1.4), load = (1 - learned) * (.55 + .25 * Math.sin(tt * 3.7)) + learned * (1 - pr * .9);
      P.push([bx + x, s1 + sh - pr * sh]); Ld.push([bx + x, s2 + sh - Math.max(.05, Math.min(.95, load)) * sh]); }
    poly(P, 1.4); poly(Ld, 1.8);
    // shade the energy bought at high prices
    for (let i = 0; i < P.length; i += 2) { const pr = (s1 + sh - P[i][1]) / sh; if (pr > .62) ln(P[i][0], s2 + sh, P[i][0], Ld[i][1], .8, F); }
    dot(...P[P.length - 1], 3.5); dot(...Ld[Ld.length - 1], 3.5);
    agent(940, 310);
  }

  const DRAW = { psa, smb, eco, rlp, rle };
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  let clock = 4, t0 = 0, last = performance.now(), seen = true;
  new IntersectionObserver(es => seen = es[0].isIntersecting).observe(cv);
  function draw() { const key = WORKS[current].key; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); place(key); ctx.lineCap = key === 'smb' ? 'butt' : 'round'; DRAW[key](still.matches ? 6 : clock); }
  function frame(now) { const dt = Math.min(.05, (now - last) / 1000); last = now; clock += dt; if (seen) draw(); requestAnimationFrame(frame); }
  new ResizeObserver(() => { fit(); draw(); }).observe(cv);
  fit(); select(0); requestAnimationFrame(frame);
})();
