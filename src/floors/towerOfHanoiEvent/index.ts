// the "Tower of Hanoi" event (experiment: the Tower of Hanoi puzzle solving
// itself; cash): it covers its crit, whose click freezes the screen and dims
// it while three pegs of light rise with a stack of glowing disks on the
// first; the puzzle solves itself move by move, never a bigger disk on a
// smaller, each disk hopping up, across and down with a click, faster and
// faster, a jolt every few moves, until the whole tower stands on the last
// peg; then it blazes and a river of cash pours off its top into the total
// in a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../shared/coinTargets";
import { drawBeam } from "../../shared/beam";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";

const KEY = "towerOfHanoi";
const REWARD = 4;
const DISKS = 5;
const PEGS = [0.2, 0.5, 0.8];
const LOW = 90;
const PEG_H = 280;
const PEG_W = 8;
const DISK_H = 22;
const WIDTHS: [number, number] = [60, 200];
const VEIL = "rgba(0,0,0,0.55)";
const RISE_MS = 250;
const CLICK_GAP_MS = 50;
const SHAKE_EVERY = 8;
const MOVE_SHAKE: [number, number] = [0.3, 0.8];
const DONE_SHAKE = 1.6;

interface Move {
  disk: number;
  from: number;
  to: number;
  // the levels it leaves and lands on
  fromLevel: number;
  toLevel: number;
  starts: number;
  lands: number;
}

export const forceTowerOfHanoiEvent = registerWispEvent(
  KEY,
  "Tower of Hanoi",
  () => CONFIG.towerOfHanoiEvent.chance,
  (floor, context, area) => {
    const { movesMs, holdMs, mergeMs } = CONFIG.towerOfHanoiEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const base = area.bottom - LOW;
    const xs = PEGS.map((p) => left + width * p);
    const liftY = base - PEG_H - 40;
    // the optimal solution, worked out once
    const stacks: number[][] = [
      Array.from({ length: DISKS }, (_, i) => DISKS - 1 - i),
      [],
      [],
    ];
    const order: {
      disk: number;
      from: number;
      to: number;
      fromLevel: number;
      toLevel: number;
    }[] = [];
    const solve = (n: number, from: number, to: number, via: number) => {
      if (n === 0) return;
      solve(n - 1, from, via, to);
      const disk = stacks[from].pop()!;
      order.push({
        disk,
        from,
        to,
        fromLevel: stacks[from].length,
        toLevel: stacks[to].length,
      });
      stacks[to].push(disk);
      solve(n - 1, via, to, from);
    };
    solve(DISKS, 0, 2, 1);
    let clock = RISE_MS;
    const moves: Move[] = order.map((m, k) => {
      const starts = clock;
      clock += lerp(movesMs, k / Math.max(1, order.length - 1));
      return { ...m, starts, lands: clock };
    });
    const solvedAt = clock + 120;
    // where every disk rests before each move: peg and level
    const pegOf = new Int8Array(DISKS);
    const levelOf = new Int8Array(DISKS);
    for (let d = 0; d < DISKS; d++) levelOf[d] = DISKS - 1 - d;
    const states: { peg: Int8Array; level: Int8Array }[] = [];
    for (const m of moves) {
      states.push({ peg: pegOf.slice(), level: levelOf.slice() });
      pegOf[m.disk] = m.to;
      levelOf[m.disk] = m.toLevel;
    }
    states.push({ peg: pegOf.slice(), level: levelOf.slice() });
    const widthOf = (d: number) => lerp(WIDTHS, d / (DISKS - 1));
    const yOf = (level: number) => base - DISK_H * (level + 0.5);
    const total = totalSpot(area);
    const towerTop: Point = { x: xs[2], y: yOf(DISKS) };
    const river = sampleLine(
      (u) => ({
        x: lerp([towerTop.x, total.x], u),
        y: lerp([towerTop.y, total.y], u) - Math.sin(Math.PI * u) * 120,
      }),
      24,
    );
    const pour: Pour = {
      coinsAlong: 220,
      width: 34,
      streamMs: 420,
      travelMs: 700,
    };
    const endAt = solvedAt + 400;
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };

    let clicked = -Infinity;
    const moving = createBeats(
      moves,
      (m) => m.lands,
      (m, k) => {
        if (!cover!.isLive()) return;
        if (m.lands - clicked >= CLICK_GAP_MS) {
          clicked = m.lands;
          playBloop();
        }
        if (k % SHAKE_EVERY === SHAKE_EVERY - 1)
          shakeScreen(lerp(MOVE_SHAKE, k / (moves.length - 1)));
      },
    );
    const solved = createBeats(
      [solvedAt],
      (ms) => ms,
      () => {
        pourLine(cover!, river, pour);
        for (let d = 0; d < DISKS; d++) {
          const at: Point = { x: xs[2], y: yOf(DISKS - 1 - d) };
          cover!.launchFrom(
            at,
            clampTargetsY(
              ringTargets(at, 12, [40, 160]),
              top + 40,
              area.bottom - 20,
            ),
          );
        }
        cover!.blast(cover!.total() ?? total);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(DONE_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs:
          Math.max(endAt, pourDurationMs(solvedAt, pour)) + holdMs + mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          moving.tick(ms, now);
          solved.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms < 0 || ms >= endAt) return;
          const fade = 1 - clamp01((ms - solvedAt) / 400);
          const rise = easeOut(clamp01(ms / RISE_MS));
          ctx.globalAlpha = fade * rise;
          ctx.fillStyle = VEIL;
          ctx.fillRect(left, top, width, height);
          ctx.globalAlpha = 1;
          for (const x of xs) {
            a.x = b.x = x;
            a.y = base;
            b.y = base - PEG_H * rise;
            drawBeam(ctx, a, b, PEG_W, 0.6 * fade);
          }
          let k = 0;
          while (k < moves.length && ms >= moves[k].lands) k++;
          const state = states[k];
          const m = k < moves.length && ms >= moves[k].starts ? moves[k] : null;
          const glow =
            ms >= solvedAt
              ? 1 + Math.sin(Math.PI * clamp01((ms - solvedAt) / 400))
              : 1;
          for (let d = 0; d < DISKS; d++) {
            let x = xs[state.peg[d]];
            let y = yOf(state.level[d]);
            if (m && m.disk === d) {
              // up off its peg, across, and down onto the next
              const u = (ms - m.starts) / (m.lands - m.starts);
              const up = smoothstep(clamp01(u * 3));
              const across = smoothstep(clamp01(u * 3 - 1));
              const down = smoothstep(clamp01(u * 3 - 2));
              x = lerp([xs[m.from], xs[m.to]], across);
              y =
                down > 0
                  ? lerp([liftY, yOf(m.toLevel)], down)
                  : lerp([yOf(m.fromLevel), liftY], up);
            }
            const w = widthOf(d) / 2;
            a.x = x - w;
            b.x = x + w;
            a.y = b.y = lerp([base + 40, y], rise);
            drawBeam(ctx, a, b, DISK_H * 0.8 * glow, fade);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
