// the "Atom" event: it covers its crit, whose click freezes the screen while
// a nucleus wisp swells in the middle of it and three electron wisps whirl
// round it on crossing tilted orbits like an atom, ever faster, their trails
// tracing the shells; every time one whips round the far end of its orbit, a
// flash, a pop, a jolt and coins slung off it. Then the orbits collapse into
// the nucleus as it trembles and the screen rumbles, and it splits in a huge
// blast and shake, and the coins sweep into the total. Pays floor income ×
// floor number × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playExplosion, playSlamExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { ringTargets, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "atom";
const REWARD = 4;
const ELECTRONS = 3;
// each orbit ORBIT of the screen's width (or height, if less) out and FLAT of
// that across, the three tilted evenly; every electron runs LAPS laps,
// speeding up, and its orbit grows in over POP_MS
const ORBIT = 0.42;
const FLAT = 0.32;
const LAPS = 5;
const POP_MS = 220;
// the wisps, as shares of the screen's width; the nucleus swelling to
// NUCLEUS[1] and trembling TREMBLE of its size as the orbits collapse
const ELECTRON = 0.055;
const NUCLEUS: [number, number] = [0.07, 0.14];
const TREMBLE = 0.12;
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.2, 0.9];
// each whip round: a burst, a jolt and coins slung off along its way
const WHIP_BURST: [number, number] = [0.25, 0.5];
const WHIP_BURST_MS = 220;
const WHIP_SHAKE: [number, number] = [0.5, 1.3];
const WHIP_COINS: [number, number] = [2, 3];
const SLING: [number, number] = [80, 220];
const SLING_SPAN = 0.9;
// the split
const FINAL_COINS = 30;
const FINAL_RING: [number, number] = [130, 400];
const FINAL_SHAKE = 3;
const BLAST_SCALE = 2.1;
const SPARK_REACH = 420;
const SPARK_SIZE = 22;
// whip-rounds are found by stepping the orbits this many ms at a time
const SCAN_MS = 2;

interface Whip {
  at: number;
  electron: number;
  spot: Point;
  // the way it's flying, rad
  heading: number;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.atomEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { spinMs, collapseMs, holdMs, mergeMs } = CONFIG.atomEvent;
      const width = area.right - area.left;
      const height = area.bottom - area.top;
      const middle = {
        x: (area.left + area.right) / 2,
        y: (area.top + area.bottom) / 2,
      };
      const long = Math.min(width, height) * ORBIT;
      const short = long * FLAT;
      const electron = Math.max(WISP_SIZE, width * ELECTRON);
      const nucleus = NUCLEUS.map((s) =>
        Math.max(WISP_SIZE * 1.4, width * s),
      ) as [number, number];
      const tilt0 = Math.random() * Math.PI;
      const orbits = Array.from({ length: ELECTRONS }, (_, e) => {
        const tilt = tilt0 + (e * Math.PI) / ELECTRONS;
        return {
          cos: Math.cos(tilt),
          sin: Math.sin(tilt),
          phase: e / ELECTRONS,
        };
      });
      const collapseFrom = spinMs - collapseMs;

      // laps run so far, speeding up
      const lapsAt = (ms: number) => {
        const u = clamp01(ms / spinMs);
        return LAPS * (0.3 * u + 0.7 * u * u);
      };
      const shrinkAt = (ms: number) =>
        easeOutBack(clamp01(ms / POP_MS)) *
        (1 - easeIn(clamp01((ms - collapseFrom) / collapseMs)));
      const spotOf = (e: number, ms: number, into: Point): Point => {
        const orbit = orbits[e];
        const angle = (orbit.phase + lapsAt(ms)) * Math.PI * 2;
        const s = shrinkAt(ms);
        const x = Math.cos(angle) * long * s;
        const y = Math.sin(angle) * short * s;
        into.x = middle.x + x * orbit.cos - y * orbit.sin;
        into.y = middle.y + x * orbit.sin + y * orbit.cos;
        return into;
      };

      // each electron whips round its orbit's far end once a lap
      const whips: Whip[] = [];
      for (let e = 0; e < ELECTRONS; e++) {
        let lap = Math.floor(orbits[e].phase + lapsAt(0));
        for (let ms = SCAN_MS; ms < collapseFrom; ms += SCAN_MS) {
          const next = Math.floor(orbits[e].phase + lapsAt(ms));
          if (next === lap) continue;
          lap = next;
          const spot = spotOf(e, ms, { x: 0, y: 0 });
          const ahead = spotOf(e, ms + SCAN_MS, { x: 0, y: 0 });
          whips.push({
            at: ms,
            electron: e,
            spot,
            heading: Math.atan2(ahead.y - spot.y, ahead.x - spot.x),
          });
        }
      }
      whips.sort((a, b) => a.at - b.at);
      const blast = { at: spinMs, electron: -1, spot: middle, heading: 0 };
      const beatsOf = [...whips, blast];

      const electronAt = orbits.map((_, e) => {
        const point = { x: 0, y: 0 };
        return (ms: number): Point | null =>
          ms < 0 || ms >= spinMs ? null : spotOf(e, ms, point);
      });
      const nucleusPoint = { x: middle.x, y: middle.y };
      const nucleusAt = (ms: number): Point | null => {
        if (ms < 0 || ms >= spinMs) return null;
        const shake =
          ms > collapseFrom
            ? TREMBLE * nucleus[1] * ((ms - collapseFrom) / collapseMs)
            : 0;
        nucleusPoint.x = middle.x + Math.sin(ms * 0.13) * shake;
        nucleusPoint.y = middle.y + Math.cos(ms * 0.11) * shake;
        return nucleusPoint;
      };

      let lastRumble = -Infinity;
      const startedAt = performance.now();
      const beats = createBeats(
        beatsOf,
        (whip) => whip.at,
        (whip, k) => whipped(whip, k),
      );

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: spinMs + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            beats.tick(ms, now);
            if (
              ms >= collapseFrom &&
              ms < spinMs &&
              now - lastRumble >= RUMBLE_MS
            ) {
              lastRumble = now;
              shakeScreen(lerp(RUMBLE, (ms - collapseFrom) / collapseMs));
            }
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (let k = 0; k < whips.length; k++) {
              const firedAt = beats.firedAt(k);
              if (firedAt === null) break;
              const t = (now - firedAt) / WHIP_BURST_MS;
              if (t < 1) {
                const { spot } = whips[k];
                drawWhiteBurst(
                  ctx,
                  spot.x,
                  spot.y,
                  t,
                  lerp(WHIP_BURST, k / whips.length),
                );
              }
            }
            const blastedAt = beats.firedAt(whips.length);
            if (blastedAt !== null)
              drawExplosion(
                ctx,
                middle.x,
                middle.y,
                now - blastedAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            ctx.restore();
          },
          // the wisps over the coins they sling
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            const heat = clamp01(ms / spinMs);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (const at of electronAt)
              drawWispBetween(ctx, at, ms, now, electron, heat, 0, spinMs);
            drawWispBetween(
              ctx,
              nucleusAt,
              ms,
              now,
              lerp(nucleus, heat) * easeOutBack(clamp01(ms / POP_MS)),
              heat,
              0,
              spinMs,
            );
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame an electron whips round, or the nucleus splits
      function whipped(whip: Whip, k: number): void {
        if (!cover?.isLive()) return;
        if (whip.electron < 0) {
          playSlamExplosion();
          shakeScreen(FINAL_SHAKE);
          cover.launchFrom(
            middle,
            ringTargets(middle, FINAL_COINS, FINAL_RING),
          );
          return;
        }
        const t = k / whips.length;
        playBloop();
        if (k % 2 === 0) playExplosion();
        shakeScreen(lerp(WHIP_SHAKE, t));
        cover.launchFrom(
          whip.spot,
          sprayTargets(
            whip.spot,
            Math.round(lerp(WHIP_COINS, t)),
            SLING,
            whip.heading,
            SLING_SPAN,
          ),
        );
      }
    },
  },
  { label: "Atom", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Atom
export function forceAtomEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
