// the "Bungee" event (money; crit tiers and cash): it covers its crit, whose
// click freezes the screen while a thick rope of cash plunges from the top
// of the screen straight down onto an income bar, which jumps a crit tier
// with a splash and a big jolt; the rope recoils back up, then plunges again
// onto the next bar, and the next, each bounce quicker, the last plunge
// slamming its bar in a huge blast and shake as the coins sweep into the
// total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  type Pour,
} from "../cashFlow";
import { findRewardBars, type RewardBar } from "../eventRewards";

const KEY = "bungee";
const REWARD = 2;
const MAX_BARS = 3;
const TOP = 150;
// each recoil springs back up RECOIL of the way to the top
const RECOIL = 0.55;
const HEAD = 0.5;
const HIT_SHAKE: [number, number] = [0.8, 1.4];

export const forceBungeeEvent = registerWispEvent(
  KEY,
  "Bungee",
  () => CONFIG.bungeeEvent.chance,
  (floor, context, area) => {
    const { plungesMs, recoilMs, holdMs, mergeMs } = CONFIG.bungeeEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const x = bars[0].center.x;
    const top = area.top + TOP;
    // down to a bar, back up, down to the next...
    const legs: {
      from: Point;
      to: Point;
      starts: number;
      travel: number;
      bar: RewardBar | null;
    }[] = [];
    let clock = 0;
    let y = top;
    bars.forEach((bar, k) => {
      const plunge = lerp(plungesMs, k / Math.max(1, bars.length - 1));
      legs.push({
        from: { x, y },
        to: { x, y: bar.center.y },
        starts: clock,
        travel: plunge,
        bar,
      });
      clock += plunge;
      if (k === bars.length - 1) return;
      const peak = lerp([bar.center.y, top], RECOIL);
      legs.push({
        from: { x, y: bar.center.y },
        to: { x, y: peak },
        starts: clock,
        travel: recoilMs,
        bar: null,
      });
      clock += recoilMs;
      y = peak;
    });
    const pours = legs.map((leg) => {
      const line = sampleLine(
        (u) => ({ x, y: lerp([leg.from.y, leg.to.y], u) }),
        24,
      );
      const pour: Pour = {
        coinsAlong: 800,
        width: 38,
        streamMs: leg.travel * 0.7,
        travelMs: leg.travel,
      };
      return {
        ...leg,
        line,
        pour,
        head: riverHead(line, leg.travel, leg.starts),
      };
    });
    const hits = pours.filter((p) => p.bar !== null);
    const last = hits[hits.length - 1];
    const endAt = last.starts + last.travel;
    const durationMs = Math.max(
      pourDurationMs(last.starts, last.pour),
      endAt + holdMs + mergeMs,
    );

    const pouring = createBeats(
      pours,
      (p) => p.starts,
      (p, k) => {
        pourLine(cover!, p.line, p.pour);
        if (k > 0 && cover!.isLive()) playSwoosh();
      },
    );
    const hitting = createBeats(
      hits,
      (h) => h.starts + h.travel,
      (h, k) => {
        cover!.tierUp(h.bar!, h.from);
        if (h === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(h.to);
          return;
        }
        cover!.burst(h.to, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hits.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const p of pours)
            drawWispBetween(
              ctx,
              p.head,
              ms,
              now,
              WISP_SIZE * HEAD,
              0.8,
              p.starts,
              p.starts + p.travel,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
