// the "Projector" event (beam; free hires): it covers its crit, whose click
// freezes the screen while a wisp rises off the clicked floor's button like
// a projector lens; it flickers an aim laser onto an empty spot on a floor
// in view with room, then throws a blazing fan of beams onto it and a new
// worker is projected into being in the light with a flash, a bang and a
// jolt; spot after spot, ever faster; then it throws every beam at once in
// a blinding volley and blows in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../shared/beam";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";
import { WORKER_HEIGHT } from "../worker";

const KEY = "projector";
const MAX_HIRES = 4;
// the lens hovers RISE px over the button
const RISE = 150;
const FAN = 3;
const BEAM = 12;
const CORE = 22;
const FORM_MS = 260;
const VOLLEY_MS = 220;
const HIRE_SHAKE: [number, number] = [0.9, 1.6];

export const forceProjectorEvent = registerWispEvent(
  KEY,
  "Projector",
  () => CONFIG.projectorEvent.chance,
  (floor, context) => {
    const { riseMs, aimMs, beamsMs, holdMs, mergeMs } = CONFIG.projectorEvent;
    const hires = findRewardHires(floor, context)
      .sort(() => Math.random() - 0.5)
      .slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lens: Point = { x: button.x, y: button.y - RISE };
    // a fan of FAN beams from head to feet of each spot
    const fans: Point[][] = hires.map((h) =>
      Array.from({ length: FAN }, (_, j) => ({
        x: h.x,
        y: h.y + WORKER_HEIGHT * 0.45 * ((2 * j) / (FAN - 1) - 1),
      })),
    );
    const centres: Point[] = hires.map((h) => ({ x: h.x, y: h.y }));
    const shows = hires.map((_, k) => ({
      aimAt: 0,
      fireAt: 0,
      offAt: 0,
      beamMs: lerp(beamsMs, k / Math.max(1, hires.length - 1)),
    }));
    let clock: number = riseMs;
    for (const show of shows) {
      show.aimAt = clock;
      show.fireAt = clock + aimMs;
      show.offAt = show.fireAt + show.beamMs;
      clock = show.offAt;
    }
    const volleyAt = clock;
    const endAt = volleyAt + VOLLEY_MS;
    const rising: Point = { x: 0, y: 0 };
    const wisp = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      const u = easeOut(clamp01(ms / riseMs));
      rising.x = button.x;
      rising.y = button.y + (lens.y - button.y) * u;
      return rising;
    };

    const firing = createBeats(
      shows,
      (s) => s.fireAt,
      (_, k) => {
        const t = k / Math.max(1, hires.length - 1);
        giveHire(hires[k]);
        cover!.burst(centres[k], 0.7 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIRE_SHAKE, t));
      },
    );
    const volley = createBeats(
      [volleyAt],
      (ms) => ms,
      () => cover!.blast(lens),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          firing.tick(ms, now);
          volley.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt) return;
          drawWispBetween(
            ctx,
            wisp,
            ms,
            now,
            WISP_SIZE,
            clamp01(ms / volleyAt),
            0,
            endAt,
          );
          if (ms >= volleyAt) {
            const fade = 1 - (ms - volleyAt) / VOLLEY_MS;
            for (const fan of fans)
              for (const to of fan) drawBeam(ctx, lens, to, BEAM, fade);
            drawBeamFlare(ctx, lens, 40, fade, now);
            return;
          }
          const k = shows.findIndex((s) => ms >= s.aimAt && ms < s.offAt);
          if (k < 0) return;
          const show = shows[k];
          if (ms < show.fireAt) {
            drawAimLaser(ctx, lens, centres[k]);
            return;
          }
          const fade = 1 - clamp01((ms - show.fireAt) / show.beamMs) * 0.5;
          for (const to of fans[k]) drawBeam(ctx, lens, to, BEAM, fade);
          drawBeam(ctx, lens, centres[k], CORE, fade);
          drawBeamFlare(ctx, lens, 24, fade, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
