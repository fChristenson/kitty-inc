// the "Air Hockey" event (an experiment beyond the seven looks: an air
// hockey table; cash): it covers its crit, whose click freezes the screen
// while two mallet wisps slide in to either side of the screen and a puck
// wisp drops out of the clicked floor's button between them; they smack it
// back and forth, every hit and every bank off the table's edge a flash, a
// clack, a jolt and a spray of coins, ever faster, until one smashes it
// straight into the far goal in a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { ringTargets } from "../../shared/coinTargets";

const KEY = "airHockey";
const REWARD = 4;
const HITS = 8;
const EDGE = 60;
const TOP = 0.35;
const BOTTOM = 0.8;
const DROP_MS = 250;
const MALLET = 0.6;
const PUCK = 0.4;
const COINS = 8;
const COIN_REACH: [number, number] = [25, 100];
const HIT_SHAKE: [number, number] = [0.3, 1.1];

export const forceAirHockeyEvent = registerWispEvent(
  KEY,
  "Air Hockey",
  () => CONFIG.airHockeyEvent.chance,
  (floor, context, area) => {
    const { shotsMs, holdMs, mergeMs } = CONFIG.airHockeyEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const h = area.bottom - area.top;
    const top = area.top + h * TOP;
    const bottom = area.top + h * BOTTOM;
    const sides = [area.left + EDGE, area.right - EDGE];
    const start: Point = {
      x: (sides[0] + sides[1]) / 2,
      y: (top + bottom) / 2,
    };
    // each shot: mallet to mallet, banking off the top or bottom rail midway
    const legs: {
      from: Point;
      to: Point;
      starts: number;
      ends: number;
      bank: boolean;
    }[] = [];
    let clock: number = DROP_MS;
    let at = start;
    for (let k = 0; k < HITS; k++) {
      const side = k % 2 === 0 ? 1 : 0;
      const shot = lerp(shotsMs, k / (HITS - 1));
      const final = k === HITS - 1;
      const hit: Point = {
        x: final ? (side ? area.right : area.left) : sides[side],
        y: lerp([top, bottom], Math.random()),
      };
      const rail: Point = {
        x: (at.x + hit.x) / 2,
        y: k % 2 === 0 ? top : bottom,
      };
      legs.push({
        from: at,
        to: rail,
        starts: clock,
        ends: clock + shot / 2,
        bank: true,
      });
      legs.push({
        from: rail,
        to: hit,
        starts: clock + shot / 2,
        ends: clock + shot,
        bank: false,
      });
      clock += shot;
      at = hit;
    }
    const goal = at;
    const endAt = clock;
    const puckAt: Point = { x: 0, y: 0 };
    const puck = (ms: number): Point => {
      if (ms < DROP_MS) {
        const u = easeOut(ms / DROP_MS);
        puckAt.x = lerp([button.x, start.x], u);
        puckAt.y = lerp([button.y, start.y], u);
        return puckAt;
      }
      let l = legs[0];
      for (const leg of legs) if (ms >= leg.starts) l = leg;
      const u = clamp01((ms - l.starts) / (l.ends - l.starts));
      puckAt.x = lerp([l.from.x, l.to.x], u);
      puckAt.y = lerp([l.from.y, l.to.y], u);
      return puckAt;
    };
    // each mallet tracks the puck's height on its side
    const mallets = sides.map((x, i) => {
      const m: Point = { x, y: 0 };
      return (ms: number): Point => {
        const p = puck(ms);
        m.x = x + (i === 0 ? -1 : 1) * 10;
        m.y = lerp([start.y, p.y], 0.8);
        return m;
      };
    });
    const hits = legs.filter((l) => l.ends < endAt);

    const hitting = createBeats(
      hits,
      (l) => l.ends,
      (l, k) => {
        cover!.launchFrom(l.to, ringTargets(l.to, COINS, COIN_REACH));
        cover!.burst(l.to, l.bank ? 0.2 : 0.35);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hits.length - 1)));
      },
    );
    const scoring = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(goal),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          hitting.tick(ms, now);
          scoring.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const m of mallets)
            drawWispBetween(ctx, m, ms, now, WISP_SIZE * MALLET, 0.5, 0, endAt);
          drawWispBetween(ctx, puck, ms, now, WISP_SIZE * PUCK, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
