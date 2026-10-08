// the "Auger" event (drill; free upgrade levels): it covers its crit, whose
// click freezes the screen while a drill head screams in from the side of
// the screen and bites into an income bar with a bang; it bores in shove by
// shove, sparks and chips spraying back out of the hole, every shove a
// jolt, then punches out through the bar in a burst that lands free levels
// and flies on as the next drill bites into the next bar, quicker each
// time; the last breaks through in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDrill, planDrill, type Drill } from "../../../../shared/drill";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "auger";
const MAX_BARS = 4;
const OFF = 80;
const RISE = 220;
const DRILL = WISP_SIZE * 1.1;
const BITE_SHAKE = 0.8;
const PUSH_SHAKE = 0.35;
const THROUGH_SHAKE: [number, number] = [0.7, 1.3];

interface Bore {
  bar: RewardBar;
  drill: Drill;
}

export const forceAugerEvent = registerWispEvent(
  KEY,
  "Auger",
  () => CONFIG.augerEvent.chance,
  (floor, context, area) => {
    const { approachMs, boresMs, levelShare, holdMs, mergeMs } =
      CONFIG.augerEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    // each starts as the one before bites, from alternate sides
    let clock = 0;
    const bores: Bore[] = bars.map((bar, k) => {
      const fromLeft = k % 2 === 0;
      const target: Point = {
        x: bar.box.x + bar.box.width * (fromLeft ? 0.3 : 0.7),
        y: bar.center.y,
      };
      const from: Point = {
        x: fromLeft ? area.left - OFF : area.right + OFF,
        y: target.y - RISE,
      };
      const drill = planDrill(from, target, {
        approachMs,
        boreMs: lerp(boresMs, k / Math.max(1, bars.length - 1)),
        reach: 40,
        exit: 420,
        startMs: clock,
      });
      clock = drill.bites;
      return { bar, drill };
    });
    const last = bores[bores.length - 1];
    const endAt = last.drill.through;
    const pushes = bores.flatMap((b) => b.drill.pushes.slice(0, -1));

    const biting = createBeats(
      bores,
      (b) => b.drill.bites,
      (b) => {
        cover!.burst(b.drill.target, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BITE_SHAKE);
      },
    );
    const pushing = createBeats(
      pushes,
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(PUSH_SHAKE);
      },
    );
    const breaking = createBeats(
      bores,
      (b) => b.drill.through,
      (b, k) => {
        cover!.levels(
          b.bar,
          levelsFor(b.bar.floor, levelShare, 2),
          b.drill.target,
        );
        if (b === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(b.drill.target);
          return;
        }
        cover!.burst(b.drill.target, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(THROUGH_SHAKE, k / Math.max(1, bores.length - 1)));
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
          biting.tick(ms, now);
          pushing.tick(ms, now);
          breaking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0) return;
          for (const b of bores) drawDrill(ctx, b.drill, ms, now, DRILL);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
