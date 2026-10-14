// the "Lodestones" event (magnet; free hires): it covers its crit, whose
// click freezes the screen while two gold pole wisps light up on either side,
// field lines bowing between them; the glitter all over the screen snaps onto
// them along the lines into spiky crusts, a trickle then a flood, each snap a
// click; the poles yank together and slam in a huge blast, then flip and
// repel: the crust flies off and wisps drop onto every empty spot in view,
// each landing a new worker, the last in a big blast. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import {
  drawFieldLines,
  flingAt,
  planSnaps,
  snapAt,
  type Snap,
} from "../../../../shared/animationStyles/pull";
import { shakeScreen } from "../../../../shared/screenShake";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "lodestones";
const MAX_HIRES = 6;
// the poles INSET of the screen's width in from its sides, lighting up over
// LIGHT_MS, POLE wisps of WISP_SIZE with a gold glow GLOW of the width
const INSET = 0.2;
const LIGHT_MS = 150;
const POLE = 1.8;
const GLOW = 0.2;
const GLOW_ALPHA = 0.5;
const FIELD = 0.06;
// the glitter: SPECKS lying over the screen, snapping in from SNAP_FROM ms,
// crusts REACH of the width deep
const SPECKS = 110;
const SNAP_FROM = 160;
const REACH: [number, number] = [0.04, 0.1];
const SPECK = 20;
const CLUNG = 28;
const CLING_POP = 30;
const CLING_POP_MS = 100;
// every CLICK_EVERY-th landing a click and a jolt, building to CLICK_SHAKE
const CLICK_EVERY = 8;
const CLICK_SHAKE: [number, number] = [0.25, 0.9];
// the slam: a huge blast and a cluster round it, CLUSTER of the width apart
const SLAM_BLAST = 240;
const CLUSTER = [-0.12, 0.12, -0.24, 0.24];
const CLUSTER_DROP = 0.04;
const CLUSTER_GAP_MS = 45;
const CLUSTER_BLAST = 100;
const SLAM_SHAKE = 2.6;
// the crust flung off at FLING px a ms, fading over FLING_MS
const FLING = 1.6;
const FLING_MS = 400;
const FLUNG = 34;
// the hires: a wisp each, hopping LIFT over the higher end onto its spot
const HIRE_WISP = 1.2;
const LIFT = 220;
const HIRE_UP = 40;
const HIRE_BURST = 0.5;
const HIRE_SHAKE = 1;
const SOUND_GAP_MS = 55;
const GOLD = fadeStops(COLOR.heavenlyGold);

export const forceLodestonesEvent = registerWispEvent(
  KEY,
  "Lodestones",
  () => CONFIG.lodestonesEvent.chance,
  (floor, context, area) => {
    const { pullMs, slamMs, hireMs, hireGapMs, holdMs, mergeMs } =
      CONFIG.lodestonesEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const width = area.right - area.left;
    const middle: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const homes: Point[] = [
      { x: area.left + width * INSET, y: middle.y },
      { x: area.right - width * INSET, y: middle.y },
    ];
    const slamAt = pullMs + slamMs;
    const snaps = planSnaps(SPECKS, area, 2, SNAP_FROM, pullMs, [
      width * REACH[0],
      width * REACH[1],
    ]);
    const spots = hires.map((hire, k) => ({
      hire,
      at: { x: hire.x, y: hire.y - HIRE_UP },
      lands: slamAt + hireMs + k * hireGapMs,
    }));
    const last = spots[spots.length - 1];
    const endMs = Math.max(
      last.lands + DETONATION_MS,
      slamAt + CLUSTER.length * CLUSTER_GAP_MS + DETONATION_MS,
    );

    // the poles: home, then yanked together onto the middle
    const poles = homes.map(() => ({ x: 0, y: 0 }));
    const placePoles = (ms: number) => {
      const u = easeIn(clamp01((ms - pullMs) / slamMs)) ** 2;
      for (let p = 0; p < 2; p++) {
        poles[p].x = homes[p].x + (middle.x - homes[p].x) * u;
        poles[p].y = homes[p].y;
      }
    };
    const poleAt = homes.map((_, p) => {
      const into = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms >= slamAt) return null;
        const u = easeIn(clamp01((ms - pullMs) / slamMs)) ** 2;
        into.x = homes[p].x + (middle.x - homes[p].x) * u;
        into.y = homes[p].y;
        return into;
      };
    });
    const hirePaths = spots.map((s) => {
      const into = { x: 0, y: 0 };
      const top = Math.min(middle.y, s.at.y) - LIFT;
      return (ms: number): Point | null => {
        if (ms < slamAt || ms > s.lands) return null;
        const t = clamp01((ms - slamAt) / (s.lands - slamAt)) ** 1.4;
        const u = 1 - t;
        into.x =
          u * u * middle.x +
          2 * u * t * ((middle.x + s.at.x) / 2) +
          t * t * s.at.x;
        into.y = u * u * middle.y + 2 * u * t * top + t * t * s.at.y;
        return into;
      };
    });

    let soundAt = -Infinity;
    const bang = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const clicks = snaps.filter((_, i) => i % CLICK_EVERY === CLICK_EVERY - 1);
    const lighting = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const clicking = createBeats(
      clicks,
      (s) => s.landMs,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(CLICK_SHAKE, k / Math.max(1, clicks.length - 1)));
      },
    );
    const slamming = createBeats(
      [slamAt],
      (ms) => ms,
      (_, __, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(SLAM_SHAKE);
        bang(now);
      },
    );
    const landing = createBeats(
      spots,
      (s) => s.lands,
      (s, _, now) => {
        giveHire(s.hire);
        if (s === last) {
          cover!.blast(s.at);
          return;
        }
        cover!.burst(s.at, HIRE_BURST);
        if (!cover!.isLive()) return;
        shakeScreen(HIRE_SHAKE);
        bang(now);
      },
    );

    const speck: Point = { x: 0, y: 0 };
    const side: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: last.lands + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          lighting.tick(ms, now);
          clicking.tick(ms, now);
          slamming.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > endMs) return;
          placePoles(ms);
          const lit = clamp01(ms / LIGHT_MS);
          if (ms < slamAt) {
            drawFieldLines(ctx, poles[0], poles[1], lit, ms, width * FIELD);
            const previous = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = lit * GLOW_ALPHA;
            for (const p of poles) drawGlow(ctx, GOLD, p.x, p.y, width * GLOW);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = previous;
          }

          // the glitter: lying, snapping onto its crust, then flung off
          if (ms < slamAt + FLING_MS) {
            const flung = ms >= slamAt;
            const fade = flung ? 1 - (ms - slamAt) / FLING_MS : 1;
            const previous = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = fade;
            beginLightBatch(ctx);
            for (let i = 0; i < snaps.length; i++) {
              const s: Snap = snaps[i];
              let size: number;
              if (flung) {
                flingAt(s, ms - slamAt, middle, FLING, speck);
                size = FLUNG;
              } else {
                snapAt(s, ms, poles[s.pole], SPECK, speck);
                size =
                  ms >= s.landMs
                    ? CLUNG +
                      CLING_POP *
                        Math.max(0, 1 - (ms - s.landMs) / CLING_POP_MS)
                    : SPECK;
              }
              stampGlimmer(
                ctx,
                speck.x,
                speck.y,
                size,
                i,
                i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
              );
            }
            endLightBatch(ctx);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = previous;
          }

          for (const at of poleAt)
            drawWispBetween(ctx, at, ms, now, WISP_SIZE * POLE, 1, 0, slamAt);
          drawDetonation(ctx, middle, ms - slamAt, SLAM_BLAST, now);
          side.y = middle.y + width * CLUSTER_DROP;
          for (let k = 0; k < CLUSTER.length; k++) {
            side.x = middle.x + CLUSTER[k] * width;
            drawDetonation(
              ctx,
              side,
              ms - slamAt - (k + 1) * CLUSTER_GAP_MS,
              CLUSTER_BLAST,
              now,
            );
          }
          for (let k = 0; k < spots.length; k++)
            drawWispBetween(
              ctx,
              hirePaths[k],
              ms,
              now,
              WISP_SIZE * HIRE_WISP,
              0.6,
              slamAt,
              spots[k].lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
