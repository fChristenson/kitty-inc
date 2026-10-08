// the "Eternity" event: it covers its crit, whose click freezes the screen
// while the wisp shoots up from below it onto one tip of a huge infinity sign
// across its middle and races round the sign twice in a blur of glitter,
// shedding coins all along it; coming back round to the tip heading straight
// up, it flies on up into the total-income readout and explodes in a huge
// blast and shake, coins bursting out of it, and all the coins sweep into the
// total. Pays floor income × floor number × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSlamExplosion, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion } from "../../../../shared/eventFx";
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
import { between, clamp01 } from "../../../../shared/easing";
import { ringTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "eternity";
const REWARD = 4;
// the sign: a lemniscate reaching REACH of the screen's width either side of
// its middle, its loops stretched TALL times their natural height, run PASSES
// times round
const REACH = 0.4;
const TALL = 1.6;
const PASSES = 2;
// the wisp, as a share of the screen's width, swelling GROW more by the end
const WISP = 0.045;
const GROW = 0.25;
// a coin shed every SHED_MS on the sign, tossed SHED_TOSS px outward
const SHED_MS = 45;
const SHED_TOSS: [number, number] = [15, 60];
// the blast in the total: coins bursting out of it
const FINAL_COINS = 30;
const FINAL_RING: [number, number] = [90, 320];
const FINAL_SHAKE = 2.9;
const BLAST_SCALE = 1.9;
const SPARK_REACH = 380;
const SPARK_SIZE = 22;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.eternityEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { entryMs, passMs, shootMs, holdMs, mergeMs } =
        CONFIG.eternityEvent;
      const width = area.right - area.left;
      const middle = {
        x: (area.left + area.right) / 2,
        y: (area.top + area.bottom) / 2,
      };
      const reach = width * REACH;
      const size = Math.max(WISP_SIZE, width * WISP);
      // which tip it joins and leaves the sign at
      const side = Math.random() < 0.5 ? 1 : -1;
      const runFrom = entryMs;
      const shootFrom = runFrom + passMs * PASSES;
      const blastAt = shootFrom + shootMs;
      // the total, local to the floor; known once the overlay's first drawn
      let total: Point | null = null;

      // the sign at t; t runs backwards from 0 so the tip is left heading up
      const onSign = (t: number, into: Point): Point => {
        const sin = Math.sin(t);
        const cos = Math.cos(t);
        const d = 1 + sin * sin;
        into.x = middle.x + (side * reach * cos) / d;
        into.y = middle.y + (TALL * reach * sin * cos) / d;
        return into;
      };
      const tAt = (ms: number) =>
        -Math.PI * 2 * PASSES * clamp01((ms - runFrom) / (shootFrom - runFrom));
      const tip = onSign(0, { x: 0, y: 0 });
      const from = { x: tip.x, y: area.bottom + size * 2 };

      const point = { x: 0, y: 0 };
      const along = (a: Point, b: Point, u: number): Point => {
        point.x = a.x + (b.x - a.x) * u;
        point.y = a.y + (b.y - a.y) * u;
        return point;
      };
      const wispAt = (ms: number): Point | null => {
        if (ms < 0 || ms >= blastAt) return null;
        if (ms < runFrom) return along(from, tip, ms / entryMs);
        if (ms < shootFrom) return onSign(tAt(ms), point);
        if (!total) return null;
        return along(tip, total, (ms - shootFrom) / shootMs);
      };

      const startedAt = performance.now();
      let blastedAt: number | null = null;
      const sheds: number[] = [];
      for (let ms = runFrom; ms < shootFrom; ms += SHED_MS) sheds.push(ms);
      const shedBeats = createBeats(
        sheds,
        (ms) => ms,
        (ms) => shed(ms),
      );
      // breaking off up, and the blast
      const beats = createBeats(
        [shootFrom, blastAt],
        (at) => at,
        (_, k, now) => (k === 1 ? blast(now) : swoosh()),
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
            beats.tick(now - startedAt, now);
            shedBeats.tick(now - startedAt, now);
            if (blastedAt === null) return;
            ctx.save();
            ctx.translate(rect.left, rect.top);
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

      function swoosh(): void {
        if (cover?.isLive()) playSwoosh();
      }
      // a coin tossed outward off the sign, away from its middle
      function shed(ms: number): void {
        if (!cover?.isLive()) return;
        const at = onSign(tAt(ms), { x: 0, y: 0 });
        const dx = at.x - middle.x;
        const dy = at.y - middle.y;
        const d = Math.hypot(dx, dy) || 1;
        const toss = between(SHED_TOSS);
        cover.launchFrom(at, [
          { x: at.x + (dx / d) * toss, y: at.y + (dy / d) * toss },
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
  { label: "Eternity", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Eternity
export function forceEternityEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
