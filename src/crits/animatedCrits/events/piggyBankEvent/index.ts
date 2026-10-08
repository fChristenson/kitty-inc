// the "Piggy Bank" event: it covers its crit, whose click freezes the screen
// while the button streams coins into a wisp (shared/wisp) in the screen's middle that
// swells and wiggles until it bursts, showering the screen with coins that
// merge into the total (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { pickCritTierByOdds } from "../../../critTypes";
import { createEventFx, drawWhiteBurst } from "../../../../shared/eventFx";
import { streamCoins } from "../../../../shared/eventStream";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  coverSpots,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";

const KEY = "piggyBank";
const COINS = 300;
const BURST_SHAKE = 1.2;
const POP_MS = 400;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.piggyBankEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const { fillMs, durationMs, mergeMs, rewardMultiplier } =
        CONFIG.piggyBankEvent;
      const fx = createEventFx(fillMs);
      const burstDueAt = performance.now() + fillMs;
      let piggy = { x: 0, y: 0 };
      let firstHitAt: number | null = null;
      let burstAt: number | null = null;
      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: fillMs + durationMs, mergeMs },
        {
          layout: (area) => coverSpots(area, COINS),
          rewardMultiplier,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            const now = performance.now();
            if (burstAt === null) {
              if (firstHitAt !== null) {
                const t = Math.min(
                  1,
                  (now - firstHitAt) / Math.max(1, burstDueAt - firstHitAt),
                );
                const size = WISP_SIZE * (1 - (1 - t) ** 2);
                fx.draw(ctx, piggy.x, piggy.y, ({ white }) =>
                  drawWisp(ctx, () => piggy, now, now, size, white),
                );
              }
            } else
              drawWhiteBurst(ctx, piggy.x, piggy.y, (now - burstAt) / POP_MS);
            ctx.restore();
          },
        },
      );
      if (!cover) return;
      const { area, button } = cover;
      piggy = {
        x: (area.left + area.right) / 2,
        y: (area.top + area.bottom) / 2,
      };
      streamCoins(
        [
          {
            floor,
            x: button.x,
            y: button.y,
            spreadX: BTN_W * 0.75,
            spreadY: BTN_H / 2,
          },
        ],
        {
          target: piggy,
          durationMs: fillMs,
          isRunning: cover.isLive,
          onEachArrive: () => {
            const now = performance.now();
            firstHitAt ??= now;
            fx.hit(now);
          },
        },
      );
      playBoostEventStream();

      setTimeout(() => {
        if (!cover.isLive()) return;
        burstAt = performance.now();
        cover.launchFrom(piggy, cover.spots);
        playExplosion();
        shakeScreen(BURST_SHAKE);
      }, fillMs);
    },
  },
  { label: "Piggy Bank", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Piggy Bank
export function forcePiggyBankEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
