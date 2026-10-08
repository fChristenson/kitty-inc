// the "Parting" event (money; cash): it covers its crit, whose click freezes
// the screen while a sea of cash floods up over the bottom of the screen,
// sloshing; a wisp plunges into its middle and the sea parts down the
// middle into two towering walls of cash, which stand trembling as the
// screen rumbles, then crash back together in a huge blast and spout a
// geyser of cash up into the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { drawDetonation } from "../../../../shared/explosion";
import { totalSpot } from "../../cashFlow";

const KEY = "parting";
const REWARD = 4;
const COINS = 900;
const COIN = 0.42;
const MARGIN = 30;
// the sea's share of the screen, half its channel, and how much taller than
// the sea the walls stand at their faces
const DEPTH = 0.24;
const GAP = 70;
const TOWER = 2.4;
// where the walls crash, as a share of how far they'd parted
const CRASH_SPREAD = 0.12;
const WAVE = 14;
const TREMBLE = 4;
const PLUNGE_MS = 280;
const CRASH_BLAST = 440;
const RUMBLE_MS = 90;
const PLUNGE_SHAKE = 0.9;
const RUMBLE_SHAKE = 0.3;
const CRASH_SHAKE = 2.1;

export const forcePartingEvent = registerWispEvent(
  KEY,
  "Parting",
  () => CONFIG.partingEvent.chance,
  (floor, context, area) => {
    const {
      floodMs,
      partMs,
      standMs,
      crashMs,
      spoutMs,
      leapMs,
      holdMs,
      mergeMs,
    } = CONFIG.partingEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const mid = (area.left + area.right) / 2;
    const half = width / 2 - MARGIN;
    const bottom = area.bottom - MARGIN;
    const depth = height * DEPTH;
    const seaTop = bottom - depth;
    const peak = bottom - depth * (1 + TOWER);
    const total = totalSpot(area);
    const partAt = floodMs;
    const crashAt = partAt + partMs + standMs;
    const crashed = crashAt + crashMs;
    const travel = crashed + spoutMs + leapMs;
    const crash: Point = { x: mid, y: bottom - depth };

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const x = mid + (Math.random() * 2 - 1) * half;
      const y = seaTop + Math.random() * depth;
      const side = x < mid ? -1 : 1;
      const d = Math.abs(x - mid) / half;
      // the lower the coin, the sooner it floods in
      const riseAt = floodMs * 0.45 * (1 - (y - seaTop) / depth);
      const wallX = mid + side * (GAP + (half - GAP) * d);
      const wallY = bottom - (bottom - y) * (1 + TOWER * (1 - d) ** 2);
      const crashX = mid + side * (GAP + (half - GAP) * d) * CRASH_SPREAD;
      const leaves =
        crashed + spoutMs * clamp01((wallY - peak) / (bottom - peak));
      const from: Point = { x: 0, y: 0 };
      const rise: Point = { x: mid, y: 0 };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * travel;
        const wave = WAVE * Math.sin(x * 0.018 + ms * 0.009);
        if (ms < partAt) {
          const u = easeOut(clamp01((ms - riseAt) / (floodMs * 0.55)));
          return { x, y: lerp([area.bottom + 40, y + wave], u), scale: COIN };
        }
        if (ms < crashAt) {
          const u = smoothstep(
            clamp01((ms - partAt - d * partMs * 0.25) / (partMs * 0.75)),
          );
          const tremble = ms > partAt + partMs ? TREMBLE * (1 - d) : 0;
          return {
            x: lerp([x, wallX], u) + side * Math.sin(ms * 0.06 + i) * tremble,
            y: lerp([y + wave * (1 - u), wallY], u),
            scale: COIN,
          };
        }
        if (ms < leaves) {
          const v = easeIn(clamp01((ms - crashAt) / crashMs));
          return { x: lerp([wallX, crashX], v), y: wallY, scale: COIN };
        }
        from.x = crashX;
        from.y = wallY;
        rise.y = Math.min(wallY, total.y) - 160;
        const p = bezier(
          from,
          rise,
          total,
          easeIn(clamp01((ms - leaves) / leapMs)),
          at,
        );
        return { x: p.x, y: p.y, scale: COIN };
      };
    });

    // a wisp plunges into the sea, sinks down the channel, then leads the geyser
    const sky: Point = { x: mid, y: area.top - 80 };
    const floorOf: Point = { x: mid, y: bottom - 30 };
    const wisp: Point = { x: mid, y: 0 };
    const wispAt = (ms: number): Point | null => {
      if (ms < partAt - PLUNGE_MS || ms > crashed + leapMs) return null;
      wisp.x = mid;
      if (ms < partAt) {
        wisp.y = lerp(
          [sky.y, seaTop],
          easeIn(clamp01((ms - partAt + PLUNGE_MS) / PLUNGE_MS)),
        );
        return wisp;
      }
      if (ms < crashed) {
        wisp.y = lerp(
          [seaTop, floorOf.y],
          smoothstep(clamp01((ms - partAt) / partMs)),
        );
        return wisp;
      }
      wisp.y = lerp(
        [floorOf.y, total.y],
        easeIn(clamp01((ms - crashed) / leapMs)),
      );
      wisp.x = lerp([mid, total.x], easeIn(clamp01((ms - crashed) / leapMs)));
      return wisp;
    };

    const rumbles: number[] = [];
    for (let ms = partAt + partMs; ms < crashAt; ms += RUMBLE_MS)
      rumbles.push(ms);
    const plunging = createBeats(
      [partAt],
      (ms) => ms,
      () => {
        cover!.burst({ x: mid, y: seaTop }, 0.8);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(PLUNGE_SHAKE);
      },
    );
    const rumbling = createBeats(
      rumbles,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        if (k === 0) playBloop();
        shakeScreen(RUMBLE_SHAKE * (1 + k / rumbles.length));
      },
    );
    const crashing = createBeats(
      [crashed],
      (ms) => ms,
      () => {
        cover!.burst(crash, 1.3);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(CRASH_SHAKE);
      },
    );
    const landing = createBeats(
      [travel],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          plunging.tick(ms, now);
          rumbling.tick(ms, now);
          crashing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > travel) return;
          drawWispBetween(
            ctx,
            wispAt,
            ms,
            now,
            WISP_SIZE,
            ms > partAt ? 1 : 0.6,
            partAt - PLUNGE_MS,
            crashed + leapMs,
          );
          drawDetonation(ctx, crash, ms - crashed, CRASH_BLAST, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
