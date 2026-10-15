'use strict';
// Node test harness for Ludo Dangal logic.js
const LD = require('./logic.js');

let fails = 0;
function ok(cond, name) {
  if (!cond) { fails++; console.log('FAIL:', name); }
  else console.log('ok:', name);
}

// --- unit: track sanity ---
ok(LD.TRACK.length === 52, 'track has 52 tiles');
ok(new Set(LD.TRACK.map(t => t.join(','))).size === 52, 'all track tiles unique');
ok(JSON.stringify(LD.TRACK[0]) === '[1,6]', 'red entry (1,6)');
ok(JSON.stringify(LD.TRACK[13]) === '[8,1]', 'green entry (8,1)');
ok(JSON.stringify(LD.TRACK[26]) === '[13,8]', 'yellow entry (13,8)');
ok(JSON.stringify(LD.TRACK[39]) === '[6,13]', 'blue entry (13->6,13)');

// --- unit: legalMoves ---
let st = LD.newGame(2, [false, false]);
ok(JSON.stringify(LD.legalMoves(st, 0, 3)) === '[]', 'no moves without 6 at start');
ok(JSON.stringify(LD.legalMoves(st, 0, 6)) === '[0,1,2,3]', 'all 4 can leave on 6');

// exact-roll home
st.players[0].pawns = [55, 56, 56, 56];
ok(JSON.stringify(LD.legalMoves(st, 0, 2)) === '[]', 'roll 2 at 55 illegal (exact needed)');
ok(JSON.stringify(LD.legalMoves(st, 0, 1)) === '[0]', 'roll 1 at 55 legal');

// --- unit: captures ---
// red pawn at pos 5 -> track idx 5 (not safe). green pawn on same square: green pos for track 5: (13+pos)%52=5 -> pos=44
st = LD.newGame(2, [false, false]);
st.players[0].pawns = [4, -1, -1, -1];
st.players[1].pawns = [44, -1, -1, -1];
let r = LD.applyMove(st, 0, 0, 1);
ok(r.captured.length === 1 && st.players[1].pawns[0] === -1, 'capture on non-safe tile');

// no capture on safe tile: red entry track 0 is safe. green pos for track 0: (13+pos)%52=0 -> pos=39
st = LD.newGame(2, [false, false]);
st.players[0].pawns = [-1, -1, -1, -1];
st.players[1].pawns = [39, -1, -1, -1];
r = LD.applyMove(st, 0, 0, 6); // leaves base to pos 0 (safe)
ok(r.captured.length === 0 && st.players[1].pawns[0] === 39, 'no capture on safe tile');

// --- unit: 3 sixes forfeit ---
st = LD.newGame(2, [false, false]);
let seq = [6, 6, 6], fi = 0;
const rigged = () => { const v = seq[fi % seq.length] / 6 - 0.0001; fi++; return v; };
// rigged returns ~0.9999 -> roll 6
let rr = LD.rollDice(st, rigged); ok(rr.roll === 6 && !rr.forfeited, 'six 1 ok');
rr = LD.rollDice(st, rigged); ok(rr.roll === 6 && !rr.forfeited, 'six 2 ok');
rr = LD.rollDice(st, rigged); ok(rr.forfeited === true, '3rd six forfeits');

// --- full game simulations (all bots) ---
function simGame(seed, nPlayers) {
  let s = seed;
  const rng = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const bots = new Array(nPlayers).fill(true);
  const g = LD.newGame(nPlayers, bots);
  let guard = 0;
  while (g.winner < 0 && guard < 20000) {
    guard++;
    const pi = g.turn;
    const { roll, forfeited } = LD.rollDice(g, rng);
    if (forfeited) { g.turn = (g.turn + 1) % nPlayers; continue; }
    const legal = LD.legalMoves(g, pi, roll);
    let extra = (roll === 6);
    if (legal.length) {
      const ch = LD.botChoose(g, pi, roll, rng);
      if (ch < 0) throw new Error('bot returned -1 with legal moves');
      LD.applyMove(g, pi, ch, roll);
      if (LD.hasWon(g, pi)) { g.winner = pi; break; }
    }
    if (!extra) g.turn = (g.turn + 1) % nPlayers;
  }
  return { winner: g.winner, moves: g.moves, guard };
}

for (const n of [2, 3, 4]) {
  for (const seed of [7, 42, 1234]) {
    const r2 = simGame(seed, n);
    ok(r2.winner >= 0 && r2.winner < n, `${n}p seed${seed}: winner=${r2.winner} moves=${r2.moves}`);
    ok(r2.guard < 20000, `${n}p seed${seed}: finished without guard trip`);
  }
}

// bot never crashes on empty legal
st = LD.newGame(2, [true, true]);
ok(LD.botChoose(st, 0, 3, Math.random) === -1, 'bot -1 when no legal moves');

console.log(fails === 0 ? '\nALL TESTS PASSED' : `\n${fails} TESTS FAILED`);
process.exit(fails ? 1 : 0);
