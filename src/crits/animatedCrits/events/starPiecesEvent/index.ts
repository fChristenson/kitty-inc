// the "Star Pieces" event (assemble; worker perma tiers): it covers its
// crit, whose click freezes the screen while ten pieces of a giant gold star
// fly in from all round, turning, each locking into place with a clunk and
// a jolt, quicker and quicker; complete, it blazes with a bang and flies
// apart, every piece diving onto a worker in quick fire, striking it up a
// perma tier, the last in a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBoostEventStream } from "../../../../sound";
import {
  drawAssembly,
  fanPieces,
  planAssemble,
} from "../../../../shared/animationStyles/assemble";
import { SHAPES } from "../../../../shared/animationStyles/drawing";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  playBarExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { findRewardWorkers } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "starPieces";
const MAX_WORKERS = 8;
const PIECES = 10;
// the star: SIZE of the screen's width from its middle to a tip, HIGH of
// the screen's height down; the pieces fly in from REACH of its width out
const SIZE = 0.3;
const HIGH = 0.42;
const REACH = 1.2;
const FIRST_MS = 0;
const LOCK_SHAKE: [number, number] = [0.4, 1.2];
// complete: the blaze, BLAZE_DELAY after the last lock
const BLAZE_DELAY_MS = 120;
const BLAZE_GLOW = 1.4;
const BLAZE_MS = 400;
const BLAZE_BLAST = 240;
const BLAZE_SHAKE = 2.6;
// the dives onto the workers, bowed LIFT over the higher end
const LIFT = 160;
const DIVER = 1.1;
const DIVE_SHAKE: [number, number] = [0.7, 1.3];
const SOUND_GAP_MS = 55;
const WHITE = fadeStops(COLOR.white);

export const forceStarPiecesEvent = registerWispEvent(
  KEY,
  "Star Pieces",
  () => CONFIG.starPiecesEvent.chance,
  (floor, context, area) => {
    const { assembleMs, diveMs, diveGapMs, holdMs, mergeMs } =
      CONFIG.starPiecesEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const width = area.right - area.left;
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * HIGH,
    };
    const size = width * SIZE;
    const assembly = planAssemble(
      fanPieces(SHAPES.star[0], centre, size, PIECES),
      centre,
      size,
      FIRST_MS,
      FIRST_MS + assembleMs,
      width * REACH,
    );
    const blazeAt = assembly.doneMs + BLAZE_DELAY_MS;
    const dives = workers.map((worker, k) => {
      const from = assembly.pieces[k % PIECES].home;
      const lands = blazeAt + diveMs + k * diveGapMs;
      const into: Point = { x: 0, y: 0 };
      const top = Math.min(from.y, worker.at.y) - LIFT;
      return {
        worker,
        lands,
        path: (ms: number): Point | null => {
          if (ms < blazeAt || ms > lands) return null;
          const t = clamp01((ms - blazeAt) / (lands - blazeAt)) ** 1.5;
          const u = 1 - t;
          into.x =
            u * u * from.x +
            2 * u * t * ((from.x + worker.at.x) / 2) +
            t * t * worker.at.x;
          into.y = u * u * from.y + 2 * u * t * top + t * t * worker.at.y;
          return into;
        },
      };
    });
    const last = dives[dives.length - 1];
    const endMs = Math.max(last.lands, blazeAt) + DETONATION_MS;

    let soundAt = -Infinity;
    const bang = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const locking = createBeats(
      assembly.pieces,
      (p) => p.lockMs,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBarExplosion(lerp([0.8, 1.2], k / (PIECES - 1)));
        shakeScreen(lerp(LOCK_SHAKE, k / (PIECES - 1)));
      },
    );
    const blazing = createBeats(
      [blazeAt],
      (ms) => ms,
      (_, __, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(BLAZE_SHAKE);
        bang(now);
      },
    );
    const diving = createBeats(
      dives,
      (d) => d.lands,
      (d, k, now) => {
        cover!.promote(d.worker);
        if (d === last) {
          cover!.blast(d.worker.at);
          return;
        }
        cover!.burst(d.worker.at, 0.6);
        if (!cover!.isLive()) return;
        bang(now);
        shakeScreen(lerp(DIVE_SHAKE, k / Math.max(1, dives.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: last.lands + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          locking.tick(ms, now);
          blazing.tick(ms, now);
          diving.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          drawAssembly(ctx, assembly, ms, blazeAt);
          const blaze = ms >= blazeAt ? 1 - (ms - blazeAt) / BLAZE_MS : 0;
          if (blaze > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = blaze;
            drawGlow(ctx, WHITE, centre.x, centre.y, size * BLAZE_GLOW);
            ctx.restore();
          }
          drawDetonation(ctx, centre, ms - blazeAt, BLAZE_BLAST, now);
          for (const d of dives)
            drawWispBetween(
              ctx,
              d.path,
              ms,
              now,
              WISP_SIZE * DIVER,
              0.6,
              blazeAt,
              d.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
