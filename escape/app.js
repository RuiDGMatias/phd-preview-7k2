const D = window.__ESC.D, M = window.__ESC.M;
const HHV = 15.42;                       // kWh/kg CH4
const HOURS = 8000;                      // operating hours per year, for the yearly figure only
const MARKERS = ["circle", "square", "cross", "x", "circle-open", "square-open"];
const MCOLOURS = ["#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff"];
const SCALE = [[0, "#16324f"], [0.5, "#0099ff"], [1, "#e0f354"]];   // profit: low to high
// ---------- light and dark
const TH = {};
const W = a => `rgba(${TH.rgb},${a})`;
function applyTheme() {
  const light = document.documentElement.dataset.theme === "light";
  Object.assign(TH, { light, rgb: light ? "0,0,0" : "255,255,255", ink: light ? "#111111" : "#f2f3f5", paper: light ? "#ffffff" : "#000000", panel: light ? "#ffffff" : "#0d0e11",
    miss: light ? "#c9ccd1" : "#3a3d43", miss2: light ? "#b0b4ba" : "#5d6168", opt: light ? "#e0f354" : "#e0f354" });
  SCALE.splice(0, SCALE.length, ...(light ? [[0, "#dbe7f5"], [0.5, "#0099ff"], [1, "#0b2a55"]] : [[0, "#16324f"], [0.5, "#0099ff"], [1, "#e0f354"]]));
  document.getElementById("theme").textContent = light ? "Dark mode" : "Light mode";
}
applyTheme();
const n = D.t_feed.length;
const $ = id => document.getElementById(id);
const fmt = (v, d) => Number(v).toLocaleString("en-GB", {minimumFractionDigits:d, maximumFractionDigits:d});
const pct = (v, d = 2) => fmt(100 * v, d) + " %";
const row = (a, b, cls) => `<tr><td${cls ? ` class="${cls}"` : ""}>${a}</td><td>${b}</td></tr>`;

// ---------- defaults ----------
$("sCH4").value = (100 * M.defaults.sCH4).toFixed(1);
$("sCO2").value = (100 * M.defaults.sCO2).toFixed(1);
$("pCH4").value = M.defaults.pCH4;
$("pCO2").value = M.defaults.pCO2;
$("pEl").value  = M.defaults.pEl;

const rng = a => [Math.min(...a), Math.max(...a)];
const rCH4 = rng(D.Pur_CH4), rCO2 = rng(D.Pur_CO2);
// ---------- hover text, built once ----------
const hover = new Array(n);
for (let i = 0; i < n; i++) {
  hover[i] =
    `F<sub>CH4</sub> ${fmt(D.F_CH4_kg_h[i],2)} kg/h · F<sub>CO2</sub> ${fmt(D.F_CO2_kg_h[i],2)} kg/h · E ${fmt(D.E_kW[i],2)} kW<br>` +
    `CH<sub>4</sub>: purity ${pct(D.Pur_CH4[i])}, recovery ${pct(D.Rec_CH4[i])}<br>` +
    `CO<sub>2</sub>: purity ${pct(D.Pur_CO2[i])}, recovery ${pct(D.Rec_CO2[i])}<br>` +
    `t<sub>feed</sub> ${fmt(D.t_feed[i],1)} s · r<sub>rinse</sub> ${fmt(D.r_rinse[i],3)}<br>` +
    `γ<sub>rinse</sub> ${fmt(D.gamma_rinse[i],3)} · γ<sub>recycle</sub> ${fmt(D.gamma_recycle[i],3)} · γ<sub>purge</sub> ${fmt(D.gamma_purge[i],3)}<br>` +
    `P<sub>high</sub> ${fmt(D.P_high_bar[i],2)} bar · P<sub>low</sub> ${fmt(D.P_low_bar[i],3)} bar`;
}

// ---------- calculations ----------
function inputs() {
  const g = id => Math.max(0, parseFloat($(id).value) || 0);
  return { sCH4: g("sCH4") / 100, sCO2: g("sCO2") / 100,
           ch4: g("pCH4") * HHV / 1000, co2: g("pCO2") / 1000, el: g("pEl"),
           ch4_MWh: g("pCH4"), co2_t: g("pCO2") };
}
const profit = (i, p, el = p.el) => p.ch4 * D.F_CH4_kg_h[i] + p.co2 * D.F_CO2_kg_h[i] - el * D.E_kW[i];

function feasible(p) {
  const idx = [];
  for (let i = 0; i < n; i++) if (D.Pur_CH4[i] >= p.sCH4 && D.Pur_CO2[i] >= p.sCO2) idx.push(i);
  return idx;
}
function argbest(idx, p, el = p.el) {
  let b = -1, pb = -Infinity;
  for (const i of idx) {
    const v = profit(i, p, el) - 1e-9 * D.E_kW[i];        // ties -> lower energy
    if (v > pb) { pb = v; b = i; }
  }
  return b;
}
// Three-objective front (max F_CH4, max F_CO2, min E) of the points meeting the specifications.
// Sorted by F_CH4, a point is kept unless an earlier one has F_CO2 at least as high and E at most as high:
// a staircase of the kept (F_CO2, E) pairs answers that with a binary search.
function front3(idx) {
  const F1 = D.F_CH4_kg_h, F2 = D.F_CO2_kg_h, E = D.E_kW;
  const s = idx.slice().sort((a, b) => F1[b] - F1[a] || F2[b] - F2[a] || E[a] - E[b]);
  const SX = [], SE = [], out = [];
  for (const i of s) {
    const x = F2[i], e = E[i];
    let lo = 0, hi = SX.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (SX[m] < x) lo = m + 1; else hi = m; }
    if (lo < SX.length && SE[lo] <= e) continue;
    out.push(i);
    let j = lo; if (j < SX.length && SX[j] === x) j++;
    let k = lo - 1; while (k >= 0 && SE[k] >= e) k--;
    SX.splice(k + 1, j - k - 1, x); SE.splice(k + 1, j - k - 1, e);
  }
  return out;
}
const CACHE = { key: "", idx: null, fr: null };
function specSets(p) {
  const key = p.sCH4 + "," + p.sCO2;
  if (CACHE.key !== key) { CACHE.key = key; CACHE.idx = feasible(p); CACHE.fr = front3(CACHE.idx); }
  return CACHE;
}

// ---------- what can be plotted ----------
const VARS = {
  F_CH4:   { l: "F<sub>CH4</sub>", u: "kg/h", c: "F_CH4_kg_h", g: "Production and energy" },
  F_CO2:   { l: "F<sub>CO2</sub>", u: "kg/h", c: "F_CO2_kg_h", g: "Production and energy" },
  E:       { l: "E", u: "kW", c: "E_kW", g: "Production and energy" },
  SEC:     { l: "SEC", u: "kWh/kg CH<sub>4</sub>", g: "Production and energy" },
  profit:  { l: "Profit", u: "EUR/h", g: "Production and energy" },
  Pur_CH4: { l: "CH<sub>4</sub> purity", u: "%", c: "Pur_CH4", k: 100, g: "Purity and recovery" },
  Pur_CO2: { l: "CO<sub>2</sub> purity", u: "%", c: "Pur_CO2", k: 100, g: "Purity and recovery" },
  Rec_CH4: { l: "CH<sub>4</sub> recovery", u: "%", c: "Rec_CH4", k: 100, g: "Purity and recovery" },
  Rec_CO2: { l: "CO<sub>2</sub> recovery", u: "%", c: "Rec_CO2", k: 100, g: "Purity and recovery" },
  t_feed:  { l: "t<sub>feed</sub>", u: "s", c: "t_feed", g: "Decision variables" },
  r_rinse: { l: "r<sub>rinse</sub>", u: "", c: "r_rinse", g: "Decision variables" },
  gamma_rinse:   { l: "γ<sub>rinse</sub>", u: "", c: "gamma_rinse", g: "Decision variables" },
  gamma_recycle: { l: "γ<sub>recycle</sub>", u: "", c: "gamma_recycle", g: "Decision variables" },
  gamma_purge:   { l: "γ<sub>purge</sub>", u: "", c: "gamma_purge", g: "Decision variables" },
  P_high:  { l: "P<sub>high</sub>", u: "bar", c: "P_high_bar", g: "Pressures and power split" },
  P_low:   { l: "P<sub>low</sub>", u: "bar", c: "P_low_bar", g: "Pressures and power split" },
  E_feed:  { l: "E<sub>feed</sub>", u: "kW", c: "E_feed_kW", g: "Pressures and power split" },
  E_rinse: { l: "E<sub>rinse</sub>", u: "kW", c: "E_rinse_kW", g: "Pressures and power split" },
  E_blow:  { l: "E<sub>blowdown</sub>", u: "kW", c: "E_blow_kW", g: "Pressures and power split" },
  E_purge: { l: "E<sub>purge</sub>", u: "kW", c: "E_purge_kW", g: "Pressures and power split" },
};
function V(key, i, p) {
  if (key === "profit") return profit(i, p);
  if (key === "SEC") return D.E_kW[i] / D.F_CH4_kg_h[i];
  const v = VARS[key]; return D[v.c][i] * (v.k || 1);
}
const vtitle = (key, br) => VARS[key].l + (VARS[key].u ? (br ? "<br>" : " ") + `(${VARS[key].u})` : "");
const DEF = { d3: { x: "F_CO2", y: "F_CH4", z: "E", c: "profit" }, map: { x: "Pur_CO2", y: "Pur_CH4", c: "profit" } };
const AX = { d3: { ...DEF.d3, lim: {} }, map: { ...DEF.map, lim: {} } };
const lastC = { d3: [0, 1], map: [0, 1] };
const ROLE = { x: "x axis", y: "y axis", z: "z axis", c: "colour scale" };
const isDefault = k => ["x", "y", "z", "c"].every(r => AX[k][r] === DEF[k][r]) && !Object.keys(AX[k].lim).length;
const ext = a => { let lo = Infinity, hi = -Infinity; for (const v of a) { if (v < lo) lo = v; if (v > hi) hi = v; } return [lo, hi]; };
// lines at the purity specifications, wherever a purity sits on an axis
function specLines(A, p) {
  const s = { Pur_CH4: 100 * p.sCH4, Pur_CO2: 100 * p.sCO2 }, line = { color: W(.7), width: 1 }, out = [];
  if (A.x in s) out.push({ type: "line", xref: "x", yref: "paper", x0: s[A.x], x1: s[A.x], y0: 0, y1: 1, line });
  if (A.y in s) out.push({ type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: s[A.y], y1: s[A.y], line });
  return out;
}
// purity axes open on the region around the specifications (90 to 100 % by default)
const purAuto = (key, p) => { const s = { Pur_CH4: p.sCH4, Pur_CO2: p.sCO2 }[key];
  return s === undefined ? null : [Math.min(89.6, 100 * s - 2), 100.4]; };
const ax2 = (key, lim) => ({ title: { text: vtitle(key) }, gridcolor: W(.08), zeroline: false, linecolor: W(.35),
  ...(lim ? { range: lim, autorange: false } : { autorange: true }) });
const cbar = (key, x) => ({ title: { text: vtitle(key, true), side: "top" }, thickness: 10, len: 0.55, x, outlinewidth: 0, tickfont: { size: 11 } });

// ---------- plots ----------
const axis = title => ({ title: { text: title, font: { size: 13 } }, tickfont: { size: 11 },
  backgroundcolor: TH.paper, gridcolor: W(.07), zerolinecolor: W(.25), showbackground: false, linecolor: W(.35), showspikes: false });
const FONT = { family: "Sora, Segoe UI, Arial, sans-serif", color: TH.ink };
const FS_ICON = { width: 24, height: 24, transform: "matrix(1 0 0 1 0 0)",
  path: "M3 3h7v2H5v5H3V3zm11 0h7v7h-2V5h-5V3zM3 14h2v5h5v2H3v-7zm16 0h2v7h-7v-2h5v-5z" };
function toggleFS(gd) {
  const panel = gd.closest(".panel");
  if (document.fullscreenElement) document.exitFullscreen();
  else if (panel.requestFullscreen) panel.requestFullscreen();
}
document.addEventListener("fullscreenchange", () => {
  if (PK) closePick();
  ["plot3d", "plotmap"].forEach(id => Plotly.Plots.resize(id));
});
const CONF = { responsive: true, displaylogo: false,
  modeBarButtonsToAdd: [{ name: "Full screen (again to leave)", icon: FS_ICON, click: toggleFS }] };

let mode3d = "";
function draw3d(p, fr, idx, ib) {
  const A = AX.d3, two = !A.z, T = two ? "scattergl" : "scatter3d";
  const inFeas = new Uint8Array(n); idx.forEach(i => inFeas[i] = 1);
  const pos = arr => { const o = { x: arr.map(i => V(A.x, i, p)), y: arr.map(i => V(A.y, i, p)) };
    if (!two) o.z = arr.map(i => V(A.z, i, p)); return o; };
  const C = fr.map(i => V(A.c, i, p)); lastC.d3 = ext(C);
  const cl = A.lim.c ? { cmin: A.lim.c[0], cmax: A.lim.c[1] } : {};
  const traces = [];
  if ($("showAll").checked) {
    const o = []; for (let i = 0; i < n; i++) if (!inFeas[i]) o.push(i);
    traces.push({ type: T, mode: "markers", name: "Misses the specifications", ...pos(o),
      text: o.map(i => hover[i]), hovertemplate: "%{text}<extra>misses the specifications</extra>",
      marker: { size: two ? 3.5 : 2, color: TH.miss2, opacity: two ? 0.6 : 0.35 } });
  }
  traces.push({ type: T, mode: "markers", name: `Pareto front (${fr.length} points)`, ...pos(fr),
    text: fr.map(i => hover[i]), hovertemplate: `%{text}<br>${vtitle(A.c)}: %{marker.color:.4g}<extra></extra>`,
    marker: { size: two ? 5 : 3.2, color: C, colorscale: SCALE, opacity: 0.95, ...cl, colorbar: cbar(A.c, two ? 1.0 : 0.98) } });
  if (ib >= 0) traces.push({ type: T, mode: "markers", name: "Optimum, inputs on the left", ...pos([ib]),
    text: [hover[ib]], hovertemplate: "<b>Optimum</b><br>%{text}<extra></extra>",
    marker: { size: two ? 14 : 9, symbol: "diamond", color: TH.opt, line: { color: TH.paper, width: 2 } } });
  const key = JSON.stringify(A);
  const base = { font: FONT, paper_bgcolor: "rgba(0,0,0,0)",
    legend: { x: 0.01, y: 0.02, yanchor: "bottom", bgcolor: "rgba(0,0,0,0)", borderwidth: 0, font: { size: 12 } },
    hoverlabel: { bgcolor: TH.panel, bordercolor: W(.3), font: { family: FONT.family, color: TH.ink } }, uirevision: key };
  const lay = two
    ? { ...base, margin: { l: 64, r: 16, t: 92, b: 50 }, plot_bgcolor: "rgba(0,0,0,0)",
        legend: { orientation: "h", x: 1, xanchor: "right", y: 1.01, yanchor: "bottom", font: { size: 12 } },
        xaxis: ax2(A.x, A.lim.x || purAuto(A.x, p)), yaxis: ax2(A.y, A.lim.y || purAuto(A.y, p)), shapes: specLines(A, p) }
    : { ...base, margin: { l: 0, r: 0, t: 40, b: 0 },
        scene: { xaxis: { ...axis(vtitle(A.x)), ...(A.lim.x ? { range: A.lim.x } : { autorange: true }) },
                 yaxis: { ...axis(vtitle(A.y)), ...(A.lim.y ? { range: A.lim.y } : { autorange: true }) },
                 zaxis: { ...axis(vtitle(A.z)), ...(A.lim.z ? { range: A.lim.z } : { autorange: true }) },
                 camera: { eye: { x: 1.6, y: -1.6, z: 0.9 } }, aspectmode: "cube" } };
  const cfg = { ...CONF, toImageButtonOptions: { format: "png", filename: "pareto_front_specs", scale: 3 } };
  const m = two ? "2d" : "3d";
  if (m !== mode3d) { Plotly.purge("plot3d"); mode3d = m; Plotly.newPlot("plot3d", traces, lay, cfg); }
  else Plotly.react("plot3d", traces, lay, cfg);
}

let mapReady = false;
function drawMap(p, idx, ib) {
  const A = AX.map;
  const inFeas = new Uint8Array(n); idx.forEach(i => inFeas[i] = 1);
  const o = []; for (let i = 0; i < n; i++) if (!inFeas[i]) o.push(i);
  const X = arr => arr.map(i => V(A.x, i, p)), Y = arr => arr.map(i => V(A.y, i, p));
  const C = idx.map(i => V(A.c, i, p)); lastC.map = ext(C);
  const cl = A.lim.c ? { cmin: A.lim.c[0], cmax: A.lim.c[1] } : {};
  const traces = [
    { type: "scattergl", mode: "markers", name: "Misses the specifications",
      x: X(o), y: Y(o), customdata: o, text: o.map(i => hover[i]), hovertemplate: "%{text}<extra></extra>",
      marker: { size: 3.5, color: TH.miss } },
    { type: "scattergl", mode: "markers", name: "Meets the specifications",
      x: X(idx), y: Y(idx), customdata: idx,
      text: idx.map(i => hover[i]), hovertemplate: `%{text}<br>${vtitle(A.c)}: %{marker.color:.4g}<extra></extra>`,
      marker: { size: 4.5, color: C, colorscale: SCALE, ...cl, showscale: true, colorbar: { ...cbar(A.c, 1.0), len: 0.8 } } } ];
  if (ib >= 0) traces.push({ type: "scattergl", mode: "markers", name: "Optimum",
      x: X([ib]), y: Y([ib]), customdata: [ib], hoverinfo: "skip",
      marker: { size: 13, symbol: "diamond", color: TH.opt, line: { color: TH.paper, width: 2 } } });
  $("mapT").textContent = A.x === DEF.map.x && A.y === DEF.map.y ? "Purity map" : "Map";
  Plotly.react("plotmap", traces, {
    font: FONT, margin: { l: 64, r: 16, t: 92, b: 50 }, paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
    hoverlabel: { bgcolor: TH.panel, bordercolor: W(.3), font: { family: FONT.family, color: TH.ink } },
    showlegend: true, legend: { orientation: "h", x: 1, xanchor: "right", y: 1.01, yanchor: "bottom", font: { size: 12 } },
    xaxis: ax2(A.x, A.lim.x || purAuto(A.x, p)), yaxis: ax2(A.y, A.lim.y || purAuto(A.y, p)), shapes: specLines(A, p),
    uirevision: JSON.stringify(A) + (purAuto(A.x, p) || purAuto(A.y, p) ? [p.sCH4, p.sCO2] : "") }, CONF);
  if (!mapReady) {
    $("plotmap").on("plotly_click", ev => {
      const i = ev.points[0].customdata;
      if (i === undefined) return;
      $("sCH4").value = (Math.floor(D.Pur_CH4[i] * 1e4) / 100).toFixed(2);   // rounded down: i stays feasible
      $("sCO2").value = (Math.floor(D.Pur_CO2[i] * 1e4) / 100).toFixed(2);
      schedule();
    });
    mapReady = true;
  }
}

// ---------- choosing axes, colours and limits ----------
const chipsHTML = k => ["x", "y", "z", "c"].filter(r => r in DEF[k]).map(r =>
  `<button type="button" data-p="${k}" data-r="${r}"><i>${r === "c" ? "colour" : r}</i><span>${AX[k][r] ? VARS[AX[k][r]].l : "none, 2D"}</span></button>`).join("") +
  (isDefault(k) ? "" : `<button type="button" class="reset" data-p="${k}" data-r="reset">Reset</button>`);
function renderChips() { ["d3", "map"].forEach(k => $("ax-" + k).innerHTML = chipsHTML(k)); }
let PK = null;
function shownRange(k, r) {
  if (AX[k].lim[r]) return AX[k].lim[r];
  if (r === "c") return lastC[k];
  const fl = $(k === "d3" ? "plot3d" : "plotmap")._fullLayout || {};
  const a = (k === "d3" && AX.d3.z) ? (fl.scene || {})[r + "axis"] : fl[r + "axis"];
  return a && a.range ? a.range.map(Number) : null;
}
const nice = v => Number.isFinite(v) ? +v.toPrecision(5) : "";
function openPick(k, r, at) {
  PK = { k, r };
  $("pickT").innerHTML = `${k === "d3" ? "Pareto front" : $("mapT").textContent}: ${ROLE[r]}`;
  const groups = {};
  Object.entries(VARS).forEach(([key, v]) => (groups[v.g] = groups[v.g] || []).push(key));
  let h = "";
  if (r === "z") h += `<div class="grp"><button type="button" data-k="" class="${AX[k].z ? "" : "sel"}">None, 2D view</button></div>`;
  for (const [g, keys] of Object.entries(groups))
    h += `<h4>${g}</h4><div class="grp">` + keys.map(key =>
      `<button type="button" data-k="${key}" class="${AX[k][r] === key ? "sel" : ""}">${VARS[key].l}</button>`).join("") + `</div>`;
  $("pickL").innerHTML = h;
  const off = r === "z" && !AX[k].z;
  const rg = off ? null : shownRange(k, r);
  $("pmin").value = rg ? nice(rg[0]) : ""; $("pmax").value = rg ? nice(rg[1]) : "";
  $("pmin").disabled = $("pmax").disabled = $("pauto").disabled = off;
  const pk = $("pick"); (document.fullscreenElement || document.body).appendChild(pk); pk.hidden = false;
  const w = pk.offsetWidth, ht = pk.offsetHeight;
  pk.style.left = Math.max(12, Math.min(at.x, innerWidth - w - 12)) + "px";
  pk.style.top = Math.max(12, Math.min(at.y, innerHeight - ht - 12)) + "px";
  document.querySelectorAll(".axes button").forEach(b => b.classList.toggle("on", b.dataset.p === k && b.dataset.r === r));
}
function closePick() { $("pick").hidden = true; PK = null; document.querySelectorAll(".axes button.on").forEach(b => b.classList.remove("on")); }
$("pickX").addEventListener("click", closePick);
$("pickL").addEventListener("click", e => {
  const b = e.target.closest("button[data-k]"); if (!b || !PK) return;
  const { k, r } = PK; AX[k][r] = b.dataset.k || null; delete AX[k].lim[r];
  if (r === "z" && !AX[k].z) delete AX[k].lim.z;
  renderChips(); update(); openPick(k, r, { x: $("pick").offsetLeft, y: $("pick").offsetTop });
});
function setLim() {
  if (!PK) return;
  const a = parseFloat($("pmin").value), b = parseFloat($("pmax").value);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return;
  AX[PK.k].lim[PK.r] = [Math.min(a, b), Math.max(a, b)]; renderChips(); update();
}
["pmin", "pmax"].forEach(id => { $(id).addEventListener("change", setLim); $(id).addEventListener("keydown", e => { if (e.key === "Enter") setLim(); }); });
$("pauto").addEventListener("click", () => {
  if (!PK) return; delete AX[PK.k].lim[PK.r]; renderChips(); update();
  const rg = shownRange(PK.k, PK.r); $("pmin").value = rg ? nice(rg[0]) : ""; $("pmax").value = rg ? nice(rg[1]) : "";
});
document.addEventListener("click", e => {
  const b = e.target.closest(".axes button");
  if (b) {
    const { p: k, r } = b.dataset;
    if (r === "reset") { Object.assign(AX[k], { ...DEF[k], lim: {} }); closePick(); renderChips(); update(); return; }
    if (PK && PK.k === k && PK.r === r) { closePick(); return; }
    const rc = b.getBoundingClientRect(); openPick(k, r, { x: rc.left, y: rc.bottom + 6 }); return;
  }
  if (PK && e.target.isConnected && !e.target.closest("#pick") && !e.target.closest(".plot")) closePick();
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && PK) closePick(); });
// clicking an axis title, its numbers or the colour bar on a 2D plot opens the same chooser
function hitRole(div, x, y) {
  const inside = el => { const r = el.getBoundingClientRect(); return r.width && x >= r.left - 3 && x <= r.right + 3 && y >= r.top - 3 && y <= r.bottom + 3; };
  const any = sel => [...div.querySelectorAll(sel)].some(inside);
  if (any(".colorbar .cbtitle, .colorbar text")) return "c";
  if (any(".g-xtitle text, .xaxislayer-above .xtick text")) return "x";
  if (any(".g-ytitle text, .yaxislayer-above .ytick text")) return "y";
  return null;
}
[["plot3d", "d3"], ["plotmap", "map"]].forEach(([id, k]) => {
  const div = $(id); let down = null;
  div.addEventListener("pointerdown", e => { down = [e.clientX, e.clientY]; }, true);
  window.addEventListener("pointerup", e => {
    const d = down; down = null;
    if (!d || Math.hypot(e.clientX - d[0], e.clientY - d[1]) > 4) return;
    const r = hitRole(div, e.clientX, e.clientY); if (!r) { if (PK) closePick(); return; }
    openPick(k, r, { x: e.clientX + 8, y: e.clientY + 8 });
  }, true);
  div.addEventListener("pointermove", e => {
    div.style.cursor = hitRole(div, e.clientX, e.clientY) ? "pointer" : "";
  });
});
renderChips();

// ---------- side panel ----------
function clearTables() {
  ["cond", "perf", "eco"].forEach(id => $(id).innerHTML = "");
  $("profit").textContent = "-"; $("profitYear").textContent = "";
}

function update() {
  syncSliders();
  const p = inputs();
  const { idx, fr } = specSets(p);
  const msgs = [];
  const ib = argbest(idx, p);
  if (ib < 0) {
    let mc = -1, mh = -1;
    for (let i = 0; i < n; i++) {
      if (D.Pur_CH4[i] >= p.sCH4) mc = Math.max(mc, D.Pur_CO2[i]);
      if (D.Pur_CO2[i] >= p.sCO2) mh = Math.max(mh, D.Pur_CH4[i]);
    }
    msgs.push(`No simulated operating point meets both specifications. ` +
      (mc > 0 ? `With CH<sub>4</sub> &ge; ${pct(p.sCH4)}, the highest CO<sub>2</sub> purity is ${pct(mc)}. ` : "") +
      (mh > 0 ? `With CO<sub>2</sub> &ge; ${pct(p.sCO2)}, the highest CH<sub>4</sub> purity is ${pct(mh)}.` : ""));
  }
  $("msg").innerHTML = msgs.join("<br><br>");
  $("msg").style.display = msgs.length ? "block" : "none";

  draw3d(p, fr, idx, ib);
  drawMap(p, idx, ib);
  if (ib < 0) { clearTables(); return; }

  const tf = D.t_feed[ib], rr = D.r_rinse[ib];
  $("cond").innerHTML =
    row("t<sub>feed</sub> = t<sub>purge</sub> = t<sub>press+idle</sub>", fmt(tf, 1) + " s") +
    row("t<sub>rinse</sub> / t<sub>blowdown</sub>", fmt(rr * tf, 1) + " / " + fmt((1 - rr) * tf, 1) + " s") +
    row("Cycle time (4 t<sub>feed</sub>)", fmt(4 * tf, 1) + " s") +
    row("r<sub>rinse</sub>", fmt(rr, 3)) +
    row("γ<sub>rinse</sub>", fmt(D.gamma_rinse[ib], 3)) +
    row("γ<sub>recycle</sub>", fmt(D.gamma_recycle[ib], 3)) +
    row("γ<sub>purge</sub>", fmt(D.gamma_purge[ib], 3)) +
    row("P<sub>high</sub> / P<sub>low</sub>", fmt(D.P_high_bar[ib], 2) + " / " + fmt(D.P_low_bar[ib], 3) + " bar");
  $("perf").innerHTML =
    row("CH<sub>4</sub> purity / recovery", pct(D.Pur_CH4[ib]) + " / " + pct(D.Rec_CH4[ib])) +
    row("CO<sub>2</sub> purity / recovery", pct(D.Pur_CO2[ib]) + " / " + pct(D.Rec_CO2[ib])) +
    row("F<sub>CH4</sub> / F<sub>CO2</sub>", fmt(D.F_CH4_kg_h[ib], 2) + " / " + fmt(D.F_CO2_kg_h[ib], 2) + " kg/h") +
    row("Electric power E", fmt(D.E_kW[ib], 2) + " kW") +
    row("feed / rinse compressors", fmt(D.E_feed_kW[ib], 2) + " / " + fmt(D.E_rinse_kW[ib], 2) + " kW", "sub") +
    row("blowdown / purge vacuum", fmt(D.E_blow_kW[ib], 2) + " / " + fmt(D.E_purge_kW[ib], 2) + " kW", "sub") +
    row("SEC", fmt(D.E_kW[ib] / D.F_CH4_kg_h[ib], 3) + " kWh/kg CH<sub>4</sub>");
  const rCH4 = p.ch4 * D.F_CH4_kg_h[ib], rCO2 = p.co2 * D.F_CO2_kg_h[ib], cEl = p.el * D.E_kW[ib];
  const net = rCH4 + rCO2 - cEl;
  $("eco").innerHTML =
    row("Biomethane revenue", fmt(rCH4, 2) + " EUR/h") +
    row("CO<sub>2</sub> revenue", fmt(rCO2, 2) + " EUR/h") +
    row("Electricity cost", "&minus;" + fmt(cEl, 2) + " EUR/h") +
    row("Electricity share of revenue", pct(cEl / (rCH4 + rCO2), 1));
  $("profit").textContent = fmt(net, 2) + " EUR/h";
  $("profitYear").textContent = fmt(net * HOURS / 1000, 0) + " kEUR/year";

}

// ---------- about ----------
(function about() {
  const src = Object.entries(M.sources).map(([k, v]) => {
    const c = D.src.filter(s => s == k).length;
    return `${v}: ${c}`;
  }).join(", ");
  $("about").innerHTML = `Every point is a full simulation of the cycle until cyclic steady state; nothing is ` +
    `interpolated. For any specifications and non-negative prices, the optimum among all ${M.n_points.toLocaleString('en-GB')} ` +
    `simulations is one of the ${n.toLocaleString('en-GB')} points kept here. Points by origin: ${src}.`;

})();

// sliders and number boxes move together
const PAIRS = [["sCH4", "rsCH4"], ["sCO2", "rsCO2"], ["pCH4", "rpCH4"], ["pCO2", "rpCO2"], ["pEl", "rpEl"]];
function syncSliders() { PAIRS.forEach(([a, b]) => { if (document.activeElement !== $(b)) $(b).value = $(a).value; }); }
PAIRS.forEach(([a, b]) => $(b).addEventListener("input", () => { $(a).value = $(b).value; schedule(); }));

let pending = false;
function schedule() { if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; update(); }); } }
["sCH4", "sCO2", "pCH4", "pCO2", "pEl"].forEach(id => $(id).addEventListener("input", schedule));
$("showAll").addEventListener("change", schedule);
update();

document.getElementById("theme").addEventListener("click", () => {
  const t = TH.light ? "dark" : "light"; document.documentElement.dataset.theme = t;
  try { localStorage.setItem("escape-theme", t); } catch (e) {}
  applyTheme(); FONT.color = TH.ink; update();
});
{ const L = document.getElementById("loading"); L.classList.add("done"); setTimeout(() => L.remove(), 350); }
