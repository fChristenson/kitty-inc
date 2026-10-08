// the "Tunnel Borer" event (drill; a free floor): it covers its crit, whose
// click freezes the screen while a huge drill-headed wisp screams in
// sideways off the screen's left edge and slams into the building's outer
// wall at the next locked floor with a bang; it stalls against the wall
// like a bit on hard rock, grinding and juddering in place as a gush of
// white-hot sparks streaks out of both sides and arcs away, then starts to
// give, boring in shove by shove, each harder, the sparks spraying ever
// thicker, until it punches through the wall in a blast and shake and
// rockets across the floor into its lock, which bursts open in a huge one:
// the floor unlocked for free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawGrind, planDrill, planGrind } from "../../../../shared/drill";
import { drawDetonation } from "../../../../shared/explosion";
import { findRewardLocked } from "../../eventRewards";
import {
  FLOOR_H,
  FLOOR_W,
  SIDE_WALL_WIDTH,
} from "../../../../floors/constants";

const KEY = "tunnelBorer";
const SIZE = WISP_SIZE * 1.5;
const SPRAY = WISP_SIZE * 1.5;
// px off the screen's edge it flies in from (at most RUN from the wall)
const ENTRY = 80;
const RUN = 520;
const PUSHES = 8;
const THROUGH_BLAST = 280;
const HIT_SHAKE = 1.2;
const RUMBLE_SHAKE = 0.3;
const PUSH_SHAKE: [number, number] = [0.35, 0.85];
const THROUGH_SHAKE = 1.8;

export const forceTunnelBorerEvent = registerWispEvent(
  KEY,
  "Tunnel Borer",
  () => CONFIG.tunnelBorerEvent.chance,
  (floor, context, area) => {
    const { approachMs, stallMs, boreMs, exitMs, holdMs, mergeMs } =
      CONFIG.tunnelBorerEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    // the wall's outer face, and its inner one where the drill comes out
    const wall: Point = { x: 0, y: lock.y };
    const inside: Point = { x: SIDE_WALL_WIDTH, y: lock.y };
    const from: Point = {
      x: Math.max(area.left - ENTRY, wall.x - RUN),
      y: lock.y,
    };
    const drill = planDrill(from, wall, {
      approachMs,
      boreMs,
      pushes: PUSHES,
      reach: SIDE_WALL_WIDTH,
      exit: lock.x - SIDE_WALL_WIDTH,
      exitMs,
    });
    const grind = planGrind(drill, stallMs);
    const { bites: hits, pushes, rumbles, through, endMs: endAt } = grind;

    const hitting = createBeats(
      [hits],
      (ms) => ms,
      () => {
        cover!.burst(wall, 0.6);
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
        cover!.burst(inside, 0.9);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(THROUGH_SHAKE);
      },
    );
    const opening = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(lock),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          hitting.tick(ms, now);
          rumbling.tick(ms, now);
          shoving.tick(ms, now);
          breaking.tick(ms, now);
          opening.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 900) return;
          drawGrind(ctx, grind, ms, now, SIZE, SPRAY);
          drawDetonation(ctx, inside, ms - through, THROUGH_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
