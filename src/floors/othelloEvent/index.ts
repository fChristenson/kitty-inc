// the "Othello" event (experiment: a game of Othello playing itself; cash):
// it covers its crit, whose click freezes the screen and dims it while a
// game of Othello in gold and white discs plays itself out mid-game, move
// after move ever faster, each new disc popping down and flipping whole
// lines of the other colour in rippling cascades, the big swings a jolt;
// gold takes the board, and every gold disc bursts into cash in a huge
// blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOutBack, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../shared/coinTargets";
import { fadeStops, glowSprite } from "../../shared/glowSprite";

const KEY = "othello";
const REWARD = 4;
const N = 8;
const GOLD = 1;
const WHITE = 2;
// the moves played out on screen; the opening is already on the board
const SHOWN = 26;
const TRIES = 30;
const START_MS = 150;
const POP_MS = 110;
const FLIP_MS = 130;
const CASCADE_MS = 28;
const DISC = 0.4;
const VEIL = "rgba(0,0,0,0.6)";
const LINE = "rgba(255,215,120,0.22)";
const GOLD_DISC = fadeStops(COLOR.heavenlyGold, 0.75);
const WHITE_DISC = fadeStops(COLOR.white, 0.75);
const BANG_GAP_MS = 40;
const SWING_SHAKE: [number, number] = [0.2, 0.8];
const FINAL_SHAKE = 2.0;
const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

interface Move {
  who: number;
  cell: number;
  // each flipped cell and how far it is from the new disc
  flips: { cell: number; far: number }[];
}

interface Change {
  ms: number;
  color: number;
  // a disc put down rather than flipped
  placed: boolean;
}

function flipsFor(board: Int8Array, cell: number, who: number): Move["flips"] {
  const flips: Move["flips"] = [];
  if (board[cell]) return flips;
  const x0 = cell % N;
  const y0 = (cell / N) | 0;
  for (const [dx, dy] of DIRS) {
    let x = x0 + dx;
    let y = y0 + dy;
    let far = 1;
    const run: Move["flips"] = [];
    while (x >= 0 && x < N && y >= 0 && y < N && board[y * N + x] === 3 - who) {
      run.push({ cell: y * N + x, far });
      x += dx;
      y += dy;
      far++;
    }
    if (run.length && x >= 0 && x < N && y >= 0 && y < N && board[y * N + x] === who)
      flips.push(...run);
  }
  return flips;
}

const CORNERS = new Set([0, N - 1, N * (N - 1), N * N - 1]);

// a whole game: gold plays greedy and grabs corners, white plays at random
function playGame(): { moves: Move[]; board: Int8Array } {
  const board = new Int8Array(N * N);
  const h = N / 2;
  board[(h - 1) * N + h - 1] = WHITE;
  board[h * N + h] = WHITE;
  board[(h - 1) * N + h] = GOLD;
  board[h * N + h - 1] = GOLD;
  const moves: Move[] = [];
  let who = GOLD;
  let passes = 0;
  while (passes < 2) {
    const options: Move[] = [];
    for (let c = 0; c < N * N; c++) {
      const flips = flipsFor(board, c, who);
      if (flips.length) options.push({ who, cell: c, flips });
    }
    if (options.length === 0) {
      passes++;
      who = 3 - who;
      continue;
    }
    passes = 0;
    let pick = options[Math.floor(Math.random() * options.length)];
    if (who === GOLD) {
      const score = (m: Move) =>
        m.flips.length + (CORNERS.has(m.cell) ? 20 : 0) + Math.random();
      pick = options.reduce((a, b) => (score(b) > score(a) ? b : a));
    }
    board[pick.cell] = who;
    for (const f of pick.flips) board[f.cell] = who;
    moves.push(pick);
    who = 3 - who;
  }
  return { moves, board };
}

const count = (board: Int8Array, who: number) =>
  board.reduce((n, c) => n + (c === who ? 1 : 0), 0);

export const forceOthelloEvent = registerWispEvent(
  KEY,
  "Othello",
  () => CONFIG.othelloEvent.chance,
  (floor, context, area) => {
    const { movesMs, holdMs, mergeMs } = CONFIG.othelloEvent;
    let game = playGame();
    for (let t = 1; t < TRIES; t++) {
      if (count(game.board, GOLD) > count(game.board, WHITE)) break;
      game = playGame();
    }
    const { moves } = game;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const cell = Math.min(width * 0.85, height * 0.6) / N;
    const offX = left + (width - cell * N) / 2;
    const offY = top + (height - cell * N) / 2;
    const centre = (c: number): Point => ({
      x: offX + ((c % N) + 0.5) * cell,
      y: offY + (((c / N) | 0) + 0.5) * cell,
    });
    const centres = Array.from({ length: N * N }, (_, c) => centre(c));
    // the opening already played, then each shown move's changes per cell
    const opening = Math.max(0, moves.length - SHOWN);
    const start = new Int8Array(N * N);
    const h = N / 2;
    start[(h - 1) * N + h - 1] = WHITE;
    start[h * N + h] = WHITE;
    start[(h - 1) * N + h] = GOLD;
    start[h * N + h - 1] = GOLD;
    for (const m of moves.slice(0, opening)) {
      start[m.cell] = m.who;
      for (const f of m.flips) start[f.cell] = m.who;
    }
    const changes: Change[][] = Array.from({ length: N * N }, () => []);
    const shown = moves.slice(opening);
    let clock = START_MS;
    const plays = shown.map((m, j) => {
      const ms = clock;
      clock += lerp(movesMs, j / Math.max(1, shown.length - 1));
      changes[m.cell].push({ ms, color: m.who, placed: true });
      for (const f of m.flips)
        changes[f.cell].push({
          ms: ms + f.far * CASCADE_MS,
          color: m.who,
          placed: false,
        });
      return { ms, flips: m.flips.length };
    });
    const settles = Math.max(
      ...shown.map(
        (m, j) =>
          plays[j].ms +
          Math.max(0, ...m.flips.map((f) => f.far)) * CASCADE_MS +
          FLIP_MS,
      ),
      START_MS,
    );
    const endAt = settles + 150;
    const most = Math.max(1, ...plays.map((p) => p.flips));

    let bang = -Infinity;
    const playing = createBeats(
      plays,
      (p) => p.ms,
      (p) => {
        if (!cover!.isLive()) return;
        if (p.flips >= 3) shakeScreen(lerp(SWING_SHAKE, p.flips / most));
        if (p.ms - bang < BANG_GAP_MS) return;
        bang = p.ms;
        playBloop();
      },
    );
    const bursting = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (let c = 0; c < N * N; c++)
          if (game.board[c] === GOLD)
            cover!.launchFrom(
              centres[c],
              clampTargetsY(
                ringTargets(centres[c], 4, [20, 90]),
                top + 40,
                area.bottom - 40,
              ),
            );
        cover!.blast({ x: offX + (cell * N) / 2, y: offY + (cell * N) / 2 });
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(FINAL_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + 700 + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          playing.tick(ms, now);
          bursting.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms < 0 || ms >= endAt + 200) return;
          const fade = 1 - clamp01((ms - endAt) / 200);
          ctx.globalAlpha = fade;
          ctx.fillStyle = VEIL;
          ctx.fillRect(left, top, width, height);
          ctx.fillStyle = LINE;
          for (let i = 0; i <= N; i++) {
            ctx.fillRect(offX + i * cell - 1, offY, 2, cell * N);
            ctx.fillRect(offX, offY + i * cell - 1, cell * N, 2);
          }
          const r = cell * DISC;
          for (let c = 0; c < N * N; c++) {
            let color = start[c];
            let before = color;
            let since = Infinity;
            let placed = false;
            for (const ch of changes[c]) {
              if (ms < ch.ms) break;
              before = color;
              color = ch.color;
              since = ms - ch.ms;
              placed = ch.placed;
            }
            if (!color) continue;
            let sx = 1;
            let sy = 1;
            let shows = color;
            if (placed && since < POP_MS) {
              sx = sy = easeOutBack(since / POP_MS);
            } else if (!placed && since < FLIP_MS) {
              const u = since / FLIP_MS;
              sx = Math.abs(Math.cos(Math.PI * u));
              if (u < 0.5) shows = before;
            }
            const { x, y } = centres[c];
            ctx.drawImage(
              glowSprite(shows === GOLD ? GOLD_DISC : WHITE_DISC),
              x - r * sx,
              y - r * sy,
              r * 2 * sx,
              r * 2 * sy,
            );
          }
          ctx.globalAlpha = 1;
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
