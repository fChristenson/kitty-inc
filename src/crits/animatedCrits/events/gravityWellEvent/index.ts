// the "Gravity Well" event: it covers its crit, whose click freezes the screen
// while a heavy wisp hangs in the middle of it like a planet and the clicked
// floor's button fires river after river of cash past it; each bends round
// the wisp's pull, whipping round its far side and slinging off up into the
// total, the wisp swelling and throbbing with every pass, each a flash and a
// jolt; then it collapses into the total in a huge blast and shake, and the
// coins sweep into the total. Pays floor income × floor number × REWARD (see
// ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playBloop } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  measure,
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "gravityWell";
const REWARD = 4;
// rivers fired one after another, each passing ORBIT of the screen's width
// (or height, if less) out from the planet on alternating sides, growing
const RIVERS = 6;
const ORBIT: [number, number] = [0.14, 0.3];
// the planet: DROP of the screen's height under its middle, swelling over
// PLANET of its width, throbbing THROB bigger on each pass
const DROP = 0.05;
const PLANET: [number, number] = [0.08, 0.16];
const THROB = 0.25;
const THROB_MS = 220;
const POP_MS = 220;
// each pass: a burst on the planet, a bloop and a jolt
const PASS_BURST: [number, number] = [0.3, 0.7];
const PASS_SHAKE: [number, number] = [0.6, 1.5];

export const forceGravityWellEvent = registerWispEvent(
  KEY,
  "Gravity Well",
  () => CONFIG.gravityWellEvent.chance,
  (floor, context, area) => {
    const { gapMs, streamMs, travelMs, holdMs, mergeMs } =
      CONFIG.gravityWellEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const planet: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + height * DROP,
    };
    const span = Math.min(width, height);
    // each river: out of the button toward the planet's side, round its far
    // side, then slung up into the total
    const rivers = Array.from({ length: RIVERS }, (_, k) => {
      const side = k % 2 === 0 ? 1 : -1;
      const r = span * lerp(ORBIT, k / (RIVERS - 1));
      const line = sampleLine(
        (u) =>
          alongRoute(
            [
              button,
              { x: planet.x + side * r, y: planet.y + r * 0.6 },
              { x: planet.x + side * r * 0.9, y: planet.y - r * 0.8 },
              { x: planet.x - side * r * 0.4, y: planet.y - r * 1.2 },
              total,
            ],
            u,
            { x: 0, y: 0 },
          ),
        120,
      );
      // when its head whips round the planet's far side, halfway along
      const along = measure(line);
      return {
        line,
        start: k * gapMs,
        passShare: along[60] / along[along.length - 1],
      };
    });
    const pour: Pour = { coinsAlong: 340, width: 46, streamMs, travelMs };
    const passes = rivers.map((r) => r.start + travelMs * r.passShare);
    const collapseAt = rivers[RIVERS - 1].start + travelMs;
    const durationMs = Math.max(
      pourDurationMs(rivers[RIVERS - 1].start, pour),
      collapseAt + holdMs + mergeMs,
    );
    let lastPass = -Infinity;
    const planetAt = (ms: number): Point | null =>
      ms < 0 || ms >= collapseAt ? null : planet;

    const fires = createBeats(
      rivers,
      (r) => r.start,
      (r) => pourLine(cover!, r.line, pour),
    );
    const swings = createBeats(
      passes,
      (ms) => ms,
      (_, k) => passed(k),
    );
    const finale = createBeats(
      [collapseAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          fires.tick(ms, now);
          swings.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / collapseAt);
          const throb =
            1 + THROB * Math.max(0, 1 - (now - lastPass) / THROB_MS);
          const size =
            Math.max(WISP_SIZE, width * lerp(PLANET, heat)) *
            throb *
            easeOutBack(clamp01(ms / POP_MS));
          drawWispBetween(ctx, planetAt, ms, now, size, heat, 0, collapseAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();

    function passed(k: number): void {
      lastPass = performance.now();
      const t = k / (RIVERS - 1);
      cover!.burst(planet, lerp(PASS_BURST, t));
      if (!cover!.isLive()) return;
      playBloop();
      shakeScreen(lerp(PASS_SHAKE, t));
    }
  },
);
