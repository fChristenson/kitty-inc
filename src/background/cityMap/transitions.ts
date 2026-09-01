import { playSwoosh } from "../../sound";
import {
  playSpeedLines,
  playVerticalSpeedLines,
  cancelSpeedLines,
  cancelVerticalSpeedLines,
} from "./speedLines";

// the map's "cut"/blur transitions: city prev/next navigation, the action
// bar's own scroll-to-top/scroll-to-bottom vertical flash (which also rolls
// the corp barrel one step), and jumping the corp barrel straight to a given
// company. Split out of cityMap/index.ts, which only owns cssW/cssH/canvas/
// cityIndex/redraw and wires this module's own trigger points (arrow clicks,
// main.ts's flashVerticalRays/animateSwitchToCompany) into it.

const TRANSITION_MS = 220;
const SWAP_AT_MS = 90; // mid-flash, once fully covered but before it clears

export interface CityTransitionsDeps {
  canvas: HTMLCanvasElement;
  speedLinesSvg: SVGSVGElement;
  getCssSize: () => { cssW: number; cssH: number };
  rollOneStep: (direction: -1 | 1) => void;
  resolveCompanyTargetPosition: (companyIndex: number) => number;
  rollToPosition: (targetPosition: number) => void;
  getSelectedPosition: () => number;
  // applies a city-page delta (mutate cityIndex, persist, redraw) — owned by
  // index.ts since that's where cityIndex itself lives
  shiftCityIndex: (delta: -1 | 1) => void;
}

export interface CityTransitions {
  // same blur-then-clear treatment navigateCity gives the horizontal
  // transition, just without a city swap in the middle — the action bar's
  // own scroll-to-top/scroll-to-bottom flourish while the map is open, also
  // rolling the corp barrel one step in the same direction
  flashVertical(direction: -1 | 1): void;
  // same blur + speed-line flourish as a normal barrel roll, but jumping
  // straight to companyIndex's own barrel position in one motion instead of
  // one adjacent step — for a switch that didn't come from the player
  // rolling the barrel themselves
  animateSwitchToCompany(companyIndex: number): void;
  // anime-style "cut": blur + flash speed lines across the canvas, swap the
  // city page underneath while still covered, then clear
  navigateCity(delta: -1 | 1): void;
  destroy(): void;
}

export function createCityTransitions(
  deps: CityTransitionsDeps,
): CityTransitions {
  const { canvas, speedLinesSvg } = deps;
  let verticalClearTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let swapTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let clearTimeoutId: ReturnType<typeof setTimeout> | null = null;

  function flashVertical(direction: -1 | 1): void {
    const { cssW, cssH } = deps.getCssSize();
    canvas.classList.add("city-map__canvas--blurred");
    playVerticalSpeedLines(speedLinesSvg, cssW, cssH, direction);
    deps.rollOneStep(direction);
    if (verticalClearTimeoutId !== null) clearTimeout(verticalClearTimeoutId);
    verticalClearTimeoutId = setTimeout(() => {
      canvas.classList.remove("city-map__canvas--blurred");
    }, TRANSITION_MS);
  }

  function animateSwitchToCompany(companyIndex: number): void {
    const targetPosition = deps.resolveCompanyTargetPosition(companyIndex);
    if (targetPosition === -1) return;
    const direction: -1 | 1 =
      targetPosition >= deps.getSelectedPosition() ? -1 : 1;
    const { cssW, cssH } = deps.getCssSize();
    canvas.classList.add("city-map__canvas--blurred");
    playVerticalSpeedLines(speedLinesSvg, cssW, cssH, direction);
    deps.rollToPosition(targetPosition);
    if (verticalClearTimeoutId !== null) clearTimeout(verticalClearTimeoutId);
    verticalClearTimeoutId = setTimeout(() => {
      canvas.classList.remove("city-map__canvas--blurred");
    }, TRANSITION_MS);
  }

  function navigateCity(delta: -1 | 1): void {
    playSwoosh();
    const { cssW, cssH } = deps.getCssSize();
    canvas.classList.add("city-map__canvas--blurred");
    playSpeedLines(speedLinesSvg, cssW, cssH, delta);
    if (swapTimeoutId !== null) clearTimeout(swapTimeoutId);
    if (clearTimeoutId !== null) clearTimeout(clearTimeoutId);
    swapTimeoutId = setTimeout(() => {
      deps.shiftCityIndex(delta);
    }, SWAP_AT_MS);
    clearTimeoutId = setTimeout(() => {
      canvas.classList.remove("city-map__canvas--blurred");
    }, TRANSITION_MS);
  }

  function destroy(): void {
    if (swapTimeoutId !== null) clearTimeout(swapTimeoutId);
    if (clearTimeoutId !== null) clearTimeout(clearTimeoutId);
    if (verticalClearTimeoutId !== null) clearTimeout(verticalClearTimeoutId);
    cancelSpeedLines();
    cancelVerticalSpeedLines();
  }

  return { flashVertical, animateSwitchToCompany, navigateCity, destroy };
}
