// the "Koi Pond" event (mix; worker perma tiers and cash): it covers its
// crit, whose click freezes the screen while the clicked floor's button
// floods a swirling oval pond of cash across the bottom of the screen and
// koi wisps glide round and round in it; one after another they leap out
// in a high arc, flinging a splash of coins, and dive onto a worker in
// view with a flash and a jolt that lights it up a perma tier, ever
// faster; then the whole pond swirls up into the total in a huge blast and
// shake. Pays floor income × floor number × REWARD, plus the tiers
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
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
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";
import { totalSpot } from "../../cashFlow";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "koiPond";
const REWARD = 2;
const MAX_WORKERS = 5;
const COINS = 800;
const COIN = 0.42;
// the pond reaches POND of the screen's width either side, FLAT as tall,
// FLOOR px up from the bottom; the cash swirls at SWIRL laps a second, koi
// at KOI_LAPS
const POND = 0.42;
const FLAT = 0.28;
const FLOOR = 90;
const SWIRL = 0.12;
const KOI_LAPS = 0.6;
const LEAP_MS = 420;
const LOFT = 140;
const FISH = 0.45;
const SPLASH = 8;
const SPLASH_REACH: [number, number] = [20, 80];
const SURGE_SPREAD = 260;
const DIVE_SHAKE: [number, number] = [0.6, 1.3];

export const forceKoiPondEvent = registerWispEvent(
  KEY,
  "Koi Pond",
  () => CONFIG.koiPondEvent.chance,
  (floor, context, area) => {
    const { floodMs, gapsMs, flightMs, holdMs, mergeMs } = CONFIG.koiPondEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const pond: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom - FLOOR,
    };
    const rx = (area.right - area.left) * POND;
    const ry = rx * FLAT;
    let clock: number = floodMs;
    const koi = workers.map((worker, k) => {
      clock += lerp(gapsMs, k / Math.max(1, workers.length - 1));
      const leaps = clock;
      const phase = (k / workers.length) * Math.PI * 2;
      const swimAt = (ms: number, into: Point) => {
        const a = phase + (ms / 1000) * KOI_LAPS * Math.PI * 2;
        into.x = pond.x + Math.cos(a) * rx * 0.7;
        into.y = pond.y + Math.sin(a) * ry * 0.7;
        return into;
      };
      const from = swimAt(leaps, { x: 0, y: 0 });
      const ctrl: Point = {
        x: (from.x + worker.at.x) / 2,
        y: Math.min(from.y, worker.at.y) - LOFT,
      };
      const at: Point = { x: 0, y: 0 };
      return {
        worker,
        from,
        leaps,
        dives: leaps + LEAP_MS,
        at: (ms: number): Point | null => {
          if (ms < floodMs * 0.5 || ms >= leaps + LEAP_MS) return null;
          if (ms < leaps) return swimAt(ms, at);
          return bezier(
            from,
            ctrl,
            worker.at,
            easeIn((ms - leaps) / LEAP_MS),
            at,
          );
        },
      };
    });
    const last = koi[koi.length - 1];
    const drainAt = last.dives + 100;
    const endAt = drainAt + SURGE_SPREAD + flightMs;

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const r = Math.sqrt(Math.random());
      const phase = Math.random() * Math.PI * 2;
      const poured = Math.random() * floodMs * 0.7;
      const leaves = drainAt + Math.random() * SURGE_SPREAD;
      const from: Point = { x: 0, y: 0 };
      const lift: Point = { x: 0, y: 0 };
      const at: Point = { x: 0, y: 0 };
      const place = (ms: number, into: Point) => {
        const a = phase + (ms / 1000) * SWIRL * Math.PI * 2;
        into.x = pond.x + Math.cos(a) * rx * r;
        into.y = pond.y + Math.sin(a) * ry * r;
        return into;
      };
      return (f) => {
        const ms = f * endAt;
        if (ms < poured) return { x: button.x, y: button.y, scale: 0 };
        place(ms, at);
        if (ms < poured + floodMs * 0.3) {
          const p = easeOut((ms - poured) / (floodMs * 0.3));
          return {
            x: lerp([button.x, at.x], p),
            y: lerp([button.y, at.y], p),
            scale: COIN,
          };
        }
        if (ms < leaves) return { x: at.x, y: at.y, scale: COIN };
        place(leaves, from);
        lift.x = from.x;
        lift.y = from.y - 100;
        const total = cover?.total() ?? fallback;
        bezier(
          from,
          lift,
          total,
          easeIn(clamp01((ms - leaves) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });

    const leaping = createBeats(
      koi,
      (f) => f.leaps,
      (f) => {
        cover!.launchFrom(f.from, ringTargets(f.from, SPLASH, SPLASH_REACH));
        if (cover!.isLive()) playBloop();
      },
    );
    const diving = createBeats(
      koi,
      (f) => f.dives,
      (f, k) => {
        cover!.promote(f.worker);
        cover!.burst(f.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(DIVE_SHAKE, k / Math.max(1, koi.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        workers,
        tick: (ms, now) => {
          leaping.tick(ms, now);
          diving.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          for (const f of koi)
            drawWispBetween(
              ctx,
              f.at,
              ms,
              now,
              WISP_SIZE * FISH,
              0.6,
              floodMs * 0.5,
              f.dives,
            );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
