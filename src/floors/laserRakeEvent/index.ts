// the "Laser Rake" event (beam; cash): it covers its crit, whose click
// freezes the screen while a giant rake of light swings in from the right
// edge, a spine of wisps with a row of blazing beam teeth, and drags across
// the screen in hard yanks, every yank raking up a wave of cash off every
// tooth's tip with a scrape and a jolt, ever harder; at the left edge its
// teeth all swing onto the total and the raked-up heap pours up into it in
// a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { bezier } from "../../shared/curves";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import { drawBeam, drawBeamFlare } from "../../shared/beam";
import { pourDurationMs, pourLine, sampleLine, totalSpot, type Pour } from "../cashFlow";

const KEY = "laserRake";
const REWARD = 4;
const TEETH = 7;
const STROKES = 5;
const TOOTH = 110;
const EDGE = 70;
const COINS = 5;
const SPINE = 8;
const TOOTH_W = 7;
const WISP = 0.35;
const STROKE_SHAKE: [number, number] = [0.4, 1.3];

export const forceLaserRakeEvent = registerWispEvent(
  KEY,
  "Laser Rake",
  () => CONFIG.laserRakeEvent.chance,
  (floor, context, area) => {
    const { strokesMs, gatherMs, holdMs, mergeMs } = CONFIG.laserRakeEvent;
    const total = totalSpot(area);
    const top = area.top + 200;
    const bottom = area.bottom - 120;
    const ys = Array.from({ length: TEETH }, (_, i) => lerp([top, bottom], i / (TEETH - 1)));
    const xs = Array.from({ length: STROKES + 1 }, (_, k) =>
      lerp([area.right + TOOTH, area.left + EDGE + TOOTH], k / STROKES),
    );
    let clock = 0;
    const strokes = Array.from({ length: STROKES }, (_, k) => {
      const starts = clock;
      clock += lerp(strokesMs, k / (STROKES - 1));
      return { from: xs[k], to: xs[k + 1], starts, ends: clock };
    });
    const gathers = clock;
    const endAt = gathers + gatherMs;
    const heap: Point = { x: xs[STROKES] - TOOTH, y: (top + bottom) / 2 };
    const line = sampleLine(
      (u) => bezier(heap, { x: heap.x, y: total.y + 60 }, total, u, { x: 0, y: 0 }),
      30,
    );
    const pour: Pour = { coinsAlong: 260, width: 46, streamMs: gatherMs * 0.6, travelMs: gatherMs };
    const durationMs = Math.max(pourDurationMs(gathers, pour), endAt + holdMs + mergeMs);
    const spineX = (ms: number) => {
      let s = strokes[0];
      for (const stroke of strokes) if (ms >= stroke.starts) s = stroke;
      return lerp([s.from, s.to], easeOut(clamp01((ms - s.starts) / (s.ends - s.starts))));
    };
    const roots = ys.map((y) => ({ x: 0, y }));
    const tip: Point = { x: 0, y: 0 };
    const knuckles = roots.map((r) => () => r);
    const spineTop: Point = { x: 0, y: top };
    const spineBottom: Point = { x: 0, y: bottom };

    const raking = createBeats(
      strokes,
      (s) => s.ends,
      (s, k) => {
        for (const y of ys) {
          const at = { x: s.to - TOOTH, y };
          cover!.launchFrom(at, clampTargetsY(sprayTargets(at, COINS, [50, 170], Math.PI, 1.4), area.top + 40, area.bottom - 40));
        }
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(STROKE_SHAKE, k / (STROKES - 1)));
      },
    );
    const gathering = createBeats([gathers], (ms) => ms, () => pourLine(cover!, line, pour));
    const finale = createBeats([endAt], (ms) => ms, () => cover!.blast(cover!.total() ?? total));

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          raking.tick(ms, now);
          gathering.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const x = spineX(Math.min(ms, gathers));
          const swing = smoothstep(clamp01((ms - gathers) / gatherMs));
          const aim = cover?.total() ?? total;
          spineTop.x = spineBottom.x = x;
          drawBeam(ctx, spineTop, spineBottom, SPINE, 0.7);
          for (const root of roots) {
            root.x = x;
            tip.x = lerp([x - TOOTH, aim.x], swing);
            tip.y = lerp([root.y, aim.y], swing);
            drawBeam(ctx, root, tip, TOOTH_W, 0.85);
            drawBeamFlare(ctx, tip, 9, 0.7, now);
          }
          for (const knuckle of knuckles)
            drawWispBetween(ctx, knuckle, ms, now, WISP_SIZE * WISP, 0.5, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
