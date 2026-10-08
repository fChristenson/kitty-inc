// the "Cascade" event (explosion; cash): it covers its crit, whose click
// freezes the screen while a row of lit bombs flies out of the clicked
// floor's button to the top of the screen and goes off in a chain across
// it; every blast drops a pair of bomblets that fall and burst lower down,
// and each pair drops one big bomb that falls to the bottom and blows, the
// explosions cascading down the screen tier by tier, each with its own bang,
// shake and spray of coins, the last tier going off in a rolling chain into
// a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "cascade";
const REWARD = 4;
const TOPS = 4;
const EDGE = 110;
const TOP = 190;
const SPLIT = 55;
const SETUP_MS = 280;
const BOMB = 0.35;
const BOMBLET = 0.25;
const FUSE = 14;
const TOP_BLAST = 170;
const PAIR_BLAST = 140;
const LOW_BLAST = 250;
const COINS = 10;
const COIN_REACH: [number, number] = [30, 120];
const BANG_GAP_MS = 60;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forceCascadeEvent = registerWispEvent(
  KEY,
  "Cascade",
  () => CONFIG.cascadeEvent.chance,
  (floor, context, area) => {
    const { chainMs, fallMs, holdMs, mergeMs } = CONFIG.cascadeEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const top = area.top + TOP;
    const h = area.bottom - EDGE - top;
    const blasts: Blast[] = [];
    const bombs: {
      at: (ms: number) => Point;
      shows: number;
      blows: number;
      size: number;
    }[] = [];
    const flyIn = (spot: Point, blows: number) => {
      const at: Point = { x: 0, y: 0 };
      bombs.push({
        shows: 0,
        blows,
        size: BOMB,
        at: (ms: number): Point => {
          const u = easeOut(clamp01(ms / SETUP_MS));
          at.x = lerp([button.x, spot.x], u);
          at.y = lerp([button.y, spot.y], u);
          return at;
        },
      });
    };
    const drop = (from: Point, to: Point, leaves: number, size: number) => {
      const at: Point = { x: 0, y: 0 };
      const blows = leaves + fallMs;
      bombs.push({
        shows: leaves,
        blows,
        size,
        at: (ms: number): Point => {
          const u = clamp01((ms - leaves) / fallMs);
          at.x = lerp([from.x, to.x], easeOut(u));
          at.y = lerp([from.y, to.y], easeIn(u));
          return at;
        },
      });
      return blows;
    };
    let endAt = 0;
    for (let i = 0; i < TOPS; i++) {
      const spot: Point = {
        x: lerp([area.left + EDGE, area.right - EDGE], i / (TOPS - 1)),
        y: top,
      };
      const blows = SETUP_MS + i * chainMs;
      flyIn(spot, blows);
      blasts.push({ at: spot, ms: blows, size: TOP_BLAST, shake: 0.6 });
      // the pair it drops, bursting together a tier down
      const pair = [-1, 1].map((side) => {
        const to: Point = { x: spot.x + side * SPLIT, y: top + h * 0.45 };
        const pops = drop(spot, to, blows, BOMBLET);
        blasts.push({ at: to, ms: pops, size: PAIR_BLAST, shake: 0.9 });
        return { to, pops };
      });
      // which drops one big bomb to the bottom
      const low: Point = { x: spot.x, y: top + h };
      const lows = drop(
        { x: spot.x, y: pair[0].to.y },
        low,
        pair[0].pops,
        BOMB,
      );
      blasts.push({ at: low, ms: lows, size: LOW_BLAST, shake: 1.3 });
      endAt = Math.max(endAt, lows);
    }
    const bottomMiddle: Point = { x: (area.left + area.right) / 2, y: top + h };
    let lastBang = -Infinity;

    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
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
      () => cover!.blast(bottomMiddle),
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
          for (const b of bombs) {
            if (ms < b.shows || ms >= b.blows) continue;
            drawLitFuse(
              ctx,
              b.at(ms),
              (ms - b.shows) / (b.blows - b.shows),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * b.size,
              0.5,
              b.shows,
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
