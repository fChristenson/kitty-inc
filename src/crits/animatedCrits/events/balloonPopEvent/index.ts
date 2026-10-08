// the "Balloon Pop" event (wisp; cash): it covers its crit, whose click
// freezes the screen while wisp balloons float up from the bottom of it,
// bobbing and swelling bigger as they rise; a dart wisp shoots out of the
// clicked floor's button and zips from balloon to balloon, popping each in
// a flash, a bang, a jolt and a ring of coins, ever faster; the last and
// fattest balloon goes off in a huge blast and shake. Pays floor income ×
// floor number × REWARD
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
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "balloonPop";
const REWARD = 4;
const BALLOONS = 7;
// balloons pop between POP_AT of the way down the screen, bobbing BOB px,
// swelling from SMALL to BIG of a wisp
const POP_AT: [number, number] = [0.15, 0.65];
const BOB = 14;
const SMALL = 0.5;
const BIG = 1.3;
const DART = 0.35;
const POP_COINS = 14;
const POP_REACH: [number, number] = [30, 120];
const POP_SHAKE: [number, number] = [0.6, 1.4];

export const forceBalloonPopEvent = registerWispEvent(
  KEY,
  "Balloon Pop",
  () => CONFIG.balloonPopEvent.chance,
  (floor, context, area) => {
    const { floatMs, gapsMs, holdMs, mergeMs } = CONFIG.balloonPopEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const w = area.right - area.left;
    let clock: number = floatMs;
    const balloons = Array.from({ length: BALLOONS }, (_, k) => {
      const pops = clock;
      clock += lerp(gapsMs, k / (BALLOONS - 1));
      const x = area.left + w * (0.12 + 0.76 * ((k * 0.43 + 0.1) % 1));
      const born = Math.random() * floatMs * 0.4;
      // paced to be up at its height when the dart gets to it
      const height =
        area.top + (area.bottom - area.top) * lerp(POP_AT, Math.random());
      const speed = (area.bottom + 20 - height) / (pops - born);
      const at: Point = { x: 0, y: 0 };
      const posAt = (ms: number, into: Point): Point => {
        const t = Math.max(0, ms - born);
        into.x = x + Math.sin(t / 300 + k) * BOB;
        into.y = area.bottom + 20 - t * speed;
        return into;
      };
      return {
        pops,
        spot: posAt(pops, { x: 0, y: 0 }),
        size: (ms: number) =>
          lerp([SMALL, BIG], clamp01((ms - born) / pops)) *
          (1 + (k === BALLOONS - 1 ? 0.4 : 0)),
        at: (ms: number): Point | null =>
          ms < born || ms >= pops ? null : posAt(ms, at),
        born,
      };
    });
    const last = balloons[BALLOONS - 1];
    const endAt = last.pops;
    // the dart flies straight from pop to pop, each hop ending as it pops
    const dartAt: Point = { x: 0, y: 0 };
    const dart = (ms: number): Point | null => {
      if (ms > endAt) return null;
      let from: Point = button;
      let leaves = floatMs * 0.6;
      if (ms < leaves) return null;
      for (const b of balloons) {
        if (ms < b.pops) {
          const u = clamp01((ms - leaves) / (b.pops - leaves));
          dartAt.x = lerp([from.x, b.spot.x], u);
          dartAt.y = lerp([from.y, b.spot.y], u);
          return dartAt;
        }
        from = b.spot;
        leaves = b.pops;
      }
      return null;
    };

    const popping = createBeats(
      balloons,
      (b) => b.pops,
      (b, k) => {
        if (b === last) {
          cover!.blast(b.spot);
          return;
        }
        cover!.burst(b.spot, 0.5);
        cover!.launchFrom(b.spot, ringTargets(b.spot, POP_COINS, POP_REACH));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(POP_SHAKE, k / (BALLOONS - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => popping.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          for (const b of balloons)
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * b.size(ms),
              0.3,
              b.born,
              b.pops,
            );
          drawWispBetween(
            ctx,
            dart,
            ms,
            now,
            WISP_SIZE * DART,
            1,
            floatMs * 0.6,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
