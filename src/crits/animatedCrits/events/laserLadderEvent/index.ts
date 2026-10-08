// the "Laser Ladder" event (beam; a free floor): it covers its crit, whose
// click freezes the screen while rungs of light climb from the clicked
// floor's button up to the building's locked floor, each a pair of beams
// firing in from both ends to meet in a crack of light, a flare at both
// ends and a jolt, one rung above another, ever faster, a wisp scrambling up
// the rungs right behind; at the top the whole ladder fires into the lock at
// once, blasting it open in a huge blast and shake, and the floor is
// unlocked for free as the screen unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardLocked } from "../../eventRewards";
import { getLockCenter } from "../../../../floors/floorLock";

const KEY = "laserLadder";
const RUNG_GAP = 110;
const RUNGS: [number, number] = [6, 12];
const RUNG = 280;
const RUNG_WIDTH = 16;
const MEET_MS = 70;
const FLARE = 26;
const STAY_ALPHA = 0.7;
const BANG_GAP_MS = 60;
const RUNG_SHAKE: [number, number] = [0.3, 0.8];
const CLIMBER = 0.5;

export const forceLaserLadderEvent = registerWispEvent(
  KEY,
  "Laser Ladder",
  () => CONFIG.laserLadderEvent.chance,
  (floor, context) => {
    const { rungsMs, fireMs, holdMs, mergeMs } = CONFIG.laserLadderEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const center = getLockCenter();
    const lock: Point = { x: center.x, y: locked.offsetY + center.y };
    const dx = lock.x - button.x;
    const dy = lock.y - button.y;
    const length = Math.hypot(dx, dy) || 1;
    // across the ladder
    const nx = -dy / length;
    const ny = dx / length;
    const count = Math.round(
      Math.min(RUNGS[1], Math.max(RUNGS[0], length / RUNG_GAP)),
    );
    let clock = 0;
    const rungs = Array.from({ length: count }, (_, k) => {
      const t = k / (count - 1);
      // the top rung sits just short of the lock
      const u = (k + 1) / (count + 1);
      const mid: Point = { x: button.x + dx * u, y: button.y + dy * u };
      const half = (RUNG / 2) * lerp([1, 0.7], t);
      const fires = clock;
      clock += lerp(rungsMs, t);
      return {
        t,
        u,
        mid,
        ends: [
          { x: mid.x - nx * half, y: mid.y - ny * half },
          { x: mid.x + nx * half, y: mid.y + ny * half },
        ] as Point[],
        tips: [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ] as Point[],
        fires,
        meets: fires + MEET_MS,
      };
    });
    const top = rungs[count - 1];
    const blasts = top.meets + fireMs;
    const endAt = blasts;
    const head: Point = { x: 0, y: 0 };
    const climber = (ms: number): Point => {
      const t = Math.max(0, ms);
      // a hop up to each rung as it lights, then up into the lock
      let fromU = 0;
      let toU = 0;
      let from = 0;
      let to = 1;
      for (const r of rungs) {
        if (t < r.meets) {
          toU = r.u;
          to = r.meets;
          break;
        }
        fromU = r.u;
        from = r.meets;
        toU = 1;
        to = blasts;
      }
      const u = lerp([fromU, toU], easeOut(clamp01((t - from) / (to - from))));
      head.x = button.x + dx * u;
      head.y = button.y + dy * u;
      return head;
    };
    let lastBang = -Infinity;

    const meeting = createBeats(
      rungs,
      (r) => r.meets,
      (r) => {
        cover!.burst(r.mid, 0.35 + 0.25 * r.t);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(RUNG_SHAKE, r.t));
        if (r.meets - lastBang >= BANG_GAP_MS) {
          lastBang = r.meets;
          playBloop();
        }
      },
    );
    const firing = createBeats(
      [top.meets, blasts],
      (ms) => ms,
      (ms) => {
        if (ms === blasts) {
          cover!.blast(lock);
          return;
        }
        if (cover!.isLive()) playExplosion();
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          meeting.tick(ms, now);
          firing.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 200) return;
          const fire = clamp01((ms - top.meets) / fireMs);
          const after = 1 - clamp01((ms - blasts) / 200);
          for (const r of rungs) {
            if (ms < r.fires) break;
            const meet = clamp01((ms - r.fires) / MEET_MS);
            const fresh = 1 - clamp01((ms - r.meets) / 160);
            const alpha =
              (STAY_ALPHA + (1 - STAY_ALPHA) * fresh) * (1 - fire) * after;
            for (let e = 0; e < 2; e++) {
              const end = r.ends[e];
              const tip = r.tips[e];
              tip.x = lerp([end.x, r.mid.x], meet);
              tip.y = lerp([end.y, r.mid.y], meet);
              drawBeam(ctx, end, tip, RUNG_WIDTH * (1 + fresh), alpha);
              if (ms >= r.meets) {
                drawBeamFlare(ctx, end, FLARE * (0.6 + fresh), alpha, now);
                // the whole ladder firing into the lock
                if (fire > 0) {
                  const p = easeIn(fire);
                  tip.x = lerp([end.x, lock.x], p);
                  tip.y = lerp([end.y, lock.y], p);
                  drawBeam(ctx, end, tip, RUNG_WIDTH * 1.6, after);
                }
              }
            }
          }
          if (fire > 0) drawBeamFlare(ctx, lock, FLARE * 3 * fire, after, now);
          drawWispBetween(
            ctx,
            climber,
            ms,
            now,
            WISP_SIZE * CLIMBER,
            0.8,
            0,
            blasts,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
