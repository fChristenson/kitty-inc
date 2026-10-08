// the "Loop" event: it covers its crit, whose click freezes the screen while
// the wisp flies in from off its side onto a wide circle round its middle and
// loops it 4096°, ever faster, shedding a ring of coins, every lap a flash, a
// pop and a jolt; coming round its side heading straight up, it breaks off
// and flies straight up into the total-income readout and explodes in a huge
// blast and shake, coins bursting out of it, and all the coins sweep into the
// total. Pays floor income × floor number × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playSlamExplosion, playSwoosh } from "../../../../sound";
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
import { between, clamp01, lerp } from "../../../../shared/easing";
import { ringTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "loop";
const REWARD = 4;
// the circle: RADIUS of the screen's width (or height, if less) round its
// middle, looped SWEEP rad, picking up pace by SPEEDUP of the way
const RADIUS = 0.36;
const SWEEP = (4096 * Math.PI) / 180;
const SPEEDUP = 0.55;
// the wisp, as a share of the screen's width, swelling GROW more by the end
const WISP = 0.045;
const GROW = 0.25;
// a coin shed every SHED_MS on the circle, tossed SHED_TOSS px outward
const SHED_MS = 45;
const SHED_TOSS: [number, number] = [15, 70];
// each lap: a burst, a pop and a jolt
const LAP_BURST: [number, number] = [0.35, 0.6];
const LAP_BURST_MS = 240;
const LAP_SHAKE: [number, number] = [0.7, 1.4];
// the blast in the total: coins bursting out of it
const FINAL_COINS = 26;
const FINAL_RING: [number, number] = [90, 300];
const FINAL_SHAKE = 2.9;
const BLAST_SCALE = 1.9;
const SPARK_REACH = 380;
const SPARK_SIZE = 22;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.loopEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { entryMs, loopMs, shootMs, holdMs, mergeMs } = CONFIG.loopEvent;
      const width = area.right - area.left;
      const height = area.bottom - area.top;
      const middle = {
        x: (area.left + area.right) / 2,
        y: (area.top + area.bottom) / 2,
      };
      const radius = Math.min(width, height) * RADIUS;
      const size = Math.max(WISP_SIZE, width * WISP);
      // it ends on the circle's side where it's heading straight up: the left
      // going clockwise, the right going anticlockwise
      const way = Math.random() < 0.5 ? 1 : -1;
      const endAngle = way === 1 ? Math.PI : 0;
      const startAngle = endAngle - way * SWEEP;
      const onCircle = (angle: number, into: Point): Point => {
        into.x = middle.x + Math.cos(angle) * radius;
        into.y = middle.y + Math.sin(angle) * radius;
        return into;
      };
      // flying in along the circle's tangent from a screen's width back
      const entry = onCircle(startAngle, { x: 0, y: 0 });
      const heading = {
        x: -Math.sin(startAngle) * way,
        y: Math.cos(startAngle) * way,
      };
      const from = {
        x: entry.x - heading.x * width,
        y: entry.y - heading.y * width,
      };
      const exit = onCircle(endAngle, { x: 0, y: 0 });
      const loopFrom = entryMs;
      const shootFrom = loopFrom + loopMs;
      const blastAt = shootFrom + shootMs;
      // the total, local to the floor; known once the overlay's first drawn
      let total: Point | null = null;

      // the swept share 0..1, picking up pace
      const sweptAt = (ms: number) => {
        const u = clamp01((ms - loopFrom) / loopMs);
        return (1 - SPEEDUP) * u + SPEEDUP * u * u;
      };
      const angleAt = (ms: number) => startAngle + way * SWEEP * sweptAt(ms);

      // each full lap, and each coin shed on the circle
      const laps: { at: number; spot: Point }[] = [];
      for (let lap = 1; lap * Math.PI * 2 < SWEEP; lap++) {
        // invert the sweep: (1 - S)u + S u² = share
        const share = (lap * Math.PI * 2) / SWEEP;
        const u =
          (-(1 - SPEEDUP) +
            Math.sqrt((1 - SPEEDUP) ** 2 + 4 * SPEEDUP * share)) /
          (2 * SPEEDUP);
        const at = loopFrom + u * loopMs;
        laps.push({ at, spot: onCircle(angleAt(at), { x: 0, y: 0 }) });
      }
      const sheds: number[] = [];
      for (let ms = loopFrom; ms < shootFrom; ms += SHED_MS) sheds.push(ms);

      const point = { x: 0, y: 0 };
      const wispAt = (ms: number): Point | null => {
        if (ms < 0 || ms >= blastAt) return null;
        if (ms < loopFrom) {
          const u = ms / entryMs;
          point.x = from.x + (entry.x - from.x) * u;
          point.y = from.y + (entry.y - from.y) * u;
          return point;
        }
        if (ms < shootFrom) return onCircle(angleAt(ms), point);
        if (!total) return null;
        const u = ((ms - shootFrom) / shootMs) ** 1.6;
        point.x = exit.x + (total.x - exit.x) * u;
        point.y = exit.y + (total.y - exit.y) * u;
        return point;
      };

      const startedAt = performance.now();
      let blastedAt: number | null = null;
      let swooshed = false;
      const lapBeats = createBeats(
        laps,
        (l) => l.at,
        (_, k) => lapped(k),
      );
      const shedBeats = createBeats(
        sheds,
        (ms) => ms,
        (ms) => shed(ms),
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
            lapBeats.tick(ms, now);
            shedBeats.tick(ms, now);
            if (!swooshed && ms >= shootFrom) {
              swooshed = true;
              if (cover?.isLive()) playSwoosh();
            }
            if (blastedAt === null && ms >= blastAt) blast(now);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            laps.forEach((l, k) => {
              const firedAt = lapBeats.firedAt(k);
              if (firedAt === null) return;
              const t = (now - firedAt) / LAP_BURST_MS;
              if (t < 1)
                drawWhiteBurst(
                  ctx,
                  l.spot.x,
                  l.spot.y,
                  t,
                  lerp(LAP_BURST, k / Math.max(1, laps.length - 1)),
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
          // the wisp over the coins it sheds
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

      // on the frame each lap comes round
      function lapped(k: number): void {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAP_SHAKE, k / Math.max(1, laps.length - 1)));
      }
      // a coin tossed outward off the circle
      function shed(ms: number): void {
        if (!cover?.isLive()) return;
        const angle = angleAt(ms);
        const at = onCircle(angle, { x: 0, y: 0 });
        const toss = between(SHED_TOSS);
        cover.launchFrom(at, [
          {
            x: at.x + Math.cos(angle) * toss,
            y: at.y + Math.sin(angle) * toss,
          },
        ]);
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
  { label: "Loop", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Loop
export function forceLoopEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
