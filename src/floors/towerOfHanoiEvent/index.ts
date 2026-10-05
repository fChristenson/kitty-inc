// the "Tower of Hanoi" event (experiment: the Tower of Hanoi; a crit tier):
// it covers its crit, whose click freezes the screen while three pegs of
// light shoot up out of the clicked floor's bar and five bars of light drop
// onto the first, widest at the bottom; then they solve the puzzle on their
// own, never a wider bar on a narrower, hop after hop, ever faster, every
// landing a pop and a jolt, the whole tower moving to the last peg in 31
// moves; the finished tower blazes and hammers down into the bar, which
// jumps a crit tier. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { bezier } from "../../shared/curves";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam } from "../../shared/beam";
import { findRewardBars } from "../eventRewards";

const KEY = "towerOfHanoi";
const DISKS = 5;
// pegs at these shares across the screen, standing on the clicked bar's
// row; disks from WIDEST to NARROWEST of the screen's width
const PEGS = [0.2, 0.5, 0.8];
const WIDEST = 0.27;
const NARROWEST = 0.09;
const DISK_H = 56;
const DISK_W = 40;
const PEG_W = 10;
const PEG_ALPHA = 0.45;
// how far above the tallest stack a hop clears the pegs
const CLEAR = 70;
// each move's share of the solve, slowest first
const MOVE_PACE: [number, number] = [1.8, 0.6];
const DROP = 260;
const LAND_SHAKE: [number, number] = [0.2, 0.5];
const HAMMER_SHAKE = 1.2;
const SOUND_GAP_MS = 50;

interface Move {
  disk: number;
  from: number;
  to: number;
  // its height in the stack it leaves and the one it lands on
  fromLevel: number;
  toLevel: number;
  startMs: number;
  endMs: number;
}

export const forceTowerOfHanoiEvent = registerWispEvent(
  KEY,
  "Tower of Hanoi",
  () => CONFIG.towerOfHanoiEvent.chance,
  (floor, context, area) => {
    const { growMs, solveMs, hammerMs, holdMs, mergeMs } =
      CONFIG.towerOfHanoiEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const span = area.right - area.left;
    const base = bar.box.y;
    const pegX = PEGS.map((s) => area.left + span * s);
    const pegTop = base - (DISKS + 1) * DISK_H;
    const diskW = (d: number) =>
      span * lerp([WIDEST, NARROWEST], d / (DISKS - 1));
    const levelY = (level: number) => base - (level + 0.5) * DISK_H;

    // the classic solve, disk 0 the widest
    const stacks: number[][] = [
      Array.from({ length: DISKS }, (_, d) => d),
      [],
      [],
    ];
    const moves: Move[] = [];
    const solve = (n: number, from: number, to: number, via: number) => {
      if (n === 0) return;
      solve(n - 1, from, via, to);
      const disk = stacks[from].pop()!;
      moves.push({
        disk,
        from,
        to,
        fromLevel: stacks[from].length,
        toLevel: stacks[to].length,
        startMs: 0,
        endMs: 0,
      });
      stacks[to].push(disk);
      solve(n - 1, via, to, from);
    };
    solve(DISKS, 0, 2, 1);
    const paces = moves.map((_, k) => lerp(MOVE_PACE, k / (moves.length - 1)));
    const total = paces.reduce((a, b) => a + b, 0);
    let clock = growMs;
    moves.forEach((m, k) => {
      m.startMs = clock;
      clock += (solveMs * paces[k]) / total;
      m.endMs = clock;
    });
    const solvedAt = clock;
    const hammerAt = solvedAt + hammerMs;
    // each disk's moves, in order
    const movesOf = Array.from({ length: DISKS }, (_, d) =>
      moves.filter((m) => m.disk === d),
    );
    const lift: Point = { x: 0, y: pegTop - CLEAR };
    const diskAt = (d: number, ms: number, into: Point): Point => {
      if (ms < growMs) {
        // dropping onto the first peg, the widest first
        const u = easeIn(
          clamp01((ms - (d * growMs) / (DISKS * 2)) / (growMs / 2)),
        );
        into.x = pegX[0];
        into.y = levelY(d) - DROP * (1 - u);
        return into;
      }
      let peg = 0;
      let level = d;
      for (const m of movesOf[d]) {
        if (ms < m.startMs) break;
        if (ms < m.endMs) {
          lift.x = (pegX[m.from] + pegX[m.to]) / 2;
          return bezier(
            { x: pegX[m.from], y: levelY(m.fromLevel) },
            lift,
            { x: pegX[m.to], y: levelY(m.toLevel) },
            easeOut((ms - m.startMs) / (m.endMs - m.startMs)),
            into,
          );
        }
        peg = m.to;
        level = m.toLevel;
      }
      into.x = pegX[peg];
      into.y = levelY(level);
      if (ms > solvedAt)
        into.y +=
          (base - pegTop) * 0.25 * easeIn(clamp01((ms - solvedAt) / hammerMs));
      return into;
    };
    let soundAt = -Infinity;

    const opening = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      moves,
      (m) => m.endMs,
      (m, k, now) => {
        cover!.burst({ x: pegX[m.to], y: levelY(m.toLevel) }, 0.18);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(LAND_SHAKE, k / (moves.length - 1)));
        if (now - soundAt >= SOUND_GAP_MS) {
          soundAt = now;
          playBloop();
        }
      },
    );
    const hammering = createBeats(
      [solvedAt, hammerAt],
      (ms) => ms,
      (ms) => {
        if (ms < hammerAt) {
          if (cover!.isLive()) {
            playSwoosh();
            shakeScreen(HAMMER_SHAKE);
          }
          return;
        }
        cover!.tierUp(bar, { x: pegX[2], y: pegTop });
        cover!.slam(bar);
        cover!.blast({ x: pegX[2], y: base });
      },
    );

    const spot: Point = { x: 0, y: 0 };
    const left: Point = { x: 0, y: 0 };
    const right: Point = { x: 0, y: 0 };
    const pegFoot: Point = { x: 0, y: base };
    const pegHead: Point = { x: 0, y: base };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: hammerAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          opening.tick(ms, now);
          landing.tick(ms, now);
          hammering.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > hammerAt) return;
          const grow = easeOut(clamp01(ms / (growMs * 0.6)));
          const blaze = ms > solvedAt ? 0.6 + 0.4 * Math.sin(now / 35) : 0;
          for (const x of pegX) {
            pegFoot.x = pegHead.x = x;
            pegHead.y = base - (base - pegTop) * grow;
            drawBeam(ctx, pegFoot, pegHead, PEG_W, PEG_ALPHA);
          }
          for (let d = 0; d < DISKS; d++) {
            diskAt(d, ms, spot);
            const half = diskW(d) / 2;
            left.x = spot.x - half;
            right.x = spot.x + half;
            left.y = right.y = spot.y;
            drawBeam(ctx, left, right, DISK_W, 0.75 + 0.25 * blaze);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
