// the "Solar Flare" event (beam; cash): it covers its crit, whose click
// freezes the screen while a sun wisp rises out of the clicked floor's
// button to hang blazing in the middle of the screen, and it throws solar
// flares: looping arches of light that leap out of it and crash down across
// the screen, each landing in a flare, a burst of coins and a jolt; they
// come ever faster, until the sun erupts, flinging arches every way at once
// in a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "solarFlare";
const REWARD = 4;
const FLARES = 6;
const ERUPTION = 8;
const STEPS = 10;
const REACH: [number, number] = [220, 380];
const LOOP = 1.4;
const WIDTH = 26;
const FADE_MS = 260;
const FLARE = 40;
const SUN = 1.2;
const COINS = 22;
const COIN_REACH: [number, number] = [30, 140];
const HIT_SHAKE: [number, number] = [0.6, 1.2];

export const forceSolarFlareEvent = registerWispEvent(
  KEY,
  "Solar Flare",
  () => CONFIG.solarFlareEvent.chance,
  (floor, context, area) => {
    const { riseMs, flaresMs, arcMs, holdMs, mergeMs } = CONFIG.solarFlareEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const sun: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const arch = (angle: number, reach: number) => {
      const to: Point = {
        x: sun.x + Math.cos(angle) * reach,
        y: sun.y + Math.sin(angle) * reach,
      };
      // the arch loops out sideways of the line between them
      const side = angle + Math.PI / 2;
      const ctrl: Point = {
        x: (sun.x + to.x) / 2 + Math.cos(side) * reach * LOOP * 0.5,
        y: (sun.y + to.y) / 2 + Math.sin(side) * reach * LOOP * 0.5,
      };
      const into: Point = { x: 0, y: 0 };
      return {
        to,
        points: Array.from({ length: STEPS + 1 }, (_, i) => ({
          ...bezier(sun, ctrl, to, i / STEPS, into),
        })),
      };
    };
    let clock: number = riseMs;
    const flares = Array.from({ length: FLARES }, (_, k) => {
      const leaps = clock;
      clock += lerp(flaresMs, k / (FLARES - 1));
      const a = arch(k * 2.4 + Math.random() * 0.6, lerp(REACH, Math.random()));
      return { ...a, leaps, lands: leaps + arcMs, final: false };
    });
    const erupts = clock;
    for (let i = 0; i < ERUPTION; i++)
      flares.push({
        ...arch((i / ERUPTION) * Math.PI * 2, REACH[1]),
        leaps: erupts,
        lands: erupts + arcMs,
        final: true,
      });
    const endAt = erupts + arcMs;
    const sunAt: Point = { x: 0, y: 0 };
    const sunPath = (ms: number): Point => {
      const u = easeOut(clamp01(ms / riseMs));
      sunAt.x = lerp([button.x, sun.x], u);
      sunAt.y = lerp([button.y, sun.y], u);
      return sunAt;
    };

    const leaping = createBeats(
      flares.filter((f) => !f.final || f === flares[FLARES]),
      (f) => f.leaps,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      flares,
      (f) => f.lands,
      (f, k) => {
        cover!.launchFrom(f.to, ringTargets(f.to, COINS, COIN_REACH));
        if (f.final) {
          if (k === flares.length - 1) cover!.blast(sun);
          return;
        }
        cover!.burst(f.to, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / (FLARES - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          leaping.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FADE_MS) return;
          for (const f of flares) {
            const grow = (ms - f.leaps) / arcMs;
            if (grow < 0) continue;
            const fade = 1 - clamp01((ms - f.lands) / FADE_MS);
            if (fade <= 0) continue;
            // the arch reaches out to its far end, then fades in place
            const shown = Math.min(STEPS, Math.ceil(grow * STEPS));
            for (let i = 1; i <= shown; i++)
              drawBeam(ctx, f.points[i - 1], f.points[i], WIDTH * fade, fade);
            if (ms >= f.lands) drawBeamFlare(ctx, f.to, FLARE, fade, now);
          }
          drawWispBetween(ctx, sunPath, ms, now, WISP_SIZE * SUN, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
