// the "Car Wash" event (spray; worker perma tiers): it covers its crit,
// whose click freezes the screen while a gantry of nozzle wisps lines up
// across the top of the screen and rolls down it like a car wash, every
// nozzle hissing a swaying cone of glittering gold mist straight down so a
// curtain of spray sweeps the screen top to bottom, ever faster; each
// worker it passes over foams up gold, flashes white and lights up a perma
// tier with a jolt, the last going off in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  sprayLandsAt,
  type Spray,
} from "../../../../shared/spray";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "carWash";
const MAX_WORKERS = 6;
const NOZZLES = 5;
const INSET = 90;
const REACH = 170;
const SWAY = 0.35;
const SPREAD = 0.3;
const COAT_W = 110;
const COAT_H = 170;
const FLASH_MS = 200;
const NOZZLE = 0.4;
const DROPLET = WISP_SIZE * 0.55;
// how the gantry speeds up rolling down
const RAMP = 1.5;
const HIT_SHAKE: [number, number] = [0.5, 1.2];

interface Wash {
  worker: RewardWorker;
  // when the curtain reaches its top, and when it's past its feet
  wets: number;
  coats: number;
}

export const forceCarWashEvent = registerWispEvent(
  KEY,
  "Car Wash",
  () => CONFIG.carWashEvent.chance,
  (floor, context, area) => {
    const { sweepMs, holdMs, mergeMs } = CONFIG.carWashEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const startY = area.top - 40;
    const lowest = Math.max(...workers.map((w) => w.at.y)) + COAT_H / 2;
    const endY = Math.min(area.bottom - REACH, lowest - REACH + 40);
    const gantryY = (ms: number) =>
      lerp([startY, endY], clamp01(ms / sweepMs) ** RAMP);
    // when the curtain's foot first reaches y
    const reaches = (y: number) =>
      sweepMs * clamp01((y - REACH - startY) / (endY - startY)) ** (1 / RAMP);
    const washes: Wash[] = workers
      .map((worker) => ({
        worker,
        wets: reaches(worker.at.y - COAT_H / 2),
        coats: reaches(worker.at.y + COAT_H / 2),
      }))
      .sort((a, b) => a.coats - b.coats);
    const last = washes[washes.length - 1];
    const endAt = Math.max(last.coats, sweepMs) + FLASH_MS;
    const sprays: Spray[] = Array.from({ length: NOZZLES }, (_, i) => {
      const x = lerp(
        [area.left + INSET, area.right - INSET],
        i / (NOZZLES - 1),
      );
      const spot: Point = { x, y: 0 };
      return planSpray(
        (ms) => {
          spot.y = gantryY(ms);
          return spot;
        },
        (ms) => Math.PI / 2 + SWAY * Math.sin(ms * 0.012 + i * 1.3),
        {
          startMs: 0,
          endMs: sweepMs,
          reach: REACH,
          spread: SPREAD,
          flightMs: 280,
        },
      );
    });
    const nozzles = sprays.map((s) => s.from);
    const lands: Point = { x: 0, y: 0 };

    const swooshing = createBeats(
      [0, sweepMs * 0.5],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const coating = createBeats(
      washes,
      (w) => w.coats,
      (w, k) => {
        cover!.promote(w.worker);
        if (w === last) {
          cover!.blast(w.worker.at);
          return;
        }
        cover!.burst(w.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, washes.length - 1)));
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
          swooshing.tick(ms, now);
          coating.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          for (const w of washes) {
            if (ms < w.wets || ms > w.coats + FLASH_MS) continue;
            const coverage = clamp01((ms - w.wets) / (w.coats - w.wets || 1));
            const flash = ms > w.coats ? 1 - (ms - w.coats) / FLASH_MS : 0;
            drawSprayCoat(ctx, w.worker.at, COAT_W, COAT_H, coverage, flash);
          }
          if (ms > sweepMs + 300) return;
          for (const s of sprays) {
            drawSpray(ctx, s, ms, now, DROPLET);
            if (ms <= sweepMs)
              drawSprayMist(
                ctx,
                sprayLandsAt(s, ms, lands),
                ms,
                0.8,
                DROPLET,
                now,
              );
          }
          for (const n of nozzles)
            drawWispBetween(
              ctx,
              n,
              ms,
              now,
              WISP_SIZE * NOZZLE,
              0.8,
              0,
              sweepMs,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
