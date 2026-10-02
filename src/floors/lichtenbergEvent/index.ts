// the "Lichtenberg" event (lightning; free upgrade levels and a crit tier):
// it covers its crit, whose click freezes the screen while a bolt of
// lightning creeps down out of the sky, branching and branching again like a
// lightning tree, ever faster; every branch that reaches an income bar
// cracks onto it in a blinding strike, a bang and a big jolt that lands free
// levels; then the whole tree discharges at once in a blinding flash, every
// bar slams and the clicked floor's bar jumps one crit tier in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../shared/lightning";
import type { Point } from "../../shared/wisp";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "lichtenberg";
const MAX_BARS = 5;
// each trunk node sits RISE px over its bar, drifting up to DRIFT of the
// screen's width sideways from the last
const RISE = 90;
const DRIFT = 0.32;
const EDGE = 70;
const STRIKE_MS = 160;
const STRIKE_SHAKE: [number, number] = [1, 1.9];
const STRIKE_BURST: [number, number] = [0.6, 1];

interface Limb {
  from: Point;
  to: Point;
  // grows from start to end, then stays lit
  start: number;
  end: number;
  growing: Bolt;
  lit: Bolt;
}

export const forceLichtenbergEvent = registerWispEvent(
  KEY,
  "Lichtenberg",
  () => CONFIG.lichtenbergEvent.chance,
  (floor, context, area) => {
    const { limbsMs, dischargeMs, levelShare, holdMs, mergeMs } =
      CONFIG.lichtenbergEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const own = bars.find((b) => b.floor === floor) ?? bars[bars.length - 1];
    const width = area.right - area.left;
    const clampX = (x: number) =>
      Math.min(area.right - EDGE, Math.max(area.left + EDGE, x));
    const root: Point = {
      x: clampX(area.left + width * (0.3 + 0.4 * Math.random())),
      y: area.top - 40,
    };
    const limb = (from: Point, to: Point, start: number, ms: number): Limb => ({
      from,
      to,
      start,
      end: start + ms,
      growing: createBolt(
        { x: from.x, y: from.y },
        { x: from.x, y: from.y },
        0,
      ),
      lit: createBolt(from, to, 2),
    });
    // down the trunk node by node, a branch off each node onto its bar
    const trunk: Limb[] = [];
    const branches: Limb[] = [];
    const tips: Point[] = [];
    let node = root;
    let clock = 0;
    bars.forEach((bar, k) => {
      const ms = lerp(limbsMs, k / Math.max(1, bars.length - 1));
      const next: Point = {
        x: clampX(node.x + (Math.random() - 0.5) * 2 * DRIFT * width),
        y: Math.max(node.y + 40, bar.center.y - RISE),
      };
      trunk.push(limb(node, next, clock, ms * 0.55));
      const tip: Point = {
        x: bar.box.x + bar.box.width * (0.2 + 0.6 * Math.random()),
        y: bar.center.y,
      };
      tips.push(tip);
      branches.push(limb(next, tip, clock + ms * 0.55, ms * 0.45));
      node = next;
      clock += ms;
    });
    const strikes = branches.map((b) => b.end);
    const dischargeAt = clock + 120;
    const endAt = dischargeAt + dischargeMs;
    const limbs = [...trunk, ...branches];

    const striking = createBeats(
      strikes,
      (ms) => ms,
      (_, k) => {
        const bar = bars[k];
        const t = k / Math.max(1, bars.length - 1);
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 2), trunk[k].to);
        cover!.burst(tips[k], lerp(STRIKE_BURST, t));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, t));
      },
    );
    const discharge = createBeats(
      [dischargeAt],
      (ms) => ms,
      () => {
        cover!.tierUp(own, root);
        cover!.levels(own, levelsFor(own.floor, levelShare, 2));
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(own.center);
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
          striking.tick(ms, now);
          discharge.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms >= endAt) return;
          if (ms >= dischargeAt) {
            const fade = 1 - clamp01((ms - dischargeAt) / dischargeMs);
            for (const l of limbs) drawBolt(ctx, l.lit, fade, 1 + 0.9 * fade);
            for (const tip of tips) drawStrike(ctx, tip, fade, 1.3, now);
            drawStrike(ctx, root, fade, 1.6, now);
            return;
          }
          for (const l of limbs) {
            if (ms < l.start) continue;
            if (ms >= l.end) {
              drawBolt(ctx, l.lit, 0.55 + 0.35 * Math.random(), 0.8);
              continue;
            }
            const u = easeOut((ms - l.start) / (l.end - l.start));
            l.growing.to.x = l.from.x + (l.to.x - l.from.x) * u;
            l.growing.to.y = l.from.y + (l.to.y - l.from.y) * u;
            drawBolt(ctx, l.growing, 1, 1);
            drawStrike(ctx, l.growing.to, 0.5, 0.4, now);
          }
          strikes.forEach((at, k) => {
            const since = ms - at;
            if (since >= 0 && since < STRIKE_MS)
              drawStrike(ctx, tips[k], 1 - since / STRIKE_MS, 1.2, now);
          });
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
