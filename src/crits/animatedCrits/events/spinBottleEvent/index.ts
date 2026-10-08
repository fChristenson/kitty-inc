// the "Spin the Bottle" event (wisp; free upgrade levels): it covers its
// crit, whose click freezes the screen while a pointer of wisps lines up
// in the middle of the screen and spins like a bottle at a party, whirring
// round and round and slowing, to tick to a stop pointing at an income
// bar; a wisp fires off its tip into the bar with a pop and a jolt that
// lands free levels; it spins again, quicker each time, bar after bar; the
// last spin flings its wisps out in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "spinBottle";
const MAX_BARS = 3;
const BEADS = 5;
// beads sit SPACING px apart out from the middle; each spin turns TURNS
// whole laps before settling
const SPACING = 17;
const TURNS = 2;
const SHOT_MS = 200;
const BEAD = 0.3;
const TIP = 0.5;
const SHOT = 0.4;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

export const forceSpinBottleEvent = registerWispEvent(
  KEY,
  "Spin the Bottle",
  () => CONFIG.spinBottleEvent.chance,
  (floor, context, area) => {
    const { gatherMs, spinsMs, levelShare, holdMs, mergeMs } =
      CONFIG.spinBottleEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    let clock: number = gatherMs;
    let angle = -Math.PI / 2;
    const spins = bars.map((bar, k) => {
      const span = lerp(spinsMs, k / Math.max(1, bars.length - 1));
      let target = Math.atan2(bar.center.y - center.y, bar.center.x - center.x);
      while (target < angle) target += Math.PI * 2;
      target += TURNS * Math.PI * 2;
      const s = {
        bar,
        from: angle,
        to: target,
        starts: clock,
        stops: clock + span,
        lands: clock + span + SHOT_MS,
        tip: {
          x: center.x + Math.cos(target) * SPACING * BEADS,
          y: center.y + Math.sin(target) * SPACING * BEADS,
        },
      };
      clock = s.lands;
      angle = target;
      return s;
    });
    const last = spins[spins.length - 1];
    const endAt = last.lands;
    const angleAt = (ms: number) => {
      let a = -Math.PI / 2;
      for (const s of spins) {
        if (ms < s.starts) break;
        a = lerp(
          [s.from, s.to],
          easeOut(clamp01((ms - s.starts) / (s.stops - s.starts))),
        );
      }
      return a;
    };
    const beads = Array.from({ length: BEADS }, (_, j) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms > endAt) return null;
        const gather = easeOut(clamp01(ms / gatherMs));
        const a = angleAt(ms);
        const r = SPACING * (j + 1);
        at.x = lerp([button.x, center.x + Math.cos(a) * r], gather);
        at.y = lerp([button.y, center.y + Math.sin(a) * r], gather);
        return at;
      };
    });
    const shots = spins.map((s) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < s.stops || ms >= s.lands) return null;
        const u = easeIn((ms - s.stops) / SHOT_MS);
        at.x = lerp([s.tip.x, s.bar.center.x], u);
        at.y = lerp([s.tip.y, s.bar.center.y], u);
        return at;
      };
    });

    const whirring = createBeats(
      spins,
      (s) => s.starts,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      spins,
      (s) => s.lands,
      (s, k) => {
        cover!.levels(s.bar, levelsFor(s.bar.floor, levelShare, 2), center);
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(center);
          return;
        }
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, spins.length - 1)));
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
          whirring.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          beads.forEach((bead, j) =>
            drawWispBetween(
              ctx,
              bead,
              ms,
              now,
              WISP_SIZE * (j === BEADS - 1 ? TIP : BEAD),
              0.6,
              0,
              endAt,
            ),
          );
          spins.forEach((s, k) =>
            drawWispBetween(
              ctx,
              shots[k],
              ms,
              now,
              WISP_SIZE * SHOT,
              1,
              s.stops,
              s.lands,
            ),
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
