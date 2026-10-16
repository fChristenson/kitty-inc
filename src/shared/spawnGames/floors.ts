// what every gesture spawn does with the floors, in gameCanvas's screen units:
// where a floor's bar or button is on screen, which floors are in view, and
// paying levels or cash
import { isVisibleOnFloor } from "../../crits";
import {
  getButtonBox,
  getButtonCenter,
  getIncomeBarBox,
  getIncomeBarCenter,
  increaseIncomeRateBy,
  punchIncomeBar,
  spawnHomingCoinBurst,
  type FloorActionsDeps,
} from "../../floors";
import { isFloorMaxed, type Floor } from "../../gameState";
import { getActiveCompanyIndex } from "../../company";
import {
  addTotalIncome,
  getCompanyIncomeRatePerSecond,
} from "../../totalIncome";
import { playSold } from "../../sound";
import { multiply } from "../bigNumber";
import { wiggleHudTotal } from "../totalIncomeCoins";
import type { Point } from "../wisp";

const isGround = (deps: FloorActionsDeps, floor: Floor) =>
  deps.floors.indexOf(floor) === 0;

// a box on screen
export interface ScreenBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function putBox(
  into: ScreenBox[],
  n: number,
  box: { x: number; y: number; width: number; height: number },
  left: number,
  top: number,
): number {
  const b = (into[n] ??= { x: 0, y: 0, w: 0, h: 0 });
  b.x = box.x - left;
  b.y = box.y - top;
  b.w = box.width;
  b.h = box.height;
  return n + 1;
}

// the income bar and upgrade button of every open floor in view, written
// into `into` (kept between calls); returns how many
export function boxesInView(deps: FloorActionsDeps, into: ScreenBox[]): number {
  let n = 0;
  for (const entry of deps.getOnScreenFloors?.() ?? []) {
    const floor = entry.floor;
    const area = floor.unlocked ? deps.getScreenAreaLocal?.(floor) : null;
    if (!area) continue;
    const ground = isGround(deps, floor);
    n = putBox(into, n, getIncomeBarBox(ground), area.left, area.top);
    n = putBox(into, n, getButtonBox(ground), area.left, area.top);
  }
  return n;
}

// floor's income bar's middle on screen; false once the floor is gone
export function barOnScreen(
  deps: FloorActionsDeps,
  floor: Floor,
  into: Point,
): boolean {
  const area = deps.floors.includes(floor)
    ? deps.getScreenAreaLocal?.(floor)
    : null;
  if (!area) return false;
  const bar = getIncomeBarCenter(isGround(deps, floor));
  into.x = bar.x - area.left;
  into.y = bar.y - area.top;
  return true;
}

// floor's upgrade button's middle on screen; false once the floor is gone
export function buttonOnScreen(
  deps: FloorActionsDeps,
  floor: Floor,
  into: Point,
): boolean {
  const area = deps.floors.includes(floor)
    ? deps.getScreenAreaLocal?.(floor)
    : null;
  if (!area) return false;
  const button = getButtonCenter(isGround(deps, floor));
  into.x = button.x - area.left;
  into.y = button.y - area.top;
  return true;
}

// the open floors below the level cap whose income bar is in view
export function barFloorsInView(deps: FloorActionsDeps): Floor[] {
  const out: Floor[] = [];
  for (const entry of deps.getOnScreenFloors?.() ?? [])
    if (
      entry.floor.unlocked &&
      !isFloorMaxed(entry.floor) &&
      isVisibleOnFloor(entry, getIncomeBarCenter(isGround(deps, entry.floor)).y)
    )
      out.push(entry.floor);
  return out;
}

// the open floors below the level cap whose upgrade button is in view
export function buttonFloorsInView(deps: FloorActionsDeps): Floor[] {
  const out: Floor[] = [];
  for (const entry of deps.getOnScreenFloors?.() ?? [])
    if (
      entry.floor.unlocked &&
      !isFloorMaxed(entry.floor) &&
      isVisibleOnFloor(entry, getButtonCenter(isGround(deps, entry.floor)).y)
    )
      out.push(entry.floor);
  return out;
}

// levels for floor, jolting its bar with a "+N Lvl"
export function giveLevels(
  deps: FloorActionsDeps,
  floor: Floor,
  levels: number,
  color: string | null = null,
): void {
  if (!deps.floors.includes(floor) || isFloorMaxed(floor)) return;
  increaseIncomeRateBy(floor, levels);
  punchIncomeBar(floor, `+${levels} Lvl`, color);
  deps.persist();
}

// seconds of the company's income, streaming into the total from `from` (on
// screen) as coins
export function payTotal(
  deps: FloorActionsDeps,
  seconds: number,
  from: Point,
  coins: [number, number] = [30, 40],
): void {
  const amount = multiply(
    getCompanyIncomeRatePerSecond(getActiveCompanyIndex()),
    seconds,
  );
  const floor = deps.floors[0];
  const area = floor && deps.getScreenAreaLocal?.(floor);
  const land = () => {
    addTotalIncome(amount);
    wiggleHudTotal();
    playSold();
  };
  if (!area) {
    land();
    return;
  }
  spawnHomingCoinBurst(floor, from.x + area.left, from.y + area.top, {
    coins,
    onFirstArrive: land,
  });
}
