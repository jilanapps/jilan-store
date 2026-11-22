/* Jilan Bus Jam - game rules engine (shared by the game and the level generator/tests).
   Made by Dr Asif - Jilan Apps Official. */
(function (root) {
  'use strict';
  var DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
  var CAP = { 2: 4, 3: 6 };

  function isH(v) { return v.dir === 'L' || v.dir === 'R'; }
  function cells(v) {
    var a = [];
    for (var i = 0; i < v.len; i++) a.push(isH(v) ? [v.x + i, v.y] : [v.x, v.y + i]);
    return a;
  }
  function front(v) {
    switch (v.dir) {
      case 'R': return [v.x + v.len - 1, v.y];
      case 'D': return [v.x, v.y + v.len - 1];
      default: return [v.x, v.y];
    }
  }
  function occupancy(state) {
    var g = {};
    for (var i = 0; i < state.lot.length; i++) {
      var v = state.lot[i], c = cells(v);
      for (var j = 0; j < c.length; j++) g[c[j][0] + ',' + c[j][1]] = v.id;
    }
    return g;
  }
  /* Returns null when the vehicle can drive out, else {dist, by}. */
  function blocker(state, v, occ) {
    occ = occ || occupancy(state);
    var d = DIRS[v.dir], f = front(v), x = f[0] + d[0], y = f[1] + d[1], dist = 0;
    while (x >= 0 && y >= 0 && x < state.w && y < state.h) {
      var o = occ[x + ',' + y];
      if (o !== undefined && o !== v.id) return { dist: dist, by: o };
      x += d[0]; y += d[1]; dist++;
    }
    return null;
  }
  function newState(level) {
    var lot = level.vehicles.map(function (v, i) {
      return { id: i, x: v.x, y: v.y, len: v.len, dir: v.dir, color: v.color, cap: CAP[v.len] };
    });
    var q = typeof level.queue === 'string' ? level.queue.split('').map(Number) : level.queue.slice();
    return { w: level.w, h: level.h, bays: level.bays || 5, maxBays: 6, lot: lot,
      bayV: [null, null, null, null, null, null], queue: q, qi: 0, taps: [] };
  }
  function clone(s) { return JSON.parse(JSON.stringify(s)); }
  function findLot(state, id) {
    for (var i = 0; i < state.lot.length; i++) if (state.lot[i].id === id) return i;
    return -1;
  }
  function freeBay(state) {
    for (var b = 0; b < state.bays; b++) if (!state.bayV[b]) return b;
    return -1;
  }
  function board(state) {
    var ev = [];
    while (state.qi < state.queue.length) {
      var c = state.queue[state.qi], hit = -1;
      for (var b = 0; b < state.bays; b++) {
        var bv = state.bayV[b];
        if (bv && bv.color === c && bv.filled < bv.cap) { hit = b; break; }
      }
      if (hit < 0) break;
      var t = state.bayV[hit];
      t.filled++;
      ev.push({ t: 'board', bay: hit, id: t.id, color: c, qi: state.qi });
      state.qi++;
      if (t.filled === t.cap) { ev.push({ t: 'depart', bay: hit, id: t.id }); state.bayV[hit] = null; }
    }
    return ev;
  }
  function tap(state, id) {
    var i = findLot(state, id);
    if (i < 0) return { ok: false, reason: 'gone' };
    var v = state.lot[i], bl = blocker(state, v);
    if (bl) return { ok: false, reason: 'blocked', dist: bl.dist, by: bl.by };
    var b = freeBay(state);
    if (b < 0) return { ok: false, reason: 'full' };
    state.lot.splice(i, 1);
    state.bayV[b] = { id: v.id, color: v.color, cap: v.cap, filled: 0, len: v.len };
    state.taps.push(id);
    var ev = [{ t: 'exit', id: v.id, bay: b, v: v }];
    return { ok: true, events: ev.concat(board(state)) };
  }
  function addBay(state) {
    if (state.bays >= state.maxBays) return [];
    state.bays++;
    return board(state);
  }
  function isWon(state) { return state.lot.length === 0 && state.qi >= state.queue.length; }
  function isStuck(state) {
    if (isWon(state)) return false;
    return freeBay(state) < 0; // boarding is greedy, so full bays here means nobody can board
  }
  function exitable(state) {
    var occ = occupancy(state), r = [];
    for (var i = 0; i < state.lot.length; i++) if (!blocker(state, state.lot[i], occ)) r.push(state.lot[i].id);
    return r;
  }
  /* Replays a tap list from scratch; returns true if it wins without getting stuck. */
  function verify(level, sol) {
    var s = newState(level);
    for (var i = 0; i < sol.length; i++) {
      var r = tap(s, sol[i]);
      if (!r.ok) return false;
      if (isStuck(s)) return false;
    }
    return isWon(s);
  }
  var api = { DIRS: DIRS, CAP: CAP, cells: cells, front: front, isH: isH, occupancy: occupancy,
    blocker: blocker, newState: newState, clone: clone, tap: tap, board: board, addBay: addBay,
    isWon: isWon, isStuck: isStuck, exitable: exitable, verify: verify, freeBay: freeBay };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JBJEngine = api;
})(this);
