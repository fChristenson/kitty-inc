// the "Light Sail" event (beam; a free floor): it covers its crit, whose
// click freezes the screen while a sail wisp charges up on the clicked
// floor's button; emitters along the bottom of the screen fire blazing
// beams up onto it one after another, every beam that locks on a flare, a
// whoosh and a jolt that kicks it faster, and the sail rides the beams
// straight up the building, swaying, ever faster, until it smashes into the
// next locked floor, which bursts open in a huge blast and shake, unlocked
// for free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playSlamExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "lightSail";
const EMITTERS = 4;
// firing order: the outer pair first, then the inner
const ORDER = [0, 3, 1, 2];
const LOW = 30;
const INSET = 110;
const SWAY = 22;
const BEAM_W = 9;
const KICK_MS = 160;
const FADE_MS = 260;
const SAIL: [number, number] = [0.5, 0.9];
const KICK_SHAKE: [number, number] = [0.5, 1.1];
const HIT_SHAKE = 2.4;

interface Emitter {
  at: Point;
  fires: number;
}

export const forceLightSailEvent = registerWispEvent(
  KEY,
  "Light Sail",
  () => CONFIG.lightSailEvent.chance,
  (floor, context, area) => {
    const { chargeMs, riseMs, holdMs, mergeMs } = CONFIG.lightSailEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const hits = chargeMs + riseMs;
    const emitters: Emitter[] = ORDER.map((slot, i) => ({
      at: {
        x: lerp([area.left + INSET, area.right - INSET], slot / (EMITTERS - 1)),
        y: area.bottom - LOW,
      },
      fires: chargeMs + riseMs * 0.55 * (i / (EMITTERS - 1)) ** 0.8,
    }));
    // every beam on adds the same push, so how far it's come is the sum of
    // (ms - fires)² over the beams on, scaled to arrive right at `hits`
    const push = (ms: number) => {
      let sum = 0;
      for (const e of emitters) if (ms > e.fires) sum += (ms - e.fires) ** 2;
      return sum;
    };
    const full = push(hits);
    const spot: Point = { x: 0, y: 0 };
    const sailAt = (ms: number): Point | null => {
      if (ms > hits) return null;
      const u = clamp01(push(ms) / full);
      spot.x =
        lerp([button.x, lock.x], smoothstep(u)) +
        Math.sin(ms * 0.012) * SWAY * (1 - u);
      spot.y = lerp([button.y, lock.y], u);
      return spot;
    };
    const sail: Point = { x: 0, y: 0 };

    const kicking = createBeats(
      emitters,
      (e) => e.fires,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(KICK_SHAKE, k / (EMITTERS - 1)));
      },
    );
    const smashing = createBeats(
      [hits],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (!cover!.isLive()) return;
        playSlamExplosion();
        shakeScreen(HIT_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: hits + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          kicking.tick(ms, now);
          smashing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > hits + FADE_MS) return;
          const fade = 1 - clamp01((ms - hits) / FADE_MS);
          // the beams hold on the spot it smashed into as they fade
          const at = sailAt(Math.min(ms, hits));
          if (at) {
            sail.x = at.x;
            sail.y = at.y;
          }
          for (const e of emitters) {
            if (ms < e.fires) continue;
            const kick = 1 - clamp01((ms - e.fires) / KICK_MS);
            const flicker = 0.85 + 0.15 * Math.sin(now * 0.05 + e.at.x);
            drawBeam(
              ctx,
              e.at,
              sail,
              BEAM_W * (1 + 1.5 * kick) * flicker,
              fade,
            );
            drawBeamFlare(ctx, e.at, 18 + 14 * kick, fade, now);
          }
          if (ms >= emitters[0].fires) drawBeamFlare(ctx, sail, 30, fade, now);
          const charge = clamp01(ms / chargeMs);
          drawWisp(
            ctx,
            sailAt,
            ms,
            now,
            WISP_SIZE * lerp(SAIL, Math.min(charge, push(ms) / full + 0.3)),
            charge,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
