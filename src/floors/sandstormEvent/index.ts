// the "Sandstorm" event (money; perma tiers for workers and cash): it covers
// its crit, whose click freezes the screen while a howling storm of cash
// blows in from one side and tears across the whole screen in gusting,
// swirling bands as the screen rumbles; every worker the storm front hits
// lights up a perma tier with a flash, a bloop and a jolt; at the far side
// the storm whirls up into the total, which goes off in a huge blast and
// shake. Pays floor income × floor number × REWARD, plus the tiers
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { totalSpot } from "../cashFlow";
import { findRewardWorkers } from "../eventRewards";
import type { Point } from "../../shared/wisp";

const KEY = "sandstorm";
const REWARD = 2;
const MAX_WORKERS = 6;
const COINS = 1_700;
const COIN = 0.6;
// coins blow SPAN of the way across, gusting GUST px up and down
const SPAN = 0.85;
const GUST = 60;
const SPEED: [number, number] = [0.85, 1.2];
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.4, 1.3];
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceSandstormEvent = registerWispEvent(
  KEY,
  "Sandstorm",
  () => CONFIG.sandstormEvent.chance,
  (floor, context, area) => {
    const { streamMs, crossMs, flightMs, holdMs, mergeMs } =
      CONFIG.sandstormEvent;
    const fallback = totalSpot(area);
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const startX = dir > 0 ? area.left - 60 : area.right + 60;
    const run = (width + 60) * SPAN;
    const endAt = streamMs + crossMs / SPEED[0] + flightMs;

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const leaves = (i / COINS) * streamMs;
      const speed = lerp(SPEED, Math.random());
      const cross = crossMs / speed;
      const y0 = area.top + 60 + (height - 120) * Math.random();
      const phase = Math.random() * Math.PI * 2;
      const at: Point = { x: 0, y: 0 };
      const from: Point = { x: 0, y: 0 };
      const lift: Point = { x: 0, y: 0 };
      const blow = (ms: number, into: Point): Point => {
        const u = clamp01((ms - leaves) / cross);
        into.x = startX + dir * run * u;
        into.y = y0 + Math.sin(u * 7 + phase + ms * 0.004) * GUST;
        return into;
      };
      return (f) => {
        const ms = f * endAt;
        if (ms < leaves) return { x: startX, y: y0, scale: 0 };
        if (ms < leaves + cross) {
          blow(ms, at);
          return { x: at.x, y: at.y, scale: COIN };
        }
        blow(leaves + cross, from);
        const total = cover?.total() ?? fallback;
        lift.x = from.x;
        lift.y = total.y;
        bezier(
          from,
          lift,
          total,
          easeIn(clamp01((ms - leaves - cross) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });
    // the fastest coins lead the storm front
    const front = (run / crossMs) * SPEED[1];
    const hits = workers
      .map((worker) => ({ worker, at: Math.abs(worker.at.x - startX) / front }))
      .sort((a, b) => a.at - b.at);

    let lastRumble = -Infinity;
    const hitting = createBeats(
      hits,
      (h) => h.at,
      (h, k) => {
        const t = k / Math.max(1, hits.length - 1);
        cover!.promote(h.worker);
        cover!.burst(h.worker.at, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, t));
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
        workers: hits.map((h) => h.worker),
        tick: (ms, now) => {
          hitting.tick(ms, now);
          finale.tick(ms, now);
          if (
            ms < endAt - flightMs &&
            now - lastRumble >= RUMBLE_MS &&
            cover?.isLive()
          ) {
            lastRumble = now;
            shakeScreen(lerp(RUMBLE, clamp01(ms / streamMs)));
          }
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
