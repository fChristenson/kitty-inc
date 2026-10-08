// the "Gatling" event: it covers its crit, whose click freezes the screen
// while a burst of wisps fires in like gatling bullets from off the screen's
// side, ever faster with a little spray, each slamming into the button with
// a flash, a rattle and a jolt and knocking coins out round it; the last
// round hits hard in a blast that bursts a ring of coins, and they all merge
// into the total. Pays floor income × floor number × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop } from "../../../../sound";
import { playSlamExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import {
  drawWisp,
  WISP_SIZE,
  WISP_TRAIL_MS,
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
import { lerp } from "../../../../shared/easing";

const KEY = "gatling";
const REWARD = 3;
// the gun sits this far off the screen's side (whichever is farther from the
// button), GUN_HEIGHT of the way down it, firing FIRE_HZ shots a second (ever
// faster), each sprayed up to SPRAY px off true at the muzzle
const GUN_OUT = 80;
const GUN_HEIGHT = 0.3;
const FIRE_HZ: [number, number] = [16, 50];
const SPRAY = 70;
// each bullet: a wisp at BULLET_SIZE of its size, flying in over travelMs
const BULLET_SIZE = 0.6;
// each hit: a flash, a rattle (no closer than RATTLE_GAP_MS), a jolt and
// coins knocked out round the button; shakes stack into a rumble at full fire
const HIT_BURST = 0.2;
const HIT_BURST_MS = 200;
const RATTLE_GAP_MS = 55;
const HIT_SHAKE = 0.1;
const HIT_COINS = 2;
const SCATTER: [number, number] = [60, 230];
// the last round: a blast and a ring of RING_COINS
const RING_COINS = 30;
const RING: [number, number] = [120, 320];
const BLAST_SHAKE = 2.4;
const BLAST_SCALE = 1.6;
const SPARK_REACH = 320;
const SPARK_SIZE = 20;

interface Shot {
  from: Point;
  firedAt: number;
  hitAt: number;
  landedAt: number | null;
}

// a spot `reach` px from the button, every way round
function around(button: Point, reach: number, angle: number): Point {
  return {
    x: button.x + Math.cos(angle) * reach,
    y: button.y + Math.sin(angle) * reach,
  };
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.gatlingEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { fireMs, travelMs, holdMs, mergeMs } = CONFIG.gatlingEvent;
      const button = getButtonCenter(context.isGroundFloor);
      const fromLeft = button.x - area.left > area.right - button.x;
      const gun = {
        x: fromLeft ? area.left - GUN_OUT : area.right + GUN_OUT,
        y: area.top + (area.bottom - area.top) * GUN_HEIGHT,
      };
      // the muzzle's spray: sideways to the line of fire
      const dx = button.x - gun.x;
      const dy = button.y - gun.y;
      const length = Math.hypot(dx, dy);
      const side = { x: -dy / length, y: dx / length };
      const shots: Shot[] = [];
      for (let t = 0; t < fireMs; t += 1000 / lerp(FIRE_HZ, t / fireMs)) {
        const off = (Math.random() * 2 - 1) * SPRAY;
        shots.push({
          from: { x: gun.x + side.x * off, y: gun.y + side.y * off },
          firedAt: t,
          hitAt: t + travelMs,
          landedAt: null,
        });
      }
      const lastHitAt = shots[shots.length - 1].hitAt;
      const startedAt = performance.now();
      let lastRattle = -Infinity;
      let blastAt: number | null = null;

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: lastHitAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            shots.forEach((shot, i) => {
              if (shot.landedAt === null && ms >= shot.hitAt) hit(shot, i, now);
            });
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (const shot of shots)
              if (shot.landedAt !== null)
                drawWhiteBurst(
                  ctx,
                  button.x,
                  button.y,
                  (now - shot.landedAt) / HIT_BURST_MS,
                  HIT_BURST,
                );
            if (blastAt !== null)
              drawExplosion(
                ctx,
                button.x,
                button.y,
                now - blastAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            ctx.restore();
          },
          // the bullets over the coins they knock out
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (const shot of shots) {
              if (ms < shot.firedAt || ms > shot.hitAt + WISP_TRAIL_MS)
                continue;
              drawWisp(
                ctx,
                (t) => {
                  if (t < shot.firedAt || t >= shot.hitAt) return null;
                  const u = (t - shot.firedAt) / travelMs;
                  return {
                    x: shot.from.x + (button.x - shot.from.x) * u,
                    y: shot.from.y + (button.y - shot.from.y) * u,
                  };
                },
                ms,
                now,
                WISP_SIZE * BULLET_SIZE,
                1,
              );
            }
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame each bullet lands
      function hit(shot: Shot, index: number, now: number): void {
        shot.landedAt = now;
        if (!cover?.isLive()) return;
        if (index === shots.length - 1) {
          blastAt = now;
          playSlamExplosion();
          shakeScreen(BLAST_SHAKE);
          cover.launchFrom(
            button,
            Array.from({ length: RING_COINS }, (_, i) =>
              around(
                button,
                lerp(RING, Math.random()),
                (i / RING_COINS) * Math.PI * 2,
              ),
            ),
          );
          return;
        }
        shakeScreen(HIT_SHAKE);
        if (now - lastRattle >= RATTLE_GAP_MS) {
          lastRattle = now;
          playBloop();
        }
        cover.launchFrom(
          button,
          Array.from({ length: HIT_COINS }, () =>
            around(
              button,
              lerp(SCATTER, Math.random()),
              Math.random() * Math.PI * 2,
            ),
          ),
        );
      }
    },
  },
  { label: "Gatling", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Gatling
export function forceGatlingEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
