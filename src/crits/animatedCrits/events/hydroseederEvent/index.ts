// the "Hydroseeder" event (spray; free hires): it covers its crit, whose
// click freezes the screen while a nozzle wisp swoops over an empty spot
// and hoses it with a fanning spray of glittering gold seed-mist, sweeping
// back and forth, the spot coating thicker and brighter until a new worker
// sprouts up out of it with a flash and a jolt; then it swoops on to the
// next spot, quicker each time, the last sprouting in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  sweepAim,
  type Spray,
} from "../../../../shared/spray";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "hydroseeder";
const MAX_HIRES = 5;
const ABOVE = 170;
const SIDE = 70;
const SWEEP = 70;
const PASSES = 3;
const MOVE_MS = 160;
const FLASH_MS = 200;
const COAT_W = 130;
const COAT_H = 150;
const NOZZLE = 0.45;
const DROPLET = WISP_SIZE * 0.6;
const FORM_MS = 300;
const TURN_SHAKE = 0.25;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Seeding {
  hire: RewardHire;
  nozzle: Point;
  arrives: number;
  sprouts: number;
  spray: Spray;
  turns: number[];
}

export const forceHydroseederEvent = registerWispEvent(
  KEY,
  "Hydroseeder",
  () => CONFIG.hydroseederEvent.chance,
  (floor, context) => {
    const { passesMs, holdMs, mergeMs } = CONFIG.hydroseederEvent;
    const hires = findRewardHires(floor, context)
      .slice(0, MAX_HIRES)
      .sort((a, b) => a.x - b.x);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = MOVE_MS;
    const seedings: Seeding[] = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y };
      const nozzle: Point = {
        x: hire.x + (k % 2 ? SIDE : -SIDE),
        y: hire.y - ABOVE,
      };
      const legMs = lerp(passesMs, k / Math.max(1, hires.length - 1));
      const arrives = clock;
      const sprouts = arrives + legMs * PASSES;
      const points = Array.from({ length: PASSES + 1 }, (_, i) => ({
        x: spot.x + (i % 2 ? SWEEP : -SWEEP),
        y: spot.y,
      }));
      const spray = planSpray(
        nozzle,
        sweepAim(nozzle, points, arrives, legMs),
        {
          startMs: arrives,
          endMs: sprouts,
          reach: Math.hypot(spot.x - nozzle.x, spot.y - nozzle.y),
          spread: 0.3,
          flightMs: 280,
        },
      );
      const turns = Array.from(
        { length: PASSES - 1 },
        (_, i) => arrives + legMs * (i + 1),
      );
      clock = sprouts + MOVE_MS;
      return { hire, nozzle, arrives, sprouts, spray, turns };
    });
    const last = seedings[seedings.length - 1];
    const endAt = last.sprouts + FLASH_MS;
    const spot: Point = { x: 0, y: 0 };
    const nozzleAt = (ms: number): Point | null => {
      if (ms > last.sprouts) return null;
      let from = button;
      let leaves = 0;
      for (const s of seedings) {
        if (ms < s.arrives) {
          const u = smoothstep(clamp01((ms - leaves) / (s.arrives - leaves)));
          spot.x = lerp([from.x, s.nozzle.x], u);
          spot.y = lerp([from.y, s.nozzle.y], u) - Math.sin(Math.PI * u) * 60;
          return spot;
        }
        if (ms <= s.sprouts) return s.nozzle;
        from = s.nozzle;
        leaves = s.sprouts;
      }
      return last.nozzle;
    };
    const centres = seedings.map((s) => ({ x: s.hire.x, y: s.hire.y }));

    const turning = createBeats(
      seedings.flatMap((s) => s.turns),
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(TURN_SHAKE);
      },
    );
    const sprouting = createBeats(
      seedings,
      (s) => s.sprouts,
      (s, k) => {
        giveHire(s.hire);
        if (s === last) {
          cover!.blast(centres[k]);
          return;
        }
        cover!.burst(centres[k], 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, seedings.length - 1)));
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
          turning.tick(ms, now);
          sprouting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms < 0 || ms > endAt + 400) return;
          for (let k = 0; k < seedings.length; k++) {
            const s = seedings[k];
            if (ms < s.arrives || ms > s.sprouts + FLASH_MS) continue;
            const coverage = clamp01(
              (ms - s.arrives - 140) / (s.sprouts - s.arrives - 140),
            );
            const flash = ms > s.sprouts ? 1 - (ms - s.sprouts) / FLASH_MS : 0;
            drawSprayCoat(ctx, centres[k], COAT_W, COAT_H, coverage, flash);
            if (ms > s.sprouts) continue;
            drawSpray(ctx, s.spray, ms, now, DROPLET);
            drawSprayMist(ctx, centres[k], ms - s.arrives, 1, DROPLET, now);
          }
          drawWispBetween(
            ctx,
            nozzleAt,
            ms,
            now,
            WISP_SIZE * NOZZLE,
            0.8,
            0,
            last.sprouts,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
