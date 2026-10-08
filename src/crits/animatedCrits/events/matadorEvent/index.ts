// the "Matador" event (wisp; crit tiers): it covers its crit, whose click
// freezes the screen while a matador wisp steps out of the clicked floor's
// button onto an income bar and a big bull wisp paws at the screen's edge,
// then charges straight at it; at the last instant the matador whips aside
// and the bull smashes headlong into the bar with a bang and a big jolt, and
// the bar jumps a crit tier; the matador moves on to the next bar and the
// bull charges again, faster, the last charge a huge blast and shake. Then
// the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars } from "../../eventRewards";

const KEY = "matador";
const MAX_BARS = 3;
const EDGE = 40;
const STEP_MS = 200;
// the charge, and the matador's dodge DODGE px up just before it lands
const DODGE = 70;
const DODGE_MS = 90;
const MATADOR = 0.45;
const BULL = 0.8;
const HIT_SHAKE: [number, number] = [0.9, 1.5];

export const forceMatadorEvent = registerWispEvent(
  KEY,
  "Matador",
  () => CONFIG.matadorEvent.chance,
  (floor, context, area) => {
    const { chargesMs, holdMs, mergeMs } = CONFIG.matadorEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    let stand: Point = button;
    const passes = bars.map((bar, k) => {
      const side = k % 2 === 0 ? -1 : 1;
      const edge: Point = {
        x: side < 0 ? area.left + EDGE : area.right - EDGE,
        y: bar.center.y,
      };
      const steps = clock;
      const charges = steps + STEP_MS;
      clock = charges + lerp(chargesMs, k / Math.max(1, bars.length - 1));
      const pass = { bar, edge, from: stand, steps, charges, hits: clock };
      stand = bar.center;
      return pass;
    });
    const last = passes[passes.length - 1];
    const endAt = last.hits;
    const matadorAt: Point = { x: 0, y: 0 };
    const matador = (ms: number): Point => {
      let p = passes[0];
      for (const pass of passes) if (ms >= pass.steps) p = pass;
      const u = smoothstep(clamp01((ms - p.steps) / STEP_MS));
      const dodge = easeOut(clamp01((ms - (p.hits - DODGE_MS)) / DODGE_MS));
      matadorAt.x = lerp([p.from.x, p.bar.center.x], u);
      matadorAt.y = lerp([p.from.y, p.bar.center.y - 20], u) - dodge * DODGE;
      return matadorAt;
    };
    const bullAt: Point = { x: 0, y: 0 };
    const bull = (ms: number): Point => {
      let p = passes[0];
      for (const pass of passes) if (ms >= pass.steps) p = pass;
      if (ms < p.charges) {
        bullAt.x = p.edge.x + Math.sin(ms / 40) * 4;
        bullAt.y = p.edge.y;
        return bullAt;
      }
      const u = easeIn(clamp01((ms - p.charges) / (p.hits - p.charges)));
      bullAt.x = lerp([p.edge.x, p.bar.center.x], u);
      bullAt.y = p.edge.y;
      return bullAt;
    };

    const charging = createBeats(
      passes,
      (p) => p.charges,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const goring = createBeats(
      passes,
      (p) => p.hits,
      (p, k) => {
        cover!.tierUp(p.bar, p.edge);
        if (p === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(p.bar.center);
          return;
        }
        cover!.burst(p.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, passes.length - 1)));
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
        tick: (ms, now) => {
          charging.tick(ms, now);
          goring.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawWispBetween(
            ctx,
            matador,
            ms,
            now,
            WISP_SIZE * MATADOR,
            0.7,
            0,
            endAt,
          );
          for (const p of passes)
            drawWispBetween(
              ctx,
              bull,
              ms,
              now,
              WISP_SIZE * BULL,
              0.5,
              p.steps,
              p.hits,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
