// the "Shortest Path" event (experiment: Dijkstra's shortest paths; worker
// perma tiers): it covers its crit, whose click freezes the screen while a
// faint road map of glitter junctions and thin beams fades in over it, the
// clicked floor's button and the workers in view wired into it; a front of
// light floods out from the button along every road at once, lighting each
// junction as it gets there first; the moment it reaches a worker, the
// shortest way back to the button blazes white-hot and a wisp races down it
// onto the worker, which jumps a perma tier with a jolt, the last in a huge
// blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { stampGlimmer } from "../../../../shared/twinkle";
import { measure, pointAlong } from "../../cashFlow";
import { findRewardWorkers } from "../../eventRewards";
import { getButtonCenter } from "../../../../floors/upgradeButton";

const KEY = "shortestPath";
const COLS = 5;
const ROWS = 6;
const MAX_WORKERS = 8;
// px from the screen's sides and top the junctions keep clear of, and how
// far (share of a cell) each strays from the grid
const MARGIN = 90;
const TOP = 200;
const JITTER = 0.4;
const DIAGONALS = 0.5;
// junctions the button and each worker are wired to
const LINKS = 2;
const ROAD_W = 4;
const ROAD_ALPHA = 0.18;
const LIT_W = 9;
const LIT_ALPHA = 0.75;
const PATH_W = 22;
const PATH_FADE_MS = 250;
const JUNCTION = 12;
const RIDER = WISP_SIZE * 0.7;
const REACH_SHAKE = 0.3;
const START_SHAKE = 0.6;
const HIT_SHAKE: [number, number] = [0.5, 1.1];

export const forceShortestPathEvent = registerWispEvent(
  KEY,
  "Shortest Path",
  () => CONFIG.shortestPathEvent.chance,
  (floor, context, area) => {
    const { appearMs, waveMs, rideMs, holdMs, mergeMs } =
      CONFIG.shortestPathEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    // the road map: a jittered grid of junctions over the screen
    const nodes: Point[] = [];
    const left = area.left + MARGIN;
    const top = area.top + TOP;
    const cellW = (area.right - MARGIN - left) / (COLS - 1);
    const cellH = (area.bottom - MARGIN - top) / (ROWS - 1);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        nodes.push({
          x: left + c * cellW + (Math.random() - 0.5) * cellW * JITTER,
          y: top + r * cellH + (Math.random() - 0.5) * cellH * JITTER,
        });
    const edges: [number, number][] = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const k = r * COLS + c;
        if (c < COLS - 1) edges.push([k, k + 1]);
        if (r < ROWS - 1) edges.push([k, k + COLS]);
        if (r < ROWS - 1 && Math.random() < DIAGONALS) {
          const side = Math.random() < 0.5 ? -1 : 1;
          if (c + side >= 0 && c + side < COLS)
            edges.push([k, k + COLS + side]);
        }
      }
    const grid = nodes.length;
    const wire = (at: Point): number => {
      const k = nodes.length;
      nodes.push(at);
      Array.from({ length: grid }, (_, i) => i)
        .sort(
          (a, b) =>
            Math.hypot(nodes[a].x - at.x, nodes[a].y - at.y) -
            Math.hypot(nodes[b].x - at.x, nodes[b].y - at.y),
        )
        .slice(0, LINKS)
        .forEach((i) => edges.push([k, i]));
      return k;
    };
    const source = wire(getButtonCenter(context.isGroundFloor));
    const targets = workers.map((w) => wire(w.at));
    const lengths = edges.map(([a, b]) =>
      Math.hypot(nodes[b].x - nodes[a].x, nodes[b].y - nodes[a].y),
    );
    // Dijkstra from the button
    const dist = nodes.map(() => Infinity);
    const prev = nodes.map(() => -1);
    const done = nodes.map(() => false);
    dist[source] = 0;
    for (;;) {
      let u = -1;
      for (let i = 0; i < nodes.length; i++)
        if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || dist[u] === Infinity) break;
      done[u] = true;
      edges.forEach(([a, b], e) => {
        const v = a === u ? b : b === u ? a : -1;
        if (v < 0 || dist[u] + lengths[e] >= dist[v]) return;
        dist[v] = dist[u] + lengths[e];
        prev[v] = u;
      });
    }
    // the front floods out at a speed that reaches the farthest worker by
    // waveMs
    const far = Math.max(1, ...targets.map((t) => dist[t]));
    const speed = far / waveMs;
    const reachAt = (node: number) => appearMs + dist[node] / speed;
    const runs = targets.map((target, w) => {
      const line: Point[] = [];
      for (let k = target; k >= 0; k = prev[k]) line.unshift(nodes[k]);
      const along = measure(line);
      const leaves = reachAt(target);
      const spot = { x: 0, y: 0 };
      return {
        worker: workers[w],
        line,
        leaves,
        arrives: leaves + rideMs,
        at: (ms: number): Point | null =>
          ms > leaves + rideMs
            ? null
            : pointAlong(
                line,
                along,
                easeIn(clamp01((ms - leaves) / rideMs)),
                spot,
              ),
      };
    });
    const last = runs.reduce((a, b) => (b.arrives > a.arrives ? b : a));
    const endAt = last.arrives;
    const tip: Point = { x: 0, y: 0 };
    // the road from p toward q lit share f of the way
    const litFrom = (
      ctx: CanvasRenderingContext2D,
      p: number,
      q: number,
      f: number,
      fade: number,
    ) => {
      tip.x = lerp([nodes[p].x, nodes[q].x], f);
      tip.y = lerp([nodes[p].y, nodes[q].y], f);
      drawBeam(ctx, nodes[p], tip, LIT_W, LIT_ALPHA * fade);
    };

    const starting = createBeats(
      [appearMs],
      (ms) => ms,
      () => {
        cover!.burst(nodes[source], 0.5);
        if (cover!.isLive()) shakeScreen(START_SHAKE);
      },
    );
    const reaching = createBeats(
      runs,
      (r) => r.leaves,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(REACH_SHAKE);
      },
    );
    const tagging = createBeats(
      runs,
      (r) => r.arrives,
      (r, k) => {
        cover!.promote(r.worker);
        if (r === last) {
          cover!.blast(r.worker.at);
          return;
        }
        cover!.burst(r.worker.at, 0.45);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, runs.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          starting.tick(ms, now);
          reaching.tick(ms, now);
          tagging.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 600) return;
          const fade =
            easeOut(clamp01(ms / appearMs)) *
            (1 - clamp01((ms - endAt) / PATH_FADE_MS));
          if (fade <= 0) return;
          const front = Math.max(0, (ms - appearMs) * speed);
          // the roads, lit in from either end as the front gets there
          for (let e = 0; e < edges.length; e++) {
            const [a, b] = edges[e];
            const length = lengths[e];
            const fromA = clamp01((front - dist[a]) / length);
            const fromB = clamp01((front - dist[b]) / length);
            if (fromA + fromB >= 1) {
              drawBeam(ctx, nodes[a], nodes[b], LIT_W, LIT_ALPHA * fade);
              continue;
            }
            drawBeam(ctx, nodes[a], nodes[b], ROAD_W, ROAD_ALPHA * fade);
            if (fromA > 0) litFrom(ctx, a, b, fromA, fade);
            if (fromB > 0) litFrom(ctx, b, a, fromB, fade);
          }
          // each worker's shortest way back, blazing as its wisp races down it
          for (const run of runs) {
            if (ms < run.leaves) continue;
            const a =
              easeOut(clamp01((ms - run.leaves) / 80)) *
              (1 - clamp01((ms - run.arrives) / PATH_FADE_MS));
            if (a <= 0) continue;
            for (let k = 1; k < run.line.length; k++)
              drawBeam(ctx, run.line[k - 1], run.line[k], PATH_W, a);
          }
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = fade;
          for (let i = 0; i < nodes.length; i++) {
            const lit = front >= dist[i];
            const pop = lit
              ? 1 + 0.8 * (1 - clamp01((front - dist[i]) / (speed * 150)))
              : 0.5;
            stampGlimmer(
              ctx,
              nodes[i].x,
              nodes[i].y,
              JUNCTION * pop,
              0,
              lit ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
          for (const run of runs)
            drawWispBetween(
              ctx,
              run.at,
              ms,
              now,
              RIDER,
              1,
              run.leaves,
              run.arrives,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
