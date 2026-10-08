// the "Peg Solitaire" event (an experiment beyond the seven looks: the peg
// solitaire board game; cash): it covers its crit, whose click freezes the
// screen while a triangle of peg wisps pops up in the middle of the screen
// with one hole; peg after peg hops over its neighbour into a hole, and
// every peg jumped bursts into a spray of coins with a pop and a jolt, the
// hops ever quicker; when no jumps are left the board bursts in a huge
// blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "pegSolitaire";
const REWARD = 4;
const ROWS = 4;
const GAP = 80;
const HOP = 60;
const HOP_MS = 120;
const MAX_JUMPS = 7;
const PEG = 0.32;
const COINS = 14;
const COIN_REACH: [number, number] = [30, 130];
const POP_SHAKE: [number, number] = [0.4, 1.2];
// the six ways a peg can jump on a triangle board, as [row, column] steps
const STEPS: [number, number][] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [-1, -1],
];

interface Hop {
  from: Point;
  over: Point;
  to: Point;
  ms: number;
}

export const forcePegSolitaireEvent = registerWispEvent(
  KEY,
  "Peg Solitaire",
  () => CONFIG.pegSolitaireEvent.chance,
  (floor, context, area) => {
    const { setMs, jumpsMs, holdMs, mergeMs } = CONFIG.pegSolitaireEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const cx = (area.left + area.right) / 2;
    const top = (area.top + area.bottom) / 2 - GAP * 1.5;
    const cells: Point[][] = Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: r + 1 }, (_, c) => ({
        x: cx + (c - r / 2) * GAP,
        y: top + r * GAP * 0.87,
      })),
    );
    const valid = (r: number, c: number) =>
      r >= 0 && r < ROWS && c >= 0 && c <= r;
    // every peg starts in its own cell; the top cell starts empty
    const pegs = cells
      .flat()
      .slice(1)
      .map((home, i) => ({
        home,
        shows: (setMs * 0.6 * i) / 9,
        hops: [] as Hop[],
        gone: Infinity,
      }));
    let next = 0;
    const occupant = cells.map((row, r) =>
      row.map(() => (r === 0 ? -1 : next++)),
    );
    // play the game at arm: random legal jumps until none are left
    const jumps: Hop[] = [];
    let clock: number = setMs;
    for (let j = 0; j < MAX_JUMPS; j++) {
      const options: number[][] = [];
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c <= r; c++) {
          if (occupant[r][c] < 0) continue;
          for (const [dr, dc] of STEPS) {
            const r2 = r + 2 * dr;
            const c2 = c + 2 * dc;
            if (
              valid(r2, c2) &&
              occupant[r + dr][c + dc] >= 0 &&
              occupant[r2][c2] < 0
            )
              options.push([r, c, r + dr, c + dc, r2, c2]);
          }
        }
      if (options.length === 0) break;
      const [r, c, r1, c1, r2, c2] =
        options[Math.floor(Math.random() * options.length)];
      const hop: Hop = {
        from: cells[r][c],
        over: cells[r1][c1],
        to: cells[r2][c2],
        ms: clock,
      };
      jumps.push(hop);
      pegs[occupant[r][c]].hops.push(hop);
      pegs[occupant[r1][c1]].gone = clock + HOP_MS;
      occupant[r2][c2] = occupant[r][c];
      occupant[r][c] = -1;
      occupant[r1][c1] = -1;
      clock += lerp(jumpsMs, j / (MAX_JUMPS - 1));
    }
    const endAt = clock;
    const pegWisps = pegs.map((p) => {
      const at: Point = { x: 0, y: 0 };
      return {
        shows: p.shows,
        to: Math.min(p.gone, endAt),
        at: (ms: number): Point => {
          if (ms < setMs) {
            const u = easeOut(clamp01((ms - p.shows) / (setMs * 0.4)));
            at.x = lerp([button.x, p.home.x], u);
            at.y = lerp([button.y, p.home.y], u);
            return at;
          }
          let spot = p.home;
          for (const h of p.hops) {
            if (ms < h.ms) break;
            const u = (ms - h.ms) / HOP_MS;
            if (u < 1) {
              at.x = lerp([h.from.x, h.to.x], u);
              at.y = lerp([h.from.y, h.to.y], u) - Math.sin(Math.PI * u) * HOP;
              return at;
            }
            spot = h.to;
          }
          at.x = spot.x;
          at.y = spot.y;
          return at;
        },
      };
    });

    const popping = createBeats(
      jumps,
      (j) => j.ms + HOP_MS,
      (j, k) => {
        cover!.launchFrom(j.over, ringTargets(j.over, COINS, COIN_REACH));
        cover!.burst(j.over, 0.35);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(POP_SHAKE, k / Math.max(1, jumps.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cells[ROWS - 1][Math.floor(ROWS / 2)]),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          popping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const p of pegWisps)
            drawWispBetween(
              ctx,
              p.at,
              ms,
              now,
              WISP_SIZE * PEG,
              0.5,
              p.shows,
              p.to,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
