// the "Dome Fountains" event (money; free upgrade levels and cash): it
// covers its crit, whose click freezes the screen while an income bar bursts
// into a bell fountain: a fan of jets of cash leaps up out of its middle
// and arches over in a glassy dome, splashing down along the bar with a
// bang and a jolt that lands free levels; the next bar blooms into its own
// dome, quicker each time, and the last splashes down in a huge blast and
// shake as the cash pours into the total. Pays floor income × floor number
// × REWARD, plus the levels
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";
import { findRewardBars, levelsFor, type RewardBar } from "../eventRewards";

const KEY = "domeFountains";
const REWARD = 2;
const MAX_BARS = 4;
const JETS = 7;
const HEIGHT = 200;
// the dome spreads a little past the bar's ends
const SPREAD = 1.1;
const SPLASH_SHAKE: [number, number] = [0.6, 1.4];

interface Dome {
  bar: RewardBar;
  starts: number;
  lands: number;
  jets: Point[][];
}

export const forceDomeFountainsEvent = registerWispEvent(
  KEY,
  "Dome Fountains",
  () => CONFIG.domeFountainsEvent.chance,
  (floor, context, area) => {
    const { domesMs, streamMs, travelMs, levelShare, holdMs, mergeMs } =
      CONFIG.domeFountainsEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const total = totalSpot(area);
    const pour: Pour = { coinsAlong: 80, width: 14, streamMs, travelMs };
    let clock = 0;
    const domes: Dome[] = bars.map((bar, k) => {
      const from: Point = { x: bar.center.x, y: bar.box.y };
      const jets = Array.from({ length: JETS }, (_, j) => {
        const to: Point = {
          x: bar.center.x + (j / (JETS - 1) - 0.5) * bar.box.width * SPREAD,
          y: bar.center.y,
        };
        return sampleLine(
          (u) => ({
            x: lerp([from.x, to.x], u),
            y: lerp([from.y, to.y], u) - 4 * HEIGHT * u * (1 - u),
          }),
          20,
        );
      });
      const dome = { bar, starts: clock, lands: clock + travelMs, jets };
      clock += lerp(domesMs, k / Math.max(1, bars.length - 1));
      return dome;
    });
    const last = domes[domes.length - 1];

    const blooming = createBeats(
      domes,
      (d) => d.starts,
      (d) => {
        for (const jet of d.jets) pourLine(cover!, jet, pour);
      },
    );
    const splashing = createBeats(
      domes,
      (d) => d.lands,
      (d, k) => {
        cover!.levels(
          d.bar,
          levelsFor(d.bar.floor, levelShare, 2),
          d.bar.center,
        );
        if (d === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(cover!.total() ?? total);
          return;
        }
        cover!.burst(d.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SPLASH_SHAKE, k / Math.max(1, domes.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: Math.max(
          pourDurationMs(last.starts, pour),
          last.lands + holdMs + mergeMs,
        ),
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          blooming.tick(ms, now);
          splashing.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
