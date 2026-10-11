'use strict';
/* Jilan Puzzle Master — pure match-3 engine (no DOM). Testable in node. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.PMEngine = factory();
}(typeof self !== 'undefined' ? self : this, function () {

  var ROWS = 8, COLS = 8;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randInt(rng, n) { return Math.floor(rng() * n); }

  // Board with no pre-existing matches. Cells are ints 0..nColors-1.
  function newBoard(nColors, rng) {
    var b = [];
    for (var r = 0; r < ROWS; r++) {
      b.push([]);
      for (var c = 0; c < COLS; c++) {
        var t, guard = 0;
        do {
          t = randInt(rng, nColors); guard++;
        } while (guard < 100 && (
          (c >= 2 && b[r][c - 1] === t && b[r][c - 2] === t) ||
          (r >= 2 && b[r - 1][c] === t && b[r - 2][c] === t)
        ));
        b[r].push(t);
      }
    }
    return b;
  }

  // Set of cell keys (r*COLS+c) that are part of any 3+ run. -1 cells ignored.
  function findMatches(b) {
    var s = new Set(), r, c, k, t, i;
    for (r = 0; r < ROWS; r++) {
      c = 0;
      while (c < COLS) {
        t = b[r][c];
        if (t < 0) { c++; continue; }
        k = c;
        while (k < COLS && b[r][k] === t) k++;
        if (k - c >= 3) for (i = c; i < k; i++) s.add(r * COLS + i);
        c = k;
      }
    }
    for (c = 0; c < COLS; c++) {
      r = 0;
      while (r < ROWS) {
        t = b[r][c];
        if (t < 0) { r++; continue; }
        k = r;
        while (k < ROWS && b[k][c] === t) k++;
        if (k - r >= 3) for (i = r; i < k; i++) s.add(i * COLS + c);
        r = k;
      }
    }
    return s;
  }

  // Row/col runs as arrays of keys (for length bonuses).
  function matchGroups(b) {
    var groups = [], seen = new Set(), r, c, k, t, i, g, key, fresh;
    for (r = 0; r < ROWS; r++) {
      c = 0;
      while (c < COLS) {
        t = b[r][c];
        if (t < 0) { c++; continue; }
        k = c;
        while (k < COLS && b[r][k] === t) k++;
        if (k - c >= 3) {
          g = [];
          for (i = c; i < k; i++) { key = r * COLS + i; g.push(key); seen.add(key); }
          groups.push(g);
        }
        c = k;
      }
    }
    for (c = 0; c < COLS; c++) {
      r = 0;
      while (r < ROWS) {
        t = b[r][c];
        if (t < 0) { r++; continue; }
        k = r;
        while (k < ROWS && b[k][c] === t) k++;
        if (k - r >= 3) {
          g = []; fresh = false;
          for (i = r; i < k; i++) {
            key = i * COLS + c; g.push(key);
            if (!seen.has(key)) { seen.add(key); fresh = true; }
          }
          if (fresh) groups.push(g);
        }
        r = k;
      }
    }
    return groups;
  }

  function stepScore(groups, uniqueCount, chain) {
    var runBonus = 0, i;
    for (i = 0; i < groups.length; i++) runBonus += Math.max(0, groups[i].length - 3) * 30;
    return (uniqueCount * 10 + runBonus) * chain;
  }

  function createsMatch(b, r, c) {
    var t = b[r][c], n, i;
    if (t < 0) return false;
    n = 1;
    for (i = c - 1; i >= 0 && b[r][i] === t; i--) n++;
    for (i = c + 1; i < COLS && b[r][i] === t; i++) n++;
    if (n >= 3) return true;
    n = 1;
    for (i = r - 1; i >= 0 && b[i][c] === t; i--) n++;
    for (i = r + 1; i < ROWS && b[i][c] === t; i++) n++;
    return n >= 3;
  }

  function swapCells(b, r1, c1, r2, c2) {
    var t = b[r1][c1]; b[r1][c1] = b[r2][c2]; b[r2][c2] = t;
  }

  // Does swapping these two adjacent cells create a match?
  function swapCreatesMatch(b, r1, c1, r2, c2) {
    swapCells(b, r1, c1, r2, c2);
    var ok = createsMatch(b, r1, c1) || createsMatch(b, r2, c2);
    swapCells(b, r1, c1, r2, c2);
    return ok;
  }

  function hasMoves(b) {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      if (c + 1 < COLS && swapCreatesMatch(b, r, c, r, c + 1)) return true;
      if (r + 1 < ROWS && swapCreatesMatch(b, r, c, r + 1, c)) return true;
    }
    return false;
  }

  function findAnyMove(b) {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      if (c + 1 < COLS && swapCreatesMatch(b, r, c, r, c + 1)) return [r, c, r, c + 1];
      if (r + 1 < ROWS && swapCreatesMatch(b, r, c, r + 1, c)) return [r, c, r + 1, c];
    }
    return null;
  }

  // Gravity + refill. Mutates b.
  function dropFill(b, rng, nColors) {
    for (var c = 0; c < COLS; c++) {
      var w = ROWS - 1, r;
      for (r = ROWS - 1; r >= 0; r--) {
        if (b[r][c] >= 0) { b[w][c] = b[r][c]; w--; }
      }
      for (r = w; r >= 0; r--) b[r][c] = randInt(rng, nColors);
    }
  }

  // Shuffle tile multiset until no matches and at least one move exists.
  function shuffleBoard(b, rng, nColors) {
    var flat = [], r, c, t, i, j, x, k;
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) flat.push(b[r][c]);
    for (t = 0; t < 300; t++) {
      for (i = flat.length - 1; i > 0; i--) {
        j = Math.floor(rng() * (i + 1)); x = flat[i]; flat[i] = flat[j]; flat[j] = x;
      }
      k = 0;
      for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) b[r][c] = flat[k++];
      if (findMatches(b).size === 0 && hasMoves(b)) return true;
    }
    var nb = newBoard(nColors, rng);
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) b[r][c] = nb[r][c];
    return hasMoves(b);
  }

  // Greedy bot for difficulty calibration. Returns {score, movesUsed}.
  function simulate(nColors, moves, rng) {
    var b = newBoard(nColors, rng), score = 0, m = 0, chain, groups, uniq, mv;
    while (m < moves) {
      mv = findAnyMove(b);
      if (!mv) break;
      swapCells(b, mv[0], mv[1], mv[2], mv[3]);
      m++;
      chain = 0;
      for (;;) {
        groups = matchGroups(b);
        if (!groups.length || chain > 60) break;
        chain++;
        uniq = new Set();
        groups.forEach(function (g) { g.forEach(function (k) { uniq.add(k); }); });
        score += stepScore(groups, uniq.size, chain);
        uniq.forEach(function (k) { b[(k / COLS) | 0][k % COLS] = -1; });
        dropFill(b, rng, nColors);
      }
    }
    return { score: score, movesUsed: m };
  }

  return {
    ROWS: ROWS, COLS: COLS,
    mulberry32: mulberry32,
    newBoard: newBoard,
    findMatches: findMatches,
    matchGroups: matchGroups,
    stepScore: stepScore,
    createsMatch: createsMatch,
    swapCells: swapCells,
    swapCreatesMatch: swapCreatesMatch,
    hasMoves: hasMoves,
    findAnyMove: findAnyMove,
    dropFill: dropFill,
    shuffleBoard: shuffleBoard,
    simulate: simulate
  };
}));
