// the "Magic Carpet" event (mix; cash): it covers its crit, whose click
// freezes the screen while a wisp rises off the clicked floor's button on a
// flying carpet woven of cash that unrolls under it, rippling from front to
// back, and swoops it round the screen in big dips and climbs, ever faster,
// every dip a whoosh, a jolt and coins spilling off its trailing edge; then
// it dives into the total and the carpet piles in after it in a huge blast
// and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
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
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "magicCarpet";
const REWARD = 4;
// the carpet is COLS x ROWS coins, LENGTH x WIDTH px, rippling RIPPLE px in
// WAVES waves front to back; its back edge lags the rider by LAG ms
const COLS = 44;
const ROWS = 16;
const LENGTH = 300;
const WIDTH = 110;
const RIPPLE = 14;
const WAVES = 2;
const LAG = 160;
const COIN = 0.55;
// the rider sits RIDE px over the carpet's front
const RIDE = 30;
const SWOOPS = 3;
const SPILL_COINS = 14;
const DIP_SHAKE: [number, number] = [0.6, 1.3];

export const forceMagicCarpetEvent = registerWispEvent(
  KEY,
  "Magic Carpet",
  () => CONFIG.magicCarpetEvent.chance,
  (floor, context, area) => {
    const { unrollMs, flyMs, pileMs, holdMs, mergeMs } =
      CONFIG.magicCarpetEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    // swoops alternating side to side down and up the screen, then the total
    const swoops: Point[] = Array.from({ length: SWOOPS }, (_, k) => ({
      x: area.left + width * (k % 2 === 0 ? 0.2 : 0.8),
      y: area.top + height * (0.3 + 0.45 * Math.random()),
    }));
    const route: Point[] = [button, ...swoops, fallback];
    const endAt = flyMs + pileMs;
    const share = (ms: number) => {
      const t = clamp01(ms / flyMs);
      return 0.35 * t + 0.65 * t * t;
    };
    const ride = (ms: number, into: Point): Point =>
      alongRoute(route, share(ms), into);

    const front: Point = { x: 0, y: 0 };
    const back: Point = { x: 0, y: 0 };
    let framed = -1;
    // the carpet's front and back at ms, shared by every coin that frame
    const frame = (ms: number) => {
      if (ms === framed) return;
      framed = ms;
      ride(ms, front);
      ride(Math.max(0, ms - LAG), back);
    };
    const paths: CoinPath[] = [];
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < ROWS; r++) {
        // u 0 at the front, 1 at the back; v across
        const u = c / (COLS - 1);
        const v = r / (ROWS - 1) - 0.5;
        const at: Point = { x: 0, y: 0 };
        const start: Point = { x: 0, y: 0 };
        // the back of the carpet piles in last
        const piles = flyMs + u * pileMs * 0.6;
        const place = (ms: number, into: Point) => {
          frame(ms);
          const unrolled = easeOut(clamp01(ms / unrollMs));
          let dx = back.x - front.x;
          let dy = back.y - front.y;
          let d = Math.hypot(dx, dy);
          // trailing straight down until it's moving
          if (d < 1) {
            dx = 0;
            dy = 1;
            d = 1;
          }
          const reach = LENGTH * u * unrolled;
          const ripple =
            Math.sin(u * WAVES * Math.PI * 2 - ms * 0.012) * RIPPLE * u;
          // sideways across the carpet, seen from a tilt
          into.x = front.x + (dx / d) * reach - (dy / d) * v * WIDTH * 0.35;
          into.y =
            front.y + RIDE + (dy / d) * reach + v * WIDTH * 0.35 + ripple;
          return into;
        };
        paths.push((f) => {
          const ms = f * endAt;
          if (ms < piles) {
            place(Math.min(ms, flyMs), at);
            return { x: at.x, y: at.y, scale: COIN };
          }
          place(flyMs, start);
          const total = cover?.total() ?? fallback;
          const k = easeIn(clamp01((ms - piles) / (pileMs * 0.4)));
          return {
            x: lerp([start.x, total.x], k),
            y: lerp([start.y, total.y], k),
            scale: COIN,
          };
        });
      }
    const riderAt: Point = { x: 0, y: 0 };
    const rider = (ms: number): Point | null =>
      ms < 0 || ms > flyMs ? null : ride(ms, riderAt);

    // it passes each swoop when share() reaches its place on the route
    const dips = swoops.map((at, k) => {
      const u = (k + 1) / (route.length - 1);
      return { at, ms: flyMs * ((-0.35 + Math.sqrt(0.1225 + 2.6 * u)) / 1.3) };
    });
    const dipping = createBeats(
      dips,
      (d) => d.ms,
      (d, k) => {
        cover!.launchFrom(
          d.at,
          Array.from({ length: SPILL_COINS }, () => ({
            x: d.at.x + (Math.random() * 2 - 1) * 160,
            y: d.at.y + 60 + Math.random() * 160,
          })),
        );
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(DIP_SHAKE, k / Math.max(1, dips.length - 1)));
      },
    );
    const piling = createBeats(
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
          dipping.tick(ms, now);
          piling.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            rider,
            ms,
            now,
            WISP_SIZE,
            clamp01(ms / flyMs),
            0,
            flyMs,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
