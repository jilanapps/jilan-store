'use strict';
/* Jilan Puzzle Master — UI + game flow. Requires engine.js (global PMEngine). */
(function () {
  var E = (typeof PMEngine !== 'undefined') ? PMEngine : (typeof require !== 'undefined' ? require('./engine.js') : null);
  if (!E) throw new Error('PMEngine missing');

  /* ---------- Config ---------- */
  var LEVELS = [
    { target: 1150, moves: 30, colors: 5 }, { target: 1200, moves: 30, colors: 5 },
    { target: 1200, moves: 29, colors: 5 }, { target: 1200, moves: 29, colors: 5 },
    { target: 1150, moves: 28, colors: 5 }, { target: 1100, moves: 28, colors: 5 },
    { target: 900, moves: 27, colors: 6 },  { target: 850, moves: 27, colors: 6 },
    { target: 900, moves: 26, colors: 6 },  { target: 850, moves: 26, colors: 6 },
    { target: 950, moves: 25, colors: 6 },   { target: 900, moves: 25, colors: 6 },
    { target: 900, moves: 24, colors: 6 },   { target: 800, moves: 24, colors: 7 },
    { target: 750, moves: 23, colors: 7 },   { target: 700, moves: 23, colors: 7 },
    { target: 700, moves: 22, colors: 7 },   { target: 800, moves: 22, colors: 7 },
    { target: 800, moves: 21, colors: 7 },   { target: 800, moves: 20, colors: 7 }
  ];
  var DAILY = { target: 1200, moves: 25, colors: 6, reward: 50 };
  var SYMBOLS = {
    classic: ['\u25CF', '\u25B2', '\u25A0', '\u2605', '\u2665', '\u25C6', '\u2B1F'],
    fruits: ['\uD83C\uDF4E', '\uD83C\uDF4A', '\uD83C\uDF4B', '\uD83C\uDF47', '\uD83E\uDED0', '\uD83C\uDF49', '\uD83C\uDF52'],
    neon: ['\uD83D\uDD34', '\uD83D\uDFE0', '\uD83D\uDFE1', '\uD83D\uDFE2', '\uD83D\uDD35', '\uD83D\uDFE3', '\uD83D\uDC96']
  };
  var THEMES = [
    { id: 'royal', name: 'Royal Purple', cost: 0 },
    { id: 'ocean', name: 'Ocean Blue', cost: 100 },
    { id: 'sunset', name: 'Sunset Glow', cost: 200 },
    { id: 'forest', name: 'Forest Green', cost: 300 },
    { id: 'midnight', name: 'Midnight', cost: 400 }
  ];
  var TILESETS = [
    { id: 'classic', name: 'Classic Gems', cost: 0 },
    { id: 'fruits', name: 'Fruity Fun', cost: 150 },
    { id: 'neon', name: 'Neon Pop', cost: 250 }
  ];

  /* ---------- Future AdMob integration point ----------
     When publishing with ads: add the AdMob SDK / plugin here and replace
     Ads.showRewarded() with a real rewarded-ad call. The game is fully
     playable without ads; no fake ads are ever shown. */
  var Ads = {
    showRewarded: function () { return Promise.resolve(false); },
    init: function () { /* no-op until AdMob is integrated */ }
  };

  /* ---------- Save ---------- */
  var SAVE_KEY = 'jpm_save_v1';
  var save = loadSave();
  function loadSave() {
    var d = { coins: 0, unlocked: 1, stars: {}, best: {}, theme: 'royal', tiles: 'classic',
      ownedThemes: ['royal'], ownedTiles: ['classic'],
      sound: true, vibrate: true, hc: false, daily: {} };
    try {
      var s = localStorage.getItem(SAVE_KEY);
      if (s) { var p = JSON.parse(s); for (var k in d) if (p[k] !== undefined) d[k] = p[k]; }
    } catch (e) {}
    return d;
  }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

  /* ---------- Sound ---------- */
  var Sfx = {
    ctx: null,
    ensure: function () {
      if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    tone: function (f, d, type, v, when) {
      if (!save.sound) return;
      this.ensure(); if (!this.ctx) return;
      type = type || 'sine'; v = v || 0.14; when = when || 0;
      var t = this.ctx.currentTime + when;
      var o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + d + 0.03);
    },
    click: function () { this.tone(620, 0.06); },
    swap: function () { this.tone(440, 0.08); },
    invalid: function () { this.tone(150, 0.16, 'sawtooth', 0.1); },
    match: function (ch) { var b = 500 + ch * 90; this.tone(b, 0.12); this.tone(b * 1.26, 0.12, 'sine', 0.11, 0.07); },
    win: function () { var self = this; [523, 659, 784, 1047].forEach(function (f, i) { self.tone(f, 0.2, 'sine', 0.14, i * 0.13); }); },
    lose: function () { var self = this; [380, 300, 220].forEach(function (f, i) { self.tone(f, 0.22, 'sine', 0.11, i * 0.16); }); }
  };
  document.addEventListener('pointerdown', function initAudio() {
    Sfx.ensure(); document.removeEventListener('pointerdown', initAudio);
  });

  function vibrate(ms) {
    if (save.vibrate && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- Navigation ---------- */
  var modalStack = [];
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    $('scr-' + id).classList.add('active');
    window.scrollTo(0, 0);
  }
  function openModal(id) { $(id).classList.remove('hidden'); modalStack.push(id); }
  function closeModal(id) {
    $(id).classList.add('hidden');
    var i = modalStack.indexOf(id);
    if (i >= 0) modalStack.splice(i, 1);
  }
  function closeTopModal() { if (modalStack.length) closeModal(modalStack[modalStack.length - 1]); }
  // Called by Android wrapper back button
  window.onAndroidBack = function () {
    if (modalStack.length) { closeTopModal(); return; }
    if ($('scr-game').classList.contains('active')) { pauseGame(); return; }
    if (!$('scr-home').classList.contains('active')) { showScreen('home'); renderHome(); return; }
    try { if (window.Android && Android.exitApp) Android.exitApp(); } catch (e) {}
  };
  document.querySelectorAll('[data-go]').forEach(function (b) {
    b.addEventListener('click', function () { Sfx.click(); showScreen(b.getAttribute('data-go')); if (b.getAttribute('data-go') === 'home') renderHome(); });
  });

  function applyPrefs() {
    document.body.setAttribute('data-theme', save.theme);
    document.body.setAttribute('data-tiles', save.tiles);
    document.body.classList.toggle('hc', !!save.hc);
    $('coinCount').textContent = save.coins;
    $('btnSoundTop').textContent = save.sound ? '\uD83D\uDD0A' : '\uD83D\uDD07';
  }

  /* ---------- Home ---------- */
  function dateKey() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function seedFrom(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function renderHome() {
    applyPrefs();
    var totalStars = 0, i;
    for (i = 0; i < 20; i++) totalStars += (save.stars[i] || 0);
    var done = save.daily[dateKey()];
    $('homeProgress').innerHTML =
      'Level ' + Math.min(save.unlocked, 20) + ' of 20 &nbsp;\u2022&nbsp; \u2B50 ' + totalStars + '/60' +
      (done ? ' &nbsp;\u2022&nbsp; <span class="daily-done">Daily done \u2713</span>' : '');
    $('btnDaily').innerHTML = done ? '\uD83D\uDCC5 Daily Challenge \u2713' : '\uD83D\uDCC5 Daily Challenge';
  }

  /* ---------- Level select ---------- */
  function renderLevels() {
    var g = $('levelGrid'); g.innerHTML = '';
    for (var i = 0; i < 20; i++) {
      (function (i) {
        var b = document.createElement('button');
        var locked = i >= save.unlocked;
        var st = save.stars[i] || 0;
        b.className = 'lvl' + (locked ? ' locked' : '') + (i === save.unlocked - 1 ? ' current' : '');
        b.innerHTML = '<span>' + (locked ? '\uD83D\uDD12' : (i + 1)) + '</span><span class="stars">' +
          (locked ? '' : ('\u2605'.repeat(st) + '\u2606'.repeat(3 - st))) + '</span>';
        if (!locked) b.addEventListener('click', function () { Sfx.click(); startLevel(i); });
        g.appendChild(b);
      })(i);
    }
  }

  /* ---------- Game state ---------- */
  var G = {
    active: false, busy: false, paused: false, over: false,
    mode: 'level', levelIdx: 0, label: '', target: 0, moves: 0, colors: 5,
    score: 0, grid: [], els: {}, nextId: 1, sel: null, rng: null
  };

  function intBoard() {
    var b = [], r, c;
    for (r = 0; r < 8; r++) { b.push([]); for (c = 0; c < 8; c++) b[r].push(G.grid[r][c].type); }
    return b;
  }
  function sym(t) { return SYMBOLS[save.tiles][t % SYMBOLS[save.tiles].length]; }

  function buildGrid(rng, nColors) {
    var ib = E.newBoard(nColors, rng), r, c;
    G.grid = [];
    for (r = 0; r < 8; r++) {
      G.grid.push([]);
      for (c = 0; c < 8; c++) G.grid[r].push({ id: G.nextId++, type: ib[r][c] });
    }
  }

  function renderBoard() {
    var board = $('board'), r, c, tile, el, inner;
    for (r = 0; r < 8; r++) for (c = 0; c < 8; c++) {
      tile = G.grid[r][c];
      el = G.els[tile.id];
      if (!el) {
        el = document.createElement('div');
        inner = document.createElement('div');
        inner.className = 'in';
        el.appendChild(inner);
        el._in = inner;
        board.appendChild(el);
        G.els[tile.id] = el;
        if (tile._spawnTop !== undefined) {
          el.style.transition = 'none';
          el.style.top = (tile._spawnTop * 12.5) + '%';
          el.style.left = (c * 12.5) + '%';
          void el.offsetWidth;
          el.style.transition = '';
          delete tile._spawnTop;
        }
      }
      el.className = 'tile t' + tile.type + ((G.sel && G.sel.r === r && G.sel.c === c) ? ' sel' : '');
      el._in.textContent = sym(tile.type);
      el.style.top = (r * 12.5) + '%';
      el.style.left = (c * 12.5) + '%';
      el._r = r; el._c = c;
    }
  }

  function clearBoard() {
    var board = $('board');
    board.innerHTML = '';
    G.els = {}; G.sel = null;
  }

  function updateHUD() {
    $('hudLevel').textContent = G.label;
    $('hudScore').textContent = G.score + ' / ' + G.target;
    $('scoreFill').style.width = Math.min(100, (G.score / G.target) * 100) + '%';
    $('hudMoves').textContent = 'Moves: ' + G.moves;
    $('hudMoves').classList.toggle('low', G.moves <= 5);
  }
  function showMsg(t) {
    var m = $('gameMsg');
    m.textContent = t || '';
    if (t) setTimeout(function () { if (m.textContent === t) m.textContent = ''; }, 2600);
  }
  function showCombo(t) {
    var b = $('comboBanner');
    b.textContent = t;
    b.classList.add('show');
    setTimeout(function () { b.classList.remove('show'); }, 900);
  }

  function startGame(opts) {
    G.active = true;
    G.mode = opts.mode; G.levelIdx = opts.levelIdx || 0;
    G.label = opts.label; G.target = opts.target; G.moves = opts.moves; G.colors = opts.colors;
    G.score = 0; G.busy = false; G.paused = false; G.over = false; G.nextId = 1;
    G.rng = opts.rng;
    clearBoard();
    buildGrid(G.rng, G.colors);
    // safety: ensure openable
    var ib = intBoard();
    if (!E.hasMoves(ib)) { E.shuffleBoard(ib, G.rng, G.colors); for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) G.grid[r][c].type = ib[r][c]; }
    renderBoard(); updateHUD();
    $('btnShuffle').classList.add('hidden');
    showMsg('');
    showScreen('game');
  }
  function startLevel(i) {
    var L = LEVELS[i];
    startGame({ mode: 'level', levelIdx: i, label: 'Level ' + (i + 1), target: L.target, moves: L.moves, colors: L.colors, rng: Math.random });
  }
  function startDaily() {
    var key = dateKey();
    startGame({ mode: 'daily', label: 'Daily', target: DAILY.target, moves: DAILY.moves, colors: DAILY.colors, rng: E.mulberry32(seedFrom('jpm' + key)) });
  }

  function adjacent(a, b) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1; }

  function swapGrid(a, b) {
    var t = G.grid[a.r][a.c]; G.grid[a.r][a.c] = G.grid[b.r][b.c]; G.grid[b.r][b.c] = t;
  }

  async function trySwap(a, b) {
    if (G.busy || G.paused || G.over || !G.active) return;
    if (!adjacent(a, b)) return;
    G.busy = true; G.sel = null;
    swapGrid(a, b); renderBoard(); Sfx.swap();
    await sleep(250);
    if (E.findMatches(intBoard()).size === 0) {
      // invalid: swap back
      swapGrid(a, b); renderBoard(); Sfx.invalid(); vibrate(40);
      [a, b].forEach(function (p) {
        var el = G.els[G.grid[p.r][p.c].id];
        if (el) { el.classList.add('shake'); setTimeout(function () { el.classList.remove('shake'); }, 320); }
      });
      await sleep(250);
      G.busy = false;
      return;
    }
    G.moves--; updateHUD();
    var chain = 0;
    while (true) {
      var groups = E.matchGroups(intBoard());
      if (!groups.length || chain > 40) break;
      chain++;
      var uniq = new Set();
      groups.forEach(function (g) { g.forEach(function (k) { uniq.add(k); }); });
      var pts = E.stepScore(groups, uniq.size, chain);
      G.score += pts;
      if (chain >= 2) showCombo('Combo x' + chain + '!');
      uniq.forEach(function (k) {
        var r = (k / 8) | 0, c = k % 8;
        var el = G.els[G.grid[r][c].id];
        if (el) el.classList.add('pop');
      });
      Sfx.match(chain); vibrate(chain >= 2 ? 70 : 25);
      updateHUD();
      await sleep(300);
      clearAndDrop(uniq);
      renderBoard();
      await sleep(300);
    }
    updateHUD();
    if (G.score >= G.target) { endLevel(true); return; }
    if (G.moves <= 0) { endLevel(false); return; }
    if (!E.hasMoves(intBoard())) {
      showMsg('No moves left!');
      $('btnShuffle').classList.remove('hidden');
    }
    G.busy = false;
  }

  function clearAndDrop(uniq) {
    var r, c, k;
    // remove popped elements
    uniq.forEach(function (key) {
      r = (key / 8) | 0; c = key % 8;
      var id = G.grid[r][c].id;
      var el = G.els[id];
      if (el && el.parentNode) el.parentNode.removeChild(el);
      delete G.els[id];
    });
    for (c = 0; c < 8; c++) {
      var col = [];
      for (r = 0; r < 8; r++) {
        k = r * 8 + c;
        if (!uniq.has(k)) col.push(G.grid[r][c]);
      }
      var need = 8 - col.length, fresh = [], i;
      for (i = 0; i < need; i++) {
        fresh.push({ id: G.nextId++, type: Math.floor(G.rng() * G.colors), _spawnTop: -(need - i) });
      }
      var full = fresh.concat(col);
      for (r = 0; r < 8; r++) G.grid[r][c] = full[r];
    }
  }

  function doShuffle() {
    if (G.busy || G.over) return;
    Sfx.click();
    var ib = intBoard();
    if (E.shuffleBoard(ib, G.rng, G.colors)) {
      for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) G.grid[r][c].type = ib[r][c];
      renderBoard();
      $('btnShuffle').classList.add('hidden');
      showMsg('Shuffled! \uD83D\uDD00');
    }
  }

  function starsFor(score, target) {
    if (score >= target * 2.2) return 3;
    if (score >= target * 1.6) return 2;
    return 1;
  }

  function endLevel(win) {
    G.over = true; G.busy = false;
    if (win) {
      var stars = starsFor(G.score, G.target), coins = 20 + stars * 10, bonus = '';
      if (G.mode === 'level') {
        var i = G.levelIdx;
        if (stars > (save.stars[i] || 0)) save.stars[i] = stars;
        if (G.score > (save.best[i] || 0)) { save.best[i] = G.score; coins += 10; bonus = 'New best! +10'; }
        if (i + 1 < 20) save.unlocked = Math.max(save.unlocked, i + 2);
        else save.unlocked = 20;
      } else {
        var key = dateKey();
        if (!save.daily[key]) { save.daily[key] = true; coins += DAILY.reward; bonus = 'Daily bonus! +' + DAILY.reward; }
        else { coins = 20 + stars * 10; }
      }
      save.coins += coins; persist(); applyPrefs();
      Sfx.win(); vibrate([40, 60, 40]);
      var sHtml = '';
      for (var s = 0; s < 3; s++) sHtml += '<span class="' + (s < stars ? '' : 'off') + '">\u2B50</span>';
      $('endTitle').textContent = '\uD83C\uDF89 Level Complete!';
      $('endStars').innerHTML = sHtml;
      $('endScore').textContent = 'Score: ' + G.score + '  (target ' + G.target + ')';
      $('endCoins').textContent = '+' + coins + ' coins' + (bonus ? ' \u2022 ' + bonus : '');
      $('btnNext').classList.toggle('hidden', !(G.mode === 'level' && G.levelIdx + 1 < 20));
      openModal('modal-end');
    } else {
      Sfx.lose();
      $('endTitle').textContent = '\uD83D\uDE22 Out of moves!';
      $('endStars').innerHTML = '';
      $('endScore').textContent = 'Score: ' + G.score + ' / ' + G.target;
      $('endCoins').textContent = 'Try again \u2014 you can do it!';
      $('btnNext').classList.add('hidden');
      openModal('modal-end');
    }
  }

  function pauseGame() {
    if (!G.active || G.over) return;
    G.paused = true;
    openModal('modal-pause');
  }
  function resumeGame() { G.paused = false; closeModal('modal-pause'); }

  /* ---------- Input: tap-tap + swipe ---------- */
  var pDown = null;
  function tileFromEvent(e) {
    var el = e.target.closest ? e.target.closest('.tile') : null;
    if (!el || el._r === undefined) return null;
    return { r: el._r, c: el._c };
  }
  function bindInput() {
    var board = $('board');
    board.addEventListener('pointerdown', function (e) {
      if (G.busy || G.paused || G.over || !G.active) return;
      var t = tileFromEvent(e);
      if (t) pDown = { r: t.r, c: t.c, x: e.clientX, y: e.clientY };
    });
    board.addEventListener('pointermove', function (e) {
      if (!pDown || G.busy || G.paused || G.over) return;
      var dx = e.clientX - pDown.x, dy = e.clientY - pDown.y;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      var from = { r: pDown.r, c: pDown.c };
      var t = { r: from.r, c: from.c };
      if (Math.abs(dx) > Math.abs(dy)) t.c += dx > 0 ? 1 : -1;
      else t.r += dy > 0 ? 1 : -1;
      pDown = null;
      if (t.r >= 0 && t.r < 8 && t.c >= 0 && t.c < 8) trySwap(from, t);
    });
    board.addEventListener('pointerup', function (e) {
      if (!pDown) return;
      var t = tileFromEvent(e);
      var from = { r: pDown.r, c: pDown.c };
      pDown = null;
      if (G.busy || G.paused || G.over || !G.active) return;
      if (!t) return;
      if (G.sel && G.sel.r === t.r && G.sel.c === t.c) { G.sel = null; renderBoard(); return; }
      if (G.sel && adjacent(G.sel, t)) { var a = G.sel; G.sel = null; trySwap(a, t); return; }
      G.sel = t; Sfx.click(); renderBoard();
    });
    board.addEventListener('pointercancel', function () { pDown = null; });
    board.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  /* ---------- Shop ---------- */
  var THEME_SW = { royal: 'linear-gradient(135deg,#7c3aed,#4c1d95)', ocean: 'linear-gradient(135deg,#0284c7,#0c4a6e)', sunset: 'linear-gradient(135deg,#ea580c,#9a3412)', forest: 'linear-gradient(135deg,#16a34a,#14532d)', midnight: 'linear-gradient(135deg,#334155,#020617)' };
  function renderShop() {
    $('shopCoins').textContent = save.coins;
    var tl = $('themeList'); tl.innerHTML = '';
    THEMES.forEach(function (th) {
      var owned = save.ownedThemes.indexOf(th.id) >= 0;
      var sel = save.theme === th.id;
      var row = document.createElement('div');
      row.className = 'shop-item';
      row.innerHTML = '<div class="sw" style="background:' + THEME_SW[th.id] + '"></div>' +
        '<div class="nm">' + esc(th.name) + '<small>' + (th.cost ? '\uD83E\uDE99 ' + th.cost + ' coins' : 'Default') + '</small></div>';
      var b = document.createElement('button');
      b.className = 'buy-btn' + (sel ? ' selected' : '') + (owned && !sel ? ' owned' : '');
      b.textContent = sel ? '\u2713 Selected' : (owned ? 'Select' : '\uD83E\uDE99 ' + th.cost);
      b.addEventListener('click', function () {
        if (save.theme === th.id) return;
        if (save.ownedThemes.indexOf(th.id) < 0) {
          if (save.coins < th.cost) { Sfx.invalid(); alert('Not enough coins! Play levels to earn more.'); return; }
          save.coins -= th.cost; save.ownedThemes.push(th.id);
        }
        save.theme = th.id; persist(); applyPrefs(); renderShop(); Sfx.click();
      });
      row.appendChild(b); tl.appendChild(row);
    });
    var sl = $('tileList'); sl.innerHTML = '';
    TILESETS.forEach(function (ts) {
      var owned = save.ownedTiles.indexOf(ts.id) >= 0;
      var sel = save.tiles === ts.id;
      var row = document.createElement('div');
      row.className = 'shop-item';
      var prev = SYMBOLS[ts.id].slice(0, 4).join(' ');
      row.innerHTML = '<div class="sw" style="background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:18px;">' + prev + '</div>' +
        '<div class="nm">' + esc(ts.name) + '<small>' + (ts.cost ? '\uD83E\uDE99 ' + ts.cost + ' coins' : 'Default') + '</small></div>';
      var b = document.createElement('button');
      b.className = 'buy-btn' + (sel ? ' selected' : '') + (owned && !sel ? ' owned' : '');
      b.textContent = sel ? '\u2713 Selected' : (owned ? 'Select' : '\uD83E\uDE99 ' + ts.cost);
      b.addEventListener('click', function () {
        if (save.tiles === ts.id) return;
        if (save.ownedTiles.indexOf(ts.id) < 0) {
          if (save.coins < ts.cost) { Sfx.invalid(); alert('Not enough coins! Play levels to earn more.'); return; }
          save.coins -= ts.cost; save.ownedTiles.push(ts.id);
        }
        save.tiles = ts.id; persist(); applyPrefs(); renderShop(); Sfx.click();
      });
      row.appendChild(b); sl.appendChild(row);
    });
  }

  /* ---------- Settings ---------- */
  function bindToggle(id, key, cb) {
    var b = $(id);
    function paint() { b.classList.toggle('on', !!save[key]); }
    paint();
    b.addEventListener('click', function () { save[key] = !save[key]; persist(); paint(); Sfx.click(); if (cb) cb(); });
  }

  /* ---------- Wire up ---------- */
  function init() {
    applyPrefs(); renderHome();
    $('btnPlay').addEventListener('click', function () { Sfx.click(); renderLevels(); showScreen('levels'); });
    $('btnDaily').addEventListener('click', function () { Sfx.click(); startDaily(); });
    $('btnShop').addEventListener('click', function () { Sfx.click(); renderShop(); showScreen('shop'); });
    $('btnSettings').addEventListener('click', function () { Sfx.click(); showScreen('settings'); });
    $('btnSoundTop').addEventListener('click', function () { save.sound = !save.sound; persist(); applyPrefs(); Sfx.click(); });

    $('btnPause').addEventListener('click', function () { Sfx.click(); pauseGame(); });
    $('btnResume').addEventListener('click', function () { Sfx.click(); resumeGame(); });
    $('btnRestartP').addEventListener('click', function () {
      Sfx.click(); closeModal('modal-pause'); G.paused = false;
      if (G.mode === 'level') startLevel(G.levelIdx); else startDaily();
    });
    $('btnQuitP').addEventListener('click', function () { Sfx.click(); closeModal('modal-pause'); G.active = false; G.paused = false; showScreen('home'); renderHome(); });

    $('btnShuffle').addEventListener('click', doShuffle);

    $('btnNext').addEventListener('click', function () { Sfx.click(); closeModal('modal-end'); startLevel(G.levelIdx + 1); });
    $('btnReplay').addEventListener('click', function () { Sfx.click(); closeModal('modal-end'); if (G.mode === 'level') startLevel(G.levelIdx); else startDaily(); });
    $('btnHomeE').addEventListener('click', function () { Sfx.click(); closeModal('modal-end'); G.active = false; showScreen('home'); renderHome(); });

    bindToggle('tgSound', 'sound', applyPrefs);
    bindToggle('tgVibrate', 'vibrate');
    bindToggle('tgContrast', 'hc', applyPrefs);
    $('btnReset').addEventListener('click', function () {
      if (confirm('Reset ALL progress, coins and settings?')) {
        try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
        location.reload();
      }
    });

    bindInput();
    G.active = false;
    Ads.init();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // export for tests
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LEVELS: LEVELS, starsFor: starsFor, seedFrom: seedFrom, DAILY: DAILY };
  }
})();
