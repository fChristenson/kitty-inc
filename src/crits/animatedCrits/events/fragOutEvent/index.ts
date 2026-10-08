// the "Frag Out" event (explosion; worker perma tiers): it covers its crit,
// whose click freezes the screen while the clicked floor's button lobs a
// fizzing grenade wisp onto a worker; it goes off in a big white blast, a
// bang and a hard shake, and the worker climbs a perma tier; then its
// fragments fly out in a ring and pop one after another in a crackling
// chain, every pop its own shake; grenade after grenade lands, ever faster,
// and the last throws twice the fragments round one huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "fragOut";
const MAX_WORKERS = 6;
const HIGH = 200;
// FRAGS fragments fly FRAG px out over FLY_MS and pop FRAG_MS apart
const FRAGS = 4;
const FRAG = 100;
const FLY_MS = 120;
const FRAG_MS = 55;
const GRENADE = 0.42;
const SHARD = 0.22;
const FUSE = 16;
const BLAST = 190;
const SMALL = 110;
const HUGE = 300;
const BANG_GAP_MS = 60;
const BLAST_SHAKE: [number, number] = [0.9, 1.4];
const FRAG_SHAKE = 0.6;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  worker: RewardWorker | null;
}

export const forceFragOutEvent = registerWispEvent(
  KEY,
  "Frag Out",
  () => CONFIG.fragOutEvent.chance,
  (floor, context) => {
    const { gapsMs, flightMs, holdMs, mergeMs } = CONFIG.fragOutEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const blasts: Blast[] = [];
    const shards: {
      at: (ms: number) => Point;
      leaves: number;
      pops: number;
    }[] = [];
    let clock = 0;
    const grenades = workers.map((worker, k) => {
      const last = k === workers.length - 1;
      const to = worker.at;
      const ctrl: Point = {
        x: (button.x + to.x) / 2,
        y: Math.min(button.y, to.y) - HIGH,
      };
      const leaves = clock;
      clock += lerp(gapsMs, k / Math.max(1, workers.length - 1));
      const lands = leaves + flightMs;
      blasts.push({
        at: to,
        ms: lands,
        size: last ? HUGE : BLAST,
        shake: lerp(BLAST_SHAKE, k / Math.max(1, workers.length - 1)),
        worker,
      });
      const frags = last ? FRAGS * 2 : FRAGS;
      for (let f = 0; f < frags; f++) {
        const a = (f / frags) * Math.PI * 2 + k;
        const end: Point = {
          x: to.x + Math.cos(a) * FRAG,
          y: to.y + Math.sin(a) * FRAG * 0.8,
        };
        const pops = lands + FLY_MS + f * FRAG_MS * (last ? 0.5 : 1);
        const at: Point = { x: 0, y: 0 };
        shards.push({
          leaves: lands,
          pops,
          at: (ms: number): Point => {
            const u = easeOut(clamp01((ms - lands) / (pops - lands)));
            at.x = lerp([to.x, end.x], u);
            at.y = lerp([to.y, end.y], u);
            return at;
          },
        });
        blasts.push({
          at: end,
          ms: pops,
          size: SMALL,
          shake: FRAG_SHAKE,
          worker: null,
        });
      }
      const at: Point = { x: 0, y: 0 };
      return {
        leaves,
        lands,
        last,
        to,
        at: (ms: number): Point =>
          bezier(button, ctrl, to, clamp01((ms - leaves) / flightMs), at),
      };
    });
    const lastGrenade = grenades[grenades.length - 1];
    const endAt = Math.max(...blasts.map((b) => b.ms));
    let lastBang = -Infinity;

    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (b.worker) {
          cover!.promote(b.worker);
          if (b.at === lastGrenade.to) {
            cover!.blast(b.at);
            return;
          }
        }
        if (!cover!.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
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
        tick: (ms, now) => booming.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (const g of grenades) {
            if (ms < g.leaves || ms >= g.lands) continue;
            drawLitFuse(
              ctx,
              g.at(ms),
              clamp01((ms - g.leaves) / flightMs),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              g.at,
              ms,
              now,
              WISP_SIZE * GRENADE,
              0.6,
              g.leaves,
              g.lands,
            );
          }
          for (const s of shards)
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * SHARD,
              0.9,
              s.leaves,
              s.pops,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
