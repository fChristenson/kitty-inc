// the "Wormhole" event: it covers its crit, whose click freezes the screen
// while the wisp bursts out of the clicked floor's button, darts a short way
// and blinks out into nothing, then bursts out somewhere else across the
// screen, again and again, ever faster: every emergence a flash, a pop, a
// jolt and coins flung out ahead of it. Its last jump lands it just under the
// total-income readout and it shoots up into it in a huge blast and shake,
// and the coins sweep into the total. Pays floor income × floor number ×
// REWARD (see ../moneyCover)
import { CONFIG } from "../../../../config";
import { playBloop } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  between,
  clamp01,
  easeOutCubic,
  lerp,
} from "../../../../shared/easing";
import { sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "wormhole";
const REWARD = 4;
// jumps before the last, each emerging at the farthest of PICKS random spots
// EDGE of the screen's width in from its edges, darting DASH of its width
const JUMPS = 8;
const PICKS = 3;
const EDGE = 0.15;
const DASH = 0.22;
// it swells in over GROW_IN of a dart and shrinks away over its last SHRINK
const GROW_IN = 0.2;
const SHRINK = 0.3;
// the last: emerging FINAL_BELOW of the screen's height under the total
const FINAL_BELOW = 0.3;
// the wisp, as a share of the screen's width
const WISP = 0.06;
// each emergence: a burst, a pop, a jolt and coins flung ahead
const EMERGE_BURST: [number, number] = [0.3, 0.6];
const VANISH_BURST = 0.15;
const EMERGE_SHAKE: [number, number] = [0.5, 1.5];
const EMERGE_COINS: [number, number] = [2, 4];
const FLING: [number, number] = [70, 210];
const FLING_SPAN = 1.2;

interface Jump {
  from: Point;
  heading: number;
  reach: number;
  at: number;
  ms: number;
}

export const forceWormholeEvent = registerWispEvent(
  KEY,
  "Wormhole",
  () => CONFIG.wormholeEvent.chance,
  (floor, context, area) => {
    const { jumpMs, finalMs, holdMs, mergeMs } = CONFIG.wormholeEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const size = Math.max(WISP_SIZE, width * WISP);
    const edge = width * EDGE;
    const spot = (): Point => ({
      x: between([area.left + edge, area.right - edge]),
      y: between([area.top + edge, area.bottom - edge]),
    });
    const farthest = (from: Point): Point => {
      let best = spot();
      for (let k = 1; k < PICKS; k++) {
        const next = spot();
        if (
          Math.hypot(next.x - from.x, next.y - from.y) >
          Math.hypot(best.x - from.x, best.y - from.y)
        )
          best = next;
      }
      return best;
    };

    const jumps: Jump[] = [];
    const middle = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    let from: Point = getButtonCenter(context.isGroundFloor);
    let at = 0;
    for (let k = 0; k < JUMPS; k++) {
      const ms = lerp(jumpMs, k / (JUMPS - 1));
      // darting roughly inward, so it stays on screen
      const heading =
        Math.atan2(middle.y - from.y, middle.x - from.x) + between([-0.9, 0.9]);
      jumps.push({ from, heading, reach: width * DASH, at, ms });
      at += ms;
      from = farthest(from);
    }
    const finalFrom = at;
    const blastAt = finalFrom + finalMs;

    const point = { x: 0, y: 0 };
    const jumpOf = (ms: number) => {
      for (const j of jumps) if (ms < j.at + j.ms) return j;
      return null;
    };
    const wispAt = (ms: number): Point | null => {
      if (ms < 0 || ms >= blastAt) return null;
      const j = jumpOf(ms);
      if (j) {
        const d = j.reach * easeOutCubic((ms - j.at) / j.ms);
        point.x = j.from.x + Math.cos(j.heading) * d;
        point.y = j.from.y + Math.sin(j.heading) * d;
        return point;
      }
      const total = cover?.total();
      if (!total) return null;
      // out under the total, shooting straight up into it
      const u = ((ms - finalFrom) / finalMs) ** 1.5;
      point.x = total.x;
      point.y = total.y + height * FINAL_BELOW * (1 - u);
      return point;
    };
    // swelling in as it emerges, shrinking to nothing as it blinks out
    const scaleAt = (ms: number) => {
      const j = jumpOf(ms);
      if (!j) return clamp01((ms - finalFrom) / (finalMs * GROW_IN));
      const u = (ms - j.at) / j.ms;
      return Math.min(clamp01(u / GROW_IN), clamp01((1 - u) / SHRINK));
    };

    const emerges = createBeats(
      [...jumps.map((j) => j.at), finalFrom],
      (ms) => ms,
      (_, k) => emerged(k),
    );
    const vanishes = createBeats(
      jumps,
      (j) => j.at + j.ms - 1,
      (j) =>
        cover!.burst(
          {
            x: j.from.x + Math.cos(j.heading) * j.reach,
            y: j.from.y + Math.sin(j.heading) * j.reach,
          },
          VANISH_BURST,
        ),
    );
    const finale = createBeats(
      [blastAt],
      (ms) => ms,
      () => {
        const total = cover!.total();
        if (total) cover!.blast(total);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: blastAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          emerges.tick(ms, now);
          vanishes.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / blastAt);
          drawWispBetween(
            ctx,
            wispAt,
            ms,
            now,
            size * scaleAt(ms),
            heat,
            0,
            blastAt,
          );
        },
      },
    );
    if (!cover) return;

    function emerged(k: number): void {
      const t = k / JUMPS;
      const j = jumps[k];
      const total = cover!.total();
      const at = j
        ? j.from
        : total && { x: total.x, y: total.y + height * FINAL_BELOW };
      if (!at) return;
      cover!.burst(at, lerp(EMERGE_BURST, t));
      cover!.launchFrom(
        at,
        sprayTargets(
          at,
          Math.round(lerp(EMERGE_COINS, t)),
          FLING,
          j ? j.heading : -Math.PI / 2,
          FLING_SPAN,
        ),
      );
      if (!cover!.isLive()) return;
      playBloop();
      shakeScreen(lerp(EMERGE_SHAKE, t));
    }
  },
);
