// the "Hammer Throw" event: it covers its crit, whose click freezes the screen
// while the wisp whirls round the clicked floor's button like a hammer throw,
// its circle widening and its laps coming ever faster, each a whoosh and a
// jolt; then it lets go and flies dead straight to the screen's far edge,
// smashing into it in a huge blast, bang and shake that knocks the whole
// frozen screen sideways, and coins burst back out of the impact across the
// screen, then merge into the total. Pays floor income × floor number × REWARD
// (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSlamExplosion, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion } from "../../../../shared/eventFx";
import type { FrameMotion } from "../../../../shared/screenFreeze";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import { lerp } from "../../../../shared/easing";

const KEY = "hammerThrow";
const REWARD = 4;
// the whirl: its radius widening, its laps per second speeding up
const RADIUS: [number, number] = [40, 170];
const LAPS_PER_S: [number, number] = [1.5, 6.5];
// each lap's jolt, growing
const LAP_SHAKE: [number, number] = [0.15, 0.6];
// the impact: a blast, and the frozen frame knocked KNOCK of the screen's
// width away from it, springing back
const HIT_SHAKE = 2.8;
const HIT_SCALE = 1.9;
const SPARK_REACH = 380;
const SPARK_SIZE = 24;
const KNOCK = 0.04;
const KNOCK_MS = 180;
const KNOCK_HZ = 9;
const FLASH_MS = 220;
const FLASH_ALPHA = 0.7;
// coins bursting back out of the impact in a fan
const COINS = 56;
const FAN = 1.3;
const COIN_REACH: [number, number] = [0.15, 0.9];


registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.hammerThrowEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (floor, context) =>
      canStartMoneyCover(context) &&
      context.getOnScreenFloors?.().some((entry) => entry.floor === floor) ===
        true,
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { whirlMs, holdMs, mergeMs } = CONFIG.hammerThrowEvent;
      const center = getButtonCenter(context.isGroundFloor);
      const width = area.right - area.left;
      const coinTop = area.top + 40;
      const coinBottom = area.bottom - 40;
      // it's let go flying toward the screen's far side, off the circle's
      // top (heading right) or bottom (heading left)
      const dir = center.x < area.left + width / 2 ? 1 : -1;
      const whirlS = whirlMs / 1000;
      const sweep = (s: number) =>
        Math.PI *
        2 *
        (LAPS_PER_S[0] * s +
          ((LAPS_PER_S[1] - LAPS_PER_S[0]) * s * s) / (2 * whirlS));
      const startAngle = -dir * (Math.PI / 2) - sweep(whirlS);
      const radiusAt = (ms: number) => lerp(RADIUS, (ms / whirlMs) ** 0.7);
      const release = {
        x: center.x,
        y: center.y - dir * RADIUS[1],
      };
      // flying on at the speed it was whirling
      const speed = (RADIUS[1] * Math.PI * 2 * LAPS_PER_S[1]) / 1000;
      const impact = { x: dir > 0 ? area.right : area.left, y: release.y };
      const hitMs = whirlMs + Math.abs(impact.x - release.x) / speed;
      const startedAt = performance.now();
      let laps = 0;
      let releasedAt: number | null = null;
      let hitAt: number | null = null;

      const wispAt = (ms: number): Point | null => {
        if (ms < 0 || ms >= hitMs) return null;
        if (ms >= whirlMs)
          return { x: release.x + dir * speed * (ms - whirlMs), y: release.y };
        const angle = startAngle + sweep(ms / 1000);
        const r = radiusAt(ms);
        return {
          x: center.x + Math.cos(angle) * r,
          y: center.y + Math.sin(angle) * r,
        };
      };

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: hitMs + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          frameMotion: (): FrameMotion => {
            const t = hitAt === null ? Infinity : performance.now() - hitAt;
            // still once the knock has died out, so the cheap frozen frame returns
            if (t > KNOCK_MS * 6)
              return { pan: 0, scaleX: 1, scaleY: 1, blur: 0 };
            const knock = KNOCK * Math.exp(-t / KNOCK_MS);
            // scaled up by at least twice the pan, so no edge ever shows
            const scale = 1 + 2 * knock;
            return {
              pan: dir * knock * Math.cos((t / 1000) * KNOCK_HZ * Math.PI * 2),
              scaleX: scale,
              scaleY: scale,
              blur: 0,
            };
          },
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            const lapsNow = Math.floor(
              sweep(Math.min(ms, whirlMs) / 1000) / (Math.PI * 2),
            );
            while (laps < lapsNow) lap(laps++);
            if (releasedAt === null && ms >= whirlMs) letGo(now);
            if (hitAt === null && ms >= hitMs) hit(now);
            if (hitAt === null) return;
            const since = now - hitAt;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            drawExplosion(
              ctx,
              impact.x,
              impact.y,
              since,
              now,
              HIT_SCALE,
              SPARK_REACH,
              SPARK_SIZE,
            );
            const flash = 1 - since / FLASH_MS;
            if (flash > 0) {
              ctx.globalCompositeOperation = "lighter";
              ctx.globalAlpha = FLASH_ALPHA * flash;
              ctx.fillStyle = COLOR.white;
              ctx.fillRect(area.left, area.top, width, area.bottom - area.top);
            }
            ctx.restore();
          },
          // the wisp over the coins
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            drawWisp(
              ctx,
              wispAt,
              ms,
              now,
              WISP_SIZE,
              Math.min(1, ms / whirlMs),
            );
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame each lap comes round
      function lap(k: number): void {
        if (!cover?.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(LAP_SHAKE, Math.min(1, k / 4)));
      }
      // on the frame it's let go
      function letGo(now: number): void {
        releasedAt = now;
        if (cover?.isLive()) playSwoosh();
      }
      // on the frame it smashes into the edge: coins burst back out of it
      function hit(now: number): void {
        hitAt = now;
        if (!cover?.isLive()) return;
        playSlamExplosion();
        shakeScreen(HIT_SHAKE);
        const back = dir > 0 ? Math.PI : 0;
        cover.launchFrom(
          impact,
          Array.from({ length: COINS }, () => {
            const angle = back + (Math.random() * 2 - 1) * (FAN / 2);
            const r = width * lerp(COIN_REACH, Math.sqrt(Math.random()));
            return {
              x: impact.x + Math.cos(angle) * r,
              y: Math.min(
                coinBottom,
                Math.max(coinTop, impact.y + Math.sin(angle) * r),
              ),
            };
          }),
        );
      }
    },
  },
  { label: "Hammer Throw", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Hammer Throw
export function forceHammerThrowEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
