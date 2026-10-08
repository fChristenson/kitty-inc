// the "Racetrack" event: it covers its crit, whose click freezes the screen
// while the wisp races in from off its side and laps a racetrack round the
// screen's edges, ever faster, drifting round every corner with a flash, a
// screech, a jolt and coins sprayed off the bend; on its last lap it peels
// off the top straight into the total-income readout and explodes in a huge
// blast and shake, coins bursting out of it, and all the coins sweep into the
// total. Pays floor income × floor number × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSlamExplosion, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import {
  pulseHudTotalFlash,
  triggerHudTotalFlash,
} from "../../../../shared/totalIncomeCoins";
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
import { clamp01, lerp } from "../../../../shared/easing";
import { ringTargets, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "racetrack";
const REWARD = 4;
// the track: MARGIN of the screen's width in from its edges, its corners
// CORNER of it round; LAPS full laps before the last, which ends halfway
// along the top straight; picking up pace by SPEEDUP
const MARGIN = 0.1;
const CORNER = 0.16;
const LAPS = 2;
const SPEEDUP = 0.6;
// the wisp, as a share of the screen's width, swelling GROW more by the end
const WISP = 0.05;
const GROW = 0.3;
// each corner: a burst, a jolt and coins sprayed off the bend
const DRIFT_BURST: [number, number] = [0.3, 0.6];
const DRIFT_BURST_MS = 240;
const DRIFT_SHAKE: [number, number] = [0.5, 1.5];
const DRIFT_COINS: [number, number] = [2, 4];
const SPRAY: [number, number] = [60, 200];
const SPRAY_SPAN = 1.3;
// the blast in the total: coins bursting out of it
const FINAL_COINS = 28;
const FINAL_RING: [number, number] = [90, 320];
const FINAL_SHAKE = 2.9;
const BLAST_SCALE = 1.9;
const SPARK_REACH = 380;
const SPARK_SIZE = 22;

interface Segment {
  length: number;
  // the spot d along it
  at: (d: number, into: Point) => Point;
  // a corner's middle, for its drift
  bend?: Point;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.racetrackEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { entryMs, raceMs, shootMs, holdMs, mergeMs } =
        CONFIG.racetrackEvent;
      const width = area.right - area.left;
      const size = Math.max(WISP_SIZE, width * WISP);
      const m = width * MARGIN;
      const r = width * CORNER;
      const left = area.left + m;
      const right = area.right - m;
      const top = area.top + m;
      const bottom = area.bottom - m;
      // mirrored at random, so it laps either way round
      const flip = Math.random() < 0.5;
      const mid = (area.left + area.right) / 2;
      const put = (x: number, y: number, into: Point): Point => {
        into.x = flip ? mid * 2 - x : x;
        into.y = y;
        return into;
      };
      const straight = (
        x0: number,
        y0: number,
        x1: number,
        y1: number,
      ): Segment => {
        const length = Math.hypot(x1 - x0, y1 - y0);
        return {
          length,
          at: (d, into) =>
            put(
              x0 + ((x1 - x0) * d) / length,
              y0 + ((y1 - y0) * d) / length,
              into,
            ),
        };
      };
      const corner = (cx: number, cy: number, from: number): Segment => ({
        length: (r * Math.PI) / 2,
        at: (d, into) => {
          const a = from - d / r;
          return put(cx + Math.cos(a) * r, cy + Math.sin(a) * r, into);
        },
        bend: put(cx, cy, { x: 0, y: 0 }),
      });
      // right along the bottom, up the right, left along the top, down the left
      const track: Segment[] = [
        straight(left + r, bottom, right - r, bottom),
        corner(right - r, bottom - r, Math.PI / 2),
        straight(right, bottom - r, right, top + r),
        corner(right - r, top + r, 0),
        straight(right - r, top, left + r, top),
        corner(left + r, top + r, -Math.PI / 2),
        straight(left, top + r, left, bottom - r),
        corner(left + r, bottom - r, -Math.PI),
      ];
      const lap = track.reduce((sum, s) => sum + s.length, 0);
      // the top straight's middle, where it peels off
      const peelAt =
        track[0].length +
        track[1].length +
        track[2].length +
        track[3].length +
        track[4].length / 2;
      const distance = lap * LAPS + peelAt;
      const onTrack = (s: number, into: Point): Point => {
        let d = ((s % lap) + lap) % lap;
        for (const seg of track) {
          if (d <= seg.length) return seg.at(d, into);
          d -= seg.length;
        }
        return track[0].at(0, into);
      };

      const raceFrom = entryMs;
      const shootFrom = raceFrom + raceMs;
      const blastAt = shootFrom + shootMs;
      const coveredAt = (ms: number) => {
        const u = clamp01((ms - raceFrom) / raceMs);
        return distance * ((1 - SPEEDUP) * u + SPEEDUP * u * u);
      };
      // when it's covered s: invert (1 - S)u + S u² = s / distance
      const msAtCovered = (s: number) =>
        raceFrom +
        ((-(1 - SPEEDUP) +
          Math.sqrt((1 - SPEEDUP) ** 2 + (4 * SPEEDUP * s) / distance)) /
          (2 * SPEEDUP)) *
          raceMs;

      // every corner's middle it passes, and when
      const drifts: { at: number; spot: Point; bend: Point }[] = [];
      for (let s0 = 0; s0 < distance; s0 += lap) {
        let start = 0;
        for (const seg of track) {
          const s = s0 + start + seg.length / 2;
          if (seg.bend && s < distance)
            drifts.push({
              at: msAtCovered(s),
              spot: onTrack(s, { x: 0, y: 0 }),
              bend: seg.bend,
            });
          start += seg.length;
        }
      }
      drifts.sort((a, b) => a.at - b.at);

      // the total, local to the floor; known once the overlay's first drawn
      let total: Point | null = null;
      const startLine = onTrack(0, { x: 0, y: 0 });
      const from = put(area.left - width * 0.3, bottom, { x: 0, y: 0 });
      const peel = onTrack(distance, { x: 0, y: 0 });
      const point = { x: 0, y: 0 };
      const along = (a: Point, b: Point, u: number): Point => {
        point.x = a.x + (b.x - a.x) * u;
        point.y = a.y + (b.y - a.y) * u;
        return point;
      };
      const wispAt = (ms: number): Point | null => {
        if (ms < 0 || ms >= blastAt) return null;
        if (ms < raceFrom) return along(from, startLine, ms / entryMs);
        if (ms < shootFrom) return onTrack(coveredAt(ms), point);
        if (!total) return null;
        return along(peel, total, (ms - shootFrom) / shootMs);
      };

      const startedAt = performance.now();
      let blastedAt: number | null = null;
      const beats = createBeats(
        drifts,
        (d) => d.at,
        (d, k) => drifted(d.spot, d.bend, k),
      );
      const blastBeat = createBeats(
        [blastAt],
        (ms) => ms,
        (_, __, now) => blast(now),
      );

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: blastAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect, totalTarget) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            total ??= {
              x: totalTarget.x - rect.left,
              y: totalTarget.y - rect.top,
            };
            const now = performance.now();
            const ms = now - startedAt;
            beats.tick(ms, now);
            blastBeat.tick(ms, now);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            drifts.forEach((d, k) => {
              const firedAt = beats.firedAt(k);
              if (firedAt === null) return;
              const t = (now - firedAt) / DRIFT_BURST_MS;
              if (t < 1)
                drawWhiteBurst(
                  ctx,
                  d.spot.x,
                  d.spot.y,
                  t,
                  lerp(DRIFT_BURST, k / Math.max(1, drifts.length - 1)),
                );
            });
            if (blastedAt !== null)
              drawExplosion(
                ctx,
                total.x,
                total.y,
                now - blastedAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            ctx.restore();
          },
          // the wisp over the coins it sprays
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            const heat = clamp01(ms / shootFrom);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            drawWispBetween(
              ctx,
              wispAt,
              ms,
              now,
              size * (1 + GROW * heat),
              heat,
              0,
              blastAt,
            );
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame it drifts round a corner: coins sprayed off the bend
      function drifted(spot: Point, bend: Point, k: number): void {
        if (!cover?.isLive()) return;
        const t = k / Math.max(1, drifts.length - 1);
        playSwoosh();
        shakeScreen(lerp(DRIFT_SHAKE, t));
        cover.launchFrom(
          spot,
          sprayTargets(
            spot,
            Math.round(lerp(DRIFT_COINS, t)),
            SPRAY,
            Math.atan2(spot.y - bend.y, spot.x - bend.x),
            SPRAY_SPAN,
          ),
        );
      }
      // on the frame it hits the total: a huge blast and coins bursting out
      function blast(now: number): void {
        blastedAt = now;
        if (!cover?.isLive() || !total) return;
        playSlamExplosion();
        shakeScreen(FINAL_SHAKE);
        triggerHudTotalFlash();
        pulseHudTotalFlash();
        cover.launchFrom(total, ringTargets(total, FINAL_COINS, FINAL_RING));
      }
    },
  },
  { label: "Racetrack", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Racetrack
export function forceRacetrackEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
