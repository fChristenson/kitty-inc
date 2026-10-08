// the "Asteroids" event: it covers its crit, whose click freezes the screen
// while big wisps drift in round its middle, where a smaller wisp hangs like
// a little ship. It blasts shot after shot at them, ever faster, kicking back
// with each: every big wisp it hits cracks with a flash, a bang and a jolt
// into two smaller ones flying apart and a spray of coins, and every small
// one bursts into coins. The last blows in a huge blast and shake, and the
// coins sweep into the total. Pays floor income × floor number × REWARD
// (see ../moneyCover)
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
import {
  drawWisp,
  WISP_SIZE,
  WISP_TRAIL_MS,
  type Point,
} from "../../../../shared/wisp";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import { lerp, clamp01, between } from "../../../../shared/easing";
import { ringTargets, sprayTargets } from "../../../../shared/coinTargets";

const KEY = "asteroids";
const REWARD = 4;
const BIG_ROCKS = 4;
// the asteroids: wisps at BIG_SIZE of the screen's width (the cracked halves
// SPLIT of that), starting RING of its half-size out from the middle,
// drifting DRIFT px/s in and round; the halves fly KICK px/s apart
const BIG_SIZE = 0.1;
const SPLIT = 0.6;
const RING = 0.62;
const DRIFT: [number, number] = [20, 45];
const KICK = 110;
const POP_MS = 220;
// the ship: a wisp at SHIP_SIZE of the screen's width, kicked RECOIL px
// back from each shot, settling over RECOIL_MS; each shot a smaller wisp
const SHIP_SIZE = 0.05;
const RECOIL = 26;
const RECOIL_MS = 90;
const SHOT_SIZE = 0.5;
const MUZZLE_BURST = 0.15;
const MUZZLE_MS = 140;
// each hit: a burst, a jolt and coins
const HIT_BURST: [number, number] = [0.25, 0.45];
const HIT_BURST_MS = 260;
const HIT_SHAKE: [number, number] = [0.5, 1.4];
const BIG_COINS = 4;
const SMALL_COINS = 3;
const SPRAY: [number, number] = [60, 200];
// the last: a huge blast and a ring of FINAL_COINS
const FINAL_COINS = 26;
const FINAL_RING: [number, number] = [120, 340];
const FINAL_SHAKE = 2.7;
const BLAST_SCALE = 1.8;
const SPARK_REACH = 380;
const SPARK_SIZE = 22;

interface Rock {
  big: boolean;
  size: number;
  bornAt: number;
  from: Point;
  // px/s
  velocity: Point;
  // ms in the shot meant for it lands, and performance.now() once it has
  hitAt: number;
  hitFiredAt: number | null;
}

interface Shot {
  firedAt: number;
  rock: Rock;
}

const rockAt = (rock: Rock, ms: number): Point => {
  const s = (ms - rock.bornAt) / 1000;
  return {
    x: rock.from.x + rock.velocity.x * s,
    y: rock.from.y + rock.velocity.y * s,
  };
};

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.asteroidsEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { firstShotMs, gapMs, travelMs, holdMs, mergeMs } =
        CONFIG.asteroidsEvent;
      const width = area.right - area.left;
      const height = area.bottom - area.top;
      const center = {
        x: (area.left + area.right) / 2,
        y: (area.top + area.bottom) / 2,
      };
      const half = Math.min(width, height) / 2;
      const bigSize = width * BIG_SIZE;
      const shipSize = Math.max(WISP_SIZE, width * SHIP_SIZE);

      const start = Math.random() * Math.PI * 2;
      const bigs: Rock[] = Array.from({ length: BIG_ROCKS }, (_, i) => {
        const angle =
          start + (i / BIG_ROCKS) * Math.PI * 2 + Math.random() * 0.5;
        const out = { x: Math.cos(angle), y: Math.sin(angle) };
        const inward = between(DRIFT);
        const round = (Math.random() < 0.5 ? -1 : 1) * between(DRIFT);
        return {
          big: true,
          size: bigSize,
          bornAt: 0,
          from: {
            x: center.x + out.x * half * RING,
            y: center.y + out.y * half * RING,
          },
          velocity: {
            x: -out.x * inward - out.y * round,
            y: -out.y * inward + out.x * round,
          },
          hitAt: Infinity,
          hitFiredAt: null,
        };
      });

      // shot after shot at the next rock in line, each big one cracking into
      // two halves that join the back of the line
      const queue = [...bigs];
      const rocks: Rock[] = [...bigs];
      const shots: Shot[] = [];
      const total = BIG_ROCKS * 3;
      let firedAt = firstShotMs;
      for (let i = 0; i < total; i++) {
        const rock = queue[i];
        rock.hitAt = firedAt + travelMs;
        shots.push({ firedAt, rock });
        if (rock.big) {
          const at = rockAt(rock, rock.hitAt);
          const away =
            Math.atan2(at.y - center.y, at.x - center.x) + Math.PI / 2;
          for (const side of [-1, 1]) {
            const piece: Rock = {
              big: false,
              size: bigSize * SPLIT,
              bornAt: rock.hitAt,
              from: at,
              velocity: {
                x: rock.velocity.x + side * Math.cos(away) * KICK,
                y: rock.velocity.y + side * Math.sin(away) * KICK,
              },
              hitAt: Infinity,
              hitFiredAt: null,
            };
            queue.push(piece);
            rocks.push(piece);
          }
        }
        firedAt += lerp(gapMs, i / (total - 1));
      }
      const last = shots[shots.length - 1].rock;
      const startedAt = performance.now();

      // the ship, kicked back from where each shot went (aims worked out once:
      // the trail asks for the ship's place hundreds of times a frame)
      const kicks = shots.map((shot) => {
        const target = rockAt(shot.rock, shot.rock.hitAt);
        const length =
          Math.hypot(target.x - center.x, target.y - center.y) || 1;
        return {
          firedAt: shot.firedAt,
          dx: (target.x - center.x) / length,
          dy: (target.y - center.y) / length,
        };
      });
      const recoilOf = (ms: number): Point => {
        let x = 0;
        let y = 0;
        for (const shot of kicks) {
          const since = ms - shot.firedAt;
          if (since < 0) break;
          if (since > RECOIL_MS * 5) continue;
          const kick = RECOIL * Math.exp(-since / RECOIL_MS);
          x -= shot.dx * kick;
          y -= shot.dy * kick;
        }
        return { x: center.x + x, y: center.y + y };
      };
      const shipAt = (ms: number): Point | null =>
        ms < 0 || ms >= last.hitAt ? null : recoilOf(ms);
      const shotAt = (shot: Shot, ms: number): Point | null => {
        const u = (ms - shot.firedAt) / (shot.rock.hitAt - shot.firedAt);
        if (u < 0 || u >= 1) return null;
        const target = rockAt(shot.rock, shot.rock.hitAt);
        return {
          x: center.x + (target.x - center.x) * u,
          y: center.y + (target.y - center.y) * u,
        };
      };

      const asteroidAt = (rock: Rock, ms: number): Point | null =>
        ms < rock.bornAt || ms >= rock.hitAt ? null : rockAt(rock, ms);

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: last.hitAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            shots.forEach((shot, i) => {
              if (shot.rock.hitFiredAt === null && ms >= shot.rock.hitAt)
                hit(shot.rock, i, now);
            });
            ctx.save();
            ctx.translate(rect.left, rect.top);
            shots.forEach((shot, i) => {
              const since = ms - shot.firedAt;
              if (since >= 0 && since < MUZZLE_MS)
                drawWhiteBurst(
                  ctx,
                  center.x,
                  center.y,
                  since / MUZZLE_MS,
                  MUZZLE_BURST,
                );
              const { rock } = shot;
              if (rock.hitFiredAt === null || rock === last) return;
              const at = rockAt(rock, rock.hitAt);
              drawWhiteBurst(
                ctx,
                at.x,
                at.y,
                (now - rock.hitFiredAt) / HIT_BURST_MS,
                lerp(HIT_BURST, i / (shots.length - 1)) * (rock.big ? 1 : 0.75),
              );
            });
            if (last.hitFiredAt !== null) {
              const at = rockAt(last, last.hitAt);
              drawExplosion(
                ctx,
                at.x,
                at.y,
                now - last.hitFiredAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            }
            ctx.restore();
          },
          // the asteroids, ship and shots over the coins they blast out
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            const heat = clamp01(ms / last.hitAt);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            const pop = clamp01(ms / POP_MS);
            for (const rock of rocks) {
              if (ms < rock.bornAt || ms > rock.hitAt + WISP_TRAIL_MS) continue;
              const grow = rock.big ? 1 - (1 - pop) ** 3 : 1;
              drawWisp(
                ctx,
                (t) => asteroidAt(rock, t),
                ms,
                now,
                rock.size * grow,
                0.2,
              );
            }
            drawWisp(ctx, shipAt, ms, now, shipSize * pop, heat);
            for (const shot of shots) {
              const since = ms - shot.firedAt;
              if (since < 0 || since > WISP_TRAIL_MS) continue;
              drawWisp(
                ctx,
                (t) => shotAt(shot, t),
                ms,
                now,
                shipSize * SHOT_SIZE,
                1,
              );
            }
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame each shot lands
      function hit(rock: Rock, i: number, now: number): void {
        rock.hitFiredAt = now;
        if (!cover?.isLive()) return;
        const at = rockAt(rock, rock.hitAt);
        if (rock === last) {
          playSlamExplosion();
          shakeScreen(FINAL_SHAKE);
          cover.launchFrom(
            at,
            ringTargets(at, FINAL_COINS, FINAL_RING),
          );
          return;
        }
        playExplosion();
        playSwoosh();
        shakeScreen(lerp(HIT_SHAKE, i / (shots.length - 1)));
        cover.launchFrom(
          at,
          sprayTargets(at, rock.big ? BIG_COINS : SMALL_COINS, SPRAY),
        );
      }
    },
  },
  { label: "Asteroids", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Asteroids
export function forceAsteroidsEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
