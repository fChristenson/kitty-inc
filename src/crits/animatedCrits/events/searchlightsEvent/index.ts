// the "Searchlights" event (beam): it covers its crit, whose click freezes the
// screen while three searchlight beams blaze up from its bottom edge and
// sweep back and forth across it, crossing, hunting; one after another they
// catch hidden stashes of cash, each one caught flaring with a flash, a
// bloop and a jolt and gushing a geyser of cash up into the total-income
// readout; then all three swing round and lock onto the total, which goes
// off in a huge blast and shake, and the coins sweep into the total. Pays
// floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { between, clamp01, easeOutCubic } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";
import type { Point } from "../../../../shared/wisp";

const KEY = "searchlights";
const REWARD = 4;
// the lights at these shares across the bottom, each sweeping SWING radians
// either side of straight up at SWEEP_HZ, out of step
const BASES = [0.15, 0.5, 0.85];
const SWING = 0.75;
const SWEEP_HZ = 0.75;
// the beams, BEAM px across, LONG of the screen's height long
const BEAM = 34;
const LONG = 1.3;
// the stashes: STASHES caught, at REACH of the beam's length out
const STASHES = 6;
const REACH: [number, number] = [0.35, 0.7];
const FLARE = 26;
const CATCH_BURST = 0.8;
const CATCH_SHAKE = 1.5;

export const forceSearchlightsEvent = registerWispEvent(
  KEY,
  "Searchlights",
  () => CONFIG.searchlightsEvent.chance,
  (floor, context, area) => {
    const { searchMs, lockMs, streamMs, travelMs, holdMs, mergeMs } =
      CONFIG.searchlightsEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const fallback = totalSpot(area);
    const long = height * LONG;
    const bases: Point[] = BASES.map((s) => ({
      x: area.left + width * s,
      y: area.bottom + 10,
    }));
    const phases = BASES.map(
      (_, k) => (k / BASES.length) * Math.PI * 2 + Math.random(),
    );
    // each light's angle (0 = straight up) while searching
    const sweep = (k: number, ms: number) =>
      SWING * Math.sin(Math.PI * 2 * SWEEP_HZ * (ms / 1000) + phases[k]);
    const lockAt = searchMs + lockMs;
    // the angle onto the total from each base
    const onTotal = bases.map((b) =>
      Math.atan2(fallback.x - b.x, b.y - fallback.y),
    );
    const angle = (k: number, ms: number) => {
      if (ms < searchMs) return sweep(k, ms);
      const from = sweep(k, searchMs);
      return (
        from +
        (onTotal[k] - from) * easeOutCubic(clamp01((ms - searchMs) / lockMs))
      );
    };
    const end = (k: number, ms: number, length: number, into: Point): Point => {
      const a = angle(k, ms);
      into.x = bases[k].x + Math.sin(a) * length;
      into.y = bases[k].y - Math.cos(a) * length;
      return into;
    };
    // the stashes sit right where a beam will be at the moment it's caught
    const stashes = Array.from({ length: STASHES }, (_, n) => {
      const k = n % BASES.length;
      const ms = searchMs * ((n + 0.6) / (STASHES + 0.2));
      const at = end(k, ms, long * between(REACH), { x: 0, y: 0 });
      at.y = Math.max(
        area.top + height * 0.25,
        Math.min(area.bottom - 30, at.y),
      );
      const bend = { x: at.x, y: fallback.y };
      const line = sampleLine(
        (u) => bezier(at, bend, fallback, u, { x: 0, y: 0 }),
        30,
      );
      return { at, ms, line };
    });
    const pour: Pour = { coinsAlong: 520, width: 40, streamMs, travelMs };
    const lastStart = stashes[STASHES - 1].ms;
    const durationMs = Math.max(
      pourDurationMs(lastStart, pour),
      lockAt + holdMs + mergeMs,
    );

    const catches = createBeats(
      stashes,
      (s) => s.ms,
      (s) => {
        cover!.burst(s.at, CATCH_BURST);
        pourLine(cover!, s.line, pour);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(CATCH_SHAKE);
      },
    );
    const lock = createBeats(
      [lockAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );
    const tip = { x: 0, y: 0 };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          catches.tick(ms, now);
          lock.tick(ms, now);
        },
        drawOver: (ctx, ms) => {
          if (ms >= lockAt + 250) return;
          const fade = 1 - clamp01((ms - lockAt) / 250);
          const total = cover?.total() ?? fallback;
          bases.forEach((b, k) => {
            // locking on, each beam ends on the total
            const length =
              ms < searchMs
                ? long
                : long +
                  (Math.hypot(total.x - b.x, total.y - b.y) - long) *
                    clamp01((ms - searchMs) / lockMs);
            end(k, ms, length, tip);
            drawBeam(
              ctx,
              b,
              tip,
              BEAM * (0.9 + 0.1 * Math.sin(ms / 40 + k)),
              fade,
            );
            if (ms >= searchMs)
              drawBeamFlare(
                ctx,
                tip,
                FLARE * clamp01((ms - searchMs) / lockMs),
                fade,
              );
          });
          for (const s of stashes) {
            const since = ms - s.ms;
            if (since >= 0 && since < 300)
              drawBeamFlare(ctx, s.at, FLARE * (1 - since / 300));
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
