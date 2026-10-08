// the "Breakout" event: it covers its crit, whose click freezes the screen
// while a wall of glowing bricks slams down across the top of the screen and
// the clicked floor's income bar turns paddle, like the old Breakout game:
// the wisp launches off it and smashes up through the bricks, bouncing off
// the screen's sides and top and back down, the bar sliding across to bat it
// back up, ever faster. Every brick it smashes bursts in a flash, a pop, a
// jolt and coins; every bat is a bang. On the last volley it hits the top and
// every brick left blows at once in a huge blast, flash and shake, spraying
// coins that merge into the total. Pays floor income × floor number × REWARD
// (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playExplosion, playSlamExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import {
  drawIncomePanel,
  getIncomeBarBox,
  setIncomePanelsHidden,
} from "../../../../floors/incomePanel";
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
  smoothstep as easeInOut,
} from "../../../../shared/easing";

const KEY = "breakout";
const REWARD = 4;
const BALL_R = WISP_SIZE * 0.35;
// the wall: COLS × ROWS bricks BRICK_H tall, GAP apart, BRICKS_TOP below the
// screen's top and SIDE in from its sides; the ball turns TOP_GAP below the top
const COLS = 8;
const ROWS = 4;
const BRICK_H = 36;
const GAP = 10;
const BRICKS_TOP = 180;
const SIDE = 60;
const TOP_GAP = 40;
const BRICK_RADIUS = 8;
// the wall slams down from DROP px above over dropMs, landing with a jolt
const DROP = 360;
const DROP_SHAKE = 0.7;
// each volley launches off the bar this far (rad) either side of straight up,
// aimed through as many bricks as it can find among AIMS tries
const AIM: [number, number] = [0.15, 0.9];
const AIMS = 16;
// a smashed brick swells and flashes out over SMASH_MS with a burst
const SMASH_MS = 180;
const SMASH_BURST = 0.14;
const SMASH_SHAKE = 0.25;
const SMASH_COINS = 2;
const SMASH_COIN_REACH = 110;
// each bat: the bar squashes and flashes, a bang and a jolt
const BAT_SHAKE = 0.6;
const BAT_SQUASH = 0.25;
const BAT_MS = 200;
const BAT_BURST = 0.2;
// the bar arrives this share of the descent early
const BAR_LEAD = 0.15;
// the finale
const BLAST_SHAKE = 2.8;
const BLAST_SCALE = 1.8;
const SPARK_REACH = 360;
const SPARK_SIZE = 22;
const BLOW_BURST = 0.3;
const BLOW_BURST_MS = 420;
const BLOW_COINS = 3;
const BLOW_COIN_REACH: [number, number] = [40, 200];
const FLASH_MS = 220;
const FLASH_ALPHA = 0.7;

// p bounced back and forth between lo and hi
function fold(p: number, lo: number, hi: number): number {
  const span = hi - lo;
  const t = (((p - lo) % (2 * span)) + 2 * span) % (2 * span);
  return lo + (t <= span ? t : 2 * span - t);
}

interface Brick {
  x: number;
  y: number;
  w: number;
  smashedAt: number | null;
}

interface Volley {
  startMs: number;
  from: number;
  vx: number;
  vy: number;
  topMs: number;
  endMs: number;
  land: number;
  hits: { brick: number; ms: number }[];
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.breakoutEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (floor, context) =>
      canStartMoneyCover(context) &&
      context.getOnScreenFloors?.().some((entry) => entry.floor === floor) ===
        true,
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { dropMs, upMs, holdMs, mergeMs } = CONFIG.breakoutEvent;
      const { isGroundFloor } = context;
      const box = getIncomeBarBox(isGroundFloor);
      const home = box.x + box.width / 2;
      const barY = box.y + box.height / 2;
      const paddleY = box.y - BALL_R;
      const topY = area.top + TOP_GAP + BALL_R;
      const left = area.left + BALL_R;
      const right = area.right - BALL_R;
      const clampBar = (x: number) =>
        Math.min(
          area.right - box.width / 2,
          Math.max(area.left + box.width / 2, x),
        );

      const brickW =
        (area.right - area.left - SIDE * 2 - GAP * (COLS - 1)) / COLS;
      const bricks: Brick[] = [];
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          bricks.push({
            x: area.left + SIDE + c * (brickW + GAP),
            y: area.top + BRICKS_TOP + r * (BRICK_H + GAP),
            w: brickW,
            smashedAt: null,
          });

      // plan every volley up front: the bricks each smashes and where it lands
      const broken = new Set<number>();
      const volleys: Volley[] = [];
      let from = home;
      let at: number = dropMs;
      upMs.forEach((up, v) => {
        const last = v === upMs.length - 1;
        const vy = (paddleY - topY) / up;
        const plan = (angle: number) => {
          const vx = vy * Math.tan(angle);
          const hits: { brick: number; ms: number }[] = [];
          const seen = new Set<number>();
          const end = last ? up : up * 2;
          for (let ms = 0; ms <= end; ms += 3) {
            const x = fold(from + vx * ms, left, right);
            const y = ms < up ? paddleY - vy * ms : topY + vy * (ms - up);
            bricks.forEach((b, i) => {
              if (broken.has(i) || seen.has(i)) return;
              if (
                x > b.x - BALL_R &&
                x < b.x + b.w + BALL_R &&
                y > b.y - BALL_R &&
                y < b.y + BRICK_H + BALL_R
              ) {
                seen.add(i);
                hits.push({ brick: i, ms: at + ms });
              }
            });
          }
          return { vx, hits, land: fold(from + vx * end, left, right) };
        };
        const aim = () =>
          (Math.random() < 0.5 ? -1 : 1) * lerp(AIM, Math.random());
        let best = plan(aim());
        for (let k = 1; k < AIMS; k++) {
          const tryPlan = plan(aim());
          if (tryPlan.hits.length > best.hits.length) best = tryPlan;
        }
        best.hits.forEach((hit) => broken.add(hit.brick));
        const endMs = at + (last ? up : up * 2);
        volleys.push({
          startMs: at,
          from,
          vx: best.vx,
          vy,
          topMs: at + up,
          endMs,
          land: best.land,
          hits: best.hits,
        });
        from = best.land;
        at = endMs;
      });
      const final = volleys[volleys.length - 1];
      const blowMs = final.topMs;
      const hits = volleys
        .flatMap((volley) => volley.hits)
        .sort((a, b) => a.ms - b.ms);

      const ballAt = (ms: number): Point | null => {
        if (ms >= blowMs) return null;
        if (ms < dropMs) return { x: home, y: paddleY };
        const volley =
          volleys.find((v) => ms < v.endMs) ?? volleys[volleys.length - 1];
        const t = ms - volley.startMs;
        const up = volley.topMs - volley.startMs;
        return {
          x: fold(volley.from + volley.vx * t, left, right),
          y: t < up ? paddleY - volley.vy * t : topY + volley.vy * (t - up),
        };
      };
      // the bar's center ms in: sliding over under each volley's landing
      const barAt = (ms: number): number => {
        for (const volley of volleys) {
          if (volley === final || ms >= volley.endMs) continue;
          if (ms < volley.topMs) return clampBar(volley.from);
          const descent = volley.endMs - volley.topMs;
          const u = clamp01((ms - volley.topMs) / (descent * (1 - BAR_LEAD)));
          return clampBar(
            volley.from + (volley.land - volley.from) * easeInOut(u),
          );
        }
        return clampBar(final.from);
      };

      const startedAt = performance.now();
      let landed = false;
      let smashed = 0;
      let bats = 0;
      const battedAt: number[] = [];
      let blewAt: number | null = null;

      setIncomePanelsHidden([floor]);
      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: blowMs + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          onEnd: () => setIncomePanelsHidden([]),
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            if (!landed && ms >= dropMs) land();
            while (smashed < hits.length && ms >= hits[smashed].ms)
              smash(hits[smashed++].brick, now);
            while (bats < volleys.length - 1 && ms >= volleys[bats].endMs)
              bat(bats++, now);
            if (blewAt === null && ms >= blowMs) blow(now);
            ctx.save();
            ctx.translate(rect.left, rect.top);

            // the paddle
            const batSince = battedAt.length
              ? now - battedAt[battedAt.length - 1]
              : Infinity;
            const squash = Number.isFinite(batSince)
              ? 1 -
                BAT_SQUASH * Math.exp(-batSince / 60) * Math.cos(batSince / 30)
              : 1;
            ctx.save();
            ctx.translate(barAt(ms), barY);
            ctx.scale(1 / Math.sqrt(squash), squash);
            ctx.translate(-home, -barY);
            drawIncomePanel(ctx, floor, isGroundFloor, {
              whiteAlpha: Math.max(0, 1 - batSince / BAT_MS),
              rotation: 0,
            });
            ctx.restore();
            battedAt.forEach((t, v) =>
              drawWhiteBurst(
                ctx,
                volleys[v].land,
                paddleY + BALL_R,
                (now - t) / (BAT_MS * 1.5),
                BAT_BURST,
              ),
            );

            // the wall
            const drop = 1 - easeInOut(clamp01(ms / dropMs));
            bricks.forEach((b) => {
              let scale = 1;
              let alpha = 1;
              let white = 0;
              if (b.smashedAt !== null) {
                const t = (now - b.smashedAt) / SMASH_MS;
                if (t >= 1) return;
                scale = 1 + 0.4 * t;
                alpha = 1 - t;
                white = 1;
              }
              const cx = b.x + b.w / 2;
              const cy = b.y + BRICK_H / 2 - DROP * drop;
              const w = b.w * scale;
              const h = BRICK_H * scale;
              ctx.globalAlpha = alpha;
              ctx.fillStyle = white ? COLOR.white : COLOR.heavenlyGold;
              ctx.beginPath();
              ctx.roundRect(cx - w / 2, cy - h / 2, w, h, BRICK_RADIUS);
              ctx.fill();
              ctx.globalAlpha = alpha * 0.55;
              ctx.fillStyle = COLOR.white;
              ctx.beginPath();
              ctx.roundRect(
                cx - w / 2 + 6,
                cy - h / 2 + 5,
                w - 12,
                h * 0.3,
                BRICK_RADIUS / 2,
              );
              ctx.fill();
              ctx.globalAlpha = 1;
              if (b.smashedAt !== null && blewAt === null)
                drawWhiteBurst(
                  ctx,
                  cx,
                  cy,
                  (now - b.smashedAt) / SMASH_MS,
                  SMASH_BURST,
                );
            });

            if (blewAt !== null) {
              const since = now - blewAt;
              const top = ballAt(blowMs - 1) ?? { x: home, y: topY };
              drawExplosion(
                ctx,
                top.x,
                top.y,
                since,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
              for (const b of bricks)
                if (b.smashedAt === blewAt)
                  drawWhiteBurst(
                    ctx,
                    b.x + b.w / 2,
                    b.y + BRICK_H / 2,
                    since / BLOW_BURST_MS,
                    BLOW_BURST,
                  );
              const flash = 1 - since / FLASH_MS;
              if (flash > 0) {
                ctx.globalCompositeOperation = "lighter";
                ctx.globalAlpha = FLASH_ALPHA * flash;
                ctx.fillStyle = COLOR.white;
                ctx.fillRect(
                  area.left,
                  area.top,
                  area.right - area.left,
                  area.bottom - area.top,
                );
              }
            }
            ctx.restore();
          },
          // the ball over the coins
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            drawWisp(ctx, ballAt, ms, now, WISP_SIZE, clamp01(ms / blowMs));
            ctx.restore();
          },
        },
      );
      if (!cover) {
        setIncomePanelsHidden([]);
        return;
      }

      const burstCoins = (b: Brick, count: number, reach: [number, number]) => {
        const c = { x: b.x + b.w / 2, y: b.y + BRICK_H / 2 };
        cover.launchFrom(
          c,
          Array.from({ length: count }, () => {
            const angle = Math.random() * Math.PI * 2;
            const r = lerp(reach, Math.sqrt(Math.random()));
            return {
              x: c.x + Math.cos(angle) * r,
              y: c.y + Math.sin(angle) * r,
            };
          }),
        );
      };

      // on the frame the wall lands
      function land(): void {
        landed = true;
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(DROP_SHAKE);
      }
      // on the frame the ball smashes brick i
      function smash(i: number, now: number): void {
        bricks[i].smashedAt = now;
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(SMASH_SHAKE);
        burstCoins(bricks[i], SMASH_COINS, [0, SMASH_COIN_REACH]);
      }
      // on the frame the bar bats it back up
      function bat(v: number, now: number): void {
        battedAt[v] = now;
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(BAT_SHAKE);
      }
      // on the frame the last volley hits the top: every brick left blows
      function blow(now: number): void {
        blewAt = now;
        if (!cover?.isLive()) return;
        playSlamExplosion();
        shakeScreen(BLAST_SHAKE);
        for (const b of bricks)
          if (b.smashedAt === null) {
            b.smashedAt = now;
            burstCoins(b, BLOW_COINS, BLOW_COIN_REACH);
          }
      }
    },
  },
  { label: "Breakout", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Breakout
export function forceBreakoutEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
