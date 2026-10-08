// the "Hair Raiser" event (lightning; worker perma tiers): it covers its
// crit, whose click freezes the screen while a comb wisp sweeps back and
// forth over the workers' heads, faster every pass, and crackling bolts of
// static stand up off every head it combs, taller with each pass, like hair
// standing on end; then one after another every worker discharges, a bolt
// cracking down out of the sky onto it in a blinding flash and a jolt that
// lights it up a perma tier, the last in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { alongRoute } from "../../../../shared/curves";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "hairRaiser";
const MAX_WORKERS = 6;
const PASSES = 3;
const HEAD = 34;
const HAIRS = [-0.45, 0, 0.45];
const HAIR = [26, 54, 90];
const GROW_MS = 140;
const COMB = 0.45;
const ZAP_MS = 160;
const PASS_SHAKE = 0.35;
const ZAP_SHAKE: [number, number] = [0.6, 1.3];

interface Head {
  worker: RewardWorker;
  root: Point;
  tips: Point[];
  hairs: Bolt[];
  combed: number[];
  zap: Bolt;
  zaps: number;
}

export const forceHairRaiserEvent = registerWispEvent(
  KEY,
  "Hair Raiser",
  () => CONFIG.hairRaiserEvent.chance,
  (floor, context, area) => {
    const { passesMs, zapsMs, holdMs, mergeMs } = CONFIG.hairRaiserEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const roots = workers.map((w) => ({ x: w.at.x, y: w.at.y - HEAD }));
    const route: Point[] = [
      { x: area.left - 30, y: roots[0].y - 20 },
      ...roots.map((r) => ({ x: r.x, y: r.y - 20 })),
      { x: area.right + 30, y: roots[roots.length - 1].y - 20 },
    ];
    let clock = 0;
    const passes = Array.from({ length: PASSES }, (_, p) => {
      const starts = clock;
      clock += lerp(passesMs, p / (PASSES - 1));
      return { starts, ends: clock, forward: p % 2 === 0 };
    });
    // the comb crosses head k at its share of the way along the route
    const crossAt = (p: number, k: number) => {
      const pass = passes[p];
      const u = (k + 1) / (workers.length + 1);
      return lerp([pass.starts, pass.ends], pass.forward ? u : 1 - u);
    };
    let zapClock = clock;
    const heads: Head[] = workers.map((worker, k) => {
      const root = roots[k];
      const tips = HAIRS.map(() => ({
        x: root.x,
        y: root.y - HAIR[HAIR.length - 1],
      }));
      zapClock += lerp(zapsMs, k / Math.max(1, workers.length - 1));
      return {
        worker,
        root,
        tips,
        hairs: tips.map((tip) => createBolt(root, tip, 0)),
        combed: passes.map((_, p) => crossAt(p, k)),
        zap: createBolt(
          { x: root.x + (Math.random() - 0.5) * 120, y: area.top - 20 },
          worker.at,
          2,
        ),
        zaps: zapClock,
      };
    });
    const last = heads[heads.length - 1];
    const endAt = last.zaps + ZAP_MS;
    const comb: Point = { x: 0, y: 0 };
    const combAt = (ms: number): Point => {
      let pass = passes[0];
      for (const p of passes) if (ms >= p.starts) pass = p;
      const u = clamp01((ms - pass.starts) / (pass.ends - pass.starts));
      return alongRoute(route, pass.forward ? u : 1 - u, comb);
    };
    const combings = heads.flatMap((h) =>
      h.combed.map((ms) => ({ head: h, ms })),
    );

    let crackled = -Infinity;
    const combing = createBeats(
      combings,
      (c) => c.ms,
      (c) => {
        if (c.ms - crackled < 60 || !cover!.isLive()) return;
        crackled = c.ms;
        playBloop();
        shakeScreen(PASS_SHAKE);
      },
    );
    const zapping = createBeats(
      heads,
      (h) => h.zaps,
      (h, k) => {
        cover!.promote(h.worker);
        if (h === last) {
          cover!.blast(h.worker.at);
          return;
        }
        cover!.burst(h.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(ZAP_SHAKE, k / Math.max(1, heads.length - 1)));
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
          combing.tick(ms, now);
          zapping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          drawWispBetween(
            ctx,
            combAt,
            ms,
            now,
            WISP_SIZE * COMB,
            0.8,
            0,
            clock,
          );
          for (const h of heads) {
            if (ms < h.zaps) {
              // taller with every pass of the comb
              let length = 0;
              for (let p = 0; p < PASSES; p++) {
                const t = (ms - h.combed[p]) / GROW_MS;
                if (t > 0)
                  length = lerp(
                    [p ? HAIR[p - 1] : 0, HAIR[p]],
                    easeOutBack(clamp01(t)),
                  );
              }
              if (length <= 0) continue;
              for (let i = 0; i < HAIRS.length; i++) {
                const a =
                  -Math.PI / 2 + HAIRS[i] + Math.sin(ms * 0.03 + i) * 0.08;
                h.tips[i].x = h.root.x + Math.cos(a) * length;
                h.tips[i].y = h.root.y + Math.sin(a) * length;
                drawBolt(ctx, h.hairs[i], 0.6 + 0.4 * Math.random(), 0.35);
              }
              continue;
            }
            const t = (ms - h.zaps) / ZAP_MS;
            if (t >= 1) continue;
            drawBolt(ctx, h.zap, 1 - t, 1.2);
            drawStrike(ctx, h.worker.at, 1 - t, 1.2, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
