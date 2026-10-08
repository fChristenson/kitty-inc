// the "Collider" event (wisp): it covers its crit, whose click freezes the
// screen while two wisps race round a great ring in its middle in opposite
// directions like a particle accelerator, ever faster, every time they shoot
// past each other a flash, a bloop, a jolt and a ring of coins; then they're
// kicked off the ring and smash head-on in its middle in a huge blast and
// shake, a shower of debris wisps flying out and each popping into a ring of
// coins, and the coins sweep into the total-income readout. Pays floor
// income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOutBack,
  easeOutCubic,
  lerp,
} from "../../../../shared/easing";
import { ringTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "collider";
const REWARD = 4;
// the ring RING of the screen's smaller side across; the wisps pass each
// other MEETS times, speeding up by the power ACCEL
const RING = 0.72;
const MEETS = 6;
const ACCEL = 1.6;
const RACER = 0.06;
const POP_MS = 180;
const MEET_COINS = 20;
const MEET_REACH: [number, number] = [30, 100];
const MEET_BURST: [number, number] = [0.5, 1];
const MEET_SHAKE: [number, number] = [0.7, 1.8];
// DEBRIS wisps flung SCATTER of the ring's radius out, each popping into
// DEBRIS_COINS coins
const DEBRIS = 10;
const SCATTER = 1.15;
const DEBRIS_SIZE = 0.4;
const DEBRIS_COINS = 14;
const DEBRIS_REACH: [number, number] = [20, 70];

export const forceColliderEvent = registerWispEvent(
  KEY,
  "Collider",
  () => CONFIG.colliderEvent.chance,
  (floor, context, area) => {
    const { runMs, dashMs, debrisMs, holdMs, mergeMs } = CONFIG.colliderEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const middle = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + height * 0.04,
    };
    const r = (Math.min(width, height) * RING) / 2;
    const span = (MEETS + 0.5) * Math.PI;
    const swept = (ms: number) => span * clamp01(ms / runMs) ** ACCEL;
    const crashAt = runMs + dashMs;
    const doneAt = crashAt + debrisMs;
    const meets = Array.from(
      { length: MEETS },
      (_, n) => runMs * ((n + 1) / (MEETS + 0.5)) ** (1 / ACCEL),
    );

    const racers = [1, -1].map((way) => {
      const into = { x: 0, y: 0 };
      const ringAt = (ms: number, out: Point) => {
        const a = Math.PI + way * swept(ms);
        out.x = middle.x + Math.cos(a) * r;
        out.y = middle.y + Math.sin(a) * r;
        return out;
      };
      const kicked = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms >= crashAt) return null;
        if (ms < runMs) return ringAt(ms, into);
        ringAt(runMs, kicked);
        const u = easeIn((ms - runMs) / dashMs);
        into.x = kicked.x + (middle.x - kicked.x) * u;
        into.y = kicked.y + (middle.y - kicked.y) * u;
        return into;
      };
    });
    const debris = Array.from({ length: DEBRIS }, (_, k) => {
      const a = ((k + Math.random() * 0.5) / DEBRIS) * Math.PI * 2;
      const reach = r * SCATTER * (0.7 + 0.3 * Math.random());
      const into = { x: 0, y: 0 };
      const end = {
        x: middle.x + Math.cos(a) * reach,
        y: middle.y + Math.sin(a) * reach,
      };
      return {
        end,
        at: (ms: number): Point | null => {
          if (ms < crashAt || ms >= doneAt) return null;
          const u = easeOutCubic((ms - crashAt) / debrisMs);
          into.x = middle.x + (end.x - middle.x) * u;
          into.y = middle.y + (end.y - middle.y) * u;
          return into;
        },
      };
    });

    const passing = createBeats(
      meets,
      (ms) => ms,
      (_, n) => {
        const t = n / (MEETS - 1);
        const at = {
          x: middle.x + (n % 2 === 0 ? r : -r),
          y: middle.y,
        };
        cover!.burst(at, lerp(MEET_BURST, t));
        cover!.launchFrom(at, ringTargets(at, MEET_COINS, MEET_REACH));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(MEET_SHAKE, t));
      },
    );
    const crash = createBeats(
      [crashAt],
      (ms) => ms,
      () => cover!.blast(middle),
    );
    const popping = createBeats(
      debris,
      () => doneAt,
      (d) => {
        cover!.burst(d.end, 0.5);
        cover!.launchFrom(
          d.end,
          ringTargets(d.end, DEBRIS_COINS, DEBRIS_REACH),
        );
      },
    );
    const size = Math.max(WISP_SIZE, width * RACER);

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: doneAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          passing.tick(ms, now);
          crash.tick(ms, now);
          popping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / runMs);
          const grow = easeOutBack(clamp01(ms / POP_MS));
          for (const at of racers)
            drawWispBetween(ctx, at, ms, now, size * grow, heat, 0, crashAt);
          for (const d of debris)
            drawWispBetween(
              ctx,
              d.at,
              ms,
              now,
              size * DEBRIS_SIZE,
              1,
              crashAt,
              doneAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
