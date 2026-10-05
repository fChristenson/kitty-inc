// the "Fuse Maze" event (explosion; a free floor): it covers its crit, whose
// click freezes the screen while a maze of glowing fuse cord snaps out over
// the whole screen, with a bomb wisp at the end of every blind alley; the
// clicked floor's button lights it and the flame races off down the cord,
// splitting at every fork, so a ragged front of fizzing sparks floods the
// maze; every dead end it reaches goes up in a big blast, the blasts
// rolling across the screen in chains and clusters, each its own bang and
// shake; the last flame runs out of the maze's far corner along a final
// cord into the locked floor's lock, which blows open in a huge blast: the
// floor unlocked for free. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispHead, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam } from "../../shared/beam";
import { drawDetonation, drawLitFuse } from "../../shared/explosion";
import { findRewardLocked } from "../eventRewards";
import { FLOOR_H, FLOOR_W } from "../constants";

const KEY = "fuseMaze";
const COLS = 7;
const MARGIN = 80;
const CORD_W = 5;
const CORD_ALPHA = 0.35;
const FLAME = 40;
const BOMB = WISP_SIZE * 0.6;
const BLAST: [number, number] = [170, 240];
const BLAST_SHAKE: [number, number] = [0.5, 1.1];
const SOUND_GAP_MS = 60;

export const forceFuseMazeEvent = registerWispEvent(
  KEY,
  "Fuse Maze",
  () => CONFIG.fuseMazeEvent.chance,
  (floor, context, area) => {
    const { growMs, stepMs, finalMs, holdMs, mergeMs } = CONFIG.fuseMazeEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + MARGIN;
    const top = area.top + MARGIN;
    const cell = (area.right - MARGIN - left) / COLS;
    const rows = Math.max(4, Math.floor((area.bottom - MARGIN - top) / cell));
    const n = COLS * rows;
    const spots = Array.from({ length: n }, (_, i) => ({
      x: left + ((i % COLS) + 0.5) * cell,
      y: top + (Math.floor(i / COLS) + 0.5) * cell,
    }));
    const nearest = (p: Point) => {
      let best = 0;
      for (let i = 1; i < n; i++)
        if (
          Math.hypot(spots[i].x - p.x, spots[i].y - p.y) <
          Math.hypot(spots[best].x - p.x, spots[best].y - p.y)
        )
          best = i;
      return best;
    };
    // a perfect maze, carved by a randomised depth-first walk
    const start = nearest(button);
    const links: number[][] = Array.from({ length: n }, () => []);
    const seen = new Uint8Array(n);
    const stack = [start];
    seen[start] = 1;
    while (stack.length > 0) {
      const i = stack[stack.length - 1];
      const c = i % COLS;
      const r = Math.floor(i / COLS);
      const next = [
        c > 0 ? i - 1 : -1,
        c < COLS - 1 ? i + 1 : -1,
        r > 0 ? i - COLS : -1,
        r < rows - 1 ? i + COLS : -1,
      ].filter((j) => j >= 0 && !seen[j]);
      if (next.length === 0) {
        stack.pop();
        continue;
      }
      const j = next[Math.floor(Math.random() * next.length)];
      seen[j] = 1;
      links[i].push(j);
      links[j].push(i);
      stack.push(j);
    }
    // the flame floods it from the button's cell, a cell a step
    const depth = new Int16Array(n).fill(-1);
    const parent = new Int16Array(n).fill(-1);
    depth[start] = 0;
    const queue = [start];
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q];
      for (const j of links[i]) {
        if (depth[j] >= 0) continue;
        depth[j] = depth[i] + 1;
        parent[j] = i;
        queue.push(j);
      }
    }
    const far = queue[queue.length - 1];
    const deepest = depth[far];
    // each step a little quicker than the last
    const stepAt: number[] = [growMs];
    for (let d = 1; d <= deepest; d++)
      stepAt.push(stepAt[d - 1] + lerp(stepMs, d / Math.max(1, deepest)));
    const reaches = Array.from(depth, (d) => stepAt[Math.max(0, d)]);
    // every blind alley but the far corner holds a bomb
    const ends = queue.filter(
      (i) => i !== start && i !== far && links[i].length === 1,
    );
    const blasts = ends.map((i) => ({
      at: spots[i],
      ms: reaches[i] + 40,
      size: lerp(BLAST, depth[i] / Math.max(1, deepest)),
      shake: lerp(BLAST_SHAKE, depth[i] / Math.max(1, deepest)),
    }));
    const outAt = reaches[far];
    const lockAt = outAt + finalMs;
    const edges = queue.filter((i) => parent[i] >= 0);
    const bombAts = ends.map((i) => () => spots[i]);
    const flame: Point = { x: 0, y: 0 };
    let soundAt = -Infinity;

    const lighting = createBeats(
      [growMs],
      (ms) => ms,
      () => {
        cover!.burst(spots[start], 0.5);
        if (cover!.isLive()) playSwoosh();
      },
    );
    const blowing = createBeats(
      blasts,
      (b) => b.ms,
      (b, _, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(b.shake);
        if (now - soundAt >= SOUND_GAP_MS) {
          soundAt = now;
          playExplosion();
        }
      },
    );
    const opening = createBeats(
      [lockAt],
      (ms) => ms,
      () => cover!.blast(lock),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: lockAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          lighting.tick(ms, now);
          blowing.tick(ms, now);
          opening.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > lockAt + 900) return;
          const grow = easeOut(clamp01(ms / growMs));
          // the cord still unburnt, and the flames running along it
          for (const j of edges) {
            const i = parent[j];
            const from = reaches[i];
            const to = reaches[j];
            if (ms >= to) continue;
            const a = spots[i];
            const b = spots[j];
            if (ms <= from) {
              drawBeam(ctx, a, b, CORD_W, CORD_ALPHA * grow);
              continue;
            }
            const u = (ms - from) / (to - from);
            flame.x = lerp([a.x, b.x], u);
            flame.y = lerp([a.y, b.y], u);
            drawBeam(ctx, flame, b, CORD_W, CORD_ALPHA);
            drawLitFuse(ctx, flame, u, FLAME, now);
          }
          // the last cord out to the lock
          if (ms < lockAt) {
            const u = clamp01((ms - outAt) / finalMs);
            flame.x = lerp([spots[far].x, lock.x], u);
            flame.y = lerp([spots[far].y, lock.y], u);
            drawBeam(ctx, flame, lock, CORD_W, CORD_ALPHA * grow);
            if (u > 0) drawLitFuse(ctx, flame, u, FLAME * 1.3, now);
          }
          for (let k = 0; k < ends.length; k++) {
            const i = ends[k];
            if (ms >= reaches[i] + 40) continue;
            const burn = clamp01((ms - growMs) / (reaches[i] + 40 - growMs));
            drawWispHead(ctx, bombAts[k], ms, now, BOMB * grow, burn);
          }
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
