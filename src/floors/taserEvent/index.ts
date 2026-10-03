// the "Taser" event (lightning; worker perma tiers): it covers its crit,
// whose click freezes the screen while a taser wisp darts out of the
// clicked floor's button to the side of a worker and fires two probe wisps
// into it, crackling wires of lightning trailing back; as they stick the
// wires blaze and the worker crackles with strikes, a bang and a jolt, and
// climbs a perma tier; the taser darts on to the next worker, quicker each
// time, the last zap a huge strike and blast. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../shared/lightning";
import { createBeats } from "../../shared/eventBeats";
import { findRewardWorkers } from "../eventRewards";

const KEY = "taser";
const MAX_WORKERS = 5;
// share of each worker's span spent darting there, then firing the probes
const DART = 0.45;
const FIRE = 0.25;
const SIDE = 110;
const RISE = 50;
const PROBE_SPREAD = 14;
const WIRE_MS = 260;
const TASER = 0.42;
const PROBE = 0.2;
const ZAP_SHAKE: [number, number] = [0.7, 1.4];

interface Probe {
  bolt: Bolt;
  hit: Point;
  at: (ms: number) => Point;
}

export const forceTaserEvent = registerWispEvent(
  KEY,
  "Taser",
  () => CONFIG.taserEvent.chance,
  (floor, context) => {
    const { zapMs, holdMs, mergeMs } = CONFIG.taserEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    let from: Point = button;
    const zaps = workers.map((worker, k) => {
      const span = lerp(zapMs, k / Math.max(1, workers.length - 1));
      const starts = clock;
      const fires = starts + span * DART;
      const sticks = fires + span * FIRE;
      clock = starts + span;
      const side = k % 2 === 0 ? -1 : 1;
      const post: Point = {
        x: worker.at.x + side * SIDE,
        y: worker.at.y - RISE,
      };
      const leg = { from, to: post, starts, fires };
      from = post;
      const probes: Probe[] = [-1, 1].map((d) => {
        const hit: Point = {
          x: worker.at.x,
          y: worker.at.y + d * PROBE_SPREAD,
        };
        const point: Point = { x: 0, y: 0 };
        return {
          hit,
          bolt: createBolt(post, { x: hit.x, y: hit.y }, 1),
          at: (ms: number): Point => {
            const u = easeIn(clamp01((ms - fires) / (sticks - fires)));
            point.x = lerp([post.x, hit.x], u);
            point.y = lerp([post.y, hit.y], u);
            return point;
          },
        };
      });
      return {
        worker,
        leg,
        probes,
        starts,
        fires,
        sticks,
        last: k === workers.length - 1,
      };
    });
    const last = zaps[zaps.length - 1];
    const endAt = last.sticks + WIRE_MS;
    const taserAt: Point = { x: 0, y: 0 };
    const taser = (ms: number): Point => {
      let leg = zaps[0].leg;
      for (const z of zaps) if (ms >= z.starts) leg = z.leg;
      const u = easeOut(clamp01((ms - leg.starts) / (leg.fires - leg.starts)));
      taserAt.x = lerp([leg.from.x, leg.to.x], u);
      taserAt.y = lerp([leg.from.y, leg.to.y], u);
      return taserAt;
    };

    const zapping = createBeats(
      zaps,
      (z) => z.sticks,
      (z, k) => {
        cover!.promote(z.worker);
        if (z.last) {
          cover!.blast(z.worker.at);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(z.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(ZAP_SHAKE, k / Math.max(1, zaps.length - 1)));
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
        tick: (ms, now) => zapping.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const z of zaps) {
            if (ms < z.fires || ms > z.sticks + WIRE_MS) continue;
            const stuck = ms >= z.sticks;
            const t = stuck ? (ms - z.sticks) / WIRE_MS : 0;
            for (const p of z.probes) {
              const tip = p.at(ms);
              p.bolt.to.x = tip.x;
              p.bolt.to.y = tip.y;
              drawBolt(
                ctx,
                p.bolt,
                stuck ? 1 - t : 0.7,
                stuck ? (z.last ? 1.4 : 0.8) : 0.35,
              );
              drawWispBetween(
                ctx,
                p.at,
                ms,
                now,
                WISP_SIZE * PROBE,
                1,
                z.fires,
                z.sticks + WIRE_MS,
              );
            }
            if (stuck)
              drawStrike(
                ctx,
                z.worker.at,
                (1 - t) * (0.6 + 0.4 * Math.random()),
                z.last ? 3 : 1.3,
                now,
              );
          }
          drawWispBetween(
            ctx,
            taser,
            ms,
            now,
            WISP_SIZE * TASER,
            0.6,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
