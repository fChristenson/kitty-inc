// the "Splitter" event (explosion; cash): it covers its crit, whose click
// freezes the screen while a huge lit bomb wisp bounces out of the clicked
// floor's button and down the screen, then bursts into three smaller bombs
// that bounce away, each of which bursts into three more: every generation
// smaller but more of them, every burst a cluster of blasts, a bang, a
// shake and a spray of coins; the last generation all goes off in a
// ripple, and a river of cash slams into the total in a huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "splitter";
const REWARD = 4;
const EDGE = 60;
// per generation: bomb size, blast size, its shake, coins, bounces, how high
const BOMB = [0.75, 0.48, 0.3];
const FUSE = [24, 16, 11];
const BLAST = [280, 190, 135];
const SHAKE = [1.4, 1.0, 0.7];
const COINS = [36, 20, 12];
const HOPS = [3, 2, 1];
const HIGH = [130, 90, 60];
// the spread of each split, in shares of the screen's width and height
const SPREAD_X = [0, 0.28, 0.11];
const DROP_Y = [0.3, 0.22, 0.2];
const CLUSTER = 2;
const CLUSTER_REACH = 60;
const CLUSTER_BLAST = 100;
const COIN_REACH: [number, number] = [40, 150];
const RIVER_MS = 420;
const BANG_GAP_MS = 60;

interface Bomb {
  gen: number;
  from: Point;
  to: Point;
  leaves: number;
  blows: number;
  at: (ms: number) => Point;
}

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  coins: number;
}

export const forceSplitterEvent = registerWispEvent(
  KEY,
  "Splitter",
  () => CONFIG.splitterEvent.chance,
  (floor, context, area) => {
    const { flightMs, rippleMs, holdMs, mergeMs } = CONFIG.splitterEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const bombs: Bomb[] = [];
    const spawn = (gen: number, from: Point, to: Point, leaves: number) => {
      const lands = leaves + flightMs[gen];
      const hops = HOPS[gen];
      const high = HIGH[gen];
      const at: Point = { x: 0, y: 0 };
      const bomb: Bomb = {
        gen,
        from,
        to,
        leaves,
        blows: lands,
        // bouncing: each hop lower than the last
        at: (ms) => {
          const u = clamp01((ms - leaves) / (lands - leaves));
          const bounce = Math.abs(Math.sin(u * Math.PI * hops));
          at.x = lerp([from.x, to.x], u);
          at.y = lerp([from.y, to.y], u) - bounce * high * (1 - 0.6 * u);
          return at;
        },
      };
      bombs.push(bomb);
      return bomb;
    };
    const place = (x: number, y: number): Point => ({
      x: Math.min(area.right - EDGE, Math.max(area.left + EDGE, x)),
      y: Math.min(area.bottom - EDGE, Math.max(area.top + EDGE * 3, y)),
    });
    const first = spawn(
      0,
      button,
      place((area.left + area.right) / 2, area.top + height * DROP_Y[0]),
      0,
    );
    for (let a = 0; a < 3; a++) {
      const parent = spawn(
        1,
        first.to,
        place(
          first.to.x + (a - 1) * width * SPREAD_X[1],
          first.to.y + height * DROP_Y[1] * (a === 1 ? 1.3 : 1),
        ),
        first.blows,
      );
      for (let b = 0; b < 3; b++)
        spawn(
          2,
          parent.to,
          place(
            parent.to.x + (b - 1) * width * SPREAD_X[2],
            parent.to.y + height * DROP_Y[2] * (b === 1 ? 1.25 : 1),
          ),
          parent.blows,
        );
    }
    // the last generation waits for its slowest and goes off in a ripple
    const lastGen = bombs
      .filter((b) => b.gen === 2)
      .sort((a, b) => a.to.x - b.to.x);
    const landed = Math.max(...lastGen.map((b) => b.blows));
    lastGen.forEach((b, i) => (b.blows = landed + 60 + i * rippleMs));
    const blasts: Blast[] = [];
    for (const b of bombs) {
      blasts.push({
        at: b.to,
        ms: b.blows,
        size: BLAST[b.gen],
        shake: SHAKE[b.gen],
        coins: COINS[b.gen],
      });
      if (b.gen === 2) continue;
      for (let c = 0; c < CLUSTER; c++) {
        const a = (c / CLUSTER) * Math.PI * 2 + b.to.x;
        blasts.push({
          at: {
            x: b.to.x + Math.cos(a) * CLUSTER_REACH,
            y: b.to.y + Math.sin(a) * CLUSTER_REACH,
          },
          ms: b.blows + 50 + c * 35,
          size: CLUSTER_BLAST,
          shake: 0.6,
          coins: 0,
        });
      }
    }
    const rippled = lastGen[lastGen.length - 1].blows;
    const total = totalSpot(area);
    const pool: Point = {
      x: lastGen.reduce((s, b) => s + b.to.x, 0) / lastGen.length,
      y: lastGen.reduce((s, b) => s + b.to.y, 0) / lastGen.length,
    };
    const river = sampleLine(
      (u) => ({
        x: lerp([pool.x, total.x], u),
        y: lerp([pool.y, total.y], Math.sqrt(u)),
      }),
      30,
    );
    const flight: Pour = {
      coinsAlong: 640,
      width: 44,
      streamMs: RIVER_MS * 0.7,
      travelMs: RIVER_MS,
    };
    const endAt = rippled + RIVER_MS;
    const durationMs = Math.max(
      pourDurationMs(rippled, flight),
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
    const pouring = createBeats(
      [rippled],
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
          pouring.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > rippled + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (const b of bombs) {
            if (ms < b.leaves || ms >= b.blows) continue;
            drawLitFuse(
              ctx,
              b.at(ms),
              (ms - b.leaves) / (b.blows - b.leaves),
              FUSE[b.gen],
              now,
            );
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMB[b.gen],
              0.6,
              b.leaves,
              b.blows,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
