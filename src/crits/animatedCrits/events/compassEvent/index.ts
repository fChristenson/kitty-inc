// the "Compass" event (beam; worker perma tiers): it covers its crit, whose
// click freezes the screen while a compass of two blazing beams plants its
// point on a worker and swings its other leg round, scribing a circle of
// light about them; the moment the circle closes it cinches tight onto the
// worker in a flare, a crack and a jolt as they climb a perma tier, and the
// compass hops to the next worker, swinging quicker each time, the last in a
// huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawGlitterLight, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "compass";
const MAX_WORKERS = 5;
const RADIUS = 130;
// the hinge stands this share of the radius off the legs' midpoint
const HINGE = 0.55;
const LEG = 12;
const ARC = 7;
const SEGMENTS = 28;
const STEP = (Math.PI * 2) / SEGMENTS;
const OPEN_MS = 120;
const CINCH_MS = 100;
const FLARE_MS = 260;
const START = -Math.PI / 2;
const CINCH_SHAKE: [number, number] = [0.5, 1.3];

interface Scribe {
  worker: RewardWorker;
  opens: number;
  sweeps: number;
  cinches: number;
  done: number;
}

export const forceCompassEvent = registerWispEvent(
  KEY,
  "Compass",
  () => CONFIG.compassEvent.chance,
  (floor, context) => {
    const { sweepsMs, holdMs, mergeMs } = CONFIG.compassEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    let clock = 0;
    const scribes: Scribe[] = workers.map((worker, k) => {
      const opens = clock;
      const sweeps = opens + OPEN_MS;
      const cinches =
        sweeps + lerp(sweepsMs, k / Math.max(1, workers.length - 1));
      const done = cinches + CINCH_MS;
      clock = done;
      return { worker, opens, sweeps, cinches, done };
    });
    const last = scribes[scribes.length - 1];
    const endAt = last.done;
    const pivot: Point = { x: 0, y: 0 };
    const pencil: Point = { x: 0, y: 0 };
    const hinge: Point = { x: 0, y: 0 };
    const from: Point = { x: 0, y: 0 };
    const to: Point = { x: 0, y: 0 };

    const cinching = createBeats(
      scribes,
      (s) => s.done,
      (s, k) => {
        cover!.promote(s.worker);
        if (s === last) {
          cover!.blast(s.worker.at);
          return;
        }
        cover!.burst(s.worker.at, 0.55);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CINCH_SHAKE, k / Math.max(1, scribes.length - 1)));
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
        tick: (ms, now) => cinching.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          for (let k = 0; k < scribes.length; k++) {
            const s = scribes[k];
            const since = ms - s.done;
            if (since >= 0 && since < FLARE_MS)
              drawBeamFlare(ctx, s.worker.at, 40, 1 - since / FLARE_MS, now);
          }
          if (ms < 0 || ms > endAt) return;
          let k = 0;
          while (k < scribes.length - 1 && ms >= scribes[k].done) k++;
          const s = scribes[k];
          const prev = scribes[k - 1];
          // hopping over from the last worker as its legs spring open
          const open = smoothstep(clamp01((ms - s.opens) / OPEN_MS));
          pivot.x = prev
            ? lerp([prev.worker.at.x, s.worker.at.x], open)
            : s.worker.at.x;
          pivot.y = prev
            ? lerp([prev.worker.at.y, s.worker.at.y], open)
            : s.worker.at.y;
          const swept =
            Math.PI *
            2 *
            easeIn(clamp01((ms - s.sweeps) / (s.cinches - s.sweeps)));
          const cinch = easeOut(clamp01((ms - s.cinches) / CINCH_MS));
          const radius = RADIUS * easeOut(open) * (1 - cinch);
          const angle = START + swept;
          pencil.x = pivot.x + Math.cos(angle) * radius;
          pencil.y = pivot.y + Math.sin(angle) * radius;
          hinge.x = (pivot.x + pencil.x) / 2 - Math.sin(angle) * radius * HINGE;
          hinge.y = (pivot.y + pencil.y) / 2 + Math.cos(angle) * radius * HINGE;
          // the circle scribed so far, closing in as it cinches
          const arc = cinch > 0 ? Math.PI * 2 : swept;
          const alpha = 0.9 + 0.1 * cinch;
          for (let a = 0; a < arc; a += STEP) {
            const b = Math.min(arc, a + STEP);
            from.x = pivot.x + Math.cos(START + a) * radius;
            from.y = pivot.y + Math.sin(START + a) * radius;
            to.x = pivot.x + Math.cos(START + b) * radius;
            to.y = pivot.y + Math.sin(START + b) * radius;
            drawBeam(ctx, from, to, ARC * (1 + cinch), alpha);
          }
          drawBeam(ctx, hinge, pivot, LEG, 0.95);
          drawBeam(ctx, hinge, pencil, LEG, 0.95);
          drawBeamFlare(ctx, pencil, 14, 0.9, now);
          drawGlitterLight(ctx, hinge.x, hinge.y, 16, 7, 1, now);
          drawGlitterLight(ctx, pivot.x, pivot.y, 12, 11, 1, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
