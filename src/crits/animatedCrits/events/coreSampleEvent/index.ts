// the "Core Sample" event (drill; free upgrade levels): it covers its crit,
// whose click freezes the screen while a drill head screams down out of
// the sky onto the top income bar and bores straight down through it in
// shuddering shoves, sparks and chips spraying back up out of the hole,
// punches out the underside with a jolt of free levels and plunges on into
// the next bar down, boring every bar in the stack one after another, each
// quicker than the last, the last punching through in a huge blast and
// shake. Then the crit's tier pays out
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

const KEY = "coreSample";
const MAX_BARS = 4;
const SIZE = WISP_SIZE * 1.1;
const PUSHES = 3;
const REACH = 30;
const EXIT = 50;
const EXIT_MS = 90;
// each bar's boring is this much quicker than the first by the last
const QUICKEN: [number, number] = [1, 0.55];
const BITE_SHAKE = 0.35;
const PUSH_SHAKE = 0.25;
const HIT_SHAKE: [number, number] = [0.7, 1.4];

interface Core {
  bar: RewardBar;
  drill: Drill;
}

export const forceCoreSampleEvent = registerWispEvent(
  KEY,
  "Core Sample",
  () => CONFIG.coreSampleEvent.chance,
  (floor, context, area) => {
    const { approachMs, boresMs, levelShare, holdMs, mergeMs } =
      CONFIG.coreSampleEvent;
    const bars = findRewardBars(floor, context)
      .slice(0, MAX_BARS)
      .sort((a, b) => a.box.y - b.box.y);
    if (bars.length === 0) return;
    let from: Point = { x: bars[0].center.x, y: area.top - 60 };
    let clock = 0;
    const cores: Core[] = bars.map((bar, k) => {
      const t = k / Math.max(1, bars.length - 1);
      const quicken = lerp(QUICKEN, t);
      // in at the top face, straight down through it
      const target: Point = { x: bar.center.x, y: bar.box.y };
      const drill = planDrill(from, target, {
        approachMs: approachMs * quicken,
        boreMs: lerp(boresMs, t),
        pushes: PUSHES,
        reach: Math.max(REACH, bar.box.height),
        exit: EXIT,
        exitMs: EXIT_MS,
        startMs: clock,
      });
      const out = drill.at(drill.endMs);
      from = { x: out.x, y: out.y };
      clock = drill.endMs;
      return { bar, drill };
    });
    const last = cores[cores.length - 1];
    const endAt = last.drill.through;
    const pushes = cores.flatMap((c) => c.drill.pushes.slice(0, -1));

    const biting = createBeats(
      cores,
      (c) => c.drill.bites,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(BITE_SHAKE);
      },
    );
    const shoving = createBeats(
      pushes,
      (ms) => ms,
      () => {
        if (cover!.isLive()) shakeScreen(PUSH_SHAKE);
      },
    );
    const punching = createBeats(
      cores,
      (c) => c.drill.through,
      (c, k) => {
        const at: Point = {
          x: c.bar.center.x,
          y: c.bar.box.y + c.bar.box.height,
        };
        cover!.levels(c.bar, levelsFor(c.bar.floor, levelShare, 2), at);
        if (c === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, cores.length - 1)));
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
          shoving.tick(ms, now);
          punching.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 600) return;
          for (const c of cores) drawDrill(ctx, c.drill, ms, now, SIZE);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
