// the "Cartwheel" event (wisp; cash): it covers its crit, whose click
// freezes the screen while a wheel of six wisps round a blazing hub springs
// out of the clicked floor's button and cartwheels across the screen in
// great bounding hops, spinning as it rolls, side to side and ever higher
// and faster; every landing a thump, a jolt and coins flung off its rim;
// the last bound carries it into the total, where it flies apart in a huge
// blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";
import { totalSpot } from "../../cashFlow";

const KEY = "cartwheel";
const REWARD = 4;
const SPOKES = 6;
// the wheel is RADIUS px round, bounding LOFT px over the higher end of
// each hop, landing HOPS times on its way up the screen
const RADIUS = 60;
const LOFT = 170;
const HOPS = 5;
const SPOKE = 0.45;
const HUB = 0.8;
const FLING_COINS = 16;
const FLING: [number, number] = [60, 200];
const LAND_SHAKE: [number, number] = [0.6, 1.4];

export const forceCartwheelEvent = registerWispEvent(
  KEY,
  "Cartwheel",
  () => CONFIG.cartwheelEvent.chance,
  (floor, context, area) => {
    const { hopsMs, holdMs, mergeMs } = CONFIG.cartwheelEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    // landing spots side to side, climbing toward the total
    const spots: Point[] = Array.from({ length: HOPS }, (_, k) => ({
      x: area.left + width * (k % 2 === 0 ? 0.2 : 0.8),
      y: lerp(
        [area.bottom - 0.15 * height, area.top + 0.4 * height],
        k / (HOPS - 1),
      ),
    }));
    let clock = 0;
    const hops = [...spots, fallback].map((to, k) => {
      const from = k === 0 ? button : spots[k - 1];
      const starts = clock;
      clock += lerp(hopsMs, k / HOPS);
      return {
        from,
        to,
        bow: { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - LOFT },
        starts,
        lands: clock,
      };
    });
    const endAt = clock;
    const hub: Point = { x: 0, y: 0 };
    let hubAt = -1;
    // the hub's spot and the wheel's turn at ms, shared by every spoke
    let turn = 0;
    const roll = (ms: number) => {
      if (ms === hubAt) return;
      hubAt = ms;
      let k = 0;
      while (k < hops.length - 1 && ms > hops[k].lands) k++;
      const h = hops[k];
      const u = clamp01((ms - h.starts) / (h.lands - h.starts));
      bezier(h.from, h.bow, h.to, u, hub);
      // it turns its rolled distance over its radius, the way it's going
      turn = (hub.x - button.x) / RADIUS;
    };
    const spokes = Array.from({ length: SPOKES }, (_, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms > endAt) return null;
        roll(ms);
        const a = turn + (i / SPOKES) * Math.PI * 2;
        const r = RADIUS * Math.min(1, ms / 150);
        at.x = hub.x + Math.cos(a) * r;
        at.y = hub.y + Math.sin(a) * r;
        return at;
      };
    });
    const hubPoint: Point = { x: 0, y: 0 };
    const hubWisp = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      roll(ms);
      hubPoint.x = hub.x;
      hubPoint.y = hub.y;
      return hubPoint;
    };

    const landing = createBeats(
      hops.slice(0, -1),
      (h) => h.lands,
      (h, k) => {
        cover!.launchFrom(h.to, ringTargets(h.to, FLING_COINS, FLING));
        cover!.burst(h.to, 0.4 + 0.1 * k);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / (HOPS - 1)));
      },
    );
    const finishing = createBeats(
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
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / endAt);
          for (const spoke of spokes)
            drawWispBetween(
              ctx,
              spoke,
              ms,
              now,
              WISP_SIZE * SPOKE,
              heat,
              0,
              endAt,
            );
          drawWispBetween(
            ctx,
            hubWisp,
            ms,
            now,
            WISP_SIZE * HUB,
            heat,
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
