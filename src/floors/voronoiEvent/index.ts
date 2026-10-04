// the "Voronoi" event (experiment: a Voronoi diagram growing; cash): it
// covers its crit, whose click freezes the screen and dims it while seed
// wisps pop up all over the screen and each spreads a glowing gold region
// round itself, all growing at the same speed; wherever two regions meet
// they stop dead along a blazing seam, jolts rolling as they collide,
// until the whole screen is cut into a stained-glass of cells; then every
// seed bursts into cash in a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispHead, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../shared/coinTargets";

const KEY = "voronoi";
const REWARD = 4;
const SEEDS = 14;
// floor-local px per cell, and how many cells wide a seam is
const CELL = 10;
const SEAM = 1.6;
const VEIL = "rgba(0,0,0,0.6)";
const FILL = "rgba(255,200,80,0.28)";
const SURGES = 4;
const SEED = 0.3;
const SEED_COINS = 14;
const SEAM_BURSTS = 80;
const SURGE_SHAKE: [number, number] = [0.3, 0.9];
const FINAL_SHAKE = 2.0;

export const forceVoronoiEvent = registerWispEvent(
  KEY,
  "Voronoi",
  () => CONFIG.voronoiEvent.chance,
  (floor, context, area) => {
    const { growMs, holdMs, mergeMs } = CONFIG.voronoiEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const cols = Math.floor(width / CELL);
    const rows = Math.floor(height / CELL);
    const seeds: Point[] = Array.from({ length: SEEDS }, () => ({
      x: Math.random() * cols,
      y: Math.random() * rows,
    }));
    // every cell's nearest seed distance, and whether it's on a seam; each
    // lights when the growing regions reach it
    const count = cols * rows;
    const reach = new Float32Array(count);
    const seam = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      const x = (i % cols) + 0.5;
      const y = Math.floor(i / cols) + 0.5;
      let d1 = Infinity;
      let d2 = Infinity;
      for (const s of seeds) {
        const d = Math.hypot(x - s.x, y - s.y);
        if (d < d1) {
          d2 = d1;
          d1 = d;
        } else if (d < d2) d2 = d;
      }
      seam[i] = d2 - d1 < SEAM ? 1 : 0;
      reach[i] = seam[i] ? d2 : d1;
    }
    const order = Uint32Array.from({ length: count }, (_, i) => i).sort(
      (a, b) => reach[a] - reach[b],
    );
    const farthest = reach[order[count - 1]];
    const endAt = growMs;
    const reachAt = (ms: number) => farthest * clamp01(ms / growMs) ** 0.85;
    const seedPoints = seeds.map((s) => ({
      x: left + s.x * CELL,
      y: top + s.y * CELL,
    }));
    const seedAts = seedPoints.map((p) => () => p);
    const seamCells: number[] = [];
    for (let i = 0; i < count; i++) if (seam[i]) seamCells.push(i);

    let canvas: HTMLCanvasElement | null = null;
    let drawn = 0;
    const surging = createBeats(
      Array.from(
        { length: SURGES },
        (_, k) => growMs * ((k + 1) / (SURGES + 1)),
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
        for (const at of seedPoints)
          cover!.launchFrom(
            at,
            clampTargetsY(
              ringTargets(at, SEED_COINS, [30, 140]),
              top + 40,
              area.bottom - 40,
            ),
          );
        for (let j = 0; j < SEAM_BURSTS && seamCells.length; j++) {
          const i = seamCells[Math.floor(Math.random() * seamCells.length)];
          const at: Point = {
            x: left + ((i % cols) + 0.5) * CELL,
            y: top + (Math.floor(i / cols) + 0.5) * CELL,
          };
          cover!.launchFrom(
            at,
            clampTargetsY(
              ringTargets(at, 2, [20, 70]),
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
          // only the cells reached since last frame go onto the layer
          const r = reachAt(ms);
          if (drawn < count && reach[order[drawn]] <= r) {
            const g = canvas.getContext("2d")!;
            while (drawn < count && reach[order[drawn]] <= r) {
              const i = order[drawn++];
              g.fillStyle = seam[i] ? COLOR.heavenlyGold : FILL;
              g.fillRect(i % cols, Math.floor(i / cols), 1, 1);
            }
          }
          const fade = 1 - clamp01((ms - endAt) / 200);
          ctx.globalAlpha = fade;
          ctx.fillStyle = VEIL;
          ctx.fillRect(left, top, width, height);
          const smoothing = ctx.imageSmoothingEnabled;
          ctx.imageSmoothingEnabled = false;
          ctx.globalCompositeOperation = "lighter";
          ctx.drawImage(canvas, left, top, cols * CELL, rows * CELL);
          ctx.globalCompositeOperation = "source-over";
          ctx.imageSmoothingEnabled = smoothing;
          ctx.globalAlpha = 1;
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (const at of seedAts)
            drawWispHead(ctx, at, ms, now, WISP_SIZE * SEED, 0.8);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
