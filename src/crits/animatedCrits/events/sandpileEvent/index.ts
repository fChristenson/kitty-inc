// the "Sandpile" event (experiment: an Abelian sandpile; cash): it covers
// its crit, whose click freezes the screen and dims it while grains of gold
// pour onto one cell in the middle; whenever a cell holds four it topples,
// throwing one to each neighbour, setting off avalanche after avalanche, and
// the pile spreads out in surges into a glittering fractal of nested
// diamonds, each surge a jolt; then the whole pile bursts into cash in a
// huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";

const KEY = "sandpile";
const REWARD = 4;
const GRID = 49;
const GRAINS = 2600;
const STAGES = 14;
// how each grain count 1..3 shows, dim to bright
const SHADES = ["", "#7a5a10", COLOR.heavenlyGold, COLOR.white];
const VEIL = "rgba(0,0,0,0.6)";
const BURST_CELLS = 140;
const STAGE_SHAKE: [number, number] = [0.3, 0.9];
const FINAL_SHAKE = 2.0;

// adds grains to the middle cell in handfuls, toppling the pile till it settles
function pour(pile: Uint16Array, grains: number): void {
  const mid = (GRID >> 1) * GRID + (GRID >> 1);
  const queue: number[] = [];
  let spare = grains;
  while (queue.length || spare > 0) {
    if (!queue.length) {
      const add = Math.min(spare, 200);
      pile[mid] += add;
      spare -= add;
      queue.push(mid);
    }
    const i = queue.pop()!;
    if (pile[i] < 4) continue;
    const spill = pile[i] >> 2;
    pile[i] &= 3;
    const r = Math.floor(i / GRID);
    const c = i % GRID;
    // grains spilling off the grid's edge are lost
    const spillTo = (j: number) => {
      pile[j] += spill;
      if (pile[j] >= 4) queue.push(j);
    };
    if (r > 0) spillTo(i - GRID);
    if (r < GRID - 1) spillTo(i + GRID);
    if (c > 0) spillTo(i - 1);
    if (c < GRID - 1) spillTo(i + 1);
  }
}

export const forceSandpileEvent = registerWispEvent(
  KEY,
  "Sandpile",
  () => CONFIG.sandpileEvent.chance,
  (floor, context, area) => {
    const { stagesMs, holdMs, mergeMs } = CONFIG.sandpileEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const cell = Math.min(width, height) / GRID;
    const offX = left + (width - cell * GRID) / 2;
    const offY = top + (height - cell * GRID) / 2;
    // the pile after each stage's pour, growing faster each time
    const pile = new Uint16Array(GRID * GRID);
    const stages: Uint16Array[] = [];
    let poured = 0;
    for (let s = 0; s < STAGES; s++) {
      const target = Math.round(GRAINS * ((s + 1) / STAGES) ** 1.5);
      pour(pile, target - poured);
      poured = target;
      stages.push(pile.slice());
    }
    let clock = 0;
    const times = stages.map((_, s) => {
      const at = clock;
      clock += lerp(stagesMs, s / (STAGES - 1));
      return at;
    });
    const burstsAt = clock;
    const centre: Point = {
      x: offX + (cell * GRID) / 2,
      y: offY + (cell * GRID) / 2,
    };

    let canvas: HTMLCanvasElement | null = null;
    let shown = -1;
    const frameOf = (s: number): HTMLCanvasElement => {
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.width = canvas.height = GRID;
      }
      if (s === shown) return canvas;
      shown = s;
      const g = canvas.getContext("2d")!;
      g.clearRect(0, 0, GRID, GRID);
      const cells = stages[s];
      for (let i = 0; i < cells.length; i++) {
        if (!cells[i]) continue;
        g.fillStyle = SHADES[cells[i]];
        g.fillRect(i % GRID, Math.floor(i / GRID), 1, 1);
      }
      return canvas;
    };

    const growing = createBeats(
      times,
      (ms) => ms,
      (_, s) => {
        if (!cover!.isLive()) return;
        playBloop();
        if (s % 3 === 2) shakeScreen(lerp(STAGE_SHAKE, s / (STAGES - 1)));
      },
    );
    const bursting = createBeats(
      [burstsAt],
      (ms) => ms,
      () => {
        const full: number[] = [];
        stages[STAGES - 1].forEach((v, i) => v && full.push(i));
        const every = Math.max(1, Math.ceil(full.length / BURST_CELLS));
        for (let j = 0; j < full.length; j += every) {
          const i = full[j];
          const at: Point = {
            x: offX + ((i % GRID) + 0.5) * cell,
            y: offY + (Math.floor(i / GRID) + 0.5) * cell,
          };
          cover!.launchFrom(
            at,
            clampTargetsY(
              ringTargets(at, 3, [20, 80]),
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
      { durationMs: burstsAt + 700 + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          growing.tick(ms, now);
          bursting.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms < 0 || ms >= burstsAt + 200) return;
          const fade = 1 - clamp01((ms - burstsAt) / 200);
          ctx.globalAlpha = fade * clamp01(ms / 150);
          ctx.fillStyle = VEIL;
          ctx.fillRect(left, top, width, height);
          let s = 0;
          while (s < STAGES - 1 && ms >= times[s + 1]) s++;
          const smoothing = ctx.imageSmoothingEnabled;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(frameOf(s), offX, offY, cell * GRID, cell * GRID);
          ctx.imageSmoothingEnabled = smoothing;
          ctx.globalAlpha = 1;
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
