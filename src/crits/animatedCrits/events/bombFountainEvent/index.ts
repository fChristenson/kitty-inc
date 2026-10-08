// the "Bomb Fountain" event (explosion; cash): it covers its crit, whose
// click freezes the screen while the clicked floor's button erupts like a
// fountain of lit bomb wisps, arcing up and raining down all over the
// screen; they go off where they land in a rolling chain, each a white
// blast, a bang, its own shake and a spray of coins, and every third bursts
// into a cluster of smaller blasts round it; the last and biggest lands in
// the middle and goes off in a ring of blasts round one huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "bombFountain";
const REWARD = 4;
const BOMBS = 12;
const EDGE = 60;
const TOP = 170;
const HIGH = 260;
// every CLUSTER-th bomb bursts into SPLITS more, SPLIT px round it
const CLUSTER = 3;
const SPLITS = 3;
const SPLIT = 70;
const SPLIT_MS = 70;
const FINALE_RING = 6;
const FINALE_REACH = 150;
const BOMB = 0.38;
const FUSE = 16;
const BLAST = 170;
const SMALL = 110;
const HUGE = 300;
const COINS = 8;
const COIN_REACH: [number, number] = [30, 110];
const BANG_GAP_MS = 60;
const LAND_SHAKE: [number, number] = [0.5, 1.2];
const CLUSTER_SHAKE = 1.1;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  coins: boolean;
}

export const forceBombFountainEvent = registerWispEvent(
  KEY,
  "Bomb Fountain",
  () => CONFIG.bombFountainEvent.chance,
  (floor, context, area) => {
    const { gapsMs, flightMs, holdMs, mergeMs } = CONFIG.bombFountainEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + 40,
    };
    const width = area.right - area.left - EDGE * 2;
    const blasts: Blast[] = [];
    let clock = 0;
    const bombs = Array.from({ length: BOMBS }, (_, k) => {
      const last = k === BOMBS - 1;
      const to: Point = last
        ? center
        : {
            x: area.left + EDGE + Math.random() * width,
            y:
              area.top +
              TOP +
              Math.random() * (area.bottom - area.top - TOP - EDGE),
          };
      const ctrl: Point = {
        x: (button.x + to.x) / 2,
        y: Math.min(button.y, to.y) - HIGH,
      };
      const leaves = clock;
      clock += lerp(gapsMs, k / (BOMBS - 1));
      const lands = leaves + flightMs;
      blasts.push({
        at: to,
        ms: lands,
        size: last ? BLAST * 1.3 : BLAST,
        shake: lerp(LAND_SHAKE, k / (BOMBS - 1)),
        coins: true,
      });
      const splits = last
        ? FINALE_RING
        : k % CLUSTER === CLUSTER - 1
          ? SPLITS
          : 0;
      const reach = last ? FINALE_REACH : SPLIT;
      for (let s = 0; s < splits; s++) {
        const a = (s / splits) * Math.PI * 2 + k;
        blasts.push({
          at: {
            x: to.x + Math.cos(a) * reach,
            y: to.y + Math.sin(a) * reach * 0.8,
          },
          ms: lands + SPLIT_MS * (last ? 1 : s + 1),
          size: SMALL,
          shake: CLUSTER_SHAKE,
          coins: true,
        });
      }
      const at: Point = { x: 0, y: 0 };
      return {
        leaves,
        lands,
        at: (ms: number): Point =>
          bezier(button, ctrl, to, clamp01((ms - leaves) / flightMs), at),
      };
    });
    const endAt = Math.max(...blasts.map((b) => b.ms)) + 80;
    let lastBang = -Infinity;

    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (b.coins)
          cover!.launchFrom(b.at, ringTargets(b.at, COINS, COIN_REACH));
        if (!cover!.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(center),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          booming.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          drawDetonation(ctx, center, ms - endAt, HUGE, now);
          for (const b of bombs) {
            if (ms < b.leaves || ms >= b.lands) continue;
            drawLitFuse(
              ctx,
              b.at(ms),
              clamp01((ms - b.leaves) / flightMs),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.6,
              b.leaves,
              b.lands,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
