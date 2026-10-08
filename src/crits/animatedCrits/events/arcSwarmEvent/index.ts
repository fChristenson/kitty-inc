// the "Arc Swarm" event (lightning; worker perma tiers): it covers its
// crit, whose click freezes the screen while a swarm of spark wisps whirls
// round the middle of the screen, every spark crackling to its nearest
// neighbours so a live web of lightning keeps snapping and re-forming
// between them as they weave; one after another a spark breaks off and
// dives onto a worker, still trailing its arc, striking it up a perma tier
// with a crack and a jolt, the web shrinking, quicker each time, until the
// last sparks dive together in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "arcSwarm";
const MAX_WORKERS = 5;
const EXTRA = 2;
const SPREAD_X = 0.32;
const SPREAD_Y = 0.2;
const DIVE_MS = 260;
const STRIKE_MS = 160;
const SPARK = 0.35;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Spark {
  worker: RewardWorker;
  dives: number;
  lands: number;
  // its weave: a Lissajous loop round the middle
  fx: number;
  fy: number;
  px: number;
  py: number;
  // where it is this frame, which the bolts point at
  now: Point;
  live: boolean;
}

export const forceArcSwarmEvent = registerWispEvent(
  KEY,
  "Arc Swarm",
  () => CONFIG.arcSwarmEvent.chance,
  (floor, context, area) => {
    const { swarmMs, divesMs, holdMs, mergeMs } = CONFIG.arcSwarmEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const centre: Point = {
      x: area.left + width / 2,
      y: area.top + height * 0.4,
    };
    let clock: number = swarmMs;
    const count = workers.length + EXTRA;
    const sparks: Spark[] = Array.from({ length: count }, (_, i) => {
      // the extras dive with the last worker's spark
      const worker = workers[Math.min(i, workers.length - 1)];
      const dives = clock;
      if (i < workers.length - 1)
        clock += lerp(divesMs, i / Math.max(1, workers.length - 2));
      return {
        worker,
        dives,
        lands: dives + DIVE_MS,
        fx: 1.3 + Math.random() * 1.6,
        fy: 1.1 + Math.random() * 1.8,
        px: Math.random() * Math.PI * 2,
        py: Math.random() * Math.PI * 2,
        now: { x: 0, y: 0 },
        live: false,
      };
    });
    const weave = (s: Spark, ms: number, into: Point): Point => {
      const t = Math.max(0, ms) / 1000;
      // gathering in from the edges as the swarm forms
      const grow = 0.4 + 0.6 * clamp01(ms / 300);
      into.x =
        centre.x +
        Math.sin(t * s.fx * Math.PI + s.px) * width * SPREAD_X * grow;
      into.y =
        centre.y +
        Math.sin(t * s.fy * Math.PI + s.py) * height * SPREAD_Y * grow;
      return into;
    };
    const ats = sparks.map((s) => {
      const spot: Point = { x: 0, y: 0 };
      const from = { ...weave(s, s.dives, spot) };
      const bend: Point = {
        x: from.x,
        y: Math.min(from.y, s.worker.at.y) - 120,
      };
      return (ms: number): Point | null => {
        if (ms > s.lands) return null;
        if (ms < s.dives) return weave(s, ms, spot);
        const u = easeIn((ms - s.dives) / DIVE_MS);
        return bezier(from, bend, s.worker.at, u, spot);
      };
    });
    // a bolt for every pair, drawn only while it's an edge of the web
    const bolts: Bolt[][] = sparks.map((a, i) =>
      sparks.map((b, j) => (j > i ? createBolt(a.now, b.now, 0) : null!)),
    );
    const inTree = new Uint8Array(count);
    const best = new Float64Array(count);
    const link = new Int32Array(count);
    const last = sparks[sparks.length - 1];
    const landings = sparks.slice(0, workers.length);
    const endAt = last.lands + STRIKE_MS;

    const landing = createBeats(
      landings,
      (s) => s.lands,
      (s, k) => {
        cover!.promote(s.worker);
        if (k === landings.length - 1) {
          cover!.blast(s.worker.at);
          return;
        }
        cover!.burst(s.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, landings.length - 1)));
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
        tick: (ms, now) => landing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          let alive = 0;
          for (let i = 0; i < count; i++) {
            const at = ats[i](ms);
            sparks[i].live = at !== null;
            if (!at) continue;
            sparks[i].now.x = at.x;
            sparks[i].now.y = at.y;
            alive++;
          }
          // the web: each frame's minimum spanning tree over the live sparks
          if (alive > 1) {
            inTree.fill(0);
            best.fill(Infinity);
            let first = 0;
            while (!sparks[first].live) first++;
            best[first] = 0;
            link[first] = -1;
            for (let n = 0; n < alive; n++) {
              let pick = -1;
              for (let i = 0; i < count; i++)
                if (
                  sparks[i].live &&
                  !inTree[i] &&
                  (pick < 0 || best[i] < best[pick])
                )
                  pick = i;
              inTree[pick] = 1;
              if (link[pick] >= 0) {
                const a = Math.min(pick, link[pick]);
                const b = Math.max(pick, link[pick]);
                drawBolt(ctx, bolts[a][b], 0.6 + 0.4 * Math.random(), 0.4);
              }
              for (let i = 0; i < count; i++) {
                if (!sparks[i].live || inTree[i]) continue;
                const d = Math.hypot(
                  sparks[i].now.x - sparks[pick].now.x,
                  sparks[i].now.y - sparks[pick].now.y,
                );
                if (d < best[i]) {
                  best[i] = d;
                  link[i] = pick;
                }
              }
            }
          }
          for (const s of landings) {
            const t = (ms - s.lands) / STRIKE_MS;
            if (t >= 0 && t < 1) drawStrike(ctx, s.worker.at, 1 - t, 0.7, now);
          }
          for (let i = 0; i < count; i++)
            drawWisp(ctx, ats[i], ms, now, WISP_SIZE * SPARK, 1);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
