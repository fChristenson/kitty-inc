// the "Trident" event (lightning; worker perma tiers): it covers its crit,
// whose click freezes the screen while a great bolt cracks down out of the
// sky and splits into three prongs like a trident, each spearing a worker
// in view in a blinding crack, a bang and a jolt that lights it up a perma
// tier; volley after volley, ever faster and harder, until every worker in
// view is struck, the last volley in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";
import type { Point } from "../../../../shared/wisp";

const KEY = "trident";
const MAX_WORKERS = 9;
const PRONGS = 3;
const MIN_VOLLEYS = 3;
// the shaft comes down from SKY px over the screen to a fork FORK px over
// its highest prong's worker
const SKY = 60;
const FORK = 140;
const BOLT_MS = 220;
const VOLLEY_SHAKE: [number, number] = [1, 1.8];

export const forceTridentEvent = registerWispEvent(
  KEY,
  "Trident",
  () => CONFIG.tridentEvent.chance,
  (floor, context, area) => {
    const { volleysMs, holdMs, mergeMs } = CONFIG.tridentEvent;
    const workers = findRewardWorkers(floor, context)
      .sort((a, b) => a.at.x - b.at.x)
      .slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    // workers grouped into volleys of three neighbours
    const groups: RewardWorker[][] = [];
    for (let i = 0; i < workers.length; i += PRONGS)
      groups.push(workers.slice(i, i + PRONGS));
    let clock = 0;
    // at least MIN_VOLLEYS, striking the same workers again if there are few
    const count = Math.max(MIN_VOLLEYS, groups.length);
    const volleys = Array.from({ length: count }, (_, k) => {
      const group = groups[k % groups.length];
      clock += lerp(volleysMs, k / Math.max(1, count - 1));
      const cx = group.reduce((s, w) => s + w.at.x, 0) / group.length;
      const fork: Point = {
        x: cx,
        y: Math.min(...group.map((w) => w.at.y)) - FORK,
      };
      return {
        group,
        at: clock,
        fork,
        shaft: createBolt(
          { x: cx + (Math.random() * 2 - 1) * 60, y: area.top - SKY },
          fork,
          1,
        ),
        prongs: group.map((w): Bolt => createBolt(fork, w.at, 0)),
      };
    });
    const endAt = clock;

    const striking = createBeats(
      volleys,
      (v) => v.at,
      (v, k) => {
        for (const w of v.group) cover!.promote(w);
        if (k === volleys.length - 1) {
          cover!.blast(v.fork);
          return;
        }
        for (const w of v.group) cover!.burst(w.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(VOLLEY_SHAKE, k / Math.max(1, volleys.length - 1)));
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
        tick: (ms, now) => striking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + BOLT_MS) return;
          for (const v of volleys) {
            const t = (ms - v.at) / BOLT_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, v.shaft, 1 - t, 1.6);
            drawStrike(ctx, v.fork, 1 - t, 1, now);
            v.prongs.forEach((p, i) => {
              drawBolt(ctx, p, 1 - t, 1);
              drawStrike(ctx, v.group[i].at, 1 - t, 1.2, now);
            });
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
