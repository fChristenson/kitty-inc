// the "Rim Shot" event (bounce; cash): it covers its crit, whose click
// freezes the screen while a ring of glitter opens in the middle of the
// screen and the clicked floor's button fires a wisp into it; it ricochets
// round the inside of the rim, chord after chord, every bounce a splash, a
// boing, a jolt and a spray of cash, faster and faster as its trail scores
// a blazing star across the ring; then it breaks out through the rim and
// slams into the total in a huge blast and shake. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { drawBeam } from "../../../../shared/beam";
import {
  drawBounceSplash,
  ricochetThrough,
  SPLASH_MS,
} from "../../../../shared/bounce";
import { totalSpot } from "../../cashFlow";

const KEY = "rimShot";
const REWARD = 4;
const BOUNCES = 12;
// each chord skips round SKIP sevenths of the rim, scoring a seven-point star
const SKIP = (3 / 7) * Math.PI * 2;
const RADIUS = 0.36;
const HEIGHT = 0.46;
const RIM_SPARKLES = 32;
const SPRAY = 10;
const BALL = 0.65;
const SPLASH = 130;
const CHORD = 5;
const CHORD_ALPHA = 0.4;
const OPEN_MS = 200;
const BOUNCE_SHAKE: [number, number] = [0.4, 1];

export const forceRimShotEvent = registerWispEvent(
  KEY,
  "Rim Shot",
  () => CONFIG.rimShotEvent.chance,
  (floor, context, area) => {
    const { legsMs, holdMs, mergeMs } = CONFIG.rimShotEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const width = area.right - area.left;
    const mid: Point = {
      x: area.left + width / 2,
      y: area.top + (area.bottom - area.top) * HEIGHT,
    };
    const radius = width * RADIUS;
    const start = Math.atan2(button.y - mid.y, button.x - mid.x);
    const rim = Array.from({ length: BOUNCES }, (_, k) => ({
      x: mid.x + Math.cos(start + k * SKIP) * radius,
      y: mid.y + Math.sin(start + k * SKIP) * radius,
    }));
    const path = ricochetThrough([button, ...rim, total], legsMs);
    const hits = path.bounces.slice(0, -1);
    const endAt = path.endMs;

    const bouncing = createBeats(
      hits,
      (b) => b.ms,
      (b, k) => {
        cover!.launchFrom(
          b.at,
          clampTargetsY(
            sprayTargets(b.at, SPRAY, [60, 200], b.normal, 1.4),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(BOUNCE_SHAKE, k / (hits.length - 1)));
      },
    );
    const slamming = createBeats(
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
          bouncing.tick(ms, now);
          slamming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + SPLASH_MS) return;
          // the rim fades in as the wisp heads for it and out as it breaks free
          const rimAlpha =
            clamp01(ms / OPEN_MS) *
            (1 - clamp01((ms - hits[hits.length - 1].ms) / OPEN_MS));
          if (rimAlpha > 0)
            for (let i = 0; i < RIM_SPARKLES; i++) {
              const a = (i / RIM_SPARKLES) * Math.PI * 2;
              drawGlitterLight(
                ctx,
                mid.x + Math.cos(a) * radius,
                mid.y + Math.sin(a) * radius,
                10,
                i,
                rimAlpha,
                now,
              );
            }
          // the star scored so far
          for (let k = 1; k < hits.length; k++) {
            if (ms < hits[k].ms) break;
            drawBeam(
              ctx,
              hits[k - 1].at,
              hits[k].at,
              CHORD,
              CHORD_ALPHA * rimAlpha,
            );
          }
          for (const b of hits)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
          drawWispBetween(ctx, path.at, ms, now, WISP_SIZE * BALL, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
