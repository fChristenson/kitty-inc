// the "Gold Rush" event (mix; free hires and cash): it covers its crit,
// whose click freezes the screen while cash pours out of the clicked
// floor's button into a great pan of cash low in the middle of the screen,
// swirled round and sloshed side to side harder and harder like a
// prospector panning for gold; one after another big gold nugget wisps
// rise out of it and are flicked in high arcs onto the empty spots, each
// landing in a flash and a jolt as a new worker forms; then the pan
// tips the rest into the total in a huge blast and shake. Pays floor
// income × floor number × REWARD, plus the hires
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { hops, type BouncePath } from "../../../../shared/bounce";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";
import { totalSpot } from "../../cashFlow";

const KEY = "goldRush";
const REWARD = 2;
const MAX_HIRES = 6;
const COINS = 500;
const COIN = 0.5;
const LOW = 0.68;
const PAN = 130;
const SLOSH: [number, number] = [10, 60];
const SWIRL: [number, number] = [0.5, 2];
const JOIN_MS = 300;
const LIFT = 200;
const NUGGET = 0.6;
const FORM_MS = 300;
const HIT_SHAKE: [number, number] = [0.5, 1.2];

interface Nugget {
  hire: RewardHire;
  path: BouncePath;
}

export const forceGoldRushEvent = registerWispEvent(
  KEY,
  "Gold Rush",
  () => CONFIG.goldRushEvent.chance,
  (floor, context, area) => {
    const { panMs, flicksMs, flightMs, holdMs, mergeMs } = CONFIG.goldRushEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const pan: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * LOW,
    };
    let clock = panMs;
    const flicks = hires.map((_, k) => {
      const ms = clock;
      clock += lerp(flicksMs, k / Math.max(1, hires.length - 1));
      return ms;
    });
    const tipsAt = flicks[flicks.length - 1] + flightMs;
    const travel = tipsAt + 500;
    const span = tipsAt / 1000;
    const swirlAt = (ms: number) => {
      const t = Math.min(Math.max(0, ms), tipsAt) / 1000;
      return (
        Math.PI *
        2 *
        (SWIRL[0] * t + ((SWIRL[1] - SWIRL[0]) * t * t) / (2 * span))
      );
    };
    const sloshAt = (ms: number) =>
      Math.sin(ms * 0.012) * lerp(SLOSH, clamp01(ms / tipsAt));
    const nuggets: Nugget[] = hires.map((hire, k) => ({
      hire,
      path: hops(
        [pan, { x: hire.x, y: hire.y }],
        [flightMs, flightMs],
        [LIFT, LIFT],
        flicks[k],
      ),
    }));
    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const r = PAN * Math.sqrt(Math.random());
      const a0 = Math.random() * Math.PI * 2;
      const joins = (i / COINS) * panMs * 0.8;
      const leaves = tipsAt + Math.random() * 150;
      const spot: Point = { x: 0, y: 0 };
      const inPan = (ms: number) => {
        const a = a0 + swirlAt(ms) * (1.2 - r / PAN);
        spot.x = pan.x + Math.cos(a) * r + sloshAt(ms);
        spot.y = pan.y + Math.sin(a) * r * 0.35;
        return spot;
      };
      return (f) => {
        const ms = f * travel;
        if (ms < joins) return { x: button.x, y: button.y, scale: 0 };
        if (ms < joins + JOIN_MS) {
          const p = inPan(ms);
          const u = easeOut((ms - joins) / JOIN_MS);
          return {
            x: lerp([button.x, p.x], u),
            y: lerp([button.y, p.y], u),
            scale: COIN,
          };
        }
        const p = inPan(Math.min(ms, leaves));
        if (ms < leaves) return { x: p.x, y: p.y, scale: COIN };
        const u = easeIn(clamp01((ms - leaves) / (travel - leaves)));
        return {
          x: lerp([p.x, total.x], u),
          y: lerp([p.y, total.y], u),
          scale: COIN,
        };
      };
    });
    const order = nuggets.slice().sort((a, b) => a.path.endMs - b.path.endMs);
    const last = order[order.length - 1];

    const flicking = createBeats(
      nuggets,
      (n) => n.path.startMs,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      order,
      (n) => n.path.endMs,
      (n, k) => {
        giveHire(n.hire);
        const at = n.path.bounces[0].at;
        if (n === last) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, order.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          flicking.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms < 0 || ms > tipsAt + 300) return;
          for (const n of nuggets)
            drawWispBetween(
              ctx,
              n.path.at,
              ms,
              now,
              WISP_SIZE * NUGGET,
              1,
              n.path.startMs - 120,
              n.path.endMs,
            );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
