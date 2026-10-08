// the "Pogo" event (mix; cash and free upgrade levels): it covers its crit,
// whose click freezes the screen while a jet of cash spurts up out of the
// clicked floor's button under a wisp and launches it in a high hop onto an
// income bar; it pogos from bar to bar up the screen, ever faster, the jet of
// cash chasing it up every hop, each landing a squash, a boing, a flash and a
// jolt with free levels; the last hop launches it into the total, which goes
// off in a huge blast and shake. Pays floor income × floor number × REWARD,
// plus the levels
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "pogo";
const REWARD = 2;
const MAX_BARS = 5;
// each hop peaks HOP px over its higher end
const HOP = 230;
const RIDER = 1.1;
// squashed flat this much right as it lands, springing back in SQUASH_MS
const SQUASH = 0.45;
const SQUASH_MS = 140;
const LAND_SHAKE: [number, number] = [0.6, 1.5];
const LAND_BURST: [number, number] = [0.45, 0.8];

export const forcePogoEvent = registerWispEvent(
  KEY,
  "Pogo",
  () => CONFIG.pogoEvent.chance,
  (floor, context, area) => {
    const { hopsMs, levelShare, holdMs, mergeMs } = CONFIG.pogoEvent;
    const fallback = totalSpot(area);
    // bottom first, so it pogos up the screen
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS).reverse();
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const first = Math.random() < 0.5 ? 0.25 : 0.75;
    const spots: Point[] = bars.map((bar, k) => ({
      x: bar.box.x + bar.box.width * (k % 2 === 0 ? first : 1 - first),
      y: bar.box.y - 6,
    }));
    const stops = [button, ...spots, fallback];
    // one arc per hop, each launched as the last lands
    const hops: { line: Point[]; start: number; ms: number; pour: Pour }[] = [];
    let clock = 0;
    for (let k = 0; k + 1 < stops.length; k++) {
      const from = stops[k];
      const to = stops[k + 1];
      const top = Math.min(from.y, to.y) - HOP;
      // a quadratic through from and to, peaking at top halfway
      const control = 2 * top - (from.y + to.y) / 2;
      const ms = lerp(hopsMs, k / Math.max(1, stops.length - 2));
      const line = sampleLine((u) => {
        const a = 1 - u;
        return {
          x: from.x + (to.x - from.x) * u,
          y: a * a * from.y + 2 * a * u * control + u * u * to.y,
        };
      }, 60);
      hops.push({
        line,
        start: clock,
        ms,
        pour: { coinsAlong: 150, width: 18, streamMs: ms * 0.8, travelMs: ms },
      });
      clock += ms;
    }
    const landings = hops.map((h) => h.start + h.ms);
    const endAt = landings[landings.length - 1];
    const heads = hops.map((h) => riverHead(h.line, h.ms, h.start));
    const rider = (ms: number): Point | null => {
      for (const head of heads) {
        const at = head(ms);
        if (at) return at;
      }
      return null;
    };
    // its squash, ms in: 1 in the air, flattening as it lands
    const squash = (ms: number): number => {
      for (const at of landings) {
        const d = ms - at;
        if (d >= 0 && d < SQUASH_MS) return 1 - SQUASH * (1 - d / SQUASH_MS);
      }
      return 1;
    };

    const launching = createBeats(
      hops,
      (h) => h.start,
      (h) => pourLine(cover!, h.line, h.pour),
    );
    const landing = createBeats(
      landings.slice(0, -1),
      (ms) => ms,
      (_, k) => {
        const bar = bars[k];
        const t = k / Math.max(1, bars.length - 1);
        cover!.levels(bar, levelsFor(bar.floor, levelShare), {
          x: spots[k].x,
          y: spots[k].y - 60,
        });
        cover!.burst(spots[k], lerp(LAND_BURST, t));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, t));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const last = hops[hops.length - 1];
    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: Math.max(
          pourDurationMs(last.start, last.pour),
          endAt + holdMs + mergeMs,
        ),
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          launching.tick(ms, now);
          landing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            rider,
            ms,
            now,
            WISP_SIZE * RIDER * squash(ms),
            clamp01(ms / endAt),
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
