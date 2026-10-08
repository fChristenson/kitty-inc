// the "Zip Line" event (mix; cash and free upgrade levels): it covers its
// crit, whose click freezes the screen while a sagging line of flowing cash
// shoots down out of the total-income readout onto the far end of an income
// bar, a wisp zipping down it at the head of the cash; it slams into the bar
// with a bang and a jolt that lands free levels, and the next line shoots
// down onto the next bar, ever faster, each line's cash running back up into
// the total; the last zips onto the clicked floor's bar and every bar slams
// in a huge blast and shake. Pays floor income × floor number × REWARD, plus
// the levels
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
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

const KEY = "zipLine";
const REWARD = 2;
const MAX_BARS = 5;
// each line sags SAG px below its straight run
const SAG = 140;
const RIDER = 0.85;
const LAND_SHAKE: [number, number] = [0.7, 1.5];

export const forceZipLineEvent = registerWispEvent(
  KEY,
  "Zip Line",
  () => CONFIG.zipLineEvent.chance,
  (floor, context, area) => {
    const { zipsMs, levelShare, holdMs, mergeMs } = CONFIG.zipLineEvent;
    const top = totalSpot(area);
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    const own = bars.find((b) => b.floor === floor);
    if (!own) return;
    const order = [...bars.filter((b) => b !== own), own];
    const first = Math.random() < 0.5 ? 0.15 : 0.85;
    const zips = order.map((bar, k) => {
      const end: Point = {
        x: bar.box.x + bar.box.width * (k % 2 === 0 ? first : 1 - first),
        y: bar.box.y - 8,
      };
      const sag: Point = {
        x: (top.x + end.x) / 2,
        y: (top.y + end.y) / 2 + SAG,
      };
      const line = sampleLine(
        (u) => bezier(top, sag, end, u, { x: 0, y: 0 }),
        50,
      );
      return { bar, end, line };
    });
    const legs = zips.map((_, k) =>
      lerp(zipsMs, k / Math.max(1, zips.length - 1)),
    );
    const starts: number[] = [];
    let clock = 0;
    legs.forEach((ms) => {
      starts.push(clock);
      clock += ms;
    });
    const endAt = clock;
    const pours: Pour[] = legs.map((ms) => ({
      coinsAlong: 160,
      width: 16,
      streamMs: ms * 0.9,
      travelMs: ms,
    }));
    const heads = zips.map((z, k) => riverHead(z.line, legs[k], starts[k]));
    const rider = (ms: number): Point | null => {
      for (const head of heads) {
        const at = head(ms);
        if (at) return at;
      }
      return null;
    };

    const launching = createBeats(
      zips,
      (_, k) => starts[k],
      (z, k) => pourLine(cover!, z.line, pours[k]),
    );
    const landing = createBeats(
      zips,
      (_, k) => starts[k] + legs[k],
      (z, k) => {
        const t = k / Math.max(1, zips.length - 1);
        cover!.levels(z.bar, levelsFor(z.bar.floor, levelShare, 2), {
          x: z.end.x,
          y: z.end.y - 60,
        });
        if (z.bar === own) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(own.center);
          return;
        }
        cover!.burst(z.end, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, t));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: Math.max(
          pourDurationMs(starts[starts.length - 1], pours[pours.length - 1]),
          endAt + holdMs + mergeMs,
        ),
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        bars,
        tick: (ms, now) => {
          launching.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            rider,
            ms,
            now,
            WISP_SIZE * RIDER,
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
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
