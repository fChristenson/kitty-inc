// the "Bug Zapper" event (lightning; free upgrade levels and a crit tier):
// it covers its crit, whose click freezes the screen while the clicked
// floor's income bar crackles into a bug zapper, arcs buzzing along it, and
// wisp bugs come buzzing in from every side, more and faster; each one that
// strays near gets zapped by a bolt off the bar in a crack, a pop and a jolt,
// the bar soaking up free levels; then a big fat bug blunders in and the
// zapper fries it with a colossal bolt, the bar jumping a crit tier in a
// huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "bugZapper";
const BUGS = 9;
// bugs are zapped up to NEAR px off the bar, buzzing BUZZ px side to side
const NEAR: [number, number] = [70, 150];
const BUZZ = 26;
const BUG = 0.4;
const BIG_BUG = 1.1;
const GRID_SCALE = 0.35;
const ZAP_MS = 150;
const FINAL_MS = 300;
const ZAP_SHAKE: [number, number] = [0.4, 1.1];

export const forceBugZapperEvent = registerWispEvent(
  KEY,
  "Bug Zapper",
  () => CONFIG.bugZapperEvent.chance,
  (floor, context, area) => {
    const { flyMs, gapsMs, levelShare, holdMs, mergeMs } =
      CONFIG.bugZapperEvent;
    const own = findRewardBars(floor, context).find((b) => b.floor === floor);
    if (!own) return;
    const { box } = own;
    const ends: Point[] = [
      { x: box.x + 10, y: own.center.y },
      { x: box.x + box.width - 10, y: own.center.y },
    ];
    const grid: Bolt = createBolt(ends[0], ends[1], 0);
    const edgeOf = (k: number): Point => {
      const side = k % 4;
      const u = Math.random();
      return side === 0
        ? { x: area.left - 40, y: lerp([area.top, area.bottom], u) }
        : side === 1
          ? { x: area.right + 40, y: lerp([area.top, area.bottom], u) }
          : side === 2
            ? { x: lerp([area.left, area.right], u), y: area.top - 40 }
            : { x: lerp([area.left, area.right], u), y: area.bottom + 40 };
    };
    let clock: number = flyMs;
    const bugs = Array.from({ length: BUGS + 1 }, (_, k) => {
      const big = k === BUGS;
      const zapAt = clock;
      clock += big ? 0 : lerp(gapsMs, k / (BUGS - 1));
      const from = edgeOf(k);
      const angle = Math.random() * Math.PI * 2;
      const near = big ? NEAR[1] : lerp(NEAR, Math.random());
      const to: Point = {
        x: own.center.x + Math.cos(angle) * near,
        y: own.center.y + Math.sin(angle) * near * 0.6,
      };
      const leaves = zapAt - flyMs;
      const at: Point = { x: 0, y: 0 };
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const d = Math.hypot(dx, dy) || 1;
      return {
        big,
        to,
        zapAt,
        leaves,
        bolt: createBolt(
          big ? own.center : ends[Math.random() < 0.5 ? 0 : 1],
          to,
          big ? 4 : 1,
        ),
        at: (ms: number): Point | null => {
          if (ms < leaves || ms >= zapAt) return null;
          const u = (ms - leaves) / flyMs;
          // buzzing side to side across its line in
          const buzz = Math.sin(u * Math.PI * 6) * BUZZ * (1 - u * 0.5);
          at.x = from.x + dx * u + (-dy / d) * buzz;
          at.y = from.y + dy * u + (dx / d) * buzz;
          return at;
        },
      };
    });
    const endAt = bugs[BUGS].zapAt;

    const zapping = createBeats(
      bugs,
      (b) => b.zapAt,
      (b, k) => {
        if (b.big) {
          cover!.levels(own, levelsFor(own.floor, levelShare, 2), b.to);
          cover!.tierUp(own, b.to);
          cover!.slam(own);
          cover!.blast(b.to);
          return;
        }
        cover!.levels(own, levelsFor(own.floor, levelShare, 1), b.to);
        cover!.burst(b.to, 0.3);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(ZAP_SHAKE, k / (BUGS - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [own],
        tick: (ms, now) => zapping.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FINAL_MS) return;
          if (ms < endAt)
            drawBolt(
              ctx,
              grid,
              (0.4 + 0.4 * Math.random()) * clamp01(ms / 200),
              GRID_SCALE,
            );
          for (const b of bugs) {
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * (b.big ? BIG_BUG : BUG),
              b.big ? 1 : 0.4,
              b.leaves,
              b.zapAt,
            );
            const t = (ms - b.zapAt) / (b.big ? FINAL_MS : ZAP_MS);
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, b.bolt, 1 - t, b.big ? 2 : 0.8);
            drawStrike(ctx, b.to, 1 - t, b.big ? 2.4 : 0.8, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
