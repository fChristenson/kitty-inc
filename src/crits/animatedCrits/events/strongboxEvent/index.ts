// the "Strongbox" event (drill; cash): it covers its crit, whose click
// freezes the screen while a drill-headed wisp screams up at the total-income
// readout like a safecracker's drill at a strongbox and bites into it with a
// bang; it stalls, grinding and juddering against it as a gush of white-hot
// sparks streaks out of both sides, then starts to give and bores in shove
// by shove, each harder, until it punches through and the total bursts open
// in a huge blast and shake, cash flying out of it. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawGrind, planDrill, planGrind } from "../../../../shared/drill";
import { totalSpot } from "../../cashFlow";

const KEY = "strongbox";
const REWARD = 4;
const SIZE = WISP_SIZE * 1.3;
const SPRAY = WISP_SIZE * 1.3;
const PUSHES = 8;
// where it flies in from, off to one side below the total
const FROM: Point = { x: 320, y: 560 };
const REACH = 44;
const HIT_SHAKE = 1.0;
const RUMBLE_SHAKE = 0.25;
const PUSH_SHAKE: [number, number] = [0.35, 0.8];

export const forceStrongboxEvent = registerWispEvent(
  KEY,
  "Strongbox",
  () => CONFIG.strongboxEvent.chance,
  (floor, context, area) => {
    const { approachMs, stallMs, boreMs, holdMs, mergeMs } =
      CONFIG.strongboxEvent;
    const total = totalSpot(area);
    const side = Math.random() < 0.5 ? -1 : 1;
    const target: Point = { x: total.x, y: total.y + 24 };
    const grind = planGrind(
      planDrill({ x: target.x + side * FROM.x, y: target.y + FROM.y }, target, {
        approachMs,
        boreMs,
        pushes: PUSHES,
        reach: REACH,
      }),
      stallMs,
    );
    const { bites, pushes, rumbles, through, endMs } = grind;

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
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PUSH_SHAKE, k / Math.max(1, pushes.length - 1)));
      },
    );
    const breaking = createBeats(
      [through],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          hitting.tick(ms, now);
          rumbling.tick(ms, now);
          shoving.tick(ms, now);
          breaking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs + 600) return;
          drawGrind(ctx, grind, ms, now, SIZE, SPRAY);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
