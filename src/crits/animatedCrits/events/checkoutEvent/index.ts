// the "Checkout" event (beam; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a wisp drops in over the top
// income bar and fans a blazing red scan beam down onto it, sweeping it end
// to end like a barcode reader; at the end of each sweep it beeps, the bar
// jolts with free levels and cash pops out of it, then the wisp hops down to
// the next bar and scans it, faster and faster; the clicked floor's bar is
// rung up last: every bar slams in a huge blast and shake. Pays floor
// income × floor number × REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { sprayTargets } from "../../../../shared/coinTargets";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "checkout";
const REWARD = 2;
const MAX_BARS = 5;
// the scanner hovers ABOVE px over its bar's middle
const ABOVE = 170;
const BEAM = 16;
const FLARE = 20;
const POP_COINS = 14;
const BEEP_SHAKE: [number, number] = [0.6, 1.3];

export const forceCheckoutEvent = registerWispEvent(
  KEY,
  "Checkout",
  () => CONFIG.checkoutEvent.chance,
  (floor, context, area) => {
    const { hopMs, scansMs, levelShare, holdMs, mergeMs } =
      CONFIG.checkoutEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    if (!own) return;
    const bars = [
      ...found.filter((b) => b !== own).slice(0, MAX_BARS - 1),
      own,
    ];
    const heads: Point[] = bars.map((bar) => ({
      x: bar.center.x,
      y: Math.max(area.top + 40, bar.box.y - ABOVE),
    }));
    const entry: Point = { x: heads[0].x, y: area.top - 60 };
    // each bar: a hop in, then its sweep, quicker each time
    const scans = bars.map((bar, k) => ({
      bar,
      head: heads[k],
      from: k === 0 ? entry : heads[k - 1],
      scanMs: lerp(scansMs, k / Math.max(1, bars.length - 1)),
      startsAt: 0,
      beepAt: 0,
    }));
    let clock = 0;
    for (const scan of scans) {
      scan.startsAt = clock + hopMs;
      scan.beepAt = scan.startsAt + scan.scanMs;
      clock = scan.beepAt;
    }
    const endAt = clock;
    const now0: Point = { x: 0, y: 0 };
    const scanner = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      const scan = scans.find((s) => ms <= s.beepAt) ?? scans[scans.length - 1];
      const u = easeOut(clamp01((ms - (scan.startsAt - hopMs)) / hopMs));
      now0.x = scan.from.x + (scan.head.x - scan.from.x) * u;
      now0.y = scan.from.y + (scan.head.y - scan.from.y) * u;
      return now0;
    };
    const spot: Point = { x: 0, y: 0 };
    const leftEnd: Point = { x: 0, y: 0 };
    const rightEnd: Point = { x: 0, y: 0 };

    const beeping = createBeats(
      scans,
      (s) => s.beepAt,
      (s, k) => {
        const t = k / Math.max(1, scans.length - 1);
        cover!.levels(s.bar, levelsFor(s.bar.floor, levelShare, 2), s.head);
        if (s.bar === own) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(own.center);
          return;
        }
        cover!.launchFrom(
          s.bar.center,
          sprayTargets(
            s.bar.center,
            POP_COINS,
            [80, 220],
            -Math.PI / 2,
            Math.PI * 0.8,
          ),
        );
        cover!.burst(s.bar.center, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(BEEP_SHAKE, t));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        bars,
        tick: (ms, now) => beeping.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + holdMs) return;
          drawWispBetween(
            ctx,
            scanner,
            ms,
            now,
            WISP_SIZE * 0.8,
            0.6,
            0,
            endAt,
          );
          const scan = scans.find((s) => ms >= s.startsAt && ms < s.beepAt);
          if (!scan) return;
          const { box } = scan.bar;
          // the fan's edges flicker to the bar's ends; its beam sweeps across
          leftEnd.x = box.x;
          rightEnd.x = box.x + box.width;
          leftEnd.y = rightEnd.y = box.y + box.height / 2;
          drawAimLaser(ctx, scan.head, leftEnd);
          drawAimLaser(ctx, scan.head, rightEnd);
          const u = smoothstep(clamp01((ms - scan.startsAt) / scan.scanMs));
          spot.x = box.x + box.width * u;
          spot.y = leftEnd.y;
          drawBeam(ctx, scan.head, spot, BEAM);
          drawBeamFlare(ctx, spot, FLARE, 1, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
