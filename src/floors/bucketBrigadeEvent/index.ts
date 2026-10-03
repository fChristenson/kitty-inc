// the "Bucket Brigade" event (mix; cash): it covers its crit, whose click
// freezes the screen while a line of wisps zigzags up the screen from the
// clicked floor's button to the total-income readout like a bucket
// brigade; slug after slug of cash is scooped out of the button and tossed
// up the line from wisp to wisp in quick hops, ever faster, every one
// dumped into the total with a splash and a jolt; the last and biggest
// load lands in a huge blast and shake. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { totalSpot } from "../cashFlow";

const KEY = "bucketBrigade";
const REWARD = 4;
const HANDS = 6;
const LOADS = 7;
const PER_LOAD = 110;
const LAST_LOAD = 360;
const COIN = 0.5;
// the line zigzags ZIG px either side; loads hop HOP px up between hands,
// each coin up to SLOSH px off the load's middle
const ZIG = 70;
const HOP = 40;
const SLOSH = 16;
const HAND = 0.5;
const DUMP_SHAKE: [number, number] = [0.5, 1.1];

export const forceBucketBrigadeEvent = registerWispEvent(
  KEY,
  "Bucket Brigade",
  () => CONFIG.bucketBrigadeEvent.chance,
  (floor, context, area) => {
    const { lineUpMs, gapsMs, hopMs, holdMs, mergeMs } =
      CONFIG.bucketBrigadeEvent;
    const total0 = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    // the hands, button to total; the total itself is the last stop
    const hands: Point[] = Array.from({ length: HANDS }, (_, i) => {
      const u = (i + 1) / (HANDS + 1);
      return {
        x: lerp([button.x, total0.x], u) + (i % 2 === 0 ? -ZIG : ZIG),
        y: lerp([button.y, total0.y], u),
      };
    });
    const route: Point[] = [button, ...hands, total0];
    let clock: number = lineUpMs;
    const loads = Array.from({ length: LOADS }, (_, k) => {
      const scooped = clock;
      clock += lerp(gapsMs, k / (LOADS - 1));
      // later loads hop quicker
      const hop = hopMs * lerp([1, 0.6], k / (LOADS - 1));
      return { scooped, hop, dumped: scooped + hop * (HANDS + 1) };
    });
    const endAt = loads[LOADS - 1].dumped;
    const loadAt = (load: (typeof loads)[number], ms: number, into: Point) => {
      route[HANDS + 1] = cover?.total() ?? total0;
      const f = Math.min(
        HANDS + 1,
        Math.max(0, (ms - load.scooped) / load.hop),
      );
      const i = Math.min(HANDS, Math.floor(f));
      const u = f - i;
      into.x = lerp([route[i].x, route[i + 1].x], u);
      into.y =
        lerp([route[i].y, route[i + 1].y], u) - Math.sin(Math.PI * u) * HOP;
      return into;
    };

    const paths: CoinPath[] = [];
    loads.forEach((load, k) => {
      const count = k === LOADS - 1 ? LAST_LOAD : PER_LOAD;
      const slosh = k === LOADS - 1 ? SLOSH * 2 : SLOSH;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = slosh * Math.sqrt(Math.random());
        const at: Point = { x: 0, y: 0 };
        paths.push((f) => {
          const ms = f * endAt;
          if (ms < load.scooped) return { x: button.x, y: button.y, scale: 0 };
          loadAt(load, ms, at);
          return {
            x: at.x + Math.cos(angle) * r,
            y: at.y + Math.sin(angle) * r,
            scale: COIN,
          };
        });
      }
    });
    const handWisps = hands.map((spot, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const u = easeOut(Math.min(1, Math.max(0, ms - i * 50) / lineUpMs));
        at.x = lerp([button.x, spot.x], u);
        at.y = lerp([button.y, spot.y], u) + Math.sin(ms / 130 + i) * 3;
        return at;
      };
    });

    const dumping = createBeats(
      loads,
      (l) => l.dumped,
      (_, k) => {
        const total = cover!.total() ?? total0;
        if (k === LOADS - 1) {
          cover!.blast(total);
          return;
        }
        cover!.burst(total, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(DUMP_SHAKE, k / (LOADS - 1)));
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
          if (ms > endAt) return;
          for (const hand of handWisps)
            drawWispBetween(
              ctx,
              hand,
              ms,
              now,
              WISP_SIZE * HAND,
              0.5,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
