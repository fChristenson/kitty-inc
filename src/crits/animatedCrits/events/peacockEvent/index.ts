// the "Peacock" event (beam; free upgrade levels and a crit tier): it covers
// its crit, whose click freezes the screen while a fan of blazing beams
// unfurls out of the clicked floor's button like a peacock spreading its
// tail, rib after rib snapping open across the screen, ever faster; every
// bar a rib sweeps across jolts with a flare, a bang and free levels; the
// fan holds, shimmering, then snaps shut onto the clicked floor's bar,
// every beam on it at once, and the bar jumps a crit tier in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";
import type { Point } from "../../../../shared/wisp";

const KEY = "peacock";
const MAX_BARS = 5;
const RIBS = 9;
// the fan spreads from FOLD (folded up on one side) out to SPREAD either
// side of straight up
const SPREAD = 1.35;
const BEAM = 12;
const CORE = 30;
const SHUT_FLARE = 60;
const FLASH_MS = 220;
// each bar earns levels on at most CUTS ribs
const CUTS = 2;
const CUT_SHAKE: [number, number] = [0.4, 1.1];

export const forcePeacockEvent = registerWispEvent(
  KEY,
  "Peacock",
  () => CONFIG.peacockEvent.chance,
  (floor, context, area) => {
    const { opensMs, snapMs, shimmerMs, shutMs, levelShare, holdMs, mergeMs } =
      CONFIG.peacockEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    if (!own) return;
    const bars = [
      ...found.filter((b) => b !== own).slice(0, MAX_BARS - 1),
      own,
    ];
    const pivot = getButtonCenter(context.isGroundFloor);
    const reach = Math.max(
      ...[
        [area.left, area.top],
        [area.right, area.top],
        [area.left, area.bottom],
        [area.right, area.bottom],
      ].map(([x, y]) => Math.hypot(x - pivot.x, y - pivot.y)),
    );
    // angles measured from straight up, positive clockwise
    const side = Math.random() < 0.5 ? -1 : 1;
    const fold = -side * SPREAD;
    let clock = 0;
    const ribs = Array.from({ length: RIBS }, (_, k) => {
      const opens = clock;
      clock += lerp(opensMs, k / (RIBS - 1));
      return {
        opens,
        open: fold + side * ((2 * SPREAD * k) / (RIBS - 1)),
      };
    });
    const shimmerAt = ribs[RIBS - 1].opens + snapMs;
    const shutAt = shimmerAt + shimmerMs;
    const endAt = shutAt + shutMs;
    const angleTo = (p: Point) => Math.atan2(p.x - pivot.x, -(p.y - pivot.y));
    const shut = angleTo(own.center);
    const ribAngle = (r: (typeof ribs)[number], ms: number) => {
      const opened = lerp(
        [fold, r.open],
        easeOutBack(clamp01((ms - r.opens) / snapMs)),
      );
      return ms < shutAt
        ? opened
        : lerp([opened, shut], easeIn(clamp01((ms - shutAt) / shutMs)));
    };
    // every time a rib sweeps across a bar's middle as it opens
    const cuts: { bar: RewardBar; at: number }[] = [];
    for (const bar of bars) {
      const a = angleTo(bar.center);
      let count = 0;
      for (const r of ribs) {
        if (count >= CUTS) break;
        let before = ribAngle(r, r.opens) - a;
        for (let ms = r.opens + 6; ms <= r.opens + snapMs; ms += 6) {
          const now = ribAngle(r, ms) - a;
          if (before * now < 0) {
            cuts.push({ bar, at: ms });
            count++;
            break;
          }
          before = now;
        }
      }
    }
    cuts.sort((p, q) => p.at - q.at);
    const tip: Point = { x: 0, y: 0 };

    const opening = createBeats(
      ribs,
      (r) => r.opens,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const cutting = createBeats(
      cuts,
      (c) => c.at,
      (c, k) => {
        const t = k / Math.max(1, cuts.length - 1);
        cover!.levels(c.bar, levelsFor(c.bar.floor, levelShare, 1), pivot);
        cover!.burst(c.bar.center, 0.35 + 0.35 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CUT_SHAKE, t));
      },
    );
    const shutting = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.levels(own, levelsFor(own.floor, levelShare, 3), pivot);
        cover!.tierUp(own, pivot);
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(own.center);
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
          opening.tick(ms, now);
          cutting.tick(ms, now);
          shutting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FLASH_MS) return;
          const fade = ms > endAt ? 1 - (ms - endAt) / FLASH_MS : 1;
          const shimmer =
            ms >= shimmerAt && ms < shutAt ? 0.75 + 0.25 * Math.random() : 1;
          for (const r of ribs) {
            if (ms < r.opens) continue;
            const a = ribAngle(r, ms);
            tip.x = pivot.x + Math.sin(a) * reach;
            tip.y = pivot.y - Math.cos(a) * reach;
            drawBeam(ctx, pivot, tip, BEAM, shimmer * fade);
          }
          drawBeamFlare(ctx, pivot, CORE, fade, now);
          if (ms >= shutAt)
            drawBeamFlare(
              ctx,
              own.center,
              SHUT_FLARE * clamp01((ms - shutAt) / shutMs),
              fade,
              now,
            );
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
