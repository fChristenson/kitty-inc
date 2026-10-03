// the "Pop the Cork" event (money; cash): it covers its crit, whose click
// freezes the screen while the clicked floor's button shakes and rumbles
// like a shaken bottle, then pops: a cork wisp rockets out with a bang and a
// big jolt and a foaming eruption of cash follows it, jet after jet gushing
// out in arcs that sweep back and forth across the screen, faster and
// wilder, the last a huge gush into the total in a huge blast and shake.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";

const KEY = "popTheCork";
const REWARD = 4;
const GUSHES = 9;
const EDGE = 40;
const CORK_MS = 500;
const CORK = 0.45;
const RUMBLE_MS = 80;
const GUSH_SHAKE: [number, number] = [0.3, 0.9];

export const forcePopTheCorkEvent = registerWispEvent(
  KEY,
  "Pop the Cork",
  () => CONFIG.popTheCorkEvent.chance,
  (floor, context, area) => {
    const { shakeMs, gushesMs, travelMs, holdMs, mergeMs } =
      CONFIG.popTheCorkEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const pour: Pour = { coinsAlong: 500, width: 34, streamMs: 220, travelMs };
    let clock: number = shakeMs;
    const gushes = Array.from({ length: GUSHES }, (_, k) => {
      const last = k === GUSHES - 1;
      // the jets swing back and forth, wider each time
      const swing = (k % 2 === 0 ? -1 : 1) * (0.3 + (0.7 * k) / (GUSHES - 1));
      const to: Point = last
        ? total
        : {
            x: lerp([left, right], 0.5 + swing / 2),
            y: lerp([area.top + 200, area.bottom - 60], Math.random()),
          };
      const ctrl: Point = {
        x: (button.x + to.x) / 2,
        y: Math.min(button.y, to.y) - 220,
      };
      const starts = clock;
      clock += lerp(gushesMs, k / (GUSHES - 1));
      return {
        to,
        starts,
        last,
        line: sampleLine(
          (u) => bezier(button, ctrl, to, u, { x: 0, y: 0 }),
          30,
        ),
      };
    });
    const lastGush = gushes[GUSHES - 1];
    const endAt = lastGush.starts + travelMs;
    const durationMs = Math.max(
      pourDurationMs(lastGush.starts, pour),
      endAt + holdMs + mergeMs,
    );
    const corkAt: Point = { x: 0, y: 0 };
    const corkHigh: Point = { x: button.x + 60, y: area.top - 60 };
    const cork = (ms: number): Point => {
      const u = easeOut(clamp01((ms - shakeMs) / CORK_MS));
      corkAt.x = lerp([button.x, corkHigh.x], u);
      corkAt.y = lerp([button.y, corkHigh.y], u);
      return corkAt;
    };
    let lastRumble = -Infinity;

    const popping = createBeats(
      [shakeMs],
      (ms) => ms,
      () => {
        cover!.burst(button, 1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.4);
      },
    );
    const gushing = createBeats(
      gushes,
      (g) => g.starts,
      (g, k) => {
        pourLine(cover!, g.line, pour);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(GUSH_SHAKE, k / (GUSHES - 1)));
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
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          popping.tick(ms, now);
          gushing.tick(ms, now);
          finale.tick(ms, now);
          if (ms < shakeMs && now - lastRumble > RUMBLE_MS && cover?.isLive()) {
            lastRumble = now;
            shakeScreen(0.2 + 0.6 * (ms / shakeMs));
          }
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            cork,
            ms,
            now,
            WISP_SIZE * CORK,
            1,
            shakeMs,
            shakeMs + CORK_MS,
          ),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
