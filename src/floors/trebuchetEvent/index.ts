// the "Trebuchet" event (explosion; a free floor): it covers its crit, whose
// click freezes the screen while a heavy wisp hurtles down out of the top of
// the screen onto one side of the clicked floor's button with a thud and a
// jolt, and on the other side a lit bomb wisp whips round in a sling and
// flies up in a huge arc into the building's locked floor, going off on it
// in a white blast and a bang; again, higher and harder, and a third time,
// and the lock blows in a huge blast and shake; the floor bursts open,
// unlocked for free, as the screen unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../shared/explosion";
import { findRewardLocked } from "../eventRewards";
import { FLOOR_H, FLOOR_W } from "../constants";

const KEY = "trebuchet";
const THROWS = 3;
// the weight drops DROP_MS from the top onto ARM px left of the button; the
// bomb swings SWING_MS round SLING px on the right before letting go
const ARM = 90;
const DROP_MS = 200;
const SWING_MS = 160;
const SLING = 60;
const HIGH: [number, number] = [200, 360];
const WEIGHT = 0.7;
const BOMB = 0.45;
const FUSE = 20;
const BLAST = 200;
const THUD_SHAKE = 0.9;
const HIT_SHAKE: [number, number] = [0.9, 1.4];

export const forceTrebuchetEvent = registerWispEvent(
  KEY,
  "Trebuchet",
  () => CONFIG.trebuchetEvent.chance,
  (floor, context, area) => {
    const { throwsMs, holdMs, mergeMs } = CONFIG.trebuchetEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const pad: Point = { x: button.x - ARM, y: button.y };
    const pivot: Point = { x: button.x + ARM * 0.5, y: button.y };
    let clock = 0;
    const throws = Array.from({ length: THROWS }, (_, k) => {
      const drops = clock;
      const thuds = drops + DROP_MS;
      const releases = thuds + SWING_MS;
      clock += lerp(throwsMs, k / (THROWS - 1));
      const hits = clock;
      const release: Point = { x: pivot.x, y: pivot.y - SLING };
      const target: Point = {
        x: lock.x + (k - 1) * 50,
        y: lock.y + (k === THROWS - 1 ? 0 : 20),
      };
      const ctrl: Point = {
        x: (release.x + target.x) / 2,
        y: Math.min(release.y, target.y) - lerp(HIGH, k / (THROWS - 1)),
      };
      const weightAt: Point = { x: 0, y: 0 };
      const bombAt: Point = { x: 0, y: 0 };
      return {
        drops,
        thuds,
        releases,
        hits,
        target,
        final: k === THROWS - 1,
        weight: (ms: number): Point => {
          weightAt.x = pad.x;
          weightAt.y = lerp(
            [area.top - 40, pad.y],
            easeIn(clamp01((ms - drops) / DROP_MS)),
          );
          return weightAt;
        },
        bomb: (ms: number): Point => {
          if (ms < releases) {
            // round the sling from under the pivot up to its release
            const a = Math.PI / 2 + Math.PI * clamp01((ms - thuds) / SWING_MS);
            bombAt.x = pivot.x - Math.cos(a) * SLING;
            bombAt.y = pivot.y + Math.sin(a) * SLING;
            return bombAt;
          }
          return bezier(
            release,
            ctrl,
            target,
            clamp01((ms - releases) / (hits - releases)),
            bombAt,
          );
        },
      };
    });
    const last = throws[throws.length - 1];
    const endAt = last.hits;

    const thudding = createBeats(
      throws,
      (t) => t.thuds,
      () => {
        cover!.burst(pad, 0.4);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(THUD_SHAKE);
      },
    );
    const hitting = createBeats(
      throws,
      (t) => t.hits,
      (t, k) => {
        if (t.final) {
          cover!.blast(lock);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / (THROWS - 1)));
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
          thudding.tick(ms, now);
          hitting.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const t of throws) {
            if (!t.final)
              drawDetonation(ctx, t.target, ms - t.hits, BLAST, now);
            drawWispBetween(
              ctx,
              t.weight,
              ms,
              now,
              WISP_SIZE * WEIGHT,
              0.4,
              t.drops,
              t.thuds + 150,
            );
            if (ms < t.thuds || ms >= t.hits) continue;
            drawLitFuse(
              ctx,
              t.bomb(ms),
              clamp01((ms - t.thuds) / (t.hits - t.thuds)),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              t.bomb,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.7,
              t.thuds,
              t.hits,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
