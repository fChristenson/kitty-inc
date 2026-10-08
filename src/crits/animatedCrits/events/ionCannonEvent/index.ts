// the "Ion Cannon" event (lightning; a free floor): it covers its crit, whose
// click freezes the screen while a core wisp lights up below the next
// locked floor and crackling tendrils of lightning crawl in from the
// screen's edges one after another, faster and faster, each latching onto it
// with a flash and a jolt as it swells and blazes hotter; fully charged, it
// fires one colossal bolt up into the locked floor, which blows open in a
// huge blast and shake, unlocked for free, as the screen unfreezes. Then
// the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playSlamExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "ionCannon";
const TENDRILS = 8;
const BELOW = 0.45;
const CORE: [number, number] = [0.5, 1.3];
const CRAWL_MS = 160;
const FIRE_MS = 260;
const EDGE = 20;
const LATCH_SHAKE: [number, number] = [0.3, 0.8];
const FIRE_SHAKE = 2.2;

interface Tendril {
  edge: Point;
  tip: Point;
  bolt: Bolt;
  starts: number;
  latches: number;
}

export const forceIonCannonEvent = registerWispEvent(
  KEY,
  "Ion Cannon",
  () => CONFIG.ionCannonEvent.chance,
  (floor, context, area) => {
    const { chargeMs, aimMs, holdMs, mergeMs } = CONFIG.ionCannonEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const height = area.bottom - area.top;
    const core: Point = {
      x: (area.left + area.right) / 2,
      y: Math.min(
        area.bottom - 120,
        Math.max(lock.y + FLOOR_H, area.top + height * (1 - BELOW)),
      ),
    };
    let clock = 0;
    const tendrils: Tendril[] = Array.from({ length: TENDRILS }, (_, k) => {
      // round the edges, alternating sides
      const side = k % 2 ? 1 : -1;
      const y =
        area.top +
        height * (0.15 + (0.75 * ((k * 3) % TENDRILS)) / (TENDRILS - 1));
      const edge: Point = {
        x: side < 0 ? area.left + EDGE : area.right - EDGE,
        y,
      };
      // built at full reach so its forks are sized for it; the tip crawls in
      const tip: Point = { ...core };
      const starts = clock;
      clock += lerp(chargeMs, k / (TENDRILS - 1));
      return {
        edge,
        tip,
        bolt: createBolt(edge, tip, 1),
        starts,
        latches: starts + CRAWL_MS,
      };
    });
    const firesAt = tendrils[TENDRILS - 1].latches + aimMs;
    const endAt = firesAt + FIRE_MS;
    const beam = createBolt(core, lock, 3);
    let charged = 0;
    const coreAt = () => core;

    const latching = createBeats(
      tendrils,
      (t) => t.latches,
      (_, k) => {
        charged = (k + 1) / TENDRILS;
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LATCH_SHAKE, k / (TENDRILS - 1)));
      },
    );
    const firing = createBeats(
      [firesAt],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (!cover!.isLive()) return;
        playSlamExplosion();
        shakeScreen(FIRE_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          latching.tick(ms, now);
          firing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const fired = ms >= firesAt;
          for (const t of tendrils) {
            if (ms < t.starts || fired) continue;
            const u = easeIn(clamp01((ms - t.starts) / CRAWL_MS));
            t.tip.x = lerp([t.edge.x, core.x], u);
            t.tip.y = lerp([t.edge.y, core.y], u);
            drawBolt(
              ctx,
              t.bolt,
              0.5 + 0.5 * Math.random(),
              ms < t.latches ? 0.6 : 0.4,
            );
            if (ms >= t.latches && ms < t.latches + 120)
              drawStrike(ctx, core, 1 - (ms - t.latches) / 120, 0.8, now);
          }
          if (!fired) {
            drawWisp(
              ctx,
              coreAt,
              ms,
              now,
              WISP_SIZE * lerp(CORE, charged),
              lerp([0.5, 1], charged),
            );
            return;
          }
          const fade = 1 - (ms - firesAt) / FIRE_MS;
          drawBolt(ctx, beam, fade, 3);
          drawStrike(ctx, lock, fade, 2.5, now);
          drawStrike(ctx, core, fade, 2, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
