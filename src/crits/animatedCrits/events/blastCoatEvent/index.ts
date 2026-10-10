// the "Blast Coat" event (spray; crit tiers): it covers its crit, whose click
// freezes the screen while a nozzle wisp drops in over a bar and sweeps
// along it spraying a coat of gold glitter that sticks, then hops to the
// next bar and the next, quicker each time; once every bar is coated the
// coat goes off, a blast rolling along each bar the way it was sprayed,
// bar after bar, each bar's crit tier climbing as its roll ends; a huge
// blast on the clicked bar slams every bar. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  sprayLandsAt,
  type Spray,
} from "../../../../shared/spray";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const KEY = "blastCoat";
const MAX_BARS = 4;
// the nozzle hovers this far over its bar, sprays this far in from its ends
// and aims this far behind itself
const ABOVE = 180;
const INSET = 20;
const LAG = 40;
const DROP_IN = 300;
const HOP_LIFT = 60;
const QUICKEN = 0.85;
const FLIGHT_MS = 220;
const DROPS = 60;
const DROP_SIZE = 14;
const NOZZLE = WISP_SIZE * 0.6;
const DROPLET = WISP_SIZE * 0.6;
// the coat goes off this long after the last drop lands, ROLL blasts a bar
// ROLL_GAP_MS apart, the finale FINALE_LAG after the last
const PAUSE_MS = 150;
const ROLL = 7;
const ROLL_GAP_MS = 32;
const ROLL_BLAST = 150;
const FINALE_LAG = 120;
const FINALE_BLAST = 850;
const ROLL_SHAKE: [number, number] = [0.4, 0.8];
const FINALE_SHAKE = 1.8;
const SOUND_GAP_MS = 55;

interface Coat {
  bar: RewardBar;
  rightward: boolean;
  starts: number;
  ends: number;
  spray: Spray;
  // where the nozzle is along the bar at ms
  x: (ms: number) => number;
  y: number;
}

interface Drop {
  coat: Coat;
  at: Point;
  lands: number;
  goes: number;
}

interface Roll {
  coat: Coat;
  at: Point;
  ms: number;
  last: boolean;
}

export const forceBlastCoatEvent = registerWispEvent(
  KEY,
  "Blast Coat",
  () => CONFIG.blastCoatEvent.chance,
  (floor, context) => {
    const { arriveMs, sweepMs, hopMs, holdMs, mergeMs } = CONFIG.blastCoatEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    // up to four bars top to bottom, ending on the clicked one when it can
    const sorted = [...bars].sort((a, b) => a.box.y - b.box.y);
    const lastIndex = Math.max(
      sorted.indexOf(clicked),
      Math.min(MAX_BARS, sorted.length) - 1,
    );
    const route = sorted.slice(
      Math.max(0, lastIndex - MAX_BARS + 1),
      lastIndex + 1,
    );

    let clock = arriveMs;
    const coats: Coat[] = route.map((bar, k) => {
      const rightward = k % 2 === 0;
      const starts = clock;
      const ends = starts + sweepMs * QUICKEN ** k;
      clock = ends + hopMs;
      const left = bar.box.x + INSET;
      const right = bar.box.x + bar.box.width - INSET;
      const x = (ms: number) => {
        const u = clamp01((ms - starts) / (ends - starts));
        return lerp([left, right], rightward ? u : 1 - u);
      };
      const y = bar.box.y - ABOVE;
      const nozzle: Point = { x: 0, y };
      const back = rightward ? -LAG : LAG;
      const spray = planSpray(
        (ms) => {
          nozzle.x = x(ms);
          return nozzle;
        },
        Math.atan2(bar.center.y - y, back),
        {
          startMs: starts,
          endMs: ends,
          reach: Math.hypot(bar.center.y - y, back),
          flightMs: FLIGHT_MS,
        },
      );
      return { bar, rightward, starts, ends, spray, x, y };
    });
    const lastCoat = coats[coats.length - 1];

    // the nozzle drops in over the first bar's start, then hops bar to bar
    const nozzleSpot: Point = { x: 0, y: 0 };
    const hop = (a: Point, b: Point, u: number): Point => {
      nozzleSpot.x = lerp([a.x, b.x], u);
      nozzleSpot.y = lerp([a.y, b.y], u) - 4 * HOP_LIFT * u * (1 - u);
      return nozzleSpot;
    };
    const nozzleAt = (ms: number): Point => {
      const first = coats[0];
      if (ms < first.starts) {
        const u = easeOut(clamp01(ms / arriveMs));
        nozzleSpot.x = first.x(0);
        nozzleSpot.y = lerp([first.y - DROP_IN, first.y], u);
        return nozzleSpot;
      }
      for (let k = 0; k < coats.length; k++) {
        const c = coats[k];
        if (ms <= c.ends) {
          if (ms >= c.starts || k === 0) {
            nozzleSpot.x = c.x(ms);
            nozzleSpot.y = c.y;
            return nozzleSpot;
          }
          const prev = coats[k - 1];
          return hop(
            { x: prev.x(prev.ends), y: prev.y },
            { x: c.x(c.starts), y: c.y },
            clamp01((ms - prev.ends) / (c.starts - prev.ends)),
          );
        }
      }
      nozzleSpot.x = lastCoat.x(lastCoat.ends);
      nozzleSpot.y = lastCoat.y;
      return nozzleSpot;
    };

    const coatedAt = lastCoat.ends + FLIGHT_MS + PAUSE_MS;
    const rolls: Roll[] = coats.flatMap((coat, k) =>
      Array.from({ length: ROLL }, (_, i) => {
        const u = (i + 0.5) / ROLL;
        const { box, center } = coat.bar;
        return {
          coat,
          at: {
            x: box.x + box.width * (coat.rightward ? u : 1 - u),
            y: center.y,
          },
          ms: coatedAt + (k * ROLL + i) * ROLL_GAP_MS,
          last: i === ROLL - 1,
        };
      }),
    );
    const finaleAt = rolls[rolls.length - 1].ms + FINALE_LAG;
    const endMs = finaleAt + DETONATION_MS;
    // each drop sticks where the spray lands as the nozzle passes and goes
    // up with the roll blast nearest it
    const drops: Drop[] = coats.flatMap((coat) => {
      const { box } = coat.bar;
      const own = rolls.filter((r) => r.coat === coat);
      return Array.from({ length: DROPS }, (_, i) => {
        const fired = lerp(
          [coat.starts, coat.ends],
          (i + Math.random()) / DROPS,
        );
        const x = coat.x(fired) + (Math.random() - 0.5) * 60;
        const nearest = own.reduce((a, b) =>
          Math.abs(b.at.x - x) < Math.abs(a.at.x - x) ? b : a,
        );
        return {
          coat,
          at: { x, y: box.y + box.height * lerp([0.1, 0.9], Math.random()) },
          lands: fired + FLIGHT_MS * 0.8,
          goes: nearest.ms,
        };
      });
    });

    let soundAt = -Infinity;
    const bang = (now: number, loud = false) => {
      if (!loud && now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const sweeping = createBeats(
      coats,
      (c) => c.starts,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const rolling = createBeats(
      rolls,
      (r) => r.ms,
      (r, k, now) => {
        if (r.last) cover!.tierUp(r.coat.bar, r.at);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(ROLL_SHAKE, k / Math.max(1, rolls.length - 1)));
        bang(now);
      },
    );
    const finale = createBeats(
      [finaleAt],
      (ms) => ms,
      (_, __, now) => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(clicked.center);
        if (!cover!.isLive()) return;
        shakeScreen(FINALE_SHAKE);
        bang(now, true);
      },
    );

    const lands: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: finaleAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          sweeping.tick(ms, now);
          rolling.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          for (const c of coats) {
            if (ms < c.starts || ms >= coatedAt) continue;
            const { box, center } = c.bar;
            const coverage = clamp01((ms - c.starts) / (c.ends - c.starts));
            drawSprayCoat(
              ctx,
              center,
              box.width,
              box.height * 2,
              coverage * 0.6,
            );
          }
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          beginLightBatch(ctx);
          for (let i = 0; i < drops.length; i++) {
            const d = drops[i];
            if (ms < d.lands || ms >= d.goes) continue;
            stampGlimmer(
              ctx,
              d.at.x,
              d.at.y,
              DROP_SIZE + (i % 3) * 4,
              now * 0.004 + i,
              i % 3 ? COLOR.heavenlyGold : COLOR.white,
            );
          }
          endLightBatch(ctx);
          ctx.restore();
          for (const c of coats) {
            if (ms < c.starts || ms > c.ends + FLIGHT_MS) continue;
            drawSpray(ctx, c.spray, ms, now, DROPLET);
            if (ms <= c.ends)
              drawSprayMist(
                ctx,
                sprayLandsAt(c.spray, ms, lands),
                ms - c.starts,
                1,
                DROPLET,
                now,
              );
          }
          drawWispBetween(
            ctx,
            nozzleAt,
            ms,
            now,
            NOZZLE,
            0.8,
            0,
            lastCoat.ends + FLIGHT_MS,
          );
          for (const r of rolls)
            drawDetonation(ctx, r.at, ms - r.ms, ROLL_BLAST, now);
          drawDetonation(ctx, clicked.center, ms - finaleAt, FINALE_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
