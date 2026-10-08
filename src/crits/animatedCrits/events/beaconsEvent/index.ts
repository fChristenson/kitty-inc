// the "Beacons" event (beam; free hires): it covers its crit, whose click
// freezes the screen while a beacon of light blazes up into the sky from
// every empty spot on the floors in view, one after another, each with a
// whoom, pulsing; down each beacon a wisp comes plummeting out of the sky
// and lands on its spot in a flash, a bang and a jolt as a new worker,
// ever faster; the last lands in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "beacons";
const MAX_HIRES = 6;
const FORM_MS = 300;
const RISE_MS = 140;
const BEAM = 14;
const GLOW = 40;
const SKY = 60;
const FALLER = 0.5;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

export const forceBeaconsEvent = registerWispEvent(
  KEY,
  "Beacons",
  () => CONFIG.beaconsEvent.chance,
  (floor, context, area) => {
    const { gapsMs, waitMs, fallMs, holdMs, mergeMs } = CONFIG.beaconsEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    let clock = 0;
    const beacons = hires.map((hire, k) => {
      const lights = clock;
      clock += lerp(gapsMs, k / Math.max(1, hires.length - 1));
      const base: Point = { x: hire.x, y: hire.y - 10 };
      const falls = lights + RISE_MS + waitMs;
      const lands = falls + fallMs;
      const at: Point = { x: base.x, y: 0 };
      return {
        hire,
        base,
        lights,
        lands,
        at: (ms: number): Point | null => {
          if (ms < falls || ms >= lands) return null;
          at.y = lerp(
            [area.top - SKY, base.y - 20],
            easeIn((ms - falls) / fallMs),
          );
          return at;
        },
        falls,
      };
    });
    beacons.sort((a, b) => a.lands - b.lands);
    const last = beacons[beacons.length - 1];
    const endAt = last.lands;
    const top: Point = { x: 0, y: area.top };

    const lighting = createBeats(
      beacons,
      (b) => b.lights,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      beacons,
      (b) => b.lands,
      (b, k) => {
        giveHire(b.hire);
        if (b === last) {
          cover!.blast(b.base);
          return;
        }
        cover!.burst(b.base, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, beacons.length - 1)));
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
          lighting.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + 1_200) return;
          for (const b of beacons) {
            if (ms < b.lights) continue;
            const after = ms - b.lands;
            const fade = after > 0 ? 1 - after / 300 : 1;
            if (fade <= 0) continue;
            const rise = easeOut(clamp01((ms - b.lights) / RISE_MS));
            const pulse = 0.75 + 0.25 * Math.sin(ms / 60 + b.base.x);
            top.x = b.base.x;
            top.y = lerp([b.base.y, area.top], rise);
            drawBeam(ctx, b.base, top, GLOW, 0.25 * pulse * fade);
            drawBeam(ctx, b.base, top, BEAM, 0.85 * pulse * fade);
            drawBeamFlare(ctx, b.base, 16, fade, now);
          }
          for (const b of beacons)
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * FALLER,
              1,
              b.falls,
              b.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
