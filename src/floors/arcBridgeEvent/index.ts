// the "Arc Bridge" event (lightning; a free floor): it covers its crit, whose
// click freezes the screen while two pylon wisps spring up at the screen's
// sides with a crackling bolt of lightning bridging the gap between them;
// they climb the building in jolting steps, half a floor at a time, the
// bridge striking both sides at every step with a crack and a jolt, quicker
// as they rise; at the locked floor they slam in from both sides and the
// floor blows open in a huge blast and shake, unlocked for free, as the
// screen unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../shared/easing";
import { createBolt, drawBolt, drawStrike } from "../../shared/lightning";
import { createBeats } from "../../shared/eventBeats";
import { findRewardLocked } from "../eventRewards";
import { FLOOR_H, FLOOR_W } from "../constants";

const KEY = "arcBridge";
const SIDE = 70;
const CLOSE_MS = 180;
const STRIKE_MS = 160;
const PYLON = 0.45;
const STEP_SHAKE: [number, number] = [0.4, 1.0];

export const forceArcBridgeEvent = registerWispEvent(
  KEY,
  "Arc Bridge",
  () => CONFIG.arcBridgeEvent.chance,
  (floor, context, area) => {
    const { stepsMs, holdMs, mergeMs } = CONFIG.arcBridgeEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const count = Math.max(
      3,
      Math.round((Math.abs(button.y - lock.y) / FLOOR_H) * 2),
    );
    let clock = 0;
    const steps = Array.from({ length: count }, (_, j) => {
      const starts = clock;
      clock += lerp(stepsMs, j / (count - 1));
      return {
        starts,
        lands: clock,
        y0: lerp([button.y, lock.y], j / count),
        y1: lerp([button.y, lock.y], (j + 1) / count),
      };
    });
    const closeAt = clock;
    const endAt = closeAt + CLOSE_MS;
    const xs = [area.left + SIDE, area.right - SIDE];
    const heightAt = (ms: number): number => {
      let s = steps[0];
      for (const step of steps) if (ms >= step.starts) s = step;
      return lerp(
        [s.y0, s.y1],
        easeOutBack(clamp01((ms - s.starts) / (s.lands - s.starts))),
      );
    };
    const pylons = xs.map((x) => {
      const at: Point = { x, y: button.y };
      return {
        at,
        place: (ms: number): Point => {
          const t = Math.max(0, ms);
          if (t < closeAt) {
            at.x = x;
            at.y = heightAt(t);
          } else {
            const e = easeIn(clamp01((t - closeAt) / CLOSE_MS));
            at.x = lerp([x, lock.x], e);
            at.y = lock.y;
          }
          return at;
        },
      };
    });
    const bolt = createBolt(pylons[0].at, pylons[1].at, 2);

    const stepping = createBeats(
      steps,
      (s) => s.lands,
      (_, k) => {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(lerp(STEP_SHAKE, k / (count - 1)));
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

    const ends = pylons.map((p) => p.place);
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          stepping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const p of pylons) p.place(ms);
          drawBolt(
            ctx,
            bolt,
            0.6 + 0.4 * Math.random(),
            ms < closeAt ? 1 : 1.8,
          );
          for (const s of steps) {
            const t = (ms - s.lands) / STRIKE_MS;
            if (t < 0 || t >= 1) continue;
            for (const p of pylons) drawStrike(ctx, p.at, 1 - t, 1, now);
          }
          for (const end of ends)
            drawWispBetween(
              ctx,
              end,
              ms,
              now,
              WISP_SIZE * PYLON,
              0.8,
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
