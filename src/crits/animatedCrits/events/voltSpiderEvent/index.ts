// the "Volt Spider" event (lightning; a free floor): it covers its crit,
// whose click freezes the screen while a spider wisp drops onto the
// clicked floor on four crackling legs of lightning; it scuttles straight
// up the building, legs striking out and planting with a blinding crack at
// every step, faster and faster, until it reaches the next locked floor and
// sinks in its bite, the floor bursting open in a huge blast and shake,
// unlocked for free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "voltSpider";
const STRIDE = 110;
const SPAN = 90;
const REACH = 50;
const BODY = 0.6;
const STRIKE_MS = 140;
const BITE_MS = 160;
const STEP_SHAKE: [number, number] = [0.3, 0.9];
const BITE_SHAKE = 2.2;

interface Leg {
  side: number;
  // 0 or 1: the legs step in two alternating pairs
  pair: number;
  foot: Point;
  bolt: Bolt;
  // where it's planted before the first step and after each one
  holds: Point[];
}

export const forceVoltSpiderEvent = registerWispEvent(
  KEY,
  "Volt Spider",
  () => CONFIG.voltSpiderEvent.chance,
  (floor, context) => {
    const { stepsMs, holdMs, mergeMs } = CONFIG.voltSpiderEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const x = lock.x;
    const count = Math.max(4, Math.round(Math.abs(button.y - lock.y) / STRIDE));
    let clock = 0;
    const steps = Array.from({ length: count }, (_, k) => {
      const starts = clock;
      clock += lerp(stepsMs, k / (count - 1));
      return {
        starts,
        lands: clock,
        y0: lerp([button.y, lock.y], k / count),
        y1: lerp([button.y, lock.y], (k + 1) / count),
      };
    });
    const bitesAt = clock;
    const endAt = bitesAt + BITE_MS;
    const body: Point = { x, y: button.y };
    const bodyAt = (ms: number): Point => {
      let y = button.y;
      for (const s of steps)
        if (ms >= s.starts)
          y = lerp(
            [s.y0, s.y1],
            easeOut(clamp01((ms - s.starts) / (s.lands - s.starts))),
          );
      body.y = y;
      return body;
    };
    // where each leg plants after step k: its pair moves on alternate steps
    const plantOf = (leg: { side: number; pair: number }, k: number): Point => {
      let last = -1;
      for (let j = 0; j <= k; j++) if (j % 2 === leg.pair) last = j;
      const y = last < 0 ? button.y : steps[last].y1;
      return { x: x + leg.side * SPAN, y: y + (leg.pair ? 1 : -1) * REACH };
    };
    const legs: Leg[] = [-1, 1].flatMap((side) =>
      [0, 1].map((pair) => {
        const foot = plantOf({ side, pair }, -1);
        const holds = Array.from({ length: count + 1 }, (_, i) =>
          plantOf({ side, pair }, i - 1),
        );
        return { side, pair, foot, bolt: createBolt(body, foot, 1), holds };
      }),
    );
    const plants = steps.map((s, k) => ({ ms: s.lands, k }));

    const stepping = createBeats(
      plants,
      (p) => p.ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(STEP_SHAKE, k / Math.max(1, count - 1)));
      },
    );
    const biting = createBeats(
      [bitesAt],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BITE_SHAKE);
      },
    );
    const spiderAt = (ms: number) => bodyAt(ms);

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
          biting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          bodyAt(ms);
          let k = -1;
          while (k + 1 < steps.length && ms >= steps[k + 1].lands) k++;
          for (const leg of legs) {
            // the stepping pair swings its feet up to the next hold
            const moving =
              steps[k + 1] && (k + 1) % 2 === leg.pair ? steps[k + 1] : null;
            const from = leg.holds[k + 1];
            if (moving) {
              const to = leg.holds[k + 2];
              const u = easeOut(
                clamp01((ms - moving.starts) / (moving.lands - moving.starts)),
              );
              leg.foot.x =
                lerp([from.x, to.x], u) + leg.side * Math.sin(Math.PI * u) * 30;
              leg.foot.y = lerp([from.y, to.y], u);
            } else {
              leg.foot.x = from.x;
              leg.foot.y = from.y;
            }
            drawBolt(ctx, leg.bolt, 0.6 + 0.4 * Math.random(), 0.4);
          }
          for (const s of steps) {
            const t = (ms - s.lands) / STRIKE_MS;
            if (t < 0 || t >= 1) continue;
            for (const leg of legs) drawStrike(ctx, leg.foot, 1 - t, 0.5, now);
          }
          drawWisp(
            ctx,
            spiderAt,
            ms,
            now,
            WISP_SIZE * BODY,
            lerp([0.5, 1], clamp01(ms / bitesAt)),
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
