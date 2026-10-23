'use strict';
/* ============================================================
   LUDO DANGAL — pure game logic (no DOM). v2.0
   v1.0 core rules unchanged (harness-proven). v2.0 adds
   LD.botChooseLevel: Easy / Medium / Hard bot difficulties.
   Works in browser (<script src>) and node (module.exports).
   Board: classic 15x15 Ludo. 52-tile main track, 4 bases,
   5-cell home columns, exact-roll finish.
   Pawn pos: -1 = base, 0..50 = track steps from own entry,
             51..55 = home column, 56 = finished (home).
   ============================================================ */
(function (root) {

const LD = {};

// ---- constants ------------------------------------------------
LD.COLORS = ['red', 'green', 'yellow', 'blue'];
LD.COLOR_HEX = { red: '#e63946', green: '#2a9d48', yellow: '#f4b400', blue: '#2f6fed' };
LD.COLOR_DARK = { red: '#a31621', green: '#1a6b32', yellow: '#b78700', blue: '#1d44ad' };
LD.COLOR_LIGHT = { red: '#ff7a85', green: '#5fd07e', yellow: '#ffd94d', blue: '#6b96ff' };

// 52-tile main track, [col,row] on 15x15 grid, clockwise from red entry (1,6)
LD.TRACK = [
  [1,6],[2,6],[3,6],[4,6],[5,6],
  [6,5],[6,4],[6,3],[6,2],[6,1],[6,0],
  [7,0],[8,0],
  [8,1],[8,2],[8,3],[8,4],[8,5],
  [9,6],[10,6],[11,6],[12,6],[13,6],[14,6],
  [14,7],[14,8],
  [13,8],[12,8],[11,8],[10,8],[9,8],
  [8,9],[8,10],[8,11],[8,12],[8,13],[8,14],
  [7,14],[6,14],
  [6,13],[6,12],[6,11],[6,10],[6,9],
  [5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
  [0,7],[0,6]
];
LD.ENTRY = [0, 13, 26, 39];           // track index of each color's start square
LD.SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]); // star/safe track squares

// home columns (5 cells each), then finished
LD.HOME_COL = [
  [[1,7],[2,7],[3,7],[4,7],[5,7]],     // red
  [[7,1],[7,2],[7,3],[7,4],[7,5]],     // green
  [[13,7],[12,7],[11,7],[10,7],[9,7]], // yellow
  [[7,13],[7,12],[7,11],[7,10],[7,9]]  // blue
];

// base pawn spots (cell coords, fractional = center of sub-cell)
LD.BASE_SPOTS = [
  [[1.5,1.5],[3.5,1.5],[1.5,3.5],[3.5,3.5]],       // red (top-left)
  [[10.5,1.5],[12.5,1.5],[10.5,3.5],[12.5,3.5]],   // green (top-right)
  [[10.5,10.5],[12.5,10.5],[10.5,12.5],[12.5,12.5]], // yellow (bottom-right)
  [[1.5,10.5],[3.5,10.5],[1.5,12.5],[3.5,12.5]]    // blue (bottom-left)
];

LD.FINISH_POS = 56;

// ---- state ----------------------------------------------------
LD.newGame = function (numPlayers, botFlags, humanColor) {
  // botFlags: array per player true=bot. humanColor: preferred color index for human in bot mode
  const order = [0, 1, 2, 3];
  // rotate so human (or player 0) starts first in bot mode
  let players = [];
  for (let i = 0; i < numPlayers; i++) {
    const c = order[i];
    players.push({ color: c, name: LD.COLORS[c][0].toUpperCase() + LD.COLORS[c].slice(1),
                   isBot: !!botFlags[i], pawns: [-1, -1, -1, -1] });
  }
  if (humanColor != null && botFlags.some(Boolean)) {
    // put human first
    const hi = players.findIndex(p => p.color === humanColor && !p.isBot);
    if (hi > 0) { const h = players.splice(hi, 1)[0]; players.unshift(h); }
  }
  return { players, turn: 0, dice: 0, sixStreak: 0, phase: 'roll', winner: -1, moves: 0 };
};

LD.trackIndex = function (colorIdx, pos) {
  return (LD.ENTRY[colorIdx] + pos) % 52;
};

LD.isSafeTrack = function (ti) { return LD.SAFE.has(ti); };

// legal pawn indices for player on this roll
LD.legalMoves = function (st, pi, roll) {
  const pl = st.players[pi], out = [];
  for (let i = 0; i < 4; i++) {
    const p = pl.pawns[i];
    if (p === LD.FINISH_POS) continue;
    if (p === -1) { if (roll === 6) out.push(i); }
    else if (p + roll <= LD.FINISH_POS) out.push(i);
  }
  return out;
};

// apply a chosen move; returns {captured:[pawnIdx...], finished:bool, leftBase:bool}
LD.applyMove = function (st, pi, pawnIdx, roll) {
  const pl = st.players[pi];
  const p = pl.pawns[pawnIdx];
  const res = { captured: [], finished: false, leftBase: false };
  let np;
  if (p === -1) { np = 0; res.leftBase = true; }
  else np = p + roll;
  // captures on main track, non-safe squares
  if (np <= 50) {
    const ti = LD.trackIndex(pl.color, np);
    if (!LD.isSafeTrack(ti)) {
      st.players.forEach((op, oi) => {
        if (oi === pi) return;
        op.pawns.forEach((opPos, oj) => {
          if (opPos >= 0 && opPos <= 50 && LD.trackIndex(op.color, opPos) === ti) {
            op.pawns[oj] = -1;
            res.captured.push(oj);
          }
        });
      });
    }
  }
  pl.pawns[pawnIdx] = np;
  if (np === LD.FINISH_POS) res.finished = true;
  st.moves++;
  return res;
};

LD.hasWon = function (st, pi) {
  return st.players[pi].pawns.every(p => p === LD.FINISH_POS);
};

// ---- bot AI ---------------------------------------------------
// priority: capture > leave base on 6 > move pawn closest to home > first legal
LD.botChoose = function (st, pi, roll, rng) {
  const legal = LD.legalMoves(st, pi, roll);
  if (!legal.length) return -1;
  rng = rng || Math.random;
  const pl = st.players[pi];
  // 1) capture
  let best = -1, bestScore = -1;
  for (const i of legal) {
    const p = pl.pawns[i];
    let np = (p === -1) ? 0 : p + roll;
    let score = 0;
    if (np <= 50) {
      const ti = LD.trackIndex(pl.color, np);
      if (!LD.isSafeTrack(ti)) {
        let victims = 0, danger = 0;
        st.players.forEach((op, oi) => {
          if (oi === pi) return;
          op.pawns.forEach(opPos => {
            if (opPos >= 0 && opPos <= 50 && LD.trackIndex(op.color, opPos) === ti) victims++;
          });
        });
        if (victims > 0) score = 1000 + victims * 100 + np; // capture!
      } else {
        score = 100 + np; // safe landing is nice
      }
      // avoid leaving own pawn exposed? small penalty if landing on non-safe where enemies behind
      if (score < 1000) {
        // prefer progress
        score += np * 0.5;
      }
    } else {
      score = 500 + np; // home column progress / finish
      if (np === LD.FINISH_POS) score += 400;
    }
    if (p === -1 && roll === 6) score += 300; // leave base
    // tiny random tie-break
    score += rng() * 2;
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
};

// ---- bot difficulties (v2.0) ----------------------------------
// level: 'easy' | 'medium' | 'hard' (or 0 | 1 | 2). Fair play: the
// dice are never rigged at any level — only the choice of move differs.
LD.BOT_LEVELS = ['easy', 'medium', 'hard'];
LD._normLevel = function (level) {
  if (typeof level === 'number') return LD.BOT_LEVELS[Math.max(0, Math.min(2, level))];
  const s = String(level || 'medium').toLowerCase();
  return LD.BOT_LEVELS.includes(s) ? s : 'medium';
};

// Is the pawn of player pi standing at step `pos` (0..50, main track)
// in danger? Danger = an enemy pawn sits 1..6 track squares behind it
// on a non-safe square (that enemy could roll the exact number and capture).
LD._inDanger = function (st, pi, pos) {
  if (pos < 0 || pos > 50) return false;
  const pl = st.players[pi];
  const ti = LD.trackIndex(pl.color, pos);
  if (LD.isSafeTrack(ti)) return false;
  let danger = false;
  st.players.forEach((op, oi) => {
    if (oi === pi || danger) return;
    op.pawns.forEach(opPos => {
      if (opPos < 0 || opPos > 50) return;
      const oti = LD.trackIndex(op.color, opPos);
      const dist = (ti - oti + 52) % 52;
      if (dist >= 1 && dist <= 6) danger = true;
    });
  });
  return danger;
};

// Would an enemy be able to capture a pawn landing on track index ti?
LD._landingInDanger = function (st, pi, ti) {
  if (LD.isSafeTrack(ti)) return false;
  let danger = false;
  st.players.forEach((op, oi) => {
    if (oi === pi || danger) return;
    op.pawns.forEach(opPos => {
      if (opPos < 0 || opPos > 50) return;
      const oti = LD.trackIndex(op.color, opPos);
      const dist = (ti - oti + 52) % 52;
      if (dist >= 1 && dist <= 6) danger = true;
    });
  });
  return danger;
};

LD.botChooseLevel = function (st, pi, roll, level, rng) {
  rng = rng || Math.random;
  const legal = LD.legalMoves(st, pi, roll);
  if (!legal.length) return -1;
  const lv = LD._normLevel(level);

  // EASY: mostly random legal moves (still takes a capture when it
  // happens to be the random pick — no strategy at all).
  if (lv === 'easy') {
    // small human-like touch: 1-in-4 times it notices a capture
    const caps = legal.filter(i => {
      const p = st.players[pi].pawns[i];
      const np = (p === -1) ? 0 : p + roll;
      if (np > 50) return false;
      const ti = LD.trackIndex(st.players[pi].color, np);
      if (LD.isSafeTrack(ti)) return false;
      return st.players.some((op, oi) => oi !== pi && op.pawns.some(
        q => q >= 0 && q <= 50 && LD.trackIndex(op.color, q) === ti));
    });
    if (caps.length && rng() < 0.25) return caps[Math.floor(rng() * caps.length)];
    return legal[Math.floor(rng() * legal.length)];
  }

  // MEDIUM: the proven v1.0 chooser (capture > safe > progress).
  if (lv === 'medium') return LD.botChoose(st, pi, roll, rng);

  // HARD: medium-style attack PLUS defence — escape danger, never
  // walk into danger without a payoff, protect the lead pawn,
  // prioritise finishing and the home column.
  const pl = st.players[pi];
  let best = -1, bestScore = -Infinity;
  for (const i of legal) {
    const p = pl.pawns[i];
    const np = (p === -1) ? 0 : p + roll;
    let score = np; // progress baseline
    if (np <= 50) {
      const ti = LD.trackIndex(pl.color, np);
      let victims = 0;
      st.players.forEach((op, oi) => {
        if (oi === pi) return;
        op.pawns.forEach(opPos => {
          if (opPos >= 0 && opPos <= 50 && LD.trackIndex(op.color, opPos) === ti) victims++;
        });
      });
      if (!LD.isSafeTrack(ti) && victims > 0) score += 1200 + victims * 150; // capture!
      if (LD.isSafeTrack(ti)) score += 220;                                  // safe landing
      else if (LD._landingInDanger(st, pi, ti)) score -= 420;                // don't walk into a trap
      // company: joining own pawn on the same square
      if (pl.pawns.some((q, qi) => qi !== i && q === np)) score += 60;
    } else if (np < LD.FINISH_POS) {
      score += 620; // home column: nearly there
    } else {
      score += 950; // finished a pawn
    }
    if (p === -1 && roll === 6) score += 320;              // leave base on 6
    if (p >= 0 && LD._inDanger(st, pi, p)) score += 380;  // escape a threatened pawn
    if (p >= 0 && p <= 50) {
      // the lead pawn is precious: nudge it home first
      const lead = Math.max.apply(null, pl.pawns.filter(q => q >= 0 && q < LD.FINISH_POS));
      if (p === lead) score += 40;
    }
    score += rng() * 2; // tiny tie-break
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
};

// ---- turn flow helper (for UI + tests) ------------------------
// rollDice returns {roll, forfeited} — forfeited=true when 3rd consecutive six
LD.rollDice = function (st, rng) {
  rng = rng || Math.random;
  const roll = 1 + Math.floor(rng() * 6);
  if (roll === 6) {
    st.sixStreak++;
    if (st.sixStreak >= 3) { st.sixStreak = 0; return { roll, forfeited: true }; }
  } else st.sixStreak = 0;
  return { roll, forfeited: false };
};

// export
if (typeof module !== 'undefined' && module.exports) module.exports = LD;
else root.LD = LD;
})(typeof self !== 'undefined' ? self : this);
