// the "Bucket Swing" event (mix; cash): it covers its crit, whose click
// freezes the screen while a wisp scoops a bucketful of cash out of the
// clicked floor's button and swings it round in a full vertical circle over
// its head, the cash staying in the bucket, faster and faster, every loop a
// whoosh and a jolt as coins slosh off the rim at the top; on the last loop
// it lets go and the whole bucketful flies out in a great arcing river into
// the total in a huge blast and shake. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import type { CoinPath } from "../coins";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { sprayTargets } from "../../shared/coinTargets";
import { totalSpot } from "../cashFlow";

const KEY = "bucketSwing";
const REWARD = 4;
const LOOPS = 4;
const RADIUS = 180;
const BUCKET_COINS = 700;
const BUCKET = 36;
// coins slosh behind the bucket by up to LAG radians, so it smears round
const LAG = 0.35;
const SLOSH_COINS = 36;
const SLOSH_SHAKE: [number, number] = [0.5, 1.1];
const COIN = 0.75;
const SWINGER = 0.6;

export const forceBucketSwingEvent = registerWispEvent(
  KEY,
  "Bucket Swing",
  () => CONFIG.bucketSwingEvent.chance,
  (floor, context, area) => {
    const { scoopMs, loopsMs, flingMs, holdMs, mergeMs } =
      CONFIG.bucketSwingEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const hub: Point = {
      x: (area.left + area.right) / 2,
      y: Math.max(
        area.top + RADIUS + 200,
        Math.min(area.bottom - RADIUS - 60, (area.top + area.bottom) / 2 + 60),
      ),
    };
    const loopEnds: number[] = [];
    let clock: number = scoopMs;
    for (let k = 0; k < LOOPS; k++) {
      clock += lerp(loopsMs, k / (LOOPS - 1));
      loopEnds.push(clock);
    }
    const lastLoopMs = lerp(loopsMs, 1);
    // a final quarter turn to the left side, where it's heading straight up
    const lets = clock + lastLoopMs / 4;
    const endAt = lets + flingMs;
    // the bucket's angle: from the bottom (π/2), a full turn per loop
    const angle = (ms: number): number => {
      const t = Math.max(scoopMs, ms);
      let start: number = scoopMs;
      for (let k = 0; k < LOOPS; k++) {
        if (t < loopEnds[k])
          return (
            Math.PI / 2 +
            Math.PI * 2 * (k + (t - start) / (loopEnds[k] - start))
          );
        start = loopEnds[k];
      }
      return Math.PI / 2 + Math.PI * 2 * (LOOPS + (t - start) / lastLoopMs);
    };
    const bottom: Point = { x: hub.x, y: hub.y + RADIUS };
    const scoopCtrl: Point = { x: button.x, y: bottom.y + 40 };
    const bucket = (ms: number, lag: number, into: Point): Point => {
      if (ms < scoopMs)
        return bezier(
          button,
          scoopCtrl,
          bottom,
          easeOut(clamp01(ms / scoopMs)),
          into,
        );
      const a = angle(ms) - lag * clamp01((ms - scoopMs) / 200);
      into.x = hub.x + Math.cos(a) * RADIUS;
      into.y = hub.y + Math.sin(a) * RADIUS;
      return into;
    };
    const head: Point = { x: 0, y: 0 };
    const swinger = (ms: number): Point => {
      const t = Math.max(0, ms);
      if (t >= scoopMs) return hub;
      return bezier(
        button,
        scoopCtrl,
        hub,
        easeOut(clamp01(t / scoopMs)),
        head,
      );
    };

    const paths: CoinPath[] = Array.from({ length: BUCKET_COINS }, (_, i) => {
      const s = i / BUCKET_COINS;
      const a = Math.random() * Math.PI * 2;
      const r = BUCKET * Math.sqrt(Math.random());
      const dx = Math.cos(a) * r;
      const dy = Math.sin(a) * r;
      const lag = LAG * Math.random();
      const scoops = scoopMs * 0.5 * s;
      const at: Point = { x: 0, y: 0 };
      const rel = bucket(lets, lag, { x: 0, y: 0 });
      const from: Point = { x: rel.x + dx, y: rel.y + dy };
      const ctrl: Point = {
        x: from.x - 240,
        y: Math.min(from.y, total.y) - 200,
      };
      // the river leaves front first, each coin's flight over half the fling
      const flies = lets + flingMs * 0.5 * s;
      const flightMs = flingMs * 0.5;
      return (f) => {
        const ms = f * endAt;
        if (ms < scoops) return { x: button.x, y: button.y, scale: 0 };
        if (ms < scoopMs) {
          const u = clamp01((ms - scoops) / (scoopMs - scoops));
          bezier(button, scoopCtrl, bottom, easeOut(u), at);
          return { x: at.x + dx * u, y: at.y + dy * u, scale: COIN };
        }
        if (ms < lets) {
          bucket(ms, lag, at);
          return { x: at.x + dx, y: at.y + dy, scale: COIN };
        }
        const p = { x: 0, y: 0, scale: COIN };
        bezier(from, ctrl, total, easeIn(clamp01((ms - flies) / flightMs)), p);
        return p;
      };
    });
    const tops = loopEnds.map((end, k) => {
      const startsAt = k === 0 ? scoopMs : loopEnds[k - 1];
      return startsAt + (end - startsAt) * 0.5;
    });

    const sloshing = createBeats(
      tops,
      (ms) => ms,
      (ms, k) => {
        const at = bucket(ms, 0, { x: 0, y: 0 });
        cover!.launchFrom(
          at,
          sprayTargets(at, SLOSH_COINS, [60, 220], -Math.PI / 2, 2.2),
        );
        cover!.burst(at, 0.4 + 0.15 * k);
        if (!cover!.isLive()) return;
        playBloop();
        playSwoosh();
        shakeScreen(lerp(SLOSH_SHAKE, k / (LOOPS - 1)));
      },
    );
    const finale = createBeats(
      [lets, endAt],
      (ms) => ms,
      (ms) => {
        if (ms === endAt) {
          cover!.blast(cover!.total() ?? total);
          return;
        }
        cover!.burst(bucket(lets, 0, { x: 0, y: 0 }), 0.8);
        if (cover!.isLive()) playSwoosh();
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          sloshing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            swinger,
            ms,
            now,
            WISP_SIZE * SWINGER,
            clamp01(ms / lets),
            0,
            lets,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
