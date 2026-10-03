// the "Ant Trail" event (mix; cash): it covers its crit, whose click
// freezes the screen while a trail of ant wisps marches out of the clicked
// floor's button and winds up the screen to the total-income readout,
// each ant hoisting a crumb of cash over its head, marching ever faster
// and thicker, every ant that reaches the total dumping its crumb with a
// pop and a jolt; the queen brings up the rear with a huge load that lands
// in a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { getButtonCenter } from "../upgradeButton";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { alongRoute } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { totalSpot } from "../cashFlow";

const KEY = "antTrail";
const REWARD = 4;
const ANTS = 26;
const CRUMB = 12;
const QUEEN_LOAD = 160;
const COIN = 0.4;
// the trail winds WIND px side to side through BENDS bends; crumbs ride
// HOIST px over their ants
const WIND = 90;
const BENDS = 5;
const HOIST = 12;
const ANT = 0.22;
const QUEEN = 0.6;
const DUMP_SHAKE = 0.25;

export const forceAntTrailEvent = registerWispEvent(
  KEY,
  "Ant Trail",
  () => CONFIG.antTrailEvent.chance,
  (floor, context, area) => {
    const { marchMs, travelMs, holdMs, mergeMs } = CONFIG.antTrailEvent;
    const total0 = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const route: Point[] = [button];
    for (let i = 1; i <= BENDS; i++) {
      const u = i / (BENDS + 1);
      route.push({
        x: lerp([button.x, total0.x], u) + (i % 2 === 0 ? WIND : -WIND),
        y: lerp([button.y, total0.y], u),
      });
    }
    route.push(total0);
    // ants set off ever closer together; the queen last
    const ants = Array.from({ length: ANTS + 1 }, (_, k) => {
      const queen = k === ANTS;
      const leaves = marchMs * Math.sqrt(k / ANTS);
      return { queen, leaves, arrives: leaves + travelMs };
    });
    const queen = ants[ANTS];
    const endAt = queen.arrives;
    const antAt = (leaves: number, ms: number, into: Point) => {
      route[route.length - 1] = cover?.total() ?? total0;
      return alongRoute(route, Math.min(1, (ms - leaves) / travelMs), into);
    };

    const paths: CoinPath[] = [];
    for (const ant of ants) {
      const count = ant.queen ? QUEEN_LOAD : CRUMB;
      const spread = ant.queen ? 22 : 5;
      for (let i = 0; i < count; i++) {
        const ox = (Math.random() - 0.5) * spread * 2;
        const oy = -HOIST - Math.random() * spread;
        const at: Point = { x: 0, y: 0 };
        paths.push((f) => {
          const ms = f * endAt;
          if (ms < ant.leaves) return { x: button.x, y: button.y, scale: 0 };
          antAt(ant.leaves, ms, at);
          return { x: at.x + ox, y: at.y + oy, scale: COIN };
        });
      }
    }
    const antWisps = ants.map((ant) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null =>
        ms < ant.leaves || ms >= ant.arrives ? null : antAt(ant.leaves, ms, at);
    });

    const dumping = createBeats(
      ants,
      (a) => a.arrives,
      (a, k) => {
        const total = cover!.total() ?? total0;
        if (a.queen) {
          cover!.blast(total);
          return;
        }
        if (!cover!.isLive() || k % 3 !== 0) return;
        playBloop();
        shakeScreen(DUMP_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => dumping.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          ants.forEach((ant, k) => {
            if (ant.queen)
              drawWispBetween(
                ctx,
                antWisps[k],
                ms,
                now,
                WISP_SIZE * QUEEN,
                0.8,
                ant.leaves,
                ant.arrives,
              );
            else drawWispHead(ctx, antWisps[k], ms, now, WISP_SIZE * ANT);
          });
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
