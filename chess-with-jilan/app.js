// Chess with Jilan v1.0 - Jilan Apps Official
import { Chess } from './lib/chess.js?v=1.0.0';

const APP_VERSION = '1.0';
const SAVE_KEY = 'cwj_game_v1';
const PREF_KEY = 'cwj_prefs_v1';
const FILES = 'abcdefgh';
const PIECE_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const LEVELS = [
  null,
  { name: 'Easy', skill: 0, depth: 1, time: 60, rnd: 0.45 },
  { name: 'Novice', skill: 1, depth: 2, time: 80, rnd: 0.25 },
  { name: 'Beginner', skill: 3, depth: 3, time: 120, rnd: 0.1 },
  { name: 'Casual', skill: 5, depth: 4, time: 200, rnd: 0.04 },
  { name: 'Intermediate', skill: 8, depth: 6, time: 300, rnd: 0 },
  { name: 'Club player', skill: 11, depth: 8, time: 450, rnd: 0 },
  { name: 'Strong', skill: 14, depth: 10, time: 650, rnd: 0 },
  { name: 'Expert', skill: 17, depth: 13, time: 900, rnd: 0 },
  { name: 'Grandmaster', skill: 19, depth: 0, time: 1500, rnd: 0 },
  { name: 'Master', skill: 20, depth: 0, time: 2500, rnd: 0 },
];
const THEMES = [
  { id: 'wood', name: 'Wood', light: '#f0d9b5', dark: '#b58863' },
  { id: 'green', name: 'Green', light: '#eeeed2', dark: '#769656' },
  { id: 'jilan', name: 'Jilan', light: '#e6dcc3', dark: '#3b5a85' },
  { id: 'marble', name: 'Marble', light: '#dee3e6', dark: '#8ca2ad' },
];

const $ = (id) => document.getElementById(id);
const boardEl = $('board'), piecesEl = $('pieces'), wrapEl = $('boardWrap');

let prefs = Object.assign({ theme: 'wood', sound: true, dots: true, coords: true, vibrate: true,
  mode: 'ai', color: 'w', level: 3, clock: 0, autoFlip: false }, loadJSON(PREF_KEY) || {});

let game = new Chess();
let S = null; // game settings: {mode, human, level, clock, autoFlip, flipped, over, result, times:{w,b}, startFen, clockStarted}
let selected = null, legalForSel = [], hintMove = null, lastMove = null;
let pieceEls = []; // {el, sq, code}
let thinking = false, engineToken = 0, lastEval = null;
let clockTimer = null, lastTick = 0;

function loadJSON(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) {} }

// ---------------- Sound (made in-app with WebAudio) ----------------
let actx = null;
function audio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (actx.state === 'suspended') actx.resume().catch(() => {});
  return actx;
}
function knock(t0, gain, freq, dur) {
  const a = actx; const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
  const g = a.createGain(); g.gain.value = gain;
  src.connect(f); f.connect(g); g.connect(a.destination); src.start(t0);
}
function tone(t0, freq, dur, gain) {
  const a = actx; const o = a.createOscillator(); const g = a.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
function sound(kind) {
  if (!prefs.sound) return; const a = audio(); if (!a) return; const t = a.currentTime + 0.005;
  try {
    if (kind === 'move') knock(t, 1.6, 900, 0.07);
    else if (kind === 'capture') { knock(t, 2.2, 700, 0.09); knock(t + 0.05, 1.4, 1300, 0.06); }
    else if (kind === 'check') { knock(t, 1.6, 900, 0.07); tone(t + 0.02, 880, 0.18, 0.12); }
    else if (kind === 'castle') { knock(t, 1.5, 900, 0.06); knock(t + 0.11, 1.5, 800, 0.06); }
    else if (kind === 'promote') { knock(t, 1.5, 900, 0.07); tone(t + 0.02, 660, 0.12, 0.1); tone(t + 0.1, 990, 0.18, 0.1); }
    else if (kind === 'win') { [523, 659, 784, 1046].forEach((f, i) => tone(t + i * 0.12, f, 0.35, 0.12)); }
    else if (kind === 'lose') { [440, 370, 311].forEach((f, i) => tone(t + i * 0.16, f, 0.4, 0.11)); }
    else if (kind === 'draw') { tone(t, 523, 0.3, 0.1); tone(t + 0.18, 523, 0.35, 0.1); }
    else if (kind === 'illegal') tone(t, 160, 0.12, 0.08);
  } catch (e) {}
}
function buzz(ms) { if (prefs.vibrate && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }

// ---------------- Engine (Stockfish 18 lite, single thread, WASM) ----------------
const Engine = {
  w: null, ready: false, failed: false, listeners: [], queue: Promise.resolve(),
  init() {
    if (this.w || this.failed) return;
    try {
      if (typeof WebAssembly !== 'object') throw new Error('no wasm');
      this.w = new Worker(new URL('engine/stockfish-18-lite-single.js', location.href).href);
      this.w.onmessage = (e) => { const line = typeof e.data === 'string' ? e.data : (e.data && e.data.data) || ''; this.listeners.slice().forEach((f) => f(line)); };
      this.w.onerror = () => { this.failed = true; this.ready = false; };
      this.send('uci');
      this.waitFor((l) => l === 'uciok', 20000).then(() => { this.send('setoption name Hash value 16'); this.send('isready'); return this.waitFor((l) => l === 'readyok', 20000); })
        .then(() => { this.ready = true; }).catch(() => { this.failed = true; });
    } catch (e) { this.failed = true; }
  },
  send(c) { try { this.w && this.w.postMessage(c); } catch (e) {} },
  waitFor(pred, ms) {
    return new Promise((res, rej) => {
      const f = (l) => { if (pred(l)) { done(); res(l); } };
      const to = setTimeout(() => { done(); rej(new Error('timeout')); }, ms);
      const done = () => { clearTimeout(to); this.listeners = this.listeners.filter((x) => x !== f); };
      this.listeners.push(f);
    });
  },
  async whenReady(ms = 25000) {
    this.init(); const t0 = Date.now();
    while (!this.ready && !this.failed && Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 100));
    return this.ready;
  },
  // returns {move:'e2e4', score:{cp|mate}} (score from side to move)
  search(fen, opt) {
    const run = async () => {
      if (!(await this.whenReady())) throw new Error('engine unavailable');
      this.send('setoption name Skill Level value ' + opt.skill);
      this.send('position fen ' + fen);
      let score = null;
      const info = (l) => {
        const m = /score (cp|mate) (-?\d+)/.exec(l);
        if (m && / pv /.test(l)) score = { [m[1]]: parseInt(m[2], 10) };
      };
      this.listeners.push(info);
      const go = 'go' + (opt.depth ? ' depth ' + opt.depth : '') + (opt.time ? ' movetime ' + opt.time : '');
      const p = this.waitFor((l) => l.startsWith('bestmove'), (opt.time || 3000) + 20000);
      this.send(go);
      try { const l = await p; return { move: l.split(' ')[1], score }; }
      finally { this.listeners = this.listeners.filter((x) => x !== info); }
    };
    const r = this.queue.then(run, run); this.queue = r.catch(() => {}); return r;
  },
  stop() { this.send('stop'); },
};

// Fallback only if WASM engine cannot load: 2-ply material search.
function fallbackMove(g) {
  const ms = g.moves({ verbose: true }); let best = null, bestS = -1e9;
  for (const m of ms) {
    g.move(m); let s;
    if (g.isCheckmate()) s = 1e6; else {
      let worst = 1e9;
      for (const r of g.moves({ verbose: true })) { g.move(r); const v = g.isCheckmate() ? -1e6 : material(g, m.color); worst = Math.min(worst, v); g.undo(); }
      s = g.moves().length ? worst : (g.isDraw() ? 0 : 1e6);
    }
    g.undo(); s += Math.random() * 0.3;
    if (s > bestS) { bestS = s; best = m; }
  }
  return best ? best.from + best.to + (best.promotion || '') : null;
}
function material(g, color) {
  let s = 0; for (const row of g.board()) for (const p of row) if (p) s += (p.color === color ? 1 : -1) * PIECE_VAL[p.type]; return s;
}

// ---------------- Board geometry ----------------
function flipped() { return !!(S && S.flipped); }
function sqToXY(sq) {
  const f = FILES.indexOf(sq[0]), r = parseInt(sq[1], 10) - 1;
  return flipped() ? { x: 7 - f, y: r } : { x: f, y: 7 - r };
}
function xyToSq(x, y) { return flipped() ? FILES[7 - x] + (y + 1) : FILES[x] + (8 - y); }
function pointToSq(cx, cy) {
  const r = wrapEl.getBoundingClientRect();
  const x = Math.floor(((cx - r.left) / r.width) * 8), y = Math.floor(((cy - r.top) / r.height) * 8);
  if (x < 0 || x > 7 || y < 0 || y > 7) return null; return xyToSq(x, y);
}
function pieceImg(code) { return 'pieces/' + code[0] + code[1].toUpperCase() + '.svg'; }

function buildSquares() {
  boardEl.innerHTML = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const sq = xyToSq(x, y); const d = document.createElement('div');
    const dark = (FILES.indexOf(sq[0]) + parseInt(sq[1], 10)) % 2 === 1;
    d.className = 'sq' + (dark ? ' d' : ''); d.dataset.sq = sq;
    if (prefs.coords) {
      if (x === 0) { const c = document.createElement('span'); c.className = 'cr ' + (dark ? 'dk' : 'l'); c.textContent = sq[1]; d.appendChild(c); }
      if (y === 7) { const c = document.createElement('span'); c.className = 'cf ' + (dark ? 'dk' : 'l'); c.textContent = sq[0]; d.appendChild(c); }
    }
    boardEl.appendChild(d);
  }
}
function sqEl(sq) { return boardEl.querySelector('[data-sq="' + sq + '"]'); }
function placeEl(el, sq) { const { x, y } = sqToXY(sq); el.style.transform = 'translate(' + x * 100 + '%,' + y * 100 + '%)'; }

// Reconcile piece elements with the position; moved pieces animate.
function renderPieces(animate = true) {
  const target = [];
  for (const row of game.board()) for (const p of row) if (p) target.push({ sq: p.square, code: p.color + p.type });
  const remainingEls = pieceEls.slice(); const next = []; const pending = [];
  for (const t of target) {
    const i = remainingEls.findIndex((e) => e.sq === t.sq && e.code === t.code);
    if (i >= 0) { next.push(remainingEls[i]); remainingEls.splice(i, 1); } else pending.push(t);
  }
  const dist = (a, b) => { const A = sqToXY(a), B = sqToXY(b); return Math.abs(A.x - B.x) + Math.abs(A.y - B.y); };
  const created = [];
  for (const t of pending) {
    let bi = -1, bd = 99;
    remainingEls.forEach((e, i) => { if (e.code === t.code) { const d = dist(e.sq, t.sq); if (d < bd) { bd = d; bi = i; } } });
    if (bi >= 0 && animate) { const e = remainingEls.splice(bi, 1)[0]; e.sq = t.sq; placeEl(e.el, t.sq); next.push(e); }
    else {
      if (bi >= 0) { const e = remainingEls.splice(bi, 1)[0]; e.el.remove(); }
      const el = document.createElement('div'); el.className = 'pc' + (animate ? ' new' : '');
      el.style.backgroundImage = 'url(' + pieceImg(t.code) + ')'; el.style.transition = 'none'; placeEl(el, t.sq);
      piecesEl.appendChild(el); const e = { el, sq: t.sq, code: t.code }; next.push(e); created.push(el);
    }
  }
  for (const e of remainingEls) { if (animate) { e.el.classList.add('gone'); setTimeout(() => e.el.remove(), 220); } else e.el.remove(); }
  pieceEls = next;
  requestAnimationFrame(() => created.forEach((el) => { el.style.transition = ''; el.classList.remove('new'); }));
}
function relayoutPieces() { for (const e of pieceEls) { e.el.style.transition = 'none'; placeEl(e.el, e.sq); } requestAnimationFrame(() => pieceEls.forEach((e) => (e.el.style.transition = ''))); }

function renderMarks() {
  boardEl.querySelectorAll('.sq').forEach((d) => { d.classList.remove('last', 'sel', 'check', 'hint', 'over'); d.querySelectorAll('.dot,.ring').forEach((x) => x.remove()); });
  if (lastMove) { sqEl(lastMove.from)?.classList.add('last'); sqEl(lastMove.to)?.classList.add('last'); }
  if (hintMove) { sqEl(hintMove.from)?.classList.add('hint'); sqEl(hintMove.to)?.classList.add('hint'); }
  if (game.inCheck()) {
    const t = game.turn();
    for (const row of game.board()) for (const p of row) if (p && p.type === 'k' && p.color === t) sqEl(p.square)?.classList.add('check');
  }
  if (selected) {
    sqEl(selected)?.classList.add('sel');
    if (prefs.dots) {
      const seen = new Set();
      for (const m of legalForSel) {
        if (seen.has(m.to)) continue; seen.add(m.to);
        const s = document.createElement('div'); s.className = game.get(m.to) || m.flags.includes('e') ? 'ring' : 'dot'; sqEl(m.to)?.appendChild(s);
      }
    }
  }
}

// ---------------- UI panels ----------------
function sideAtBottom() { return flipped() ? 'b' : 'w'; }
function playerName(color) {
  if (!S) return '';
  if (S.mode === '2p') return color === 'w' ? 'White' : 'Black';
  return color === S.human ? 'You' : 'Jilan';
}
function renderPlayers() {
  const bot = sideAtBottom(), top = bot === 'w' ? 'b' : 'w';
  const setP = (pos, color) => {
    const name = playerName(color);
    const av = $(pos === 'top' ? 'avTop' : 'avBot');
    av.className = 'avatar' + (name === 'Jilan' ? '' : (name === 'You' ? ' me' : ' p2'));
    av.textContent = name === 'Jilan' ? 'J' : (name === 'You' ? 'You' : (color === 'w' ? 'W' : 'B'));
    $(pos === 'top' ? 'nameTop' : 'nameBot').innerHTML = name === 'Jilan'
      ? 'Jilan <small>Level ' + S.level + ' - ' + LEVELS[S.level].name + '</small>'
      : name + ' <small>(' + (color === 'w' ? 'White' : 'Black') + ')</small>';
    $(pos === 'top' ? 'plTop' : 'plBot').classList.toggle('turn', !S.over && game.turn() === color);
  };
  setP('top', top); setP('bot', bot);
  // captured pieces
  const start = { p: 8, n: 2, b: 2, r: 2, q: 1 }; const have = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
  for (const row of game.board()) for (const p of row) if (p && p.type !== 'k') have[p.color][p.type]++;
  const capsHtml = (byColor) => { // pieces of the other color captured by `byColor`
    const opp = byColor === 'w' ? 'b' : 'w'; let h = '';
    for (const t of ['q', 'r', 'b', 'n', 'p']) for (let i = 0; i < Math.max(0, start[t] - have[opp][t]); i++) h += '<img src="' + pieceImg(opp + t) + '" alt="">';
    const adv = matSide(byColor) - matSide(opp); if (adv > 0) h += '<span class="adv">+' + adv + '</span>';
    return h;
  };
  const matSide = (c) => Object.keys(have[c]).reduce((s, t) => s + have[c][t] * PIECE_VAL[t], 0);
  $('capsTop').innerHTML = capsHtml(top); $('capsBot').innerHTML = capsHtml(bot);
  // clocks
  const showClock = S.clock > 0;
  ['Top', 'Bot'].forEach((p) => { $('clock' + p).hidden = !showClock; });
  if (showClock) renderClocks();
  $('thinking').hidden = !thinking;
}
function fmt(ms) {
  ms = Math.max(0, ms); const s = Math.ceil(ms / 1000);
  if (ms < 10000) return (Math.floor(ms / 1000)) + '.' + Math.floor((ms % 1000) / 100);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
function renderClocks() {
  const bot = sideAtBottom(), top = bot === 'w' ? 'b' : 'w';
  [['Top', top], ['Bot', bot]].forEach(([p, c]) => {
    const el = $('clock' + p); el.textContent = fmt(S.times[c]);
    el.classList.toggle('run', !S.over && S.clockStarted && game.turn() === c);
    el.classList.toggle('low', S.times[c] < 20000);
  });
}
function renderMoves() {
  const h = game.history(); const box = $('moves');
  if (!h.length) { box.innerHTML = '<span class="empty">Moves will appear here</span>'; return; }
  let html = '';
  h.forEach((san, i) => { if (i % 2 === 0) html += '<span class="n">' + (i / 2 + 1) + '.</span>'; html += '<span class="m' + (i === h.length - 1 ? ' cur' : '') + '">' + san + '</span>'; });
  box.innerHTML = html; box.scrollLeft = box.scrollWidth;
}
function renderStatus() {
  const st = $('status'); st.classList.remove('alert');
  if (S.over) { st.textContent = S.result.title + ' - ' + S.result.reason; return; }
  if (thinking) { st.textContent = 'Jilan is thinking...'; return; }
  const who = S.mode === 'ai' ? (game.turn() === S.human ? 'Your move' : "Jilan's move") : (game.turn() === 'w' ? 'White to move' : 'Black to move');
  if (game.inCheck()) { st.textContent = 'Check! ' + who; st.classList.add('alert'); } else st.textContent = who;
}
function renderButtons() {
  const ai = S.mode === 'ai', h = game.history().length;
  $('btnUndo').disabled = h === 0 || (ai && h < (S.human === 'w' ? 1 : 2) && !S.over);
  $('btnHint').disabled = S.over || thinking || (ai && game.turn() !== S.human);
  $('btnDraw').disabled = S.over || !ai || thinking || game.turn() !== S.human;
  $('btnResign').disabled = S.over;
}
function renderAll(animate = true) { renderPieces(animate); renderMarks(); renderPlayers(); renderMoves(); renderStatus(); renderButtons(); }

let toastT = 0;
function toast(msg, ms = 2200) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), ms); }

// ---------------- Save / resume ----------------
function save() {
  if (!S) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ S, moves: game.history({ verbose: true }).map((m) => m.lan || (m.from + m.to + (m.promotion || ''))), t: Date.now() })); } catch (e) {}
}
function tryResume() {
  const d = loadJSON(SAVE_KEY); if (!d || !d.S) return false;
  try {
    const g = new Chess(d.S.startFen || undefined);
    for (const u of d.moves || []) g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    game = g; S = d.S; S.clockStarted = S.clockStarted && !S.over;
    const hv = game.history({ verbose: true }); const lm = hv[hv.length - 1]; lastMove = lm ? { from: lm.from, to: lm.to } : null;
    return true;
  } catch (e) { return false; }
}

// ---------------- Game flow ----------------
function newGame(opts) {
  stopThinking();
  const human = opts.mode === 'ai' ? (opts.color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : opts.color) : 'w';
  S = { mode: opts.mode, human, level: opts.level, clock: opts.clock, autoFlip: !!opts.autoFlip,
    flipped: opts.mode === 'ai' ? human === 'b' : false, over: false, result: null,
    times: { w: opts.clock * 60000, b: opts.clock * 60000 }, clockStarted: false, startFen: opts.fen || null };
  game = new Chess(opts.fen || undefined); selected = null; legalForSel = []; hintMove = null; lastMove = null; lastEval = null;
  pieceEls.forEach((e) => e.el.remove()); pieceEls = [];
  buildSquares(); renderAll(false); save();
  if (S.mode === 'ai' && game.turn() !== S.human) setTimeout(aiMove, 450);
  else if (S.mode === 'ai') Engine.init();
}

function doMove(m, byHuman) {
  let res;
  try { res = game.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' }); } catch (e) { res = null; }
  if (!res) { sound('illegal'); return false; }
  selected = null; legalForSel = []; hintMove = null; lastMove = { from: res.from, to: res.to };
  if (S.clock > 0) { if (!S.clockStarted) { S.clockStarted = true; lastTick = performance.now(); startClock(); } }
  const k = game.inCheck() ? 'check' : res.flags.includes('p') ? 'promote' : (res.flags.includes('k') || res.flags.includes('q')) ? 'castle' : res.captured ? 'capture' : 'move';
  sound(k); buzz(res.captured ? 25 : 12);
  if (S.mode === '2p' && S.autoFlip && !game.isGameOver()) { S.flipped = game.turn() === 'b'; buildSquares(); relayoutPieces(); }
  renderAll(true);
  if (checkGameOver()) { save(); return true; }
  save();
  if (S.mode === 'ai' && game.turn() !== S.human) setTimeout(aiMove, 220);
  return true;
}

function checkGameOver() {
  if (!game.isGameOver()) return false;
  let title, reason, kind;
  if (game.isCheckmate()) {
    const winner = game.turn() === 'w' ? 'b' : 'w'; reason = 'by checkmate';
    if (S.mode === 'ai') { kind = winner === S.human ? 'win' : 'lose'; title = winner === S.human ? 'You won!' : 'Jilan wins'; }
    else { kind = 'win'; title = (winner === 'w' ? 'White' : 'Black') + ' wins'; }
  } else {
    kind = 'draw'; title = 'Draw';
    reason = game.isStalemate() ? 'by stalemate' : game.isInsufficientMaterial() ? 'by insufficient material' : game.isThreefoldRepetition() ? 'by threefold repetition' : game.isDrawByFiftyMoves() ? 'by the 50-move rule' : 'by rule';
  }
  endGame({ title, reason, kind });
  return true;
}
function endGame(r) {
  S.over = true; S.result = r; stopClock(); stopThinking();
  sound(r.kind); renderAll(true); save();
  setTimeout(() => showResult(r), 650);
}
function showResult(r) {
  $('resTitle').textContent = r.title; $('resReason').textContent = r.reason;
  const icons = {
    win: '<svg viewBox="0 0 24 24" fill="#f5c04a"><path d="M7 3h10v3h3v2a4 4 0 01-4 4h-.3A5 5 0 0113 15v3h3v3H8v-3h3v-3a5 5 0 01-2.7-3H8a4 4 0 01-4-4V6h3V3zm-1 5a2 2 0 002 2V8H6zm12 0h-2v2a2 2 0 002-2z"/></svg>',
    lose: '<svg viewBox="0 0 24 24" fill="none" stroke="#9fb0c8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
    draw: '<svg viewBox="0 0 24 24" fill="none" stroke="#9fb0c8" stroke-width="2.2" stroke-linecap="round"><path d="M4 9h16M4 15h16"/></svg>',
  };
  $('resIcon').innerHTML = icons[r.kind] || icons.draw; $('resultBack').hidden = false;
}

function stopThinking() { engineToken++; if (thinking) { thinking = false; Engine.stop(); $('thinking').hidden = true; } }

async function aiMove() {
  if (!S || S.over || S.mode !== 'ai' || game.turn() === S.human) return;
  const my = ++engineToken; thinking = true; renderPlayers(); renderStatus(); renderButtons();
  const lv = LEVELS[S.level]; const fen = game.fen(); const t0 = Date.now(); let uci = null;
  try {
    let time = lv.time;
    if (S.clock > 0) time = Math.min(time, Math.max(60, S.times[game.turn()] / 40));
    const r = await Engine.search(fen, { skill: lv.skill, depth: lv.depth, time });
    uci = r.move; if (r.score) lastEval = r.score;
  } catch (e) {
    if (!Engine._warned) { Engine._warned = true; toast('Engine could not load - Jilan is playing in simple mode'); }
    uci = fallbackMove(new Chess(fen));
  }
  if (my !== engineToken || !S || S.over || game.fen() !== fen) return;
  const legal = game.moves({ verbose: true });
  if (lv.rnd && Math.random() < lv.rnd && legal.length > 1) {
    const caps = legal.filter((m) => m.captured); const pool = caps.length && Math.random() < 0.5 ? caps : legal;
    const m = pool[Math.floor(Math.random() * pool.length)]; uci = m.from + m.to + (m.promotion || '');
  }
  const wait = Math.max(0, 350 - (Date.now() - t0)); if (wait) await new Promise((r) => setTimeout(r, wait));
  if (my !== engineToken || game.fen() !== fen) return;
  thinking = false;
  if (!uci || uci === '(none)') { renderAll(); return; }
  doMove({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }, false);
}

// ---------------- Clock ----------------
function startClock() {
  stopClock(); lastTick = performance.now();
  clockTimer = setInterval(() => {
    if (!S || S.over || !S.clockStarted) return;
    const now = performance.now(); const c = game.turn(); S.times[c] -= now - lastTick; lastTick = now;
    if (S.times[c] <= 0) {
      S.times[c] = 0; const winner = c === 'w' ? 'b' : 'w';
      const onlyKing = game.board().flat().filter((p) => p && p.color === winner).every((p) => p.type === 'k');
      if (onlyKing) endGame({ title: 'Draw', reason: 'time out, no mating material', kind: 'draw' });
      else if (S.mode === 'ai') endGame({ title: winner === S.human ? 'You won!' : 'Jilan wins', reason: 'on time', kind: winner === S.human ? 'win' : 'lose' });
      else endGame({ title: (winner === 'w' ? 'White' : 'Black') + ' wins', reason: 'on time', kind: 'win' });
    }
    renderClocks();
    if (Math.random() < 0.05) save();
  }, 100);
}
function stopClock() { if (clockTimer) clearInterval(clockTimer); clockTimer = null; }
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); else if (S && S.clockStarted && !S.over) { lastTick = performance.now(); } });

// ---------------- Input: tap + drag ----------------
let drag = null; // {sq, el, startX, startY, moved}
function canMoveColor(c) { if (!S || S.over || thinking) return false; if (S.mode === 'ai') return c === S.human && game.turn() === S.human; return c === game.turn(); }
function select(sq) { selected = sq; legalForSel = game.moves({ square: sq, verbose: true }); renderMarks(); }
function tryMoveTo(sq) {
  const ms = legalForSel.filter((m) => m.to === sq); if (!ms.length) return false;
  if (ms.some((m) => m.promotion)) { askPromotion(ms[0]); return true; }
  doMove(ms[0], true); return true;
}
wrapEl.addEventListener('pointerdown', (e) => {
  audio(); if ($('promo').hidden === false) return;
  const sq = pointToSq(e.clientX, e.clientY); if (!sq) return;
  const p = game.get(sq);
  if (selected && sq !== selected && legalForSel.some((m) => m.to === sq)) { tryMoveTo(sq); return; }
  if (p && canMoveColor(p.color)) {
    if (selected !== sq) select(sq);
    const pe = pieceEls.find((x) => x.sq === sq);
    if (pe) { drag = { sq, el: pe.el, moved: false, x0: e.clientX, y0: e.clientY, id: e.pointerId }; try { wrapEl.setPointerCapture(e.pointerId); } catch (er) {} }
  } else if (selected) { selected = null; legalForSel = []; renderMarks(); }
  else if (p && S && !S.over && S.mode === 'ai' && p.color === S.human && game.turn() !== S.human) toast('Wait for Jilan to move');
});
wrapEl.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
  drag.moved = true; const r = wrapEl.getBoundingClientRect(); const s = r.width / 8;
  const x = e.clientX - r.left - s / 2, y = e.clientY - r.top - s / 2 - (e.pointerType === 'touch' ? s * 0.35 : 0);
  drag.el.classList.add('drag'); drag.el.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(1.15)';
  const over = pointToSq(e.clientX, e.clientY - (e.pointerType === 'touch' ? s * 0.35 : 0));
  boardEl.querySelectorAll('.over').forEach((d) => d.classList.remove('over')); if (over && over !== drag.sq) sqEl(over)?.classList.add('over');
});
function endDrag(e, cancel) {
  if (!drag || e.pointerId !== drag.id) return; const d = drag; drag = null;
  boardEl.querySelectorAll('.over').forEach((x) => x.classList.remove('over'));
  d.el.classList.remove('drag');
  if (!d.moved || cancel) { placeEl(d.el, d.sq); return; }
  const r = wrapEl.getBoundingClientRect(); const s = r.width / 8;
  const to = pointToSq(e.clientX, e.clientY - (e.pointerType === 'touch' ? s * 0.35 : 0));
  d.el.style.transition = 'none'; placeEl(d.el, to && legalForSel.some((m) => m.to === to) ? to : d.sq);
  requestAnimationFrame(() => (d.el.style.transition = ''));
  if (to && to !== d.sq && legalForSel.some((m) => m.to === to)) {
    const pe = pieceEls.find((x) => x.el === d.el); if (pe) pe.sq = to; // already at target, no slide
    if (!tryMoveTo(to)) { if (pe) pe.sq = d.sq; placeEl(d.el, d.sq); }
  } else { placeEl(d.el, d.sq); if (to && to !== d.sq) sound('illegal'); }
}
wrapEl.addEventListener('pointerup', (e) => endDrag(e, false));
wrapEl.addEventListener('pointercancel', (e) => endDrag(e, true));

function askPromotion(m) {
  const box = $('promo'); const c = m.color;
  box.innerHTML = '<div class="box">' + ['q', 'r', 'b', 'n'].map((t) => '<button data-t="' + t + '" aria-label="' + t + '"><img src="' + pieceImg(c + t) + '" alt=""></button>').join('') + '</div>';
  box.hidden = false; const openedAt = performance.now();
  box.onclick = (ev) => {
    if (performance.now() - openedAt < 400) return; // ignore the tap that opened the picker
    const b = ev.target.closest('button'); box.hidden = true; box.onclick = null;
    if (!b) { selected = null; legalForSel = []; renderAll(false); return; }
    doMove({ from: m.from, to: m.to, promotion: b.dataset.t }, true);
  };
}

// ---------------- Buttons ----------------
$('btnUndo').onclick = () => {
  if (!S) return; stopThinking();
  const n = S.mode === 'ai' ? (game.turn() === S.human ? 2 : 1) : 1;
  for (let i = 0; i < n && game.history().length; i++) game.undo();
  if (S.mode === 'ai' && game.turn() !== S.human && game.history().length) game.undo();
  if (S.over) { S.over = false; S.result = null; $('resultBack').hidden = true; if (S.clock > 0 && S.clockStarted) startClock(); }
  const hv = game.history({ verbose: true }); const lm = hv[hv.length - 1]; lastMove = lm ? { from: lm.from, to: lm.to } : null;
  selected = null; legalForSel = []; hintMove = null;
  if (S.mode === '2p' && S.autoFlip) { S.flipped = game.turn() === 'b'; buildSquares(); relayoutPieces(); }
  renderAll(true); save();
  if (S.mode === 'ai' && game.turn() !== S.human) setTimeout(aiMove, 300);
};
$('btnHint').onclick = async () => {
  if (!S || S.over || thinking) return; const fen = game.fen();
  $('btnHint').disabled = true; toast('Finding the best move...', 1500);
  try {
    const r = await Engine.search(fen, { skill: 20, depth: 0, time: 900 });
    if (game.fen() !== fen || !r.move) return;
    hintMove = { from: r.move.slice(0, 2), to: r.move.slice(2, 4) }; renderMarks();
    const mv = new Chess(fen).move({ from: hintMove.from, to: hintMove.to, promotion: r.move[4] || 'q' });
    toast('Hint: ' + mv.san, 2600);
  } catch (e) { const u = fallbackMove(new Chess(fen)); if (u) { hintMove = { from: u.slice(0, 2), to: u.slice(2, 4) }; renderMarks(); } }
  finally { renderButtons(); }
};
$('btnFlip').onclick = () => { if (!S) return; S.flipped = !S.flipped; buildSquares(); relayoutPieces(); renderMarks(); renderPlayers(); save(); };
$('btnDraw').onclick = () => {
  if (!S || S.over || S.mode !== 'ai') return;
  const moves = game.history().length; let accept = false;
  if (lastEval) { // eval is from Jilan's side (Jilan was to move)
    const cp = lastEval.mate !== undefined ? (lastEval.mate > 0 ? 10000 : -10000) : lastEval.cp;
    accept = cp <= -150 || (Math.abs(cp) <= 25 && moves >= 50);
  }
  if (accept) endGame({ title: 'Draw', reason: 'by agreement', kind: 'draw' });
  else toast('Jilan declined the draw');
};
$('btnResign').onclick = () => {
  if (!S || S.over) return;
  if (!confirm('Resign this game?')) return;
  if (S.mode === 'ai') endGame({ title: 'Jilan wins', reason: 'you resigned', kind: 'lose' });
  else { const loser = game.turn(); endGame({ title: (loser === 'w' ? 'Black' : 'White') + ' wins', reason: (loser === 'w' ? 'White' : 'Black') + ' resigned', kind: 'win' }); }
};

// New game sheet
function openNew() {
  const back = $('newBack'); back.hidden = false;
  const sync = () => {
    back.querySelectorAll('.seg').forEach((seg) => seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', String(prefs[seg.dataset.key]) === b.dataset.v)));
    back.querySelectorAll('.ai-only').forEach((x) => (x.hidden = prefs.mode !== 'ai'));
    back.querySelectorAll('.two-only').forEach((x) => (x.hidden = prefs.mode !== '2p'));
    $('lvl').value = prefs.level; $('lvlLabel').textContent = prefs.level + ' - ' + LEVELS[prefs.level].name; $('optAutoFlip').checked = prefs.autoFlip;
  };
  back.querySelectorAll('.seg').forEach((seg) => seg.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; const k = seg.dataset.key; prefs[k] = k === 'clock' ? parseInt(b.dataset.v, 10) : b.dataset.v; sync(); });
  $('lvl').oninput = () => { prefs.level = parseInt($('lvl').value, 10); sync(); };
  $('optAutoFlip').onchange = () => { prefs.autoFlip = $('optAutoFlip').checked; };
  sync();
}
$('btnNew').onclick = openNew;
$('btnCancelNew').onclick = () => ($('newBack').hidden = true);
$('btnStart').onclick = () => { savePrefs(); $('newBack').hidden = true; $('resultBack').hidden = true; newGame(prefs); };
$('newBack').onclick = (e) => { if (e.target === $('newBack') && S) $('newBack').hidden = true; };

// Menu
function applyTheme() { const t = THEMES.find((x) => x.id === prefs.theme) || THEMES[0]; document.documentElement.style.setProperty('--light', t.light); document.documentElement.style.setProperty('--dark', t.dark); }
$('btnMenu').onclick = () => {
  $('menuBack').hidden = false;
  $('themes').innerHTML = THEMES.map((t) => '<button class="theme' + (t.id === prefs.theme ? ' on' : '') + '" data-id="' + t.id + '"><div class="mini"><i style="background:' + t.light + '"></i><i style="background:' + t.dark + '"></i><i style="background:' + t.dark + '"></i><i style="background:' + t.light + '"></i></div><span>' + t.name + '</span></button>').join('');
  $('themes').onclick = (e) => { const b = e.target.closest('.theme'); if (!b) return; prefs.theme = b.dataset.id; applyTheme(); savePrefs(); $('themes').querySelectorAll('.theme').forEach((x) => x.classList.toggle('on', x === b)); };
  [['optSound', 'sound'], ['optDots', 'dots'], ['optCoords', 'coords'], ['optVibrate', 'vibrate']].forEach(([id, k]) => { $(id).checked = !!prefs[k]; $(id).onchange = () => { prefs[k] = $(id).checked; savePrefs(); if (k === 'coords') { buildSquares(); renderMarks(); } if (k === 'dots') renderMarks(); }; });
};
$('btnCloseMenu').onclick = () => ($('menuBack').hidden = true);
$('menuBack').onclick = (e) => { if (e.target === $('menuBack')) $('menuBack').hidden = true; };
$('btnAbout').onclick = () => { $('menuBack').hidden = true; $('aboutBack').hidden = false; let v = APP_VERSION; try { if (window.Android && Android.appVersion) v = Android.appVersion() + ' (web ' + APP_VERSION + ')'; } catch (e) {} $('verText').textContent = v; };
$('btnCloseAbout').onclick = () => ($('aboutBack').hidden = true);
$('btnCheckUpdate').onclick = () => {
  if (window.Android && Android.checkUpdate) { Android.checkUpdate(); toast('Checking for update...'); }
  else toast('You are using the web version - it is always up to date.');
};
document.querySelectorAll('#aboutBack a').forEach((a) => a.addEventListener('click', (e) => {
  if (window.Android && Android.openLink && /^https?:/.test(a.href) && !a.href.startsWith(location.origin + location.pathname.replace(/[^/]*$/, ''))) { e.preventDefault(); Android.openLink(a.href); }
}));

// Result
$('btnRematch').onclick = () => { $('resultBack').hidden = true; const o = { mode: S.mode, color: S.mode === 'ai' ? (prefs.color === 'r' ? 'r' : (S.human === 'w' ? 'b' : 'w')) : 'w', level: S.level, clock: S.clock, autoFlip: S.autoFlip }; if (S.mode === 'ai' && prefs.color !== 'r') prefs.color = o.color; newGame(o); };
$('btnNewFromRes').onclick = () => { $('resultBack').hidden = true; openNew(); };
$('btnReview').onclick = () => ($('resultBack').hidden = true);

// Called by the Android shell's update checker.
window.showAvailableVersion = function (v) { if (v) toast('Update ' + v + ' is ready - tap Install at the top'); };

// ---------------- Layout ----------------
function fitBoard() {
  const app = $('app'); const others = 52 + 2 * 64 + 22 + 40 + 70 + 24; // header, players, status, moves, controls, gaps
  const avail = window.innerHeight - others; const w = Math.min(app.clientWidth - 16, Math.max(240, avail));
  wrapEl.style.width = w + 'px'; wrapEl.style.height = w + 'px';
}
window.addEventListener('resize', () => { fitBoard(); });

// ---------------- Start ----------------
applyTheme(); fitBoard();
if (tryResume()) {
  buildSquares(); renderAll(false);
  if (S.over) { /* show finished board */ }
  else {
    if (S.clock > 0 && S.clockStarted) startClock();
    if (S.mode === 'ai') { Engine.init(); if (game.turn() !== S.human) setTimeout(aiMove, 500); }
    if (game.history().length) toast('Welcome back - your last game is restored');
  }
} else { newGame(prefs); setTimeout(openNew, 300); }
window.__cwj = { get game() { return game; }, get S() { return S; }, Engine, doMove, newGame, LEVELS, tryResume };

if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); }); }
