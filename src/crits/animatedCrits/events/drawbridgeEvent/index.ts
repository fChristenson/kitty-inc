// the "Drawbridge" event (beam; a free floor): it covers its crit, whose
// click freezes the screen while hinge wisps light up at both edges of the
// screen level with the building's locked floor and two blazing spans of
// light rear up off them, straight up like a raised drawbridge; aim lines
// flicker across into the lock, then the spans lower toward each other in
// heavy clanks, every clank a flare at the hinges, a crack and a jolt;
// then they drop the rest of the way and slam together on the lock in a
// huge blast and shake; the floor bursts open, unlocked for free, as the
// screen unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "drawbridge";
const EDGE = 40;
const CLANKS = 4;
// each clank lowers the spans STEP rad from upright, CLANK_MS each
const STEP = 0.2;
const CLANK_MS = 90;
const AIM_MS = 260;
const SPAN = 24;
const HINGE = 0.5;
const CLANK_SHAKE: [number, number] = [0.5, 1.2];

export const forceDrawbridgeEvent = registerWispEvent(
  KEY,
  "Drawbridge",
  () => CONFIG.drawbridgeEvent.chance,
  (floor, context, area) => {
    const { clanksMs, dropMs, holdMs, mergeMs } = CONFIG.drawbridgeEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const hinges: Point[] = [
      { x: area.left + EDGE, y: lock.y },
      { x: area.right - EDGE, y: lock.y },
    ];
    const lengths = hinges.map((h) => Math.abs(lock.x - h.x));
    let clock = AIM_MS;
    const clanks = Array.from({ length: CLANKS }, (_, k) => {
      clock += lerp(clanksMs, k / (CLANKS - 1));
      return clock;
    });
    const drops = clock;
    const endAt = drops + dropMs;
    // the spans' lift above level: upright, clanking down, then dropped
    const lift = (ms: number) => {
      const upright = Math.PI / 2;
      let down = 0;
      for (const at of clanks)
        if (ms >= at - CLANK_MS)
          down += STEP * easeOut(clamp01((ms - at + CLANK_MS) / CLANK_MS));
      const left = upright - down;
      if (ms < drops) return left;
      return left * (1 - easeIn(clamp01((ms - drops) / dropMs)));
    };
    const tip: Point = { x: 0, y: 0 };
    const hingeAts = hinges.map((h) => () => h);

    const clanking = createBeats(
      clanks,
      (ms) => ms,
      (_, k) => {
        for (const h of hinges) cover!.burst(h, 0.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CLANK_SHAKE, k / (CLANKS - 1)));
      },
    );
    const slamming = createBeats(
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
        tick: (ms, now) => {
          clanking.tick(ms, now);
          slamming.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 200) return;
          const fade = 1 - clamp01((ms - endAt) / 200);
          const a = lift(Math.min(ms, endAt));
          for (let side = 0; side < 2; side++) {
            const h = hinges[side];
            const dir = side === 0 ? 1 : -1;
            if (ms < AIM_MS) drawAimLaser(ctx, h, lock);
            tip.x = h.x + dir * Math.cos(a) * lengths[side];
            tip.y = h.y - Math.sin(a) * lengths[side];
            drawBeam(ctx, h, tip, SPAN, 0.9 * fade * clamp01(ms / 120));
            drawBeamFlare(ctx, h, 20, fade, now);
            drawWispBetween(
              ctx,
              hingeAts[side],
              ms,
              now,
              WISP_SIZE * HINGE,
              0.5,
              0,
              endAt,
            );
          }
          if (ms > drops)
            drawBeamFlare(
              ctx,
              lock,
              30 * clamp01((ms - drops) / dropMs),
              fade,
              now,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
