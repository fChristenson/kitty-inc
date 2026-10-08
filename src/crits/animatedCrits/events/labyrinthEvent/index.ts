// the "Labyrinth" event (experiment: a maze solved by flood fill; cash): it covers
// its crit, whose click freezes the screen and dims it under a glowing maze
// that snaps in over the whole screen; a flood of gold pours out from the
// clicked floor's button through its corridors, spreading faster and faster
// down every branch with a jolt at each surge, until it reaches the
// farthest corner; then the one true path back blazes with light and a
// river of cash rushes along it into the total in a huge blast and shake.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { glowSprite, fadeStops } from "../../../../shared/glowSprite";
import { drawBeam } from "../../../../shared/beam";
import { pourDurationMs, pourLine, type Pour } from "../../cashFlow";

const KEY = "labyrinth";
const REWARD = 4;
// floor-local px per cell, and the baked canvases' px per cell
const CELL = 72;
const CELL_PX = 32;
const WALL_PX = 3;
const VEIL = "rgba(0,0,0,0.65)";
const FLOOD = fadeStops(COLOR.heavenlyGold, 0.6);
const PATH_W = 16;
const SURGES = 5;
const SURGE_SHAKE: [number, number] = [0.3, 0.9];
const SOLVE_SHAKE = 1.6;

export const forceLabyrinthEvent = registerWispEvent(
  KEY,
  "Labyrinth",
  () => CONFIG.labyrinthEvent.chance,
  (floor, context, area) => {
    const { appearMs, floodMs, blazeMs, holdMs, mergeMs } =
      CONFIG.labyrinthEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const cols = Math.max(4, Math.floor(width / CELL));
    const rows = Math.max(4, Math.floor(height / CELL));
    const cw = width / cols;
    const ch = height / rows;
    const count = cols * rows;
    // open[i] bit 1: passage to the right, bit 2: passage down
    const open = new Uint8Array(count);
    const seen = new Uint8Array(count);
    const stack = [0];
    seen[0] = 1;
    while (stack.length) {
      const i = stack[stack.length - 1];
      const c = i % cols;
      const r = Math.floor(i / cols);
      const next = [
        c > 0 ? i - 1 : -1,
        c < cols - 1 ? i + 1 : -1,
        r > 0 ? i - cols : -1,
        r < rows - 1 ? i + cols : -1,
      ].filter((j) => j >= 0 && !seen[j]);
      if (!next.length) {
        stack.pop();
        continue;
      }
      const j = next[Math.floor(Math.random() * next.length)];
      if (j === i + 1) open[i] |= 1;
      else if (j === i - 1) open[j] |= 1;
      else if (j === i + cols) open[i] |= 2;
      else open[j] |= 2;
      seen[j] = 1;
      stack.push(j);
    }
    const linked = (i: number): number[] => {
      const c = i % cols;
      const out: number[] = [];
      if (open[i] & 1) out.push(i + 1);
      if (c > 0 && open[i - 1] & 1) out.push(i - 1);
      if (open[i] & 2) out.push(i + cols);
      if (i >= cols && open[i - cols] & 2) out.push(i - cols);
      return out;
    };
    const button = getButtonCenter(context.isGroundFloor);
    const start =
      Math.min(rows - 1, Math.max(0, Math.floor((button.y - top) / ch))) *
        cols +
      Math.min(cols - 1, Math.max(0, Math.floor((button.x - left) / cw)));
    const dist = new Int32Array(count).fill(-1);
    const parent = new Int32Array(count).fill(-1);
    const order = [start];
    dist[start] = 0;
    for (let q = 0; q < order.length; q++)
      for (const j of linked(order[q]))
        if (dist[j] < 0) {
          dist[j] = dist[order[q]] + 1;
          parent[j] = order[q];
          order.push(j);
        }
    const exit = order[order.length - 1];
    const maxDist = dist[exit];
    const centreOf = (i: number): Point => ({
      x: left + ((i % cols) + 0.5) * cw,
      y: top + (Math.floor(i / cols) + 0.5) * ch,
    });
    const path: Point[] = [];
    for (let i = exit; i >= 0; i = parent[i]) path.unshift(centreOf(i));
    const floodStarts = appearMs;
    const solvedAt = floodStarts + floodMs;
    const endAt = solvedAt + blazeMs;
    // how far (in steps) the flood has reached, quickening
    const reachAt = (ms: number) =>
      maxDist * easeIn(clamp01((ms - floodStarts) / floodMs));
    const pour: Pour = {
      coinsAlong: 160,
      width: 30,
      streamMs: 360,
      travelMs: 700,
    };

    let walls: HTMLCanvasElement | null = null;
    let flood: HTMLCanvasElement | null = null;
    let flooded = 0;
    const bake = () => {
      walls = document.createElement("canvas");
      walls.width = cols * CELL_PX;
      walls.height = rows * CELL_PX;
      const w = walls.getContext("2d")!;
      w.strokeStyle = COLOR.white;
      w.lineWidth = WALL_PX;
      w.lineCap = "round";
      w.beginPath();
      w.rect(
        WALL_PX / 2,
        WALL_PX / 2,
        walls.width - WALL_PX,
        walls.height - WALL_PX,
      );
      for (let i = 0; i < count; i++) {
        const x = (i % cols) * CELL_PX;
        const y = Math.floor(i / cols) * CELL_PX;
        if (!(open[i] & 1)) {
          w.moveTo(x + CELL_PX, y);
          w.lineTo(x + CELL_PX, y + CELL_PX);
        }
        if (!(open[i] & 2)) {
          w.moveTo(x, y + CELL_PX);
          w.lineTo(x + CELL_PX, y + CELL_PX);
        }
      }
      w.stroke();
      flood = document.createElement("canvas");
      flood.width = walls.width;
      flood.height = walls.height;
    };
    const glow = glowSprite(FLOOD);
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };

    const surging = createBeats(
      Array.from(
        { length: SURGES },
        (_, k) => floodStarts + floodMs * Math.sqrt((k + 1) / (SURGES + 1)),
      ),
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SURGE_SHAKE, k / (SURGES - 1)));
      },
    );
    const solving = createBeats(
      [solvedAt, endAt],
      (ms) => ms,
      (_, k) => {
        if (k === 1) {
          cover!.blast(path[path.length - 1]);
          if (cover!.isLive()) playExplosion();
          return;
        }
        pourLine(cover!, path, pour);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(SOLVE_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs:
          Math.max(endAt + 400, pourDurationMs(solvedAt, pour)) +
          holdMs +
          mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          surging.tick(ms, now);
          solving.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms < 0 || ms >= endAt + 200) return;
          if (!walls) bake();
          const fade = 1 - clamp01((ms - endAt) / 200);
          const shown = clamp01(ms / appearMs) * fade;
          ctx.globalAlpha = shown;
          ctx.fillStyle = VEIL;
          ctx.fillRect(left, top, width, height);
          // newly reached cells added to the flood layer as it spreads
          const reach = reachAt(ms);
          const f = flood!.getContext("2d")!;
          while (flooded < order.length && dist[order[flooded]] <= reach) {
            const i = order[flooded++];
            f.drawImage(
              glow,
              (i % cols) * CELL_PX - CELL_PX * 0.2,
              Math.floor(i / cols) * CELL_PX - CELL_PX * 0.2,
              CELL_PX * 1.4,
              CELL_PX * 1.4,
            );
          }
          ctx.globalCompositeOperation = "lighter";
          ctx.drawImage(flood!, left, top, width, height);
          ctx.globalCompositeOperation = "source-over";
          ctx.drawImage(walls!, left, top, width, height);
          ctx.globalAlpha = 1;
          if (ms < solvedAt) return;
          // the solution blazing back along the path
          const lit = clamp01((ms - solvedAt) / (blazeMs * 0.5));
          const upTo = Math.floor(lit * (path.length - 1));
          for (let k = 0; k < upTo; k++) {
            a.x = path[k].x;
            a.y = path[k].y;
            b.x = path[k + 1].x;
            b.y = path[k + 1].y;
            drawBeam(ctx, a, b, PATH_W, fade);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
