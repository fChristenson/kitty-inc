// the "Asteroids" event: it covers its crit, whose click freezes the screen
// while big glowing gold rocks tumble in round its middle, where the wisp
// hangs like a little ship. It blasts shot after shot at them, ever faster,
// kicking back with each: every big rock it hits cracks with a flash, a bang
// and a jolt into two smaller ones flying apart and a spray of coins, and
// every small one bursts into coins. The last blows in a huge blast and
// shake, and the coins sweep into the total. Pays floor income × floor
// number × REWARD (see ../moneyCover)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playExplosion, playSlamExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawExplosion, drawWhiteBurst } from "../../shared/eventFx";
import {
  drawWisp,
  WISP_SIZE,
  WISP_TRAIL_MS,
  type Point,
} from "../../shared/wisp";
import { forceTestCrit } from "../upgradeButton";
import { forceClaimEventProc, registerEventProc } from "../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../moneyCover";

const KEY = "asteroids";
const REWARD = 4;
const BIG_ROCKS = 4;
// the rocks: BIG_SIZE of the screen's width across (the cracked halves
// SPLIT of that), starting RING of its half-size out from the middle,
// drifting DRIFT px/s in and round and tumbling up to SPIN rad/s; the halves
// fly KICK px/s apart. Each a jagged ring of CORNERS corners
const BIG_SIZE = 0.16;
const SPLIT = 0.58;
const RING = 0.62;
const DRIFT: [number, number] = [20, 45];
const SPIN = 2.2;
const KICK = 110;
const CORNERS = 9;
const ROUGH: [number, number] = [0.72, 1.05];
const POP_MS = 220;
// the ship: the wisp at SHIP_SIZE of the screen's width, kicked RECOIL px
// back from each shot, settling over RECOIL_MS; each shot a smaller wisp
const SHIP_SIZE = 0.065;
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
// the rocks' look
const GLOW_WIDTH = 14;
const EDGE_WIDTH = 4;
const FILL_ALPHA = 0.35;

const lerp = ([a, b]: [number, number], t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const between = (range: [number, number]) => lerp(range, Math.random());

interface Rock {
  big: boolean;
  radius: number;
  bornAt: number;
  from: Point;
  // px/s
  velocity: Point;
  spin: number;
  turn: number;
  corners: number[];
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

const jagged = () => Array.from({ length: CORNERS }, () => between(ROUGH));

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
      const bigRadius = (width * BIG_SIZE) / 2;
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
          radius: bigRadius,
          bornAt: 0,
          from: {
            x: center.x + out.x * half * RING,
            y: center.y + out.y * half * RING,
          },
          velocity: {
            x: -out.x * inward - out.y * round,
            y: -out.y * inward + out.x * round,
          },
          spin: (Math.random() * 2 - 1) * SPIN,
          turn: Math.random() * Math.PI * 2,
          corners: jagged(),
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
              radius: bigRadius * SPLIT,
              bornAt: rock.hitAt,
              from: at,
              velocity: {
                x: rock.velocity.x + side * Math.cos(away) * KICK,
                y: rock.velocity.y + side * Math.sin(away) * KICK,
              },
              spin: rock.spin * -1.5,
              turn: rock.turn,
              corners: jagged(),
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

      // the ship, kicked back from where each shot went
      const recoilOf = (ms: number): Point => {
        let x = 0;
        let y = 0;
        for (const shot of shots) {
          const since = ms - shot.firedAt;
          if (since < 0) break;
          if (since > RECOIL_MS * 5) continue;
          const target = rockAt(shot.rock, shot.rock.hitAt);
          const length =
            Math.hypot(target.x - center.x, target.y - center.y) || 1;
          const kick = RECOIL * Math.exp(-since / RECOIL_MS);
          x -= ((target.x - center.x) / length) * kick;
          y -= ((target.y - center.y) / length) * kick;
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

      const drawRock = (
        ctx: CanvasRenderingContext2D,
        rock: Rock,
        ms: number,
      ) => {
        const at = rockAt(rock, ms);
        const pop = rock.big ? clamp01(ms / POP_MS) : 1;
        const r = rock.radius * (1 - (1 - pop) ** 3);
        if (r <= 0) return;
        const turn = rock.turn + (rock.spin * (ms - rock.bornAt)) / 1000;
        ctx.beginPath();
        rock.corners.forEach((rough, k) => {
          const angle = turn + (k / CORNERS) * Math.PI * 2;
          const x = at.x + Math.cos(angle) * r * rough;
          const y = at.y + Math.sin(angle) * r * rough;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.globalAlpha = FILL_ALPHA;
        ctx.fillStyle = COLOR.heavenlyGold;
        ctx.fill();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = COLOR.heavenlyGold;
        ctx.lineWidth = GLOW_WIDTH;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = COLOR.white;
        ctx.lineWidth = EDGE_WIDTH;
        ctx.stroke();
      };

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
            ctx.lineJoin = "round";
            for (const rock of rocks)
              if (ms >= rock.bornAt && ms < rock.hitAt) drawRock(ctx, rock, ms);
            ctx.globalAlpha = 1;
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
          // the ship and its shots over the coins they blast out
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            const heat = clamp01(ms / last.hitAt);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            const pop = clamp01(ms / POP_MS);
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
            Array.from({ length: FINAL_COINS }, (_, k) => {
              const angle = (k / FINAL_COINS) * Math.PI * 2;
              const r = between(FINAL_RING);
              return {
                x: at.x + Math.cos(angle) * r,
                y: at.y + Math.sin(angle) * r,
              };
            }),
          );
          return;
        }
        playExplosion();
        playSwoosh();
        shakeScreen(lerp(HIT_SHAKE, i / (shots.length - 1)));
        cover.launchFrom(
          at,
          Array.from({ length: rock.big ? BIG_COINS : SMALL_COINS }, () => {
            const angle = Math.random() * Math.PI * 2;
            const r = between(SPRAY);
            return {
              x: at.x + Math.cos(angle) * r,
              y: at.y + Math.sin(angle) * r,
            };
          }),
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
