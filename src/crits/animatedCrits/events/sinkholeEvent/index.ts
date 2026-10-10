// the "Sinkhole" event (clutter; a crit tier): it covers its crit, whose
// click freezes the screen while a blast off the clicked floor's button
// blows glitter out all over the screen, landing in a checkerboard; a
// gravity hole tears open in the middle and gulps it in, gulp by gulp, the
// nearest squares sucked in first and the rest lurching closer each time,
// the last gulp swirling everything down into a heap in its throat; then
// the hole sinks onto the clicked floor's bar in a huge blast and shake and
// the bar jumps a crit tier. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  drawGravityHole,
  scatterChecker,
  simulateClean,
} from "../../../../shared/clutter";
import { findRewardBars } from "../../eventRewards";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const KEY = "sinkhole";
const BITS = 320;
const BIT = 10;
const MARGIN = 40;
const CELL = 110;
// the hole's size, its core's radius, and how much it swells on a gulp
const HOLE = 150;
const CORE = 40;
const GULP_SWELL = 0.3;
const OPEN_MS = 200;
// each gulp's share of a pull that would carry the farthest bit a third of
// the way in; the last gulp runs twice as long
const GULPS = [0.35, 0.6, 1.8];
const SWIRL = 0.7;
// a loose bit under a steady pull a settles at about TERMINAL * a px/ms
const TERMINAL = 72;
const GATHER_MS = 160;
const HEAP = 0.6;
const FADE_MS = 140;
const SPILL_SHAKE = 0.7;
const GULP_SHAKE: [number, number] = [0.5, 1.1];

export const forceSinkholeEvent = registerWispEvent(
  KEY,
  "Sinkhole",
  () => CONFIG.sinkholeEvent.chance,
  (floor, context, area) => {
    const { spillMs, gulpMs, gapMs, sinkMs, holdMs, mergeMs } =
      CONFIG.sinkholeEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const button = getButtonCenter(context.isGroundFloor);
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const spots = scatterChecker(
      {
        left: area.left + MARGIN,
        top: area.top + MARGIN,
        right: area.right - MARGIN,
        bottom: area.bottom - MARGIN,
      },
      BITS,
      CELL,
    );
    const far = Math.max(
      ...spots.map((s) => Math.hypot(s.x - centre.x, s.y - centre.y)),
    );
    const fromButton = Math.max(
      ...spots.map((s) => Math.hypot(s.x - button.x, s.y - button.y)),
    );
    // each bit leaves the button as the blast's front reaches its distance
    const leaves = spots.map(
      (s) =>
        spillMs *
        0.35 *
        (Math.hypot(s.x - button.x, s.y - button.y) / fromButton),
    );
    const flyMs = spillMs * 0.65;

    const openAt = spillMs;
    const gulps = GULPS.map((share, k) => {
      const starts = openAt + OPEN_MS + k * (gulpMs + gapMs);
      const last = k === GULPS.length - 1;
      return {
        starts,
        ends: starts + gulpMs * (last ? 2 : 1),
        pull: (share * far * far) / (3 * gulpMs * TERMINAL * 100),
      };
    });
    const swallowed = gulps[gulps.length - 1].ends;
    const pullAt = (ms: number) => {
      for (const g of gulps)
        if (ms >= g.starts && ms < g.ends)
          return (
            g.pull * Math.sin((Math.PI * (ms - g.starts)) / (g.ends - g.starts))
          );
      return 0;
    };
    const swept = simulateClean(
      spots,
      [
        {
          kind: "hole",
          at: (_, into) => {
            into.x = centre.x;
            into.y = centre.y;
            return into;
          },
          pull: pullAt,
          core: CORE,
          swirl: SWIRL,
        },
      ],
      openAt,
      swallowed,
    );
    // where each bit settles in the throat, relative to the hole
    const settled = spots.map((_, i) => {
      const end = swept.end(i);
      const dx = end.x - centre.x;
      const dy = end.y - centre.y;
      const k = Math.min(1, (CORE * HEAP) / (Math.hypot(dx, dy) || 1));
      return { dx, dy, x: dx * k, y: dy * k };
    });
    const sinkStarts = swallowed + GATHER_MS;
    const sunk = sinkStarts + sinkMs;
    const endAt = sunk + FADE_MS;
    const landing: Point = { x: bar.center.x, y: bar.center.y };
    const hole: Point = { x: 0, y: 0 };
    const holeAt = (ms: number): Point => {
      const u = easeIn(clamp01((ms - sinkStarts) / sinkMs));
      hole.x = lerp([centre.x, landing.x], u);
      hole.y = lerp([centre.y, landing.y], u);
      return hole;
    };

    const spilling = createBeats(
      [0],
      (ms) => ms,
      () => {
        cover!.burst(button, 0.8);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(SPILL_SHAKE);
      },
    );
    const gulping = createBeats(
      gulps,
      (g) => g.starts,
      (_, k) => {
        cover!.burst(centre, 0.4 + 0.2 * k);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(GULP_SHAKE, k / (gulps.length - 1)));
      },
    );
    const sinking = createBeats(
      [sunk],
      (ms) => ms,
      () => {
        cover!.tierUp(bar, centre);
        cover!.slam(bar);
        cover!.blast(landing);
      },
    );

    const bit: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          spilling.tick(ms, now);
          gulping.tick(ms, now);
          sinking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const fade = 1 - clamp01((ms - sunk) / FADE_MS);
          if (ms >= openAt) {
            const open = easeOut(clamp01((ms - openAt) / OPEN_MS));
            const swell =
              1 + GULP_SWELL * (pullAt(ms) / gulps[gulps.length - 1].pull);
            drawGravityHole(
              ctx,
              holeAt(ms),
              HOLE * open * swell,
              fade,
              ms,
              now,
            );
          }
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          beginLightBatch(ctx);
          ctx.globalAlpha = fade;
          const h = holeAt(ms);
          const gather = easeOut(clamp01((ms - swallowed) / GATHER_MS));
          for (let i = 0; i < spots.length; i++) {
            if (ms < leaves[i]) continue;
            if (ms < openAt) {
              const u = easeOut(clamp01((ms - leaves[i]) / flyMs));
              bit.x = lerp([button.x, spots[i].x], u);
              bit.y = lerp([button.y, spots[i].y], u);
            } else if (ms < swallowed) {
              swept.at(i, ms, bit);
            } else {
              // what's left settles into the throat, which carries it down
              const s = settled[i];
              bit.x = h.x + lerp([s.dx, s.x], gather);
              bit.y = h.y + lerp([s.dy, s.y], gather);
            }
            stampGlimmer(
              ctx,
              bit.x,
              bit.y,
              BIT,
              i * 1.3 + ms * 0.004,
              i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          endLightBatch(ctx);
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
