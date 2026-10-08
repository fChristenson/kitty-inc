// the "Percolation" event (experiment: site percolation; cash): it covers
// its crit, whose click freezes the screen and dims it while a grid of
// cells across the screen starts opening up at random, gold specks
// speckling in faster and faster and clumping into growing islands; the
// instant one island links the top of the screen to the bottom it blazes
// white-gold, and a river of cash pours down through it from top to bottom
// in a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { pourDurationMs, pourLine, type Pour } from "../../cashFlow";

const KEY = "percolation";
const REWARD = 4;
// floor-local px per cell
const CELL = 22;
const VEIL = "rgba(0,0,0,0.6)";
const OPEN = "rgba(255,200,80,0.55)";
const SURGES = 4;
const SPAN_FLASH_MS = 200;
const SURGE_SHAKE: [number, number] = [0.3, 0.9];
const SPAN_SHAKE = 1.4;

export const forcePercolationEvent = registerWispEvent(
  KEY,
  "Percolation",
  () => CONFIG.percolationEvent.chance,
  (floor, context, area) => {
    const { openMs, holdMs, mergeMs } = CONFIG.percolationEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const cols = Math.floor(width / CELL);
    const rows = Math.floor(height / CELL);
    const count = cols * rows;
    const offX = left + (width - cols * CELL) / 2;
    const offY = top + (height - rows * CELL) / 2;
    // sites opened in a random order, with union-find (plus a virtual top
    // and bottom) to spot the first opening that links top to bottom
    const order = Uint32Array.from({ length: count }, (_, i) => i);
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = order[i];
      order[i] = order[j];
      order[j] = t;
    }
    const TOP = count;
    const BOTTOM = count + 1;
    const parent = Int32Array.from({ length: count + 2 }, (_, i) => i);
    const find = (i: number): number => {
      while (parent[i] !== i) {
        parent[i] = parent[parent[i]];
        i = parent[i];
      }
      return i;
    };
    const join = (a: number, b: number) => {
      parent[find(a)] = find(b);
    };
    const open = new Uint8Array(count);
    let spans = count;
    for (let k = 0; k < count; k++) {
      const i = order[k];
      open[i] = 1;
      const x = i % cols;
      const y = Math.floor(i / cols);
      if (y === 0) join(i, TOP);
      if (y === rows - 1) join(i, BOTTOM);
      if (x > 0 && open[i - 1]) join(i, i - 1);
      if (x < cols - 1 && open[i + 1]) join(i, i + 1);
      if (y > 0 && open[i - cols]) join(i, i - cols);
      if (y < rows - 1 && open[i + cols]) join(i, i + cols);
      if (find(TOP) === find(BOTTOM)) {
        spans = k + 1;
        break;
      }
    }
    // the spanning island, and the shortest way down through it
    const root = find(TOP);
    const island = new Uint8Array(count);
    for (let i = 0; i < count; i++)
      if (open[i] && find(i) === root) island[i] = 1;
    const prev = new Int32Array(count).fill(-2);
    const queue: number[] = [];
    for (let x = 0; x < cols; x++)
      if (island[x]) {
        prev[x] = -1;
        queue.push(x);
      }
    let end = -1;
    for (let q = 0; q < queue.length && end < 0; q++) {
      const i = queue[q];
      if (Math.floor(i / cols) === rows - 1) {
        end = i;
        break;
      }
      const x = i % cols;
      for (const n of [
        i - cols,
        i + cols,
        x > 0 ? i - 1 : -1,
        x < cols - 1 ? i + 1 : -1,
      ])
        if (n >= 0 && n < count && island[n] && prev[n] === -2) {
          prev[n] = i;
          queue.push(n);
        }
    }
    const centre = (i: number): Point => ({
      x: offX + ((i % cols) + 0.5) * CELL,
      y: offY + (Math.floor(i / cols) + 0.5) * CELL,
    });
    const path: Point[] = [];
    for (let i = end; i >= 0; i = prev[i]) path.unshift(centre(i));
    if (path.length < 2) return;
    path.unshift({ x: path[0].x, y: top - 40 });
    const pour: Pour = {
      coinsAlong: 300,
      width: 14,
      streamMs: 450,
      travelMs: 650,
    };
    const linkAt = openMs;
    const openedAt = (ms: number) =>
      Math.min(spans, Math.floor(spans * clamp01(ms / openMs) ** 1.5));
    const endAt = pourDurationMs(linkAt, pour);

    let canvas: HTMLCanvasElement | null = null;
    let drawn = 0;
    let lit = false;
    const surging = createBeats(
      Array.from(
        { length: SURGES },
        (_, k) => openMs * ((k + 1) / (SURGES + 1)) ** 0.7,
      ),
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SURGE_SHAKE, k / (SURGES - 1)));
      },
    );
    const linking = createBeats(
      [linkAt, linkAt + pour.travelMs],
      (ms) => ms,
      (_, k) => {
        if (k === 1) {
          cover!.blast(path[path.length - 1]);
          return;
        }
        pourLine(cover!, path, pour);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(SPAN_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          surging.tick(ms, now);
          linking.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms < 0 || ms >= endAt) return;
          if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.width = cols;
            canvas.height = rows;
          }
          const g = canvas.getContext("2d")!;
          const upTo = openedAt(ms);
          if (upTo > drawn) {
            g.fillStyle = OPEN;
            for (let k = drawn; k < upTo; k++) {
              const i = order[k];
              g.fillRect(i % cols, Math.floor(i / cols), 1, 1);
            }
            drawn = upTo;
          }
          // the island that links top to bottom lights up once
          if (!lit && ms >= linkAt) {
            lit = true;
            g.fillStyle = COLOR.heavenlyGold;
            for (let i = 0; i < count; i++)
              if (island[i]) g.fillRect(i % cols, Math.floor(i / cols), 1, 1);
          }
          const flash =
            ms >= linkAt ? 1 - clamp01((ms - linkAt) / SPAN_FLASH_MS) : 0;
          const fade = 1 - clamp01((ms - (endAt - 200)) / 200);
          // the veil lifts off the river as it pours
          ctx.globalAlpha =
            fade * lerp([1, 0.35], clamp01((ms - linkAt) / 300));
          ctx.fillStyle = VEIL;
          ctx.fillRect(left, top, width, height);
          ctx.globalAlpha = fade;
          const smoothing = ctx.imageSmoothingEnabled;
          ctx.imageSmoothingEnabled = false;
          ctx.globalCompositeOperation = "lighter";
          ctx.drawImage(canvas, offX, offY, cols * CELL, rows * CELL);
          if (flash > 0) {
            ctx.globalAlpha = fade * flash;
            ctx.drawImage(canvas, offX, offY, cols * CELL, rows * CELL);
          }
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
