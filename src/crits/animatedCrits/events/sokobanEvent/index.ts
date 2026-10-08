// the "Sokoban" event (experiment: a self-playing Sokoban puzzle; cash): it
// covers its crit, whose click freezes the screen while three heaps of cash
// drop onto a grid in the screen's middle and three glimmering targets
// light up across from them; a wisp warehouse keeper plays the puzzle out
// on its own, stepping cell to cell ever quicker, walking round the heaps
// and shoving each one square by square, every shove a thump and a jolt,
// until each heap slides onto its target in a flash; with all three home
// the targets blaze and the heaps burst into rivers of cash pouring into
// the total, the last in a huge blast. Pays floor income × floor number × 4
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import type { CoinPath } from "../../../../floors/coins";
import { totalSpot } from "../../cashFlow";

const KEY = "sokoban";
const REWARD = 4;
const COLS = 6;
const ROWS = 5;
// a cell's size, of the screen's width
const CELL = 0.13;
// where the keeper and heaps start, and the keeper's moves: each into a
// heap shoves it on a cell
const KEEPER: [number, number] = [0, 2];
const HEAPS: [number, number][] = [
  [2, 1],
  [2, 2],
  [2, 3],
];
const MOVES = "RRRRUULLLDRRRDDDLLLURRR";
const STEP: Record<string, [number, number]> = {
  R: [1, 0],
  L: [-1, 0],
  U: [0, -1],
  D: [0, 1],
};
const COINS_PER_HEAP = 170;
const DROP = 320;
const GLIMMERS = 6;
const SIZE = WISP_SIZE * 0.75;
const SOUND_GAP_MS = 70;
const SHOVE_SHAKE = 0.25;
const HOME_SHAKE = 0.8;
const BURST_SHAKE = 1.1;

interface Move {
  starts: number;
  ends: number;
  // the keeper's cells, and the heap it shoves (if any) with its cells
  from: [number, number];
  to: [number, number];
  heap: number;
  heapTo: [number, number];
  home: boolean;
}

export const forceSokobanEvent = registerWispEvent(
  KEY,
  "Sokoban",
  () => CONFIG.sokobanEvent.chance,
  (floor, context, area) => {
    const { dropMs, stepMs, burstMs, riseMs, holdMs, mergeMs } =
      CONFIG.sokobanEvent;
    const fallback = totalSpot(area);
    const total = () => cover?.total() ?? fallback;
    const cell = (area.right - area.left) * CELL;
    const x0 = (area.left + area.right) / 2 - ((COLS - 1) / 2) * cell;
    const y0 = (area.top + area.bottom) / 2 - ((ROWS - 1) / 2) * cell;
    const cx = (c: number) => x0 + c * cell;
    const cy = (r: number) => y0 + r * cell;

    // the puzzle played out: every move's keeper and heap cells
    const heaps = HEAPS.map(([c, r]): [number, number] => [c, r]);
    let keeper: [number, number] = [KEEPER[0], KEEPER[1]];
    let clock: number = dropMs;
    const moves: Move[] = [...MOVES].map((m, k) => {
      const [dc, dr] = STEP[m];
      const to: [number, number] = [keeper[0] + dc, keeper[1] + dr];
      const heap = heaps.findIndex(([c, r]) => c === to[0] && r === to[1]);
      const heapTo: [number, number] = [to[0] + dc, to[1] + dr];
      const ms = lerp(stepMs, k / (MOVES.length - 1));
      const move: Move = {
        starts: clock,
        ends: clock + ms,
        from: keeper,
        to,
        heap,
        heapTo,
        home: false,
      };
      if (heap >= 0) heaps[heap] = heapTo;
      keeper = to;
      clock += ms;
      return move;
    });
    // each heap is home on its last shove
    for (let h = 0; h < HEAPS.length; h++) {
      const last = moves.filter((m) => m.heap === h).pop();
      if (last) last.home = true;
    }
    const targets = heaps.map(([c, r]) => ({ x: cx(c), y: cy(r) }));
    const solvedAt = clock;
    const burstAt = solvedAt + burstMs;

    // where each heap's middle is at ms
    const shoves = HEAPS.map((_, h) => moves.filter((m) => m.heap === h));
    const heapAt = (h: number, ms: number, into: Point): Point => {
      let [c, r] = HEAPS[h];
      for (const m of shoves[h]) {
        if (ms >= m.ends) {
          [c, r] = m.heapTo;
          continue;
        }
        if (ms > m.starts) {
          const u = easeOut((ms - m.starts) / (m.ends - m.starts));
          into.x = lerp([cx(m.to[0]), cx(m.heapTo[0])], u);
          into.y = lerp([cy(m.to[1]), cy(m.heapTo[1])], u);
          return into;
        }
        break;
      }
      into.x = cx(c);
      into.y = cy(r);
      return into;
    };
    const keeperSpot: Point = { x: 0, y: 0 };
    const keeperAt = (ms: number): Point | null => {
      if (ms > burstAt) return null;
      const m = moves.find((mv) => ms < mv.ends) ?? moves[moves.length - 1];
      const u = easeOut(clamp01((ms - m.starts) / (m.ends - m.starts)));
      keeperSpot.x = lerp([cx(m.from[0]), cx(m.to[0])], u);
      keeperSpot.y = lerp([cy(m.from[1]), cy(m.to[1])], u);
      return keeperSpot;
    };

    // each heap a mound of coins riding it; when solved, they pour out
    const pours = HEAPS.map((_, h) => burstAt + h * 140);
    const lastIn = pours[pours.length - 1] + 120 + riseMs;
    const travelMs = lastIn;
    const paths: CoinPath[] = [];
    for (let h = 0; h < HEAPS.length; h++) {
      for (let i = 0; i < COINS_PER_HEAP; i++) {
        const up = Math.random() ** 0.7;
        const dx = (Math.random() * 2 - 1) * cell * 0.38 * (1 - up * 0.6);
        const dy = cell * 0.3 - up * cell * 0.6;
        const lands = dropMs * (0.3 + 0.7 * Math.random());
        const leaves = pours[h] + Math.random() * 120;
        const mid: Point = { x: 0, y: 0 };
        const from: Point = { x: 0, y: 0 };
        paths.push((f) => {
          const ms = f * travelMs;
          if (ms < leaves) {
            heapAt(h, ms, mid);
            const fall = 1 - easeIn(clamp01(ms / lands));
            return { x: mid.x + dx, y: mid.y + dy - DROP * fall };
          }
          heapAt(h, leaves, mid);
          from.x = mid.x + dx;
          from.y = mid.y + dy;
          const t = total();
          const p = bezier(
            from,
            { x: from.x, y: t.y },
            t,
            easeIn(clamp01((ms - leaves) / riseMs)),
            { x: 0, y: 0 },
          );
          return { x: p.x, y: p.y, scale: ms >= leaves + riseMs ? 0 : 1 };
        });
      }
    }
    let soundAt = -Infinity;

    const dropping = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const shoving = createBeats(
      moves.filter((m) => m.heap >= 0),
      (m) => m.starts,
      (m, _, now) => {
        if (!cover!.isLive()) return;
        if (now - soundAt >= SOUND_GAP_MS) {
          soundAt = now;
          playBloop();
        }
        shakeScreen(m.home ? HOME_SHAKE : SHOVE_SHAKE);
      },
    );
    const homing = createBeats(
      moves.filter((m) => m.home),
      (m) => m.ends,
      (m) => cover!.burst({ x: cx(m.heapTo[0]), y: cy(m.heapTo[1]) }, 0.7),
    );
    const bursting = createBeats(
      pours,
      (ms) => ms,
      (_, h) => {
        cover!.burst(targets[h], 0.9);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BURST_SHAKE);
      },
    );
    const finale = createBeats(
      [lastIn],
      (ms) => ms,
      () => cover!.blast(total()),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: lastIn + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          dropping.tick(ms, now);
          shoving.tick(ms, now);
          homing.tick(ms, now);
          bursting.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > burstAt + 600) return;
          // the targets: rings of glimmers, blazing once solved
          const grow = easeOut(clamp01(ms / dropMs));
          const blaze = clamp01((ms - solvedAt) / 200);
          const fade = 1 - clamp01((ms - burstAt) / 400);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (const t of targets) {
            for (let g = 0; g < GLIMMERS; g++) {
              const a = (Math.PI * 2 * g) / GLIMMERS + ms * 0.002;
              const r = cell * 0.42;
              stampGlimmer(
                ctx,
                t.x + Math.cos(a) * r,
                t.y + Math.sin(a) * r,
                cell * (0.1 + 0.08 * blaze) * grow * fade,
                a,
                blaze > 0 ? COLOR.white : COLOR.heavenlyGold,
              );
            }
          }
          ctx.restore();
          if (ms <= burstAt) drawWisp(ctx, keeperAt, ms, now, SIZE, 0.4);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);
