// the "Gobbler" event (wisp; cash): it covers its crit, whose click
// freezes the screen while rows of little glowing pellets light up across
// it in a maze-like zigzag, a big power pellet at every corner; a wisp
// darts out of the clicked floor's button and gobbles its way along the
// rows like an arcade chomper, ever faster, every pellet a blip and a pop
// of coins, every power pellet a flash, a bang and a jolt; it gobbles the
// last power pellet in a huge blast and shake. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { ringTargets } from "../../shared/coinTargets";

const KEY = "gobbler";
const REWARD = 4;
// rows run down ROWS of the screen, EDGE px in from its sides, a pellet
// every GAP px; the chomper speeds up by PACE
const ROWS = [0.78, 0.58, 0.38, 0.18];
const EDGE = 40;
const GAP = 46;
const PACE = 1.5;
const CHOMPER = 0.75;
const PELLET = 0.16;
const POWER = 0.42;
const BITE_COINS = 2;
const BITE: [number, number] = [10, 40];
const POWER_COINS = 12;
const POWER_REACH: [number, number] = [40, 130];
const POWER_SHAKE: [number, number] = [0.7, 1.4];

export const forceGobblerEvent = registerWispEvent(
  KEY,
  "Gobbler",
  () => CONFIG.gobblerEvent.chance,
  (floor, context, area) => {
    const { runMs, holdMs, mergeMs } = CONFIG.gobblerEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const height = area.bottom - area.top;
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const ys = ROWS.map((r) => area.top + height * r);
    const route: Point[] = [button, { x: button.x, y: ys[0] }];
    ys.forEach((y, k) => {
      const [a, b] = k % 2 === 0 ? [right, left] : [left, right];
      if (k > 0) route.push({ x: a, y });
      route.push({ x: b, y });
    });
    const legs = route.slice(1).map((to, i) => {
      const from = route[i];
      return { from, to, length: Math.hypot(to.x - from.x, to.y - from.y) };
    });
    const total = legs.reduce((sum, l) => sum + l.length, 0);
    const reachedAt = (d: number) => runMs * (d / total) ** (1 / PACE);
    const chomperAt: Point = { x: 0, y: 0 };
    const chomper = (ms: number): Point | null => {
      if (ms < 0 || ms > runMs) return null;
      let d = total * (ms / runMs) ** PACE;
      for (const leg of legs) {
        if (d <= leg.length) {
          const u = d / (leg.length || 1);
          chomperAt.x = lerp([leg.from.x, leg.to.x], u);
          chomperAt.y = lerp([leg.from.y, leg.to.y], u);
          return chomperAt;
        }
        d -= leg.length;
      }
      return legs[legs.length - 1].to;
    };
    // pellets along every leg after the first; power pellets at its corners
    const pellets: {
      at: Point;
      eaten: number;
      power: boolean;
      spot: () => Point;
    }[] = [];
    let walked = legs[0].length;
    legs.slice(1).forEach((leg, i) => {
      const count = Math.max(1, Math.floor(leg.length / GAP));
      for (let j = 1; j <= count; j++) {
        const u = j / count;
        const at = {
          x: lerp([leg.from.x, leg.to.x], u),
          y: lerp([leg.from.y, leg.to.y], u),
        };
        pellets.push({
          at,
          eaten: reachedAt(walked + leg.length * u),
          // the end of each row
          power: j === count && i % 2 === 0,
          spot: () => at,
        });
      }
      walked += leg.length;
    });
    const last = pellets[pellets.length - 1];
    last.power = true;
    const endAt = runMs;

    const gobbling = createBeats(
      pellets,
      (p) => p.eaten,
      (p, k) => {
        if (p === last) {
          cover!.blast(p.at);
          return;
        }
        if (p.power) {
          cover!.burst(p.at, 0.6);
          cover!.launchFrom(p.at, ringTargets(p.at, POWER_COINS, POWER_REACH));
          if (!cover!.isLive()) return;
          playExplosion();
          shakeScreen(lerp(POWER_SHAKE, k / pellets.length));
          return;
        }
        cover!.launchFrom(p.at, ringTargets(p.at, BITE_COINS, BITE));
        if (cover!.isLive() && k % 2 === 0) playBloop();
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => gobbling.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          for (const p of pellets)
            if (ms < p.eaten)
              drawWispHead(
                ctx,
                p.spot,
                ms,
                now,
                WISP_SIZE * (p.power ? POWER : PELLET),
              );
          drawWispBetween(
            ctx,
            chomper,
            ms,
            now,
            WISP_SIZE * CHOMPER,
            0.9,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
