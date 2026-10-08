// the "Geyser Rider" event (mix; crit tiers and cash): it covers its crit,
// whose click freezes the screen while a geyser of cash erupts up from the
// bottom of the screen under an income bar with a wisp surfing on its
// crest; it rides the geyser up into the bar with a splash, a bang and a
// jolt, and the bar jumps a crit tier; a new geyser erupts for the next
// bar, quicker each time, the last ride ending in a huge blast and shake.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";

const KEY = "geyserRider";
const REWARD = 2;
const MAX_BARS = 4;
const SWAY = 26;
const WISP = 0.6;
const HIT_SHAKE: [number, number] = [0.7, 1.5];

export const forceGeyserRiderEvent = registerWispEvent(
  KEY,
  "Geyser Rider",
  () => CONFIG.geyserRiderEvent.chance,
  (floor, context, area) => {
    const { eruptsMs, riseMs, holdMs, mergeMs } = CONFIG.geyserRiderEvent;
    const found = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (found.length === 0) return;
    // bottom bar first: each geyser has further to climb
    const bars = [...found].reverse();
    const pour: Pour = {
      coinsAlong: 260,
      width: 50,
      streamMs: riseMs * 0.8,
      travelMs: riseMs,
    };
    let clock = 0;
    const rides = bars.map((bar, k) => {
      const side = k % 2 === 0 ? -1 : 1;
      const x = bar.center.x + side * bar.box.width * 0.25;
      const line = sampleLine(
        (u): Point => ({
          x: x + Math.sin(u * Math.PI * 3) * SWAY,
          y: lerp([area.bottom + 30, bar.center.y], u),
        }),
        30,
      );
      const starts = clock;
      clock += lerp(eruptsMs, k / Math.max(1, bars.length - 1));
      return {
        bar,
        line,
        starts,
        hits: starts + riseMs,
        head: riverHead(line, riseMs, starts),
      };
    });
    const last = rides[rides.length - 1];
    const endAt = last.hits;
    const durationMs = Math.max(
      pourDurationMs(last.starts, pour),
      endAt + holdMs + mergeMs,
    );
    const riders = rides.map(
      (r) => (ms: number) => r.head(Math.max(r.starts, Math.min(ms, r.hits))),
    );

    const erupting = createBeats(
      rides,
      (r) => r.starts,
      (r) => pourLine(cover!, r.line, pour),
    );
    const hitting = createBeats(
      rides,
      (r) => r.hits,
      (r, k) => {
        cover!.tierUp(r.bar);
        if (r === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(r.bar.center);
          return;
        }
        cover!.burst(r.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, rides.length - 1)));
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
          erupting.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          for (let i = 0; i < rides.length; i++)
            drawWispBetween(
              ctx,
              riders[i],
              ms,
              now,
              WISP_SIZE * WISP,
              0.7,
              rides[i].starts,
              rides[i].hits,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
