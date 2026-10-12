// spawns the player plays with a gesture (a tap, a hold, a trace), drawn in
// gameCanvas's screen units over the HUD. Each spawn module registers itself
// once it loads; gameCanvas wires in the floor actions, ticks and draws them
// and hands them its pointer before anything else under it
import type { FloorActionsDeps } from "../../floors";

export {
  barFloorsInView,
  barOnScreen,
  buttonFloorsInView,
  buttonOnScreen,
  giveLevels,
  payTotal,
} from "./floors";

export interface SpawnGame {
  update(now: number): void;
  // in screen units: w wide, h tall, the total's middle at totalAtY
  draw(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    totalAtY: number,
    now: number,
  ): void;
  // a press at (x, y): true takes the gesture (no scroll, no tap under it)
  press(x: number, y: number, now: number): boolean;
  move?(x: number, y: number, now: number): void;
  release?(now: number): void;
  hitTest(x: number, y: number, now: number): boolean;
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
    games[i].draw(ctx, w, h, totalAtY, now);
}

// true if a spawn took the press at (x, y)
export function pressSpawnGames(x: number, y: number, now: number): boolean {
  held = null;
  for (let i = games.length - 1; i >= 0; i--)
    if (games[i].press(x, y, now)) {
      held = games[i];
      return true;
    }
  return false;
}

export function moveSpawnGame(x: number, y: number, now: number): void {
  held?.move?.(x, y, now);
}

export function releaseSpawnGame(now: number): void {
  held?.release?.(now);
  held = null;
}

export function hitTestSpawnGames(x: number, y: number, now: number): boolean {
  for (let i = 0; i < games.length; i++)
    if (games[i].hitTest(x, y, now)) return true;
  return false;
}
