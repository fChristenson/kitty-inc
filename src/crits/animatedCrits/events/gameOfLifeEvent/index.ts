// the "Game of Life" event (experiment: Conway's Game of Life; cash): it
// covers its crit, whose click freezes the screen and dims it under a grid
// of glowing gold cells seeded at random; the colony lives through
// generation after generation, faster and faster, cells being born in white
// flashes and dying off, every few generations a jolt, gliders and
// blinkers flickering across the screen; then every living cell bursts into
// cash at once in a huge blast and shake. Pays floor income × floor number
// × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import { glowSprite, fadeStops } from "../../../../shared/glowSprite";

const KEY = "gameOfLife";
const REWARD = 4;
// floor-local px per cell
const CELL = 34;
// canvas px per cell: the glow is soft, so it's drawn small and stretched
const CELL_PX = 16;
const SEED = 0.3;
const GENERATIONS = 16;
const SHAKE_EVERY = 4;
const VEIL = "rgba(0,0,0,0.55)";
const GOLD = fadeStops(COLOR.heavenlyGold, 0.45);
const WHITE = fadeStops(COLOR.white, 0.45);
const MAX_COINS = 160;
const GEN_SHAKE: [number, number] = [0.3, 0.9];
const FINAL_SHAKE = 2.0;

// the next generation of a cols × rows grid that wraps round its edges
function step(cells: Uint8Array, cols: number, rows: number): Uint8Array {
  const next = new Uint8Array(cells.length);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      let n = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          n +=
            cells[((r + dr + rows) % rows) * cols + ((c + dc + cols) % cols)];
        }
      const alive = cells[r * cols + c];
      next[r * cols + c] = n === 3 || (alive && n === 2) ? 1 : 0;
    }
  return next;
}

export const forceGameOfLifeEvent = registerWispEvent(
  KEY,
  "Game of Life",
  () => CONFIG.gameOfLifeEvent.chance,
  (floor, context, area) => {
    const { gensMs, holdMs, mergeMs } = CONFIG.gameOfLifeEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const cols = Math.floor(width / CELL);
    const rows = Math.floor(height / CELL);
    const offX = left + (width - cols * CELL) / 2;
    const offY = top + (height - rows * CELL) / 2;
    // every generation worked out up front
    let cells: Uint8Array = new Uint8Array(cols * rows).map(() =>
      Math.random() < SEED ? 1 : 0,
    );
    const gens: Uint8Array[] = [cells];
    for (let g = 1; g < GENERATIONS; g++) {
      cells = step(cells, cols, rows);
      gens.push(cells);
    }
    let clock = 0;
    const times = gens.map((_, g) => {
      const at = clock;
      clock += lerp(gensMs, g / (GENERATIONS - 1));
      return at;
    });
    const burstsAt = clock;
    const endAt = burstsAt;
    const centre: Point = { x: left + width / 2, y: top + height / 2 };
    const cellAt = (i: number): Point => ({
      x: offX + ((i % cols) + 0.5) * CELL,
      y: offY + (Math.floor(i / cols) + 0.5) * CELL,
    });
    const gold = glowSprite(GOLD);
    const white = glowSprite(WHITE);
    // one small canvas, redrawn when the generation changes and stretched up
    let canvas: HTMLCanvasElement | null = null;
    let shown = -1;
    const frameOf = (g: number): HTMLCanvasElement => {
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.width = cols * CELL_PX;
        canvas.height = rows * CELL_PX;
      }
      if (g === shown) return canvas;
      shown = g;
      const c = canvas.getContext("2d")!;
      c.clearRect(0, 0, canvas.width, canvas.height);
      const now = gens[g];
      const before = g ? gens[g - 1] : null;
      for (let i = 0; i < now.length; i++) {
        if (!now[i]) continue;
        const born = before && !before[i];
        c.drawImage(
          born ? white : gold,
          (i % cols) * CELL_PX,
          Math.floor(i / cols) * CELL_PX,
          CELL_PX,
          CELL_PX,
        );
      }
      return canvas;
    };

    const living = createBeats(
      times,
      (ms) => ms,
      (_, g) => {
        if (!cover!.isLive()) return;
        playBloop();
        if (g % SHAKE_EVERY === SHAKE_EVERY - 1)
          shakeScreen(lerp(GEN_SHAKE, g / (GENERATIONS - 1)));
      },
    );
    const bursting = createBeats(
      [burstsAt],
      (ms) => ms,
      () => {
        const alive: number[] = [];
        gens[GENERATIONS - 1].forEach((v, i) => v && alive.push(i));
        const every = Math.max(1, Math.ceil(alive.length / MAX_COINS));
        for (let j = 0; j < alive.length; j += every) {
          const at = cellAt(alive[j]);
          cover!.launchFrom(
            at,
            clampTargetsY(
              ringTargets(at, 3, [20, 70]),
              top + 40,
              area.bottom - 40,
            ),
          );
        }
        cover!.blast(centre);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(FINAL_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + 700 + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          living.tick(ms, now);
          bursting.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms < 0 || ms >= endAt + 200) return;
          const fade = 1 - clamp01((ms - endAt) / 200);
          ctx.globalAlpha = fade * clamp01(ms / 150);
          ctx.fillStyle = VEIL;
          ctx.fillRect(left, top, width, height);
          let g = 0;
          while (g < GENERATIONS - 1 && ms >= times[g + 1]) g++;
          ctx.globalCompositeOperation = "lighter";
          ctx.drawImage(frameOf(g), offX, offY, cols * CELL, rows * CELL);
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1;
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
