// the "Bolt of Cash" event (money; crit tiers and cash): it covers its crit,
// whose click freezes the screen while a river of cash cracks down out of
// the top of the screen in a jagged zigzag like a bolt of lightning and
// smashes onto an income bar, every kink a splash, the bar jumping a crit
// tier with a bang and a big jolt; bolt after bolt of cash cracks down onto
// the next bar and the next, ever quicker, the last a huge blast and shake
// as the coins sweep into the total. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { pourDurationMs, pourLine, type Pour } from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";

const KEY = "boltOfCash";
const REWARD = 2;
const MAX_BARS = 3;
const TOP = 130;
// each bolt kinks KINKS times, JAG px side to side
const KINKS = 5;
const JAG = 70;
const STEPS = 6;
const HIT_SHAKE: [number, number] = [0.8, 1.4];

export const forceBoltOfCashEvent = registerWispEvent(
  KEY,
  "Bolt of Cash",
  () => CONFIG.boltOfCashEvent.chance,
  (floor, context, area) => {
    const { boltsMs, strikeMs, holdMs, mergeMs } = CONFIG.boltOfCashEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const pour: Pour = {
      coinsAlong: 500,
      width: 30,
      streamMs: strikeMs * 0.8,
      travelMs: strikeMs,
    };
    let clock = 0;
    const bolts = bars.map((bar, k) => {
      const top: Point = {
        x: bar.center.x + (Math.random() - 0.5) * 160,
        y: area.top + TOP,
      };
      const corners: Point[] = [top];
      for (let i = 1; i <= KINKS; i++)
        corners.push({
          x:
            lerp([top.x, bar.center.x], i / (KINKS + 1)) +
            (i % 2 === 0 ? JAG : -JAG),
          y: lerp([top.y, bar.center.y], i / (KINKS + 1)),
        });
      corners.push(bar.center);
      const line: Point[] = [top];
      for (let c = 1; c < corners.length; c++)
        for (let s = 1; s <= STEPS; s++)
          line.push({
            x: lerp([corners[c - 1].x, corners[c].x], s / STEPS),
            y: lerp([corners[c - 1].y, corners[c].y], s / STEPS),
          });
      const starts = clock;
      clock += lerp(boltsMs, k / Math.max(1, bars.length - 1));
      return { bar, line, starts, lands: starts + strikeMs };
    });
    const last = bolts[bolts.length - 1];
    const durationMs = Math.max(
      pourDurationMs(last.starts, pour),
      last.lands + holdMs + mergeMs,
    );

    const striking = createBeats(
      bolts,
      (b) => b.starts,
      (b) => pourLine(cover!, b.line, pour),
    );
    const landing = createBeats(
      bolts,
      (b) => b.lands,
      (b, k) => {
        cover!.tierUp(b.bar, b.line[0]);
        if (b === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(b.bar.center);
          return;
        }
        cover!.burst(b.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, bolts.length - 1)));
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
          striking.tick(ms, now);
          landing.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
