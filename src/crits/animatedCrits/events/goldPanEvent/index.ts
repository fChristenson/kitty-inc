// the "Gold Pan" event (mix; free hires and cash): it covers its crit,
// whose click freezes the screen while the clicked floor's button pours
// cash into a wide shallow pan in the middle of the screen and a wisp
// starts swirling it like a prospector, the cash sloshing round faster and
// faster; nugget wisps are flicked out of it one after another, each
// sailing onto an empty spot on a floor in view, where it lands with a pop
// and a jolt as a new worker; then the whole pan is tossed into the total
// in a huge blast and shake. Pays floor income × floor number × REWARD,
// plus the hires
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "goldPan";
const REWARD = 2;
const MAX_HIRES = 5;
const FORM_MS = 300;
const COINS = 800;
const COIN = 0.42;
// the pan is PAN of the screen's width round, seen FLAT, at LOW of the way
// down; it swirls SWIRL px round, the cash sloshing at SLOSH laps a second
const PAN = 0.32;
const FLAT = 0.35;
const LOW = 0.6;
const SWIRL = 22;
const SLOSH = 0.8;
const FLICK_MS = 380;
const LOFT = 120;
const PROSPECTOR = 0.55;
const NUGGET = 0.4;
const SURGE_SPREAD = 220;
const LAND_SHAKE: [number, number] = [0.5, 1.2];

export const forceGoldPanEvent = registerWispEvent(
  KEY,
  "Gold Pan",
  () => CONFIG.goldPanEvent.chance,
  (floor, context, area) => {
    const { pourMs, gapsMs, flightMs, holdMs, mergeMs } = CONFIG.goldPanEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const pan: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * LOW,
    };
    const radius = (area.right - area.left) * PAN;
    let clock: number = pourMs;
    const nuggets = hires.map((hire, k) => {
      clock += lerp(gapsMs, k / Math.max(1, hires.length - 1));
      const flicks = clock;
      const spot: Point = { x: hire.x, y: hire.y - 30 };
      const ctrl: Point = {
        x: (pan.x + spot.x) / 2,
        y: Math.min(pan.y, spot.y) - LOFT,
      };
      const at: Point = { x: 0, y: 0 };
      return {
        hire,
        spot,
        flicks,
        lands: flicks + FLICK_MS,
        at: (ms: number): Point | null =>
          ms < flicks || ms >= flicks + FLICK_MS
            ? null
            : bezier(pan, ctrl, spot, easeOut((ms - flicks) / FLICK_MS), at),
      };
    });
    const tossAt = nuggets[nuggets.length - 1].lands;
    const endAt = tossAt + SURGE_SPREAD + flightMs;
    // swirling ever faster
    const swirlTurn = (ms: number) => {
      const t = Math.max(0, ms - pourMs * 0.5) / 1000;
      return Math.PI * 2 * SLOSH * t * (1 + t);
    };

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const r = radius * Math.sqrt(Math.random());
      const phase = Math.random() * Math.PI * 2;
      const poured = Math.random() * pourMs * 0.7;
      const leaves = tossAt + Math.random() * SURGE_SPREAD;
      const from: Point = { x: 0, y: 0 };
      const lift: Point = { x: 0, y: 0 };
      const at: Point = { x: 0, y: 0 };
      const place = (ms: number, into: Point) => {
        const turn = swirlTurn(ms);
        // the slosh lags further behind at the rim
        const a = phase + turn * (1 - (0.4 * r) / radius);
        into.x = pan.x + Math.cos(turn) * SWIRL + Math.cos(a) * r;
        into.y = pan.y + Math.sin(turn) * SWIRL * FLAT + Math.sin(a) * r * FLAT;
        return into;
      };
      return (f) => {
        const ms = f * endAt;
        if (ms < poured) return { x: button.x, y: button.y, scale: 0 };
        place(ms, at);
        if (ms < poured + pourMs * 0.3) {
          const p = easeOut((ms - poured) / (pourMs * 0.3));
          return {
            x: lerp([button.x, at.x], p),
            y: lerp([button.y, at.y], p),
            scale: COIN,
          };
        }
        if (ms < leaves) return { x: at.x, y: at.y, scale: COIN };
        place(leaves, from);
        lift.x = from.x;
        lift.y = from.y - 120;
        const total = cover?.total() ?? fallback;
        bezier(
          from,
          lift,
          total,
          easeIn(clamp01((ms - leaves) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });
    const prospectorAt: Point = { x: 0, y: 0 };
    const prospector = (ms: number): Point | null => {
      if (ms > tossAt) return null;
      const turn = swirlTurn(ms);
      const u = easeOut(clamp01(ms / pourMs));
      prospectorAt.x =
        lerp([button.x, pan.x + radius + 20], u) + Math.cos(turn) * SWIRL;
      prospectorAt.y =
        lerp([button.y, pan.y], u) + Math.sin(turn) * SWIRL * FLAT;
      return prospectorAt;
    };

    const landing = createBeats(
      nuggets,
      (n) => n.lands,
      (n, k) => {
        giveHire(n.hire);
        cover!.burst(n.spot, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, nuggets.length - 1)));
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
          landing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt) return;
          drawWispBetween(
            ctx,
            prospector,
            ms,
            now,
            WISP_SIZE * PROSPECTOR,
            0.6,
            0,
            tossAt,
          );
          for (const n of nuggets)
            drawWispBetween(
              ctx,
              n.at,
              ms,
              now,
              WISP_SIZE * NUGGET,
              1,
              n.flicks,
              n.lands,
            );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
