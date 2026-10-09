import { COLOR } from "../../palette";
import { formatTotalIncomeParts, getAnimatedTotalIncome } from "../../utils";
import type { BigNumber } from "../bigNumber";
import {
  getHudTotalAbsorbScale,
  getHudTotalFlashStrength,
  getHudTotalWhiteMix,
} from "../totalIncomeCoins";
import { getWiggleRotation } from "../wiggle";
import {
  drawSlamTarget,
  drawSlamText,
  getSlamPose,
  GLOBAL_SLAM,
} from "../eventEndSlam";
import { drawTargetStream, getTargetTension } from "../eventFx";

// shared "amount + spelled-out unit name below it" total-income drawing, used by
// both hud/index.ts's top-of-screen HUD and background/cityMap's map readout —
// extracted because those two used to be near-identical copies that had drifted
// out of sync (the map readout's stroke widths weren't proportional to the HUD's).
//
// Stroke thickness is derived from font size via these two ratios (reverse-engineered
// from the HUD's own hand-tuned values: 22px stroke at a 144px amount font, 10px
// stroke at a 115.2px unit-name font) so every readout reads with the same relative
// stroke weight regardless of what canvas/scale it's drawn at, instead of each call
// site hand-picking its own unrelated stroke number.
const AMOUNT_STROKE_TO_FONT_RATIO = 22 / 144;
const UNIT_FONT_SCALE = 0.8; // unit name is drawn 20% smaller than the amount, everywhere
const UNIT_STROKE_TO_FONT_RATIO = 10 / (144 * UNIT_FONT_SCALE);

export interface TotalIncomeReadoutOptions {
  fontSize: number;
  unitNameGapPx: number;
}

export interface TotalIncomeReadout {
  // draws the (possibly two-line, if a unit name applies) readout centered at
  // centerX, and returns the Y just below it so the caller can position
  // whatever comes next
  draw(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    top: number,
    totalIncome: BigNumber,
    options: TotalIncomeReadoutOptions,
  ): number;
}

export function createTotalIncomeReadout(): TotalIncomeReadout {
  // only remeasured when the amount's own character count changes, not every
  // frame — centering on the live (constantly mid-count-up) width every frame is
  // what made the number visibly jitter left/right
  let cachedAmountWidth = 0;
  let cachedAmountLength = -1;
  // the displayed value is usually unchanged between frames, so its formatting
  // (toLocaleString) and text metrics are reused until it actually moves
  let formattedMantissa = NaN;
  let formattedExponent = NaN;
  let formatted: ReturnType<typeof formatTotalIncomeParts> = {
    amount: "",
    unitName: null,
  };
  let measuredFont = "";
  let amountHeight = 0;
  let unitHeight = 0;

  function draw(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    top: number,
    totalIncome: BigNumber,
    { fontSize, unitNameGapPx }: TotalIncomeReadoutOptions,
  ): number {
    const displayed = getAnimatedTotalIncome(totalIncome);
    const valueChanged =
      formattedMantissa !== displayed.mantissa ||
      formattedExponent !== displayed.exponent;
    if (valueChanged) {
      formatted = formatTotalIncomeParts(displayed);
      formattedMantissa = displayed.mantissa;
      formattedExponent = displayed.exponent;
    }
    // "special crit crit" bonus-tier coins merging into the total (see
    // shared/totalIncomeCoins) flash this whole readout white and wiggle it briefly —
    // strength fades 1 -> 0, so both the color blend and the wiggle's own
    // amplitude fade back to normal together instead of snapping off
    const now = Date.now();
    const flashStrength = getHudTotalFlashStrength(now);
    // a freeze event streaming into the total drives its build-up instead
    const tension = getTargetTension(GLOBAL_SLAM, "total");
    const slam = getSlamPose(GLOBAL_SLAM, "total", now);
    const { amount, unitName } = formatted;
    const font = `900 ${fontSize}px "Fredoka", system-ui, sans-serif`;
    const remeasure = valueChanged || font !== measuredFont;
    measuredFont = font;
    const strokeWidth = fontSize * AMOUNT_STROKE_TO_FONT_RATIO;

    const whiteMix = Math.max(getHudTotalWhiteMix(now), tension?.white ?? 0);
    const wiggleRotation = tension
      ? tension.rotation
      : flashStrength > 0
        ? getWiggleRotation(now) * flashStrength
        : 0;
    // a stream's fx swells and shakes the readout itself (see drawTargetStream)
    const absorbScale = tension ? 1 : getHudTotalAbsorbScale(now);
    // swelling, wiggling or whitening: stamped from sprites (see drawSlamText)
    const moving =
      tension !== null ||
      wiggleRotation !== 0 ||
      absorbScale !== 1 ||
      whiteMix > 0;
    const pivotY = top + amountHeight / 2;
    let bottom = top;

    const drawBlock = (): void => {
      const blockHeight =
        amountHeight + (unitName ? unitNameGapPx + unitHeight : 0);
      const box = {
        x: centerX - cachedAmountWidth / 2,
        y: top,
        width: cachedAmountWidth,
        height: blockHeight,
      };
      drawSlamTarget(ctx, slam, box, "text", drawText, now);
    };

    const drawText = (): void => {
      ctx.save();
      if (wiggleRotation !== 0 || absorbScale !== 1) {
        // pivot on the amount's own middle so it swells in place
        ctx.translate(centerX, pivotY);
        ctx.rotate(wiggleRotation);
        ctx.scale(absorbScale, absorbScale);
        ctx.translate(-centerX, -pivotY);
      }

      ctx.font = font;
      if (amount.length !== cachedAmountLength) {
        cachedAmountWidth = ctx.measureText(amount).width;
        cachedAmountLength = amount.length;
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      drawSlamText(
        ctx,
        slam,
        amount,
        centerX,
        top,
        amountHeight,
        COLOR.moneyGreen,
        COLOR.white,
        strokeWidth,
        true,
        whiteMix,
        moving,
      );

      if (remeasure) {
        const amountMetrics = ctx.measureText(amount);
        amountHeight =
          amountMetrics.actualBoundingBoxAscent +
          amountMetrics.actualBoundingBoxDescent;
      }
      bottom = top + amountHeight + strokeWidth / 2;

      if (unitName) {
        const unitFontSize = fontSize * UNIT_FONT_SCALE;
        const unitStrokeWidth = unitFontSize * UNIT_STROKE_TO_FONT_RATIO;
        ctx.font = `900 ${unitFontSize}px "Fredoka", system-ui, sans-serif`;
        ctx.textAlign = "center";
        const unitTop = bottom + unitNameGapPx;
        drawSlamText(
          ctx,
          slam,
          unitName,
          centerX,
          unitTop,
          unitHeight,
          COLOR.moneyGreen,
          COLOR.white,
          unitStrokeWidth,
          false,
          whiteMix,
          moving,
        );
        if (remeasure) {
          const unitMetrics = ctx.measureText(unitName);
          unitHeight =
            unitMetrics.actualBoundingBoxAscent +
            unitMetrics.actualBoundingBoxDescent;
        }
        bottom = unitTop + unitHeight + unitStrokeWidth / 2;
      }
      ctx.restore();
    };

    // a coin stream powers the readout up exactly as it does every other target
    if (
      !drawTargetStream(ctx, GLOBAL_SLAM, "total", centerX, pivotY, drawBlock)
    )
      drawBlock();
    return bottom;
  }

  return { draw };
}
