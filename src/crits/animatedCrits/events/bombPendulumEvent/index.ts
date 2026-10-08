// the "Bomb Pendulum" event (explosion; crit tiers): it covers its crit,
// whose click freezes the screen while a lit bomb wisp swings on a long
// glittering pendulum hung from the top of the screen across an income bar;
// at the end of each swing it smashes into the bar's end and blows in a big
// blast bursting into a cluster, a bang and a jolt, then forms again and
// swings back, harder, to smash the other end; after two smashes the bar
// jumps a crit tier and the pendulum drops to the next bar, the very last
// swing blowing in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { stampGlimmer } from "../../../../shared/twinkle";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "bombPendulum";
const MAX_BARS = 3;
const TOP = 30;
const MIN_DROP = 120;
const ROPE_DOTS = 12;
const ROPE_SPARK = 9;
const CLUSTER = 3;
const CLUSTER_REACH = 55;
const BOMB = 0.5;
const FUSE = 17;
const BLAST = 210;
const CLUSTER_BLAST = 100;
const HUGE = 400;
const SMASH_SHAKE: [number, number] = [0.8, 1.6];
const BANG_GAP_MS = 60;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

interface Swing {
  bar: RewardBar;
  pivot: Point;
  end: Point;
  leaves: number;
  smashes: number;
  // its second smash on the bar: the tier up
  second: boolean;
  at: (ms: number) => Point;
}

export const forceBombPendulumEvent = registerWispEvent(
  KEY,
  "Bomb Pendulum",
  () => CONFIG.bombPendulumEvent.chance,
  (floor, context, area) => {
    const { swingsMs, reformMs, holdMs, mergeMs } = CONFIG.bombPendulumEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const count = bars.length * 2;
    const blasts: Blast[] = [];
    const swings: Swing[] = [];
    let clock = 0;
    bars.forEach((bar, k) => {
      const pivot: Point = { x: bar.center.x, y: area.top + TOP };
      const half = bar.box.width / 2;
      const drop = Math.max(MIN_DROP, bar.center.y - pivot.y);
      const rope = Math.hypot(half, drop);
      const reach = Math.atan2(half, drop);
      // from hanging still, out to one end, then back across to the other
      const side = k % 2 === 0 ? 1 : -1;
      const legs: [number, number][] = [
        [0, side * reach],
        [side * reach, -side * reach],
      ];
      legs.forEach(([a, b], leg) => {
        const i = swings.length;
        const leaves = clock + (i === 0 ? 0 : reformMs);
        const smashes = leaves + lerp(swingsMs, i / Math.max(1, count - 1));
        clock = smashes;
        const span = smashes - leaves;
        const end: Point = {
          x: pivot.x + Math.sin(b) * rope,
          y: pivot.y + Math.cos(b) * rope,
        };
        const at: Point = { x: 0, y: 0 };
        swings.push({
          bar,
          pivot,
          end,
          leaves,
          smashes,
          second: leg === 1,
          // gathering speed into the smash
          at: (ms) => {
            const u = clamp01((ms - leaves) / span);
            const angle = lerp([a, b], 0.35 * u + 0.65 * easeIn(u));
            at.x = pivot.x + Math.sin(angle) * rope;
            at.y = pivot.y + Math.cos(angle) * rope;
            return at;
          },
        });
        const last = i === count - 1;
        blasts.push({
          at: end,
          ms: smashes,
          size: last ? HUGE : BLAST,
          shake: last ? 2 : lerp(SMASH_SHAKE, i / Math.max(1, count - 1)),
        });
        for (let c = 0; c < CLUSTER; c++) {
          const ca = (c / CLUSTER) * Math.PI * 2 + i;
          blasts.push({
            at: {
              x: end.x + Math.cos(ca) * CLUSTER_REACH,
              y: end.y + Math.sin(ca) * CLUSTER_REACH * 0.7,
            },
            ms: smashes + 45 + c * 30,
            size: CLUSTER_BLAST,
            shake: 0.6,
          });
        }
      });
    });
    const last = swings[swings.length - 1];
    const endAt = last.smashes;
    let lastBang = -Infinity;

    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (!cover?.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );
    const smashing = createBeats(
      swings,
      (s) => s.smashes,
      (s) => {
        if (s.second) cover!.tierUp(s.bar, s.pivot);
        else cover!.levels(s.bar, 0, s.pivot);
        if (s !== last) return;
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(s.end);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          booming.tick(ms, now);
          smashing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (const s of swings) {
            if (ms < s.leaves || ms >= s.smashes) continue;
            const bomb = s.at(ms);
            const bx = bomb.x;
            const by = bomb.y;
            // the pendulum's rope: a line of glitter up to the pivot
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            for (let d = 1; d < ROPE_DOTS; d++) {
              const f = d / ROPE_DOTS;
              stampGlimmer(
                ctx,
                lerp([s.pivot.x, bx], f),
                lerp([s.pivot.y, by], f),
                ROPE_SPARK * (0.6 + 0.4 * Math.sin(now / 80 + d)),
                now / 300 + d,
                d % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
              );
            }
            ctx.restore();
            drawLitFuse(
              ctx,
              s.at(ms),
              (ms - s.leaves) / (s.smashes - s.leaves),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.7,
              s.leaves,
              s.smashes,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
