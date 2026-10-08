// the "Breakthrough" event (drill; free upgrade levels and a crit tier): it
// covers its crit, whose click freezes the screen while a drill-headed wisp
// screams down out of the sky and slams into the middle of the clicked
// floor's income bar with a bang; it stalls against the bar like a bit on
// hard steel, grinding and juddering in place as a gush of white-hot sparks
// streaks out of both sides and arcs away, then starts to give, boring in
// shove by shove, each harder, the sparks spraying ever thicker and
// faster, until it punches out the underside in a huge blast and shake and
// the bar jumps a crit tier with free levels. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawGrind, planDrill, planGrind } from "../../../../shared/drill";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "breakthrough";
const SIZE = WISP_SIZE * 1.3;
const DROP = 460;
const PUSHES = 8;
const EXIT = 150;
const EXIT_MS = 160;
const SPRAY = WISP_SIZE * 1.3;
const HIT_SHAKE = 1.0;
const RUMBLE_SHAKE = 0.25;
const PUSH_SHAKE: [number, number] = [0.35, 0.8];

export const forceBreakthroughEvent = registerWispEvent(
  KEY,
  "Breakthrough",
  () => CONFIG.breakthroughEvent.chance,
  (floor, context, area) => {
    const { approachMs, stallMs, boreMs, levelShare, holdMs, mergeMs } =
      CONFIG.breakthroughEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const target: Point = { x: bar.center.x, y: bar.box.y };
    const from: Point = {
      x: target.x,
      y: Math.max(area.top - 60, target.y - DROP),
    };
    const drill = planDrill(from, target, {
      approachMs,
      boreMs,
      pushes: PUSHES,
      reach: bar.box.height,
      exit: EXIT,
      exitMs: EXIT_MS,
    });
    const grind = planGrind(drill, stallMs);
    const { bites: hits, pushes, rumbles, through, endMs: endAt } = grind;
    const under: Point = {
      x: target.x,
      y: bar.box.y + bar.box.height,
    };

    const hitting = createBeats(
      [hits],
      (ms) => ms,
      () => {
        cover!.burst(target, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(HIT_SHAKE);
      },
    );
    const rumbling = createBeats(
      rumbles,
      (ms) => ms,
      () => {
        if (cover!.isLive()) shakeScreen(RUMBLE_SHAKE);
      },
    );
    const shoving = createBeats(
      pushes,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PUSH_SHAKE, k / Math.max(1, pushes.length - 1)));
      },
    );
    const breaking = createBeats(
      [through],
      (ms) => ms,
      () => {
        cover!.tierUp(bar, under);
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 3), under);
        cover!.slam(bar);
        cover!.blast(under);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          hitting.tick(ms, now);
          rumbling.tick(ms, now);
          shoving.tick(ms, now);
          breaking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 600) return;
          drawGrind(ctx, grind, ms, now, SIZE, SPRAY);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
