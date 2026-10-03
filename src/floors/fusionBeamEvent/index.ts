// the "Fusion Beam" event (beam; a free floor): it covers its crit, whose
// click freezes the screen while eight wisps streak in from the screen's
// edges and ring a focus wisp hovering over the clicked floor's button; one
// by one they fire beams into it, each a crackle and a jolt, the focus
// swelling white-hot, until it fires one colossal fused beam straight up the
// building into the locked floor, which blows open in a huge blast and
// shake, unlocked for free, as the screen unfreezes. Then the crit's tier
// pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { drawBeam, drawBeamFlare } from "../../shared/beam";
import { createBeats } from "../../shared/eventBeats";
import { findRewardLocked } from "../eventRewards";
import { FLOOR_H, FLOOR_W } from "../constants";

const KEY = "fusionBeam";
const EMITTERS = 8;
const HOVER = 200;
const RING = 140;
const ARRIVE = 0.45;
const WIDTH = 10;
const FUSED = 60;
const EMITTER = 0.35;
const FOCUS: [number, number] = [0.4, 1.1];
const FIRE_SHAKE: [number, number] = [0.3, 0.8];

export const forceFusionBeamEvent = registerWispEvent(
  KEY,
  "Fusion Beam",
  () => CONFIG.fusionBeamEvent.chance,
  (floor, context, area) => {
    const { gatherMs, fireMs, holdMs, mergeMs } = CONFIG.fusionBeamEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const focus: Point = { x: button.x, y: button.y - HOVER };
    const cx = (area.left + area.right) / 2;
    const cy = (area.top + area.bottom) / 2;
    const emitters = Array.from({ length: EMITTERS }, (_, i) => {
      const a = (i / EMITTERS) * Math.PI * 2;
      const from: Point = {
        x: cx + Math.cos(a) * (area.right - area.left) * 0.55,
        y: cy + Math.sin(a) * (area.bottom - area.top) * 0.55,
      };
      const to: Point = {
        x: focus.x + Math.cos(a) * RING,
        y: focus.y + Math.sin(a) * RING,
      };
      const at: Point = { x: 0, y: 0 };
      return {
        to,
        fires: gatherMs * lerp([ARRIVE, 0.95], i / (EMITTERS - 1)),
        at: (ms: number): Point => {
          const e = easeOut(clamp01(ms / (gatherMs * ARRIVE)));
          at.x = lerp([from.x, to.x], e);
          at.y = lerp([from.y, to.y], e);
          return at;
        },
      };
    });
    const endAt = gatherMs + fireMs;
    const tip: Point = { x: 0, y: 0 };

    const firing = createBeats(
      emitters,
      (e) => e.fires,
      (e, k) => {
        cover!.burst(e.to, 0.3);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(FIRE_SHAKE, k / (EMITTERS - 1)));
      },
    );
    const fusing = createBeats(
      [gatherMs],
      (ms) => ms,
      () => {
        cover!.burst(focus, 1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.2);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (cover!.isLive()) playExplosion();
      },
    );

    const focusAt = (): Point => focus;
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          firing.tick(ms, now);
          fusing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          let lit = 0;
          for (const e of emitters) {
            if (ms >= e.fires && ms < gatherMs) {
              drawBeam(ctx, e.to, focus, WIDTH, 1);
              lit++;
            }
            drawWispBetween(
              ctx,
              e.at,
              ms,
              now,
              WISP_SIZE * EMITTER,
              0.5,
              0,
              gatherMs,
            );
          }
          if (ms >= gatherMs) {
            const u = easeOut(clamp01((ms - gatherMs) / fireMs));
            tip.x = lerp([focus.x, lock.x], u);
            tip.y = lerp([focus.y, lock.y], u);
            drawBeam(ctx, focus, tip, FUSED, 1);
            drawBeamFlare(ctx, tip, 80, 1, now);
          }
          drawBeamFlare(ctx, focus, 20 + 6 * lit, 1, now);
          drawWispBetween(
            ctx,
            focusAt,
            ms,
            now,
            WISP_SIZE * lerp(FOCUS, clamp01(ms / gatherMs)),
            clamp01(ms / gatherMs),
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
