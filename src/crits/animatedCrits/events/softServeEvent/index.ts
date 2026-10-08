// the "Soft Serve" event (money; cash): it covers its crit, whose click
// freezes the screen while a thick stream of cash pours down out of the top
// of the screen and pipes itself into a giant soft-serve swirl at the
// bottom, coil on coil, each smaller than the last, ever faster, every coil
// finished a splat and a jolt; it tops off with a curl that flicks up, then
// the whole swirl is slurped up into the total from the top down in a huge
// blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "softServe";
const REWARD = 4;
const COINS = 1_300;
const COIN = 0.5;
// the swirl stands BASE px up off the bottom, COILS coils over HEIGHT of
// the screen, its widest WIDE of the screen's width narrowing to TIP of
// that, seen SQUASH flat; each coin is THICK px round its coil
const BASE = 70;
const COILS = 6;
const HEIGHT = 0.42;
const WIDE = 0.36;
const TIP = 0.12;
const SQUASH = 0.32;
const THICK = 14;
const DROP_MS = 260;
const SURGE_MS = 380;
const LIFT = 60;
const COIL_SHAKE: [number, number] = [0.4, 1];

export const forceSoftServeEvent = registerWispEvent(
  KEY,
  "Soft Serve",
  () => CONFIG.softServeEvent.chance,
  (floor, context, area) => {
    const { pipeMs, flightMs, holdMs, mergeMs } = CONFIG.softServeEvent;
    const fallback = totalSpot(area);
    const cx = (area.left + area.right) / 2;
    const base = area.bottom - BASE;
    const tall = (area.bottom - area.top) * HEIGHT;
    const wide = (area.right - area.left) * WIDE;
    // piped ever faster: the share s is down by ms
    const pipedAt = (s: number) => pipeMs * Math.sqrt(s);
    const doneAt = pipeMs + DROP_MS;
    const endAt = doneAt + SURGE_MS + flightMs;
    const coilAt = (s: number, into: Point) => {
      const angle = s * COILS * Math.PI * 2;
      const r = wide * lerp([1, TIP], s);
      into.x = cx + Math.cos(angle) * r;
      into.y = base - s * tall + Math.sin(angle) * r * SQUASH;
      return into;
    };
    const top: Point = { x: cx, y: base - tall };

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const s = i / (COINS - 1);
      const spot = coilAt(s, { x: 0, y: 0 });
      spot.x += (Math.random() - 0.5) * THICK;
      spot.y += (Math.random() - 0.5) * THICK;
      const from: Point = {
        x: cx + (Math.random() - 0.5) * 16,
        y: area.top - 10,
      };
      const ctrl: Point = { x: cx, y: spot.y - 40 };
      const lands = pipedAt(s);
      const leaves = doneAt + (1 - s) * SURGE_MS;
      const lift: Point = { x: spot.x, y: spot.y - LIFT };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        const drops = lands - DROP_MS;
        if (ms < drops) return { x: from.x, y: from.y, scale: 0 };
        if (ms < lands) {
          bezier(from, ctrl, spot, easeIn((ms - drops) / DROP_MS), at);
          return { x: at.x, y: at.y, scale: COIN };
        }
        if (ms < leaves) return { x: spot.x, y: spot.y, scale: COIN };
        const total = cover?.total() ?? fallback;
        bezier(
          spot,
          lift,
          total,
          easeIn(clamp01((ms - leaves) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });

    const coils = Array.from({ length: COILS }, (_, k) => ({
      at: pipedAt((k + 1) / COILS),
      spot: coilAt((k + 0.75) / COILS, { x: 0, y: 0 }),
    }));
    const coiling = createBeats(
      coils,
      (c) => c.at,
      (c, k) => {
        if (k === COILS - 1) {
          cover!.burst(top, 0.8);
          if (cover!.isLive()) shakeScreen(1.3);
          return;
        }
        cover!.burst(c.spot, 0.35);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(COIL_SHAKE, k / (COILS - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          coiling.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
