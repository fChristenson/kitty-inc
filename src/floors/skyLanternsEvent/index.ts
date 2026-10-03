// the "Sky Lanterns" event (mix; a free floor and cash): it covers its
// crit, whose click freezes the screen while wisps float up out of the
// clicked floor's button one after another like sky lanterns, each
// trailing a long dangling string of cash that sways beneath it; they
// drift up and gather round the building's locked floor, each arrival a
// glow, a bloop and a jolt, until the whole flock lifts together and the
// floor bursts open in a huge blast and shake, unlocked for free as the
// screen unfreezes. Pays floor income × floor number × REWARD, plus the
// floor
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { findRewardLocked } from "../eventRewards";
import { FLOOR_H, FLOOR_W } from "../constants";

const KEY = "skyLanterns";
const REWARD = 2;
const LANTERNS = 7;
const PER_STRING = 70;
const COIN = 0.45;
// a lantern drifts SWAY px side to side; its string hangs LINK px a coin
// below it, lagging LAG ms a coin behind
const SWAY = 26;
const LINK = 4;
const LAG = 6;
const INSET = 60;
const LANTERN = 0.55;
const ARRIVE_SHAKE: [number, number] = [0.4, 1];

export const forceSkyLanternsEvent = registerWispEvent(
  KEY,
  "Sky Lanterns",
  () => CONFIG.skyLanternsEvent.chance,
  (floor, context) => {
    const { gapsMs, floatMs, liftMs, holdMs, mergeMs } =
      CONFIG.skyLanternsEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const middle: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    let clock = 0;
    const lanterns = Array.from({ length: LANTERNS }, (_, k) => {
      const rises = clock;
      clock += lerp(gapsMs, k / (LANTERNS - 1));
      const spot: Point = {
        x: lerp([INSET, FLOOR_W - INSET], (k + 0.5) / LANTERNS),
        y: middle.y + (Math.random() - 0.5) * FLOOR_H * 0.4,
      };
      const phase = Math.random() * Math.PI * 2;
      return { rises, arrives: rises + floatMs, spot, phase };
    });
    const liftAt = lanterns[LANTERNS - 1].arrives + 120;
    const endAt = liftAt + liftMs;
    const lanternAt = (
      l: (typeof lanterns)[number],
      ms: number,
      into: Point,
    ): Point => {
      const u = smoothstep(clamp01((ms - l.rises) / floatMs));
      const sway = Math.sin(ms / 260 + l.phase) * SWAY * (1 - u * 0.6);
      // the flock lifts together at the end
      const lift =
        ms > liftAt ? smoothstep(clamp01((ms - liftAt) / liftMs)) * 40 : 0;
      into.x = lerp([button.x, l.spot.x], u) + sway;
      into.y = lerp([button.y, l.spot.y], u) - lift;
      return into;
    };
    const heads = lanterns.map((l) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number) => (ms < l.rises ? null : lanternAt(l, ms, at));
    });

    const paths: CoinPath[] = [];
    for (const l of lanterns) {
      for (let j = 0; j < PER_STRING; j++) {
        const at: Point = { x: 0, y: 0 };
        paths.push((f) => {
          const ms = f * endAt;
          if (ms < l.rises + j * LAG)
            return { x: button.x, y: button.y, scale: 0 };
          lanternAt(l, Math.min(ms, endAt) - j * LAG, at);
          return {
            x: at.x,
            y: at.y + 14 + j * LINK,
            scale: COIN * (1 - j / (PER_STRING * 2)),
          };
        });
      }
    }

    const arriving = createBeats(
      lanterns,
      (l) => l.arrives,
      (l, k) => {
        cover!.burst(l.spot, 0.35);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(ARRIVE_SHAKE, k / (LANTERNS - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(middle),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        tick: (ms, now) => {
          arriving.tick(ms, now);
          finale.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const head of heads)
            drawWispBetween(
              ctx,
              head,
              ms,
              now,
              WISP_SIZE * LANTERN,
              0.6,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
