// the "Jump Rope" event (bounce; free upgrade levels and a crit tier): it
// covers its crit, whose click freezes the screen while two wisps take the
// ends of a rope of glittering light either side of the clicked floor's
// income bar and start turning it, and a wisp skips on the bar, hopping
// over the rope each time it sweeps under; the rope turns faster and
// faster, every landing a splash, a boing and a jolt of free levels; then
// the skipper leaps sky-high over the last turn and slams down onto the bar,
// which jumps a crit tier in a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import {
  drawGlitterLight,
  drawWisp,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam } from "../../shared/beam";
import { drawBounceSplash, SPLASH_MS, type Bounce } from "../../shared/bounce";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "jumpRope";
const POINTS = 28;
const HANDS_OUT = 50;
const HANDS_UP = 40;
// how far the rope swings out from its ends' line at its middle
const SAG = 160;
// laps of the rope, and how hard it speeds up (0 steady, 1 from still)
const LAPS = 7;
const SPEEDUP = 0.5;
const HOP: [number, number] = [70, 130];
const LEAP = 340;
const SKIPPER = 0.55;
const HAND = 0.4;
const SPLASH = 90;
const LAND_SHAKE: [number, number] = [0.3, 0.7];

export const forceJumpRopeEvent = registerWispEvent(
  KEY,
  "Jump Rope",
  () => CONFIG.jumpRopeEvent.chance,
  (floor, context) => {
    const { jumpMs, leapMs, levelShare, holdMs, mergeMs } =
      CONFIG.jumpRopeEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const axis = bar.box.y - HANDS_UP;
    const hands: Point[] = [
      { x: bar.box.x - HANDS_OUT, y: axis },
      { x: bar.box.x + bar.box.width + HANDS_OUT, y: axis },
    ];
    const ground = bar.box.y - WISP_SIZE * SKIPPER * 0.6;
    // the rope's turn (rad): 0 sweeping under the skipper's feet
    const turnAt = (ms: number) => {
      const u = clamp01(ms / jumpMs);
      return (
        -Math.PI * 0.9 +
        Math.PI * 2 * LAPS * ((1 - SPEEDUP) * u + SPEEDUP * u * u)
      );
    };
    // in the air while the rope's in its lower half, landing as it rises
    const airborne = (turn: number) =>
      (((turn + Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const landings: Bounce[] = [];
    let wasUp = false;
    for (let ms = 0; ms <= jumpMs; ms += 2) {
      const up = airborne(turnAt(ms)) < Math.PI;
      if (wasUp && !up)
        landings.push({
          at: { x: bar.center.x, y: bar.box.y },
          ms,
          normal: -Math.PI / 2,
        });
      wasUp = up;
    }
    const slamAt = jumpMs + leapMs;
    const endAt = slamAt + SPLASH_MS;

    const skipper: Point = { x: bar.center.x, y: ground };
    const skipperAt = (ms: number): Point | null => {
      if (ms < 0 || ms > slamAt) return null;
      if (ms > jumpMs) {
        // the leap: up off the bar, hanging, then slamming down
        const u = (ms - jumpMs) / leapMs;
        skipper.y =
          ground -
          LEAP * (u < 0.55 ? easeOut(u / 0.55) : 1 - easeIn((u - 0.55) / 0.45));
        return skipper;
      }
      const a = airborne(turnAt(ms));
      const hop = lerp(HOP, clamp01(ms / jumpMs));
      skipper.y = ground - (a < Math.PI ? hop * Math.sin(a) : 0);
      return skipper;
    };
    const rope: Point[] = Array.from({ length: POINTS }, () => ({
      x: 0,
      y: 0,
    }));
    const handAts = hands.map((h) => () => h);

    const landing = createBeats(
      landings,
      (b) => b.ms,
      (b, k) => {
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 1), b.at);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, landings.length - 1)));
      },
    );
    const leaping = createBeats(
      [jumpMs],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const slamming = createBeats(
      [slamAt],
      (ms) => ms,
      () => {
        cover!.tierUp(bar, bar.center);
        cover!.slam(bar);
        cover!.blast(bar.center);
      },
    );
    const finalBounce: Bounce = {
      at: { x: bar.center.x, y: bar.box.y },
      ms: slamAt,
      normal: -Math.PI / 2,
    };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          landing.tick(ms, now);
          leaping.tick(ms, now);
          slamming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          // the rope, fading once the skipper leaps clear of it
          const fade = 1 - clamp01((ms - jumpMs) / (leapMs * 0.5));
          if (fade > 0) {
            const turn = turnAt(
              Math.min(ms, jumpMs) + Math.max(0, ms - jumpMs) * 0.5,
            );
            const swing = Math.cos(turn);
            const near = 0.7 + 0.3 * Math.sin(turn);
            for (let i = 0; i < POINTS; i++) {
              const u = i / (POINTS - 1);
              rope[i].x = lerp([hands[0].x, hands[1].x], u);
              rope[i].y = axis + SAG * Math.sin(Math.PI * u) * swing;
            }
            for (let i = 1; i < POINTS; i++)
              drawBeam(ctx, rope[i - 1], rope[i], 7 * near, 0.6 * fade);
            for (let i = 0; i < POINTS; i += 3)
              drawGlitterLight(
                ctx,
                rope[i].x,
                rope[i].y,
                9 * near,
                i,
                fade,
                now,
              );
            for (const at of handAts)
              drawWispHead(ctx, at, ms, now, WISP_SIZE * HAND, 0.6);
          }
          for (const b of landings)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
          drawBounceSplash(ctx, finalBounce, ms - slamAt, SPLASH * 2.5, now);
          drawWisp(ctx, skipperAt, ms, now, WISP_SIZE * SKIPPER, 0.7);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
