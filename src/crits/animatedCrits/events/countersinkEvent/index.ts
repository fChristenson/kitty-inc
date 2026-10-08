// the "Countersink" event (drill; free upgrade levels): it covers its crit,
// whose click freezes the screen while a drill-headed wisp screams down out
// of the sky onto the clicked floor's "Lvl" label and slams into it with a
// bang; it stalls on the letters like a bit on hard steel, grinding and
// juddering in place in a gush of white-hot sparks, then starts to give,
// boring in shove by shove, every shove a jolt that kicks the level count
// up with a pop, the sparks spraying ever thicker, until it punches out
// the bottom in a huge blast and the count jumps by a big batch of free
// levels. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawGrind, planDrill, planGrind } from "../../../../shared/drill";
import { isFloorMaxed } from "../../../../gameState";
import { levelsFor } from "../../eventRewards";
import {
  drawUpgradeStarSpotlight,
  getUpgradeIndicatorCenter,
  setUpgradeStarHidden,
  STAR_BOTTOM_Y,
  STAR_Y,
  triggerLevelPop,
} from "../../../../floors/star";

const KEY = "countersink";
const SIZE = WISP_SIZE * 1.3;
const SPRAY = WISP_SIZE * 1.3;
const DROP = 460;
const PUSHES = 8;
const EXIT = 140;
const EXIT_MS = 160;
const HIT_SHAKE = 1.0;
const RUMBLE_SHAKE = 0.25;
const PUSH_SHAKE: [number, number] = [0.35, 0.8];

export const forceCountersinkEvent = registerWispEvent(
  KEY,
  "Countersink",
  () => CONFIG.countersinkEvent.chance,
  (floor, context, area) => {
    const {
      approachMs,
      stallMs,
      boreMs,
      pushShare,
      levelShare,
      holdMs,
      mergeMs,
    } = CONFIG.countersinkEvent;
    if (!context.upgradeFloorFree || isFloorMaxed(floor)) return;
    const label = getUpgradeIndicatorCenter(floor);
    const target: Point = { x: label.x, y: STAR_Y };
    const from: Point = {
      x: target.x,
      y: Math.max(area.top - 60, target.y - DROP),
    };
    const drill = planDrill(from, target, {
      approachMs,
      boreMs,
      pushes: PUSHES,
      reach: STAR_BOTTOM_Y - STAR_Y,
      exit: EXIT,
      exitMs: EXIT_MS,
    });
    const grind = planGrind(drill, stallMs);
    const { bites, pushes, rumbles, through, endMs: endAt } = grind;
    const under: Point = { x: target.x, y: STAR_BOTTOM_Y };
    const level = (share: number, min: number) => {
      context.upgradeFloorFree?.(floor, levelsFor(floor, share, min));
      triggerLevelPop(floor);
    };

    const hitting = createBeats(
      [bites],
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
        level(pushShare, 1);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PUSH_SHAKE, k / Math.max(1, pushes.length - 1)));
      },
    );
    const breaking = createBeats(
      [through],
      (ms) => ms,
      () => {
        level(levelShare, 3);
        cover!.blast(under);
      },
    );

    // the label is lifted out of the frozen frame so its count ticks up live
    setUpgradeStarHidden(floor);
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => setUpgradeStarHidden(null),
        tick: (ms, now) => {
          hitting.tick(ms, now);
          rumbling.tick(ms, now);
          shoving.tick(ms, now);
          breaking.tick(ms, now);
        },
        drawUnder: (ctx) => drawUpgradeStarSpotlight(ctx, floor),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 600) return;
          drawGrind(ctx, grind, ms, now, SIZE, SPRAY);
        },
      },
    );
    if (!cover) {
      setUpgradeStarHidden(null);
      return;
    }
    playBoostEventStream();
  },
  (floor, context) => !!context.upgradeFloorFree && !isFloorMaxed(floor),
);
