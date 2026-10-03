// the "Tadpoles" event (wisp; free hires): it covers its crit, whose click
// freezes the screen while a big mother wisp swims out of the clicked
// floor's button to the middle of the screen and, swelling with each one,
// lays tadpoles: little wisps that wriggle off, tails thrashing, to every
// empty spot on the floors in view, each popping there with a flash, a bloop
// and a jolt as a new worker forms; the last lands in a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";

const KEY = "tadpoles";
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 30;
// each tadpole wriggles WIGGLE px side to side, WIGGLES times on its way
const WIGGLE = 26;
const WIGGLES = 5;
const MOTHER: [number, number] = [0.8, 1.2];
const TADPOLE = 0.3;
const LAND_SHAKE: [number, number] = [0.4, 1.2];

export const forceTadpolesEvent = registerWispEvent(
  KEY,
  "Tadpoles",
  () => CONFIG.tadpolesEvent.chance,
  (floor, context, area) => {
    const { swimMs, gapsMs, wriggleMs, holdMs, mergeMs } = CONFIG.tadpolesEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const nest: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    let clock: number = swimMs;
    const tadpoles = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const laid = clock;
      clock += lerp(gapsMs, k / Math.max(1, hires.length - 1));
      const dx = spot.x - nest.x;
      const dy = spot.y - nest.y;
      const length = Math.hypot(dx, dy) || 1;
      const at: Point = { x: 0, y: 0 };
      return {
        hire,
        spot,
        laid,
        lands: laid + wriggleMs,
        at: (ms: number): Point => {
          const u = clamp01((ms - laid) / wriggleMs);
          const side = Math.sin(u * WIGGLES * Math.PI * 2) * WIGGLE * (1 - u);
          at.x = lerp([nest.x, spot.x], u) - (dy / length) * side;
          at.y = lerp([nest.y, spot.y], u) + (dx / length) * side;
          return at;
        },
      };
    });
    const last = tadpoles[tadpoles.length - 1];
    const endAt = last.lands;
    const motherAt: Point = { x: 0, y: 0 };
    const mother = (ms: number): Point => {
      const u = easeOut(Math.min(1, ms / swimMs));
      const sway = Math.sin(ms / 120) * 6;
      motherAt.x = lerp([button.x, nest.x], u) + sway;
      motherAt.y = lerp([button.y, nest.y], u);
      return motherAt;
    };

    const laying = createBeats(
      tadpoles,
      (t) => t.laid,
      () => {
        cover!.burst(nest, 0.25);
        if (cover!.isLive()) playBloop();
      },
    );
    const landing = createBeats(
      tadpoles,
      (t) => t.lands,
      (t, k) => {
        giveHire(t.hire);
        if (t === last) {
          cover!.blast(t.spot);
          return;
        }
        cover!.burst(t.spot, 0.45);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, tadpoles.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          laying.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt) return;
          const swell = lerp(
            MOTHER,
            clamp01((ms - swimMs) / (last.laid - swimMs || 1)),
          );
          drawWispBetween(
            ctx,
            mother,
            ms,
            now,
            WISP_SIZE * swell,
            0.6,
            0,
            last.laid + 150,
          );
          for (const t of tadpoles)
            drawWispBetween(
              ctx,
              t.at,
              ms,
              now,
              WISP_SIZE * TADPOLE,
              0.8,
              t.laid,
              t.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
