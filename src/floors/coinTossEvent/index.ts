// the "Coin Toss" event: it covers its crit, whose click freezes the screen
// while the button streams coins into one giant coin in the screen's middle,
// which swells as they land. It's tossed high, flipping end over end, lands
// face up with a slam on heads or tails, then bursts, showering the screen
// with coins that merge into the total: heads pays more (see ../moneyCover)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import {
  COIN_SPIN_FRAME_COUNT,
  drawCoinBurstFrame,
  getFullestFrame,
} from "../../coinBurst";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawPoppingCritText } from "../../shared/critText";
import { createEventFx, drawWhiteBurst } from "../../shared/eventFx";
import { streamCoins } from "../../shared/eventStream";
import { BTN_H, BTN_W, forceTestCrit } from "../upgradeButton";
import { forceClaimEventProc, registerEventProc } from "../eventProcs";
import {
  canStartMoneyCover,
  coverSpots,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../moneyCover";
import { easeOut as ease } from "../../shared/easing";

const KEY = "coinToss";
const COINS = 300;
// the giant coin's radius once full; it grows from nothing as coins land
const COIN_SIZE = 120;
// how high it's tossed, of the way from its spot to the screen's top
const TOSS_HEIGHT = 0.75;
const FLIPS = 6; // full turns end over end on the way up and down
const LAND_SHAKE = 0.8;
const BURST_SHAKE = 1.2;
const POP_MS = 400;
const LABEL_FONT = 72;
const LABEL_RISE = 80; // px between the coin's top and the label


registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.coinTossEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const config = CONFIG.coinTossEvent;
      const { fillMs, flipMs, showMs, mergeMs } = config;
      const heads = Math.random() < 0.5;
      const fx = createEventFx(fillMs);
      const startedAt = performance.now();
      const tossAt = startedAt + fillMs;
      const landAt = tossAt + flipMs;
      const burstAt = landAt + showMs;
      let spot = { x: 0, y: 0 };
      let top = 0;
      let firstHitAt: number | null = null;
      const fullest = () => getFullestFrame("coin");
      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: fillMs + flipMs + showMs + config.durationMs, mergeMs },
        {
          layout: (area) => coverSpots(area, COINS),
          rewardMultiplier: heads
            ? config.headsMultiplier
            : config.tailsMultiplier,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect || firstHitAt === null) return;
            const now = performance.now();
            ctx.save();
            ctx.translate(rect.left, rect.top);
            if (now >= burstAt) {
              drawWhiteBurst(ctx, spot.x, spot.y, (now - burstAt) / POP_MS);
              ctx.restore();
              return;
            }
            const grow = Math.min(
              1,
              (now - firstHitAt) / Math.max(1, tossAt - firstHitAt),
            );
            const size = COIN_SIZE * ease(grow);
            const drawCoin = (y: number, spinFrame: number) =>
              drawCoinBurstFrame(
                ctx,
                // the flipbook already turns it end over end
                { kind: "coin", spinFrame, axisAngle: 0 },
                spot.x,
                y,
                size,
                ctx.getTransform(),
              );
            if (now < tossAt)
              fx.draw(ctx, spot.x, spot.y, () => drawCoin(spot.y, fullest()));
            else if (now < landAt) {
              // up and back down like a thrown coin, landing face up
              const f = (now - tossAt) / flipMs;
              const rise = (spot.y - top) * TOSS_HEIGHT * 4 * f * (1 - f);
              drawCoin(
                spot.y - rise,
                fullest() + COIN_SPIN_FRAME_COUNT * FLIPS * f,
              );
            } else {
              drawWhiteBurst(ctx, spot.x, spot.y, (now - landAt) / POP_MS, 0.6);
              drawCoin(spot.y, fullest());
              drawPoppingCritText(
                ctx,
                heads
                  ? `Heads \u00d7${config.headsMultiplier}`
                  : `Tails \u00d7${config.tailsMultiplier}`,
                spot.x,
                spot.y - COIN_SIZE - LABEL_RISE,
                heads ? COLOR.heavenlyGold : COLOR.coinGold,
                landAt,
                now,
                { fontSize: LABEL_FONT, strokeWidth: 9 },
              );
            }
            ctx.restore();
          },
        },
      );
      if (!cover) return;
      const { area, button } = cover;
      spot = {
        x: (area.left + area.right) / 2,
        y: (area.top + area.bottom) / 2,
      };
      top = area.top + COIN_SIZE;
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
          target: spot,
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
        if (cover.isLive()) shakeScreen(LAND_SHAKE);
      }, landAt - startedAt);
      setTimeout(() => {
        if (!cover.isLive()) return;
        cover.launchFrom(spot, cover.spots);
        playExplosion();
        shakeScreen(BURST_SHAKE);
      }, burstAt - startedAt);
    },
  },
  { label: "Coin Toss", color: COLOR.coinGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Coin Toss
export function forceCoinTossEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
