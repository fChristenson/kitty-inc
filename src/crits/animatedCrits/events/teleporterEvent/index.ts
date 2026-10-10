// the "Teleporter" event (beam; free hires): it covers its crit, whose click
// freezes the screen while over each empty spot a thin column of light
// flickers on, then a tall shimmering beam blazes straight down onto it,
// rings of glitter running down it, until with a flash, a bloop and a jolt
// a new worker beams in; spot after spot beams in, each quicker than the
// last, the last landing in a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { stampGlimmer } from "../../../../shared/twinkle";
import { createBeats } from "../../../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const KEY = "teleporter";
const MAX_HIRES = 6;
const FORM_MS = 300;
const AIM = 0.35;
const OVERLAP = 0.6;
const WIDTH = 46;
const FADE_MS = 200;
const FLARE = 50;
const RINGS = 4;
const RING_GLINTS = 7;
const RING_REACH = 30;
const RING_SPEED = 1.4;
const GLINT = 9;
const LIFT = 34;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

export const forceTeleporterEvent = registerWispEvent(
  KEY,
  "Teleporter",
  () => CONFIG.teleporterEvent.chance,
  (floor, context, area) => {
    const { spotMs, holdMs, mergeMs } = CONFIG.teleporterEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    let clock = 0;
    const pads = hires.map((hire, k) => {
      const span = lerp(spotMs, k / Math.max(1, hires.length - 1));
      const starts = clock;
      const fires = starts + span * AIM;
      const lands = starts + span;
      clock = starts + span * OVERLAP;
      return {
        hire,
        sky: { x: hire.x, y: area.top } as Point,
        foot: { x: hire.x, y: hire.y } as Point,
        middle: { x: hire.x, y: hire.y - LIFT } as Point,
        starts,
        fires,
        lands,
        last: k === hires.length - 1,
      };
    });
    const endAt = pads[pads.length - 1].lands;

    const landing = createBeats(
      pads,
      (p) => p.lands,
      (p, k) => {
        giveHire(p.hire);
        if (p.last) {
          cover!.blast(p.middle);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(p.middle, 0.6);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, pads.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => landing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + FADE_MS) return;
          for (const p of pads) {
            if (ms < p.starts || ms > p.lands + FADE_MS) continue;
            if (ms < p.fires) {
              drawAimLaser(ctx, p.sky, p.foot);
              continue;
            }
            const charge = clamp01((ms - p.fires) / (p.lands - p.fires));
            const fade = 1 - clamp01((ms - p.lands) / FADE_MS);
            const flash = ms >= p.lands ? fade : 0;
            const pulse = 0.75 + 0.25 * Math.sin(now / 25);
            drawBeam(
              ctx,
              p.sky,
              p.foot,
              WIDTH * (0.4 + 0.6 * charge) * pulse * (1 + flash),
              fade,
            );
            if (flash > 0)
              drawBeamFlare(
                ctx,
                p.middle,
                FLARE * (p.last ? 2 : 1) * (0.5 + flash),
                flash,
                now,
              );
            if (ms >= p.lands) continue;
            // rings of glitter running down the beam, ever faster as it charges
            const length = p.foot.y - p.sky.y;
            const run = (ms - p.fires) * RING_SPEED * (1 + charge);
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            beginLightBatch(ctx);
            for (let r = 0; r < RINGS; r++) {
              const y = p.sky.y + ((run + (r * length) / RINGS) % length);
              for (let g = 0; g < RING_GLINTS; g++) {
                const a = (g / RING_GLINTS) * Math.PI * 2 + now / 120;
                stampGlimmer(
                  ctx,
                  p.foot.x + Math.cos(a) * RING_REACH,
                  y + Math.sin(a) * RING_REACH * 0.25,
                  GLINT * (0.5 + 0.5 * charge),
                  a,
                  g % 2 === 0 ? COLOR.white : COLOR.heavenlyGold,
                );
              }
            }
            endLightBatch(ctx);
            ctx.restore();
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
