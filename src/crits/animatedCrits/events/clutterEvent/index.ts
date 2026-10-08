// the "Clutter" event (clutter; cash): it covers its crit, whose click
// freezes the screen while a wisp streaks down and blows up high on the
// screen in a big blast and shake, scattering hundreds of coins evenly over
// the whole screen like a mess; then one huge glittering broom sweeps the
// screen in brisk strokes: down the whole screen, pushing the cash into a
// long line along the bottom, then in from the left and the right, bunching
// it into one heap that settles with a jolt and lifts off into the total in
// a huge blast. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { drawDetonation } from "../../../../shared/explosion";
import {
  drawBroom,
  heapSpots,
  planSweep,
  scatterEvenly,
  simulateSweep,
  sweepLane,
  SWEEP_DEPTH,
  type BroomState,
} from "../../../../shared/clutter";
import { totalSpot } from "../../cashFlow";

const KEY = "clutter";
const REWARD = 4;
const COINS = 800;
const COIN = 0.4;
const MARGIN = 40;
const BLAST_Y = 0.22;
const BLAST = 380;
const ENTRY = 140;
// the heap: how low it sits, and its mound
const HEAP_Y = 0.84;
const MOUND_W = 140;
const MOUND_H = 60;
// the broom's head across the screen, then across the line of swept cash
const WIDE = 0.96;
const SHORT = 220;
// strokes down the screen, then in from each side
const DOWN = 3;
const IN = 2;
const KEEP_OFF = 24;
const SETTLE_MS = 100;
const FADE_MS = 160;
const GATHER_MS = 180;
const LEAP_MS = 420;
const LEAP_SPREAD = 220;
const BLAST_SHAKE = 1.6;
const STROKE_SHAKE = 0.3;
const GATHER_SHAKE = 0.9;

export const forceClutterEvent = registerWispEvent(
  KEY,
  "Clutter",
  () => CONFIG.clutterEvent.chance,
  (floor, context, area) => {
    const { enterMs, scatterMs, dragMs, liftMs, holdMs, mergeMs } =
      CONFIG.clutterEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + height * BLAST_Y,
    };
    const total = totalSpot(area);
    const heap: Point = { x: centre.x, y: area.top + height * HEAP_Y };
    const line = heap.y + KEEP_OFF;
    const across = line + (SWEEP_DEPTH[0] + SWEEP_DEPTH[1]) / 2;
    const blastAt = enterMs;
    const sweep = planSweep(
      [
        ...sweepLane(
          { x: centre.x, y: area.top - 20 },
          { x: centre.x, y: line },
          DOWN,
          Math.PI / 2,
          width * WIDE,
        ),
        ...sweepLane(
          { x: area.left - 20, y: across },
          { x: heap.x - KEEP_OFF, y: across },
          IN,
          0,
          SHORT,
        ),
        ...sweepLane(
          { x: area.right + 20, y: across },
          { x: heap.x + KEEP_OFF, y: across },
          IN,
          Math.PI,
          SHORT,
        ),
      ],
      blastAt + scatterMs + SETTLE_MS,
      dragMs,
      liftMs,
    );
    const gathered = sweep.endMs + GATHER_MS;
    const travel = gathered + LEAP_SPREAD + LEAP_MS;

    const spots = scatterEvenly(
      {
        left: area.left + MARGIN,
        top: area.top + MARGIN,
        right: area.right - MARGIN,
        bottom: heap.y,
      },
      COINS,
    );
    const swept = simulateSweep(sweep, spots);
    const mounds = heapSpots(
      { x: heap.x, y: line + SWEEP_DEPTH[1] },
      COINS,
      MOUND_W,
      MOUND_H,
    );
    const paths: CoinPath[] = spots.map((spot, i) => {
      const fling: Point = {
        x: lerp([centre.x, spot.x], 0.5),
        y: Math.min(centre.y, spot.y) - 100 * Math.random(),
      };
      const mound = mounds[i];
      const end = swept.end(i);
      const rise: Point = { x: mound.x, y: Math.min(mound.y, total.y) - 200 };
      const leaves = gathered + Math.random() * LEAP_SPREAD;
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * travel;
        if (ms < blastAt) return { x: centre.x, y: centre.y, scale: 0 };
        if (ms < sweep.startMs) {
          const p = bezier(
            centre,
            fling,
            spot,
            easeOut(clamp01((ms - blastAt) / scatterMs)),
            at,
          );
          return { x: p.x, y: p.y, scale: COIN };
        }
        if (ms < sweep.endMs) {
          const p = swept.at(i, ms, at);
          return { x: p.x, y: p.y, scale: COIN };
        }
        if (ms < leaves) {
          const u = easeOut(clamp01((ms - sweep.endMs) / GATHER_MS));
          return {
            x: lerp([end.x, mound.x], u),
            y: lerp([end.y, mound.y], u),
            scale: COIN,
          };
        }
        const p = bezier(
          mound,
          rise,
          total,
          easeIn(clamp01((ms - leaves) / LEAP_MS)),
          at,
        );
        return { x: p.x, y: p.y, scale: COIN };
      };
    });

    const entry: Point = { x: centre.x - ENTRY * 2, y: area.top - ENTRY };
    const flier: Point = { x: 0, y: 0 };
    const flierAt = (ms: number): Point | null => {
      if (ms < 0 || ms > blastAt) return null;
      const u = easeIn(clamp01(ms / enterMs));
      flier.x = lerp([entry.x, centre.x], u);
      flier.y = lerp([entry.y, centre.y], u);
      return flier;
    };

    const blasting = createBeats(
      [blastAt],
      (ms) => ms,
      () => {
        cover!.burst(centre, 1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BLAST_SHAKE);
      },
    );
    const stroking = createBeats(
      sweep.starts,
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(STROKE_SHAKE);
      },
    );
    const gathering = createBeats(
      [gathered],
      (ms) => ms,
      () => {
        cover!.burst(heap, 0.8);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(GATHER_SHAKE);
      },
    );
    const landing = createBeats(
      [travel],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const broom: BroomState = {
      x: 0,
      y: 0,
      heading: 0,
      length: 0,
      pushing: false,
    };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          blasting.tick(ms, now);
          stroking.tick(ms, now);
          gathering.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > travel) return;
          drawWispBetween(ctx, flierAt, ms, now, WISP_SIZE, 0.8, 0, blastAt);
          drawDetonation(ctx, centre, ms - blastAt, BLAST, now);
          // faded in on its first stroke's start and out after its last
          const b = sweep.at(
            Math.min(Math.max(ms, sweep.startMs), sweep.endMs - 1),
            broom,
          );
          const shown =
            clamp01((ms - (sweep.startMs - FADE_MS)) / FADE_MS) *
            (1 - clamp01((ms - sweep.endMs) / FADE_MS));
          if (b) drawBroom(ctx, b, shown, ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
