// the "Daisy Chain" event (explosion; a free floor): it covers its crit, whose
// click freezes the screen while a string of bomb wisps scatters out of the
// clicked floor's button round the edges of the screen, fuses all fizzing;
// the first one goes off and the blasts roll round the screen's edge from
// bomb to bomb in a chain, each a white blast, a bang and a jolt, ever
// faster, the last leaping into the building's locked floor in a huge blast
// and shake; the floor bursts open, unlocked for free, as the screen
// unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../shared/explosion";
import { measure, pointAlong } from "../cashFlow";
import { findRewardLocked } from "../eventRewards";
import { FLOOR_H, FLOOR_W } from "../constants";

const KEY = "daisyChain";
const BOMBS = 12;
const EDGE = 40;
const TOP = 170;
const BOMB = 0.34;
const FUSE = 18;
const BLAST = 130;
const CHAIN_SHAKE: [number, number] = [0.3, 1.2];

export const forceDaisyChainEvent = registerWispEvent(
  KEY,
  "Daisy Chain",
  () => CONFIG.daisyChainEvent.chance,
  (floor, context, area) => {
    const { scatterMs, chainMs, leapMs, holdMs, mergeMs } =
      CONFIG.daisyChainEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const door: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const top = area.top + TOP;
    const bottom = area.bottom - EDGE;
    const rim: Point[] = [
      { x: left, y: bottom },
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
    ];
    const along = measure(rim);
    let clock: number = scatterMs;
    const bombs = Array.from({ length: BOMBS }, (_, k) => {
      const spot = pointAlong(rim, along, k / (BOMBS - 1), { x: 0, y: 0 });
      const blows = clock;
      clock += lerp(chainMs, k / (BOMBS - 1)) / BOMBS;
      const at: Point = { x: 0, y: 0 };
      return {
        spot,
        blows,
        at: (ms: number): Point | null => {
          if (ms >= blows) return null;
          const u = easeOut(clamp01(ms / scatterMs));
          at.x = lerp([button.x, spot.x], u);
          at.y = lerp([button.y, spot.y], u);
          return at;
        },
      };
    });
    const leapFrom = bombs[BOMBS - 1].spot;
    const leapAt = bombs[BOMBS - 1].blows;
    const endAt = leapAt + leapMs;
    const leapPoint: Point = { x: 0, y: 0 };
    const leaper = (ms: number): Point | null => {
      if (ms < leapAt || ms >= endAt) return null;
      const u = (ms - leapAt) / leapMs;
      leapPoint.x = lerp([leapFrom.x, door.x], u);
      leapPoint.y = lerp([leapFrom.y, door.y], u) - Math.sin(Math.PI * u) * 120;
      return leapPoint;
    };

    const chaining = createBeats(
      bombs,
      (b) => b.blows,
      (_, k) => {
        if (!cover?.isLive()) return;
        if (k % 2 === 0) playExplosion();
        shakeScreen(lerp(CHAIN_SHAKE, k / (BOMBS - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(door),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          chaining.tick(ms, now);
          finale.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          for (const b of bombs) {
            drawDetonation(ctx, b.spot, ms - b.blows, BLAST, now);
            const p = b.at(ms);
            if (p) drawLitFuse(ctx, p, clamp01(ms / b.blows), FUSE, now);
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.5,
              0,
              b.blows,
            );
          }
          drawWispBetween(
            ctx,
            leaper,
            ms,
            now,
            WISP_SIZE * BOMB * 1.4,
            1,
            leapAt,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
