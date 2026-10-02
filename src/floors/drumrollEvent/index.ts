// the "Drumroll" event: it covers its crit, whose click freezes the screen
// while a big gold drum pops up in the middle of it and two wisps drop onto
// it like drumsticks. They beat it in turn, ever faster, into a blurring
// drumroll, the drumhead jumping at every hit as coins bounce off it and the
// screen rumbles harder. Then both fly high, hang trembling, and slam down
// together, bursting the drum in a huge blast and shake, and the coins sweep
// into the total. Pays floor income × floor number × REWARD (see ../moneyCover)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBloop, playSlamExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawExplosion, drawWhiteBurst } from "../../shared/eventFx";
import { drawWisp, type Point } from "../../shared/wisp";
import { forceTestCrit } from "../upgradeButton";
import { forceClaimEventProc, registerEventProc } from "../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../moneyCover";

const KEY = "drumroll";
const REWARD = 4;
const TAPS = 18;
// the drum, as shares of the screen's width: RADIUS across its head, its
// head TILT of that tall and its body BODY of that deep, its head DROP of
// the screen's height below the middle; popping in over POP_MS
const RADIUS = 0.28;
const TILT = 0.3;
const BODY = 0.75;
const DROP = 0.1;
const POP_MS = 200;
const LACES = 8;
// the sticks: wisps at STICK of the screen's width, striking SPOT of the
// head's radius either side of its middle, lifting LIFT of the screen's
// height between hits (shrinking as the roll quickens)
const STICK = 0.06;
const SPOT = 0.45;
const LIFT: [number, number] = [0.22, 0.05];
// each tap: the head dips DIP of its height and flashes, a jolt and a coin
const DIP = 0.25;
const DIP_MS = 70;
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
// the look
const EDGE_WIDTH = 5;
const GLOW_WIDTH = 16;
const LACE_WIDTH = 3;

const lerp = ([a, b]: [number, number], t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const between = (range: [number, number]) => lerp(range, Math.random());

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
      const rx = width * RADIUS;
      const ry = rx * TILT;
      const head = {
        x: (area.left + area.right) / 2,
        y: (area.top + area.bottom) / 2 + height * DROP,
      };
      const body = rx * BODY;
      const stick = width * STICK;
      const spots = [head.x - rx * SPOT, head.x + rx * SPOT];

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

      const liftAt = (ms: number) =>
        height * lerp(LIFT, clamp01(ms / lastTap.at));
      // a stick ms in: dropping in, bouncing between its own taps, then
      // rising high, hanging, and slamming into the middle with the other
      const stickAt = (side: number, ms: number): Point | null => {
        if (ms < 0 || ms >= slamAt) return null;
        const own = taps.filter((tap) => tap.side === side);
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

      const drawDrum = (
        ctx: CanvasRenderingContext2D,
        ms: number,
        now: number,
      ) => {
        const pop = clamp01(ms / POP_MS);
        const grow = 1 - (1 - pop) ** 3;
        if (grow <= 0) return;
        const latest = [...taps].reverse().find((tap) => tap.firedAt !== null);
        const since = latest?.firedAt != null ? now - latest.firedAt : Infinity;
        const dip = DIP * Math.exp(-since / DIP_MS);
        ctx.save();
        ctx.translate(head.x, head.y);
        ctx.scale(grow, grow);
        // the body: its sides and bottom rim, then the laces round it
        ctx.beginPath();
        ctx.moveTo(-rx, 0);
        ctx.lineTo(-rx, body);
        ctx.ellipse(0, body, rx, ry, 0, Math.PI, 0, true);
        ctx.lineTo(rx, 0);
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
        ctx.closePath();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = COLOR.heavenlyGold;
        ctx.lineWidth = GLOW_WIDTH;
        ctx.stroke();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = COLOR.heavenlyGold;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = COLOR.white;
        ctx.lineWidth = EDGE_WIDTH;
        ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i < LACES; i++) {
          const a = Math.PI * (i / LACES);
          const b = Math.PI * ((i + 0.5) / LACES);
          ctx.moveTo(-rx * Math.cos(a), ry * Math.sin(a) + body * 0.1);
          ctx.lineTo(-rx * Math.cos(b), body + ry * Math.sin(b) - body * 0.1);
        }
        ctx.lineWidth = LACE_WIDTH;
        ctx.stroke();
        // the head, dipping and flashing as it's hit
        ctx.beginPath();
        ctx.ellipse(0, ry * dip, rx, ry * (1 - dip), 0, 0, Math.PI * 2);
        ctx.fillStyle = COLOR.white;
        ctx.globalAlpha = 0.55 + 0.45 * clamp01(dip / DIP);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = EDGE_WIDTH;
        ctx.strokeStyle = COLOR.heavenlyGold;
        ctx.stroke();
        ctx.restore();
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
            if (slammedAt === null) drawDrum(ctx, ms, now);
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
          Array.from({ length: FINAL_COINS }, (_, i) => {
            const angle = (i / FINAL_COINS) * Math.PI * 2;
            const r = between(FINAL_RING);
            return {
              x: head.x + Math.cos(angle) * r,
              y: head.y + Math.sin(angle) * r,
            };
          }),
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
