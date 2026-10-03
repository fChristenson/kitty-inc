// the "Pendulum Pour" event (money; free upgrade levels and cash): it covers
// its crit, whose click freezes the screen while a jet of cash gushes down
// out of a pivot at the top of the screen and swings like a pendulum, each
// swing reaching longer and lower; at the bottom of every swing the jet
// sweeps through the next income bar down with a splash and a jolt that
// lands free levels, swinging ever faster; the last swing slams its bar in a
// huge blast and shake as the coins sweep into the total. Pays floor income
// × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "pendulumPour";
const REWARD = 2;
const MAX_BARS = 4;
const TOP = 130;
// each swing sweeps SWING rad either side, firing a jet every JET_MS
const SWING = 0.7;
const JET_MS = 55;
const HIT_SHAKE: [number, number] = [0.5, 1.3];

export const forcePendulumPourEvent = registerWispEvent(
  KEY,
  "Pendulum Pour",
  () => CONFIG.pendulumPourEvent.chance,
  (floor, context, area) => {
    const { swingsMs, holdMs, mergeMs } = CONFIG.pendulumPourEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const pivot: Point = { x: bars[0].center.x, y: area.top + TOP };
    const jet: Pour = {
      coinsAlong: 160,
      width: 22,
      streamMs: 70,
      travelMs: 260,
    };
    const jets: { at: number; line: Point[] }[] = [];
    let clock = 0;
    const swings = bars.map((bar, k) => {
      const span = lerp(swingsMs, k / Math.max(1, bars.length - 1));
      const reach = bar.center.y - pivot.y;
      const dir = k % 2 === 0 ? 1 : -1;
      for (let t = 0; t < span; t += JET_MS) {
        const a = dir * SWING * Math.cos((Math.PI * t) / span);
        const tip: Point = {
          x: pivot.x + Math.sin(a) * reach,
          y: pivot.y + Math.cos(a) * reach,
        };
        jets.push({
          at: clock + t,
          line: sampleLine(
            (u) => ({
              x: lerp([pivot.x, tip.x], u),
              y: lerp([pivot.y, tip.y], u),
            }),
            12,
          ),
        });
      }
      const sweeps = clock + span / 2 + jet.travelMs;
      clock += span;
      return { bar, sweeps };
    });
    const last = swings[swings.length - 1];
    const durationMs = Math.max(
      pourDurationMs(jets[jets.length - 1].at, jet),
      last.sweeps + holdMs + mergeMs,
    );

    const pouring = createBeats(
      jets,
      (j) => j.at,
      (j) => pourLine(cover!, j.line, jet),
    );
    const sweeping = createBeats(
      swings,
      (s) => s.sweeps,
      (s, k) => {
        cover!.levels(s.bar, levelsFor(s.bar.floor), pivot);
        if (s === last) {
          cover!.slam(s.bar);
          cover!.blast(s.bar.center);
          return;
        }
        cover!.burst(s.bar.center, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, swings.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        bars,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          sweeping.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
