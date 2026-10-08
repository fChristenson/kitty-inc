// the "Sea Serpent" event (mix; cash): it covers its crit, whose click
// freezes the screen while a serpent wisp surges up out of the bottom of
// the screen, a body of cash rolling behind it in great humps, diving under
// the bottom edge and surging back up again and again across the screen,
// every time it breaks the surface a splash, a bang and a jolt; at the far
// side it breaches, leaping high out of the water into the total in a huge
// blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "seaSerpent";
const REWARD = 4;
const HUMPS = 4;
const EDGE = 40;
const SURFACE = 40;
const HUMP = 230;
const DIVE = 120;
const STEPS = 120;
const HEAD = 0.65;
const SPLASH_SHAKE: [number, number] = [0.6, 1.2];

export const forceSeaSerpentEvent = registerWispEvent(
  KEY,
  "Sea Serpent",
  () => CONFIG.seaSerpentEvent.chance,
  (floor, context, area) => {
    const { swimMs, breachMs, holdMs, mergeMs } = CONFIG.seaSerpentEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const ltr = button.x > (area.left + area.right) / 2;
    const from = ltr ? area.left - EDGE : area.right + EDGE;
    const to = ltr ? area.right - EDGE * 3 : area.left + EDGE * 3;
    const surface = area.bottom - SURFACE;
    // humps above the surface, dives below the screen's bottom edge
    const body = sampleLine((u) => {
      const s = Math.sin(u * Math.PI * (HUMPS * 2 - 1) - Math.PI / 2);
      return {
        x: lerp([from, to], u),
        y: surface - (s > 0 ? s * HUMP : s * DIVE),
      };
    }, STEPS);
    const swim: Pour = {
      coinsAlong: 1200,
      width: 34,
      streamMs: swimMs * 0.6,
      travelMs: swimMs,
    };
    const total = totalSpot(area);
    const tail = body[body.length - 1];
    const into: Point = { x: 0, y: 0 };
    const ctrl: Point = {
      x: (tail.x + total.x) / 2,
      y: Math.min(tail.y, total.y) - 260,
    };
    const leap = sampleLine(
      (u) => ({ ...bezier(tail, ctrl, total, u, into) }),
      40,
    );
    const breach: Pour = {
      coinsAlong: 600,
      width: 36,
      streamMs: breachMs * 0.6,
      travelMs: breachMs,
    };
    // it breaks the surface where each hump starts rising out of it
    const splashes: { at: Point; ms: number }[] = [];
    for (let h = 0; h < HUMPS; h++) {
      const u = (2 * h) / (HUMPS * 2 - 1);
      splashes.push({
        at: { x: lerp([from, to], u + 0.5 / (HUMPS * 2 - 1)), y: surface },
        ms: swimMs * u + swimMs * 0.03,
      });
    }
    const breaches = swimMs;
    const endAt = breaches + breachMs;
    const durationMs = Math.max(
      pourDurationMs(breaches, breach),
      endAt + holdMs + mergeMs,
    );
    const head = riverHead(body, swimMs);
    const leapHead = riverHead(leap, breachMs, breaches);

    const swimming = createBeats(
      [0],
      (ms) => ms,
      () => pourLine(cover!, body, swim),
    );
    const splashing = createBeats(
      splashes,
      (s) => s.ms,
      (s, k) => {
        cover!.burst(s.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SPLASH_SHAKE, k / (HUMPS - 1)));
      },
    );
    const breaching = createBeats(
      [breaches],
      (ms) => ms,
      () => pourLine(cover!, leap, breach),
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
          swimming.tick(ms, now);
          splashing.tick(ms, now);
          breaching.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawWispBetween(
            ctx,
            head,
            ms,
            now,
            WISP_SIZE * HEAD,
            0.7,
            0,
            breaches,
          );
          drawWispBetween(
            ctx,
            leapHead,
            ms,
            now,
            WISP_SIZE * HEAD,
            1,
            breaches,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
