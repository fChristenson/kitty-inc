// the "Scoops" event (mix; free hires and cash): it covers its crit, whose
// click freezes the screen while cash pours out of the clicked floor's
// button into a heaped tub low in the middle of the screen; a scooper wisp
// dives into it and comes up with a ball of cash, flinging it in a high arc
// onto an empty spot where it splats in a flash and a jolt as a new worker
// forms, scoop after scoop, quicker each time; then the rest of the tub
// pours into the total in a huge blast and shake. Pays floor income × floor
// number × REWARD, plus the hires
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
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
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";
import { totalSpot } from "../../cashFlow";

const KEY = "scoops";
const REWARD = 2;
const MAX_HIRES = 6;
const PER_SCOOP = 30;
const TUB_COINS = 300;
const COIN = 0.5;
const LOW = 0.72;
const TUB_W = 150;
const TUB_H = 70;
const BALL = 26;
const LIFT_MS = 140;
const RISE = 120;
const ARC = 160;
const SPLAT = 50;
const JOIN_MS = 260;
const SCOOPER = 0.5;
const FORM_MS = 300;
const HIT_SHAKE: [number, number] = [0.5, 1.2];

interface Scoop {
  hire: RewardHire;
  dips: number;
  throws: number;
  lands: number;
  to: Point;
}

export const forceScoopsEvent = registerWispEvent(
  KEY,
  "Scoops",
  () => CONFIG.scoopsEvent.chance,
  (floor, context, area) => {
    const { fillMs, scoopsMs, flightMs, holdMs, mergeMs } = CONFIG.scoopsEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const tub: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * LOW,
    };
    const lifted: Point = { x: tub.x, y: tub.y - TUB_H - RISE };
    let clock = fillMs;
    const scoops: Scoop[] = hires.map((hire, k) => {
      const dips = clock;
      clock += lerp(scoopsMs, k / Math.max(1, hires.length - 1));
      const throws = dips + LIFT_MS;
      return {
        hire,
        dips,
        throws,
        lands: throws + flightMs,
        to: { x: hire.x, y: hire.y },
      };
    });
    const last = scoops[scoops.length - 1];
    const drainsAt = last.lands;
    const travel = drainsAt + 500;
    // a ball of cash flown from the lift point to its spot in a high arc
    const ballAt = (s: Scoop, ms: number, into: Point): Point => {
      const u = clamp01((ms - s.throws) / flightMs);
      into.x = lerp([lifted.x, s.to.x], u);
      into.y = lerp([lifted.y, s.to.y], u) - 4 * ARC * u * (1 - u);
      return into;
    };
    const count = scoops.length * PER_SCOOP + TUB_COINS;
    const paths: CoinPath[] = Array.from({ length: count }, (_, i) => {
      const scoop =
        i < scoops.length * PER_SCOOP
          ? scoops[Math.floor(i / PER_SCOOP)]
          : null;
      // heaped in the tub, a dome higher in the middle
      const u = Math.random() * 2 - 1;
      const heap: Point = {
        x: tub.x + u * TUB_W,
        y: tub.y - Math.random() * TUB_H * Math.sqrt(1 - u * u),
      };
      const joins = Math.random() * fillMs * 0.8;
      const a = Math.random() * Math.PI * 2;
      const r = BALL * Math.sqrt(Math.random());
      const dx = Math.cos(a) * r;
      const dy = Math.sin(a) * r;
      const spot: Point = { x: 0, y: 0 };
      const leaves = drainsAt + Math.random() * 150;
      return (f) => {
        const ms = f * travel;
        if (ms < joins) return { x: button.x, y: button.y, scale: 0 };
        if (ms < joins + JOIN_MS) {
          const t = easeOut((ms - joins) / JOIN_MS);
          return {
            x: lerp([button.x, heap.x], t),
            y: lerp([button.y, heap.y], t) - Math.sin(Math.PI * t) * 80,
            scale: COIN,
          };
        }
        const jiggle = Math.sin(ms * 0.02 + a) * 2;
        if (scoop) {
          if (ms < scoop.dips)
            return { x: heap.x + jiggle, y: heap.y, scale: COIN };
          if (ms < scoop.throws) {
            const t = easeOut((ms - scoop.dips) / LIFT_MS);
            return {
              x: lerp([heap.x, lifted.x + dx], t),
              y: lerp([heap.y, lifted.y + dy], t),
              scale: COIN,
            };
          }
          if (ms < scoop.lands) {
            const p = ballAt(scoop, ms, spot);
            return { x: p.x + dx, y: p.y + dy, scale: COIN };
          }
          // splatted out round the spot
          const t = easeOut(clamp01((ms - scoop.lands) / 200));
          return {
            x: scoop.to.x + dx * (1 + (SPLAT / BALL) * t),
            y: scoop.to.y + dy * (1 + (SPLAT / BALL) * t),
            scale: COIN,
          };
        }
        if (ms < leaves) return { x: heap.x + jiggle, y: heap.y, scale: COIN };
        const t = easeIn(clamp01((ms - leaves) / (travel - leaves)));
        return {
          x: lerp([heap.x, total.x], t),
          y: lerp([heap.y, total.y], t),
          scale: COIN,
        };
      };
    });
    const scooper: Point = { x: 0, y: 0 };
    const scooperAt = (ms: number): Point => {
      // dipping into the tub for each scoop, then lifting the ball up
      let s = scoops[0];
      for (const sc of scoops) if (ms >= sc.dips - 160) s = sc;
      if (ms < s.dips) {
        const t = easeIn(clamp01((ms - (s.dips - 160)) / 160));
        scooper.x = tub.x;
        scooper.y = lerp([lifted.y, tub.y - TUB_H * 0.5], t);
      } else {
        const t = easeOut(clamp01((ms - s.dips) / LIFT_MS));
        scooper.x = tub.x;
        scooper.y = lerp([tub.y - TUB_H * 0.5, lifted.y], t);
      }
      return scooper;
    };

    const throwing = createBeats(
      scoops,
      (s) => s.throws,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      scoops,
      (s) => s.lands,
      (s, k) => {
        giveHire(s.hire);
        if (s === last) {
          cover!.blast(s.to);
          return;
        }
        cover!.burst(s.to, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, scoops.length - 1)));
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
          throwing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms < 0 || ms > drainsAt + 300) return;
          drawWispBetween(
            ctx,
            scooperAt,
            ms,
            now,
            WISP_SIZE * SCOOPER,
            0.8,
            fillMs - 200,
            last.throws,
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
