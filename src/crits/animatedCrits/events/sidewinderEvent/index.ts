// the "Sidewinder" event (wisp; cash): it covers its crit, whose click
// freezes the screen while a wisp shoots out of the clicked floor's button
// to the top of the screen and slithers down it like a sidewinder snake,
// sweeping across and back in tight S-loops row after row, every loop's
// flick a coin-spray, a bloop and a jolt, ever faster; at the bottom it
// strikes up into the total in a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { alongRoute } from "../../../../shared/curves";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { totalSpot } from "../../cashFlow";

const KEY = "sidewinder";
const REWARD = 4;
const ROWS = 4;
const WAVES = 3;
const WAVE = 60;
const EDGE = 90;
const TOP = 240;
const COINS = 8;
const WISP = 0.6;
const FLICK_SHAKE: [number, number] = [0.3, 0.9];

export const forceSidewinderEvent = registerWispEvent(
  KEY,
  "Sidewinder",
  () => CONFIG.sidewinderEvent.chance,
  (floor, context, area) => {
    const { slitherMs, strikeMs, holdMs, mergeMs } = CONFIG.sidewinderEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const y0 = area.top + TOP;
    const y1 = area.bottom - EDGE;
    // a crest of the snake's S at every half wave of every row
    const route: Point[] = [button];
    for (let r = 0; r < ROWS; r++) {
      const y = lerp([y0, y1], r / (ROWS - 1));
      const ltr = r % 2 === 0;
      for (let w = 0; w <= WAVES * 2; w++) {
        const u = w / (WAVES * 2);
        route.push({
          x: lerp(
            ltr
              ? [area.left + EDGE, area.right - EDGE]
              : [area.right - EDGE, area.left + EDGE],
            u,
          ),
          y: y + (w % 2 === 0 ? -WAVE : WAVE),
        });
      }
    }
    const crests = route.length - 1;
    // the slither speeds up: crest k at slitherMs * sqrt(k / crests)
    const crestAt = (k: number) => slitherMs * Math.sqrt(k / crests);
    const endAt = slitherMs + strikeMs;
    const last = route[route.length - 1];
    const snakeAt: Point = { x: 0, y: 0 };
    const snake = (ms: number): Point => {
      const t = Math.max(0, ms);
      if (t >= slitherMs) {
        const e = easeIn(clamp01((t - slitherMs) / strikeMs));
        snakeAt.x = lerp([last.x, total.x], e);
        snakeAt.y = lerp([last.y, total.y], e);
        return snakeAt;
      }
      return alongRoute(route, (t / slitherMs) ** 2, snakeAt);
    };
    const flicks = route.slice(1).map((at, k) => ({ at, ms: crestAt(k + 1) }));
    let lastPop = -Infinity;

    const flicking = createBeats(
      flicks,
      (f) => f.ms,
      (f, k) => {
        cover!.launchFrom(
          f.at,
          clampTargetsY(
            sprayTargets(f.at, COINS, [40, 160]),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive() || f.ms - lastPop < 50) return;
        lastPop = f.ms;
        playBloop();
        shakeScreen(lerp(FLICK_SHAKE, k / (flicks.length - 1)));
      },
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
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          flicking.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            snake,
            ms,
            now,
            WISP_SIZE * WISP,
            clamp01(ms / endAt),
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
