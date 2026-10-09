// the "Pitcher" event: it covers its crit, whose click freezes the screen
// while the wisp (shared/wisp) glides out of the button and draws the crit's
// own 5, 25 or 125 across the screen in solid glowing lines, each digit left
// open at the top (../numberFlight). As each digit closes, money pours down
// from the top of the screen through its opening and fills it from the bottom
// up; the full number then merges into the total, its lines breaking up into
// sparkles that fly in with the money, which pays like Draw: times that number
// (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import {
  playBoostEventStream,
  playSwoosh,
  startBoostEventStreamLoop,
} from "../../../../sound";
import {
  CRIT_TIER_CONFIG,
  pickCritTierByOdds,
  type CritTier,
} from "../../../critTypes";
import type { Point } from "../../../../shared/numberGlyph";
import { drawGlimmer } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import type { CoinPath } from "../../../../floors/coins";
import { numberSpots } from "../drawEvent";
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
  planNumberFlight,
  pullIntoTotal,
} from "../../numberFlight";

const KEY = "pitcher";
// the drawn lines' width (floor-local px), and their glow's, of that
const LINE_WIDTH = 9;
const GLOW_WIDTH = 3;
// a poured coin's share of its trip spent falling to the digit's opening,
// before it settles into its spot
const FALL_SHARE = 0.55;
// how far above the screen's top the coins start, at most
const POUR_HEIGHT = 140;
// coins fall in across this share of their digit's width
const MOUTH_SPREAD = 0.14;
// the lines break up into a sparkle every this many path points, this big,
// each bowing out up to this share of its flight into the total
const BIT_EVERY = 2;
const BIT_SIZE = 9;
const BIT_BEND = 0.3;

// a coin's trip: falling ever faster from above the screen into the digit's
// opening, then on down into its spot, slowing as it lands
function pourPath(
  spot: Point,
  mouth: Point,
  spread: number,
  top: number,
): CoinPath {
  const x = mouth.x + (Math.random() - 0.5) * spread;
  const start = {
    x: x + (Math.random() - 0.5) * spread * 0.5,
    y: top - 30 - Math.random() * POUR_HEIGHT,
  };
  const entry = { x, y: mouth.y };
  const control = { x, y: entry.y + Math.max(40, (spot.y - entry.y) * 0.5) };
  return (f) => {
    if (f < FALL_SHARE) {
      const t = f / FALL_SHARE;
      return {
        x: start.x + (entry.x - start.x) * t,
        y: start.y + (entry.y - start.y) * t * t,
      };
    }
    const t = (f - FALL_SHARE) / (1 - FALL_SHARE);
    const e = 1 - (1 - t) * (1 - t);
    const u = 1 - e;
    return {
      x: u * u * entry.x + 2 * u * e * control.x + e * e * spot.x,
      y: u * u * entry.y + 2 * u * e * control.y + e * e * spot.y,
    };
  };
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.pitcherEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const {
        flightMs,
        hopMs,
        gapShare,
        pourDelayMs,
        pourMs,
        travelMs,
        hangMs,
        mergeMs,
        breakSpreadMs,
        breakFlyMs,
      } = CONFIG.pitcherEvent;
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const tier = context.critTier ?? pickCritTierByOdds();
      const { multiplier } = CRIT_TIER_CONFIG[tier];
      const text = String(multiplier);
      const outline = numberOutline(text, area, gapShare);
      const flight = planNumberFlight(
        outline.strokes,
        getButtonCenter(context.isGroundFloor),
        area,
        flightMs + hopMs * Math.max(0, outline.strokes.length - 1),
      );
      // each digit's spots, bottom up, poured once its last line is drawn
      const spots = numberSpots(text, area);
      const pours = outline.digits.map((digit, d) => {
        const center = (digit.left + digit.right) / 2;
        const own = spots
          .filter((spot) => {
            const nearest = outline.digits.reduce((best, other) =>
              Math.abs(spot.x - (other.left + other.right) / 2) <
              Math.abs(spot.x - (best.left + best.right) / 2)
                ? other
                : best,
            );
            return nearest === outline.digits[d];
          })
          .sort((a, b) => b.y - a.y);
        const doneAt = Math.max(
          0,
          ...flight.strokes
            .filter((s) => s.digit === d)
            .flatMap((s) => s.times),
        );
        return {
          spots: own,
          mouth: digit.mouth ?? {
            x: center,
            y: Math.min(...own.map((s) => s.y)),
          },
          spread: (digit.right - digit.left) * MOUTH_SPREAD,
          at: doneAt + pourDelayMs,
        };
      });
      const durationMs =
        Math.max(...pours.map((p) => p.at)) +
        pourMs +
        travelMs +
        hangMs +
        mergeMs;
      const mergeAt = durationMs - mergeMs;
      // at the merge the lines break up into these sparkles, which fly off in
      // a random order
      const bits = flight.strokes.flatMap((s) =>
        s.points
          .filter((_, i) => i % BIT_EVERY === 0)
          .map((p) => ({ ...p, delay: Math.random() * breakSpreadMs })),
      );
      const startedAt = performance.now();
      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs, mergeMs },
        {
          tier,
          rewardMultiplier: multiplier,
          settleFaceOn: true,
          drawExtra: (ctx, getFloorRect, totalTarget) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            if (ms >= mergeAt) {
              bits.forEach((bit, i) => {
                const p = (ms - mergeAt - bit.delay) / breakFlyMs;
                if (p >= 1) return;
                const from = { x: rect.left + bit.x, y: rect.top + bit.y };
                const at =
                  p > 0
                    ? pullIntoTotal(from, totalTarget, p, i, BIT_BEND)
                    : from;
                drawGlimmer(
                  ctx,
                  at.x,
                  at.y,
                  BIT_SIZE * (1 - 0.6 * Math.max(0, p) ** 2),
                  now / 600 + i,
                  COLOR.heavenlyGold,
                );
              });
            }
            ctx.save();
            ctx.translate(rect.left, rect.top);
            if (ms < mergeAt) {
              // every line drawn so far, as one path
              const lines = new Path2D();
              for (const stroke of flight.strokes) {
                let drawn = 0;
                while (drawn < stroke.times.length && stroke.times[drawn] <= ms)
                  drawn++;
                if (drawn < 2) continue;
                lines.moveTo(stroke.points[0].x, stroke.points[0].y);
                for (let i = 1; i < drawn; i++)
                  lines.lineTo(stroke.points[i].x, stroke.points[i].y);
              }
              ctx.lineCap = "round";
              ctx.lineJoin = "round";
              ctx.globalAlpha = 0.3;
              ctx.strokeStyle = COLOR.wispSand;
              ctx.lineWidth = LINE_WIDTH * GLOW_WIDTH;
              ctx.stroke(lines);
              ctx.globalAlpha = 1;
              ctx.strokeStyle = COLOR.heavenlyGold;
              ctx.lineWidth = LINE_WIDTH;
              ctx.stroke(lines);
              ctx.strokeStyle = COLOR.wispGlitter;
              ctx.lineWidth = LINE_WIDTH * 0.35;
              ctx.stroke(lines);
            }
            drawWisp(ctx, flight.wispAt, ms, now, WISP_SIZE);
            ctx.restore();
          },
        },
      );
      if (!cover) return;
      playSwoosh();
      const stopSound = startBoostEventStreamLoop();
      setTimeout(stopSound, flight.traceEnd);
      for (const pour of pours)
        setTimeout(() => {
          if (!cover.isLive()) return;
          playBoostEventStream();
          cover.flow(
            pour.spots.map((spot) =>
              pourPath(spot, pour.mouth, pour.spread, area.top),
            ),
            pourMs,
            travelMs,
            true,
            pour.spots.map((spot) => spot.maxSize),
          );
        }, pour.at);
    },
  },
  { label: "Pitcher", color: COLOR.coinGold },
);

// dev test hook: arms a crit on floor carrying Pitcher, drawing tier's number
// (by the crit odds if unset)
export function forcePitcherEvent(floor: Floor, tier?: CritTier): void {
  forceTestCrit(floor, null, tier ?? pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}
