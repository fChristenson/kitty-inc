// the "Rocket Jump" event (explosion; free upgrade levels): it covers its
// crit, whose click freezes the screen while a wisp hops onto the clicked
// floor's button and drops a fizzing bomb wisp at its feet; it blows in a
// white blast and a bang, rocketing the wisp up onto the next income bar,
// which jolts with free levels as it lands; it drops another bomb and
// blasts itself higher, bar after bar, the fuses ever shorter, up the
// screen; the last blast launches it into a huge blast and shake as every
// bar slams. Then the crit's tier pays out
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
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../../../shared/explosion";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "rocketJump";
const MAX_BARS = 4;
// the jumper stands ON px over a bar; a launch arcs LOFT px over the
// higher end
const ON = 26;
const LOFT = 70;
const JUMPER = 0.6;
const BOMB = 0.3;
const FUSE = 20;
const BLAST = 150;
const BLAST_SHAKE: [number, number] = [0.8, 1.5];

export const forceRocketJumpEvent = registerWispEvent(
  KEY,
  "Rocket Jump",
  () => CONFIG.rocketJumpEvent.chance,
  (floor, context) => {
    const { fusesMs, flyMs, levelShare, holdMs, mergeMs } =
      CONFIG.rocketJumpEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const bars = findRewardBars(floor, context)
      .sort((a, b) => b.center.y - a.center.y)
      .slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let clock = 0;
    let from: Point = { x: button.x, y: button.y - ON };
    const jumps = bars.map((bar, k) => {
      const lit = clock;
      const booms = lit + lerp(fusesMs, k / Math.max(1, bars.length - 1));
      const lands = booms + flyMs;
      const to: Point = {
        x: bar.center.x + (Math.random() - 0.5) * bar.box.width * 0.4,
        y: bar.box.y - ON,
      };
      const ctrl: Point = {
        x: (from.x + to.x) / 2,
        y: Math.min(from.y, to.y) - LOFT,
      };
      const j = {
        bar,
        from,
        to,
        ctrl,
        lit,
        booms,
        lands,
        pad: { x: from.x, y: from.y + ON * 0.6 },
      };
      clock = lands;
      from = to;
      return j;
    });
    const last = jumps[jumps.length - 1];
    const endAt = last.lands;
    const jumperAt: Point = { x: 0, y: 0 };
    const jumper = (ms: number): Point | null => {
      if (ms > endAt) return null;
      for (const j of jumps) {
        if (ms < j.booms) {
          jumperAt.x = j.from.x;
          jumperAt.y = j.from.y + Math.sin(ms / 40) * 1.5;
          return jumperAt;
        }
        if (ms < j.lands)
          return bezier(
            j.from,
            j.ctrl,
            j.to,
            easeOut((ms - j.booms) / flyMs),
            jumperAt,
          );
      }
      return last.to;
    };
    const bombs = jumps.map((j) => {
      const at: Point = j.pad;
      return (ms: number): Point | null =>
        ms < j.lit || ms >= j.booms ? null : at;
    });

    const booming = createBeats(
      jumps,
      (j) => j.booms,
      (_, k) => {
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BLAST_SHAKE, k / Math.max(1, jumps.length - 1)));
      },
    );
    const landing = createBeats(
      jumps,
      (j) => j.lands,
      (j) => {
        cover!.levels(j.bar, levelsFor(j.bar.floor, levelShare, 2), j.pad);
        if (j === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(j.to);
        } else cover!.burst(j.to, 0.4);
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
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + DETONATION_MS) return;
          jumps.forEach((j, k) => {
            if (ms >= j.lit && ms < j.booms)
              drawLitFuse(
                ctx,
                j.pad,
                clamp01((ms - j.lit) / (j.booms - j.lit)),
                FUSE,
                now,
              );
            drawWispBetween(
              ctx,
              bombs[k],
              ms,
              now,
              WISP_SIZE * BOMB,
              0.6,
              j.lit,
              j.booms,
            );
            drawDetonation(ctx, j.pad, ms - j.booms, BLAST, now);
          });
          drawWispBetween(
            ctx,
            jumper,
            ms,
            now,
            WISP_SIZE * JUMPER,
            0.8,
            0,
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
