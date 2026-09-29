import type { BigNumber } from "../../shared/bigNumber";
import { createTotalIncomeReadout } from "../../shared/totalIncomeReadout";

// total-income readout at the top of the map — same shared drawing logic
// hud/index.ts's drawHud uses (see shared/totalIncomeReadout), just at this
// canvas's own much smaller CSS-pixel font size.

const INCOME_FONT_SIZE = 32;
const INCOME_TOP = 20;
const UNIT_NAME_GAP_PX = 8;

export interface IncomeReadout {
  // draws the (possibly two-line, if a unit name applies) readout centered at
  // cssW/2, and returns the Y just below it so the caller can position
  // whatever comes next (the city's own street-name text)
  draw(
    ctx: CanvasRenderingContext2D,
    cssW: number,
    totalIncome: BigNumber,
  ): number;
}

export function createIncomeReadout(): IncomeReadout {
  const readout = createTotalIncomeReadout();

  function draw(
    ctx: CanvasRenderingContext2D,
    cssW: number,
    totalIncome: BigNumber,
  ): number {
    return readout.draw(ctx, cssW / 2, INCOME_TOP, totalIncome, {
      fontSize: INCOME_FONT_SIZE,
      unitNameGapPx: UNIT_NAME_GAP_PX,
    });
  }

  return { draw };
}
