import { COLOR } from "../../palette";
import {
  drawCartoonText,
  formatTotalIncomeParts,
  getAnimatedTotalIncome,
} from "../../utils";

// total-income readout at the top of the map — same green-fill/white-stroke
// money text look used everywhere else, sized for this canvas's own CSS pixel
// space (unlike hud/index.ts's drawHud, calibrated for the much larger world
// canvas). The unit (e.g. "Undecillion") is spelled out in full on its own
// line below the number instead of an abbreviation glued onto it. Split out
// of cityMap/index.ts's redraw() only because of its own width-caching state
// (see cachedIncomeAmountWidth/Length below)

const INCOME_FONT_SIZE = 32;
const INCOME_TOP = 20;
const INCOME_STROKE_WIDTH = 6;
const UNIT_NAME_GAP_PX = 8;
const UNIT_NAME_STROKE_WIDTH = 4;

export interface IncomeReadout {
  // draws the (possibly two-line, if a unit name applies) readout centered at
  // cssW/2, and returns the Y just below it so the caller can position
  // whatever comes next (the city's own street-name text)
  draw(
    ctx: CanvasRenderingContext2D,
    cssW: number,
    totalIncome: number,
  ): number;
}

export function createIncomeReadout(): IncomeReadout {
  // same jitter-free centering trick drawHud (hud/index.ts) uses: only
  // remeasured when the amount's own character count changes, not every
  // frame, since centering on the live (constantly mid-count-up) width every
  // frame is what made the number visibly jitter left/right
  let cachedIncomeAmountWidth = 0;
  let cachedIncomeAmountLength = -1;

  function draw(
    ctx: CanvasRenderingContext2D,
    cssW: number,
    totalIncome: number,
  ): number {
    const { amount: incomeAmountText, unitName: incomeUnitName } =
      formatTotalIncomeParts(getAnimatedTotalIncome(totalIncome));
    ctx.font = `900 ${INCOME_FONT_SIZE}px "Fredoka", system-ui, sans-serif`;
    // left-aligned at a position derived from the cached (not live) width
    // below — still visually centered, but the anchor itself only moves when
    // the number's length does, instead of re-centering (and jittering) on
    // every frame's width
    if (incomeAmountText.length !== cachedIncomeAmountLength) {
      cachedIncomeAmountWidth = ctx.measureText(incomeAmountText).width;
      cachedIncomeAmountLength = incomeAmountText.length;
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    drawCartoonText(
      ctx,
      incomeAmountText,
      cssW / 2 - cachedIncomeAmountWidth / 2,
      INCOME_TOP,
      COLOR.moneyGreen,
      COLOR.white,
      INCOME_STROKE_WIDTH,
    );
    // measured (not a guessed constant) so the gap stays accurate even if the
    // income font/text ever changes
    const incomeMetrics = ctx.measureText(incomeAmountText);
    let incomeBottom =
      INCOME_TOP +
      incomeMetrics.actualBoundingBoxAscent +
      incomeMetrics.actualBoundingBoxDescent +
      INCOME_STROKE_WIDTH / 2;

    if (incomeUnitName) {
      const unitNameFontSize = INCOME_FONT_SIZE * 0.8; // 20% smaller than the amount
      ctx.font = `900 ${unitNameFontSize}px "Fredoka", system-ui, sans-serif`;
      ctx.textAlign = "center"; // unlike the amount above, this one's width isn't cached/jittery
      const unitNameTop = incomeBottom + UNIT_NAME_GAP_PX;
      drawCartoonText(
        ctx,
        incomeUnitName,
        cssW / 2,
        unitNameTop,
        COLOR.moneyGreen,
        COLOR.white,
        UNIT_NAME_STROKE_WIDTH,
      );
      const unitNameMetrics = ctx.measureText(incomeUnitName);
      incomeBottom =
        unitNameTop +
        unitNameMetrics.actualBoundingBoxAscent +
        unitNameMetrics.actualBoundingBoxDescent +
        UNIT_NAME_STROKE_WIDTH / 2;
    }
    return incomeBottom;
  }

  return { draw };
}
