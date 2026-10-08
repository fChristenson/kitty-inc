// the "Plinko" event: it covers its crit, whose click freezes the screen
// while a triangle of white pegs pops in across the middle of the screen and
// wisp balls drop in one after another, ever quicker, clattering down peg to
// peg under real gravity: every peg hit a flash, a ping, a jolt and a coin.
// Each ball slams into the bottom in a burst, a bang and a shake, spraying
// coins; the last lands in a huge blast and flash, and the coins merge into
// the total. Pays floor income × floor number × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop } from "../../../../sound";
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
import { lerp } from "../../../../shared/easing";

const KEY = "plinko";
const REWARD = 4;
// the board: ROWS rows of pegs, the first PEGS_TOP wide, one more per row,
// GAP px apart (fit to the screen within GAP_RANGE)
const ROWS = 9;
const PEGS_TOP = 3;
const GAP_RANGE: [number, number] = [46, 80];
const ROW_RISE = 0.87; // of the gap
const PEG_R = 6;
const PEG_POP_MS = 25; // each row popping in after the last
// the balls' physics, per GAP of 60px: gravity in px/ms², bounciness, and a
// random sideways nudge per hit so none balances on a peg
const GRAVITY = 0.0028;
const BOUNCE = 0.45;
const NUDGE = 0.12;
const BALL_R = 13;
const STEP_MS = 2;
const MAX_MS = 4_000;
// a hit only counts this hard (px/ms), and not twice on one peg within
const HIT_SPEED = 0.15;
const HIT_COOLDOWN_MS = 80;
// each peg hit
const PEG_FLASH_MS = 220;
const PEG_BURST = 0.06;
const PEG_SHAKE = 0.12;
const PEG_COIN_REACH = 70;
// each ball slamming into the bottom, harder for each one after
const LAND_BURST: [number, number] = [0.25, 0.4];
const LAND_BURST_MS = 360;
const LAND_SHAKE: [number, number] = [0.6, 1.3];
const LAND_COINS = 5;
const LAND_COIN_REACH: [number, number] = [60, 220];
// the last one
const FINALE_SHAKE = 2.8;
const FINALE_SCALE = 1.6;
const FINALE_COINS = 16;
const SPARK_REACH = 320;
const SPARK_SIZE = 22;
const FLASH_MS = 220;
const FLASH_ALPHA = 0.7;

interface Ball {
  dropAt: number;
  // its spot every STEP_MS from dropAt until it lands
  path: Point[];
  landAt: number;
}
interface Hit {
  at: number;
  peg: number;
}

// a ball dropped at x from top, run down the pegs to the bottom
function simulate(
  pegs: Point[],
  x: number,
  top: number,
  bottom: number,
  gap: number,
  hits: (ms: number, peg: number) => void,
): Point[] {
  const scale = gap / 60;
  const g = GRAVITY * scale;
  const reach = BALL_R + PEG_R;
  const lastHit = new Map<number, number>();
  let p = { x, y: top };
  let v = { x: 0, y: 0 };
  const path: Point[] = [p];
  for (let ms = STEP_MS; ms < MAX_MS && p.y < bottom; ms += STEP_MS) {
    v = { x: v.x, y: v.y + g * STEP_MS };
    p = { x: p.x + v.x * STEP_MS, y: p.y + v.y * STEP_MS };
    pegs.forEach((peg, k) => {
      const dx = p.x - peg.x;
      const dy = p.y - peg.y;
      const d = Math.hypot(dx, dy);
      if (d >= reach || d === 0) return;
      const n = { x: dx / d, y: dy / d };
      const into = v.x * n.x + v.y * n.y;
      p = { x: peg.x + n.x * reach, y: peg.y + n.y * reach };
      if (into >= 0) return;
      v = {
        x:
          v.x -
          (1 + BOUNCE) * into * n.x +
          (Math.random() - 0.5) * NUDGE * scale,
        y: v.y - (1 + BOUNCE) * into * n.y,
      };
      if (
        -into >= HIT_SPEED * scale &&
        ms - (lastHit.get(k) ?? -Infinity) > HIT_COOLDOWN_MS
      ) {
        lastHit.set(k, ms);
        hits(ms, k);
      }
    });
    path.push(p);
  }
  return path;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.plinkoEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (floor, context) =>
      canStartMoneyCover(context) &&
      context.getOnScreenFloors?.().some((entry) => entry.floor === floor) ===
        true,
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { dropAt, holdMs, mergeMs } = CONFIG.plinkoEvent;
      const width = area.right - area.left;
      const height = area.bottom - area.top;
      const gap = Math.min(
        GAP_RANGE[1],
        Math.max(
          GAP_RANGE[0],
          Math.min(
            (0.9 * width) / (PEGS_TOP + ROWS),
            (0.75 * height) / ((ROWS - 1) * ROW_RISE + 1.5),
          ),
        ),
      );
      const centerX = (area.left + area.right) / 2;
      const boardTop =
        area.top + (height - ((ROWS - 1) * ROW_RISE + 1) * gap) / 2;
      const pegs: Point[] = [];
      const pegRow: number[] = [];
      for (let row = 0; row < ROWS; row++) {
        const count = PEGS_TOP + row;
        for (let i = 0; i < count; i++) {
          pegs.push({
            x: centerX + (i - (count - 1) / 2) * gap,
            y: boardTop + row * ROW_RISE * gap,
          });
          pegRow.push(row);
        }
      }
      const bottom = boardTop + ((ROWS - 1) * ROW_RISE + 1) * gap;
      const hits: Hit[] = [];
      const balls: Ball[] = dropAt.map((at) => {
        const path = simulate(
          pegs,
          centerX + (Math.random() - 0.5) * gap * 0.3,
          area.top - BALL_R * 2,
          bottom,
          gap,
          (ms, peg) => hits.push({ at: at + ms, peg }),
        );
        return { dropAt: at, path, landAt: at + (path.length - 1) * STEP_MS };
      });
      hits.sort((a, b) => a.at - b.at);
      const landings = balls
        .map((_, k) => k)
        .sort((a, b) => balls[a].landAt - balls[b].landAt);
      const finaleAt = balls[landings[landings.length - 1]].landAt;
      const startedAt = performance.now();
      let hitsDone = 0;
      let landed = 0;
      const pegFlashAt = new Map<number, number>();
      const landedAt: number[] = [];

      const ballAt = (ball: Ball, ms: number): Point | null => {
        const i = (ms - ball.dropAt) / STEP_MS;
        if (i < 0 || i >= ball.path.length - 1) return null;
        const k = Math.floor(i);
        const a = ball.path[k];
        const b = ball.path[k + 1];
        const u = i - k;
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
      };

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: finaleAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            let pinged = false;
            while (hitsDone < hits.length && ms >= hits[hitsDone].at) {
              hitPeg(hits[hitsDone++].peg, now, !pinged);
              pinged = true;
            }
            while (
              landed < landings.length &&
              ms >= balls[landings[landed]].landAt
            )
              land(landings[landed], landed++, now);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            pegs.forEach((peg, k) => {
              const grow = Math.min(1, (ms - pegRow[k] * PEG_POP_MS) / 120);
              if (grow <= 0) return;
              const since = now - (pegFlashAt.get(k) ?? -Infinity);
              const flash = Math.max(0, 1 - since / PEG_FLASH_MS);
              drawWhiteBurst(
                ctx,
                peg.x,
                peg.y,
                since / PEG_FLASH_MS,
                PEG_BURST,
              );
              ctx.globalAlpha = 0.75 + 0.25 * flash;
              ctx.fillStyle = COLOR.white;
              ctx.beginPath();
              ctx.arc(
                peg.x,
                peg.y,
                PEG_R * grow * (1 + 0.6 * flash),
                0,
                Math.PI * 2,
              );
              ctx.fill();
              ctx.globalAlpha = 1;
            });
            landedAt.forEach((at, order) => {
              const ball = balls[landings[order]];
              const spot = ball.path[ball.path.length - 1];
              if (order === landings.length - 1) {
                drawExplosion(
                  ctx,
                  spot.x,
                  bottom,
                  now - at,
                  now,
                  FINALE_SCALE,
                  SPARK_REACH,
                  SPARK_SIZE,
                );
                const flash = 1 - (now - at) / FLASH_MS;
                if (flash > 0) {
                  ctx.save();
                  ctx.globalCompositeOperation = "lighter";
                  ctx.globalAlpha = FLASH_ALPHA * flash;
                  ctx.fillStyle = COLOR.white;
                  ctx.fillRect(area.left, area.top, width, height);
                  ctx.restore();
                }
              } else
                drawWhiteBurst(
                  ctx,
                  spot.x,
                  bottom,
                  (now - at) / LAND_BURST_MS,
                  lerp(LAND_BURST, order / Math.max(1, landings.length - 2)),
                );
            });
            ctx.restore();
          },
          // the balls over the coins
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (const ball of balls)
              drawWisp(
                ctx,
                (t) => ballAt(ball, t),
                ms,
                now,
                WISP_SIZE * 0.7,
                0.5,
              );
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame a ball strikes peg k: a flash, a coin, a jolt (one ping a frame)
      function hitPeg(k: number, now: number, ping: boolean): void {
        pegFlashAt.set(k, now);
        if (!cover?.isLive()) return;
        if (ping) {
          playBloop();
          shakeScreen(PEG_SHAKE);
        }
        const from = pegs[k];
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
        const r = PEG_COIN_REACH * (0.4 + 0.6 * Math.random());
        cover.launchFrom(from, [
          { x: from.x + Math.cos(angle) * r, y: from.y + Math.sin(angle) * r },
        ]);
      }
      // on the frame ball `index` lands, the order-th to land
      function land(index: number, order: number, now: number): void {
        landedAt[order] = now;
        if (!cover?.isLive()) return;
        const ball = balls[index];
        const from = { x: ball.path[ball.path.length - 1].x, y: bottom };
        const finale = order === landings.length - 1;
        if (finale) {
          playSlamExplosion();
          shakeScreen(FINALE_SHAKE);
        } else {
          playExplosion();
          shakeScreen(
            lerp(LAND_SHAKE, order / Math.max(1, landings.length - 2)),
          );
        }
        cover.launchFrom(
          from,
          Array.from({ length: finale ? FINALE_COINS : LAND_COINS }, () => {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2;
            const r = lerp(LAND_COIN_REACH, Math.random()) * (finale ? 1.6 : 1);
            return {
              x: from.x + Math.cos(angle) * r,
              y: from.y + Math.sin(angle) * r,
            };
          }),
        );
      }
    },
  },
  { label: "Plinko", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Plinko
export function forcePlinkoEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
