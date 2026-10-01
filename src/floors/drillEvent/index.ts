// the "Drill" event: it covers its crit, whose click freezes the screen while
// the wisp rockets in from off the screen's left edge, white-hot like a drill
// bit, and slams into the clicked floor's income bar: it meets resistance,
// grinding through it in fits and starts as the bar shudders, sparks spray
// back out of the hole and the screen rumbles, then bursts out of the bar's
// other side in a big blast, spraying coins, and shoots on off the screen.
// The coins merge into the total. Pays floor income × floor number × REWARD
// (see ../moneyCover)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playExplosion, playSlamExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawExplosion, drawWhiteBurst } from "../../shared/eventFx";
import { hash01 } from "../../shared/twinkle";
import {
  drawGlitterLight,
  drawWisp,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { forceTestCrit } from "../upgradeButton";
import {
  drawIncomePanel,
  getIncomeBarBox,
  setIncomePanelsHidden,
} from "../incomePanel";
import { forceClaimEventProc, registerEventProc } from "../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../moneyCover";

const KEY = "drill";
const REWARD = 3;
// it flies in from, and out to, this far off the screen's sides
const OUT = 80;
// the resistance: it grinds through in STUTTERS fits and starts, slipping
// back up to SLIP of the way each time, juddering JUDDER px
const STUTTERS = 5;
const SLIP = 0.035;
const JUDDER = 4;
// the bar shudders up to SHUDDER px as it's drilled, and a hot streak glows
// along the drilled channel
const SHUDDER = 4;
const CHANNEL = 10;
const CHANNEL_FADE_MS = 400;
// sparks spraying back out of the hole while it grinds
const SPARKS = 40;
const SPARK_SPEED: [number, number] = [0.35, 1];
const SPARK_GRAVITY = 0.0018;
const SPARK_LIFE_MS = 380;
const SPARK_SIZE = 9;
// hitting the bar, the rumble as it grinds, and the burst out the far side
const HIT_SHAKE = 1;
const HIT_BURST = 0.4;
const HIT_BURST_MS = 360;
const RUMBLES = 5;
const RUMBLE_SHAKE: [number, number] = [0.3, 0.9];
const BLAST_SHAKE = 2.5;
const BLAST_SCALE = 1.7;
const SPARK_REACH = 340;
const BLAST_SPARK = 20;
// the coins sprayed out of the far side, in a cone CONE radians wide
const COINS = 40;
const CONE = 1.4;
const COIN_R: [number, number] = [80, 420];

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = ([a, b]: [number, number], t: number) => a + (b - a) * t;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.drillEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (floor, context) =>
      canStartMoneyCover(context) &&
      context.getOnScreenFloors?.().some((entry) => entry.floor === floor) ===
        true,
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { approachMs, drillMs, exitMs, holdMs, mergeMs } =
        CONFIG.drillEvent;
      const { isGroundFloor } = context;
      const box = getIncomeBarBox(isGroundFloor);
      const y = box.y + box.height / 2;
      const left = box.x;
      const right = box.x + box.width;
      const startX = area.left - OUT;
      const endX = area.right + OUT;
      const hitAt = approachMs;
      const outAt = approachMs + drillMs;
      const goneAt = outAt + exitMs;
      // how far through the bar the drill is: fits and starts, slipping back
      const through = (ms: number) => {
        const u = clamp01((ms - hitAt) / drillMs);
        return clamp01(u - SLIP * Math.sin(u * STUTTERS * Math.PI * 2));
      };
      const drillAt = (ms: number): Point | null => {
        if (ms < 0 || ms >= goneAt) return null;
        if (ms < hitAt)
          return { x: startX + (left - startX) * (ms / approachMs) ** 2, y };
        if (ms < outAt)
          return {
            x: left + (right - left) * through(ms),
            y: y + Math.sin(ms / 7) * JUDDER,
          };
        const u = (ms - outAt) / exitMs;
        return { x: right + (endX - right) * u, y };
      };
      const startedAt = performance.now();
      let hitAtNow: number | null = null;
      let outAtNow: number | null = null;

      setIncomePanelsHidden([floor]);
      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: outAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          onEnd: () => setIncomePanelsHidden([]),
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            if (hitAtNow === null && ms >= hitAt) hit(now);
            if (outAtNow === null && ms >= outAt) burstOut(now);
            const drilling = ms >= hitAt && ms < outAt;
            const shudder = drilling ? SHUDDER * through(ms) : 0;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            ctx.save();
            ctx.translate(
              (Math.random() * 2 - 1) * shudder,
              (Math.random() * 2 - 1) * shudder,
            );
            drawIncomePanel(ctx, floor, isGroundFloor, {
              whiteAlpha:
                outAtNow === null
                  ? 0.25 * through(ms)
                  : Math.max(0, 0.9 - (now - outAtNow) / CHANNEL_FADE_MS),
              rotation: 0,
            });
            ctx.restore();

            // the hot channel drilled through the bar
            if (ms >= hitAt) {
              const reach = ms < outAt ? left + (right - left) * through(ms) : right;
              const fade =
                outAtNow === null
                  ? 1
                  : Math.max(0, 1 - (now - outAtNow) / CHANNEL_FADE_MS);
              if (fade > 0) {
                ctx.save();
                ctx.globalCompositeOperation = "lighter";
                ctx.lineCap = "round";
                for (const [width, color, alpha] of [
                  [CHANNEL * 2.4, COLOR.heavenlyGold, 0.3],
                  [CHANNEL, COLOR.heavenlyGold, 0.8],
                  [CHANNEL * 0.35, COLOR.white, 1],
                ] as const) {
                  ctx.globalAlpha = alpha * fade;
                  ctx.lineWidth = width;
                  ctx.strokeStyle = color;
                  ctx.beginPath();
                  ctx.moveTo(left, y);
                  ctx.lineTo(reach, y);
                  ctx.stroke();
                }
                ctx.restore();
              }
            }

            // sparks spraying back out of the hole as it grinds
            for (let k = 0; k < SPARKS; k++) {
              const bornAt = hitAt + drillMs * (k / SPARKS);
              const age = ms - bornAt;
              if (age < 0 || age >= SPARK_LIFE_MS) continue;
              const angle = Math.PI + (hash01(k, 71) * 2 - 1) * 0.9;
              const speed = lerp(SPARK_SPEED, hash01(k, 72));
              const life = age / SPARK_LIFE_MS;
              drawGlitterLight(
                ctx,
                left + Math.cos(angle) * speed * age,
                y + Math.sin(angle) * speed * age + 0.5 * SPARK_GRAVITY * age * age,
                SPARK_SIZE * (1 - life),
                k,
                1 - life,
                now,
              );
            }
            if (hitAtNow !== null)
              drawWhiteBurst(
                ctx,
                left,
                y,
                (now - hitAtNow) / HIT_BURST_MS,
                HIT_BURST,
              );
            if (outAtNow !== null)
              drawExplosion(
                ctx,
                right,
                y,
                now - outAtNow,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                BLAST_SPARK,
              );
            ctx.restore();
          },
          // the drill over the coins it bursts out
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            ctx.save();
            ctx.translate(rect.left, rect.top);
            drawWisp(ctx, drillAt, now - startedAt, now, WISP_SIZE, 1);
            ctx.restore();
          },
        },
      );
      if (!cover) {
        setIncomePanelsHidden([]);
        return;
      }

      // the rumble building as it grinds through
      for (let i = 0; i < RUMBLES; i++) {
        const u = i / (RUMBLES - 1);
        setTimeout(
          () => {
            if (cover.isLive()) shakeScreen(lerp(RUMBLE_SHAKE, u));
          },
          hitAt + drillMs * (0.15 + 0.8 * u),
        );
      }

      // on the frame it slams into the bar
      function hit(now: number): void {
        hitAtNow = now;
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(HIT_SHAKE);
      }
      // on the frame it bursts out the far side: coins spray on ahead of it
      function burstOut(now: number): void {
        outAtNow = now;
        if (!cover?.isLive()) return;
        playSlamExplosion();
        shakeScreen(BLAST_SHAKE);
        const exit = { x: right, y };
        cover.launchFrom(
          exit,
          Array.from({ length: COINS }, () => {
            const angle = (Math.random() * 2 - 1) * (CONE / 2);
            const r = lerp(COIN_R, Math.random());
            return {
              x: exit.x + Math.cos(angle) * r,
              y: exit.y + Math.sin(angle) * r,
            };
          }),
        );
      }
    },
  },
  { label: "Drill", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Drill
export function forceDrillEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
