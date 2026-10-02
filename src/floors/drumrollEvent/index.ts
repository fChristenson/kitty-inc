// the "Drumroll" event: it covers its crit, whose click freezes the screen
// while a ring of glitter swirls up in the middle of it and two wisps drop
// into it like drumsticks. They beat on it in turn, ever faster, into a
// blurring drumroll, the ring jumping and flaring at every hit as coins
// bounce out and the screen rumbles harder. Then both fly high, hang
// trembling, and slam down together in a huge blast and shake, and the coins
// sweep into the total. Pays floor income × floor number × REWARD (see
// ../moneyCover)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBloop, playSlamExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawExplosion, drawWhiteBurst } from "../../shared/eventFx";
import { drawGlitterLight, drawWisp, type Point } from "../../shared/wisp";
import { hash01 } from "../../shared/twinkle";
import { forceTestCrit } from "../upgradeButton";
import { forceClaimEventProc, registerEventProc } from "../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../moneyCover";
import { lerp, clamp01, between } from "../../shared/easing";
import { ringTargets } from "../../shared/coinTargets";

const KEY = "drumroll";
const REWARD = 4;
const TAPS = 18;
// the ring: GLITTER sparkles round the impact area in a drumhead's tilted
// oval, RADIUS of the screen's width across and TILT of that tall, DROP of
// the screen's height below its middle, each up to SPARKLE of the screen's
// width, wobbling WOBBLE of the radius in and out and turning SPIN rad/s;
// growing in over POP_MS
const RADIUS = 0.28;
const TILT = 0.3;
const DROP = 0.1;
const GLITTER = 56;
const SPARKLE = 0.014;
const WOBBLE = 0.08;
const SPIN = 0.6;
const POP_MS = 200;
// the sticks: wisps at STICK of the screen's width, striking SPOT of the
// ring's radius either side of its middle, lifting LIFT of the screen's
// height between hits (shrinking as the roll quickens)
const STICK = 0.06;
const SPOT = 0.45;
const LIFT: [number, number] = [0.22, 0.05];
// each tap: the ring jumps out PULSE of its radius and flares, the dim white
// head inside it (HEAD_ALPHA) dips DIP of its height and flashes, a jolt and a coin
const PULSE = 0.12;
const PULSE_MS = 90;
const HEAD_ALPHA = 0.55;
const DIP = 0.25;
const TAP_BURST = 0.18;
const TAP_BURST_MS = 160;
const TAP_SHAKE: [number, number] = [0.2, 0.9];
const TOSS: [number, number] = [120, 300];
// the last: both rise FINAL_LIFT of the screen's height over RISE of
// finalMs, hang trembling TREMBLE px, then slam together into the middle
const FINAL_LIFT = 0.36;
const RISE = 0.5;
const HANG = 0.25;
const TREMBLE = 10;
const FINAL_COINS = 28;
const FINAL_RING: [number, number] = [130, 380];
const FINAL_SHAKE = 2.8;
const BLAST_SCALE = 1.9;
const SPARK_REACH = 400;
const SPARK_SIZE = 22;


interface Tap {
  at: number;
  // 0 the left stick, 1 the right
  side: number;
  firedAt: number | null;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.drumrollEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { firstTapMs, gapMs, finalMs, holdMs, mergeMs } =
        CONFIG.drumrollEvent;
      const width = area.right - area.left;
      const height = area.bottom - area.top;
      const radius = width * RADIUS;
      const head = {
        x: (area.left + area.right) / 2,
        y: (area.top + area.bottom) / 2 + height * DROP,
      };
      const stick = width * STICK;
      const spots = [head.x - radius * SPOT, head.x + radius * SPOT];

      let at = firstTapMs;
      const taps: Tap[] = Array.from({ length: TAPS }, (_, k) => {
        const tap: Tap = { at, side: k % 2, firedAt: null };
        at += lerp(gapMs, k / (TAPS - 2));
        return tap;
      });
      const lastTap = taps[TAPS - 1];
      const slamAt = lastTap.at + finalMs;
      const riseEnd = lastTap.at + finalMs * RISE;
      const hangEnd = riseEnd + finalMs * HANG;
      const startedAt = performance.now();
      let slammedAt: number | null = null;
      let latestTapAt: number | null = null;
      const ownTaps = [0, 1].map((side) => taps.filter((t) => t.side === side));

      const liftAt = (ms: number) =>
        height * lerp(LIFT, clamp01(ms / lastTap.at));
      // a stick ms in: dropping in, bouncing between its own taps, then
      // rising high, hanging, and slamming into the middle with the other
      const stickAt = (side: number, ms: number): Point | null => {
        if (ms < 0 || ms >= slamAt) return null;
        const own = ownTaps[side];
        const x = spots[side];
        if (ms < own[0].at) {
          const u = ms / own[0].at;
          return { x, y: head.y - liftAt(0) * 1.5 * (1 - u * u) };
        }
        const k = own.findIndex((tap) => ms < tap.at);
        if (k > 0) {
          const from = own[k - 1].at;
          const u = (ms - from) / (own[k].at - from);
          return { x, y: head.y - liftAt(from) * Math.sin(Math.PI * u) };
        }
        const from = own[own.length - 1].at;
        const top = head.y - height * FINAL_LIFT;
        if (ms < riseEnd) {
          const u = (ms - from) / (riseEnd - from);
          return { x, y: head.y + (top - head.y) * (1 - (1 - u) ** 2) };
        }
        if (ms < hangEnd) {
          const wind = (ms - riseEnd) / (hangEnd - riseEnd);
          return {
            x: x + Math.sin(ms * 1.1 + side) * TREMBLE * wind,
            y: top + Math.sin(ms * 1.7) * TREMBLE * wind,
          };
        }
        const v = ((ms - hangEnd) / (slamAt - hangEnd)) ** 2;
        return { x: x + (head.x - x) * v, y: top + (head.y - top) * v };
      };

      const drawRing = (
        ctx: CanvasRenderingContext2D,
        ms: number,
        now: number,
      ) => {
        const grow = 1 - (1 - clamp01(ms / POP_MS)) ** 3;
        if (grow <= 0) return;
        const since = latestTapAt !== null ? now - latestTapAt : Infinity;
        const kick = Math.exp(-since / PULSE_MS);
        const heat = clamp01(ms / lastTap.at);
        const r = radius * grow * (1 + PULSE * kick);
        const turn = (SPIN * (1 + heat) * ms) / 1000;
        // the dim white drumhead inside, dipping and flashing as it's hit
        const dip = DIP * kick;
        const ry = radius * grow * TILT;
        ctx.beginPath();
        ctx.ellipse(
          head.x,
          head.y + ry * dip,
          radius * grow,
          ry * (1 - dip),
          0,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = COLOR.white;
        ctx.globalAlpha = HEAD_ALPHA + (1 - HEAD_ALPHA) * kick;
        ctx.fill();
        ctx.globalAlpha = 1;
        for (let i = 0; i < GLITTER; i++) {
          const angle = turn + (i / GLITTER) * Math.PI * 2;
          const wobble =
            1 +
            WOBBLE *
              Math.sin(ms / 90 + hash01(i, 3) * Math.PI * 2) *
              (hash01(i, 5) * 2 - 1);
          drawGlitterLight(
            ctx,
            head.x + Math.cos(angle) * r * wobble,
            head.y + Math.sin(angle) * r * TILT * wobble,
            width *
              SPARKLE *
              (0.5 + 0.7 * hash01(i, 7)) *
              (1 + 0.6 * kick) *
              grow,
            i,
            Math.min(1, 0.55 + 0.25 * heat + 0.4 * kick),
            now,
          );
        }
      };

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: slamAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            taps.forEach((tap, k) => {
              if (tap.firedAt === null && ms >= tap.at) beat(tap, k, now);
            });
            if (slammedAt === null && ms >= slamAt) slam(now);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            if (slammedAt === null) drawRing(ctx, ms, now);
            for (const tap of taps) {
              if (tap.firedAt === null) continue;
              drawWhiteBurst(
                ctx,
                spots[tap.side],
                head.y,
                (now - tap.firedAt) / TAP_BURST_MS,
                TAP_BURST,
              );
            }
            if (slammedAt !== null)
              drawExplosion(
                ctx,
                head.x,
                head.y,
                now - slammedAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            ctx.restore();
          },
          // the sticks over the coins they bounce off the drum
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            const heat = clamp01(ms / slamAt);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (const side of [0, 1])
              drawWisp(ctx, (t) => stickAt(side, t), ms, now, stick, heat);
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame each stick hits the drum
      function beat(tap: Tap, k: number, now: number): void {
        tap.firedAt = now;
        latestTapAt = now;
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(lerp(TAP_SHAKE, k / (TAPS - 1)));
        const from = { x: spots[tap.side], y: head.y };
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
        const r = between(TOSS);
        cover.launchFrom(from, [
          { x: from.x + Math.cos(angle) * r, y: from.y + Math.sin(angle) * r },
        ]);
      }

      // on the frame both sticks slam down together
      function slam(now: number): void {
        slammedAt = now;
        if (!cover?.isLive()) return;
        playSlamExplosion();
        shakeScreen(FINAL_SHAKE);
        cover.launchFrom(
          head,
          ringTargets(head, FINAL_COINS, FINAL_RING),
        );
      }
    },
  },
  { label: "Drumroll", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Drumroll
export function forceDrumrollEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
