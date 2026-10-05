// the "Extinguisher" event (spray; worker perma tiers): it covers its crit,
// whose click freezes the screen while a nozzle wisp darts off the clicked
// floor's button to a worker and lets rip a short, furious blast of gold
// mist at it, kicked back by the recoil as the mist smothers the worker in a
// thickening coat that flashes as it lights up a perma tier; then it darts
// on to the next worker and blasts again, every blast a hiss, a jolt and a
// kick back, quicker each time, the last a long double blast and a huge
// blast. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  sprayLandsAt,
  type Spray,
} from "../../shared/spray";
import { findRewardWorkers } from "../eventRewards";

const KEY = "extinguisher";
const MAX_WORKERS = 5;
// px it fires from, and how far each blast kicks it back
const STANDOFF = 300;
const RECOIL = 110;
const NOZZLE = WISP_SIZE * 0.6;
const DROPS = WISP_SIZE * 0.9;
const MIST = WISP_SIZE * 1.6;
const COAT_W = 130;
const COAT_H = 190;
const FLASH_MS = 260;
const BLAST_SHAKE: [number, number] = [0.5, 1.0];
const HIT_SHAKE = 0.8;

interface Shot {
  from: Point;
  aim: number;
  starts: number;
  ends: number;
  spray: Spray;
}

export const forceExtinguisherEvent = registerWispEvent(
  KEY,
  "Extinguisher",
  () => CONFIG.extinguisherEvent.chance,
  (floor, context, area) => {
    const { dartMs, blastMs, lastBlastMs, holdMs, mergeMs } =
      CONFIG.extinguisherEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const nozzle: Point = { x: 0, y: 0 };
    // the nozzle's route: dart in, blast (kicked back), dart on
    const legs: {
      from: Point;
      to: Point;
      starts: number;
      ends: number;
      kick: boolean;
    }[] = [];
    let clock: number = 0;
    let at: Point = button;
    const shots: Shot[] = workers.map((w, k) => {
      const t = k / Math.max(1, workers.length - 1);
      const last = k === workers.length - 1;
      // fire from the side of the worker facing the screen's middle
      const dx = centre.x - w.at.x;
      const dy = centre.y - w.at.y;
      const d = Math.hypot(dx, dy) || 1;
      const from: Point = {
        x: w.at.x + (dx / d) * STANDOFF,
        y: w.at.y + (dy / d) * STANDOFF,
      };
      const aim = Math.atan2(w.at.y - from.y, w.at.x - from.x);
      const dart = lerp(dartMs, t);
      legs.push({
        from: at,
        to: from,
        starts: clock,
        ends: clock + dart,
        kick: false,
      });
      clock += dart;
      const blast = last ? lastBlastMs : lerp(blastMs, t);
      const back: Point = {
        x: from.x - Math.cos(aim) * RECOIL,
        y: from.y - Math.sin(aim) * RECOIL,
      };
      legs.push({
        from,
        to: back,
        starts: clock,
        ends: clock + blast,
        kick: true,
      });
      const shot: Shot = {
        from,
        aim,
        starts: clock,
        ends: clock + blast,
        spray: planSpray((ms) => nozzleAt(ms), aim, {
          startMs: clock,
          endMs: clock + blast,
          reach: STANDOFF + RECOIL * 0.5,
          spread: 0.2,
          flightMs: 260,
        }),
      };
      clock += blast;
      at = back;
      return shot;
    });
    const endAt = clock + FLASH_MS;
    const nozzleAt = (ms: number): Point => {
      const t = Math.max(0, ms);
      const leg = legs.find((l) => t < l.ends) ?? legs[legs.length - 1];
      const u = clamp01((t - leg.starts) / (leg.ends - leg.starts));
      const e = leg.kick ? easeOut(u) : smoothstep(u);
      nozzle.x = lerp([leg.from.x, leg.to.x], e);
      nozzle.y = lerp([leg.from.y, leg.to.y], e);
      return nozzle;
    };
    const landing: Point = { x: 0, y: 0 };

    const blasting = createBeats(
      shots,
      (s) => s.starts,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(BLAST_SHAKE, k / Math.max(1, shots.length - 1)));
      },
    );
    const coating = createBeats(
      shots,
      (s) => s.ends,
      (_, k) => {
        const worker = workers[k];
        cover!.promote(worker);
        if (k === shots.length - 1) {
          cover!.blast(worker.at);
          return;
        }
        cover!.burst(worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(HIT_SHAKE);
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
          blasting.tick(ms, now);
          coating.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          for (let k = 0; k < shots.length; k++) {
            const s = shots[k];
            if (ms < s.starts) continue;
            const w = workers[k];
            const coat = clamp01((ms - s.starts) / (s.ends - s.starts));
            const flash = 1 - clamp01((ms - s.ends) / FLASH_MS);
            // the coat fades out after its flash
            const fade = ms < s.ends ? 1 : flash;
            drawSprayCoat(
              ctx,
              w.at,
              COAT_W,
              COAT_H,
              coat * fade,
              ms >= s.ends ? flash : 0,
            );
            if (ms > s.ends + s.spray.flightMs) continue;
            drawSpray(ctx, s.spray, ms, now, DROPS);
            if (ms <= s.ends)
              drawSprayMist(
                ctx,
                sprayLandsAt(s.spray, ms, landing),
                ms - s.starts,
                1,
                MIST,
                now,
              );
          }
          if (ms <= endAt) drawWisp(ctx, nozzleAt, ms, now, NOZZLE, 0.5);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
