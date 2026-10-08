// the "Implosion" event: it covers its crit, whose click freezes the screen
// while rings of wisps close in on the clicked floor's button from beyond the
// screen's edges, one ring after another, ever faster, each collapsing onto
// it in a slam: a flash, a bang, a jolt and coins blown back out, the core
// wisp on the button swelling with every ring it swallows. Then a last, bigger
// ring closes in as the core trembles and the screen rumbles, and it all
// blows in a huge blast and shake, and the coins sweep into the total. Pays
// floor income × floor number × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSwoosh } from "../../../../sound";
import {
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import {
  drawWispBetween,
  WISP_SIZE,
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
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { ringTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "implosion";
const REWARD = 4;
// rings before the last, each of COUNT wisps (FINAL_COUNT in the last),
// starting OUTSIDE of the screen's width past its farthest corner
const RINGS = 6;
const COUNT = 6;
const FINAL_COUNT = 10;
const OUTSIDE = 0.1;
// the wisps, as shares of the screen's width; the core swells GROW more by
// the last ring and kicks KICK bigger on each, settling over KICK_MS
const RING_WISP = 0.05;
const FINAL_WISP = 0.07;
const CORE = 0.06;
const GROW = 1.2;
const KICK = 0.4;
const KICK_MS = 200;
const POP_MS = 160;
// the last ring: the core trembling TREMBLE of its size as the screen rumbles
const TREMBLE = 0.1;
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.2, 0.8];
// each ring's slam: a burst, a jolt and coins blown back out
const SLAM_BURST: [number, number] = [0.45, 0.8];
const SLAM_BURST_MS = 260;
const SLAM_SHAKE: [number, number] = [0.8, 1.7];
const SLAM_COINS: [number, number] = [4, 6];
const SLAM_RING: [number, number] = [80, 240];
// the blast
const FINAL_COINS = 28;
const FINAL_RING: [number, number] = [130, 380];
const FINAL_SHAKE = 2.9;
const BLAST_SCALE = 2;
const SPARK_REACH = 400;
const SPARK_SIZE = 22;

interface Ring {
  arriveAt: number;
  collapseMs: number;
  size: number;
  final: boolean;
  // one path per wisp
  paths: ((ms: number) => Point | null)[];
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.implosionEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { firstRingMs, gapMs, collapseMs, finalMs, holdMs, mergeMs } =
        CONFIG.implosionEvent;
      const width = area.right - area.left;
      const button = getButtonCenter(context.isGroundFloor);
      const core = Math.max(WISP_SIZE * 1.2, width * CORE);
      const reach =
        Math.max(
          ...[area.left, area.right].flatMap((x) =>
            [area.top, area.bottom].map((y) =>
              Math.hypot(x - button.x, y - button.y),
            ),
          ),
        ) +
        width * OUTSIDE;

      const rings: Ring[] = [];
      let arriveAt = firstRingMs;
      for (let k = 0; k <= RINGS; k++) {
        const final = k === RINGS;
        if (k > 0)
          arriveAt += final ? finalMs : lerp(gapMs, (k - 1) / (RINGS - 2));
        const ms = final ? finalMs : lerp(collapseMs, k / (RINGS - 1));
        const count = final ? FINAL_COUNT : COUNT;
        const turn = Math.random() * Math.PI * 2;
        const from = arriveAt - ms;
        const ring: Ring = {
          arriveAt,
          collapseMs: ms,
          size: Math.max(WISP_SIZE, width * (final ? FINAL_WISP : RING_WISP)),
          final,
          paths: Array.from({ length: count }, (_, i) => {
            const angle = turn + (i / count) * Math.PI * 2;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const point = { x: 0, y: 0 };
            const end = arriveAt;
            return (t: number) => {
              if (t < from || t >= end) return null;
              const r = reach * (1 - easeIn((t - from) / ms));
              point.x = button.x + cos * r;
              point.y = button.y + sin * r;
              return point;
            };
          }),
        };
        rings.push(ring);
      }
      const last = rings[RINGS];
      const lastFrom = last.arriveAt - last.collapseMs;

      let swallowed = 0;
      let slammedAt = -Infinity;
      let lastRumble = -Infinity;
      const startedAt = performance.now();
      const corePoint = { x: button.x, y: button.y };
      const coreAt = (ms: number): Point | null => {
        if (ms < 0 || ms >= last.arriveAt) return null;
        const shake =
          ms > lastFrom
            ? TREMBLE * core * ((ms - lastFrom) / last.collapseMs)
            : 0;
        corePoint.x = button.x + Math.sin(ms * 0.13) * shake;
        corePoint.y = button.y + Math.cos(ms * 0.11) * shake;
        return corePoint;
      };

      const beats = createBeats(
        rings,
        (ring) => ring.arriveAt,
        (ring, k, now) => slam(ring, k, now),
      );

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: last.arriveAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            beats.tick(ms, now);
            if (
              ms >= lastFrom &&
              ms < last.arriveAt &&
              now - lastRumble >= RUMBLE_MS
            ) {
              lastRumble = now;
              shakeScreen(lerp(RUMBLE, (ms - lastFrom) / last.collapseMs));
            }
            ctx.save();
            ctx.translate(rect.left, rect.top);
            const latest = beats.latest();
            if (latest && latest.index < RINGS) {
              const t = (now - latest.at) / SLAM_BURST_MS;
              if (t < 1)
                drawWhiteBurst(
                  ctx,
                  button.x,
                  button.y,
                  t,
                  lerp(SLAM_BURST, latest.index / (RINGS - 1)),
                );
            }
            const blastedAt = beats.firedAt(RINGS);
            if (blastedAt !== null)
              drawExplosion(
                ctx,
                button.x,
                button.y,
                now - blastedAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            ctx.restore();
          },
          // the wisps over the coins they blow out
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            const heat = clamp01(ms / last.arriveAt);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (const ring of rings)
              for (const path of ring.paths)
                drawWispBetween(
                  ctx,
                  path,
                  ms,
                  now,
                  ring.size,
                  heat,
                  ring.arriveAt - ring.collapseMs,
                  ring.arriveAt,
                );
            const kick = Math.max(0, 1 - (now - slammedAt) / KICK_MS) ** 2;
            const size =
              core *
              easeOutBack(clamp01(ms / POP_MS)) *
              (1 + (GROW * swallowed) / RINGS) *
              (1 + KICK * kick);
            drawWispBetween(ctx, coreAt, ms, now, size, heat, 0, last.arriveAt);
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame each ring collapses onto the button
      function slam(ring: Ring, k: number, now: number): void {
        swallowed++;
        slammedAt = now;
        if (!cover?.isLive()) return;
        if (ring.final) {
          playSlamExplosion();
          shakeScreen(FINAL_SHAKE);
          cover.launchFrom(
            button,
            ringTargets(button, FINAL_COINS, FINAL_RING),
          );
          return;
        }
        const t = k / (RINGS - 1);
        playExplosion();
        playSwoosh();
        shakeScreen(lerp(SLAM_SHAKE, t));
        cover.launchFrom(
          button,
          ringTargets(button, Math.round(lerp(SLAM_COINS, t)), SLAM_RING),
        );
      }
    },
  },
  { label: "Implosion", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Implosion
export function forceImplosionEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
