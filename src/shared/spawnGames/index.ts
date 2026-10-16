// the random spawns: each folder under src/spawn default-exports one
// SpawnGame (src/spawn registers them once loaded); gameCanvas wires in the
// floor actions, ticks and draws them and hands them its pointer before
// anything else under it
import type { FloorActionsDeps } from "../../floors";
import type { Floor } from "../../gameState";

export {
  barFloorsInView,
  barOnScreen,
  buttonFloorsInView,
  buttonOnScreen,
  giveLevels,
  payTotal,
} from "./floors";

// a spawn's card: its src/spawn/<key>/meta.ts default-exports one
export interface SpawnMeta {
  // its name on its test button
  label: string;
  // its test button sits under New Effects until it's been tested
  isNew?: boolean;
}

// every hook but update is optional; screen units are gameCanvas's
export interface SpawnGame {
  // dev/test: puts it out now
  force(): void | Promise<void>;
  update(now: number): void;
  // in screen units: w wide, h tall, the total's middle at totalAtY; under
  // the crit flash, or over it
  draw?(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    totalAtY: number,
    now: number,
  ): void;
  drawOver?(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    totalAtY: number,
    now: number,
  ): void;
  // a press at (x, y): true takes the gesture (no scroll, no tap under it)
  press?(x: number, y: number, now: number): boolean;
  // the drag of a gesture it took; a spawn that sweeps gets every drag
  // through sweep instead
  move?(x: number, y: number, now: number): void;
  release?(now: number): void;
  // every drag from (x0, y0) to (x1, y1), scrolling or not
  sweep?(x0: number, y0: number, x1: number, y1: number): void;
  hitTest?(x: number, y: number, now: number): boolean;
  // a spawn living on a floor: drawn into it, tapped in its local units
  drawOnFloor?(ctx: CanvasRenderingContext2D, floor: Floor, now: number): void;
  tapFloor?(x: number, y: number, floor: Floor, floors: Floor[]): void;
  hitTestFloor?(x: number, y: number, floor: Floor): boolean;
}

const games: SpawnGame[] = [];
let held: SpawnGame | null = null;
let getDeps: (() => FloorActionsDeps) | null = null;

export function registerSpawnGame(game: SpawnGame): void {
  games.push(game);
}

// the floor actions of the building on screen
export function wireSpawnGames(deps: () => FloorActionsDeps): void {
  getDeps = deps;
}

export function spawnGameDeps(): FloorActionsDeps | null {
  return getDeps ? getDeps() : null;
}

export function updateSpawnGames(now: number): void {
  for (let i = 0; i < games.length; i++) games[i].update(now);
}

export function drawSpawnGames(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  totalAtY: number,
  now: number,
): void {
  for (let i = 0; i < games.length; i++)
    games[i].draw?.(ctx, w, h, totalAtY, now);
}

export function drawSpawnGamesOver(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  totalAtY: number,
  now: number,
): void {
  for (let i = 0; i < games.length; i++)
    games[i].drawOver?.(ctx, w, h, totalAtY, now);
}

export function drawSpawnsOnFloor(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  now: number,
): void {
  for (let i = 0; i < games.length; i++)
    games[i].drawOnFloor?.(ctx, floor, now);
}

// true if a spawn took the press at (x, y)
export function pressSpawnGames(x: number, y: number, now: number): boolean {
  held = null;
  for (let i = games.length - 1; i >= 0; i--)
    if (games[i].press?.(x, y, now)) {
      held = games[i];
      return true;
    }
  return false;
}

// true if the spawn holding the gesture takes this drag (the rest sweep it)
export function moveSpawnGame(x: number, y: number, now: number): boolean {
  if (!held || held.sweep) return false;
  held.move?.(x, y, now);
  return true;
}

export function sweepSpawnGames(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  for (let i = 0; i < games.length; i++) games[i].sweep?.(x0, y0, x1, y1);
}

export function releaseSpawnGame(now: number): void {
  held?.release?.(now);
  held = null;
}

export function hitTestSpawnGames(x: number, y: number, now: number): boolean {
  for (let i = 0; i < games.length; i++)
    if (games[i].hitTest?.(x, y, now)) return true;
  return false;
}

// a tap on floor at its local (x, y): every floor spawn there gets it
export function tapSpawnsOnFloor(
  x: number,
  y: number,
  floor: Floor,
  floors: Floor[],
): void {
  for (let i = 0; i < games.length; i++)
    games[i].tapFloor?.(x, y, floor, floors);
}

export function hitTestSpawnsOnFloor(
  x: number,
  y: number,
  floor: Floor,
): boolean {
  for (let i = 0; i < games.length; i++)
    if (games[i].hitTestFloor?.(x, y, floor)) return true;
  return false;
}
