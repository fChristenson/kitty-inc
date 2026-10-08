// the "Clash" event: it covers its crit, whose click freezes the screen
// while two wisps streak in from off opposite sides of it at a random angle
// and crash head-on in its middle. Like two fish fighting they bounce apart,
// circle and dart back in, slamming again and again, ever harder, each slam a
// flash, a bang, a jolt and coins knocked out. Then they pull far apart,
// tremble as they wind up, and charge into one last huge slam that blasts
// them into coins, which sweep into the total. Pays floor income × floor
// number × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSwoosh } from "../../../../sound";
import {
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import {
  lerp,
  clamp01,
  between,
  smoothstep as smooth,
} from "../../../../shared/easing";
import { ringTargets, sprayTargets } from "../../../../shared/coinTargets";

const KEY = "clash";
const REWARD = 4;
// slams after the first, before the last big one
const ROUNDS = 3;
// the wisps at SIZE of the screen's width, swelling by WIND_GROW winding up
const SIZE = 0.065;
const WIND_GROW = 0.5;
// each bounce: back out to BOUNCE of the screen's half-size (shrinking as
// they quicken), swinging CURVE of that sideways as they circle, the fight
// turning TURN rad between slams; RECOIL of each round spent backing off
const BOUNCE: [number, number] = [0.5, 0.32];
const FINAL_BOUNCE = 0.75;
const CURVE = 0.45;
const TURN: [number, number] = [0.5, 1];
const RECOIL = 0.42;
// the last: backing off, winding up (trembling TREMBLE px), then charging
const FINAL_PHASES = [0.32, 0.38, 0.3];
const TREMBLE = 12;
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.1, 0.5];
// each slam: a burst, a jolt and coins knocked out
const SLAM_BURST: [number, number] = [0.4, 0.75];
const SLAM_BURST_MS = 280;
const SLAM_SHAKE: [number, number] = [0.8, 1.7];
const SLAM_COINS: [number, number] = [4, 7];
const SPRAY: [number, number] = [90, 260];
// the last slam: a huge blast and a ring of FINAL_COINS
const FINAL_COINS = 32;
const FINAL_RING: [number, number] = [140, 400];
const FINAL_SHAKE = 2.8;
const BLAST_SCALE = 2;
const SPARK_REACH = 420;
const SPARK_SIZE = 24;

interface Slam {
  at: number;
  // the fight's axis then, rad
  angle: number;
  firedAt: number | null;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.clashEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { entryMs, roundMs, finalMs, holdMs, mergeMs } = CONFIG.clashEvent;
      const width = area.right - area.left;
      const height = area.bottom - area.top;
      const center = {
        x: (area.left + area.right) / 2,
        y: (area.top + area.bottom) / 2,
      };
      const size = Math.max(WISP_SIZE * 1.4, width * SIZE);
      const half = Math.min(width, height) / 2 - size;
      // where each stops, touching the other, and where they come in from
      const contact = size * 0.35;
      const offscreen = Math.hypot(width, height) / 2 + size * 2;

      let at = entryMs;
      let angle = Math.random() * Math.PI * 2;
      const slams: Slam[] = Array.from({ length: ROUNDS + 2 }, (_, k) => {
        const slam: Slam = { at, angle, firedAt: null };
        if (k <= ROUNDS) {
          at += k === ROUNDS ? finalMs : lerp(roundMs, k / (ROUNDS - 1));
          angle += (Math.random() < 0.5 ? -1 : 1) * between(TURN);
        }
        return slam;
      });
      const last = slams[slams.length - 1];
      const windFrom = last.at - finalMs * (FINAL_PHASES[1] + FINAL_PHASES[2]);
      const chargeFrom = last.at - finalMs * FINAL_PHASES[2];
      const startedAt = performance.now();
      let lastRumble = -Infinity;

      // wisp `side` (-1 or 1) ms in: the two always mirror each other
      // through the middle, so they meet there
      const wispAt = (side: number, ms: number): Point | null => {
        if (ms < 0 || ms >= last.at) return null;
        let along: number;
        let across = 0;
        let axis: number;
        if (ms < slams[0].at) {
          const v = ms / entryMs;
          along = offscreen - (offscreen - contact) * v * v;
          axis = slams[0].angle;
        } else {
          const k = slams.findIndex((s) => ms < s.at) - 1;
          const from = slams[k];
          const to = slams[k + 1];
          const u = (ms - from.at) / (to.at - from.at);
          axis = from.angle + (to.angle - from.angle) * smooth(u);
          if (to === last) {
            const reach = half * FINAL_BOUNCE;
            const [backOff, windUp] = FINAL_PHASES;
            if (u < backOff) {
              const v = u / backOff;
              along = contact + (reach - contact) * (1 - (1 - v) ** 2);
            } else if (u < backOff + windUp) {
              const wind = (u - backOff) / windUp;
              along = reach + Math.sin(ms * 1.1) * TREMBLE * wind;
              across = Math.sin(ms * 1.7 + 1) * TREMBLE * wind;
            } else {
              const v = (u - backOff - windUp) / FINAL_PHASES[2];
              along = reach - (reach - contact) * v ** 3;
            }
            across +=
              reach * CURVE * 0.3 * Math.sin(Math.PI * clamp01(u / backOff));
          } else {
            const reach = half * lerp(BOUNCE, k / (ROUNDS - 1));
            if (u < RECOIL) {
              const v = u / RECOIL;
              along = contact + (reach - contact) * (1 - (1 - v) ** 2);
            } else {
              const v = (u - RECOIL) / (1 - RECOIL);
              along = reach - (reach - contact) * v * v;
            }
            across = reach * CURVE * Math.sin(Math.PI * u);
          }
        }
        const cos = Math.cos(axis);
        const sin = Math.sin(axis);
        return {
          x: center.x + side * (cos * along - sin * across),
          y: center.y + side * (sin * along + cos * across),
        };
      };

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: last.at + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            slams.forEach((slam, k) => {
              if (slam.firedAt === null && ms >= slam.at) fire(slam, k, now);
            });
            if (
              ms >= windFrom &&
              ms < last.at &&
              now - lastRumble >= RUMBLE_MS
            ) {
              lastRumble = now;
              shakeScreen(lerp(RUMBLE, (ms - windFrom) / (last.at - windFrom)));
            }
            ctx.save();
            ctx.translate(rect.left, rect.top);
            slams.forEach((slam, k) => {
              if (slam.firedAt === null || slam === last) return;
              drawWhiteBurst(
                ctx,
                center.x,
                center.y,
                (now - slam.firedAt) / SLAM_BURST_MS,
                lerp(SLAM_BURST, k / ROUNDS),
              );
            });
            if (last.firedAt !== null)
              drawExplosion(
                ctx,
                center.x,
                center.y,
                now - last.firedAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            ctx.restore();
          },
          // the fighters over the coins they knock out
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            const heat = clamp01(ms / last.at);
            const wind = clamp01((ms - windFrom) / (chargeFrom - windFrom));
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (const side of [-1, 1])
              drawWisp(
                ctx,
                (t) => wispAt(side, t),
                ms,
                now,
                size * (1 + WIND_GROW * wind),
                heat,
              );
            ctx.restore();
          },
        },
      );
      if (!cover) return;
      playSwoosh();

      // on the frame the two crash together
      function fire(slam: Slam, k: number, now: number): void {
        slam.firedAt = now;
        if (!cover?.isLive()) return;
        if (slam === last) {
          playSlamExplosion();
          shakeScreen(FINAL_SHAKE);
          cover.launchFrom(
            center,
            ringTargets(center, FINAL_COINS, FINAL_RING),
          );
          return;
        }
        const t = k / ROUNDS;
        playExplosion();
        if (k < ROUNDS) playSwoosh();
        shakeScreen(lerp(SLAM_SHAKE, t));
        cover.launchFrom(
          center,
          sprayTargets(center, Math.round(lerp(SLAM_COINS, t)), SPRAY),
        );
      }
    },
  },
  { label: "Clash", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Clash
export function forceClashEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
