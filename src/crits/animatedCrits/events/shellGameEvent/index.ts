// the "Shell Game" event: it covers its crit, whose click freezes the screen
// while three big gold cups pop up in a row across the middle of it and the
// wisp drops into the middle one's spot, the cup slamming down over it. The
// cups shuffle, two at a time swapping places round each other, ever
// faster, each swap a whoosh, a jolt and coins flicked out, the wisp's glow
// peeking out from under its cup. Then all three fly off and the wisp,
// found, swells and blows in a huge blast and shake, and the coins sweep
// into the total. Pays floor income × floor number × REWARD (see ../moneyCover)
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
import { drawWisp, type Point } from "../../../../shared/wisp";
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
import { ringTargets } from "../../../../shared/coinTargets";
import { createGlowSprite, drawGlowSprite } from "../../../../shared/glowShape";

const KEY = "shellGame";
const REWARD = 4;
const CUPS = 3;
const SWAPS = 8;
// the cups, as shares of the screen's width: SPACING apart, CUP_W wide at the
// mouth (narrowing to TOP_W of that) and CUP_H tall, their mouths DROP of the
// screen's height below its middle; the side ones popping in over POP_MS,
// the middle one slamming down from SLAM_FROM of the screen's height above
const SPACING = 0.3;
const CUP_W = 0.22;
const TOP_W = 0.62;
const CUP_H = 0.24;
const DROP = 0.08;
const POP_MS = 200;
const SLAM_FROM = 0.5;
// swapping cups round each other: one swings DEPTH of a cup's height behind
// (up, shrinking to BACK), the other in front (down)
const DEPTH = 0.55;
const BACK = 0.85;
// the wisp: WISP of the screen's width, peeking under its cup, dropping in
// from the top over the first share of the drop
const WISP = 0.07;
const WISP_UP = 0.45;
// each swap: a jolt and coins flicked up from between the two
const SWAP_SHAKE: [number, number] = [0.4, 1.2];
const SWAP_COINS = 2;
const FLICK: [number, number] = [100, 260];
const LAND_BURST = 0.4;
const LAND_BURST_MS = 280;
const LAND_SHAKE = 1.2;
// the reveal: the cups fly up off the screen over FLY of revealMs, the wisp
// swelling to FINAL_GROW, then a huge blast and a ring of FINAL_COINS
const FLY = 0.45;
const FINAL_GROW = 1.9;
const FINAL_COINS = 30;
const FINAL_RING: [number, number] = [140, 400];
const FINAL_SHAKE = 2.8;
const BLAST_SCALE = 1.9;
const SPARK_REACH = 400;
const SPARK_SIZE = 22;
// the look
const BAND = 0.22;

interface Swap {
  at: number;
  ms: number;
  // the two slots trading cups
  a: number;
  b: number;
  firedAt: number | null;
}

interface CupPose {
  x: number;
  y: number;
  scale: number;
}

const byDepth = (p: { pose: CupPose }, q: { pose: CupPose }) =>
  p.pose.y - q.pose.y;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.shellGameEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { dropMs, swapMs, revealMs, holdMs, mergeMs } =
        CONFIG.shellGameEvent;
      const width = area.right - area.left;
      const height = area.bottom - area.top;
      const center = {
        x: (area.left + area.right) / 2,
        y: (area.top + area.bottom) / 2 + height * DROP,
      };
      const cupW = width * CUP_W;
      const cupH = width * CUP_H;
      const slotX = (slot: number) =>
        center.x + (slot - (CUPS - 1) / 2) * width * SPACING;

      let at = dropMs;
      let previous = -1;
      const swaps: Swap[] = Array.from({ length: SWAPS }, (_, i) => {
        // never the same pair twice running
        let pair: number;
        do pair = Math.floor(Math.random() * 3);
        while (pair === previous);
        previous = pair;
        const [a, b] = [
          [0, 1],
          [1, 2],
          [0, 2],
        ][pair];
        const ms = lerp(swapMs, i / (SWAPS - 1));
        const swap: Swap = { at, ms, a, b, firedAt: null };
        at += ms;
        return swap;
      });
      const shuffledAt = at;
      const blastAt = shuffledAt + revealMs;
      const startedAt = performance.now();
      let landedAt: number | null = null;
      let blastedAt: number | null = null;

      // which slot each cup sits in once every swap before ms has finished,
      // and the swap under way at ms, if any; the wisp's trail samples this
      // hundreds of times a frame, so every swap's slots are worked out up front
      const slotsBefore: number[][] = [];
      {
        const slots = [0, 1, 2];
        for (const swap of swaps) {
          slotsBefore.push([...slots]);
          const ca = slots.indexOf(swap.a);
          const cb = slots.indexOf(swap.b);
          slots[ca] = swap.b;
          slots[cb] = swap.a;
        }
        slotsBefore.push(slots);
      }
      const slotsAt = (ms: number) => {
        let i = 0;
        while (i < swaps.length && ms >= swaps[i].at + swaps[i].ms) i++;
        const moving = i < swaps.length && ms >= swaps[i].at ? swaps[i] : null;
        return { slots: slotsBefore[i], moving };
      };
      const cupAt = (cup: number, ms: number): CupPose => {
        const { slots, moving } = slotsAt(ms);
        const slot = slots[cup];
        let pose: CupPose = { x: slotX(slot), y: center.y, scale: 1 };
        if (moving && (slot === moving.a || slot === moving.b)) {
          const u = smooth((ms - moving.at) / moving.ms);
          const to = slot === moving.a ? moving.b : moving.a;
          const mid = (slotX(slot) + slotX(to)) / 2;
          const half = slotX(slot) - mid;
          // the left-hand cup swings behind, the right-hand one in front
          const behind = slotX(slot) < slotX(to);
          const swing = Math.sin(Math.PI * u);
          pose = {
            x: mid + half * Math.cos(Math.PI * u),
            y: center.y + (behind ? -1 : 1) * cupH * DEPTH * swing * 0.5,
            scale: behind
              ? 1 - (1 - BACK) * swing
              : 1 + (1 - BACK) * swing * 0.5,
          };
        }
        if (cup === 1 && ms < dropMs) {
          const v = clamp01(ms / dropMs) ** 2;
          pose.y = center.y - height * SLAM_FROM * (1 - v);
        }
        if (ms >= shuffledAt) {
          const v = clamp01((ms - shuffledAt) / (revealMs * FLY));
          pose.y -= height * v * v;
        }
        return pose;
      };
      // the wisp, under the middle cup it was dropped into, wherever that goes
      const wispAt = (ms: number): Point | null => {
        if (ms < 0 || ms >= blastAt) return null;
        const pose = cupAt(1, ms);
        const rest = { x: pose.x, y: center.y - cupH * WISP_UP };
        if (ms < dropMs) {
          const v = 1 - (1 - clamp01(ms / (dropMs * 0.6))) ** 2;
          return { x: center.x, y: area.top + (rest.y - area.top) * v };
        }
        if (ms >= shuffledAt)
          return { x: slotX(slotsAt(ms).slots[1]), y: rest.y };
        return { x: pose.x, y: pose.y - cupH * WISP_UP };
      };

      // the cup traced once round its mouth's middle, then stamped for every pose
      const top = cupW * TOP_W;
      const bandY = -cupH * 0.45;
      const bandW = cupW - (cupW - top) * 0.45;
      const cup = createGlowSprite(
        {
          left: -cupW / 2,
          top: -cupH * 1.08,
          width: cupW,
          height: cupH * 1.2,
        },
        (s) => {
          s.moveTo(-cupW / 2, 0);
          s.lineTo(-top / 2, -cupH);
          s.quadraticCurveTo(0, -cupH * 1.08, top / 2, -cupH);
          s.lineTo(cupW / 2, 0);
          s.quadraticCurveTo(0, cupH * 0.12, -cupW / 2, 0);
          s.closePath();
        },
        {
          // a white band round its middle
          details: (s) => {
            s.moveTo(-bandW / 2, bandY);
            s.quadraticCurveTo(0, bandY + cupH * BAND * 0.3, bandW / 2, bandY);
          },
        },
      );
      const drawCup = (
        ctx: CanvasRenderingContext2D,
        pose: CupPose,
        grow: number,
      ) => drawGlowSprite(ctx, cup, pose.x, pose.y, pose.scale * grow);
      // each frame's cups, reused and sorted in place
      const posed = Array.from({ length: CUPS }, () => ({
        pose: { x: 0, y: 0, scale: 1 } as CupPose,
        grow: 1,
      }));

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: blastAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            if (landedAt === null && ms >= dropMs) land(now);
            swaps.forEach((swap, i) => {
              if (swap.firedAt === null && ms >= swap.at) swapped(swap, i, now);
            });
            if (blastedAt === null && ms >= blastAt) blast(now);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            if (landedAt !== null)
              drawWhiteBurst(
                ctx,
                center.x,
                center.y,
                (now - landedAt) / LAND_BURST_MS,
                LAND_BURST,
              );
            if (blastedAt !== null) {
              const at = wispAt(blastAt - 1);
              if (at)
                drawExplosion(
                  ctx,
                  at.x,
                  at.y,
                  now - blastedAt,
                  now,
                  BLAST_SCALE,
                  SPARK_REACH,
                  SPARK_SIZE,
                );
            }
            ctx.restore();
          },
          // the wisp under the cups, both over the coins they flick out
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            const swell =
              ms < shuffledAt
                ? 1
                : 1 + (FINAL_GROW - 1) * clamp01((ms - shuffledAt) / revealMs);
            drawWisp(
              ctx,
              wispAt,
              ms,
              now,
              width * WISP * swell,
              clamp01(ms / blastAt),
            );
            if (ms < shuffledAt + revealMs * FLY) {
              const grow = 1 - (1 - clamp01(ms / POP_MS)) ** 3;
              for (let k = 0; k < CUPS; k++) {
                posed[k].pose = cupAt(k, ms);
                posed[k].grow = k === 1 ? 1 : grow;
              }
              // the ones swinging behind first
              posed.sort(byDepth);
              for (const { pose, grow: g } of posed) drawCup(ctx, pose, g);
            }
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame the middle cup slams down over the wisp
      function land(now: number): void {
        landedAt = now;
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(LAND_SHAKE);
      }

      // on the frame each swap starts
      function swapped(swap: Swap, i: number, now: number): void {
        swap.firedAt = now;
        if (!cover?.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(SWAP_SHAKE, i / (SWAPS - 1)));
        const from = {
          x: (slotX(swap.a) + slotX(swap.b)) / 2,
          y: center.y - cupH / 2,
        };
        cover.launchFrom(
          from,
          Array.from({ length: SWAP_COINS }, () => {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
            const r = between(FLICK);
            return {
              x: from.x + Math.cos(angle) * r,
              y: from.y + Math.sin(angle) * r,
            };
          }),
        );
      }

      // on the frame the found wisp blows
      function blast(now: number): void {
        blastedAt = now;
        if (!cover?.isLive()) return;
        const at = wispAt(blastAt - 1) ?? center;
        playSlamExplosion();
        shakeScreen(FINAL_SHAKE);
        cover.launchFrom(at, ringTargets(at, FINAL_COINS, FINAL_RING));
      }
    },
  },
  { label: "Shell Game", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Shell Game
export function forceShellGameEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}
