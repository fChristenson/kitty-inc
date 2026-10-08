// the "Jumping Jets" event (money; crit tiers and cash): it covers its crit,
// whose click freezes the screen while a glassy jet of cash leaps out of the
// clicked floor's button in a high arc like a theme-park leaping fountain
// and splashes down on an income bar, which jumps a crit tier with a bang
// and a jolt; from there the next jet leaps on to the far end of the next
// bar, zigzagging up the screen, quicker each leap, the last one leaping
// into the total in a huge blast and shake. Pays floor income × floor
// number × REWARD, plus the tiers
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "jumpingJets";
const REWARD = 2;
const MAX_BARS = 4;
// it lands this share of the bar's width in from its end
const IN = 0.2;
const LIFT = 240;
const SPLASH_SHAKE: [number, number] = [0.6, 1.4];

interface Leap {
  bar: RewardBar | null;
  to: Point;
  starts: number;
  lands: number;
  line: Point[];
  pour: Pour;
}

export const forceJumpingJetsEvent = registerWispEvent(
  KEY,
  "Jumping Jets",
  () => CONFIG.jumpingJetsEvent.chance,
  (floor, context, area) => {
    const { leapsMs, flightMs, slugMs, gushMs, holdMs, mergeMs } =
      CONFIG.jumpingJetsEvent;
    const bars = findRewardBars(floor, context)
      .slice(0, MAX_BARS)
      .sort((a, b) => b.center.y - a.center.y);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    // landing on alternate ends, so the jets zigzag up the screen
    const spots: Point[] = bars.map((bar, k) => ({
      x: bar.box.x + bar.box.width * (k % 2 === 0 ? IN : 1 - IN),
      y: bar.center.y,
    }));
    const targets = [...bars, null];
    let from = button;
    let clock = 0;
    const leaps: Leap[] = targets.map((bar, k) => {
      const t = k / Math.max(1, targets.length - 1);
      const to = bar ? spots[k] : total;
      const travelMs = lerp(flightMs, t);
      const a = from;
      const lift = LIFT + Math.max(0, a.y - to.y) * 0.3;
      const line = sampleLine(
        (u) => ({
          x: lerp([a.x, to.x], u),
          y: lerp([a.y, to.y], u) - 4 * lift * u * (1 - u),
        }),
        30,
      );
      const leap: Leap = {
        bar,
        to,
        starts: clock,
        lands: clock + travelMs,
        line,
        pour: {
          coinsAlong: bar ? 520 : 700,
          width: bar ? 30 : 44,
          streamMs: bar ? slugMs : gushMs,
          travelMs,
        },
      };
      from = to;
      // the next jet leaps off as this one splashes down
      clock = leap.lands + lerp(leapsMs, t);
      return leap;
    });
    const last = leaps[leaps.length - 1];

    const leaping = createBeats(
      leaps,
      (l) => l.starts,
      (l) => pourLine(cover!, l.line, l.pour),
    );
    const landing = createBeats(
      leaps,
      (l) => l.lands,
      (l, k) => {
        if (!l.bar) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(cover!.total() ?? total);
          return;
        }
        cover!.tierUp(l.bar, l.to);
        cover!.burst(l.to, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SPLASH_SHAKE, k / Math.max(1, leaps.length - 2)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: Math.max(
          pourDurationMs(last.starts, last.pour),
          last.lands + holdMs + mergeMs,
        ),
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          leaping.tick(ms, now);
          landing.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
