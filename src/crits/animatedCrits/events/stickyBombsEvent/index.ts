// the "Sticky Bombs" event (explosion; worker perma tiers): it covers its
// crit, whose click freezes the screen while the clicked floor's button
// flicks out bomb wisps one after another that splat onto the workers in
// view and stick there, a thunk and a jolt each, their fuses fizzing and
// blinking ever faster as the screen rumbles; then they go off in a
// rattling chain from one end of the row to the other, every blast a bang
// and a jolt that lights its worker up a perma tier; the last goes off in
// a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../../../shared/explosion";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "stickyBombs";
const MAX_WORKERS = 7;
const LOFT = 70;
const STICK_UP = 6;
const BOMB = 0.35;
const FUSE = 20;
const BLAST = 140;
const STICK_SHAKE = 0.4;
const BOOM_SHAKE: [number, number] = [0.7, 1.4];

export const forceStickyBombsEvent = registerWispEvent(
  KEY,
  "Sticky Bombs",
  () => CONFIG.stickyBombsEvent.chance,
  (floor, context) => {
    const { flickMs, flyMs, fuseMs, chainMs, holdMs, mergeMs } =
      CONFIG.stickyBombsEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const n = workers.length;
    const stuckAll = (n - 1) * flickMs + flyMs;
    const chainAt = stuckAll + fuseMs;
    const bombs = workers.map((worker, k) => {
      const thrown = k * flickMs;
      const sticks = thrown + flyMs;
      const spot: Point = { x: worker.at.x, y: worker.at.y - STICK_UP };
      // the chain runs from one end, ever faster
      const booms = chainAt + chainMs * Math.sqrt(k / Math.max(1, n - 1));
      const at: Point = { x: 0, y: 0 };
      return {
        worker,
        spot,
        thrown,
        sticks,
        booms,
        at: (ms: number): Point | null => {
          if (ms < thrown || ms >= booms) return null;
          const u = easeOut(clamp01((ms - thrown) / flyMs));
          at.x = lerp([button.x, spot.x], u);
          at.y = lerp([button.y, spot.y], u) - Math.sin(Math.PI * u) * LOFT;
          return at;
        },
      };
    });
    const last = bombs[n - 1];
    const endAt = last.booms;

    const sticking = createBeats(
      bombs,
      (b) => b.sticks,
      () => {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(STICK_SHAKE);
      },
    );
    const booming = createBeats(
      bombs,
      (b) => b.booms,
      (b, k) => {
        cover!.promote(b.worker);
        if (b === last) {
          cover!.blast(b.spot);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BOOM_SHAKE, k / Math.max(1, n - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          sticking.tick(ms, now);
          booming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + DETONATION_MS) return;
          for (const b of bombs) {
            if (ms >= b.sticks && ms < b.booms)
              drawLitFuse(
                ctx,
                b.spot,
                clamp01((ms - b.sticks) / (b.booms - b.sticks)),
                FUSE,
                now,
              );
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.6,
              b.thrown,
              b.booms,
            );
            drawDetonation(ctx, b.spot, ms - b.booms, BLAST, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
