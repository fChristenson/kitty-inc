// the "Minefield" event (explosion; free upgrade levels): it covers its
// crit, whose click freezes the screen while the clicked floor's button
// scatters mine wisps along every income bar in view, each blinking with
// a fizzing fuse; a wisp sprints out and zigzags along the bars, ever
// faster, tripping every mine it crosses in a white blast, a bang and a
// jolt, and every bar it clears gets free levels; the last mine goes off
// in a huge blast and shake as every bar slams. Then the crit's tier pays
// out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../../../shared/explosion";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "minefield";
const MAX_BARS = 4;
const PER_BAR = 3;
// mines sit ABOVE px over a bar, INSET px in from its ends; the runner
// speeds up by PACE
const ABOVE = 18;
const INSET = 26;
const PACE = 1.5;
const MINE = 0.3;
const FUSE = 18;
const BLAST = 130;
const RUNNER = 0.55;
const LAY_FLY = 0.6;
const MINE_SHAKE: [number, number] = [0.6, 1.4];

export const forceMinefieldEvent = registerWispEvent(
  KEY,
  "Minefield",
  () => CONFIG.minefieldEvent.chance,
  (floor, context) => {
    const { layMs, runMs, levelShare, holdMs, mergeMs } = CONFIG.minefieldEvent;
    const bars = findRewardBars(floor, context)
      .slice(0, MAX_BARS)
      .sort((a, b) => a.center.y - b.center.y);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const route: Point[] = [];
    bars.forEach((bar, k) => {
      const y = bar.box.y - ABOVE;
      const left = { x: bar.box.x + INSET, y };
      const right = { x: bar.box.x + bar.box.width - INSET, y };
      route.push(...(k % 2 === 0 ? [left, right] : [right, left]));
    });
    const legs = route.length - 1;
    const runAt = (u: number) => layMs + runMs * u ** (1 / PACE);
    const mines = bars.flatMap((bar, k) =>
      Array.from({ length: PER_BAR }, (_, j) => {
        // along this bar's leg of the route
        const u = (2 * k + (j + 0.5) / PER_BAR) / legs;
        const spot = alongRoute(route, Math.min(1, u), { x: 0, y: 0 });
        const laid =
          (layMs * LAY_FLY * (k * PER_BAR + j)) / (bars.length * PER_BAR);
        return {
          bar,
          spot,
          laid,
          booms: runAt(Math.min(1, u)),
          last: j === PER_BAR - 1,
        };
      }),
    );
    const finalMine = mines[mines.length - 1];
    const endAt = finalMine.booms;
    const flyMs = layMs * (1 - LAY_FLY);
    const mineWisps = mines.map((m) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < m.laid || ms >= m.booms) return null;
        const u = easeOut(clamp01((ms - m.laid) / flyMs));
        at.x = lerp([button.x, m.spot.x], u);
        at.y = lerp([button.y, m.spot.y], u) - Math.sin(Math.PI * u) * 50;
        return at;
      };
    });
    const runnerAt: Point = { x: 0, y: 0 };
    const runner = (ms: number): Point | null => {
      if (ms < layMs || ms > endAt) return null;
      const u = clamp01((ms - layMs) / runMs) ** PACE;
      return alongRoute(route, u, runnerAt);
    };

    const booming = createBeats(
      mines,
      (m) => m.booms,
      (m, k) => {
        if (m === finalMine) {
          cover!.levels(m.bar, levelsFor(m.bar.floor, levelShare, 2), m.spot);
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(m.spot);
          return;
        }
        if (m.last)
          cover!.levels(m.bar, levelsFor(m.bar.floor, levelShare, 2), m.spot);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(MINE_SHAKE, k / mines.length));
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
        tick: (ms, now) => booming.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + DETONATION_MS) return;
          mines.forEach((m, i) => {
            if (ms >= m.laid + flyMs && ms < m.booms)
              drawLitFuse(
                ctx,
                m.spot,
                clamp01((ms - layMs) / (m.booms - layMs)),
                FUSE,
                now,
              );
            drawWispBetween(
              ctx,
              mineWisps[i],
              ms,
              now,
              WISP_SIZE * MINE,
              0.5,
              m.laid,
              m.booms,
            );
            drawDetonation(ctx, m.spot, ms - m.booms, BLAST, now);
          });
          drawWispBetween(
            ctx,
            runner,
            ms,
            now,
            WISP_SIZE * RUNNER,
            0.9,
            layMs,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
