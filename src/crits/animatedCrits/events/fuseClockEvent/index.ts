// the "Fuse Clock" event (explosion; cash): it covers its crit, whose click
// freezes the screen while twelve lit bomb wisps appear round a great clock
// face in the middle of the screen, one at every hour; a spark wisp races
// round the dial like a second hand on a hand of glitter, faster every
// hour, and each bomb it reaches goes off in a big blast bursting into a
// cluster, a tick, a bang and a jolt, spraying coins; on the last hour the
// centre goes up in a colossal blast with the biggest shake and a river of
// cash slams into the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { stampGlimmer } from "../../../../shared/twinkle";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "fuseClock";
const REWARD = 4;
const HOURS = 12;
const SIZE = 0.34;
const POP_MS = 160;
const HAND_DOTS = 7;
const HAND_SPARK = 10;
const CLUSTER_REACH = 55;
const CORE_RING = 8;
const BOMB = 0.36;
const SPARK = 0.45;
const FUSE = 14;
const BLAST = 170;
const CLUSTER_BLAST = 95;
const COLOSSAL = 480;
const CORE_BLAST = 160;
const COINS = 16;
const CORE_COINS = 40;
const COIN_REACH: [number, number] = [40, 140];
const CORE_DELAY_MS = 120;
const RIVER_MS = 420;
const EDGE = 50;
const HOUR_SHAKE: [number, number] = [0.6, 1.3];
const BANG_GAP_MS = 60;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  coins: number;
}

export const forceFuseClockEvent = registerWispEvent(
  KEY,
  "Fuse Clock",
  () => CONFIG.fuseClockEvent.chance,
  (floor, context, area) => {
    const { hoursMs, holdMs, mergeMs } = CONFIG.fuseClockEvent;
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + 40,
    };
    const radius =
      Math.min(area.right - area.left, area.bottom - area.top) * SIZE;
    const angleOf = (hour: number) =>
      -Math.PI / 2 + (hour / HOURS) * Math.PI * 2;
    const reaches: number[] = [0];
    for (let h = 1; h <= HOURS; h++)
      reaches.push(reaches[h - 1] + lerp(hoursMs, (h - 1) / (HOURS - 1)));
    const blasts: Blast[] = [];
    const bombs = Array.from({ length: HOURS }, (_, i) => {
      const hour = i + 1;
      const a = angleOf(hour);
      const spot: Point = {
        x: center.x + Math.cos(a) * radius,
        y: center.y + Math.sin(a) * radius,
      };
      const blows = reaches[hour];
      blasts.push({
        at: spot,
        ms: blows,
        size: BLAST,
        shake: lerp(HOUR_SHAKE, i / (HOURS - 1)),
        coins: COINS,
      });
      for (let c = -1; c <= 1; c += 2)
        blasts.push({
          at: {
            x: spot.x + Math.cos(a + c * 0.5) * CLUSTER_REACH,
            y: spot.y + Math.sin(a + c * 0.5) * CLUSTER_REACH,
          },
          ms: blows + 50 + (c + 1) * 15,
          size: CLUSTER_BLAST,
          shake: 0.5,
          coins: 0,
        });
      return { spot, blows, at: (): Point => spot };
    });
    const coreAt = reaches[HOURS] + CORE_DELAY_MS;
    blasts.push({
      at: center,
      ms: coreAt,
      size: COLOSSAL,
      shake: 3,
      coins: CORE_COINS,
    });
    for (let c = 0; c < CORE_RING; c++) {
      const a = (c / CORE_RING) * Math.PI * 2;
      blasts.push({
        at: {
          x: center.x + Math.cos(a) * radius * 0.5,
          y: center.y + Math.sin(a) * radius * 0.5,
        },
        ms: coreAt + 40 + c * 15,
        size: CORE_BLAST,
        shake: 0.8,
        coins: 0,
      });
    }
    const sparkAt: Point = { x: 0, y: 0 };
    const spark = (ms: number): Point => {
      const t = Math.max(0, ms);
      let h = 0;
      while (h < HOURS - 1 && t >= reaches[h + 1]) h++;
      const u = clamp01((t - reaches[h]) / (reaches[h + 1] - reaches[h]));
      const a = angleOf(h + easeOut(u));
      sparkAt.x = center.x + Math.cos(a) * radius;
      sparkAt.y = center.y + Math.sin(a) * radius;
      return sparkAt;
    };
    const total = totalSpot(area);
    const river = sampleLine(
      (u) => ({
        x: lerp([center.x, total.x], u),
        y: lerp([center.y, total.y], u),
      }),
      30,
    );
    const flight: Pour = {
      coinsAlong: 700,
      width: 56,
      streamMs: RIVER_MS * 0.7,
      travelMs: RIVER_MS,
    };
    const handEnd = reaches[HOURS];
    const endAt = coreAt + RIVER_MS;
    const durationMs = Math.max(
      pourDurationMs(coreAt, flight),
      endAt + holdMs + mergeMs,
    );
    let lastBang = -Infinity;

    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (b.coins > 0)
          cover!.launchFrom(
            b.at,
            clampTargetsY(
              ringTargets(b.at, b.coins, COIN_REACH),
              area.top + EDGE,
              area.bottom - EDGE,
            ),
          );
        if (!cover!.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );
    const ticking = createBeats(
      bombs,
      (b) => b.blows,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const pouring = createBeats(
      [coreAt],
      (ms) => ms,
      () => pourLine(cover!, river, flight),
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          booming.tick(ms, now);
          ticking.tick(ms, now);
          pouring.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > coreAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          const pop = easeOut(clamp01(ms / POP_MS));
          for (const b of bombs) {
            if (ms >= b.blows) continue;
            drawLitFuse(ctx, b.spot, ms / b.blows, FUSE * pop, now);
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMB * pop,
              0.5,
              0,
              b.blows,
            );
          }
          if (ms >= handEnd) return;
          // the hand: a line of glitter from the centre out to the spark
          const tip = spark(ms);
          const tx = tip.x;
          const ty = tip.y;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let d = 0; d < HAND_DOTS; d++) {
            const f = d / HAND_DOTS;
            stampGlimmer(
              ctx,
              lerp([center.x, tx], f),
              lerp([center.y, ty], f),
              HAND_SPARK * pop * (0.7 + 0.3 * Math.sin(now / 60 + d)),
              now / 200 + d,
              d % 2 === 0 ? COLOR.heavenlyGold : COLOR.white,
            );
          }
          ctx.restore();
          drawWispBetween(
            ctx,
            spark,
            ms,
            now,
            WISP_SIZE * SPARK,
            0.9,
            0,
            handEnd,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
