// the "Garden Hose" event (mix; free hires and cash): it covers its crit,
// whose click freezes the screen while a wisp nozzle rises off the clicked
// floor's button and sprays a long arcing jet of cash, swinging it from one
// empty spot to the next on the floors in view with room, like watering a
// garden; under each soaking a new worker sprouts up with a flash, a bang
// and a jolt, ever faster; then the jet swings up onto the total and hoses
// the last of the cash into it in a huge blast and shake. Pays floor income
// × floor number × REWARD, plus the hires
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "gardenHose";
const REWARD = 2;
const MAX_HIRES = 4;
const COINS = 1_300;
const COIN = 0.6;
// the nozzle rises RISE px off the button; the jet arcs LOFT px plus a share
// of its length over its higher end
const RISE = 60;
const LOFT = 140;
const LOFT_SHARE = 0.25;
const SPREAD = 14;
const FORM_MS = 280;
const SOAK_SHAKE: [number, number] = [0.9, 1.6];

export const forceGardenHoseEvent = registerWispEvent(
  KEY,
  "Garden Hose",
  () => CONFIG.gardenHoseEvent.chance,
  (floor, context, area) => {
    const { swingMs, dwellsMs, flightMs, holdMs, mergeMs } =
      CONFIG.gardenHoseEvent;
    const hires = findRewardHires(floor, context)
      .sort((a, b) => a.x - b.x)
      .slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const nozzle: Point = { x: button.x, y: button.y - RISE };
    const total = totalSpot(area);
    const aims: Point[] = [...hires.map((h) => ({ x: h.x, y: h.y })), total];
    // swing onto each aim, then hold it there
    const holds = aims.map((_, k) =>
      k === aims.length - 1
        ? dwellsMs[1]
        : lerp(dwellsMs, k / Math.max(1, hires.length - 1)),
    );
    const arrives: number[] = [];
    let clock = 0;
    aims.forEach((_, k) => {
      clock += swingMs;
      arrives.push(clock);
      clock += holds[k];
    });
    const sprayMs = clock;
    const endAt = sprayMs + flightMs;
    const aim = (ms: number, into: Point): Point => {
      let k = 0;
      while (k < aims.length - 1 && ms > arrives[k] + holds[k]) k++;
      const from = k === 0 ? nozzle : aims[k - 1];
      const u = smoothstep(clamp01((ms - (arrives[k] - swingMs)) / swingMs));
      into.x = from.x + (aims[k].x - from.x) * u;
      into.y = from.y + (aims[k].y - from.y) * u;
      return into;
    };
    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const leaves = Math.random() * sprayMs;
      const land = aim(leaves, { x: 0, y: 0 });
      land.x += (Math.random() * 2 - 1) * SPREAD;
      land.y += (Math.random() * 2 - 1) * SPREAD;
      const arc: Point = {
        x: (nozzle.x + land.x) / 2,
        y:
          Math.min(nozzle.y, land.y) -
          LOFT -
          Math.hypot(land.x - nozzle.x, land.y - nozzle.y) * LOFT_SHARE,
      };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const u = (f * endAt - leaves) / flightMs;
        if (u <= 0) return { x: nozzle.x, y: nozzle.y, scale: 0 };
        if (u >= 1) return { x: land.x, y: land.y, scale: 0 };
        bezier(nozzle, arc, land, u, at);
        return { x: at.x, y: at.y, scale: COIN };
      };
    });
    const rising: Point = { x: 0, y: 0 };
    const wisp = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      rising.x = nozzle.x;
      rising.y = lerp([button.y, nozzle.y], clamp01(ms / swingMs));
      return rising;
    };

    const soaking = createBeats(
      hires,
      (_, k) => arrives[k] + flightMs,
      (hire, k) => {
        const t = k / Math.max(1, hires.length - 1);
        giveHire(hire);
        cover!.burst(aims[k], 0.7 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SOAK_SHAKE, t));
      },
    );
    const finishing = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          soaking.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          drawWispBetween(
            ctx,
            wisp,
            ms,
            now,
            WISP_SIZE,
            clamp01(ms / endAt),
            0,
            sprayMs,
          );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
