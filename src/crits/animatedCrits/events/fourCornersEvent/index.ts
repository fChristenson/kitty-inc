// the "Four Corners" event (lightning; a free floor): it covers its crit,
// whose click freezes the screen while four wisps shoot out of the clicked
// floor's button into the screen's four corners; one after another each
// cracks a bolt into the middle of the screen, every one a flash, a crack
// and a jolt, until a crackling X of lightning spans the whole screen;
// then the four wisps climb the screen's edges, dragging the X's crossing
// up onto the building's locked floor, which bursts open in a huge blast
// and shake, unlocked for free as the screen unfreezes. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "fourCorners";
const EDGE = 24;
const CORNER = 0.55;
const CRACK_SHAKE: [number, number] = [0.6, 1.2];

export const forceFourCornersEvent = registerWispEvent(
  KEY,
  "Four Corners",
  () => CONFIG.fourCornersEvent.chance,
  (floor, context, area) => {
    const { spreadMs, cracksMs, climbMs, holdMs, mergeMs } =
      CONFIG.fourCornersEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const target: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const start: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const half = (area.bottom - area.top) / 2 - EDGE;
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const cross: Point = { x: start.x, y: start.y };
    const sides = [
      [left, -1],
      [right, -1],
      [right, 1],
      [left, 1],
    ] as const;
    const corners = sides.map(() => ({ x: 0, y: 0 }));
    const bolts = corners.map((c) => createBolt(c, cross, 1));
    let clock: number = spreadMs;
    const cracks = sides.map((_, k) => {
      clock += lerp(cracksMs, k / (sides.length - 1));
      return clock;
    });
    const climbAt = cracks[cracks.length - 1] + 150;
    const endAt = climbAt + climbMs;
    const place = (ms: number) => {
      const u = smoothstep(clamp01((ms - climbAt) / climbMs));
      cross.x = lerp([start.x, target.x], u);
      cross.y = lerp([start.y, target.y], u);
      const spread = easeOut(clamp01(ms / spreadMs));
      for (let i = 0; i < sides.length; i++) {
        const [x, dir] = sides[i];
        corners[i].x = lerp([button.x, x], spread);
        corners[i].y = lerp([button.y, cross.y + dir * half], spread);
      }
    };
    const wisps = corners.map((c) => (ms: number): Point | null => {
      if (ms > endAt) return null;
      place(ms);
      return c;
    });

    const cracking = createBeats(
      cracks,
      (ms) => ms,
      (_, k) => {
        cover!.burst(cross, 0.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CRACK_SHAKE, k / (cracks.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(target),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          cracking.tick(ms, now);
          finale.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          place(ms);
          let lit = 0;
          for (let i = 0; i < bolts.length; i++) {
            if (ms < cracks[i]) continue;
            lit++;
            drawBolt(ctx, bolts[i], 0.9, 0.7);
          }
          if (lit > 0) drawStrike(ctx, cross, 0.8, 0.6 + 0.3 * lit, now);
          for (const w of wisps)
            drawWispBetween(ctx, w, ms, now, WISP_SIZE * CORNER, 0.7, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
