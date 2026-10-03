// the "Dowsing" event (wisp; free hires): it covers its crit, whose click
// freezes the screen while a dowsing wisp drifts out of the clicked floor's
// button and wanders over the floors in view, swinging back and forth,
// hunting; over an empty spot it shivers, hangs trembling, then plunges
// straight down onto it with a flash, a bloop and a jolt and a new worker
// forms there, as if it struck gold; it hunts on, faster each time, the last
// plunge a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";

const KEY = "dowsing";
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 30;
// it hunts HIGH px over a spot, swinging SWING px; the search is WANDER of
// each find, the tremble SHIVER, the plunge the rest
const HIGH = 120;
const SWING = 60;
const WANDER = 0.6;
const SHIVER = 0.2;
const ROD = 0.5;
const FIND_SHAKE: [number, number] = [0.5, 1.3];

export const forceDowsingEvent = registerWispEvent(
  KEY,
  "Dowsing",
  () => CONFIG.dowsingEvent.chance,
  (floor, context) => {
    const { findsMs, holdMs, mergeMs } = CONFIG.dowsingEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    let from: Point = button;
    const finds = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const over: Point = { x: spot.x, y: spot.y - HIGH };
      const starts = clock;
      const span = lerp(findsMs, k / Math.max(1, hires.length - 1));
      clock += span;
      const find = { hire, spot, over, from, starts, span, strikes: clock };
      from = spot;
      return find;
    });
    const last = finds[finds.length - 1];
    const endAt = last.strikes;
    const rodAt: Point = { x: 0, y: 0 };
    const rod = (ms: number): Point => {
      let f = finds[0];
      for (const find of finds) if (ms >= find.starts) f = find;
      const u = clamp01((ms - f.starts) / f.span);
      if (u < WANDER) {
        const v = u / WANDER;
        rodAt.x =
          lerp([f.from.x, f.over.x], smoothstep(v)) +
          Math.sin(v * Math.PI * 3) * SWING * (1 - v);
        rodAt.y = lerp([f.from.y, f.over.y], smoothstep(v));
      } else if (u < WANDER + SHIVER) {
        rodAt.x = f.over.x + Math.sin(ms * 0.9) * 4;
        rodAt.y = f.over.y + Math.cos(ms * 1.3) * 3;
      } else {
        const v = easeIn((u - WANDER - SHIVER) / (1 - WANDER - SHIVER));
        rodAt.x = f.over.x;
        rodAt.y = lerp([f.over.y, f.spot.y], v);
      }
      return rodAt;
    };

    const striking = createBeats(
      finds,
      (f) => f.strikes,
      (f, k) => {
        giveHire(f.hire);
        if (f === last) {
          cover!.blast(f.spot);
          return;
        }
        cover!.burst(f.spot, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(FIND_SHAKE, k / Math.max(1, finds.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => striking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms <= endAt)
            drawWispBetween(ctx, rod, ms, now, WISP_SIZE * ROD, 0.7, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
