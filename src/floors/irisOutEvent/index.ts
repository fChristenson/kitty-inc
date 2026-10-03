// the "Iris Out" event (experiment: a cartoon iris wipe; worker perma
// tiers): it covers its crit, whose click freezes the screen and the whole
// view irises shut to a small circle of light round a worker, darkness
// everywhere else; the circle punches open and shut on it with a bang and a
// jolt as it climbs a perma tier, then the iris jumps to the next worker,
// quicker each time; after the last it bursts wide open in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  easeOutBack,
  lerp,
} from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawWhiteBurst } from "../../shared/eventFx";
import { findRewardWorkers, type RewardWorker } from "../eventRewards";

const KEY = "irisOut";
const MAX_WORKERS = 5;
const RADIUS = 120;
const PUNCH = 0.35;
const RIM = 10;
const BURST_MS = 260;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Shot {
  worker: RewardWorker;
  moves: number;
  lands: number;
  hits: number;
  from: Point;
}

export const forceIrisOutEvent = registerWispEvent(
  KEY,
  "Iris Out",
  () => CONFIG.irisOutEvent.chance,
  (floor, context, area) => {
    const { closeMs, holdsMs, moveMs, openMs, holdMs, mergeMs } =
      CONFIG.irisOutEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const wide = Math.hypot(width, height);
    let clock = 0;
    let from: Point = workers[0].at;
    const shots: Shot[] = workers.map((worker, k) => {
      const moves = clock;
      const lands = moves + (k === 0 ? closeMs : moveMs);
      const hits =
        lands + lerp(holdsMs, k / Math.max(1, workers.length - 1)) * 0.4;
      clock = lands + lerp(holdsMs, k / Math.max(1, workers.length - 1));
      const shot = { worker, moves, lands, hits, from };
      from = worker.at;
      return shot;
    });
    const opensAt = clock;
    const endAt = opensAt + openMs;
    const last = shots[shots.length - 1];
    const hole = { x: 0, y: 0, r: wide };
    const iris = (ms: number) => {
      if (ms >= opensAt) {
        hole.x = last.worker.at.x;
        hole.y = last.worker.at.y;
        hole.r = lerp([RADIUS, wide], easeIn(clamp01((ms - opensAt) / openMs)));
        return hole;
      }
      let s = shots[0];
      for (const shot of shots) if (ms >= shot.moves) s = shot;
      const u = clamp01((ms - s.moves) / Math.max(1, s.lands - s.moves));
      if (s === shots[0]) {
        hole.x = s.worker.at.x;
        hole.y = s.worker.at.y;
        hole.r = lerp([wide, RADIUS], easeOut(u));
      } else {
        hole.x = lerp([s.from.x, s.worker.at.x], easeOutBack(u));
        hole.y = lerp([s.from.y, s.worker.at.y], easeOutBack(u));
        hole.r = RADIUS * (1 + 0.25 * Math.sin(Math.PI * u));
      }
      // the punch: the circle snaps open on the hit and shuts again
      const p = (ms - s.hits) / BURST_MS;
      if (p > 0 && p < 1) hole.r *= 1 + PUNCH * Math.sin(Math.PI * p);
      return hole;
    };

    const hitting = createBeats(
      shots,
      (s) => s.hits,
      (s, k) => {
        cover!.promote(s.worker);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, shots.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(last.worker.at),
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
          hitting.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms) => {
          if (ms >= endAt) return;
          for (const s of shots) {
            const t = (ms - s.hits) / BURST_MS;
            if (t > 0 && t < 1)
              drawWhiteBurst(ctx, s.worker.at.x, s.worker.at.y, t, 0.5);
          }
          const h = iris(ms);
          ctx.save();
          ctx.beginPath();
          ctx.rect(left, top, width, height);
          ctx.moveTo(h.x + h.r, h.y);
          ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2, true);
          ctx.fillStyle = COLOR.black;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
          ctx.strokeStyle = COLOR.heavenlyGold;
          ctx.lineWidth = RIM;
          ctx.stroke();
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
