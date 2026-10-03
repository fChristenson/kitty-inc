// the "Note Highway" event (an experiment beyond the seven looks: a rhythm
// game; worker perma tiers): it covers its crit, whose click freezes the
// screen while four lanes of light stretch down the screen to a row of
// target wisps along the bottom, and note wisps come streaming down the
// lanes; every one lands dead on its target with a flash, a bloop and a gold
// "PERFECT!", the notes ever faster; every few perfect hits a worker climbs
// a perma tier with a jolt, and the final chord lands in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam } from "../../shared/beam";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../shared/critText";
import { findRewardWorkers } from "../eventRewards";

const KEY = "noteHighway";
const MAX_WORKERS = 6;
const LANES = 4;
const NOTES = 14;
const LANE_GAP = 80;
const TOP = 150;
const BOTTOM = 130;
const LANE = 5;
const NOTE = 0.4;
const TARGET = 0.35;
const PERFECT_MS = 350;
const HIT_SHAKE: [number, number] = [0.25, 0.8];
const PROMOTE_SHAKE: [number, number] = [0.6, 1.3];

export const forceNoteHighwayEvent = registerWispEvent(
  KEY,
  "Note Highway",
  () => CONFIG.noteHighwayEvent.chance,
  (floor, context, area) => {
    const { notesMs, fallMs, holdMs, mergeMs } = CONFIG.noteHighwayEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const cx = (area.left + area.right) / 2;
    const top = area.top + TOP;
    const line = area.bottom - BOTTOM;
    const lanes = Array.from({ length: LANES }, (_, i) => {
      const x = cx + (i - (LANES - 1) / 2) * LANE_GAP;
      return { from: { x, y: top } as Point, to: { x, y: line } as Point };
    });
    const perfect = createCritTextSprite("PERFECT!", COLOR.heavenlyGold, {
      fontSize: 34,
      strokeWidth: 6,
    });
    let clock = fallMs;
    let lane = 0;
    const notes = Array.from({ length: NOTES }, (_, k) => {
      const hits = clock;
      clock += lerp(notesMs, k / (NOTES - 1));
      lane = (lane + 1 + Math.floor(Math.random() * (LANES - 1))) % LANES;
      const target = lanes[lane].to;
      const at: Point = { x: target.x, y: 0 };
      return {
        target,
        hits,
        at: (ms: number): Point => {
          at.y = lerp([top, line], clamp01((ms - (hits - fallMs)) / fallMs));
          return at;
        },
      };
    });
    const endAt = notes[NOTES - 1].hits;
    // a worker climbs on every few hits, the last on the last note
    const promotions = workers.map((worker, k) => ({
      worker,
      note: notes[Math.round(((k + 1) * (NOTES - 1)) / workers.length)],
    }));
    const lastPromotion = promotions[promotions.length - 1];
    const targetSpots = lanes.map((l) => () => l.to);

    const hitting = createBeats(
      notes,
      (n) => n.hits,
      (n, k) => {
        cover!.burst(n.target, 0.25);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, k / (NOTES - 1)));
      },
    );
    const promoting = createBeats(
      promotions,
      (p) => p.note.hits,
      (p, k) => {
        cover!.promote(p.worker);
        if (p === lastPromotion) {
          cover!.blast(p.note.target);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(
          lerp(PROMOTE_SHAKE, k / Math.max(1, promotions.length - 1)),
        );
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
          hitting.tick(ms, now);
          promoting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + PERFECT_MS) return;
          const fade = ms > endAt ? 1 - (ms - endAt) / PERFECT_MS : 1;
          for (const l of lanes) drawBeam(ctx, l.from, l.to, LANE, 0.3 * fade);
          for (const t of targetSpots)
            drawWispBetween(ctx, t, ms, now, WISP_SIZE * TARGET, 0.3, 0, endAt);
          for (const n of notes) {
            drawWispBetween(
              ctx,
              n.at,
              ms,
              now,
              WISP_SIZE * NOTE,
              1,
              n.hits - fallMs,
              n.hits,
            );
            const p = (ms - n.hits) / PERFECT_MS;
            if (p < 0 || p >= 1) continue;
            ctx.globalAlpha = 1 - p * p;
            drawCritTextSprite(
              ctx,
              perfect,
              n.target.x,
              n.target.y - 50 - 30 * p,
              0.6 + 0.3 * (1 - p),
            );
            ctx.globalAlpha = 1;
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
