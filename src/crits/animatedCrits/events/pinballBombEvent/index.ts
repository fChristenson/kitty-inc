// the "Pinball Bomb" event (explosion; crit tiers): it covers its crit,
// whose click freezes the screen while a lit bomb wisp is fired out of the
// clicked floor's button and caroms round the screen like a pinball: every
// time it banks off a wall it blows a blast there, a chain of bangs and
// shakes rattling from side to side, ever faster, until it slams into an
// income bar and bursts in a cluster of blasts all over it, the bar jumping
// a crit tier; out of the cluster it shoots off again for the next bar, the
// last cluster bursting round a huge blast and shake. Then the crit's tier
// pays out
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
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { findRewardBars } from "../../eventRewards";

const KEY = "pinballBomb";
const MAX_BARS = 3;
const BANKS = 2;
const EDGE = 50;
const TOP = 180;
const CLUSTER = 4;
const CLUSTER_REACH = 70;
const BOMB = 0.45;
const FUSE = 18;
const BANK_BLAST = 160;
const CLUSTER_BLAST = 130;
const BAR_BLAST = 220;
const FINALE_BLAST = 320;
const BANG_GAP_MS = 60;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forcePinballBombEvent = registerWispEvent(
  KEY,
  "Pinball Bomb",
  () => CONFIG.pinballBombEvent.chance,
  (floor, context, area) => {
    const { speed, speedUp, holdMs, mergeMs } = CONFIG.pinballBombEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const top = area.top + TOP;
    const bottom = area.bottom - EDGE;
    // the route: off BANKS walls (alternating sides) and into each bar
    const route: Point[] = [button];
    const times: number[] = [0];
    const blasts: Blast[] = [];
    const hits: { bar: (typeof bars)[number]; ms: number }[] = [];
    let pace: number = speed;
    let side = button.x < (left + right) / 2 ? 1 : -1;
    const go = (to: Point) => {
      const from = route[route.length - 1];
      route.push(to);
      times.push(
        times[times.length - 1] +
          Math.hypot(to.x - from.x, to.y - from.y) / pace,
      );
      pace *= speedUp;
      return times[times.length - 1];
    };
    bars.forEach((bar, k) => {
      for (let b = 0; b < BANKS; b++) {
        const wall: Point = {
          x: side > 0 ? right : left,
          y: lerp([top, bottom], Math.random()),
        };
        side = -side;
        const ms = go(wall);
        blasts.push({
          at: wall,
          ms,
          size: BANK_BLAST,
          shake: 0.6 + 0.1 * (k * BANKS + b),
        });
      }
      const ms = go(bar.center);
      hits.push({ bar, ms });
      blasts.push({ at: bar.center, ms, size: BAR_BLAST, shake: 1.2 });
      for (let c = 0; c < CLUSTER; c++) {
        const a = (c / CLUSTER) * Math.PI * 2 + k;
        blasts.push({
          at: {
            x: bar.center.x + Math.cos(a) * CLUSTER_REACH * 1.4,
            y: bar.center.y + Math.sin(a) * CLUSTER_REACH * 0.6,
          },
          ms: ms + 50 + c * 30,
          size: CLUSTER_BLAST,
          shake: 0.9,
        });
      }
    });
    const last = hits[hits.length - 1];
    const endAt = last.ms;
    const bombAt: Point = { x: 0, y: 0 };
    const bomb = (ms: number): Point => {
      let i = 1;
      while (i < times.length - 1 && ms > times[i]) i++;
      const u = clamp01((ms - times[i - 1]) / (times[i] - times[i - 1]));
      bombAt.x = lerp([route[i - 1].x, route[i].x], u);
      bombAt.y = lerp([route[i - 1].y, route[i].y], u);
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
        shakeScreen(b.shake);
      },
    );
    const hitting = createBeats(
      hits,
      (h) => h.ms,
      (h) => {
        cover!.tierUp(h.bar);
        if (h !== last) return;
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(h.bar.center);
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
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          drawDetonation(ctx, last.bar.center, ms - endAt, FINALE_BLAST, now);
          if (ms >= endAt) return;
          drawLitFuse(ctx, bomb(ms), ms / endAt, FUSE, now);
          drawWispBetween(
            ctx,
            bomb,
            ms,
            now,
            WISP_SIZE * BOMB,
            0.5 + 0.5 * (ms / endAt),
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
