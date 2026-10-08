// the "Hopscotch" event (wisp; free upgrade levels): it covers its crit,
// whose click freezes the screen while a wisp hops out of the clicked floor's
// button and plays hopscotch up the income bars: one foot onto a bar, then
// it splits in two and lands both feet either side of the next, then hops
// back together onto the one after, and so on up the screen, every landing a
// thud, a pop and a jolt as the bar lands free levels, each hop quicker; the
// last landing slams its bar in a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "hopscotch";
const MAX_BARS = 6;
// both feet land FEET px either side of the bar's middle
const FEET = 70;
const HOP = 110;
const HOPPER = 0.5;
const LAND_SHAKE: [number, number] = [0.4, 1.2];

interface Hop {
  bar: RewardBar;
  leaves: number;
  lands: number;
  split: boolean;
}

export const forceHopscotchEvent = registerWispEvent(
  KEY,
  "Hopscotch",
  () => CONFIG.hopscotchEvent.chance,
  (floor, context) => {
    const { hopsMs, holdMs, mergeMs } = CONFIG.hopscotchEvent;
    // bottom bar first, hopping up the screen
    const bars = findRewardBars(floor, context).slice(-MAX_BARS).reverse();
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const hops: Hop[] = bars.map((bar, k) => {
      const leaves = clock;
      clock += lerp(hopsMs, k / Math.max(1, bars.length - 1));
      return { bar, leaves, lands: clock, split: k % 2 === 1 };
    });
    const last = hops[hops.length - 1];
    const endAt = last.lands;
    // where foot (-1 left, 1 right, 0 one foot) stands after hop k
    const spot = (k: number, foot: number, into: Point): Point => {
      if (k < 0) {
        into.x = button.x;
        into.y = button.y;
        return into;
      }
      const h = hops[k];
      into.x = h.bar.center.x + (h.split ? foot * FEET : 0);
      into.y = h.bar.center.y - 10;
      return into;
    };
    const from: Point = { x: 0, y: 0 };
    const to: Point = { x: 0, y: 0 };
    const feet = [-1, 1].map((foot) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        let k = 0;
        while (k < hops.length - 1 && ms >= hops[k].lands) k++;
        const h = hops[k];
        const u = clamp01((ms - h.leaves) / (h.lands - h.leaves));
        spot(k - 1, foot, from);
        spot(k, foot, to);
        at.x = lerp([from.x, to.x], u);
        at.y = lerp([from.y, to.y], u) - Math.sin(Math.PI * u) * HOP;
        return at;
      };
    });

    const landing = createBeats(
      hops,
      (h) => h.lands,
      (h, k) => {
        cover!.levels(h.bar, levelsFor(h.bar.floor), button);
        if (h === last) {
          cover!.slam(h.bar);
          cover!.blast(h.bar.center);
          return;
        }
        cover!.burst(h.bar.center, h.split ? 0.55 : 0.4);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, hops.length - 1)));
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
        tick: (ms, now) => landing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawWispBetween(
            ctx,
            feet[0],
            ms,
            now,
            WISP_SIZE * HOPPER,
            0.7,
            0,
            endAt,
          );
          // the second foot only shows while the feet are apart
          for (let k = 0; k < hops.length; k++) {
            const apart = hops[k].split || (k > 0 && hops[k - 1].split);
            if (apart)
              drawWispBetween(
                ctx,
                feet[1],
                ms,
                now,
                WISP_SIZE * HOPPER,
                0.7,
                hops[k].leaves,
                hops[k].lands,
              );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
