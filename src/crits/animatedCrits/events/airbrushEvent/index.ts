// the "Airbrush" event (spray; crit tiers): it covers its crit, whose click
// freezes the screen while an airbrush wisp swoops in over an income bar
// and hisses a cone of glittering gold mist along it, sweeping end to end
// and back, the bar coating thicker and brighter with every pass and each
// turn a jolt; fully coated, it flashes white and jumps a crit tier, and the
// airbrush moves on to the next bar, quicker each time, the last coat
// finishing in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  sprayLandsAt,
  sweepAim,
  type Spray,
} from "../../../../shared/spray";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "airbrush";
const MAX_BARS = 4;
const PASSES = 3;
const ABOVE = 150;
const OFF = 120;
const ARRIVE_MS = 180;
const FLASH_MS = 220;
const NOZZLE = 0.45;
const DROPLET = WISP_SIZE * 0.6;
const TURN_SHAKE = 0.3;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Coat {
  bar: RewardBar;
  nozzle: Point;
  starts: number;
  sprays: number;
  ends: number;
  spray: Spray;
  turns: number[];
}

export const forceAirbrushEvent = registerWispEvent(
  KEY,
  "Airbrush",
  () => CONFIG.airbrushEvent.chance,
  (floor, context) => {
    const { passesMs, holdMs, mergeMs } = CONFIG.airbrushEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let clock = 0;
    const coats: Coat[] = bars.map((bar, k) => {
      const nozzle: Point = {
        x: bar.center.x - OFF * (k % 2 ? -1 : 1),
        y: bar.box.y - ABOVE,
      };
      const legMs = lerp(passesMs, k / Math.max(1, bars.length - 1));
      const starts = clock;
      const sprays = starts + ARRIVE_MS;
      const ends = sprays + legMs * PASSES;
      const left: Point = { x: bar.box.x + 10, y: bar.center.y };
      const right: Point = {
        x: bar.box.x + bar.box.width - 10,
        y: bar.center.y,
      };
      const points = Array.from({ length: PASSES + 1 }, (_, i) =>
        i % 2 ? right : left,
      );
      const reach = Math.hypot(
        bar.center.x - nozzle.x,
        bar.center.y - nozzle.y,
      );
      const spray = planSpray(nozzle, sweepAim(nozzle, points, sprays, legMs), {
        startMs: sprays,
        endMs: ends,
        reach,
      });
      clock = ends - legMs * 0.5;
      const turns = Array.from(
        { length: PASSES - 1 },
        (_, i) => sprays + legMs * (i + 1),
      );
      return { bar, nozzle, starts, sprays, ends, spray, turns };
    });
    const last = coats.reduce((a, b) => (b.ends > a.ends ? b : a));
    const endAt = last.ends + FLASH_MS;
    const turns = coats.flatMap((c) => c.turns);
    const nozzles = coats.map((c) => {
      const spot: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const u = easeOut(clamp01((ms - c.starts) / ARRIVE_MS));
        spot.x = lerp([c.nozzle.x - 200, c.nozzle.x], u);
        spot.y = lerp([c.nozzle.y - 120, c.nozzle.y], u);
        return spot;
      };
    });
    const lands: Point = { x: 0, y: 0 };

    const turning = createBeats(
      turns,
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(TURN_SHAKE);
      },
    );
    const finishing = createBeats(
      coats.slice().sort((a, b) => a.ends - b.ends),
      (c) => c.ends,
      (c, k) => {
        cover!.tierUp(c.bar, c.bar.center);
        if (c === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(c.bar.center);
          return;
        }
        cover!.burst(c.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, coats.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          turning.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (let k = 0; k < coats.length; k++) {
            const c = coats[k];
            if (ms < c.starts || ms > c.ends + FLASH_MS) continue;
            const { box, center } = c.bar;
            const coverage = clamp01((ms - c.sprays) / (c.ends - c.sprays));
            const flash = ms > c.ends ? 1 - (ms - c.ends) / FLASH_MS : 0;
            drawSprayCoat(
              ctx,
              center,
              box.width,
              box.height * 2,
              coverage,
              flash,
            );
            if (ms > c.ends) continue;
            drawSpray(ctx, c.spray, ms, now, DROPLET);
            if (ms >= c.sprays)
              drawSprayMist(
                ctx,
                sprayLandsAt(c.spray, ms, lands),
                ms - c.sprays,
                1,
                DROPLET,
                now,
              );
            drawWispBetween(
              ctx,
              nozzles[k],
              ms,
              now,
              WISP_SIZE * NOZZLE,
              0.8,
              c.starts,
              c.ends,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
