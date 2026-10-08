// the "Light Show" event (beam; cash): it covers its crit, whose click
// freezes the screen while a row of emitter wisps lights up along the
// screen's bottom and puts on a concert laser show, blazing beams swaying
// in step: straight up, then fanned out, criss-crossed, sweeping together,
// each change slammed on the beat with a whoosh, a jolt and cash bursting
// off every beam's tip, ever faster; then every beam swings onto the total
// at once and blasts it in a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { totalSpot } from "../../cashFlow";

const KEY = "lightShow";
const REWARD = 4;
const EMITTERS = 5;
const INSET = 50;
const BEAM = 12;
const FLARE = 22;
const EMITTER = 0.5;
const SWITCH_MS = 140;
const SWAY = 0.12;
const TIP_COINS = 6;
const BEAT_SHAKE: [number, number] = [0.5, 1.2];

// each pattern's angle (from straight up) for emitter i of n at ms, sweep
// running -1..1 across the row
type Pattern = (sweep: number, ms: number) => number;
const PATTERNS: Pattern[] = [
  (_, ms) => Math.sin(ms * 0.006) * SWAY,
  (sweep) => sweep * 0.6,
  (sweep) => -sweep * 0.45,
  (_, ms) => Math.sin(ms * 0.012) * 0.7,
  (sweep, ms) => sweep * 0.35 * Math.sin(ms * 0.02),
];

export const forceLightShowEvent = registerWispEvent(
  KEY,
  "Light Show",
  () => CONFIG.lightShowEvent.chance,
  (floor, context, area) => {
    const { beatsMs, lockMs, holdMs, mergeMs } = CONFIG.lightShowEvent;
    const fallback = totalSpot(area);
    const reach = area.bottom - area.top + 100;
    const emitters: Point[] = Array.from({ length: EMITTERS }, (_, i) => ({
      x: lerp([area.left + INSET, area.right - INSET], i / (EMITTERS - 1)),
      y: area.bottom - 30,
    }));
    const lockAt = beatsMs[beatsMs.length - 1];
    const endAt = lockAt + lockMs;
    const toTotal = (e: Point) => {
      const t = cover?.total() ?? fallback;
      return Math.atan2(t.x - e.x, -(t.y - e.y));
    };
    // emitter i's angle at ms: pattern j until beat j, the last beat swinging
    // every beam onto the total, easing from one to the next on each beat
    const angle = (i: number, ms: number) => {
      const sweep = (i / (EMITTERS - 1)) * 2 - 1;
      const pattern = (j: number) =>
        j >= beatsMs.length
          ? toTotal(emitters[i])
          : PATTERNS[j % PATTERNS.length](sweep, ms);
      let k = -1;
      while (k + 1 < beatsMs.length && ms >= beatsMs[k + 1]) k++;
      if (k < 0) return pattern(0);
      const u = easeOutBack(clamp01((ms - beatsMs[k]) / SWITCH_MS));
      return lerp([pattern(k), pattern(k + 1)], u);
    };
    const tip: Point = { x: 0, y: 0 };
    const tipOf = (i: number, ms: number, into: Point): Point => {
      const a = angle(i, ms);
      const e = emitters[i];
      const len =
        ms >= lockAt
          ? Math.hypot(
              (cover?.total() ?? fallback).x - e.x,
              (cover?.total() ?? fallback).y - e.y,
            )
          : reach;
      into.x = e.x + Math.sin(a) * len;
      into.y = e.y - Math.cos(a) * len;
      return into;
    };
    const hovers = emitters.map(
      (e) =>
        (ms: number): Point | null =>
          ms < 0 || ms > endAt ? null : e,
    );

    const beating = createBeats(
      beatsMs.slice(0, -1),
      (ms) => ms,
      (ms, k) => {
        for (let i = 0; i < EMITTERS; i++) {
          const at = tipOf(i, ms + SWITCH_MS, { x: 0, y: 0 });
          at.y = Math.max(at.y, area.top + 60);
          cover!.launchFrom(
            at,
            Array.from({ length: TIP_COINS }, () => ({
              x: at.x + (Math.random() * 2 - 1) * 120,
              y: at.y + 40 + Math.random() * 160,
            })),
          );
        }
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(BEAT_SHAKE, k / Math.max(1, beatsMs.length - 2)));
      },
    );
    const locking = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          beating.tick(ms, now);
          locking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const warm = clamp01(ms / 200);
          for (let i = 0; i < EMITTERS; i++) {
            tipOf(i, ms, tip);
            drawBeam(
              ctx,
              emitters[i],
              tip,
              BEAM * (ms >= lockAt ? 1.6 : 1),
              warm,
            );
            drawBeamFlare(ctx, emitters[i], FLARE, warm, now);
            drawWispBetween(
              ctx,
              hovers[i],
              ms,
              now,
              WISP_SIZE * EMITTER,
              0.6,
              0,
              endAt,
            );
          }
          if (ms >= lockAt)
            drawBeamFlare(
              ctx,
              cover?.total() ?? fallback,
              FLARE * 3 * clamp01((ms - lockAt) / lockMs),
              1,
              now,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
