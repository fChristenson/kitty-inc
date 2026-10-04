// the "Rule 30" event (experiment: Wolfram's Rule 30 cellular automaton;
// cash): it covers its crit, whose click freezes the screen and dims it
// while a single gold cell lights at the top of the screen; row after row
// cascades down beneath it, each cell set by the three above it, faster and
// faster, a widening triangle of chaotic gold patterns pouring down the
// screen with a jolt at every surge; then the whole pattern bursts into
// cash in a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../shared/coinTargets";

const KEY = "rule30";
const REWARD = 4;
// floor-local px per cell
const CELL = 12;
const TOP = 40;
const VEIL = "rgba(0,0,0,0.6)";
const SURGES = 4;
const BURST_CELLS = 150;
const SURGE_SHAKE: [number, number] = [0.3, 0.9];
const FINAL_SHAKE = 2.0;

export const forceRule30Event = registerWispEvent(
  KEY,
  "Rule 30",
  () => CONFIG.rule30Event.chance,
  (floor, context, area) => {
    const { pourMs, holdMs, mergeMs } = CONFIG.rule30Event;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const cols = Math.floor(width / CELL) | 1;
    const rows = Math.floor((height - TOP) / CELL);
    const offX = left + (width - cols * CELL) / 2;
    const offY = top + TOP;
    // every row worked out up front, the edges wrapping
    const grid = new Uint8Array(cols * rows);
    grid[cols >> 1] = 1;
    for (let r = 1; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const above = (r - 1) * cols;
        const l = grid[above + ((c - 1 + cols) % cols)];
        const m = grid[above + c];
        const rr = grid[above + ((c + 1) % cols)];
        // rule 30: left XOR (middle OR right)
        grid[r * cols + c] = l ^ (m | rr);
      }
    const endAt = pourMs;
    const rowsAt = (ms: number) =>
      Math.min(rows, Math.floor(rows * clamp01(ms / pourMs) ** 1.4) + 1);

    let canvas: HTMLCanvasElement | null = null;
    let drawn = 0;
    const surging = createBeats(
      Array.from(
        { length: SURGES },
        (_, k) => pourMs * ((k + 1) / (SURGES + 1)) ** 0.7,
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
        for (let j = 0; j < BURST_CELLS; j++) {
          // a live cell, picked at random
          let i = Math.floor(Math.random() * grid.length);
          for (let tries = 0; !grid[i] && tries < 20; tries++)
            i = Math.floor(Math.random() * grid.length);
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
        cover!.blast({ x: left + width / 2, y: top + height / 2 });
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
          // only the rows new since last frame go onto the layer, a px per cell
          const upTo = rowsAt(ms);
          if (upTo > drawn) {
            const g = canvas.getContext("2d")!;
            g.fillStyle = COLOR.heavenlyGold;
            for (let r = drawn; r < upTo; r++)
              for (let c = 0; c < cols; c++)
                if (grid[r * cols + c]) g.fillRect(c, r, 1, 1);
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
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
