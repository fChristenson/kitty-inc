// the "Breach" event (beam; a free floor): it covers its crit, whose click
// freezes the screen while two aim lasers flicker up out of the clicked
// floor's button onto the building's locked floor, then two blazing beams
// fire and cut round its outline from the top in both directions at once,
// sparks spraying, every quarter a bang and a jolt, faster and faster; they
// meet at its foot in a huge blast and shake, and as the screen unfreezes
// the floor breaks open: unlocked for free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";
import type { Point } from "../../../../shared/wisp";

const KEY = "breach";
// the cut runs INSET px inside the locked floor's edges
const INSET = 26;
const BLADE = 14;
const SCAR = 6;
const FLARE = 24;
const QUARTER_SHAKE: [number, number] = [0.8, 1.5];

export const forceBreachEvent = registerWispEvent(
  KEY,
  "Breach",
  () => CONFIG.breachEvent.chance,
  (floor, context) => {
    const { aimMs, cutMs, holdMs, mergeMs } = CONFIG.breachEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const x0 = INSET;
    const x1 = FLOOR_W - INSET;
    const y0 = locked.offsetY + INSET;
    const y1 = locked.offsetY + FLOOR_H - INSET;
    const mid = (x0 + x1) / 2;
    // both cuts from the top middle, one round each side to the foot
    const paths: Point[][] = [
      [
        { x: mid, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: mid, y: y1 },
      ],
      [
        { x: mid, y: y0 },
        { x: x0, y: y0 },
        { x: x0, y: y1 },
        { x: mid, y: y1 },
      ],
    ];
    const emitters: Point[] = [
      { x: button.x + 30, y: button.y },
      { x: button.x - 30, y: button.y },
    ];
    const lengths = [x1 - mid, y1 - y0, x1 - mid];
    const total = lengths.reduce((s, l) => s + l, 0);
    const cutAt = aimMs;
    const meetAt = aimMs + cutMs;
    const centre: Point = { x: mid, y: (y0 + y1) / 2 };
    // how far round (0..1) the cuts are, ms in, speeding up
    const share = (ms: number) =>
      easeIn(clamp01((ms - cutAt) / cutMs)) * 0.6 +
      clamp01((ms - cutAt) / cutMs) * 0.4;
    const tips = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];
    const place = (path: Point[], s: number, into: Point): number => {
      let left = s * total;
      for (let j = 0; j < lengths.length; j++) {
        if (left <= lengths[j] || j === lengths.length - 1) {
          const f = Math.min(1, left / lengths[j]);
          into.x = path[j].x + (path[j + 1].x - path[j].x) * f;
          into.y = path[j].y + (path[j + 1].y - path[j].y) * f;
          return j;
        }
        left -= lengths[j];
      }
      return lengths.length - 1;
    };
    // the times the cuts are a quarter, half and three quarters round
    const quarters = [0.25, 0.5, 0.75].map((q) => {
      for (let ms = cutAt; ms < meetAt; ms += 4) if (share(ms) >= q) return ms;
      return meetAt;
    });

    const cutting = createBeats(
      quarters,
      (ms) => ms,
      (ms, k) => {
        for (let p = 0; p < 2; p++) {
          const at = { x: 0, y: 0 };
          place(paths[p], share(ms), at);
          cover!.burst(at, 0.5 + 0.2 * k);
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(QUARTER_SHAKE, k / 2));
      },
    );
    const meeting = createBeats(
      [meetAt],
      (ms) => ms,
      () => cover!.blast(centre),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: meetAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          cutting.tick(ms, now);
          meeting.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms >= meetAt + holdMs) return;
          if (ms < cutAt) {
            for (const e of emitters) drawAimLaser(ctx, e, paths[0][0]);
            return;
          }
          const s = share(ms);
          for (let p = 0; p < 2; p++) {
            const path = paths[p];
            const j = place(path, s, tips[p]);
            // the glowing scar cut so far
            for (let i = 0; i < j; i++)
              drawBeam(ctx, path[i], path[i + 1], SCAR, 0.8);
            drawBeam(ctx, path[j], tips[p], SCAR, 0.8);
            if (ms < meetAt) {
              drawBeam(ctx, emitters[p], tips[p], BLADE);
              drawBeamFlare(ctx, tips[p], FLARE, 1, now);
            }
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
