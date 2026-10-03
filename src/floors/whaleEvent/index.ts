// the "Whale" event (mix; worker perma tiers and cash): it covers its crit,
// whose click freezes the screen while a river of cash rolls in along the
// bottom of the screen and a whale wisp cruises along in it; under each
// worker in view it surfaces and blows a huge spout of cash straight up
// into them with a whoosh, a splash and a jolt, and they climb a perma tier;
// it cruises on blowing ever quicker, the last spout a huge blast and shake
// as the coins sweep into the total. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";
import { findRewardWorkers } from "../eventRewards";

const KEY = "whale";
const REWARD = 2;
const MAX_WORKERS = 6;
const EDGE = 30;
const SEA = 80;
const WHALE = 0.8;
const SPOUT_SHAKE: [number, number] = [0.5, 1.3];

export const forceWhaleEvent = registerWispEvent(
  KEY,
  "Whale",
  () => CONFIG.whaleEvent.chance,
  (floor, context, area) => {
    const { cruiseMs, spoutMs, streamMs, holdMs, mergeMs } = CONFIG.whaleEvent;
    const ltr = Math.random() < 0.5;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => (ltr ? a.at.x - b.at.x : b.at.x - a.at.x));
    if (workers.length === 0) return;
    const sea = area.bottom - SEA;
    const from = ltr ? area.left + EDGE : area.right - EDGE;
    const to = ltr ? area.right - EDGE : area.left + EDGE;
    const tide = sampleLine(
      (u) => ({
        x: lerp([from, to], u),
        y: sea + Math.sin(u * Math.PI * 5) * 8,
      }),
      60,
    );
    const tidePour: Pour = {
      coinsAlong: 800,
      width: 46,
      streamMs,
      travelMs: cruiseMs,
    };
    const spoutPour: Pour = {
      coinsAlong: 700,
      width: 34,
      streamMs: 220,
      travelMs: spoutMs,
    };
    // the whale cruises the sea, reaching each worker's x in turn
    const share = (x: number) => (x - from) / (to - from);
    const spouts = workers
      .map((worker) => {
        const base: Point = { x: worker.at.x, y: sea };
        const blows =
          cruiseMs *
          smoothstep(0.15 + 0.85 * clamp01(share(worker.at.x))) *
          0.95;
        return {
          worker,
          base,
          blows,
          lands: blows + spoutMs,
          line: sampleLine(
            (u) => ({ x: base.x, y: lerp([sea, worker.at.y], u) }),
            24,
          ),
        };
      })
      .sort((a, b) => a.blows - b.blows);
    const last = spouts[spouts.length - 1];
    const endAt = last.lands;
    const durationMs = Math.max(
      pourDurationMs(0, tidePour),
      pourDurationMs(last.blows, spoutPour),
      endAt + holdMs + mergeMs,
    );
    const whaleAt: Point = { x: 0, y: sea };
    const whale = (ms: number): Point => {
      // the inverse of each spout's timing, so it sits under each worker as it blows
      let lo = 0;
      let hi = 1;
      const target = clamp01(ms / (cruiseMs * 0.95));
      for (let i = 0; i < 16; i++) {
        const mid = (lo + hi) / 2;
        if (smoothstep(0.15 + 0.85 * mid) < target) lo = mid;
        else hi = mid;
      }
      whaleAt.x = lerp([from, to], hi);
      whaleAt.y = sea + Math.sin(ms / 120) * 6;
      return whaleAt;
    };

    const blowing = createBeats(
      spouts,
      (s) => s.blows,
      (s) => {
        pourLine(cover!, s.line, spoutPour);
        cover!.burst(s.base, 0.4);
      },
    );
    const soaking = createBeats(
      spouts,
      (s) => s.lands,
      (s, k) => {
        cover!.promote(s.worker);
        if (s === last) {
          cover!.blast(s.worker.at);
          return;
        }
        cover!.burst(s.worker.at, 0.45);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SPOUT_SHAKE, k / Math.max(1, spouts.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        workers,
        tick: (ms, now) => {
          blowing.tick(ms, now);
          soaking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              whale,
              ms,
              now,
              WISP_SIZE * WHALE,
              0.5,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    pourLine(cover, tide, tidePour);
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
