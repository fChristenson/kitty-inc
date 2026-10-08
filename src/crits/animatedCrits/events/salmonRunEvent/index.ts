// the "Salmon Run" event (mix; free hires and cash): it covers its crit,
// whose click freezes the screen while a roaring waterfall of cash pours
// down the middle of the screen into a pool at its foot; wisp salmon leap
// up the falls one after another, jump by jump, each leap a splash and a
// jolt; at the top each one arcs out of the falls onto an empty spot on a
// floor in view and lands as a new worker with a flash and a bang; then the
// whole waterfall surges up into the total in a huge blast and shake. Pays
// floor income × floor number × REWARD, plus the hires
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
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
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "salmonRun";
const REWARD = 2;
const MAX_HIRES = 4;
const COINS = 1_300;
const COIN = 0.5;
// the falls are FALLS px wide, dropping over FALL_MS into a pool POOL px
// wide and DEPTH deep
const FALLS = 120;
const FALL_MS = 420;
const POOL = 340;
const DEPTH = 40;
// each salmon climbs in LEAPS leaps, LEAP_LOFT px over each, then arcs
// LOFT px over its spot
const LEAPS = 3;
const LEAP_LOFT = 50;
const LOFT = 120;
const SALMON = 0.5;
const FORM_MS = 280;
const SURGE_SPREAD = 300;
const LIFT = 60;
const LAND_SHAKE: [number, number] = [0.6, 1.4];

export const forceSalmonRunEvent = registerWispEvent(
  KEY,
  "Salmon Run",
  () => CONFIG.salmonRunEvent.chance,
  (floor, context, area) => {
    const { pourMs, startsMs, leapMs, arcMs, flightMs, holdMs, mergeMs } =
      CONFIG.salmonRunEvent;
    const hires = findRewardHires(floor, context)
      .sort((a, b) => a.x - b.x)
      .slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const fallback = totalSpot(area);
    const mid = (area.left + area.right) / 2;
    const top = area.top - 20;
    const foot = area.bottom - DEPTH;
    const salmon = hires.map((hire, k) => {
      const starts = startsMs + k * (leapMs * 0.8);
      const climbs = starts + LEAPS * leapMs;
      const spot: Point = { x: hire.x, y: hire.y - 30 };
      const crest: Point = {
        x: mid + (Math.random() * 2 - 1) * FALLS * 0.3,
        y: top + 60,
      };
      const bow: Point = {
        x: (crest.x + spot.x) / 2,
        y: Math.min(crest.y, spot.y) - LOFT,
      };
      const at: Point = { x: 0, y: 0 };
      return {
        hire,
        spot,
        starts,
        climbs,
        lands: climbs + arcMs,
        at: (ms: number): Point | null => {
          if (ms < starts || ms > climbs + arcMs) return null;
          if (ms < climbs) {
            // leap by leap up the falls
            const f = (ms - starts) / leapMs;
            const j = Math.floor(f);
            const u = f - j;
            const y0 = lerp([foot, crest.y], j / LEAPS);
            const y1 = lerp([foot, crest.y], (j + 1) / LEAPS);
            at.x = crest.x + Math.sin(f * 2.3) * FALLS * 0.25;
            at.y =
              lerp([y0, y1], easeOut(u)) - Math.sin(Math.PI * u) * LEAP_LOFT;
            return at;
          }
          return bezier(crest, bow, spot, easeIn((ms - climbs) / arcMs), at);
        },
      };
    });
    const lastLand = Math.max(...salmon.map((s) => s.lands));
    const surgeAt = Math.max(pourMs, lastLand) + 80;
    const endAt = surgeAt + SURGE_SPREAD + flightMs;

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const leaves = Math.random() * pourMs;
      const x = mid + (Math.random() * 2 - 1) * FALLS * 0.5;
      const rest: Point = {
        x: mid + (Math.random() * 2 - 1) * POOL * 0.5,
        y: foot + Math.random() * DEPTH,
      };
      const lands = leaves + FALL_MS;
      const surges = surgeAt + Math.random() * SURGE_SPREAD;
      const lift: Point = { x: rest.x, y: rest.y - LIFT };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < leaves) return { x, y: top, scale: 0 };
        if (ms < lands) {
          const u = (ms - leaves) / FALL_MS;
          const fall = easeIn(u);
          return {
            x: lerp([x, rest.x], fall * fall),
            y: lerp([top, rest.y], fall),
            scale: COIN,
          };
        }
        if (ms < surges) return { x: rest.x, y: rest.y, scale: COIN };
        const total = cover?.total() ?? fallback;
        bezier(
          rest,
          lift,
          total,
          easeIn(clamp01((ms - surges) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });

    const leaps = salmon.flatMap((s) =>
      Array.from({ length: LEAPS }, (_, j) => s.starts + (j + 1) * leapMs),
    );
    const splashing = createBeats(
      leaps,
      (ms) => ms,
      () => {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(0.4);
      },
    );
    const landing = createBeats(
      [...salmon].sort((a, b) => a.lands - b.lands),
      (s) => s.lands,
      (s, k) => {
        giveHire(s.hire);
        cover!.burst(s.spot, 0.6 + 0.3 * (k / Math.max(1, salmon.length - 1)));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, salmon.length - 1)));
      },
    );
    const surging = createBeats(
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
          splashing.tick(ms, now);
          landing.tick(ms, now);
          surging.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          for (const s of salmon)
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * SALMON,
              0.7,
              s.starts,
              s.lands,
            );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
