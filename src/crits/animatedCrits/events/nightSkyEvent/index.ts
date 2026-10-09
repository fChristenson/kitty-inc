// the "Night Sky" event: it covers its crit, whose click freezes the screen
// while the wisp (shared/wisp) glides out of the button and traces the crit's
// own 5, 25 or 125 across the screen in one smooth flight (../numberFlight),
// leaving twinkling stars along every outline. The finished number twinkles,
// then its stars stream into the total, which pays like Draw: times that
// number (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import {
  playSold,
  playSwoosh,
  startBoostEventStreamLoop,
} from "../../../../sound";
import {
  CRIT_TIER_CONFIG,
  pickCritTierByOdds,
  type CritTier,
} from "../../../critTypes";
import type { Point } from "../../../../shared/numberGlyph";
import { pulseHudTotalFlash } from "../../../../shared/totalIncomeCoins";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import {
  numberOutline,
  PATH_STEP,
  planNumberFlight,
  pullIntoTotal,
} from "../../numberFlight";

const KEY = "nightSky";
// share of the screen the number may span
const WIDTH_SHARE = 0.9;
const HEIGHT_SHARE = 0.55;
// floor-local px between stars along the outlines
const STAR_SPACING = 30;
// a star's size, and its pop as the wisp lays it
const STAR_SIZE = 16;
const STAR_POP_MS = 250;
const STAR_POP = 0.8;
// a flying star bows out up to this share of its flight to one side
const STAR_BEND = 0.3;

interface Star extends Point {
  revealAt: number;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.nightSkyEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const { flightMs, hopMs, showMs, mergeSpreadMs, mergeFlyMs } =
        CONFIG.nightSkyEvent;
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const tier = context.critTier ?? pickCritTierByOdds();
      const { multiplier } = CRIT_TIER_CONFIG[tier];
      const { strokes } = numberOutline(
        String(multiplier),
        area,
        0,
        WIDTH_SHARE,
        HEIGHT_SHARE,
      );
      const flight = planNumberFlight(
        strokes,
        getButtonCenter(context.isGroundFloor),
        area,
        flightMs + hopMs * Math.max(0, strokes.length - 1),
      );
      // a star every few path points, counted on across the strokes
      const every = Math.max(1, Math.round(STAR_SPACING / PATH_STEP));
      const stars: Star[] = flight.strokes
        .flatMap((s) =>
          s.points.map((p, i) => ({ ...p, revealAt: s.times[i] })),
        )
        .filter((_, i) => i % every === 0);
      const mergeAt = flight.traceEnd + showMs;
      // first laid, first to fly
      const flyAt = (i: number) =>
        mergeAt + (mergeSpreadMs * i) / Math.max(1, stars.length - 1);
      const startedAt = performance.now();
      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: mergeAt + mergeSpreadMs + mergeFlyMs },
        {
          tier,
          rewardMultiplier: multiplier,
          drawExtra: (ctx, getFloorRect, totalTarget) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            const previous = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = "lighter";
            stars.forEach((star, i) => {
              if (ms < star.revealAt) return;
              const p = (ms - flyAt(i)) / mergeFlyMs;
              if (p >= 1) return;
              const from = { x: rect.left + star.x, y: rect.top + star.y };
              let at = from;
              let size = STAR_SIZE;
              if (p > 0) {
                // shrinking as it sinks in
                at = pullIntoTotal(from, totalTarget, p, i, STAR_BEND);
                size *= 1 - 0.6 * p * p;
              }
              const pop =
                1 +
                STAR_POP * Math.max(0, 1 - (ms - star.revealAt) / STAR_POP_MS);
              const twinkle = 0.75 + 0.25 * Math.sin(now / 200 + i * 1.7);
              stampGlimmer(
                ctx,
                at.x,
                at.y,
                size * pop * twinkle,
                now / 900 + i,
                COLOR.heavenlyGold,
              );
            });
            ctx.globalCompositeOperation = previous;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            drawWisp(ctx, flight.wispAt, ms, now, WISP_SIZE);
            ctx.restore();
          },
        },
      );
      if (!cover) return;
      playSwoosh();
      const stopSound = startBoostEventStreamLoop();
      setTimeout(stopSound, flight.traceEnd);
      stars.forEach((_, i) =>
        setTimeout(
          () => {
            if (!cover.isLive()) return;
            if (i === 0) playSold();
            pulseHudTotalFlash();
          },
          flyAt(i) + mergeFlyMs,
        ),
      );
    },
  },
  { label: "Night Sky", color: COLOR.revealBlue },
);

// dev test hook: arms a crit on floor carrying Night Sky, tracing tier's
// number (by the crit odds if unset)
export function forceNightSkyEvent(floor: Floor, tier?: CritTier): void {
  forceTestCrit(floor, null, tier ?? pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}
