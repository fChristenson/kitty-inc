// the "Buzzsaw" event (beam; crit tiers): it covers its crit, whose click
// freezes the screen while a wisp shoots out of the clicked floor's button
// and sprouts a wheel of blazing beams, spinning up into a buzzsaw; it rolls
// onto an income bar and grinds into it, sparks spraying where the blades
// bite, until the bar jumps a crit tier with a crack and a big jolt; then it
// rolls on to the next bar and the next, spinning ever faster, the last
// grind ending in a huge blast and shake. Then the crit's tier pays out
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
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars } from "../../eventRewards";

const KEY = "buzzsaw";
const MAX_BARS = 3;
const BLADES = 8;
const REACH = 70;
const BLADE_W = 14;
// spin in turns a ms, ramping up
const SPIN: [number, number] = [0.004, 0.02];
const HUB = 0.6;
const FLARE = 34;
const GRIND_SHAKE_MS = 70;
const HIT_SHAKE: [number, number] = [0.8, 1.4];

export const forceBuzzsawEvent = registerWispEvent(
  KEY,
  "Buzzsaw",
  () => CONFIG.buzzsawEvent.chance,
  (floor, context) => {
    const { rollMs, grindsMs, holdMs, mergeMs } = CONFIG.buzzsawEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    let from: Point = button;
    const cuts = bars.map((bar, k) => {
      const rolls = clock;
      const bites = rolls + rollMs;
      clock = bites + lerp(grindsMs, k / Math.max(1, bars.length - 1));
      const cut = { bar, from, at: bar.center, rolls, bites, done: clock };
      from = bar.center;
      return cut;
    });
    const last = cuts[cuts.length - 1];
    const endAt = last.done;
    const hubAt: Point = { x: 0, y: 0 };
    const hub = (ms: number): Point => {
      let c = cuts[0];
      for (const cut of cuts) if (ms >= cut.rolls) c = cut;
      const u = smoothstep(clamp01((ms - c.rolls) / rollMs));
      const grind = ms > c.bites ? Math.sin(ms / 18) * 3 : 0;
      hubAt.x = lerp([c.from.x, c.at.x], u) + grind;
      hubAt.y = lerp([c.from.y, c.at.y], u) - grind;
      return hubAt;
    };
    const tips: Point[] = Array.from({ length: BLADES }, () => ({
      x: 0,
      y: 0,
    }));
    const sparks: Point = { x: 0, y: 0 };
    let lastGrind = -Infinity;

    const rolling = createBeats(
      cuts,
      (c) => c.rolls,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const cutting = createBeats(
      cuts,
      (c) => c.done,
      (c, k) => {
        cover!.tierUp(c.bar, c.at);
        if (c === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(c.at);
          return;
        }
        cover!.burst(c.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, cuts.length - 1)));
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
          rolling.tick(ms, now);
          cutting.tick(ms, now);
          let grinding = false;
          for (const c of cuts)
            if (ms > c.bites && ms < c.done) grinding = true;
          if (grinding && now - lastGrind > GRIND_SHAKE_MS && cover?.isLive()) {
            lastGrind = now;
            shakeScreen(0.35);
          }
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const at = hub(ms);
          const spin = lerp(SPIN, clamp01(ms / endAt));
          const turn = ms * spin * Math.PI * 2 * (1 + ms / endAt);
          for (let i = 0; i < BLADES; i++) {
            const a = turn + (i / BLADES) * Math.PI * 2;
            tips[i].x = at.x + Math.cos(a) * REACH;
            tips[i].y = at.y + Math.sin(a) * REACH;
            drawBeam(ctx, at, tips[i], BLADE_W, 0.9);
          }
          for (const c of cuts)
            if (ms > c.bites && ms < c.done) {
              sparks.x = at.x;
              sparks.y = at.y + 10;
              drawBeamFlare(ctx, sparks, FLARE, 1, now);
            }
          drawWispBetween(ctx, hub, ms, now, WISP_SIZE * HUB, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
