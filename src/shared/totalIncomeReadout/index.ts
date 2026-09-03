import { COLOR } from "../../palette";
import {
  drawCartoonText,
  formatTotalIncomeParts,
  getAnimatedTotalIncome,
} from "../../utils";
import type { BigNumber } from "../bigNumber";

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

  function draw(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    top: number,
    totalIncome: BigNumber,
    { fontSize, unitNameGapPx }: TotalIncomeReadoutOptions,
  ): number {
    const { amount, unitName } = formatTotalIncomeParts(
      getAnimatedTotalIncome(totalIncome),
    );
    const strokeWidth = fontSize * AMOUNT_STROKE_TO_FONT_RATIO;

    ctx.font = `900 ${fontSize}px "Fredoka", system-ui, sans-serif`;
    if (amount.length !== cachedAmountLength) {
      cachedAmountWidth = ctx.measureText(amount).width;
      cachedAmountLength = amount.length;
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    drawCartoonText(
      ctx,
      amount,
      centerX - cachedAmountWidth / 2,
      top,
      COLOR.moneyGreen,
      COLOR.white,
      strokeWidth,
    );

    const amountMetrics = ctx.measureText(amount);
    let bottom =
      top +
      amountMetrics.actualBoundingBoxAscent +
      amountMetrics.actualBoundingBoxDescent +
      strokeWidth / 2;

    if (unitName) {
      const unitFontSize = fontSize * UNIT_FONT_SCALE;
      const unitStrokeWidth = unitFontSize * UNIT_STROKE_TO_FONT_RATIO;
      ctx.font = `900 ${unitFontSize}px "Fredoka", system-ui, sans-serif`;
      ctx.textAlign = "center";
      const unitTop = bottom + unitNameGapPx;
      drawCartoonText(
        ctx,
        unitName,
        centerX,
        unitTop,
        COLOR.moneyGreen,
        COLOR.white,
        unitStrokeWidth,
      );
      const unitMetrics = ctx.measureText(unitName);
      bottom =
        unitTop +
        unitMetrics.actualBoundingBoxAscent +
        unitMetrics.actualBoundingBoxDescent +
        unitStrokeWidth / 2;
    }

    return bottom;
  }

  return { draw };
}
