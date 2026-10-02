// the "Lineup" event: it covers its crit, whose click freezes the screen
// while wisps pop up one after another all over it, then snap into a dead
// straight row across its middle with a flash and a jolt and hang there
// trembling as the screen rumbles; then from one end to the other they fire
// up into the total-income readout one by one, ever faster, each hit a flash,
// a pop and coins bursting out of it, the last a huge blast and shake, and
// the coins sweep into the total. Pays floor income × floor number × REWARD
// (see ../moneyCover)
import { CONFIG } from "../../config";
import { playBloop, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import {
  between,
  clamp01,
  easeIn,
  easeOutBack,
  lerp,
} from "../../shared/easing";
import { ringTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";

const KEY = "lineup";
const REWARD = 4;
const WISPS = 9;
// popping up POP_GAP_MS apart, EDGE of the screen's width in from its edges;
// the row ROW_DROP of its height below its middle
const POP_GAP_MS = 45;
const POP_MS = 140;
const EDGE = 0.1;
const ROW_DROP = 0.05;
// trembling TREMBLE of a wisp's size while the screen rumbles
const TREMBLE = 0.15;
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.3, 0.8];
// the wisps, as a share of the screen's width
const WISP = 0.05;
// lining up: a burst on every wisp and a jolt
const ROW_BURST = 0.25;
const ROW_SHAKE = 1.2;
// each hit in the total: a burst and a few coins
const HIT_BURST: [number, number] = [0.3, 0.6];
const HIT_COINS = 3;
const HIT_RING: [number, number] = [60, 180];

export const forceLineupEvent = registerWispEvent(
  KEY,
  "Lineup",
  () => CONFIG.lineupEvent.chance,
  (floor, context, area) => {
    const { alignMs, trembleMs, fireMs, flyMs, holdMs, mergeMs } =
      CONFIG.lineupEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const size = Math.max(WISP_SIZE, width * WISP);
    const edge = width * EDGE;
    const rowY = (area.top + area.bottom) / 2 + height * ROW_DROP;
    const fromLeft = Math.random() < 0.5;
    const scattered: Point[] = Array.from({ length: WISPS }, () => ({
      x: between([area.left + edge, area.right - edge]),
      y: between([area.top + edge, area.bottom - edge]),
    }));
    const row: Point[] = Array.from({ length: WISPS }, (_, i) => ({
      x: lerp([area.left + edge, area.right - edge], i / (WISPS - 1)),
      y: rowY,
    }));
    const alignFrom = POP_GAP_MS * WISPS;
    const linedAt = alignFrom + alignMs;
    const fireFrom = linedAt + trembleMs;
    // the order they fire in, from one end
    const order = Array.from({ length: WISPS }, (_, i) =>
      fromLeft ? i : WISPS - 1 - i,
    );
    const firedAt: number[] = new Array(WISPS);
    let at = fireFrom;
    order.forEach((i, n) => {
      firedAt[i] = at;
      at += lerp(fireMs, n / (WISPS - 1));
    });
    const lastHit = firedAt[order[WISPS - 1]] + flyMs;

    const paths = Array.from({ length: WISPS }, (_, i) => {
      const point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        const popAt = i * POP_GAP_MS;
        if (ms < popAt || ms >= firedAt[i] + flyMs) return null;
        if (ms < alignFrom) return scattered[i];
        if (ms < linedAt) {
          const u = easeOutBack((ms - alignFrom) / alignMs);
          point.x = scattered[i].x + (row[i].x - scattered[i].x) * u;
          point.y = scattered[i].y + (row[i].y - scattered[i].y) * u;
          return point;
        }
        if (ms < firedAt[i]) {
          const shake =
            ms < fireFrom ? TREMBLE * size * ((ms - linedAt) / trembleMs) : TREMBLE * size;
          point.x = row[i].x + Math.sin(ms * 0.13 + i) * shake;
          point.y = row[i].y + Math.cos(ms * 0.11 + i * 2) * shake;
          return point;
        }
        const total = cover?.total();
        if (!total) return null;
        const u = easeIn((ms - firedAt[i]) / flyMs);
        point.x = row[i].x + (total.x - row[i].x) * u;
        point.y = row[i].y + (total.y - row[i].y) * u;
        return point;
      };
    });

    let lastRumble = -Infinity;
    const pops = createBeats(
      scattered,
      (_, i) => i * POP_GAP_MS,
      () => cover!.isLive() && playBloop(),
    );
    const lined = createBeats([linedAt], (ms) => ms, () => linedUp());
    const fires = createBeats(
      order,
      (i) => firedAt[i],
      () => cover!.isLive() && playSwoosh(),
    );
    const hits = createBeats(
      order,
      (i) => firedAt[i] + flyMs,
      (_, n) => hit(n),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: lastHit + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          pops.tick(ms, now);
          lined.tick(ms, now);
          fires.tick(ms, now);
          hits.tick(ms, now);
          if (ms >= linedAt && ms < lastHit && now - lastRumble >= RUMBLE_MS) {
            lastRumble = now;
            shakeScreen(lerp(RUMBLE, clamp01((ms - linedAt) / (lastHit - linedAt))));
          }
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / lastHit);
          paths.forEach((path, i) =>
            drawWispBetween(
              ctx,
              path,
              ms,
              now,
              size * easeOutBack(clamp01((ms - i * POP_GAP_MS) / POP_MS)),
              heat,
              i * POP_GAP_MS,
              firedAt[i] + flyMs,
            ),
          );
        },
      },
    );
    if (!cover) return;

    function linedUp(): void {
      for (const p of row) cover!.burst(p, ROW_BURST);
      if (!cover!.isLive()) return;
      playExplosion();
      shakeScreen(ROW_SHAKE);
    }
    function hit(n: number): void {
      const total = cover!.total();
      if (!total) return;
      if (n === WISPS - 1) {
        cover!.blast(total);
        return;
      }
      cover!.burst(total, lerp(HIT_BURST, n / (WISPS - 2)));
      cover!.launchFrom(total, ringTargets(total, HIT_COINS, HIT_RING));
      if (!cover!.isLive()) return;
      playBloop();
    }
  },
);
