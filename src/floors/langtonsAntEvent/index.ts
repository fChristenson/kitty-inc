// the "Langton's Ant" event (experiment: Langton's ant; cash): it covers its
// crit, whose click freezes the screen and dims it while an ant wisp lands
// in the middle of a blank grid; at every step it turns right on a dark cell
// or left on a gold one, flipping the cell as it leaves, faster and faster,
// thousands of steps scrawling a chaotic gold blob with a jolt at every
// surge, until out of the chaos it suddenly builds its endless diagonal
// highway and races off along it; then every gold cell bursts into cash in
// a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../shared/coinTargets";

const KEY = "langtonsAnt";
const REWARD = 4;
// floor-local px per cell
const CELL = 9;
// the highway shows up after about 10,000 steps
const STEPS = 12000;
const VEIL = "rgba(0,0,0,0.6)";
const SURGES = 4;
const BURST_CELLS = 150;
const ANT = 0.35;
const SURGE_SHAKE: [number, number] = [0.3, 0.9];
const FINAL_SHAKE = 2.0;
// up, right, down, left
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

export const forceLangtonsAntEvent = registerWispEvent(
  KEY,
  "Langton's Ant",
  () => CONFIG.langtonsAntEvent.chance,
  (floor, context, area) => {
    const { runMs, holdMs, mergeMs } = CONFIG.langtonsAntEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const cols = Math.floor(width / CELL);
    const rows = Math.floor(height / CELL);
    const offX = left + (width - cols * CELL) / 2;
    const offY = top + (height - rows * CELL) / 2;
    // every step worked out up front: the cell it flips and where it goes
    const grid = new Uint8Array(cols * rows);
    const flips = new Int32Array(STEPS);
    const trail = new Int32Array(STEPS + 1);
    let cx = cols >> 1;
    let cy = rows >> 1;
    let dir = 0;
    trail[0] = cy * cols + cx;
    for (let s = 0; s < STEPS; s++) {
      const i = cy * cols + cx;
      dir = (dir + (grid[i] ? 3 : 1)) % 4;
      grid[i] ^= 1;
      flips[s] = i;
      // wrapping round the edges
      cx = (cx + DX[dir] + cols) % cols;
      cy = (cy + DY[dir] + rows) % rows;
      trail[s + 1] = cy * cols + cx;
    }
    const endAt = runMs;
    const stepsAt = (ms: number) =>
      Math.min(STEPS, Math.floor(STEPS * clamp01(ms / runMs) ** 1.7));
    const spot: Point = { x: 0, y: 0 };
    const antAt = (ms: number): Point => {
      const i = trail[stepsAt(Math.max(0, ms))];
      spot.x = offX + ((i % cols) + 0.5) * CELL;
      spot.y = offY + (Math.floor(i / cols) + 0.5) * CELL;
      return spot;
    };

    let canvas: HTMLCanvasElement | null = null;
    // the cells lit on the layer so far
    const shown = new Uint8Array(cols * rows);
    let drawn = 0;
    const surging = createBeats(
      Array.from(
        { length: SURGES },
        (_, k) => runMs * ((k + 1) / (SURGES + 1)) ** 0.6,
      ),
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SURGE_SHAKE, k / (SURGES - 1)));
      },
    );
    const bursting = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        const lit: number[] = [];
        for (let i = 0; i < grid.length; i++) if (grid[i]) lit.push(i);
        for (let j = 0; j < BURST_CELLS && lit.length > 0; j++) {
          const i = lit[Math.floor(Math.random() * lit.length)];
          const at: Point = {
            x: offX + ((i % cols) + 0.5) * CELL,
            y: offY + (Math.floor(i / cols) + 0.5) * CELL,
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
        cover!.blast({ ...antAt(endAt) });
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
          surging.tick(ms, now);
          bursting.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms < 0 || ms >= endAt + 200) return;
          if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.width = cols;
            canvas.height = rows;
          }
          // only the steps since last frame, a px per cell, each a toggle
          const upTo = stepsAt(ms);
          if (upTo > drawn) {
            const g = canvas.getContext("2d")!;
            g.fillStyle = COLOR.heavenlyGold;
            for (let s = drawn; s < upTo; s++) {
              const i = flips[s];
              const x = i % cols;
              const y = (i / cols) | 0;
              if (shown[i]) g.clearRect(x, y, 1, 1);
              else g.fillRect(x, y, 1, 1);
              shown[i] ^= 1;
            }
            drawn = upTo;
          }
          const fade = 1 - clamp01((ms - endAt) / 200);
          ctx.globalAlpha = fade;
          ctx.fillStyle = VEIL;
          ctx.fillRect(left, top, width, height);
          const smoothing = ctx.imageSmoothingEnabled;
          ctx.imageSmoothingEnabled = false;
          ctx.globalCompositeOperation = "lighter";
          ctx.drawImage(canvas, offX, offY, cols * CELL, rows * CELL);
          ctx.globalCompositeOperation = "source-over";
          ctx.imageSmoothingEnabled = smoothing;
          ctx.globalAlpha = 1;
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          drawWisp(ctx, antAt, ms, now, WISP_SIZE * ANT, 1);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
