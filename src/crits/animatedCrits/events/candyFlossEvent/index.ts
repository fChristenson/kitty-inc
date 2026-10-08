// the "Candy Floss" event (mix; cash): it covers its crit, whose click
// freezes the screen while a wisp whirls up off the clicked floor's button
// into the middle of the screen, spinning like a candy floss machine and
// flinging out threads of cash that loop round and round it, winding up a
// big fluffy cloud of cash that swells with every puff, each a whoosh and a
// jolt, ever faster; then the whole fluffy cloud is whisked up into the
// total in a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  between,
  clamp01,
  easeIn,
  easeOut,
  lerp,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "candyFloss";
const REWARD = 4;
const COINS = 1_300;
const COIN = 0.5;
// the cloud swells to CLOUD px round, its threads looping SPIN laps a second
// round tilted orbits squashed to TILT
const CLOUD: [number, number] = [50, 190];
const SPIN = 1.6;
const TILT: [number, number] = [0.25, 0.9];
// a thread flies out over FLING_MS, looping in from FLING times its orbit
const FLING_MS = 260;
const FLING = 1.8;
const PUFFS = 5;
const WHISK_SPREAD = 260;
const PUFF_SHAKE: [number, number] = [0.4, 1.2];

export const forceCandyFlossEvent = registerWispEvent(
  KEY,
  "Candy Floss",
  () => CONFIG.candyFlossEvent.chance,
  (floor, context, area) => {
    const { riseMs, spinMs, flightMs, holdMs, mergeMs } =
      CONFIG.candyFlossEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const hub: Point = {
      x: (area.left + area.right) / 2,
      y: lerp([area.top, area.bottom], 0.45),
    };
    const whiskAt = riseMs + spinMs;
    const endAt = whiskAt + WHISK_SPREAD + flightMs;
    const centre = (ms: number, into: Point): Point => {
      const u = easeOut(clamp01(ms / riseMs));
      into.x = lerp([button.x, hub.x], u);
      into.y = lerp([button.y, hub.y], u);
      return into;
    };

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      // spun out at `spun`, onto an orbit sized by how big the cloud is then
      const spun = riseMs + Math.random() * spinMs;
      const size =
        lerp(CLOUD, (spun - riseMs) / spinMs) * (0.5 + 0.5 * Math.random());
      const tilt = between(TILT);
      const turn = Math.random() * Math.PI;
      const phase = Math.random() * Math.PI * 2;
      const leaves = whiskAt + Math.random() * WHISK_SPREAD;
      const c: Point = { x: 0, y: 0 };
      const orbit = (ms: number, into: Point): Point => {
        const a = phase + (ms / 1000) * SPIN * Math.PI * 2;
        const fling =
          1 + (FLING - 1) * (1 - easeOut(clamp01((ms - spun) / FLING_MS)));
        const ox = Math.cos(a) * size * fling;
        const oy = Math.sin(a) * size * tilt * fling;
        centre(ms, c);
        into.x = c.x + ox * Math.cos(turn) - oy * Math.sin(turn);
        into.y = c.y + ox * Math.sin(turn) + oy * Math.cos(turn);
        return into;
      };
      const start = orbit(leaves, { x: 0, y: 0 });
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < spun) return { x: hub.x, y: hub.y, scale: 0 };
        if (ms < leaves) {
          orbit(ms, at);
          return { x: at.x, y: at.y, scale: COIN };
        }
        const total = cover?.total() ?? fallback;
        const u = easeIn(clamp01((ms - leaves) / flightMs));
        return {
          x: lerp([start.x, total.x], u),
          y: lerp([start.y, total.y], u),
          scale: COIN,
        };
      };
    });
    const spinnerAt: Point = { x: 0, y: 0 };
    const spinner = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      centre(ms, spinnerAt);
      if (ms > whiskAt) {
        const total = cover?.total() ?? fallback;
        const u = easeIn(clamp01((ms - whiskAt) / (endAt - whiskAt)));
        spinnerAt.x = lerp([hub.x, total.x], u);
        spinnerAt.y = lerp([hub.y, total.y], u);
      }
      return spinnerAt;
    };

    const puffs = Array.from(
      { length: PUFFS },
      (_, k) => riseMs + spinMs * ((k + 1) / (PUFFS + 1)) ** 0.8,
    );
    const puffing = createBeats(
      puffs,
      (ms) => ms,
      (_, k) => {
        cover!.burst(hub, 0.4 + 0.1 * k);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(PUFF_SHAKE, k / (PUFFS - 1)));
      },
    );
    const whisking = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          puffing.tick(ms, now);
          whisking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            spinner,
            ms,
            now,
            WISP_SIZE,
            clamp01(ms / whiskAt),
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
