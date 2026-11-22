/* Jilan Bus Jam v1.0 - Made by Dr Asif - Jilan Apps Official. Original game, offline, no ads in v1. */
(function () {
  'use strict';
  var E = window.JBJEngine, LEVELS = window.JBJ_LEVELS, VERSION = '1.0';
  var COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#facc15', '#f97316', '#a855f7', '#ec4899', '#06b6d4'];
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- colour helpers ---------- */
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }
  function rr(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

  /* ---------- storage ---------- */
  var SKEY = 'jbj_progress_v1', save;
  function loadSave() {
    try { save = JSON.parse(localStorage.getItem(SKEY)) || {}; } catch (e) { save = {}; }
    save.unlocked = Math.max(1, Math.min(LEVELS.length, save.unlocked | 0 || 1));
    save.done = save.done || {}; if (save.sound === undefined) save.sound = true; save.wins = save.wins | 0;
  }
  function store() { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) {} }
  loadSave();

  /* ---------- sound (Web Audio) ---------- */
  var AC = null;
  function ac() {
    if (!save.sound) return null;
    try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { AC = null; }
    return AC;
  }
  function tone(freq, dur, type, vol, slideTo, delay) {
    var a = ac(); if (!a) return;
    var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, hp) {
    var a = ac(); if (!a) return;
    var len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'bandpass'; f.frequency.value = hp || 900; g.gain.value = vol || 0.15;
    s.buffer = buf; s.connect(f); f.connect(g); g.connect(a.destination); s.start();
  }
  var SFX = {
    tap: function () { tone(700, 0.06, 'triangle', 0.15); },
    go: function () { noise(0.28, 0.12, 700); tone(180, 0.25, 'sawtooth', 0.05, 320); },
    bump: function () { tone(140, 0.14, 'square', 0.12, 90); },
    board: function (i) { tone(520 + (i % 8) * 45, 0.07, 'sine', 0.13); },
    honk: function () { tone(392, 0.12, 'square', 0.07); tone(311, 0.16, 'square', 0.07, null, 0.13); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.22, 'triangle', 0.16, null, i * 0.11); }); },
    lose: function () { [392, 330, 262].forEach(function (f, i) { tone(f, 0.25, 'sawtooth', 0.08, null, i * 0.16); }); },
    full: function () { tone(220, 0.12, 'square', 0.1); tone(180, 0.15, 'square', 0.1, null, 0.12); }
  };

  /* ---------- canvas / layout ---------- */
  var lowRes = false, slowFrames = 0;
  var cv = $('cv'), ctx = cv.getContext('2d'), DPR = 1, LW = 720, LH = 1280, SC = 1, HUDH = 58;
  var L = {}; // layout in logical units
  function resize() {
    var r = $('stage').getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, lowRes ? 1.25 : 2);
    cv.width = Math.max(1, Math.round(r.width * DPR)); cv.height = Math.max(1, Math.round(r.height * DPR));
    SC = cv.width / LW; LH = cv.height / SC;
    var top = HUDH * DPR / SC + 6;
    L.qTop = top; L.qFront = top + 250; L.bayY = top + 278; L.bayH = 132; L.roadTop = top + 262; L.roadBot = L.bayY + L.bayH + 18;
    L.lotTop = L.roadBot + 14; L.lotBot = LH - 14;
    layoutLot(); lotDirty = true; bgKey = ''; personCache = {};
  }
  function layoutLot() {
    if (!game) return;
    var s = game.logic, availW = LW - 40, availH = Math.max(120, L.lotBot - L.lotTop - 16);
    var cs = Math.min(availW / s.w, availH / s.h, 92);
    L.cs = cs; L.lotW = cs * s.w; L.lotH = cs * s.h; L.lotX = (LW - L.lotW) / 2; L.lotY = L.lotTop + 8 + (availH - L.lotH) / 2;
  }
  function bayCount() { return game.logic.maxBays; }
  function bayX(b) { var n = bayCount(), w = 104, gap = 10, tot = n * w + (n - 1) * gap; return (LW - tot) / 2 + b * (w + gap) + w / 2; }
  function bayCenterY() { return L.bayY + L.bayH / 2; }

  /* ---------- queue slots (serpentine crowd) ---------- */
  var SLOT = 44, ROW = 40, PER_ROW = 14;
  function slotPos(i) {
    var fx = LW / 2, fy = L.qFront;
    var first = 7; // slots on the front row going left from the centre
    if (i < first) return [fx - i * SLOT, fy];
    var j = i - first, row = 1 + Math.floor(j / PER_ROW), k = j % PER_ROW;
    var x0 = 34, x1 = LW - 34, step = (x1 - x0) / (PER_ROW - 1);
    var x = (row % 2 === 1) ? x0 + k * step : x1 - k * step;
    return [x, fy - row * ROW];
  }
  var MAXQ = 7 + PER_ROW * 5;

  /* ---------- vehicle drawing ---------- */
  function vehicleTop(c, Lx, W, color, len, arrow, label) {
    // local space: nose points +x, centred at 0,0
    var g = c.createLinearGradient(0, -W / 2, 0, W / 2);
    g.addColorStop(0, shade(color, 0.25)); g.addColorStop(0.5, color); g.addColorStop(1, shade(color, -0.12));
    c.fillStyle = g; rr(c, -Lx / 2, -W / 2, Lx, W, W * 0.28); c.fill();
    // windshield
    var gl = c.createLinearGradient(Lx / 2 - Lx * 0.3, 0, Lx / 2, 0);
    gl.addColorStop(0, '#1e3a8a'); gl.addColorStop(1, '#93c5fd');
    c.fillStyle = gl; rr(c, Lx / 2 - Lx * (len === 3 ? 0.17 : 0.27), -W * 0.38, Lx * (len === 3 ? 0.1 : 0.17), W * 0.76, W * 0.12); c.fill();
    // rear window
    c.fillStyle = '#1e3a8a'; rr(c, -Lx / 2 + Lx * 0.05, -W * 0.32, Lx * 0.06, W * 0.64, W * 0.08); c.fill();
    // roof
    c.fillStyle = shade(color, 0.42);
    rr(c, -Lx / 2 + Lx * 0.15, -W * 0.33, Lx * (len === 3 ? 0.62 : 0.5), W * 0.66, W * 0.18); c.fill();
    if (len === 3) { // bus side windows
      c.fillStyle = 'rgba(30,58,138,.85)';
      for (var i = 0; i < 4; i++) {
        var wx = -Lx / 2 + Lx * 0.17 + i * Lx * 0.15;
        rr(c, wx, -W / 2 + W * 0.04, Lx * 0.11, W * 0.1, 2); c.fill();
        rr(c, wx, W / 2 - W * 0.14, Lx * 0.11, W * 0.1, 2); c.fill();
      }
    }
    // headlights
    c.fillStyle = '#fef9c3';
    c.beginPath(); c.arc(Lx / 2 - W * 0.07, -W * 0.36, W * 0.06, 0, 7); c.arc(Lx / 2 - W * 0.07, W * 0.36, W * 0.06, 0, 7); c.fill();
    if (arrow) {
      var a = W * 0.26, cx = -Lx / 2 + Lx * (len === 3 ? 0.46 : 0.4);
      c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(cx + a, 0); c.lineTo(cx, -a * 0.95); c.lineTo(cx, -a * 0.38); c.lineTo(cx - a, -a * 0.38);
      c.lineTo(cx - a, a * 0.38); c.lineTo(cx, a * 0.38); c.lineTo(cx, a * 0.95); c.closePath(); c.fill(); c.stroke();
    }
    if (label !== undefined) {
      c.save(); c.rotate(Math.PI / 2);
      c.fillStyle = 'rgba(15,23,42,.75)'; rr(c, -17, -14, 34, 28, 10); c.fill();
      c.fillStyle = '#fff'; c.font = '900 19px Trebuchet MS,Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(label, 0, 1); c.restore();
    }
  }
  function drawVehicle(c, x, y, ang, Lx, W, color, len, opt) {
    opt = opt || {};
    var depth = Math.max(4, W * 0.16), sc = opt.scale || 1;
    c.save(); c.translate(x, y); c.scale(sc, sc);
    // shadow
    c.save(); c.translate(3, depth + 5); c.rotate(ang); c.fillStyle = 'rgba(0,0,0,.22)'; rr(c, -Lx / 2, -W / 2, Lx, W, W * 0.3); c.fill(); c.restore();
    // body side (extrusion)
    c.save(); c.translate(0, depth); c.rotate(ang); c.fillStyle = shade(color, -0.38); rr(c, -Lx / 2, -W / 2, Lx, W, W * 0.28); c.fill();
    // wheels
    c.fillStyle = '#1f2937';
    var wx = Lx * 0.3; [[-wx, -W / 2], [wx, -W / 2], [-wx, W / 2], [wx, W / 2]].forEach(function (p) { rr(c, p[0] - W * 0.14, p[1] - W * 0.08, W * 0.28, W * 0.16, 3); c.fill(); });
    c.restore();
    c.save(); c.rotate(ang); vehicleTop(c, Lx, W, color, len, opt.arrow, opt.label); c.restore();
    c.restore();
  }
  var DIRANG = { R: 0, D: Math.PI / 2, L: Math.PI, U: -Math.PI / 2 };
  function lotRect(v) {
    var cs = L.cs, h = E.isH(v);
    var x = L.lotX + v.x * cs, y = L.lotY + v.y * cs, w = (h ? v.len : 1) * cs, hh = (h ? 1 : v.len) * cs;
    return { cx: x + w / 2, cy: y + hh / 2, Lx: v.len * cs - cs * 0.14, W: cs * 0.74 };
  }

  /* ---------- passenger drawing ---------- */
  function drawPerson(c, x, y, color, s) {
    s = s || 1;
    c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(x, y + 12 * s, 12 * s, 5 * s, 0, 0, 7); c.fill();
    var g = c.createLinearGradient(x - 12 * s, 0, x + 12 * s, 0); g.addColorStop(0, shade(color, 0.3)); g.addColorStop(1, shade(color, -0.2));
    c.fillStyle = g; rr(c, x - 11 * s, y - 6 * s, 22 * s, 20 * s, 9 * s); c.fill();
    c.fillStyle = shade(color, 0.15); c.beginPath(); c.arc(x, y - 12 * s, 9 * s, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(x - 3 * s, y - 15 * s, 3 * s, 0, 7); c.fill();
  }

  var personCache = {};
  function personSprite(color, s) {
    var key = color + s, cvs = personCache[key];
    if (!cvs) {
      cvs = personCache[key] = document.createElement('canvas');
      var px = Math.ceil(30 * s * SC) * 2; cvs.width = px; cvs.height = px;
      var c = cvs.getContext('2d'); c.setTransform(SC, 0, 0, SC, 0, 0); drawPerson(c, px / SC / 2, px / SC / 2, color, s);
    }
    return cvs;
  }
  function blitPerson(c, x, y, color, s) {
    var sp = personSprite(color, s), w = sp.width / SC;
    c.drawImage(sp, x - w / 2, y - w / 2, w, w);
  }
  var bgCanvas = document.createElement('canvas'), bgKey = '';

  /* ---------- game state ---------- */
  var game = null, lotDirty = true, lotCanvas = document.createElement('canvas'), lotCtx = lotCanvas.getContext('2d');
  var particles = [], confetti = [], toastT = 0;

  function viewFromLogic(s) {
    return {
      lot: s.lot.map(function (v) { return Object.assign({}, v); }),
      bays: s.bayV.map(function (b) { return b ? Object.assign({}, b) : null; }),
      qi: s.qi, pending: [], moving: [], flyers: [], departing: [], bumps: [], lastBoard: 0, pos: {}
    };
  }
  function startLevel(n) {
    n = Math.max(1, Math.min(LEVELS.length, n));
    var s = E.newState(LEVELS[n - 1]);
    game = { n: n, logic: s, view: viewFromLogic(s), snap: null, undoLeft: 1, spotLeft: 1, ended: false, extraSpot: false };
    particles = []; confetti = [];
    layoutLot(); lotDirty = true;
    $('lvl').textContent = 'Level ' + n; updHud();
    show('game');
  }
  function updHud() {
    if (!game) return;
    $('nUndo').textContent = game.undoLeft; $('bUndo').classList.toggle('used', game.undoLeft <= 0 || !game.snap);
    $('nSpot').textContent = game.spotLeft; $('bSpot').classList.toggle('used', game.spotLeft <= 0 || game.logic.bays >= game.logic.maxBays);
  }
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 1300); }

  function tapVehicle(id) {
    if (!game || game.ended) return false;
    var s = game.logic, i = -1;
    for (var k = 0; k < s.lot.length; k++) if (s.lot[k].id === id) i = k;
    if (i < 0) return false;
    var snap = E.clone(s);
    var r = E.tap(s, id);
    if (!r.ok) {
      if (r.reason === 'blocked') { addBump(s.lot[i], r.dist, r.by); SFX.bump(); }
      else if (r.reason === 'full') { SFX.full(); toast('All parking spots are full!'); }
      if (navigator.vibrate) try { navigator.vibrate(25); } catch (e) {}
      return false;
    }
    game.snap = snap; updHud();
    SFX.tap(); SFX.go();
    Array.prototype.push.apply(game.view.pending, r.events);
    return true;
  }
  function addBump(v, dist, by) {
    var vw = game.view;
    vw.bumps = vw.bumps.filter(function (b) { return b.id !== v.id; });
    vw.bumps.push({ id: v.id, dist: dist, t0: now(), by: by });
    lotDirty = true;
  }
  function undo() {
    if (!game || !game.snap || game.undoLeft <= 0) return;
    window.JBJ_ads.showRewarded('undo', function () {
      game.undoLeft--; game.logic = game.snap; game.snap = null; game.ended = false;
      game.view = viewFromLogic(game.logic); lotDirty = true; hideOv(); updHud(); toast('Move undone');
    });
  }
  function extraSpot() {
    if (!game || game.spotLeft <= 0 || game.logic.bays >= game.logic.maxBays) return;
    window.JBJ_ads.showRewarded('spot', function () {
      game.spotLeft--; game.ended = false;
      var ev = E.addBay(game.logic);
      Array.prototype.push.apply(game.view.pending, ev);
      hideOv(); updHud(); toast('Extra parking spot unlocked!');
    });
  }

  /* ---------- event playback ---------- */
  function now() { return performance.now(); }
  var EXIT_SPEED = 1.9; // logical px per ms
  function startExit(e) {
    var vw = game.view, v = null;
    for (var i = 0; i < vw.lot.length; i++) if (vw.lot[i].id === e.id) { v = vw.lot[i]; vw.lot.splice(i, 1); break; }
    if (!v) v = e.v;
    var r = lotRect(v), d = E.DIRS[v.dir];
    var ex = r.cx, ey = r.cy, far = 0;
    // drive out until fully past the lot border
    while (ex > L.lotX - L.cs && ex < L.lotX + L.lotW + L.cs && ey > L.lotY - L.cs && ey < L.lotY + L.lotH + L.cs) { ex += d[0] * 4; ey += d[1] * 4; far += 4; }
    far += v.len * L.cs * 0.5; ex += d[0] * v.len * L.cs * 0.5; ey += d[1] * v.len * L.cs * 0.5;
    vw.moving.push({ id: v.id, v: v, bay: e.bay, t0: now(), p0: [r.cx, r.cy], p1: [ex, ey], d1: Math.max(120, far / EXIT_SPEED), d2: 420,
      a0: DIRANG[v.dir], Lx: r.Lx, W: r.W });
    puff(r.cx - d[0] * r.Lx / 2, r.cy - d[1] * r.Lx / 2);
    lotDirty = true;
  }
  function puff(x, y) { for (var i = 0; i < 7; i++) particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12, t0: now(), life: 500, r: 6 + Math.random() * 8, c: 'rgba(255,255,255,' }); }
  function bayVehicleSize(len) { return { Lx: len === 3 ? 118 : 92, W: 58 }; }

  function pump(t) {
    var vw = game.view, boardBlocked = false;
    for (var i = 0; i < vw.pending.length; i++) {
      var e = vw.pending[i], go = false;
      if (e.t === 'exit') {
        var busy = vw.bays[e.bay] || vw.moving.some(function (m) { return m.bay === e.bay; });
        go = !busy;
        if (go) startExit(e);
      } else if (e.t === 'board') {
        if (!boardBlocked) {
          var bb = vw.bays[e.bay];
          if (bb && bb.id === e.id && !bb.departing && t - vw.lastBoard >= 70) {
            go = true; vw.lastBoard = t;
            var from = slotPos(0);
            vw.flyers.push({ bay: e.bay, id: e.id, color: COLORS[e.color], t0: t, p0: [from[0], from[1]], dur: 230 });
            delete vw.pos[e.qi];
            vw.qi = e.qi + 1;
          }
          boardBlocked = true;
        }
      } else if (e.t === 'depart') {
        var bd = vw.bays[e.bay];
        if (bd && bd.id === e.id && bd.filled >= bd.cap && !bd.departing && !vw.flyers.some(function (f) { return f.id === e.id; })) {
          go = true; bd.departing = t; SFX.honk();
        }
      }
      if (go) { vw.pending.splice(i, 1); i--; }
    }
  }

  /* ---------- update + render ---------- */
  var last = now(), fpsS = [], frameMs = 16;
  function frame() {
    var t = now(); frameMs = t - last; last = t;
    fpsS.push(frameMs); if (fpsS.length > 120) fpsS.shift();
    if (game && curScreen === 'game') {
      pump(t); render(t); checkEnd();
      // adaptive resolution for slow phones
      if (!lowRes && DPR > 1.25) { slowFrames = frameMs > 34 && frameMs < 200 ? slowFrames + 1 : Math.max(0, slowFrames - 1); if (slowFrames > 90) { lowRes = true; resize(); } }
    }
    requestAnimationFrame(frame);
  }
  function checkEnd() {
    var vw = game.view;
    if (game.ended || vw.pending.length || vw.moving.length || vw.flyers.length || vw.departing.length) return;
    if (vw.bays.some(function (b) { return b && b.departing; })) return;
    var s = game.logic;
    if (E.isWon(s)) {
      game.ended = true; SFX.win(); burst();
      if (game.n >= save.unlocked && game.n < LEVELS.length) save.unlocked = game.n + 1;
      save.done[game.n] = 1; save.wins++; store();
      $('winTxt').textContent = game.n < LEVELS.length ? 'Level ' + game.n + ' cleared!' : 'You finished all ' + LEVELS.length + ' levels!';
      $('bNext').style.display = game.n < LEVELS.length ? '' : 'none';
      setTimeout(function () {
        showOv('ovWin');
        if (save.wins % 3 === 0) { try { window.JBJ_ads.showInterstitial(); } catch (e) {} }
      }, 900);
    } else if (E.isStuck(s)) {
      game.ended = true; SFX.lose();
      $('bLoseSpot').style.display = (game.spotLeft > 0 && s.bays < s.maxBays) ? '' : 'none';
      $('bLoseUndo').style.display = (game.undoLeft > 0 && game.snap) ? '' : 'none';
      setTimeout(function () { showOv('ovLose'); }, 450);
    }
  }
  function burst() {
    for (var i = 0; i < 140; i++) confetti.push({ x: LW / 2 + (Math.random() - 0.5) * 200, y: LH * 0.45, vx: (Math.random() - 0.5) * 1.1, vy: -Math.random() * 1.3 - 0.4,
      r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.02, c: COLORS[i % 8], t0: now(), w: 8 + Math.random() * 6 });
  }

  function renderLot() {
    var s = game.view, cs = L.cs;
    lotCanvas.width = cv.width; lotCanvas.height = cv.height;
    var c = lotCtx; c.setTransform(SC, 0, 0, SC, 0, 0); c.clearRect(0, 0, LW, LH);
    // lot ground
    c.fillStyle = 'rgba(0,0,0,.18)'; rr(c, L.lotX - 14, L.lotY - 10, L.lotW + 28, L.lotH + 30, 22); c.fill();
    var g = c.createLinearGradient(0, L.lotY, 0, L.lotY + L.lotH); g.addColorStop(0, '#e2e8f0'); g.addColorStop(1, '#cbd5e1');
    c.fillStyle = g; rr(c, L.lotX - 14, L.lotY - 14, L.lotW + 28, L.lotH + 28, 22); c.fill();
    c.fillStyle = 'rgba(100,116,139,.25)';
    for (var x = 0; x < game.logic.w; x++) for (var y = 0; y < game.logic.h; y++) { c.beginPath(); c.arc(L.lotX + (x + 0.5) * cs, L.lotY + (y + 0.5) * cs, 2.2, 0, 7); c.fill(); }
    var bumping = {}; s.bumps.forEach(function (b) { bumping[b.id] = 1; });
    var list = s.lot.slice().sort(function (a, b) { return (a.y + (E.isH(a) ? 0 : a.len)) - (b.y + (E.isH(b) ? 0 : b.len)); });
    list.forEach(function (v) {
      if (bumping[v.id]) return;
      var r = lotRect(v); drawVehicle(c, r.cx, r.cy, DIRANG[v.dir], r.Lx, r.W, COLORS[v.color], v.len, { arrow: true });
    });
    lotDirty = false;
  }

  function render(t) {
    var c = ctx, vw = game.view;
    c.setTransform(SC, 0, 0, SC, 0, 0);
    var key = cv.width + 'x' + cv.height + ':' + game.logic.bays;
    if (bgKey !== key) {
      bgKey = key; bgCanvas.width = cv.width; bgCanvas.height = cv.height;
      (function (c) { c.setTransform(SC, 0, 0, SC, 0, 0);
    // background
      var g = c.createLinearGradient(0, 0, 0, LH); g.addColorStop(0, '#bfdbfe'); g.addColorStop(0.35, '#dbeafe'); g.addColorStop(1, '#94a3b8');
      c.fillStyle = g; c.fillRect(0, 0, LW, LH);
      // plaza for the crowd
      c.fillStyle = '#e0e7ff'; rr(c, 14, L.qTop + 4, LW - 28, L.qFront - L.qTop + 18, 26); c.fill();
      c.strokeStyle = 'rgba(99,102,241,.25)'; c.lineWidth = 3; c.stroke();
      // road
      c.fillStyle = '#475569'; c.fillRect(0, L.roadTop, LW, L.roadBot - L.roadTop);
      c.fillStyle = '#334155'; c.fillRect(0, L.roadBot - 8, LW, 8);
      c.strokeStyle = '#fde047'; c.lineWidth = 4; c.setLineDash([22, 18]); c.beginPath(); c.moveTo(0, L.roadTop + 8); c.lineTo(LW, L.roadTop + 8); c.stroke(); c.setLineDash([]);
      // bays
      for (var b = 0; b < bayCount(); b++) {
        var bx = bayX(b), locked = b >= game.logic.bays;
        c.strokeStyle = locked ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.85)'; c.lineWidth = 3; c.setLineDash(locked ? [8, 8] : []);
        rr(c, bx - 46, L.bayY, 92, L.bayH, 12); c.stroke(); c.setLineDash([]);
        if (locked) {
          c.fillStyle = 'rgba(255,255,255,.12)'; rr(c, bx - 46, L.bayY, 92, L.bayH, 12); c.fill();
          c.fillStyle = '#fde047'; c.font = '900 30px Trebuchet MS,Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('+', bx, bayCenterY() - 12);
          c.font = '800 15px Trebuchet MS,Arial'; c.fillStyle = '#fff'; c.fillText('Extra', bx, bayCenterY() + 18);
        }
      }
        })(bgCanvas.getContext('2d'));
    }
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(bgCanvas, 0, 0); c.setTransform(SC, 0, 0, SC, 0, 0);
    // parked vehicles
    for (var b = 0; b < vw.bays.length; b++) {
      var bv = vw.bays[b]; if (!bv) continue;
      var sz = bayVehicleSize(bv.len), x = bayX(b), y = bayCenterY(), sc = 1;
      if (bv.departing) {
        var k = Math.min(1, (t - bv.departing) / 650);
        if (k >= 1) { vw.bays[b] = null; continue; }
        var k1 = Math.min(1, k * 2.2), k2 = Math.max(0, (k - 0.45) / 0.55);
        y -= easeOut(k1) * 70; x += ease(k2) * (LW + 200 - x);
        drawVehicle(c, x, y, -Math.PI / 2 + ease(k2) * Math.PI / 2, sz.Lx, sz.W, COLORS[bv.color], bv.len, {});
        continue;
      }
      if (bv.pulse && t - bv.pulse < 180) sc = 1 + 0.08 * Math.sin((t - bv.pulse) / 180 * Math.PI);
      drawVehicle(c, x, y, -Math.PI / 2, sz.Lx, sz.W, COLORS[bv.color], bv.len, { label: String(bv.cap - bv.filled), scale: sc });
    }
    // crowd
    var shown = Math.min(game.logic.queue.length - vw.qi, MAXQ);
    for (var i = shown - 1; i >= 0; i--) {
      var qi = vw.qi + i, tgt = slotPos(i), p = vw.pos[qi];
      if (!p) p = vw.pos[qi] = [tgt[0], tgt[1]];
      p[0] += (tgt[0] - p[0]) * Math.min(1, frameMs / 90); p[1] += (tgt[1] - p[1]) * Math.min(1, frameMs / 90);
      var bob = Math.abs(tgt[0] - p[0]) + Math.abs(tgt[1] - p[1]) > 2 ? Math.sin(t / 60 + qi) * 2 : 0;
      blitPerson(c, p[0], p[1] + bob, COLORS[game.logic.queue[qi]], i === 0 ? 1.12 : 1);
    }
    var rest = game.logic.queue.length - vw.qi;
    c.fillStyle = 'rgba(30,58,138,.9)'; rr(c, LW - 118, L.qTop + 10, 100, 34, 12); c.fill();
    c.fillStyle = '#fff'; c.font = '900 18px Trebuchet MS,Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(rest + ' left', LW - 68, L.qTop + 28);
    // lot (cached layer)
    if (lotDirty) renderLot();
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(lotCanvas, 0, 0); c.setTransform(SC, 0, 0, SC, 0, 0);
    if (game.n <= 2 && !vw.moving.length && game.logic.taps.length < 2) {
      c.fillStyle = 'rgba(30,58,138,.92)'; rr(c, LW / 2 - 230, L.lotTop - 6, 460, 40, 14); c.fill();
      c.fillStyle = '#fff'; c.font = '800 19px Trebuchet MS,Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('Tap a vehicle with a clear road to drive it out', LW / 2, L.lotTop + 14);
    }
    // bumping vehicles
    vw.bumps = vw.bumps.filter(function (bm) {
      var v = null; for (var j = 0; j < vw.lot.length; j++) if (vw.lot[j].id === bm.id) v = vw.lot[j];
      var k = (t - bm.t0) / 300; if (!v || k >= 1) { lotDirty = true; return false; }
      var r = lotRect(v), d = E.DIRS[v.dir], amt = (bm.dist * L.cs + L.cs * 0.12) * Math.sin(k * Math.PI);
      drawVehicle(c, r.cx + d[0] * amt, r.cy + d[1] * amt, DIRANG[v.dir], r.Lx, r.W, COLORS[v.color], v.len, { arrow: true });
      return true;
    });
    // moving vehicles (drive out, then to bay)
    vw.moving = vw.moving.filter(function (m) {
      var e = t - m.t0, x, y, a = m.a0, Lx = m.Lx, W = m.W;
      var sz = bayVehicleSize(m.v.len), tx = bayX(m.bay), ty = bayCenterY();
      if (e < m.d1) { var k = e / m.d1; x = m.p0[0] + (m.p1[0] - m.p0[0]) * k; y = m.p0[1] + (m.p1[1] - m.p0[1]) * k; }
      else {
        var k2 = Math.min(1, (e - m.d1) / m.d2), q = ease(k2);
        var mx = (m.p1[0] + tx) / 2, my = Math.min(m.p1[1], ty) - 60;
        x = (1 - q) * (1 - q) * m.p1[0] + 2 * (1 - q) * q * mx + q * q * tx;
        y = (1 - q) * (1 - q) * m.p1[1] + 2 * (1 - q) * q * my + q * q * ty;
        var target = -Math.PI / 2, da = target - m.a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        a = m.a0 + da * q; Lx = m.Lx + (sz.Lx - m.Lx) * q; W = m.W + (sz.W - m.W) * q;
        if (k2 >= 1) { vw.bays[m.bay] = { id: m.v.id, color: m.v.color, cap: m.v.cap, filled: 0, len: m.v.len, pulse: t }; return false; }
      }
      drawVehicle(c, x, y, a, Lx, W, COLORS[m.v.color], m.v.len, { arrow: e < m.d1 });
      return true;
    });
    // flying passengers
    vw.flyers = vw.flyers.filter(function (f) {
      var k = (t - f.t0) / f.dur, tx = bayX(f.bay), ty = bayCenterY();
      if (k >= 1) {
        var bv = vw.bays[f.bay]; if (bv && bv.id === f.id) { bv.filled++; bv.pulse = t; SFX.board(bv.filled); }
        return false;
      }
      var x = f.p0[0] + (tx - f.p0[0]) * k, y = f.p0[1] + (ty - f.p0[1]) * k - Math.sin(k * Math.PI) * 60;
      drawPerson(c, x, y, f.color, 1 - k * 0.4);
      return true;
    });
    // particles
    particles = particles.filter(function (p) {
      var k = (t - p.t0) / p.life; if (k >= 1) return false;
      c.fillStyle = p.c + (0.7 * (1 - k)) + ')'; c.beginPath(); c.arc(p.x + p.vx * (t - p.t0), p.y + p.vy * (t - p.t0), p.r * (1 + k), 0, 7); c.fill();
      return true;
    });
    confetti = confetti.filter(function (p) {
      var e = t - p.t0; if (e > 2600) return false;
      var x = p.x + p.vx * e, y = p.y + p.vy * e + 0.0009 * e * e;
      c.save(); c.translate(x, y); c.rotate(p.r + p.vr * e); c.fillStyle = p.c; c.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2); c.restore();
      return y < LH + 20;
    });
  }

  /* ---------- input ---------- */
  function hit(clientX, clientY) {
    var r = cv.getBoundingClientRect(), x = (clientX - r.left) * DPR / SC, y = (clientY - r.top) * DPR / SC;
    if (!game || game.ended) return;
    // locked bay = extra spot
    if (y > L.bayY && y < L.bayY + L.bayH) {
      for (var b = game.logic.bays; b < bayCount(); b++) if (Math.abs(x - bayX(b)) < 50) { extraSpot(); return; }
    }
    var gx = Math.floor((x - L.lotX) / L.cs), gy = Math.floor((y - L.lotY) / L.cs);
    if (gx < 0 || gy < 0 || gx >= game.logic.w || gy >= game.logic.h) return;
    var occ = E.occupancy(game.logic), id = occ[gx + ',' + gy];
    if (id === undefined) { // forgive near-misses: nearest vehicle centre within 0.6 cell
      var best = 0.6 * L.cs, bid;
      game.logic.lot.forEach(function (v) { var rc = lotRect(v), d = Math.hypot(rc.cx - x, rc.cy - y) - rc.Lx / 2 + L.cs / 2; if (d < best) { best = d; bid = v.id; } });
      id = bid;
    }
    if (id !== undefined) tapVehicle(id);
  }
  cv.addEventListener('pointerdown', function (e) { e.preventDefault(); ac(); hit(e.clientX, e.clientY); });

  /* ---------- screens ---------- */
  var curScreen = 'home';
  function show(name) {
    curScreen = name;
    ['home', 'levels', 'settings'].forEach(function (s) { $(s).classList.toggle('on', s === name); });
    $('hud').classList.toggle('on', name === 'game');
    hideOv();
    if (name === 'home') { $('playLvl').textContent = 'Level ' + save.unlocked; drawHomeArt(); }
    if (name === 'levels') buildGrid();
  }
  function showOv(id) { hideOv(); $(id).classList.add('on'); }
  function hideOv() { ['ovWin', 'ovLose', 'ovConfirm'].forEach(function (o) { $(o).classList.remove('on'); }); }
  function buildGrid() {
    var g = $('grid'); g.innerHTML = '';
    for (var i = 1; i <= LEVELS.length; i++) {
      var b = document.createElement('button'), lock = i > save.unlocked;
      b.className = 'lv' + (lock ? ' lock' : save.done[i] ? ' done' : '');
      b.textContent = lock ? '\u{1F512}' : i;
      if (!lock) (function (n) { b.onclick = function () { SFX.tap(); startLevel(n); }; })(i);
      g.appendChild(b);
    }
  }
  function drawHomeArt() {
    var c = $('homeArt').getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 520, 340);
    drawVehicle(c, 150, 120, -0.25, 190, 92, COLORS[3], 3, { arrow: true });
    drawVehicle(c, 360, 110, 0.35, 150, 84, COLORS[0], 2, { arrow: true });
    drawVehicle(c, 260, 235, 0.1, 210, 96, COLORS[1], 3, { arrow: true });
    for (var i = 0; i < 9; i++) drawPerson(c, 50 + i * 52, 318, COLORS[[1, 1, 3, 3, 0, 0, 0, 2, 2][i]], 1.1);
  }
  function setSoundLbl() { $('bSound').textContent = 'Sound: ' + (save.sound ? 'ON' : 'OFF'); }

  $('bPlay').onclick = function () { ac(); SFX.tap(); startLevel(save.unlocked); };
  $('bLevels').onclick = function () { SFX.tap(); show('levels'); };
  $('bSettings').onclick = function () { SFX.tap(); show('settings'); };
  $('bLvBack').onclick = $('bSetBack').onclick = function () { SFX.tap(); show('home'); };
  $('bSound').onclick = function () { save.sound = !save.sound; store(); setSoundLbl(); SFX.tap(); };
  $('bReset').onclick = function () { showOv('ovConfirm'); };
  $('bResetNo').onclick = hideOv;
  $('bResetYes').onclick = function () { save = { unlocked: 1, done: {}, sound: save.sound, wins: 0 }; store(); hideOv(); toast('Progress reset'); };
  $('bBack').onclick = function () { SFX.tap(); show('home'); };
  $('bRestart').onclick = function () { SFX.tap(); startLevel(game.n); };
  $('bUndo').onclick = function () { if (game.view.pending.length || game.view.moving.length) { toast('Wait for the move to finish'); return; } undo(); };
  $('bSpot').onclick = extraSpot;
  $('bNext').onclick = function () { SFX.tap(); startLevel(game.n + 1); };
  $('bWinMenu').onclick = function () { show('home'); };
  $('bRetry').onclick = function () { startLevel(game.n); };
  $('bLoseSpot').onclick = extraSpot;
  $('bLoseUndo').onclick = undo;
  $('ver').textContent = VERSION;
  if (window.JilanUpdater) { $('bUpdate').style.display = ''; $('bUpdate').onclick = function () { try { window.JilanUpdater.checkUpdate(); } catch (e) {} }; }
  setSoundLbl();

  // Android back button support (called by the app shell)
  window.__atMenu = function () { return curScreen === 'home'; };
  window.__goMenu = function () { if (curScreen === 'game' || curScreen === 'levels' || curScreen === 'settings') show('home'); };

  // test/debug hooks (used by the automated playtest; harmless for players)
  window.JBJ_debug = {
    start: startLevel, tap: tapVehicle, state: function () { return game && game.logic; }, view: function () { return game && game.view; },
    solution: function (n) { return LEVELS[n - 1].solution.slice(); }, levels: LEVELS.length, fps: function () {
      var a = fpsS.slice().sort(function (x, y) { return x - y; }); return { median: 1000 / a[a.length >> 1], p90ms: a[Math.floor(a.length * 0.9)] }; },
    ended: function () { return game && game.ended; }, overlay: function () { return ['ovWin', 'ovLose'].filter(function (o) { return $(o).classList.contains('on'); })[0] || null; },
    lotRect: function (id) { var v = game.logic.lot.filter(function (o) { return o.id === id; })[0]; if (!v) return null; var r = lotRect(v); return { x: r.cx * SC / DPR, y: r.cy * SC / DPR }; }
  };

  window.JBJ_draw = { vehicle: drawVehicle, person: drawPerson, COLORS: COLORS, rr: rr };
  window.addEventListener('resize', resize);
  resize(); show('home');
  requestAnimationFrame(frame);
})();
