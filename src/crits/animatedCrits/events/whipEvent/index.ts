// the "Whip" event (mix; free upgrade levels, a crit tier and cash): it
// covers its crit, whose click freezes the screen while a whip of flowing
// cash lashes out of the clicked floor's button, a blazing wisp at its tip;
// it rears back and cracks down on income bar after income bar, ever
// faster, every crack a flash, a bang and a jolt that lands free levels;
// the last cracks the clicked floor's bar so hard it jumps a crit tier and
// every bar slams in a huge blast and shake, and the whip's cash flies off
// into the total. Pays floor income × floor number × REWARD, plus the
// levels and tier
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "whip";
const REWARD = 2;
const MAX_BARS = 4;
const MIN_CRACKS = 4;
const COINS = 320;
const COIN = 0.7;
// the whip's body lags its tip by LAG_MS, bowing it like a real lash
const LAG_MS = 90;
// it rears back REAR px over its target's far side before each crack
const REAR = 230;
const CRACK_SHAKE: [number, number] = [1, 1.8];
const CRACK_BURST: [number, number] = [0.6, 0.9];

export const forceWhipEvent = registerWispEvent(
  KEY,
  "Whip",
  () => CONFIG.whipEvent.chance,
  (floor, context, area) => {
    const {
      unfurlMs,
      cracksMs,
      levelShare,
      sweepMs,
      flightMs,
      holdMs,
      mergeMs,
    } = CONFIG.whipEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const own = bars.find((b) => b.floor === floor) ?? bars[bars.length - 1];
    const others = bars.filter((b) => b !== own);
    const route: RewardBar[] = [];
    for (let i = 0; route.length < MIN_CRACKS - 1; i++)
      route.push(others.length > 0 ? others[i % others.length] : own);
    route.push(own);
    const fallback = totalSpot(area);
    const handle = getButtonCenter(context.isGroundFloor);
    const clampX = (x: number) =>
      Math.min(area.right - 30, Math.max(area.left + 30, x));
    const strikes = route.map((bar) => ({
      x: bar.box.x + bar.box.width * lerp([0.3, 0.7], Math.random()),
      y: bar.center.y,
    }));
    // rearing back over the handle's far side from the strike, up high
    const rears = strikes.map((s) => ({
      x: clampX(handle.x - (s.x - handle.x) * 0.7),
      y: Math.max(area.top + 40, Math.min(handle.y, s.y) - REAR),
    }));
    const cracks: number[] = [];
    let clock = unfurlMs;
    route.forEach((_, k) => {
      clock += lerp(cracksMs, k / (route.length - 1));
      cracks.push(clock);
    });
    const lastCrack = cracks[cracks.length - 1];
    const sweepAt = lastCrack + 160;
    const endAt = sweepAt + sweepMs + flightMs;

    // where the tip is ms in: out to the first rear, then for each crack
    // easing back to its rear and snapping down onto its strike
    const tipAt = (ms: number, into: Point): Point => {
      if (ms <= unfurlMs) {
        const u = easeOut(clamp01(ms / unfurlMs));
        into.x = handle.x + (rears[0].x - handle.x) * u;
        into.y = handle.y + (rears[0].y - handle.y) * u;
        return into;
      }
      let k = 0;
      while (k < cracks.length - 1 && ms > cracks[k]) k++;
      if (ms >= lastCrack) {
        into.x = strikes[k].x;
        into.y = strikes[k].y;
        return into;
      }
      const from = k === 0 ? rears[0] : strikes[k - 1];
      const start = k === 0 ? unfurlMs : cracks[k - 1];
      const span = cracks[k] - start;
      const snap = Math.min(150, span * 0.5);
      const rearAt = cracks[k] - snap;
      if (ms < rearAt) {
        const u = easeOut(clamp01((ms - start) / (rearAt - start)));
        into.x = from.x + (rears[k].x - from.x) * u;
        into.y = from.y + (rears[k].y - from.y) * u;
        return into;
      }
      const u = easeIn(clamp01((ms - rearAt) / snap));
      into.x = rears[k].x + (strikes[k].x - rears[k].x) * u;
      into.y = rears[k].y + (strikes[k].y - rears[k].y) * u;
      return into;
    };
    // the whip's shape, worked out once per frame
    const tip: Point = { x: 0, y: 0 };
    const bend: Point = { x: 0, y: 0 };
    let shapedAt = NaN;
    const shape = (ms: number) => {
      if (ms === shapedAt) return;
      shapedAt = ms;
      tipAt(ms, tip);
      tipAt(Math.max(0, ms - LAG_MS), bend);
    };

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const u = (i + Math.random()) / COINS;
      const wobble = (Math.random() - 0.5) * 10 * (1 - u * 0.6);
      const leaves = sweepAt + sweepMs * (1 - u) * (0.7 + 0.3 * Math.random());
      const at: Point = { x: 0, y: 0 };
      const from: Point = { x: 0, y: 0 };
      const lift: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < unfurlMs * u) return { x: handle.x, y: handle.y, scale: 0 };
        shape(Math.min(ms, leaves));
        bezier(handle, bend, tip, u, from);
        from.y += wobble;
        if (ms < leaves) return { x: from.x, y: from.y, scale: COIN };
        const total = cover?.total() ?? fallback;
        lift.x = from.x;
        lift.y = total.y;
        bezier(
          from,
          lift,
          total,
          easeIn(clamp01((ms - leaves) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });

    const swooshing = createBeats(
      cracks,
      (ms, k) =>
        ms - Math.min(150, (ms - (k === 0 ? unfurlMs : cracks[k - 1])) * 0.5),
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const cracking = createBeats(
      route,
      (_, k) => cracks[k],
      (bar, k) => {
        if (k === route.length - 1) {
          cover!.levels(bar, levelsFor(bar.floor, levelShare, 1), rears[k]);
          cover!.tierUp(bar, strikes[k]);
          for (const b of bars) cover!.slam(b);
          cover!.blast(strikes[k]);
          return;
        }
        const t = k / Math.max(1, route.length - 2);
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 1), rears[k]);
        cover!.burst(strikes[k], lerp(CRACK_BURST, t));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CRACK_SHAKE, t));
      },
    );
    const tipPoint: Point = { x: 0, y: 0 };
    const tipFor = (ms: number) => tipAt(ms, tipPoint);

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        bars,
        tick: (ms, now) => {
          swooshing.tick(ms, now);
          cracking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            tipFor,
            ms,
            now,
            WISP_SIZE * 0.7,
            clamp01(ms / lastCrack),
            0,
            lastCrack,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
