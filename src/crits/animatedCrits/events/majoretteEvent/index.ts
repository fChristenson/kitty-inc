// the "Majorette" event (wisp; crit tiers): it covers its crit, whose
// click freezes the screen while a twirling baton of two wisps whirls up
// out of the clicked floor's button and is flung high into the air,
// spinning end over end; it comes down onto an income bar with a clang, a
// flash and a jolt that jumps the bar a crit tier, then flips straight back
// up even higher and faster, bar after bar; on the last it lands so hard
// that every bar slams in a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars } from "../../eventRewards";

const KEY = "majorette";
const MAX_BARS = 3;
// the baton is HALF px from its middle to each end, turning SPIN laps per
// throw; throws peak LOFT px over the higher end, each LOFT_STEP higher
const HALF = 34;
const SPIN = 3;
const LOFT = 160;
const LOFT_STEP = 60;
const END = 0.5;
const LAND_SHAKE: [number, number] = [0.9, 1.5];

export const forceMajoretteEvent = registerWispEvent(
  KEY,
  "Majorette",
  () => CONFIG.majoretteEvent.chance,
  (floor, context, area) => {
    const { throwsMs, holdMs, mergeMs } = CONFIG.majoretteEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let from: Point = button;
    let clock = 0;
    const throws = bars.map((bar, k) => {
      const span = lerp(throwsMs, k / Math.max(1, bars.length - 1));
      const to: Point = {
        x: bar.box.x + bar.box.width * (0.3 + 0.4 * Math.random()),
        y: bar.center.y - 10,
      };
      const low = Math.min(from.y, to.y);
      const peak = Math.min(
        low - 20,
        Math.max(area.top + 30, low - LOFT - LOFT_STEP * k),
      );
      const t = { bar, from, to, peak, starts: clock, lands: clock + span };
      clock += span;
      from = to;
      return t;
    });
    const endAt = clock;
    // the baton's middle: a parabola through the peak, and its turn
    const middle: Point = { x: 0, y: 0 };
    const stateAt = (ms: number): number => {
      let k = 0;
      while (k < throws.length - 1 && ms > throws[k].lands) k++;
      const t = throws[k];
      const u = Math.min(
        1,
        Math.max(0, (ms - t.starts) / (t.lands - t.starts)),
      );
      middle.x = lerp([t.from.x, t.to.x], u);
      // up to the peak and down again, landing on its bar
      const rise = t.from.y - t.peak;
      const fall = t.to.y - t.peak;
      const split = Math.sqrt(rise) / (Math.sqrt(rise) + Math.sqrt(fall));
      middle.y =
        u < split
          ? t.peak + rise * ((split - u) / split) ** 2
          : t.peak + fall * ((u - split) / (1 - split)) ** 2;
      return (k + u) * SPIN * Math.PI * 2;
    };
    const ends = [0, Math.PI].map((offset) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms > endAt) return null;
        const turn = stateAt(ms) + offset;
        at.x = middle.x + Math.cos(turn) * HALF;
        at.y = middle.y + Math.sin(turn) * HALF;
        return at;
      };
    });

    const tossing = createBeats(
      throws,
      (t) => t.starts,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      throws,
      (t) => t.lands,
      (t, k) => {
        cover!.tierUp(t.bar, t.to);
        if (k === throws.length - 1) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(t.to);
          return;
        }
        cover!.burst(t.to, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, throws.length - 1)));
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
          tossing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          for (const end of ends)
            drawWispBetween(ctx, end, ms, now, WISP_SIZE * END, 0.8, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
