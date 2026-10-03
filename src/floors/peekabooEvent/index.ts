// the "Peekaboo" event (wisp; free hires): it covers its crit, whose click
// freezes the screen while a wisp pops up out of the floor at every empty
// spot in view, one after another: up it peeks with a bloop, ducks back out
// of sight, then springs up twice as high and bursts with a bang and a
// jolt, and a new worker forms where it stood; quicker and quicker across
// the screen, the last bursting in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";

const KEY = "peekaboo";
const MAX_HIRES = 6;
const FORM_MS = 300;
const PEEK = 70;
const SPRING = 150;
const PEEK_SHARE = 0.35;
const DUCK_SHARE = 0.55;
const WISP = 0.55;
const POP_SHAKE: [number, number] = [0.6, 1.3];

export const forcePeekabooEvent = registerWispEvent(
  KEY,
  "Peekaboo",
  () => CONFIG.peekabooEvent.chance,
  (floor, context) => {
    const { gapsMs, peekMs, holdMs, mergeMs } = CONFIG.peekabooEvent;
    const hires = findRewardHires(floor, context)
      .slice(0, MAX_HIRES)
      .sort((a, b) => a.x - b.x);
    if (hires.length === 0) return;
    let clock = 0;
    const peeks = hires.map((hire, k) => {
      const starts = clock;
      clock += lerp(gapsMs, k / Math.max(1, hires.length - 1));
      const at: Point = { x: hire.x, y: hire.y };
      return {
        hire,
        starts,
        peeks: starts + peekMs * PEEK_SHARE * 0.5,
        pops: starts + peekMs,
        at: (ms: number): Point => {
          const u = clamp01((ms - starts) / peekMs);
          let rise = 0;
          if (u < PEEK_SHARE)
            rise = Math.sin((Math.PI * u) / PEEK_SHARE) * PEEK;
          else if (u > DUCK_SHARE)
            rise =
              Math.sin(((Math.PI / 2) * (u - DUCK_SHARE)) / (1 - DUCK_SHARE)) *
              SPRING;
          at.y = hire.y - rise;
          return at;
        },
      };
    });
    const last = peeks[peeks.length - 1];
    const endAt = last.pops;

    const peeking = createBeats(
      peeks,
      (p) => p.peeks,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const popping = createBeats(
      peeks,
      (p) => p.pops,
      (p, k) => {
        giveHire(p.hire);
        const spot: Point = { x: p.hire.x, y: p.hire.y - SPRING };
        if (p === last) {
          cover!.blast(spot);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(spot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(POP_SHAKE, k / Math.max(1, peeks.length - 1)));
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
          peeking.tick(ms, now);
          popping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          for (const p of peeks)
            drawWispBetween(
              ctx,
              p.at,
              ms,
              now,
              WISP_SIZE * WISP,
              0.5,
              p.starts,
              p.pops,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
