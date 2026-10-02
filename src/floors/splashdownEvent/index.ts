// the "Splashdown" event: it covers its crit, whose click freezes the screen
// while a big wisp plummets out of its top corner like a meteor, swelling
// and burning as the screen rumbles, and crashes into the middle of it in a
// huge blast and shake; cash splashes up out of the impact in a crown of
// rivers arcing out every way and raining back down, and the coins sweep
// into the total. Pays floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../config";
import { playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { between, clamp01, easeIn, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";

const KEY = "splashdown";
const REWARD = 4;
// the crown: ARCS rivers, each rising RISE of the screen's height and landing
// REACH of its width (or height, if less) out from the impact
const ARCS = 10;
const RISE: [number, number] = [0.25, 0.45];
const REACH: [number, number] = [0.3, 0.48];
// the impact DROP of the screen's height under its middle
const DROP = 0.12;
// the meteor: from off a top corner, swelling over METEOR of the screen's width
const METEOR: [number, number] = [0.05, 0.13];
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.3, 1.2];

export const forceSplashdownEvent = registerWispEvent(
  KEY,
  "Splashdown",
  () => CONFIG.splashdownEvent.chance,
  (floor, context, area) => {
    const { fallMs, splashMs, travelMs, holdMs, mergeMs } =
      CONFIG.splashdownEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const span = Math.min(width, height);
    const impact: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + height * DROP,
    };
    const side = Math.random() < 0.5 ? 1 : -1;
    const sky: Point = {
      x: side === 1 ? area.left - width * 0.1 : area.right + width * 0.1,
      y: area.top - height * 0.1,
    };
    // a crown of rivers arcing up out of the impact and down again
    const tilt = Math.random() * Math.PI;
    const arcs = Array.from({ length: ARCS }, (_, k) => {
      const angle = tilt + (k / ARCS) * Math.PI * 2;
      const reach = span * between(REACH);
      const land = {
        x: impact.x + Math.cos(angle) * reach,
        y: Math.min(area.bottom, impact.y + Math.sin(angle) * reach * 0.6),
      };
      const peak = {
        x: (impact.x + land.x) / 2,
        y: Math.min(impact.y, land.y) - height * between(RISE),
      };
      return sampleLine(
        (u) => bezier(impact, peak, land, u, { x: 0, y: 0 }),
        60,
      );
    });
    const pour: Pour = {
      coinsAlong: 230,
      width: 40,
      streamMs: splashMs,
      travelMs,
    };
    const durationMs = Math.max(
      pourDurationMs(fallMs, pour),
      fallMs + holdMs + mergeMs,
    );
    const point = { x: 0, y: 0 };
    const meteorAt = (ms: number): Point | null => {
      if (ms < 0 || ms >= fallMs) return null;
      const u = easeIn(ms / fallMs);
      point.x = sky.x + (impact.x - sky.x) * u;
      point.y = sky.y + (impact.y - sky.y) * u;
      return point;
    };

    let lastRumble = -Infinity;
    const crash = createBeats(
      [fallMs],
      (ms) => ms,
      () => {
        cover!.blast(impact, 20);
        for (const arc of arcs) pourLine(cover!, arc, pour);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          crash.tick(ms, now);
          if (ms < fallMs && now - lastRumble >= RUMBLE_MS && cover?.isLive()) {
            lastRumble = now;
            shakeScreen(lerp(RUMBLE, clamp01(ms / fallMs)));
          }
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / fallMs);
          const size = Math.max(WISP_SIZE, width * lerp(METEOR, heat));
          drawWispBetween(ctx, meteorAt, ms, now, size, heat, 0, fallMs);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
