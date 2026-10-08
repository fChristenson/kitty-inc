// the "Spiral" event: it covers its crit, whose click freezes the screen while
// the wisp flies in from off its side and loops round it in a wide spiral,
// ever tighter and faster, shedding coins all along it, every lap a flash, a
// pop and a jolt; it reaches the screen's middle, hangs there trembling as the
// screen rumbles, then shoots straight up into the total-income readout and
// explodes in a huge blast and shake, coins bursting out of it, and all the
// coins sweep into the total. Pays floor income × floor number × REWARD (see
// ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playSwoosh } from "../../../../sound";
import { playSlamExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import {
  pulseHudTotalFlash,
  triggerHudTotalFlash,
} from "../../../../shared/totalIncomeCoins";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import { between, clamp01, lerp } from "../../../../shared/easing";
import { ringTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "spiral";
const REWARD = 4;
// the spiral: starting REACH of the screen's width out (off its side), TURNS
// laps in, its pace picking up by SPEEDUP and its laps tightening by TIGHTEN;
// its radius shrinks by (1 - u)^HOLD, so it stays wide most of the way
const REACH = 0.62;
const TURNS = 4096 / 360;
const SPEEDUP = 1.1;
const TIGHTEN = 0.45;
const HOLD = 0.55;
// the wisp, as a share of the screen's width, swelling GROW more by the middle
const WISP = 0.045;
const GROW = 0.25;
// a coin shed every SHED_MS while on screen, tossed SHED_TOSS px outward
const SHED_MS = 40;
const SHED_TOSS: [number, number] = [15, 70];
// each lap: a burst, a pop and a jolt
const LAP_BURST: [number, number] = [0.3, 0.55];
const LAP_BURST_MS = 240;
const LAP_SHAKE: [number, number] = [0.6, 1.3];
// hanging in the middle: trembling TREMBLE of its size, the screen rumbling
const TREMBLE = 0.12;
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.3, 0.9];
// the blast in the total: coins bursting out of it
const FINAL_COINS = 26;
const FINAL_RING: [number, number] = [90, 300];
const FINAL_SHAKE = 2.9;
const BLAST_SCALE = 1.9;
const SPARK_REACH = 380;
const SPARK_SIZE = 22;
// laps are found by stepping the spiral this many ms at a time
const SCAN_MS = 2;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.spiralEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { spiralMs, chargeMs, shootMs, holdMs, mergeMs } =
        CONFIG.spiralEvent;
      const width = area.right - area.left;
      const middle = {
        x: (area.left + area.right) / 2,
        y: (area.top + area.bottom) / 2,
      };
      const reach = width * REACH;
      const size = Math.max(WISP_SIZE, width * WISP);
      const start = Math.random() < 0.5 ? 0 : Math.PI;
      const way = Math.random() < 0.5 ? 1 : -1;
      const shootFrom = spiralMs + chargeMs;
      const blastAt = shootFrom + shootMs;
      // the total, local to the floor; known once the overlay's first drawn
      let total: Point | null = null;

      // laps run so far, 0..TURNS, tightening as it closes in
      const lapsAt = (u: number) =>
        (TURNS * (1 / (1 - TIGHTEN * u) - 1)) / (1 / (1 - TIGHTEN) - 1);
      const spiralAt = (ms: number, into: Point): Point => {
        const u = clamp01(ms / spiralMs) ** SPEEDUP;
        const r = reach * (1 - u) ** HOLD;
        const angle = start + way * lapsAt(u) * Math.PI * 2;
        into.x = middle.x + Math.cos(angle) * r;
        into.y = middle.y + Math.sin(angle) * r;
        return into;
      };
      const onScreen = (p: Point) =>
        p.x > area.left &&
        p.x < area.right &&
        p.y > area.top &&
        p.y < area.bottom;

      // each lap's end, and each coin shed along the way
      const laps: { at: number; spot: Point }[] = [];
      let lap = 0;
      for (let ms = SCAN_MS; ms < spiralMs; ms += SCAN_MS) {
        const next = Math.floor(lapsAt(clamp01(ms / spiralMs) ** SPEEDUP));
        if (next === lap) continue;
        lap = next;
        laps.push({ at: ms, spot: spiralAt(ms, { x: 0, y: 0 }) });
      }
      const sheds: number[] = [];
      for (let ms = 0; ms < spiralMs; ms += SHED_MS)
        if (onScreen(spiralAt(ms, { x: 0, y: 0 }))) sheds.push(ms);

      const point = { x: 0, y: 0 };
      const wispAt = (ms: number): Point | null => {
        if (ms < 0 || ms >= blastAt) return null;
        if (ms < spiralMs) return spiralAt(ms, point);
        if (ms < shootFrom) {
          const shake = TREMBLE * size * ((ms - spiralMs) / chargeMs);
          point.x = middle.x + Math.sin(ms * 0.13) * shake;
          point.y = middle.y + Math.cos(ms * 0.11) * shake;
          return point;
        }
        if (!total) return null;
        const u = ((ms - shootFrom) / shootMs) ** 2;
        point.x = middle.x + (total.x - middle.x) * u;
        point.y = middle.y + (total.y - middle.y) * u;
        return point;
      };

      const startedAt = performance.now();
      let lastRumble = -Infinity;
      let blastedAt: number | null = null;
      let swooshed = false;
      const lapBeats = createBeats(
        laps,
        (l) => l.at,
        (_, k) => lapped(k),
      );
      const shedBeats = createBeats(
        sheds,
        (ms) => ms,
        (ms) => shed(ms),
      );

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: blastAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect, totalTarget) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            total ??= {
              x: totalTarget.x - rect.left,
              y: totalTarget.y - rect.top,
            };
            const now = performance.now();
            const ms = now - startedAt;
            lapBeats.tick(ms, now);
            shedBeats.tick(ms, now);
            if (
              ms >= spiralMs &&
              ms < shootFrom &&
              now - lastRumble >= RUMBLE_MS
            ) {
              lastRumble = now;
              shakeScreen(lerp(RUMBLE, (ms - spiralMs) / chargeMs));
            }
            if (!swooshed && ms >= shootFrom) {
              swooshed = true;
              if (cover?.isLive()) playSwoosh();
            }
            if (blastedAt === null && ms >= blastAt) blast(now);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            laps.forEach((l, k) => {
              const firedAt = lapBeats.firedAt(k);
              if (firedAt === null) return;
              const t = (now - firedAt) / LAP_BURST_MS;
              if (t < 1)
                drawWhiteBurst(
                  ctx,
                  l.spot.x,
                  l.spot.y,
                  t,
                  lerp(LAP_BURST, k / Math.max(1, laps.length - 1)),
                );
            });
            if (blastedAt !== null)
              drawExplosion(
                ctx,
                total.x,
                total.y,
                now - blastedAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            ctx.restore();
          },
          // the wisp over the coins it sheds
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            const heat = clamp01(ms / shootFrom);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            drawWispBetween(
              ctx,
              wispAt,
              ms,
              now,
              size * (1 + GROW * heat),
              heat,
              0,
              blastAt,
            );
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame each lap comes round
      function lapped(k: number): void {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAP_SHAKE, k / Math.max(1, laps.length - 1)));
      }
      // a coin tossed outward off the spiral
      function shed(ms: number): void {
        if (!cover?.isLive()) return;
        const at = spiralAt(ms, { x: 0, y: 0 });
        const dx = at.x - middle.x;
        const dy = at.y - middle.y;
        const d = Math.hypot(dx, dy) || 1;
        const toss = between(SHED_TOSS);
        cover.launchFrom(at, [
          { x: at.x + (dx / d) * toss, y: at.y + (dy / d) * toss },
        ]);
      }
      // on the frame it hits the total: a huge blast and coins bursting out
      function blast(now: number): void {
        blastedAt = now;
        if (!cover?.isLive() || !total) return;
        playSlamExplosion();
        shakeScreen(FINAL_SHAKE);
        triggerHudTotalFlash();
        pulseHudTotalFlash();
        cover.launchFrom(total, ringTargets(total, FINAL_COINS, FINAL_RING));
      }
    },
  },
  { label: "Spiral", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Spiral
export function forceSpiralEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
