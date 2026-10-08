// the "Toaster" event (wisp; cash): it covers its crit, whose click freezes
// the screen while the clicked floor's button turns toaster: ding, and a
// pair of toast wisps springs up out of it, flying high and bursting into
// coins with a pop and a jolt at the top of their flight; round after round
// pops ever quicker and ever higher, until the last round shoots four
// toasts to the top of the screen, bursting together in a huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
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
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "toaster";
const REWARD = 4;
const ROUNDS = 4;
const TOP = 170;
// each toast rises in RISE_MS, its round's height growing from MIN_RISE
const RISE_MS: [number, number] = [380, 300];
const MIN_RISE = 0.35;
const SLOT = 22;
const DRIFT = 50;
const TOAST = 0.45;
const COINS = 18;
const COIN_REACH: [number, number] = [40, 150];
const POP_SHAKE: [number, number] = [0.6, 1.2];

export const forceToasterEvent = registerWispEvent(
  KEY,
  "Toaster",
  () => CONFIG.toasterEvent.chance,
  (floor, context, area) => {
    const { roundsMs, holdMs, mergeMs } = CONFIG.toasterEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const reach = button.y - (area.top + TOP);
    let clock = 0;
    const toasts: {
      at: (ms: number) => Point;
      pops: number;
      pops0: number;
      apex: Point;
      round: number;
    }[] = [];
    for (let r = 0; r < ROUNDS; r++) {
      const u = r / (ROUNDS - 1);
      const final = r === ROUNDS - 1;
      const count = final ? 4 : 2;
      const riseMs = lerp(RISE_MS, u);
      for (let i = 0; i < count; i++) {
        const side = i - (count - 1) / 2;
        const from: Point = { x: button.x + side * SLOT, y: button.y };
        const height =
          reach *
          (final
            ? 1 - (i % 2) * 0.08
            : lerp([MIN_RISE, 0.85], u) * (0.9 + 0.2 * i));
        const apex: Point = { x: from.x + side * DRIFT, y: from.y - height };
        const fires = clock;
        const at: Point = { x: 0, y: 0 };
        toasts.push({
          pops0: fires,
          pops: fires + riseMs,
          apex,
          round: r,
          at: (ms: number): Point => {
            const t = Math.min(1, Math.max(0, (ms - fires) / riseMs));
            // a straight-up throw, slowing to a stop at its apex
            const h = 1 - (1 - t) * (1 - t);
            at.x = lerp([from.x, apex.x], t);
            at.y = lerp([from.y, apex.y], h);
            return at;
          },
        });
      }
      clock += final ? riseMs : lerp(roundsMs, u);
    }
    const endAt = clock;
    const finalRound = ROUNDS - 1;

    const dinging = createBeats(
      toasts.filter((t, k) => k === 0 || toasts[k - 1].round !== t.round),
      (t) => t.pops0,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const popping = createBeats(
      toasts,
      (t) => t.pops,
      (t) => {
        cover!.launchFrom(t.apex, ringTargets(t.apex, COINS, COIN_REACH));
        if (t.round === finalRound) return;
        cover!.burst(t.apex, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(POP_SHAKE, t.round / (ROUNDS - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const t of toasts)
          if (t.round === finalRound) cover!.burst(t.apex, 1);
        cover!.blast({ x: button.x, y: area.top + TOP });
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
          dinging.tick(ms, now);
          popping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 400) return;
          for (const t of toasts)
            drawWispBetween(
              ctx,
              t.at,
              ms,
              now,
              WISP_SIZE * TOAST,
              0.6,
              t.pops0,
              t.pops,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
