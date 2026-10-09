// the "Catcher" event: it covers its crit, whose click freezes the screen
// while wisps drop one after another from the top of the screen, ever faster,
// and a catcher wisp dashes side to side along the clicked floor's button row
// to catch each one: every catch a squash, a flash, a pop, a jolt and coins
// bursting up off it. Then a huge wisp plunges dead over the button, the
// catcher races back under it and catches it in a huge blast and shake, and
// the coins sweep into the total. Pays floor income × floor number × REWARD
// (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop } from "../../../../sound";
import {
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import { between, clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { ringTargets, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "catcher";
const REWARD = 4;
// drops before the big one, each landing at least MIN_DASH of the screen's
// width from the last, EDGE_MARGIN of it in from its sides
const DROPS = 8;
const MIN_DASH = 0.3;
const EDGE_MARGIN = 0.12;
// the wisps, as shares of the screen's width
const CATCHER = 0.08;
const DROP = 0.05;
const BIG_DROP = 0.15;
// each catch squashes the catcher DIP of its size down, settling over DIP_MS
const DIP = 0.35;
const DIP_MS = 180;
// each catch: a burst, a jolt and coins bursting up off it
const CATCH_BURST: [number, number] = [0.3, 0.6];
const CATCH_BURST_MS = 240;
const CATCH_SHAKE: [number, number] = [0.6, 1.5];
const CATCH_COINS: [number, number] = [3, 5];
const SPRAY: [number, number] = [80, 230];
const SPRAY_SPAN = 1.8;
// the big one: the screen rumbling as it plunges, a huge blast and a ring
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.2, 0.8];
const FINAL_COINS = 28;
const FINAL_RING: [number, number] = [130, 380];
const FINAL_SHAKE = 2.9;
const BLAST_SCALE = 2;
const SPARK_REACH = 400;
const SPARK_SIZE = 22;

interface Drop {
  x: number;
  catchAt: number;
  fallMs: number;
  size: number;
  final: boolean;
  at: (ms: number) => Point | null;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.catcherEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const {
        firstCatchMs,
        gapMs,
        fallMs,
        finalFallMs,
        finalGapMs,
        holdMs,
        mergeMs,
      } = CONFIG.catcherEvent;
      const width = area.right - area.left;
      const margin = width * EDGE_MARGIN;
      const button = getButtonCenter(context.isGroundFloor);
      const catcher = Math.max(WISP_SIZE * 1.2, width * CATCHER);
      const catchY = button.y - catcher * 0.4;
      const top = area.top - width * BIG_DROP;

      const spotAfter = (x: number): number => {
        let next = x;
        for (let k = 0; k < 8 && Math.abs(next - x) < width * MIN_DASH; k++)
          next = between([area.left + margin, area.right - margin]);
        return next;
      };
      const drops: Drop[] = [];
      let x = button.x;
      let catchAt = firstCatchMs;
      for (let k = 0; k <= DROPS; k++) {
        const final = k === DROPS;
        if (k > 0)
          catchAt += final ? finalGapMs : lerp(gapMs, (k - 1) / (DROPS - 2));
        x = final ? button.x : spotAfter(x);
        const drop: Drop = {
          x,
          catchAt,
          fallMs: final ? finalFallMs : lerp(fallMs, k / (DROPS - 1)),
          size: Math.max(WISP_SIZE, width * (final ? BIG_DROP : DROP)),
          final,
          at: () => null,
        };
        const from = drop.catchAt - drop.fallMs;
        const point = { x: drop.x, y: 0 };
        drop.at = (ms) => {
          if (ms < from || ms >= drop.catchAt) return null;
          const u = (ms - from) / drop.fallMs;
          point.y = top + (catchY - top) * u * u;
          return point;
        };
        drops.push(drop);
      }
      const last = drops[DROPS];
      const bigFrom = last.catchAt - last.fallMs;

      let caughtAt = -Infinity;
      const startedAt = performance.now();
      const catcherPoint = { x: button.x, y: catchY };
      // dashing from each catch to the next drop's spot, squashed on a catch
      const catcherAt = (ms: number): Point | null => {
        if (ms < 0 || ms >= last.catchAt) return null;
        let fromX = button.x;
        let fromMs = 0;
        for (const drop of drops) {
          if (ms < drop.catchAt) {
            const u = smoothstep((ms - fromMs) / (drop.catchAt - fromMs));
            catcherPoint.x = fromX + (drop.x - fromX) * u;
            break;
          }
          fromX = drop.x;
          fromMs = drop.catchAt;
        }
        const dip = Math.max(0, 1 - (startedAt + ms - caughtAt) / DIP_MS);
        catcherPoint.y = button.y + DIP * catcher * dip * dip;
        return catcherPoint;
      };
      let lastRumble = -Infinity;

      const beats = createBeats(
        drops,
        (drop) => drop.catchAt,
        (drop, k, now) => caught(drop, k, now),
      );

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: last.catchAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            beats.tick(ms, now);
            if (
              ms >= bigFrom &&
              ms < last.catchAt &&
              now - lastRumble >= RUMBLE_MS
            ) {
              lastRumble = now;
              shakeScreen(lerp(RUMBLE, (ms - bigFrom) / last.fallMs));
            }
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (let k = 0; k < DROPS; k++) {
              const firedAt = beats.firedAt(k);
              if (firedAt === null) break;
              const t = (now - firedAt) / CATCH_BURST_MS;
              if (t < 1)
                drawWhiteBurst(
                  ctx,
                  drops[k].x,
                  catchY,
                  t,
                  lerp(CATCH_BURST, k / (DROPS - 1)),
                );
            }
            const blastedAt = beats.firedAt(DROPS);
            if (blastedAt !== null)
              drawExplosion(
                ctx,
                last.x,
                catchY,
                now - blastedAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            ctx.restore();
          },
          // the wisps over the coins they knock loose
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            const heat = clamp01(ms / last.catchAt);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (const drop of drops)
              drawWispBetween(
                ctx,
                drop.at,
                ms,
                now,
                drop.size,
                drop.final ? 1 : heat,
                drop.catchAt - drop.fallMs,
                drop.catchAt,
              );
            drawWispBetween(
              ctx,
              catcherAt,
              ms,
              now,
              catcher,
              heat,
              0,
              last.catchAt,
            );
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame each drop lands on the catcher
      function caught(drop: Drop, k: number, now: number): void {
        caughtAt = now;
        if (!cover?.isLive()) return;
        const at = { x: drop.x, y: catchY };
        if (drop.final) {
          playSlamExplosion();
          shakeScreen(FINAL_SHAKE);
          cover.launchFrom(at, ringTargets(at, FINAL_COINS, FINAL_RING));
          return;
        }
        const t = k / (DROPS - 1);
        playBloop();
        playExplosion();
        shakeScreen(lerp(CATCH_SHAKE, t));
        cover.launchFrom(
          at,
          sprayTargets(
            at,
            Math.round(lerp(CATCH_COINS, t)),
            SPRAY,
            -Math.PI / 2,
            SPRAY_SPAN,
          ),
        );
      }
    },
  },
  { label: "Catcher", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Catcher
export function forceCatcherEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}
