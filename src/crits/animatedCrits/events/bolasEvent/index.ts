// the "Bolas" event: it covers its crit, whose click freezes the screen
// while two wisps fly up out of the clicked floor's button bound by a short
// rope of flowing cash and whirl round each other like a thrown bolas, the
// pair spinning faster and faster as it hurtles across the screen and banks
// off one wall and then the other, each bank a flash, a bang and a jolt;
// then the rope wraps tight as it slams into the total-income readout in a
// huge blast and shake, and the coins sweep into the total. Pays floor
// income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { measure, pointAlong, totalSpot } from "../../cashFlow";

const KEY = "bolas";
const REWARD = 4;
const COINS = 700;
const COIN = 0.8;
// the rope, ROPE of the screen's width (or height, if less) from wisp to
// wisp, THICK px across, paying out over OPEN of the flight and wrapping
// up over the last WRAP of it while the pair spins TURNS times
const ROPE = 0.32;
const THICK = 12;
const OPEN = 0.15;
const WRAP = 0.2;
const TURNS = 5;
// it banks off the walls INSET of the screen's width in from its sides, at
// these shares down the screen
const INSET = 0.12;
const BANKS = [0.55, 0.32];
const WISP = 0.05;
const BANK_BURST = 1;
const BANK_SHAKE = 1.8;

export const forceBolasEvent = registerWispEvent(
  KEY,
  "Bolas",
  () => CONFIG.bolasEvent.chance,
  (floor, context, area) => {
    const { flightMs, flowMs, holdMs, mergeMs } = CONFIG.bolasEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const rope = Math.min(width, height) * ROPE;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    const way = Math.random() < 0.5 ? 1 : -1;
    const banks: Point[] = BANKS.map((share, k) => ({
      x:
        (k % 2 === 0) === (way === 1)
          ? area.left + width * INSET
          : area.right - width * INSET,
      y: area.top + height * share,
    }));
    const route = [button, ...banks, fallback];
    const along = measure(route);
    const bankAt = banks.map(
      (_, k) => (flightMs * along[k + 1]) / along[along.length - 1],
    );
    // the pair's middle, half the rope between its wisps, and its turn, ms in
    const middle = (ms: number, into: Point): Point => {
      route[route.length - 1] = cover?.total() ?? fallback;
      return pointAlong(route, along, ms / flightMs, into);
    };
    const reach = (ms: number) => {
      const u = clamp01(ms / flightMs);
      return (rope / 2) * easeOut(clamp01(u / OPEN)) * clamp01((1 - u) / WRAP);
    };
    const turn = (ms: number) =>
      way * Math.PI * 2 * TURNS * clamp01(ms / flightMs) ** 1.5;
    const end = (side: number) => {
      const into = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms >= flightMs) return null;
        middle(ms, into);
        const a = turn(ms);
        into.x += side * Math.cos(a) * reach(ms);
        into.y += side * Math.sin(a) * reach(ms);
        return into;
      };
    };
    const ends = [end(1), end(-1)];

    // coins flowing back and forth along the rope
    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const s0 = Math.random();
      const dir = Math.random() < 0.5 ? 1 : -1;
      const lane = (Math.random() - 0.5) * THICK;
      return (f) => {
        const ms = f * flightMs;
        const s = ((((s0 + (dir * ms) / flowMs) % 1) + 1) % 1) * 2 - 1;
        const at = middle(ms, { x: 0, y: 0 });
        const a = turn(ms);
        const r = reach(ms) * s;
        return {
          x: at.x + Math.cos(a) * r - Math.sin(a) * lane,
          y: at.y + Math.sin(a) * r + Math.cos(a) * lane,
          scale: COIN,
        };
      };
    });

    const banking = createBeats(
      bankAt,
      (ms) => ms,
      (_, k) => {
        cover!.burst(banks[k], BANK_BURST);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BANK_SHAKE);
      },
    );
    const finale = createBeats(
      [flightMs],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: flightMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          banking.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const size = Math.max(WISP_SIZE, width * WISP);
          for (const at of ends)
            drawWispBetween(
              ctx,
              at,
              ms,
              now,
              size,
              clamp01(ms / flightMs),
              0,
              flightMs,
            );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, flightMs);
    playBoostEventStream();
  },
);
