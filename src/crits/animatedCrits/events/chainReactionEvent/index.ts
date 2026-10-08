// the "Chain Reaction" event: it covers its crit, whose click freezes the
// screen while glowing mines (the wisp) pop up all over it. The button blows
// first, and each blast sets off the next nearest mine, the explosions racing
// across the screen, ever bigger and harder shaking, each spraying coins;
// then the coins sweep into the total. Pays floor income × floor number
// × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import {
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion } from "../../../../shared/eventFx";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  coverSpots,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import { lerp } from "../../../../shared/easing";

const KEY = "chainReaction";
const MINES = 8;
const REWARD = 4;
// the mines pop up over POP_MS, staggered by POP_STAGGER_MS, at MINE_SIZE of
// a wisp, heating up as the chain nears
const POP_MS = 220;
const POP_STAGGER_MS = 25;
const MINE_SIZE = 0.7;
// each blast's shockwave reaches the next mine at BLAST_SPEED px/ms, kept to
// between GAP_MS apart
const BLAST_SPEED = 2.6;
const GAP_MS: [number, number] = [90, 200];
// the blasts grow from the first to the last
const SHAKE: [number, number] = [0.6, 2.2];
const BLAST: [number, number] = [0.5, 1.6];
const SPARK_REACH = 220;
const SPARK_SIZE = 18;
// the coins each blast sprays, landing this far round it
const COINS: [number, number] = [5, 12];
const SPRAY_R: [number, number] = [60, 220];

// the mines in order, each the nearest still unlit one to the last
function chainFrom(start: Point, spots: Point[]): Point[] {
  const left = [...spots];
  const chain: Point[] = [];
  let at = start;
  while (left.length > 0) {
    let best = 0;
    for (let i = 1; i < left.length; i++)
      if (
        Math.hypot(left[i].x - at.x, left[i].y - at.y) <
        Math.hypot(left[best].x - at.x, left[best].y - at.y)
      )
        best = i;
    at = left.splice(best, 1)[0];
    chain.push(at);
  }
  return chain;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.chainReactionEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { armMs, holdMs, mergeMs } = CONFIG.chainReactionEvent;
      // the button, then every mine, with when each blows (ms in)
      const button = getButtonCenter(context.isGroundFloor);
      const blasts: (Point & { at: number })[] = [{ ...button, at: armMs }];
      for (const mine of chainFrom(button, coverSpots(area, MINES))) {
        const last = blasts[blasts.length - 1];
        const gap = Math.hypot(mine.x - last.x, mine.y - last.y) / BLAST_SPEED;
        blasts.push({
          ...mine,
          at: last.at + Math.min(GAP_MS[1], Math.max(GAP_MS[0], gap)),
        });
      }
      let fired = 0;
      const firedAt: number[] = [];
      const startedAt = performance.now();
      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        {
          durationMs: blasts[blasts.length - 1].at + holdMs + mergeMs,
          mergeMs,
        },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            while (fired < blasts.length && ms >= blasts[fired].at) blow();
            ctx.save();
            ctx.translate(rect.left, rect.top);
            blasts.forEach((mine, i) => {
              if (i === 0 || i < fired) return;
              const pop = Math.min(
                1,
                Math.max(0, (ms - i * POP_STAGGER_MS) / POP_MS),
              );
              // heating up as the chain closes in
              const heat = fired / i;
              drawWisp(
                ctx,
                () => mine,
                ms,
                now,
                WISP_SIZE * MINE_SIZE * pop * (1 + 0.3 * heat),
                heat,
              );
            });
            firedAt.forEach((at, i) => {
              const t = i / (blasts.length - 1);
              drawExplosion(
                ctx,
                blasts[i].x,
                blasts[i].y,
                now - at,
                now,
                lerp(BLAST, t),
                SPARK_REACH * lerp(BLAST, t),
                SPARK_SIZE,
              );
            });
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame each blast is due
      function blow(): void {
        const i = fired++;
        if (!cover?.isLive()) return;
        firedAt.push(performance.now());
        const t = i / (blasts.length - 1);
        if (i === blasts.length - 1) playSlamExplosion();
        else playExplosion();
        shakeScreen(lerp(SHAKE, t));
        const from = blasts[i];
        cover.launchFrom(
          from,
          Array.from({ length: Math.round(lerp(COINS, t)) }, () => {
            const angle = Math.random() * Math.PI * 2;
            const r = lerp(SPRAY_R, Math.random());
            return {
              x: from.x + Math.cos(angle) * r,
              y: from.y + Math.sin(angle) * r,
            };
          }),
        );
      }
    },
  },
  { label: "Chain Reaction", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Chain Reaction
export function forceChainReactionEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
