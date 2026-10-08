// the "Jackpot Reels" event: it covers its crit, whose click freezes the screen
// while the button streams coins into three slot reels in the screen's middle.
// The reels stop one by one, each with a slam on a multiplier; their sum (more
// when all three match) multiplies the payout, and the reels burst into coins
// that merge into the total (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { loadImageByName } from "../../../../loadAssets";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawCachedCritText } from "../../../critFlash/critText";
import { drawWhiteBurst } from "../../../../shared/eventFx";
import { drawGoldShimmer } from "../../../../shared/goldShimmer";
import { drawGlimmerAura } from "../../../../shared/twinkle";
import {
  drawSlamTarget,
  getSlamPose,
  SLAM_LAND_MS,
  triggerEventEndSlam,
} from "../../../../shared/eventEndSlam";
import { streamCoins } from "../../../../shared/eventStream";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  coverSpots,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";

const KEY = "jackpotReels";
const COINS = 300;
const REELS = 3;
// slotsFrame.webp's size and its three see-through reel windows, in its pixels
const FRAME_SIZE = { width: 777, height: 527 };
const WINDOWS = [
  { left: 137, top: 144, right: 270, bottom: 366 },
  { left: 320, top: 144, right: 453, bottom: 366 },
  { left: 500, top: 144, right: 629, bottom: 366 },
];
// each reel reaches this far (frame pixels) under the window's outline
const WINDOW_BLEED = 6;
// the frame's width on screen, at most, and its gap to the screen's sides
const FRAME_W = 640;
const FRAME_MARGIN = 8;
const LABEL_FONT = 40;
// the glimmers twinkling around the machine: how many sets of them, and how
// far past the frame they reach (of its size)
const GLIMMER_SETS = 4;
const GLIMMER_REACH = 1.2;
// how fast a reel scrolls at its top speed, in symbols
const SYMBOL_MS = 45;
// the order the symbols (indexes into CONFIG's) pass by on every reel
const STRIP = [0, 1, 0, 2, 0, 1, 0, 1, 2];
const SYMBOL_COLORS = [COLOR.moneyGreen, COLOR.blue, COLOR.heavenlyGold];
const BURST_SHAKE = 1.2;
const FADE_MS = 250;
const LABEL_POP_MS = 250;

interface Reel {
  from: number; // strip position at the start
  to: number; // strip position it stops on
  stopAt: number;
}

type Box = { x: number; y: number; width: number; height: number };

let frameImage: HTMLImageElement | null = null;
void loadImageByName("slotsFrame").then((image) => (frameImage = image));

const mod = (n: number, m: number) => ((n % m) + m) % m;

function rollSymbol(): number {
  const { symbols } = CONFIG.jackpotReelsEvent;
  let roll = Math.random() * symbols.reduce((sum, s) => sum + s.weight, 0);
  for (let i = 0; i < symbols.length; i++) {
    roll -= symbols[i].weight;
    if (roll < 0) return i;
  }
  return symbols.length - 1;
}

// a reel that spins for spinMs and lands on the symbol
function planReel(symbol: number, startedAt: number, spinMs: number): Reel {
  const from = Math.floor(Math.random() * STRIP.length);
  let to = from + Math.round(spinMs / SYMBOL_MS);
  while (STRIP[mod(to, STRIP.length)] !== symbol) to++;
  return { from, to, stopAt: startedAt + spinMs };
}

// slowing down until it stops on its symbol
function reelPosition(reel: Reel, startedAt: number, now: number): number {
  const t = Math.min(1, (now - startedAt) / (reel.stopAt - startedAt));
  return reel.from + (reel.to - reel.from) * (1 - (1 - t) ** 3);
}

// a reel showing through its window; only its symbols hop when it slams
function drawReel(
  ctx: CanvasRenderingContext2D,
  box: Box,
  position: number,
  slamPart: [object, string],
): void {
  const { symbols } = CONFIG.jackpotReelsEvent;
  const { x, y, width, height } = box;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.fillStyle = COLOR.white;
  ctx.fill();
  ctx.clip();
  const cx = x + width / 2;
  const cy = y + height / 2;
  const step = height * 0.6;
  const fontSize = width * 0.5;
  drawSlamTarget(
    ctx,
    getSlamPose(slamPart[0], slamPart[1], Date.now()),
    box,
    { radius: 0 },
    () => {
      for (
        let k = Math.floor(position) - 1;
        k <= Math.ceil(position) + 1;
        k++
      ) {
        const symbol = STRIP[mod(k, STRIP.length)];
        drawCachedCritText(
          ctx,
          `×${symbols[symbol].value}`,
          cx,
          cy + (position - k) * step,
          SYMBOL_COLORS[symbol],
          { fontSize, strokeWidth: fontSize * 0.15 },
        );
      }
    },
  );
  // shaded top and bottom, so it reads as a turning drum
  ctx.fillStyle = reelShade(ctx, y, height);
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}

// a reel's shade only depends on where its window sits, so it's built once
const shades = new Map<string, CanvasGradient>();
function reelShade(
  ctx: CanvasRenderingContext2D,
  y: number,
  height: number,
): CanvasGradient {
  const key = `${y}|${height}`;
  let shade = shades.get(key);
  if (shade) return shade;
  if (shades.size > 12) shades.clear();
  shade = ctx.createLinearGradient(0, y, 0, y + height);
  shade.addColorStop(0, "rgba(0, 0, 0, 0.45)");
  shade.addColorStop(0.3, "rgba(0, 0, 0, 0)");
  shade.addColorStop(0.7, "rgba(0, 0, 0, 0)");
  shade.addColorStop(1, "rgba(0, 0, 0, 0.45)");
  shades.set(key, shade);
  return shade;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.jackpotReelsEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) =>
      frameImage !== null && canStartMoneyCover(context),
    arm: (floor, context) => {
      const {
        spinMs,
        stopGapMs,
        holdMs,
        durationMs,
        mergeMs,
        symbols,
        matchBonus,
      } = CONFIG.jackpotReelsEvent;
      const rolled = Array.from({ length: REELS }, rollSymbol);
      const matched = rolled.every((s) => s === rolled[0]);
      const multiplier =
        rolled.reduce((sum, s) => sum + symbols[s].value, 0) *
        (matched ? matchBonus : 1);
      const label = matched ? `JACKPOT ×${multiplier}` : `×${multiplier}`;
      const startedAt = performance.now();
      const reels = rolled.map((symbol, i) =>
        planReel(symbol, startedAt, spinMs + i * stopGapMs),
      );
      const lastStopAt = reels[REELS - 1].stopAt;
      const labelAt = lastStopAt + SLAM_LAND_MS;
      const burstDelay = lastStopAt - startedAt + holdMs;
      // keys this run's reel slams
      const slamOwner = {};
      // the frame on screen, floor-local; set once the cover knows the screen
      let frame: Box = { x: 0, y: 0, width: 0, height: 0 };
      let burstAt: number | null = null;
      const scale = () => frame.width / FRAME_SIZE.width;
      const reelBox = (i: number): Box => {
        const w = WINDOWS[i];
        return {
          x: frame.x + (w.left - WINDOW_BLEED) * scale(),
          y: frame.y + (w.top - WINDOW_BLEED) * scale(),
          width: (w.right - w.left + 1 + WINDOW_BLEED * 2) * scale(),
          height: (w.bottom - w.top + 1 + WINDOW_BLEED * 2) * scale(),
        };
      };
      const reelCenter = (i: number) => {
        const box = reelBox(i);
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      };

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: burstDelay + durationMs, mergeMs },
        {
          layout: (area) => coverSpots(area, COINS),
          rewardMultiplier: multiplier,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect || !frameImage) return;
            const now = performance.now();
            ctx.save();
            ctx.translate(rect.left, rect.top);
            const cx = frame.x + frame.width / 2;
            if (burstAt !== null) {
              const t = (now - burstAt) / FADE_MS;
              drawWhiteBurst(ctx, cx, frame.y + frame.height / 2, t);
              ctx.globalAlpha = Math.max(0, 1 - t);
            }
            if (ctx.globalAlpha > 0) {
              const cy = frame.y + frame.height / 2;
              drawGoldShimmer(ctx, cx, cy, frame.width * 0.7, 1, 1.5, now);
              reels.forEach((reel, i) =>
                drawReel(ctx, reelBox(i), reelPosition(reel, startedAt, now), [
                  slamOwner,
                  `reel${i}`,
                ]),
              );
              ctx.drawImage(
                frameImage,
                frame.x,
                frame.y,
                frame.width,
                frame.height,
              );
              for (let s = 0; s < GLIMMER_SETS; s++)
                drawGlimmerAura(
                  ctx,
                  cx,
                  cy + (frame.height * GLIMMER_REACH) / 2,
                  frame.width * GLIMMER_REACH,
                  frame.height * GLIMMER_REACH,
                  frame.width * 0.07,
                  COLOR.heavenlyGold,
                  s + 1,
                  now,
                );
              if (now >= labelAt) {
                const pop =
                  1 + 0.4 * Math.max(0, 1 - (now - labelAt) / LABEL_POP_MS);
                ctx.translate(cx, frame.y - LABEL_FONT * 0.6);
                ctx.scale(pop, pop);
                drawCachedCritText(ctx, label, 0, 0, COLOR.heavenlyGold, {
                  fontSize: LABEL_FONT,
                  strokeWidth: 8,
                });
              }
            }
            ctx.restore();
          },
        },
      );
      if (!cover) return;
      const { area, button } = cover;
      const width = Math.min(
        FRAME_W,
        area.right - area.left - FRAME_MARGIN * 2,
      );
      const height = (width * FRAME_SIZE.height) / FRAME_SIZE.width;
      frame = {
        x: (area.left + area.right) / 2 - width / 2,
        y: (area.top + area.bottom) / 2 - height / 2,
        width,
        height,
      };

      reels.forEach((reel, i) => {
        // each reel is fed until it stops
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
            target: reelCenter(i),
            durationMs: reel.stopAt - startedAt,
            isRunning: cover.isLive,
          },
        );
        setTimeout(() => {
          if (cover.isLive()) triggerEventEndSlam(slamOwner, `reel${i}`);
        }, reel.stopAt - startedAt);
      });
      playBoostEventStream();

      setTimeout(() => {
        if (!cover.isLive()) return;
        burstAt = performance.now();
        const share = Math.ceil(cover.spots.length / REELS);
        for (let i = 0; i < REELS; i++)
          cover.launchFrom(
            reelCenter(i),
            cover.spots.slice(i * share, (i + 1) * share),
          );
        playExplosion();
        shakeScreen(BURST_SHAKE);
      }, burstDelay);
    },
  },
  { label: "Jackpot", color: COLOR.red },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Jackpot Reels
export function forceJackpotReelsEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
