// the "Bomb Grapes" event (explosion; free hires): it covers its crit, whose
// click freezes the screen while a vine of light drops across the top of it,
// hung over every empty spot in view with a bunch of lit bomb grapes on a
// stem, swaying, fuses blinking ever faster; bunch by bunch the little
// grapes go off in a rattling chain of big blasts, then the stem burns
// through and the fat grape at its heart drops onto the spot below and blows
// in a huge blast that bursts into a cluster of more, a new worker forming in
// the smoke; the last bunch goes up in a colossal blast. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import {
  DETONATION_MS,
  drawDetonation,
  drawLitFuse,
} from "../../../../shared/explosion";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "bombGrapes";
const MAX_BUNCHES = 4;
// the vine hangs this far down the screen; each stem STEM long
const VINE_AT = 0.08;
const STEM = 120;
const VINE_W = 6;
const STEM_W = 4;
// a bunch: grapes in rows of 3, 2, 1 under the stem, GRAPE apart
const ROWS = [3, 2, 1];
const GRAPE_GAP = 46;
const GRAPE = WISP_SIZE * 0.8;
const HEART = WISP_SIZE * 1.4;
const SWAY = 0.12;
const GRAPE_BLAST = 300;
const HEART_BLAST = 560;
const FINAL_BLAST = 900;
const CLUSTER = 3;
const CLUSTER_REACH = 120;
const CLUSTER_BLAST = 220;
const CLUSTER_GAP = 60;
const GRAPE_SHAKE = 0.6;
const HEART_SHAKE = 1.2;
const CLUSTER_SHAKE = 0.5;
const SOUND_GAP_MS = 55;

interface Grape {
  bunch: number;
  // offset from the stem's foot
  dx: number;
  dy: number;
  blowsAt: number;
  at: (ms: number) => Point;
}

interface Bunch {
  hire: RewardHire;
  root: Point;
  drops: number;
  lands: number;
  heart: (ms: number) => Point;
}

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forceBombGrapesEvent = registerWispEvent(
  KEY,
  "Bomb Grapes",
  () => CONFIG.bombGrapesEvent.chance,
  (floor, context, area) => {
    const { growMs, popGapMs, bunchGapMs, fallMs, holdMs, mergeMs } =
      CONFIG.bombGrapesEvent;
    const hires = findRewardHires(floor, context)
      .slice(0, MAX_BUNCHES)
      .sort((a, b) => a.x - b.x);
    if (hires.length === 0) return;
    const vineY = lerp([area.top, area.bottom], VINE_AT);
    const grapesPer = ROWS.reduce((a, b) => a + b, 0);
    // each stem's foot swaying round its root
    const swayAt = (k: number, ms: number) =>
      Math.sin(ms / 260 + k * 1.7) * SWAY;
    const footOf = (b: Bunch, k: number, ms: number, into: Point): Point => {
      const a = swayAt(k, ms);
      into.x = b.root.x + Math.sin(a) * STEM;
      into.y = b.root.y + Math.cos(a) * STEM;
      return into;
    };

    let clock: number = growMs;
    const bunches: Bunch[] = [];
    const grapes: Grape[] = [];
    hires.forEach((hire, k) => {
      const root: Point = { x: hire.x, y: vineY };
      const pace = lerp([1.2, 0.7], k / Math.max(1, hires.length - 1));
      const drops = clock + grapesPer * popGapMs * pace;
      const bunch: Bunch = {
        hire,
        root,
        drops,
        lands: drops + fallMs,
        heart: () => root,
      };
      const foot: Point = { x: 0, y: 0 };
      const heartSpot: Point = { x: 0, y: 0 };
      bunch.heart = (ms) => {
        footOf(bunch, k, Math.min(ms, drops), foot);
        heartSpot.x = foot.x;
        heartSpot.y = foot.y + GRAPE_GAP * ROWS.length;
        if (ms > drops)
          heartSpot.y = lerp(
            [heartSpot.y, hire.y],
            easeIn(clamp01((ms - drops) / fallMs)),
          );
        return heartSpot;
      };
      bunches.push(bunch);
      let n = 0;
      ROWS.forEach((count, row) => {
        for (let c = 0; c < count; c++) {
          const spot: Point = { x: 0, y: 0 };
          const g: Grape = {
            bunch: k,
            dx: (c - (count - 1) / 2) * GRAPE_GAP,
            dy: row * GRAPE_GAP * 0.85,
            // the outer grapes go first, bottom up
            blowsAt: clock + (grapesPer - 1 - n) * popGapMs * pace,
            at: (ms) => {
              footOf(bunch, k, ms, spot);
              spot.x += g.dx;
              spot.y += g.dy;
              return spot;
            },
          };
          grapes.push(g);
          n++;
        }
      });
      clock = bunch.drops + bunchGapMs;
    });

    const blasts: Blast[] = [];
    for (const g of grapes)
      blasts.push({
        at: { ...g.at(g.blowsAt) },
        ms: g.blowsAt,
        size: GRAPE_BLAST,
        shake: GRAPE_SHAKE,
      });
    bunches.forEach((b, k) => {
      const last = k === bunches.length - 1;
      const at: Point = { x: b.hire.x, y: b.hire.y };
      blasts.push({
        at,
        ms: b.lands,
        size: last ? FINAL_BLAST : HEART_BLAST,
        shake: last ? 0 : HEART_SHAKE,
      });
      for (let c = 0; c < CLUSTER; c++) {
        const a = (c / CLUSTER) * Math.PI * 2 + Math.random();
        blasts.push({
          at: {
            x: at.x + Math.cos(a) * CLUSTER_REACH,
            y: at.y + Math.sin(a) * CLUSTER_REACH * 0.6,
          },
          ms: b.lands + 80 + c * CLUSTER_GAP,
          size: CLUSTER_BLAST,
          shake: CLUSTER_SHAKE,
        });
      }
    });
    const lastBunch = bunches[bunches.length - 1];
    const endMs = Math.max(...blasts.map((b) => b.ms)) + DETONATION_MS;
    let soundAt = -Infinity;

    const hanging = createBeats(
      [0, ...bunches.map((b) => b.drops)],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const blasting = createBeats(
      blasts,
      (b) => b.ms,
      (b, _, now) => {
        if (!cover!.isLive()) return;
        if (b.shake > 0) shakeScreen(b.shake);
        if (b.size >= HEART_BLAST || now - soundAt >= SOUND_GAP_MS) {
          soundAt = now;
          playExplosion();
        }
      },
    );
    const landing = createBeats(
      bunches,
      (b) => b.lands,
      (b) => {
        giveHire(b.hire);
        if (b === lastBunch) cover!.blast({ x: b.hire.x, y: b.hire.y });
      },
    );

    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: lastBunch.lands + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          hanging.tick(ms, now);
          blasting.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > endMs) return;
          const drop = easeOutBack(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - lastBunch.lands) / 400);
          a.x = area.left;
          b.x = area.right;
          a.y = b.y = vineY - (1 - drop) * 200;
          drawBeam(ctx, a, b, VINE_W, 0.6 * fade);
          bunches.forEach((bunch, k) => {
            if (ms < bunch.drops) {
              footOf(bunch, k, ms, a);
              drawBeam(ctx, bunch.root, a, STEM_W, 0.6 * drop);
            }
            if (ms < bunch.lands) {
              const at = bunch.heart(ms);
              const burn = clamp01(ms / bunch.lands);
              drawLitFuse(ctx, at, burn, HEART * 1.4, now);
              drawWisp(ctx, bunch.heart, ms, now, HEART * drop, burn);
            }
          });
          for (const g of grapes) {
            if (ms >= g.blowsAt) continue;
            const at = g.at(ms);
            const burn = clamp01(ms / g.blowsAt);
            drawLitFuse(ctx, at, burn, GRAPE * 1.3, now);
            drawWisp(ctx, g.at, ms, now, GRAPE * drop, burn);
          }
          for (const blast of blasts)
            drawDetonation(ctx, blast.at, ms - blast.ms, blast.size, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
