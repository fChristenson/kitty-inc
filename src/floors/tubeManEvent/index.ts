// the "Tube Man" event (wisp; worker perma tiers): it covers its crit,
// whose click freezes the screen while a wacky inflatable tube man of
// stacked wisps billows up out of the clicked floor's button, flailing
// wildly, its floppy body whipping after its head; it flops over and
// smacks each worker in turn with a slap, a flash and a jolt as they climb
// a perma tier, springing back up between slaps, flailing faster each
// time, the last slap in a huge blast and shake. Then the crit's tier pays
// out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { bezier } from "../../shared/curves";
import { findRewardWorkers, type RewardWorker } from "../eventRewards";

const KEY = "tubeMan";
const MAX_WORKERS = 6;
const SEGMENTS = 10;
const STAND = 340;
// how far behind the head each step down the body trails
const LAG = 110;
const SWAY = 70;
const BODY = 0.42;
const HEAD = 0.75;
const SLAP_SHAKE: [number, number] = [0.6, 1.3];

interface Slap {
  worker: RewardWorker;
  // the head leaves its upright pose, lands on the worker, springs back up
  leaves: number;
  lands: number;
  back: number;
}

export const forceTubeManEvent = registerWispEvent(
  KEY,
  "Tube Man",
  () => CONFIG.tubeManEvent.chance,
  (floor, context) => {
    const { riseMs, slapsMs, holdMs, mergeMs } = CONFIG.tubeManEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const base = getButtonCenter(context.isGroundFloor);
    const up: Point = { x: base.x, y: base.y - STAND };
    let clock: number = riseMs;
    const slaps: Slap[] = workers.map((worker, k) => {
      const gap = lerp(slapsMs, k / Math.max(1, workers.length - 1));
      const leaves = clock;
      const lands = leaves + gap * 0.5;
      const back = lands + gap * 0.5;
      clock = back;
      return { worker, leaves, lands, back };
    });
    const last = slaps[slaps.length - 1];
    const endAt = last.lands + LAG;
    const head: Point = { x: 0, y: 0 };
    // where the head is driven at ms: billowing up, then flopping onto each worker
    const drive = (ms: number): Point => {
      if (ms < riseMs) {
        const u = smoothstep(clamp01(ms / riseMs));
        head.x = base.x;
        head.y = lerp([base.y, up.y], u);
        return head;
      }
      let s = slaps[0];
      for (const slap of slaps) if (ms >= slap.leaves) s = slap;
      const target = s.worker.at;
      const u =
        ms < s.lands
          ? smoothstep(clamp01((ms - s.leaves) / (s.lands - s.leaves)))
          : s === last
            ? 1
            : 1 - smoothstep(clamp01((ms - s.lands) / (s.back - s.lands)));
      head.x = lerp([up.x, target.x], u) + Math.sin(ms * 0.02) * 20 * (1 - u);
      head.y = lerp([up.y, target.y], u);
      return head;
    };
    const mid: Point = { x: 0, y: 0 };
    const tip: Point = { x: 0, y: 0 };
    const segments = Array.from({ length: SEGMENTS }, (_, k) => {
      const f = (k + 1) / SEGMENTS;
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        // each step down the body follows where the head was a moment ago
        const lagged = drive(ms - (1 - f) * LAG);
        tip.x = lagged.x;
        tip.y = lagged.y;
        mid.x = (base.x + tip.x) / 2 + Math.sin(ms * 0.014 + f * 3) * SWAY;
        mid.y = (base.y + tip.y) / 2;
        return bezier(base, mid, tip, f, at);
      };
    });

    const slapping = createBeats(
      slaps,
      (s) => s.lands,
      (s, k) => {
        cover!.promote(s.worker);
        if (s === last) {
          cover!.blast(s.worker.at);
          return;
        }
        cover!.burst(s.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SLAP_SHAKE, k / Math.max(1, slaps.length - 1)));
      },
    );
    const billowing = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
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
          billowing.tick(ms, now);
          slapping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 300) return;
          if (ms <= endAt)
            for (let k = 0; k < SEGMENTS - 1; k++)
              drawWispHead(ctx, segments[k], ms, now, WISP_SIZE * BODY, 0.4);
          drawWispBetween(
            ctx,
            segments[SEGMENTS - 1],
            ms,
            now,
            WISP_SIZE * HEAD,
            1,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
