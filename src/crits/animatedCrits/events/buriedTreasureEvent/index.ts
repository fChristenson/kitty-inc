// the "Buried Treasure" event (an experiment beyond the seven looks: a pirate
// treasure hunt; cash): it covers its crit, whose click freezes the screen
// while a dotted trail of glinting wisps winds across the screen from the
// clicked floor's button to a spot marked with a cross of light; a digger
// wisp follows the trail, each step a tick, then digs at the cross in hard
// thumps, each a burst and a jolt, until it strikes the treasure: a geyser
// of cash erupts out of the ground in a huge blast and shake and gushes up
// into the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "buriedTreasure";
const REWARD = 4;
const EDGE = 90;
const DOTS = 10;
const DOT = 0.14;
const CROSS = 30;
const CROSS_W = 8;
const DIGS = 3;
const DIGGER = 0.5;
const DIG_SHAKE: [number, number] = [0.6, 1.2];

export const forceBuriedTreasureEvent = registerWispEvent(
  KEY,
  "Buried Treasure",
  () => CONFIG.buriedTreasureEvent.chance,
  (floor, context, area) => {
    const { walkMs, digsMs, gushMs, holdMs, mergeMs } =
      CONFIG.buriedTreasureEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const h = area.bottom - area.top;
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const x: Point = {
      x: lerp([left, right], 0.3 + 0.4 * Math.random()),
      y: area.top + h * 0.7,
    };
    const route: Point[] = [
      button,
      { x: left, y: area.top + h * 0.45 },
      { x: right, y: area.top + h * 0.55 },
      x,
    ];
    const dots = Array.from({ length: DOTS }, (_, i) => {
      const spot = {
        ...alongRoute(route, (i + 1) / (DOTS + 1), { x: 0, y: 0 }),
      };
      return { spot, at: () => spot, passes: walkMs * ((i + 1) / (DOTS + 1)) };
    });
    const digs = Array.from(
      { length: DIGS },
      (_, i) => walkMs + lerp(digsMs, i / (DIGS - 1)) * (i + 1),
    );
    const strikeAt = digs[DIGS - 1];
    const total = totalSpot(area);
    const geyser = sampleLine(
      (u) => ({ x: lerp([x.x, total.x], u * u), y: lerp([x.y, total.y], u) }),
      30,
    );
    const gush: Pour = {
      coinsAlong: 1_200,
      width: 56,
      streamMs: gushMs,
      travelMs: gushMs * 0.7,
    };
    const endAt = strikeAt;
    const durationMs = Math.max(
      pourDurationMs(strikeAt, gush),
      endAt + holdMs + mergeMs,
    );
    const crossArms = [
      [
        { x: x.x - CROSS, y: x.y - CROSS },
        { x: x.x + CROSS, y: x.y + CROSS },
      ],
      [
        { x: x.x + CROSS, y: x.y - CROSS },
        { x: x.x - CROSS, y: x.y + CROSS },
      ],
    ] as [Point, Point][];
    const diggerAt: Point = { x: 0, y: 0 };
    const digger = (ms: number): Point => {
      if (ms < walkMs) return alongRoute(route, clamp01(ms / walkMs), diggerAt);
      let lastDig: number = walkMs;
      let nextDig = digs[0];
      for (const d of digs) {
        if (ms < d) {
          nextDig = d;
          break;
        }
        lastDig = d;
      }
      const u = clamp01((ms - lastDig) / Math.max(1, nextDig - lastDig));
      diggerAt.x = x.x;
      diggerAt.y = x.y - 30 - Math.sin(Math.PI * u) * 50;
      return diggerAt;
    };

    const stepping = createBeats(
      dots,
      (d) => d.passes,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const digging = createBeats(
      digs.slice(0, -1),
      (ms) => ms,
      (_, k) => {
        cover!.burst(x, 0.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(DIG_SHAKE, k / Math.max(1, DIGS - 2)));
      },
    );
    const striking = createBeats(
      [strikeAt],
      (ms) => ms,
      () => {
        pourLine(cover!, geyser, gush);
        cover!.blast(x);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          stepping.tick(ms, now);
          digging.tick(ms, now);
          striking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const show = clamp01(ms / 200);
          for (const [a, b] of crossArms)
            drawBeam(ctx, a, b, CROSS_W, 0.8 * show);
          for (const d of dots)
            drawWispBetween(
              ctx,
              d.at,
              ms,
              now,
              WISP_SIZE * DOT,
              0.3,
              0,
              d.passes,
            );
          drawWispBetween(
            ctx,
            digger,
            ms,
            now,
            WISP_SIZE * DIGGER,
            0.8,
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
