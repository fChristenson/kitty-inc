// the "Bunker Buster" event (explosion; free upgrade levels and cash): it
// covers its crit, whose click freezes the screen while a heavy bomb wisp
// screams down out of the sky, fuse blazing, and punches straight down
// through every income bar in its path, each one bursting with a bang and a
// jolt that lands free levels; it buries itself in the bottom of the screen,
// fizzes for a heartbeat, then blows in a huge blast and shake that hurls
// cash everywhere. Pays floor income × floor number × REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../../../shared/explosion";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "bunkerBuster";
const REWARD = 2;
const MAX_BARS = 5;
const SKY = 120;
const BOMB = 1;
const FUSE = 40;
const PUNCH = 110;
const BLAST = 360;
const PUNCH_SHAKE: [number, number] = [0.8, 1.6];

export const forceBunkerBusterEvent = registerWispEvent(
  KEY,
  "Bunker Buster",
  () => CONFIG.bunkerBusterEvent.chance,
  (floor, context, area) => {
    const { fallMs, buriedMs, levelShare, holdMs, mergeMs } =
      CONFIG.bunkerBusterEvent;
    const found = findRewardBars(floor, context);
    const bars = context.upgradeFloorFree ? found.slice(0, MAX_BARS) : [];
    const x = found.length
      ? found[0].box.x + found[0].box.width * (0.3 + 0.4 * Math.random())
      : (area.left + area.right) / 2;
    const from = area.top - SKY;
    const to = area.bottom - 50;
    const fallY = (ms: number) =>
      lerp([from, to], easeIn(clamp01(ms / fallMs)));
    const boomAt = fallMs + buriedMs;
    const endAt = boomAt;
    // it reaches y when easeIn(ms / fallMs) reaches its share
    const punches = bars
      .map((bar) => ({
        bar,
        at: fallMs * Math.sqrt(clamp01((bar.center.y - from) / (to - from))),
        hit: { x, y: bar.center.y },
      }))
      .sort((a, b) => a.at - b.at);
    const ground: Point = { x, y: to };
    const bombAt: Point = { x, y: 0 };
    const bomb = (ms: number): Point | null => {
      if (ms < 0 || ms >= boomAt) return null;
      bombAt.y = fallY(ms);
      return bombAt;
    };

    const punching = createBeats(
      punches,
      (p) => p.at,
      (p, k) => {
        const t = k / Math.max(1, punches.length - 1);
        cover!.levels(p.bar, levelsFor(p.bar.floor, levelShare, 2), {
          x,
          y: from,
        });
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PUNCH_SHAKE, t));
      },
    );
    const landing = createBeats(
      [fallMs],
      (ms) => ms,
      () => {
        if (cover?.isLive()) shakeScreen(1.2);
      },
    );
    const booming = createBeats(
      [boomAt],
      (ms) => ms,
      () => cover!.blast(ground),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          punching.tick(ms, now);
          landing.tick(ms, now);
          booming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > boomAt + DETONATION_MS) return;
          if (ms < boomAt)
            drawLitFuse(
              ctx,
              bomb(ms) ?? ground,
              clamp01(ms / boomAt),
              FUSE,
              now,
            );
          drawWispBetween(
            ctx,
            bomb,
            ms,
            now,
            WISP_SIZE * BOMB,
            clamp01(ms / boomAt),
            0,
            boomAt,
          );
          for (const p of punches)
            drawDetonation(ctx, p.hit, ms - p.at, PUNCH, now);
          drawDetonation(ctx, ground, ms - boomAt, BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
