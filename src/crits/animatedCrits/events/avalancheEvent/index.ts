// the "Avalanche" event (money; cash and free upgrade levels): it covers its
// crit, whose click freezes the screen while a mass of cash breaks loose off
// a top corner and roars down across the screen in a widening, tumbling
// torrent as the screen rumbles ever harder; every income bar it buries
// jolts with a flash and free levels, and it crashes into a heap at the foot
// in a bang and a big shake; then the whole heap surges up into the total,
// which goes off in a huge blast and shake. Pays floor income × floor number
// × REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";
import type { Point } from "../../../../shared/wisp";
import { levelsFor } from "../../../../gameState";

const KEY = "avalanche";
const REWARD = 3;
const COINS = 1_600;
const COIN = 0.75;
const MAX_BARS = 5;
const SAMPLES = 120;
// the torrent's width at its top and at its foot
const SPREAD: [number, number] = [50, 340];
// coins tumble up to HOP px off the slope as they slide
const HOP = 36;
// the heap at the foot, px across and high
const HEAP: [number, number] = [190, 120];
const SETTLE_MS = 140;
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.4, 1.4];
const HIT_SHAKE: [number, number] = [0.9, 1.6];

export const forceAvalancheEvent = registerWispEvent(
  KEY,
  "Avalanche",
  () => CONFIG.avalancheEvent.chance,
  (floor, context, area) => {
    const { streamMs, fallMs, drainMs, flightMs, levelShare, holdMs, mergeMs } =
      CONFIG.avalancheEvent;
    const fallback = totalSpot(area);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const side = Math.random() < 0.5 ? 1 : -1;
    const middle = (area.left + area.right) / 2;
    const start: Point = {
      x: side > 0 ? area.left - 80 : area.right + 80,
      y: area.top + height * 0.1,
    };
    const bend: Point = {
      x: middle + side * width * 0.15,
      y: area.top + height * 0.3,
    };
    const foot: Point = {
      x: middle + side * width * 0.28,
      y: area.bottom - HEAP[1] * 0.6,
    };
    // the slope's centre and its normal, sampled once
    const xs = new Float32Array(SAMPLES + 1);
    const ys = new Float32Array(SAMPLES + 1);
    const nxs = new Float32Array(SAMPLES + 1);
    const nys = new Float32Array(SAMPLES + 1);
    const p: Point = { x: 0, y: 0 };
    for (let i = 0; i <= SAMPLES; i++) {
      const u = i / SAMPLES;
      bezier(start, bend, foot, u, p);
      xs[i] = p.x;
      ys[i] = p.y;
      const dx = 2 * (1 - u) * (bend.x - start.x) + 2 * u * (foot.x - bend.x);
      const dy = 2 * (1 - u) * (bend.y - start.y) + 2 * u * (foot.y - bend.y);
      const length = Math.hypot(dx, dy) || 1;
      nxs[i] = -dy / length;
      nys[i] = dx / length;
    }
    const crashAt = fallMs;
    const surgeAt = streamMs + fallMs + SETTLE_MS;
    const endAt = surgeAt + drainMs + flightMs;

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const leaves = (i / COINS) * streamMs;
      const lands = leaves + fallMs;
      const flies = surgeAt + (i / COINS) * drainMs;
      // denser in the middle of the torrent
      const lane = Math.random() + Math.random() - 1;
      const spin = 0.012 + Math.random() * 0.018;
      const phase = Math.random() * Math.PI * 2;
      const end: Point = {
        x: xs[SAMPLES] + nxs[SAMPLES] * lane * SPREAD[1] * 0.5,
        y: ys[SAMPLES] + nys[SAMPLES] * lane * SPREAD[1] * 0.5,
      };
      const rest: Point = {
        x: foot.x + lane * HEAP[0],
        y:
          foot.y +
          HEAP[1] * 0.5 -
          (1 - Math.abs(lane)) * HEAP[1] * Math.random(),
      };
      const lift: Point = { x: rest.x, y: 0 };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < leaves) return { x: start.x, y: start.y, scale: 0 };
        if (ms < lands) {
          const t = (ms - leaves) / fallMs;
          const u = easeIn(t);
          const k = Math.min(SAMPLES, Math.round(u * SAMPLES));
          const half = lerp(SPREAD, u) * 0.5 * lane;
          const hop =
            HOP * u * Math.abs(Math.sin((ms - leaves) * spin + phase));
          return {
            x: xs[k] + nxs[k] * half,
            y: ys[k] + nys[k] * half - hop,
            scale: COIN,
          };
        }
        if (ms < flies) {
          const s = easeOut(clamp01((ms - lands) / SETTLE_MS));
          return {
            x: end.x + (rest.x - end.x) * s,
            y: end.y + (rest.y - end.y) * s,
            scale: COIN,
          };
        }
        const total = cover?.total() ?? fallback;
        lift.y = total.y + (rest.y - total.y) * 0.4;
        bezier(rest, lift, total, easeIn(clamp01((ms - flies) / flightMs)), at);
        return { x: at.x, y: at.y, scale: COIN };
      };
    });

    // the torrent's front reaches each bar it crosses
    const bars =
      context.upgradeFloorFree === undefined
        ? []
        : findRewardBars(floor, context).slice(0, MAX_BARS);
    const hits = bars
      .flatMap((bar) => {
        let k = 1;
        while (k <= SAMPLES && ys[k] < bar.center.y) k++;
        if (k > SAMPLES || bar.center.y < ys[0]) return [];
        const x = Math.min(
          bar.box.x + bar.box.width - 20,
          Math.max(bar.box.x + 20, xs[k]),
        );
        return [
          {
            bar,
            at: fallMs * Math.sqrt(k / SAMPLES),
            spot: { x, y: bar.center.y },
          },
        ];
      })
      .sort((a, b) => a.at - b.at);

    let lastRumble = -Infinity;
    const burying = createBeats(
      hits,
      (h) => h.at,
      (h, k) => {
        const t = k / Math.max(1, hits.length - 1);
        cover!.levels(h.bar, levelsFor(h.bar.floor, levelShare), {
          x: h.spot.x,
          y: h.spot.y - 80,
        });
        cover!.burst(h.spot, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, t));
      },
    );
    const crash = createBeats(
      [crashAt],
      (ms) => ms,
      () => {
        cover!.burst(foot, 1.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(2.2);
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
        bars,
        tick: (ms, now) => {
          burying.tick(ms, now);
          crash.tick(ms, now);
          finale.tick(ms, now);
          if (
            ms < surgeAt &&
            now - lastRumble >= RUMBLE_MS &&
            cover?.isLive()
          ) {
            lastRumble = now;
            shakeScreen(lerp(RUMBLE, clamp01(ms / surgeAt)));
          }
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
