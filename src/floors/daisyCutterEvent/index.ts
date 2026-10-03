// the "Daisy Cutter" event (explosion; free upgrade levels): it covers its
// crit, whose click freezes the screen while a huge bomb wisp drops from the
// top of the screen among the income bars, its fuse spitting faster, and
// goes off in a colossal blast; its shockwave races outward in rings of
// blasts, and every bar it sweeps through erupts in a chain of blasts along
// its length, each a bang and a hard jolt, landing free levels; the last
// ring slams every bar. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../shared/explosion";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "daisyCutter";
const MAX_BARS = 5;
const RINGS = 4;
const RING_BLASTS = 8;
const COLOSSAL = 440;
const RING_BLAST = 110;
const BAR_BLAST = 160;
const CHAIN_MS = 45;
const BOMB = 0.9;
const FUSE = 26;
const SETTLE_MS = 200;
const BANG_GAP_MS = 60;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forceDaisyCutterEvent = registerWispEvent(
  KEY,
  "Daisy Cutter",
  () => CONFIG.daisyCutterEvent.chance,
  (floor, context, area) => {
    const { dropMs, waveMs, levelShare, holdMs, mergeMs } =
      CONFIG.daisyCutterEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const ground: Point = {
      x: (area.left + area.right) / 2,
      y: (bars[0].center.y + bars[bars.length - 1].center.y) / 2,
    };
    const sky: Point = { x: ground.x, y: area.top - 60 };
    const reach =
      Math.max(
        ...bars.map((b) =>
          Math.hypot(b.center.x - ground.x, b.center.y - ground.y),
        ),
      ) + 120;
    const blasts: Blast[] = [
      { at: ground, ms: dropMs, size: COLOSSAL, shake: 2.4 },
    ];
    for (let r = 1; r <= RINGS; r++)
      for (let i = 0; i < RING_BLASTS; i++) {
        const a = (i / RING_BLASTS) * Math.PI * 2 + r * 0.4;
        blasts.push({
          at: {
            x: ground.x + (Math.cos(a) * (reach * r)) / RINGS,
            y: ground.y + ((Math.sin(a) * (reach * r)) / RINGS) * 0.6,
          },
          ms: dropMs + (waveMs * r) / RINGS,
          size: RING_BLAST,
          shake: i === 0 ? 0.6 : 0,
        });
      }
    const hits = bars.map((bar) => {
      const ms =
        dropMs +
        waveMs *
          clamp01(
            Math.hypot(bar.center.x - ground.x, bar.center.y - ground.y) /
              reach,
          );
      [0.15, 0.5, 0.85].forEach((f, i) =>
        blasts.push({
          at: { x: bar.box.x + bar.box.width * f, y: bar.center.y },
          ms: ms + i * CHAIN_MS,
          size: BAR_BLAST,
          shake: 0.8 + 0.2 * i,
        }),
      );
      return { bar, ms };
    });
    const endAt = dropMs + waveMs + SETTLE_MS;
    const bombAt: Point = { x: 0, y: 0 };
    const bomb = (ms: number): Point => {
      const e = easeIn(clamp01(ms / dropMs));
      bombAt.x = sky.x;
      bombAt.y = lerp([sky.y, ground.y], e);
      return bombAt;
    };
    let lastBang = -Infinity;

    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (!cover?.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        if (b.shake > 0) shakeScreen(b.shake);
      },
    );
    const hitting = createBeats(
      hits,
      (h) => h.ms,
      (h) =>
        cover!.levels(h.bar, levelsFor(h.bar.floor, levelShare, 2), ground),
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          booming.tick(ms, now);
          hitting.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 900) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          if (ms >= dropMs) return;
          const at = bomb(ms);
          drawLitFuse(ctx, at, ms / dropMs, FUSE, now);
          drawWispBetween(ctx, bomb, ms, now, WISP_SIZE * BOMB, 0.5, 0, dropMs);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
