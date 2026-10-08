// the "Trolley" event (lightning; free upgrade levels): it covers its crit,
// whose click freezes the screen while a crackling live wire of lightning
// strings itself across the top of the screen and a trolley wisp leaps up
// out of the clicked floor's button to run along under it, its pole sparking
// on the wire; it races back and forth, and every time it passes over the
// income bars it drops a bolt onto the next one down in a blinding flash, a
// crack and a jolt that lands free levels, each run quicker; the last bolt
// slams its bar in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "trolley";
const MAX_BARS = 4;
const EDGE = 40;
const WIRE = 120;
const POLE = 50;
const LEAP_MS = 250;
const DROP_MS = 200;
const TROLLEY = 0.55;
const DROP_SHAKE: [number, number] = [0.7, 1.4];

export const forceTrolleyEvent = registerWispEvent(
  KEY,
  "Trolley",
  () => CONFIG.trolleyEvent.chance,
  (floor, context, area) => {
    const { runsMs, holdMs, mergeMs } = CONFIG.trolleyEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const wireY = area.top + WIRE;
    const y = wireY + POLE;
    const wire = createBolt(
      { x: area.left, y: wireY },
      { x: area.right, y: wireY },
      0,
    );
    const ltr = button.x < (left + right) / 2;
    let clock = LEAP_MS;
    const runs = bars.map((bar, k) => {
      const dir = (k % 2 === 0) === ltr ? 1 : -1;
      const from = dir > 0 ? left : right;
      const to = dir > 0 ? right : left;
      const span = lerp(runsMs, k / Math.max(1, bars.length - 1));
      const starts = clock;
      clock += span;
      // when it passes over the bar
      const share = (bar.center.x - from) / (to - from);
      return { bar, from, to, starts, span, drops: starts + span * share };
    });
    const last = runs[runs.length - 1];
    const endAt = Math.max(clock, last.drops + DROP_MS);
    const trolleyAt: Point = { x: 0, y: 0 };
    const trolley = (ms: number): Point => {
      if (ms < LEAP_MS) {
        const u = easeOut(ms / LEAP_MS);
        trolleyAt.x = lerp([button.x, runs[0].from], u);
        trolleyAt.y = lerp([button.y, y], u);
        return trolleyAt;
      }
      let r = runs[0];
      for (const run of runs) if (ms >= run.starts) r = run;
      trolleyAt.x = lerp(
        [r.from, r.to],
        smoothstep(clamp01((ms - r.starts) / r.span)),
      );
      trolleyAt.y = y;
      return trolleyAt;
    };
    const poleTop: Point = { x: 0, y: wireY };
    const poleFoot: Point = { x: 0, y };
    const pole = createBolt(poleFoot, poleTop, 0);
    const drops = runs.map((r) => {
      const over: Point = { x: r.bar.center.x, y };
      return { ...r, over, bolt: createBolt(over, r.bar.center, 2) };
    });

    const dropping = createBeats(
      drops,
      (d) => d.drops,
      (d, k) => {
        cover!.levels(d.bar, levelsFor(d.bar.floor), d.over);
        if (d === drops[drops.length - 1]) {
          cover!.slam(d.bar);
          cover!.blast(d.bar.center);
          return;
        }
        cover!.burst(d.bar.center, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(DROP_SHAKE, k / Math.max(1, drops.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => dropping.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const fade = ms > clock ? 1 - clamp01((ms - clock) / DROP_MS) : 1;
          drawBolt(ctx, wire, 0.6 * fade * clamp01(ms / LEAP_MS), 0.6);
          if (ms >= LEAP_MS && ms <= clock) {
            const at = trolley(ms);
            poleFoot.x = at.x;
            poleTop.x = at.x - 20;
            drawBolt(ctx, pole, 0.9, 0.4);
            drawStrike(ctx, poleTop, 0.5, 0.4, now);
          }
          for (const d of drops) {
            const t = (ms - d.drops) / DROP_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, d.bolt, 1 - t, 1.2);
            drawStrike(ctx, d.bar.center, 1 - t, 1, now);
          }
          drawWispBetween(
            ctx,
            trolley,
            ms,
            now,
            WISP_SIZE * TROLLEY,
            0.8,
            0,
            clock,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
