// the "Bottle Rocket" event (explosion; free upgrade levels): it covers its
// crit, whose click freezes the screen while a fizzing rocket wisp sits on
// the bottom of the screen under the lowest income bar; it whooshes up in a
// wild zigzag and bursts on the bar in a big blast and a cluster of smaller
// ones, each with its own bang and shake, landing free levels, and the blast
// lights the next rocket under the next bar up, quicker each time; the last
// goes off in one colossal blast ringed by a cluster and the hardest shake
// of all. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import {
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../../../shared/explosion";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "bottleRocket";
const MAX_BARS = 4;
const PAD = 40;
const ZIG = 70;
const ZIGS = 4;
const ROCKET = 0.4;
const FUSE = 46;
const MAIN = 300;
const CLUSTER = 3;
const CLUSTER_OFF = 90;
const CLUSTER_SIZE = 200;
const CLUSTER_GAP_MS = 70;
const COLOSSAL = 680;
const FINAL_CLUSTER = 5;
const BANG_GAP_MS = 50;
const BLAST_SHAKE: [number, number] = [0.7, 1.3];
const FINAL_SHAKE = 2.4;

interface Rocket {
  bar: RewardBar;
  pad: Point;
  // fizzing on its pad from when the rocket before it takes off
  lit: number;
  launches: number;
  bursts: number;
  at: (ms: number) => Point;
}

interface Blast {
  at: Point;
  ms: number;
  size: number;
}

export const forceBottleRocketEvent = registerWispEvent(
  KEY,
  "Bottle Rocket",
  () => CONFIG.bottleRocketEvent.chance,
  (floor, context, area) => {
    const { fuseMs, flightsMs, levelShare, holdMs, mergeMs } =
      CONFIG.bottleRocketEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS).reverse();
    if (bars.length === 0) return;
    let clock = fuseMs;
    let lit = 0;
    const rockets: Rocket[] = bars.map((bar, k) => {
      const pad: Point = {
        x: bar.center.x + (k % 2 ? 1 : -1) * bar.box.width * 0.25,
        y: area.bottom - PAD,
      };
      const launches = clock;
      clock += lerp(flightsMs, k / Math.max(1, bars.length - 1));
      const bursts = clock;
      const spot: Point = { x: 0, y: 0 };
      const phase = Math.random() * Math.PI;
      const rocket: Rocket = {
        bar,
        pad,
        lit,
        launches,
        bursts,
        at: (ms) => {
          const u = clamp01((ms - launches) / (bursts - launches));
          spot.x =
            lerp([pad.x, bar.center.x], u) +
            Math.sin(u * Math.PI * ZIGS + phase) * ZIG * (1 - u);
          spot.y = lerp([pad.y, bar.center.y], easeIn(u));
          return spot;
        },
      };
      lit = launches;
      return rocket;
    });
    const last = rockets[rockets.length - 1];
    const ringOf = (
      at: Point,
      count: number,
      off: number,
      ms: number,
      size: number,
    ): Blast[] =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + Math.random();
        return {
          at: {
            x: at.x + Math.cos(a) * off,
            y: at.y + Math.sin(a) * off * 0.7,
          },
          ms,
          size,
        };
      });
    const blasts: Blast[] = rockets.flatMap((r) =>
      r === last
        ? [
            { at: r.bar.center, ms: r.bursts, size: COLOSSAL },
            ...ringOf(
              r.bar.center,
              FINAL_CLUSTER,
              CLUSTER_OFF * 1.8,
              r.bursts + CLUSTER_GAP_MS,
              CLUSTER_SIZE * 1.3,
            ),
          ]
        : [
            { at: r.bar.center, ms: r.bursts, size: MAIN },
            ...ringOf(
              r.bar.center,
              CLUSTER,
              CLUSTER_OFF,
              r.bursts + CLUSTER_GAP_MS,
              CLUSTER_SIZE,
            ),
          ],
    );
    const endAt = last.bursts + CLUSTER_GAP_MS + DETONATION_MS;

    const bursting = createBeats(
      rockets,
      (r) => r.bursts,
      (r) => {
        cover!.levels(
          r.bar,
          levelsFor(r.bar.floor, levelShare, 2),
          r.bar.center,
        );
        if (r !== last) return;
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(r.bar.center);
        if (!cover!.isLive()) return;
        playSlamExplosion();
        shakeScreen(FINAL_SHAKE);
      },
    );
    let bang = -Infinity;
    const banging = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (!cover!.isLive() || b.size === COLOSSAL) return;
        if (b.ms - bang >= BANG_GAP_MS) {
          bang = b.ms;
          playExplosion();
        }
        shakeScreen(lerp(BLAST_SHAKE, b.ms / last.bursts) * (b.size / MAIN));
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
          bursting.tick(ms, now);
          banging.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (const r of rockets) {
            if (ms >= r.bursts || ms < r.lit) continue;
            const spot = r.at(ms);
            drawLitFuse(
              ctx,
              spot,
              clamp01((ms - r.lit) / (r.bursts - r.lit)),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              r.at,
              ms,
              now,
              WISP_SIZE * ROCKET,
              1,
              r.lit,
              r.bursts,
            );
          }
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
